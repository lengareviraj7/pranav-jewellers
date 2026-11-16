const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sidheshwar_jewellers";

async function runRestore() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error("Usage: node scripts/restore.js <path-to-backup-folder>");
    process.exit(1);
  }

  const resolvedDir = path.resolve(targetDir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`Backup folder "${resolvedDir}" does not exist.`);
    process.exit(1);
  }

  console.log(`Connecting to MongoDB to restore from: ${resolvedDir}`);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
  const db = mongoose.connection.db;

  const files = fs.readdirSync(resolvedDir).filter((f) => f.endsWith(".json") && f !== "metadata.json");

  for (const file of files) {
    const collName = file.replace(".json", "");
    const content = fs.readFileSync(path.join(resolvedDir, file), "utf8");
    const docs = JSON.parse(content);

    if (Array.isArray(docs) && docs.length > 0) {
      console.log(`  Restoring ${docs.length} documents into "${collName}"...`);
      await db.collection(collName).deleteMany({});
      // Convert $oid, $date if present
      const processed = docs.map((doc) => {
        if (doc._id && doc._id.$oid) doc._id = new mongoose.Types.ObjectId(doc._id.$oid);
        return doc;
      });
      await db.collection(collName).insertMany(processed);
    }
  }

  console.log("\n✅ Database restoration completed successfully.");
  process.exit(0);
}

runRestore().catch((err) => {
  console.error("Restoration failed:", err.message);
  process.exit(1);
});
