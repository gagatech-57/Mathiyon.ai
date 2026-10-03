# Mathiyon AI Phase 11 Plan

This document represents the comprehensive audit of the Mathiyon AI platform baseline (commit `ba55568`, branch `phase-11-slm-v1.3`) and outlines the proposed architecture, training, evaluation, and rollback strategy for **Mathiyon SLM v1.3**.

> [!IMPORTANT]
> **Audit Only**: No existing code, configuration, database schemas, APIs, or model weights have been modified, deleted, or retrained. `checkpoints/mathiyon-slm-v1.2/` remains 100% untouched as the verified stable baseline.

---

## Current Architecture

The Mathiyon AI platform is structured as a modular 5-tier architecture:

```
                         MATHIYON AI PLATFORM
                                  │
                  AI ORCHESTRATOR (aiOrchestrator.js)
                                  │
       ┌──────────┬───────────────┼───────────────┬──────────────┐
       ▼          ▼               ▼               ▼              ▼
   Math Engine   RAG          WebSearch        Memory        Code Engine
       │          │               │               │              │
       └──────────┴───────────────┼───────────────┴──────────────┘
                                  │
                             Tool Results
                                  │
                           Response Builder
                                  │
                     Mathiyon PyTorch SLM v1.2
                                  │
                   Unified API Response + Citations
```

### Component Summary:
1. **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion. Features dark/light themes, sidebar drawer, document picker, tool badges (`📄 RAG`, `🧮 Math Engine`, `🧠 Mathiyon SLM`, `🌐 Web Search`, `💾 Memory`), and Memory Manager UI.
2. **Express API Gateway (Port 5000)**: `server.js` with CORS, JWT protection (`authMiddleware.js`), rate limiting, request tracing (`requestId`), and MongoDB controllers (`authController.js`, `chatController.js`, `fileController.js`, `mathController.js`, `memoryController.js`).
3. **Database Layer**: MongoDB + Mongoose managing `User`, `Conversation`, `Message`, `Document`, `DocumentChunk`, and `Memory` collections with strict `userId` security checks (Part 6 & Part 8 HTTP 403 authorization).
4. **AI Inference Service (Port 8000)**: Python FastAPI (`ai-service/app.py`) with `GET /health`, `GET /models`, `POST /generate`, `POST /math/solve`, `POST /embed`, and `POST /embedBatch`.
5. **AI Tool Orchestrator**: `server/services/aiOrchestrator.js` & `server/services/tools/` executing intent detection (`GENERAL`, `MATH`, `DOCUMENT`, `DOCUMENT_MATH`, `CODE`, `DOCUMENT_CODE`, `WEB_SEARCH`, `CONVERSATION`, `MEMORY`, `MULTI_TOOL`).
6. **Mathematics Engine**: SymPy 1.14.0 exact rational arithmetic, step-by-step verification, and formula breakdown across 21 math domains (`ai-service/math_engine/`).
7. **Vector RAG System**: 384-dimensional dense vector embeddings with L2 normalization, document chunking (`CHUNK_SIZE = 800`, `CHUNK_OVERLAP = 100`), top-K cosine similarity search, and source citations (`Source: file.pdf — Page X`).
8. **Memory System**: Short-term sliding context window (`RECENT_MESSAGE_LIMIT = 20`), automatic conversation summarization, and MongoDB long-term memory store (`Memory.js` & `memoryService.js`).
9. **Web Intelligence**: Real-time web search tool (`webSearchTool.js`) with structured web source formatting (`{ title, url, snippet }`).
10. **Multimodal Boundaries**: Normalized input router (`inputRouter.js`), vision processing boundary (`visionService.js` — `NOT CONFIGURED`), and voice processing boundary (`voiceTool.js` — `READY FOR PROVIDER`).

---

## Current SLM v1.2

The audit of the active PyTorch Small Language Model (`ai-service/models/transformer.py`, `ai-service/config/settings.py`, and `checkpoints/mathiyon-slm-v1.2/latest/`) reveals the following verified specifications:

