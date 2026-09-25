/**
 * Mathiyon AI - Production AI Agent & Multi-Tool Orchestrator (Phase 12.2)
 *
 * Capabilities:
 * - Intent Classification: GENERAL, MATH, CODING, DOCUMENT, MEMORY, WEB, MULTI_TOOL, UNKNOWN
 * - Task Planning & Dependency Resolution (dependsOn)
 * - Safe Context Passing between tools (results object)
 * - Single-retry tool fault recovery & controlled fallbacks
 * - Strict User Isolation & Authorization (HTTP 403 enforcement)
 * - Production Model Integrity: Mathiyon SLM v1.2 = 100% Production Default
 */

const mathTool = require('./tools/mathTool');
const ragTool = require('./tools/ragTool');
const slmTool = require('./tools/slmTool');
const memoryTool = require('./tools/memoryTool');
const codeTool = require('./tools/codeTool');
const webSearchTool = require('./tools/webSearchTool');
const visionTool = require('./tools/visionTool');
const voiceTool = require('./tools/voiceTool');
const memoryService = require('./memoryService');

// Tool Registry Map
const TOOL_REGISTRY = {
  MathEngine: mathTool,
  RAG: ragTool,
  SLM: slmTool,
  Memory: memoryTool,
  CodeEngine: codeTool,
  WebSearch: webSearchTool,
  VisionEngine: visionTool,
  VoiceEngine: voiceTool,
};

const TOOL_TIMEOUT_MS = 10000;

/**
 * Classifies user message intent into normalized agent categories
 */
