"""
MFAPI Service - Fetches real-time mutual fund data from mfapi.in
Free API, no authentication required.
Provides: NAV history, returns calculation, fund metadata
"""
import httpx
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, date
from decimal import Decimal

logger = logging.getLogger(__name__)

MFAPI_BASE = "https://api.mfapi.in"

class NAVDataPoint:
    """Single NAV data point with date and value."""
    def __init__(self, nav_date: date, nav: float):
        self.nav_date = nav_date
        self.nav = nav

class FundMetaData:
    """Complete fund metadata from mfapi.in."""
    def __init__(self):
        self.scheme_code: str = ""
        self.scheme_name: str = ""
        self.amc_name: str = ""
        self.fund_type: str = ""  # Open Ended, Close Ended, etc.
        self.category: str = ""  # Equity, Debt, Hybrid, etc.
        self.sub_category: str = ""  # Large Cap, Mid Cap, etc.
        self.plan_type: str = ""  # Direct, Regular
        self.option_type: str = ""  # Growth, IDCW, Bonus
        self.latest_nav: Optional[float] = None
        self.nav_date: Optional[date] = None
        self.nav_history: List[NAVDataPoint] = []
        # Calculated returns
        self.return_1y: Optional[float] = None
        self.return_3y: Optional[float] = None
        self.return_5y: Optional[float] = None
        self.return_since_inception: Optional[float] = None
        self.inception_date: Optional[date] = None
        # Volatility metrics
        self.volatility_1y: Optional[float] = None
        self.volatility_3y: Optional[float] = None
        self.sharpe_1y: Optional[float] = None
        self.sharpe_3y: Optional[float] = None
        # Risk metrics
        self.riskometer: str = "Moderate"
        self.min_sip: int = 500
        self.min_lumpsum: int = 5000

