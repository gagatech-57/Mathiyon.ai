/**
 * Mathiyon AI - LLM Provider Factory
 * Resolves and instantiates the appropriate LLM provider dynamically based on environment configuration.
 */

const GeminiProvider = require('./GeminiProvider');
const OpenAIProvider = require('./OpenAIProvider');
const LocalMockLLMProvider = require('./LocalMockLLMProvider');

class ProviderFactory {
  /**
   * Resolves active LLM provider based on environment configuration.
   * @param {Object} [overrideConfig]
   * @returns {import('./LLMProvider')}
   */
  static getProvider(overrideConfig = {}) {
    const configuredProvider = (overrideConfig.provider || process.env.LLM_PROVIDER || 'auto').toLowerCase().trim();

    // Explicit Provider Configuration
    if (configuredProvider === 'gemini' || configuredProvider === 'google') {
      return new GeminiProvider(overrideConfig);
    }
    
    if (configuredProvider === 'openai' || configuredProvider === 'groq' || configuredProvider === 'ollama' || configuredProvider === 'deepseek') {
      return new OpenAIProvider(overrideConfig);
    }

    if (configuredProvider === 'local' || configuredProvider === 'mock') {
      return new LocalMockLLMProvider(overrideConfig);
    }

    // Auto-detection based on available environment API keys
    const geminiKey = process.env.GEMINI_API_KEY || (process.env.LLM_API_KEY && (process.env.LLM_PROVIDER === 'gemini' || !process.env.OPENAI_API_KEY) ? process.env.LLM_API_KEY : null);
    const openAIKey = process.env.OPENAI_API_KEY || (process.env.LLM_API_KEY && process.env.LLM_PROVIDER === 'openai' ? process.env.LLM_API_KEY : null);

    if (geminiKey) {
      return new GeminiProvider({ apiKey: geminiKey, ...overrideConfig });
    }

    if (openAIKey) {
      return new OpenAIProvider({ apiKey: openAIKey, ...overrideConfig });
    }

    // Default to intelligent local fallback provider
    return new LocalMockLLMProvider(overrideConfig);
  }
}

module.exports = ProviderFactory;
