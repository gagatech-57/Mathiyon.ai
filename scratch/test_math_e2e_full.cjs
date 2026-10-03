const fs = require('fs');
const http = require('http');

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYmIzNjQzMDc1MzAxZjg0YTMxMDEwZSIsImVtYWlsIjoidGVzdHVzZXJAbWF0aGl5b24uYWkiLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNzkwNjU0MDE5LCJleHAiOjE3OTMyNDYwMTl9.8qN9kVi85jEcTq8gK7LdXL4PUHRarpY5d_XA6U-aGTc';

const testCases = [
  // 1. COMPARISON
  { category: 'Comparison', query: '3 > 5', expectedSub: 'No, 3 > 5, False' },
  { category: 'Comparison', query: '3 = 3', expectedSub: 'Yes, 3 = 3, True' },
  { category: 'Comparison', query: '3 < 5', expectedSub: 'Yes, 3 < 5, True' },
  { category: 'Comparison', query: '5 >= 5', expectedSub: 'Yes, 5 >= 5, True' },
  { category: 'Comparison', query: '4 <= 3', expectedSub: 'No, 4 <= 3, False' },
  { category: 'Comparison', query: '3 != 5', expectedSub: 'Yes, 3' },
  { category: 'Comparison', query: 'is 3 greater than 5?', expectedSub: 'No, 3 > 5, False' },
  { category: 'Comparison', query: 'is 3 equal to 3?', expectedSub: 'Yes, 3 = 3, True' },

  // 2. DECIMAL & ARITHMETIC
  { category: 'Decimal Arithmetic', query: '2.344 + 1.2', expectedSub: '3.544' },
  { category: 'Decimal Arithmetic', query: '0.1 + 0.2', expectedSub: '0.3' },
  { category: 'Arithmetic', query: '25 * 30', expectedSub: '750' },
  { category: 'Arithmetic', query: '100 / 4', expectedSub: '25' },
  { category: 'Arithmetic', query: '5 - 10', expectedSub: '-5' },
  { category: 'Precedence', query: '2 + 3 * 4', expectedSub: '14' },
  { category: 'Precedence', query: '(2 + 3) * 4', expectedSub: '20' },

  // 3. FRACTIONS & ROOTS
  { category: 'Fractions', query: '1/3', expectedSub: '0.3333333333' },
  { category: 'Fractions', query: '2/3 + 1/3', expectedSub: '1' },
  { category: 'Fractions', query: '1/3 + 1/6', expectedSub: '1/2' },
  { category: 'Roots & Powers', query: 'sqrt(144)', expectedSub: '12' },
  { category: 'Roots & Powers', query: 'sqrt(2)', expectedSub: '1.4142135624' },
  { category: 'Roots & Powers', query: '2^3', expectedSub: '8' },

  // 4. PERCENTAGES
  { category: 'Percentage', query: '25% of 200', expectedSub: '50' },
  { category: 'Percentage', query: '15% of 80', expectedSub: '12' },
  { category: 'Percentage', query: '200 increased by 10%', expectedSub: '220' },
  { category: 'Percentage', query: '500 decreased by 20%', expectedSub: '400' },

  // 5. ALGEBRA & EQUATIONS
  { category: 'Linear Equation', query: '2x + 5 = 15', expectedSub: 'x = 5' },
  { category: 'Quadratic Equation', query: 'x^2 - 5x + 6 = 0', expectedSub: '2' },
  { category: 'Inequality', query: '2x + 3 > 9', expectedSub: 'x > 3' },
  { category: 'Polynomials', query: 'expand (x + 2)^2', expectedSub: '4' },
  { category: 'Polynomials', query: 'factor x^2 - 4', expectedSub: '(x - 2)' },

  // 6. CALCULUS
  { category: 'Calculus', query: 'derivative of x^2', expectedSub: '2' },
  { category: 'Calculus', query: 'integral of x^2', expectedSub: 'x' },
  { category: 'Calculus', query: 'limit of sin(x)/x as x approaches 0', expectedSub: '1' },

  // 7. TRIGONOMETRY
  { category: 'Trigonometry', query: 'sin(30 deg)', expectedSub: '1/2' },
  { category: 'Trigonometry', query: 'cos(0)', expectedSub: '1' },

  // 8. ADVANCED
  { category: 'Matrix', query: 'det([[1,2],[3,4]])', expectedSub: '-2' },
  { category: 'Statistics', query: 'mean of [10, 20, 30]', expectedSub: '20' },
  { category: 'Geometry', query: 'area of circle radius 5', expectedSub: '5' },

  // 9. REGRESSION NON-MATH
  { category: 'Regression - Chat', query: 'hi', noMathExpected: true },
  { category: 'Regression - Time', query: 'what is today date', timeDateExpected: true },
  { category: 'Regression - Coding', query: 'what is React?', noMathExpected: true },
];

