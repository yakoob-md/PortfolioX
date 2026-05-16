import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from db.database import engine, Base
from db.models import AnalysisSession, FundHolding, Fund

async def migrate():
    print("Connecting to database...")
    try:
        async with engine.begin() as conn:
            # 1. Create any missing tables
            print("Creating missing tables...")
            await conn.run_sync(Base.metadata.create_all)

            # 2. Apply column additions to existing tables
            print("Applying column migrations...")
            column_migrations = [
                "ALTER TABLE fund_holdings ADD COLUMN IF NOT EXISTS market_cap TEXT",
            ]
            for stmt in column_migrations:
                await conn.execute(text(stmt))
                print(f"  OK: {stmt[:70]}")

            # 3. Verify
            result = await conn.execute(text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
            ))
            tables = [row[0] for row in result.all()]
            print(f"Tables: {tables}")

            result = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'fund_holdings' ORDER BY ordinal_position"
            ))
            cols = [row[0] for row in result.all()]
            print(f"fund_holdings columns: {cols}")

        print("Migration complete.")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == '__main__':
    asyncio.run(migrate())
