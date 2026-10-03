/**
 * Mathiyon AI - Observability, Telemetry & Quality Control Service (Phase 12.5)
 *
 * Safe, non-blocking telemetry collector & aggregator:
 * - Normalized Safe Event Logging (No CoT, No Credentials, No Raw Private Data)
 * - Privacy Scrubber (Anonymized User IDs, Redacted Tokens & Passwords)
 * - Stage-by-Stage Latency Telemetry (p50 & p95 calculation)
 * - Error Taxonomy Classification
 * - Bounded In-Memory Telemetry Buffer (Max 1,000 events)
 * - Observability Sampling Control
 */

const crypto = require('crypto');

// Configuration
const OBSERVABILITY_ENABLED = process.env.OBSERVABILITY_ENABLED !== 'false';
const OBSERVABILITY_SAMPLE_RATE = parseFloat(process.env.OBSERVABILITY_SAMPLE_RATE || '1.0');
const MAX_BUFFER_SIZE = 1000;

// Bounded Telemetry Store
const telemetryBuffer = [];
let totalRecordedCount = 0;

// Standard Error Taxonomy Map
const ERROR_TAXONOMY = {
  AUTH_ERROR: 'AUTH_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TOOL_TIMEOUT: 'TOOL_TIMEOUT',
  TOOL_FAILURE: 'TOOL_FAILURE',
  RAG_FAILURE: 'RAG_FAILURE',
  WEB_FAILURE: 'WEB_FAILURE',
  MATH_FAILURE: 'MATH_FAILURE',
  MEMORY_FAILURE: 'MEMORY_FAILURE',
  AI_SERVICE_FAILURE: 'AI_SERVICE_FAILURE',
  DATABASE_FAILURE: 'DATABASE_FAILURE',
  MODEL_ERROR: 'MODEL_ERROR',
  CONTEXT_ERROR: 'CONTEXT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Anonymizes user IDs for privacy compliance
 */
function anonymizeUserId(userId) {
  if (!userId) return 'anon_guest';
  return 'anon_user_' + crypto.createHash('sha256').update(String(userId)).digest('hex').substring(0, 8);
}

/**
 * Sanitizes input text to strip credentials, tokens, and secrets
 */
function sanitizeTelemetryText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/bearer\s+[a-zA-Z0-9.\-_]+/gi, 'bearer [REDACTED]')
    .replace(/jwt=[a-zA-Z0-9.\-_]+/gi, 'jwt=[REDACTED]')
    .replace(/password\s*=\s*['"][^'"]+['"]/gi, 'password=[REDACTED]')
    .replace(/api[_-]?key\s*=\s*['"][^'"]+['"]/gi, 'api_key=[REDACTED]')
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, 'mongodb://[REDACTED]');
}

/**
 * Records a telemetry event in a safe, non-blocking manner
 */
function recordEvent(eventData) {
  if (!OBSERVABILITY_ENABLED) return;
  if (Math.random() > OBSERVABILITY_SAMPLE_RATE) return;

  try {
    const safeEvent = {
      requestId: eventData.requestId || `req_${Math.random().toString(36).substring(2, 10)}`,
      taskId: eventData.taskId || null,
      timestamp: new Date().toISOString(),
      anonymizedUserId: anonymizeUserId(eventData.userId),
      intent: eventData.intent || 'UNKNOWN',
      toolsUsed: Array.isArray(eventData.toolsUsed) ? [...new Set(eventData.toolsUsed)] : [],
      model: eventData.model || 'Mathiyon SLM v1.2',
      status: eventData.status || (eventData.success ? 'success' : 'error'),
      totalLatencyMs: eventData.totalLatencyMs || 0,
      stageLatency: {
        memoryLatencyMs: eventData.stageLatency?.memoryLatencyMs || 0,
        ragLatencyMs: eventData.stageLatency?.ragLatencyMs || 0,
        webLatencyMs: eventData.stageLatency?.webLatencyMs || 0,
        mathLatencyMs: eventData.stageLatency?.mathLatencyMs || 0,
        codeLatencyMs: eventData.stageLatency?.codeLatencyMs || 0,
        slmLatencyMs: eventData.stageLatency?.slmLatencyMs || 0
      },
      citationCount: eventData.citationCount || (eventData.citations ? eventData.citations.length : 0),
      sourceTypes: eventData.sources ? Array.from(new Set(eventData.sources.map(s => s.sourceType || s.type || 'source'))) : [],
      conflictsCount: eventData.conflictsCount || 0,
      errorCode: eventData.errorCode || (eventData.error ? classifyErrorCode(eventData.error) : null)
    };

    telemetryBuffer.push(safeEvent);
    totalRecordedCount++;

    // Maintain bounded buffer limit
    if (telemetryBuffer.length > MAX_BUFFER_SIZE) {
      telemetryBuffer.shift();
    }
  } catch (err) {
    // Non-blocking catch: Telemetry failures MUST NEVER affect user request
    console.warn('Observability recording alert:', err.message);
  }
}

