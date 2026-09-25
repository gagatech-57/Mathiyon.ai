# Mathiyon AI - Phase 12.7 Architecture Freeze

## Executive Summary
This document formalizes the architecture freeze for Mathiyon AI as part of Phase 12.7 (Production Agent Release Candidate). The baseline architecture is locked across all tiers (Frontend, Express API Server, Python FastAPI AI Service, Persistence Engines, and Tool Ecosystem).

---

## 1. System Topology & Tiers

```
[ Frontend: React 18 / Vite ]
            │ (HTTP REST / JSON / EventStream)
            ▼
[ Backend API: Express 4.x / Node.js v22 ]
   │                 │                    │
   ├── JWT Auth      ├── MongoDB Mongoose  └── AI Orchestrator (JS)
   └── Rate Limit    │   (Indexes locked)            │
                     └── Redis (Optional/Cached)     │ HTTP REST
                                                     ▼
                                      [ AI Service: FastAPI / Python 3.12 ]
                                         │            │             │
                                         ▼            ▼             ▼
                                     PyTorch     SymPy Math      DuckDuckGo /
                                    SLM Engine     Engine       BeautifulSoup
```

---

## 2. Model Baseline & Production Routing

| Model Identifier | Deployment State | Production Traffic % | Default Route | Purpose / Status |
| :--- | :--- | :--- | :--- | :--- |
| `mathiyon-slm-v1.2` | Active Production Baseline | **100%** | `POST /generate` | Main inference model for standard, math, code, RAG, memory, and web synthesis. |
| `mathiyon-slm-v1.3-RC1` | Experimental Release Candidate | **0%** | `POST /generate/v1.3` | Experimental candidate with KV-cache optimization; isolated from production traffic. |

### Routing Enforcement Rules
- **General Queries**: Defaults strictly to `mathiyon-slm-v1.2` via `aiOrchestrator.js`.
- **Math Queries**: Intercepted by `sympyEngine.js` for symbolic computation, formatted by `v1.2`.
- **Coding Queries**: Intercepted by `codeEngine.js` for AST analysis/linting, formatted by `v1.2`.
- **Document Queries**: Vector/TF-IDF retrieval via `ragService.js`, formatted by `v1.2`.
- **Memory Queries**: Direct user memory lookup via `memoryService.js`, merged into prompt.
- **Web Queries**: Safe search via `webSearchService.js`, verified by `contextFusionEngine.js`.
- **Multi-Tool Queries**: Stepwise execution by `agentPlanner.js` (Max 10 steps), synthesized by `v1.2`.
- **Unknown / Fallback**: Safe graceful message response from `v1.2` or static fallback.

---

## 3. Agent Execution & Safety Boundaries

```
                 ┌─────────────────────────────┐
                 │    MAX_AGENT_STEPS = 10     │
                 └──────────────┬──────────────┘
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
┌──────────────────┐                       ┌──────────────────┐
│ TOOL_TIMEOUT_MS  │                       │   RETRY_LIMIT    │
│    = 10,000 ms   │                       │   = 2 Retries    │
└──────────────────┘                       └──────────────────┘
```

- **Step Limit**: Hard ceiling of **10 agent steps** per request.
- **Tool Timeout**: **10,000 ms** per individual tool call.
- **Request Timeout**: Express server timeout set to **30,000 ms**.
- **Context Fusion Hierarchy**:
  1. `MATH` (SymPy calculation - Absolute truth)
  2. `DOCUMENT` (User uploaded RAG documents)
  3. `CODE` (Syntax/AST verification)
  4. `WEB` (Live web search results with domain whitelist/redirection safety)
  5. `MEMORY` (Stored user memory facts)
  6. `CONVERSATION` (Chat history)
  7. `MODEL` (Parametric memory baseline)

---

## 4. Security & Privacy Boundaries

1. **Authentication & Authorization**:
   - Authentication enforced via standard JWT bearer tokens.
   - Resource access (Conversations, Messages, Memories, Documents, Chunks) strictly scoped by `userId`. Cross-user access returns `403 Forbidden` / `404 Not Found`.

2. **Web Security & SSRF Protection**:
   - Protocols permitted: `http`, `https` only.
   - Restricted domains/IPs: `localhost`, `127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `.local`, `.internal`.

3. **Telemetry & Log Redaction**:
   - Automatic regex scrubbing for Passwords, JWT Tokens, Bearer Header values, API Keys, Database URIs, and PII.
   - Non-blocking async telemetry worker decoupled from user HTTP responses.

---

## 5. Database Schema & Index Constraints

- **User**: Unique email index (`{ email: 1 }`).
- **Conversation**: Compound index (`{ userId: 1, updatedAt: -1 }`).
- **Message**: Compound index (`{ conversationId: 1, createdAt: 1 }`).
- **Memory**: Compound index (`{ userId: 1, key: 1 }`).
- **Document**: Compound index (`{ userId: 1, filename: 1 }`).
- **DocumentChunk**: Compound index (`{ documentId: 1, chunkIndex: 1 }`).

---

## 6. Architecture Status & Lock Confirmation
- Architecture Frozen: **YES**
- Model Weights Modified: **NO**
- Uncontrolled Agent Loop Vulnerabilities: **NONE OBSERVED**
