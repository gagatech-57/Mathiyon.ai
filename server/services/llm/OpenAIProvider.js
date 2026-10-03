/**
 * Mathiyon AI - OpenAI & Compatible LLM Provider
 * Supports OpenAI, Groq, Together, Ollama, vLLM, DeepSeek via standard REST API.
 */

const LLMProvider = require('./LLMProvider');

class OpenAIProvider extends LLMProvider {
  constructor(config = {}) {
    super('OpenAI', config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
    this.model = config.model || process.env.LLM_MODEL || 'gpt-4o-mini';
    this.baseUrl = config.baseUrl || process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  }

  async generate({ messages = [], systemPrompt = '', temperature = 0.7, maxTokens = 1500, model = null }) {
    const selectedModel = model || this.model;
    const startTime = Date.now();

    if (!this.apiKey && !this.baseUrl.includes('localhost') && !this.baseUrl.includes('127.0.0.1')) {
      return {
        success: false,
        content: null,
        error: 'OPENAI_API_KEY / LLM_API_KEY is not configured on server',
        provider: this.name,
        model: selectedModel,
        latencyMs: 0
      };
    }

    try {
      const formattedMessages = [];
      if (systemPrompt) {
        formattedMessages.push({ role: 'system', content: systemPrompt });
      }

      for (const m of messages) {
        formattedMessages.push({
          role: m.role || 'user',
          content: m.content || ''
        });
      }

      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey || 'sk-local'}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens
        })
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `OpenAI API HTTP ${res.status}`;
        return {
          success: false,
          content: null,
          error: errMsg,
          provider: this.name,
          model: selectedModel,
          latencyMs
        };
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };

      return {
        success: true,
        content,
        provider: this.name,
        model: selectedModel,
        usage: {
          inputTokens: usage.prompt_tokens || 0,
          outputTokens: usage.completion_tokens || 0
        },
        latencyMs
      };
    } catch (err) {
      return {
        success: false,
        content: null,
        error: `OpenAI Provider Connection Error: ${err.message}`,
        provider: this.name,
        model: selectedModel,
        latencyMs: Date.now() - startTime
      };
    }
  }

  async healthCheck() {
    const startTime = Date.now();
    if (!this.apiKey && !this.baseUrl.includes('localhost') && !this.baseUrl.includes('127.0.0.1')) {
      return {
        healthy: false,
        provider: this.name,
        error: 'API key missing',
        latencyMs: 0
      };
    }

    try {
      const res = await this.generate({
        messages: [{ role: 'user', content: 'Ping' }],
        maxTokens: 5
      });
      return {
        healthy: res.success,
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - startTime,
        error: res.error || null
      };
    } catch (err) {
      return {
        healthy: false,
        provider: this.name,
        latencyMs: Date.now() - startTime,
        error: err.message
      };
    }
  }

  getModelInfo() {
    return {
      provider: this.name,
      defaultModel: this.model,
      availableModels: ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet', 'deepseek-chat', 'llama-3.1-70b']
    };
  }
}

module.exports = OpenAIProvider;
