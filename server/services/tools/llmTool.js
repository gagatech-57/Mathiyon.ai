/**
 * Mathiyon AI - LLM Tool
 * Connects the AI Orchestrator to the LLM provider abstraction layer.
 */

const { ProviderFactory } = require('../llm');
const slmTool = require('./slmTool');

const llmTool = {
  name: 'MathiyonLLM',
  description: 'High-intelligence Large Language Model layer for complex reasoning, multi-step planning, architectural design, and RAG/Web synthesis.',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      systemPrompt: { type: 'string' },
      conversation: { type: 'array' },
      model: { type: 'string' }
    },
    required: ['message']
  },

  async execute({ message, systemPrompt = '', conversation = [], model = null }) {
    if (!message || typeof message !== 'string') {
      return { success: false, error: 'Invalid prompt string' };
    }

    try {
      const provider = ProviderFactory.getProvider();
      
      // Convert conversation history into LLM messages format
      const messages = [];
      if (conversation && Array.isArray(conversation)) {
        for (const turn of conversation) {
          const role = turn.role === 'assistant' ? 'assistant' : 'user';
          const content = turn.content || turn.text || turn.message || '';
          if (content) {
            messages.push({ role, content });
          }
        }
      }

      // Add current message
      messages.push({ role: 'user', content: message });

      const res = await provider.generate({
        messages,
        systemPrompt,
        model
      });

      if (res.success && res.content) {
        return {
          success: true,
          type: 'llm',
          response: res.content,
          model: `Mathiyon LLM (${res.provider})`,
          provider: res.provider,
          version: 'Hybrid-v1.0',
          engine: `${res.provider} Reasoning Engine`,
          tokensProcessed: res.usage?.inputTokens || 0,
          tokensGenerated: res.usage?.outputTokens || 0,
          generationTimeMs: res.latencyMs || 0
        };
      }

      // If LLM provider failed, transparently fallback to SLM v1.2
      console.warn(`[LLM Tool] Provider ${provider.name} failed (${res.error}). Falling back to SLM v1.2.`);
      const slmFallback = await slmTool.execute({ message: `${systemPrompt}\n${message}`, conversation });
      if (slmFallback.success) {
        return {
          ...slmFallback,
          fallbackFromLLM: true
        };
      }

      return {
        success: false,
        error: res.error || 'LLM execution failed and SLM fallback unavailable'
      };
    } catch (err) {
      // Fallback to SLM v1.2 on exception
      console.warn(`[LLM Tool] Exception during LLM execution: ${err.message}. Falling back to SLM v1.2.`);
      const slmFallback = await slmTool.execute({ message, conversation });
      if (slmFallback.success) {
        return {
          ...slmFallback,
          fallbackFromLLM: true
        };
      }

      return {
        success: false,
        error: `LLM service failure: ${err.message}`
      };
    }
  }
};

module.exports = llmTool;
