/**
 * Mathiyon AI - Standardized Intent Classifier
 *
 * Implements the normalized Intent Taxonomy:
 * - GENERAL (greeting, identity, conversation)
 * - MATH (arithmetic, algebra, calculus, geometry, statistics, conversion, comparison)
 * - CODING (HTML, CSS, JavaScript, React, Node, Express, Python, database, API, debugging)
 * - WEB (latest, current, today, recent, news, live information, explicit search request)
 * - DOCUMENT (PDF, DOCX, uploaded files)
 * - MEMORY (remember, recall, saved user information)
 * - TIME (time, date, today, tomorrow, timezone)
 * - FOLLOW_UP (requires previous context resolution)
 * - MULTI_TOOL (planner workflow)
 * - UNKNOWN (knowledge gap candidate)
 *
 * SAFETY GUARD: Natural language queries with digits (e.g. "Express API returning 401")
 * NEVER accidentally route into Math Engine.
 */

const { isFollowUp } = require('./queryNormalizer');

/**
 * Validates whether a query is truly a mathematical task vs natural language containing numbers
 */
function isGenuineMathQuery(msg) {
  if (!msg || typeof msg !== 'string') return false;
  const msgLower = msg.toLowerCase().trim();

  // Explicit non-math keywords that disqualify even if numbers are present
  const NON_MATH_PATTERNS = [
    /\b(express|api|http|status|error|code|port|server|returning\s+\d+|status\s+\d+|statuscode\s+\d+)\b/i,
    /\b(html\s*5|css\s*3|react\s*\d+|python\s*\d+|es\s*\d+|node\s*\d+|v\d+(\.\d+)?|version\s*\d+)\b/i,
    /\b(windows\s*\d+|iphone\s*\d+|year\s*\d{4}|in\s*\d{4}|since\s*\d{4}|century)\b/i,
    /\b(401|403|404|500|502|503|504)\b/i, // HTTP status codes
    /\b(why|how to fix|troubleshoot|debug|documentation|tutorial|issue|bug)\b/i
  ];

  if (NON_MATH_PATTERNS.some(p => p.test(msgLower))) {
    return false;
  }

  // 1. Explicit Math Command / Keywords
  const MATH_COMMAND_PREFIX = /^\s*(solve|calculate|compute|evaluate|integrate|differentiate|find the derivative of|find the integral of|simplify|factor|expand)\s+/i;
  const hasMathPrefix = MATH_COMMAND_PREFIX.test(msg);

  // 2. Comparison Expressions (e.g. 3 > 5, 3 = 3, 5 >= 5)
  const isComparison = /^\s*(?:is|check|does)?\s*-?\d+(?:\.\d+)?\s*(?:>=|<=|==|!=|≠|≤|≥|>|<|=|is greater than|is less than|greater than|less than|equal to|equals)\s*-?\d+(?:\.\d+)?\s*\??\s*$/i.test(msg);
  if (isComparison) return true;

  // 3. Percentage Calculation (e.g. "25% of 400", "what is 15% of 80")
  const isPercentage = /\b\d+(?:\.\d+)?\s*%\s*(?:of|\*)\s*\d+(?:\.\d+)?\b/i.test(msgLower) ||
    /^\s*(what is\s+)?\d+(?:\.\d+)?\s*%\s*of\s*\d+(?:\.\d+)?\s*\??$/i.test(msgLower);
  if (isPercentage) return true;

  // 4. Algebraic Equations (e.g. "2x + 5 = 15", "solve 10x - 45 = 40", "x^2 - 4 = 0")
  const isAlgebraicEquation = /[-+]?\s*\d*\.?\d*\s*[a-zA-Z]\s*[-+*/^]\s*\d+\s*=\s*[-+]?\d+/i.test(msgLower) ||
    /[-+]?\s*\d*\.?\d*\s*[a-zA-Z]\s*=\s*[-+]?\d+/i.test(msgLower) ||
    /\b[a-zA-Z]\s*\^\s*\d+\s*[-+*/]/i.test(msgLower);
  if (isAlgebraicEquation) return true;

  // 5. Pure Arithmetic Expressions (e.g. "45 * 12", "1/3 + 1/6", "sqrt(144)")
  const isPureArithmetic = /^\s*(calculate|solve|what is)?\s*[-+]?\d+(?:\.\d+)?\s*[\+\-\*\/\^%]\s*[-+]?\d+(?:\.\d+)?\s*$/i.test(msgLower) ||
    /^\s*(calculate|solve|what is)?\s*\d+\/\d+\s*[\+\-\*\/]\s*\d+\/\d+\s*$/i.test(msgLower) ||
    /\b(sqrt|sin|cos|tan|log|ln|factorial)\s*\(\s*[-+]?\d+(?:\.\d+)?\s*\)/i.test(msgLower);
  if (isPureArithmetic) return true;

  if (hasMathPrefix && (/\d/.test(msg) || /[a-z]/i.test(msg)) && /[+\-*\/^=]/.test(msg)) {
    return true;
  }

  return false;
}

