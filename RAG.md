# Mathiyon AI — Document Intelligence & RAG System (Phase 4 & 5)

Mathiyon AI provides a vector search Retrieval-Augmented Generation (RAG) pipeline with strict security controls.

---

## 📄 RAG Architecture

```
User File (PDF, TXT, DOCX, CSV, JSON, Markdown)
     │
     ▼
PDF Extractor (documentExtractor.js with PDFParse class API fallback)
     │
     ▼
Chunking (800 chars, 100 overlap)
     │
     ▼
384-dimensional dense vector embedding generation (/embedBatch)
     │
     ▼
MongoDB Vector Store (Document & DocumentChunk)
     │
     ▼
Exact Cosine Similarity Vector Matching (topK = 5)
     │
     ▼
Citations & Missing Info Protection ("The document does not contain this information.")
```

---

## 🔒 Document Security Controls

- `documentIds` search enforces strict `userId` checking in `fileController.js`.
- Accessing another user's document chunk returns `HTTP 403 Forbidden`.
