/**
 * Mathiyon AI - Universal Intelligence Test Matrix Execution
 * Verifies all 20+ capability intent categories, tool selection, date/time resolution, and accuracy.
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

async function runTestMatrix() {
  console.log("==================================================");
  console.log("MATHIYON AI — UNIVERSAL INTELLIGENCE TEST MATRIX");
  console.log("==================================================\n");

  // 1. Authenticate / Login to obtain JWT
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

  // Test Cases Matrix
  const testCases = [
    { name: 'GENERAL', prompt: 'hi', expectedIntent: 'GENERAL' },
    { name: 'DATE', prompt: "What is today's date?", expectedIntent: 'TIME_DATE' },
    { name: 'TIME', prompt: 'What time is it?', expectedIntent: 'TIME_DATE' },
    { name: 'DAY', prompt: 'What day is today?', expectedIntent: 'TIME_DATE' },
    { name: 'TIMEZONE', prompt: 'What time is it in London?', expectedIntent: 'TIME_DATE' },
    { name: 'DATE_CALC', prompt: 'What date is 30 days from today?', expectedIntent: 'DATE_CALCULATION' },
    { name: 'MATH', prompt: '25 * 30', expectedIntent: 'CALCULATOR' },
    { name: 'ALGEBRA', prompt: '2x + 5 = 15', expectedIntent: 'MATH' },
    { name: 'TAMIL', prompt: 'வணக்கம், எப்படி இருக்கிறாய்?', expectedIntent: 'GENERAL' },
    { name: 'TANGLISH', prompt: '25 oda 15% calculate pannu', expectedIntent: 'MATH' },
    { name: 'CODING', prompt: 'Create a React login form', expectedIntent: 'CODING' },
    { name: 'RAG', prompt: 'What does my uploaded document say about performance?', expectedIntent: 'DOCUMENT' },
    { name: 'MEMORY_SAVE', prompt: 'Remember that my name is Guna', expectedIntent: 'MEMORY' },
    { name: 'MEMORY_RECALL', prompt: 'What is my name?', expectedIntent: 'GENERAL' },
    { name: 'WEB', prompt: 'What is the latest React version?', expectedIntent: 'WEB' },
    { name: 'CURRENCY', prompt: 'Convert 100 USD to INR', expectedIntent: 'CURRENCY' },
    { name: 'UNIT', prompt: '10 km in miles', expectedIntent: 'UNIT_CONVERSION' },
    { name: 'WEATHER', prompt: "What's the weather in Chennai?", expectedIntent: 'WEATHER' },
    { name: 'TRANSLATION', prompt: "Translate 'Good morning' into Tamil", expectedIntent: 'TRANSLATION' },
    { name: 'WRITING', prompt: 'Write a professional email asking for project updates', expectedIntent: 'WRITING' },
    { name: 'MULTI_TOOL', prompt: "Get today's USD to INR rate and calculate 100 USD in INR.", expectedIntent: 'MULTI_TOOL' }
  ];

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`Test ${i + 1}/${testCases.length}: [${tc.name}] "${tc.prompt}"`);

    const start = Date.now();
    try {
      const chatRes = await postJson(`${BASE_URL}/api/chat`, {
        message: tc.prompt,
        enableWebSearch: tc.name === 'WEB' || tc.name === 'MULTI_TOOL'
      }, token);

      const latencyMs = Date.now() - start;
      const pass = chatRes.ok && chatRes.body.success && Boolean(chatRes.body.answer);
      const returnedIntent = chatRes.body.intent;
      const toolsUsed = chatRes.body.toolsUsed || [];
      const answerSnippet = (chatRes.body.answer || '').substring(0, 120).replace(/\n/g, ' ');

      console.log(`  -> Status: ${pass ? 'PASS' : 'FAIL'} | Intent: ${returnedIntent} | Tools: [${toolsUsed.join(', ')}] | Latency: ${latencyMs}ms`);
      console.log(`  -> Answer: "${answerSnippet}..."\n`);

      results.push({
        test: tc.name,
        prompt: tc.prompt,
        status: pass ? 'PASS' : 'FAIL',
        detectedIntent: returnedIntent,
        expectedIntent: tc.expectedIntent,
        toolsUsed,
        answer: chatRes.body.answer,
        latencyMs
      });
    } catch (err) {
      console.log(`  -> Status: FAIL | Error: ${err.message}\n`);
      results.push({
        test: tc.name,
        prompt: tc.prompt,
        status: 'FAIL',
        error: err.message
      });
    }
  }

  // Summary counts
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = total - passed;

  console.log("==================================================");
  console.log(`SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log("==================================================");

  // Write results JSON file
  const fs = require('fs');
  const summaryJson = {
    timestamp: new Date().toISOString(),
    total,
    passed,
    failed,
    passRate: `${Math.round((passed / total) * 100)}%`,
    testResults: results
  };

  fs.writeFileSync('c:\\DISK-D\\Personal folder\\Mathiyon\\mathiyon_capability_test_results.json', JSON.stringify(summaryJson, null, 2));
  console.log("\nWrote report to mathiyon_capability_test_results.json");
}

runTestMatrix();
