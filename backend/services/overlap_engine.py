from typing import List, Dict
import pandas as pd
from models.schemas import Holding, OverlapPair

class OverlapEngine:
    """
    Core engine for computing mutual fund portfolio overlap and exposure.
    """

    def compute_overlap(
        self, 
        fund_holdings: Dict[str, List[Holding]], 
        fund_names: Dict[str, str]
    ) -> List[OverlapPair]:
        """
        Calculates pairwise stock overlap between all funds in the portfolio.
        Overlap score = sum(min(% in Fund A, % in Fund B)) for common stocks.
        """
        scheme_codes = list(fund_holdings.keys())
        overlap_results = []

        for i in range(len(scheme_codes)):
            for j in range(i + 1, len(scheme_codes)):
                code_a = scheme_codes[i]
                code_b = scheme_codes[j]
                
                holdings_a = {h.stock_isin or h.stock_name: h.holding_percentage for h in fund_holdings[code_a] if h.asset_type == "Equity"}
                holdings_b = {h.stock_isin or h.stock_name: h.holding_percentage for h in fund_holdings[code_b] if h.asset_type == "Equity"}
                
                common_keys = set(holdings_a.keys()) & set(holdings_b.keys())
                
                overlap_score = 0.0
                common_stocks = []
                
                for key in common_keys:
                    overlap_score += min(holdings_a[key], holdings_b[key])
                    # Try to find the display name
                    stock_name = next((h.stock_name for h in fund_holdings[code_a] if (h.stock_isin or h.stock_name) == key), key)
                    common_stocks.append(stock_name)
                
                overlap_results.append(OverlapPair(
                    fund_a_code=code_a,
                    fund_a_name=fund_names.get(code_a, code_a),
                    fund_b_code=code_b,
                    fund_b_name=fund_names.get(code_b, code_b),
                    overlap_score=round(overlap_score, 2),
                    common_stocks=common_stocks,
                    common_stock_count=len(common_stocks)
                ))
                
        return overlap_results

    def compute_sector_exposure(
        self,
        fund_holdings: Dict[str, List[Holding]],
        weights: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Aggregate sector exposure across all funds weighted by allocation.
        """
        sector_totals = {}
        
        for code, holdings in fund_holdings.items():
            fund_weight = weights.get(code, 0.0)
            for h in holdings:
                if h.sector:
                    weighted_pct = h.holding_percentage * fund_weight
                    sector_totals[h.sector] = sector_totals.get(h.sector, 0.0) + weighted_pct
                    
        # Round results
        return {sector: round(val, 2) for sector, val in sector_totals.items()}

    def compute_stock_concentration(
        self,
        fund_holdings: Dict[str, List[Holding]],
        weights: Dict[str, float]
    ) -> List[Dict]:
        """
        Calculates total portfolio exposure per stock.
        """
        stock_exposure = {}
        stock_info = {} # key -> {name, sector, funds}
        
        for code, holdings in fund_holdings.items():
            fund_weight = weights.get(code, 0.0)
            for h in holdings:
                key = h.stock_isin or h.stock_name
                weighted_pct = h.holding_percentage * fund_weight
                
                stock_exposure[key] = stock_exposure.get(key, 0.0) + weighted_pct
                
                if key not in stock_info:
                    stock_info[key] = {
                        "name": h.stock_name,
                        "sector": h.sector,
                        "funds": set()
                    }
                stock_info[key]["funds"].add(code)
                
        results = []
        for key, exposure in stock_exposure.items():
            results.append({
                "stock_name": stock_info[key]["name"],
                "sector": stock_info[key]["sector"],
                "exposure": round(exposure, 2),
                "fund_count": len(stock_info[key]["funds"])
            })
            
        # Sort by exposure descending
        return sorted(results, key=lambda x: x["exposure"], reverse=True)

    def compute_marketcap_breakdown(
        self,
        fund_holdings: Dict[str, List[Holding]],
        weights: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Returns market cap breakdown aggregated across all funds.
        """
        mcap_totals = {"Large Cap": 0.0, "Mid Cap": 0.0, "Small Cap": 0.0, "Other": 0.0}
        
        for code, holdings in fund_holdings.items():
            fund_weight = weights.get(code, 0.0)
            for h in holdings:
                mcap = h.market_cap or "Other"
                if mcap not in ["Large", "Mid", "Small"]:
                    mcap = "Other"
                else:
                    mcap = f"{mcap} Cap"
                
                weighted_pct = h.holding_percentage * fund_weight
                mcap_totals[mcap] = mcap_totals.get(mcap, 0.0) + weighted_pct
                    
        return {cap: round(val, 2) for cap, val in mcap_totals.items()}
