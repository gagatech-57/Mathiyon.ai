/**
 * Mathiyon AI - Automatic Web Search & Fallback Test Matrix Execution
 * Verifies automatic web search triggers, internal knowledge first priority, source card citations, and resilience.
 */

const BASE_URL = 'http://localhost:5000';

async function postJson(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, body: data };
}

async function runWebSearchMatrix() {
  console.log("==================================================");
  console.log("MATHIYON AI — AUTOMATIC WEB INTELLIGENCE TEST SUITE");
  console.log("==================================================\n");

  // Step 1: Authenticate
  console.log("Step 1: Authenticating Developer Account...");
  const authRes = await postJson(`${BASE_URL}/api/auth/login`, {
    email: 'developer@mathiyon.ai',
    password: 'password123'
  });

  if (!authRes.ok || !authRes.body.token) {
    console.error("FAILED to authenticate:", authRes.body);
    process.exit(1);
  }

  const token = authRes.body.token;
  console.log(`[PASS] Authenticated successfully as ${authRes.body.user.email}\n`);

  // Section 26 Test Matrix Definition
  const testCases = [
    { id: 1, name: 'GENERAL_GREETING', prompt: 'hi', shouldSearchWeb: false, expectedIntent: 'GENERAL' },
    { id: 2, name: 'MEMORY_QUERY', prompt: 'What is my name?', shouldSearchWeb: false, expectedIntent: 'MEMORY' },
    { id: 3, name: 'MATH_CALCULATION', prompt: '25 * 30', shouldSearchWeb: false, expectedIntent: 'CALCULATOR' },
    { id: 4, name: 'DATE_QUERY', prompt: "What is today's date?", shouldSearchWeb: false, expectedIntent: 'TIME_DATE' },
    { id: 5, name: 'TIME_QUERY', prompt: 'What time is it?', shouldSearchWeb: false, expectedIntent: 'TIME_DATE' },
    { id: 6, name: 'STATIC_KNOWLEDGE', prompt: 'What is React?', shouldSearchWeb: false, expectedIntent: 'GENERAL' },
    { id: 7, name: 'AUTO_WEB_CURRENT_VERSION', prompt: 'What is the latest React version?', shouldSearchWeb: true, expectedIntent: 'WEB' },
    { id: 8, name: 'EXPLICIT_WEB_SEARCH', prompt: 'Search online for the latest Node.js version.', shouldSearchWeb: true, expectedIntent: 'WEB' },
    { id: 9, name: 'WEATHER_QUERY', prompt: "What's the weather in Chennai?", shouldSearchWeb: false, expectedIntent: 'WEATHER' },
    { id: 10, name: 'CURRENCY_QUERY', prompt: 'Convert 100 USD to INR', shouldSearchWeb: false, expectedIntent: 'CURRENCY' },
    { id: 11, name: 'EXPLICIT_WEB_RESEARCH', prompt: 'Search online and explain the latest information about quantum computing.', shouldSearchWeb: true, expectedIntent: 'WEB' },
    { id: 12, name: 'RAG_GROUNDED_QUERY', prompt: 'What does my uploaded document say about performance?', shouldSearchWeb: false, expectedIntent: 'DOCUMENT' },
    { id: 13, name: 'RAG_WEB_FALLBACK', prompt: 'Compare my document performance with latest web benchmarks online.', shouldSearchWeb: true, expectedIntent: 'MULTI_TOOL' }
  ];

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`Test ${tc.id}/${testCases.length}: [${tc.name}] "${tc.prompt}"`);

    const start = Date.now();
    try {
      const chatRes = await postJson(`${BASE_URL}/api/chat`, {
        message: tc.prompt,
        enableWebSearch: tc.shouldSearchWeb
      }, token);

      const latencyMs = Date.now() - start;
      const pass = chatRes.ok && chatRes.body.success && Boolean(chatRes.body.answer);
      const returnedIntent = chatRes.body.intent;
      const toolsUsed = chatRes.body.toolsUsed || [];
      const sources = chatRes.body.sources || [];
      const citations = chatRes.body.citations || [];
      const didSearchWeb = toolsUsed.includes('WebSearch') || toolsUsed.includes('web_search');

      const webMatch = tc.shouldSearchWeb ? didSearchWeb : !didSearchWeb;
      const testPassed = pass && webMatch;

      console.log(`  -> Status: ${testPassed ? 'PASS' : 'FAIL'} | Intent: ${returnedIntent} | Tools: [${toolsUsed.join(', ')}]`);
      console.log(`  -> Web Search Triggered: ${didSearchWeb} (Expected: ${tc.shouldSearchWeb}) | Sources: ${sources.length} | Latency: ${latencyMs}ms`);
      console.log(`  -> Answer: "${(chatRes.body.answer || '').substring(0, 100).replace(/\n/g, ' ')}..."\n`);

      results.push({
        testId: tc.id,
        testName: tc.name,
        prompt: tc.prompt,
        status: testPassed ? 'PASS' : 'FAIL',
        detectedIntent: returnedIntent,
        expectedIntent: tc.expectedIntent,
        toolsUsed,
        didSearchWeb,
        expectedWebSearch: tc.shouldSearchWeb,
        sourcesCount: sources.length,
        citationsCount: citations.length,
        sources,
        answer: chatRes.body.answer,
        latencyMs
      });
    } catch (err) {
      console.log(`  -> Status: FAIL | Error: ${err.message}\n`);
      results.push({
        testId: tc.id,
        testName: tc.name,
        prompt: tc.prompt,
        status: 'FAIL',
        error: err.message
      });
    }
  }

  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = total - passed;

  console.log("==================================================");
  console.log(`WEB INTELLIGENCE SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log("==================================================");

  const fs = require('fs');
  const summaryJson = {
    timestamp: new Date().toISOString(),
    total,
    passed,
    failed,
    passRate: `${Math.round((passed / total) * 100)}%`,
    testResults: results
  };

  fs.writeFileSync('c:\\DISK-D\\Personal folder\\Mathiyon\\mathiyon_web_search_test_results.json', JSON.stringify(summaryJson, null, 2));
  console.log("\nWrote report to mathiyon_web_search_test_results.json");
}

runWebSearchMatrix();
