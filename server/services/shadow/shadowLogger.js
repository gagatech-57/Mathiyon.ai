/**
 * Mathiyon AI - Shadow Logger (Phase 11.13)
 * Bounded log retention queue for sanitized shadow evaluation records.
 * Ensures zero raw prompts or responses are stored, maintaining full privacy.
 */

const shadowConfig = require('./shadowConfig');

class ShadowLogger {
  constructor(maxRecords = shadowConfig.maxLogRecords) {
    this.maxRecords = maxRecords;
    this.logs = [];
  }

  /**
   * Appends a sanitized shadow record to the bounded queue.
   */
  log(record) {
    const formattedRecord = {
      shadow_id: record.shadow_id || `shadow_${Math.random().toString(36).substring(2, 12)}`,
      timestamp: record.timestamp || new Date().toISOString(),
      category: record.category || 'GENERAL',
      production_model: record.production_model || shadowConfig.productionModel,
      shadow_model: record.shadow_model || shadowConfig.shadowModel,
      shadow_model_status: 'experimental',
      request_sanitized: record.request_sanitized !== false,
      privacy_redactions: record.privacy_redactions || [],
      v1_2_latency_ms: record.v1_2_latency_ms || 0,
      v1_3_latency_ms: record.v1_3_latency_ms || 0,
      v1_2_status: record.v1_2_status || 'success',
      v1_3_status: record.v1_3_status || 'success',
      v1_2_tokens: record.v1_2_tokens || 0,
      v1_3_tokens: record.v1_3_tokens || 0,
      tool_route: record.tool_route || 'GENERAL',
      math_engine_used: Boolean(record.math_engine_used),
      rag_used: Boolean(record.rag_used),
      comparison_status: record.comparison_status || 'Both successful',
    };

    this.logs.push(formattedRecord);

    // Enforce FIFO bounded queue retention
    if (this.logs.length > this.maxRecords) {
      this.logs.shift();
    }

    return formattedRecord;
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }

  getSummary() {
    const total = this.logs.length;
    const v1_3_successes = this.logs.filter(l => l.v1_3_status === 'success').length;
    const v1_3_timeouts = this.logs.filter(l => l.v1_3_status === 'timeout').length;
    const v1_3_errors = this.logs.filter(l => l.v1_3_status === 'error').length;

    return {
      totalRecords: total,
      v1_3_successes,
      v1_3_timeouts,
      v1_3_errors,
      maxCapacity: this.maxRecords,
      retentionMode: 'FIFO Bounded Queue',
    };
  }
}

const instance = new ShadowLogger();
module.exports = instance;
