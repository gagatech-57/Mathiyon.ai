/**
 * Mathiyon AI - Memory Routes
 * Mounted at /api/memory
 */

const express = require('express');
const router = express.Router();
const { getMemories, createMemory, deleteMemory } = require('../controllers/memoryController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);


router.route('/')
  .get(getMemories)
  .post(createMemory);

router.route('/:id')
  .delete(deleteMemory);

module.exports = router;
