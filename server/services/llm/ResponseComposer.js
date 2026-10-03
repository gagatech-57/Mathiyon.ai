/**
 * Mathiyon AI - Response Composer
 * Authoritative response synthesis module that enforces tool authority,
 * prevents LLM hallucinations over exact deterministic numbers,
 * and formats clean markdown responses with citations.
 */

class ResponseComposer {
  /**
   * Synthesizes and composes the final user response.
   * @param {Object} params
   * @param {string} params.intent
   * @param {string} [params.generatedText]
   * @param {Object} [params.mathData]
   * @param {Object} [params.timeData]
   * @param {Object} [params.calcData]
   * @param {Object} [params.unitData]
   * @param {Object} [params.currencyData]
   * @param {Object} [params.weatherData]
   * @param {Array} [params.sources=[]]
   * @param {Array} [params.citations=[]]
   * @param {Array} [params.conflicts=[]]
   * @param {string} [params.model]
   * @returns {string}
   */
  static compose({
    intent,
    generatedText = '',
    mathData = null,
    timeData = null,
    calcData = null,
    unitData = null,
    currencyData = null,
    weatherData = null,
    sources = [],
    citations = [],
    conflicts = [],
    model = 'Mathiyon AI'
  }) {
    // 1. Direct Deterministic Tool Bypasses
    if (intent === 'TIME_DATE' && timeData?.formatted) {
      return timeData.formatted;
    }
    if (intent === 'CALCULATOR' && calcData?.formatted) {
      return calcData.formatted;
    }
    if (intent === 'UNIT_CONVERSION' && unitData?.formatted) {
      return unitData.formatted;
    }
    if (intent === 'WEATHER' && weatherData?.formatted) {
      return weatherData.formatted;
    }

    // 2. Pure Math Results (Authoritative Invariance & Concise Formatting)
    if (intent === 'MATH' && mathData?.verified) {
      // If concise displayAnswer is provided, return it directly
      if (mathData.displayAnswer) {
        return mathData.displayAnswer;
      }
      if (mathData.result) {
        return mathData.result;
      }
      return mathData.answer || 'Math computation verified';
    }

    // 3. Clean generated text from system prompts or internal tags
    let finalAnswer = generatedText || '';
    finalAnswer = finalAnswer.replace(/SYSTEM:[\s\S]*?(?:USER PROMPT:|USER QUESTION:|$)/g, '').trim();
    finalAnswer = finalAnswer.replace(/^(USER PROMPT:|USER QUESTION:)\s*/gi, '').trim();

    // 4. Ensure Verified Math Invariance in Multi-Tool / Hybrid responses
    if (mathData && mathData.result) {
      const mathSnippet = `🧮 **Verified Math Computation:** ${mathData.displayAnswer || mathData.result}`;
      
      if (!finalAnswer.includes(mathData.result) && !finalAnswer.includes(mathData.answer) && !finalAnswer.includes(mathData.displayAnswer)) {
        finalAnswer += `\n\n${mathSnippet}`;
      }
    }

    // 5. Append Source Conflict Warnings
    if (conflicts && conflicts.length > 0) {
      const conflictMsgs = conflicts.map(c => `- ⚠️ ${c.description || c.msg || c}`).join('\n');
      if (!finalAnswer.includes('Source Conflict Notice')) {
        finalAnswer += `\n\n⚠️ **Source Conflict Notice:**\n${conflictMsgs}`;
      }
    }

    // 6. Append Standardized Citations
    if (sources && sources.length > 0 && !finalAnswer.includes('Source Citations:') && !finalAnswer.includes('Sources:')) {
      const citStr = sources.map(s => {
        if (s.page) {
          return `- ${s.file || s.title || 'Document'} — Page ${s.page}`;
        }
        return `- [${s.title || s.file || 'Source'}](${s.url || '#'})`;
      }).join('\n');
      
      finalAnswer += `\n\n📍 **Source Citations:**\n${citStr}`;
    }

    return finalAnswer.trim();
  }
}

module.exports = ResponseComposer;
