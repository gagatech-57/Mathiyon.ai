/**
 * Mathiyon AI - Memory Tool
 * Interfaces with Long-Term User Memory & Short-Term Context Service.
 */

const memoryTool = {
  name: 'Memory',
  description: 'Retrieves and manages user long-term preferences, project facts, and context memories.',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      action: { type: 'string', enum: ['get', 'remember'] },
      query: { type: 'string' },
      content: { type: 'string' }
    },
    required: ['userId', 'action']
  },

  async execute({ userId, action, query = '', content = '' }) {
    if (!userId) {
      return { success: false, error: 'userId required for memory tool' };
    }

    const memoryService = require('../memoryService');

    try {
      if (action === 'remember') {
        const memory = await memoryService.saveUserMemory(userId, content);
        return {
          success: true,
          type: 'memory',
          action: 'remembered',
          memory
        };
      } else {
        const memories = await memoryService.getRelevantMemories(userId, query);
        return {
          success: true,
          type: 'memory',
          action: 'retrieved',
          memories,
          contextString: memories.map(m => `- ${m.content}`).join('\n')
        };
      }
    } catch (err) {
      return { success: false, error: `Memory tool error: ${err.message}` };
    }
  }
};

module.exports = memoryTool;
