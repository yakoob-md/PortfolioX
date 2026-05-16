import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from db.database import get_db
from db.models import TaxSession
from services.pdf_parser import CAMSParser
from services.tax_engine import TaxEngine
from typing import List
from models.tax_schemas import Folio
import json
import logging

router = APIRouter(prefix="/tax", tags=["tax"])
logger = logging.getLogger(__name__)

@router.post("/upload")
async def upload_cams_pdf(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
        # Validate magic bytes first
        content = await file.read()
        if not content.startswith(b'%PDF-'):
            raise HTTPException(status_code=400, detail="Not a valid PDF file.")
        
        # Check size
        if len(content) > 10 * 1024 * 1024: # 10MB limit
            raise HTTPException(status_code=400, detail="File too large. Limit is 10MB.")
            
        # Reset pointer for subsequent reads (if needed, but we already have content)
        # However, it's safer to just write the content we have.
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(content)
            temp_pdf_path = temp_pdf.name
            
        try:
            parser = CAMSParser()
            parsed_statement = parser.parse(temp_pdf_path)
            
            if not parsed_statement.folios:
                raise HTTPException(status_code=400, detail="Could not extract any mutual fund folios from the PDF.")
                
            # Resolve fund codes and asset types
            from services.fund_resolver import FundResolver
            from db.repositories.fund_repo import FundRepository
            fund_repo = FundRepository(db)
            resolver = FundResolver(fund_repo)
            
            for folio in parsed_statement.folios:
                fund = await resolver.resolve_fund(folio.scheme_name)
                if fund:
                    folio.scheme_code = fund.scheme_code
                    folio.category = fund.category
                    # Simple heuristic for asset type
                    cat = (fund.category or "").lower()
                    if any(x in cat for x in ["debt", "liquid", "money market", "gilt", "overnight", "duration"]):
                        folio.asset_type = "Debt"
                    else:
                        folio.asset_type = "Equity"
                
            tax_engine = TaxEngine()
            tax_calculation = tax_engine.calculate_gains(parsed_statement.folios)
            
            # Save to db
            tax_session = TaxSession(tax_data=tax_calculation.model_dump(mode='json'))
            db.add(tax_session)
            await db.commit()
            await db.refresh(tax_session)
            
            tax_calculation.session_id = tax_session.session_id
            
            # Update the stored json to include session_id
            tax_session.tax_data = tax_calculation.model_dump(mode='json')
            await db.commit()
            
            return tax_calculation
            
        finally:
            # Clean up temp file immediately
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
                
    except Exception as e:
        logger.error(f"Tax upload error: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to process the statement.")

@router.get("/report/{session_id}")
async def get_tax_report(session_id: str, db: AsyncSession = Depends(get_db)):
    query = select(TaxSession).where(TaxSession.session_id == session_id)
    result = await db.execute(query)
    tax_session = result.scalar_one_or_none()
    
    if not tax_session:
        raise HTTPException(status_code=404, detail="Tax report not found or has expired.")
        
    return tax_session.tax_data

@router.post("/manual")
async def calculate_tax_manual(folios: List[Folio], db: AsyncSession = Depends(get_db)):
    try:
        # Resolve fund codes and asset types
        from services.fund_resolver import FundResolver
        from db.repositories.fund_repo import FundRepository
        fund_repo = FundRepository(db)
        resolver = FundResolver(fund_repo)
        
        for folio in folios:
            if not folio.scheme_code or folio.scheme_code == "dummy":
                fund = await resolver.resolve_fund(folio.scheme_name)
                if fund:
                    folio.scheme_code = fund.scheme_code
                    folio.category = fund.category
                    # Simple heuristic for asset type
                    cat = (fund.category or "").lower()
                    if any(x in cat for x in ["debt", "liquid", "money market", "gilt", "overnight", "duration"]):
                        folio.asset_type = "Debt"
                    else:
                        folio.asset_type = "Equity"

        tax_engine = TaxEngine()
        tax_calculation = tax_engine.calculate_gains(folios)
        
        # Save to db
        tax_session = TaxSession(tax_data=tax_calculation.model_dump(mode='json'))
        db.add(tax_session)
        await db.commit()
        await db.refresh(tax_session)
        
        tax_calculation.session_id = tax_session.session_id
        
        # Update the stored json to include session_id
        tax_session.tax_data = tax_calculation.model_dump(mode='json')
        await db.commit()
        
        return tax_calculation
    except Exception as e:
        logger.error(f"Manual tax calculation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate tax for the provided transactions.")
