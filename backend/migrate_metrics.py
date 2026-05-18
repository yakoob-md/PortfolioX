"""
Migration script to add real-time metric columns to funds table.
Run this after adding new columns to the Fund model.
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import engine
from sqlalchemy import text

async def run_migration():
    """Add new columns for real-time fund metrics."""
    async with engine.begin() as conn:
        columns_to_add = [
            ("return_1y", "NUMERIC(8, 2)"),
            ("return_3y", "NUMERIC(8, 2)"),
            ("return_5y", "NUMERIC(8, 2)"),
            ("volatility_1y", "NUMERIC(8, 2)"),
            ("volatility_3y", "NUMERIC(8, 2)"),
            ("sharpe_1y", "NUMERIC(8, 2)"),
            ("sharpe_3y", "NUMERIC(8, 2)"),
            ("riskometer", "TEXT"),
            ("min_sip", "INTEGER"),
            ("min_lumpsum", "INTEGER"),
            ("fund_type", "TEXT"),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                await conn.execute(text(f"""
                    ALTER TABLE funds 
                    ADD COLUMN IF NOT EXISTS {col_name} {col_type}
                """))
                print(f"✓ Column '{col_name}' added/verified")
            except Exception as e:
                print(f"✗ Failed to add column '{col_name}': {e}")
        
        print("\nMigration complete. New columns added to funds table.")

if __name__ == "__main__":
    asyncio.run(run_migration())
