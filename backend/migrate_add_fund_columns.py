"""
Migration script to add new columns to the funds table.
Run: python migrate_add_fund_columns.py
"""
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import engine
from sqlalchemy import text

async def migrate():
    """Add new columns to the funds table."""
    print("Adding new columns to funds table...")
    
    async with engine.begin() as conn:
        columns_to_add = [
            ("fund_manager", "TEXT"),
            ("portfolio_pe_ratio", "NUMERIC(8, 2)"),
            ("portfolio_pb_ratio", "NUMERIC(8, 2)"),
            ("num_stocks", "INTEGER"),
            ("top_holdings", "JSONB"),
            ("equity_percentage", "NUMERIC(5, 2)"),
            ("debt_percentage", "NUMERIC(5, 2)"),
            ("cash_percentage", "NUMERIC(5, 2)"),
            ("benchmark", "TEXT"),
            ("exit_load", "TEXT"),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                await conn.execute(text(f"""
                    ALTER TABLE funds 
                    ADD COLUMN IF NOT EXISTS {col_name} {col_type}
                """))
                print(f"  Added column: {col_name} ({col_type})")
            except Exception as e:
                print(f"  Error adding {col_name}: {e}")
        
        print("Migration complete!")

async def main():
    try:
        await migrate()
    except Exception as e:
        print(f"\n=== ERROR ===\n{type(e).__name__}: {e}\n")

if __name__ == "__main__":
    asyncio.run(main())
