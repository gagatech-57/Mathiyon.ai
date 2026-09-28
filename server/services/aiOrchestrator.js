/**
 * Mathiyon AI - Production AI Agent & Multi-Tool Orchestrator (Automatic Web Intelligence Upgrade)
 *
 * Universal Knowledge Fallback Pipeline:
 * USER QUESTION -> Intent Detection -> Conversation/Memory Check -> RAG Check ->
 * Deterministic Tool Check -> Internal Knowledge Check -> Real-Time / Web Decision ->
 * Web Search (if required) -> Source Collection -> Context Fusion -> Tool Execution -> Verification -> SLM -> FINAL ANSWER + SOURCES
 */

const mathTool = require('./tools/mathTool');
const ragTool = require('./tools/ragTool');
const slmTool = require('./tools/slmTool');
const memoryTool = require('./tools/memoryTool');
const codeTool = require('./tools/codeTool');
const webSearchTool = require('./tools/webSearchTool');
const visionTool = require('./tools/visionTool');
const voiceTool = require('./tools/voiceTool');
const timeDateTool = require('./tools/timeDateTool');
const currencyTool = require('./tools/currencyTool');
const unitConversionTool = require('./tools/unitConversionTool');
const weatherTool = require('./tools/weatherTool');
const calculatorTool = require('./tools/calculatorTool');

const memoryService = require('./memoryService');
const contextFusionEngine = require('./contextFusionEngine');
const observabilityService = require('./observabilityService');

// Tool Registry Map
const TOOL_REGISTRY = {
  MathEngine: mathTool,
  RAG: ragTool,
  SLM: slmTool,
  Memory: memoryTool,
  CodeEngine: codeTool,
  WebSearch: webSearchTool,
  web_search: webSearchTool, // Alias mapping
  VisionEngine: visionTool,
  VoiceEngine: voiceTool,
  TimeDateEngine: timeDateTool,
  CurrencyEngine: currencyTool,
  UnitConversionEngine: unitConversionTool,
  WeatherEngine: weatherTool,
  CalculatorEngine: calculatorTool
};

const TOOL_TIMEOUT_MS = 10000;
const MAX_AGENT_STEPS = 10;

/**
 * Classifies user message intent into normalized agent categories
 */
