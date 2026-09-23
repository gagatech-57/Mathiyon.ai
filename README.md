# MATHIYON AI — Master AI Intelligence Platform (மதியோன் AI)

**MATHIYON AI** is a production-grade AI platform featuring **React 19 + TypeScript**, **Node.js Express AI Gateway**, **MongoDB Persistent Vector Storage**, **PyTorch Mathiyon SLM v1.2**, **SymPy Mathematics Engine**, **384-d Vector RAG**, **Central AI Orchestrator**, **Conversation Memory System**, and **Web Intelligence Search**.

---

## 🏗️ MASTER PLATFORM ARCHITECTURE

```
                         MATHIYON AI
                              │
                       AI ORCHESTRATOR (aiOrchestrator.js)
                              │
       ┌──────────┬───────────┼───────────┬──────────────┐
       ▼          ▼           ▼           ▼              ▼
   Math Engine   RAG      WebSearch    Memory        Code Engine
       │          │           │           │              │
       └──────────┴───────────┼───────────┴──────────────┘
                              │
                         Tool Results
                              │
                       Response Builder
                              │
                     Mathiyon PyTorch SLM v1.2
                              │
               Unified API Response + Citations
```

---

## 🚀 Key Platform Features

- **AI Orchestrator**: Dynamic intent routing (`GENERAL`, `MATH`, `DOCUMENT`, `DOCUMENT_MATH`, `CODE`, `WEB_SEARCH`, `CONVERSATION`, `MULTI_TOOL`).
- **Tool Registry**: Predefined, input-validated tools (`MathEngine`, `RAG`, `Mathiyon SLM`, `Memory`, `CodeEngine`, `WebSearch`, `VisionEngine`, `VoiceEngine`).
- **Deterministic Math Engine**: SymPy 1.14.0 verified computation across 21 math domains.
- **Vector RAG System**: 384-d dense vector embeddings, PDF text extraction preserving page boundaries, and page-level citations.
- **Conversation & Long-Term Memory**: Short-term context window, automatic conversation summarization, and MongoDB long-term memory store (`Memory.js`).
- **Web Intelligence Search**: Real-time web search tool returning structured web sources with exact URLs and titles.
- **Model Version Registry**: `GET /models` endpoint in Python FastAPI AI service with `AI_DEVICE=auto` (CUDA/CPU fallback).

---

## 🧪 Comprehensive Automated Test Suite

- `node scratch/test_master_platform_e2e.cjs` (All 10 mandatory platform test scenarios)
- `node scratch/test_pdf_extraction.cjs` (PDF text extraction test suite)
- `node scratch/test_rag_chat.cjs` (RAG chat, citation & 403 security test suite)
- `npm run build` (Production Vite bundle compilation)

---

## 📖 Documentation Index

- [ARCHITECTURE.md](file:///c:/DISK-D/Personal%20folder/Mathiyon/ARCHITECTURE.md)
- [TOOLS.md](file:///c:/DISK-D/Personal%20folder/Mathiyon/TOOLS.md)
- [MEMORY.md](file:///c:/DISK-D/Personal%20folder/Mathiyon/MEMORY.md)
- [RAG.md](file:///c:/DISK-D/Personal%20folder/Mathiyon/RAG.md)
- [MODEL_REGISTRY.md](file:///c:/DISK-D/Personal%20folder/Mathiyon/MODEL_REGISTRY.md)
- [SECURITY.md](file:///c:/DISK-D/Personal%20folder/Mathiyon/SECURITY.md)
- [EVALUATION.md](file:///c:/DISK-D/Personal%20folder/Mathiyon/EVALUATION.md)