| Parameter / Specification | Verified Value in Codebase |
| :--- | :--- |
| **Architecture** | PyTorch Causal Transformer Encoder (`MathiyonSLM`) |
| **Active Checkpoint Path** | `checkpoints/mathiyon-slm-v1.2/latest/model.pt` |
| **Total Parameters** | **7,434,632** (~7.43M parameters) |
| **Number of Layers (`num_layers`)** | **6** |
| **Hidden Dimension (`d_model`)** | **256** |
| **Attention Heads (`nhead`)** | **8** |
| **Feed-Forward Dimension (`dim_feedforward`)** | **1024** (`d_model * 4`) |
| **Vocabulary Size (`vocab_size`)** | **5,000** |
| **Context Length (`max_seq_len`)** | **512** |
| **Tokenizer Type** | Subword Vocabulary Tokenizer (`MathiyonTokenizer` in `bpe_tokenizer.py`) |
| **Positional Encoding** | Learned Positional Embeddings (`nn.Embedding(max_seq_len, d_model)`) |
| **Normalization** | LayerNorm (`nn.TransformerEncoderLayer`) |
| **Activation Function** | GELU / ReLU |
| **Training Objective** | Causal Language Modeling Cross-Entropy Loss (`nn.CrossEntropyLoss`) |
| **Optimizer** | AdamW (`lr=1e-3`, `weight_decay=0.01`) |
| **LR Scheduler** | CosineAnnealingLR |
| **Batch Size** | **8** |
| **Pretraining Epochs** | **15** |
| **Fine-Tuning Epochs** | **2** (Instruction Fine-Tuning) |
| **Hardware Device** | `AI_DEVICE=auto` (CPU Safe Fallback active, CUDA GPU auto-detected) |

---

## Dataset Audit

Inspection of `ai-service/data/` reveals the following training dataset structure:

### 1. Raw Data (`ai-service/data/raw/`)
- `general_english.txt`: **1,509 bytes** — General English conversational dialogue sentences.
- `instruction_pairs.json`: **24,543 bytes** — 60 instruction-response JSON pairs.
- `math_science.txt`: **954 bytes** — Math definitions, formulas, and scientific statements.
- `programming_code.txt`: **1,387 bytes** — React, JavaScript, TypeScript, Python, and Node.js code snippets.
- `tamil_corpus.txt`: **2,648 bytes** — Tamil & Tanglish conversational phrases.

### 2. Cleaned Data (`ai-service/data/cleaned/`)
- `general_english.txt`: **1,519 bytes**
- `math_science.txt`: **962 bytes**
- `programming_code.txt`: **1,257 bytes**
- `tamil_corpus.txt`: **2,656 bytes**

### 3. Processed Splits (`ai-service/data/processed/`)
- `train.json`: **5,718 bytes** (Pretraining token sequences).
- `val.json`: **296 bytes** (Validation set sequences).
- `test.json`: **729 bytes** (Test evaluation sequences).

### 4. Cleaning & Duplicate Handling
- Tokenization via regex matching (`[\u0b80-\u0bff\w]+|[^\w\s]|\s`).
- Case normalization (`text.lower()`).
- Basic whitespace deduplication.

---

## Evaluation Audit

The platform evaluation suite was audited using `scratch/test_master_platform_e2e.cjs`, `checkpoints/mathiyon-slm-v1.2/latest/evaluation_v1.2.json`, `scratch/test_pdf_extraction.cjs`, and `scratch/test_rag_chat.cjs`:

### 1. Verified Benchmark Metrics (`evaluation_v1.2.json`)
- **Total Prompts Tested**: 120 prompts across 6 categories.
- **Overall Avg Latency**: **94.12 ms**.
- **Overall Avg Softmax Confidence**: **0.3498** (~35.0%).
- **Category Summary**:
  - *General Q&A*: 20 prompts, 88.87 ms avg, 38.26% avg confidence.
  - *Coding*: 20 prompts, 98.08 ms avg, 34.12% avg confidence.
  - *Mathematics*: 20 prompts, 99.45 ms avg, 34.63% avg confidence.
  - *Tamil Language*: 20 prompts, 91.39 ms avg, 34.37% avg confidence.
  - *English Conversation*: 20 prompts, 92.65 ms avg, 34.94% avg confidence.
  - *Instruction Following*: 20 prompts, 94.30 ms avg, 33.59% avg confidence.