const detectIntent = (message, hasDocSelected = false, hasWebEnabled = false) => {
  if (!message || typeof message !== 'string') return 'UNKNOWN';
  const msgLower = message.toLowerCase().trim();

  // 1. Greeting / Basic General Conversation
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy|how are you|who are you)/i.test(msgLower)) {
    return 'GENERAL';
  }

  // 2. Document Selection / RAG
  const isDoc = hasDocSelected || /pdf|doc|document|file|chapter|page|according to|uploaded/i.test(msgLower);

  // 3. Time / Date & Date Calculation
  const isDateCalc = /how many days (until|between|from)|what date is \d+ days|days between/i.test(msgLower);
  const isTimeDate = !isDateCalc && /\b(what('?s| is)? (today'?s|current|the) (date|time|day|year|month))\b|what time is it|what day is today|current year|what month is it|time in \w+|date in \w+/i.test(msgLower);

  // 4. Currency
  const isCurrency = /convert \d+ \w+ to \w+|how much is \d+ \w+ in \w+|usd to inr|eur to inr|inr to usd|\b(exchange rate|currency conversion)\b/i.test(msgLower);

  // 5. Unit Conversion
  const isUnit = /\b(\d+(\.\d+)?\s*(kg|lb|lbs|km|miles|celsius|fahrenheit|liters|gallons|meters|feet)\s*(in|to|into)\s*(kg|lb|lbs|km|miles|celsius|fahrenheit|liters|gallons|meters|feet))\b|unit conversion/i.test(msgLower);

  // 6. Weather
  const isWeather = /\b(weather|temperature|rain|rainy|cloudy|sunny|forecast)\b|will it rain/i.test(msgLower);

  // 7. Simple Calculator (e.g., "25 * 30", "154 / 7")
  const isSimpleCalc = /^(\d+(\.\d+)?\s*[\+\-\*\/]\s*\d+(\.\d+)?)$/.test(msgLower.replace(/\s+/g, '')) || /^\s*calculate\s+\d+\s*[\+\-\*\/]\s*\d+\s*$/i.test(msgLower);

  // 8. Math Engine (SymPy - Algebra, Calculus, Equations, Word problems)
  const isMath = /solve|\bderivative\b|\bintegrate\b|percentage|equation|x\s*=|differentiate|matrix|matrices|trigonometry|algebra|fraction|\bmath\b|\bmaths\b/i.test(msgLower) || (/[\+\-\*\/\^\=]/.test(msgLower) && !isSimpleCalc && !isDateCalc && !isCurrency && !isUnit);

  // 9. Coding
  const isCode = /```|function|const |let |var |import |export |class |react|javascript|python|typescript|html|css|sql|mongodb|postgresql|api|express|node\.js|node|create a react|write code|debug/i.test(msgLower);

  // 10. Memory
  const isMemory = /remember that|my project is|i use|my name is|what is my name|what do you remember/i.test(msgLower);

  // 11. Translation
  const isTranslation = /translate|in tamil|into tamil|tamil sentence|tanglish/i.test(msgLower);

  // 12. Writing / Editing
  const isWriting = /write (a|an)? (email|letter|resume|cover letter|essay|story|poem)|proofread|rewrite|draft/i.test(msgLower);

  // 13. Summarization
  const isSummarize = /summarize|summary of|brief outline/i.test(msgLower);

  // 14. Automatic Web Intelligence Trigger Rules
  const isExplicitWebSearch = /search (online|the web|the internet|for)|look (this|it) up|find (this|it) online|web search/i.test(msgLower);
  const isCurrentInformation = /\b(latest|current|now|today'?s|recent|this week|this month|version|price|pricing|ceo of|who is the|news|event|events|release notes|changelog)\b/i.test(msgLower);
  const isVolatileTopic = /\b(react version|node version|node\.js version|bitcoin|crypto|stock|company|market|leadership)\b/i.test(msgLower);

  const isWeb = (hasWebEnabled || isExplicitWebSearch || isCurrentInformation || isVolatileTopic) && !isTimeDate && !isDateCalc && !isSimpleCalc && !isUnit && !isWeather;

  // Multi-Tool Detection Rules
  let activeToolCount = 0;
  if (isDoc) activeToolCount++;
  if (isWeb) activeToolCount++;
  if (isMath || isSimpleCalc) activeToolCount++;
  if (isCurrency) activeToolCount++;
  if (isTimeDate || isDateCalc) activeToolCount++;
  if (isMemory) activeToolCount++;

  if (activeToolCount >= 2 || (isWeb && (isCurrency || isSimpleCalc || isCode)) || (isDoc && (isMath || isCode || isWeb))) {
    return 'MULTI_TOOL';
  }

  if (isWeb) return 'WEB';
  if (isTimeDate) return 'TIME_DATE';
  if (isDateCalc) return 'DATE_CALCULATION';
  if (isCurrency) return 'CURRENCY';
  if (isUnit) return 'UNIT_CONVERSION';
  if (isWeather) return 'WEATHER';
  if (isSimpleCalc) return 'CALCULATOR';
  if (isDoc) return 'DOCUMENT';
  if (isMath) return 'MATH';
  if (isMemory) return 'MEMORY';
  if (isCode) return 'CODING';
  if (isTranslation) return 'TRANSLATION';
  if (isWriting) return 'WRITING';
  if (isSummarize) return 'SUMMARIZATION';

  return 'GENERAL';
};

/**
 * Helper to execute tool with strict timeout & standardized return
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
          data: res.data || res,
          error: null,
          metadata: { latencyMs, verified: Boolean(res.verified) }
        };
      } else {
        return {
          success: false,
          tool: tool.name || 'Tool',
          data: null,
          error: { code: res.error?.code || 'TOOL_EXECUTION_ERROR', message: res.error?.message || res.error || 'Tool execution failed' },
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
 * AI Orchestrator Main Entrypoint (Automatic Web Intelligence Upgrade)
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

  // Multi-Turn Reference Resolution
  const { resolvedQuery } = contextFusionEngine.resolveMultiTurnContext(message, conversationHistory);
  const activeMessage = resolvedQuery;

  const intent = detectIntent(activeMessage, documentIds.length > 0, enableWebSearch);
  const toolsUsed = [];
  const agentTrace = [];
  const sources = [];
  const citations = [];
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
    // --- STEP 1: MEMORY RETRIEVAL & RETENTION ---
    let memoryContextStr = '';
    let retrievedMemories = [];
    if (/remember that|remember my|store fact/i.test(activeMessage)) {
      const memSave = await executeToolWithTimeout(memoryTool, { userId, action: 'remember', content: activeMessage });
      if (memSave.success) {
        toolsUsed.push('Memory');
        agentTrace.push({ stage: 'tool_success', tool: 'Memory', action: 'remember', status: 'success', latencyMs: memSave.metadata.latencyMs });
      }
    }

    const userMemories = await memoryService.getRelevantMemories(userId, activeMessage);
    if (userMemories && userMemories.length > 0) {
      retrievedMemories = userMemories;
      memoryContextStr = userMemories.map(m => `- ${m.content}`).join('\n');
      if (!toolsUsed.includes('Memory')) toolsUsed.push('Memory');
      agentTrace.push({ stage: 'tool_success', tool: 'Memory', action: 'retrieve', status: 'success', count: userMemories.length });
    }

    // --- STEP 2: DETERMINISTIC DIRECT CAPABILITY SHORT-CIRCUITS ---

    // 2A. Time / Date Queries (Real-Time System Clock)
    if (intent === 'TIME_DATE' || intent === 'DATE_CALCULATION') {
      agentTrace.push({ stage: 'tool_running', tool: 'TimeDateEngine', label: 'Querying system clock...' });
      const timeRes = await executeToolWithTimeout(timeDateTool, { query: activeMessage });
      if (timeRes.success && timeRes.data) {
        toolsUsed.push('TimeDateEngine');
        agentTrace.push({ stage: 'tool_success', tool: 'TimeDateEngine', action: 'clock', status: 'success', latencyMs: timeRes.metadata.latencyMs });

        return {
          success: true,
          answer: timeRes.data.formatted,
          intent,
          toolsUsed,
          sources: [],
          citations: [],
          verified: true,
          requestId,
          totalLatencyMs: Date.now() - startTime,
          agentTrace,
          taskModel: { ...taskModel, status: 'completed' },
          model
        };
      }
    }

    // 2B. Simple Calculator Queries
    if (intent === 'CALCULATOR') {
      agentTrace.push({ stage: 'tool_running', tool: 'CalculatorEngine', label: 'Calculating...' });
      const calcRes = await executeToolWithTimeout(calculatorTool, { expression: activeMessage });
      if (calcRes.success && calcRes.data) {
        toolsUsed.push('CalculatorEngine');
        agentTrace.push({ stage: 'tool_success', tool: 'CalculatorEngine', action: 'compute', status: 'success', latencyMs: calcRes.metadata.latencyMs });

        return {
          success: true,
          answer: calcRes.data.formatted,
          intent,
          toolsUsed,
          sources: [],
          citations: [],
          verified: true,
          requestId,
          totalLatencyMs: Date.now() - startTime,
          agentTrace,
          taskModel: { ...taskModel, status: 'completed' },
          model
        };
      }
    }

    // 2C. Currency Conversion Queries
    if (intent === 'CURRENCY') {
      agentTrace.push({ stage: 'tool_running', tool: 'CurrencyEngine', label: 'Checking exchange rates...' });
      const currRes = await executeToolWithTimeout(currencyTool, { query: activeMessage });
      if (currRes.success && currRes.data) {
        toolsUsed.push('CurrencyEngine');
        agentTrace.push({ stage: 'tool_success', tool: 'CurrencyEngine', action: 'convert', status: 'success', latencyMs: currRes.metadata.latencyMs });

        return {
          success: true,
          answer: currRes.data.formatted,
          intent,
          toolsUsed,
          sources: [],
          citations: [],
          verified: true,
          requestId,
          totalLatencyMs: Date.now() - startTime,
          agentTrace,
          taskModel: { ...taskModel, status: 'completed' },
          model
        };
      }
    }

    // 2D. Unit Conversion Queries
    if (intent === 'UNIT_CONVERSION') {
      agentTrace.push({ stage: 'tool_running', tool: 'UnitConversionEngine', label: 'Converting units...' });
      const unitRes = await executeToolWithTimeout(unitConversionTool, { query: activeMessage });
      if (unitRes.success && unitRes.data) {
        toolsUsed.push('UnitConversionEngine');
        agentTrace.push({ stage: 'tool_success', tool: 'UnitConversionEngine', action: 'convert', status: 'success', latencyMs: unitRes.metadata.latencyMs });

        return {
          success: true,
          answer: unitRes.data.formatted,
          intent,
          toolsUsed,
          sources: [],
          citations: [],
          verified: true,
          requestId,
          totalLatencyMs: Date.now() - startTime,
          agentTrace,
          taskModel: { ...taskModel, status: 'completed' },
          model
        };
      }
    }

    // 2E. Real-Time Weather Queries
    if (intent === 'WEATHER') {
      agentTrace.push({ stage: 'tool_running', tool: 'WeatherEngine', label: 'Fetching weather...' });
      const wxRes = await executeToolWithTimeout(weatherTool, { query: activeMessage });
      if (wxRes.success && wxRes.data) {
        toolsUsed.push('WeatherEngine');
        agentTrace.push({ stage: 'tool_success', tool: 'WeatherEngine', action: 'fetch', status: 'success', latencyMs: wxRes.metadata.latencyMs });

        return {
          success: true,
          answer: wxRes.data.formatted,
          intent,
          toolsUsed,
          sources: [],
          citations: [],
          verified: true,
          requestId,
          totalLatencyMs: Date.now() - startTime,
          agentTrace,
          taskModel: { ...taskModel, status: 'completed' },
          model
        };
      }
    }

    // --- STEP 3: ADVANCED TOOL EXECUTION & CHAINING ---
    let ragData = null;
    let mathData = null;
    let webData = null;
    let codeData = null;
    let retrievedDocs = [];
    let retrievedWeb = [];

    // Step 3A: RAG Document Search
    if (intent === 'DOCUMENT' || intent === 'MULTI_TOOL' || documentIds.length > 0) {
      taskModel.steps.push({ stepId: 'step_rag', tool: 'RAG', action: 'search', status: 'running' });
      agentTrace.push({ stage: 'tool_running', tool: 'RAG', label: 'Searching documents...' });

      let ragRes = await executeToolWithTimeout(ragTool, { userId, query: activeMessage, documentIds, topK: 5 });
      if (!ragRes.success && !ragRes.metadata.forbidden && ragRes.error?.code === 'TOOL_TIMEOUT') {
        ragRes = await executeToolWithTimeout(ragTool, { userId, query: activeMessage, documentIds, topK: 5 });
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
        agentTrace.push({ stage: 'tool_success', tool: 'RAG', action: 'search', status: 'success', latencyMs: ragRes.metadata.latencyMs });
        if (ragData.sources) {
          ragData.sources.forEach(s => {
            sources.push({ ...s, sourceType: 'DOCUMENT' });
            retrievedDocs.push(s);
          });
        }
      } else {
        agentTrace.push({ stage: 'tool_error', tool: 'RAG', action: 'search', status: 'failed', error: ragRes.error?.message });
      }
    }

    // Step 3B: Web Intelligence Search & Automatic Fallback
    const shouldPerformWebSearch = intent === 'WEB' || intent === 'MULTI_TOOL' || enableWebSearch ||
      (ragData && (!ragData.found || /compare|online|web|latest/i.test(activeMessage)));

    if (shouldPerformWebSearch) {
      taskModel.steps.push({ stepId: 'step_web', tool: 'WebSearch', action: 'search', status: 'running' });
      agentTrace.push({ stage: 'tool_running', tool: 'WebSearch', label: 'Searching live web...' });

      let webRes = await executeToolWithTimeout(webSearchTool, { query: activeMessage });
      if (!webRes.success && webRes.error?.code === 'TOOL_TIMEOUT') {
        webRes = await executeToolWithTimeout(webSearchTool, { query: activeMessage });
      }

      if (webRes.success && webRes.data) {
        webData = webRes.data;
        toolsUsed.push('WebSearch');
        agentTrace.push({ stage: 'tool_success', tool: 'WebSearch', action: 'search', status: 'success', latencyMs: webRes.metadata.latencyMs });
        if (webData.citations) {
          webData.citations.forEach(c => citations.push({ ...c, type: 'web' }));
        }
        if (webData.sources) {
          webData.sources.forEach(s => {
            sources.push({ file: s.title, url: s.url, domain: s.domain, sourceType: 'WEB' });
            retrievedWeb.push(s);
          });
        }
      } else {
        agentTrace.push({ stage: 'tool_error', tool: 'WebSearch', action: 'search', status: 'failed', error: webRes.error?.message });
      }
    }

    // Step 3C: Math Engine Solver (SymPy Authoritative)
    if (intent === 'MATH' || intent === 'MULTI_TOOL') {
      taskModel.steps.push({ stepId: 'step_math', tool: 'MathEngine', action: 'solve', dependsOn: ragData ? ['step_rag'] : (webData ? ['step_web'] : []) });
      agentTrace.push({ stage: 'tool_running', tool: 'MathEngine', label: 'Calculating with SymPy...' });

      let mathQuery = activeMessage;
      const mathExprMatch = activeMessage.match(/(\d+[\s*\/+\-^.]+\d+[\s*\/+\-^.\d]*|[a-zA-Z0-9\s*\/+\-^.]+=+[a-zA-Z0-9\s*\/+\-^.]+)/);
      if (mathExprMatch && mathExprMatch[1] && mathExprMatch[1].trim().length >= 3) {
        mathQuery = mathExprMatch[1].trim();
      } else if (webData && webData.contextText) {
        mathQuery = `${activeMessage} given web context: ${webData.contextText.substring(0, 300)}`;
      } else if (ragData && ragData.context) {
        mathQuery = `${activeMessage} given text: ${ragData.context.substring(0, 300)}`;
      }

      let mathRes = await executeToolWithTimeout(mathTool, { question: mathQuery });
      if (!mathRes.success) {
        mathRes = await executeToolWithTimeout(mathTool, { question: mathQuery });
      }

      if (mathRes.success && mathRes.data) {
        mathData = mathRes.data;
        if (mathData.verified) {
          toolsUsed.push('MathEngine');
          agentTrace.push({ stage: 'tool_success', tool: 'MathEngine', action: 'solve', status: 'success', latencyMs: mathRes.metadata.latencyMs });
          isVerified = true;
        }
      } else {
        agentTrace.push({ stage: 'tool_error', tool: 'MathEngine', action: 'solve', status: 'failed', error: mathRes.error?.message });
      }
    }

    // Step 3D: Code Engine Analysis
    if (intent === 'CODING') {
      agentTrace.push({ stage: 'tool_running', tool: 'CodeEngine', label: 'Analyzing code...' });
      let codeRes = await executeToolWithTimeout(codeTool, { code: activeMessage, query: activeMessage });
      if (codeRes.success && codeRes.data) {
        codeData = codeRes.data;
        toolsUsed.push('CodeEngine');
        agentTrace.push({ stage: 'tool_success', tool: 'CodeEngine', action: 'analyze', status: 'success', latencyMs: codeRes.metadata.latencyMs });
      }
    }

    // --- CONTEXT FUSION & NORMALIZATION ---
    const normalizedContext = contextFusionEngine.createNormalizedContext({
      requestId,
      query: activeMessage,
      intent,
      conversation: conversationHistory,
      memory: retrievedMemories,
      documents: retrievedDocs,
      web: retrievedWeb,
      toolResults: codeData ? [codeData] : [],
      mathResults: mathData ? [mathData] : []
    });

    normalizedContext.documents.forEach(d => {
      if (d.citation && !citations.some(c => c.id === d.citation.id)) {
        citations.push(d.citation);
      }
    });

    // --- STEP 4: RESPONSE COMPOSITION & SLM SYNTHESIS ---

    // Pure Math Intent (SymPy Authoritative Win)
    if (intent === 'MATH' && mathData && mathData.verified) {
      toolsUsed.push('SLM');
      agentTrace.push({ stage: 'composing', tool: 'SLM', action: 'format', status: 'success', latencyMs: 5 });
      return {
        success: true,
        answer: `**Verified Solution:** ${mathData.result}\n\n${mathData.explanation}`,
        intent,
        toolsUsed,
        sources: [],
        citations: [],
        verified: true,
        requestId,
        totalLatencyMs: Date.now() - startTime,
        agentTrace,
        taskModel: { ...taskModel, status: 'completed' },
        normalizedContext,
        model
      };
    }

    // Grounded RAG Document Query (Without web search request)
    if ((intent === 'DOCUMENT') && ragData && !ragData.found && documentIds.length > 0 && !enableWebSearch && !webData) {
      toolsUsed.push('SLM');
      return {
        success: true,
        answer: "The information was not found in the provided documents.",
        intent,
        toolsUsed,
        sources: [],
        citations: [],
        verified: false,
        requestId,
        totalLatencyMs: Date.now() - startTime,
        agentTrace,
        taskModel: { ...taskModel, status: 'completed' },
        normalizedContext,
        model
      };
    }

    // System instruction prompt synthesis
    let systemInstructions = `SYSTEM: You are Mathiyon AI, an intelligent production AI assistant. Answer accurately based on verified tool contexts and general intelligence.`;

    if (memoryContextStr) {
      systemInstructions += `\nUSER MEMORIES & PREFERENCES:\n${memoryContextStr}\n`;
    }

    if (ragData && ragData.context) {
      systemInstructions += `\nDOCUMENT CONTEXT (Strict Source Truth):\n${ragData.context}\nRules: Answer based on the document context. If answer is missing, state 'The information was not found in the provided documents.'\n`;
    }

    if (webData && webData.contextText) {
      systemInstructions += `\nWEB SEARCH CONTEXT:\n${webData.contextText}\n`;
    }

    if (mathData && mathData.result) {
      systemInstructions += `\nVERIFIED MATH ENGINE RESULT: ${mathData.result} (${mathData.explanation})\nUse this verified result in your answer.\n`;
    }

    const slmPrompt = `${systemInstructions}\nUSER PROMPT: ${activeMessage}`;
    agentTrace.push({ stage: 'composing', tool: 'SLM', label: 'Preparing final response...' });

    let slmRes = await executeToolWithTimeout(slmTool, { message: slmPrompt, conversation: conversationHistory, model });
    if (!slmRes.success) {
      slmRes = await executeToolWithTimeout(slmTool, { message: slmPrompt, conversation: conversationHistory, model });
    }

    toolsUsed.push('SLM');
    agentTrace.push({ stage: 'complete', tool: 'SLM', action: 'generate', status: slmRes.success ? 'success' : 'failed', latencyMs: slmRes.metadata.latencyMs });

    if (slmRes.success && slmRes.data) {
      finalAnswer = slmRes.data.response;

      if (mathData && mathData.result && !finalAnswer.includes(mathData.result)) {
        finalAnswer += `\n\n🧮 **Verified Math Computation:** ${mathData.result}`;
      }

      if (normalizedContext.conflicts && normalizedContext.conflicts.length > 0) {
        const conflictMsgs = normalizedContext.conflicts.map(c => `- ⚠️ ${c.description}`).join('\n');
        finalAnswer += `\n\n⚠️ **Source Conflict Notice:**\n${conflictMsgs}`;
      }

      if (sources.length > 0 && !finalAnswer.includes('Source Citation') && !finalAnswer.includes('Sources:')) {
        const citStr = sources.map(s => s.page ? `- ${s.file} — Page ${s.page}` : `- [${s.file || s.title}](${s.url || '#'})`).join('\n');
        finalAnswer += `\n\n📍 **Source Citations:**\n${citStr}`;
      }
    } else {
      finalAnswer = slmRes.error?.message || "I couldn't access reliable web sources right now, so I can't verify the current information.";
    }

    const totalLatencyMs = Date.now() - startTime;
    const safeTrace = contextFusionEngine.buildSafeContextTrace({
      intent,
      toolsUsed,
      sources,
      citations,
      conflicts: normalizedContext.conflicts,
      latencyMs: totalLatencyMs,
      model: slmRes.data ? (slmRes.data.model || model) : model
    });

    const resultPayload = {
      success: true,
      answer: finalAnswer,
      intent,
      toolsUsed,
      sources,
      citations,
      verified: isVerified || Boolean(mathData && mathData.verified),
      requestId,
      totalLatencyMs,
      agentTrace,
      safeTrace,
      normalizedContext,
      taskModel: { ...taskModel, status: 'completed' },
      model: slmRes.data ? (slmRes.data.model || model) : model
    };

    observabilityService.recordEvent({
      requestId,
      taskId: taskModel.taskId,
      userId,
      intent,
      toolsUsed,
      model: resultPayload.model,
      success: true,
      totalLatencyMs,
      citations,
      sources,
      conflictsCount: normalizedContext.conflicts ? normalizedContext.conflicts.length : 0
    });

    return resultPayload;

  } catch (err) {
    console.error('AI Orchestrator Execution Error:', err);

    observabilityService.recordEvent({
      requestId,
      userId,
      intent: intent || 'UNKNOWN',
      toolsUsed: toolsUsed || [],
      model: model || 'Mathiyon SLM v1.2',
      success: false,
      totalLatencyMs: Date.now() - startTime,
      error: err.message
    });

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
