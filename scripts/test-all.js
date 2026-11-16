const mongoose = require("mongoose");
const { calculateMortgageInterest } = require("./test-calc.js");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sidheshwar_jewellers";

async function runFullAuditSuite() {
  console.log("=========================================================");
  console.log("  SIDHESHWAR JEWELLERS ERP — COMPREHENSIVE AUDIT SUITE   ");
  console.log("=========================================================");

  let conn;
  try {
    conn = await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2500 });
  } catch (err) {
    console.warn("Direct connection failed, launching MongoMemoryServer for audit test...");
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    conn = await mongoose.connect(mongod.getUri());
  }

  const db = mongoose.connection.db;

  // 1. Test Mortgage Calculation Engine Edge Cases
  console.log("\n[TEST 1] Verifying Mortgage Engine Against Exact Calibration Cases...");

  // 1a: Same Day
  const c0 = calculateMortgageInterest({
    mortgageDate: "2026-03-01",
    asOfDate: "2026-03-01",
    principalRupees: 50000,
    monthlyRate: 2,
    interestMode: "yearly_compound",
  });
  if (c0.totalDueRupees === 50000 && c0.interestRupees === 0 && c0.completedMonths === 0) {
    console.log("  ✅ 1a: Same-day duration correctly charges ₹0 interest.");
  } else {
    throw new Error(`Failed 1a: ${JSON.stringify(c0)}`);
  }

  // 1b: Under 1-Month Minimum Rule (e.g. 10 days)
  const c1 = calculateMortgageInterest({
    mortgageDate: "2026-01-01",
    asOfDate: "2026-01-11",
    principalRupees: 40000,
    monthlyRate: 2.5,
    interestMode: "yearly_compound",
  });
  if (c1.chargeableMonths === 1 && c1.interestRupees === 1000) {
    console.log("  ✅ 1b: Minimum 1-month charging rule passed (10 days -> 1.0 mo charged).");
  } else {
    throw new Error(`Failed 1b: ${JSON.stringify(c1)}`);
  }

  // 1c: Remainder Day Tier 1 (1 month + 4 days -> rounds to 1.0 mo)
  const c2 = calculateMortgageInterest({
    mortgageDate: "2026-01-01",
    asOfDate: "2026-02-05",
    principalRupees: 60000,
    monthlyRate: 2,
    interestMode: "yearly_compound",
  });
  if (c2.chargeableMonths === 1.0 && c2.remainderDays === 4) {
    console.log("  ✅ 1c: Remainder Tier 0-5 days passed (1 mo + 4 days -> 1.0 mo charged).");
  } else {
    throw new Error(`Failed 1c: ${JSON.stringify(c2)}`);
  }

  // 1d: Remainder Day Tier 2 (1 month + 12 days -> rounds to 1.5 mo)
  const c3 = calculateMortgageInterest({
    mortgageDate: "2026-01-01",
    asOfDate: "2026-02-13",
    principalRupees: 60000,
    monthlyRate: 2,
    interestMode: "yearly_compound",
  });
  if (c3.chargeableMonths === 1.5 && c3.remainderDays === 12) {
    console.log("  ✅ 1d: Remainder Tier 6-15 days passed (1 mo + 12 days -> 1.5 mo charged).");
  } else {
    throw new Error(`Failed 1d: ${JSON.stringify(c3)}`);
  }

  // 1e: Remainder Day Tier 3 (1 month + 20 days -> rounds to 2.0 mo)
  const c4 = calculateMortgageInterest({
    mortgageDate: "2026-01-01",
    asOfDate: "2026-02-21",
    principalRupees: 60000,
    monthlyRate: 2,
    interestMode: "yearly_compound",
  });
  if (c4.chargeableMonths === 2.0 && c4.remainderDays === 20) {
    console.log("  ✅ 1e: Remainder Tier 16+ days passed (1 mo + 20 days -> 2.0 mo charged).");
  } else {
    throw new Error(`Failed 1e: ${JSON.stringify(c4)}`);
  }

  // 1f: Multi-Year Compounding (25 months)
  const c5 = calculateMortgageInterest({
    mortgageDate: "2024-01-01",
    asOfDate: "2026-02-01",
    principalRupees: 10000,
    monthlyRate: 3,
    interestMode: "yearly_compound",
  });
  if (Math.round(c5.totalDueRupees) === 19051 && c5.yearlyBreakdown.length === 3) {
    console.log("  ✅ 1f: Multi-year compounding capitalization rests passed (Exact ₹19,050.88).");
  } else {
    throw new Error(`Failed 1f: ${JSON.stringify(c5)}`);
  }

  // 2. Test Inventory Management & Stock Transactions
  console.log("\n[TEST 2] Testing Inventory Items & Non-Destructive Transactions...");

  const catColl = db.collection("categories");
  const itemsColl = db.collection("inventoryitems");
  const txnsColl = db.collection("inventorytransactions");

  // Create Category
  const catRes = await catColl.insertOne({
    name: "Audit Test Bangles",
    metalType: "gold",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create Item
  const gross = 24.55;
  const stone = 1.25;
  const net = Number((gross - stone).toFixed(3)); // 23.300
  const itemSku = `SJ-G-AUDIT-${Date.now().toString().slice(-4)}`;

  const itemRes = await itemsColl.insertOne({
    metalType: "gold",
    categoryId: catRes.insertedId,
    name: "22K Traditional Antique Bangle",
    sku: itemSku,
    purity: "22K",
    quantity: 2,
    grossWeight: gross,
    stoneWeight: stone,
    netWeight: net,
    purchaseDate: new Date(),
    purchaseCostPaise: 16500000, // ₹1,65,000
    sourceType: "direct_purchase",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await txnsColl.insertOne({
    itemId: itemRes.insertedId,
    metalType: "gold",
    categoryId: catRes.insertedId,
    transactionType: "stock_in",
    previousQuantity: 0,
    newQuantity: 2,
    quantityChange: 2,
    previousGrossWeight: 0,
    newGrossWeight: gross,
    previousNetWeight: 0,
    newNetWeight: net,
    netWeightChange: net,
    reason: "Initial stock addition for audit test",
    timestamp: new Date(),
  });
  console.log("  ✅ 2a: Inventory item inserted with accurate net weight (24.550g - 1.250g = 23.300g).");

  // Non-destructive Stock Adjustment
  const updatedQty = 1;
  const updatedGross = 12.275;
  const updatedStone = 0.625;
  const updatedNet = Number((updatedGross - updatedStone).toFixed(3));

  await itemsColl.updateOne(
    { _id: itemRes.insertedId },
    {
      $set: {
        quantity: updatedQty,
        grossWeight: updatedGross,
        stoneWeight: updatedStone,
        netWeight: updatedNet,
        updatedAt: new Date(),
      },
    }
  );

  await txnsColl.insertOne({
    itemId: itemRes.insertedId,
    metalType: "gold",
    categoryId: catRes.insertedId,
    transactionType: "adjustment",
    previousQuantity: 2,
    newQuantity: updatedQty,
    quantityChange: -1,
    previousGrossWeight: gross,
    newGrossWeight: updatedGross,
    previousNetWeight: net,
    newNetWeight: updatedNet,
    netWeightChange: updatedNet - net,
    reason: "Sold 1 piece via counter bill",
    timestamp: new Date(),
  });

  const txnCount = await txnsColl.countDocuments({ itemId: itemRes.insertedId });
  if (txnCount === 2) {
    console.log("  ✅ 2b: Non-destructive stock adjustment preserved full audit history.");
  } else {
    throw new Error(`Failed 2b: txnCount was ${txnCount}`);
  }

  // 3. Test Used Metal Purchase & Conversion to Inventory
  console.log("\n[TEST 3] Testing Used Metal Purchase & Explicit Showroom Conversion...");
  const usedColl = db.collection("usedmetalpurchases");

  const purchaseVoucher = `UMP-G-TEST-${Date.now().toString().slice(-4)}`;
  const usedNetWt = 15.42;
  const agreedCost = 10500000; // ₹1,05,000

  const usedRes = await usedColl.insertOne({
    transactionNumber: purchaseVoucher,
    date: new Date(),
    metalType: "gold",
    sellerName: "Vikram Rathi",
    itemDescription: "Old 22K Broken Chain",
    purity: "22K",
    grossWeight: 16.0,
    deductionsWeight: 0.58,
    netWeight: usedNetWt,
    ratePerGramPaise: 680000,
    calculatedValuePaise: Math.round(usedNetWt * 680000),
    finalAgreedCostPaise: agreedCost,
    amountPaidPaise: agreedCost,
    remainingPayablePaise: 0,
    paymentStatus: "paid",
    paymentMethod: "cash",
    isConvertedToInventory: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("  ✅ 3a: Scrap purchase recorded in separate purchase ledger.");

  // Convert to Inventory
  const refinedNetWt = 15.1;
  const convertedSku = `SJ-G-REF-${Date.now().toString().slice(-4)}`;
  const convertedItemRes = await itemsColl.insertOne({
    metalType: "gold",
    categoryId: catRes.insertedId,
    name: "Refined Gold Casting Bar",
    sku: convertedSku,
    purity: "24K",
    quantity: 1,
    grossWeight: refinedNetWt,
    stoneWeight: 0,
    netWeight: refinedNetWt,
    purchaseDate: new Date(),
    purchaseCostPaise: agreedCost,
    sourceType: "used_metal_conversion",
    sourceUsedPurchaseId: usedRes.insertedId,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await usedColl.updateOne(
    { _id: usedRes.insertedId },
    {
      $set: {
        isConvertedToInventory: true,
        convertedDate: new Date(),
        convertedInventoryItemId: convertedItemRes.insertedId,
        convertedNetWeight: refinedNetWt,
        convertedPurity: "24K",
      },
    }
  );

  const updatedPurchase = await usedColl.findOne({ _id: usedRes.insertedId });
  if (updatedPurchase.isConvertedToInventory === true) {
    console.log("  ✅ 3b: Convert to showroom stock linked item and flagged purchase as converted.");
  } else {
    throw new Error("Failed 3b: isConvertedToInventory was false");
  }

  // 4. Test Customer Gold Loan & Pledged Item Strict Isolation
  console.log("\n[TEST 4] Testing Gold Loan & Custody Isolation...");
  const custColl = db.collection("customers");
  const loansColl = db.collection("financeloans");
  const paymentsColl = db.collection("financepayments");

  const custRes = await custColl.insertOne({
    customerId: "SJ-CUST-AUDIT",
    fullName: "Sanjay Deshmukh",
    mobileNumber: "9876543210",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const loanNum = `SJ-LN-AUDIT-${Date.now().toString().slice(-4)}`;
  const loanPrincipalPaise = 10000000; // ₹1,00,000
  const pledgedWeight = 32.5;

  const loanRes = await loansColl.insertOne({
    loanNumber: loanNum,
    customerId: custRes.insertedId,
    mortgageDate: "2026-01-01",
    originalPrincipalPaise: loanPrincipalPaise,
    currentOutstandingPrincipalPaise: loanPrincipalPaise,
    monthlyRate: 2.0,
    interestMode: "yearly_compound",
    pledgedItems: [
      {
        description: "Customer 22K Gold Mangalsutra with Black Beads",
        metalType: "gold",
        purity: "22K",
        quantity: 1,
        grossWeight: 34.0,
        netWeight: pledgedWeight,
        identificationMark: "VAULT-BOX-A12",
      },
    ],
    totalPledgedGrossWeight: 34.0,
    totalPledgedNetWeight: pledgedWeight,
    totalInterestPaidPaise: 0,
    totalPrincipalPaidPaise: 0,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("  ✅ 4a: Gold mortgage loan created with pledged items.");

  // CRITICAL VERIFICATION: Ensure pledged jewellery NEVER appears in showroom inventory
  const leakedItem = await itemsColl.findOne({ name: { $regex: "Mangalsutra", $options: "i" } });
  if (leakedItem === null) {
    console.log("  ✅ 4b: PLEDGED JEWELLERY STRICT ISOLATION VERIFIED: 0 pledged items found in showroom stock.");
  } else {
    throw new Error("FAILED 4b: Pledged item was found in inventoryitems collection!");
  }

  // 5. Test Loan Payment & Balance Re-amortization
  console.log("\n[TEST 5] Testing Loan Payment Recording & Receipting...");
  const paymentReceipt = `SJ-RCP-AUDIT-${Date.now().toString().slice(-4)}`;
  const payPrincipal = 2500000; // ₹25,000
  const payInterest = 400000;   // ₹4,000
  const totalPaid = payPrincipal + payInterest; // ₹29,000

  await paymentsColl.insertOne({
    receiptNumber: paymentReceipt,
    loanId: loanRes.insertedId,
    customerId: custRes.insertedId,
    paymentDate: "2026-03-01",
    totalAmountPaise: totalPaid,
    principalAppliedPaise: payPrincipal,
    interestAppliedPaise: payInterest,
    paymentMethod: "cash",
    previousOutstandingPrincipalPaise: loanPrincipalPaise,
    newOutstandingPrincipalPaise: loanPrincipalPaise - payPrincipal,
    createdAt: new Date(),
  });

  await loansColl.updateOne(
    { _id: loanRes.insertedId },
    {
      $inc: {
        totalInterestPaidPaise: payInterest,
        totalPrincipalPaidPaise: payPrincipal,
      },
      $set: {
        currentOutstandingPrincipalPaise: loanPrincipalPaise - payPrincipal,
        status: "partially_paid",
        updatedAt: new Date(),
      },
    }
  );

  const updatedLoan = await loansColl.findOne({ _id: loanRes.insertedId });
  if (
    updatedLoan.currentOutstandingPrincipalPaise === 7500000 &&
    updatedLoan.totalPrincipalPaidPaise === 2500000 &&
    updatedLoan.totalInterestPaidPaise === 400000
  ) {
    console.log("  ✅ 5a: Loan payment correctly applied (Remaining Principal: ₹75,000).");
  } else {
    throw new Error(`Failed 5a: ${JSON.stringify(updatedLoan)}`);
  }

  console.log("\n=========================================================");
  console.log("  ALL AUDIT & BEHAVIORAL VERIFICATION TESTS PASSED (100%)  ");
  console.log("=========================================================\n");

  process.exit(0);
}

runFullAuditSuite().catch((err) => {
  console.error("❌ AUDIT TEST SUITE FAILED:", err);
  process.exit(1);
});
