/**
 * Mathiyon AI - Observability & Telemetry API Routes (Phase 12.5)
 *
 * Exposes anonymized, privacy-safe aggregate telemetry metrics:
 * - GET /api/observability/summary (JWT Protected)
 * - Returns aggregate request statistics, latency percentiles, error taxonomy, tool usage
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const observabilityService = require('../services/observabilityService');

// @desc    Get aggregate observability metrics & telemetry summary
// @route   GET /api/observability/summary
// @access  Private (JWT Protected)
router.get('/summary', protect, (req, res) => {
  try {
    const metrics = observabilityService.getSummaryMetrics();
    return res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Observability API Error:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to retrieve observability metrics: ${error.message}`
    });
  }
});

module.exports = router;
