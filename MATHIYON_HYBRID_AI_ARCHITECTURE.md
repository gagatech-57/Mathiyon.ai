# Mathiyon AI — Production Hybrid Intelligence Architecture
**Document Version:** 2.0.0 (Production)  
**System Classification:** Hybrid SLM + LLM + Deterministic Tool Ecosystem  

---

## 1. Executive Summary & Architecture Overview

Mathiyon AI is designed as a **Production Hybrid AI System** that combines:
1. **Local PyTorch Small Language Model (SLM v1.2)**: 100% production baseline for low-latency conversations, greetings, identity, lightweight explanations, and fast local reasoning.
2. **LLM Provider Abstraction Layer**: Pluggable high-intelligence layer for deep reasoning, multi-step instruction following, complex software architecture, multi-source RAG+Web synthesis, and ambiguous query interpretation.
3. **Deterministic Authoritative Tools**: Exact symbolic mathematics (SymPy), real-time system clock, exact arithmetic calculator, unit converter, live currency converter, and real-time weather.
4. **Context Fusion & Response Composer**: Enforces mathematical invariance and factuality; prevents LLM hallucinations from overriding verified tool results.

```
                                    MATHIYON AI
                                         │
                                       USER
                                         │
                               REQUEST NORMALIZATION
                                         │
                                  INTENT ROUTER
                                         │
                     ┌───────────────────┼───────────────────┐
                     │                   │                   │
                  SIMPLE               EXACT              COMPLEX
               CONVERSATION            TOOLS             REASONING
                     │                   │                   │
                 SLM v1.2                │                  LLM
              (100% Prod)                │           (Gemini / OpenAI /
                     │                   │                 Local)
                     │          ┌────────┼────────┐          │
                     │          │        │        │          │
                     │        MATH     TIME     WEB & RAG    │
                     │        SymPy    Clock     Search      │
                     │          │        │        │          │
                     └──────────┴────────┼────────┴──────────┘
                                         │
                                   CONTEXT FUSION
                                         │
                             AUTHORITATIVE VERIFICATION
                                         │
                                 RESPONSE COMPOSER
                                         │
                                 FINAL USER ANSWER
```

---

## 2. Model Governance & Production Split

| Intelligence Layer | Production Traffic | Status | Primary Responsibilities |
|---|---|---|---|
| **Mathiyon SLM v1.2** | **100%** | Production Baseline | Fast conversational chat, greetings, identity, basic coding explanations, low latency |
| **Mathiyon SLM v1.3** | **0%** | Experimental | Causal RoPE + RMSNorm + SwiGLU prototype |
| **Mathiyon LLM Layer** | **On-Demand (Complexity Gated)** | Active Production | Architectural design, multi-step planning, RAG + Web synthesis, complex code synthesis |
| **SymPy Math Engine** | **Deterministic Authoritative** | Active Production | Exact symbolic algebra, calculus, matrices, fractions, systems of equations |
| **System Clock** | **Deterministic Authoritative** | Active Production | Real-time temporal queries across global timezones |

---

## 3. Subsystem Responsibilities

### A. SLM v1.2 (PyTorch Local Neural Inference)
- **Use Cases**: Greetings (`"hi"`, `"vanakkam"`), well-being (`"how are you"`), assistant identity (`"who are you"`), basic syntax questions (`"what is React"`), short-turn conversations.
- **Latency**: `< 20ms`.
- **Target**: Zero API cost, local offline execution.

### B. LLM Layer (Reasoning & Synthesis)
- **Use Cases**: Deep software architecture design (`"Design a production authentication architecture for React, Express, PostgreSQL and JWT"`), multi-step comparison (`"Search the latest React version and compare with my uploaded project"`), complex multi-tool synthesis, ambiguous instruction resolution.
- **Providers Supported**: Google Gemini, OpenAI / OpenAI-compatible (Groq, Together, Ollama, DeepSeek, vLLM), and Local Mock fallback.

### C. Deterministic Tool Ecosystem
- **Mathematics (SymPy 1.14.0)**: Exact symbolic roots, fractions (`17/2`), decimals (`8.5`), derivatives (`2*x`), integrals (`x**3/3 + C`), determinants (`-2`), systems of linear equations.
- **System Clock**: Real-time system timestamps and timezone calculations (`Asia/Kolkata`, `Europe/London`, `America/New_York`).
- **Calculator**: Exact rational arithmetic (`25 + 30 = 55`, `234 - 2342 = -2108`).
- **Unit Converter**: Mass, length, temperature, volume conversions.
- **Currency Engine**: Live exchange rates and conversions.
- **Weather Engine**: Real-time weather and temperature lookups.

---

## 4. Invariance & Authority Hierarchy

To eliminate hallucinations, Mathiyon AI enforces a strict **Source Authority Hierarchy**:

$$\text{MATH (SymPy)} > \text{DOCUMENT (RAG)} > \text{CODE} > \text{WEB (Search)} > \text{MEMORY} > \text{CONVERSATION} > \text{MODEL (LLM/SLM)}$$

1. **Math Invariance**: If SymPy computes $10x - 45 = 40 \implies x = 17/2 = 8.5$, the LLM is strictly prohibited from altering the numeric result or claiming unverified answers.
2. **Clock Invariance**: Real system time cannot be altered by language model generation.
3. **Evidence Grounding**: RAG and Web responses must cite verified sources or explicitly state when information is missing.

---

## 5. Security & Privacy

- **Server-Side API Key Storage**: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `LLM_API_KEY`, and `JWT_SECRET` are kept strictly in `server/.env`.
- **Zero Frontend Exposure**: No API keys or sensitive provider endpoints are exposed in client-side bundles.
- **User Memory Isolation**: Memory queries enforce strict `userId` tenant isolation.
- **Observability Scrubbing**: Telemetry logs record sanitized latency, tool IDs, and model names without logging credentials or private document contents.
