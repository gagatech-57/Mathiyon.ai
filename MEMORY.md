# Mathiyon AI — Conversation & Long-Term Memory Architecture (Phase 6)

Mathiyon AI maintains a 3-tier memory hierarchy for user context.

---

## 🧠 Memory Layers

1. **Short-Term Context Window**: Sliding window of recent messages (`RECENT_MESSAGE_LIMIT = 20`) attached to prompt synthesis.
2. **Conversation Summary**: Automatic summarization of older conversation history when total messages exceed threshold limit.
3. **Long-Term Memory Store**: Persistent MongoDB collection (`Memory`) storing user preferences, facts, and project settings across sessions.

---

## 🔒 Security & Data Isolation

- All memories are bound to the authenticated `userId`.
- Unauthorized requests to access or delete another user's memory return `HTTP 403 Forbidden` / 0 items.

---

## 📡 API Endpoints

- `GET /api/memory`: List authenticated user's stored long-term memories.
- `POST /api/memory`: Save a new custom memory item (`{ content, type }`).
- `DELETE /api/memory/:id`: Delete a memory item with authorization check.
