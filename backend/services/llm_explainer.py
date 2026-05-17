from google import genai
from config import settings
from models.schemas import AnalysisResult
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class LLMExplainer:
    """
    Service to generate plain-English summaries of portfolio analysis using Gemini,
    with a premium, highly descriptive rule-based local fallback system.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                self.model_name = 'gemini-2.5-flash'
            except Exception as e:
                logger.error(f"Failed to initialize GenAI client: {e}")
                self.client = None
        else:
            self.client = None

    async def generate_portfolio_summary(self, analysis: AnalysisResult) -> str:
        """
        Generates a 3-4 sentence summary of portfolio health from an AnalysisResult object.
        """
        return await self.explain_health(
            health_score=analysis.health_score,
            red_flags=analysis.red_flags,
            sector_exposure=analysis.sector_exposure
        )

    async def explain_health(self, health_score: int, red_flags: List[str], sector_exposure: Dict[str, float]) -> str:
        """
        Generates a clear plain-English summary of portfolio health, utilizing Gemini
        with an extremely polished local fallback.
        """
        # If GenAI client is available, try generating via LLM first
        if self.client:
            prompt = f"""
            You are a premier financial analyst explaining a mutual fund portfolio audit to an Indian retail investor.
            
            Portfolio metrics:
            - Health Score: {health_score}/100
            - Red Flags detected: {", ".join(red_flags) if red_flags else "None"}
            - Sector Exposure: {", ".join([f"{k}: {v}%" for k, v in sector_exposure.items()])}
            
            Write a professional 3-sentence summary:
            1. An overall assessment of the portfolio based on the score.
            2. The most critical issue/red flag that needs attention (or praise if none).
            3. A specific educational next-step (e.g. consolidation or direct plans).
            
            Rules:
            - Use simple, direct, institutional-grade language.
            - Do not provide direct investment advice; keep it educational.
            - Keep it under 80 words.
            - End with: "(This is educational information, not financial advice)"
            """
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
                if response.text:
                    return response.text.strip()
            except Exception as e:
                logger.error(f"Gemini API execution error: {e}. Falling back to rule-based explanation.")

        # ============ PREMIUM LOCAL RULE-BASED GENERATOR FALLBACK ============
        # Runs if the API key is empty, leaked/revoked, or if the request fails.
        # It creates a beautifully articulated summary that feels completely premium.
        
        # 1. Overall Assessment
        if health_score >= 85:
            assessment = f"Your portfolio is in excellent health with a score of {health_score}/100. It demonstrates strong diversification and optimized expense ratios."
        elif health_score >= 65:
            assessment = f"Your portfolio is in moderate health (score: {health_score}/100). While the core structure is sound, there are optimization gaps that could be bridged to improve capital efficiency."
        else:
            assessment = f"Your portfolio needs immediate alignment (score: {health_score}/100). Multiple wealth leakage and concentration risks were detected."

        # 2. Critical Issues Summary
        issues = []
        for flag in red_flags:
            # Clean emojis/symbols from flag for smooth text flow
            clean_flag = flag.replace("⚠️", "").replace("❌", "").replace("High Overlap:", "high overlap between").strip()
            issues.append(clean_flag)

        if issues:
            critical_point = f" The most critical areas requiring attention are: {'; '.join(issues[:2])}."
        else:
            critical_point = " No significant red flags or high-risk concentrations were found, which is a great sign of disciplined asset allocation."

        # 3. Actionable Next Step
        if any("Regular" in issue or "regular" in issue.lower() for issue in issues):
            next_step = " Moving regular plan funds to direct plans can immediately stop wealth leakage to distributor commissions."
        elif any("Overlap" in issue or "overlap" in issue.lower() for issue in issues):
            next_step = " Consolidating overlapping funds will simplify your holdings and prevent redundant stock duplication."
        elif any("Sector" in issue or "sector" in issue.lower() for issue in issues):
            next_step = " Balancing sector weights will help you reduce cyclical volatility and safeguard against downside market movements."
        else:
            next_step = " Periodically auditing your holdings ensures that your portfolio stays aligned with your long-term wealth goals."

        disclaimer = "\n\n(This is educational information, not financial advice)"
        
        return assessment + critical_point + next_step + disclaimer
