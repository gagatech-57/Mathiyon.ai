# MATHIYON AI — CRITICAL INTENT ROUTING FIX REPORT
**Date:** September 28, 2026  
**System:** Mathiyon AI Production (v1.2 Production / v1.3-RC1 Experimental)  
**Status:** ALL FIXES DEPLOYED & 100% VERIFIED  

---

## 1. Executive Summary

A critical intent routing bug was reported where single-word queries like `"today"` were routed to the deterministic Math Engine instead of the System Clock/Date tool. This caused SymPy's `implicit_multiplication_application` transformation to tokenize `"today"` into the individual algebraic variables $t \times o \times d \times a \times y$, returning the erroneous answer `today = a*d*o*t*y` accompanied by a `[Verified Math Engine]` badge.

This comprehensive architectural fix establishes **3 distinct safety gates** across the JavaScript Orchestrator, the Python Math Engine Solver, and the Python Math Router. Natural language queries now strictly route to `TIME_DATE`, `GENERAL`, `CODING`, `WEB`, or `DOCUMENT`, while only mathematically validated queries reach the SymPy solver.

---

## 2. Root Cause Analysis

The root cause was a cascading failure across 3 distinct architectural layers:

1. **JavaScript Orchestrator (`server/services/aiOrchestrator.js`):**
   - The `isTimeDate` regular expression required explicit date/time keywords (`date|time|clock|day`) in combination with contextual words.
   - A bare input `"today"` without punctuation or auxiliary words failed this regex and was not caught as `TIME_DATE`.
   - The query was treated as `GENERAL` at the orchestrator layer, but the subsequent LLM / SLM prompt injection allowed the model to route ambiguous terms into the Math Engine `/math/solve` endpoint.

2. **Python SymPy Solver Catch-All (`ai-service/math_engine/solver.py`):**
   - In `MathEngineSolver.solve()`, if no specific pattern (arithmetic, quadratic, calculus, system of equations) matched, execution fell through to **Section 9: Safe Symbolic Evaluation Fallback**.
   - Line 329 executed:
     ```python
     parsed_expr = safe_parse_expr(query, transformations=transformations)
     ```
   - Because `implicit_multiplication_application` was enabled in `transformations`, SymPy legitimately transformed any unspaced alphabetic character string into implicit product terms:
     $$\text{"today"} \longrightarrow t \cdot o \cdot d \cdot a \cdot y$$
   - The solver treated $t, o, d, a, y$ as 5 symbolic variables and evaluated their product symbolically.

3. **Python Math Router (`ai-service/math_engine/math_router.py`):**
   - `is_math_query(query)` did not check whether a query was purely composed of natural-language English words before matching keywords or invoking math classification.

---

## 3. Why "today" Became `a*d*o*t*y`

