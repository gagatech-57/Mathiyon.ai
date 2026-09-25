# MATHIYON AI — PHASE 12.3 API INVENTORY

**Branch:** `phase-12-3-real-time-web-agent`  
**Date:** September 25, 2026  
**Services Monitored:** Express Backend Server (`http://localhost:5000`), PyTorch FastAPI Service (`http://localhost:8000`)  

---

## 1. EXPRESS BACKEND API INVENTORY (`http://localhost:5000`)

| METHOD | PATH | AUTH REQUIRED | REQUEST BODY | RESPONSE PAYLOAD | ERROR RESPONSES | GOVERNANCE STATUS | TEST STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | No | None | `{ status: "online", platform: "Mathiyon AI Node.js Express API Server", database: "MongoDB" }` | 500 Internal Error | Health Check | **PASS** |
| `POST` | `/api/auth/register` | No | `{ name, email, password }` | `{ success: true, user: { id, name, email }, token }` | 400 Bad Request | Auth Signup | **PASS** |
| `POST` | `/api/auth/login` | No | `{ email, password }` | `{ success: true, user: { id, name, email }, token }` | 401 Unauthorized | Auth Login | **PASS** |
| `GET` | `/api/auth/me` | Yes (`Bearer JWT`) | None | `{ success: true, user: { _id, name, email } }` | 401 Unauthorized | Profile Retrieval | **PASS** |
| `POST` | `/api/chat` | Yes (`Bearer JWT`) | `{ conversationId?, message, model?, documentIds?, enableWebSearch? }` | `{ success: true, conversationId, response, answer, intent, toolsUsed, sources, citations, verified, requestId, totalLatencyMs, agentTrace, taskModel }` | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 500 Internal Error | **Main Agent Multi-Tool Pipeline Endpoint** | **PASS** |
| `GET` | `/api/chat/conversations` | Yes (`Bearer JWT`) | None | `{ success: true, count, conversations: [...] }` | 401 Unauthorized | User History List | **PASS** |
| `GET` | `/api/chat/conversations/:id` | Yes (`Bearer JWT`) | None | `{ success: true, conversation, messages: [...] }` | 401 Unauthorized, 403 Forbidden, 404 Not Found | Message History | **PASS** |
| `POST` | `/api/chat/conversations` | Yes (`Bearer JWT`) | `{ title? }` | `{ success: true, conversation: { _id, title, userId } }` | 401 Unauthorized | New Chat Session | **PASS** |
| `POST` | `/api/math/solve` | Yes (`Bearer JWT`) | `{ question, difficulty? }` | `{ success: true, problem, solution, formattedResult, verified }` | 400 Bad Request, 401 Unauthorized | SymPy Math Gateway | **PASS** |
| `POST` | `/api/files/upload` | Yes (`Bearer JWT`) | `multipart/form-data` | `{ success: true, document: { id, filename, mimeType, chunksCount } }` | 400 Bad Request, 401 Unauthorized | RAG Upload | **PASS** |
| `POST` | `/api/files/:id/reprocess` | Yes (`Bearer JWT`) | None | `{ success: true, message, chunksCount }` | 401 Unauthorized, 403 Forbidden, 404 Not Found | RAG Index Reprocess | **PASS** |
| `GET` | `/api/files` | Yes (`Bearer JWT`) | None | `{ success: true, documents: [...] }` | 401 Unauthorized | Document Inventory | **PASS** |
| `POST` | `/api/files/search` | Yes (`Bearer JWT`) | `{ query, documentIds?, topK? }` | `{ success: true, results: [{ content, score, citation }] }` | 400 Bad Request, 401 Unauthorized | Vector Search | **PASS** |
| `DELETE` | `/api/files/:id` | Yes (`Bearer JWT`) | None | `{ success: true, message }` | 401 Unauthorized, 403 Forbidden, 404 Not Found | Document Deletion | **PASS** |
| `GET` | `/api/memory` | Yes (`Bearer JWT`) | None | `{ success: true, memories: [...] }` | 401 Unauthorized | Memory Retrieval | **PASS** |
| `POST` | `/api/memory` | Yes (`Bearer JWT`) | `{ content, category? }` | `{ success: true, memory: { id, content, userId } }` | 400 Bad Request, 401 Unauthorized | Memory Save | **PASS** |
| `DELETE` | `/api/memory/:id` | Yes (`Bearer JWT`) | None | `{ success: true, message }` | 401 Unauthorized, 403 Forbidden | Memory Removal | **PASS** |
| `POST` | `/api/ai/generate` | Yes (`Bearer JWT`) | `{ prompt, model? }` | `{ success: true, model, prompt, response }` | 400 Bad Request, 401 Unauthorized | AI Gateway Route | **PASS** |

---

## 2. PYTORCH FASTAPI AI SERVICE INVENTORY (`http://localhost:8000`)

| METHOD | PATH | AUTH REQUIRED | REQUEST BODY | RESPONSE PAYLOAD | ERROR RESPONSES | GOVERNANCE ROLE | TEST STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | No | None | `{ status: "ok", service: "Mathiyon AI", version: "1.3.0", device: "cpu/cuda" }` | 500 Internal Error | Health Check | **PASS** |
| `GET` | `/models` | No | None | `{ activeModel: "mathiyon-slm-v1.2", defaultModel: "mathiyon-slm-v1.2" }` | 500 Internal Error | Model Registry Inspection | **PASS** |
| `POST` | `/math/solve` | No | `{ question, difficulty? }` | `{ problem, solution, is_symbolic, verified }` | 400 Bad Request, 500 Internal Error | SymPy Solver Gateway | **PASS** |
| `POST` | `/generate` | No | `{ message, conversation?, max_new_tokens?, temperature? }` | `{ response, model: "mathiyon-slm-v1.2", tokens_processed, tokens_generated }` | 400 Bad Request, 500 Internal Error | **Production Default Serving Model (100% Traffic)** | **PASS** |
| `POST` | `/generate/v1.3` | No | `{ prompt?, max_new_tokens?, use_kv_cache? }` | `{ model: "mathiyon-slm-v1.3", experimental: true, response }` | 400 Bad Request, 500 Internal Error | **Experimental Test Endpoint (0% Production Traffic)** | **PASS** |
| `POST` | `/embed` | No | `{ text }` | `{ success: true, embedding: [...], dimension: 384 }` | 400 Bad Request | Single Vector Embedding | **PASS** |
| `POST` | `/embedBatch` | No | `{ texts: [...] }` | `{ success: true, embeddings: [...], count, dimension: 384 }` | 400 Bad Request | Batch Vector Embeddings | **PASS** |
