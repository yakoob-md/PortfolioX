import asyncio
import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from db.database import engine, Base
from db.models import AnalysisSession

async def migrate():
    print("Checking database connection...")
    try:
        async with engine.begin() as conn:
            # Check existing tables
            result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            existing_tables = [row[0] for row in result.all()]
            print(f"Existing tables: {existing_tables}")
            
            print("Creating all tables...")
            await conn.run_sync(Base.metadata.create_all)
            
            # Check again
            result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            new_tables = [row[0] for row in result.all()]
            print(f"New tables: {new_tables}")
            
        print("Migration complete.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == '__main__':
    asyncio.run(migrate())
