const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://127.0.0.1:8000';
const MAX_CONTEXT_MESSAGES = 20;

// Helper to query Python FastAPI PyTorch Service with Context Window
const callPythonAiService = async (message, conversationHistory = []) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch(`${PYTHON_AI_SERVICE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversation: conversationHistory,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        response: data.response,
        model: data.model || 'Mathiyon Neural Prototype / SLM v1.0',
        version: data.version || 'SLM v1.0',
        engine: data.engine || 'PyTorch SLM v1.0',
        tokens_processed: data.tokens_processed,
        tokens_generated: data.tokens_generated,
        generation_time_ms: data.generation_time_ms,
      };
    } else {
      console.warn(`Python AI Service returned HTTP status ${res.status}`);
      return {
        success: false,
        offline: true,
        error: 'Mathiyon AI is temporarily unavailable.',
      };
    }
  } catch (error) {
    console.warn(`Python PyTorch AI Service connectivity alert (${error.message}).`);
    return {
      success: false,
      offline: true,
      error: 'Mathiyon AI is temporarily unavailable.',
    };
  }
};

// @desc    Send chat prompt & save to MongoDB
// @route   POST /api/chat
// @access  Private (JWT Protected)
// Helper to call Python FastAPI Math Solver
const callPythonMathSolver = async (question) => {
  try {
    const res = await fetch(`${PYTHON_AI_SERVICE_URL}/math/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, difficulty: 'intermediate' }),
    });
    if (res.ok) return await res.json();
  } catch (err) {}
  return null;
};

