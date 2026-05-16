from db.repositories.fund_repo import FundRepository
from db.models import Fund
from typing import List, Optional, Tuple

class FundResolver:
    """
    Service for resolving fund names to scheme codes.
    Handles fuzzy matching and common abbreviations.
    """
    def __init__(self, fund_repo: FundRepository):
        self.fund_repo = fund_repo
        self.abbreviations = {
            "PPFAS": "Parag Parikh",
            "HDFC TF": "HDFC Tax",
            "SBI BC": "SBI Bluechip",
            "ICICI Pru": "ICICI Prudential"
        }

    def _preprocess_query(self, query: str) -> str:
        """Replace common abbreviations in the query."""
        processed_query = query
        for abbr, full_name in self.abbreviations.items():
            if abbr.lower() in query.lower():
                # Simple replacement for now
                processed_query = processed_query.replace(abbr, full_name)
        return processed_query

    async def resolve_fund(self, fund_name: str) -> Optional[Fund]:
        """
        Takes a fund name and returns the best matching Fund object.
        """
        processed_query = self._preprocess_query(fund_name)
        results = await self.fund_repo.search_funds(processed_query, limit=1)
        return results[0] if results else None

    async def search_funds(self, query: str, limit: int = 10) -> List[Fund]:
        """Search for funds with abbreviation handling."""
        processed_query = self._preprocess_query(query)
        return await self.fund_repo.search_funds(processed_query, limit=limit)
