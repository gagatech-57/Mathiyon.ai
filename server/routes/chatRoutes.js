const express = require('express');
const router = express.Router();
const { 
  sendChatMessage, 
  getConversations, 
  getConversationMessages, 
  createConversation 
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// All chat routes are protected with JWT authentication
router.post('/', protect, sendChatMessage);
router.get('/conversations', protect, getConversations);
router.get('/conversations/:id', protect, getConversationMessages);
router.post('/conversations', protect, createConversation);

module.exports = router;
