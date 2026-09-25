# MATHIYON AI — PHASE 12.4 TEST PLAN

**Branch:** `phase-12-4-context-knowledge-intelligence`  
**Date:** September 25, 2026  
**Scope:** Context Fusion, Source Authority, Conflict Detection, Citation System & Granular E2E Evaluation  

---

## 1. OBJECTIVES & BENCHMARK RULES

The primary goal of the Phase 12.4 test plan is to thoroughly evaluate the Context Intelligence layer across isolated, un-ambiguous test suites.

### Benchmark Rules
1. **Strict Test Separation**: All tests are explicitly grouped into isolated directories under `tests/context/`:
   - `unit/`: Unit tests for context normalization, authority ranking, relevance filtering, conflict detection algorithms.
   - `mock/`: Synthetic orchestrator tests with mocked tool returns to evaluate multi-tool context fusion logic without network overhead.
   - `integration/`: Internal service integration testing (Express + Memory + RAG + Math Engine).
   - `rag/`: Real local document processing, chunking, embedding, vector search, missing info check (`REAL_RAG`).
   - `real_db/`: Isolated test database collection CRUD, cross-user isolation, memory authorization (`REAL_DB`).
   - `web/`: Live web search tests (`LIVE_WEB`). If web network access is unavailable, mark tests as `BLOCKED`.
   - `e2e/`: True end-to-end full stack execution (`TRUE_E2E`).
2. **No Deceptive Labeling**: Mocked tests must NEVER be reported as `LIVE_WEB` or `TRUE_E2E`.
3. **Status Reporting**: Every test case outcome must record one of: `PASS`, `FAIL`, `BLOCKED`, `NOT_TESTED`.

---

## 2. TEST SUITE STRUCTURE & DIRECTORIES

```
tests/context/
├── unit/
│   ├── test_context_normalization.test.js
│   ├── test_source_authority.test.js
│   ├── test_relevance_filter.test.js
│   └── test_conflict_detection.test.js
├── mock/
│   ├── test_mock_fusion_orchestration.test.js
│   └── test_mock_multi_source.test.js
├── integration/
│   └── test_fusion_integration.test.js
├── rag/
│   ├── fixtures/
│   │   ├── technical_doc.txt
│   │   ├── math_doc.txt
│   │   ├── project_doc.txt
│   │   ├── data_structured.csv
│   │   └── dataset.json
│   └── test_real_rag_fusion.test.js
├── real_db/
│   └── test_cross_user_isolation.test.js
├── web/
│   └── test_live_web_fusion.test.js
├── e2e/
│   └── test_true_e2e_fusion.test.js
└── results/
    └── benchmark_results.json
```

---

## 3. VERIFICATION MATRIX & TARGET METRICS

| Evaluation Suite | Target Test Cases | Success Criteria | Required Status Label |
| :--- | :---: | :--- | :--- |
| **Unit Tests** | 40 Cases | 100% Pass rate on algorithms & authority logic | `UNIT` |
| **Mock Orchestration** | 30 Cases | 100% Pass rate on tool chaining & context construction | `MOCK` |
| **Real RAG Documents** | 20 Cases | Verified chunk retrieval, missing info check, multi-doc comparisons | `REAL_RAG` |
| **Real DB & Security** | 20 Cases | Strict 403 / zero leakage on cross-user isolation & prompt injection | `REAL_DB` |
| **Live Web Tests** | 100 Cases | Real web facts + citations (or `BLOCKED` if offline) | `LIVE_WEB` |
| **True E2E Cases** | 50 Cases | Full stack response from HTTP request down to SLM response | `TRUE_E2E` |

---

## 4. REGRESSION VERIFICATION COMMANDS

In addition to context fusion tests, full regression of the core platform must be verified:
1. **Python AI Service PyTest**:
   `ai-service\.venv\Scripts\python.exe -m pytest ai-service/tests/`
2. **Live Shadow Privacy & Node Integration Tests**:
   `node server/services/shadow/liveShadowRunner.js`
3. **Frontend Build & Lint**:
   `npm run lint` & `npm run build`
