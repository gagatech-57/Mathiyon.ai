# MATHIYON AI — PHASE 12.3 ARCHITECTURE AUDIT

**Branch:** `phase-12-3-real-time-web-agent`  
**Date:** September 25, 2026  
**Scope:** Real-Time Web Intelligence, Multi-Tool Chaining, Citation System & Live Agent Events Audit  
**Production Model:** Mathiyon SLM v1.2 (100% Production Default Traffic)  
**Experimental Model:** Mathiyon SLM v1.3-RC1 (0% Production Traffic Default)  

---

## 1. EXISTING WEB TOOL & ORCHESTRATOR AUDIT

### A. Web Search Tool (`server/services/tools/webSearchTool.js`)
- Currently accepts a query string, strips keywords, and returns mock search results.
- **Phase 12.3 Hardening Need:**
  - Input validation: sanitize whitespace, limit query length (200 chars max), block credential/command injection.
  - SSRF protection: block target IPs (`127.0.0.1`, `localhost`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - URL scheme validation: allow only `https:` and `http:`.
  - Output normalization: return standardized `{ success, tool: "web", data: { query, results: [{ title, url, snippet, source }] }, error, metadata }`.
  - Single retry on safe idempotent searches and strict timeout (`WEB_TIMEOUT_MS = 10000`).

### B. Citation & Source System
- Currently appends basic string list `[Web Source: title] (url)`.
- **Phase 12.3 Hardening Need:**
  - Standardize structured citations array: `citations: [{ id, title, url, domain }]`.
  - Deduplicate URLs and domain sources.
  - Render clickable, secure source cards in the React frontend with safe link handlers (`rel="noopener noreferrer"`).
  - Never fabricate fake citations if search returns zero results.

### C. Multi-Tool Chaining Pipelines
- **Web + Math:** "Search current USD to INR rate and calculate $100 in INR" -> `WEB` (extract rate) -> `MathEngine` (SymPy calculation) -> `SLM` (explanation) -> `Citations`.
- **Web + RAG:** "Compare uploaded document with latest online information" -> `RAG` -> `WEB` -> `SLM` -> `Citations`.
- **Web + Code:** "Search latest React docs and generate component code" -> `WEB` -> `CodeEngine/SLM` -> `Citations`.
- **Web + Memory:** "Search web based on user project preferences" -> `Memory` -> `WEB` -> `SLM` -> `Citations`.
- **RAG + Web + Math:** "Read uploaded PDF, search external benchmark, calculate ratio" -> `RAG` -> `WEB` -> `MathEngine` -> `SLM`.

### D. Live Agent Events & Frontend Execution Status
- Currently returns `toolsTrace` array upon request completion.
- **Phase 12.3 Hardening Need:**
  - Expose live execution events (`stage`, `tool`, `status`, `label`, `latencyMs`) during agent processing.
  - Render agent status indicators in Chat UI (`"Understanding request..."`, `"Searching web..."`, `"Calculating..."`, `"Preparing response..."`).
  - Strict security: **zero chain-of-thought, zero credential logging**.

---

## 2. TARGET ARCHITECTURE DIAGRAM

```
                                USER
                                  |
                                  v
                            REACT FRONTEND
                  (Live Agent Status & Source Cards)
                                  |
                            EXPRESS API
                                  |
                           AI ORCHESTRATOR
                                  |
                          INTENT CLASSIFIER
                  (WEB, WEB+MATH, RAG+WEB, etc.)
                                  |
                        MULTI-TOOL PLANNER
                  (Sequential + dependsOn Steps)
                                  |
                    +-------------+-------------+
                    |             |             |
                    v             v             v
                WEB TOOL    MATH ENGINE     RAG TOOL
               (SSRF Safe)    (SymPy)       (Vector)
                    |             |             |
                    +-------------+-------------+
                                  |
                          RESULT VALIDATOR
                   (Deduplication & Citation Sync)
                                  |
                          RESPONSE COMPOSER
                                  |
                           SLM GENERATOR
                     (Mathiyon SLM v1.2 Default)
                                  |
                    FINAL ANSWER + CITATIONS
```

- **Production Safety:** Mathiyon SLM v1.2 remains 100% production default. v1.3-RC1 remains 0% production traffic. No chain-of-thought exposed.
