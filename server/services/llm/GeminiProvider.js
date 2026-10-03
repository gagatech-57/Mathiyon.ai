/**
 * Mathiyon AI - Google Gemini LLM Provider
 * Connects securely to Google Gemini APIs using server-side environment variables.
 */

const LLMProvider = require('./LLMProvider');

class GeminiProvider extends LLMProvider {
  constructor(config = {}) {
    super('Gemini', config);
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
    this.model = config.model || process.env.LLM_MODEL || 'gemini-1.5-flash';
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  async generate({ messages = [], systemPrompt = '', temperature = 0.7, maxTokens = 1500, model = null }) {
    const selectedModel = model || this.model;
    const startTime = Date.now();

    if (!this.apiKey) {
      return {
        success: false,
        content: null,
        error: 'GEMINI_API_KEY / LLM_API_KEY is not configured on server',
        provider: this.name,
        model: selectedModel,
        latencyMs: 0
      };
    }

    try {
      // Build Gemini contents array
      const contents = [];
      
      for (const msg of messages) {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        contents.push({
          role,
          parts: [{ text: msg.content }]
        });
      }

      // If last message wasn't user or if messages was empty, ensure user content
      if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
      }

      const requestBody = {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topP: 0.95
        }
      };

      if (systemPrompt) {
        requestBody.systemInstruction = {
          parts: [{ text: systemPrompt }]
        };
      }

      const url = `${this.baseUrl}/models/${selectedModel}:generateContent?key=${this.apiKey}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `Gemini API HTTP ${res.status}`;
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
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map(p => p.text).join('') || '';

      const usageMetadata = data.usageMetadata || {};
      const inputTokens = usageMetadata.promptTokenCount || 0;
      const outputTokens = usageMetadata.candidatesTokenCount || 0;

      return {
        success: true,
        content: text,
        provider: this.name,
        model: selectedModel,
        usage: {
          inputTokens,
          outputTokens
        },
        latencyMs
      };
    } catch (err) {
      return {
        success: false,
        content: null,
        error: `Gemini Provider Connection Error: ${err.message}`,
        provider: this.name,
        model: selectedModel,
        latencyMs: Date.now() - startTime
      };
    }
  }

  async healthCheck() {
    const startTime = Date.now();
    if (!this.apiKey) {
      return {
        healthy: false,
        provider: this.name,
        error: 'API key missing in environment variables',
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
      availableModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash']
    };
  }
}

module.exports = GeminiProvider;
