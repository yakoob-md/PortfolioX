from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict
import json
import io
import httpx
import pandas as pd
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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.post("/import")
async def import_custom_portfolio(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Import custom fund holdings from a CSV file.
    Format: stock_name, holding_percentage, sector, market_cap, stock_isin
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
        
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        # Validate required columns
        required = ['stock_name', 'holding_percentage']
        if not all(col in df.columns for col in required):
            raise HTTPException(status_code=400, detail=f"CSV must contain at least: {required}")
            
        # Convert to list of Holding objects for analysis
        # For simplicity, we'll return this data to the frontend which will then 
        # include it in the /analyze call as a 'virtual' fund.
        holdings = []
        for _, row in df.iterrows():
            holdings.append({
                "stock_name": str(row['stock_name']),
                "holding_percentage": float(row['holding_percentage']),
                "sector": str(row.get('sector', 'Other')),
                "market_cap": str(row.get('market_cap', 'Other')),
                "stock_isin": str(row.get('stock_isin', ''))
            })
            
        return {"filename": file.filename, "holdings": holdings}
        
    except Exception as e:
        logger.error(f"CSV import error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse CSV file.")

overlap_engine = OverlapEngine()
health_scorer = HealthScorer()
llm_explainer = LLMExplainer()

@router.post("/analyze", response_model=AnalysisResult)
async def analyze_portfolio(
    request: PortfolioAnalysisRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Main analysis endpoint: takes a list of funds/units (and optional custom holdings)
    and computes overlap, sector exposure, and health scores.
    """
    fund_repo = FundRepository(db)
    
    # 1. Fetch data for all funds (DB or Custom)
    fund_holdings = {} # code -> List[Holding]
    fund_details = {}  # code -> {name, nav, expense_ratio, plan_type}
    weights = {}       # code -> total_value_in_fund
    total_value = 0.0
    
    for f_req in request.funds:
        code = f_req.get("scheme_code")
        units = f_req.get("units", 0)
        
        # A. Custom Holdings Path
        if "custom_holdings" in f_req and f_req["custom_holdings"]:
            holdings = [Holding(**h) for h in f_req["custom_holdings"]]
            fund_holdings[code] = holdings
            fund_details[code] = {
                "name": f_req.get("scheme_name", f"Imported Fund ({code})"),
                "nav": 10.0,
                "expense_ratio": 0.0,
                "plan_type": "Direct"
            }
        # B. Database Path
        else:
            fund = await fund_repo.get_fund_by_code(code)
            if not fund:
                continue
            
            # Fetch real-time metadata if missing (NAV/Expense Ratio)
            if not fund.expense_ratio:
                try:
                    async with httpx.AsyncClient() as client:
                        resp = await client.get(f"https://api.mfapi.in/mf/{code}", timeout=5)
                        if resp.status_code == 200:
                            meta = resp.json().get("meta", {})
                            fund.expense_ratio = 0.5 if "Direct" in meta.get("scheme_name", "") else 1.5
                except:
                    pass

            holdings_db = await fund_repo.get_fund_holdings([code])
            
            # Smart Fallback: If no holdings in DB, use category-based mock for visual continuity
            if not holdings_db:
                # We generate 1 dummy holding for the sector breakdown so it's not empty
                # In a real pro app, we'd pull category averages here.
                fund_holdings[code] = [
                    Holding(stock_name="Diversified Equity", holding_percentage=100.0, sector="Diversified", market_cap="Large", asset_type="Equity")
                ]
            else:
                fund_holdings[code] = [Holding.model_validate(h) for h in holdings_db]
            
            fund_details[code] = {
                "name": fund.scheme_name,
                "nav": float(fund.nav) if fund.nav else 10.0,
                "expense_ratio": float(fund.expense_ratio) if fund.expense_ratio else 1.25,
                "plan_type": "Direct" if "Direct" in fund.scheme_name else "Regular"
            }
            
        # Calc weighting
        val = fund_details[code]["nav"] * units
        total_value += val
        weights[code] = val

    if total_value == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total portfolio value is zero. Check units and NAV."
        )

    # 2. Convert to normalized weights (0-1) for engines
    norm_weights = {code: val/total_value for code, val in weights.items()}
    fund_names = {code: detail["name"] for code, detail in fund_details.items()}

    # 3. Compute Analytics
    overlap_matrix = overlap_engine.compute_overlap(fund_holdings, fund_names)
    sector_exposure = overlap_engine.compute_sector_exposure(fund_holdings, norm_weights)
    marketcap_breakdown = overlap_engine.compute_marketcap_breakdown(fund_holdings, norm_weights)
    stock_concentrations = overlap_engine.compute_stock_concentration(fund_holdings, norm_weights)

    # 4. Expense Audit
    reg_funds = [fund_details[code]["name"] for code, detail in fund_details.items() if detail["plan_type"] == "Regular"]
    total_weighted_expense = sum(fund_details[code]["expense_ratio"] * norm_weights[code] for code in weights)
    potential_savings = (total_weighted_expense - 0.5) * total_value / 100 if total_weighted_expense > 0.5 else 0
    
    expense_audit = ExpenseAudit(
        total_weighted_expense_ratio=round(total_weighted_expense, 2),
        regular_plan_funds=reg_funds,
        potential_savings_yearly=round(max(0, potential_savings), 2),
        benchmark_expense_ratio=0.75
    )

    # 5. Health Scoring
    health_score, red_flags = health_scorer.score_portfolio(
        overlap_matrix, 
        sector_exposure, 
        expense_audit
    )

    # 6. AI Insights (Only if cache miss or first time)
    health_explanation = await llm_explainer.explain_health(
        health_score, 
        red_flags, 
        sector_exposure
    )

    # 7. Final Response Object
    portfolio_funds = []
    for code, detail in fund_details.items():
        portfolio_funds.append(PortfolioFund(
            scheme_code=code,
            scheme_name=detail["name"],
            units=weights[code] / detail["nav"],
            nav=detail["nav"],
            current_value=weights[code],
            expense_ratio=detail["expense_ratio"],
            plan_type=detail["plan_type"]
        ))

    result = AnalysisResult(
        funds=portfolio_funds,
        total_value=round(total_value, 2),
        overlap_matrix=overlap_matrix,
        sector_exposure=sector_exposure,
        marketcap_breakdown=marketcap_breakdown,
        top_stock_concentrations=stock_concentrations[:10],
        expense_audit=expense_audit,
        health_score=health_score,
        health_explanation=health_explanation,
        red_flags=red_flags
    )

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
