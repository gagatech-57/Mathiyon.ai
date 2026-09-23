# Mathiyon AI — Tool Registry & Intent Routing (Phase 5)

Mathiyon AI uses a centralized Tool Registry managed by `server/services/aiOrchestrator.js`.

---

## 🛠️ Tool Registry Specification

| Tool Name | Service File | Inputs | Purpose / Capabilities | Output Format |
| :--- | :--- | :--- | :--- | :--- |
| **MathEngine** | `server/services/tools/mathTool.js` | `{ question }` | SymPy 1.14.0 exact arithmetic, algebra, calculus | `{ type: "math", result: "...", verified: true }` |
| **RAG** | `server/services/tools/ragTool.js` | `{ userId, query, documentIds, topK }` | 384-d dense vector search across MongoDB document chunks | `{ type: "document", context: "...", sources: [...] }` |
| **Mathiyon SLM** | `server/services/tools/slmTool.js` | `{ message, conversation }` | PyTorch SLM v1.2 neural text generation & synthesis | `{ type: "slm", response: "...", model: "..." }` |
| **Memory** | `server/services/tools/memoryTool.js` | `{ userId, action, query, content }` | Context windowing & long-term memory CRUD | `{ type: "memory", action: "...", memories: [...] }` |
| **CodeEngine** | `server/services/tools/codeTool.js` | `{ code, query }` | Code comprehension, syntax inspection, explanation | `{ type: "code", language: "...", lineCount: N }` |
| **WebSearch** | `server/services/tools/webSearchTool.js` | `{ query }` | Real-time web search for fresh docs & news | `{ type: "web_search", results: [...], sources: [...] }` |
| **VisionEngine** | `server/services/tools/visionTool.js` | `{ imageUrl }` | Multimodal vision & OCR boundary (`NOT CONFIGURED`) | `{ status: "NOT CONFIGURED" }` |
| **VoiceEngine** | `server/services/tools/voiceTool.js` | `{ audioData }` | Speech STT/TTS interface boundary (`READY FOR PROVIDER`) | `{ status: "READY FOR PROVIDER" }` |

---

## 🧭 Supported Routing Intents

- `GENERAL`: Standard prompt handled by Mathiyon SLM.
- `MATH`: Arithmetic & equations routed deterministically to SymPy Math Engine.
- `DOCUMENT`: PDF/Document query routed through 384-d dense vector search.
- `DOCUMENT_MATH`: Multi-tool pipeline combining RAG retrieval and SymPy Math Engine calculation.
- `CODE`: Code snippet explanation and syntax analysis.
- `WEB_SEARCH`: Real-time web search for current events, tech versions, or online docs.
- `CONVERSATION`: Greetings and casual dialogue.
- `MEMORY`: Long-term fact storage ("Remember that...") or context retrieval.
