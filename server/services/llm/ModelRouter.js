/**
 * Mathiyon AI - Hybrid Model Router
 * Evaluates intent, query complexity, tool requirements, and reasoning depth
 * to route between SLM v1.2 (100% production), LLM (Reasoning layer), and Deterministic Tools.
 */

class ModelRouter {
  /**
   * Analyzes query complexity and selects the optimal intelligence model layer.
   * @param {Object} params
   * @param {string} params.intent
   * @param {string} params.message
   * @param {boolean} [params.hasDocContext=false]
   * @param {boolean} [params.hasWebContext=false]
   * @param {boolean} [params.hasMath=false]
   * @param {number} [params.contextSize=0]
   * @returns {{modelType: 'SLM_V1_2'|'LLM'|'TOOL_ONLY'|'LLM_WITH_TOOLS', complexity: 'low'|'medium'|'high', modelName: string, reason: string}}
   */
  static selectModel({
    intent,
    message = '',
    hasDocContext = false,
    hasWebContext = false,
    hasMath = false,
    contextSize = 0
  }) {
    const msg = message.toLowerCase().trim();
    const wordCount = msg.split(/\s+/).length;

    // 1. Deterministic Tool Only Routing (Zero SLM/LLM Hallucination Risk)
    if (intent === 'TIME_DATE' || intent === 'DATE_CALCULATION') {
      return {
        modelType: 'TOOL_ONLY',
        complexity: 'low',
        modelName: 'Mathiyon System Clock',
        reason: 'Deterministic system clock query.'
      };
    }

    if (intent === 'CALCULATOR') {
      return {
        modelType: 'TOOL_ONLY',
        complexity: 'low',
        modelName: 'Mathiyon Calculator Engine',
        reason: 'Deterministic exact arithmetic calculator.'
      };
    }

    if (intent === 'UNIT_CONVERSION') {
      return {
        modelType: 'TOOL_ONLY',
        complexity: 'low',
        modelName: 'Mathiyon Unit Conversion Engine',
        reason: 'Deterministic unit conversion calculation.'
      };
    }

    if (intent === 'WEATHER' && !msg.includes('explain') && !msg.includes('compare')) {
      return {
        modelType: 'TOOL_ONLY',
        complexity: 'low',
        modelName: 'Mathiyon Weather Engine',
        reason: 'Real-time weather data lookup.'
      };
    }

    if (intent === 'ASSISTANT_IDENTITY') {
      return {
        modelType: 'SLM_V1_2',
        complexity: 'low',
        modelName: 'Mathiyon SLM v1.2',
        reason: 'Assistant identity resolution.'
      };
    }

    // 2. Pure Math Engine
    if (intent === 'MATH') {
      return {
        modelType: 'TOOL_ONLY',
        complexity: 'medium',
        modelName: 'Mathiyon SymPy Math Engine',
        reason: 'Deterministic exact symbolic mathematics.'
      };
    }

    // 3. Detect Complexity Signals
    const isMultiTool = intent === 'MULTI_TOOL' || (hasWebContext && hasDocContext) || (hasWebContext && hasMath) || (hasDocContext && hasMath);
    const hasComplexCoding = /architecture|production|security considerations|jwt|postgresql|database schema|microservices|infrastructure|kubernetes|dockerize|refactor full|state management architecture/i.test(msg);
    const hasDeepReasoning = /compare|contrast|analyze differences|trade-offs|step-by-step plan|multi-step|evaluate pros and cons|design a|synthesize/i.test(msg);
    const hasMultipleConstraints = (msg.includes(' and ') && (msg.includes('then') || msg.includes('with') || msg.includes('also'))) || wordCount > 25;
    const isComplexWebRag = (hasWebContext || hasDocContext) && (hasDeepReasoning || hasComplexCoding || isMultiTool || wordCount > 15);

    // 4. Complex Multi-Tool & Reasoning -> LLM Layer
    if (isMultiTool) {
      return {
        modelType: 'LLM_WITH_TOOLS',
        complexity: 'high',
        modelName: 'Mathiyon LLM (Hybrid Agent)',
        reason: 'Multi-tool workflow requiring contextual synthesis.'
      };
    }

    if (hasComplexCoding || hasDeepReasoning || isComplexWebRag || hasMultipleConstraints) {
      return {
        modelType: 'LLM',
        complexity: 'high',
        modelName: 'Mathiyon LLM (Hybrid)',
        reason: 'Complex reasoning, multi-step instructions, or architectural design.'
      };
    }

    // 5. Grounded Single-Source RAG / Web with moderate complexity
    if (hasDocContext || hasWebContext) {
      if (wordCount > 10 || msg.includes('explain') || msg.includes('why') || msg.includes('how')) {
        return {
          modelType: 'LLM',
          complexity: 'medium',
          modelName: 'Mathiyon LLM (Hybrid)',
          reason: 'Contextual synthesis for retrieved evidence.'
        };
      }
    }

    // 6. Default to Fast Production SLM v1.2 for Simple Tasks
    return {
      modelType: 'SLM_V1_2',
      complexity: 'low',
      modelName: 'Mathiyon SLM v1.2',
      reason: 'Low-latency conversational and lightweight task.'
    };
  }
}

module.exports = ModelRouter;
