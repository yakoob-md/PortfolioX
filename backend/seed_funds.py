"""
Seed script to populate the database with mutual fund data.
Hybrid approach: mfapi.in for real-time NAV/returns + seed data for AUM, fund manager, portfolio characteristics.
Run: python seed_funds.py
"""
import asyncio
import sys
import os
import logging

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import AsyncSessionLocal, engine
from db.models import Fund
from sqlalchemy import text
from services.mfapi_service import MFAPIService
from data.fund_seed_data import FUND_SEED_DATA

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_funds():
    """Fetch funds from mfapi.in and merge with seed data for complete fund profiles."""
    logger.info("Starting hybrid fund seeding (mfapi.in + seed data)...")
    
    mfapi = MFAPIService()
    
    async with AsyncSessionLocal() as session:
        count = 0
        errors = 0
        
        for code, seed in FUND_SEED_DATA.items():
            try:
                # Fetch real-time data from mfapi.in
                meta = await mfapi.get_fund_metadata(code)
                
                # Use mfapi.in data if available, otherwise fall back to seed data
                if meta:
                    scheme_name = meta.scheme_name or seed.get("scheme_name", "")
                    amc_name = meta.amc_name or seed.get("amc_name", "")
                    category = meta.category or seed.get("category", "")
                    sub_category = meta.sub_category or seed.get("sub_category", "")
                    plan_type = meta.plan_type or seed.get("plan_type", "")
                    option_type = meta.option_type or seed.get("option_type", "")
                    nav = meta.latest_nav
                    nav_date = meta.nav_date
                    expense_ratio = meta.expense_ratio or seed.get("expense_ratio")
                    return_1y = meta.return_1y
                    return_3y = meta.return_3y
                    return_5y = meta.return_5y
                    volatility_1y = meta.volatility_1y
                    volatility_3y = meta.volatility_3y
                    sharpe_1y = meta.sharpe_1y
                    sharpe_3y = meta.sharpe_3y
                    riskometer = meta.riskometer
                    min_sip = meta.min_sip
                    min_lumpsum = meta.min_lumpsum
                    fund_type = meta.fund_type
                else:
                    scheme_name = seed.get("scheme_name", "")
                    amc_name = seed.get("amc_name", "")
                    category = seed.get("category", "")
                    sub_category = seed.get("sub_category", "")
                    plan_type = seed.get("plan_type", "")
                    option_type = seed.get("option_type", "")
                    nav = None
                    nav_date = None
                    expense_ratio = seed.get("expense_ratio")
                    return_1y = None
                    return_3y = None
                    return_5y = None
                    volatility_1y = None
                    volatility_3y = None
                    sharpe_1y = None
                    sharpe_3y = None
                    riskometer = None
                    min_sip = 500
                    min_lumpsum = 5000
                    fund_type = "Open Ended"
                
                # Portfolio characteristics from seed data
                fund_manager = seed.get("fund_manager")
                portfolio_pe_ratio = seed.get("portfolio_pe_ratio")
                portfolio_pb_ratio = seed.get("portfolio_pb_ratio")
                num_stocks = seed.get("num_stocks")
                top_holdings = seed.get("top_holdings")
                equity_percentage = seed.get("equity_percentage")
                debt_percentage = seed.get("debt_percentage")
                cash_percentage = seed.get("cash_percentage")
                benchmark = seed.get("benchmark")
                exit_load = seed.get("exit_load")
                aum_crore = seed.get("aum_crore")
                
                stmt = text("""
                    INSERT INTO funds (
                        scheme_code, scheme_name, amc_name, category, sub_category,
                        plan_type, option_type, nav, nav_date, expense_ratio, aum_crore,
                        return_1y, return_3y, return_5y,
                        volatility_1y, volatility_3y, sharpe_1y, sharpe_3y,
                        riskometer, min_sip, min_lumpsum, fund_type, is_active,
                        fund_manager, portfolio_pe_ratio, portfolio_pb_ratio, num_stocks,
                        top_holdings, equity_percentage, debt_percentage, cash_percentage,
                        benchmark, exit_load
                    ) VALUES (
                        :scheme_code, :scheme_name, :amc_name, :category, :sub_category,
                        :plan_type, :option_type, :nav, :nav_date, :expense_ratio, :aum_crore,
                        :return_1y, :return_3y, :return_5y,
                        :volatility_1y, :volatility_3y, :sharpe_1y, :sharpe_3y,
                        :riskometer, :min_sip, :min_lumpsum, :fund_type, true,
                        :fund_manager, :portfolio_pe_ratio, :portfolio_pb_ratio, :num_stocks,
                        :top_holdings, :equity_percentage, :debt_percentage, :cash_percentage,
                        :benchmark, :exit_load
                    )
                    ON CONFLICT (scheme_code) DO UPDATE SET
                        scheme_name = EXCLUDED.scheme_name,
                        amc_name = EXCLUDED.amc_name,
                        category = EXCLUDED.category,
                        sub_category = EXCLUDED.sub_category,
                        plan_type = EXCLUDED.plan_type,
                        option_type = EXCLUDED.option_type,
                        nav = EXCLUDED.nav,
                        nav_date = EXCLUDED.nav_date,
                        expense_ratio = EXCLUDED.expense_ratio,
                        aum_crore = EXCLUDED.aum_crore,
                        return_1y = EXCLUDED.return_1y,
                        return_3y = EXCLUDED.return_3y,
                        return_5y = EXCLUDED.return_5y,
                        volatility_1y = EXCLUDED.volatility_1y,
                        volatility_3y = EXCLUDED.volatility_3y,
                        sharpe_1y = EXCLUDED.sharpe_1y,
                        sharpe_3y = EXCLUDED.sharpe_3y,
                        riskometer = EXCLUDED.riskometer,
                        min_sip = EXCLUDED.min_sip,
                        min_lumpsum = EXCLUDED.min_lumpsum,
                        fund_type = EXCLUDED.fund_type,
                        fund_manager = EXCLUDED.fund_manager,
                        portfolio_pe_ratio = EXCLUDED.portfolio_pe_ratio,
                        portfolio_pb_ratio = EXCLUDED.portfolio_pb_ratio,
                        num_stocks = EXCLUDED.num_stocks,
                        top_holdings = EXCLUDED.top_holdings,
                        equity_percentage = EXCLUDED.equity_percentage,
                        debt_percentage = EXCLUDED.debt_percentage,
                        cash_percentage = EXCLUDED.cash_percentage,
                        benchmark = EXCLUDED.benchmark,
                        exit_load = EXCLUDED.exit_load,
                        updated_at = NOW()
                """)
                
                import json
                await session.execute(stmt, {
                    "scheme_code": code,
                    "scheme_name": scheme_name,
                    "amc_name": amc_name,
                    "category": category,
                    "sub_category": sub_category,
                    "plan_type": plan_type,
                    "option_type": option_type,
                    "nav": nav,
                    "nav_date": nav_date,
                    "expense_ratio": expense_ratio,
                    "aum_crore": aum_crore,
                    "return_1y": return_1y,
                    "return_3y": return_3y,
                    "return_5y": return_5y,
                    "volatility_1y": volatility_1y,
                    "volatility_3y": volatility_3y,
                    "sharpe_1y": sharpe_1y,
                    "sharpe_3y": sharpe_3y,
                    "riskometer": riskometer,
                    "min_sip": min_sip,
                    "min_lumpsum": min_lumpsum,
                    "fund_type": fund_type,
                    "fund_manager": fund_manager,
                    "portfolio_pe_ratio": portfolio_pe_ratio,
                    "portfolio_pb_ratio": portfolio_pb_ratio,
                    "num_stocks": num_stocks,
                    "top_holdings": json.dumps(top_holdings) if top_holdings else None,
                    "equity_percentage": equity_percentage,
                    "debt_percentage": debt_percentage,
                    "cash_percentage": cash_percentage,
                    "benchmark": benchmark,
                    "exit_load": exit_load,
                })
                
                count += 1
                logger.info(f"  Seeded: {scheme_name} ({code}) - NAV: {nav}, AUM: {aum_crore} Cr")
                
            except Exception as e:
                logger.error(f"Error seeding fund {code}: {e}")
                errors += 1
        
        await session.commit()
        logger.info(f"Seeding complete: {count} funds added/updated, {errors} errors")
    
    await mfapi.close()


async def main():
    try:
        await seed_funds()
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