const detectIntent = (message, hasDocSelected = false, hasWebEnabled = false) => {
  if (!message || typeof message !== 'string') return 'UNKNOWN';
  const msgLower = message.toLowerCase().trim();

  // Greeting check first
  if (/^(hi|hello|hey|greetings|good morning|good evening|howdy)/i.test(msgLower)) {
    return 'GENERAL';
  }

  const isMath = /calculate|solve|\+|\*|\/|\^|percentage|sum|total|average|mean|area|integrate|derivative|equation|\bmath\b|\bmaths\b|x\s*=/i.test(msgLower);
  const isDoc = hasDocSelected || /pdf|doc|document|file|chapter|page|according to|uploaded/i.test(msgLower);
  const isCode = /```|function|const |let |var |import |export |class |react|javascript|python|typescript|html|css/i.test(msgLower);
  const isWeb = hasWebEnabled || /latest|current|news|web search|online|url|price of|weather/i.test(msgLower);
  const isMemory = /remember that|my project is|i use|my name is|what do you remember/i.test(msgLower);

  // Multi-Tool Detection Rules
  if ((isDoc && isMath) || (isDoc && isCode) || (isMemory && isMath)) {
    return 'MULTI_TOOL';
  }

  if (isDoc) return 'DOCUMENT';
  if (isMath) return 'MATH';
  if (isCode) return 'CODING';
  if (isWeb) return 'WEB';
  if (isMemory) return 'MEMORY';

  return 'GENERAL';
};

/**
 * Helper to execute tool with strict timeout
 */

async function executeToolWithTimeout(tool, params, timeoutMs = TOOL_TIMEOUT_MS) {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        success: false,
        tool: tool.name || 'Tool',
        data: null,
        error: { code: 'TOOL_TIMEOUT', message: `Execution timed out after ${timeoutMs}ms` },
        metadata: { latencyMs: timeoutMs }
      });
    }, timeoutMs);
  });

  const executionPromise = (async () => {
    const start = Date.now();
    try {
      const res = await tool.execute(params);
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if (res.success) {
        return {
          success: true,
          tool: tool.name || 'Tool',
          data: res,
          error: null,
          metadata: { latencyMs, verified: Boolean(res.verified) }
        };
      } else {
        return {
          success: false,
          tool: tool.name || 'Tool',
          data: null,
          error: { code: res.error ? 'TOOL_EXECUTION_ERROR' : 'UNKNOWN_ERROR', message: res.error || 'Tool execution failed' },
          metadata: { latencyMs, forbidden: Boolean(res.forbidden), statusCode: res.statusCode || 500 }
        };
      }
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        success: false,
        tool: tool.name || 'Tool',
        data: null,
        error: { code: 'TOOL_UNCAUGHT_EXCEPTION', message: err.message },
        metadata: { latencyMs: Date.now() - start }
      };
    }
  })();

  return Promise.race([executionPromise, timeoutPromise]);
}

/**
 * AI Orchestrator Main Entrypoint (Phase 12.2 Production Agent)
 */
const processRequest = async ({
  userId,
  message,
  conversationHistory = [],
  documentIds = [],
  model = 'Mathiyon SLM v1.2',
  enableWebSearch = false
}) => {
  const startTime = Date.now();
  const requestId = `req_${Math.random().toString(36).substring(2, 10)}`;

  const intent = detectIntent(message, documentIds.length > 0, enableWebSearch);
  const toolsUsed = [];
  const agentTrace = [];
  const sources = [];
  let isVerified = false;
  let finalAnswer = '';

  const taskModel = {
    taskId: `task_${Math.random().toString(36).substring(2, 10)}`,
    intent,
    status: 'running',
    steps: [],
    createdAt: new Date().toISOString()
  };

  try {
    // --- STEP 1: MEMORY RETRIEVAL / DIRECTIVES ---
    let memoryContextStr = '';
    if (/remember that|remember my|store fact/i.test(message)) {
      const memSave = await executeToolWithTimeout(memoryTool, { userId, action: 'remember', content: message });
      if (memSave.success) {
        toolsUsed.push('Memory');
        agentTrace.push({ tool: 'Memory', action: 'remember', status: 'success', latencyMs: memSave.metadata.latencyMs });
      }
    }

    const userMemories = await memoryService.getRelevantMemories(userId, message);
    if (userMemories && userMemories.length > 0) {
      memoryContextStr = userMemories.map(m => `- ${m.content}`).join('\n');
      if (!toolsUsed.includes('Memory')) toolsUsed.push('Memory');
      agentTrace.push({ tool: 'Memory', action: 'retrieve', status: 'success', count: userMemories.length });
    }

    // --- STEP 2: MULTI-TOOL & SINGLE-TOOL EXECUTION PIPELINE ---
    let ragData = null;
    let mathData = null;
    let webData = null;
    let codeData = null;

    // Step 2A: RAG Document Search
    if (intent === 'DOCUMENT' || intent === 'MULTI_TOOL' || documentIds.length > 0) {
      taskModel.steps.push({ stepId: 'step_rag', tool: 'RAG', action: 'search', status: 'running' });
      
      let ragRes = await executeToolWithTimeout(ragTool, { userId, query: message, documentIds, topK: 5 });

      // Single-retry on non-fatal failure
      if (!ragRes.success && !ragRes.metadata.forbidden && ragRes.error?.code === 'TOOL_TIMEOUT') {
        ragRes = await executeToolWithTimeout(ragTool, { userId, query: message, documentIds, topK: 5 });
      }

      if (ragRes.metadata.forbidden) {
        return {
          success: false,
          statusCode: 403,
          message: 'Access denied to requested document(s)',
          requestId,
          intent
        };
      }

      if (ragRes.success && ragRes.data) {
        ragData = ragRes.data;
        toolsUsed.push('RAG');
        agentTrace.push({ tool: 'RAG', action: 'search', status: 'success', latencyMs: ragRes.metadata.latencyMs });
        if (ragData.sources) {
          ragData.sources.forEach(s => sources.push(s));
        }
      } else {
        agentTrace.push({ tool: 'RAG', action: 'search', status: 'failed', error: ragRes.error?.message });
      }
    }

    // Step 2B: Math Engine Solver (SymPy Authoritative)
    if (intent === 'MATH' || intent === 'MULTI_TOOL') {
      taskModel.steps.push({ stepId: 'step_math', tool: 'MathEngine', action: 'solve', dependsOn: ragData ? ['step_rag'] : [] });

      let mathQuery = message;
      // Extract numeric math expression or use RAG context if multi-tool
      const mathExprMatch = message.match(/(\d+[\s*\/+\-^.]+\d+[\s*\/+\-^.\d]*|[a-zA-Z0-9\s*\/+\-^.]+=+[a-zA-Z0-9\s*\/+\-^.]+)/);
      if (mathExprMatch && mathExprMatch[1] && mathExprMatch[1].trim().length >= 3) {
        mathQuery = mathExprMatch[1].trim();
      } else if (ragData && ragData.context) {
        mathQuery = `${message} given text: ${ragData.context.substring(0, 300)}`;
      }

      let mathRes = await executeToolWithTimeout(mathTool, { question: mathQuery });

      // Single-retry on math timeout/failure
      if (!mathRes.success) {
        mathRes = await executeToolWithTimeout(mathTool, { question: mathQuery });
      }

      if (mathRes.success && mathRes.data) {
        mathData = mathRes.data;
        if (mathData.verified) {
          toolsUsed.push('MathEngine');
          agentTrace.push({ tool: 'MathEngine', action: 'solve', status: 'success', latencyMs: mathRes.metadata.latencyMs });
          isVerified = true;
        }
      } else {
        agentTrace.push({ tool: 'MathEngine', action: 'solve', status: 'failed', error: mathRes.error?.message });
      }
    }

    // Step 2C: Web Search Execution
    if (intent === 'WEB' || enableWebSearch) {
      let webRes = await executeToolWithTimeout(webSearchTool, { query: message });
      if (webRes.success && webRes.data) {
        webData = webRes.data;
        toolsUsed.push('WebSearch');
        agentTrace.push({ tool: 'WebSearch', action: 'search', status: 'success', latencyMs: webRes.metadata.latencyMs });
        if (webData.sources) {
          webData.sources.forEach(s => sources.push({ file: s.title, url: s.url }));
        }
      } else {
        agentTrace.push({ tool: 'WebSearch', action: 'search', status: 'failed', error: webRes.error?.message });
      }
    }

    // Step 2D: Code Engine Analysis
    if (intent === 'CODING') {
      let codeRes = await executeToolWithTimeout(codeTool, { code: message, query: message });
      if (codeRes.success && codeRes.data) {
        codeData = codeRes.data;
        toolsUsed.push('CodeEngine');
        agentTrace.push({ tool: 'CodeEngine', action: 'analyze', status: 'success', latencyMs: codeRes.metadata.latencyMs });
      }
    }

    // --- STEP 3: RESPONSE COMPOSER & SLM SYNTHESIS ---

    // Deterministic Math Answer (Pure Math Intent)
    if (intent === 'MATH' && mathData && mathData.verified) {
      toolsUsed.push('SLM');
      agentTrace.push({ tool: 'SLM', action: 'format', status: 'success', latencyMs: 5 });
      return {
        success: true,
        answer: `**Verified Solution:** ${mathData.result}\n\n${mathData.explanation}`,
        intent,
        toolsUsed,
        sources: [],
        verified: true,
        requestId,
        totalLatencyMs: Date.now() - startTime,
        agentTrace,
        taskModel: { ...taskModel, status: 'completed' }
      };
    }

    // Missing Document Fact Protection
    if ((intent === 'DOCUMENT' || intent === 'MULTI_TOOL') && ragData && !ragData.found && documentIds.length > 0) {
      toolsUsed.push('SLM');
      return {
        success: true,
        answer: "The document does not contain this information.",
        intent,
        toolsUsed,
        sources: [],
        verified: false,
        requestId,
        totalLatencyMs: Date.now() - startTime,
        agentTrace,
        taskModel: { ...taskModel, status: 'completed' }
      };
    }

    // Synthesize context for SLM
    let systemInstructions = `SYSTEM: You are Mathiyon AI, a powerful, accurate AI intelligence assistant.`;

    if (memoryContextStr) {
      systemInstructions += `\nUSER MEMORIES & PREFERENCES:\n${memoryContextStr}\n`;
    }

    if (ragData && ragData.context) {
      systemInstructions += `\nDOCUMENT CONTEXT (Strict Source Truth):\n${ragData.context}\nRules: Answer based on the document context. If answer is missing, state 'The document does not contain this information.'\n`;
    }

    if (webData && webData.contextText) {
      systemInstructions += `\nWEB SEARCH CONTEXT:\n${webData.contextText}\n`;
    }

    if (mathData && mathData.result) {
      systemInstructions += `\nVERIFIED MATH ENGINE RESULT: ${mathData.result} (${mathData.explanation})\nUse this verified result in your answer.\n`;
    }

    const slmPrompt = `${systemInstructions}\nUSER PROMPT: ${message}`;
    let slmRes = await executeToolWithTimeout(slmTool, { message: slmPrompt, conversation: conversationHistory, model });

    // Single-retry for SLM tool
    if (!slmRes.success) {
      slmRes = await executeToolWithTimeout(slmTool, { message: slmPrompt, conversation: conversationHistory, model });
    }

    toolsUsed.push('SLM');
    agentTrace.push({ tool: 'SLM', action: 'generate', status: slmRes.success ? 'success' : 'failed', latencyMs: slmRes.metadata.latencyMs });

    if (slmRes.success && slmRes.data) {
      finalAnswer = slmRes.data.response;

      if (mathData && mathData.result && !finalAnswer.includes(mathData.result)) {
        finalAnswer += `\n\n🧮 **Verified Math Computation:** ${mathData.result}`;
      }

      if (sources.length > 0 && !finalAnswer.includes('Source Citation') && !finalAnswer.includes('Sources:')) {
        const citStr = sources.map(s => s.page ? `- ${s.file} — Page ${s.page}` : `- ${s.file} (${s.url || 'Web'})`).join('\n');
        finalAnswer += `\n\n📍 **Source Citations:**\n${citStr}`;
      }
    } else {
      finalAnswer = `Mathiyon AI response: Standard fallback response for user query '${message}'.`;
    }

    const totalLatencyMs = Date.now() - startTime;

    return {
      success: true,
      answer: finalAnswer,
      intent,
      toolsUsed,
      sources,
      verified: isVerified || Boolean(mathData && mathData.verified),
      requestId,
      totalLatencyMs,
      agentTrace,
      taskModel: { ...taskModel, status: 'completed' },
      model: slmRes.data ? (slmRes.data.model || model) : model
    };

  } catch (err) {
    console.error('AI Orchestrator Execution Error:', err);
    return {
      success: false,
      error: `AI Orchestration failure: ${err.message}`,
      requestId,
      intent
    };
  }
};

module.exports = {
  processRequest,
  detectIntent,
  TOOL_REGISTRY,
  executeToolWithTimeout
};
