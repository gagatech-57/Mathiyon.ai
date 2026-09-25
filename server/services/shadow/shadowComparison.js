/**
 * Mathiyon AI - Shadow Comparison Engine (Phase 11.13)
 * Compares sanitized v1.2 and v1.3 metadata without inspecting raw prompts/responses.
 * Categorizes execution outcomes into safe standardized governance buckets.
 */

const CATEGORIES = {
  A: 'Both successful',
  B: 'v1.2 successful / v1.3 failed',
  C: 'v1.2 failed / v1.3 successful',
  D: 'Both failed',
  E: 'Compatible result',
  F: 'Different result',
  G: 'Tool-routing difference',
  H: 'Latency difference',
  I: 'Privacy-scrubbed request',
  J: 'Timeout',
  K: 'Harness limitation',
};

/**
 * Classifies shadow execution output metrics between v1.2 and v1.3.
 */
function classifyComparison({
  v1_2_status = 'success',
  v1_3_status = 'success',
  v1_2_latency_ms = 0,
  v1_3_latency_ms = 0,
  v1_2_intent = 'GENERAL',
  v1_3_intent = 'GENERAL',
  wasScrubbed = false,
  isTimeout = false,
  harnessLimitation = false,
}) {
  if (harnessLimitation) return CATEGORIES.K;
  if (isTimeout || v1_3_status === 'timeout') return CATEGORIES.J;

  if (v1_2_status === 'success' && v1_3_status === 'error') return CATEGORIES.B;
  if (v1_2_status === 'error' && v1_3_status === 'success') return CATEGORIES.C;
  if (v1_2_status === 'error' && v1_3_status === 'error') return CATEGORIES.D;

  if (v1_2_intent !== v1_3_intent) return CATEGORIES.G;

  // Latency delta threshold (>500ms diff)
  if (Math.abs(v1_3_latency_ms - v1_2_latency_ms) > 500) {
    return CATEGORIES.H;
  }

  if (wasScrubbed) return CATEGORIES.I;

  return CATEGORIES.A;
}

module.exports = {
  CATEGORIES,
  classifyComparison,
};
