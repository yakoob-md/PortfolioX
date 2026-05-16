import pdfplumber
import re
from datetime import datetime
from typing import List, Optional
from models.tax_schemas import ParsedStatement, Folio, Transaction

class CAMSParser:
    def parse(self, pdf_path: str) -> ParsedStatement:
        folios: List[Folio] = []
        investor_name = None
        pan = None
        
        current_folio = None
        current_scheme = None
        
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                
                lines = text.split('\n')
                for line in lines:
                    # Extract Investor Info
                    if line.startswith("Investor Name:"):
                        investor_name = line.replace("Investor Name:", "").strip()
                    elif line.startswith("PAN:"):
                        pan = line.replace("PAN:", "").strip()
                        
                    # Extract Folio Info
                    folio_match = re.search(r"Folio No: (\S+)", line)
                    if folio_match:
                        # If we have a current_folio, save it
                        if current_folio:
                            folios.append(current_folio)
                        
                        folio_no = folio_match.group(1)
                        current_folio = Folio(
                            scheme_name="Unknown Scheme",  # Will be updated by the next line
                            scheme_code="dummy", # Will be resolved later
                            folio_number=folio_no,
                            current_units=0.0,
                            transactions=[]
                        )
                        current_scheme = None
                        continue
                        
                    # Extract Scheme Name (Usually the line after Folio)
                    if current_folio and not current_scheme and "Direct Plan" in line or "Regular Plan" in line or "Fund" in line:
                        if "Folio" not in line and "Date" not in line:
                            current_scheme = line.strip()
                            current_folio.scheme_name = current_scheme
                            continue
                            
                    # Extract Transactions
                    # Example line: 01-Jan-2023 Purchase - SIP 10000.00 50.000 200.00 50.000
                    tx_match = re.search(r"(\d{2}-[A-Za-z]{3}-\d{4})\s+(.+?)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)", line)
                    if tx_match and current_folio:
                        date_str = tx_match.group(1)
                        desc = tx_match.group(2).strip().lower()
                        amount_str = tx_match.group(3)
                        units_str = tx_match.group(4)
                        price_str = tx_match.group(5)
                        
                        try:
                            tx_date = datetime.strptime(date_str, "%d-%b-%Y").date()
                            amount = float(amount_str)
                            units = float(units_str)
                            nav = float(price_str)
                            
                            tx_type = "purchase"
                            if "redemption" in desc or "switch out" in desc:
                                tx_type = "redemption"
                            elif "dividend" in desc:
                                tx_type = "dividend"
                            elif "bonus" in desc:
                                tx_type = "bonus"
                            elif "switch in" in desc:
                                tx_type = "purchase"  # Switch in is a purchase
                                
                            tx = Transaction(
                                date=tx_date,
                                transaction_type=tx_type,
                                units=units,
                                nav=nav,
                                amount=amount
                            )
                            current_folio.transactions.append(tx)
                            current_folio.current_units += units
                        except ValueError as e:
                            print(f"Error parsing transaction line: {line} -> {e}")
                            
        if current_folio:
            folios.append(current_folio)
            
        return ParsedStatement(
            investor_name=investor_name,
            pan=pan,
            folios=folios
        )
