import asyncio
import httpx
import logging
import sys
import os
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional

# Add backend to path to import config and db
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from config import settings
from db.database import AsyncSessionLocal, engine, Base
from db.models import Fund
from sqlalchemy.dialects.postgresql import insert

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

async def fetch_amfi_data() -> str:
    """Fetch the NAVAll.txt file from AMFI."""
    logger.info(f"Fetching AMFI data from {settings.AMFI_SCHEME_MASTER_URL}")
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.get(settings.AMFI_SCHEME_MASTER_URL)
        response.raise_for_status()
        return response.text

def parse_amfi_data(data: str) -> List[Dict[str, Any]]:
    """
    Parse AMFI NAVAll.txt format.
    """
    lines = data.splitlines()
    funds = []
    current_category = None
    current_amc = None
    
    logger.info("Parsing AMFI data...")
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check if it's a category header
        # Usually format: Open Ended Schemes(Equity Scheme - Large Cap Fund)
        if "(" in line and ")" in line and ";" not in line:
            current_category = line
            continue
            
        # Check if it's an AMC name (standalone line between category and fund data)
        # Usually it doesn't contain semicolons and isn't a category
        if ";" not in line and current_category:
            current_amc = line
            continue
            
        # Parse fund entry
        # Format: Scheme Code;ISIN Div Pay Out/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
        parts = line.split(';')
        if len(parts) >= 5 and parts[0].isdigit():
            scheme_code = parts[0]
            scheme_name = parts[3]
            nav_str = parts[4]
            nav_date_str = parts[5] if len(parts) > 5 else None
            
            # Determine plan type
            plan_type = "Direct" if "Direct" in scheme_name else "Regular"
            
            # Determine option type
            option_type = "Other"
            if "Growth" in scheme_name:
                option_type = "Growth"
            elif "IDCW" in scheme_name:
                option_type = "IDCW"
            elif "Bonus" in scheme_name:
                option_type = "Bonus"
                
            # Parse NAV
            nav = None
            try:
                if nav_str and nav_str.strip() and nav_str != "N.A.":
                    nav = float(nav_str)
            except ValueError:
                pass
                
            # Parse Nav Date
            nav_date = None
            try:
                if nav_date_str and nav_date_str.strip() and nav_date_str != "N.A.":
                    nav_date = datetime.strptime(nav_date_str, "%d-%b-%Y").date()
            except ValueError:
                pass

            fund_data = {
                "scheme_code": scheme_code,
                "scheme_name": scheme_name,
                "amc_name": current_amc or "Unknown AMC",
                "category": current_category,
                "plan_type": plan_type,
                "option_type": option_type,
                "nav": nav,
                "nav_date": nav_date,
                "is_active": True
            }
            funds.append(fund_data)
            
    return funds

async def upsert_funds(funds: List[Dict[str, Any]]):
    """Upsert fund records into the database."""
    async with AsyncSessionLocal() as session:
        logger.info(f"Upserting {len(funds)} funds into database...")
        
        # Process in batches to avoid overwhelming the DB
        batch_size = 1000
        for i in range(0, len(funds), batch_size):
            batch = funds[i:i+batch_size]
            
            stmt = insert(Fund).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=['scheme_code'],
                set_={
                    "scheme_name": stmt.excluded.scheme_name,
                    "nav": stmt.excluded.nav,
                    "nav_date": stmt.excluded.nav_date,
                    "updated_at": datetime.now()
                }
            )
            
            await session.execute(stmt)
            await session.commit()
            
        logger.info("Database upsert complete.")

async def main():
    try:
        # Create tables if they don't exist
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
        data = await fetch_amfi_data()
        funds = parse_amfi_data(data)
        
        if not funds:
            logger.error("No funds found to parse.")
            return
            
        amcs = set(f["amc_name"] for f in funds)
        logger.info(f"Parsed {len(funds)} funds from {len(amcs)} AMCs.")
        
        await upsert_funds(funds)
        
        logger.info("Successfully loaded AMFI scheme master data.")
        
    except Exception as e:
        logger.exception(f"Failed to load AMFI data: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
