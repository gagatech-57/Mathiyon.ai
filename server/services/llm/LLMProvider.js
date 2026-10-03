/**
 * Mathiyon AI - LLM Provider Base Interface
 * Standard abstraction for LLM backends (Gemini, OpenAI, Anthropic, Local).
 */

class LLMProvider {
  constructor(name = 'BaseLLMProvider', config = {}) {
    this.name = name;
    this.config = config;
  }

  /**
   * Generates a completion from prompt messages.
   * @param {Object} options
   * @param {Array<{role: string, content: string}>} options.messages
   * @param {string} [options.systemPrompt]
   * @param {number} [options.temperature=0.7]
   * @param {number} [options.maxTokens=1024]
   * @param {string} [options.model]
   * @returns {Promise<{success: boolean, content: string, model: string, provider: string, usage: {inputTokens: number, outputTokens: number}, latencyMs: number, error?: string}>}
   */
  async generate(options) {
    throw new Error('LLMProvider.generate() must be implemented by concrete subclass');
  }

  /**
   * Streams a completion token-by-token.
   * @param {Object} options
   * @param {Function} options.onToken
   */
  async stream(options) {
    throw new Error('LLMProvider.stream() must be implemented by concrete subclass');
  }

  /**
   * Performs a health check on the provider.
   * @returns {Promise<{healthy: boolean, provider: string, latencyMs: number, error?: string}>}
   */
  async healthCheck() {
    return {
      healthy: true,
      provider: this.name,
      latencyMs: 0
    };
  }

  /**
   * Returns metadata about available models.
   */
  getModelInfo() {
    return {
      provider: this.name,
      defaultModel: this.config.model || 'default',
      availableModels: [this.config.model || 'default']
    };
  }
}

module.exports = LLMProvider;
