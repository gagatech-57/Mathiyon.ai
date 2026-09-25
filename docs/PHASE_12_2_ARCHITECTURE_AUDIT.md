# MATHIYON AI — PHASE 12.2 ARCHITECTURE AUDIT

**Branch:** `phase-12-2-production-ai-agent`  
**Date:** September 25, 2026  
**Scope:** AI Orchestrator & Multi-Tool Agent Architecture Audit  
**Production Model:** Mathiyon SLM v1.2 (100% Production Default Traffic)  
**Experimental Model:** Mathiyon SLM v1.3-RC1 (0% Production Traffic Default)  

---

## 1. EXISTING SYSTEM AUDIT

### A. Intent Detection System (`detectIntent`)
- Currently implemented in `server/services/aiOrchestrator.js`.
- Uses regular expression keyword matching to classify incoming queries into `CONVERSATION`, `DOCUMENT_MATH`, `DOCUMENT_CODE`, `DOCUMENT`, `MATH`, `CODE`, `WEB_SEARCH`, `MEMORY`, or `GENERAL`.
- **Phase 12.2 Enhancement Need:** Normalize into standard agent intents: `GENERAL`, `MATH`, `CODING`, `DOCUMENT`, `MEMORY`, `WEB`, `MULTI_TOOL`, `UNKNOWN`.

### B. Tool Registry Map (`TOOL_REGISTRY`)
- Maps tool names (`MathEngine`, `RAG`, `SLM`, `Memory`, `CodeEngine`, `WebSearch`, `VisionEngine`, `VoiceEngine`) to tool modules in `server/services/tools/`.
- Every tool exposes an `execute(input)` function.
- **Phase 12.2 Enhancement Need:** Standardize return schema to `{ success: boolean, tool: string, data: any, error: object | null, metadata: object }` with standardized error object `{ code: string, message: string }`.

### C. Single-Tool & Multi-Tool Routing
- **Math Routing:** Routes to `mathTool.js`, which sends request to SymPy FastAPI solver (`POST /math/solve`). SymPy remains the authoritative calculator.
- **RAG Routing:** Routes to `ragTool.js`, which queries `DocumentChunk` vector collection or in-memory chunk fallback using dense L2-normalized 384D embeddings (`POST /embedBatch`).
- **Memory Routing:** Routes to `memoryTool.js` and `memoryService.js` for saving explicit facts and retrieving relevant past user context.
- **Web Routing:** Routes to `webSearchTool.js` for fetching current live information.
- **Code Routing:** Routes to `codeTool.js` for syntax formatting, code snippet generation, and language analysis.
- **SLM Routing:** Routes to `slmTool.js` which connects to FastAPI PyTorch service (`POST /generate` for v1.2, `POST /generate/v1.3` for v1.3-RC1).
- **Phase 12.2 Enhancement Need:** Add sequential multi-tool task planning with explicit dependency management (`dependsOn`), context passing object, single-retry error recovery, and safe execution status events for the frontend.

### D. Error Handling & Security Boundary
- Cross-user document isolation checked in `ragTool.js` (returns HTTP 403 Forbidden on unauthorized access attempts).
- Unhandled tool exceptions are caught in `aiOrchestrator.js` try-catch block.
- **Phase 12.2 Enhancement Need:** Normalize tool error returns, implement tool timeout (`TOOL_TIMEOUT`), and prevent uncontrolled exception bubbles.

---

## 2. PHASE 12.2 TARGET ARCHITECTURE SUMMARY

```
                                USER
                                  |
                                  v
                            REACT FRONTEND
                                  |
                            EXPRESS API
                                  |
                           AI ORCHESTRATOR
                                  |
                          INTENT CLASSIFIER
                                  |
                            TASK PLANNER
                                  |
                           TOOL SELECTOR
                                  |
                           TOOL EXECUTION
                     (Sequential / Dependencies)
                                  |
                          RESULT VALIDATOR
                                  |
                          RESPONSE COMPOSER
                                  |
                           SLM GENERATOR
                                  |
                            FINAL RESPONSE
```

- **Production Rules:** Mathiyon SLM v1.2 remains 100% production default. v1.3-RC1 remains 0% production traffic. No chain-of-thought exposed. Safe execution metadata only.
