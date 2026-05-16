from google import genai
from config import settings
from models.schemas import AnalysisResult
import logging

logger = logging.getLogger(__name__)

class LLMExplainer:
    """
    Service to generate plain-English summaries of portfolio analysis using Gemini.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
            self.model_name = 'gemini-2.5-flash'
        else:
            self.client = None

    async def generate_portfolio_summary(self, analysis: AnalysisResult) -> str:
        """
        Generates a 3-4 sentence summary of portfolio health.
        """
        if not self.client:
            return "AI explanation unavailable. Please provide a GEMINI_API_KEY."

        # Prepare summary data
        num_funds = len(analysis.funds)
        worst_overlap = max([p.overlap_score for p in analysis.overlap_matrix]) if analysis.overlap_matrix else 0
        worst_overlap_pair = ""
        if analysis.overlap_matrix:
            pair = next(p for p in analysis.overlap_matrix if p.overlap_score == worst_overlap)
            worst_overlap_pair = f"{pair.fund_a_name} and {pair.fund_b_name}"

        regular_plan_count = len(analysis.expense_audit.regular_plan_funds)
        top_sector = max(analysis.sector_exposure, key=analysis.sector_exposure.get) if analysis.sector_exposure else "N/A"
        top_sector_pct = analysis.sector_exposure.get(top_sector, 0)

        prompt = f"""
        You are a friendly financial educator (not an advisor) explaining a mutual fund 
        portfolio analysis to a retail investor in India. 
        
        Portfolio data:
        - Total value: ₹{analysis.total_value:,.0f}
        - Number of funds: {num_funds}
        - Health score: {analysis.health_score}/100
        - Worst overlap pair: {worst_overlap_pair} at {worst_overlap}% overlap
        - Weighted expense ratio: {analysis.expense_audit.total_weighted_expense_ratio}%
        - Regular plan funds (costing extra): {regular_plan_count}
        - Top sector: {top_sector} at {top_sector_pct}%
        - Red flags: {", ".join(analysis.red_flags)}
        
        Write a 3-4 sentence explanation that:
        1. States the overall health of the portfolio in simple terms
        2. Highlights the most important issue to fix
        3. Mentions one specific positive (if any)
        4. Ends with one actionable step (educational, not advice)
        
        Rules:
        - Do NOT say "you should invest" or "I recommend"
        - Use simple language — assume the reader knows basic investing but not advanced concepts
        - Be honest but not alarmist
        - Mention specific fund names and numbers
        - Keep it under 100 words
        - End with: "(This is educational information, not financial advice)"
        """

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return "Failed to generate AI explanation. Please check your API key or limits."
