# RELEASE NOTES: Mathiyon SLM v1.3 (Release Candidate 1)

**Release Date:** September 25, 2026  
**Status:** Experimental Release Candidate (`POST /generate/v1.3`)  
**Production Status:** Mathiyon SLM v1.2 remains 100% production default.

---

## 1. RELEASE CANDIDATE OVERVIEW
Mathiyon SLM v1.3-RC1 introduces a 22M parameter decoder-only causal language model featuring Rotary Position Embeddings (RoPE), RMSNorm, SwiGLU activations, an expanded 8,000-token BPE vocabulary, a 1,024-token context window, and production-quality FP32 KV-cache acceleration.

## 2. KEY IMPROVEMENTS & EMPIRICAL PERFORMANCE
- **KV Cache Acceleration:** Delivers **46.17 – 49.03 tok/s** median generation throughput on CPU (~2.75x speedup over baseline).
- **Time To First Token (TTFT):** Mean **38.48 ms**.
- **Memory Efficiency:** Consumes only **~23.86 MB** tensor memory at max 1,024 sequence length.
- **Deterministic Equivalence:** 100% token-for-token output match between full-prefix recomputation and KV-cache inference.
- **Execution Stability:** 300 / 300 benchmark prompts and 150 / 150 shadow prompts executed with 0 runtime exceptions.

## 3. GOVERNANCE & INTEGRATION CONTRACTS
- **Math Engine Integration:** Exact math queries route to **SymPy Math Engine** for calculation. The SLM is NOT treated as an exact math solver.
- **RAG & Security:** Document retrieval, source citations, missing info protection, and HTTP 403 authorization checks passed 100%.
- **Platform Regression:** Passed 27/27 PyTest unit tests, 10/10 Master E2E scenarios, PDF extraction, RAG chat, and frontend build.

## 4. DEPLOYMENT & ROLLBACK
- Production endpoint `POST /generate` remains 100% mapped to SLM v1.2.
- Endpoint isolation ensures instantaneous rollback capability (< 0 ms).
