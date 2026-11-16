# SIDHESHWAR JEWELLERS ERP — PROJECT ARCHITECTURE

## 1. Executive Summary & System Vision
**SIDHESHWAR JEWELLERS ERP** is a mission-critical, enterprise-grade management application specifically tailored for an Indian retail jewellery business. The platform manages four primary operational domains:
1. **Gold Inventory Management** (Shop-owned manufactured/purchased gold ornaments & bullion)
2. **Silver Inventory Management** (Shop-owned silver articles, utensils, pooja items & ornaments)
3. **Used Gold & Silver Purchase Management** (Customer exchange & scrap purchases with refining and conversion pipelines)
4. **Gold Finance & Mortgage Management** (Secured gold loans, item pledging, compound/simple interest engine, payment tracking, customer ledgers, and statement generation)

The software is engineered with **Next.js (App Router) + TypeScript**, **Tailwind CSS**, **Lucide Icons**, **MongoDB Atlas**, and **Mongoose**. All financial and weight calculations are guaranteed for zero floating-point drift using paise-level integers and high-precision decimal representations.

---

## 2. High-Level System Architecture Diagram

```
+---------------------------------------------------------------------------------------+
|                                CLIENT LAYER (Browsers)                                |
|  - Next.js Responsive UI (Tailwind CSS, Cinzel Serif Headings, Inter Sans-Serif Body) |
|  - Real-time IST (Asia/Kolkata) Clock & Financial Dashboards                           |
|  - Dynamic Categories, Filterable Ledgers & Modal Drawers                             |
|  - Integrated Gold Mortgage Calculator (Direct Account Sync)                          |
+-------------------------------------------+-------------------------------------------+
                                            | HTTPS / JSON API
                                            v
+---------------------------------------------------------------------------------------+
|                           NEXT.JS APPLICATION SERVER & API                            |
|  +---------------------------------------------------------------------------------+  |
|  | Server-side Authentication & Session Middleware (HTTP-only JWT cookies)         |  |
|  +---------------------------------------------------------------------------------+  |
|  | Route Handlers (/api/*) & Server Actions:                                       |  |
|  |   - /api/auth/*          (Login, session check, logout)                         |  |
|  |   - /api/dashboard/*     (Real-time aggregated metrics & recent activities)     |  |
|  |   - /api/inventory/*     (Gold & Silver items, category management, adjustments)|  |
|  |   - /api/used-metal/*    (Used metal purchases, scrap ledger, convert-to-stock) |  |
|  |   - /api/finance/*       (Loans, customers, mortgage calculation, payments)     |  |
|  |   - /api/export/*        (CSV reports & data export utilities)                  |  |
|  |   - /api/settings/*      (Metal live rates, shop profile, audit logs)           |  |
|  +---------------------------------------------------------------------------------+  |
|  | Core Domain Logic Engines:                                                      |  |
|  |   - Siddheshwar Mortgage Engine v2 (Calendar-month day-count, rest compounding) |  |
|  |   - Inventory Ledger Engine (Double-entry stock movement & audit logging)       |  |
|  |   - Used Metal Conversion Engine (Refining loss, purity conversion & linking)   |  |
+-------------------------------------------+-------------------------------------------+
                                            | Mongoose ODM (Connection Pooling)
                                            v
+---------------------------------------------------------------------------------------+
|                               MONGODB ATLAS DATA LAYER                                |
|  Collections:                                                                         |
|  - users                     - categories             - inventoryItems                |
|  - inventoryTransactions     - usedMetalPurchases     - customers                     |
|  - financeLoans              - financePayments        - metalRates                    |
|  - auditLogs                 - appSettings                                            |
+---------------------------------------------------------------------------------------+
```

---

## 3. Technology Stack Breakdown

| Layer | Technology | Rationale & Selection Criteria |
| :--- | :--- | :--- |
| **Framework** | Next.js 14+ (App Router) with TypeScript | Full-stack server-side rendering, secure server route handlers, zero bundle leaks for database credentials, native Vercel deployment. |
| **Styling & UI** | Tailwind CSS + Custom Design System | Handcrafted luxury jewellery aesthetic with CSS custom properties matching brand guidelines: Deep Forest Green (`#183A35`), Charcoal (`#252522`), Champagne Gold (`#C5A46D`), Warm Ivory (`#F7F5F0`), Soft Beige (`#E8E1D5`). |
| **Typography** | Cormorant Garamond / Playfair Serif + Inter | Traditional luxury royal feel for headings, combined with ultra-legible tabular digits and clean UI sans-serif for numbers, weights, and tables. |
| **Database** | MongoDB Atlas & Mongoose ODM | Flexible schema for custom purity, stone deductions, and dynamic item attributes; robust indexing, compound keys, and atomic operations. |
| **Precision Math** | Integer Paise Math & High-Precision Grams | Prevents JavaScript floating-point errors (`0.1 + 0.2 !== 0.3`). Currencies stored in paise (`1 INR = 100 paise`), weights stored to 3 decimal places (milligrams). |
| **Authentication** | JWT stored in HTTP-Only, SameSite Cookies | Stateless, secure session verification on all API routes; server-side password hashing via bcryptjs with salt rounds. |
| **Icons & Assets** | Lucide React | Modern, clean, lightweight stroke icons matching luxury minimalism. |

---

## 4. Key Architectural Boundaries & Isolation Rules

1. **Separation of Pledged Gold vs Shop Inventory**:
   - Customer-pledged ornaments belonging to active finance loans are stored strictly inside the `financeLoans.pledgedItems` array within the finance domain.
   - Pledged gold is **never** inserted into `inventoryItems` and cannot be sold, melted, or counted in shop stock.
2. **Used Metal Isolation & Explicit Conversion**:
   - Used gold and silver purchased from customers/dealers exist in `usedMetalPurchases`.
   - Scrap items do **not** increase available showroom inventory until an authorized user invokes the **"Convert to Inventory"** workflow, recording post-refining purity, net weight, destination category, and linking the original purchase ID.
3. **Immutable Inventory Transactions**:
   - Stock quantities and weights are never silently overwritten in `inventoryItems`.
   - Any addition, sale, manual adjustment, or scrap conversion must create an immutable `inventoryTransactions` document recording `previousQuantity`, `newQuantity`, `previousNetWeight`, `newNetWeight`, `reason`, `userId`, and `timestamp`.
4. **Traceable Finance Payments & Re-amortization**:
   - Each payment document in `financePayments` records allocations toward principal and interest.
   - Payments are immutable; reversals or corrections create counter-entries with reason codes.
   - Interest calculations use the verified `v2-siddheshwar-yearly-compound` and `v2-siddheshwar-simple` formulas calibrated against the reference application.

---

## 5. Security & Deployment Model
- **Vercel Serverless Ready**: Efficient Mongoose connection caching (`global.mongoose`) preventing connection exhaustion in serverless runtimes.
- **Environment Isolation**: `.env.local` for development secrets; all database URIs and JWT secrets restricted to server context.
- **Input Validation**: Server-side payload validation for weights, rates, dates, and amounts.
