import asyncio
import sys
import os
from sqlalchemy import select

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from db.database import AsyncSessionLocal
from db.models import Fund

async def main():
    async with AsyncSessionLocal() as session:
        # Get count of funds
        stmt_count = select(Fund)
        result = await session.execute(stmt_count)
        funds = result.scalars().all()
        print(f"Total funds in database: {len(funds)}")
        
        # Check a few funds that might have non-null returns or expense ratios
        non_null_expense = [f for f in funds if f.expense_ratio is not None]
        print(f"Funds with non-null expense_ratio: {len(non_null_expense)}")
        for f in non_null_expense:
            print(f"Code: {f.scheme_code} | Name: {f.scheme_name} | Exp: {f.expense_ratio}")
        
        non_null_returns = [f for f in funds if f.return_1y is not None]
        print(f"Funds with non-null return_1y: {len(non_null_returns)}")
        
        # Show top 5 funds
        print("\nFirst 5 funds in DB:")
        for f in funds[:5]:
            print(f"Code: {f.scheme_code} | Name: {f.scheme_name} | NAV: {f.nav} | Exp: {f.expense_ratio} | AUM: {f.aum_crore} | Ret1Y: {f.return_1y} | Risk: {f.riskometer}")

if __name__ == "__main__":
    asyncio.run(main())
