const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');

const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const { extractTextFromDocument } = require('../services/documentExtractor');

const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://127.0.0.1:8000';
const UPLOAD_DIR = path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// In-memory fallback stores for document RAG if MongoDB is offline
const memoryDocuments = [];
const memoryChunks = [];

// Multer Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doc_${uniqueSuffix}${ext}`);
  },
});

// File filter validator
const allowedExtensions = [
  '.pdf', '.txt', '.docx', '.csv', '.json', '.md',
  '.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.c', '.cpp', '.java'
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowedExtensions.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB Max
});

// Helper to calculate Cosine Similarity between 2 vectors
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper to batch generate vector embeddings from Python AI service
async function generateEmbeddingsBatch(texts) {
  try {
    const res = await fetch(`${PYTHON_AI_SERVICE_URL}/embedBatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.embeddings && data.embeddings.length === texts.length) {
        return data.embeddings;
      }
    }
  } catch (err) {
    console.warn(`FastAPI embedding connection warning: ${err.message}. Generating local dense vector fallback.`);
  }

  // Fallback 384-d dense embedding generator if Python FastAPI service is offline
  return texts.map((t) => computeFallbackEmbedding(t));
}

function computeFallbackEmbedding(text, dim = 384) {
  const clean = text.toLowerCase().trim();
  const words = clean.split(/\s+/);
  const vec = new Array(dim).fill(0);
  if (!clean) return vec;

  for (let i = 0; i < clean.length - 2; i++) {
    const ngram = clean.substring(i, i + 3);
    let hash = 0;
    for (let j = 0; j < ngram.length; j++) hash = (hash << 5) - hash + ngram.charCodeAt(j);
    const idx = Math.abs(hash) % dim;
    vec[idx] += 1.0;
  }

  for (const w of words) {
    let hash1 = 0;
    let hash2 = 0;
    for (let j = 0; j < w.length; j++) {
      hash1 = (hash1 << 5) - hash1 + w.charCodeAt(j);
      hash2 = (hash2 << 7) - hash2 + w.charCodeAt(j);
    }
    vec[Math.abs(hash1) % dim] += 2.0;
    vec[Math.abs(hash2) % dim] += 1.5;
  }

  let mag = 0;
  for (let i = 0; i < dim; i++) mag += vec[i] * vec[i];
  mag = Math.sqrt(mag);
  if (mag > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= mag;
  }
  return vec;
}

// Configurable Chunking Engine
function chunkDocumentPages(pages, chunkSize = 800, chunkOverlap = 100) {
  const chunks = [];
  let globalChunkIndex = 0;

  for (const pageObj of pages) {
    const pageNum = pageObj.pageNumber || pageObj.page || 1;
    const text = (pageObj.text || '').replace(/\r\n/g, '\n').trim();
    if (!text) continue;

    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      // Avoid splitting words in half if not at end of text
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start + chunkSize / 2) {
          end = lastSpace;
        }
      }

      const chunkText = text.substring(start, end).trim();
      if (chunkText.length > 0) {
        chunks.push({
          page: pageNum,
          chunkIndex: globalChunkIndex++,
          text: chunkText,
        });
      }

      if (end >= text.length) break;
      start = end - chunkOverlap;
      if (start <= 0) start = end; // Prevent infinite loop
    }
  }

  return chunks;
}

// Processing Core Function
async function processDocumentInternal(docId, userId, filePath, originalName, mimeType, isMongoConnected) {
  let docRecord;

  if (isMongoConnected) {
    docRecord = await Document.findOne({ _id: docId, userId });
  } else {
    docRecord = memoryDocuments.find((d) => d._id === docId && d.userId === userId);
  }

  if (!docRecord) throw new Error('Document record not found');

  try {
    // 1. Text Extraction
    const extraction = await extractTextFromDocument(filePath, originalName);

    if (!extraction.text || extraction.text.trim().length === 0) {
      throw new Error('PDF extraction returned empty text');
    }

    // 2. Chunking
    const textChunks = chunkDocumentPages(extraction.pages, 800, 100);

    if (textChunks.length === 0) {
      throw new Error('No valid text chunks generated from document');
    }

    // 3. Embedding Generation
    const rawTexts = textChunks.map((c) => c.text);
    const embeddings = await generateEmbeddingsBatch(rawTexts);

    // Verify 384-d vector dimension
    for (let i = 0; i < embeddings.length; i++) {
      if (!embeddings[i] || embeddings[i].length !== 384) {
        throw new Error(`Embedding vector generation failed: dimension mismatch (expected 384, got ${embeddings[i] ? embeddings[i].length : 0})`);
      }
    }

    // 4. Clear any previous chunks (reprocess safety)
    if (isMongoConnected) {
      await DocumentChunk.deleteMany({ documentId: docId, userId });
    } else {
      for (let i = memoryChunks.length - 1; i >= 0; i--) {
        if (memoryChunks[i].documentId === docId && memoryChunks[i].userId === userId) {
          memoryChunks.splice(i, 1);
        }
      }
    }

    // 5. Save chunks
    const chunkRecords = textChunks.map((c, i) => ({
      documentId: docId,
      userId,
      originalFilename: originalName,
      text: c.text,
      page: c.page,
      chunkIndex: c.chunkIndex,
      tokenCount: Math.ceil(c.text.length / 4),
      embedding: embeddings[i],
    }));

    if (isMongoConnected) {
      await DocumentChunk.insertMany(chunkRecords);
      docRecord.status = 'ready';
      docRecord.pageCount = extraction.pageCount;
      docRecord.chunkCount = chunkRecords.length;
      docRecord.errorMessage = '';
      await docRecord.save();
    } else {
      memoryChunks.push(...chunkRecords);
      docRecord.status = 'ready';
      docRecord.pageCount = extraction.pageCount;
      docRecord.chunkCount = chunkRecords.length;
      docRecord.errorMessage = '';
    }

    return {
      status: 'ready',
      pageCount: extraction.pageCount,
      chunkCount: chunkRecords.length,
    };
  } catch (err) {
    console.error(`Document ${docId} Processing Error:`, err.message);
    const failMsg = err.message || 'Document processing failed';

    if (isMongoConnected) {
      docRecord.status = 'failed';
      docRecord.errorMessage = failMsg;
      await docRecord.save();
    } else {
      docRecord.status = 'failed';
      docRecord.errorMessage = failMsg;
    }

    throw new Error(failMsg);
  }
}

// @desc    Upload & Process Document for RAG (JWT Protected)
// @route   POST /api/files/upload
const uploadDocument = async (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach a document file' });
    }

    const userId = req.user.id;
    const file = req.file;
    const isMongoConnected = mongoose.connection.readyState === 1;

    let docRecord;

    try {
      if (isMongoConnected) {
        docRecord = await Document.create({
          userId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
          filePath: file.path,
          status: 'processing',
        });
      } else {
        docRecord = {
          _id: 'doc_' + Date.now(),
          userId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
          filePath: file.path,
          status: 'processing',
          createdAt: new Date(),
        };
        memoryDocuments.push(docRecord);
      }

      const docId = isMongoConnected ? docRecord._id.toString() : docRecord._id;

      // Execute internal processing pipeline
      const procResult = await processDocumentInternal(
        docId,
        userId,
        file.path,
        file.originalname,
        file.mimetype,
        isMongoConnected
      );

      return res.status(201).json({
        success: true,
        message: 'Document processed and indexed successfully.',
        document: {
          id: docId,
          filename: docRecord.filename,
          originalName: docRecord.originalName,
          mimeType: docRecord.mimeType,
          size: docRecord.size,
          status: procResult.status,
          pageCount: procResult.pageCount,
          chunkCount: procResult.chunkCount,
          createdAt: docRecord.createdAt,
        },
      });
    } catch (procErr) {
      return res.status(422).json({
        success: false,
        message: procErr.message || 'Document extraction/indexing failed.',
        document: docRecord ? {
          id: isMongoConnected ? docRecord._id.toString() : docRecord._id,
          filename: docRecord.filename,
          originalName: docRecord.originalName,
          status: 'failed',
          errorMessage: procErr.message,
        } : null,
      });
    }
  });
};

// @desc    Reprocess a previously failed document (JWT Protected & User Isolated)
// @route   POST /api/files/:id/reprocess
const reprocessDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    const isMongoConnected = mongoose.connection.readyState === 1;

    let doc;
    if (isMongoConnected) {
      doc = await Document.findOne({ _id: documentId, userId });
    } else {
      doc = memoryDocuments.find((d) => d._id === documentId && d.userId === userId);
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found or access denied' });
    }

    if (!fs.existsSync(doc.filePath)) {
      return res.status(400).json({ success: false, message: 'Source file does not exist on disk' });
    }

    doc.status = 'processing';
    if (isMongoConnected) await doc.save();

    const procResult = await processDocumentInternal(
      documentId,
      userId,
      doc.filePath,
      doc.originalName,
      doc.mimeType,
      isMongoConnected
    );

    return res.json({
      success: true,
      message: 'Document successfully reprocessed and re-indexed.',
      document: {
        id: documentId,
        originalName: doc.originalName,
        status: procResult.status,
        pageCount: procResult.pageCount,
        chunkCount: procResult.chunkCount,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Reprocessing failed: ${err.message}`,
    });
  }
};

