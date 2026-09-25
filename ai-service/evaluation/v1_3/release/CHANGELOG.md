# CHANGELOG: Mathiyon SLM v1.2 to v1.3

All notable changes introduced in Mathiyon SLM v1.3 relative to production v1.2.

---

## [1.3-RC1] - 2026-09-25

### Added
- **Architecture Upgrade:** Expanded parameter count from 5.85M (v1.2) to **21.95M** (v1.3), increasing layers to 8, heads to 12, and hidden dimension to 384.
- **Rotary Position Embeddings (RoPE):** Replaced learned positional embeddings with RoPE, enhancing relative sequence position handling.
- **RMSNorm & SwiGLU:** Upgraded layer normalization to RMSNorm and activation functions to SwiGLU.
- **Expanded Context Window:** Extended context length from 512 tokens (v1.2) to **1,024 tokens** (v1.3).
- **Expanded Tokenizer Vocabulary:** Upgraded BPE tokenizer vocabulary from 5,000 tokens (v1.2) to **8,000 tokens** (v1.3).
- **Production-Quality KV Cache:** Integrated FP32 per-layer Key-Value caching in autoregressive forward pass (`v1_3_generator.py`), delivering ~2.75x inference speedup (~46–59 tok/s).
- **FastAPI Experimental Endpoint:** Added `POST /generate/v1.3` supporting `use_kv_cache: bool = True`.

### Fixed & Verified
- **Output Equivalence:** Verified 100% token-for-token output equivalence between full-prefix recomputation and KV cache acceleration across deterministic prompts.
- **Context Boundary Scaling:** Tested context length scaling up to 1,024 max window cleanly without NaN/Inf or shape mismatches.
- **SymPy Math Engine Routing:** Enforced strict separation where exact mathematical queries route to SymPy for calculation while SLM handles formatting.
- **RAG & Security:** Verified PDF document chunking, source citations, missing info protection, and HTTP 403 user isolation.

### Changed
- Production default remains **Mathiyon SLM v1.2** on `POST /generate` (0% production traffic allocation for v1.3).
