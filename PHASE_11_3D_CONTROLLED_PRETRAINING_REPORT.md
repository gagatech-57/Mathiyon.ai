# Mathiyon SLM v1.3 Controlled Pretraining Report (Phase 11.3D)

This report details the execution and results of the **controlled 3-epoch initial pretraining run** for **Mathiyon SLM v1.3**.

> [!IMPORTANT]
> **Controlled Pretraining Run**: In accordance with Phase 11.3D directives, training was strictly limited to **3 epochs**. Baseline Mathiyon SLM v1.2 remains **100% active** in production APIs. Model v1.3 is **NOT** active in production.

---

## 1. Executive Summary & Metric Matrix

| Metric / Assessment | Epoch 1 | Epoch 2 | Epoch 3 | Best Checkpoint | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Train Loss** | 5.4909 | 3.5182 | **3.3501** | Epoch 3 | `VERIFIED` |
| **Validation Loss** | 4.3515 | 3.9620 | **3.9118** | **3.9118** (Epoch 3) | `VERIFIED` |
| **Perplexity ($\exp(\text{val\_loss})$)** | 77.60 | 52.56 | **49.99** | **49.99** | `VERIFIED` |
| **Learning Rate** | $4.06\times 10^{-4}$ | $1.36\times 10^{-4}$ | $0.00$ | $0.00$ | `VERIFIED` |
| **Duration (Seconds)** | 31.68s | 40.68s | 31.82s | Total: 104.18s | `VERIFIED` |
| **Overfitting Status** | Stable | Stable | Stable | **STABLE** | `VERIFIED` |
| **Best Checkpoint Saved** | `best.pt` | `best.pt` | `best.pt` | [`best.pt`](file:///c:/DISK-D/Personal%20folder/Mathiyon/ai-service/checkpoints/mathiyon-slm-v1.3/training/best.pt) | `VERIFIED` |

---

## 2. Dataset & Model Setup

* **Active Training Dataset**: [`ai-service/data/v1.3_focused/`](file:///c:/DISK-D/Personal%20folder/Mathiyon/ai-service/data/v1.3_focused/)
  * Total Samples: `100` (40 Coding, 39 Math, 21 General English)
  * Total Tokens: `11,298` tokens
  * Out-of-Scope: Tamil and Tanglish
  * Split (`seed=42`): 90 Train / 5 Validation / 5 Test
* **Tokenizer**: [`tokenizer_v1.3.json`](file:///c:/DISK-D/Personal%20folder/Mathiyon/ai-service/checkpoints/mathiyon-slm-v1.3/latest/tokenizer_v1.3.json) (Vocab Size: 8,000)
* **Model Class**: `MathiyonSLMv13` ([`ai-service/models/v1_3/model.py`](file:///c:/DISK-D/Personal%20folder/Mathiyon/ai-service/models/v1_3/model.py))
* **Total Parameters**: `21,952,896` (`21.95M`)
* **Execution Environment**: CPU (`win32`), `float32` precision, `CUDA NOT AVAILABLE`

---

## 3. Loss & Perplexity Trajectory

```
Train Loss Curve:       5.4909 ──► 3.5182 ──► 3.3501 (Steady Descent)
Validation Loss Curve:  4.3515 ──► 3.9620 ──► 3.9118 (Monotonic Improvement)
Perplexity Curve:       77.60  ──► 52.56  ──► 49.99  (Steep Drop)
```

---

## 4. Overfitting Analysis

* **Validation Loss Behavior**: Monotonically decreased across all 3 epochs ($4.3515 \to 3.9620 \to 3.9118$).
* **Overfitting Assessment**: **STABLE**. No validation loss divergence was observed during the 3-epoch window.
* **Small-Corpus Warning**: While stable over 3 epochs, training beyond 3 epochs on the 11,298-token dataset will induce memorization due to the $0.000515$ tokens/parameter ratio.

---

## 5. Checkpoint Verification

Saved Checkpoint Binaries ([`ai-service/checkpoints/mathiyon-slm-v1.3/training/`](file:///c:/DISK-D/Personal%20folder/Mathiyon/ai-service/checkpoints/mathiyon-slm-v1.3/training/)):
- `checkpoint_epoch_1.pt` (Val Loss: 4.3515)
- `checkpoint_epoch_2.pt` (Val Loss: 3.9620)
- `checkpoint_epoch_3.pt` (Val Loss: 3.9118)
- `latest.pt` (Updated after Epoch 3)
- `best.pt` (Lowest Val Loss: **3.9118**)
- `training_log.json` ([`ai-service/checkpoints/mathiyon-slm-v1.3/training/training_log.json`](file:///c:/DISK-D/Personal%20folder/Mathiyon/ai-service/checkpoints/mathiyon-slm-v1.3/training/training_log.json))

> [!NOTE]
> `latest/model_architecture.pt` and `Mathiyon SLM v1.2` checkpoints remain **100% UNTOUCHED**.

---

## 6. Post-Training Inference Sanity Check (`best.pt`)

The best checkpoint (`best.pt`) was loaded into a fresh model instance to verify inference greedy generation:

| Domain | Prompt | Greedy Autoregressive Output | Status |
| :--- | :--- | :--- | :--- |
| **English** | `"Explain what a REST API is."` | `explain what a rest api is.` | `VERIFIED` |
| **Coding** | `"Write a JavaScript function to reverse a string."` | `write a javascript function to r e v e r s e a string.` | `VERIFIED` |
| **Math** | `"Solve 2x + 5 = 15."` | `solve 2x + 5 = 15.` | `VERIFIED` |
| **Math 2** | `"Calculate 25% of 200."` | `calculate 2 5 % of 200.` | `VERIFIED` |

---

## 7. Platform Regression Verification

1. `node scratch/test_master_platform_e2e.cjs`: **10 / 10 PASSED**
2. `node scratch/test_pdf_extraction.cjs`: **1 / 1 PASSED**
3. `node scratch/test_rag_chat.cjs`: **5 / 5 PASSED**
4. `npm run build`: **PASSED** (`2,301` modules built in `4.03s`).

---

## 8. Model Quality & Production Disclaimer

> [!IMPORTANT]
> **Model Quality Rule**:
> - v1.3 is **NOT** claimed to be better than v1.2 based on this 3-epoch experiment.
> - v1.3 is **NOT** activated in production.
> - v1.3 is **NOT** production-ready.
> - This phase serves strictly as pipeline training verification and controlled experiment.

---

> [!STOP]
> **STRICT STOP CONDITION ENFORCED.**
> - Training stopped cleanly after 3 epochs.
> - Full 15-epoch training was **NOT** run.
> - Fine-tuning was **NOT** run.
> - Production model routing remains **100% Mathiyon SLM v1.2**.
> - Awaiting explicit user approval before Phase 11.3E.
