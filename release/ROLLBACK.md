# Mathiyon AI - Production Rollback Procedure

## Overview
This document specifies the exact, step-by-step procedure to roll back the Mathiyon AI platform to the frozen `1.2.0-rc.12.7` production baseline or previous stable release in the event of an operational anomaly.

---

## Rollback Principles
1. **Model Isolation**: Production traffic MUST be pinned to `mathiyon-slm-v1.2` (**100%**). Experimental `mathiyon-slm-v1.3-RC1` MUST remain at **0%**.
2. **Zero Data Corruption**: Database schema rollback should not destroy user message or conversation history.
3. **No Unsafe State**: Server configuration must revert back to verified environment variables and frozen code commits.

---

## Step-by-Step Execution Plan

### Step 1: Revert Git Repository to Baseline Commit
If unverified code changes or experimental commits were introduced:
```bash
# Fetch recent tags and commit history
git fetch origin

# Hard reset working tree to verified RC commit
git reset --hard 5e05a7151bca0e25c00253a4b93eb11598d4831a

# Clean untracked files
git clean -fd
```

### Step 2: Verify Production Routing Settings
Inspect `server/services/aiOrchestrator.js` and `ai-service/app.py`:
- Ensure `POST /generate` targets `mathiyon-slm-v1.2`.
- Ensure `POST /generate/v1.3` remains disabled for production endpoints.
- Confirm `DEFAULT_MODEL = "mathiyon-slm-v1.2"`.

### Step 3: Restart System Services
```bash
# 1. Restart Python FastAPI AI Service
cd ai-service
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload

# 2. Restart Node.js Express API Server
cd ../server
npm start
```

### Step 4: Validate Service Health
Execute the validation script:
```bash
.\ai-service\.venv\Scripts\python.exe release/validate_release.py
```
Expected output:
```
[PASS] Release artifacts present
[PASS] Production model pinned to mathiyon-slm-v1.2 (100% traffic)
[PASS] Experimental model pinned to mathiyon-slm-v1.3-RC1 (0% traffic)
[PASS] System Health Verified (FastAPI & Express Online)
```

---

## Contact & Escalation
If automated rollback fails to restore normal operation:
1. Lock external API ingress at load balancer level.
2. Inspect log files for unhandled MongoDB or PyTorch runtime exceptions.
3. Notify Platform Reliability Engineer on duty.
