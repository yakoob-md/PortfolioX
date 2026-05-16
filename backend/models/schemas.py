from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
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
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FundSearchResponse(BaseModel):
    results: List[FundBase]
    total: int
    query: str

class HealthResponse(BaseModel):
    status: str
    version: str
    db: str
