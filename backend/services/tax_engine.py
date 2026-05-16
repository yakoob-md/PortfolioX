from typing import List, Dict, Tuple
from datetime import date
from models.tax_schemas import Folio, GainEntry, TaxCalculation, HarvestingOpportunity, LTCGOptimization

class TaxEngine:
    def __init__(self, financial_year_end: date = date(2025, 3, 31)):
        self.financial_year_end = financial_year_end

    def calculate_gains(self, folios: List[Folio], financial_year: str = "2024-25") -> TaxCalculation:
        total_stcg = 0.0
        total_ltcg = 0.0
        total_debt_gain = 0.0
        gain_entries: List[GainEntry] = []
        harvesting_opportunities: List[HarvestingOpportunity] = []
        
        for folio in folios:
            asset_type = folio.asset_type
            # Sort transactions by date
            transactions = sorted(folio.transactions, key=lambda x: x.date)
            
            purchase_queue = [] # Queue of [date, units, nav]
            
            for tx in transactions:
                if tx.units > 0 and tx.transaction_type in ['purchase', 'dividend', 'bonus', 'switch_in']:
                    purchase_queue.append([tx.date, tx.units, tx.nav])
                elif tx.units < 0 and tx.transaction_type in ['redemption', 'switch_out']:
                    units_to_redeem = abs(tx.units)
                    redemption_nav = tx.nav
                    
                    # FIFO pop
                    while units_to_redeem > 0 and purchase_queue:
                        p_date, p_units, p_nav = purchase_queue[0]
                        
                        units_sold = min(units_to_redeem, p_units)
                        
                        # Calculate holding period
                        holding_days = (tx.date - p_date).days
                        
                        gain_amount = (redemption_nav - p_nav) * units_sold
                        tax_applicable = 0.0
                        
                        if asset_type == 'Equity':
                            is_ltcg = holding_days >= 365
                            gain_type = 'LTCG' if is_ltcg else 'STCG'
                            
                            if gain_type == 'STCG':
                                tax_applicable = max(0, gain_amount) * 0.20
                                total_stcg += gain_amount
                            else:
                                total_ltcg += gain_amount
                        elif asset_type == 'Debt':
                            gain_type = 'Business Income'
                            # Post April 2023, Debt gains are taxed at slab rates
                            # We'll estimate at 30% for high-net-worth demonstration
                            tax_applicable = max(0, gain_amount) * 0.30
                            total_debt_gain += gain_amount
                        else:
                            gain_type = 'STCG'
                            tax_applicable = max(0, gain_amount) * 0.20
                            total_stcg += gain_amount

                        gain_entries.append(GainEntry(
                            scheme_name=folio.scheme_name,
                            asset_type=asset_type,
                            purchase_date=p_date,
                            redemption_date=tx.date,
                            holding_days=holding_days,
                            gain_type=gain_type,
                            purchase_nav=p_nav,
                            redemption_nav=redemption_nav,
                            units=units_sold,
                            gain_amount=round(gain_amount, 2),
                            tax_applicable=round(tax_applicable, 2)
                        ))
                        
                        purchase_queue[0][1] -= units_sold
                        units_to_redeem -= units_sold
                        
                        if purchase_queue[0][1] <= 1e-6:
                            purchase_queue.pop(0)

            # Harvesting Opportunity Check
            # Use last nav as approximate current nav for unrealized gains
            if purchase_queue and transactions:
                current_nav = transactions[-1].nav
                unrealized_loss = 0.0
                units_to_sell = 0.0
                
                for p_date, p_units, p_nav in purchase_queue:
                    if current_nav < p_nav:
                        loss = (p_nav - current_nav) * p_units
                        unrealized_loss += loss
                        units_to_sell += p_units
                
                if unrealized_loss > 0:
                    # Offset against STCG (20%) or Debt (30%)
                    savings_rate = 0.20 if asset_type == 'Equity' else 0.30
                    potential_tax_savings = unrealized_loss * savings_rate
                    harvesting_opportunities.append(HarvestingOpportunity(
                        scheme_name=folio.scheme_name,
                        unrealized_loss=round(unrealized_loss, 2),
                        units_to_sell=round(units_to_sell, 3),
                        potential_tax_savings=round(potential_tax_savings, 2)
                    ))
                    
        # Calculate Aggregated Taxes
        stcg_tax = max(0, total_stcg) * 0.20
        ltcg_exempt = min(max(0, total_ltcg), 125000.0)
        ltcg_taxable = max(0, total_ltcg - 125000.0)
        ltcg_tax = ltcg_taxable * 0.125
        debt_tax = max(0, total_debt_gain) * 0.30 # Estimating slab rate at 30%
        
        total_tax = stcg_tax + ltcg_tax + debt_tax
        
        # LTCG Optimization
        exemption_remaining = max(0, 125000.0 - ltcg_exempt)
        suggested_action = "You have fully utilized your ₹1.25L tax-free LTCG limit for this year."
        if exemption_remaining > 0:
            suggested_action = f"You can realize ₹{exemption_remaining:,.2f} more in LTCG this year completely tax-free. Consider redeeming and reinvesting units held for >1 year."

        ltcg_optimization = LTCGOptimization(
            exemption_used=round(ltcg_exempt, 2),
            exemption_remaining=round(exemption_remaining, 2),
            suggested_action=suggested_action
        )
        
        return TaxCalculation(
            session_id="", # Router will set this
            financial_year=financial_year,
            total_stcg=round(total_stcg, 2),
            total_ltcg=round(total_ltcg, 2),
            total_debt_gain=round(total_debt_gain, 2),
            ltcg_exempt=round(ltcg_exempt, 2),
            ltcg_taxable=round(ltcg_taxable, 2),
            stcg_tax=round(stcg_tax, 2),
            ltcg_tax=round(ltcg_tax, 2),
            debt_tax=round(debt_tax, 2),
            total_tax=round(total_tax, 2),
            gain_entries=gain_entries,
            harvesting_opportunities=harvesting_opportunities,
            ltcg_optimization=ltcg_optimization
        )
