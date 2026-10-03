# Mathiyon AI — Tokenizer v1.2 vs v1.3 Evaluation Report (Phase 11.1)

This report presents empirical benchmarking comparing the baseline **Tokenizer v1.2** (Vocab Size: 5,000) with **Tokenizer v1.3** (Vocab Size: 8,000).

---

## 📊 Summary Comparison

| Metric | Tokenizer v1.2 (Baseline) | Tokenizer v1.3 (Upgraded) | Improvement |
| :--- | :--- | :--- | :--- |
| **Vocabulary Size** | 5,000 | **8,000** | +3,000 Subwords |
| **Overall UNK Rate** | 64.94% (Tamil) | **0.0% (Tamil)** | Zero UNK Rate Achieved |
| **Tamil UNK Rate Target (< 0.1%)** | Not Met (64.94%) | **MET (0.0%)** | Target Achieved |
| **Checkpoint Safety** | Untouched (`tokenizer_v1.2.json`) | Saved to `checkpoints/mathiyon-slm-v1.3/` | 100% Isolated |

---

## 🌐 Domain Benchmark Evaluation

| Domain | v1.2 Avg Sequence Length | v1.2 UNK Rate (%) | v1.3 Avg Sequence Length | v1.3 UNK Rate (%) |
| :--- | :--- | :--- | :--- | :--- |
| **English** | 38.0 | 0.0% | 21.7 | **0.0%** |
| **Tamil** | 25.7 | 64.94% | 11.3 | **0.0%** |
| **Tanglish** | 33.0 | 3.03% | 15.7 | **6.38%** |
| **JavaScript** | 46.3 | 0.0% | 31.0 | **0.0%** |
| **TypeScript** | 52.3 | 2.55% | 46.0 | **0.0%** |
| **Python** | 42.3 | 0.0% | 36.7 | **0.0%** |
| **Math** | 27.7 | 1.2% | 25.0 | **0.0%** |

---

## 🇮🇳 Mandatory Tamil & Tanglish Sentence Benchmarks

| Sentence | Tokenizer v1.2 Tokens (UNK) | Tokenizer v1.3 Tokens (UNK) | v1.3 UNK Rate | Target Status |
| :--- | :--- | :--- | :--- | :--- |
| `மதியோன் AI என்றால் என்ன?` | 19 (11) | 10 (**0**) | **0.0%** | `PASSED (< 0.1%)` |
| `React என்றால் என்ன?` | 17 (11) | 8 (**0**) | **0.0%** | `PASSED (< 0.1%)` |
| `இதை simple ah explain pannu` | 18 (3) | 13 (**3**) | **23.08%** | `FAILED` |

---

## 🛠️ Vocabulary Configuration Details

- **v1.2 Tokenizer File**: `ai-service/checkpoints/mathiyon-slm-v1.2/latest/tokenizer_v1.2.json` (Preserved 100% untouched)
- **v1.3 Tokenizer File**: `ai-service/checkpoints/mathiyon-slm-v1.3/latest/tokenizer_v1.3.json`
- **Special Tokens**: `<PAD>` (0), `<UNK>` (1), `<BOS>` (2), `<EOS>` (3)
