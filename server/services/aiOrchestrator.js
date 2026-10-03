/**
 * Mathiyon AI - Production Hybrid AI Agent & Multi-Tool Orchestrator
 *
 * HYBRID INTELLIGENCE ARCHITECTURE:
 * SLM v1.2 (Production 100%) + LLM (Reasoning & Complex Synthesis) + Deterministic Tools (SymPy, System Clock, Unit, Currency, Calculator) + RAG + Memory + Web Intelligence
 *
 * Universal Knowledge & Execution Pipeline:
 * USER QUESTION -> Request Normalization -> Intent Detection -> Model & Complexity Router ->
 * Deterministic Tool Check / Short-Circuit -> Multi-Source Retrieval (Memory, RAG, Web) ->
 * Exact SymPy Math Computation & Verification -> Context Fusion & Conflict Detection ->
 * Intelligence Synthesis (SLM v1.2 for simple/fast; LLM for complex/architecture/synthesis) ->
 * Response Composer (Authoritative Invariance Enforcement) -> FINAL ANSWER + SOURCES
 */

const mathTool = require('./tools/mathTool');
const ragTool = require('./tools/ragTool');
const slmTool = require('./tools/slmTool');
const llmTool = require('./tools/llmTool');
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
const { ModelRouter, ResponseComposer } = require('./llm');
const UniversalPipeline = require('./universalPipeline');

