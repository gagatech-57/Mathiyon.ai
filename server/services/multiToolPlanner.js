/**
 * Mathiyon AI - Multi-Tool Planner
 *
 * Supports multi-step coordinated tool execution:
 * - WEB -> MATH -> ANSWER
 * - RAG -> WEB -> ANSWER
 * - MEMORY -> WEB -> ANSWER
 * - WEB -> CODE -> ANSWER
 * - RAG -> MATH -> ANSWER
 * - RAG -> WEB -> MATH -> ANSWER
 *
 * Enforces MAX_AGENT_STEPS (10) and TOOL_TIMEOUT_MS (10000).
 * Prevents uncontrolled loops and cycles.
 */

const MAX_AGENT_STEPS = 10;
const TOOL_TIMEOUT_MS = 10000;

class MultiToolPlanner {
  /**
   * Plans the sequence of tool executions based on query signals and available contexts
   */
  static planExecutionGraph({ query, intent, documentIds = [], hasWebEnabled = false, userMemories = [] }) {
    const qLower = query.toLowerCase();
    const steps = [];

    const needsRAG = documentIds.length > 0 || /\b(uploaded|document|file|pdf|docx)\b/i.test(qLower);
    const needsMemory = userMemories.length > 0 || /\b(my preference|remember|my name|favorite)\b/i.test(qLower);
    const needsWeb = hasWebEnabled || /\b(latest|current|recent|online|web|search|news|price)\b/i.test(qLower) ||
      (needsRAG && /\b(compare|versus|vs|online)\b/i.test(qLower));
    const needsMath = /\b(calculate|solve|sum|average|total|% of|\d+[\+\-\*\/]\d+|\d+x)\b/i.test(qLower);
    const needsCode = /\b(code|function|express|react|typescript|python|api|script)\b/i.test(qLower);

    // Build step sequence based on dependency flow
    // 1. RAG first if document is queried
    if (needsRAG) {
      steps.push({ stepId: 'step_rag', tool: 'RAG', action: 'retrieve_documents', inputKey: 'documentIds' });
    }

    // 2. Memory if user context needed
    if (needsMemory) {
      steps.push({ stepId: 'step_memory', tool: 'Memory', action: 'retrieve_memory', inputKey: 'userId' });
    }

    // 3. Web Search if current info or comparison needed
    if (needsWeb) {
      steps.push({
        stepId: 'step_web',
        tool: 'WebSearch',
        action: 'search_web',
        dependsOn: needsRAG ? ['step_rag'] : (needsMemory ? ['step_memory'] : [])
      });
    }

    // 4. Code Engine if code analysis or synthesis needed
    if (needsCode && !needsMath) {
      steps.push({
        stepId: 'step_code',
        tool: 'CodeEngine',
        action: 'analyze_code',
        dependsOn: needsWeb ? ['step_web'] : []
      });
    }

    // 5. Math Engine if calculation needed (can take numbers from Web or RAG)
    if (needsMath) {
      const mathDeps = [];
      if (needsRAG) mathDeps.push('step_rag');
      if (needsWeb) mathDeps.push('step_web');
      steps.push({
        stepId: 'step_math',
        tool: 'MathEngine',
        action: 'solve_math',
        dependsOn: mathDeps
      });
    }

    // Cap at MAX_AGENT_STEPS
    const plan = steps.slice(0, MAX_AGENT_STEPS);

    return {
      plan,
      isMultiStep: plan.length >= 2,
      maxSteps: MAX_AGENT_STEPS,
      timeoutMs: TOOL_TIMEOUT_MS
    };
  }
}

module.exports = MultiToolPlanner;
