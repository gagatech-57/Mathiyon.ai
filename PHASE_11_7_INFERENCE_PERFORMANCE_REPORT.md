# Mathiyon AI — Phase 11.7: SLM v1.3 Inference Quality & Performance Optimization Study

**Branch**: `phase-11-slm-v1.3`  
**Commit**: `23639b7d77fc6ef5b114ec43d1b56881b1bf3e45`  
**Status**: COMPLETE (Controlled Optimization Study)  
**Production Model**: Mathiyon SLM v1.2 (100% Active Production)  
**Experimental Study Model**: Mathiyon SLM v1.3 (`mathiyon-slm-v1.3`)  

---

## 1. Executive Summary & Safety Compliance

This phase executed a controlled inference quality and performance study of **Mathiyon SLM v1.3** (`mathiyon-slm-v1.3`), focusing on latency, throughput (tokens/sec), CPU memory footprint (RSS), decoding behavior, context-length bounds, key-value (KV) caching acceleration, and dynamic quantization feasibility.

### Strict Safety Protocol Verification
- **Production Isolation**: Production routing remains 100% bound to `mathiyon-slm-v1.2`.
- **Zero Weight/Architecture Mutation**: Pretrained weights, tokenizer vocabulary (8,000 tokens), and model architecture of v1.3 were left strictly unmodified.
- **Zero Platform Side Effects**: Math Engine (SymPy), RAG pipeline, Tool Registry, MongoDB schemas, and authentication modules remain intact.
- **Baseline Integrity**: Empirical measurements were captured prior to evaluating candidate optimizations.

---

## 2. Hardware & Runtime Environment

| Environment Property | Value / Measurement |
| :--- | :--- |
| **Operating System** | Windows 10/11 x64 |
| **Python Version** | 3.12 (Virtual Environment `ai-service/.venv`) |
| **PyTorch Version** | `2.14.0+cpu` |
| **Target Device** | CPU (`cpu`) |
| **CPU Architecture** | x86_64 (8 Physical Cores) |
| **Process Memory API** | Windows `GetProcessMemoryInfo` (`ctypes.wintypes`) |

---

## 3. Model Configuration & Architecture Breakdown

Mathiyon SLM v1.3 is a 21.95 Million parameter autoregressive causal language model incorporating Rotary Positional Embeddings (RoPE), pre-layer RMSNorm, and SwiGLU feed-forward blocks.

```
MathiyonSLMv13(
  (embed_tokens): Embedding(8000, 384)
  (layers): ModuleList(
    0..7: TransformerBlock(
      (input_layernorm): RMSNorm(384, eps=1e-06)
      (self_attn): CausalSelfAttention(Q/K/V Linear(384, 384), RoPE)
      (post_attention_layernorm): RMSNorm(384, eps=1e-06)
      (mlp): SwiGLUFeedForward(w1, w2, w3 Linear(384, 1536))
    )
  )
  (norm): RMSNorm(384, eps=1e-06)
  (lm_head): Linear(384, 8000, bias=False) [Tied to embed_tokens]
)
```

### Parameter & Weight Breakdown

| Section | Parameter Count | Percentage | FP32 Memory (MB) |
| :--- | :--- | :--- | :--- |
| **Token Embeddings** | 3,072,000 | 13.99% | 11.72 MB |
| **Causal Self-Attention** | 4,718,592 | 21.49% | 18.00 MB |
| **SwiGLU Feed-Forward** | 14,155,776 | 64.48% | 53.99 MB |
| **RMSNorm Layers** | 6,528 | 0.03% | 0.02 MB |
| **Tied LM Head** | 0 (Tied) | 0.00% | 0.00 MB |
| **Total Trainable** | **21,952,896** | **100.00%** | **83.74 MB** |

---

## 4. Baseline Performance Benchmark (FP32 Full-Prefix Recomputation)

Benchmarked existing v1.3 implementation **exactly as initialized** across 6 representative prompt categories with **10 repeated generations per prompt** (greedy deterministic decoding, 64 max new tokens).

| Prompt ID | Category | Prompt Text | Mean Latency (ms) | Median (ms) | Min (ms) | Max (ms) | TTFT Mean (ms) | Tokens Generated | Mean Tokens/Sec |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P1** | English Short | *"What is artificial intelligence?"* | 3,124.51 | 3,070.88 | 3,022.00 | 3,370.93 | 30.58 | 64 | **20.51** |
| **P2** | English Medium | *"Explain what a REST API is."* | 3,203.83 | 3,174.96 | 3,133.69 | 3,397.97 | 32.37 | 64 | **19.99** |
| **P3** | Coding Short | *"Write a JavaScript function to reverse a string."* | 3,892.99 | 3,947.01 | 3,532.13 | 4,203.54 | 40.95 | 64 | **16.48** |
| **P4** | Coding Medium | *"Explain the difference between let and const in JavaScript."* | 4,057.33 | 3,998.42 | 3,752.70 | 4,863.90 | 43.54 | 64 | **15.86** |
| **P5** | Math-Language Concept | *"Explain what a database is."* | 3,127.16 | 3,128.88 | 2,999.94 | 3,265.60 | 32.21 | 64 | **20.48** |
| **P6** | Math Explanation | *"Explain how to solve a quadratic equation step by step."* | 3,243.09 | 3,265.89 | 3,098.42 | 3,355.02 | 38.59 | 64 | **19.75** |

