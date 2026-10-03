/**
 * Mathiyon AI - Universal Query Normalizer & Conversation Context Resolver
 *
 * Normalizes user queries without changing user meaning:
 * - Expands shorthand queries ("what css" -> "What is CSS?", "why api not working" -> troubleshooting)
 * - Identifies and resolves multi-turn follow-ups ("more", "tell me more", "explain that", "give example", "advantages")
 * - Disambiguates mathematics from natural language containing numbers (e.g., HTTP 401, HTML5, React 19)
 * - Tracks previous responses to prevent repetition in follow-up queries.
 */

// Shorthand expansions for natural conversational prompts
const SHORTHAND_EXPANSIONS = [
  { pattern: /^what\s+css\??$/i, normalized: 'What is CSS and how is it used in web development?' },
  { pattern: /^what\s+html\??$/i, normalized: 'What is HTML and how does it structure web pages?' },
  { pattern: /^what\s+js\??$/i, normalized: 'What is JavaScript and what are its core features?' },
  { pattern: /^what\s+react\??$/i, normalized: 'What is React and how does it work?' },
  { pattern: /^what\s+mongodb\??$/i, normalized: 'What is MongoDB and what are its key features?' },
  { pattern: /^what\s+jwt\??$/i, normalized: 'What is JSON Web Token (JWT) and how does authentication work?' },
  { pattern: /^what\s+node\??$/i, normalized: 'What is Node.js and what is it used for?' },
  { pattern: /^what\s+express\??$/i, normalized: 'What is Express.js and how does it handle routing and middleware?' },
  { pattern: /^what\s+python\??$/i, normalized: 'What is Python and what are its key features and uses?' },
  { pattern: /^explain\s+react\??$/i, normalized: 'Explain React, its component architecture, and virtual DOM.' },
  { pattern: /^why\s+(my\s+)?api\s+(not\s+working|is\s+failing|broken)\??$/i, normalized: 'Why is my API not working? Common causes and how to troubleshoot and fix it.' },
  { pattern: /^why\s+(is\s+my\s+)?express(\s+api)?\s+returning\s+401\??$/i, normalized: 'Why is my Express API returning a 401 Unauthorized status code, and how do I fix it?' },
  { pattern: /^latest\s+react\s+version\??$/i, normalized: 'What is the latest React version and what are its key features?' },
  { pattern: /^tell\s+me\s+more\??$/i, normalized: 'tell me more' },
  { pattern: /^explain\s+that\??$/i, normalized: 'explain that' },
  { pattern: /^what\s+changed\??$/i, normalized: 'what changed' },
  { pattern: /^what\s+about\s+advantages\??$/i, normalized: 'what about advantages' },
  { pattern: /^show\s+example\??$/i, normalized: 'give an example' },
  { pattern: /^give\s+(an?\s+)?example\??$/i, normalized: 'give an example' }
];

// Exact follow-up phrases that require topic resolution from previous turns
const FOLLOW_UP_PATTERNS = [
  'more', 'tell me more', 'explain more', 'explain that', 'why', 'how',
  'give example', 'give an example', 'show example', 'what about this',
  'continue', 'full details', 'tell me everything', 'advantages',
  'disadvantages', 'how does it work', 'what changed', 'benefits',
  'pros and cons', 'elaborate', 'go on', 'deep dive', 'next',
  'another example', 'code example', 'what else', 'anything else'
];

/**
 * Checks if a message is a follow-up query requiring topic resolution
 */