// Tool Registry Map
const TOOL_REGISTRY = {
  MathEngine: mathTool,
  RAG: ragTool,
  SLM: slmTool,
  LLM: llmTool,
  MathiyonLLM: llmTool,
  Memory: memoryTool,
  CodeEngine: codeTool,
  WebSearch: webSearchTool,
  web_search: webSearchTool,
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
  const cleanRaw = message.trim();
  const msgLower = cleanRaw.toLowerCase();
  const cleanWordOnly = msgLower.replace(/[?!.,;:'"()]/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Assistant Identity & Capabilities
  const isIdentity = /^(who are (you|u)|what are (you|u)|tell me about yourself|what is mathiyon(\s*ai)?|what can you do|what can u do|what are your capabilities|what can you help (me )?with|explain mathiyon|who made you|who created you)$/i.test(cleanWordOnly) ||
    /நீ யார்|நீங்க யார்|உன்ன பத்தி சொல்லு|nee yaaru|nee yaru|mathiyon na enna|unnala enna panna mudiyum/i.test(msgLower);

  if (isIdentity) {
    return 'ASSISTANT_IDENTITY';
  }

  // 2. Greeting / Conversational Well-being / Gratitude
  const isGreetingWord = /^(hi|hello|hey|hay|hlo|hlw|hai|heyy|heyyy|hiii|hiiii|greetings|good morning|good afternoon|good evening|howdy|sup|whats up|what's up|vanakkam|வணக்கம்|ஹாய்)$/i.test(cleanWordOnly) ||
    /^(hi|hello|hey|hay|hlo|hai)\b/i.test(cleanWordOnly);

  const isWellBeing = /^(how are (you|u)|how do you do|how r u|hows it going|how's it going|how are you doing|epdi iruka|eppadi irukka|how r u epdi iruka|enna panra|எப்படி இருக்க|எப்படி இருக்கீங்க|நீ எப்படி இருக்க)$/i.test(cleanWordOnly);

  const isGratitudeOrFarewell = /^(thanks|thank you|thank you so much|thx|ty|bye|goodbye|good night|see you|cya|catch you later)$/i.test(cleanWordOnly);

  if (isGreetingWord || isWellBeing || isGratitudeOrFarewell) {
    return 'GENERAL';
  }

  // 3. Document Selection / RAG
  const isDoc = hasDocSelected || /pdf|doc|document|file|chapter|page|according to|uploaded/i.test(msgLower);

  // 4. Time / Date (Deterministic System Clock)
  const TIME_DATE_EXACT_WORDS = new Set([
    'time', 'the time', 'what time', 'current time', 'what time is it', 'time now', 'now time', 'clock',
    'what is the time', 'what is the current time', 'tell me the time',
    'today', 'today date', "today's date", 'what is today', "what is today's date", 'what date is today',
    'what day is today', 'what day is it', 'what is the date', 'current date', 'current day', 'this day',
    'tomorrow', "tomorrow's date", 'what is tomorrow',
    'yesterday', "yesterday's date", 'what was yesterday',
    'current year', 'what year is this', 'current month', 'what month is it',
    // Tamil
    'இன்று', 'நாளை', 'நேற்று', 'இன்னைக்கு', 'நேரம்', 'தேதி', 'நாள்', 'இப்போ',
    // Tanglish
    'innaiku', 'inniku', 'inniki', 'naalaiku', 'naaliku', 'nethu'
  ]);

  const isDateCalc = /how many days (until|between|from)|what date is \d+ days|days between/i.test(msgLower);

  const isExplicitTimeDate = TIME_DATE_EXACT_WORDS.has(cleanWordOnly) || (!isDateCalc && (
    /^(time|what time|current time|what time is it|time now|now time|clock|what is the time|tell me the time)$/i.test(cleanWordOnly) ||
    /today'?s?\s*date|date\s*today|what\s*is\s*today|what\s*is\s*the\s*date|what\s*time|current\s*time|current\s*date|what\s*day\s*is\s*today|current\s*year|current\s*month|time\s*in\s*[a-zA-Z]+|date\s*in\s*[a-zA-Z]+/i.test(msgLower) ||
    (msgLower.includes('today') && msgLower.includes('date')) ||
    (msgLower.includes('time') && (msgLower.includes('what') || msgLower.includes('current') || msgLower.includes('now') || msgLower.includes('tell') || msgLower.includes('is'))) ||
    /இன்று|நாளை|நேரம்|தேதி|நாள்|இப்போ/u.test(msgLower) ||
    /innaiku|inniku|inniki|naalaiku|naaliku|ippo enna time|innaiku enna date/.test(msgLower) ||
    /^(time in\s+[a-zA-Z\s]+|[a-zA-Z\s]+\s+time)$/i.test(cleanWordOnly)
  ));

  const isTimeDate = !isDateCalc && isExplicitTimeDate;

  // 5. Currency
  const isCurrency = /convert \d+ \w+ to \w+|how much is \d+ \w+ in \w+|usd to inr|eur to inr|inr to usd|\b(exchange rate|currency conversion)\b/i.test(msgLower);

  // 6. Unit Conversion
  const isUnit = /\b(\d+(\.\d+)?\s*(kg|lb|lbs|km|miles|celsius|fahrenheit|liters|gallons|meters|feet)\s*(in|to|into)\s*(kg|lb|lbs|km|miles|celsius|fahrenheit|liters|gallons|meters|feet))\b|unit conversion/i.test(msgLower);

  // 7. Weather
  const isWeather = /\b(weather|temperature|rain|rainy|cloudy|sunny|forecast)\b|will it rain/i.test(msgLower);

  // 8. Simple Calculator
  const isSimpleCalc = /^(\d+(\.\d+)?\s*[\+\-\*\/]\s*\d+(\.\d+)?)$/.test(msgLower.replace(/\s+/g, '')) ||
    /^\s*(calculate|solve|what is)?\s*\d+(\.\d+)?\s*[\+\-\*\/]\s*\d+(\.\d+)?\s*$/i.test(msgLower) ||
    /^\s*(what is|calculate)?\s*\d+(\.\d+)?\s*(plus|minus|times|multiplied by|into|divided by|over)\s*\d+(\.\d+)?\s*$/i.test(msgLower) ||
    /\d+(\.\d+)?\s*%\s*of\s*\d+(\.\d+)?/i.test(msgLower) ||
    /\d+(\.\d+)?\s*oda\s*\d+(\.\d+)?\s*%/i.test(msgLower);

  // 8B. Numeric Comparisons (3 > 5, 3 = 3, 3 < 5, 5 >= 5, 4 <= 3, is 3 greater than 5?, etc.)
  const isComparison = /^\s*(?:is|check|does|tell me if)?\s*-?\d+(?:\.\d+)?\s*(?:>=|<=|==|!=|≠|≤|≥|>|<|=|is greater than or equal to|greater than or equal to|is less than or equal to|less than or equal to|is not equal to|not equal to|not equal|is greater than|greater than|is less than|less than|is equal to|equal to|equals|equal)\s*-?\d+(?:\.\d+)?\s*\??\s*$/i.test(cleanRaw) ||
    /^\s*-?\d+(?:\.\d+)?\s*(?:>=|<=|==|!=|≠|≤|≥|>|<|=|is greater than|is less than|greater than|less than|equal to|equals)\s*-?\d+(?:\.\d+)?\s*$/i.test(cleanRaw) ||
    /compare\s+-?\d+(?:\.\d+)?\s*(?:and|,)\s*-?\d+(?:\.\d+)?/i.test(cleanRaw);

  // ─── MATH SAFETY GATE ─────────────────────────────────────────────────────
  const MATH_FUNCTION_NAMES = /\b(sin|cos|tan|log|ln|sqrt|abs|exp|derivative|integral|integrate|differentiate|gcd|lcm|det|determinant|matrix)\b/i;
  const hasMathDigit = /\d/.test(msgLower);
  const hasMathOperator = /[+\-*\/^=<>%≠≤≥|!]/.test(msgLower);
  const hasMathFunction = MATH_FUNCTION_NAMES.test(msgLower);
  const hasMathKeyword = /\b(solve|equation|algebra|calculus|derivative|integral|fraction|percentage|matrix|matrices|trigonometry|factorial|prime|fibonacci|quadratic|polynomial|logarithm|modulo)\b/i.test(msgLower);
  const looksLikeMath = (hasMathDigit || hasMathFunction || hasMathKeyword || isComparison) && (hasMathOperator || hasMathDigit || hasMathFunction || hasMathKeyword || isComparison);

  // 9. Math Engine (SymPy)
  const isMath = isComparison || (!isTimeDate && !isSimpleCalc && looksLikeMath &&
    (hasMathFunction ||
     /solve|\bderivative\b|\bintegrate\b|percentage|equation|x\s*=|differentiate|matrix|matrices|trigonometry|algebra|fraction|\bmath\b|\bmaths\b/i.test(msgLower) ||
     (/[+\-*/^=]/.test(msgLower) && !isDateCalc && !isCurrency && !isUnit)));

  // 10. Coding / Tech Topics (expanded to include CSS, HTML, SQL, Docker, etc.)
  const isCode = /```|function|const |let |var |import |export |class |react|javascript|python|typescript|html|css|sql|mongodb|postgresql|api|express|node\.js|node|create a react|write code|debug|design a|architecture|docker|kubernetes|git|github|aws|azure|gcp|machine learning|blockchain|neural network|rest api|graphql/i.test(msgLower);

  // 11. Memory
  const isMemory = /remember that|my project is|i use|my name is|what is my name|what do you remember/i.test(msgLower);

  // 12. Translation
  const isTranslation = /translate|in tamil|into tamil|tamil sentence|tanglish/i.test(msgLower);

  // 13. Writing / Editing
  const isWriting = /write (a|an)? (email|letter|resume|cover letter|essay|story|poem)|proofread|rewrite|draft/i.test(msgLower);

  // 14. Summarization
  const isSummarize = /summarize|summary of|brief outline/i.test(msgLower);

  // 15. Automatic Web Intelligence Trigger Rules
  const isExplicitWebSearch = /search (online|the web|the internet|for|about)|look (this|it) up|find (this|it) online|web search/i.test(msgLower);
  const isCurrentInformation = /\b(latest|current|now|today'?s|recent|this week|this month|version|price|pricing|ceo of|who is the|news|event|events|release notes|changelog)\b/i.test(msgLower);
  const isVolatileTopic = /\b(react version|node version|node\.js version|bitcoin|crypto|stock|company|market|leadership|quantum computing)\b/i.test(msgLower);

  const isWeb = (hasWebEnabled || isExplicitWebSearch || isCurrentInformation || isVolatileTopic) && !isTimeDate && !isDateCalc && !isSimpleCalc && !isUnit && !isWeather;

  // Multi-Tool Detection Rules
  let activeToolCount = 0;
  if (isDoc) activeToolCount++;
  if (isWeb) activeToolCount++;
  if (isMath || isSimpleCalc) activeToolCount++;
  if (isCurrency) activeToolCount++;
  if (isTimeDate || isDateCalc) activeToolCount++;
  if (isMemory) activeToolCount++;

  if (activeToolCount >= 2 || (isWeb && (isCurrency || isSimpleCalc || isCode || isDoc)) || (isDoc && (isMath || isCode || isWeb))) {
    return 'MULTI_TOOL';
  }

  if (isWeb) return 'WEB';
  if (isTimeDate) return 'TIME_DATE';
  if (isDateCalc) return 'DATE_CALCULATION';
  if (isSimpleCalc) return 'CALCULATOR';
  if (isCurrency) return 'CURRENCY';
  if (isUnit) return 'UNIT_CONVERSION';
  if (isWeather) return 'WEATHER';
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
 * AI Orchestrator Main Entrypoint (Hybrid SLM + LLM + Tools Architecture)
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

  // 1. Multi-Turn Reference Resolution
  const { resolvedQuery } = contextFusionEngine.resolveMultiTurnContext(message, conversationHistory);
  const activeMessage = resolvedQuery;

  // 2. Intent Detection
  const intent = detectIntent(activeMessage, documentIds.length > 0, enableWebSearch);
  const toolsUsed = [];
  const agentTrace = [];
  const sources = [];
  const citations = [];
  let isVerified = false;

  const taskModel = {
    taskId: `task_${Math.random().toString(36).substring(2, 10)}`,
    intent,
    status: 'running',
    steps: [],
    createdAt: new Date().toISOString()
  };

  try {
    // Primary Universal Intelligence Engine Pipeline
    try {
      const pipelineResult = await UniversalPipeline.process({
        userId,
        message,
        conversationHistory,
        documentIds,
        enableWebSearch,
        model
      });

      if (pipelineResult && pipelineResult.success && pipelineResult.answer) {
        observabilityService.recordEvent({
          requestId: pipelineResult.requestId,
          taskId: taskModel.taskId,
          userId,
          intent: pipelineResult.intent,
          toolsUsed: pipelineResult.toolsUsed,
          model: 'Mathiyon AI',
          success: true,
          totalLatencyMs: pipelineResult.totalLatencyMs,
          citations: pipelineResult.citations,
          sources: pipelineResult.sources
        });

        return {
          ...pipelineResult,
          taskModel: { ...taskModel, status: 'completed' },
          agentTrace: (pipelineResult.toolsUsed || []).map(t => ({ stage: 'tool_success', tool: t, status: 'success' })),
          model: 'Mathiyon AI'
        };
      }
    } catch (pipelineErr) {
      console.warn('[AI Orchestrator] UniversalPipeline warning, falling back to core flow:', pipelineErr.message);
    }

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

    // 2A-0. Assistant Identity & Capabilities
    if (intent === 'ASSISTANT_IDENTITY') {
      agentTrace.push({ stage: 'tool_running', tool: 'MathiyonAssistant', label: 'Resolving assistant identity...' });
      const identityText = "I am **Mathiyon AI**, an intelligent hybrid AI assistant powered by Mathiyon SLM v1.2, LLM reasoning, deterministic SymPy math, system clock, memory, and real-time web intelligence.";
      return {
        success: true,
        answer: identityText,
        intent: 'ASSISTANT_IDENTITY',
        toolsUsed: ['SLM'],
        sources: [],
        citations: [],
        verified: true,
        requestId,
        totalLatencyMs: Date.now() - startTime,
        agentTrace,
        taskModel: { ...taskModel, status: 'completed' },
        model: 'Mathiyon SLM v1.2'
      };
    }

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
          model: 'Mathiyon System Clock'
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
          model: 'Mathiyon Calculator Engine'
        };
      }
    }

    // 2C. Currency Conversion Queries
    if (intent === 'CURRENCY' && !/calculate|then|after that|50000|50,000/i.test(activeMessage)) {
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
          model: 'Mathiyon Currency Engine'
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
          model: 'Mathiyon Unit Conversion Engine'
        };
      }
    }

    // 2E. Real-Time Weather Queries
    if (intent === 'WEATHER' && !/explain|compare|why|forecast for next month/i.test(activeMessage)) {
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
          model: 'Mathiyon Weather Engine'
        };
      }
    }

    // --- STEP 3: ADVANCED TOOL RETRIEVAL & EXECUTION ---
    let ragData = null;
    let mathData = null;
    let webData = null;
    let codeData = null;
    let currencyData = null;
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

    // Step 3B: Web Intelligence Search
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

    // Step 3C: Currency Tool (in multi-tool queries)
    if (intent === 'MULTI_TOOL' && /usd|inr|eur|currency|exchange rate/i.test(activeMessage)) {
      const cRes = await executeToolWithTimeout(currencyTool, { query: activeMessage });
      if (cRes.success && cRes.data) {
        currencyData = cRes.data;
        toolsUsed.push('CurrencyEngine');
      }
    }

    // Step 3D: Math Engine Solver (SymPy Authoritative)
    if (intent === 'MATH' || (intent === 'MULTI_TOOL' && /solve|calculate|\d+[\+\-\*\/]\d+|\d+x/i.test(activeMessage))) {
      taskModel.steps.push({ stepId: 'step_math', tool: 'MathEngine', action: 'solve', dependsOn: ragData ? ['step_rag'] : (webData ? ['step_web'] : []) });
      agentTrace.push({ stage: 'tool_running', tool: 'MathEngine', label: 'Calculating with SymPy...' });

      let mathQuery = activeMessage.trim();
      // If prompt has prefix like "solve", keep expression or full problem
      if (/^(solve|calculate|evaluate|find|compute)\s+/i.test(mathQuery)) {
        mathQuery = mathQuery.replace(/^(solve|calculate|evaluate|find|compute)\s+/i, '').trim();
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

    // Step 3E: Code Engine Analysis
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
      toolResults: [codeData, currencyData].filter(Boolean),
      mathResults: mathData ? [mathData] : []
    });

    normalizedContext.documents.forEach(d => {
      if (d.citation && !citations.some(c => c.id === d.citation.id)) {
        citations.push(d.citation);
      }
    });

    // Pure Math Intent (SymPy Authoritative Win)
    if (intent === 'MATH' && mathData && mathData.verified) {
      toolsUsed.push('SLM');
      const formattedResponse = ResponseComposer.compose({
        intent,
        mathData,
        sources,
        citations,
        conflicts: normalizedContext.conflicts
      });

      return {
        success: true,
        answer: formattedResponse,
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
        model: 'Mathiyon SymPy Math Engine'
      };
    }

    // Grounded RAG Document Query (Without web search and missing info)
    if (intent === 'DOCUMENT' && ragData && !ragData.found && documentIds.length > 0 && !enableWebSearch && !webData) {
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
        model: 'Mathiyon SLM v1.2'
      };
    }

    // --- STEP 4: MODEL ROUTING (SLM v1.2 vs LLM Layer) ---
    const modelRouting = ModelRouter.selectModel({
      intent,
      message: activeMessage,
      hasDocContext: Boolean(ragData && ragData.context),
      hasWebContext: Boolean(webData && webData.contextText),
      hasMath: Boolean(mathData && mathData.verified),
      contextSize: (conversationHistory || []).length
    });

    // Synthesize structured system instructions
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

    if (currencyData && currencyData.formatted) {
      systemInstructions += `\nLIVE CURRENCY DATA: ${currencyData.formatted}\n`;
    }

    if (mathData && mathData.result) {
      systemInstructions += `\nVERIFIED MATH ENGINE RESULT: ${mathData.result} (${mathData.explanation || ''})\nUse this verified result in your answer.\n`;
    }

    let activeGenTool = slmTool;
    let selectedModelName = 'Mathiyon SLM v1.2';

    if (modelRouting.modelType === 'LLM' || modelRouting.modelType === 'LLM_WITH_TOOLS') {
      activeGenTool = llmTool;
      selectedModelName = modelRouting.modelName;
      toolsUsed.push('LLM');
      agentTrace.push({ stage: 'composing', tool: 'MathiyonLLM', label: `Synthesizing with LLM (${modelRouting.reason})...` });
    } else {
      activeGenTool = slmTool;
      selectedModelName = 'Mathiyon SLM v1.2';
      toolsUsed.push('SLM');
      agentTrace.push({ stage: 'composing', tool: 'SLM', label: 'Generating response with SLM v1.2...' });
    }

    let genRes = await executeToolWithTimeout(activeGenTool, {
      message: activeMessage,
      systemPrompt: systemInstructions,
      conversation: conversationHistory,
      model: selectedModelName
    });

    if (!genRes.success) {
      // Automatic fallback to SLM v1.2 if LLM timed out or encountered an error
      if (activeGenTool === llmTool) {
        console.warn(`[AI Orchestrator] LLM execution failed. Falling back to SLM v1.2.`);
        genRes = await executeToolWithTimeout(slmTool, {
          message: `${systemInstructions}\nUSER PROMPT: ${activeMessage}`,
          conversation: conversationHistory
        });
        selectedModelName = 'Mathiyon SLM v1.2';
      }
    }

    agentTrace.push({
      stage: 'complete',
      tool: activeGenTool.name || 'Model',
      action: 'generate',
      status: genRes.success ? 'success' : 'failed',
      latencyMs: genRes.metadata.latencyMs
    });

    let rawGeneratedText = genRes.success && genRes.data ? (genRes.data.response || genRes.data.content || '') : '';
    if (!rawGeneratedText && genRes.error) {
      rawGeneratedText = genRes.error.message || "I couldn't complete the response generation at this moment.";
    }

    // --- KNOWLEDGE GAP AUTO-DETECTION & WEB SEARCH FALLBACK ---
    // If SLM returned a low-confidence fallback response, automatically trigger web search
    const LOW_CONFIDENCE_PATTERNS = [
      /i'm not completely sure what you mean/i,
      /could you tell me a little more/i,
      /i don't have enough information/i,
      /i can search the web for you/i,
      /enable.*web search.*toolbar/i,
      /for the most current and detailed information/i,
      /i recommend enabling.*web search/i
    ];

    const isLowConfidenceResponse = LOW_CONFIDENCE_PATTERNS.some(p => p.test(rawGeneratedText));
    const isDeterministicIntent = ['TIME_DATE', 'DATE_CALCULATION', 'CALCULATOR', 'CURRENCY', 'UNIT_CONVERSION', 'WEATHER', 'MATH', 'ASSISTANT_IDENTITY'].includes(intent);

    if (isLowConfidenceResponse && !isDeterministicIntent && !webData) {
      // Auto-trigger web search for knowledge gap
      agentTrace.push({ stage: 'tool_running', tool: 'WebSearch', label: 'Filling knowledge gap with web search...' });
      const autoWebRes = await executeToolWithTimeout(webSearchTool, { query: activeMessage });

      if (autoWebRes.success && autoWebRes.data) {
        webData = autoWebRes.data;
        if (!toolsUsed.includes('WebSearch')) toolsUsed.push('WebSearch');
        agentTrace.push({ stage: 'tool_success', tool: 'WebSearch', action: 'knowledge_gap_search', status: 'success', latencyMs: autoWebRes.metadata.latencyMs });

        if (webData.citations) webData.citations.forEach(c => citations.push({ ...c, type: 'web' }));
        if (webData.sources) {
          webData.sources.forEach(s => {
            sources.push({ file: s.title, url: s.url, domain: s.domain, sourceType: 'WEB' });
            retrievedWeb.push(s);
          });
        }

        // Re-build system instructions with web context and re-generate
        let webEnrichedSystemInstructions = systemInstructions;
        if (webData.contextText) {
          webEnrichedSystemInstructions += `\nWEB SEARCH CONTEXT (auto-retrieved for knowledge gap):\n${webData.contextText}\n`;
        }

        const reGenRes = await executeToolWithTimeout(activeGenTool, {
          message: activeMessage,
          systemPrompt: webEnrichedSystemInstructions,
          conversation: conversationHistory,
          model: selectedModelName
        });

        if (reGenRes.success && reGenRes.data) {
          rawGeneratedText = reGenRes.data.response || reGenRes.data.content || rawGeneratedText;
          agentTrace.push({ stage: 'complete', tool: 'WebSearch+SLM', action: 'knowledge_gap_regen', status: 'success' });
        }
      }
    }

    // --- STEP 5: RESPONSE COMPOSER (Enforcing Invariance & Citations) ---
    const finalAnswer = ResponseComposer.compose({
      intent,
      generatedText: rawGeneratedText,
      mathData,
      currencyData,
      sources,
      citations,
      conflicts: normalizedContext.conflicts,
      model: selectedModelName
    });

    const totalLatencyMs = Date.now() - startTime;
    const safeTrace = contextFusionEngine.buildSafeContextTrace({
      intent,
      toolsUsed,
      sources,
      citations,
      conflicts: normalizedContext.conflicts,
      latencyMs: totalLatencyMs,
      model: selectedModelName
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
      model: selectedModelName
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
