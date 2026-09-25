/**
 * Mathiyon AI - Privacy Scrubber (Phase 11.13)
 * Evaluation suite mirror of server/services/shadow/privacyScrubber.js
 */

const { scrubRequest, sanitizeString, REDACTED, DOC_REDACTED } = require('../../../../server/services/shadow/privacyScrubber');

module.exports = {
  scrubRequest,
  sanitizeString,
  REDACTED,
  DOC_REDACTED,
};
