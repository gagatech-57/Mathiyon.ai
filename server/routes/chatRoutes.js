const express = require('express');
const router = express.Router();
const { 
  sendChatMessage, 
  getConversations, 
  getConversationMessages, 
  createConversation,
  renameConversation,
  togglePinConversation,
  deleteConversation,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// All chat routes are protected with JWT authentication
router.post('/', protect, sendChatMessage);
router.get('/conversations', protect, getConversations);
router.get('/conversations/:id', protect, getConversationMessages);
router.post('/conversations', protect, createConversation);
router.patch('/conversations/:id/rename', protect, renameConversation);
router.patch('/conversations/:id/pin', protect, togglePinConversation);
router.delete('/conversations/:id', protect, deleteConversation);

module.exports = router;