class MFAPIService:
    """Service to fetch and process data from mfapi.in"""
    
    def __init__(self):
        self._client = httpx.AsyncClient(
            base_url=MFAPI_BASE,
            timeout=30.0,
            headers={"User-Agent": "PortfolioX/1.0"}
        )
    
    async def close(self):
        await self._client.aclose()
    
    async def get_all_funds(self) -> List[Dict[str, Any]]:
        """
        Get list of all funds from mfapi.in
        Returns: List of fund objects with scheme_code, scheme_name, etc.
        """
        try:
            response = await self._client.get("/mf")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch fund list from mfapi.in: {e}")
            return []
    
    async def get_fund_nav_history(self, scheme_code: str) -> List[Dict[str, str]]:
        """
        Get complete NAV history for a fund.
        Returns: List of {"date": "DD-MM-YYYY", "nav": "123.45"}
        """
        try:
            response = await self._client.get(f"/mf/{scheme_code}")
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
        except Exception as e:
            logger.error(f"Failed to fetch NAV history for {scheme_code}: {e}")
            return []
    
    async def get_fund_latest_nav(self, scheme_code: str) -> Optional[Dict[str, str]]:
        """
        Get latest NAV for a fund.
        Returns: {"date": "DD-MM-YYYY", "nav": "123.45"} or None
        """
        try:
            response = await self._client.get(f"/mf/{scheme_code}/latest")
            response.raise_for_status()
            data = response.json()
            return data.get("data")
        except Exception as e:
            logger.error(f"Failed to fetch latest NAV for {scheme_code}: {e}")
            return None
    
    @staticmethod
    def parse_nav_date(date_str: str) -> Optional[date]:
        """Parse date string from mfapi.in format (DD-MM-YYYY)"""
        try:
            return datetime.strptime(date_str, "%d-%m-%Y").date()
        except (ValueError, TypeError):
            return None
    
    @staticmethod
    def parse_nav(nav_str: str) -> Optional[float]:
        """Parse NAV string to float"""
        try:
            if nav_str and nav_str.strip() and nav_str != "N.A.":
                return float(nav_str.strip())
        except (ValueError, TypeError):
            pass
        return None
    
    async def get_fund_metadata(self, scheme_code: str) -> Optional[FundMetaData]:
        """
        Get complete fund metadata including NAV history and calculated returns.
        This is the main method to get all data for a fund.
        """
        try:
            # Fetch NAV history
            nav_history_raw = await self.get_fund_nav_history(scheme_code)
            if not nav_history_raw:
                return None
            
            meta = FundMetaData()
            meta.scheme_code = scheme_code
            
            # Parse NAV history
            nav_points = []
            for entry in nav_history_raw:
                nav_date = self.parse_nav_date(entry.get("date", ""))
                nav = self.parse_nav(entry.get("nav", ""))
                if nav_date and nav is not None:
                    nav_points.append(NAVDataPoint(nav_date, nav))
            
            # Sort by date (newest first)
            nav_points.sort(key=lambda x: x.nav_date, reverse=True)
            meta.nav_history = nav_points
            
            if not nav_points:
                return None
            
            # Set latest NAV
            meta.latest_nav = nav_points[0].nav
            meta.nav_date = nav_points[0].nav_date
            
            # Extract fund name and metadata from scheme name
            # mfapi.in returns scheme_name in the first entry's metadata
            # We'll parse it from the scheme name pattern
            # Format: "Fund Name - Direct Plan - Growth Option"
            
            # Calculate returns
            meta.return_1y = self._calculate_return(nav_points, years=1)
            meta.return_3y = self._calculate_return(nav_points, years=3)
            meta.return_5y = self._calculate_return(nav_points, years=5)
            
            # Calculate inception date and return
            if len(nav_points) > 1:
                meta.inception_date = nav_points[-1].nav_date
                days_since_inception = (nav_points[0].nav_date - nav_points[-1].nav_date).days
                if days_since_inception > 0:
                    years = days_since_inception / 365.25
                    meta.return_since_inception = (
                        ((nav_points[0].nav / nav_points[-1].nav) ** (1 / years) - 1) * 100
                    )
            
            # Calculate volatility and Sharpe ratio
            meta.volatility_1y = self._calculate_volatility(nav_points, years=1)
            meta.volatility_3y = self._calculate_volatility(nav_points, years=3)
            
            # Sharpe ratio (assuming risk-free rate of 6.5% for India)
            risk_free_rate = 6.5
            if meta.volatility_1y and meta.volatility_1y > 0 and meta.return_1y is not None:
                meta.sharpe_1y = (meta.return_1y - risk_free_rate) / meta.volatility_1y
            if meta.volatility_3y and meta.volatility_3y > 0 and meta.return_3y is not None:
                meta.sharpe_3y = (meta.return_3y - risk_free_rate) / meta.volatility_3y
            
            # Determine riskometer based on volatility
            meta.riskometer = self._determine_riskometer(meta.volatility_1y, meta.volatility_3y)
            
            # Parse fund type from scheme name patterns
            # This will be enhanced when we have the full fund list
            meta.fund_type = "Open Ended"  # Default
            
            return meta
            
        except Exception as e:
            logger.error(f"Failed to get fund metadata for {scheme_code}: {e}")
            return None
    
    @staticmethod
    def _calculate_return(nav_points: List[NAVDataPoint], years: int) -> Optional[float]:
        """Calculate CAGR return for a given period."""
        if len(nav_points) < 2:
            return None
        
        latest = nav_points[0]
        target_date = latest.nav_date.replace(year=latest.nav_date.year - years)
        
        # Find NAV closest to target date
        closest_nav = None
        min_diff = float('inf')
        
        for point in nav_points:
            diff = abs((point.nav_date - target_date).days)
            if diff < min_diff:
                min_diff = diff
                closest_nav = point
        
        if not closest_nav or closest_nav.nav == 0:
            return None
        
        # Allow up to 90 days difference for the target date
        if min_diff > 90:
            return None
        
        # Calculate CAGR
        actual_years = (latest.nav_date - closest_nav.nav_date).days / 365.25
        if actual_years <= 0:
            return None
        
        cagr = ((latest.nav / closest_nav.nav) ** (1 / actual_years) - 1) * 100
        return round(cagr, 2)
    
    @staticmethod
    def _calculate_volatility(nav_points: List[NAVDataPoint], years: int) -> Optional[float]:
        """Calculate annualized volatility (standard deviation of returns)."""
        if len(nav_points) < 60:  # Need at least ~2 months of daily data
            return None
        
        # Get daily returns for the period
        target_date = nav_points[0].nav_date.replace(year=nav_points[0].nav_date.year - years)
        
        # Filter points within the period
        period_points = [p for p in nav_points if p.nav_date >= target_date]
        
        if len(period_points) < 30:
            return None
        
        # Calculate daily returns
        daily_returns = []
        for i in range(1, len(period_points)):
            if period_points[i-1].nav > 0:
                daily_ret = (period_points[i].nav - period_points[i-1].nav) / period_points[i-1].nav
                daily_returns.append(daily_ret)
        
        if not daily_returns:
            return None
        
        # Calculate standard deviation
        mean_return = sum(daily_returns) / len(daily_returns)
        variance = sum((r - mean_return) ** 2 for r in daily_returns) / len(daily_returns)
        daily_vol = variance ** 0.5
        
        # Annualize (252 trading days)
        annual_vol = daily_vol * (252 ** 0.5) * 100
        return round(annual_vol, 2)
    
    @staticmethod
    def _determine_riskometer(vol_1y: Optional[float], vol_3y: Optional[float]) -> str:
        """Determine risk level based on volatility."""
        vol = vol_1y or vol_3y
        if vol is None:
            return "Moderate"
        
        if vol < 8:
            return "Low"
        elif vol < 12:
            return "Low to Moderate"
        elif vol < 18:
            return "Moderate"
        elif vol < 25:
            return "Moderately High"
        elif vol < 35:
            return "High"
        else:
            return "Very High"
    
    async def get_fund_details_batch(self, scheme_codes: List[str]) -> Dict[str, FundMetaData]:
        """
        Fetch metadata for multiple funds in parallel.
        Returns: Dict mapping scheme_code to FundMetaData
        """
        import asyncio
        
        async def fetch_one(code: str):
            meta = await self.get_fund_metadata(code)
            return code, meta
        
        tasks = [fetch_one(code) for code in scheme_codes]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        fund_data = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Batch fetch error: {result}")
                continue
            code, meta = result
            if meta:
                fund_data[code] = meta
        
        return fund_data
