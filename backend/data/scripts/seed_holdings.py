import asyncio
import sys
import os
from datetime import date

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from db.database import AsyncSessionLocal
from db.models import FundHolding
from sqlalchemy import delete

# Representative holdings for Top 10 Funds
TEST_HOLDINGS = {
    "122639": [ # Parag Parikh Flexi Cap
        {"isin": "INE002A01018", "name": "Reliance Industries Ltd.", "sector": "Energy", "mcap": "Large", "pct": 8.5},
        {"isin": "INE040A01034", "name": "HDFC Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 7.2},
        {"isin": "INE044A01036", "name": "Bajaj Holdings & Investment Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 6.8},
        {"isin": "US5949181045", "name": "Microsoft Corp (USA)", "sector": "Technology", "mcap": "Large", "pct": 5.4},
        {"isin": "US02079K3059", "name": "Alphabet Inc (USA)", "sector": "Technology", "mcap": "Large", "pct": 4.9},
        {"isin": "INE009A01021", "name": "Infosys Ltd.", "sector": "Technology", "mcap": "Large", "pct": 4.5},
    ],
    "118955": [ # HDFC Flexi Cap
        {"isin": "INE296A01024", "name": "ICICI Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 9.2},
        {"isin": "INE040A01034", "name": "HDFC Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 8.8},
        {"isin": "INE002A01018", "name": "Reliance Industries Ltd.", "sector": "Energy", "mcap": "Large", "pct": 7.5},
        {"isin": "INE009A01021", "name": "Infosys Ltd.", "sector": "Technology", "mcap": "Large", "pct": 6.2},
        {"isin": "INE030A01027", "name": "Hindustan Unilever Ltd.", "sector": "FMCG", "mcap": "Large", "pct": 4.1},
    ],
    "118825": [ # Mirae Asset Large Cap
        {"isin": "INE040A01034", "name": "HDFC Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 9.5},
        {"isin": "INE296A01024", "name": "ICICI Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 8.7},
        {"isin": "INE002A01018", "name": "Reliance Industries Ltd.", "sector": "Energy", "mcap": "Large", "pct": 8.2},
        {"isin": "INE062A01020", "name": "State Bank of India", "sector": "Financial Services", "mcap": "Large", "pct": 4.1},
    ],
    "141925": [ # Axis Flexi Cap
        {"isin": "INE296A01024", "name": "ICICI Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 8.9},
        {"isin": "INE009A01021", "name": "Infosys Ltd.", "sector": "Technology", "mcap": "Large", "pct": 7.5},
        {"isin": "INE467B01029", "name": "Tata Consultancy Services Ltd.", "sector": "Technology", "mcap": "Large", "pct": 4.8},
    ],
    "108467": [ # ICICI Pru Bluechip
        {"isin": "INE296A01024", "name": "ICICI Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 9.8},
        {"isin": "INE002A01018", "name": "Reliance Industries Ltd.", "sector": "Energy", "mcap": "Large", "pct": 8.5},
        {"isin": "INE040A01034", "name": "HDFC Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 8.1},
    ],
    "118665": [ # Nippon India Growth
        {"isin": "INE121J01017", "name": "Cholamandalam Investment & Finance", "sector": "Financial Services", "mcap": "Mid", "pct": 4.5},
        {"isin": "INE245A01021", "name": "The Federal Bank Ltd.", "sector": "Financial Services", "mcap": "Mid", "pct": 3.8},
        {"isin": "INE155A01022", "name": "Tata Motors Ltd.", "sector": "Auto", "mcap": "Large", "pct": 3.5},
    ],
    "119803": [ # SBI Bluechip (Assumed code)
        {"isin": "INE040A01034", "name": "HDFC Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 9.1},
        {"isin": "INE296A01024", "name": "ICICI Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 8.2},
        {"isin": "INE154A01025", "name": "ITC Ltd.", "sector": "FMCG", "mcap": "Large", "pct": 4.5},
    ],
    "120155": [ # Kotak Flexi Cap (Assumed code)
        {"isin": "INE296A01024", "name": "ICICI Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 8.5},
        {"isin": "INE002A01018", "name": "Reliance Industries Ltd.", "sector": "Energy", "mcap": "Large", "pct": 7.8},
        {"isin": "INE040A01034", "name": "HDFC Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 7.2},
    ],
    "119551": [ # DSP Tax Saver (Assumed code)
        {"isin": "INE296A01024", "name": "ICICI Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 9.0},
        {"isin": "INE040A01034", "name": "HDFC Bank Ltd.", "sector": "Financial Services", "mcap": "Large", "pct": 8.5},
        {"isin": "INE062A01020", "name": "State Bank of India", "sector": "Financial Services", "mcap": "Large", "pct": 5.2},
    ],
    "100414": [ # Franklin India Prima (Assumed code)
        {"isin": "INE245A01021", "name": "The Federal Bank Ltd.", "sector": "Financial Services", "mcap": "Mid", "pct": 4.2},
        {"isin": "INE066F01012", "name": "Sundaram Finance Ltd.", "sector": "Financial Services", "mcap": "Mid", "pct": 3.9},
        {"isin": "INE482A01020", "name": "Crompton Greaves Consumer Electricals", "sector": "Consumer Durables", "mcap": "Mid", "pct": 3.5},
    ]
}

async def seed_holdings():
    async with AsyncSessionLocal() as session:
        scheme_codes = list(TEST_HOLDINGS.keys())
        await session.execute(delete(FundHolding).where(FundHolding.scheme_code.in_(scheme_codes)))
        
        disclosure_date = date(2024, 4, 30)
        
        for code, holdings in TEST_HOLDINGS.items():
            print(f"Seeding holdings for {code}...")
            for h in holdings:
                holding = FundHolding(
                    scheme_code=code,
                    disclosure_date=disclosure_date,
                    stock_isin=h["isin"],
                    stock_name=h["name"],
                    sector=h["sector"],
                    market_cap=h["mcap"],
                    holding_percentage=h["pct"],
                    asset_type="Equity"
                )
                session.add(holding)
        
        await session.commit()
        print("Successfully seeded top 10 test holdings with market cap data.")

if __name__ == '__main__':
    asyncio.run(seed_holdings())
