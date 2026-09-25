# MATHIYON AI — PHASE 12.4 CONTEXT FUSION ARCHITECTURE

**Branch:** `phase-12-4-context-knowledge-intelligence`  
**Date:** September 25, 2026  
**Status:** Architecture Specification  

---

## 1. OVERVIEW & DESIGN PRINCIPLES

The **Context Fusion Layer** of Mathiyon AI provides a safe, deterministic, and intelligence-driven mechanism for integrating heterogeneous context sources into a unified response context for the SLM.

### Key Design Principles
1. **Source Authority Hierarchy**: Deterministic math results and extracted document facts take precedence over language model generation.
2. **Relevance Filtering**: Only high-confidence, query-relevant context chunks are included in the prompt context to prevent context bloat and hallucination.
3. **Explicit Conflict Detection**: When retrieved sources contradict each other (e.g. uploaded PDF vs Web search result), the system explicitly reports the discrepancy to the user rather than silently making a guess.
4. **Normalized Internal Context Representation**: All retrieved sources are converted into a standardized JSON structure with metadata, timestamps, authority scores, and citation hooks.
5. **Cross-User Data Isolation**: Memory and Document context access is guarded by strict user authorization checks.

---

## 2. NORMALIZED CONTEXT STRUCTURE

Every execution run constructs a `NormalizedContext` object before calling the response composer:

```json
{
  "requestId": "req_a1b2c3d4",
  "intent": "MULTI_TOOL",
  "query": "Find the price in my document, get current web price, and compute percentage difference.",
  "conversation": [
    {
      "sourceType": "CONVERSATION",
      "sourceId": "msg_001",
      "content": "Summarize project report",
      "authority": 1,
      "relevance": "relevant",
      "timestamp": "2026-09-25T12:00:00.000Z"
    }
  ],
  "memory": [
    {
      "sourceType": "MEMORY",
      "sourceId": "mem_101",
      "content": "User project uses React 19",
      "authority": 2,
      "relevance": "relevant",
      "timestamp": "2026-09-24T10:00:00.000Z"
    }
  ],
  "documents": [
    {
      "sourceType": "DOCUMENT",
      "sourceId": "doc_5501",
      "content": "Product unit price is ₹100",
      "authority": 4,
      "relevance": "relevant",
      "citation": {
        "id": "cit_doc_1",
        "type": "document",
        "title": "Project_Report.pdf",
        "page": 4,
        "chunk": 12
      },
      "timestamp": "2026-09-20T08:30:00.000Z"
    }
  ],
  "web": [
    {
      "sourceType": "WEB",
      "sourceId": "web_882",
      "content": "Current market price for product is ₹120",
      "authority": 3,
      "relevance": "relevant",
      "citation": {
        "id": "cit_web_1",
        "type": "web",
        "title": "Market Price Today",
        "url": "https://example.com/prices",
        "domain": "example.com"
      },
      "timestamp": "2026-09-25T13:50:00.000Z"
    }
  ],
  "toolResults": [
    {
      "sourceType": "CODE",
      "sourceId": "code_01",
      "content": "CSV row count: 150, columns: ['Date', 'Revenue']",
      "authority": 4,
      "relevance": "relevant"
    }
  ],
  "mathResults": [
    {
      "sourceType": "MATH",
      "sourceId": "math_01",
      "content": "20%",
      "authority": 5,
      "relevance": "relevant",
      "verified": true,
      "explanation": "Percentage difference = ((120 - 100) / 100) * 100 = 20%"
    }
  ],
  "conflicts": [
    {
      "conflictType": "DOCUMENT_VS_WEB",
      "description": "Document reports product price as ₹100 (Project_Report.pdf), whereas Web search reports current price as ₹120 (Market Price Today).",
      "sourceA": "DOCUMENT",
      "sourceB": "WEB"
    }
  ],
  "knowledgeClassification": "CALCULATION",
  "metadata": {
    "totalTokensEstimate": 420,
    "contextBudgetMs": 15
  }
}
```

---

## 3. SOURCE AUTHORITY RULES

| Source Type | Authority Level | Description & Rules |
| :--- | :---: | :--- |
| **MATH** | **5 (Highest)** | SymPy / Math Engine calculation. Absolute authority for numeric & algebraic results. Cannot be overridden by SLM. |
| **DOCUMENT** | **4** | RAG Document text chunks. Authoritative representation of user-uploaded files. |
| **TOOL / CODE** | **4** | Executed code output, CSV/JSON row counts, or static analysis results. |
| **WEB** | **3** | Live web search snippets. Authoritative for external real-time facts, indexed with retrieval timestamp. |
| **MEMORY** | **2** | Stored user preferences and memories. Authoritative for user profile context. |
| **CONVERSATION** | **1** | Multi-turn history. Used for pronoun/reference resolution (`this`, `that`, `second point`). |
| **MODEL** | **0 (Lowest)** | SLM internal parameters. Used for natural language synthesis, explanation, and formatting. |

---

## 4. CONFLICT DETECTION LOGIC

The Fusion Engine scans normalized context for direct numeric or factual contradictions:

1. **Document vs Web**: Checks if document values and retrieved web facts for the same entity/attribute differ (e.g., Price ₹100 vs ₹120).
2. **Memory vs Conversation**: Checks if newly declared user state contradicts previously stored memory.
3. **Document A vs Document B**: Scans multi-document context for conflicting statements across files.
4. **Tool Result vs Model Statement**: Overrides any model arithmetic with SymPy math result.

When a conflict is detected, the `AnswerComposer`:
- Formulates a clear note: *"Note: The uploaded document reports ₹100, while the retrieved web source reports ₹120."*
- Retains citations for both conflicting sources.

---

## 5. RELEVANCE & CONTEXT BUDGET MANAGEMENT

To avoid context window overflow and attention dispersion:
- **Conversation History**: Budgeted to maximum last 5 relevant turns (or 2000 tokens).
- **Document Chunks**: Max top 3 chunks (relevance score threshold > 0.65).
- **Web Results**: Max top 3 snippets.
- **Memories**: Max top 3 items matching vector cosine similarity > 0.70.

---

## 6. CITATION & KNOWLEDGE CLASSIFICATION SCHEMAS

### Citation Object Schema
```json
{
  "id": "cit_12345",
  "type": "document|web",
  "title": "String",
  "url": "String or null",
  "page": "Number or null",
  "chunk": "Number or null",
  "domain": "String or null"
}
```

### Knowledge Classifications
- `FACT`: General verified static fact.
- `CALCULATION`: Deterministic mathematical output.
- `USER_CONTEXT`: Personal user memory or setting.
- `DOCUMENT_FACT`: Fact extracted directly from RAG file.
- `WEB_FACT`: Fact obtained from live web search.
- `MODEL_KNOWLEDGE`: Parametric knowledge from SLM.
- `UNCERTAIN`: Conflicting or low-confidence sources.
