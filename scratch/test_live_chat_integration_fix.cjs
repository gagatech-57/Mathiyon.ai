/**
 * Mathiyon AI - Critical Live Chat & Integration Fix Verification Suite
 * Verifies all 10 acceptance criteria test cases end-to-end.
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

async function runLiveFixVerification() {
  console.log("==================================================");
  console.log("MATHIYON AI — CRITICAL LIVE CHAT INTEGRATION FIX TEST");
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

  // Acceptance Criteria Tests
  const testCases = [
    {
      id: 1,
      name: 'TIME_DATE_UNPUNCTUATED',
      prompt: 'what is today date',
      expectedIntent: 'TIME_DATE',
      forbiddenText: ['SYSTEM:', 'PyTorch Forward Pass Confidence', 'I have processed your request'],
      checkAnswer: (ans) => ans.includes('September 28, 2026') || ans.includes('2026')
    },
    {
      id: 2,
      name: 'TIME_QUERY',
      prompt: 'what time is it',
      expectedIntent: 'TIME_DATE',
      forbiddenText: ['SYSTEM:', 'PyTorch Forward Pass Confidence'],
      checkAnswer: (ans) => ans.includes('PM') || ans.includes('AM') || ans.includes('time')
    },
    {
      id: 3,
      name: 'DAY_QUERY',
      prompt: 'what day is today',
      expectedIntent: 'TIME_DATE',
      forbiddenText: ['SYSTEM:', 'PyTorch Forward Pass Confidence'],
      checkAnswer: (ans) => ans.includes('Monday')
    },
    {
      id: 4,
      name: 'EXPLICIT_WEB_QUANTUM',
      prompt: 'Search online about quantum computing',
      expectedIntent: 'WEB',
      forbiddenText: ['SYSTEM:', 'PyTorch Forward Pass Confidence'],
      mustHaveTool: 'WebSearch',
      checkAnswer: (ans) => ans.toLowerCase().includes('quantum')
    },
    {
      id: 5,
      name: 'AUTO_WEB_REACT_VERSION',
      prompt: 'latest React version',
      expectedIntent: 'WEB',
      forbiddenText: ['SYSTEM:', 'PyTorch Forward Pass Confidence'],
      mustHaveTool: 'WebSearch',
      checkAnswer: (ans) => ans.includes('React 19') || ans.toLowerCase().includes('react')
    },
    {
      id: 6,
      name: 'GREETING_GENERAL',
      prompt: 'hi',
      expectedIntent: 'GENERAL',
      forbiddenText: ['SYSTEM:', 'PyTorch Forward Pass Confidence'],
      checkAnswer: (ans) => ans.toLowerCase().includes('hello') || ans.toLowerCase().includes('mathiyon')
    },
    {
      id: 7,
      name: 'MATH_ARITHMETIC',
      prompt: '25 * 30',
      expectedIntent: 'CALCULATOR',
      forbiddenText: ['SYSTEM:', 'PyTorch Forward Pass Confidence'],
      checkAnswer: (ans) => ans.includes('750')
    },
    {
      id: 8,
      name: 'STATIC_CODING_CONCEPT',
      prompt: 'What is React?',
      expectedIntent: 'CODING',
      forbiddenText: ['SYSTEM:', 'PyTorch Forward Pass Confidence'],
      checkAnswer: (ans) => ans.toLowerCase().includes('react') && ans.toLowerCase().includes('library')
    },
    {
      id: 9,
      name: 'RAG_GROUNDED_DOC',
      prompt: 'What does my uploaded PDF say about authentication?',
      expectedIntent: 'DOCUMENT',
      forbiddenText: ['SYSTEM:', 'PyTorch Forward Pass Confidence'],
      checkAnswer: (ans) => Boolean(ans)
    },
    {
      id: 10,
      name: 'RAG_WEB_FUSION',
      prompt: 'Search online and compare the latest information with my uploaded document.',
      expectedIntent: 'MULTI_TOOL',
      forbiddenText: ['SYSTEM:', 'PyTorch Forward Pass Confidence'],
      mustHaveTool: 'WebSearch',
      checkAnswer: (ans) => Boolean(ans)
    }
  ];

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`Test ${tc.id}/${testCases.length}: [${tc.name}] "${tc.prompt}"`);

    const start = Date.now();
    try {
      const chatRes = await postJson(`${BASE_URL}/api/chat`, {
        message: tc.prompt,
        enableWebSearch: tc.name.includes('WEB')
      }, token);

      const latencyMs = Date.now() - start;
      const returnedIntent = chatRes.body.intent;
      const toolsUsed = chatRes.body.toolsUsed || [];
      const sources = chatRes.body.sources || [];
      const citations = chatRes.body.citations || [];
      const answer = chatRes.body.answer || '';
      const modelLabel = chatRes.body.model;

      // Acceptance Criteria Checks
      const intentMatches = returnedIntent === tc.expectedIntent || (tc.expectedIntent === 'WEB' && returnedIntent === 'MULTI_TOOL');
      const toolMatches = tc.mustHaveTool ? (toolsUsed.includes(tc.mustHaveTool) || toolsUsed.includes('web_search')) : true;

      // Leak check
      let hasForbiddenLeak = false;
      if (tc.forbiddenText) {
        for (const fText of tc.forbiddenText) {
          if (answer.includes(fText)) {
            hasForbiddenLeak = true;
            console.error(`  ❌ LEAK DETECTED: Found "${fText}" in answer!`);
          }
        }
      }

      const answerValid = tc.checkAnswer(answer);
      const testPassed = chatRes.ok && chatRes.body.success && intentMatches && toolMatches && !hasForbiddenLeak && answerValid;

      console.log(`  -> Status: ${testPassed ? 'PASS' : 'FAIL'} | Intent: ${returnedIntent} (Expected: ${tc.expectedIntent})`);
      console.log(`  -> Model: "${modelLabel}" | Tools: [${toolsUsed.join(', ')}] | Sources: ${sources.length} | Latency: ${latencyMs}ms`);
      console.log(`  -> Answer: "${answer.substring(0, 120).replace(/\n/g, ' ')}..."\n`);

      results.push({
        testId: tc.id,
        testName: tc.name,
        prompt: tc.prompt,
        status: testPassed ? 'PASS' : 'FAIL',
        detectedIntent: returnedIntent,
        expectedIntent: tc.expectedIntent,
        toolsUsed,
        sourcesCount: sources.length,
        citationsCount: citations.length,
        modelLabel,
        hasForbiddenLeak,
        answer,
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
  console.log(`CRITICAL LIVE FIX VERIFICATION: ${passed}/${total} PASSED (${failed} FAILED)`);
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

  fs.writeFileSync('c:\\DISK-D\\Personal folder\\Mathiyon\\mathiyon_live_capability_test_results.json', JSON.stringify(summaryJson, null, 2));
  console.log("\nWrote report to mathiyon_live_capability_test_results.json");
}

runLiveFixVerification();
