import asyncio
import sys
import os
from datetime import date

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from db.database import AsyncSessionLocal
from db.models import FundHolding
from sqlalchemy import delete

# Representative holdings for Top Funds (Simplified for MVP testing)
TEST_HOLDINGS = {
    "122639": [ # Parag Parikh Flexi Cap
        {"isin": "INE002A01018", "name": "Reliance Industries Ltd.", "sector": "Energy", "pct": 8.5},
        {"isin": "INE040A01034", "name": "HDFC Bank Ltd.", "sector": "Financial Services", "pct": 7.2},
        {"isin": "INE044A01036", "name": "Bajaj Holdings & Investment Ltd.", "sector": "Financial Services", "pct": 6.8},
        {"isin": "US5949181045", "name": "Microsoft Corp (USA)", "sector": "Technology", "pct": 5.4},
        {"isin": "US02079K3059", "name": "Alphabet Inc (USA)", "sector": "Technology", "pct": 4.9},
        {"isin": "INE009A01021", "name": "Infosys Ltd.", "sector": "Technology", "pct": 4.5},
        {"isin": "INE062A01020", "name": "State Bank of India", "sector": "Financial Services", "pct": 4.2},
        {"isin": "INE296A01024", "name": "ICICI Bank Ltd.", "sector": "Financial Services", "pct": 3.8},
    ],
    "118955": [ # HDFC Flexi Cap
        {"isin": "INE296A01024", "name": "ICICI Bank Ltd.", "sector": "Financial Services", "pct": 9.2},
        {"isin": "INE040A01034", "name": "HDFC Bank Ltd.", "sector": "Financial Services", "pct": 8.8},
        {"isin": "INE002A01018", "name": "Reliance Industries Ltd.", "sector": "Energy", "pct": 7.5},
        {"isin": "INE009A01021", "name": "Infosys Ltd.", "sector": "Technology", "pct": 6.2},
        {"isin": "INE062A01020", "name": "State Bank of India", "sector": "Financial Services", "pct": 5.5},
        {"isin": "INE030A01027", "name": "Hindustan Unilever Ltd.", "sector": "FMCG", "pct": 4.1},
        {"isin": "INE075A01022", "name": "Wipro Ltd.", "sector": "Technology", "pct": 3.5},
    ],
    "118825": [ # Mirae Asset Large Cap
        {"isin": "INE040A01034", "name": "HDFC Bank Ltd.", "sector": "Financial Services", "pct": 9.5},
        {"isin": "INE296A01024", "name": "ICICI Bank Ltd.", "sector": "Financial Services", "pct": 8.7},
        {"isin": "INE002A01018", "name": "Reliance Industries Ltd.", "sector": "Energy", "pct": 8.2},
        {"isin": "INE009A01021", "name": "Infosys Ltd.", "sector": "Technology", "pct": 6.8},
        {"isin": "INE238A01034", "name": "Axis Bank Ltd.", "sector": "Financial Services", "pct": 4.5},
        {"isin": "INE062A01020", "name": "State Bank of India", "sector": "Financial Services", "pct": 4.1},
        {"isin": "INE154A01025", "name": "ITC Ltd.", "sector": "FMCG", "pct": 3.9},
    ],
    "141925": [ # Axis Flexi Cap
        {"isin": "INE296A01024", "name": "ICICI Bank Ltd.", "sector": "Financial Services", "pct": 8.9},
        {"isin": "INE040A01034", "name": "HDFC Bank Ltd.", "sector": "Financial Services", "pct": 8.2},
        {"isin": "INE009A01021", "name": "Infosys Ltd.", "sector": "Technology", "pct": 7.5},
        {"isin": "INE154A01025", "name": "ITC Ltd.", "sector": "FMCG", "pct": 5.2},
        {"isin": "INE467B01029", "name": "Tata Consultancy Services Ltd.", "sector": "Technology", "pct": 4.8},
        {"isin": "INE018A01030", "name": "Larsen & Toubro Ltd.", "sector": "Construction", "pct": 4.2},
    ],
    "108467": [ # ICICI Pru Bluechip
        {"isin": "INE296A01024", "name": "ICICI Bank Ltd.", "sector": "Financial Services", "pct": 9.8},
        {"isin": "INE002A01018", "name": "Reliance Industries Ltd.", "sector": "Energy", "pct": 8.5},
        {"isin": "INE040A01034", "name": "HDFC Bank Ltd.", "sector": "Financial Services", "pct": 8.1},
        {"isin": "INE009A01021", "name": "Infosys Ltd.", "sector": "Technology", "pct": 7.2},
        {"isin": "INE018A01030", "name": "Larsen & Toubro Ltd.", "sector": "Construction", "pct": 5.5},
        {"isin": "INE062A01020", "name": "State Bank of India", "sector": "Financial Services", "pct": 4.8},
    ]
}

async def seed_holdings():
    async with AsyncSessionLocal() as session:
        # Clear existing holdings for these funds
        scheme_codes = list(TEST_HOLDINGS.keys())
        await session.execute(delete(FundHolding).where(FundHolding.scheme_code.in_(scheme_codes)))
        
        disclosure_date = date(2024, 4, 30) # Fixed date for testing
        
        for code, holdings in TEST_HOLDINGS.items():
            print(f"Seeding holdings for {code}...")
            for h in holdings:
                holding = FundHolding(
                    scheme_code=code,
                    disclosure_date=disclosure_date,
                    stock_isin=h["isin"],
                    stock_name=h["name"],
                    sector=h["sector"],
                    holding_percentage=h["pct"],
                    asset_type="Equity"
                )
                session.add(holding)
        
        await session.commit()
        print("Successfully seeded test holdings.")

if __name__ == '__main__':
    asyncio.run(seed_holdings())
