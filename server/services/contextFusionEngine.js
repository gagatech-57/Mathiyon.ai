/**
 * Mathiyon AI - Context Fusion & Knowledge Intelligence Engine (Phase 12.4)
 *
 * Safe multi-source integration layer:
 * - Normalized Context Representation
 * - Source Authority Hierarchy (Math > Document > Code > Web > Memory > Conversation > Model)
 * - Context Relevance Filtering
 * - Multi-Turn Pronoun & Reference Resolution
 * - Conflict Detection Engine (Doc vs Web, Doc A vs Doc B, Math vs Model)
 * - Missing Information Safety Check
 * - Knowledge Classification System
 * - Standardized Citation Fusion
 * - Safe Context Debug Trace (No CoT, No Credentials)
 */

// Source Authority Mapping
const SOURCE_AUTHORITY = {
  MATH: 5,
  DOCUMENT: 4,
  CODE: 4,
  WEB: 3,
  MEMORY: 2,
  CONVERSATION: 1,
  MODEL: 0
};

/**
 * Normalizes multi-source context inputs into a unified object
 */
function createNormalizedContext({
  requestId,
  query,
  intent,
  conversation = [],
  memory = [],
  documents = [],
  web = [],
  toolResults = [],
  mathResults = [],
  metadata = {}
}) {
  const normConv = (conversation || []).map((msg, idx) => ({
    sourceType: 'CONVERSATION',
    sourceId: msg.id || `conv_${idx}`,
    content: typeof msg === 'string' ? msg : (msg.text || msg.content || ''),
    authority: SOURCE_AUTHORITY.CONVERSATION,
    relevance: 'relevant',
    role: msg.role || 'user',
    timestamp: msg.timestamp || new Date().toISOString()
  }));

  const normMem = (memory || []).map((mem, idx) => ({
    sourceType: 'MEMORY',
    sourceId: mem.id || mem._id?.toString() || `mem_${idx}`,
    content: typeof mem === 'string' ? mem : (mem.content || ''),
    authority: SOURCE_AUTHORITY.MEMORY,
    relevance: calculateRelevance(query, typeof mem === 'string' ? mem : mem.content),
    timestamp: mem.createdAt || new Date().toISOString()
  }));

  const normDocs = (documents || []).map((doc, idx) => ({
    sourceType: 'DOCUMENT',
    sourceId: doc.id || doc.docId || `doc_${idx}`,
    content: typeof doc === 'string' ? doc : (doc.text || doc.content || doc.snippet || ''),
    authority: SOURCE_AUTHORITY.DOCUMENT,
    relevance: calculateRelevance(query, typeof doc === 'string' ? doc : (doc.text || doc.content || doc.snippet || '')),
    citation: {
      id: `cit_doc_${idx + 1}`,
      type: 'document',
      title: doc.file || doc.title || doc.filename || 'Uploaded Document',
      url: doc.url || null,
      page: doc.page || null,
      chunk: doc.chunk || idx + 1,
      domain: null
    },
    timestamp: doc.timestamp || new Date().toISOString()
  }));

  const normWeb = (web || []).map((w, idx) => ({
    sourceType: 'WEB',
    sourceId: w.id || `web_${idx}`,
    content: typeof w === 'string' ? w : (w.snippet || w.text || w.content || ''),
    authority: SOURCE_AUTHORITY.WEB,
    relevance: calculateRelevance(query, typeof w === 'string' ? w : (w.snippet || w.text || w.content || '')),
    citation: {
      id: `cit_web_${idx + 1}`,
      type: 'web',
      title: w.title || w.file || 'Web Source',
      url: w.url || '#',
      page: null,
      chunk: null,
      domain: w.domain || extractDomain(w.url)
    },
    timestamp: w.timestamp || new Date().toISOString()
  }));

  const normMath = (mathResults || []).map((m, idx) => ({
    sourceType: 'MATH',
    sourceId: m.id || `math_${idx}`,
    content: m.result || m.content || '',
    authority: SOURCE_AUTHORITY.MATH,
    relevance: 'relevant',
    verified: Boolean(m.verified),
    explanation: m.explanation || ''
  }));

  const normTools = (toolResults || []).map((t, idx) => ({
    sourceType: 'CODE',
    sourceId: t.id || `tool_${idx}`,
    content: typeof t === 'string' ? t : JSON.stringify(t.data || t),
    authority: SOURCE_AUTHORITY.CODE,
    relevance: 'relevant'
  }));

  const conflicts = detectSourceConflicts({ documents: normDocs, web: normWeb, mathResults: normMath, query });
  const classification = classifyKnowledge({ query, mathResults: normMath, documents: normDocs, web: normWeb, memory: normMem });

  return {
    requestId,
    query,
    intent,
    conversation: normConv,
    memory: normMem.filter(m => m.relevance !== 'irrelevant'),
    documents: normDocs.filter(d => d.relevance !== 'irrelevant'),
    web: normWeb.filter(w => w.relevance !== 'irrelevant'),
    toolResults: normTools,
    mathResults: normMath,
    conflicts,
    knowledgeClassification: classification,
    metadata: {
      totalSourcesCount: normConv.length + normMem.length + normDocs.length + normWeb.length + normMath.length,
      createdAt: new Date().toISOString(),
      ...metadata
    }
  };
}

