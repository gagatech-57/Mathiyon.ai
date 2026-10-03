# Mathiyon AI - Production Agent Release Candidate Checklist (Phase 12.7)

## 1. Governance & Architecture Baseline
- [x] Branch created: `phase-12-7-production-agent-rc`
- [x] Architecture frozen: `docs/PHASE_12_7_ARCHITECTURE_FREEZE.md` generated
- [x] API contract documented: `docs/PHASE_12_7_API_CONTRACT.md` generated
- [x] Environment recorded: `release/environment.json` generated
- [x] Production Traffic Allocation:
  - `mathiyon-slm-v1.2` = **100%**
  - `mathiyon-slm-v1.3-RC1` = **0%** (Experimental isolated)

---

## 2. Core Agent & Routing Contracts
- [x] General query routes to `mathiyon-slm-v1.2`
- [x] Math query routes to SymPy authoritative engine + SLM formatting
- [x] Coding query routes to Code Engine + SLM formatting
- [x] Document query routes to RAG Service + SLM formatting
- [x] Memory query routes to Memory Service + SLM formatting
- [x] Web query routes to Web Search Service + SLM formatting
- [x] Multi-tool query executes agent planner step-by-step
- [x] Unknown query triggers safe fallback
- [x] Step limit strictly enforced (`MAX_AGENT_STEPS = 10`)
- [x] Tool timeout strictly enforced (`TOOL_TIMEOUT_MS = 10000`)
- [x] Uncontrolled loops, recursive execution, and process crashes prevented

---

## 3. Data Privacy & Security Boundaries
- [x] JWT authentication enforced on all protected endpoints
- [x] Cross-user access denied (Conversation, Message, Memory, Document, DocumentChunk)
- [x] SSRF protection active on Web search (Localhost, 127.0.0.1, Private IP ranges blocked)
- [x] Telemetry log scrubbers sanitizing Passwords, JWT, API Keys, database credentials, and PII
- [x] Sensitive fields (Chain-of-thought, internal secrets) stripped from frontend payloads

---

## 4. End-to-End & Regression Verification
- [x] Node Evaluation Suite (`tests/evaluation/run_evaluation_suite.cjs`)
- [x] Context Intelligence Benchmark (`tests/context/run_context_benchmark.cjs`)
- [x] Python PyTest AI Service Suite (`ai-service/tests/`)
- [x] Performance & Reliability Smoke Suite (`tests/performance/run_performance_suite.cjs`)
- [x] Production Agent RC Test Matrix (`tests/release_candidate/run_rc_validation.cjs`)
- [x] Automated Release Artifact Validation (`release/validate_release.py`)
- [x] Frontend Linting & Production Build (`npm run lint`, `npm run build`)

---

## 5. Decision & Artifact Sign-off
- [x] Manifest generated (`release/RELEASE_MANIFEST.json`)
- [x] Rollback guide documented (`release/ROLLBACK.md`)
- [x] Release notes generated (`release/RELEASE_NOTES.md`)
- [x] Changelog updated (`release/CHANGELOG.md`)
- [x] Formal Report compiled (`docs/PHASE_12_7_PRODUCTION_AGENT_RC_REPORT.md`)
- [x] Machine-readable Summary generated (`tests/release_candidate/results/rc_summary.json`)
