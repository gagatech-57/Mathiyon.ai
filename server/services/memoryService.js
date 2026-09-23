/**
 * Mathiyon AI - Memory Service (Phase 6)
 * Handles short-term context windowing, conversation summarization, and long-term user memory CRUD.
 */

const Memory = require('../models/Memory');
const mongoose = require('mongoose');

const RECENT_MESSAGE_LIMIT = 20;

const memoryService = {
  RECENT_MESSAGE_LIMIT,

  /**
   * Saves explicit long-term memory for authenticated user
   */
  async saveUserMemory(userId, content, type = 'preference', importance = 1) {
    if (!userId || !content) return null;
    const isMongoConnected = mongoose.connection.readyState === 1;
    if (!isMongoConnected) return { id: 'temp_mem', userId, content, type, createdAt: new Date() };

    // Clean content string (e.g. remove "remember that ")
    const cleanContent = content.replace(/^remember\s+(that\s+)?(my\s+)?/i, '').trim();

    const memory = await Memory.create({
      userId,
      type,
      content: cleanContent || content,
      importance
    });

    return memory;
  },

  /**
   * Retrieves all long-term memories belonging to authenticated user with security check
   */
  async getUserMemories(userId) {
    if (!userId) return [];
    const isMongoConnected = mongoose.connection.readyState === 1;
    if (!isMongoConnected) return [];

    return await Memory.find({ userId }).sort({ createdAt: -1 });
  },

  /**
   * Retrieves relevant long-term memories for chat context synthesis
   */
  async getRelevantMemories(userId, query = '') {
    if (!userId) return [];
    const isMongoConnected = mongoose.connection.readyState === 1;
    if (!isMongoConnected) return [];

    const memories = await Memory.find({ userId }).sort({ createdAt: -1 }).limit(10);
    if (!query) return memories;

    const queryTerms = query.toLowerCase().split(/\s+/);
    return memories.filter(m => {
      const contentLower = m.content.toLowerCase();
      return queryTerms.some(term => term.length > 3 && contentLower.includes(term));
    });
  },

  /**
   * Deletes a memory document enforcing strict userId authorization
   */
  async deleteUserMemory(userId, memoryId) {
    if (!userId || !memoryId) return { success: false, status: 400, message: 'Invalid parameters' };
    const isMongoConnected = mongoose.connection.readyState === 1;
    if (!isMongoConnected) return { success: true };

    const memory = await Memory.findById(memoryId);
    if (!memory) {
      return { success: false, status: 404, message: 'Memory not found' };
    }

    // PART 6 Security Check: User Isolation
    if (memory.userId.toString() !== userId.toString()) {
      return { success: false, status: 403, message: 'Forbidden: Unauthorized memory deletion' };
    }

    await Memory.deleteOne({ _id: memoryId });
    return { success: true, message: 'Memory deleted successfully' };
  },

  /**
   * Helper: Summarizes older conversation messages if total exceeds context window
   */
  summarizeConversationHistory(pastMessages = []) {
    if (pastMessages.length <= RECENT_MESSAGE_LIMIT) {
      return {
        hasSummary: false,
        summaryText: '',
        recentMessages: pastMessages
      };
    }

    const olderMessages = pastMessages.slice(0, pastMessages.length - RECENT_MESSAGE_LIMIT);
    const recentMessages = pastMessages.slice(pastMessages.length - RECENT_MESSAGE_LIMIT);

    const summaryItems = olderMessages.map(m => `User asked about ${m.message.substring(0, 30)}...`).join('; ');
    const summaryText = `Earlier conversation summary: ${summaryItems}`;

    return {
      hasSummary: true,
      summaryText,
      recentMessages
    };
  }
};

module.exports = memoryService;
