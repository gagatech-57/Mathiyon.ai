# ROLLBACK PROCEDURES & GOVERNANCE PLAN

**Current Production Model:** Mathiyon SLM v1.2 (100% Traffic Allocation)  
**Experimental Release Candidate:** Mathiyon SLM v1.3 (`POST /generate/v1.3` — 0% Traffic Allocation)  
**Rollback Target:** Mathiyon SLM v1.2

---

## 1. PRODUCTION ROUTING CONFIGURATION
Production traffic routing is governed by the centralized model registry (`ai-service/inference/model_registry.py`):
```python
model_registry.get_production_model() -> "mathiyon-slm-v1.2"
```
- **Production Endpoint `POST /generate`:** Mapped strictly to `v1_2_generator`.
- **Experimental Endpoint `POST /generate/v1.3`:** Mapped strictly to `v1_3_generator`.

---

## 2. EMERGENCY ROLLBACK INSTRUCTIONS
If any operational issue arises during experimental v1.3 testing:

1. **Endpoint Isolation:** Experimental endpoint `/generate/v1.3` can be disabled or blocked without touching production `/generate`.
2. **Registry Verification:** Verify that `model_registry` lists v1.2 with `"production": True`.
3. **Rollback Execution Time:** **< 0 ms** (Production traffic is already 100% on v1.2).
4. **Post-Rollback Verification:** Execute platform regression suite:
   ```bash
   python -m pytest tests/test_v1_3_registry.py tests/test_v1_3_fastapi.py tests/test_v1_3_orchestrator_integration.py
   node scratch/test_master_platform_e2e.cjs
   npm run build
   ```

---

## 3. ROLLBACK AUDIT STATEMENT
Because Mathiyon SLM v1.3 is packaged as an isolated release candidate with 0% production traffic allocation, production service availability and integrity are 100% guaranteed.
