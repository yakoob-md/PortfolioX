import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from db.database import AsyncSessionLocal
from db.repositories.fund_repo import FundRepository
from services.mfapi_service import MFAPIService

async def main():
    scheme_code = "120828" # quant Small Cap Fund - Direct Plan
    print(f"--- Running dynamic hydration test for scheme {scheme_code} ---")
    
    mfapi = MFAPIService()
    meta = await mfapi.get_fund_metadata(scheme_code)
    await mfapi.close()
    
    if not meta:
        print("FAIL: Could not fetch fund metadata!")
        return
        
    print(f"\nSUCCESS! Fetched metadata:")
    print(f"Name: {meta.scheme_name}")
    print(f"AMC: {meta.amc_name}")
    print(f"Category: {meta.category}")
    print(f"Sub-category: {meta.sub_category}")
    print(f"Type: {meta.fund_type}")
    print(f"Plan Type: {meta.plan_type}")
    print(f"Option Type: {meta.option_type}")
    print(f"Latest NAV: {meta.latest_nav} on {meta.nav_date}")
    print(f"Calculated 1Y Return: {meta.return_1y}%")
    print(f"Calculated 3Y Return: {meta.return_3y}%")
    print(f"Calculated 5Y Return: {meta.return_5y}%")
    print(f"Annualized Volatility (1Y): {meta.volatility_1y}%")
    print(f"Sharpe Ratio (1Y): {meta.sharpe_1y}")
    print(f"Riskometer: {meta.riskometer}")
    print(f"Computed Expense Ratio: {meta.expense_ratio}%")
    print(f"Computed AUM: INR {meta.aum_crore} Crores")
    
    # Let's save it to database
    async with AsyncSessionLocal() as session:
        repo = FundRepository(session)
        metrics = {
            "scheme_name": meta.scheme_name,
            "amc_name": meta.amc_name,
            "category": meta.category,
            "sub_category": meta.sub_category,
            "plan_type": meta.plan_type,
            "option_type": meta.option_type,
            "expense_ratio": meta.expense_ratio,
            "aum_crore": meta.aum_crore,
            "return_1y": meta.return_1y,
            "return_3y": meta.return_3y,
            "return_5y": meta.return_5y,
            "volatility_1y": meta.volatility_1y,
            "volatility_3y": meta.volatility_3y,
            "sharpe_1y": meta.sharpe_1y,
            "sharpe_3y": meta.sharpe_3y,
            "riskometer": meta.riskometer,
            "min_sip": meta.min_sip,
            "min_lumpsum": meta.min_lumpsum,
            "fund_type": meta.fund_type,
        }
        if meta.latest_nav:
            metrics["nav"] = meta.latest_nav
        if meta.nav_date:
            metrics["nav_date"] = meta.nav_date
            
        success = await repo.update_fund_metrics(scheme_code, metrics)
        print(f"\nDatabase Update Status: {'SUCCESS' if success else 'FUND NOT FOUND IN DB'}")

if __name__ == "__main__":
    asyncio.run(main())
