from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict
import json
from datetime import datetime

from db.database import get_db
from db.repositories.fund_repo import FundRepository
from db.cache import cache_service
from services.overlap_engine import OverlapEngine
from services.health_scorer import HealthScorer
from services.llm_explainer import LLMExplainer
from models.schemas import (
    PortfolioAnalysisRequest, 
    AnalysisResult, 
    PortfolioFund, 
    ExpenseAudit,
    Holding
)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

overlap_engine = OverlapEngine()
health_scorer = HealthScorer()
llm_explainer = LLMExplainer()

@router.post("/analyze", response_model=AnalysisResult)
async def analyze_portfolio(
    request: PortfolioAnalysisRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Analyzes a portfolio of mutual funds.
    Computes overlap, sector exposure, costs, and health score.
    """
    fund_repo = FundRepository(db)
    
    # 1. Resolve and Fetch Fund Details
    scheme_codes = [f["scheme_code"] for f in request.funds]
    funds_db = await fund_repo.get_funds_by_codes(scheme_codes)
    
    if len(funds_db) != len(scheme_codes):
        found_codes = {f.scheme_code for f in funds_db}
        missing = [c for c in scheme_codes if c not in found_codes]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Some funds not found: {missing}"
        )
    
    # Map input units to DB funds
    input_map = {f["scheme_code"]: f["units"] for f in request.funds}
    
    portfolio_funds = []
    total_value = 0.0
    fund_names = {}
    
    for f in funds_db:
        units = input_map[f.scheme_code]
        nav = float(f.nav) if f.nav else 0.0
        current_value = units * nav
        total_value += current_value
        fund_names[f.scheme_code] = f.scheme_name
        
        portfolio_funds.append(PortfolioFund(
            scheme_code=f.scheme_code,
            scheme_name=f.scheme_name,
            units=units,
            nav=nav,
            current_value=current_value,
            expense_ratio=float(f.expense_ratio) if f.expense_ratio else None,
            plan_type=f.plan_type or "Regular"
        ))

    if total_value == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total portfolio value is zero. Check units and NAV."
        )

    # 2. Fetch Holdings
    holdings_db = await fund_repo.get_fund_holdings(scheme_codes)
    fund_holdings = {code: [] for code in scheme_codes}
    for h in holdings_db:
        fund_holdings[h.scheme_code].append(Holding.model_validate(h))

    # 3. Compute Analytics
    weights = {f.scheme_code: f.current_value / total_value for f in portfolio_funds}
    
    overlap_matrix = overlap_engine.compute_overlap(fund_holdings, fund_names)
    sector_exposure = overlap_engine.compute_sector_exposure(fund_holdings, weights)
    marketcap_breakdown = overlap_engine.compute_marketcap_breakdown(fund_holdings, weights)
    top_stocks = overlap_engine.compute_stock_concentration(fund_holdings, weights)[:15]

    # 4. Expense Audit
    weighted_expense = sum([
        (f.expense_ratio or 1.5) * weights[f.scheme_code] for f in portfolio_funds
    ])
    regular_plan_funds = [f.scheme_name for f in portfolio_funds if f.plan_type == "Regular"]
    # Estimate potential savings (0.7% avg difference)
    potential_savings = total_value * (len(regular_plan_funds) / len(portfolio_funds)) * 0.007 if portfolio_funds else 0
    
    expense_audit = ExpenseAudit(
        total_weighted_expense_ratio=round(weighted_expense, 2),
        regular_plan_funds=regular_plan_funds,
        potential_savings_yearly=round(potential_savings, 2),
        benchmark_expense_ratio=0.8
    )

    # 5. Health Score
    health_score, red_flags = health_scorer.calculate(
        overlap_matrix, 
        expense_audit, 
        top_stocks, 
        sector_exposure,
        [{"name": f.scheme_name, "plan_type": f.plan_type} for f in portfolio_funds]
    )

    # 6. Result Assembly
    result = AnalysisResult(
        funds=portfolio_funds,
        total_value=round(total_value, 2),
        overlap_matrix=overlap_matrix,
        sector_exposure=sector_exposure,
        marketcap_breakdown=marketcap_breakdown,
        top_stock_concentrations=top_stocks,
        expense_audit=expense_audit,
        health_score=health_score,
        red_flags=red_flags
    )

    # 7. LLM Explanation (Optional/Async-ish)
    result.health_explanation = await llm_explainer.generate_portfolio_summary(result)

    # 8. Persistence
    session_id = await fund_repo.create_analysis_session(
        input_data=request.model_dump()["funds"],
        analysis_result=result.model_dump(mode="json"),
        health_score=health_score
    )
    result.session_id = session_id
    await db.commit()

    return result

@router.get("/report/{session_id}", response_model=AnalysisResult)
async def get_report(session_id: str, db: AsyncSession = Depends(get_db)):
    """
    Retrieves a previously saved portfolio analysis report.
    """
    fund_repo = FundRepository(db)
    session = await fund_repo.get_analysis_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or expired."
        )
        
    return AnalysisResult(**session.analysis_result, session_id=session.session_id)
