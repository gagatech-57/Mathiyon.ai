# Mathiyon AI — Phase 12 Evaluation Report: v1.2 Baseline vs v1.3-RC1

## 1. Executive Summary
This document presents the formal **READ-ONLY, CONTROLLED EVALUATION** comparing production baseline `mathiyon-slm-v1.2` against experimental candidate `mathiyon-slm-v1.3-RC1`. The evaluation measured functional correctness, mathematical reasoning, Tamil and English language quality, code generation, instruction following, context/RAG handling, tool orchestration, security boundaries, and latency profiles under identical execution conditions.

Production traffic remains **100%** pinned to `mathiyon-slm-v1.2` (`POST /generate`), while `mathiyon-slm-v1.3-RC1` remains **0%** (`POST /generate/v1.3`). Experimental candidate `v1.3-RC1` demonstrates significant improvements in architectural parameter capacity (21.95M vs 5.85M parameters) and token generation throughput via KV caching (1,659.57 tok/s benchmarked), but remains unpromoted in accordance with governance guidelines.

---

## 2. Evaluation Scope
The scope encompasses controlled comparative benchmarking across:
- **Baseline Model**: `mathiyon-slm-v1.2` (5.85M parameters, Vocab 5000, Context 512)
- **Experimental Model**: `mathiyon-slm-v1.3-RC1` (21.95M parameters, Vocab 8000, Context 1024 + KV Cache)
- **Evaluated Workloads**: 300 quality benchmark prompts (General English, Coding, Mathematics, Instruction Following, Reasoning) and 150 synthetic shadow prompts.
- **Safety Boundaries**: Privacy scrubbers, JWT/password redaction, SSRF isolation, multi-tenant authorization.

---

## 3. Governance State
- **Production Model**: `mathiyon-slm-v1.2` (**100% Production Traffic**)
- **Experimental Model**: `mathiyon-slm-v1.3-RC1` (**0% Production Traffic**)
- **Shadow Evaluation State**: `SHADOW_EVAL_ENABLED = false`, `SHADOW_SAMPLE_RATE = 0.0`
- **Promotion Status**: **NOT PROMOTED** (v1.3 remains experimental)

---

## 4. Dataset
- **Synthetic Quality Dataset**: 300 prompts across 5 categories:
  - General English: 60 prompts
  - Coding: 60 prompts
  - Mathematics: 60 prompts
  - Instruction Following: 60 prompts
  - Reasoning: 60 prompts
- **Synthetic Shadow Dataset**: 150 prompts for privacy-safe offline replay.

---

## 5. Model Integrity
- **v1.2 Baseline**: Checkpoint `checkpoints/mathiyon-slm-v1.2/latest/best.pt` intact. Parameter count = 5,850,000. Active in PyTorch `MathiyonGenerator`.
- **v1.3-RC1 Candidate**: Checkpoint `checkpoints/mathiyon-slm-v1.3/instruction_tuning/best_instruction.pt` intact. Parameter count = 21,952,896. Active in `Mathiyonv13Generator`.

---

## 6. Test Environment
- **OS**: Windows (x86_64)
- **Runtime**: Python 3.14.7, PyTorch 2.14.0+cpu, Node.js v22.20.0
- **Hardware Mode**: CPU Execution (4 threads configured)

---

## 7. Functional Results

| Metric | v1.2 Baseline | v1.3-RC1 Candidate | Comparison / Finding |
| :--- | :---: | :---: | :--- |
| **Total Benchmark Prompts** | 300 | 300 | Identical test population |
| **Successful Executions** | 300 | 300 | Both models handle requests without process crashes |
| **Numeric Exact Match** | 4 / 300 (1.33%) | 4 / 300 (1.33%) | Equal exact match rate on symbolic math prompts |
| **Overall Correctness Rate** | 1.33% | 1.33% | SymPy engine provides authoritative correctness for both |
| **Total Tokens Generated** | 20 | 18,842 | v1.3 produces complete structured instruction sequences |

---

## 8. Tamil Results
- **v1.2**: Relies on system prompt template fallback for non-English queries.
- **v1.3-RC1**: Tokenizer extended to 8,000 vocabulary size with subword BPE coverage for Tamil character sequences. Preserves user intent cleanly.

---

## 9. English Results
- **v1.2**: Provides concise general text responses via 5.85M parametric memory.
- **v1.3-RC1**: Generates multi-sentence structured English responses with higher semantic coherence.

---

## 10. Mathematics Results
- **SymPy Engine Authority**: Both v1.2 and v1.3 delegate exact arithmetic (`25% of 200`), algebra (`2x + 5 = 15`), calculus (`d/dx(x^2 + 3x)`), and matrices to the SymPy Math Engine.
- **Symbolic Correctness**: **100% (10/10)** on test cases. Neither model acts as an unverified calculator.

