"""
Seed script to populate the database with popular mutual funds from mfapi.in.
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Popular Indian mutual funds (Direct Growth plans) - scheme codes
POPULAR_FUNDS = [
    # Index Funds
    "120716",  # UTI Nifty 50 Index Fund - Direct Growth
    "120717",  # UTI Nifty 50 Index Fund - Regular Growth
    "149541",  # Navi Nifty 50 Index Fund - Direct Growth
    "150172",  # Navi Nifty 50 Index Fund - Regular Growth
    "125497",  # HDFC Index Fund - Nifty 50 Plan - Direct Growth
    "125498",  # HDFC Index Fund - Nifty 50 Plan - Regular Growth
    "135436",  # ICICI Prudential Nifty 50 Index Fund - Direct Growth
    "135437",  # ICICI Prudential Nifty 50 Index Fund - Regular Growth
    "145555",  # SBI Nifty Index Fund - Direct Growth
    "145556",  # SBI Nifty Index Fund - Regular Growth
    "152278",  # Bandhan Nifty 50 Index Fund - Direct Growth
    "152279",  # Bandhan Nifty 50 Index Fund - Regular Growth

    # Flexi Cap
    "120503",  # Parag Parikh Flexi Cap Fund - Direct Growth
    "120505",  # Parag Parikh Flexi Cap Fund - Regular Growth
    "118560",  # HDFC Flexi Cap Fund - Direct Growth
    "118561",  # HDFC Flexi Cap Fund - Regular Growth
    "119597",  # PPFAS Flexi Cap Fund - Direct Growth (old code)

    # Large Cap
    "119226",  # Nippon India Large Cap Fund - Direct Growth
    "119227",  # Nippon India Large Cap Fund - Regular Growth
    "118825",  # ICICI Prudential Bluechip Fund - Direct Growth
    "118826",  # ICICI Prudential Bluechip Fund - Regular Growth

    # Mid Cap
    "119600",  # Axis Midcap Fund - Direct Growth
    "119601",  # Axis Midcap Fund - Regular Growth
    "120828",  # HDFC Mid-Cap Opportunities Fund - Direct Growth
    "120829",  # HDFC Mid-Cap Opportunities Fund - Regular Growth
    "118834",  # Kotak Emerging Equity Fund - Direct Growth
    "118835",  # Kotak Emerging Equity Fund - Regular Growth

    # Small Cap
    "120823",  # Nippon India Small Cap Fund - Direct Growth
    "120824",  # Nippon India Small Cap Fund - Regular Growth
    "119598",  # Axis Small Cap Fund - Direct Growth
    "119599",  # Axis Small Cap Fund - Regular Growth
    "119762",  # SBI Small Cap Fund - Direct Growth
    "119763",  # SBI Small Cap Fund - Regular Growth
    "141925",  # Quant Small Cap Fund - Direct Growth
    "141926",  # Quant Small Cap Fund - Regular Growth

    # ELSS (Tax Saving)
    "119224",  # Mirae Asset Tax Saver Fund - Direct Growth
    "119225",  # Mirae Asset Tax Saver Fund - Regular Growth
    "118824",  # Axis Long Term Equity Fund - Direct Growth
    "118823",  # Axis Long Term Equity Fund - Regular Growth
    "120714",  # DSP Tax Saver Fund - Direct Growth
    "120715",  # DSP Tax Saver Fund - Regular Growth

    # Debt Funds
    "117446",  # Axis Banking & PSU Debt Fund - Regular Growth
    "124172",  # DSP Banking & PSU Debt Fund - Regular Growth
    "152165",  # Bajaj Finserv Banking and PSU Fund - Regular Growth
    "118955",  # ICICI Prudential Corporate Bond Fund - Direct Growth
    "118956",  # ICICI Prudential Corporate Bond Fund - Regular Growth
    "122639",  # HDFC Corporate Bond Fund - Direct Growth
    "122640",  # HDFC Corporate Bond Fund - Regular Growth

    # Liquid Funds
    "119595",  # Axis Liquid Fund - Direct Growth
    "119596",  # Axis Liquid Fund - Regular Growth
    "120826",  # HDFC Liquid Fund - Direct Growth
    "120827",  # HDFC Liquid Fund - Regular Growth

    # Hybrid / Balanced Advantage
    "118957",  # ICICI Prudential Balanced Advantage Fund - Direct Growth
    "118958",  # ICICI Prudential Balanced Advantage Fund - Regular Growth
    "125499",  # HDFC Balanced Advantage Fund - Direct Growth
    "125500",  # HDFC Balanced Advantage Fund - Regular Growth
    "149542",  # Edelweiss Balanced Advantage Fund - Direct Growth
    "149543",  # Edelweiss Balanced Advantage Fund - Regular Growth

    # Sectoral / Thematic
    "135438",  # SBI Technology Opportunities Fund - Direct Growth
    "135439",  # SBI Technology Opportunities Fund - Regular Growth
    "119228",  # ICICI Prudential Technology Fund - Direct Growth
    "119229",  # ICICI Prudential Technology Fund - Regular Growth
    "145557",  # Nippon India Pharma Fund - Direct Growth
    "145558",  # Nippon India Pharma Fund - Regular Growth

    # International
    "120504",  # Motilal Oswal S&P 500 Index Fund - Direct Growth
    "120506",  # Motilal Oswal S&P 500 Index Fund - Regular Growth
    "149544",  # ICICI Prudential US Bluechip Equity Fund - Direct Growth
    "149545",  # ICICI Prudential US Bluechip Equity Fund - Regular Growth
]


async def seed_funds():
    """Fetch popular funds from mfapi.in and seed the database."""
    logger.info("Starting fund seeding from mfapi.in...")
    
    mfapi = MFAPIService()
    
    async with AsyncSessionLocal() as session:
        count = 0
        errors = 0
        
        for code in POPULAR_FUNDS:
            try:
                meta = await mfapi.get_fund_metadata(code)
                if not meta:
                    logger.warning(f"No data for fund {code}")
                    errors += 1
                    continue
                
                # Upsert fund
                stmt = text("""
                    INSERT INTO funds (
                        scheme_code, scheme_name, amc_name, category, sub_category,
                        plan_type, option_type, nav, nav_date, expense_ratio,
                        return_1y, return_3y, return_5y,
                        volatility_1y, volatility_3y, sharpe_1y, sharpe_3y,
                        riskometer, min_sip, min_lumpsum, fund_type, is_active
                    ) VALUES (
                        :scheme_code, :scheme_name, :amc_name, :category, :sub_category,
                        :plan_type, :option_type, :nav, :nav_date, :expense_ratio,
                        :return_1y, :return_3y, :return_5y,
                        :volatility_1y, :volatility_3y, :sharpe_1y, :sharpe_3y,
                        :riskometer, :min_sip, :min_lumpsum, :fund_type, true
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
                        updated_at = NOW()
                """)
                
                await session.execute(stmt, {
                    "scheme_code": meta.scheme_code,
                    "scheme_name": meta.scheme_name,
                    "amc_name": meta.amc_name,
                    "category": meta.category,
                    "sub_category": meta.sub_category,
                    "plan_type": meta.plan_type,
                    "option_type": meta.option_type,
                    "nav": meta.latest_nav,
                    "nav_date": meta.nav_date,
                    "expense_ratio": meta.expense_ratio,
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
                })
                
                count += 1
                logger.info(f"  Seeded: {meta.scheme_name} ({code})")
                
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
