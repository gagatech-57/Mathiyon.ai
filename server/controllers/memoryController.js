/**
 * Mathiyon AI - Memory Controller
 * Controller endpoints for GET /api/memory, POST /api/memory, DELETE /api/memory/:id
 */

const memoryService = require('../services/memoryService');

// @desc    Get authenticated user's stored memories
// @route   GET /api/memory
// @access  Private (JWT Protected)
const getMemories = async (req, res) => {
  try {
    const userId = req.user.id;
    const memories = await memoryService.getUserMemories(userId);
    return res.json({ success: true, count: memories.length, memories });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to fetch memories: ${err.message}` });
  }
};

// @desc    Create long-term memory entry
// @route   POST /api/memory
// @access  Private (JWT Protected)
const createMemory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, type, importance } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Memory content string is required' });
    }

    const memory = await memoryService.saveUserMemory(userId, content.trim(), type || 'preference', importance || 1);
    return res.status(201).json({ success: true, message: 'Memory saved successfully', memory });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to create memory: ${err.message}` });
  }
};

// @desc    Delete long-term memory entry with strict security check
// @route   DELETE /api/memory/:id
// @access  Private (JWT Protected)
const deleteMemory = async (req, res) => {
  try {
    const userId = req.user.id;
    const memoryId = req.params.id;

    const result = await memoryService.deleteUserMemory(userId, memoryId);
    if (!result.success) {
      return res.status(result.status || 400).json({ success: false, message: result.message });
    }

    return res.json({ success: true, message: 'Memory deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to delete memory: ${err.message}` });
  }
};

module.exports = {
  getMemories,
  createMemory,
  deleteMemory,
};