// @desc    Send chat prompt & save to MongoDB (Powered by AI Orchestrator)
// @route   POST /api/chat
// @access  Private (JWT Protected)
const sendChatMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, model, conversationId, documentId, documentIds, enableWebSearch } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message prompt is required' });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;
    let currentConvId = conversationId;
    let convTitle = message.trim().length > 30 ? message.trim().substring(0, 30) + '...' : message.trim();
    let pastContext = [];

    // Parse target document IDs array or single documentId string
    const targetDocIds = [];
    if (documentId) targetDocIds.push(documentId);
    if (Array.isArray(documentIds)) {
      documentIds.forEach((id) => { if (id && !targetDocIds.includes(id)) targetDocIds.push(id); });
    }

    if (isMongoConnected) {
      let conversation;
      if (currentConvId) {
        conversation = await Conversation.findOne({ _id: currentConvId, userId });
      }

      if (!conversation) {
        conversation = await Conversation.create({
          userId,
          title: convTitle,
          model: model || 'Mathiyon SLM v1.2 Orchestrator',
        });
        currentConvId = conversation._id.toString();
      } else {
        conversation.updatedAt = Date.now();
        await conversation.save();

        const pastMessages = await Message.find({ conversationId: currentConvId, userId })
          .sort({ createdAt: -1 })
          .limit(MAX_CONTEXT_MESSAGES);

        pastContext = pastMessages.reverse().map((m) => [
          { role: 'user', content: m.message },
          { role: 'assistant', content: m.response },
        ]).flat();
      }
    } else {
      if (!currentConvId) currentConvId = 'conv_' + Date.now();
    }

    // Pass request through AI Orchestrator
    const aiOrchestrator = require('../services/aiOrchestrator');
    const orchResult = await aiOrchestrator.processRequest({
      userId,
      message: message.trim(),
      conversationHistory: pastContext,
      documentIds: targetDocIds,
      model: model || 'Mathiyon SLM v1.2',
      enableWebSearch: Boolean(enableWebSearch)
    });

    if (!orchResult.success) {
      if (orchResult.statusCode === 403) {
        return res.status(403).json({ success: false, message: orchResult.message || 'Access denied to requested document(s)' });
      }
      return res.status(503).json({
        success: false,
        message: orchResult.error || 'Mathiyon AI Orchestrator is temporarily unavailable.',
        offline: true,
      });
    }

    const finalResponse = orchResult.answer;

    if (isMongoConnected) {
      const savedMessage = await Message.create({
        conversationId: currentConvId,
        userId,
        message: message.trim(),
        response: finalResponse,
        model: `Mathiyon Orchestrator (${orchResult.intent})`,
      });

      return res.status(201).json({
        success: true,
        answer: finalResponse,
        response: finalResponse,
        intent: orchResult.intent,
        toolsUsed: orchResult.toolsUsed,
        sources: orchResult.sources,
        verified: orchResult.verified,
        requestId: orchResult.requestId,
        totalLatencyMs: orchResult.totalLatencyMs,
        conversationId: currentConvId,
        conversationTitle: convTitle,
        message: savedMessage.message,
        model: savedMessage.model,
        timestamp: new Date(savedMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } else {
      return res.status(201).json({
        success: true,
        answer: finalResponse,
        response: finalResponse,
        intent: orchResult.intent,
        toolsUsed: orchResult.toolsUsed,
        sources: orchResult.sources,
        verified: orchResult.verified,
        requestId: orchResult.requestId,
        totalLatencyMs: orchResult.totalLatencyMs,
        conversationId: currentConvId,
        conversationTitle: convTitle,
        message: message.trim(),
        model: model || 'Mathiyon SLM v1.2 Orchestrator',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  } catch (error) {
    console.error('sendChatMessage error:', error);
    return res.status(500).json({ success: false, message: `Chat processing error: ${error.message}` });
  }
};

// @desc    Get all conversations for logged in user
// @route   GET /api/chat/conversations
// @access  Private (JWT Protected)
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const conversations = await Conversation.find({ userId }).sort({ updatedAt: -1 });
      const formatted = conversations.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        model: c.model,
        timestamp: new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      return res.json({ success: true, conversations: formatted });
    } else {
      const userConvs = memoryConversations
        .filter((c) => c.userId === userId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((c) => ({
          id: c.id,
          title: c.title,
          model: c.model,
          timestamp: new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
      return res.json({ success: true, conversations: userConvs });
    }
  } catch (error) {
    console.error('Get Conversations Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get messages for a specific conversation
// @route   GET /api/chat/conversations/:id
// @access  Private (JWT Protected)
const getConversationMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const messages = await Message.find({ conversationId, userId }).sort({ createdAt: 1 });
      
      const chatHistory = [];
      messages.forEach((m) => {
        chatHistory.push({
          id: `usr_${m._id}`,
          role: 'user',
          text: m.message,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        chatHistory.push({
          id: `ai_${m._id}`,
          role: 'assistant',
          text: m.response,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: m.model,
        });
      });

      return res.json({ success: true, messages: chatHistory });
    } else {
      const userMsgs = memoryMessages.filter((m) => m.conversationId === conversationId && m.userId === userId);
      const chatHistory = [];
      userMsgs.forEach((m) => {
        chatHistory.push({
          id: `usr_${m.id}`,
          role: 'user',
          text: m.message,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        chatHistory.push({
          id: `ai_${m.id}`,
          role: 'assistant',
          text: m.response,
          timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: m.model,
        });
      });

      return res.json({ success: true, messages: chatHistory });
    }
  } catch (error) {
    console.error('Get Messages Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new empty conversation session
// @route   POST /api/chat/conversations
// @access  Private (JWT Protected)
const createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, model } = req.body;
    const isMongoConnected = mongoose.connection.readyState === 1;

    const convTitle = title || 'New Mathiyon Chat';
    const convModel = model || 'Mathiyon Neural Prototype / SLM v1.0';

    if (isMongoConnected) {
      const conversation = await Conversation.create({
        userId,
        title: convTitle,
        model: convModel,
      });

      return res.status(201).json({
        success: true,
        conversation: {
          id: conversation._id.toString(),
          title: conversation.title,
          model: conversation.model,
          timestamp: new Date(conversation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      });
    } else {
      const newConv = {
        id: 'conv_' + Date.now(),
        userId,
        title: convTitle,
        model: convModel,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryConversations.push(newConv);

      return res.status(201).json({
        success: true,
        conversation: {
          id: newConv.id,
          title: newConv.title,
          model: newConv.model,
          timestamp: new Date(newConv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      });
    }
  } catch (error) {
    console.error('Create Conversation Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendChatMessage,
  getConversations,
  getConversationMessages,
  createConversation,
};
