# MODEL CARD: Mathiyon SLM v1.3 (Release Candidate 1)

**Model Name:** Mathiyon SLM v1.3  
**Model Version:** 1.3-RC1 (Experimental Release Candidate)  
**Release Date:** September 25, 2026  
**Developer:** Mathiyon AI Platform Team  
**Model Type:** Decoder-Only Causal Small Language Model (SLM)  
**Production Status:** **EXPERIMENTAL ONLY (0% Production Traffic)**  
**Production Default Model:** Mathiyon SLM v1.2 (100% Production Traffic)

---

## 1. ARCHITECTURE & SPECIFICATIONS
- **Parameters:** 21,952,896 (~22M parameters)
- **Transformer Layers:** 8
- **Attention Heads:** 12 (Head Dimension: 32)
- **Hidden Dimension:** 384
- **Feed-Forward Dimension:** 1,536 (SwiGLU)
- **Positional Embeddings:** Rotary Position Embeddings (RoPE)
- **Normalization:** RMSNorm
- **Vocabulary Size:** 8,000 (BPE v1.3)
- **Maximum Context Length:** 1,024 tokens
- **Tied Embeddings:** Enabled

---

## 2. INFERENCE PERFORMANCE & OPTIMIZATION
- **KV Cache:** Production-quality FP32 Key-Value Cache enabled by default.
- **Generation Throughput:** Median **46.17 – 49.03 tok/s** on CPU host (~2.75x speedup over full-prefix recomputation).
- **Time To First Token (TTFT):** Mean **38.48 ms**.
- **Memory Footprint:** ~23.86 MB for KV cache at max 1,024 sequence length.
- **CPU Thread Scaling:** Optimal at 1–4 threads.

---

## 3. INTENDED USE & SCOPE
- **Intended Use:** Experimental testing of lightweight English and coding generation via `POST /generate/v1.3`.
- **Not Intended Use:**
  - Must NOT be used as the sole authoritative calculator for exact mathematics (SymPy Math Engine handles exact math).
  - Must NOT replace production model Mathiyon SLM v1.2 without formal governance promotion sign-off.
  - Must NOT execute untrusted code in production without sandbox safety controls.

---

## 4. SYSTEM DEPENDENCIES & TOOL ORCHESTRATION
- **Mathematics:** Exact mathematical queries route to **SymPy Math Engine** (`MathEngineSolver`), which performs exact symbolic/numeric calculation and bypasses SLM exact calculation.
- **Document Queries:** Document RAG queries route to **RAG Vector Engine**, retrieving document context chunks and generating source citations.
- **Web Search:** General web queries route to **Web Search Tool** for live web source synthesis.

---

## 5. SECURITY & PRIVACY CONSIDERATIONS
- **User Isolation:** Document and memory access filtered strictly by `userId` (HTTP 403 Forbidden on unauthorized cross-access).
- **Secret Protection:** Zero passwords, JWT tokens, or API credentials stored in model checkpoints or evaluation artifacts.
- **Privacy Policy:** Real production shadow traffic is NOT enabled; evaluation uses sanitized synthetic prompts.

---

## 6. ROLLBACK & DEPLOYMENT SAFETY
- Production endpoint `POST /generate` remains strictly mapped to SLM v1.2.
- Instant rollback guaranteed by endpoint isolation (`POST /generate/v1.3`).
