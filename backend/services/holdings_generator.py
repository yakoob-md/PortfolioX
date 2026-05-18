import logging
from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from db.models import FundHolding

logger = logging.getLogger(__name__)

# Category-specific realistic stock definitions
HOLDINGS_TEMPLATES = {
    "tech": [
        ("INE467B01029", "Tata Consultancy Services Ltd.", "Technology", "Large", 12.50, "Equity"),
        ("INE009A01021", "Infosys Ltd.", "Technology", "Large", 11.20, "Equity"),
        ("INE860A01027", "HCL Technologies Ltd.", "Technology", "Large", 8.50, "Equity"),
        ("INE075A01022", "Wipro Ltd.", "Technology", "Large", 6.40, "Equity"),
        ("INE669C01036", "Tech Mahindra Ltd.", "Technology", "Large", 5.10, "Equity"),
        ("INE214T01019", "LTIMindtree Ltd.", "Technology", "Large", 4.80, "Equity"),
    ],
    "banking": [
        ("INE040A01034", "HDFC Bank Ltd.", "Financial Services", "Large", 14.50, "Equity"),
        ("INE296A01024", "ICICI Bank Ltd.", "Financial Services", "Large", 12.20, "Equity"),
        ("INE062A01020", "State Bank of India", "Financial Services", "Large", 8.10, "Equity"),
        ("INE238A01034", "Axis Bank Ltd.", "Financial Services", "Large", 7.40, "Equity"),
        ("INE237A01028", "Kotak Mahindra Bank Ltd.", "Financial Services", "Large", 5.30, "Equity"),
        ("INE171A01029", "Federal Bank Ltd.", "Financial Services", "Mid", 3.50, "Equity"),
    ],
    "small_cap": [
        ("INE036D01028", "Karur Vysya Bank Ltd.", "Financial Services", "Small", 6.20, "Equity"),
        ("INE208C01025", "Aegis Logistics Ltd.", "Energy", "Small", 5.50, "Equity"),
        ("INE040H01021", "Suzlon Energy Ltd.", "Industrials", "Mid", 4.80, "Equity"),
        ("INE935A01035", "Glenmark Pharmaceuticals Ltd.", "Healthcare", "Mid", 4.20, "Equity"),
        ("INE142M01025", "Tata Technologies Ltd.", "Technology", "Mid", 3.80, "Equity"),
        ("INE118H01025", "BSE Limited", "Financial Services", "Mid", 3.50, "Equity"),
        ("INE136B01020", "Cyient Ltd.", "Technology", "Mid", 3.10, "Equity"),
        ("INE541F01012", "Coforge Ltd.", "Technology", "Mid", 2.90, "Equity"),
    ],
    "debt": [
        ("IN0020230081", "GOI 7.18% 2033 Sovereign Bond", "Sovereign", "Large", 25.00, "Debt"),
        ("IN0020220033", "GOI 7.26% 2032 Sovereign Bond", "Sovereign", "Large", 20.00, "Debt"),
        ("INE261A08832", "NABARD 7.65% NCD", "Financial Services", "Large", 15.00, "Debt"),
        ("INE556F16875", "SIDBI 7.75% Commercial Paper", "Financial Services", "Mid", 12.00, "Debt"),
        ("INE040A16124", "HDFC Bank 3-Month CD", "Financial Services", "Large", 8.00, "Debt"),
    ],
    "default": [
        ("INE002A01018", "Reliance Industries Ltd.", "Energy", "Large", 9.50, "Equity"),
        ("INE040A01034", "HDFC Bank Ltd.", "Financial Services", "Large", 8.80, "Equity"),
        ("INE296A01024", "ICICI Bank Ltd.", "Financial Services", "Large", 7.60, "Equity"),
        ("INE009A01021", "Infosys Ltd.", "Technology", "Large", 6.50, "Equity"),
        ("INE018A01030", "Larsen & Toubro Ltd.", "Industrials", "Large", 5.20, "Equity"),
        ("INE155A01022", "Tata Motors Ltd.", "Consumer Cyclical", "Large", 4.40, "Equity"),
        ("INE154A01025", "ITC Ltd.", "FMCG", "Large", 4.10, "Equity"),
        ("INE467B01029", "Tata Consultancy Services Ltd.", "Technology", "Large", 3.80, "Equity"),
    ]
}

async def generate_and_seed_fund_holdings(
    db: AsyncSession,
    scheme_code: str,
    category: str,
    sub_category: str
) -> int:
    """
    Checks if stock-level holdings exist in the database for a scheme_code.
    If not, dynamically generates a category-appropriate, realistic list of stock holdings 
    and seeds them into the fund_holdings table.
    Returns the number of seeded holdings.
    """
    try:
        # 1. Check if holdings already exist
        stmt = select(func.count(FundHolding.id)).where(FundHolding.scheme_code == scheme_code)
        res = await db.execute(stmt)
        if res.scalar() > 0:
            logger.info(f"Holdings already exist for fund {scheme_code}. Skipping dynamic seeding.")
            return 0
            
        # 2. Match template based on sub_category/category
        cat_lower = (sub_category or category or "").lower()
        
        if "tech" in cat_lower or "it" in cat_lower or "information technology" in cat_lower:
            template_key = "tech"
        elif "bank" in cat_lower or "financial" in cat_lower or "treasury" in cat_lower:
            template_key = "banking"
        elif "small cap" in cat_lower or "mid cap" in cat_lower:
            template_key = "small_cap"
        elif "debt" in cat_lower or "liquid" in cat_lower or "gilt" in cat_lower or "money market" in cat_lower:
            template_key = "debt"
        else:
            template_key = "default"
            
        template = HOLDINGS_TEMPLATES[template_key]
        logger.info(f"Generating template '{template_key}' holdings for fund {scheme_code} ({cat_lower})")
        
        # 3. Create holding objects
        disclosure_date = date(2024, 4, 30)
        seeded_count = 0
        
        for isin, name, sector, mcap, pct, atype in template:
            # Deterministic variation in holding percentage based on scheme_code to avoid exact duplicates across funds
            code_offset = int(scheme_code) % 7 if scheme_code.isdigit() else 0
            adjusted_pct = max(0.5, round(pct - 0.2 * code_offset, 2))
            
            # Estimate market value based on persistent AUM (1% of 1000Cr is 10Cr)
            val_cr = round(adjusted_pct * 10.0, 2)
            
            holding = FundHolding(
                scheme_code=scheme_code,
                disclosure_date=disclosure_date,
                stock_isin=isin,
                stock_name=name,
                sector=sector,
                market_cap=mcap,
                holding_percentage=adjusted_pct,
                market_value_cr=val_cr,
                asset_type=atype
            )
            db.add(holding)
            seeded_count += 1
            
        await db.commit()
        logger.info(f"Seeded {seeded_count} dynamic stock holdings successfully for fund {scheme_code}")
        return seeded_count
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to generate and seed dynamic holdings for fund {scheme_code}: {e}")
        return 0
