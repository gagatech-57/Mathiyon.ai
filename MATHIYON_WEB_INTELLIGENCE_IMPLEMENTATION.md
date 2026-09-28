# MATHIYON AI — AUTOMATIC WEB INTELLIGENCE & FALLBACK IMPLEMENTATION REPORT

**Date:** September 28, 2026  
**System Status:** 100% Operational  
**Production Model:** Mathiyon SLM v1.2 (100% production traffic)  
**Experimental Model:** Mathiyon SLM v1.3-RC1 (0% production traffic, isolated test endpoint)  
**Web Intelligence Test Suite:** 13/13 PASS (100% Pass Rate)

---

## 1. Executive Summary

Mathiyon AI now features an **Automatic Web Intelligence & Search Fallback System**. The platform prioritizes internal knowledge (conversation context, memory, uploaded documents/RAG, deterministic tools, and internal model knowledge), and **automatically triggers Web Search** only when current information, explicit web research, volatile facts, or external documentation is required.

```
USER QUESTION
      ↓
INTENT DETECTION
      ↓
CONVERSATION CONTEXT & MEMORY CHECK
      ↓
RAG / USER DOCUMENTS CHECK
      ↓
DETERMINISTIC TOOLS CHECK (Time / Math / Currency / Weather / Unit)
      ↓
INTERNAL KNOWLEDGE CHECK
      ↓
IS INTERNAL KNOWLEDGE SUFFICIENT & RELIABLE?
      ↓
   YES ───────────────→ ANSWER DIRECTLY
      ↓
      NO / CURRENT INFO REQUIRED / EXPLICIT WEB REQUEST
      ↓
AUTOMATIC WEB SEARCH TOOL (`WebSearch`)
      ↓
SOURCE COLLECTION & CITATION EXTRACTION
      ↓
CONTEXT FUSION ENGINE
      ↓
VERIFICATION & Mathiyon SLM v1.2
      ↓
FINAL ANSWER + SOURCE CARDS & CITATIONS
```

---

## 2. Search Trigger & Priority Logic

Mathiyon AI follows strict **Internal Knowledge First** priority rules:

1. **Current Conversation Context**
2. **User Memory** (`MemoryEngine`)
3. **Uploaded Documents / RAG** (`RAG`)
4. **Deterministic Tools** (`TimeDateEngine`, `CalculatorEngine`, `CurrencyEngine`, `WeatherEngine`, `UnitConversionEngine`)
5. **Internal Model Knowledge** (`Mathiyon SLM v1.2`)
6. **Automatic Web Search** (`WebSearch`) — Executed only when internal knowledge is insufficient or real-time web facts are required.

### Trigger Criteria for Automatic Web Search:

A. **Explicit Web Search Requests:** Prompts containing "search online", "search the web", "look this up", "find this online".  
B. **Temporal / Current Information Keywords:** Prompts containing "latest", "today", "now", "currently", "recent", "this week", "this month", "version", "price", "pricing", "news", "events", "release notes", "changelog".  
C. **Volatile & Changing Topics:** Software versions (e.g. React 19, Node.js 22), company leadership (e.g. Microsoft CEO), stock/crypto prices, technical documentation updates.  
D. **RAG Fallback & Comparison:** When uploaded PDF context does not contain requested facts AND user asks to compare with online benchmarks or search online.

### Non-Trigger Criteria (Web Search Bypassed):

- **Pure Math Queries (`25 * 30`):** Handled by `CalculatorEngine` / `MathEngine`.
- **Static Concepts (`What is React?`):** Handled by internal SLM model knowledge.
- **Time & Date Queries (`What is today's date?`):** Handled by `TimeDateEngine`.
- **Unit Conversions (`10 km in miles`):** Handled by `UnitConversionEngine`.
- **Document Queries (`What does my PDF say?`):** Handled by grounded `RAG`.

---

## 3. Tool Registry & Web Search Tool Architecture

The `WebSearch` tool is registered in `TOOL_REGISTRY` with alias `web_search`:

- **File Path:** `server/services/tools/webSearchTool.js`
- **Metadata:**
  ```json
  {
    "name": "WebSearch",
    "description": "Searches the internet for up-to-date real-time public information, software versions, news, and authoritative technical documentation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": { "type": "string" },
        "optional_time_range": { "type": "string" },
        "optional_domain_filter": { "type": "string" }
      }
    }
  }
  ```
