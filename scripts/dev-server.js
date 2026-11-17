const { spawn } = require("child_process");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function checkPort27017() {
  try {
    const conn = await mongoose.connect("mongodb://127.0.0.1:27017/sidheshwar_jewellers", {
      serverSelectionTimeoutMS: 1500,
    });
    console.log("Connected to existing MongoDB on 127.0.0.1:27017");
    await seedData(conn);
    return true;
  } catch (err) {
    return false;
  }
}

async function seedData(conn) {
  const db = mongoose.connection.db;

  // 1. Admin
  const usersColl = db.collection("users");
  const admin = await usersColl.findOne({ email: "admin@sidheshwar.com" });
  let adminId;
  if (!admin) {
    const passwordHash = await bcrypt.hash("Admin@Sidheshwar2026", 10);
    const res = await usersColl.insertOne({
      name: "Siddheshwar Owner",
      email: "admin@sidheshwar.com",
      passwordHash,
      role: "admin",
      phone: "+91 98765 43210",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    adminId = res.insertedId;
    console.log("✅ Seeded admin account: admin@sidheshwar.com / Admin@Sidheshwar2026");
  } else {
    adminId = admin._id;
  }

  // 2. Categories
  const categoriesColl = db.collection("categories");
  const goldCats = ["Rings", "Chains", "Bangles", "Necklaces", "Earrings", "Bracelets", "Coins", "Other"];
  const silverCats = ["Anklets", "Silver Chains", "Rings", "Bracelets", "Coins", "Utensils", "Pooja Items", "Other"];

  for (let i = 0; i < goldCats.length; i++) {
    await categoriesColl.updateOne(
      { metalType: "gold", name: goldCats[i] },
      {
        $setOnInsert: {
          metalType: "gold",
          name: goldCats[i],
          displayOrder: i + 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  for (let i = 0; i < silverCats.length; i++) {
    await categoriesColl.updateOne(
      { metalType: "silver", name: silverCats[i] },
      {
        $setOnInsert: {
          metalType: "silver",
          name: silverCats[i],
          displayOrder: i + 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  // 3. Settings & Rates
  const settingsColl = db.collection("appsettings");
  await settingsColl.updateOne(
    {},
    {
      $setOnInsert: {
        shopName: "SIDHESHWAR JEWELLERS",
        phone: "+91 98765 43210",
        email: "contact@sidheshwarjewellers.com",
        address: "Shop No. 12, Sarafa Bazaar, Main Road",
        defaultMonthlyInterestRate: 2.0,
        defaultInterestMode: "yearly_compound",
        timezone: "Asia/Kolkata",
        currency: "INR",
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  const ratesColl = db.collection("metalrates");
  await ratesColl.updateOne(
    {},
    {
      $setOnInsert: {
        gold24kRatePaisePerGram: 795000,
        gold22kRatePaisePerGram: 728500,
        gold18kRatePaisePerGram: 596200,
        silverFineRatePaisePerGram: 9800,
        effectiveDate: new Date(),
        updatedBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  // 4. Initial sample items if empty
  const itemsColl = db.collection("inventoryitems");
  const count = await itemsColl.countDocuments();
  if (count === 0) {
    const ringCat = await categoriesColl.findOne({ metalType: "gold", name: "Rings" });
    const chainCat = await categoriesColl.findOne({ metalType: "gold", name: "Chains" });
    const silverCat = await categoriesColl.findOne({ metalType: "silver", name: "Anklets" });

    if (ringCat) {
      await itemsColl.insertOne({
        metalType: "gold",
        categoryId: ringCat._id,
        name: "22K Floral Diamond Cut Ring",
        sku: "SJ-G-RNG-0001",
        purity: "22K",
        quantity: 5,
        grossWeight: 26.500,
        stoneWeight: 1.200,
        netWeight: 25.300,
        hallmarkUid: "HUID01",
        supplierName: "Zaveri Crafts",
        purchaseDate: new Date(),
        purchaseCostPaise: 18500000,
        sourceType: "direct_purchase",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (chainCat) {
      await itemsColl.insertOne({
        metalType: "gold",
        categoryId: chainCat._id,
        name: "22K Royal Rope Chain",
        sku: "SJ-G-CHN-0001",
        purity: "22K",
        quantity: 3,
        grossWeight: 45.200,
        stoneWeight: 0,
        netWeight: 45.200,
        hallmarkUid: "HUID02",
        supplierName: "Surat Bullion",
        purchaseDate: new Date(),
        purchaseCostPaise: 33000000,
        sourceType: "direct_purchase",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (silverCat) {
      await itemsColl.insertOne({
        metalType: "silver",
        categoryId: silverCat._id,
        name: "925 Traditional Silver Payal Pair",
        sku: "SJ-S-ANK-0001",
        purity: "925",
        quantity: 8,
        grossWeight: 180.000,
        stoneWeight: 5.000,
        netWeight: 175.000,
        supplierName: "Rajkot Silver Hub",
        purchaseDate: new Date(),
        purchaseCostPaise: 1750000,
        sourceType: "direct_purchase",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    console.log("✅ Seeded initial showroom items for Gold & Silver.");
  }
}

async function start() {
  const isRunning = await checkPort27017();

  if (!isRunning) {
    console.log("Starting embedded MongoDB instance on port 27017...");
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: "sidheshwar_jewellers",
      },
    });
    console.log(`Embedded MongoDB listening on: ${mongod.getUri()}`);
    await mongoose.connect("mongodb://127.0.0.1:27017/sidheshwar_jewellers");
    await seedData(mongoose.connection);
  }

  // Start Next.js
  console.log("Starting Next.js server on http://localhost:3000 ...");
  const isProd = process.argv.includes("--prod");
  const nextCmd = isProd ? "start" : "dev";
  const child = spawn("npx", ["next", nextCmd], {
    stdio: "inherit",
    env: {
      ...process.env,
      MONGODB_URI: "mongodb://127.0.0.1:27017/sidheshwar_jewellers",
    },
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

start().catch((err) => {
  console.error("Dev server error:", err);
  process.exit(1);
});
