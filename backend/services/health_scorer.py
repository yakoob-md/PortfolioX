from typing import List, Dict
from models.schemas import OverlapPair, ExpenseAudit

class HealthScorer:
    """
    Calculates a 0-100 health score for a portfolio based on risk and cost metrics.
    """

    def calculate(
        self,
        overlap_matrix: List[OverlapPair],
        expense_audit: ExpenseAudit,
        stock_concentrations: List[Dict],
        sector_exposure: Dict[str, float],
        funds: List[Dict] # List of {scheme_name, plan_type}
    ) -> tuple[int, List[str]]:
        """
        Computes weighted health score and generates red flags.
        """
        score = 100
        red_flags = []

        # 1. OVERLAP SCORE (30%)
        max_overlap = max([p.overlap_score for p in overlap_matrix]) if overlap_matrix else 0
        if max_overlap > 35:
            score -= 30
            worst_pair = next(p for p in overlap_matrix if p.overlap_score == max_overlap)
            red_flags.append(f"⚠️ High Overlap: {worst_pair.fund_a_name} and {worst_pair.fund_b_name} have {max_overlap}% overlap.")
        elif max_overlap > 20:
            score -= 15
            red_flags.append(f"⚠️ Moderate Overlap: Max pairwise overlap is {max_overlap}%.")
        elif max_overlap > 10:
            score -= 5

        # 2. EXPENSE RATIO SCORE (20%)
        avg_expense = expense_audit.total_weighted_expense_ratio
        if avg_expense > 1.8:
            score -= 20
            red_flags.append(f"⚠️ High Costs: Your portfolio's average expense ratio is {avg_expense}%.")
        elif avg_expense > 1.2:
            score -= 10
        elif avg_expense > 0.8:
            score -= 5

        # 3. DIRECT PLAN SCORE (15%)
        regular_plans = [f["name"] for f in funds if f["plan_type"] == "Regular"]
        if regular_plans:
            deduction = min(15, len(regular_plans) * 5)
            score -= deduction
            red_flags.append(f"⚠️ Regular Plans: {len(regular_plans)} funds are Regular plans, costing you ~₹{expense_audit.potential_savings_yearly:,.0f} extra per year.")

        # 4. STOCK CONCENTRATION SCORE (20%)
        max_stock_exp = stock_concentrations[0]["exposure"] if stock_concentrations else 0
        if max_stock_exp > 12:
            score -= 20
            red_flags.append(f"⚠️ Stock Concentration: {stock_concentrations[0]['stock_name']} makes up {max_stock_exp}% of your portfolio.")
        elif max_stock_exp > 8:
            score -= 10
            red_flags.append(f"⚠️ Moderate Concentration: {stock_concentrations[0]['stock_name']} exposure is {max_stock_exp}%.")
        elif max_stock_exp > 5:
            score -= 5

        # 5. SECTOR CONCENTRATION SCORE (15%)
        max_sector_exp = max(sector_exposure.values()) if sector_exposure else 0
        if max_sector_exp > 40:
            score -= 15
            top_sector = max(sector_exposure, key=sector_exposure.get)
            red_flags.append(f"⚠️ Sector Risk: {top_sector} exposure is {max_sector_exp}%, exceeding the 30% safety threshold.")
        elif max_sector_exp > 30:
            score -= 7

        return max(0, int(score)), red_flags

    def score_portfolio(
        self,
        overlap_matrix: List[OverlapPair],
        sector_exposure: Dict[str, float],
        expense_audit: ExpenseAudit,
        stock_concentrations: List[Dict] = None,
        funds: List[Dict] = None
    ) -> tuple[int, List[str]]:
        """
        Alternative entry point called by the portfolio router.
        Fills missing parameters with robust default fallbacks.
        """
        if stock_concentrations is None:
            stock_concentrations = []
        if funds is None:
            funds = [{"name": name, "plan_type": "Regular"} for name in expense_audit.regular_plan_funds]

        return self.calculate(
            overlap_matrix=overlap_matrix,
            expense_audit=expense_audit,
            stock_concentrations=stock_concentrations,
            sector_exposure=sector_exposure,
            funds=funds
        )
