# SIDHESHWAR JEWELLERS ERP — BACKUP & RESTORATION GUIDE

This document establishes the data protection, backup procedures, and disaster recovery strategy for **SIDHESHWAR JEWELLERS ERP**.

---

## 1. Automated Snapshot Script (`npm run backup`)

The ERP includes an offline, native Node.js backup script that snapshots every collection in MongoDB into timestamped JSON archives:

```bash
# Execute full database snapshot:
npm run backup
```
Snapshots are written to:
```
backups/backup-YYYY-MM-DDTHH-mm-ss-sssZ/
  ├── users.json
  ├── categories.json
  ├── inventoryitems.json
  ├── inventorytransactions.json
  ├── usedmetalpurchases.json
  ├── customers.json
  ├── financeloans.json
  ├── financepayments.json
  ├── auditlogs.json
  ├── appsettings.json
  ├── metalrates.json
  └── metadata.json
```

---

## 2. MongoDB Atlas Automated Cloud Backups (Recommended for Production)

1. **Continuous Cloud Backups**:
   - In MongoDB Atlas, enable **Continuous Cloud Backups** under cluster settings.
   - Point-in-time recovery (PITR) allows rolling back to any second in the past 7 days.
2. **Snapshot Schedules**:
   - Hourly snapshots retained for 2 days.
   - Daily snapshots retained for 30 days.
   - Monthly snapshots retained for 1 year (for fiscal audit requirements).

---

## 3. Command-Line Backup via `mongodump`

To take a native binary BSON archive dump:
```bash
mongodump --uri="mongodb+srv://<user>:<password>@cluster0.xyz.mongodb.net/sidheshwar_jewellers" --archive="sidheshwar_dump_$(date +%Y%m%d_%H%M%S).gz" --gzip
```

---

## 4. Disaster Recovery & Restoration Procedure

### Restoring from `mongorestore` BSON Archive:
```bash
mongorestore --uri="mongodb+srv://<user>:<password>@cluster0.xyz.mongodb.net/sidheshwar_jewellers" --archive="sidheshwar_dump_YYYYMMDD_HHMMSS.gz" --gzip --drop
```
*(The `--drop` flag replaces existing documents with the restored snapshot).*

### Restoring from JSON Backup Folder:
Run the restoration script:
```bash
node scripts/restore.js backups/backup-2026-11-16T...
```

---

## 5. CSV Ledger Exports
Authorized users can also download raw CSV data at any time from the UI:
- **Inventory Stock**: `/api/export/inventory?metalType=gold` (or `silver`)
- **Used Metal Purchases**: `/api/export/used-metal`
- **Finance Loans**: `/api/export/finance-loans`
- **Finance Payments**: `/api/export/finance-payments`
