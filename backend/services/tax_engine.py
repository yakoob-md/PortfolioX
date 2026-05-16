from typing import List, Dict, Tuple
from datetime import date
from models.tax_schemas import Folio, GainEntry, TaxCalculation, HarvestingOpportunity, LTCGOptimization

class TaxEngine:
    def __init__(self, financial_year_end: date = date(2025, 3, 31)):
        self.financial_year_end = financial_year_end

    def calculate_gains(self, folios: List[Folio], financial_year: str = "2024-25") -> TaxCalculation:
        total_stcg = 0.0
        total_ltcg = 0.0
        gain_entries: List[GainEntry] = []
        harvesting_opportunities: List[HarvestingOpportunity] = []
        
        # We will assume a fixed current NAV for harvesting if not provided. 
        # ForMVP, we will just use the last transaction NAV of that folio as an approximation of current NAV.
        
        for folio in folios:
            # Sort transactions by date
            transactions = sorted(folio.transactions, key=lambda x: x.date)
            
            purchase_queue = [] # Queue of (date, units, nav)
            
            for tx in transactions:
                if tx.units > 0 and tx.transaction_type in ['purchase', 'dividend', 'bonus']:
                    purchase_queue.append([tx.date, tx.units, tx.nav])
                elif tx.units < 0 and tx.transaction_type == 'redemption':
                    units_to_redeem = abs(tx.units)
                    redemption_nav = tx.nav
                    
                    # FIFO pop
                    while units_to_redeem > 0 and purchase_queue:
                        p_date, p_units, p_nav = purchase_queue[0]
                        
                        units_sold = min(units_to_redeem, p_units)
                        
                        # Calculate holding period
                        holding_days = (tx.date - p_date).days
                        is_ltcg = holding_days >= 365
                        gain_type = 'LTCG' if is_ltcg else 'STCG'
                        
                        gain_amount = (redemption_nav - p_nav) * units_sold
                        
                        tax_applicable = 0.0
                        if gain_type == 'STCG':
                            tax_applicable = max(0, gain_amount) * 0.20
                            total_stcg += gain_amount
                        else:
                            # We don't calculate exact LTCG tax per entry because of the 1.25L limit, 
                            # we'll aggregate it. We just store the gain_amount.
                            total_ltcg += gain_amount
                            
                        gain_entries.append(GainEntry(
                            scheme_name=folio.scheme_name,
                            purchase_date=p_date,
                            redemption_date=tx.date,
                            holding_days=holding_days,
                            gain_type=gain_type,
                            purchase_nav=p_nav,
                            redemption_nav=redemption_nav,
                            units=units_sold,
                            gain_amount=gain_amount,
                            tax_applicable=tax_applicable
                        ))
                        
                        purchase_queue[0][1] -= units_sold
                        units_to_redeem -= units_sold
                        
                        if purchase_queue[0][1] <= 1e-6:
                            purchase_queue.pop(0)

            # Harvesting Opportunity Check
            # Use last nav as approximate current nav
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
                    potential_tax_savings = unrealized_loss * 0.20 # Offset against STCG 20%
                    harvesting_opportunities.append(HarvestingOpportunity(
                        scheme_name=folio.scheme_name,
                        unrealized_loss=unrealized_loss,
                        units_to_sell=units_to_sell,
                        potential_tax_savings=potential_tax_savings
                    ))
                    
        # Calculate Aggregated Taxes
        stcg_tax = max(0, total_stcg) * 0.20
        ltcg_exempt = min(max(0, total_ltcg), 125000.0)
        ltcg_taxable = max(0, total_ltcg - 125000.0)
        ltcg_tax = ltcg_taxable * 0.125
        
        total_tax = stcg_tax + ltcg_tax
        
        # LTCG Optimization
        exemption_remaining = max(0, 125000.0 - ltcg_exempt)
        suggested_action = "You have fully utilized your ₹1.25L tax-free LTCG limit for this year."
        if exemption_remaining > 0:
            suggested_action = f"You can realize ₹{exemption_remaining:,.2f} more in LTCG this year completely tax-free. Consider redeeming and reinvesting units held for >1 year."

        ltcg_optimization = LTCGOptimization(
            exemption_used=ltcg_exempt,
            exemption_remaining=exemption_remaining,
            suggested_action=suggested_action
        )
        
        return TaxCalculation(
            session_id="dummy", # Router will set this
            financial_year=financial_year,
            total_stcg=total_stcg,
            total_ltcg=total_ltcg,
            ltcg_exempt=ltcg_exempt,
            ltcg_taxable=ltcg_taxable,
            stcg_tax=stcg_tax,
            ltcg_tax=ltcg_tax,
            total_tax=total_tax,
            gain_entries=gain_entries,
            harvesting_opportunities=harvesting_opportunities,
            ltcg_optimization=ltcg_optimization
        )
