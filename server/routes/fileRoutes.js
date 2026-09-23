const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  uploadDocument,
  reprocessDocument,
  getUserDocuments,
  searchDocumentChunks,
  deleteDocument,
} = require('../controllers/fileController');

// All file endpoints are protected by JWT authentication middleware
router.post('/upload', protect, uploadDocument);
router.post('/:id/reprocess', protect, reprocessDocument);
router.get('/', protect, getUserDocuments);
router.post('/search', protect, searchDocumentChunks);
router.delete('/:id', protect, deleteDocument);

module.exports = router;
