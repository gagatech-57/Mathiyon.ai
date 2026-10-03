/**
 * Mathiyon AI - LLM Service Module
 * Clean public exports for LLM provider abstraction, ModelRouter, and ResponseComposer.
 */

const LLMProvider = require('./LLMProvider');
const GeminiProvider = require('./GeminiProvider');
const OpenAIProvider = require('./OpenAIProvider');
const LocalMockLLMProvider = require('./LocalMockLLMProvider');
const ProviderFactory = require('./ProviderFactory');
const ModelRouter = require('./ModelRouter');
const ResponseComposer = require('./ResponseComposer');

module.exports = {
  LLMProvider,
  GeminiProvider,
  OpenAIProvider,
  LocalMockLLMProvider,
  ProviderFactory,
  ModelRouter,
  ResponseComposer,
  // Helper for direct generation via active provider
  generateWithActiveLLM: async (options) => {
    const provider = ProviderFactory.getProvider();
    return provider.generate(options);
  }
};
