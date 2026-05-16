import pytest
from datetime import date
from services.tax_engine import TaxEngine
from models.tax_schemas import Folio, Transaction

def test_tax_engine_fifo_equity_ltcg():
    """Test that a 1-year holding in Equity results in LTCG."""
    engine = TaxEngine()
    
    folio = Folio(
        scheme_name="Test Equity Fund",
        scheme_code="123",
        folio_number="F1",
        current_units=100.0,
        asset_type="Equity",
        transactions=[
            Transaction(
                date=date(2023, 1, 1),
                transaction_type="purchase",
                units=100.0,
                nav=100.0,
                amount=10000.0
            ),
            Transaction(
                date=date(2024, 1, 2),
                transaction_type="redemption",
                units=-100.0,
                nav=150.0,
                amount=15000.0
            )
        ]
    )
    
    result = engine.calculate_gains([folio], financial_year="2024-25")
    
    assert result.total_ltcg == 5000.0
    assert len(result.gain_entries) == 1
    assert result.gain_entries[0].gain_type == "LTCG"
    # 5000 is well within 1.25L exemption
    assert result.ltcg_tax == 0.0
    assert result.ltcg_exempt == 5000.0

def test_tax_engine_fifo_equity_stcg():
    """Test that <1 year holding in Equity results in STCG."""
    engine = TaxEngine()
    
    folio = Folio(
        scheme_name="Test Equity Fund",
        scheme_code="123",
        folio_number="F2",
        current_units=100.0,
        asset_type="Equity",
        transactions=[
            Transaction(
                date=date(2024, 1, 1),
                transaction_type="purchase",
                units=100.0,
                nav=100.0,
                amount=10000.0
            ),
            Transaction(
                date=date(2024, 6, 1),
                transaction_type="redemption",
                units=-100.0,
                nav=150.0,
                amount=15000.0
            )
        ]
    )
    
    result = engine.calculate_gains([folio], financial_year="2024-25")
    
    assert result.total_stcg == 5000.0
    assert result.stcg_tax == 1000.0 # 20% of 5000

def test_tax_engine_debt_fund():
    """Test that Debt fund gains are taxed at slab (estimated 30%)."""
    engine = TaxEngine()
    
    folio = Folio(
        scheme_name="Test Debt Fund",
        scheme_code="456",
        folio_number="F3",
        current_units=100.0,
        asset_type="Debt",
        transactions=[
            Transaction(
                date=date(2024, 1, 1),
                transaction_type="purchase",
                units=100.0,
                nav=100.0,
                amount=10000.0
            ),
            Transaction(
                date=date(2024, 6, 1),
                transaction_type="redemption",
                units=-100.0,
                nav=110.0,
                amount=11000.0
            )
        ]
    )
    
    result = engine.calculate_gains([folio], financial_year="2024-25")
    
    assert result.total_debt_gain == 1000.0
    assert result.debt_tax == 300.0 # 30% slab estimation
