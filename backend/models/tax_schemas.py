from pydantic import BaseModel
from typing import List, Literal, Optional
from datetime import date

class Transaction(BaseModel):
    date: date
    transaction_type: Literal['purchase', 'redemption', 'dividend', 'bonus', 'switch_in', 'switch_out']
    units: float
    nav: float
    amount: float

class Folio(BaseModel):
    scheme_name: str
    scheme_code: str
    folio_number: str
    current_units: float
    transactions: List[Transaction]

class ParsedStatement(BaseModel):
    investor_name: Optional[str] = None
    pan: Optional[str] = None
    email: Optional[str] = None
    folios: List[Folio]

class GainEntry(BaseModel):
    scheme_name: str
    purchase_date: date
    redemption_date: date
    holding_days: int
    gain_type: Literal['STCG', 'LTCG']
    purchase_nav: float
    redemption_nav: float
    units: float
    gain_amount: float
    tax_applicable: float

class HarvestingOpportunity(BaseModel):
    scheme_name: str
    unrealized_loss: float
    units_to_sell: float
    potential_tax_savings: float

class LTCGOptimization(BaseModel):
    exemption_used: float
    exemption_remaining: float
    suggested_action: str

class TaxCalculation(BaseModel):
    session_id: str
    financial_year: str
    total_stcg: float
    total_ltcg: float
    ltcg_exempt: float
    ltcg_taxable: float
    stcg_tax: float
    ltcg_tax: float
    total_tax: float
    gain_entries: List[GainEntry]
    harvesting_opportunities: List[HarvestingOpportunity]
    ltcg_optimization: LTCGOptimization
