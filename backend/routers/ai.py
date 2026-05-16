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
            logger.error(f"Gemini streaming error: {e}")
            yield json.dumps({"content": f"Error generating response: {str(e)}"}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")


@router.post("/insights")
async def fund_insights(request: InsightRequest):
    """Generate AI insight for a specific fund."""
    client = await get_gemini_client()
    if not client:
        return {"insight": "AI service unavailable."}

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
        return {"insight": response.text}
    except Exception as e:
        logger.error(f"Insights error: {e}")
        return {"insight": "Analysis unavailable at this time."}
