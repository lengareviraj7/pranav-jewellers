# SIDHESHWAR JEWELLERS ERP — API STRUCTURE SPECIFICATION

## 1. Authentication & Security Architecture
All API endpoints under `/api/*` (except `/api/auth/login`) require a verified session JWT passed via an HTTP-Only secure cookie (`sj_auth_token`). Unauthenticated requests receive `401 Unauthorized`.
All financial requests validate numeric types, ensure non-negative quantities and weights, and handle database interactions through Mongoose.

---

## 2. API Endpoints Map

### 2.1 Authentication (`/api/auth`)
- `POST /api/auth/login`
  - Body: `{ email: string, password: string }`
  - Response: `{ success: true, user: { id, name, email, role } }`
  - Sets HTTP-Only cookie `sj_auth_token`
- `GET /api/auth/me`
  - Response: `{ user: { id, name, email, role } }`
- `POST /api/auth/logout`
  - Clears `sj_auth_token` cookie

---

### 2.2 Live Dashboard (`/api/dashboard`)
- `GET /api/dashboard/stats`
  - Returns real-time aggregate statistics from MongoDB:
    ```json
    {
      "gold": { "totalNetWeight": 1420.550, "totalGrossWeight": 1435.200, "totalPieces": 48, "categoryCount": 6 },
      "silver": { "totalNetWeight": 8500.000, "totalGrossWeight": 8550.000, "totalPieces": 32, "categoryCount": 5 },
      "usedPurchases": { "totalPurchases": 12, "goldWeight": 350.200, "silverWeight": 1200.000, "totalSpentRupees": 2450000 },
      "finance": { "activeClients": 15, "activeLoans": 18, "totalOutstandingPrincipalRupees": 1250000, "totalAccruedInterestRupees": 68500, "totalDueRupees": 1318500, "overdueCount": 2 },
      "recentActivities": [ ... ]
    }
    ```

---

### 2.3 Inventory Management (`/api/inventory`)
- `GET /api/inventory/categories?metalType=gold|silver`
  - Returns dynamic categories with live piece count and weight totals.
- `POST /api/inventory/categories`
  - Body: `{ name: string, metalType: "gold" | "silver", description?: string }`
  - Creates new dynamic category.
- `PATCH /api/inventory/categories/:id`
  - Body: `{ name?: string, isActive?: boolean, displayOrder?: number }`
  - Renames or disables category.
- `GET /api/inventory/items?metalType=gold|silver&categoryId=&search=&purity=&sort=`
  - Returns filtered, sorted inventory items.
- `POST /api/inventory/items`
  - Body: `{ metalType, categoryId, name, sku, purity, quantity, grossWeight, stoneWeight, purchaseCostRupees, supplierName, purchaseDate, hallmarkUid, notes }`
  - Validates weights, creates item, and appends `inventoryTransactions` entry.
- `PATCH /api/inventory/items/:id/adjust`
  - Body: `{ newQuantity, newGrossWeight, newStoneWeight, reason: string }`
  - Updates item weights and records previous vs new values in `inventoryTransactions`.
- `DELETE /api/inventory/items/:id`
  - Soft-deletes / archives item, recording reason.

---

### 2.4 Used Metal Purchases (`/api/used-metal`)
- `GET /api/used-metal?metalType=gold|silver&status=&search=`
  - Returns purchase ledger items.
- `POST /api/used-metal`
  - Body: `{ date, metalType, sellerName, sellerPhone, sellerAddress, itemDescription, purity, grossWeight, deductionsWeight, ratePerGramRupees, finalAgreedCostRupees, amountPaidRupees, paymentMethod, differenceReason, notes }`
  - Auto-computes net weight, calculated value, remaining balance, and saves purchase.
- `POST /api/used-metal/:id/convert`
  - Body: `{ refinedNetWeight, targetCategoryId, purity, notes }`
  - Validates item has not yet been converted.
  - Creates new `inventoryItems` record, marks purchase `isConvertedToInventory = true`, and links records.

---

### 2.5 Gold Finance & Mortgage (`/api/finance`)
- `GET /api/finance/customers?search=`
  - Returns customer list with summary loan balances.
- `POST /api/finance/customers`
  - Body: `{ fullName, mobileNumber, secondaryPhone, address, identificationType, identificationNumber, notes }`
  - Creates customer profile.
- `GET /api/finance/customers/:id`
  - Returns detailed profile, active loans, closed loans, and full payment ledger.
- `GET /api/finance/loans?status=&customerId=&search=`
  - Returns loan list with live interest calculations.
- `POST /api/finance/loans`
  - Body: `{ customerId, mortgageDate, principalRupees, monthlyRate, interestMode, dueDate, pledgedItems: [...], notes }`
  - Creates new gold loan. Pledged items are stored inside loan and kept separate from showroom inventory.
- `POST /api/finance/calculate`
  - Body: `{ mortgageDate, principalRupees, asOfDate, monthlyRate, interestMode }`
  - Runs the verified Siddheshwar Mortgage Engine v2 and returns calculation breakdown without altering database.
- `POST /api/finance/payments`
  - Body: `{ loanId, paymentDate, totalAmountRupees, principalAppliedRupees, interestAppliedRupees, paymentMethod, referenceTransactionId, notes }`
  - Validates principal + interest == total amount.
  - Updates loan outstanding balances, generates receipt number, and saves permanent payment record.
- `GET /api/finance/dues`
  - Returns list of all customer accounts with outstanding dues, days elapsed, and payment totals.

---

### 2.6 Data Export & Audit Logs (`/api/export` & `/api/audit`)
- `GET /api/export/inventory?metalType=gold|silver` -> CSV Stream
- `GET /api/export/used-metal?metalType=gold|silver` -> CSV Stream
- `GET /api/export/finance-loans` -> CSV Stream
- `GET /api/export/finance-payments` -> CSV Stream
- `GET /api/audit/logs?limit=50` -> Returns system audit trail