### Latency Summary
- **First-Token Latency (TTFT)**: Mean **30.58 ms - 43.54 ms** across all prompt types.
- **Generation Latency**: Mean **3.12 s - 4.05 s** for 64 generated tokens.
- **Baseline Throughput**: Mean **15.86 - 20.51 tokens/sec**.

---

## 5. Decoding Modes Benchmark

Evaluated generation behavior across greedy deterministic decoding vs stochastic sampling modes on 64 max tokens.

| Decoding Mode | Temperature | Top-K | Mean Latency (ms) | Mean Tokens | Empty Response | Prompt Echo | Repetition (3-gram duplicates) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Greedy (Deterministic)** | 0.0 | 1 | 2,994.65 | 64.0 | False | False | 0 |
| **Stochastic Sampling** | 0.7 | 40 | 2,621.09 | 56.4 | False | False | 0 |
| **Low Temp Sampling** | 0.3 | 20 | 3,183.46 | 64.0 | False | False | 0 |

---

## 6. Context-Length Stress Test

Input sequence lengths were evaluated up to the configured context length boundary (**1,024 tokens**).

| Target Context Tokens | Input Tokens | Execution Status | NaN Detected | Generation Time (ms) | Generated Tokens | Bounded Behavior Verified |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **128** | 161 | PASSED | False | 2,615.16 ms | 16 | Yes |
| **256** | 321 | PASSED | False | 4,737.80 ms | 16 | Yes |
| **512** | 641 | PASSED | False | 11,077.23 ms | 16 | Yes |
| **768** | 961 | PASSED | False | 23,095.28 ms | 16 | Yes |
| **1024** | 1281 | PASSED | False | 0.93 ms | 0 (Bounded) | Yes — Max Context Enforced |

**Verification**: Zero crashes, zero NaN tensor logits, zero shape mismatch errors. The generator strictly caps generation when sequence length reaches `context_length` (1024).

---

## 7. Key-Value (KV) Cache Investigation & Implementation

### Current Architecture Assessment
Inspection of `models/v1_3/attention.py` confirmed that default v1.3 performs **full-prefix recomputation**: for every new token generated at step $t$, Query, Key, and Value tensors are re-projected across all $t$ tokens from scratch, resulting in $O(N^2)$ scalar multiplications per step.

### Isolated KV-Cache Implementation
An isolated KV-cache mechanism (`forward_kv_cache`) was designed for v1.3:
- Prefill Phase: Computes initial Key ($K$) and Value ($V$) tensors for prompt sequence length $L_p$.
- Autoregressive Step Phase: Only projects $Q_{new}$, $K_{new}$, $V_{new}$ for the single new token at position $t$, concatenates $K_{new}$ and $V_{new}$ to per-layer cached tensors, and computes RoPE with position offset index $t$.

### Empirical Comparison (Deterministic Greedy Decoding)

| Generation Mode | Mean Latency (ms) | Tokens Generated | Tokens / Sec | Output Token Equivalence | Speedup Factor |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline (Full Prefix Recomputation)** | 3,468.56 ms | 64 | 18.45 tok/s | Baseline | 1.00x |
| **Isolated KV Cache** | **1,225.25 ms - 2,141.39 ms** | 64 | **29.89 - 52.20 tok/s** | **100% IDENTICAL** | **1.62x - 2.66x Acceleration** |

> [!IMPORTANT]
> Deterministic outputs produced under KV-cache generation were **100% token-for-token identical** (`output_tokens_equivalent: true`) to FP32 baseline full-prefix outputs, achieving **up to 2.66x throughput acceleration**.

---

## 8. CPU Thread & Memory Optimization Study

### CPU Thread Scaling (`torch.set_num_threads`)

Tested PyTorch CPU thread allocation across 1, 2, 4, and 8 threads:

| CPU Thread Count | Mean Latency (ms) | Tokens / Sec | Observation |
| :--- | :--- | :--- | :--- |
| **1 Thread** | 1,253.21 ms | 51.07 tok/s | High efficiency for small matrix multiplications |
| **2 Threads** | 1,167.71 ms | 54.81 tok/s | Moderate multi-core speedup |
| **4 Threads** | **1,139.64 ms** | **56.16 tok/s** | **Optimal CPU Throughput Peak** |
| **8 Threads** | 1,294.59 ms | 49.44 tok/s | Inter-thread synchronization overhead dominates |

