# Mathiyon AI — Security & User Isolation Architecture (Phase 10)

Mathiyon AI enforces zero-trust security controls across all platform capabilities.

---

## 🔒 Security Principles & Protection Controls

1. **JWT Authentication**: All `/api/chat`, `/api/files`, `/api/memory`, `/api/math` endpoints require valid Bearer JWT.
2. **Document Isolation (IDOR Defense)**: Unauthorized access to another user's document ID returns `HTTP 403 Forbidden`.
3. **Memory Isolation**: User A cannot read or delete User B's long-term memory facts (`HTTP 403 Forbidden`).
4. **Prompt Injection Defense**: Retrieved document text and web search snippets are treated strictly as DATA within system prompts, preventing prompt overrides.
5. **No Arbitrary Tool Execution**: Tool calls are input-validated against predefined schemas (`inputSchema`). No dynamic string code execution.
6. **Input Validation**: Mongoose ObjectId validation and sanitization.