/**
 * Classifies query into normalized intent and sub-intent
 */
function classifyIntent(message, context = {}) {
  if (!message || typeof message !== 'string') {
    return { intent: 'UNKNOWN', subIntent: 'empty', confidence: 1.0 };
  }

  const raw = message.trim();
  const lower = raw.toLowerCase();
  const cleanWordOnly = lower.replace(/[?!.,;:'"()]/g, ' ').replace(/\s+/g, ' ').trim();
  const { hasDocSelected = false, documentIds = [], hasWebEnabled = false } = context;

  // 1. FOLLOW_UP
  if (isFollowUp(raw)) {
    return { intent: 'FOLLOW_UP', subIntent: 'context_resolution', confidence: 0.95 };
  }

  // 2. ASSISTANT IDENTITY / CAPABILITIES -> GENERAL
  const isIdentity = /^(who are (you|u)|what are (you|u)|tell me about yourself|what is mathiyon(\s*ai)?|what can you do|what can u do|what are your capabilities|what can you help (me )?with|explain mathiyon|who made you|who created you)$/i.test(cleanWordOnly) ||
    /நீ யார்|நீங்க யார்|உன்ன பத்தி சொல்லு|mathiyon na enna|unnala enna panna mudiyum/i.test(lower);
  if (isIdentity) {
    return { intent: 'GENERAL', subIntent: 'assistant_identity', confidence: 0.99 };
  }

  // 3. GREETING / POLITE -> GENERAL
  const isGreeting = /^(hi|hello|hey|hay|hlo|hlw|hai|greetings|good morning|good afternoon|good evening|howdy|sup|whats up|what's up|vanakkam|வணக்கம்|ஹாய்)$/i.test(cleanWordOnly) ||
    /^(how are (you|u)|how do you do|how r u|hows it going|how's it going|how are you doing|epdi iruka|eppadi irukka)$/i.test(cleanWordOnly) ||
    /^(thanks|thank you|thank you so much|thx|ty|bye|goodbye|good night|see you|cya)$/i.test(cleanWordOnly);
  if (isGreeting) {
    return { intent: 'GENERAL', subIntent: 'greeting', confidence: 0.99 };
  }

  // 4. TIME / DATE (Deterministic System Clock)
  const isTimeDate = /^(time|the time|what time|current time|what time is it|time now|now time|clock|what is the time|tell me the time)$/i.test(cleanWordOnly) ||
    /^(today|today date|today's date|what is today|what is today's date|what date is today|what day is today|what day is it|what is the date|current date|current day)$/i.test(cleanWordOnly) ||
    /^(tomorrow|tomorrow's date|what is tomorrow|yesterday|yesterday's date|what was yesterday)$/i.test(cleanWordOnly) ||
    /^(current year|what year is this|current month|what month is it)$/i.test(cleanWordOnly) ||
    /^(time in\s+[a-z\s]+|[a-z\s]+\s+time)$/i.test(cleanWordOnly) ||
    (/\b(what time is it|what is today's date|what is the date today|tell me the time)\b/i.test(lower));

  if (isTimeDate) {
    let subIntent = 'time';
    if (lower.includes('date') || lower.includes('day') || lower.includes('year') || lower.includes('month')) {
      subIntent = 'date';
    } else if (lower.includes('in ') || lower.includes('timezone')) {
      subIntent = 'timezone';
    }
    return { intent: 'TIME', subIntent, confidence: 0.99 };
  }

  // 5. DOCUMENT / RAG
  const isDocQuery = hasDocSelected || (documentIds && documentIds.length > 0) ||
    /\b(in my (uploaded )?(pdf|doc|docx|document|file)|uploaded file|from the document|in the document|according to the pdf)\b/i.test(lower);
  if (isDocQuery) {
    let subIntent = 'uploaded_files';
    if (lower.includes('pdf')) subIntent = 'pdf';
    else if (lower.includes('docx') || lower.includes('doc')) subIntent = 'docx';
    return { intent: 'DOCUMENT', subIntent, confidence: 0.95 };
  }

  // 6. MEMORY
  const isMemoryQuery = /\b(remember (that|my)|store fact|save this preference|recall|what do you remember|what is my (name|preference|favorite)|my name is|my favorite)\b/i.test(lower);
  if (isMemoryQuery) {
    let subIntent = 'recall';
    if (/remember|store|save/i.test(lower)) subIntent = 'remember';
    return { intent: 'MEMORY', subIntent, confidence: 0.95 };
  }

  // 7. MATH (Strict Gate: Arithmetic, Algebra, Calculus, Statistics, Comparisons)
  if (isGenuineMathQuery(raw)) {
    let subIntent = 'arithmetic';
    if (/%|percentage/i.test(lower)) subIntent = 'percentage';
    else if (/solve|[-+*/=]\s*\d*[a-zA-Z]|[a-zA-Z]\s*[-+*/=]/i.test(lower)) subIntent = 'algebra';
    else if (/derivative|integral|differentiate|integrate|calculus/i.test(lower)) subIntent = 'calculus';
    else if (/>|<|==|=|!=|greater than|less than|equal/i.test(lower)) subIntent = 'comparison';
    return { intent: 'MATH', subIntent, confidence: 0.98 };
  }

  // 8. EXPLICIT WEB SEARCH / CURRENT INFORMATION
  const isExplicitWeb = /\b(search (the web|online|the internet|for|google)|web search|look up online|find online)\b/i.test(lower);
  const isCurrentInfo = /\b(latest|current|recent|today'?s news|breaking news|live information|news today|ai news|release notes|changelog)\b/i.test(lower);
  const isVolatileTechVersion = /\b(latest react version|react 19 version|latest node version|current version of|bitcoin price|market price)\b/i.test(lower);

  if (hasWebEnabled || isExplicitWeb || isCurrentInfo || isVolatileTechVersion) {
    let subIntent = 'live_information';
    if (isExplicitWeb) subIntent = 'explicit_search';
    else if (lower.includes('news')) subIntent = 'news';
    else if (lower.includes('latest') || lower.includes('version')) subIntent = 'latest';
    else if (lower.includes('today') || lower.includes('recent')) subIntent = 'recent';
    return { intent: 'WEB', subIntent, confidence: 0.95 };
  }

  // 9. CODING / TECH PIPELINE
  const isCoding = /\b(html|css|javascript|react|node|express|python|mongodb|sql|postgres|database|api|jwt|json web token|rest api|endpoint|debug|debugging|401|403|404|500|syntax|function|component|props|state|middleware|bcrypt|cors)\b/i.test(lower) ||
    /```|const |let |var |import |export |class |def |require\(|async\s+function/i.test(raw);

  if (isCoding) {
    let subIntent = 'general_coding';
    if (/\b(401|403|404|500|error|fail|not working|crash|debug|troubleshoot)\b/i.test(lower)) subIntent = 'debugging';
    else if (/\bhtml\b/i.test(lower)) subIntent = 'html';
    else if (/\bcss\b/i.test(lower)) subIntent = 'css';
    else if (/\b(javascript|js)\b/i.test(lower)) subIntent = 'javascript';
    else if (/\breact\b/i.test(lower)) subIntent = 'react';
    else if (/\b(express|express\.js)\b/i.test(lower)) subIntent = 'express';
    else if (/\b(node|node\.js)\b/i.test(lower)) subIntent = 'node';
    else if (/\bpython\b/i.test(lower)) subIntent = 'python';
    else if (/\b(mongodb|sql|postgres|database)\b/i.test(lower)) subIntent = 'database';
    else if (/\b(jwt|token|auth|authentication)\b/i.test(lower)) subIntent = 'security_jwt';
    else if (/\b(api|rest api|endpoint)\b/i.test(lower)) subIntent = 'api';

    return { intent: 'CODING', subIntent, confidence: 0.95 };
  }

  // 10. MULTI-TOOL DETECTION
  let toolTriggers = 0;
  if (isDocQuery) toolTriggers++;
  if (isExplicitWeb || isCurrentInfo) toolTriggers++;
  if (isGenuineMathQuery(raw)) toolTriggers++;
  if (isMemoryQuery) toolTriggers++;
  if (toolTriggers >= 2) {
    return { intent: 'MULTI_TOOL', subIntent: 'planned_workflow', confidence: 0.9 };
  }

  // 11. GENERAL vs UNKNOWN
  // If the query is an intelligible natural language question, classify as GENERAL
  const isGeneralQuestion = /^(what|how|why|who|where|when|can you|explain|tell me|describe|is it)\b/i.test(cleanWordOnly) ||
    cleanWordOnly.split(' ').length >= 3;

  if (isGeneralQuestion) {
    return { intent: 'GENERAL', subIntent: 'knowledge_request', confidence: 0.85 };
  }

  return { intent: 'UNKNOWN', subIntent: 'ambiguous_candidate', confidence: 0.6 };
}

module.exports = {
  classifyIntent,
  isGenuineMathQuery
};
