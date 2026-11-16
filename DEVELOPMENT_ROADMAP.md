# SIDHESHWAR JEWELLERS ERP — DEVELOPMENT ROADMAP

## Phase Breakdown

### Phase 1: Project Architecture & Planning (Complete)
- [x] Analyze tech stack, domain boundaries, and business rules.
- [x] Reverse-engineer and verify the exact Siddheshwar Jewellers mortgage calculation algorithm from `https://siddheshwar-jewelers-mortgage.vercel.app`.
- [x] Create comprehensive architecture, schema, API, workflows, and feature breakdown documents.
- [x] Establish high-precision paise integer standard and milligram weight precision.

---

### Phase 2: Application Shell, Auth & Live Dashboard
- [ ] Initialize Next.js project with TypeScript, Tailwind CSS, Lucide Icons, and custom luxury palette (Forest Green `#183A35`, Champagne Gold `#C5A46D`, Warm Ivory `#F7F5F0`, Soft Beige `#E8E1D5`).
- [ ] Configure Mongoose database connection with connection pooling and serverless optimization.
- [ ] Implement JWT authentication with HTTP-Only cookie, password hashing (`bcryptjs`), and default admin seeder.
- [ ] Build responsive shell layout: Luxury sidebar, top bar with live IST (Asia/Kolkata) clock, store logo, user menu.
- [ ] Build dynamic Dashboard showing real-time aggregations from MongoDB (Gold stock, Silver stock, Categories, Scrap, Active Loans, Dues, Recent activity).
- [ ] Build global Quick Action modals (Add Gold Stock, Add Silver Stock, Record Scrap, Add Client, Record Payment).

---

### Phase 3: Gold & Silver Inventory Modules
- [ ] Dynamic category management (Add, Edit, Rename, Disable, View Stock).
- [ ] Add Stock modal and form with auto-calculated Net Weight (`Gross - Stone`), SKU generation, Purity, HUID, and costs.
- [ ] Inventory table with search, category filtering, purity filtering, and multi-field sorting.
- [ ] Non-destructive stock adjustments: Adjustment modal prompting for mandatory reason, logging previous vs new weights and quantities to `inventoryTransactions`.
- [ ] Item movement history drawer/modal showing full audit trail.
- [ ] Category-wise stock totals cards for both Gold and Silver.

---

### Phase 4: Used Gold & Silver Purchases & Stock Conversion
- [ ] Dual-tab interface (Used Gold / Used Silver) with aggregate KPIs.
- [ ] Scrap purchase entry form with auto-computed net weight, calculated value (`Net Weight * Rate`), agreed payout, and payment status (`paid`, `partially_paid`, `pending`).
- [ ] Scrap purchases ledger table with filters for metal, date, and payment status.
- [ ] **Convert to Inventory Workflow**: Modal to verify post-melting refined weight, assign showroom category and purity, mark purchase as converted, and create corresponding showroom inventory item.

---

### Phase 5: Gold Finance Management & Native Mortgage Calculator
- [ ] Replicate exact Siddheshwar Mortgage Engine v2 with 100% mathematical fidelity.
- [ ] Native interactive Mortgage Calculator page with Simple vs Yearly Compound modes, 2%, 2.5%, 3%, and custom rates, annual breakdown table, and "Calculate Only" vs "Save to Account" actions.
- [ ] Finance Customers directory: Profile view, contact info, ID proof, active loans, closed loans, and payment history.
- [ ] New Loan entry form with strict pledged jewellery separation.
- [ ] Payment recording modal with principal vs interest allocation, balance re-amortization, and printable official receipt.
- [ ] Dedicated Outstanding Dues view with customer-wise balance summaries.
- [ ] Finance audit trail logging all loan modifications and payments.

---

### Phase 6: Final Verification, Export, Backup & Deployment
- [ ] Complete automated test suite covering inventory weights, scrap conversions, mortgage calculations against reference test cases, and payment re-amortization.
- [ ] CSV Export endpoints for Inventory, Scrap Purchases, Finance Loans, and Payments.
- [ ] Database backup & restore script and instructions.
- [ ] Production build (`npm run build`) verification and deployment readiness.

---

## Analysis of Business Rules & Configurable Options
1. **Mortgage Remainder Day Tiers**: Verified from the reference app code:
   - 0 completed months: 1.0 month charged minimum.
   - 1+ completed months:
     - 0–5 days: $+0.0$ months
     - 6–15 days: $+0.5$ months
     - 16+ days: $+1.0$ month
2. **Pledged Gold vs Shop Stock**: Strictly kept in `financeLoans.pledgedItems` and excluded from showroom inventory aggregations.
3. **Scrap Conversion**: Unrefined scrap is not counted in showroom stock until explicitly converted by an authorized user.
4. **Timezone**: Strictly `Asia/Kolkata` (IST) across all date displays, live clocks, and date parsing.
