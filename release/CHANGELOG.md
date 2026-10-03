# Mathiyon AI - Platform Changelog

## [1.2.0-rc.12.7] - 2026-09-25 (Phase 12.7)

### Added
- **Production Agent Release Candidate Verification Suite**: Created comprehensive E2E matrix and test runner in `tests/release_candidate/`.
- **Release Manifest & Governance**: Created machine-readable manifest `release/RELEASE_MANIFEST.json`, environment audit `release/environment.json`, and validation script `release/validate_release.py`.
- **Architecture & API Lock Documentation**: Authored `docs/PHASE_12_7_ARCHITECTURE_FREEZE.md` and `docs/PHASE_12_7_API_CONTRACT.md`.
- **Rollback Procedure**: Authored deterministic step-by-step rollback instructions in `release/ROLLBACK.md`.

### Verified & Hardened
- **Production Model Isolation**: Locked `mathiyon-slm-v1.2` to **100%** production default traffic; enforced `mathiyon-slm-v1.3-RC1` at **0%** traffic.
- **Agent Safety Contract**: Enforced `MAX_AGENT_STEPS = 10`, `TOOL_TIMEOUT_MS = 10000`, step limit overflow handling, and safe graceful failure modes.
- **Context Fusion Authority**: Reinforced hierarchy (`MATH` > `DOCUMENT` > `CODE` > `WEB` > `MEMORY` > `CONVERSATION` > `MODEL`).
- **Cross-User Data Isolation**: Validated multi-tenant isolation across Conversations, Messages, User Memories, uploaded Documents, and Vector Chunks.
- **SSRF & Privacy Scrubbing**: Verified blocking of private IP ranges in Web search tool and redaction of JWT/passwords in async telemetry logging.

---

## [1.2.0-rc.12.6] - 2026-09-24 (Phase 12.6)
- Performance and reliability engineering. Added compound database indexes, connection pooling, non-blocking telemetry, and failure recovery harnesses.

## [1.2.0-rc.12.5] - 2026-09-23 (Phase 12.5)
- Evaluation and quality control metrics layer. Implemented synthetic test harnesses and routing precision checks.