### 2. Verified Test Suite Results
- **Master Platform Test (`test_master_platform_e2e.cjs`)**: **10 / 10 PASSED** (Normal Chat, Math Engine, Document RAG, Document+Math, Missing Info Protection, Long-term Memory, Multi-tool Pipeline, Security 403 Document, Security 403 Memory, Web Search).
- **PDF Extraction Test (`test_pdf_extraction.cjs`)**: **5 / 5 Assertions PASSED** (100% exact text extraction).
- **RAG Security & Chat Test (`test_rag_chat.cjs`)**: **7 / 7 PASSED** (100% citation & authorization security pass).

---

## Verified Weaknesses

Based strictly on empirical evidence in `training_history_v1.2.json`, `evaluation_v1.2.json`, and source code inspection:

1. **VERIFIED WEAKNESS 1 (Validation Overfitting)**:
   - In `training_history_v1.2.json`, training loss decreases steadily from `6.2540` to `4.0377`, but validation loss increases from `7.0093` (Epoch 1) to `8.0949` (Epoch 4), driving validation perplexity up to `3277.80`. This proves overfitting due to small corpus size (~31 KB total raw text) relative to a 7.43M parameter model.
2. **VERIFIED WEAKNESS 2 (Raw Probability Calibration)**:
   - Softmax output probabilities average only `34.98%` across test prompts (`evaluation_v1.2.json`). The raw model logits are uncalibrated and require temperature tuning or explicit probability calibration.
3. **VERIFIED WEAKNESS 3 (Pattern Rule Fallback Dependence in `generator.py`)**:
   - `MathiyonGenerator.generate()` contains hardcoded regex pattern matching branches (e.g. `elif "explain react" in lower_msg: ...`) to guarantee high-quality code blocks. Without these fallbacks, pure autoregressive generation produces repetitive tokens because the model has not been trained on millions of code tokens.
4. **VERIFIED WEAKNESS 4 (Tamil Subword Fragmentation)**:
   - In `bpe_tokenizer.py`, Tamil words not present in the seed vocabulary are broken down character-by-character (e.g. `ம`, `தி`, `யோ`, `ன்`), significantly increasing sequence length and token count for Tamil sentences.

---

## Potential Improvements

1. **Dataset Expansion**: Scale training corpus from ~31 KB to 50 MB+ of curated technical documentation, React/TypeScript code samples, mathematical step-by-step proofs, and parallel Tamil/Tanglish conversations.
2. **Tokenizer Enhancement**: Implement true Byte-Pair Encoding (BPE) or SentencePiece subword tokenization with an 8,000 token vocabulary optimized for native Tamil script and code syntax.
3. **Model Architecture Upgrade**: Introduce Rotary Positional Embeddings (RoPE), RMSNorm, and SwiGLU activation functions for enhanced long-context attention stability.
4. **Tool & RAG Instruction Tuning**: Train the SLM to produce structured JSON tool calls (`{"tool": "MathEngine", "query": "2x+5=15"}`) and synthesize RAG contexts natively.

---

## v1.3 Architecture Proposal

| Component | Mathiyon SLM v1.2 (Current Baseline) | Mathiyon SLM v1.3 (Proposed) |
| :--- | :--- | :--- |
| **Model Name** | `Mathiyon SLM v1.2` | `Mathiyon SLM v1.3` |
| **Total Parameters** | ~7.43M | **~14.8M** |
| **Layers (`num_layers`)** | 6 | **8** |
| **Hidden Dim (`d_model`)** | 256 | **384** |
| **Attention Heads (`nhead`)** | 8 | **12** |
| **Feed-Forward Dim** | 1024 | **1536** |
| **Vocab Size** | 5,000 | **8,000** |
| **Context Length** | 512 | **1024** |
| **Positional Embedding** | Learned Absolute Positional Embedding | **Rotary Positional Embeddings (RoPE)** |
| **Normalization** | LayerNorm | **RMSNorm** |
| **Activation** | GELU | **SwiGLU** |

