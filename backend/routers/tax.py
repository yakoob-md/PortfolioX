import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from db.database import get_db
from db.models import TaxSession
from services.pdf_parser import CAMSParser
from services.tax_engine import TaxEngine
import json
import logging

router = APIRouter(prefix="/api/tax", tags=["tax"])
logger = logging.getLogger(__name__)

@router.post("/upload")
async def upload_cams_pdf(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    try:
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            content = await file.read()
            if len(content) > 10 * 1024 * 1024: # 10MB limit
                raise HTTPException(status_code=400, detail="File too large. Limit is 10MB.")
            temp_pdf.write(content)
            temp_pdf_path = temp_pdf.name
            
        try:
            parser = CAMSParser()
            parsed_statement = parser.parse(temp_pdf_path)
            
            if not parsed_statement.folios:
                raise HTTPException(status_code=400, detail="Could not extract any mutual fund folios from the PDF.")
                
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
