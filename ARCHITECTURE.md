# Mathiyon AI — System Architecture (Phase 5 → Phase 10)

Mathiyon AI is a unified, production-grade AI platform architecture.

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

## 🛠️ Platform Components

1. **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion.
2. **Express Gateway (Port 5000)**: JWT security, Rate limiting, Request tracing (`requestId`), Tool orchestration.
3. **Database**: MongoDB (Mongoose) storing `User`, `Conversation`, `Message`, `Document`, `DocumentChunk`, `Memory`.
4. **AI Inference Service (Port 8000)**: Python FastAPI + PyTorch SLM v1.2 (`AI_DEVICE=auto`).
5. **Mathematics Engine**: SymPy 1.14.0 exact rational arithmetic, step-by-step verification across 21 domains.
6. **Vector RAG Engine**: 384-dimensional dense vector embeddings with exact cosine similarity matching.
7. **Tool Registry**: Modular input-validated tool execution registry (`mathTool`, `ragTool`, `slmTool`, `memoryTool`, `codeTool`, `webSearchTool`, `visionTool`, `voiceTool`).