/**
 * Classifies raw error strings/objects into normalized error taxonomy
 */
function classifyErrorCode(error) {
  const errMsg = (typeof error === 'string' ? error : (error.message || JSON.stringify(error))).toLowerCase();

  if (errMsg.includes('timeout')) return ERROR_TAXONOMY.TOOL_TIMEOUT;
  if (errMsg.includes('403') || errMsg.includes('denied') || errMsg.includes('unauthorized')) return ERROR_TAXONOMY.AUTHORIZATION_ERROR;
  if (errMsg.includes('jwt') || errMsg.includes('token') || errMsg.includes('auth')) return ERROR_TAXONOMY.AUTH_ERROR;
  if (errMsg.includes('math') || errMsg.includes('sympy')) return ERROR_TAXONOMY.MATH_FAILURE;
  if (errMsg.includes('rag') || errMsg.includes('document')) return ERROR_TAXONOMY.RAG_FAILURE;
  if (errMsg.includes('web') || errMsg.includes('search')) return ERROR_TAXONOMY.WEB_FAILURE;
  if (errMsg.includes('memory')) return ERROR_TAXONOMY.MEMORY_FAILURE;
  if (errMsg.includes('python') || errMsg.includes('fastapi')) return ERROR_TAXONOMY.AI_SERVICE_FAILURE;
  if (errMsg.includes('mongo') || errMsg.includes('database')) return ERROR_TAXONOMY.DATABASE_FAILURE;
  if (errMsg.includes('validation')) return ERROR_TAXONOMY.VALIDATION_ERROR;
  if (errMsg.includes('model') || errMsg.includes('slm')) return ERROR_TAXONOMY.MODEL_ERROR;

  return ERROR_TAXONOMY.UNKNOWN_ERROR;
}

/**
 * Calculates aggregate summary metrics from telemetry buffer
 */
function getSummaryMetrics() {
  const total = telemetryBuffer.length;
  if (total === 0) {
    return {
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      successRatePercent: 100,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      intentBreakdown: {},
      toolUsageBreakdown: {},
      modelDistribution: { 'Mathiyon SLM v1.2 (100% Prod)': 0, 'Mathiyon SLM v1.3-RC1 (0% Exp)': 0 },
      errorTaxonomyBreakdown: {}
    };
  }

  let successCount = 0;
  let errorCount = 0;
  const latencies = [];
  const intentMap = {};
  const toolMap = {};
  const errorMap = {};
  const modelMap = {};

  for (const evt of telemetryBuffer) {
    if (evt.status === 'success') successCount++;
    else errorCount++;

    latencies.push(evt.totalLatencyMs);

    intentMap[evt.intent] = (intentMap[evt.intent] || 0) + 1;
    modelMap[evt.model] = (modelMap[evt.model] || 0) + 1;

    for (const tool of evt.toolsUsed) {
      toolMap[tool] = (toolMap[tool] || 0) + 1;
    }

    if (evt.errorCode) {
      errorMap[evt.errorCode] = (errorMap[evt.errorCode] || 0) + 1;
    }
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;

  return {
    totalRecordedRequests: totalRecordedCount,
    activeBufferCount: total,
    successCount,
    errorCount,
    successRatePercent: Math.round((successCount / total) * 1000) / 10,
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    intentBreakdown: intentMap,
    toolUsageBreakdown: toolMap,
    modelDistribution: modelMap,
    errorTaxonomyBreakdown: errorMap,
    samplingRate: OBSERVABILITY_SAMPLE_RATE,
    timestamp: new Date().toISOString()
  };
}

/**
 * Resets telemetry buffer (for clean benchmark/test setup)
 */
function clearTelemetryBuffer() {
  telemetryBuffer.length = 0;
  totalRecordedCount = 0;
}

module.exports = {
  OBSERVABILITY_ENABLED,
  OBSERVABILITY_SAMPLE_RATE,
  ERROR_TAXONOMY,
  anonymizeUserId,
  sanitizeTelemetryText,
  recordEvent,
  classifyErrorCode,
  getSummaryMetrics,
  clearTelemetryBuffer,
  telemetryBuffer
};
