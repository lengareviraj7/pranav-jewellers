# WEIGHT-WISE JEWELLERY SEARCH IMPLEMENTATION REPORT
## Sidheshwar Jewellers ERP — Approximate Weight Proximity Search Architecture

---

## 1. Executive Summary
The Approximate Weight-Wise Jewellery Inventory Search module allows showroom staff to instantly find available jewellery pieces closest to a customer's requested weight. For example, when a customer requests a ring weighing approximately 2.500 grams, the ERP queries sellable inventory and returns available items sorted strictly by proximity to the target weight (e.g. 2.500g exact, 2.490g [-10mg], 2.510g [+10mg], 2.670g [+170mg]).

- **Frontend Route**: `/inventory/weight-search` (also accessible via Sidebar under *Weight Search* with `Nearest` badge).
- **Core Database Entities**: `InventoryItem`, `Category`.
- **Status**: Completed & 100% Verified.

---

## 2. Key Architecture & Features Implemented

### 2.1 Search Controls & Filters
- **Target Weight (Grams)**: Numeric input supporting milligram precision ($0.001\text{g}$, e.g. `2.500`).
- **Weight Basis Selector**:
  - *Net Metal Weight* (Default): Pure metal weight excluding stones and lac.
  - *Gross Weight*: Total scale reading.
- **Configurable Tolerance Ranges**:
  - Exact Match ($0.000\text{g}$)
  - $\pm 50\text{mg}$ ($0.050\text{g}$)
  - $\pm 100\text{mg}$ ($0.100\text{g}$)
  - $\pm 250\text{mg}$ ($0.250\text{g}$)
  - $\pm 500\text{mg}$ ($0.500\text{g}$)
  - $\pm 1.000\text{g}$
  - All Nearby (Unconstrained proximity sort)
- **Metal & Category Filters**:
  - Filter by Gold / Silver / All Metals.
  - Filter by Category (Rings, Chains, Necklaces, etc.).
  - Filter by Purity (24K, 22K, 18K, 999, 925).

### 2.2 Proximity Ranking Algorithm
For each available sellable inventory piece ($\text{isActive} = \text{true} \land \text{quantity} > 0$):
$$\Delta w = w_{\text{item}} - w_{\text{target}}$$
$$\text{Proximity Distance} = |\Delta w| = |w_{\text{item}} - w_{\text{target}}|$$

- **Sorting**: Ascending order of $|\Delta w|$, placing the nearest piece at Rank #1.
- **Milligram Formatting**:
  - $\Delta w = 0 \implies \text{Exact match}$
  - $\Delta w > 0 \implies +\text{X mg}$ (e.g., $+15\text{mg}$)
  - $\Delta w < 0 \implies -\text{X mg}$ (e.g., $-10\text{mg}$)

### 2.3 Direct POS Integration
- Each search result row includes a one-click **"Select for Bill"** action.
- Directly routes into `/sales/billing` to accelerate counter sales.

---

## 3. API Endpoints
| Method | Endpoint | Query Parameters | Description |
|---|---|---|---|
| `GET` | `/api/inventory/search-by-weight` | `targetWeight`, `weightBasis`, `tolerance`, `metalType`, `categoryId`, `purity` | Returns proximity-sorted sellable inventory pieces |

---

## 4. Verification & Automated Test Results
- Automated test script: `scripts/test-weight-search.js`.
- Result: **100% Passed**.
  - Target weight: 2.500g.
  - Items tested: Ring A (2.500g), Ring B (2.490g), Ring C (2.515g), Ring D (2.700g).
  - Proximity order verified: Exact match (#1) -> -10mg (#2) -> +15mg (#3) -> +200mg (#4).
  - Tolerance filter (±50mg) verified: correctly included top 3 and excluded +200mg item.