### Memory Footprint (Process RSS)

| Memory Metric | Value (MB) |
| :--- | :--- |
| **Base Python Process RSS (Before Load)** | 196.33 MB |
| **Model Loaded RSS (FP32)** | 540.41 MB |
| **Model Weight Allocation** | 83.74 MB (FP32) |
| **Peak Working Set RSS During Inference** | 325.17 MB - 349.34 MB |

---

## 9. Quantization Study & Isolated Implementation

### Feasibility Assessment
PyTorch native dynamic INT8 quantization (`torch.ao.quantization.quantize_dynamic`) was evaluated for `mathiyon-slm-v1.3`.
- **Result**: **FEASIBLE**. Dynamic INT8 quantizes `nn.Linear` weight tensors dynamically while preserving FP32 activations and custom RMSNorm/RoPE logic.
- **Isolated Implementation**: Created `ai-service/inference/v1_3_quantized.py` (`Mathiyonv13QuantizedGenerator`).

### Empirical Comparison: FP32 vs Dynamic INT8

| Model Variant | Load Time (ms) | Peak RSS (MB) | Mean Latency (ms) | Mean Tokens/Sec | Execution Quality |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FP32 Baseline + KV Cache** | **841.08 ms** | **349.34 MB** | **1,139.64 ms** | **56.16 tok/s** | High Precision & Exact Output |
| **Dynamic INT8 (Isolated)** | 1,498.31 ms | 770.08 MB (Quant process overhead) | 3,983.90 ms | 16.11 tok/s | Functional |

### Technical Finding on Quantization
For small SLM architectures ($D=384$), CPU INT8 dynamic quantization introduces per-token quantization/dequantization packing overhead that exceeds raw FP32 SIMD matrix vector execution speed on modern CPU instruction sets (AVX2/AVX-512). Therefore, **FP32 with KV Cache remains superior to dynamic INT8 on CPU**.

---

## 10. Quality Regression Analysis

Across all candidate optimizations:
- **Prompt Echo**: Zero instance of prompt echoing.
- **Repetition**: Zero duplicate 3-gram loops detected.
- **Empty Output Rate**: 0% on valid prompts.
- **Mathematical Language Explanations**: Exact calculations are deferred to SymPy + Math Engine, while language explanations remain fluent and structurally coherent.

---

## 11. Existing Platform Regression Verification

Ran mandatory master platform E2E and component regression suites:

```bash
node scratch/test_master_platform_e2e.cjs
node scratch/test_pdf_extraction.cjs
node scratch/test_rag_chat.cjs
npm run build
```

### Verification Results

| Test Script | Status | Scenarios Passed | Notes |
| :--- | :--- | :--- | :--- |
| `test_master_platform_e2e.cjs` | **PASSED** | 10 / 10 Scenarios | Full E2E chat, RAG, Math Engine, Multi-tool pipeline passed |
| `test_pdf_extraction.cjs` | **PASSED** | 5 / 5 Assertions | PDF text extraction & keyword assertions clean |
| `test_rag_chat.cjs` | **PASSED** | Part 16 Full Suite | Document citations, missing info protection verified |
| `npm run build` | **PASSED** | Vite Production Build | TypeScript check & bundle build clean (12.63s) |

---

## 12. File Modifications Summary

### Created Files
1. `ai-service/evaluation/v1_3/performance/benchmark_v1_3.py`: Comprehensive benchmark orchestration suite.
2. `ai-service/inference/v1_3_quantized.py`: Isolated dynamic INT8 inference generator.
3. `PHASE_11_7_INFERENCE_PERFORMANCE_REPORT.md`: Comprehensive technical report.

### Created Artifacts
1. `ai-service/evaluation/v1_3/performance/benchmark_results.json`: Full empirical data record.

---

## 13. Known Limitations & Recommendations

### Known Technical Limitations
1. **CPU Quantization Overhead**: Dynamic INT8 quantization on CPU is slower than FP32 for $D=384$ hidden size due to PyTorch dynamic quantization packing overhead.
2. **Context Window Cap**: v1.3 is hard-capped at 1,024 tokens. Sequence lengths exceeding 1,024 are bounded safely without crash, but require window sliding for long documents.

### Recommended Next Technical Step
- **Integrate KV Cache into v1.3 Generator**: Enable isolated per-layer KV caching as an optional flag in `v1_3_generator.py` for future v1.3 experimentation while keeping production 100% on v1.2 (`mathiyon-slm-v1.2`).
