/**
 * Mathiyon AI - Universal Answer Synthesizer
 *
 * STRICT SANITIZATION: Strips internal metadata, router tags, tool names, confidence,
 * agent traces, and hidden CoT. User-facing math output is always "Result: X" only.
 */

class AnswerSynthesizer {
  static synthesize({
    userQuestion, resolvedQuery, intent, subIntent,
    conversationContext = [], memoryContext = '',
    ragContext = null, webResults = null, toolResults = {},
    modelResponse = '', isFollowUp = false, aspectToCover = null
  }) {
    // 1. If Math Engine provided verified result, format cleanly — NO internal labels
    if ((intent === 'MATH' || toolResults.math?.verified) && toolResults.math) {
      return this.formatMathAnswer(toolResults.math, userQuestion);
    }
    // 2. Deterministic Tool Answers
    if ((intent === 'TIME' || intent === 'TIME_DATE') && toolResults.time?.formatted) return toolResults.time.formatted;
    if (intent === 'CALCULATOR' && toolResults.calculator?.formatted) return toolResults.calculator.formatted;
    if (intent === 'UNIT_CONVERSION' && toolResults.units?.formatted) return toolResults.units.formatted;
    if (intent === 'CURRENCY' && toolResults.currency?.formatted) return toolResults.currency.formatted;
    // 3. Grounded Document RAG Answer
    if (intent === 'DOCUMENT') {
      if (ragContext && ragContext.found && ragContext.context) {
        let answer = this.sanitizeInternalTraces(modelResponse || '');
        if (!answer || answer.length < 20) answer = 'Based on your uploaded document:\n\n' + ragContext.context;
        if (ragContext.sources && ragContext.sources.length > 0) {
          const citList = ragContext.sources.map(s => '- ' + (s.file || 'Document') + ' — Page ' + (s.page || 1)).join('\n');
          answer += '\n\n**Sources:**\n' + citList;
        }
        return answer.trim();
      } else if (ragContext && !ragContext.found) {
        return 'The information was not found in the provided document.';
      }
    }
    // 4. Sanitize model response
    let finalAnswer = this.sanitizeInternalTraces(modelResponse || '');
    // 5. Append web citations
    if (webResults && webResults.sources && webResults.sources.length > 0) {
      const seen = new Set();
      const unique = webResults.sources.filter(s => { if (seen.has(s.url)) return false; seen.add(s.url); return true; });
      if (unique.length > 0 && !finalAnswer.includes('**Sources:**')) {
        finalAnswer += '\n\n**Sources:**\n' + unique.map((s, i) => '[' + (i+1) + '] [' + (s.title || s.domain) + '](' + s.url + ')').join('\n');
      }
    }
    // 6. Fallback
    if (!finalAnswer || finalAnswer.trim().length === 0) {
      finalAnswer = 'I have analysed your query. Please let me know which specific area you would like to explore further.';
    }
    return finalAnswer.trim();
  }

  /**
   * Normalizes a math result value to a clean human-readable string.
   *  5.000000   -> "5"
   *  0.500000   -> "0.5"
   *  "11 ≈ 11"  -> "11"
   */
  static normalizeMathResult(value) {
    if (value === null || value === undefined) return '';
    let str = String(value).trim();
    // Strip approximation duplicates like "11 ≈ 11"
    const approxMatch = /^([^~\u2248]+)\s*[~\u2248]\s*([^~\u2248]+)$/.exec(str);
    if (approxMatch) str = approxMatch[1].trim();
    // Normalise purely numeric trailing zeros
    if (/^-?\d+\.?\d*$/.test(str)) {
      const n = parseFloat(str);
      if (!isNaN(n)) {
        if (Number.isInteger(n)) return String(n);
        return String(parseFloat(n.toPrecision(10)));
      }
    }
    return str;
  }

  /**
   * Formats clean user-facing math answer: "Result: X"
   * No internal badge. No engine name. No "Verified Math Engine".
   */
  static formatMathAnswer(math, _question) {
    const raw    = math.displayAnswer !== undefined ? math.displayAnswer
                 : math.exactAnswer   !== undefined ? math.exactAnswer
                 : math.result        !== undefined ? math.result
                 : math.answer        !== undefined ? math.answer
                 : '';
    const rawDec = math.decimalAnswer !== undefined ? math.decimalAnswer
                 : math.approximateResult !== undefined ? math.approximateResult
                 : null;

    const exact  = this.normalizeMathResult(String(raw));
    let decStr   = rawDec !== null ? this.normalizeMathResult(String(rawDec)) : null;

    // Suppress decimal when identical to exact after normalisation
    if (decStr !== null && decStr === exact) decStr = null;

    // Boolean / comparison
    if (/^(yes|no|true|false)$/i.test(exact)) return '**' + exact + '**';

    // Multi-step solution (algebra, calculus)
    if (math.steps && Array.isArray(math.steps) && math.steps.length > 1) {
      const steps  = math.steps.map((s, i) => (i + 1) + '. ' + s).join('\n');
      const result = decStr ? (exact + ' \u2248 ' + decStr) : exact;
      return '**Steps:**\n' + steps + '\n\n**Result:** `' + result + '`';
    }

    // Simple result
    if (decStr) return '**Result:** `' + exact + '` \u2248 `' + decStr + '`';
    return '**Result:** `' + exact + '`';
  }

  /**
   * Strips all internal system badges, telemetry, engine names from text.
   */
  static sanitizeInternalTraces(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/SYSTEM:[\s\S]*?(?:USER PROMPT:|USER QUESTION:|$)/gi, '')
      .replace(/^(USER PROMPT:|USER QUESTION:)\s*/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\b(agentTrace|toolName|routerConfidence|selectedModelName|internal_intent):\s*[^\n]+/gi, '')
      .replace(/\[Internal Model:[^\]]+\]/gi, '')
      .replace(/\[Tool:[^\]]+\]/gi, '')
      .replace(/Confidence Score:\s*\d+(\.\d+)?/gi, '')
      .replace(/\[?Verified Math Engine\]?:?\s*/gi, '')
      .replace(/\[?Math Engine\]?:?\s*/gi, '')
      .replace(/\bSymPy\b:?\s*/gi, '')
      .replace(/\bExact Symbolic\b:?\s*/gi, '')
      .replace(/\bApproximate Numeric\b:?\s*/gi, '')
      .replace(/\bComputation Type\b:?\s*[^\n]*/gi, '')
      .replace(/\bDomain Category\b:?\s*[^\n]*/gi, '')
      .trim();
  }
}

module.exports = AnswerSynthesizer;
