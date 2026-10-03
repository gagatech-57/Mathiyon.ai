/**
 * Mathiyon AI - Hybrid Architecture End-to-End Test Suite
 * Tests all 10 target categories, 10 math engine matrix problems, and LLM invariance safety.
 */

const { processRequest, detectIntent } = require('../server/services/aiOrchestrator');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING MATHIYON AI HYBRID INTELLIGENCE TEST SUITE');
  console.log('================================================================\n');

  const testResults = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    categories: {}
  };

  const userId = 'test_user_hybrid_123';

  // ─── 1. CORE TEST MATRIX ───────────────────────────────────────────────────
  const coreMatrix = [
    {
      name: 'GENERAL_GREETING',
      category: 'General Conversation',
      query: 'hi',
      expectedIntent: 'GENERAL',
      expectedModelType: 'Mathiyon SLM v1.2',
      validate: (res) => res.success && res.answer.length > 0 && !res.answer.includes('Here is the information regarding')
    },
    {
      name: 'ASSISTANT_IDENTITY',
      category: 'Assistant Identity',
      query: 'who are you',
      expectedIntent: 'ASSISTANT_IDENTITY',
      expectedModelType: 'Mathiyon SLM v1.2',
      validate: (res) => res.success && res.answer.includes('Mathiyon AI')
    },
    {
      name: 'TIME_CLOCK',
      category: 'Time & Date',
      query: 'what time is it?',
      expectedIntent: 'TIME_DATE',
      expectedModelType: 'Mathiyon System Clock',
      validate: (res) => res.success && res.toolsUsed.includes('TimeDateEngine') && /AM|PM|:\d\d/i.test(res.answer)
    },
    {
      name: 'DATE_CLOCK',
      category: 'Time & Date',
      query: "what is today's date?",
      expectedIntent: 'TIME_DATE',
      expectedModelType: 'Mathiyon System Clock',
      validate: (res) => res.success && res.toolsUsed.includes('TimeDateEngine') && /202\d|January|February|March|April|May|June|July|August|September|October|November|December/i.test(res.answer)
    },
    {
      name: 'MATH_ALGEBRA_EXACT',
      category: 'Mathematics',
      query: '10x - 45 = 40',
      expectedIntent: 'MATH',
      expectedModelType: 'Mathiyon SymPy Math Engine',
      validate: (res) => res.success && res.toolsUsed.includes('MathEngine') && (res.answer.includes('17/2') || res.answer.includes('8.5'))
    },
    {
      name: 'CODING_SIMPLE',
      category: 'Coding',
      query: 'Explain React hooks',
      expectedIntent: 'CODING',
      validate: (res) => res.success && (res.answer.includes('React') || res.answer.includes('Hook') || res.answer.includes('useState'))
    },
    {
      name: 'COMPLEX_CODING_ARCHITECTURE',
      category: 'Complex Reasoning (LLM)',
      query: 'Design a production authentication architecture for React, Express, PostgreSQL and JWT.',
      expectedIntent: 'CODING',
      expectedModelType: 'Mathiyon LLM (Hybrid)',
      validate: (res) => res.success && res.toolsUsed.includes('LLM') && res.answer.includes('Architecture') && res.answer.includes('JWT')
    },
    {
      name: 'RAG_GROUNDED',
      category: 'Document RAG',
      query: 'What does my uploaded document say?',
      expectedIntent: 'DOCUMENT',
      validate: (res) => res.success && res.intent === 'DOCUMENT' && res.answer.length > 0
    },
    {
      name: 'WEB_INTELLIGENCE',
      category: 'Web Intelligence',
      query: 'Search online for the latest React information.',
      expectedIntent: 'WEB',
      validate: (res) => res.success && res.toolsUsed.includes('WebSearch') && res.sources.length > 0
    },
    {
      name: 'MULTI_TOOL_WEB_RAG',
      category: 'Multi-Tool Agent',
      query: 'Search the latest React version and compare it with my uploaded project.',
      expectedIntent: 'MULTI_TOOL',
      validate: (res) => res.success && (res.toolsUsed.includes('WebSearch') || res.toolsUsed.includes('RAG') || res.toolsUsed.includes('LLM'))
    },
    {
      name: 'MULTI_TOOL_CURRENCY_MATH',
      category: 'Multi-Tool Agent',
      query: 'Get the current USD to INR rate and calculate ₹50,000 in USD.',
      expectedIntent: 'MULTI_TOOL',
      validate: (res) => res.success && (res.answer.includes('50,000') || res.answer.includes('USD') || res.answer.includes('INR'))
    }
  ];

  console.log('--- 1. EXECUTING CORE TEST MATRIX ---');
  for (const tc of coreMatrix) {
    testResults.totalTests++;
    try {
      const res = await processRequest({
        userId,
        message: tc.query,
        enableWebSearch: tc.expectedIntent === 'WEB' || tc.expectedIntent === 'MULTI_TOOL'
      });

      const passed = tc.validate(res);
      if (passed) {
        testResults.passed++;
        console.log(`✅ [PASS] ${tc.name} (${tc.category}) -> Model: ${res.model}`);
      } else {
        testResults.failed++;
        console.error(`❌ [FAIL] ${tc.name} (${tc.category})`);
        console.error(`   Output:`, res);
      }

      testResults.categories[tc.name] = {
        category: tc.category,
        query: tc.query,
        passed,
        model: res.model,
        intent: res.intent,
        toolsUsed: res.toolsUsed,
        latencyMs: res.totalLatencyMs
      };
    } catch (err) {
      testResults.failed++;
      console.error(`💥 [ERROR] ${tc.name}:`, err.message);
      testResults.categories[tc.name] = { passed: false, error: err.message };
    }
  }

  // ─── 2. MATH ENGINE TEST MATRIX (10 CASES) ─────────────────────────────────
  console.log('\n--- 2. EXECUTING MATH ENGINE MATRIX ---');
  const mathMatrix = [
    { query: '10x - 45 = 40', expectedAns: '17/2' },
    { query: '2x + 5 = 15', expectedAns: '5' },
    { query: 'x^2 - 5x + 6 = 0', expectedAns: '2' },
    { query: 'x + y = 10, 2x - y = 5', expectedAns: 'x = 5' },
    { query: 'sqrt(144)', expectedAns: '12' },
    { query: '25% of 200', expectedAns: '50' },
    { query: '2/3 + 1/3', expectedAns: '1' },
    { query: 'derivative of x^2', expectedAns: '2*x' },
    { query: 'integral of x^2', expectedAns: 'x**3/3 + C' },
    { query: 'determinant of [[1, 2], [3, 4]]', expectedAns: '-2' }
  ];

  for (const m of mathMatrix) {
    testResults.totalTests++;
    try {
      const res = await processRequest({
        userId,
        message: m.query
      });

      const passed = res.success && res.verified && res.answer.includes(m.expectedAns);
      if (passed) {
        testResults.passed++;
        console.log(`✅ [MATH PASS] ${m.query} => Verified Result containing: ${m.expectedAns}`);
      } else {
        testResults.failed++;
        console.error(`❌ [MATH FAIL] ${m.query}`);
        console.error(`   Output:`, res.answer);
      }

      testResults.categories[`MATH_${m.query}`] = {
        category: 'Math Verification',
        query: m.query,
        passed,
        verified: res.verified,
        latencyMs: res.totalLatencyMs
      };
    } catch (err) {
      testResults.failed++;
      console.error(`💥 [MATH ERROR] ${m.query}:`, err.message);
    }
  }

  // ─── 3. LLM SAFETY INVARIANCE TESTS ────────────────────────────────────────
  console.log('\n--- 3. EXECUTING LLM SAFETY INVARIANCE TESTS ---');
  const safetyTests = [
    {
      name: 'SAFETY_MATH_IMMUTABILITY',
      desc: 'LLM cannot override exact 2 + 2 = 4 computation',
      query: '2 + 2',
      check: (res) => res.verified && res.answer.includes('4')
    },
    {
      name: 'SAFETY_CLOCK_IMMUTABILITY',
      desc: 'System Clock cannot be hallucinated',
      query: 'what is the current time?',
      check: (res) => res.verified && res.toolsUsed.includes('TimeDateEngine')
    }
  ];

  for (const s of safetyTests) {
    testResults.totalTests++;
    try {
      const res = await processRequest({ userId, message: s.query });
      const passed = s.check(res);
      if (passed) {
        testResults.passed++;
        console.log(`✅ [SAFETY PASS] ${s.name} — ${s.desc}`);
      } else {
        testResults.failed++;
        console.error(`❌ [SAFETY FAIL] ${s.name}`);
      }
      testResults.categories[s.name] = { passed, query: s.query };
    } catch (err) {
      testResults.failed++;
      console.error(`💥 [SAFETY ERROR] ${s.name}:`, err.message);
    }
  }

  // Save results to mathiyon_hybrid_test_results.json
  const resultsPath = path.join(__dirname, '../mathiyon_hybrid_test_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`\n💾 Saved detailed test results to ${resultsPath}`);

  console.log('\n================================================================');
  console.log(`🏁 TEST SUMMARY: ${testResults.passed} / ${testResults.totalTests} PASSED (${Math.round((testResults.passed / testResults.totalTests) * 100)}%)`);
  console.log('================================================================\n');

  return testResults;
}

runTests();
