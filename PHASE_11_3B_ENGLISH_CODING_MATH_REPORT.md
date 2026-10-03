# Mathiyon SLM v1.3 Dataset Report — English + Coding + Mathematics (Phase 11.3B)

This report presents the complete data validation, tokenizer domain benchmarking, and split generation for the **English + Coding + Mathematics** focused training dataset of **Mathiyon SLM v1.3**.

> [!IMPORTANT]
> **Scope Adjustment**: For the current Mathiyon SLM v1.3 pre-training phase, the dataset is focused **EXCLUSIVELY** on English, Coding, and Mathematics. Tamil and Tanglish are explicitly **OUT OF SCOPE** and omitted from the active training corpus.

---

## 1. Domain Metric Summary

| Domain | Scope Status | Sample Count | Total Tokens | Avg Seq Length | UNK Rate (%) | UNK Target (< 0.1%) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Coding** | `IN_SCOPE` | 40 | 5,205 | 130.12 tokens | **0.00%** | **PASSED** |
| **Mathematics** | `IN_SCOPE` | 39 | 4,068 | 104.31 tokens | **0.00%** | **PASSED** |
| **General English** | `IN_SCOPE` | 21 | 2,025 | 96.43 tokens | **0.00%** | **PASSED** |
| **Tamil** | `OUT_OF_SCOPE` | N/A | N/A | N/A | N/A | Out of Scope |
| **Tanglish** | `OUT_OF_SCOPE` | N/A | N/A | N/A | N/A | Out of Scope |
| **TOTAL / OVERALL** | `FOCUSED` | **100** | **11,298** | **112.98 tokens** | **0.00%** | **PASSED** |

---

## 2. Key Dataset & Tokenizer Statistics

* **Dataset Path**: [`ai-service/data/v1.3_focused/`](file:///c:/DISK-D/Personal%20folder/Mathiyon/ai-service/data/v1.3_focused/)
* **Dataset Report Location**: [`ai-service/data/v1.3_focused/dataset_report_v1_3_focused.json`](file:///c:/DISK-D/Personal%20folder/Mathiyon/ai-service/data/v1.3_focused/dataset_report_v1_3_focused.json)
* **Final Focused Dataset Size**: `18,931 bytes` (`18.49 KB` / `0.0181 MB`)
* **Total Training Tokens**: `11,298` subword tokens
* **Instruction-Following Pair Count**: `100` structured English/Coding/Math instruction pairs
* **Duplicate Samples**: `0` (`0.0%` Duplication Rate — 100% unique authentic data)
* **Tokenizer File**: [`tokenizer_v1.3.json`](file:///c:/DISK-D/Personal%20folder/Mathiyon/ai-service/checkpoints/mathiyon-slm-v1.3/latest/tokenizer_v1.3.json) (Vocab Size: 8,000)
* **Tokens / Parameter Ratio**:
  $$\text{Tokens / Parameter Ratio} = \frac{11,298 \text{ tokens}}{21,952,896 \text{ parameters}} = 0.000515 \text{ tokens/param}$$

---

## 3. Deterministic 90/5/5 Split Metadata (`seed=42`)

* **Split Metadata Location**: [`ai-service/data/v1.3_focused/split_metadata.json`](file:///c:/DISK-D/Personal%20folder/Mathiyon/ai-service/data/v1.3_focused/split_metadata.json)
* **Train Set**: `90` samples (90.0%)
* **Validation Set**: `5` samples (5.0%)
* **Test Set**: `5` samples (5.0%)

---

## 4. Model Architecture Compatibility

The focused dataset is 100% compatible with the verified **Mathiyon SLM v1.3** architecture:

```python
MathiyonSLMv13Config(
    model_version="mathiyon-slm-v1.3",
    vocab_size=8000,
    context_length=1024,
    hidden_size=384,
    num_layers=8,
    num_heads=12,
    ffn_hidden_size=1536,
    rope_theta=10000.0,
    rms_norm_eps=1e-6,
    tie_word_embeddings=True
)
# Total Trainable Parameters: 21,952,896 (21.95M)
```

---

## 5. Platform Regression Verification

1. `node scratch/test_master_platform_e2e.cjs`: **10 / 10 PASSED**
2. `node scratch/test_pdf_extraction.cjs`: **1 / 1 PASSED**
3. `node scratch/test_rag_chat.cjs`: **5 / 5 PASSED**
4. `npm run build`: **PASSED** (`2,301` modules built in `3.47s`).

---

## 6. Strict Stop Condition Acknowledgment

> [!STOP]
> **STRICT STOP CONDITION ENFORCED**:
> - 15-epoch pre-training was **NOT** started.
> - Instruction fine-tuning was **NOT** started.
> - Active production model router remains **100% Mathiyon SLM v1.2**.
> - All production Express APIs, RAG, Math Engine, and Orchestrator components remain untouched.
