/**
 * Mathiyon AI - SLM Tool
 * Connects to Python FastAPI PyTorch Mathiyon SLM v1.2 engine.
 */

const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://127.0.0.1:8000';

const slmTool = {
  name: 'Mathiyon SLM',
  description: 'PyTorch Small Language Model v1.2 for reasoning, natural language generation, conversation, and prompt synthesis.',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      conversation: { type: 'array' }
    },
    required: ['message']
  },

  async execute({ message, conversation = [] }) {
    if (!message || typeof message !== 'string') {
      return { success: false, error: 'Invalid prompt string' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${PYTHON_AI_SERVICE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversation }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          type: 'slm',
          response: data.response,
          model: data.model || 'Mathiyon SLM v1.2',
          version: data.version || 'v1.2',
          engine: data.engine || 'PyTorch SLM v1.2',
          tokensProcessed: data.tokens_processed || 0,
          tokensGenerated: data.tokens_generated || 0,
          generationTimeMs: data.generation_time_ms || 0
        };
      } else {
        return { success: false, error: `SLM service HTTP ${res.status}` };
      }
    } catch (err) {
      return { success: false, error: `SLM service connectivity failure: ${err.message}` };
    }
  }
};

module.exports = slmTool;
