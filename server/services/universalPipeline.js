/**
 * Mathiyon AI — Universal Intelligence Engine Pipeline
 *
 * Implements the full Universal Pipeline:
 * USER INPUT
 *     ↓
 * QUERY NORMALIZATION
 *     ↓
 * CONVERSATION CONTEXT RESOLUTION
 *     ↓
 * FOLLOW-UP DETECTION
 *     ↓
 * INTENT DETECTION
 *     ↓
 * KNOWLEDGE / TOOL ROUTING
 *     ↓
 * TOOL EXECUTION
 *     ↓
 * RESULT VERIFICATION
 *     ↓
 * ANSWER SYNTHESIS
 *     ↓
 * FINAL CHAT RESPONSE
 */

const { normalizeQuery } = require('./queryNormalizer');
const { classifyIntent } = require('./intentClassifier');
const ToolVerifier = require('./toolVerifier');
const KnowledgeGapDetector = require('./knowledgeGapDetector');
const MultiToolPlanner = require('./multiToolPlanner');
const AnswerSynthesizer = require('./answerSynthesizer');

const mathTool = require('./tools/mathTool');
const timeDateTool = require('./tools/timeDateTool');
const webSearchTool = require('./tools/webSearchTool');
const ragTool = require('./tools/ragTool');
const memoryTool = require('./tools/memoryTool');
const slmTool = require('./tools/slmTool');
const llmTool = require('./tools/llmTool');
const codeTool = require('./tools/codeTool');
const calculatorTool = require('./tools/calculatorTool');
const currencyTool = require('./tools/currencyTool');
const unitConversionTool = require('./tools/unitConversionTool');
const weatherTool = require('./tools/weatherTool');
const memoryService = require('./memoryService');

const TOOL_TIMEOUT_MS = 10000;

async function runWithTimeout(fn, timeoutMs = TOOL_TIMEOUT_MS) {
  let timer;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      resolve({ success: false, error: `Execution timed out after ${timeoutMs}ms` });
    }, timeoutMs);
  });
  const execPromise = fn().then((res) => {
    clearTimeout(timer);
    return res;
  }).catch((err) => {
    clearTimeout(timer);
    return { success: false, error: err.message };
  });

  return Promise.race([execPromise, timeoutPromise]);
}

