# Mathiyon AI - Final Production Rollback Specification

## 1. Overview
This document specifies the exact, step-by-step procedure to execute a deterministic rollback of the Mathiyon AI platform to the verified stable commit (`1563acc8971411ab94ef38ff155008ce9997d504`) in the event of an operational anomaly during go-live deployment.

---

## 2. Invariants & Safety Rules
1. **Production Traffic**: `mathiyon-slm-v1.2` MUST be pinned to **100%** traffic.
2. **Experimental Isolation**: `mathiyon-slm-v1.3-RC1` MUST remain at **0%** traffic.
3. **Data Safety**: Database rollbacks must not destroy existing user conversation history.

---

## 3. Step-by-Step Rollback Execution

### Step 1: Ingress Lock & Git Revert
```bash
# Fetch latest tags and branches
git fetch origin

# Revert working tree hard to baseline release candidate commit
git reset --hard 1563acc8971411ab94ef38ff155008ce9997d504

# Remove any untracked staging artifacts
git clean -fd
```

### Step 2: Verify Model Registry State
```bash
.\ai-service\.venv\Scripts\python.exe release/validate_final_release.py
```
Expected output:
```
[PASS] Production model pinned to mathiyon-slm-v1.2 (100% traffic)
[PASS] Experimental model pinned to mathiyon-slm-v1.3-RC1 (0% traffic)
[PASS] All final release artifacts intact
```

### Step 3: Restart System Services
```bash
# Restart FastAPI AI Service
cd ai-service
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload

# Restart Express Backend
cd ../server
npm start
```

### Step 4: Execute Post-Rollback Health Check
```bash
curl http://localhost:5000/api/health
curl http://127.0.0.1:8000/health
```
Ensure both services respond with `200 OK`.
