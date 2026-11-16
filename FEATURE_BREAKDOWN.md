# SIDHESHWAR JEWELLERS ERP — FEATURE BREAKDOWN

## 1. Module Matrix Overview

| Module | Core Functionality | Primary Entities | Key User Actions |
| :--- | :--- | :--- | :--- |
| **Authentication & Shell** | Secure login, session management, top header with live IST time, luxury responsive sidebar navigation | `users` | Login, Logout, Toggle Theme, View Session |
| **Live Dashboard** | Real-time aggregate statistics from MongoDB: live weights, category counts, used purchases, finance dues, recent ledger activities | All collections | View live metrics, trigger Quick Action modals |
| **Gold Inventory** | Dynamic gold category management, piece tracking, gross/stone/net auto-calculation, HUID, cost, stock movement history | `categories`, `inventoryItems`, `inventoryTransactions` | Add Category, Edit Category, Add Stock, Adjust Stock, Filter & Search, View Item History |
| **Silver Inventory** | Dynamic silver category management, utensils/pooja/ornaments tracking, purity tiers (999, 925, 800), stock transactions | `categories`, `inventoryItems`, `inventoryTransactions` | Add Category, Add Silver Stock, Adjust Stock, Category Totals, Archive Item |
| **Used Gold & Silver** | Scrap & customer exchange ledger, purity & rate calculation, payment status, explicit convert-to-inventory pipeline | `usedMetalPurchases`, `inventoryItems` | Record Purchase, Filter by Metal/Status, Convert to Showroom Stock |
| **Gold Finance & Mortgage** | Loan creation, pledged item segregation, native calculator (Siddheshwar v2), payment recording, receipts, dues ledger | `customers`, `financeLoans`, `financePayments` | Add Client, Issue Loan, Calculate Interest, Record Payment, Print Receipt, Dues List, Export CSV |
| **Settings & Reports** | Metal daily rates, shop profile info, full system audit trail, CSV exports for all ledgers | `appSettings`, `metalRates`, `auditLogs` | Update Market Rates, Export CSVs, View Audit Trail |

---

## 2. Granular Feature Specifications

### 2.1 Dashboard & Navigation Shell
- **Luxury Header**:
  - Store identity: **SIDHESHWAR JEWELLERS** (Champagne gold & ivory styling).
  - Live clock strictly rendered in **Asia/Kolkata (IST)** with date (`DD MMM YYYY, hh:mm:ss A`).
  - Active user profile pill with role badge and one-click Logout.
- **KPI Summary Cards**:
  - Total Gold Available Stock: Net weight in grams & gross weight in grams.
  - Total Silver Available Stock: Net weight in grams & gross weight in grams.
  - Active Categories: Gold categories count & Silver categories count.
  - Used Metal Purchases: Total gold & silver purchased (grams and ₹ cost).
  - Gold Finance Summary: Active accounts count, Total outstanding principal, Total outstanding dues (including accrued interest), and Overdue accounts count.
- **Quick Action Drawer / Modals**:
  - Modal 1: Quick Add Gold Stock
  - Modal 2: Quick Add Silver Stock
  - Modal 3: Quick Record Used Metal Purchase
  - Modal 4: Quick Add Finance Client
  - Modal 5: Quick Record Loan Payment
- **Live Activity Feed**:
  - Real-time stream of latest 10 events across stock additions, scrap purchases, and loan repayments with timestamps and user attribution.

---

### 2.2 Gold & Silver Inventory Modules
- **Dynamic Categories**:
  - Full CRUD: Add new category, rename, change display order, or disable without affecting existing items.
  - Category summary view: Card grid displaying category name, active pieces, total gross weight, and total net weight.
- **Add Stock Form**:
  - SKU / Item code: Automatically generated prefix (`SJ-G-` / `SJ-S-`) with custom override.
  - Purity selector: Gold (24K - 99.9%, 22K - 91.6%, 20K - 83.3%, 18K - 75.0%); Silver (999 Fine, 925 Sterling, 800 Standard).
  - Weight calculation:
    $$\text{Net Weight} = \text{Gross Weight} - \text{Stone Weight}$$
    Enforced: $\text{Gross Weight} > 0$, $\text{Stone Weight} \ge 0$, $\text{Net Weight} > 0$.
  - Purchase cost & unit cost tracking.
  - Optional Hallmark Unique Identification (HUID).
- **Stock Operations**:
  - Stock Adjustment: Prevents silent updates. Prompts for reason (e.g. weight re-calibration, stone addition, exchange return) and logs previous vs new weights and quantities to `inventoryTransactions`.
  - Archival: Disables items that have been depleted or sold while keeping historical links intact.

---

### 2.3 Used Gold & Silver Purchases Module
- **Dual Tab Ledger**:
  - Tab 1: Used Gold Purchases.
  - Tab 2: Used Silver Purchases.
  - Summary metrics per tab: Total transactions, total acquired net grams, total payout ₹.
- **Purchase Recording Form**:
  - Auto-generated voucher number (`UMP-YYYY-XXXX`).
  - Seller details: Full name, phone number, address.
  - Purity, gross weight, and stone/wax deduction weight.
  - Metal rate applied per gram (₹/g).
  - Auto-calculated baseline:
    $$\text{Calculated Value} = \text{Net Weight} \times \text{Rate per Gram}$$
  - Agreed purchase cost (with mandatory reason if different from formula).
  - Payout details: Amount paid, remaining balance, payment method (Cash, Bank Transfer, UPI).
  - Automatic status assignment: `paid`, `partially_paid`, or `pending`.
- **Conversion to Showroom Stock**:
  - One-click workflow from purchase row.
  - Verifies whether item has already been converted (rejects duplicates).
  - Allows operator to enter post-melting / tested refined weight and selected purity.
  - Maps to target Gold or Silver showroom category.
  - Generates new `inventoryItems` record linked by `sourceUsedPurchaseId` and writes `inventoryTransactions` entry.

---

### 2.4 Gold Finance & Native Mortgage Calculator
- **Identical Implementation of Siddheshwar Mortgage Engine**:
  - Matches `https://siddheshwar-jewelers-mortgage.vercel.app` byte-for-byte.
  - Exact calendar-month addition (`N(date, months)`), leap year handling, and end-of-month day clamping.
  - Exact completed calendar months and remainder day counting.
  - Exact remainder day charging tiers:
    - 0 calendar months completed: Always charged **1 full month** minimum.
    - Else:
      - 0 to 5 days remainder: $+0.0$ months (rounded down).
      - 6 to 15 days remainder: $+0.5$ months (half month charged).
      - 16+ days remainder: $+1.0$ month (full month charged).
  - **Interest Modes**:
    - `simple`: Charged strictly on original principal across chargeable months.
    - `yearly_compound`: 12-month compounding blocks where accrued interest capitalizes into principal at each 12-month anniversary.
  - **Standard Rates**: 2.0% / month, 2.5% / month, 3.0% / month, and customizable rate.
- **Pledged Items Strict Isolation**:
  - Recorded inside loan document: Ornament description, purity, gross weight, net weight, pouch/box receipt reference.
  - Completely barred from showroom stock queries and inventory aggregation.
- **Payment Processing**:
  - Payment split: Principal portion vs Interest portion.
  - Real-time recalculation of remaining outstanding principal and accrued interest.
  - Generates printable official receipt with Siddheshwar Jewellers header, loan number, customer details, and balances.
- **Client Dues Ledger**:
  - Direct bird's-eye view of all debtors, active principal, accumulated interest, amount paid, and net due.
  - Filter by overdue, active, or closed accounts.
  - Customer statement export (CSV & Print view).
