/**
 * Mathiyon AI - Privacy Scrubber (Phase 11.13)
 * Safe, conservative, privacy-first sanitizer for live shadow evaluation.
 *
 * Ensures sensitive information (JWTs, API keys, passwords, DB URIs,
 * emails, phone numbers, auth headers, cookies, and private document content)
 * NEVER reaches v1.3 shadow inference or shadow log persistence.
 */

const REDACTED = '[REDACTED]';
const DOC_REDACTED = '[PRIVATE_DOCUMENT_CONTENT_REDACTED]';

// Regex patterns for secrets
const SECRET_PATTERNS = [
  // JWT tokens
  { name: 'JWT Token', regex: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
  // Bearer tokens
  { name: 'Bearer Token', regex: /Bearer\s+[a-zA-Z0-9._\-~+/=]+/gi },
  // OpenAI & API Keys
  { name: 'API Key', regex: /(?:sk-|key-|api_key=|apikey=)[a-zA-Z0-9_\-]{16,}/gi },
  // Generic password assignments
  { name: 'Password', regex: /(?:password|passwd|pwd|secret)\s*[:=]\s*["']?([^"'\s,;]+)["']?/gi },
  // Refresh & Access Tokens
  { name: 'Access/Refresh Token', regex: /(?:access_token|refresh_token|session_token)\s*[:=]\s*["']?([^"'\s,;]+)["']?/gi },
  // Database connection URIs containing credentials
  { name: 'MongoDB URI', regex: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^\s"']+/gi },
  { name: 'PostgreSQL URI', regex: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^\s"']+/gi },
  { name: 'Database Connection String', regex: /(?:mysql|oracle|mssql|redis):\/\/[^:]+:[^@]+@[^\s"']+/gi },
];

// Regex patterns for PII
const PII_PATTERNS = [
  // Email addresses
  { name: 'Email Address', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  // Phone numbers (conservative pattern)
  { name: 'Phone Number', regex: /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
];

/**
 * Sanitizes a string input by replacing secrets and PII with [REDACTED].
 */
function sanitizeString(text) {
  if (typeof text !== 'string') return text;
  let sanitized = text;
  const redactions = [];

  // Redact secrets
  for (const { name, regex } of SECRET_PATTERNS) {
    if (regex.test(sanitized)) {
      sanitized = sanitized.replace(regex, REDACTED);
      redactions.push(name);
    }
  }

  // Redact PII
  for (const { name, regex } of PII_PATTERNS) {
    if (regex.test(sanitized)) {
      sanitized = sanitized.replace(regex, REDACTED);
      redactions.push(name);
    }
  }

  return { sanitizedText: sanitized, redactions };
}

/**
 * Main privacy scrubber entry point.
 * Performs deep clone of request payload and scrubs all sensitive fields.
 * The original production request object is NEVER mutated.
 */
function scrubRequest(originalRequest) {
  if (!originalRequest) return null;

  // Deep clone request to prevent any side-effects on production path
  const cloned = JSON.parse(JSON.stringify(originalRequest));
  const redactionLog = [];

  // Sanitize message / prompt string
  let sanitizedMessage = cloned.message || cloned.prompt || '';
  if (typeof sanitizedMessage === 'string') {
    const { sanitizedText, redactions } = sanitizeString(sanitizedMessage);
    sanitizedMessage = sanitizedText;
    redactionLog.push(...redactions);
  }

  // Check and sanitize document content
  let hasPrivateDoc = false;
  if (cloned.documentContent || cloned.fileContent || cloned.rawDocument || cloned.pdfText) {
    hasPrivateDoc = true;
    cloned.documentContent = DOC_REDACTED;
    cloned.fileContent = DOC_REDACTED;
    cloned.rawDocument = DOC_REDACTED;
    cloned.pdfText = DOC_REDACTED;
    redactionLog.push('Private Document Content');
  }

  // Redact headers / auth properties if present
  if (cloned.headers) {
    if (cloned.headers.authorization) {
      cloned.headers.authorization = REDACTED;
      redactionLog.push('Authorization Header');
    }
    if (cloned.headers.cookie) {
      cloned.headers.cookie = REDACTED;
      redactionLog.push('Cookie');
    }
  }

  // Redact explicit auth tokens / credentials
  const authFields = ['jwt', 'token', 'bearer', 'apiKey', 'api_key', 'password', 'sessionToken', 'refreshToken'];
  for (const field of authFields) {
    if (cloned[field]) {
      cloned[field] = REDACTED;
      redactionLog.push(`Auth Field: ${field}`);
    }
  }

  // Assign non-sensitive synthetic identity
  cloned.userId = 'shadow_user_anon';

  // Construct final sanitized shadow request object
  return {
    sanitizedRequest: {
      message: sanitizedMessage,
      documentIds: cloned.documentIds || [],
      hasPrivateDoc,
      enableWebSearch: Boolean(cloned.enableWebSearch),
      userId: 'shadow_user_anon',
    },
    redactionCount: redactionLog.length,
    redactionDetails: Array.from(new Set(redactionLog)),
  };
}

module.exports = {
  scrubRequest,
  sanitizeString,
  REDACTED,
  DOC_REDACTED,
};
