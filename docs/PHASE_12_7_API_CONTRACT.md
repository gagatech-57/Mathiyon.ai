# Mathiyon AI - Phase 12.7 API Contract Specification

## Overview
This document specifies the exact request/response schemas, HTTP methods, route paths, authentication requirements, and error payloads for all production endpoints in Mathiyon AI.

---

## 1. Authentication Endpoints

### 1.1 POST `/api/auth/register`
- **Description**: Registers a new user.
- **Auth**: None (Public)
- **Request Body**:
  ```json
  {
    "name": "User Name",
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "_id": "60d5ec49b1424e0015f8a001",
    "name": "User Name",
    "email": "user@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Error `400 Bad Request`**: `{ "message": "User already exists" }`

### 1.2 POST `/api/auth/login`
- **Description**: Authenticates user and issues JWT token.
- **Auth**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "_id": "60d5ec49b1424e0015f8a001",
    "name": "User Name",
    "email": "user@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Error `401 Unauthorized`**: `{ "message": "Invalid email or password" }`

### 1.3 GET `/api/auth/me`
- **Description**: Retrieves current authenticated user profile.
- **Auth**: `Bearer <JWT>`
- **Response `200 OK`**:
  ```json
  {
    "_id": "60d5ec49b1424e0015f8a001",
    "name": "User Name",
    "email": "user@example.com"
  }
  ```
- **Error `401 Unauthorized`**: `{ "message": "Not authorized, token failed" }`

---

## 2. Orchestrated AI & Chat Endpoints

### 2.1 POST `/api/chat` (Multi-Tool Orchestrator)
- **Description**: Main production AI interaction route. Invokes Orchestrator (Intent -> Tool Routing -> Fusion -> SLM Synthesis).
- **Auth**: `Bearer <JWT>`
- **Request Body**:
  ```json
  {
    "message": "Calculate derivative of x^2 + 3x",
    "conversationId": "60d5ec49b1424e0015f8a002"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "conversationId": "60d5ec49b1424e0015f8a002",
    "userMessage": {
      "_id": "60d5ec49b1424e0015f8a003",
      "sender": "user",
      "text": "Calculate derivative of x^2 + 3x"
    },
    "aiMessage": {
      "_id": "60d5ec49b1424e0015f8a004",
      "sender": "ai",
      "text": "The derivative of x^2 + 3x with respect to x is 2*x + 3.",
      "intent": "MATH",
      "sources": [],
      "agentStatus": {
        "intent": "MATH",
        "stepsExecuted": 1,
        "executionTimeMs": 42.5
      }
    }
  }
  ```

### 2.2 GET `/api/chat/conversations`
- **Description**: Retrieves user's active conversations.
- **Auth**: `Bearer <JWT>`
- **Response `200 OK`**: `[ { "_id": "...", "title": "Math Query", "updatedAt": "..." } ]`

### 2.3 GET `/api/chat/conversations/:id/messages`
- **Description**: Retrieves message history for specified conversation.
- **Auth**: `Bearer <JWT>`
- **Response `200 OK`**: `[ { "_id": "...", "sender": "user", "text": "..." }, ... ]`

---

## 3. Math & Symbolic Processing Endpoints

### 3.1 POST `/api/math/solve`
- **Description**: Authoritative symbolic math evaluation via SymPy engine.
- **Auth**: `Bearer <JWT>` (or Internal API)
- **Request Body**: `{ "expression": "2*x + 5 = 15" }`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "expression": "2*x + 5 = 15",
    "solution": "x = 5",
    "steps": ["2*x + 5 = 15", "2*x = 10", "x = 5"],
    "engine": "SymPy v1.12"
  }
  ```

---

## 4. RAG & Document Intelligence Endpoints

### 4.1 POST `/api/files/upload`
- **Description**: Uploads synthetic document for extraction, chunking, and embedding.
- **Auth**: `Bearer <JWT>`
- **Form Data**: `file: [binary payload]`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "documentId": "60d5ec49b1424e0015f8a005",
    "filename": "quantum_physics.pdf",
    "chunkCount": 12
  }
  ```

---

## 5. Memory Endpoints

### 5.1 POST `/api/memory`
- **Description**: Stores user memory key-value pair.
- **Auth**: `Bearer <JWT>`
- **Request Body**: `{ "key": "preferred_language", "value": "TypeScript" }`
- **Response `200 OK`**: `{ "success": true, "memory": { "key": "preferred_language", "value": "TypeScript" } }`

---

## 6. Observability Endpoints

### 6.1 GET `/api/observability/summary`
- **Description**: Returns non-sensitive platform telemetry & routing summary.
- **Auth**: Protected (Requires admin or JWT depending on env)
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "v1_2_traffic_pct": 100,
    "v1_3_traffic_pct": 0,
    "total_requests": 1450,
    "error_rate": 0.00
  }
  ```

---

## 7. Direct PyTorch Service (FastAPI) Endpoints

### 7.1 POST `/generate` (Production Baseline)
- **Host**: `http://127.0.0.1:8000/generate`
- **Auth**: Internal API / Public
- **Request Body**: `{ "message": "What is prime factorization?" }`
- **Response `200 OK`**:
  ```json
  {
    "response": "Prime factorization is decomposing a composite number into prime factors...",
    "model": "mathiyon-slm-v1.2",
    "version": "1.2.0",
    "engine": "PyTorch",
    "tokens_processed": 14,
    "tokens_generated": 48,
    "generation_time_ms": 68.2,
    "confidence": 0.985
  }
  ```

### 7.2 POST `/generate/v1.3` (Experimental Release Candidate - 0% Production Traffic)
- **Host**: `http://127.0.0.1:8000/generate/v1.3`
- **Auth**: Internal API / Testing
- **Request Body**: `{ "prompt": "Benchmark test prompt", "use_kv_cache": true }`
- **Response `200 OK`**:
  ```json
  {
    "model": "mathiyon-slm-v1.3",
    "experimental": true,
    "use_kv_cache": true,
    "response": "Experimental response...",
    "generation_time_ms": 34.1,
    "tokens_generated": 32
  }
  ```

---

## 8. Global Error Contract

Standardized JSON payload returned for all 4xx and 5xx responses:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED_ACCESS",
    "message": "Access denied for requested resource."
  },
  "timestamp": "2026-09-25T15:42:00.000Z"
}
```
