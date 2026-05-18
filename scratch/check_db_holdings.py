import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from db.database import AsyncSessionLocal
from sqlalchemy import select, func
from db.models import FundHolding, Fund

async def main():
    async with AsyncSessionLocal() as session:
        # Check total holding records
        count_stmt = select(func.count(FundHolding.id))
        res = await session.execute(count_stmt)
        total_holdings = res.scalar()
        print(f"Total holdings in DB: {total_holdings}")
        
        # Check holdings for quant Small Cap (120828)
        stmt = select(FundHolding).where(FundHolding.scheme_code == '120828').limit(5)
        res = await session.execute(stmt)
        holdings_quant = res.scalars().all()
        print(f"\nHoldings for quant Small Cap (120828): count={len(holdings_quant)}")
        for h in holdings_quant:
            print(f"- {h.stock_name}: {h.holding_percentage}% in {h.sector} ({h.market_cap})")
            
        # Check holdings for HDFC Flexi Cap (118955)
        stmt = select(FundHolding).where(FundHolding.scheme_code == '118955').limit(5)
        res = await session.execute(stmt)
        holdings_hdfc = res.scalars().all()
        print(f"\nHoldings for HDFC Flexi Cap (118955): count={len(holdings_hdfc)}")
        for h in holdings_hdfc:
            print(f"- {h.stock_name}: {h.holding_percentage}% in {h.sector} ({h.market_cap})")

if __name__ == "__main__":
    asyncio.run(main())