---

## v1.3 Training Plan

1. **Stage 1: Pretraining Corpus Assembly (10 MB+)**
   - Technical documentation (React 19, Express, PyTorch, SymPy, MongoDB).
   - Tamil literature & Tanglish conversational datasets.
   - Mathematical word problems and step-by-step derivations.
2. **Stage 2: Tokenizer Retraining**
   - Train `bpe_tokenizer.py` on 10 MB corpus with 8,000 target vocab size.
   - Measure UNK token rate across test samples (target: `< 0.1%`).
3. **Stage 3: Pretraining (15 Epochs)**
   - Mixed precision (FP16 on CUDA / FP32 on CPU fallback).
   - AdamW (`lr=5e-4`, `weight_decay=0.01`), Cosine Annealing with Warmup (100 steps).
   - Monitor train loss, validation loss, and perplexity to prevent overfitting.
4. **Stage 4: Structured Instruction Fine-Tuning (3 Epochs)**
   - Fine-tune on 2,000+ instruction-response pairs formatted with `<BOS>`, `Instruction:`, `Context:`, `Response:`, `<EOS>`.

---

## v1.3 Evaluation Plan

1. **Benchmarking Suite Expansion**: Expand evaluation set from 120 to 250 prompts.
2. **Comparative Metrics**:
   - Validation Perplexity (`v1.2` vs `v1.3`).
   - Exact-Match Math Correctness (via SymPy verification).
   - UNK Token Rate for Tamil & Tanglish text.
   - Mean Latency (ms per token).
   - Tool Intent Classification Accuracy.
3. **Automated Regression Test**: Run `scratch/test_master_platform_e2e.cjs` to confirm 100% pass rate.

---

## Rollback Strategy

1. **Checkpoint Preservation**: `checkpoints/mathiyon-slm-v1.2/` remains permanently preserved and untouched.
2. **Isolated Checkpoint Directory**: v1.3 weights will be saved strictly into `checkpoints/mathiyon-slm-v1.3/latest/`.
3. **Instant Fallback Switch**: If v1.3 fails any benchmark criteria, `settings.py` or environment variable `MODEL_NAME="Mathiyon SLM v1.2"` instantly reverts inference back to v1.2 without server downtime.

---

## Risks

| Risk Factor | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **High CPU Inference Latency** | Parameter increase from 7.4M to 14.8M may increase CPU latency from 94ms to 180ms. | Enable PyTorch TorchScript JIT compilation / FP16 quantization. |
| **Overfitting on Fine-Tuning Data** | Small instruction datasets lead to high validation loss. | Apply dropout (0.15), weight decay (0.02), and early stopping. |
| **Tokenizer Incompatibility** | Changing vocab size from 5,000 to 8,000 breaks v1.2 checkpoints. | Store versioned tokenizer files (`tokenizer_v1.3.json`) alongside checkpoints. |

---

## Implementation Order

```
[PHASE 11 AUDIT & PLAN] (COMPLETE)
           │
           ▼
[PHASE 11.1] Dataset Curation & Tokenizer Training (8,000 Vocab)
           │
           ▼
[PHASE 11.2] Model Architecture Definition (14.8M Params, RoPE, RMSNorm)
           │
           ▼
[PHASE 11.3] PyTorch Pretraining & Instruction Fine-Tuning
           │
           ▼
[PHASE 11.4] Model Registry Registration & FastAPI Integration
           │
           ▼
[PHASE 11.5] Benchmark Evaluation & v1.2 vs v1.3 Comparative Audit
```
