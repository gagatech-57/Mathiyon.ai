# MATHIYON AI — Next-Gen Intelligence Platform (மதியோன் AI)

**MATHIYON AI** is a production-grade AI Chat application powered by a **React 19 + TypeScript** frontend, a **Node.js + Express + MongoDB** API gateway, and a dedicated **Python FastAPI PyTorch SLM v1.0** neural inference service.

---

## 🏗️ MATHIYON AI ARCHITECTURE

```
React (Port 5173)
   │
   ▼ (POST /api/chat + Bearer JWT)
Express Backend (Port 5000)
   │
   ├──────► MongoDB Database (Port 27017)
   │          Saved to Conversation & Message Collections
   │
   ▼ (HTTP POST /generate)
Python FastAPI Service (Port 8000 / ai-service/app.py)
   │
   ├──────► Tokenizer (tokenizer/bpe_tokenizer.py)
   │          Text -> Subword Token IDs -> Text
   │
   ▼
PyTorch SLM Model (models/transformer.py)
   │  Embedding -> Positional Encoding -> Multi-Head Self-Attention -> Logits Projection
   │
   ▼ (Autoregressive Logits Sampling)
Python Response returned to Express -> Saved to MongoDB -> Rendered in React UI
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | Responsive Chat Application UI |
| **Styling** | Tailwind CSS + Glassmorphism | Crimson dark theme, glass components |
| **Animation** | Framer Motion | Smooth sidebar spring drawer & transitions |
| **Backend API** | Node.js + Express.js | API Gateway, JWT security, User management |
| **Database** | MongoDB + Mongoose | Persistent user profiles, conversations & chat history |
| **Auth** | JWT + bcryptjs | User registration, authentication & route protection |
| **AI Service** | Python 3.12 + FastAPI + Uvicorn | Dedicated neural inference web service |
| **AI Framework** | PyTorch (`torch`) | Neural subword embedding, multi-head self-attention |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+
- **Python** v3.10+
- **MongoDB** (Local instance `mongodb://127.0.0.1:27017` or MongoDB Atlas)

---

### 2. Install Dependencies

#### Frontend & Express Backend:
```bash
npm install
cd server && npm install && cd ..
```

#### Python AI Service:
```bash
cd ai-service
pip install -r requirements.txt
cd ..
```

---

### 3. Launch Services

#### Launch Python PyTorch AI Service (Port 8000):
```bash
cd ai-service
python app.py
# Or using uvicorn:
uvicorn app:app --host 0.0.0.0 --port 8000
```

#### Launch Express API Server (Port 5000):
```bash
cd server
npm run dev
```

#### Launch React Frontend (Port 5173):
```bash
npm run dev
```

---

## 🧪 Testing & Verification

### Run Python AI Service Tests:
```bash
cd ai-service
pytest test_ai_service.py
```

### Run Frontend Build Verification:
```bash
npm run build
```

---

## 🔒 API Endpoints & Contracts

### Authentication Endpoints (`/api/auth`)
- `POST /api/auth/register` — Register user & issue 30-day JWT token
- `POST /api/auth/login` — Authenticate user & issue JWT token
- `GET /api/auth/me` — Verify active session (Protected)

### Chat Endpoints (`/api/chat`)
- `POST /api/chat` — Send prompt, query PyTorch AI engine & save to MongoDB (Protected)
- `GET /api/chat/conversations` — Get user-specific past conversations for sidebar (Protected)
- `GET /api/chat/conversations/:id` — Get full message history for a conversation (Protected)
- `POST /api/chat/conversations` — Initialize a new conversation (Protected)

### Python AI Service Endpoints (Port 8000)
- `GET /health` — Health status check
- `POST /generate` — PyTorch tokenization, self-attention pass & neural text generation
