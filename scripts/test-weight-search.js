/**
 * SIDHESHWAR JEWELLERS ERP — WEIGHT-WISE JEWELLERY INVENTORY SEARCH TESTS
 */
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sidheshwar_jewellers";

async function runWeightSearchTests() {
  console.log("=========================================================");
  console.log("  SIDHESHWAR JEWELLERS — WEIGHT-WISE SEARCH TESTS        ");
  console.log("=========================================================");

  await mongoose.connect(MONGODB_URI);

  const InventoryItem =
    mongoose.models.InventoryItem ||
    mongoose.model("InventoryItem", new mongoose.Schema({}, { strict: false }), "inventoryitems");

  try {
    // Insert 4 items with distinct weights around target 2.500g
    // Item A: 2.500g (Exact)
    // Item B: 2.490g (-10mg)
    // Item C: 2.515g (+15mg)
    // Item D: 2.700g (+200mg)
    const items = await InventoryItem.insertMany([
      {
        metalType: "gold",
        name: "Ring A (Exact)",
        sku: `WT-A-${Date.now()}`,
        purity: "22K",
        quantity: 1,
        grossWeight: 2.5,
        netWeight: 2.5,
        isActive: true,
        status: "in_stock",
      },
      {
        metalType: "gold",
        name: "Ring B (-10mg)",
        sku: `WT-B-${Date.now()}`,
        purity: "22K",
        quantity: 1,
        grossWeight: 2.49,
        netWeight: 2.49,
        isActive: true,
        status: "in_stock",
      },
      {
        metalType: "gold",
        name: "Ring C (+15mg)",
        sku: `WT-C-${Date.now()}`,
        purity: "22K",
        quantity: 1,
        grossWeight: 2.515,
        netWeight: 2.515,
        isActive: true,
        status: "in_stock",
      },
      {
        metalType: "gold",
        name: "Ring D (+200mg)",
        sku: `WT-D-${Date.now()}`,
        purity: "22K",
        quantity: 1,
        grossWeight: 2.7,
        netWeight: 2.7,
        isActive: true,
        status: "in_stock",
      },
    ]);

    const targetWeight = 2.5;

    // Fetch and sort by |netWeight - targetWeight|
    const fetched = await InventoryItem.find({
      _id: { $in: items.map((i) => i._id) },
    });

    const ranked = fetched
      .map((item) => {
        const diff = Number((item.netWeight - targetWeight).toFixed(3));
        const absDiff = Math.abs(diff);
        return {
          sku: item.sku,
          name: item.name,
          netWeight: item.netWeight,
          diff,
          absDiff,
          diffMg: Math.round(diff * 1000),
        };
      })
      .sort((a, b) => a.absDiff - b.absDiff);

    console.log("[TEST 1] Testing Proximity Ranking against Target Weight 2.500g:");
    ranked.forEach((r, idx) => {
      console.log(
        `  Rank #${idx + 1}: ${r.name} (${r.netWeight.toFixed(3)}g) -> Abs Diff: ${r.absDiff.toFixed(3)}g (${r.diffMg >= 0 ? "+" : ""}${r.diffMg}mg)`
      );
    });

    // Verification:
    // Rank 1 must be Ring A (Exact)
    // Rank 2 must be Ring B (-10mg)
    // Rank 3 must be Ring C (+15mg)
    // Rank 4 must be Ring D (+200mg)
    if (ranked[0].name !== "Ring A (Exact)") throw new Error("Rank 1 should be exact match");
    if (ranked[1].name !== "Ring B (-10mg)") throw new Error("Rank 2 should be -10mg");
    if (ranked[2].name !== "Ring C (+15mg)") throw new Error("Rank 3 should be +15mg");
    if (ranked[3].name !== "Ring D (+200mg)") throw new Error("Rank 4 should be +200mg");

    console.log("  ✅ 1a: Proximity sorting strictly verified (|Δw| ascending order).");

    // Test Tolerance filtering: tolerance = 0.050g (±50mg)
    const filtered50mg = ranked.filter((r) => r.absDiff <= 0.05);
    if (filtered50mg.length !== 3) {
      throw new Error(`Expected 3 items within 50mg, got ${filtered50mg.length}`);
    }
    console.log(`  ✅ 2a: Tolerance filter (±50mg) correctly selected top 3 items and excluded +200mg item.`);

    // Cleanup
    await InventoryItem.deleteMany({ _id: { $in: items.map((i) => i._id) } });

    console.log("=========================================================");
    console.log("  ALL WEIGHT-WISE SEARCH TESTS PASSED (100%)             ");
    console.log("=========================================================");
  } finally {
    await mongoose.disconnect();
  }
}

runWeightSearchTests().catch((err) => {
  console.error("Weight search test failed:", err);
  process.exit(1);
});
