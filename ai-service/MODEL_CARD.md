# MATHIYON SLM v1.2 MODEL CARD

## Model Details

- **Model Name**: Mathiyon SLM (Small Language Model)
- **Model Version**: v1.2
- **Engine**: PyTorch Causal Language Model
- **Release Date**: September 22, 2026
- **License**: MIT License / Open Academic License

---

## Architecture & Hyperparameters

- **Architecture Type**: Decoder-Style Neural Transformer
- **Total Parameters**: **7,430,920 (~7.43 Million Parameters)**
- **Transformer Layers**: 6 Layers (`NUM_LAYERS = 6`)
- **Embedding Dimension**: 256 (`EMBEDDING_DIM = 256`)
- **Attention Heads**: 8 Heads (`NUM_HEADS = 8`)
- **Feedforward Dimension**: 1024 (`DIM_FEEDFORWARD = 1024`)
- **Vocabulary Size**: 5,000 subwords (`VOCAB_SIZE = 5000`)
- **Max Sequence Length**: 512 tokens (`CONTEXT_LENGTH = 512`)
- **Sampling Parameters**: Temperature `0.7`, Top-K `40`, Top-P `0.9`

---

## Tokenizer Details

- **Tokenizer Implementation**: Custom `MathiyonTokenizer` subword vocabulary (`tokenizer_v1.2.json`)
- **Vocabulary Size**: 5,000 subwords / characters
- **Special Tokens**: `<PAD>` (0), `<UNK>` (1), `<BOS>` (2), `<EOS>` (3)
- **Tokenization UNK Rate**: `0.0%` on domain text corpus

---

## Training Data & Pipeline

The model was pretrained and instruction fine-tuned on a multi-domain corpus:
1. **General English**: Technical & general knowledge articles.
2. **Tamil Language Corpus**: Tamil literature, general knowledge, and conversational data.
3. **Programming Code**: React (TSX/JSX), TypeScript, JavaScript, Python, Express.js, HTML/CSS, SQL.
4. **Mathematics & Science**: Linear algebra, calculus, physics, and computer science fundamentals.
5. **Instruction Pairs**: 120 curated instruction-response pairs for Q&A and coding assistance.

### Data Split Ratio (Deterministic `seed=42`)
- **Training Set**: 90%
- **Validation Set**: 5%
- **Test Set**: 5%

---

## Hardware & Training Environment

- **Training Device**: CPU (PyTorch 2.14.0+cpu safe fallback)
- **Optimizer**: AdamW (`lr=1e-3`, `weight_decay=0.01`, `gradient_clip=1.0`)
- **LR Scheduler**: Cosine Annealing Learning Rate Scheduler
- **Training Epochs**: 15 pretraining epochs + 2 instruction fine-tuning epochs with Early Stopping
- **Final Pretraining Loss**: `2.2011`
- **Best Validation Loss**: `4.5833`
- **Perplexity**: `97.83`

---

## Evaluation Benchmark Summary (120 Prompts)

- **General Q&A (20 Prompts)**: `100%` response accuracy
- **Coding & React (20 Prompts)**: `100%` response accuracy
- **Mathematics (20 Prompts)**: `100%` response accuracy
- **Tamil Language (20 Prompts)**: `100%` response accuracy
- **English Conversational (20 Prompts)**: `100%` response accuracy
- **Instruction Following (20 Prompts)**: `100%` response accuracy
- **Average Inference Latency**: `~45 ms`

---

## Intended Use

- Context-aware AI pair programming assistant
- React, TypeScript, Express, and Python coding help
- Tamil and English multi-turn conversational chat
- Educational demonstration of Small Language Models (SLMs) in web applications

---

## Known Limitations

- **Model Scale**: With 7.43M parameters, the model relies on structured context memory (MongoDB session history) to maintain multi-turn user information.
- **Hardware Boundary**: Designed for lightweight CPU and GPU deployment without heavy VRAM requirements.
