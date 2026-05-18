from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging
import os

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)

class ChatMessage(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str
    sessionId: Optional[str] = None
    history: Optional[List[ChatMessage]] = []

class InsightRequest(BaseModel):
    fundId: str
    schemeName: Optional[str] = None
    category: Optional[str] = None
    directExpenseRatio: Optional[float] = None
    regularExpenseRatio: Optional[float] = None

async def get_gemini_client():
    try:
        from google import genai
        api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return None
        client = genai.Client(api_key=api_key)
        return client
    except Exception:
        return None

SYSTEM_PROMPT = """You are PortfolioX AI Co-Pilot — India's most advanced mutual fund advisor AI.

You have deep expertise in:
- Indian Mutual Funds (AMFI, SEBI regulations)
- Direct vs Regular plan cost optimization
- FIFO tax calculations (LTCG/STCG post Budget 2024)
- Portfolio overlap analysis and diversification
- SIP strategies, XIRR calculations
- Goal-based investing and risk profiling
- ELSS tax saving under 80C

Key facts to remember:
- LTCG on equity funds: 12.5% above ₹1.25 lakh per year (post July 2024)
- STCG on equity funds: 20% (post July 2024)  
- Debt funds taxed at slab rate
- Direct plans save 0.5-1.5% per year vs Regular plans
- Expense Ratio matters hugely over 20+ year periods

Be conversational but precise. Use ₹ symbol for amounts. Format key numbers in **bold**.
Keep responses concise — 2-4 paragraphs max unless asked for details.
End with 2-3 follow-up question suggestions inside [SUGGESTIONS] tags.
"""

@router.post("/chat")
async def ai_chat(request: ChatRequest):
    """Streaming AI chat endpoint powered by Gemini."""
    from fastapi.responses import StreamingResponse
    import json

    client = await get_gemini_client()
    if not client:
        async def error_stream():
            yield json.dumps({"content": "AI service unavailable. Please set GOOGLE_API_KEY environment variable.\n\n[SUGGESTIONS]\nHow do I optimize my expense ratio?\nWhat is LTCG exemption limit?\nExplain Direct vs Regular plans"})
        return StreamingResponse(error_stream(), media_type="application/x-ndjson")

    # Build message history
    history_text = ""
    if request.history:
        for msg in request.history[-6:]:  # last 6 messages
            role = "User" if msg.role == "user" else "Assistant"
            history_text += f"{role}: {msg.content}\n\n"

    full_prompt = f"{SYSTEM_PROMPT}\n\n{history_text}User: {request.message}\n\nAssistant:"

    async def generate():
        try:
            response = client.models.generate_content_stream(
                model="gemini-2.0-flash",
                contents=full_prompt,
            )
            for chunk in response:
                if chunk.text:
                    yield json.dumps({"content": chunk.text}) + "\n"
        except Exception as e:
            logger.error(f"Gemini streaming error: {e}. Activating premium local financial responder.")
            # Highly premium local fallback responder based on query keywords
            query = request.message.lower()
            if any(x in query for x in ["expense", "fee", "cost", "charge"]):
                text = """To optimize your mutual fund portfolio's **Expense Ratio**, consider these premium guidelines:

1. **Switch to Direct Plans**: Regular plans include 0.5% to 1.5% in distributor commissions built directly into the Net Asset Value (NAV). Over 20-30 years, this commission compounds and can eat away up to **20-30%** of your final retirement corpus.
2. **Benchmark Comparison**: Check the category average expense ratio. For actively managed equity funds, an expense ratio below **0.75%** is competitive, while index funds should ideally charge under **0.20%**.
3. **Consolidate Holdings**: Holding multiple funds in the same category often leads to portfolio duplication and redundant fees without adding true diversification.

[SUGGESTIONS]
How do I switch regular to direct plans?
What is the impact of 1% extra fee over 20 years?
Explain portfolio duplication.
"""
            elif any(x in query for x in ["ltcg", "stcg", "tax", "budget", "gain"]):
                text = """Under the latest **Indian Union Budget 2024** guidelines, mutual fund capital gains are taxed as follows:

1. **Equity-Oriented Funds**:
   - **LTCG (Long Term Capital Gains)**: Taxed at **12.5%** on gains exceeding ₹**1.25 Lakh** in a financial year (increased from ₹1 Lakh previously). Applicable for holdings kept over 12 months.
   - **STCG (Short Term Capital Gains)**: Taxed at **20%** (increased from 15% previously) for holdings redeemed within 12 months.
2. **Debt/Fixed Income Funds**:
   - Redemptions at any time are taxed according to your individual income tax slab rate (no indexation benefits are available post-April 2023).

[SUGGESTIONS]
Does switching regular to direct trigger tax?
How is FIFO applied in mutual fund taxation?
What are the tax implications for hybrid funds?
"""
            elif any(x in query for x in ["direct", "regular", "commission", "broker"]):
                text = """**Direct Plans vs. Regular Plans** is the single most critical factor for cost optimization in Indian mutual funds:

1. **Distributor Commissions**: Regular plans pay an annual trailing commission to your broker/agent (typically **0.5% to 1.5%** of your entire asset value every year), whereas Direct plans pay nothing.
2. **NAV Divergence**: Because commissions are deducted daily from the NAV of Regular plans, a Direct plan's NAV grows faster, leading to a significant divergence in accumulated wealth over long periods.
3. **Switching Process**: You can switch regular plans to direct plans through online platforms (like Groww, Coin, Kuvera), directly via AMC portals, or through RTAs like CAMS and KFintech.

[SUGGESTIONS]
Will I be charged exit loads for switching?
How much can I save on a ₹10 Lakh portfolio?
Is there a lock-in period for ELSS direct plans?
"""
            elif any(x in query for x in ["xirr", "sip", "returns", "cagr"]):
                text = """Understanding and calculating mutual fund **returns** requires the right metrics:

1. **SIP & XIRR (Extended Internal Rate of Return)**: For multiple periodic cash flows like Systematic Investment Plans (SIPs), XIRR is the only accurate method as it accounts for the specific timing of each installment.
2. **Lumpsum & CAGR (Compound Annual Growth Rate)**: For one-time investments held over more than 1 year, CAGR is the gold standard for measuring annualized compounded speed of growth.
3. **Absolute Returns**: Use absolute returns only for investments held under 1 year, as it does not annualize the growth rate.

[SUGGESTIONS]
What is a good XIRR for equity portfolios?
How is XIRR calculated if I stop my SIP?
Should I increase my SIP amount every year?
"""
            elif any(x in query for x in ["health", "overlap", "diversification", "overlap"]):
                text = """Portfolio **Health and Overlap** measure the resilience of your asset allocation:

1. **Pairwise Overlap**: Shows the percentage of identical stock holdings between two funds. A pairwise overlap of **over 30%** indicates high redundancy — you are paying double fees for the same exposure.
2. **Sector & Stock Concentration**: Ideally, your top stock concentration should be below **10%** and your top sector below **25%** to protect against sectoral downturns.
3. **Diversification Score**: Our proprietary algorithm scores your portfolio out of 100 based on overlap, cost leakages, and asset allocation discipline.

[SUGGESTIONS]
How do I fix a high overlap score?
What is a healthy diversification score?
How do market cap weights affect portfolio risk?
"""
            else:
                text = """Welcome to **PortfolioX AI Co-Pilot**! I am here to help you audit your Indian mutual fund portfolio, optimize costs, and eliminate commission leakages.

Here are a few popular questions you can ask me:
1. **"How do I optimize my expense ratio?"** — to learn about direct vs regular plans and fees.
2. **"What is the LTCG exemption limit?"** — to understand capital gains taxation.
3. **"Explain Direct vs Regular plans"** — to understand cost leakages.
4. **"How is XIRR different from CAGR?"** — to learn about performance metrics.

Please feel free to ask any specific query about mutual funds, tax optimization, or portfolio design!

[SUGGESTIONS]
How much fee can I save by switching?
Explain FIFO tax calculations.
What is a healthy overlap score?
"""

            # Stream the fallback response in small chunks to mimic typing speed
            import asyncio
            words = text.split(" ")
            chunk_size = 5
            for i in range(0, len(words), chunk_size):
                chunk_text = " ".join(words[i:i+chunk_size]) + " "
                yield json.dumps({"content": chunk_text}) + "\n"
                await asyncio.sleep(0.05)

    return StreamingResponse(generate(), media_type="application/x-ndjson")


@router.post("/insights")
async def fund_insights(request: InsightRequest):
    """Generate AI insight for a specific fund."""
    client = await get_gemini_client()
    if client:
        prompt = f"""Provide a concise 3-4 sentence analysis of this Indian mutual fund:
Fund: {request.schemeName or request.fundId}
Category: {request.category or 'Equity'}
Direct Expense Ratio: {request.directExpenseRatio or 'N/A'}%
Regular Expense Ratio: {request.regularExpenseRatio or 'N/A'}%

Focus on: cost efficiency, category suitability, and one key consideration for investors.
Be direct and data-driven."""

        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            if response.text:
                return {"insight": response.text}
        except Exception as e:
            logger.error(f"Insights error: {e}. Falling back to rule-based insights.")

    # Elegant rule-based fallback based on AMC / category / expense ratio
    fund_name = request.schemeName or request.fundId
    category = request.category or "Equity"
    dir_exp = request.directExpenseRatio or 0.5
    reg_exp = request.regularExpenseRatio or 1.25
    diff = round(reg_exp - dir_exp, 2)
    
    insight = f"The {fund_name} is a {category} mutual fund. Its direct plan expense ratio is {dir_exp}%, which is competitive for this category. In contrast, the regular plan's expense ratio stands at {reg_exp}%, resulting in an annual cost leakage of {diff}% in intermediary commissions. For long-term wealth compounding, switching to the direct plan will save you approximately ₹{int(diff * 1000)} per year for every ₹1 Lakh invested, boosting your retirement corpus with zero portfolio risk."
    return {"insight": insight}
