import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.pdf_parser import CAMSParser
from services.tax_engine import TaxEngine
from datetime import date

def test_tax_logic():
    print("Testing Tax Mitra Logic...")
    
    pdf_path = "mock_cams_statement.pdf"
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found.")
        return

    # 1. Test Parsing
    print("\n1. Parsing PDF...")
    parser = CAMSParser()
    statement = parser.parse(pdf_path)
    
    print(f"Investor: {statement.investor_name}")
    print(f"PAN: {statement.pan}")
    print(f"Folios found: {len(statement.folios)}")
    
    for folio in statement.folios:
        print(f"\n  Folio: {folio.folio_number}")
        print(f"  Scheme: {folio.scheme_name}")
        print(f"  Transactions: {len(folio.transactions)}")
        for tx in folio.transactions:
            print(f"    - {tx.date}: {tx.transaction_type} | Units: {tx.units} | NAV: {tx.nav}")

    # 2. Test Tax Calculation
    print("\n2. Calculating Taxes...")
    engine = TaxEngine()
    calculation = engine.calculate_gains(statement.folios)
    
    print(f"Total STCG: ₹{calculation.total_stcg:.2f}")
    print(f"Total LTCG: ₹{calculation.total_ltcg:.2f}")
    print(f"STCG Tax (20%): ₹{calculation.stcg_tax:.2f}")
    print(f"LTCG Tax (12.5% after 1.25L): ₹{calculation.ltcg_tax:.2f}")
    print(f"Total Tax: ₹{calculation.total_tax:.2f}")
    
    print("\n3. Harvesting Opportunities...")
    for opp in calculation.harvesting_opportunities:
        print(f"  - {opp.scheme_name}: Loss ₹{opp.unrealized_loss:.2f} | Potential Savings ₹{opp.potential_tax_savings:.2f}")
        
    print("\n4. LTCG Optimization...")
    print(f"  - {calculation.ltcg_optimization.suggested_action}")

if __name__ == "__main__":
    test_tax_logic()
