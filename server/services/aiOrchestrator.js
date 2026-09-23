/**
 * Mathiyon AI - AI Tool Orchestrator (Phase 5)
 * Central orchestration system deciding intent, executing tool pipelines, and constructing unified responses.
 */

const mathTool = require('./tools/mathTool');
const ragTool = require('./tools/ragTool');
const slmTool = require('./tools/slmTool');
const memoryTool = require('./tools/memoryTool');
const codeTool = require('./tools/codeTool');
const webSearchTool = require('./tools/webSearchTool');
const visionTool = require('./tools/visionTool');
const voiceTool = require('./tools/voiceTool');

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

/**
 * Classifies user message intent
 */
const detectIntent = (message, hasDocSelected = false, hasWebEnabled = false) => {
  const msgLower = message.toLowerCase();

  // Greeting check first
  if (/^(hi|hello|hey|greetings|good morning|good evening|howdy)/i.test(msgLower.trim())) {
    return 'CONVERSATION';
  }

  const isMath = /calculate|solve|\+|\*|\/|\^|percentage|sum|total|area|integrate|derivative|equation|\bmath\b|\bmaths\b|x\s*=/i.test(msgLower);
  const isDoc = hasDocSelected || /pdf|doc|document|file|chapter|page|according to/i.test(msgLower);
  const isCode = /```|function|const |let |var |import |export |class |react|javascript|python|typescript/i.test(msgLower);
  const isWeb = hasWebEnabled || /latest|current|news|web search|online|url|price of|weather/i.test(msgLower);
  const isMemory = /remember that|my project is|i use|my name is/i.test(msgLower);

  if (isDoc && isMath) return 'DOCUMENT_MATH';
  if (isDoc && isCode) return 'DOCUMENT_CODE';
  if (isDoc) return 'DOCUMENT';
  if (isMath) return 'MATH';
  if (isCode) return 'CODE';
  if (isWeb) return 'WEB_SEARCH';
  if (isMemory) return 'MEMORY';

  return 'GENERAL';
};


/**
 * AI Orchestrator Main Entrypoint
 */
const processRequest = async ({ userId, message, conversationHistory = [], documentIds = [], model = 'Mathiyon SLM v1.2', enableWebSearch = false }) => {
  const startTime = Date.now();
  const requestId = `req_${Math.random().toString(36).substring(2, 10)}`;

  const intent = detectIntent(message, documentIds.length > 0, enableWebSearch);
  const toolsUsed = [];
  const toolsTrace = [];
  const sources = [];
  let isVerified = false;
  let finalAnswer = '';

  try {
    // --- STEP 1: MEMORY RETRIEVAL / STORAGE (Phase 6) ---
    let memoryContextStr = '';
    const memoryService = require('./memoryService');
    
    // Check if prompt is an explicit memory directive
    if (/remember that|remember my|store fact/i.test(message)) {
      const memSaveResult = await memoryTool.execute({ userId, action: 'remember', content: message });
      if (memSaveResult.success) {
        toolsUsed.push('Memory');
        toolsTrace.push({ name: 'Memory', action: 'remember', latencyMs: 5 });
      }
    }

    // Retrieve past user memories for context
    const userMemories = await memoryService.getRelevantMemories(userId, message);
    if (userMemories && userMemories.length > 0) {
      memoryContextStr = userMemories.map(m => `- ${m.content}`).join('\n');
      if (!toolsUsed.includes('Memory')) toolsUsed.push('Memory');
    }

    // --- STEP 2: INTENT-BASED TOOL EXECUTION ---
    let ragResult = null;
    let mathResult = null;
    let webResult = null;
    let codeResult = null;

    // 2A. RAG Tool Execution
    if (intent.includes('DOCUMENT') || documentIds.length > 0) {
      const ragStart = Date.now();
      ragResult = await ragTool.execute({ userId, query: message, documentIds, topK: 5 });
      const ragLatency = Date.now() - ragStart;
      
      toolsUsed.push('RAG');
      toolsTrace.push({ name: 'RAG', latencyMs: ragLatency });

      // PART 8 Security Check
      if (ragResult.forbidden) {
        return {
          success: false,
          statusCode: 403,
          message: 'Access denied to requested document(s)',
          requestId
        };
      }

      if (ragResult.success && ragResult.sources) {
        ragResult.sources.forEach(s => sources.push(s));
      }
    }

    // 2B. Math Engine Execution
    if (intent.includes('MATH') || intent === 'MATH') {
      const mathStart = Date.now();
      
      // If RAG active, extract math target expression from message or context
      let mathQuery = message;
      const mathExprMatch = message.match(/(\d+[\s*\/+\-^.]+\d+[\s*\/+\-^.\d]*|[a-zA-Z0-9\s*\/+\-^.]+=+[a-zA-Z0-9\s*\/+\-^.]+)/);
      if (mathExprMatch && mathExprMatch[1] && mathExprMatch[1].trim().length >= 3) {
        mathQuery = mathExprMatch[1].trim();
      } else if (ragResult && ragResult.context) {
        mathQuery = `${message} given document: ${ragResult.context.substring(0, 300)}`;
      }

      mathResult = await mathTool.execute({ question: mathQuery });
      const mathLatency = Date.now() - mathStart;

      if (mathResult.success && mathResult.verified) {
        toolsUsed.push('MathEngine');
        toolsTrace.push({ name: 'MathEngine', latencyMs: mathLatency });
        isVerified = true;
      }
    }

    // 2C. Web Search Execution (Phase 7)
    if (intent === 'WEB_SEARCH' || enableWebSearch) {
      const webStart = Date.now();
      webResult = await webSearchTool.execute({ query: message });
      const webLatency = Date.now() - webStart;

      if (webResult.success) {
        toolsUsed.push('WebSearch');
        toolsTrace.push({ name: 'WebSearch', latencyMs: webLatency });
        webResult.sources.forEach(s => sources.push({ file: s.title, url: s.url }));
      }
    }

    // 2D. Code Engine Execution
    if (intent.includes('CODE')) {
      codeResult = await codeTool.execute({ code: message, query: message });
      toolsUsed.push('CodeEngine');
      toolsTrace.push({ name: 'CodeEngine', latencyMs: 2 });
    }

    // --- STEP 3: SYNTHESIZE FINAL RESPONSE ---

    // Pure Math Query solved deterministically
    if (intent === 'MATH' && mathResult && mathResult.success && mathResult.verified) {
      toolsUsed.push('SLM');
      toolsTrace.push({ name: 'SLM', latencyMs: 10 });
      return {
        success: true,
        answer: `**Verified Solution:** ${mathResult.result}\n\n${mathResult.explanation}`,
        intent,
        toolsUsed,
        sources: [],
        verified: true,
        requestId,
        totalLatencyMs: Date.now() - startTime,
        toolsTrace
      };
    }

    // Missing Document Information Protection
    if (intent.includes('DOCUMENT') && ragResult && !ragResult.found && documentIds.length > 0) {
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
        toolsTrace
      };
    }

    // Build synthesized prompt context for SLM
    let systemInstructions = `SYSTEM: You are Mathiyon AI, a powerful, accurate AI intelligence assistant.`;

    if (memoryContextStr) {
      systemInstructions += `\nUSER MEMORIES & PREFERENCES:\n${memoryContextStr}\n`;
    }

    if (ragResult && ragResult.context) {
      systemInstructions += `\nDOCUMENT CONTEXT (Strict Source Truth):\n${ragResult.context}\nRules: Answer based on the document context. If answer is missing, state 'The document does not contain this information.'\n`;
    }

    if (webResult && webResult.contextText) {
      systemInstructions += `\nWEB SEARCH CONTEXT:\n${webResult.contextText}\n`;
    }

    if (mathResult && mathResult.success) {
      systemInstructions += `\nVERIFIED MATH ENGINE RESULT: ${mathResult.result} (${mathResult.explanation})\nUse this verified result in your answer.\n`;
    }

    const slmPrompt = `${systemInstructions}\nUSER PROMPT: ${message}`;

    const slmStart = Date.now();
    const slmRes = await slmTool.execute({ message: slmPrompt, conversation: conversationHistory });
    const slmLatency = Date.now() - slmStart;

    toolsUsed.push('SLM');
    toolsTrace.push({ name: 'SLM', latencyMs: slmLatency });

    if (slmRes.success) {
      finalAnswer = slmRes.response;

      // Append Math Engine verified footer if combined
      if (mathResult && mathResult.success && !finalAnswer.includes(mathResult.result)) {
        finalAnswer += `\n\n🧮 **Verified Math Computation:** ${mathResult.result}`;
      }

      // Append Citation metadata if present
      if (sources.length > 0 && !finalAnswer.includes('Source Citation') && !finalAnswer.includes('Sources:')) {
        const citStr = sources.map(s => s.page ? `- ${s.file} — Page ${s.page}` : `- ${s.file} (${s.url || 'Web'})`).join('\n');
        finalAnswer += `\n\n📍 **Source Citations:**\n${citStr}`;
      }
    } else {
      finalAnswer = `Mathiyon AI response: Service standard fallback response for user query '${message}'.`;
    }

    const totalLatencyMs = Date.now() - startTime;

    return {
      success: true,
      answer: finalAnswer,
      intent,
      toolsUsed,
      sources,
      verified: isVerified || (mathResult ? mathResult.verified : false),
      requestId,
      totalLatencyMs,
      toolsTrace
    };

  } catch (err) {
    console.error('AI Orchestrator Error:', err);
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
  TOOL_REGISTRY
};
