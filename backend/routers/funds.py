from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import json

from db.database import get_db
from db.repositories.fund_repo import FundRepository
from db.cache import cache_service
from services.fund_resolver import FundResolver
from models.schemas import FundSearchResponse, FundBase, FundDetail

router = APIRouter(prefix="/funds", tags=["funds"])

@router.get("/search", response_model=FundSearchResponse)
async def search_funds(
    q: str = Query(..., min_length=2, description="Search query for mutual funds"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Search for mutual funds by name or AMC.
    Results are cached in Redis for 1 hour.
    """
    cache_key = f"search:{q}:{limit}"
    
    # Try cache first
    cached_data = await cache_service.get_cached(cache_key)
    if cached_data:
        return FundSearchResponse(**json.loads(cached_data))
    
    # DB Search
    fund_repo = FundRepository(db)
    fund_resolver = FundResolver(fund_repo)
    results = await fund_resolver.search_funds(q, limit=limit)
    
    response_data = FundSearchResponse(
        results=[FundBase.model_validate(f) for f in results],
        total=len(results),
        query=q
    )
    
    # Cache result
    await cache_service.set_cached(cache_key, response_data.model_dump_json(), ttl_seconds=3600)
    
    return response_data

@router.get("/amcs", response_model=List[str])
async def get_amcs(db: AsyncSession = Depends(get_db)):
    """
    Get a list of all unique AMC names.
    Cached for 24 hours.
    """
    cache_key = "amcs:list"
    
    cached_data = await cache_service.get_cached(cache_key)
    if cached_data:
        return json.loads(cached_data)
        
    fund_repo = FundRepository(db)
    amcs = await fund_repo.get_all_amcs()
    
    await cache_service.set_cached(cache_key, json.dumps(amcs), ttl_seconds=86400)
    
    return amcs

@router.get("/{scheme_code}", response_model=FundDetail)
async def get_fund_details(
    scheme_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information for a specific mutual fund.
    Cached for 24 hours.
    """
    cache_key = f"fund:{scheme_code}"
    
    cached_data = await cache_service.get_cached(cache_key)
    if cached_data:
        return FundDetail(**json.loads(cached_data))
        
    fund_repo = FundRepository(db)
    fund = await fund_repo.get_fund_by_code(scheme_code)
    
    if not fund:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fund with code {scheme_code} not found"
        )
        
    response_data = FundDetail.model_validate(fund)
    
    await cache_service.set_cached(cache_key, response_data.model_dump_json(), ttl_seconds=86400)
    
    return response_data
