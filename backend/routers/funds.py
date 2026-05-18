from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import json
import logging

from db.database import get_db
from db.repositories.fund_repo import FundRepository
from db.cache import cache_service
from services.fund_resolver import FundResolver
from services.mfapi_service import MFAPIService
from models.schemas import FundSearchResponse, FundBase, FundDetail

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/funds", tags=["funds"])

@router.get("/search", response_model=FundSearchResponse)
async def search_funds(
    request: Request,
    q: Optional[str] = Query(None, description="Search query for mutual funds"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Search for mutual funds by name or AMC.
    Results are cached in Redis for 1 hour.
    Rate limit: 30 requests/min.
    """
    # Rate limiting
    client_ip = request.client.host
    if not await cache_service.check_rate_limit(client_ip, limit=30, window=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again in a minute."
        )
    
    q = q or ""
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
    Cached for 24 hours (unless it has null/stale metrics, which triggers auto-hydration).
    """
    cache_key = f"fund:{scheme_code}"
    
    cached_data = await cache_service.get_cached(cache_key)
    if cached_data:
        try:
            parsed_cached = json.loads(cached_data)
            # Check if the cached version contains return_1y and expense_ratio. If not, bypass cache so we can fetch real data!
            if parsed_cached.get("return_1y") is not None and parsed_cached.get("expense_ratio") is not None:
                return FundDetail(**parsed_cached)
        except Exception:
            pass
        
    fund_repo = FundRepository(db)
    fund = await fund_repo.get_fund_by_code(scheme_code)
    
    if not fund:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fund with code {scheme_code} not found"
        )
        
    # Check if returns/expense_ratio/aum are null or stale (updated more than 7 days ago)
    needs_refresh = False
    if fund.return_1y is None or fund.expense_ratio is None or fund.aum_crore is None:
        needs_refresh = True
    elif fund.updated_at:
        updated_at_naive = fund.updated_at.replace(tzinfo=None) if fund.updated_at.tzinfo else fund.updated_at
        age_days = (datetime.utcnow() - updated_at_naive).days
        if age_days >= 7:
            needs_refresh = True
            
    if needs_refresh:
        try:
            logger.info(f"Fund {scheme_code} metrics are missing or stale. Triggering on-the-fly hydration from mfapi.in...")
            mfapi = MFAPIService()
            meta = await mfapi.get_fund_metadata(scheme_code)
            await mfapi.close()
            
            if meta:
                metrics = {
                    "scheme_name": meta.scheme_name,
                    "amc_name": meta.amc_name,
                    "category": meta.category,
                    "sub_category": meta.sub_category,
                    "plan_type": meta.plan_type,
                    "option_type": meta.option_type,
                    "expense_ratio": meta.expense_ratio,
                    "aum_crore": meta.aum_crore,
                    "return_1y": meta.return_1y,
                    "return_3y": meta.return_3y,
                    "return_5y": meta.return_5y,
                    "volatility_1y": meta.volatility_1y,
                    "volatility_3y": meta.volatility_3y,
                    "sharpe_1y": meta.sharpe_1y,
                    "sharpe_3y": meta.sharpe_3y,
                    "riskometer": meta.riskometer,
                    "min_sip": meta.min_sip,
                    "min_lumpsum": meta.min_lumpsum,
                    "fund_type": meta.fund_type,
                }
                if meta.latest_nav:
                    metrics["nav"] = meta.latest_nav
                if meta.nav_date:
                    metrics["nav_date"] = meta.nav_date
                    
                await fund_repo.update_fund_metrics(scheme_code, metrics)
                
                # Fetch fresh from DB so sqlalchemy local session is updated
                db.expire(fund)
                fund = await fund_repo.get_fund_by_code(scheme_code)
        except Exception as refresh_err:
            logger.error(f"Failed to refresh fund {scheme_code} on-the-fly: {refresh_err}")
            
    response_data = FundDetail.model_validate(fund)
    
    await cache_service.set_cached(cache_key, response_data.model_dump_json(), ttl_seconds=86400)
    
    return response_data

@router.post("/{scheme_code}/refresh")
async def refresh_fund_data(
    scheme_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh fund data from mfapi.in in real-time.
    Fetches latest NAV, returns, volatility, Sharpe ratio, and riskometer.
    """
    try:
        mfapi = MFAPIService()
        meta = await mfapi.get_fund_metadata(scheme_code)
        await mfapi.close()
        
        if not meta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not fetch data for fund {scheme_code} from mfapi.in"
            )
        
        # Update database with real-time metrics
        fund_repo = FundRepository(db)
        metrics = {
            "scheme_name": meta.scheme_name,
            "amc_name": meta.amc_name,
            "category": meta.category,
            "sub_category": meta.sub_category,
            "plan_type": meta.plan_type,
            "option_type": meta.option_type,
            "expense_ratio": meta.expense_ratio,
            "aum_crore": meta.aum_crore,
            "return_1y": meta.return_1y,
            "return_3y": meta.return_3y,
            "return_5y": meta.return_5y,
            "volatility_1y": meta.volatility_1y,
            "volatility_3y": meta.volatility_3y,
            "sharpe_1y": meta.sharpe_1y,
            "sharpe_3y": meta.sharpe_3y,
            "riskometer": meta.riskometer,
            "min_sip": meta.min_sip,
            "min_lumpsum": meta.min_lumpsum,
            "fund_type": meta.fund_type,
        }
        
        # Also update NAV if available
        if meta.latest_nav:
            metrics["nav"] = meta.latest_nav
        if meta.nav_date:
            metrics["nav_date"] = meta.nav_date
        
        success = await fund_repo.update_fund_metrics(scheme_code, metrics)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fund {scheme_code} not found in database"
            )
        
        # Invalidate cache
        await cache_service.delete_cached(f"fund:{scheme_code}")
        
        return {
            "scheme_code": scheme_code,
            "message": "Fund data refreshed successfully",
            "metrics": {
                "nav": meta.latest_nav,
                "nav_date": str(meta.nav_date) if meta.nav_date else None,
                "return_1y": meta.return_1y,
                "return_3y": meta.return_3y,
                "return_5y": meta.return_5y,
                "volatility_1y": meta.volatility_1y,
                "sharpe_1y": meta.sharpe_1y,
                "riskometer": meta.riskometer,
                "expense_ratio": meta.expense_ratio,
                "aum_crore": meta.aum_crore,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to refresh fund data for {scheme_code}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh fund data: {str(e)}"
        )

@router.post("/bulk-refresh")
async def bulk_refresh_funds(
    scheme_codes: List[str],
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh multiple funds in parallel from mfapi.in.
    Returns count of successfully updated funds.
    """
    if not scheme_codes or len(scheme_codes) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide between 1 and 50 scheme codes"
        )
    
    try:
        mfapi = MFAPIService()
        fund_data = await mfapi.get_fund_details_batch(scheme_codes)
        await mfapi.close()
        
        # Prepare metrics for bulk update
        metrics_map = {}
        for code, meta in fund_data.items():
            metrics_map[code] = {
                "scheme_name": meta.scheme_name,
                "amc_name": meta.amc_name,
                "category": meta.category,
                "sub_category": meta.sub_category,
                "plan_type": meta.plan_type,
                "option_type": meta.option_type,
                "expense_ratio": meta.expense_ratio,
                "aum_crore": meta.aum_crore,
                "return_1y": meta.return_1y,
                "return_3y": meta.return_3y,
                "return_5y": meta.return_5y,
                "volatility_1y": meta.volatility_1y,
                "volatility_3y": meta.volatility_3y,
                "sharpe_1y": meta.sharpe_1y,
                "sharpe_3y": meta.sharpe_3y,
                "riskometer": meta.riskometer,
                "min_sip": meta.min_sip,
                "min_lumpsum": meta.min_lumpsum,
                "fund_type": meta.fund_type,
                "nav": meta.latest_nav,
                "nav_date": meta.nav_date,
            }
        
        fund_repo = FundRepository(db)
        updated_count = await fund_repo.bulk_update_fund_metrics(metrics_map)
        
        # Invalidate caches
        for code in metrics_map.keys():
            await cache_service.delete_cached(f"fund:{code}")
        
        return {
            "message": f"Successfully refreshed {updated_count}/{len(scheme_codes)} funds",
            "updated_count": updated_count,
            "total_requested": len(scheme_codes),
        }
        
    except Exception as e:
        logger.error(f"Bulk refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk refresh failed: {str(e)}"
        )
