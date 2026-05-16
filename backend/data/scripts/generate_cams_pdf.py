import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def generate_cams_mock():
    pdf_path = "mock_cams_statement.pdf"
    doc = SimpleDocTemplate(pdf_path, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    
    styles = getSampleStyleSheet()
    elements = []
    
    # Header
    elements.append(Paragraph("<b>CONSOLIDATED ACCOUNT STATEMENT</b>", styles['Title']))
    elements.append(Paragraph("Computer Age Management Services Ltd. (CAMS)", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Investor Info
    elements.append(Paragraph("<b>Investor Name:</b> RAHUL SHARMA", styles['Normal']))
    elements.append(Paragraph("<b>PAN:</b> ABCDE1234F", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Folio 1: HDFC Flexi Cap (Equity)
    elements.append(Paragraph("<b>Folio No: 10001001</b>", styles['Heading3']))
    elements.append(Paragraph("<b>HDFC Flexi Cap Fund - Direct Plan - Growth</b>", styles['Normal']))
    elements.append(Spacer(1, 10))
    
    data1 = [
        ["Date", "Transaction", "Amount", "Units", "Price", "Unit Balance"],
        ["01-Jan-2023", "Purchase - SIP", "10000.00", "50.000", "200.00", "50.000"],
        ["01-Feb-2023", "Purchase - SIP", "10000.00", "40.000", "250.00", "90.000"],
        ["01-Jan-2024", "Purchase - SIP", "10000.00", "25.000", "400.00", "115.000"],
        ["15-Feb-2024", "Redemption", "-15000.00", "-30.000", "500.00", "85.000"],
        ["01-Apr-2024", "Redemption", "-12000.00", "-20.000", "600.00", "65.000"],
    ]
    t1 = Table(data1, colWidths=[80, 150, 60, 60, 60, 80])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
        ('TEXTCOLOR', (0,0), (-1,0), colors.black),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), colors.white),
        ('GRID', (0,0), (-1,-1), 1, colors.black)
    ]))
    elements.append(t1)
    elements.append(Spacer(1, 30))
    
    # Folio 2: Parag Parikh Flexi Cap (Equity)
    elements.append(Paragraph("<b>Folio No: 20002002</b>", styles['Heading3']))
    elements.append(Paragraph("<b>Parag Parikh Flexi Cap Fund - Direct Plan - Growth</b>", styles['Normal']))
    elements.append(Spacer(1, 10))
    
    data2 = [
        ["Date", "Transaction", "Amount", "Units", "Price", "Unit Balance"],
        ["10-May-2023", "Purchase", "50000.00", "1000.000", "50.00", "1000.000"],
        ["15-Dec-2023", "Purchase", "20000.00", "333.333", "60.00", "1333.333"],
        ["20-May-2024", "Redemption", "-35000.00", "-500.000", "70.00", "833.333"],
    ]
    t2 = Table(data2, colWidths=[80, 150, 60, 60, 60, 80])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
        ('TEXTCOLOR', (0,0), (-1,0), colors.black),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), colors.white),
        ('GRID', (0,0), (-1,-1), 1, colors.black)
    ]))
    elements.append(t2)
    
    doc.build(elements)
    print(f"Generated mock CAMS statement at {pdf_path}")

if __name__ == "__main__":
    generate_cams_mock()
