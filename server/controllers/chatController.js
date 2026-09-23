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

// @desc    Send chat prompt & save to MongoDB
// @route   POST /api/chat
// @access  Private (JWT Protected)
const sendChatMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, model, conversationId, documentId, documentIds } = req.body;

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

    // --- RAG DOCUMENT INTELLIGENCE RETRIEVAL ---
    let ragContextText = '';
    let ragCitations = [];
    let isRagActive = false;

    if (targetDocIds.length > 0 || /pdf|doc|document|file|chapter|page|according to/i.test(message)) {
      try {
        const { searchDocumentChunks } = require('./fileController');
        let searchResult = null;
        let statusCode = 200;
        
        await searchDocumentChunks({
          user: { id: userId },
          body: { query: message, documentIds: targetDocIds, topK: 5 }
        }, {
          json: (data) => { searchResult = data; },
          status: (code) => {
            statusCode = code;
            return { json: (data) => { searchResult = data; } };
          }
        });

        // PART 8 Security Check: Unauthorized Document Access
        if (statusCode === 403) {
          return res.status(403).json({ success: false, message: 'Access denied to requested document(s)' });
        }

        if (searchResult && searchResult.success && searchResult.chunks && searchResult.chunks.length > 0) {
          const relevantChunks = searchResult.chunks.filter(c => c.score >= 0.15);

          if (relevantChunks.length > 0) {
            isRagActive = true;
            ragContextText = relevantChunks
              .map(c => `[Source: ${c.originalFilename} — Page ${c.page}]\n${c.text}`)
              .join('\n\n');
            
            const uniqueCit = new Set();
            relevantChunks.forEach(c => uniqueCit.add(`${c.originalFilename} — Page ${c.page}`));
            ragCitations = Array.from(uniqueCit);
          } else if (targetDocIds.length > 0) {
            // User explicitly selected document(s), but no relevant chunk found
            return res.status(201).json({
              success: true,
              conversationId: currentConvId || 'conv_rag',
              conversationTitle: 'Document Search',
              message: message.trim(),
              response: "The document does not contain this information.",
              model: model || 'Mathiyon SLM v1.2 RAG',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
          }
        } else if (targetDocIds.length > 0) {
          return res.status(201).json({
            success: true,
            conversationId: currentConvId || 'conv_rag',
            conversationTitle: 'Document Search',
            message: message.trim(),
            response: "The document does not contain this information.",
            model: model || 'Mathiyon SLM v1.2 RAG',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      } catch (ragErr) {
        console.warn('RAG retrieval warning:', ragErr.message);
      }
    }

    // --- REQUIREMENT 17: HYBRID RAG + MATH ENGINE ROUTING ---
    let finalPrompt = message.trim();
    let isMathCalculationRequested = /calculate|multiply|solve|compute|\+|\*|\/|\^|percentage|sum|total/i.test(message);

    if (isRagActive) {
      if (isMathCalculationRequested) {
        const mathAttempt = await callPythonMathSolver(`${message} given ${ragContextText.substring(0, 300)}`);
        if (mathAttempt && mathAttempt.success && mathAttempt.verified) {
          const mathResponse = `${mathAttempt.explanation || mathAttempt.result}\n\nSource:\n${ragCitations.map(c => `📄 ${c}`).join('\n')}`;
          return res.status(201).json({
            success: true,
            conversationId: currentConvId || 'conv_rag_math',
            conversationTitle: 'Math Document Query',
            message: message.trim(),
            response: mathResponse,
            model: 'Mathiyon Verified Math Engine + RAG',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      }

      // PART 9 RAG PROMPT FORMATTING
      finalPrompt = `SYSTEM:
You are Mathiyon AI.
Answer the user's question using the supplied document context.

Rules:
1. Prefer information from the document.
2. Do not invent information that is not present.
3. If the document does not contain the answer, clearly say:
   "The document does not contain this information."
4. Keep the answer concise and useful.
5. Preserve mathematical values exactly.
6. If calculations are required, route calculations through the existing SymPy Math Engine.
7. Include document source information when available.

DOCUMENT CONTEXT:
${ragContextText}

USER QUESTION:
${message.trim()}`;
    }

    if (isMongoConnected) {
      // Find or create conversation in MongoDB
      let conversation;
      if (currentConvId) {
        conversation = await Conversation.findOne({ _id: currentConvId, userId });
      }

      if (!conversation) {
        conversation = await Conversation.create({
          userId,
          title: convTitle,
          model: model || 'Mathiyon Neural Prototype / SLM v1.0',
        });
        currentConvId = conversation._id.toString();
      } else {
        conversation.updatedAt = Date.now();
        await conversation.save();

        // Fetch up to MAX_CONTEXT_MESSAGES past conversation messages for context window
        const pastMessages = await Message.find({ conversationId: currentConvId, userId })
          .sort({ createdAt: -1 })
          .limit(MAX_CONTEXT_MESSAGES);

        pastContext = pastMessages.reverse().map((m) => [
          { role: 'user', content: m.message },
          { role: 'assistant', content: m.response },
        ]).flat();
      }

      // Query Python FastAPI PyTorch AI Engine with RAG Context
      const aiResult = await callPythonAiService(finalPrompt, pastContext);

      if (!aiResult.success) {
        return res.status(503).json({
          success: false,
          message: 'Mathiyon AI is temporarily unavailable.',
          offline: true,
        });
      }

      let finalResponse = aiResult.response;
      if (isRagActive && ragCitations.length > 0 && !finalResponse.includes('Source Citation')) {
        finalResponse += `\n\n📍 **Source Citation:**\n${ragCitations.map(c => `- ${c}`).join('\n')}`;
      }

      // Save message pair in MongoDB
      const savedMessage = await Message.create({
        conversationId: currentConvId,
        userId,
        message: message.trim(),
        response: finalResponse,
        model: isRagActive ? `${aiResult.model} + RAG` : aiResult.model,
      });

      return res.status(201).json({
        success: true,
        conversationId: currentConvId,
        conversationTitle: conversation.title,
        message: savedMessage.message,
        response: savedMessage.response,
        model: savedMessage.model,
        version: aiResult.version,
        engine: aiResult.engine,
        generation_time_ms: aiResult.generation_time_ms,
        timestamp: new Date(savedMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } else {
      // Memory store fallback
      let conversation = memoryConversations.find((c) => c.id === currentConvId && c.userId === userId);
      if (!conversation) {
        currentConvId = 'conv_' + Date.now();
        conversation = {
          id: currentConvId,
          userId,
          title: convTitle,
          model: model || 'Mathiyon Neural Prototype / SLM v1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryConversations.push(conversation);
      } else {
        conversation.updatedAt = new Date();
      }

      const pastMsgs = memoryMessages
        .filter((m) => m.conversationId === currentConvId && m.userId === userId)
        .slice(-MAX_CONTEXT_MESSAGES);

      pastContext = pastMsgs.map((m) => [
        { role: 'user', content: m.message },
        { role: 'assistant', content: m.response },
      ]).flat();

      const aiResult = await callPythonAiService(message.trim(), pastContext);

      if (!aiResult.success) {
        return res.status(503).json({
          success: false,
          message: 'Mathiyon AI is temporarily unavailable.',
          offline: true,
        });
      }

      const msgObj = {
        id: 'msg_' + Date.now(),
        conversationId: currentConvId,
        userId,
        message: message.trim(),
        response: aiResult.response,
        model: aiResult.model,
        createdAt: new Date(),
      };
      memoryMessages.push(msgObj);

      return res.status(201).json({
        success: true,
        conversationId: currentConvId,
        conversationTitle: conversation.title,
        message: msgObj.message,
        response: msgObj.response,
        model: msgObj.model,
        version: aiResult.version,
        engine: aiResult.engine,
        generation_time_ms: aiResult.generation_time_ms,
        timestamp: new Date(msgObj.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Chat processing error' });
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
