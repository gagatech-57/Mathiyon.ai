# Mathiyon AI - Database Backup & Recovery Specification

## 1. Overview
This document specifies the operational database backup, restore, and disaster recovery procedures for the Mathiyon AI MongoDB instance.

---

## 2. Backup Architecture & Frequency

| Strategy | Mechanism | Target Collections | Frequency | Retention Period |
| :--- | :--- | :--- | :--- | :--- |
| **Automated Dump** | `mongodump` / Atlas Automated Snapshot | `users`, `conversations`, `messages`, `memories`, `documents`, `documentchunks` | Daily at 02:00 UTC | 30 Days |
| **Point-In-Time (PITR)** | Oplog Continuous Archiving | All database operations | Continuous | 7 Days |

---

## 3. Restore & Disaster Recovery Workflow

### Step 1: Emergency Service Isolation
Temporarily disable external API traffic at ingress to prevent partial writes during restore:
```bash
# Stop Express server instances
pm2 stop mathiyon-backend
```

### Step 2: Database Restoration
Restore from the latest verified snapshot archive:
```bash
# Execute mongorestore from backup directory
mongorestore --drop --gzip --archive=/backups/mathiyon_prod_latest.tar.gz --uri="mongodb://localhost:27017/mathiyon"
```

### Step 3: Index Integrity Verification
Verify that required compound performance indexes are intact:
```javascript
// Connect via mongosh
use mathiyon;
db.conversations.getIndexes();
db.messages.getIndexes();
db.memories.getIndexes();
db.documents.getIndexes();
db.documentchunks.getIndexes();
```

### Step 4: Resume API Operations
```bash
pm2 restart mathiyon-backend
```

---

## 4. Environment Limitations & Status
- **Local Dev/Test Status**: Verified locally via `mongodump`/`mongorestore` CLI mock routines. Live production backup automation is managed by production infrastructure orchestration.
