# Testing PortfolioX

This guide explains how to run and test the two main modules of PortfolioX: the **Portfolio Overlap Detector** and **Tax Mitra**.

---

## 1. Prerequisites
Ensure your environment is set up and your database is reachable.
- **Backend Environment**: `conda activate C:\Users\dabaa\OneDrive\Desktop\dektop_content\PortfolioX\portfolio_venv`
- **Frontend Environment**: Node.js installed in `frontend/`

---

## 2. Running the Application

### Start the Backend
```powershell
cd backend
conda activate C:\Users\dabaa\OneDrive\Desktop\dektop_content\PortfolioX\portfolio_venv
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Start the Frontend
```powershell
cd frontend
npm run dev
```
The application will be available at `http://localhost:3000`.

---

## 3. Testing Module 1: Portfolio Overlap Detector
1. Navigate to `http://localhost:3000`.
2. Click **"Analyze My Portfolio"**.
3. **Search & Add**: Type fund names like "Parag Parikh Flexi Cap" or "HDFC Flexi Cap".
4. **Define Units**: Enter the number of units or amounts for each fund.
5. **Run Analysis**: Click the **"Analyze Portfolio"** button.
6. **Verify Results**:
   - Check the **Overlap Matrix** for stock duplication.
   - View **Sector Exposure** to see if you are over-concentrated.
   - Read the **AI Verdict** (Gemini-powered) for a strategic health summary.

---

## 4. Testing Module 2: Tax Mitra (Capital Gains)
1. Navigate to `http://localhost:3000/tax`.
2. You have two ways to test this:

### Option A: Automatic Parsing (PDF Upload)
1. Use the mock PDF I generated for you: `C:\Users\dabaa\OneDrive\Desktop\dektop_content\PortfolioX\mock_cams_statement.pdf`.
2. Drag and drop this file into the upload zone.
3. Click **"Calculate Tax Liability"**.
4. **Verify**: It should show ₹0 tax (as the gains are within the ₹1.25L exemption) and suggest a tax-saving optimization strategy.

### Option B: Manual Entry
1. Select **"Manual Entry"**.
2. Add a Fund (e.g., "Mirae Asset Large Cap").
3. Add a **Purchase** transaction (e.g., 100 units at ₹100 on 01-Jan-2023).
4. Add a **Redemption** transaction (e.g., 50 units at ₹150 on 01-Jan-2024).
5. Click **"Calculate Tax Liability"**.

---

## 5. Automated Backend Tests
If you want to verify the logic without the UI, run these scripts:

- **General API Check**:
  ```powershell
  python backend/test_api.py
  ```
- **Core Tax Engine Logic**:
  ```powershell
  python backend/test_tax_logic.py
  ```

---

## 6. Database Verification
If you need to check if the database has the latest mutual fund data:
```powershell
python scratch/find_codes.py
```
This will print a JSON list of funds successfully found in your PostgreSQL database.
