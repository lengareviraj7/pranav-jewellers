const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sidheshwar_jewellers";

async function runBackup() {
  console.log("Connecting to MongoDB for backup snapshot...");
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
  const db = mongoose.connection.db;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups", `backup-${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const collections = await db.listCollections().toArray();
  console.log(`Found ${collections.length} collections to snapshot.`);

  const metadata = {
    shop: "SIDHESHWAR JEWELLERS",
    timestamp: new Date().toISOString(),
    collections: [],
  };

  for (const collInfo of collections) {
    const collName = collInfo.name;
    const docs = await db.collection(collName).find({}).toArray();
    const filePath = path.join(backupDir, `${collName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf8");
    metadata.collections.push({ name: collName, count: docs.length });
    console.log(`  Exported ${collName}: ${docs.length} documents.`);
  }

  fs.writeFileSync(path.join(backupDir, "metadata.json"), JSON.stringify(metadata, null, 2));
  console.log(`\n✅ Backup successfully generated in: ${backupDir}`);
  process.exit(0);
}

runBackup().catch((err) => {
  console.error("Backup failed:", err.message);
  process.exit(1);
});
