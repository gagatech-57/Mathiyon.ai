/**
 * Mathiyon AI - Shadow Evaluation Runner (Phase 11.13)
 * Asynchronous, non-blocking execution harness for SLM v1.3-RC1 shadow evaluation.
 *
 * GUARANTEES:
 * 1. v1.2 production response is returned IMMEDIATELY to the user.
 * 2. Shadow execution runs completely out-of-band in background.
 * 3. Shadow exceptions/timeouts are silently caught and logged; zero impact on user.
 * 4. Original request payload is never mutated.
 * 5. Strictly enforces feature flag SHADOW_EVAL_ENABLED and sampling rate SHADOW_SAMPLE_RATE.
 */

const shadowConfig = require('./shadowConfig');
const { scrubRequest } = require('./privacyScrubber');
const shadowLogger = require('./shadowLogger');
const { classifyComparison } = require('./shadowComparison');

let activeConcurrency = 0;

/**
 * Triggers background shadow evaluation for a production request.
 * MUST NOT be awaited by the production request handler.
 */
function runShadowEvaluation(originalRequest, v1_2_meta = {}) {
  // 1. Check feature flag & sampling
  if (!shadowConfig.enabled) {
    return { status: 'skipped', reason: 'SHADOW_EVAL_ENABLED=false' };
  }

  if (shadowConfig.sampleRate <= 0 || Math.random() > shadowConfig.sampleRate) {
    return { status: 'skipped', reason: 'Sample rate skipped' };
  }

  // 2. Check bounded concurrency limit
  if (activeConcurrency >= shadowConfig.maxConcurrency) {
    return { status: 'skipped', reason: 'Concurrency limit reached' };
  }

  activeConcurrency++;
  const shadowId = `shadow_${Math.random().toString(36).substring(2, 12)}`;
  const startTime = Date.now();

  // 3. Fire-and-forget background execution using setImmediate / Promise
  setImmediate(async () => {
    try {
      // Step A: Privacy Scrubbing (BEFORE inference or logging)
      const scrubResult = scrubRequest(originalRequest);
      if (!scrubResult || !scrubResult.sanitizedRequest) {
        throw new Error('Privacy scrubber returned empty payload');
      }

      const { sanitizedRequest, redactionCount, redactionDetails } = scrubResult;

      // Step B: v1.3 Shadow Request with Timeout
      let v1_3_status = 'success';
      let v1_3_latency_ms = 0;
      let v1_3_tokens = 0;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), shadowConfig.timeoutMs);

      const fetchStart = Date.now();
      try {
        const response = await fetch(shadowConfig.shadowModelEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: sanitizedRequest.message,
            max_new_tokens: 64,
            use_kv_cache: true,
            deterministic: true,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        v1_3_latency_ms = Date.now() - fetchStart;

        if (response.ok) {
          const data = await response.json();
          v1_3_tokens = data.tokens_generated || 0;
          v1_3_status = 'success';
        } else {
          v1_3_status = 'error';
        }
      } catch (err) {
        clearTimeout(timeoutId);
        v1_3_latency_ms = Date.now() - fetchStart;
        if (err.name === 'AbortError') {
          v1_3_status = 'timeout';
        } else {
          v1_3_status = 'error';
        }
      }

      // Step C: Categorize & Log Sanitized Record
      const comparisonStatus = classifyComparison({
        v1_2_status: v1_2_meta.status || 'success',
        v1_3_status,
        v1_2_latency_ms: v1_2_meta.latencyMs || 0,
        v1_3_latency_ms,
        v1_2_intent: v1_2_meta.intent || 'GENERAL',
        v1_3_intent: v1_2_meta.intent || 'GENERAL',
        wasScrubbed: redactionCount > 0,
        isTimeout: v1_3_status === 'timeout',
      });

      shadowLogger.log({
        shadow_id: shadowId,
        timestamp: new Date().toISOString(),
        category: v1_2_meta.intent || 'GENERAL',
        production_model: shadowConfig.productionModel,
        shadow_model: shadowConfig.shadowModel,
        request_sanitized: true,
        privacy_redactions: redactionDetails,
        v1_2_latency_ms: v1_2_meta.latencyMs || 0,
        v1_3_latency_ms,
        v1_2_status: v1_2_meta.status || 'success',
        v1_3_status,
        v1_2_tokens: v1_2_meta.tokensProcessed || 0,
        v1_3_tokens,
        tool_route: v1_2_meta.intent || 'GENERAL',
        math_engine_used: v1_2_meta.intent === 'MATH',
        rag_used: v1_2_meta.intent && v1_2_meta.intent.includes('DOCUMENT'),
        comparison_status: comparisonStatus,
      });

    } catch (shadowErr) {
      // Swallowed safely - production environment is completely unaffected
      shadowLogger.log({
        shadow_id: shadowId,
        timestamp: new Date().toISOString(),
        v1_2_status: 'success',
        v1_3_status: 'error',
        comparison_status: classifyComparison({ v1_2_status: 'success', v1_3_status: 'error' }),
      });
    } finally {
      activeConcurrency = Math.max(0, activeConcurrency - 1);
    }
  });

  return { status: 'queued', shadowId };
}

module.exports = {
  runShadowEvaluation,
};
