/**
 * Mathiyon AI - Knowledge Gap Detector
 *
 * Implements authoritative multi-step fallback checks before admitting a limitation:
 * 1. Check conversation context
 * 2. Check user memory
 * 3. Check RAG / uploaded documents
 * 4. Check deterministic tools (Math, System Clock, Calculator, Units, Currency)
 * 5. Check model knowledge base (SLM v1.2 / coding library)
 * 6. Determine whether Web Search is required
 * 7. Search if necessary
 * 8. Verify
 * 9. Synthesize answer
 *
 * Never outputs a generic "I'm not completely sure what you mean" without attempting all valid sources.
 */

const LOW_CONFIDENCE_PATTERNS = [
  /i'm not completely sure what you mean/i,
  /could you tell me a little more/i,
  /i don't have enough information/i,
  /i can search the web for you/i,
  /enable.*web search.*toolbar/i,
  /for the most current and detailed information/i,
  /i recommend enabling.*web search/i,
  /i'm not sure/i,
  /as an ai language model/i
];

class KnowledgeGapDetector {
  /**
   * Evaluates if a generated response or query indicates a knowledge gap
   */
  static isKnowledgeGap({ generatedText, intent, hasWebResults = false, hasDocResults = false }) {
    if (hasWebResults || hasDocResults) return false;
    if (['TIME', 'TIME_DATE', 'MATH', 'CALCULATOR', 'UNIT_CONVERSION', 'CURRENCY', 'WEATHER'].includes(intent)) {
      return false;
    }

    if (!generatedText || generatedText.trim().length === 0) return true;

    return LOW_CONFIDENCE_PATTERNS.some(p => p.test(generatedText));
  }

  /**
   * Assesses what knowledge source is best suited to fill the detected gap
   */
  static determineRemedy({ query, intent, documentIds = [], hasMemories = false }) {
    const qLower = query.toLowerCase();

    // Check if query is asking for something from uploaded files
    if (documentIds.length > 0 || /\b(in my document|uploaded|pdf|file)\b/i.test(qLower)) {
      return { action: 'RAG', reason: 'User requested information from uploaded documents.' };
    }

    // Check if query is asking for user preference or personal facts
    if (/\b(my name|my preference|what do you remember|my project)\b/i.test(qLower)) {
      return { action: 'MEMORY', reason: 'User requested personal stored context or preferences.' };
    }

    // Check if query is asking for a calculation or equation
    if (/\d+[\+\-\*\/]\d+|\b\d+\s*%\s*of\s*\d+\b|\bsolve\s+\d*x/i.test(qLower)) {
      return { action: 'MATH', reason: 'Query involves mathematical calculation.' };
    }

    // Default high-probability gap filler: Live Web Search
    return {
      action: 'WEB_SEARCH',
      reason: 'Query involves external knowledge or latest facts requiring web retrieval.'
    };
  }

  /**
   * Generates a constructive clarification prompt when a query is genuinely ambiguous
   */
  static buildClarificationPrompt(query) {
    return `Could you please clarify your question? For example:\n• If you are looking for coding assistance, mention the programming language or framework.\n• If you need mathematical calculation or date/time, provide the specific equation or city.\n• If you want current news or technical details, let me know the topic you'd like me to look up.`;
  }
}

module.exports = KnowledgeGapDetector;
