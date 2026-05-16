from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, text
from sqlalchemy.orm import selectinload
from typing import List, Optional
from ..models import Fund

class FundRepository:
    """
    Repository for database operations on funds.
    """
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search_funds(self, query: str, limit: int = 10) -> List[Fund]:
        """
        Search for funds by name or AMC name.
        Orders by exact matches first.
        """
        search_pattern = f"%{query}%"
        
        # Build the query
        stmt = (
            select(Fund)
            .where(
                or_(
                    Fund.scheme_name.ilike(search_pattern),
                    Fund.amc_name.ilike(search_pattern)
                ),
                Fund.is_active == True
            )
            .order_by(
                # Case-insensitive exact match priority
                func.lower(Fund.scheme_name) == query.lower(),
                # Partial match priority (starts with)
                Fund.scheme_name.ilike(f"{query}%").desc(),
                Fund.scheme_name
            )
            .limit(limit)
        )
        
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_fund_by_code(self, scheme_code: str) -> Optional[Fund]:
        """Get a single fund by its scheme code."""
        stmt = select(Fund).where(Fund.scheme_code == scheme_code)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_funds_by_codes(self, scheme_codes: List[str]) -> List[Fund]:
        """Get multiple funds by their scheme codes."""
        stmt = select(Fund).where(Fund.scheme_code.in_(scheme_codes))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_all_amcs(self) -> List[str]:
        """Get a list of all unique AMC names."""
        stmt = select(Fund.amc_name).distinct().order_by(Fund.amc_name)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
