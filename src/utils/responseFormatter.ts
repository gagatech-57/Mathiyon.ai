/**
 * Mathiyon AI — Response Formatter
 *
 * Normalizes backend responses into clean, user-facing content.
 * Removes internal metadata, duplicate approximations, and engine details.
 */

export interface MathResult {
  success: boolean;
  type?: string;
  domain?: string;
  computationType?: string;
  problem?: string;
  exactAnswer?: string;
  decimalAnswer?: string;
  displayAnswer?: string;
  result?: string;
  explanation?: string;
  verified?: boolean;
  steps?: string[];
}

/**
 * Normalizes math results into clean user-facing text
 */
export function formatMathResult(mathData: MathResult): string {
  if (!mathData || !mathData.success) {
    return mathData?.explanation || 'Could not solve this mathematical expression.';
  }

  // Extract the clean result
  let result = mathData.displayAnswer || mathData.result || mathData.explanation || '';

  // Remove duplicate approximations like "11 ≈ 11" or "5 ≈ 5"
  result = result.replace(/(\d+(?:\.\d+)?)\s*≈\s*\1(?!\d)/g, '$1');

  // Remove "Result: " prefix if present (we'll add it back cleanly)
  result = result.replace(/^Result:\s*/i, '');

  // Clean trailing decimal zeros for whole numbers
  result = result.replace(/(\d+)\.0+(?!\d)/g, '$1');

  // Format final answer
  return `Result: ${result.trim()}`;
}

/**
 * Removes internal metadata from assistant responses
 */
export function sanitizeAssistantResponse(text: string): string {
  // Remove internal engine markers (case-insensitive)
  const internalPatterns = [
    /Verified Math Engine\s*/gi,
    /Math Engine\s*/gi,
    /SymPy\s+(?:Engine|Solver|Math)\s*/gi,
    /Exact Symbolic\s*/gi,
    /Exact Numeric\s*/gi,
    /Approximate Numeric\s*/gi,
    /Computation Type:\s*[^\n]*/gi,
    /Domain Category:\s*[^\n]*/gi,
    /\[Tool:\s*[^\]]*\]\s*/gi,
    /\[Agent:\s*[^\]]*\]\s*/gi,
    /\[Engine:\s*[^\]]*\]\s*/gi,
  ];

  let cleaned = text;
  internalPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Remove duplicate approximations
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*≈\s*\1(?!\d)/g, '$1');

  // Clean extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Formats the final assistant answer for display
 */
export function formatAssistantAnswer(answer: string, intent?: string, toolsUsed?: string[]): string {
  // If it's a math result, try to format it cleanly
  if (intent === 'MATH' || toolsUsed?.includes('MathEngine')) {
    // Check if it's already formatted as a math result
    if (/^Result:\s*/.test(answer)) {
      return sanitizeAssistantResponse(answer);
    }
  }

  return sanitizeAssistantResponse(answer);
}
