# GOLD & SILVER EXCHANGE (TRADE-IN) IMPLEMENTATION REPORT
## Sidheshwar Jewellers ERP — Old Metal Valuation & Trade-In Credit Architecture

---

## 1. Executive Summary
The Old Gold and Silver Exchange (Trade-In) module allows customers to exchange old jewellery or scrap metal against new jewellery purchases. The ERP records the received old metal, computes its exchange valuation based on gross weight, net metal weight, scrap purity, and current market trade-in rates, and deducts the credit from the invoice total.

- **Strict Domain Boundary**: This is an **Old Metal Exchange / Trade-In Transaction**. It is completely separate and isolated from the **Gold Mortgage Loan (Finance)** workflow and from `LoanAccount` records.
- **Database Entities**: `SaleRecord` (`exchangeMetals`, `totalExchangeCreditPaise`, `netPayablePaise`).
- **Status**: Completed & 100% Verified.

---

## 2. Key Architecture & Features Implemented

### 2.1 Trade-In Section & Input Controls
- Positioned in counter billing at `/sales/billing` under **Section 2: Old Metal Received / Exchange**.
- Multiple Trade-In Entries: Customers can trade in multiple old pieces (e.g. an old gold chain plus old silver coins).
- Captured attributes per exchange item:
  - **Metal Type**: Gold or Silver.
  - **Gross Weight (g)**: Scale reading of the uncleaned jewellery piece.
  - **Net Metal Weight (g)**: Verified weight after deductions for stones, enamel, lac, or dirt ($w_{\text{net}} \le w_{\text{gross}}$).
  - **Purity Standard**: e.g. 22K Scrap, 18K Scrap, 925 Scrap.
  - **Applicable Scrap Rate (₹/g)**: Rate applied on the day of exchange.
  - **Deduction (₹)**: Melting loss or stone deductions.
  - **Calculated Exchange Value**: Net credit allowance.

### 2.2 Valuation Formulas
For each exchange piece:
$$\text{Calculated Exchange Credit (₹)} = \max\Big(0,\; \big(w_{\text{net}} \times \text{Scrap Rate (₹/g)}\big) - \text{Deductions (₹)}\Big)$$

Total exchange credit:
$$\text{Total Old Metal Credit} = \sum_{j=1}^{m} \text{Exchange Credit}_j$$

Combined invoice calculation:
$$\text{Net Amount Payable} = \max\Big(0,\; \text{Total New Purchase Amount} - \text{Total Old Metal Credit}\Big)$$

### 2.3 Strict Domain Isolation
1. **Isolation from Mortgage Finance**: Old metal trade-ins do not generate pledge records, interest accruals, or custody lockers.
2. **Historical Immutability**: The exchange scrap rate and net valuation are stored permanently inside the `SaleRecord` so subsequent changes in daily gold rates never distort historical invoices.
3. **Over-Credit Protection**: If old metal credit exceeds new purchase value, the net payable is bounded at ₹0, preventing negative customer debt balances.

---

## 3. Verification & Automated Test Results
- Automated test script: `scripts/test-advanced-billing.js`.
- Result: **100% Passed**.
  - Old gold net weight 2.000g @ ₹6,500/g with ₹500 deduction verified at exact ₹12,500 credit.
  - New purchase ₹40,000 reduced to exact ₹27,500 net payable.
  - Database schema verified backward-compatible with legacy single-item records.