class UniversalPipeline {
  /**
   * Main entrypoint for processing user messages through the Universal Pipeline
   */
  static async process({
    userId,
    message,
    conversationHistory = [],
    documentIds = [],
    enableWebSearch = false,
    model = 'Mathiyon SLM v1.2'
  }) {
    const startTime = Date.now();
    const requestId = `req_${Math.random().toString(36).substring(2, 10)}`;

    // ==========================================
    // 1 & 2 & 3. QUERY NORMALIZATION & CONTEXT RESOLUTION & FOLLOW-UP DETECTION
    // ==========================================
    const norm = normalizeQuery(message, conversationHistory);
    const resolvedQuery = norm.normalizedQuery || message;
    const isFollowUp = norm.isFollowUp;

    // ==========================================
    // 4. INTENT DETECTION
    // ==========================================
    const intentResult = classifyIntent(resolvedQuery, {
      hasDocSelected: documentIds.length > 0,
      documentIds,
      hasWebEnabled: enableWebSearch
    });
    const intent = intentResult.intent;
    const subIntent = intentResult.subIntent;

    const toolsUsed = [];
    const sources = [];
    const citations = [];
    let toolResults = {};
    let ragContext = null;
    let webResults = null;
    let modelResponse = '';
    let isVerified = false;

    // ==========================================
    // 5. KNOWLEDGE / TOOL ROUTING & EXECUTION
    // ==========================================

    // Route 5A: DETERMINISTIC TIME / DATE
    if (intent === 'TIME' || intent === 'TIME_DATE') {
      const timeRes = await runWithTimeout(() => timeDateTool.execute({ query: resolvedQuery }));
      const verification = ToolVerifier.verifyToolResult({
        toolName: 'TimeDateEngine',
        result: timeRes,
        userQuestion: resolvedQuery,
        intent
      });

      if (verification.verified) {
        toolsUsed.push('TimeDateEngine');
        toolResults.time = verification.sanitizedData;
        const answer = AnswerSynthesizer.synthesize({
          userQuestion: message,
          resolvedQuery,
          intent,
          subIntent,
          toolResults
        });

        return {
          success: true,
          answer,
          intent,
          subIntent,
          toolsUsed,
          sources: [],
          citations: [],
          verified: true,
          requestId,
          totalLatencyMs: Date.now() - startTime,
          model: 'Mathiyon AI'
        };
      }
    }

    // Route 5B: DETERMINISTIC CALCULATOR
    if (intent === 'CALCULATOR') {
      const calcRes = await runWithTimeout(() => calculatorTool.execute({ expression: resolvedQuery }));
      const verification = ToolVerifier.verifyToolResult({
        toolName: 'CalculatorEngine',
        result: calcRes,
        userQuestion: resolvedQuery,
        intent
      });

      if (verification.verified) {
        toolsUsed.push('CalculatorEngine');
        toolResults.calculator = verification.sanitizedData;
        const answer = AnswerSynthesizer.synthesize({
          userQuestion: message,
          resolvedQuery,
          intent,
          subIntent,
          toolResults
        });

        return {
          success: true,
          answer,
          intent,
          subIntent,
          toolsUsed,
          sources: [],
          citations: [],
          verified: true,
          requestId,
          totalLatencyMs: Date.now() - startTime,
          model: 'Mathiyon AI'
        };
      }
    }

    // Route 5C: DETERMINISTIC MATH (SymPy Authoritative Engine)
    if (intent === 'MATH') {
      let mathCleanQuery = resolvedQuery;
      // Strip verbal commands like "solve", "what is", "calculate"
      mathCleanQuery = mathCleanQuery.replace(/^(solve|calculate|what is|find|evaluate)\s+/i, '').trim();

      const mathRes = await runWithTimeout(() => mathTool.execute({ question: mathCleanQuery }));
      const verification = ToolVerifier.verifyToolResult({
        toolName: 'MathEngine',
        result: mathRes,
        userQuestion: resolvedQuery,
        intent
      });

      if (verification.verified) {
        toolsUsed.push('MathEngine');
        toolResults.math = verification.sanitizedData;
        const answer = AnswerSynthesizer.synthesize({
          userQuestion: message,
          resolvedQuery,
          intent,
          subIntent,
          toolResults
        });

        return {
          success: true,
          answer,
          intent,
          subIntent,
          toolsUsed,
          sources: [],
          citations: [],
          verified: true,
          requestId,
          totalLatencyMs: Date.now() - startTime,
          model: 'Mathiyon AI'
        };
      }
    }

    // Route 5D: MEMORY (Isolated per userId)
    let memoryContextStr = '';
    if (intent === 'MEMORY') {
      const isRemember = /remember|store|save/i.test(resolvedQuery);
      if (isRemember && userId) {
        const memSave = await runWithTimeout(() => memoryTool.execute({ userId, action: 'remember', content: resolvedQuery }));
        if (memSave.success) {
          toolsUsed.push('Memory');
          const cleanAnswer = `I have remembered your preference: "${resolvedQuery.replace(/remember (that|my)?/i, '').trim()}"`;
          return {
            success: true,
            answer: cleanAnswer,
            intent,
            subIntent,
            toolsUsed,
            sources: [],
            citations: [],
            verified: true,
            requestId,
            totalLatencyMs: Date.now() - startTime,
            model: 'Mathiyon AI'
          };
        }
      }

      if (userId) {
        const userMems = await memoryService.getRelevantMemories(userId, resolvedQuery);
        if (userMems && userMems.length > 0) {
          toolsUsed.push('Memory');
          memoryContextStr = userMems.map(m => `- ${m.content}`).join('\n');
          const memAnswer = `Here is what I remember for your profile:\n\n${memoryContextStr}`;
          return {
            success: true,
            answer: memAnswer,
            intent,
            subIntent,
            toolsUsed,
            sources: [],
            citations: [],
            verified: true,
            requestId,
            totalLatencyMs: Date.now() - startTime,
            model: 'Mathiyon AI'
          };
        }
      }
    }

    // Route 5E: DOCUMENT / RAG RETRIEVAL
    if (intent === 'DOCUMENT' || (documentIds && documentIds.length > 0)) {
      const ragRes = await runWithTimeout(() => ragTool.execute({
        userId,
        query: resolvedQuery,
        documentIds,
        topK: 5
      }));

      const verification = ToolVerifier.verifyToolResult({
        toolName: 'RAG',
        result: ragRes,
        userQuestion: resolvedQuery,
        intent
      });

      if (verification.verified && ragRes.data && ragRes.data.found) {
        toolsUsed.push('RAG');
        ragContext = ragRes.data;
        if (ragContext.sources) {
          ragContext.sources.forEach(s => sources.push({ file: s.file, page: s.page, sourceType: 'DOCUMENT' }));
        }
        if (ragContext.citations) {
          ragContext.citations.forEach((c, i) => citations.push({ id: `doc_${i + 1}`, title: c, type: 'document' }));
        }
      } else {
        // Document has no information on this topic
        return {
          success: true,
          answer: "The information was not found in the provided document.",
          intent,
          subIntent,
          toolsUsed: ['RAG'],
          sources: [],
          citations: [],
          verified: false,
          requestId,
          totalLatencyMs: Date.now() - startTime,
          model: 'Mathiyon AI'
        };
      }
    }

    // Route 5F: WEB INTELLIGENCE SEARCH (Current facts, live info, explicit web)
    const needsWeb = intent === 'WEB' || enableWebSearch || subIntent === 'latest' || subIntent === 'news';
    if (needsWeb) {
      const webRes = await runWithTimeout(() => webSearchTool.execute({ query: resolvedQuery }));
      const verification = ToolVerifier.verifyToolResult({
        toolName: 'WebSearch',
        result: webRes,
        userQuestion: resolvedQuery,
        intent
      });

      if (verification.verified && webRes.data) {
        toolsUsed.push('WebSearch');
        webResults = webRes.data;
        if (webResults.sources) {
          webResults.sources.forEach(s => sources.push({ title: s.title, url: s.url, domain: s.domain, sourceType: 'WEB' }));
        }
        if (webResults.citations) {
          webResults.citations.forEach(c => citations.push({ ...c, type: 'web' }));
        }
      }
    }

    // Route 5G: CODING / GENERAL / SYNTHESIS via SLM v1.2 (or Local Hybrid Synthesizer)
    let systemPrompt = `SYSTEM: You are Mathiyon AI, an intelligent production AI assistant. Answer accurately based on verified tool contexts and general intelligence.\n`;
    if (ragContext?.context) {
      systemPrompt += `\nDOCUMENT CONTEXT:\n${ragContext.context}\n`;
    }
    if (webResults?.contextText) {
      systemPrompt += `\nWEB SEARCH CONTEXT:\n${webResults.contextText}\n`;
    }
    if (memoryContextStr) {
      systemPrompt += `\nUSER MEMORIES:\n${memoryContextStr}\n`;
    }

    // Execute SLM v1.2 (or LLM tool for complex coding / synthesis)
    let genTool = slmTool;
    if (webResults || ragContext || intent === 'MULTI_TOOL' || subIntent === 'debugging') {
      genTool = llmTool; // LocalMockLLMProvider provides rich contextual synthesis
    }

    const genRes = await runWithTimeout(() => genTool.execute({
      message: resolvedQuery,
      systemPrompt,
      conversation: conversationHistory,
      model: 'Mathiyon SLM v1.2'
    }));

    if (genRes.success) {
      modelResponse = genRes.response || genRes.data?.response || genRes.data?.content || genRes.content || '';
      if (genTool === slmTool && !toolsUsed.includes('SLM')) toolsUsed.push('SLM');
      if (intent === 'CODING' && !toolsUsed.includes('CodeEngine')) toolsUsed.push('CodeEngine');
      const verification = ToolVerifier.verifyToolResult({
        toolName: genTool === slmTool ? 'SLM' : 'CodeEngine',
        result: { success: true, response: modelResponse },
        userQuestion: resolvedQuery,
        intent
      });
      if (verification.verified) isVerified = true;
    }

    // ==========================================
    // 6. KNOWLEDGE GAP DETECTION & AUTOMATIC WEB FALLBACK
    // ==========================================
    const isGap = KnowledgeGapDetector.isKnowledgeGap({
      generatedText: modelResponse,
      intent,
      hasWebResults: Boolean(webResults),
      hasDocResults: Boolean(ragContext)
    });

    if (isGap && !webResults) {
      // Step 6: Automatically trigger Web Search before failing
      const autoWebRes = await runWithTimeout(() => webSearchTool.execute({ query: resolvedQuery }));
      const verification = ToolVerifier.verifyToolResult({
        toolName: 'WebSearch',
        result: autoWebRes,
        userQuestion: resolvedQuery,
        intent
      });

      if (verification.verified && autoWebRes.data) {
        toolsUsed.push('WebSearch');
        webResults = autoWebRes.data;
        if (webResults.sources) {
          webResults.sources.forEach(s => sources.push({ title: s.title, url: s.url, domain: s.domain, sourceType: 'WEB' }));
        }
        if (webResults.citations) {
          webResults.citations.forEach(c => citations.push({ ...c, type: 'web' }));
        }

        // Re-synthesize with web search context
        const reGenRes = await runWithTimeout(() => llmTool.execute({
          message: resolvedQuery,
          systemPrompt: `${systemPrompt}\nWEB SEARCH CONTEXT:\n${webResults.contextText}\n`,
          conversation: conversationHistory,
          model: 'Mathiyon SLM v1.2'
        }));

        if (reGenRes.success) {
          modelResponse = reGenRes.response || reGenRes.data?.response || reGenRes.data?.content || reGenRes.content || modelResponse;
        }
      }
    }

    // If still blank and truly unknown/ambiguous, provide concise clarification
    if (!modelResponse || modelResponse.trim().length === 0) {
      modelResponse = KnowledgeGapDetector.buildClarificationPrompt(resolvedQuery);
    }

    // ==========================================
    // 8 & 9. ANSWER SYNTHESIS & FINAL RESPONSE
    // ==========================================
    const finalAnswer = AnswerSynthesizer.synthesize({
      userQuestion: message,
      resolvedQuery,
      intent,
      subIntent,
      conversationContext: conversationHistory,
      ragContext,
      webResults,
      toolResults,
      modelResponse,
      isFollowUp,
      aspectToCover: norm.aspectToCover
    });

    return {
      success: true,
      answer: finalAnswer,
      intent,
      subIntent,
      toolsUsed,
      sources,
      citations,
      verified: isVerified || Boolean(webResults || ragContext || toolResults.math),
      requestId,
      totalLatencyMs: Date.now() - startTime,
      model: 'Mathiyon AI'
    };
  }
}

module.exports = UniversalPipeline;
