import asyncio
import sys
import os
from datetime import date
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from db.database import engine
from sqlalchemy import text

D = date(2024, 4, 30)

HOLDINGS = [
    ('122639', D, 'INE002A01018', 'Reliance Industries Ltd.', 'Energy', 'Large', 8.5, 'Equity'),
    ('122639', D, 'INE040A01034', 'HDFC Bank Ltd.', 'Financial Services', 'Large', 7.2, 'Equity'),
    ('122639', D, 'INE044A01036', 'Bajaj Holdings', 'Financial Services', 'Large', 6.8, 'Equity'),
    ('122639', D, 'US5949181045', 'Microsoft Corp (USA)', 'Technology', 'Large', 5.4, 'Equity'),
    ('122639', D, 'INE009A01021', 'Infosys Ltd.', 'Technology', 'Large', 4.5, 'Equity'),
    ('118955', D, 'INE296A01024', 'ICICI Bank Ltd.', 'Financial Services', 'Large', 9.2, 'Equity'),
    ('118955', D, 'INE040A01034', 'HDFC Bank Ltd.', 'Financial Services', 'Large', 8.8, 'Equity'),
    ('118955', D, 'INE002A01018', 'Reliance Industries Ltd.', 'Energy', 'Large', 7.5, 'Equity'),
    ('118955', D, 'INE009A01021', 'Infosys Ltd.', 'Technology', 'Large', 6.2, 'Equity'),
    ('118955', D, 'INE030A01027', 'Hindustan Unilever Ltd.', 'FMCG', 'Large', 4.1, 'Equity'),
    ('118825', D, 'INE040A01034', 'HDFC Bank Ltd.', 'Financial Services', 'Large', 9.5, 'Equity'),
    ('118825', D, 'INE296A01024', 'ICICI Bank Ltd.', 'Financial Services', 'Large', 8.7, 'Equity'),
    ('118825', D, 'INE002A01018', 'Reliance Industries Ltd.', 'Energy', 'Large', 8.2, 'Equity'),
    ('118825', D, 'INE062A01020', 'State Bank of India', 'Financial Services', 'Large', 4.1, 'Equity'),
    ('141925', D, 'INE296A01024', 'ICICI Bank Ltd.', 'Financial Services', 'Large', 8.9, 'Equity'),
    ('141925', D, 'INE009A01021', 'Infosys Ltd.', 'Technology', 'Large', 7.5, 'Equity'),
    ('141925', D, 'INE467B01029', 'Tata Consultancy Services Ltd.', 'Technology', 'Large', 4.8, 'Equity'),
    ('108467', D, 'INE296A01024', 'ICICI Bank Ltd.', 'Financial Services', 'Large', 9.8, 'Equity'),
    ('108467', D, 'INE002A01018', 'Reliance Industries Ltd.', 'Energy', 'Large', 8.5, 'Equity'),
    ('108467', D, 'INE040A01034', 'HDFC Bank Ltd.', 'Financial Services', 'Large', 8.1, 'Equity'),
]

async def seed():
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE fund_holdings ADD COLUMN IF NOT EXISTS market_cap TEXT'))
        print("Column ensured.")

        codes = tuple(set(r[0] for r in HOLDINGS))
        await conn.execute(text(f"DELETE FROM fund_holdings WHERE scheme_code IN {codes}"))
        print(f"Cleared old holdings for {len(codes)} funds.")

        for row in HOLDINGS:
            await conn.execute(text("""
                INSERT INTO fund_holdings
                  (scheme_code, disclosure_date, stock_isin, stock_name, sector, market_cap, holding_percentage, asset_type)
                VALUES (:code, :date, :isin, :name, :sector, :mcap, :pct, :atype)
            """), {
                'code': row[0], 'date': row[1], 'isin': row[2],
                'name': row[3], 'sector': row[4], 'mcap': row[5],
                'pct': row[6], 'atype': row[7]
            })

        print(f"Seeded {len(HOLDINGS)} holdings successfully.")

async def main():
    try:
        await seed()
    except Exception as e:
        print(f"\n=== ERROR ===\n{type(e).__name__}: {e}\n")

if __name__ == '__main__':
    asyncio.run(main())
