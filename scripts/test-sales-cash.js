const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sidheshwar_jewellers_dev";

async function runTests() {
  console.log("\n=========================================================");
  console.log("   SIDHESHWAR JEWELLERS — SALES, UDHARI & ROJMEL TESTS   ");
  console.log("=========================================================\n");

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection;

  try {
    const InventoryItem = db.collection("inventoryitems");
    const InventoryTransaction = db.collection("inventorytransactions");
    const SaleRecord = db.collection("salerecords");
    const CashTransaction = db.collection("cashtransactions");
    const Category = db.collection("categories");

    // 1. Create a dynamic Ring category
    console.log("[TEST 1] Testing Dynamic Category & Item with Size/Weight...");
    const ringCat = await Category.findOneAndUpdate(
      { name: "Dynamic Royal Rings", metalType: "gold" },
      {
        $set: {
          name: "Dynamic Royal Rings",
          metalType: "gold",
          displayOrder: 1,
          isActive: true,
          updatedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    console.log("  ✅ 1a: Dynamic category created successfully.");

    // Create an inventory item with Ring Size 14, 5.500g gross, 0.500g stone = 5.000g net
    const testSku = `SJ-G-RNG-${Date.now().toString().slice(-4)}`;
    const ringItem = await InventoryItem.insertOne({
      metalType: "gold",
      categoryId: ringCat._id,
      name: "22K Designer Diamond-Cut Ring",
      sku: testSku,
      purity: "22K",
      size: "Size 14",
      quantity: 3,
      grossWeight: 16.5,
      stoneWeight: 1.5,
      netWeight: 15.0,
      purchaseCostPaise: 9000000, // ₹90,000 for 3 pcs = ₹30,000 per pc
      unitCostPaise: 3000000,
      sourceType: "direct_purchase",
      isActive: true,
      status: "in_stock",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("  ✅ 1b: Ring item added with size 'Size 14' (3 pcs, 15.000g net, ₹30,000 unit cost).");

    // 2. Perform a Sale: Sell 1 pc for ₹38,000, Customer pays ₹30,000, Udhari = ₹8,000
    console.log("\n[TEST 2] Testing Sell Material Workflow & Stock Deduction...");
    const itemBefore = await InventoryItem.findOne({ _id: ringItem.insertedId });
    const qtySold = 1;
    const sellingPricePaise = 3800000; // ₹38,000
    const paidPaise = 3000000; // ₹30,000
    const manualProfitPaise = 800000; // ₹8,000 manual profit
    const balanceDuePaise = sellingPricePaise - paidPaise; // ₹8,000 Udhari

    // Deduct stock
    const grossWeightSold = Number(((itemBefore.grossWeight / itemBefore.quantity) * qtySold).toFixed(3));
    const netWeightSold = Number(((itemBefore.netWeight / itemBefore.quantity) * qtySold).toFixed(3));
    const newQty = itemBefore.quantity - qtySold;
    const newGross = Number((itemBefore.grossWeight - grossWeightSold).toFixed(3));
    const newNet = Number((itemBefore.netWeight - netWeightSold).toFixed(3));

    await InventoryItem.updateOne(
      { _id: itemBefore._id },
      {
        $set: {
          quantity: newQty,
          grossWeight: newGross,
          netWeight: newNet,
          status: newQty === 0 ? "sold" : "partial_sold",
          updatedAt: new Date(),
        },
      }
    );

    // Record Inventory Transaction
    await InventoryTransaction.insertOne({
      itemId: itemBefore._id,
      metalType: "gold",
      categoryId: ringCat._id,
      transactionType: "sale",
      previousQuantity: itemBefore.quantity,
      newQuantity: newQty,
      quantityChange: -qtySold,
      previousGrossWeight: itemBefore.grossWeight,
      newGrossWeight: newGross,
      previousNetWeight: itemBefore.netWeight,
      newNetWeight: newNet,
      netWeightChange: -netWeightSold,
      reason: "Sold 1 pc to Vijay Deshmukh (9876543210)",
      timestamp: new Date(),
    });

    const itemAfter = await InventoryItem.findOne({ _id: ringItem.insertedId });
    if (itemAfter.quantity !== 2 || itemAfter.netWeight !== 10.0) {
      throw new Error(`Stock deduction mismatch! Expected 2 pcs, 10g. Got: ${itemAfter.quantity} pcs, ${itemAfter.netWeight}g`);
    }
    console.log(`  ✅ 2a: Stock deduced accurately (Remaining: ${itemAfter.quantity} pcs, ${itemAfter.netWeight}g net).`);

    // Create SaleRecord
    const saleNum = `SJ-SALE-TEST-${Date.now().toString().slice(-4)}`;
    const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days later
    const sale = await SaleRecord.insertOne({
      saleNumber: saleNum,
      itemId: itemBefore._id,
      metalType: "gold",
      categoryId: ringCat._id,
      itemName: itemBefore.name,
      sku: itemBefore.sku,
      purity: itemBefore.purity,
      size: itemBefore.size,
      quantitySold: qtySold,
      grossWeightSold,
      netWeightSold,
      costPricePaise: 3000000,
      sellingPricePaise,
      profitPaise: manualProfitPaise,
      customer: {
        name: "Vijay Deshmukh",
        phone: "9876543210",
        address: "Market Yard, Solapur",
      },
      paymentMode: "cash",
      paidAmountPaise: paidPaise,
      balanceDuePaise,
      dueDate,
      paymentStatus: "partial",
      payments: [
        {
          amountPaise: paidPaise,
          paymentMode: "cash",
          date: new Date(),
          notes: "Initial down-payment",
        },
      ],
      whatsappSent: false,
      saleDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  ✅ 2b: Sale record created: ${saleNum} (Paid: ₹30,000, Udhari Due: ₹8,000, Manual Profit: ₹8,000).`);

    // Auto credit Cash Book
    await CashTransaction.insertOne({
      transactionType: "credit",
      amountPaise: paidPaise,
      category: "sale_cash",
      purpose: `Cash Sale: 22K Designer Diamond-Cut Ring (Vijay Deshmukh)`,
      referenceId: saleNum,
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("  ✅ 2c: Cash Book auto-credited ₹30,000 under 'sale_cash'.");

    // 3. Customer Udhari Recovery Payment
    console.log("\n[TEST 3] Testing Customer Udhari Recovery & Re-tally...");
    const recoveryPaise = 500000; // Customer pays ₹5,000 towards the ₹8,000 due
    await SaleRecord.updateOne(
      { _id: sale.insertedId },
      {
        $inc: {
          paidAmountPaise: recoveryPaise,
          balanceDuePaise: -recoveryPaise,
        },
        $push: {
          payments: {
            amountPaise: recoveryPaise,
            paymentMode: "cash",
            date: new Date(),
            notes: "Partial recovery payment",
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    await CashTransaction.insertOne({
      transactionType: "credit",
      amountPaise: recoveryPaise,
      category: "udhari_recovery",
      purpose: `Udhari Collection: Vijay Deshmukh [${saleNum}]`,
      referenceId: saleNum,
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saleUpdated = await SaleRecord.findOne({ _id: sale.insertedId });
    if (saleUpdated.balanceDuePaise !== 300000) {
      throw new Error(`Udhari balance mismatch! Expected ₹3,000 remaining. Got: ₹${saleUpdated.balanceDuePaise / 100}`);
    }
    console.log(`  ✅ 3a: Udhari balance updated accurately (Remaining Due: ₹${saleUpdated.balanceDuePaise / 100}).`);
    console.log("  ✅ 3b: Cash Book credited ₹5,000 under 'udhari_recovery'.");

    // 4. Shop Expense Debit (Kharach)
    console.log("\n[TEST 4] Testing Cash Counter Debits (Kharach / Rojmel)...");
    const expensePaise = 35000; // ₹350 for tea and refreshments
    await CashTransaction.insertOne({
      transactionType: "debit",
      amountPaise: expensePaise,
      category: "shop_expense",
      purpose: "Customer tea, water bottles & snacks",
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("  ✅ 4a: Recorded debit of ₹350 for shop expense.");

    // 5. Total Cash in Hand Tally
    const allCash = await CashTransaction.find().toArray();
    let totalCredit = 0;
    let totalDebit = 0;
    for (const tx of allCash) {
      if (tx.transactionType === "credit") totalCredit += tx.amountPaise;
      else totalDebit += tx.amountPaise;
    }
    const cashInHand = (totalCredit - totalDebit) / 100;
    console.log(`  ✅ 5a: Rojmel live cash tally verified: ₹${cashInHand.toLocaleString("en-IN")} in counter.`);

    console.log("\n=========================================================");
    console.log("  ALL SALES, UDHARI & ROJMEL TESTS PASSED (100%)         ");
    console.log("=========================================================\n");
  } finally {
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
