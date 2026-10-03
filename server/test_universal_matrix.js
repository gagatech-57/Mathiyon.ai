/**
 * Mathiyon AI — Universal Intelligence Engine 20-Item Test Matrix Runner
 */

const aiOrchestrator = require('./services/aiOrchestrator');
const UniversalPipeline = require('./services/universalPipeline');

async function runTestMatrix() {
  console.log('====================================================');
  console.log('MATHIYON AI — UNIVERSAL INTELLIGENCE ENGINE TEST MATRIX');
  console.log('====================================================\n');

  const userId = 'usr_test_verification_matrix';
  let conversationHistory = [];

  const testCases = [
    { id: 1, query: 'What is HTML?', expectedIntent: 'CODING', expectedSub: 'html' },
    { id: 2, query: 'What is CSS?', expectedIntent: 'CODING', expectedSub: 'css' },
    { id: 3, query: 'Explain React.', expectedIntent: 'CODING', expectedSub: 'react' },
    { id: 4, query: 'What is MongoDB?', expectedIntent: 'CODING', expectedSub: 'database' },
    { id: 5, query: 'What is JWT?', expectedIntent: 'CODING', expectedSub: 'security_jwt' },
    { id: 6, query: '25% of 400', expectedIntent: 'MATH', expectedSub: 'percentage' },
    { id: 7, query: 'Solve 2x + 5 = 15', expectedIntent: 'MATH', expectedSub: 'algebra' },
    { id: 8, query: 'What time is it?', expectedIntent: 'TIME', expectedSub: 'time' },
    { id: 9, query: "What is today's date?", expectedIntent: 'TIME', expectedSub: 'date' },
    { id: 10, query: 'What is in my uploaded PDF?', expectedIntent: 'DOCUMENT', expectedSub: 'pdf' },
    { id: 11, query: 'Remember my preference is dark mode and TypeScript.', expectedIntent: 'MEMORY', expectedSub: 'remember' },
    { id: 12, query: 'Latest React version.', expectedIntent: 'WEB', expectedSub: 'latest' },
    { id: 13, query: 'Search the web for current AI news.', expectedIntent: 'WEB', expectedSub: 'explicit_search' },
    { id: 14, query: 'Why is my Express API returning 401?', expectedIntent: 'CODING', expectedSub: 'debugging' },
    // Follow-up sequence testing context resolution
    { id: 15, query: 'Tell me more.', expectedIntent: 'FOLLOW_UP', isFollowUp: true },
    { id: 16, query: 'Give an example.', expectedIntent: 'FOLLOW_UP', isFollowUp: true },
    { id: 17, query: 'Explain that.', expectedIntent: 'FOLLOW_UP', isFollowUp: true },
    { id: 18, query: 'What about advantages?', expectedIntent: 'FOLLOW_UP', isFollowUp: true },
    { id: 19, query: 'What changed?', expectedIntent: 'FOLLOW_UP', isFollowUp: true },
    // Unknown topic knowledge gap analysis
    { id: 20, query: 'Quasar tachyonic dark-fluid harmonic resonance flux', expectedIntent: 'UNKNOWN', isUnknown: true }
  ];

  const results = [];
  let passedCount = 0;

  for (const tc of testCases) {
    const startTime = Date.now();
    try {
      const res = await aiOrchestrator.processRequest({
        userId,
        message: tc.query,
        conversationHistory,
        documentIds: tc.id === 10 ? ['doc_sample_123'] : [],
        model: 'Mathiyon SLM v1.2'
      });

      const latencyMs = Date.now() - startTime;
      const answerSnippet = (res.answer || '').substring(0, 120).replace(/\n/g, ' ');

      // Check if test passed
      let passed = res.success === true && res.answer && res.answer.trim().length > 0;

      // Update conversation history for multi-turn testing
      conversationHistory.push({ role: 'user', content: tc.query });
      conversationHistory.push({ role: 'assistant', content: res.answer });
      if (conversationHistory.length > 10) conversationHistory = conversationHistory.slice(-10);

      if (passed) passedCount++;

      results.push({
        id: tc.id,
        query: tc.query,
        intent: res.intent,
        subIntent: res.subIntent,
        toolsUsed: res.toolsUsed,
        verified: res.verified,
        sourcesCount: (res.sources || []).length,
        latencyMs,
        passed,
        answerSnippet
      });

      console.log(`[TEST ${tc.id.toString().padStart(2, '0')}] "${tc.query}"`);
      console.log(`  -> Intent: ${res.intent} | Tools: [${(res.toolsUsed || []).join(', ')}] | Verified: ${res.verified} | Latency: ${latencyMs}ms`);
      console.log(`  -> Answer: "${answerSnippet}..."\n`);

    } catch (err) {
      console.error(`[TEST ${tc.id}] FAILED with exception:`, err.message);
      results.push({
        id: tc.id,
        query: tc.query,
        error: err.message,
        passed: false
      });
    }
  }

  console.log('====================================================');
  console.log(`TEST MATRIX SUMMARY: ${passedCount} / ${testCases.length} PASSED`);
  console.log('====================================================');

  return { passedCount, total: testCases.length, results };
}

runTestMatrix().then((summary) => {
  if (summary.passedCount === summary.total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}).catch((err) => {
  console.error('Fatal Test Matrix Error:', err);
  process.exit(1);
});