SymPy's parser transforms input strings into abstract syntax trees (ASTs). When `implicit_multiplication_application` is included in `standard_transformations`:
1. The parser encounters the token sequence `t`, `o`, `d`, `a`, `y`.
2. Because neither addition nor explicit multiplication is present, SymPy assumes adjacent symbols represent implicit multiplication (e.g., $2x \to 2 \cdot x$ or $xy \to x \cdot y$).
3. SymPy produces `Mul(Symbol('a'), Symbol('d'), Symbol('o'), Symbol('t'), Symbol('y'))` (alphabetized by SymPy's canonical ordering).
4. Converting this AST back to a string yields `a*d*o*t*y`.

---

## 4. Intent Routing Architecture Changes (`server/services/aiOrchestrator.js`)

The intent router was refactored with strict hierarchical precedence:

### A. Pre-Processing & Forced Time/Date Gate
```javascript
// Bare time/date vocabulary list
const TIME_DATE_WORDS = [
  'today', 'tomorrow', 'yesterday', 'now', 'tonight',
  'இன்று', 'நாளை', 'நேற்று', 'இன்னைக்கு', 'இப்போ',
  'innaiku', 'naalaiku', 'nethu', 'ippo'
];

const cleanedMsg = msgLower.replace(/[?!.,;:'"]/g, '').trim();
const isForcedTimeDate = TIME_DATE_WORDS.includes(cleanedMsg);
```

### B. Mathematical Validation Gate (`looksLikeMath`)
The Math Engine can now only be flagged if the query exhibits actual mathematical properties:
```javascript
const MATH_FUNCTION_NAMES = /\b(sin|cos|tan|log|ln|sqrt|abs|exp|derivative|integral|integrate|differentiate|gcd|lcm|det|matrix)\b/i;
const hasMathDigit = /\d/.test(msgLower);
const hasMathOperator = /[+\-*\/^=<>%]/.test(msgLower);
const hasMathFunction = MATH_FUNCTION_NAMES.test(msgLower);
const hasMathKeyword = /\b(solve|equation|algebra|calculus|derivative|integral|fraction|percentage|matrix|matrices|trigonometry|factorial|prime|fibonacci|quadratic|polynomial|logarithm|modulo)\b/i.test(msgLower);

const looksLikeMath = (hasMathDigit || hasMathFunction || hasMathKeyword) && 
                      (hasMathOperator || hasMathDigit || hasMathFunction || hasMathKeyword);

const isMath = !isTimeDate && !isForcedTimeDate && looksLikeMath &&
  (hasMathFunction ||
   /solve|\bderivative\b|\bintegrate\b|percentage|equation|x\s*=|differentiate|matrix|matrices|trigonometry|algebra|fraction|\bmath\b|\bmaths\b/i.test(msgLower) ||
   (/[+\-*/^=]/.test(msgLower) && !isSimpleCalc && !isDateCalc && !isCurrency && !isUnit));
```

### C. Priority Pipeline
1. `TIME_DATE` (Highest Priority for Temporal / Clock queries)
2. `CALCULATOR` / `MATH` (Strictly validated arithmetic and symbolic equations)
3. `CODING`
4. `DOCUMENT` (RAG)
5. `MEMORY`
6. `WEB` (Real-time online search fallback)
7. `GENERAL` (SLM conversational fallback)

---

## 5. Python Math Engine Solver Safety Gate (`solver.py`)

Added strict mathematical validation to reject arbitrary natural-language words before SymPy ever parses the string:

```python
MATH_IDENTIFIER_WHITELIST = frozenset({
    'x', 'y', 'z', 't', 'a', 'b', 'c', 'n', 'k', 'm', 'r', 'theta', 'pi', 'e', 'i',
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
    'sqrt', 'cbrt', 'exp', 'log', 'ln', 'abs', 'floor', 'ceil',
    'diff', 'integrate', 'limit', 'series', 'sum', 'solve', 'factor', 'expand',
    'simplify', 'matrix', 'det', 'gcd', 'lcm', 'factorial', 'gamma'
})

NATURAL_LANGUAGE_BLOCKLIST = frozenset({
    'today', 'tomorrow', 'yesterday', 'date', 'time', 'clock', 'day', 'month', 'year',
    'hello', 'hi', 'hey', 'greetings', 'welcome', 'thanks', 'thank',
    'react', 'python', 'javascript', 'typescript', 'node', 'express', 'html', 'css',
    'what', 'how', 'why', 'when', 'where', 'who', 'which', 'is', 'are', 'the',
    'weather', 'news', 'search', 'find', 'explain', 'tell', 'about'
})

def is_valid_math_expression(query: str) -> bool:
    # 1. Natural language blocklist check
    # 2. Reject queries containing zero digits, zero operators, zero math functions
    # 3. Only allow valid mathematical identifiers
```

At the very top of `MathEngineSolver.solve(problem)`:
```python
if not is_valid_math_expression(cleaned):
    return {
        "success": False,
        "category": "rejected",
        "error": f"Input '{cleaned}' is not a mathematical expression. Route to appropriate intent handler.",
        "latency_ms": 0
    }
```
And repeated before Section 9 (the symbolic fallback).

---

## 6. Tamil and Tanglish Temporal Handling

Tamil script and Tanglish phrases are now explicitly recognized and routed to `TIME_DATE`:

| Input | Language | Resolved Intent | Result |
| :--- | :--- | :--- | :--- |
| `இன்று` | Tamil | `TIME_DATE` | Monday, September 28, 2026 |
| `இன்று என்ன தேதி?` | Tamil | `TIME_DATE` | Monday, September 28, 2026 |
| `இன்னைக்கு என்ன date?` | Tanglish | `TIME_DATE` | Monday, September 28, 2026 |
| `இப்போ என்ன time?` | Tanglish | `TIME_DATE` | Current IST Time |
| `innaiku enna date?` | Tanglish (Latin) | `TIME_DATE` | Monday, September 28, 2026 |
| `innaiku enna naal?` | Tanglish (Latin) | `TIME_DATE` | Monday, September 28, 2026 |

---

## 7. Frontend Markdown & Label Display

### A. Markdown Rendering Overhaul
- Installed `react-markdown` and `remark-gfm`.
- Rewrote `src/components/MessageBubble.tsx`.
- Headings, lists, blockquotes, bold/italic text, and tables now render with clean, custom styling without raw `**` or `###` syntax leaks.
- Math equations (`234-2342 = -2108`) render cleanly without asterisks.

### B. Badge Accuracy
- `TIME_DATE` responses display model as `Mathiyon System Clock` with `TimeDateEngine` tool.
- Badges like `[Verified Math Engine]` or `Mathiyon Calculator Engine` **never appear** for date or time questions.

---

## 8. Verification & Test Matrix Results

### A. Intent Routing Test Suite (`test_intent_routing_fix.cjs`)
All 12 targeted unit/integration tests passed:

| # | Test Prompt | Expected Intent | Actual Intent | Status | Output / Model |
|---|---|---|---|---|---|
| 1 | `today` | `TIME_DATE` | `TIME_DATE` | **PASS** | Mathiyon System Clock (2026) |
| 2 | `tomorrow` | `TIME_DATE` | `TIME_DATE` | **PASS** | Mathiyon System Clock (2026) |
| 3 | `yesterday` | `TIME_DATE` | `TIME_DATE` | **PASS** | Mathiyon System Clock (2026) |
| 4 | `இன்று` | `TIME_DATE` | `TIME_DATE` | **PASS** | Mathiyon System Clock (2026) |
| 5 | `இன்று என்ன தேதி?` | `TIME_DATE` | `TIME_DATE` | **PASS** | Mathiyon System Clock (2026) |
| 6 | `innaiku enna date?` | `TIME_DATE` | `TIME_DATE` | **PASS** | Mathiyon System Clock (2026) |
| 7 | `hello` | `GENERAL` | `GENERAL` | **PASS** | Mathiyon SLM v1.2 |
| 8 | `react` | `CODING` | `CODING` | **PASS** | Mathiyon SLM v1.2 |
| 9 | `25 + 30` | `CALCULATOR` | `CALCULATOR` | **PASS** | Mathiyon Calculator Engine (55) |
| 10 | `2x + 5 = 15` | `MATH` | `MATH` | **PASS** | Mathiyon SymPy Engine ($x = 5$) |
| 11 | `sin(0)` | `MATH` | `MATH` | **PASS** | Mathiyon SymPy Engine ($0$) |
| 12 | Direct Python `/math/solve` (`"today"`) | `rejected` | `rejected` | **PASS** | `success: false, category: "rejected"` |

### B. Critical Regression Test Suite (`test_live_chat_integration_fix.cjs`)
All 10/10 end-to-end integration tests continue to pass with 0 failures:
1. `what is today date` $\to$ **PASS** (`TIME_DATE`, 25ms)
2. `what time is it` $\to$ **PASS** (`TIME_DATE`, 21ms)
3. `what day is today` $\to$ **PASS** (`TIME_DATE`, 20ms)
4. `Search online about quantum computing` $\to$ **PASS** (`WEB`, 188ms)
5. `latest React version` $\to$ **PASS** (`MULTI_TOOL`, 218ms)
6. `hi` $\to$ **PASS** (`GENERAL`, 72ms)
7. `25 * 30` $\to$ **PASS** (`CALCULATOR`, 20ms)
8. `What is React?` $\to$ **PASS** (`CODING`, 57ms)
9. `What does my uploaded PDF say about authentication?` $\to$ **PASS** (`DOCUMENT`, 199ms)
10. `Search online and compare...` $\to$ **PASS** (`MULTI_TOOL`, 162ms)

---

## 9. Final Acceptance Checklist

- [x] `"today"` $\longrightarrow$ `TIME_DATE` (Never Math Engine)
- [x] `"today date"` $\longrightarrow$ `TIME_DATE`
- [x] `"what is today's date?"` $\longrightarrow$ `TIME_DATE`
- [x] `"what day is today?"` $\longrightarrow$ `TIME_DATE`
- [x] `"what time is it?"` $\longrightarrow$ `TIME_DATE`
- [x] Tamil date query (`இன்று என்ன தேதி?`) $\longrightarrow$ `TIME_DATE`
- [x] Tanglish date query (`innaiku enna date?`) $\longrightarrow$ `TIME_DATE`
- [x] `"today"` never becomes `a*d*o*t*y`
- [x] Normal English words never become multiplication
- [x] Real mathematical variables ($x$, $y$, $z$, $\sin(x)$, $x^2$) still solve correctly
- [x] Natural-language math (`solve 2x + 5 = 15`) still works
- [x] Math Engine only receives validated math expressions
- [x] General conversation, Web Search, RAG, and Memory fully operational
- [x] Frontend Markdown rendered without literal asterisks or raw tags
- [x] Verified Math Engine badges strictly reserved for real mathematical solutions
- [x] TypeScript validation clean (`tsc --noEmit` exited code 0)
