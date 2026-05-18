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
@router.post("/upload-cams")
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

from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime

class FrontendHolding(BaseModel):
    id: Optional[str] = None
    name: str
    investedAmount: float
    currentValue: float
    purchaseDate: str
    category: Literal['equity', 'debt', 'hybrid']

class TaxCalculateRequest(BaseModel):
    holdings: List[FrontendHolding]
    slabRate: float
    realizedLTCG: float

class TaxCalculateResultItem(BaseModel):
    name: str
    category: Literal['equity', 'debt', 'hybrid']
    investedAmount: float
    currentValue: float
    gain: float
    holdingPeriodDays: int
    gainType: Literal['STCG', 'LTCG']
    taxRate: float
    taxAmount: float
    netGain: float

class TaxCalculateResponse(BaseModel):
    holdings: List[TaxCalculateResultItem]

@router.post("/calculate", response_model=TaxCalculateResponse)
async def calculate_capital_gains_tax(request: TaxCalculateRequest):
    """
    Calculate capital gains tax liability in real-time based on FY 2024-25 Budget rules:
    - Equity/Hybrid: STCG @ 20%, LTCG @ 12.5% (with combined ₹1.25L exemption limit).
    - Debt: Taxed at individual tax slab.
    """
    try:
        now = datetime.now()
        remaining_exemption = max(0.0, 125000.0 - request.realizedLTCG)
        
        # Sort items descending by potential gain to optimize tax exemption
        sorted_holdings = sorted(
            request.holdings,
            key=lambda x: (x.currentValue - x.investedAmount),
            reverse=True
        )
        
        results = []
        for item in sorted_holdings:
            try:
                p_date = datetime.strptime(item.purchaseDate, "%Y-%m-%d")
            except Exception:
                p_date = datetime(2023, 1, 15)
                
            holding_days = (now - p_date).days
            gain = item.currentValue - item.investedAmount
            
            if item.category == 'debt':
                gain_type = 'STCG' if holding_days < 1095 else 'LTCG'
                tax_rate = request.slabRate
                tax_amount = max(0.0, gain * tax_rate)
            else:
                # Equity / Hybrid
                is_long_term = holding_days >= 365
                if is_long_term:
                    gain_type = 'LTCG'
                    tax_rate = 0.125
                    used_exemption = min(max(0.0, gain), remaining_exemption)
                    remaining_exemption -= used_exemption
                    taxable_gain = max(0.0, gain - used_exemption)
                    tax_amount = taxable_gain * tax_rate
                else:
                    gain_type = 'STCG'
                    tax_rate = 0.20
                    tax_amount = max(0.0, gain * tax_rate)
                    
            results.append(TaxCalculateResultItem(
                name=item.name,
                category=item.category,
                investedAmount=item.investedAmount,
                currentValue=item.currentValue,
                gain=gain,
                holdingPeriodDays=holding_days,
                gainType=gain_type,
                taxRate=tax_rate,
                taxAmount=round(tax_amount, 2),
                netGain=gain - tax_amount
            ))
            
        return TaxCalculateResponse(holdings=results)
    except Exception as e:
        logger.error(f"Tax calculation endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate tax: {str(e)}")
