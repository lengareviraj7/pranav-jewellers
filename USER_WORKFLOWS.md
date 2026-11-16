# SIDHESHWAR JEWELLERS ERP — USER WORKFLOWS

## Workflow 1: Gold & Silver Stock Ingestion & Management

```
[Start]
   |
   v
[Open Gold or Silver Module]
   |
   +---> [View Category Summary & Active Stock Weights]
   |
   +---> [Add / Edit Category] (If new category needed, e.g. "Choker Sets")
   |        |
   |        v
   |     [Category immediately available for selection]
   |
   +---> [Click "Add Stock"]
            |
            v
         [Fill Form: Name, SKU, Category, Purity, Qty, Gross Wt, Stone Wt]
            |
            +---> System auto-computes: Net Weight = Gross Wt - Stone Wt
            +---> Enter Purchase Cost & Supplier
            |
            v
         [Submit Form]
            |
            +---> Backend validates: Gross > Stone, Qty >= 1
            +---> Saves to `inventoryItems`
            +---> Appends to `inventoryTransactions` (type: 'stock_in')
            +---> Instantly updates Category totals & Dashboard metrics
```

### Stock Adjustment Journey:
1. Operator navigates to item row in inventory table.
2. Clicks **Adjust Stock**.
3. Modal displays current quantity, gross weight, and net weight.
4. Operator enters adjusted values and a **mandatory adjustment reason** (e.g. "Periodic physical audit discrepancy", "Repaired clasp weight change").
5. System computes $\Delta$ quantity and $\Delta$ weight, updates `inventoryItems`, and saves audit record in `inventoryTransactions`.

---

## Workflow 2: Used Metal Purchase & Conversion to Showroom Stock

```
[Customer arrives with scrap or old ornaments]
   |
   v
[Open "Used Gold & Silver" Module]
   |
   v
[Click "Record Used Metal Purchase"]
   |
   +---> Select Metal Type (Gold or Silver)
   +---> Input Seller Name, Mobile, Item Description (e.g. "Old 22K Broken Chain")
   +---> Input Gross Weight & Deductions (wax, enamel, stones)
   +---> Net Weight is calculated
   +---> Enter Market Purchase Rate (₹/g)
   +---> System displays Calculated Value (Net Weight * Rate)
   +---> Operator inputs Final Agreed Cost & Payout Amount
   +---> Select Payment Method (Cash, UPI, Bank Transfer)
   |
   v
[Save Purchase]
   |
   +---> Transaction saved in `usedMetalPurchases` with voucher number `UMP-YYYY-XXXX`
   +---> Status set to 'paid', 'partially_paid', or 'pending'
   +---> Purchase stays isolated in Scrap Ledger (NOT counted in showroom stock)
   |
   v
[Refining & Testing Occurs]
   |
   v
[Operator clicks "Convert to Inventory" on Purchase Row]
   |
   +---> Modal loads purchase record
   +---> Operator inputs:
   |        * Post-refining tested weight (grams)
   |        * Purity (e.g. 24K Bar or 22K Casting Grain)
   |        * Destination Category (e.g. "Bullion / Raw Gold" or "Rings")
   |
   v
[Confirm Conversion]
   |
   +---> System marks purchase `isConvertedToInventory = true`
   +---> Creates new `inventoryItems` record linked to purchase ID
   +---> Writes `inventoryTransactions` entry (type: 'conversion_in')
   +---> Prevent any further conversion of this purchase record
```

---

## Workflow 3: Customer Loan Issuance & Mortgage Lifecycle

```
[Customer applies for Gold Loan]
   |
   v
[Open "Gold Finance" Module]
   |
   +---> [Option A: Customer exists] -> Select Customer Profile
   +---> [Option B: New Customer] -> Enter Name, Mobile, Address, ID Proof
   |
   v
[Click "Create New Loan"]
   |
   +---> Loan Number auto-generated (e.g. `SJ-LN-2026-0042`)
   +---> Input Mortgage Date (defaults to today's date in Asia/Kolkata)
   +---> Input Principal Amount (₹)
   +---> Choose Monthly Interest Rate:
   |        [2.0% / mo]  [2.5% / mo]  [3.0% / mo]  [Custom %]
   +---> Choose Calculation Method:
   |        [Yearly Compound - Capitalizes every 12 months]
   |        [Simple Interest - Original principal only]
   |
   +---> [Add Pledged Jewellery Items]:
   |        * Item description (e.g., "Gold Kada with Pearls")
   |        * Metal: Gold
   |        * Purity: 22K
   |        * Gross Weight & Net Weight
   |        * Security Packet Reference #
   |        (Note: These items NEVER enter shop inventory)
   |
   v
[Submit Loan]
   |
   +---> Loan saved with status 'active' in `financeLoans`
   +---> Audit log written
   +---> Customer profile updated with active loan
```

---

## Workflow 4: Mortgage Calculator Native Usage

```
[Operator opens "Mortgage Calculator" tab or clicks "Calculate" on Loan]
   |
   +---> If opened from loan: Pre-fills Mortgage Date, Principal, Rate, and Method
   +---> If opened standalone: Operator enters values manually
   |
   v
[System evaluates Siddheshwar v2 Engine]:
   1. Parses Mortgage Date and As-Of Date in Asia/Kolkata timezone.
   2. Evaluates calendar month advances: count `u` months where `date + u + 1 <= asOf`.
   3. Evaluates remainder days: `h = days_between(date + u, asOf)`.
   4. Applies Tiers:
      - If u == 0: 1.0 month minimum
      - If h <= 5: u + 0.0
      - If h <= 15: u + 0.5
      - If h > 15: u + 1.0
   5. Calculates interest in Paise:
      - Simple: `Math.round(Principal * Rate * ChargeableMonths / 100)`
      - Yearly Compound: Iterates through 12-month blocks, capitalizes ending amount
   6. Renders:
      - Completed months and remainder days description
      - Total Accrued Interest (₹)
      - Total Amount Due (₹)
      - Annual breakdown table for multi-year loans
   |
   v
[Actions available]:
   - [Calculate Only] (Quick counter estimation)
   - [Save to Finance Account] (Links to customer profile as an active loan)
   - [Export CSV]
```

---

## Workflow 5: Loan Repayment & Receipt Printing

```
[Customer arrives to make payment]
   |
   v
[Open Customer Profile or Loan Card]
   |
   v
[Click "Record Payment"]
   |
   +---> Displays current outstanding principal and accrued interest
   +---> Enter Payment Date
   +---> Enter Total Amount Received
   +---> Allocate:
   |        * Interest Amount Applied
   |        * Principal Amount Applied
   |        (System validates: Principal Applied + Interest Applied == Total Received)
   +---> Select Payment Mode (Cash, UPI, Bank Transfer)
   +---> Optional Cheque / Ref Number
   |
   v
[Confirm Payment]
   |
   +---> Creates record in `financePayments` with unique receipt number
   +---> Deducts Principal Applied from `currentOutstandingPrincipalPaise`
   +---> Updates `totalInterestPaidPaise` and `totalPrincipalPaidPaise`
   +---> If outstanding principal == 0: Prompt operator to mark loan as 'closed'
   +---> Displays printable payment receipt with Siddheshwar Jewellers watermark
```
