# MATHIYON AI — PHASE 12.2 AGENT ARCHITECTURE DOCUMENT

**Branch:** `phase-12-2-production-ai-agent`  
**Date:** September 25, 2026  
**System Role:** Production AI Agent & Multi-Tool Orchestrator Architecture  
**Production Model:** Mathiyon SLM v1.2 (100% Production Default Traffic)  
**Experimental Model:** Mathiyon SLM v1.3-RC1 (0% Production Traffic Default)  

---

## 1. AGENT ARCHITECTURE OVERVIEW

The Mathiyon AI Agent layer provides an intelligent multi-tool orchestration pipeline that receives user messages, classifies intent, plans tasks, executes tool pipelines, validates results, recovers from tool errors, and synthesizes unified responses.

```
                                USER
                                  |
                                  v
                            REACT FRONTEND
                                  |
                            EXPRESS API
                                  |
                           AI ORCHESTRATOR
                                  |
                          INTENT CLASSIFIER
                        (8 Normalized Intents)
                                  |
                            TASK PLANNER
                       (Sequential + dependsOn)
                                  |
                           TOOL SELECTOR
                      (8 Registered Capabilities)
                                  |
                           TOOL EXECUTION
                    (Timeout + 1-Retry Recovery)
                                  |
                          RESULT VALIDATOR
                   (403 Check + Fact Protection)
                                  |
                          RESPONSE COMPOSER
                                  |
                           SLM GENERATOR
                     (Mathiyon SLM v1.2 Default)
                                  |
                            FINAL RESPONSE
```

---

## 2. NORMALIZED AGENT INTENT SYSTEM

The Agent Intent Classifier (`detectIntent`) categorizes incoming requests into 8 normalized intent categories:

1. **`GENERAL`**: Conversational greetings, general knowledge, standard questions. Routed directly to SLM.
2. **`MATH`**: Symbolic and numeric calculations ($2+2$, percentages, algebra, calculus, matrices, unit conversions). Routed to SymPy Math Engine.
3. **`CODING`**: Code generation, syntax analysis, refactoring (TypeScript, Python, React, JavaScript). Routed to Code Engine / SLM.
4. **`DOCUMENT`**: RAG queries over uploaded user documents (PDF, TXT, DOCX, CSV, JSON, MD). Routed to Vector Search Engine.
5. **`MEMORY`**: Explicit memory directives ("remember that...") or user memory retrievals. Routed to Memory Tool.
6. **`WEB`**: Live current information or news queries. Routed to Web Intelligence Tool (returns controlled offline indicator when live search is unavailable).
7. **`MULTI_TOOL`**: Complex queries requiring multiple tools in sequence (e.g. RAG -> Math -> SLM, Memory -> SLM, RAG -> Math -> Code).
8. **`UNKNOWN`**: Unclassified fallback queries.

---

## 3. TASK PLANNING & DEPENDENCY RESOLUTION

Multi-tool tasks are structured into a normalized Task object:
- **`taskId`**: Unique task identifier.
- **`intent`**: Classified intent.
- **`steps`**: Array of execution steps.
- **`dependsOn`**: Array of prerequisite step IDs.

*Execution Flow:* Step 2 (`step_math`) only executes after Step 1 (`step_rag`) completes successfully. If a required dependency fails (e.g. document search returns no facts), dependent steps halt safely and a controlled response ("The document does not contain this information.") is returned without hallucination.

---

## 4. CONTROLLED CONTEXT PASSING & DATA ISOLATION
- Tool results are passed between steps through a sanitized `results` context object containing only minimum required fields.
- **User Authorization Boundaries:** User B cannot access User A documents, chunks, conversations, or memories (enforces HTTP 403 Forbidden).
- **Prompt Injection Defense:** Uploaded document text is wrapped in data containers; system rules prevent document text from overriding tool policies.

---

## 5. TOOL TIMEOUT & ERROR RECOVERY
- **Execution Timeout:** All tool calls enforce `TOOL_TIMEOUT_MS = 10000` (10 seconds max).
- **Fault Recovery:** Transient tool failures trigger a single safe retry. If the tool remains unavailable, a controlled status error is returned without crashing the orchestrator or leaking credentials.
