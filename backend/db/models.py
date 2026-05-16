from sqlalchemy import String, Text, Numeric, Date, Boolean, DateTime, ForeignKey, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date, datetime
from typing import List, Optional
from .database import Base

class Fund(Base):
    """
    Mutual fund master data.
    """
    __tablename__ = "funds"

    scheme_code: Mapped[str] = mapped_column(String(10), primary_key=True, index=True)
    scheme_name: Mapped[str] = mapped_column(Text, nullable=False)
    amc_name: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    category: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    sub_category: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plan_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # Direct/Regular
    option_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # Growth/IDCW/Bonus
    nav: Mapped[Optional[float]] = mapped_column(Numeric(12, 4), nullable=True)
    nav_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expense_ratio: Mapped[Optional[float]] = mapped_column(Numeric(5, 3), nullable=True)
    aum_crore: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    launch_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    holdings: Mapped[List["FundHolding"]] = relationship("FundHolding", back_populates="fund")

class FundHolding(Base):
    """
    Mutual fund stock-level holdings.
    """
    __tablename__ = "fund_holdings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    scheme_code: Mapped[str] = mapped_column(String(10), ForeignKey("funds.scheme_code"), index=True)
    disclosure_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    stock_isin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    stock_name: Mapped[str] = mapped_column(Text, nullable=False)
    sector: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    holding_percentage: Mapped[Optional[float]] = mapped_column(Numeric(6, 3), nullable=True)
    market_value_cr: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    asset_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # Equity/Debt/Cash/Other
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    fund: Mapped["Fund"] = relationship("Fund", back_populates="holdings")

    __table_args__ = (
        UniqueConstraint("scheme_code", "disclosure_date", "stock_isin", name="uq_fund_holding"),
    )

class AnalysisSession(Base):
    """
    User analysis sessions for storing and sharing reports.
    """
    __tablename__ = "analysis_sessions"

    session_id: Mapped[str] = mapped_column(Text, primary_key=True, server_default=text("gen_random_uuid()::text"))
    input_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    analysis_result: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    health_score: Mapped[Optional[int]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now() + interval '7 days'"))