function isFollowUp(message) {
  if (!message || typeof message !== 'string') return false;
  const clean = message.trim().toLowerCase().replace(/[?!.,;:'"()]/g, ' ').replace(/\s+/g, ' ').trim();

  // If message contains explicit topic ("tell me more about Docker"), not generic follow-up
  if (/^(tell me more about|more about|explain about|details about)\s+[a-z0-9_#-]{2,}/i.test(clean)) {
    return false;
  }

  // Exact match
  if (FOLLOW_UP_PATTERNS.includes(clean)) return true;

  // Pattern checks
  if (/^(more|continue|elaborate|go on|explain that|tell me more|give an? example|show an? example|what about advantages|what about disadvantages|how does it work|what changed)\??$/i.test(clean)) {
    return true;
  }

  // Very short meta-phrases without topic nouns
  const words = clean.split(' ');
  const metaTokens = new Set([
    'more', 'tell', 'me', 'explain', 'that', 'this', 'why', 'how', 'give', 'show',
    'example', 'examples', 'what', 'about', 'continue', 'full', 'details',
    'everything', 'advantages', 'disadvantages', 'does', 'it', 'work', 'changed',
    'benefits', 'pros', 'cons', 'code', 'please', 'go', 'on', 'further'
  ]);

  if (words.length <= 4 && words.every(w => metaTokens.has(w))) {
    return true;
  }

  return false;
}

/**
 * Extracts primary topic and recent concepts from conversation history
 */
function extractHistoryContext(conversationHistory = []) {
  if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    return { topic: null, previousQuery: null, previousAnswer: null, coveredAspects: [] };
  }

  let lastUserQuery = null;
  let lastAssistantAnswer = null;
  let topic = null;
  const coveredAspects = [];

  // Find last user and assistant turns
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const turn = conversationHistory[i];
    const role = turn.role || turn.sender || (turn.message ? 'user' : 'assistant');
    const content = typeof turn === 'string' ? turn : (turn.content || turn.text || turn.message || turn.response || '');

    if ((role === 'user' || role === 'human') && !lastUserQuery) {
      if (!isFollowUp(content)) {
        lastUserQuery = content.trim();
      }
    } else if ((role === 'assistant' || role === 'bot' || role === 'model') && !lastAssistantAnswer) {
      lastAssistantAnswer = content.trim();
    }

    if (lastUserQuery && lastAssistantAnswer) break;
  }

  if (lastUserQuery) {
    // Extract topic from user query
    let clean = lastUserQuery
      .replace(/^(what is|what are|what do you know about|tell me about|explain|how does|how to|who is|define|overview of|details of|information about|more about)\s+/gi, '')
      .replace(/[?!.,;:'"()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (clean.length >= 2) {
      topic = clean;
    }
  }

  // If topic not found from user query, inspect last assistant answer
  if (!topic && lastAssistantAnswer) {
    const boldMatch = lastAssistantAnswer.match(/\*\*([A-Za-z0-9\s.#+-]{2,30})\*\*/);
    if (boldMatch && boldMatch[1]) {
      const term = boldMatch[1].replace(/Definition|Overview|Introduction|Features|Key|Summary/gi, '').trim();
      if (term.length >= 2) topic = term;
    }
  }

  // Detect which aspects were already covered in previous assistant answer
  if (lastAssistantAnswer) {
    const ansLower = lastAssistantAnswer.toLowerCase();
    if (ansLower.includes('definition') || ansLower.includes('what is') || ansLower.includes('stands for')) {
      coveredAspects.push('definition');
    }
    if (ansLower.includes('syntax') || ansLower.includes('example') || ansLower.includes('```')) {
      coveredAspects.push('basic_examples');
    }
    if (ansLower.includes('advantage') || ansLower.includes('benefit') || ansLower.includes('pros')) {
      coveredAspects.push('advantages');
    }
    if (ansLower.includes('disadvantage') || ansLower.includes('drawback') || ansLower.includes('cons')) {
      coveredAspects.push('disadvantages');
    }
    if (ansLower.includes('semantic') || ansLower.includes('form') || ansLower.includes('table')) {
      coveredAspects.push('semantic_forms');
    }
    if (ansLower.includes('dom') || ansLower.includes('accessibility') || ansLower.includes('seo')) {
      coveredAspects.push('dom_accessibility');
    }
  }

  return { topic, previousQuery: lastUserQuery, previousAnswer: lastAssistantAnswer, coveredAspects };
}

/**
 * Resolves follow-up query to a complete topic request while preventing repetition
 */
function resolveFollowUpQuery(message, conversationHistory = []) {
  const { topic, previousAnswer, coveredAspects } = extractHistoryContext(conversationHistory);

  if (!topic) {
    return {
      resolvedQuery: message,
      topic: null,
      aspectToCover: 'general',
      repetitionAvoidanceNote: ''
    };
  }

  const clean = message.trim().toLowerCase();

  // Determine which aspect to generate next to prevent repetition
  let aspectToCover = 'advanced_details';
  let resolvedQuery = `Provide more in-depth details about ${topic}.`;

  if (/example|code|show example|give example/i.test(clean)) {
    aspectToCover = 'code_examples';
    resolvedQuery = `Provide comprehensive, working code examples and usage patterns for ${topic}.`;
  } else if (/advantage|benefit|pro/i.test(clean)) {
    aspectToCover = 'advantages';
    resolvedQuery = `What are the primary advantages, benefits, and strengths of ${topic}?`;
  } else if (/disadvantage|drawback|con/i.test(clean)) {
    aspectToCover = 'disadvantages';
    resolvedQuery = `What are the key disadvantages, limitations, and trade-offs of ${topic}?`;
  } else if (/how does it work|how it works|how/i.test(clean)) {
    aspectToCover = 'internal_mechanics';
    resolvedQuery = `How does ${topic} work internally under the hood? Explain its core mechanism and architecture.`;
  } else if (/why/i.test(clean)) {
    aspectToCover = 'purpose_and_rationale';
    resolvedQuery = `Why is ${topic} used and what specific problems does it solve in modern applications?`;
  } else if (/what changed/i.test(clean)) {
    aspectToCover = 'changelog_evolution';
    resolvedQuery = `What has changed in ${topic}? Explain recent updates, version differences, and modern evolution.`;
  } else if (/full details|tell me everything/i.test(clean)) {
    aspectToCover = 'comprehensive_deep_dive';
    resolvedQuery = `Provide an exhaustive deep-dive guide to ${topic} covering architecture, best practices, and production patterns.`;
  } else {
    // "more" / "tell me more" / "continue"
    // Sequence progression to avoid repeating what was already said:
    if (!coveredAspects.includes('semantic_forms') && topic.toLowerCase().includes('html')) {
      aspectToCover = 'semantic_forms_and_attributes';
      resolvedQuery = `Explain semantic HTML elements, forms, input types, and attributes in HTML with practical examples.`;
    } else if (coveredAspects.includes('semantic_forms') && topic.toLowerCase().includes('html')) {
      aspectToCover = 'dom_accessibility_and_seo';
      resolvedQuery = `Explain DOM interaction, accessibility (a11y), SEO best practices, and modern standards in HTML.`;
    } else if (!coveredAspects.includes('advantages')) {
      aspectToCover = 'features_and_architecture';
      resolvedQuery = `Explain the advanced features, architecture, and practical ecosystem of ${topic}.`;
    } else {
      aspectToCover = 'best_practices_and_edge_cases';
      resolvedQuery = `Explain production best practices, common pitfalls, and edge cases when using ${topic}.`;
    }
  }

  return {
    resolvedQuery,
    topic,
    aspectToCover,
    previousAnswerSnippet: previousAnswer ? previousAnswer.substring(0, 200) : ''
  };
}

/**
 * Normalizes query string and context
 */
function normalizeQuery(userMessage, conversationHistory = []) {
  if (!userMessage || typeof userMessage !== 'string') {
    return {
      rawQuery: '',
      normalizedQuery: '',
      isFollowUp: false,
      topic: null,
      aspectToCover: null
    };
  }

  const rawQuery = userMessage.trim();
  let normalizedQuery = rawQuery;

  // 1. Check for shorthand matching
  for (const item of SHORTHAND_EXPANSIONS) {
    if (item.pattern.test(rawQuery)) {
      normalizedQuery = item.normalized;
      break;
    }
  }

  // 2. Check if this is a follow-up query requiring conversation context resolution
  const followUpDetected = isFollowUp(rawQuery);
  let followUpResolution = null;

  if (followUpDetected) {
    followUpResolution = resolveFollowUpQuery(rawQuery, conversationHistory);
    if (followUpResolution && followUpResolution.topic) {
      normalizedQuery = followUpResolution.resolvedQuery;
    }
  }

  return {
    rawQuery,
    normalizedQuery,
    isFollowUp: followUpDetected,
    topic: followUpResolution?.topic || null,
    aspectToCover: followUpResolution?.aspectToCover || null,
    previousAnswerSnippet: followUpResolution?.previousAnswerSnippet || ''
  };
}

module.exports = {
  normalizeQuery,
  isFollowUp,
  extractHistoryContext,
  resolveFollowUpQuery
};