async function sendChat(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      message: message,
      conversationId: 'test-universal-math-' + Math.floor(Math.random() * 100000)
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 20000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (e) {
          resolve({ raw: body, error: e.message });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('   MATHIYON UNIVERSAL MATH ENGINE - E2E TEST SUITE');
  console.log('='.repeat(60));
  
  const results = [];
  let passed = 0;
  let failed = 0;
  let categoryStats = {};

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      const resp = await sendChat(tc.query);
      const reply = resp?.answer || resp?.response || resp?.data?.reply || resp?.reply || resp?.message || '';
      const intent = resp?.intent || resp?.data?.orchestration?.intent || resp?.data?.intent || '';
      const tools = resp?.data?.orchestration?.tools_used || [];

      let isSuccess = false;
      let reason = '';

      if (tc.noMathExpected) {
        // Check that the response is NOT a math error response
        const notMathError = !reply.toLowerCase().includes('not a mathematical') && !reply.toLowerCase().includes('could not calculate') && reply.length > 0;
        isSuccess = notMathError;
        if (!isSuccess) reason = `Expected non-math response, got: '${reply.substring(0, 100)}'`;
      } else if (tc.timeDateExpected) {
        // Check for date/time-related content
        const hasDate = /\d{4}|\bjanuary\b|\bfebruary\b|\bmarch\b|\bapril\b|\bmay\b|\bjune\b|\bjuly\b|\baugust\b|\bseptember\b|\boctober\b|\bnovember\b|\bdecember\b/i.test(reply);
        isSuccess = hasDate;
        if (!isSuccess) reason = `Expected date info, got: '${reply.substring(0, 100)}'`;
      } else if (tc.expectedSub) {
        const cleanReply = reply.trim();
        isSuccess = cleanReply.includes(tc.expectedSub);
        if (!isSuccess) reason = `Expected '${tc.expectedSub}' in '${cleanReply.substring(0, 120)}'`;
      }

      // Track category stats
      if (!categoryStats[tc.category]) categoryStats[tc.category] = { passed: 0, failed: 0 };
      if (isSuccess) {
        passed++;
        categoryStats[tc.category].passed++;
        console.log(`✅ [${tc.category}] "${tc.query}"`);
        console.log(`   → "${reply.trim().substring(0, 100)}"`);
      } else {
        failed++;
        categoryStats[tc.category].failed++;
        console.log(`❌ [${tc.category}] "${tc.query}"`);
        console.log(`   → "${reply.trim().substring(0, 120)}"`);
        console.log(`   ⚠️  ${reason}`);
      }

      results.push({
        id: i + 1,
        category: tc.category,
        query: tc.query,
        expected: tc.expectedSub || (tc.noMathExpected ? '(non-math response)' : '(date/time info)'),
        actualReply: reply,
        actualIntent: intent,
        toolsUsed: tools,
        status: isSuccess ? 'PASSED' : 'FAILED',
        reason: reason || undefined
      });
    } catch (err) {
      failed++;
      console.log(`⚠️  [ERROR] [${tc.category}] "${tc.query}" → ${err.message}`);
      results.push({
        id: i + 1,
        category: tc.category,
        query: tc.query,
        status: 'ERROR',
        error: err.message
      });
    }
    
    // Small delay to avoid overwhelming server
    await new Promise(r => setTimeout(r, 300));
  }

  const summary = {
    title: 'Mathiyon Universal Math Engine — Comprehensive E2E Test Results',
    timestamp: new Date().toISOString(),
    environment: { expressPort: 5000, pythonPort: 8000 },
    total: testCases.length,
    passed,
    failed,
    passRate: `${((passed / testCases.length) * 100).toFixed(1)}%`,
    categoryBreakdown: categoryStats,
    results
  };

  fs.writeFileSync('mathiyon_math_comprehensive_test_results.json', JSON.stringify(summary, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests : ${testCases.length}`);
  console.log(`Passed      : ${passed}`);
  console.log(`Failed      : ${failed}`);
  console.log(`Pass Rate   : ${summary.passRate}`);
  console.log('\nCategory Breakdown:');
  Object.entries(categoryStats).forEach(([cat, stats]) => {
    const rate = ((stats.passed / (stats.passed + stats.failed)) * 100).toFixed(0);
    console.log(`  ${cat.padEnd(25)} ${stats.passed}/${stats.passed + stats.failed} (${rate}%)`);
  });
  console.log('\n✅ Full results saved to: mathiyon_math_comprehensive_test_results.json');
}

runTests();
