# MATHIYON AI — PHASE 12.1 API INVENTORY

**Branch:** `phase-12-1-full-stack-audit`  
**Date:** September 25, 2026  
**Services Monitored:** Express Backend Server (`http://localhost:5000`), PyTorch FastAPI Service (`http://localhost:8000`)  

---

## 1. EXPRESS BACKEND API INVENTORY (`http://localhost:5000`)

| METHOD | PATH | AUTH REQUIRED | REQUEST BODY | EXPECTED RESPONSE | ERROR RESPONSES | USER ISOLATION | TEST STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | No | None | `{ status: "online", platform: "Mathiyon AI Node.js Express API Server", database: "MongoDB" }` | 500 Internal Error | Public Health Check | **PASS** |
| `POST` | `/api/auth/register` | No | `{ name, email, password }` | `{ success: true, user: { id, name, email }, token }` | 400 Bad Request (Duplicate Email / Invalid Payload) | Creates new isolated user | **PASS** |
| `POST` | `/api/auth/login` | No | `{ email, password }` | `{ success: true, user: { id, name, email }, token }` | 401 Unauthorized (Invalid Credentials) | Authenticates target user | **PASS** |
| `GET` | `/api/auth/me` | Yes (`Bearer JWT`) | None | `{ success: true, user: { _id, name, email, createdAt } }` | 401 Unauthorized (Missing / Expired Token) | Returns authenticated user profile | **PASS** |
| `POST` | `/api/chat` | Yes (`Bearer JWT`) | `{ conversationId?, message, model?, documentIds?, enableWebSearch? }` | `{ success: true, conversationId, response, metadata, toolsUsed }` | 400 Bad Request, 401 Unauthorized, 500 Internal Error | Encapsulated strictly under `req.user._id` | **PASS** |
| `GET` | `/api/chat/conversations` | Yes (`Bearer JWT`) | None | `{ success: true, count, conversations: [...] }` | 401 Unauthorized | Filters strictly by `userId = req.user._id` | **PASS** |
| `GET` | `/api/chat/conversations/:id` | Yes (`Bearer JWT`) | None (URL Param: `id`) | `{ success: true, conversation, messages: [...] }` | 401 Unauthorized, 403 Forbidden, 404 Not Found | Verifies conversation `userId == req.user._id` | **PASS** |
| `POST` | `/api/chat/conversations` | Yes (`Bearer JWT`) | `{ title? }` | `{ success: true, conversation: { _id, title, userId } }` | 401 Unauthorized, 400 Bad Request | Binds new conversation to `req.user._id` | **PASS** |
| `POST` | `/api/math/solve` | Yes (`Bearer JWT`) | `{ problem, difficulty? }` | `{ success: true, problem, solution, formattedResult, verified }` | 400 Bad Request, 401 Unauthorized, 500 Internal Error | User execution logging | **PASS** |
| `POST` | `/api/files/upload` | Yes (`Bearer JWT`) | `multipart/form-data` (file) | `{ success: true, document: { id, filename, mimeType, chunksCount } }` | 400 Bad Request (No File / Unsupported Type), 401 Unauthorized | Binds uploaded document strictly to `req.user._id` | **PASS** |
| `POST` | `/api/files/:id/reprocess` | Yes (`Bearer JWT`) | None | `{ success: true, message, chunksCount }` | 401 Unauthorized, 403 Forbidden, 404 Not Found | Verifies document `userId == req.user._id` | **PASS** |
| `GET` | `/api/files` | Yes (`Bearer JWT`) | None | `{ success: true, documents: [...] }` | 401 Unauthorized | Queries strictly by `userId = req.user._id` | **PASS** |
| `POST` | `/api/files/search` | Yes (`Bearer JWT`) | `{ query, documentIds?, topK? }` | `{ success: true, results: [{ content, score, citation }] }` | 400 Bad Request, 401 Unauthorized | Filters document chunks by authenticated user ownership | **PASS** |
| `DELETE` | `/api/files/:id` | Yes (`Bearer JWT`) | None | `{ success: true, message }` | 401 Unauthorized, 403 Forbidden, 404 Not Found | Restricts document deletion to document owner | **PASS** |
| `GET` | `/api/memory` | Yes (`Bearer JWT`) | None | `{ success: true, memories: [...] }` | 401 Unauthorized | Filters memories strictly by `userId = req.user._id` | **PASS** |
| `POST` | `/api/memory` | Yes (`Bearer JWT`) | `{ content, category? }` | `{ success: true, memory: { id, content, userId } }` | 400 Bad Request, 401 Unauthorized | Binds memory strictly to `req.user._id` | **PASS** |
| `DELETE` | `/api/memory/:id` | Yes (`Bearer JWT`) | None | `{ success: true, message }` | 401 Unauthorized, 403 Forbidden, 404 Not Found | Restricts deletion to memory owner | **PASS** |
| `POST` | `/api/ai/generate` | Yes (`Bearer JWT`) | `{ prompt, model? }` | `{ success: true, model, prompt, response }` | 400 Bad Request, 401 Unauthorized | Internal AI gateway route | **PASS** |

---

## 2. PYTORCH FASTAPI AI SERVICE INVENTORY (`http://localhost:8000`)

| METHOD | PATH | AUTH REQUIRED | REQUEST BODY | EXPECTED RESPONSE | ERROR RESPONSES | GOVERNANCE ROLE | TEST STATUS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | No | None | `{ status: "ok", service: "Mathiyon AI", version: "1.3.0", device: "cpu/cuda", model_loaded: true }` | 500 Internal Error | PyTorch Service Health Check | **PASS** |
| `GET` | `/models` | No | None | `{ activeModel: "mathiyon-slm-v1.2", defaultModel: "mathiyon-slm-v1.2", registeredModels: [...] }` | 500 Internal Error | Model Registry Inspection Endpoint | **PASS** |
| `POST` | `/math/solve` | No | `{ question, difficulty? }` | `{ problem, solution, is_symbolic, verified }` | 400 Bad Request, 500 Internal Error | SymPy Authoritative Math Calculator Gateway | **PASS** |
| `POST` | `/generate` | No | `{ message, conversation?, max_new_tokens?, temperature?, top_k?, top_p?, model? }` | `{ response, model: "mathiyon-slm-v1.2", tokens_processed, tokens_generated, generation_time_ms }` | 400 Bad Request (Invalid Model / Empty Prompt), 500 Internal Error | **Production Default Serving Model Endpoint (100% Traffic)** | **PASS** |
| `POST` | `/generate/v1.3` | No | `{ prompt?, message?, max_new_tokens?, temperature?, deterministic?, use_kv_cache? }` | `{ model: "mathiyon-slm-v1.3", experimental: true, response, generation_time_ms, tokens_generated }` | 400 Bad Request (Empty Prompt), 500 Internal Error | **Experimental Release Candidate Test Endpoint (0% Production Traffic)** | **PASS** |
| `POST` | `/embed` | No | `{ text }` | `{ success: true, embedding: [...], dimension: 384 }` | 400 Bad Request (Empty Text) | Single Text Vector Embedding | **PASS** |
| `POST` | `/embedBatch` | No | `{ texts: [...] }` | `{ success: true, embeddings: [...], count, dimension: 384 }` | 400 Bad Request (Empty Batch) | Batch Document Text Vector Embedding | **PASS** |
