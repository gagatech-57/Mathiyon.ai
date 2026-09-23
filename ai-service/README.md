# Mathiyon AI — Dedicated Python PyTorch Service

FastAPI neural inference web service powering the **Mathiyon SLM v1.0 (Small Language Model)** architecture.

---

## 🏗️ Architecture & Component Overview

```
Express Backend (Port 5000)
    │ (HTTP POST /generate)
    ▼
Python FastAPI Service (Port 8000 / app.py)
    │
    ├── Tokenizer (tokenizer/bpe_tokenizer.py)
    │     encode() -> list[int]
    │     decode() -> str
    │
    ├── Model Architecture (models/transformer.py)
    │     Embedding -> Positional Encoding -> Multi-Head Self-Attention -> Linear Logits
    │
    └── Inference Generator (inference/generator.py)
          Autoregressive Logits Sampling & Context Formatting
```

---

## 🚀 How to Launch AI Service

### 1. Requirements & Dependencies
Ensure Python 3.10+ is installed with PyTorch and FastAPI dependencies:
```bash
pip install -r requirements.txt
```

### 2. Run Standalone FastAPI Uvicorn Server
```bash
python app.py
# Or using uvicorn directly:
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🧪 API Endpoints

### 1. Health Check (`GET /health`)
```json
{
  "status": "ok",
  "service": "Mathiyon AI",
  "engine": "PyTorch SLM v1.0",
  "model_loaded": true,
  "vocab_size": 5000
}
```

### 2. Generate Response (`POST /generate`)
**Request:**
```json
{
  "message": "Hello Mathiyon, who are you?",
  "conversation": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello!" }
  ]
}
```

**Response:**
```json
{
  "response": "Hello! I am Mathiyon AI (மதியோன் AI), a next-generation intelligence platform powered by PyTorch SLM v1.0 neural architecture. How can I help you today?",
  "model": "Mathiyon Neural Prototype / SLM v1.0",
  "engine": "PyTorch SLM v1.0",
  "tokens_processed": 14,
  "confidence": 0.9842
}
```

---

## 🧪 Running Automated Tests
```bash
pytest test_ai_service.py
```
