import asyncio
import sys
import os
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from db.database import AsyncSessionLocal
from db.repositories.fund_repo import FundRepository
from db.models import Fund

async def find_funds():
    async with AsyncSessionLocal() as session:
        repo = FundRepository(session)
        names = [
            'Parag Parikh Flexi Cap',
            'HDFC Flexi Cap',
            'Mirae Asset Large Cap',
            'SBI Bluechip',
            'Axis Flexi Cap',
            'Kotak Flexi Cap',
            'ICICI Prudential Bluechip',
            'DSP Tax Saver',
            'Nippon India Growth',
            'Franklin India Prima'
        ]
        results = {}
        for name in names:
            found = await repo.search_funds(name, limit=10)
            # Filter for Direct Plan Growth
            direct_growth = [f for f in found if 'Direct' in f.scheme_name and 'Growth' in f.scheme_name]
            if direct_growth:
                results[name] = {'code': direct_growth[0].scheme_code, 'name': direct_growth[0].scheme_name}
            elif found:
                results[name] = {'code': found[0].scheme_code, 'name': found[0].scheme_name}
            else:
                results[name] = 'Not found'
        
        print(json.dumps(results, indent=2))

if __name__ == '__main__':
    asyncio.run(find_funds())
