const mongoose = require("mongoose");
const dns = require("dns");
const bcrypt = require("bcryptjs");

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (_) {}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sidheshwar_jewellers";

async function runSeed() {
  console.log("Connecting to MongoDB for database seeding...");
  let conn;
  try {
    conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2500,
    });
  } catch (err) {
    console.warn("Direct connection failed, using MongoMemoryServer...");
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    conn = await mongoose.connect(mongod.getUri());
  }

  console.log("Connected to MongoDB successfully.");

  const db = mongoose.connection.db;

  // 1. Seed Admin User
  const usersColl = db.collection("users");
  const existingAdmin = await usersColl.findOne({ email: "admin@sidheshwar.com" });
  let adminId;

  if (!existingAdmin) {
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
    console.log("✅ Seeded initial admin account: admin@sidheshwar.com / Admin@Sidheshwar2026");
  } else {
    adminId = existingAdmin._id;
    console.log("ℹ️ Admin account already exists.");
  }

  // 2. Seed Default Categories for Gold & Silver
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
  console.log("✅ Seeded dynamic Gold and Silver categories.");

  // 3. Seed AppSettings & MetalRates
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
  console.log("✅ Seeded default app settings and daily metal benchmark rates.");

  console.log("Database seed completed successfully!");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