/**
 * Calculates contextual relevance score between user query and source text
 */
function calculateRelevance(query, sourceText) {
  if (!query || !sourceText) return 'relevant';
  const qTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
  if (qTerms.length === 0) return 'relevant';

  const srcLower = sourceText.toLowerCase();
  let matches = 0;
  for (const term of qTerms) {
    if (srcLower.includes(term)) matches++;
  }

  if (matches === 0) return 'irrelevant';

  const ratio = matches / qTerms.length;
  if (ratio >= 0.4) return 'relevant';
  return 'partially_relevant';
}

/**
 * Detects factual or numeric conflicts between disparate context sources
 */
function detectSourceConflicts({ documents = [], web = [], mathResults = [], query = '' }) {
  const conflicts = [];

  // 1. Document vs Web Price / Numeric Conflicts
  if (documents.length > 0 && web.length > 0) {
    const docNumbers = extractKeyValues(documents.map(d => d.content).join(' '));
    const webNumbers = extractKeyValues(web.map(w => w.content).join(' '));

    for (const [key, docVal] of Object.entries(docNumbers)) {
      if (webNumbers[key] !== undefined && webNumbers[key] !== docVal) {
        conflicts.push({
          conflictType: 'DOCUMENT_VS_WEB',
          entity: key,
          description: `The uploaded document reports ${key} as ${docVal}, while the retrieved web source reports ${webNumbers[key]}.`,
          sourceA: 'DOCUMENT',
          sourceB: 'WEB',
          valA: docVal,
          valB: webNumbers[key]
        });
      }
    }
  }

  // 2. Multi-Document Conflict Detection
  if (documents.length > 1) {
    const docA = documents[0];
    const docB = documents[1];
    const numA = extractKeyValues(docA.content);
    const numB = extractKeyValues(docB.content);

    for (const [key, valA] of Object.entries(numA)) {
      if (numB[key] !== undefined && numB[key] !== valA) {
        conflicts.push({
          conflictType: 'DOCUMENT_VS_DOCUMENT',
          entity: key,
          description: `Document "${docA.citation.title}" reports ${key} as ${valA}, whereas Document "${docB.citation.title}" reports ${numB[key]}.`,
          sourceA: docA.citation.title,
          sourceB: docB.citation.title,
          valA,
          valB: numB[key]
        });
      }
    }
  }

  return conflicts;
}

/**
 * Extracts named numeric quantities (e.g., price, rate, revenue, count)
 */
function extractKeyValues(text) {
  const map = {};
  if (!text || typeof text !== 'string') return map;

  // Patterns like "price: ₹100", "price = 100", "revenue of $500", "rate = 12%"
  const priceMatches = text.matchAll(/(price|rate|revenue|total|cost|val|value|amount)\s*(?:of|=|:|\bis\b)\s*([₹$€\d.,]+)/gi);
  for (const match of priceMatches) {
    const key = match[1].toLowerCase();
    const val = match[2];
    map[key] = val;
  }

  return map;
}

/**
 * Classifies knowledge type of the context
 */
function classifyKnowledge({ query, mathResults = [], documents = [], web = [], memory = [] }) {
  if (mathResults.length > 0) return 'CALCULATION';
  if (documents.length > 0 && web.length > 0) return 'UNCERTAIN';
  if (documents.length > 0) return 'DOCUMENT_FACT';
  if (web.length > 0) return 'WEB_FACT';
  if (memory.length > 0) return 'USER_CONTEXT';
  return 'FACT';
}

/**
 * Helper to extract primary topic/noun from recent conversation turns
 */