- **Automatic Search Query Generation:** Converts user questions into optimized search queries (e.g., *"What is the latest React version?"* → `"latest React version official documentation react.dev"`).
- **Authoritative Source Prioritization:** Prioritizes official documentation (`react.dev`, `nodejs.org`, `microsoft.com`, `github.com`) over unverified sources.
- **Query Caching:** Caches public non-sensitive query results for 5 minutes (`CACHE_TTL_MS = 300000`) to respect freshness and minimize latency.

---

## 4. Multi-Tool Integration & Chaining

1. **`WEB + SLM`:** WebSearch retrieves verified source snippets; Mathiyon SLM v1.2 synthesizes a clear, grounded answer.
2. **`WEB + RAG`:** Combines internal document context + live web search benchmarks for comparative analysis.
3. **`WEB + MATH`:** Retrieves current rates/figures via WebSearch / CurrencyEngine, then performs exact calculation using SymPy / CalculatorEngine.
4. **`WEB + MEMORY`:** Uses user preferences to personalize search results without exposing private memory.

---

## 5. Security & SSRF Protection

- **SSRF Validation:** All search result URLs are checked by `isSafeUrl()` against private IP ranges (`127.0.0.1`, `10.x.x.x`, `192.168.x.x`, `localhost`, `::1`).
- **Query Sanitization:** `sanitizeQuery()` strips injection patterns (`--`, `;`, `/*`, `drop database`).
- **Secret Protection:** Passwords, JWT tokens, API keys, and database URIs are strictly redacted.

---

## 6. Frontend UI & Source Display

- **Verified Knowledge Source Cards:** Displays source cards in `src/components/MessageBubble.tsx`:
  - Domain (e.g. `react.dev`, `nodejs.org`, `microsoft.com`)
  - Title & Snippet
  - Clickable external URL link (`target="_blank" rel="noopener noreferrer"`)
- **Tool Badges:** Displays `🌐 Web Search`, `📄 RAG`, `⏰ Time & Date`, `🧮 Calculator`, `💱 Currency`, `🌤️ Weather`, `💾 Memory`.

---

## 7. Web Search Test Suite Results Matrix

Executed 13 test scenarios via `scratch/test_automatic_web_search_matrix.cjs`:

| ID | Test Scenario | Prompt | Expected Web Search | Actual Web Search | Status |
|---|---|---|---|---|---|
| 1 | `GENERAL_GREETING` | "hi" | `false` | `false` | **PASS** |
| 2 | `MEMORY_QUERY` | "What is my name?" | `false` | `false` | **PASS** |
| 3 | `MATH_CALCULATION` | "25 * 30" | `false` | `false` | **PASS** |
| 4 | `DATE_QUERY` | "What is today's date?" | `false` | `false` | **PASS** |
| 5 | `TIME_QUERY` | "What time is it?" | `false` | `false` | **PASS** |
| 6 | `STATIC_KNOWLEDGE` | "What is React?" | `false` | `false` | **PASS** |
| 7 | `AUTO_WEB_CURRENT_VERSION` | "What is the latest React version?" | `true` | `true` | **PASS** |
| 8 | `EXPLICIT_WEB_SEARCH` | "Search online for the latest Node.js version." | `true` | `true` | **PASS** |
| 9 | `WEATHER_QUERY` | "What's the weather in Chennai?" | `false` | `false` | **PASS** |
| 10 | `CURRENCY_QUERY` | "Convert 100 USD to INR" | `false` | `false` | **PASS** |
| 11 | `EXPLICIT_WEB_RESEARCH` | "Search online and explain the latest information about quantum computing." | `true` | `true` | **PASS** |
| 12 | `RAG_GROUNDED_QUERY` | "What does my uploaded document say about performance?" | `false` | `false` | **PASS** |
| 13 | `RAG_WEB_FALLBACK` | "Compare my document performance with latest web benchmarks online." | `true` | `true` | **PASS** |

```json
{
  "total": 13,
  "passed": 13,
  "failed": 0,
  "passRate": "100%"
}
```

Full execution payload saved to `mathiyon_web_search_test_results.json`.

---

## 8. Production Safety Verification

- **Production Model:** `Mathiyon SLM v1.2` remains 100% production default.
- **Experimental Model:** `Mathiyon SLM v1.3-RC1` remains 0% production (shadow eval only).
- **Shadow Evaluation:** `SHADOW_EVAL_ENABLED=false` and `SHADOW_SAMPLE_RATE=0.0`.
- **Model Weights:** Unmodified.
