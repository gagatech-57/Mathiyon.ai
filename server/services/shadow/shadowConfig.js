/**
 * Mathiyon AI - Shadow Evaluation Configuration (Phase 11.13)
 * Central configuration enforcing safety defaults:
 *   - SHADOW_EVAL_ENABLED defaults to false
 *   - SHADOW_SAMPLE_RATE defaults to 0.0
 *   - SHADOW_TIMEOUT_MS defaults to 5000ms
 *   - SHADOW_MAX_CONCURRENCY defaults to 1
 */

const aiServiceBaseUrl = process.env.AI_SERVICE_URL || process.env.PYTHON_AI_SERVICE_URL || 'http://127.0.0.1:8000';

const shadowConfig = {
  enabled: process.env.SHADOW_EVAL_ENABLED === 'true',
  sampleRate: parseFloat(process.env.SHADOW_SAMPLE_RATE || '0.0'),
  timeoutMs: parseInt(process.env.SHADOW_TIMEOUT_MS || '5000', 10),
  maxConcurrency: parseInt(process.env.SHADOW_MAX_CONCURRENCY || '1', 10),
  productionModel: 'mathiyon-slm-v1.2',
  shadowModel: 'mathiyon-slm-v1.3-RC1',
  shadowModelEndpoint: `${aiServiceBaseUrl}/generate/v1.3`,
  maxLogRecords: 500,
};

module.exports = shadowConfig;