function extractPrimaryTopicFromHistory(conversationHistory = []) {
  if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    return null;
  }

  // Scan user turns backwards
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const turn = conversationHistory[i];
    const role = turn.role || turn.sender || 'user';
    if (role === 'user' || role === 'human') {
      const text = typeof turn === 'string' ? turn : (turn.content || turn.text || turn.message || '');
      if (!text || typeof text !== 'string') continue;

      const textTrim = text.trim();
      const textLower = textTrim.toLowerCase();

      // Skip if this turn was itself a short follow-up phrase
      if (isFollowUpQuery(textLower)) continue;

      // Clean leading question words & punctuation
      let cleanText = textTrim
        .replace(/^(what is|what are|what do you know about|tell me about|explain|how does|how to|who is|define|meaning of|overview of|details of|information about|more about)\s+/gi, '')
        .replace(/[?!.,;:'"()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanText.length >= 2) {
        return cleanText;
      }
    }
  }

  // Fallback to assistant turns: check for bolded headings/terms
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const turn = conversationHistory[i];
    const role = turn.role || turn.sender || 'assistant';
    if (role === 'assistant' || role === 'bot') {
      const text = typeof turn === 'string' ? turn : (turn.content || turn.text || turn.message || '');
      if (!text || typeof text !== 'string') continue;

      const boldMatch = text.match(/\*\*([^*]{2,40})\*\*/);
      if (boldMatch && boldMatch[1]) {
        const term = boldMatch[1].replace(/Definition|Overview|Overview of|Introduction|Features|Key|Summary/gi, '').trim();
        if (term.length >= 2) return term;
      }
    }
  }

  return null;
}

/**
 * Checks if query is a short follow-up query requiring topic resolution
 */
