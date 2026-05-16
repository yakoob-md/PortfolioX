from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import date, datetime

class FundBase(BaseModel):
    scheme_code: str
    scheme_name: str
    amc_name: str
    nav: Optional[float] = None
    nav_date: Optional[date] = None
    plan_type: Optional[str] = None
    category: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class FundDetail(FundBase):
    sub_category: Optional[str] = None
    option_type: Optional[str] = None
    expense_ratio: Optional[float] = None
    aum_crore: Optional[float] = None
    launch_date: Optional[date] = None

# --- Phase 1: Portfolio Analysis Schemas ---

class Holding(BaseModel):
    stock_isin: Optional[str] = None
    stock_name: str
    sector: Optional[str] = None
    market_cap: Optional[str] = None
    holding_percentage: float
    asset_type: str  # Equity/Debt/Cash

    model_config = ConfigDict(from_attributes=True)

class PortfolioFund(BaseModel):
    scheme_code: str
    scheme_name: str
    units: float
    nav: float
    current_value: float
    expense_ratio: Optional[float] = None
    plan_type: str  # Direct/Regular

class OverlapPair(BaseModel):
    fund_a_code: str
    fund_a_name: str
    fund_b_code: str
    fund_b_name: str
    overlap_score: float  # 0-100
    common_stocks: List[str]
    common_stock_count: int

class ExpenseAudit(BaseModel):
    total_weighted_expense_ratio: float
    regular_plan_funds: List[str]
    potential_savings_yearly: float
    benchmark_expense_ratio: float

class AnalysisResult(BaseModel):
    session_id: Optional[str] = None
    funds: List[PortfolioFund]
    total_value: float
    overlap_matrix: List[OverlapPair]
    sector_exposure: Dict[str, float]
    marketcap_breakdown: Dict[str, float]
    top_stock_concentrations: List[dict]
    expense_audit: ExpenseAudit
    health_score: int
    health_explanation: Optional[str] = None
    red_flags: List[str]
    created_at: datetime = Field(default_factory=datetime.now)

class PortfolioAnalysisRequest(BaseModel):
    funds: List[Dict] # List of {scheme_code, units, custom_holdings: Optional[List[Holding]]}

class FundSearchResponse(BaseModel):
    results: List[FundBase]
    total: int
    query: str

class HealthResponse(BaseModel):
    status: str
    version: str
    db: str
