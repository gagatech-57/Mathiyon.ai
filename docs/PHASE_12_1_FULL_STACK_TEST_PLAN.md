# MATHIYON AI — PHASE 12.1 FULL-STACK TEST PLAN

**Branch:** `phase-12-1-full-stack-audit`  
**Date:** September 25, 2026  
**Scope:** Full-Stack Production Audit, Verification, Hardening & End-to-End Testing  
**Production Model:** Mathiyon SLM v1.2 (100% Traffic Default — Unchanged)  
**Experimental Model:** Mathiyon SLM v1.3-RC1 (0% Production Traffic — Isolated)  

---

## 1. TEST OBJECTIVE & GOVERNANCE SCOPE
The goal of Phase 12.1 is to perform a comprehensive end-to-end audit, security verification, and functional regression test across the complete Mathiyon AI platform stack (React 19 Frontend, Node.js/Express API Server, MongoDB Storage, and FastAPI PyTorch AI Inference Service).

### Strict Safety & Promotion Boundaries:
- **No Automatic Promotion:** Mathiyon SLM v1.3-RC1 remains an experimental release candidate (0% traffic).
- **Production Endpoint Protection:** `POST /generate` must serve 100% Mathiyon SLM v1.2.
- **Model Checkpoint Integrity:** Neural weights and model architectures must NOT be modified or retrained.
- **Architecture Integrity:** Existing Math Engine, RAG Vector Engine, Memory System, Tool Registry, and Auth Security mechanisms MUST remain fully active.

---

## 2. TEST MATRIX & COVERAGE DOMAINS

The test plan covers 25 comprehensive functional and security domains (A through Y):

### A. Frontend UI & UX
- React 19 + TypeScript component compilation and rendering integrity.
- Tailwind CSS styling, responsive layout rendering (320px to 1920px), and theme persistence (Dark / Light mode).
- Form inputs, validation states, loading indicators, error boundary handling, and toast notifications.

### B. Backend API Server
- Express.js route handling, controllers, and middleware execution.
- Global request error handling, CORS headers, JSON body parsing, and status code correctness.

### C. AI Service (PyTorch + FastAPI)
- FastAPI service health, endpoint routing (`/health`, `/models`, `/math/solve`, `/generate`, `/generate/v1.3`, `/embed`, `/embedBatch`).
- Mathiyon SLM v1.2 generator forward pass and SLM v1.3-RC1 KV-Cache autoregressive generation.

### D. Database Layer (MongoDB + Mongoose)
- Mongoose model schemas: `User`, `Conversation`, `Message`, `Document`, `DocumentChunk`, `Memory`.
- Data persistence, index efficiency, required field validation, object ID references, and cascading cleanups.

### E. Authentication System
- User registration, login, JWT token issue & verification, password hashing via bcryptjs (`saltRounds=10`).
- Auth token expiration, invalid credential handling, and header parsing (`Authorization: Bearer <token>`).

### F. Authorization & User Isolation
- Strict user-level access controls prohibiting User A from retrieving User B conversations, messages, memories, documents, or vector embeddings (returns HTTP 403 Forbidden).

### G. Chat System
- Conversation creation, history loading, message sending, streaming/loading state, code block formatting, and math solution rendering.

### H. Conversation Lifecycle
- New chat initialization, title auto-generation, conversation listing, and history retrieval.

### I. Memory Management System
- Memory creation ("remember that..."), semantic memory retrieval, memory list rendering, and user-isolated memory deletion.

### J. Retrieval-Augmented Generation (RAG)
- Multi-format document upload (PDF, TXT, DOCX, CSV, JSON, MD, Code files).
- Text extraction, chunking, dense 384-dimensional vector embedding generation (`/embedBatch`), similarity search (`/search`), source citation rendering, and missing information protection ("The document does not contain this information.").

### K. Mathematical Engine
- Symbolic and numerical calculations powered deterministically by SymPy (`MathEngineSolver`).
- Coverage across Arithmetic, Percentages, Fractions, Algebra, Calculus (Derivatives & Integrals), Matrices, Geometry, and Unit Conversions.

### L. Coding Assistant Engine
- Syntax highlighting, code block generation, multi-language code snippets (TypeScript, Python, JavaScript), and execution explanation.

### M. Tool Registry
- Registration and validation of `MathEngine`, `RAG`, `SLM`, `Memory`, `CodeEngine`, `WebSearch`, `VisionEngine`, `VoiceEngine`.

### N. AI Orchestrator
- Intent classification (`GENERAL`, `MATH`, `DOCUMENT`, `CODE`, `WEB_SEARCH`, `MEMORY`, `CONVERSATION`).
- Unified response pipeline assembly with metadata traces and latency logging.

### O. Model Registry
- Model discovery (`GET /models`), active model listing, and enforcement of production (`v1.2`) vs experimental (`v1.3`) isolation flags.

### P. Production Model Serving (v1.2)
- 100% production traffic default handling on `POST /generate`.

### Q. Experimental Model Serving (v1.3-RC1)
- Isolated experimental test endpoint handling on `POST /generate/v1.3`.

### R. API Integration & Service Connectivity
- Cross-service communication (Express -> FastAPI -> PyTorch -> MongoDB).
- Service timeout, offline error fallback, and retry handling.

### S. Error Handling & Edge Cases
- Invalid JSON, missing parameters, oversized payloads (413), unauthenticated access (401), unauthorized resource access (403), internal errors (500).

### T. Security Audit
- Inspection for hardcoded secrets, committed credentials, SQL/NoSQL injection, XSS vulnerabilities, and safe error message sanitization.

### U. Performance & Latency Metrics
- Build speed, API response times, SymPy calculation latency, vector search speed, and SLM generation token-per-second benchmarks.

### V. Mobile & Responsive Layout Audit
- Breakpoint testing: 320px, 375px, 390px, 414px, 768px, 1024px, 1280px, 1440px, 1920px.

### W. Build System Verification
- TypeScript type checking (`tsc -b`), Vite production bundling (`npm run build`).

### X. Platform Regression Suite
- Execution of PyTest suite (27 tests), PDF extraction test, release validation script, master platform E2E suite.

### Y. End-to-End User Journeys
- Complete step-by-step user journey from registration -> chat -> math -> RAG upload -> citation -> memory -> security boundary check -> logout.