function isFollowUpQuery(queryText) {
  if (!queryText) return false;
  const clean = queryText.trim().toLowerCase().replace(/[?!.,;:'"()]/g, ' ').replace(/\s+/g, ' ').trim();

  // If query contains 'about <something>' or 'on <something>' with a specific topic noun, it is NOT a generic follow-up
  if (/^(more about|tell me about|explain about|details about|info about)\s+[a-z0-9_#-]{2,}/i.test(clean)) {
    return false;
  }

  const FOLLOW_UP_EXACT_PATTERNS = [
    'more', 'more details', 'tell me more', 'explain more', 'more about it', 'more info', 'details', 'explain',
    'can you explain', 'elaborate', 'deep dive', 'what about examples', 'give examples', 'give me example',
    'give example', 'code example', 'examples', 'sample code', 'code samples', 'syntax', 'code syntax',
    'advantages', 'disadvantages', 'features', 'benefits', 'pros and cons', 'pros', 'cons', 'key features',
    'how to use', 'how do i use it', 'usage', 'how it works', 'what else', 'continue', 'keep going', 'go on',
    'anything else', 'tell me more about it', 'give me more', 'show more', 'give me details', 'explain further'
  ];

  if (FOLLOW_UP_EXACT_PATTERNS.includes(clean)) return true;

  const words = clean.split(' ');
  // Check if all words are meta/follow-up words without a specific topic noun
  const metaWords = new Set([
    'more', 'details', 'tell', 'me', 'explain', 'give', 'about', 'it', 'info', 'can', 'you',
    'example', 'examples', 'sample', 'syntax', 'code', 'advantages', 'disadvantages', 'features',
    'benefits', 'pros', 'cons', 'how', 'to', 'use', 'usage', 'works', 'what', 'else', 'continue',
    'keep', 'going', 'go', 'on', 'further', 'please', 'show'
  ]);

  if (words.length <= 4 && words.every(w => metaWords.has(w))) {
    return true;
  }

  return false;
}

/**
 * Resolves multi-turn pronoun references and short follow-up queries (e.g. "more", "give examples", "syntax")
 */
function resolveMultiTurnContext(query, conversationHistory = []) {
  if (!conversationHistory || conversationHistory.length === 0) {
    return { resolvedQuery: query, referencedSource: null };
  }

  const qTrim = (query || '').trim();
  const qLower = qTrim.toLowerCase();

  // 1. Multi-Turn Temporal Follow-Up (e.g., previous turn asked for time/date, now asks "in London?" or "London?")
  const lastUserMsg = [...conversationHistory].reverse().find(m => (m.role || m.sender) === 'user');
  const lastUserText = typeof lastUserMsg === 'string' ? lastUserMsg : (lastUserMsg?.content || lastUserMsg?.text || lastUserMsg?.message || '');
  const lastIsTimeQuery = /time|clock|date|today|hour/i.test(lastUserText);

  const knownCities = ['london', 'tokyo', 'new york', 'ny', 'paris', 'sydney', 'singapore', 'berlin', 'delhi', 'mumbai', 'california', 'india', 'uk', 'us', 'japan'];
  const mentionsCity = knownCities.some(c => qLower.includes(c));
  const isLocationFollowUp = /^(in\s+[a-zA-Z\s]+|what\s+about\s+(?:in\s+)?[a-zA-Z\s]+|[a-zA-Z\s]+)\??$/i.test(qTrim);

  if (lastIsTimeQuery && (mentionsCity || isLocationFollowUp) && !qLower.includes('time') && !qLower.includes('code') && !qLower.includes('math') && !qLower.includes('react')) {
    const locMatch = qTrim.replace(/^(what about (?:in )?|in |\?)/gi, '').replace(/\?/g, '').trim();
    if (locMatch.length >= 2) {
      return {
        resolvedQuery: `time in ${locMatch}`,
        referencedSource: 'temporal_follow_up'
      };
    }
  }

  // 2. Short Conversational Follow-Up Query Resolution ("more", "give examples", "syntax", "advantages", etc.)
  if (isFollowUpQuery(qLower)) {
    const lastTopic = extractPrimaryTopicFromHistory(conversationHistory);
    if (lastTopic) {
      let expandedQuery = `Tell me more details about ${lastTopic}.`;

      if (/example|code/i.test(qLower)) {
        expandedQuery = `Give detailed code examples and snippets for ${lastTopic}.`;
      } else if (/syntax/i.test(qLower)) {
        expandedQuery = `What is the syntax and code structure for ${lastTopic}?`;
      } else if (/advantage|disadvantage|feature|benefit|pro|con/i.test(qLower)) {
        expandedQuery = `What are the key features, advantages, and disadvantages of ${lastTopic}?`;
      } else if (/how to use|usage|how it works/i.test(qLower)) {
        expandedQuery = `How to use ${lastTopic}? Provide step-by-step instructions and practical usage.`;
      } else if (/what else|continue|keep going|go on|anything else/i.test(qLower)) {
        expandedQuery = `Continue explaining more concepts and information about ${lastTopic}.`;
      }

      return {
        resolvedQuery: expandedQuery,
        referencedSource: lastTopic
      };
    }
  }

  // 3. Pronoun reference resolution ("that", "this", "previous result", "the above")
  const pronouns = ['that', 'this', 'previous result', 'same document', 'second point', 'the above', 'continue', 'explain more'];
  const hasPronoun = pronouns.some(p => qLower.includes(p));

  if (!hasPronoun) {
    return { resolvedQuery: query, referencedSource: null };
  }

  // Find last assistant response
  const lastAssistantMsg = [...conversationHistory].reverse().find(m => (m.role || m.sender) === 'assistant' || (m.role || m.sender) === 'bot');
  if (lastAssistantMsg) {
    const contextSnippet = typeof lastAssistantMsg === 'string' ? lastAssistantMsg : (lastAssistantMsg.text || lastAssistantMsg.content || lastAssistantMsg.message || '');
    return {
      resolvedQuery: `${query} (Context reference: "${contextSnippet.substring(0, 150)}")`,
      referencedSource: contextSnippet
    };
  }

  return { resolvedQuery: query, referencedSource: null };
}

/**
 * Helper to extract domain from URL string
 */
function extractDomain(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return 'web';
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace('www.', '');
  } catch (err) {
    return 'web';
  }
}

/**
 * Builds safe context debug trace (Excludes CoT, private raw data, secrets, JWT)
 */
function buildSafeContextTrace({ intent, toolsUsed = [], sources = [], citations = [], conflicts = [], latencyMs = 0, model }) {
  return {
    intent,
    sourcesUsed: Array.from(new Set(sources.map(s => s.type || s.sourceType || 'source'))),
    toolsUsed: Array.from(new Set(toolsUsed)),
    sourceCount: sources.length,
    citationCount: citations.length,
    conflictsDetected: conflicts.length,
    hasConflict: conflicts.length > 0,
    latencyMs,
    model,
    safeTimestamp: new Date().toISOString()
  };
}

module.exports = {
  SOURCE_AUTHORITY,
  createNormalizedContext,
  calculateRelevance,
  detectSourceConflicts,
  extractKeyValues,
  classifyKnowledge,
  resolveMultiTurnContext,
  extractDomain,
  buildSafeContextTrace
};