// @desc    Get all user documents (JWT Protected)
// @route   GET /api/files
const getUserDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const docs = await Document.find({ userId }).sort({ createdAt: -1 });
      const formatted = docs.map((d) => ({
        id: d._id.toString(),
        filename: d.filename,
        originalName: d.originalName,
        mimeType: d.mimeType,
        size: d.size,
        status: d.status,
        pageCount: d.pageCount,
        chunkCount: d.chunkCount,
        errorMessage: d.errorMessage,
        createdAt: d.createdAt,
      }));
      return res.json({ success: true, documents: formatted });
    } else {
      const userDocs = memoryDocuments
        .filter((d) => d.userId === userId)
        .map((d) => ({
          id: d._id,
          filename: d.filename,
          originalName: d.originalName,
          mimeType: d.mimeType,
          size: d.size,
          status: d.status,
          pageCount: d.pageCount || 1,
          chunkCount: d.chunkCount || 0,
          errorMessage: d.errorMessage,
          createdAt: d.createdAt,
        }));
      return res.json({ success: true, documents: userDocs });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Vector Search Document Chunks (JWT Protected & User Isolated - PART 8 Security Enforcement)
// @route   POST /api/files/search
const searchDocumentChunks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { query, documentId, documentIds, topK = 5 } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Query string is required' });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    // PART 8 Security: Validate documentId/documentIds belong to req.user.id
    const targetDocIds = [];
    if (documentId) targetDocIds.push(documentId);
    if (Array.isArray(documentIds)) {
      documentIds.forEach((id) => { if (id && !targetDocIds.includes(id)) targetDocIds.push(id); });
    }

    if (targetDocIds.length > 0) {
      if (isMongoConnected) {
        const ownedCount = await Document.countDocuments({ _id: { $in: targetDocIds }, userId });
        if (ownedCount !== targetDocIds.length) {
          // PART 8: Return 403 Forbidden on unauthorized document access without leaking existence
          return res.status(403).json({ success: false, message: 'Access denied to requested document(s)' });
        }
      } else {
        const owned = memoryDocuments.filter((d) => targetDocIds.includes(d._id) && d.userId === userId);
        if (owned.length !== targetDocIds.length) {
          return res.status(403).json({ success: false, message: 'Access denied to requested document(s)' });
        }
      }
    }

    // Generate embedding for query
    const [queryEmbedding] = await generateEmbeddingsBatch([query.trim()]);

    let candidateChunks = [];

    if (isMongoConnected) {
      const filter = { userId };
      if (targetDocIds.length === 1) {
        filter.documentId = targetDocIds[0];
      } else if (targetDocIds.length > 1) {
        filter.documentId = { $in: targetDocIds };
      }
      candidateChunks = await DocumentChunk.find(filter);
    } else {
      candidateChunks = memoryChunks.filter(
        (c) => c.userId === userId && (targetDocIds.length === 0 || targetDocIds.includes(c.documentId))
      );
    }

    if (candidateChunks.length === 0) {
      return res.json({ success: true, chunks: [], query });
    }

    // Rank candidate chunks by Cosine Similarity
    const scored = candidateChunks.map((chunk) => {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        id: chunk._id ? chunk._id.toString() : chunk.documentId + '_' + chunk.chunkIndex,
        documentId: chunk.documentId,
        originalFilename: chunk.originalFilename,
        text: chunk.text,
        page: chunk.page,
        chunkIndex: chunk.chunkIndex,
        score: parseFloat(score.toFixed(4)),
      };
    });

    // Sort descending by score & slice Top K
    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, Math.min(topK, scored.length));

    return res.json({
      success: true,
      query,
      topK,
      chunks: topChunks,
    });
  } catch (err) {
    console.error('Vector Search Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete user document (JWT Protected & User Isolated)
// @route   DELETE /api/files/:id
const deleteDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const doc = await Document.findOne({ _id: documentId, userId });
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found or access denied' });
      }

      if (fs.existsSync(doc.filePath)) {
        try { fs.unlinkSync(doc.filePath); } catch (e) {}
      }

      await Document.deleteOne({ _id: documentId, userId });
      await DocumentChunk.deleteMany({ documentId, userId });

      return res.json({ success: true, message: 'Document and vector indices deleted' });
    } else {
      const docIdx = memoryDocuments.findIndex((d) => d._id === documentId && d.userId === userId);
      if (docIdx === -1) {
        return res.status(404).json({ success: false, message: 'Document not found or access denied' });
      }

      const doc = memoryDocuments[docIdx];
      if (fs.existsSync(doc.filePath)) {
        try { fs.unlinkSync(doc.filePath); } catch (e) {}
      }

      memoryDocuments.splice(docIdx, 1);
      for (let i = memoryChunks.length - 1; i >= 0; i--) {
        if (memoryChunks[i].documentId === documentId && memoryChunks[i].userId === userId) {
          memoryChunks.splice(i, 1);
        }
      }

      return res.json({ success: true, message: 'Document and vector indices deleted' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  uploadDocument,
  reprocessDocument,
  getUserDocuments,
  searchDocumentChunks,
  deleteDocument,
  generateEmbeddingsBatch,
  cosineSimilarity,
};