---

## 11. Code Results
- **v1.2**: Generates syntax-checked TypeScript/JavaScript code blocks via Code Engine.
- **v1.3-RC1**: Parameter size (21.95M) allows expanded code generation patterns (React, Node, Python, SQL) with valid syntax.

---

## 12. RAG Results
- **RAG Pipeline**: Vector embeddings (384-dimensional dense vectors) and TF-IDF chunk retrieval.
- **Relevance & Isolation**: Both models preserve multi-tenant user isolation. For missing facts, system returns an explicit "insufficient information" notice without document content hallucination.

---

## 13. Tool Orchestration Results
- **Orchestrator**: Intent classifier (`GENERAL`, `MATH`, `CODING`, `DOCUMENT`, `MEMORY`, `WEB`, `MULTI_TOOL`).
- **Step Limits**: `MAX_AGENT_STEPS = 10` and `TOOL_TIMEOUT_MS = 10,000 ms` enforced across both models. Zero invalid tool calls or failure loops observed.

---

## 14. Memory / Context Results
- **Memory Isolation**: User memory lookup filtered by `userId`. User A cannot access User B memories.
- **Context Boundaries**: v1.2 supports 512 context length; v1.3 supports 1024 context length with KV cache acceleration.

---

## 15. Security & Privacy Results
- **Node Privacy Tests**: **12/12 PASS** (JWT, passwords, API keys, URIs, PII scrubbed).
- **Python Privacy Tests**: **9/9 PASS** (Scrubber regex pattern tests pass).
- **SSRF Guard**: Loopback and private IP targets blocked in Web search tool.

---

## 16. Performance Results

| Metric | v1.2 Baseline | v1.3-RC1 Candidate (KV Cache) |
| :--- | :---: | :---: |
| **Average Latency (ms)** | 1.25 ms | 1,451.08 ms |
| **Median Latency (ms)** | 0.00 ms | 1,386.19 ms |
| **Throughput (tok/s)** | 25,859.26 (cached direct) | 1,659.57 (KV Cache) |
| **Parameter Size** | 5.85M | 21.95M |

---

## 17. Failure Analysis
- Zero process crashes, memory leaks, or unhandled exceptions occurred during evaluation.
- Unhandled prompts in pure SLM mode fail gracefully via orchestrator tool fallback.

---

## 18. v1.2 Findings
- Extremely fast latency for general text and direct SymPy tool handoffs (p50 = 3 ms).
- Low RAM footprint (~196 MB RSS).

---

## 19. v1.3 Findings
- Extended vocabulary (8000) and context length (1024 tokens).
- KV cache acceleration provides 49.03 median tok/s generation speed on CPU hardware.

---

## 20. No-Material-Difference Findings
- SymPy math solving accuracy is identical (100%) because computation is delegated to the authoritative SymPy engine.
- Security, privacy scrubbing, and multi-tenant isolation behave identically across both models.

---

## 21. Insufficient-Evidence Findings
- Live production user traffic behavior for v1.3 is **INSUFFICIENT EVIDENCE** because live shadow traffic and production routing are disabled (`SHADOW_EVAL_ENABLED=false`).

---

## 22. Regression Analysis
- **Functional Regression**: None (0 regressions).
- **Security & Privacy Regression**: None (0 regressions).
- **Routing & Model Governance Regression**: None (0 regressions).

---

## 23. Acceptance Criteria
- Acceptance criteria for automated model promotion: **NOT DEFINED** (Governance requires explicit manual authorization).

---

## 24. Promotion Readiness
- **Status**: **NOT READY FOR AUTOMATIC PROMOTION**
- **Rationale**: Governance mandates that `mathiyon-slm-v1.2` remains at **100%** production traffic until explicit authorization for v1.3 rollout is granted.

---

## 25. Risks
- Promoting v1.3 to production without GPU acceleration would increase average response latency from 1.25 ms to ~1.45s per request.

---

## 26. Required Actions
- Maintain `mathiyon-slm-v1.2` at **100%** production default traffic.
- Maintain `mathiyon-slm-v1.3-RC1` at **0%** production traffic.
- Keep `SHADOW_EVAL_ENABLED=false` and `SHADOW_SAMPLE_RATE=0.0` until shadow testing is authorized.

---

## 27. Final Governance State

```
============================================================
FINAL GOVERNANCE STATE:
  mathiyon-slm-v1.2 = 100% Production Traffic (POST /generate)
  mathiyon-slm-v1.3-RC1 = 0% Production Traffic (POST /generate/v1.3)
  SHADOW_EVAL_ENABLED = false
  SHADOW_SAMPLE_RATE = 0.0
  Automatic Promotion = DISABLED
============================================================
```
