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

async function runRoutingTests() {
  console.log('='.repeat(65));
  console.log('MATHIYON AI — INTENT ROUTING FIX VERIFICATION SUITE');
  console.log('='.repeat(65));

  // 1. Authenticate
  const loginRes = await postJson(`${BASE_URL}/api/auth/login`, {
    email: 'developer@mathiyon.ai',
    password: 'password123',
  });

  if (!loginRes.ok || !loginRes.body.token) {
    console.error('Failed to log in:', loginRes.body);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('[PASS] Authenticated successfully as developer@mathiyon.ai\n');

  // Test cases for Express /api/chat
  const cases = [
    {
      name: 'Single word "today"',
      message: 'today',
      expectedIntent: 'TIME_DATE',
      forbiddenInAnswer: ['a*d*o*t*y', 'Verified Math Engine'],
      mustInclude: ['2026'],
    },
    {
      name: 'Single word "tomorrow"',
      message: 'tomorrow',
      expectedIntent: 'TIME_DATE',
      forbiddenInAnswer: ['Verified Math Engine'],
      mustInclude: ['2026'],
    },
    {
      name: 'Single word "yesterday"',
      message: 'yesterday',
      expectedIntent: 'TIME_DATE',
      forbiddenInAnswer: ['Verified Math Engine'],
      mustInclude: ['2026'],
    },
    {
      name: 'Tamil "இன்று"',
      message: 'இன்று',
      expectedIntent: 'TIME_DATE',
      forbiddenInAnswer: ['Verified Math Engine'],
      mustInclude: ['2026'],
    },
    {
      name: 'Tamil "இன்று என்ன தேதி?"',
      message: 'இன்று என்ன தேதி?',
      expectedIntent: 'TIME_DATE',
      forbiddenInAnswer: ['Verified Math Engine'],
      mustInclude: ['2026'],
    },
    {
      name: 'Tanglish "innaiku enna date?"',
      message: 'innaiku enna date?',
      expectedIntent: 'TIME_DATE',
      forbiddenInAnswer: ['Verified Math Engine'],
      mustInclude: ['2026'],
    },
    {
      name: 'Plain English word "hello"',
      message: 'hello',
      expectedIntent: 'GENERAL',
      forbiddenInAnswer: ['Verified Math Engine'],
    },
    {
      name: 'Single word "react"',
      message: 'react',
      forbiddenInAnswer: ['Verified Math Engine'],
      notExpectedIntent: 'MATH',
    },
    {
      name: 'Valid Arithmetic "25 + 30"',
      message: '25 + 30',
      expectedIntent: 'CALCULATOR',
      mustInclude: ['55'],
    },
    {
      name: 'Valid Equation "2x + 5 = 15"',
      message: '2x + 5 = 15',
      expectedIntent: 'MATH',
      mustInclude: ['5'],
    },
    {
      name: 'Valid Function "sin(0)"',
      message: 'sin(0)',
      expectedIntent: 'MATH',
      mustInclude: ['0'],
    },
  ];

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    process.stdout.write(`Test ${i + 1}/${cases.length}: [${c.name}] "${c.message}" ... `);
    try {
      const chatRes = await postJson(`${BASE_URL}/api/chat`, {
        message: c.message,
      }, token);

      const resp = chatRes.body;
      const intent = resp.intent;
      const answer = resp.answer || '';
      const tools = resp.toolsUsed || [];
      const model = resp.model || '';

      let ok = true;
      let reason = '';

      if (c.expectedIntent && intent !== c.expectedIntent) {
        ok = false;
        reason += `Intent mismatch (got ${intent}, expected ${c.expectedIntent}). `;
      }

      if (c.notExpectedIntent && intent === c.notExpectedIntent) {
        ok = false;
        reason += `Intent should not be ${c.notExpectedIntent}. `;
      }

      if (c.forbiddenInAnswer) {
        for (const f of c.forbiddenInAnswer) {
          if (answer.includes(f) || model.includes(f)) {
            ok = false;
            reason += `Found forbidden string "${f}". `;
          }
        }
      }

      if (c.mustInclude) {
        for (const req of c.mustInclude) {
          if (!answer.includes(req)) {
            ok = false;
            reason += `Missing required string "${req}". `;
          }
        }
      }

      if (ok) {
        passed++;
        console.log(`PASS | Intent: ${intent} | Model: "${model}"`);
        console.log(`   Answer snippet: "${answer.slice(0, 75).replace(/\n/g, ' ')}..."`);
      } else {
        failed++;
        console.log(`FAIL! -> ${reason}`);
        console.log(`   Response Intent: ${intent}, Model: ${model}`);
        console.log(`   Answer: "${answer.slice(0, 120)}..."`);
      }
    } catch (e) {
      failed++;
      console.log(`ERROR: ${e.message}`);
    }
  }

  // Also test direct Python /math/solve with "today"
  console.log('\n--- Direct Python Math Solver Gate Verification ---');
  try {
    const pyRes = await postJson('http://127.0.0.1:8000/math/solve', {
      question: 'today',
    });
    console.log('Python /math/solve with "today" response:', pyRes.body);
    if (pyRes.body.success === false && !JSON.stringify(pyRes.body).includes('a*d*o*t*y')) {
      passed++;
      console.log('[PASS] Python Math Solver correctly rejected "today" as non-mathematical!');
    } else {
      failed++;
      console.log('[FAIL] Python Math Solver returned success or transformed to a*d*o*t*y!');
    }
  } catch (e) {
    failed++;
    console.log(`ERROR in Python test: ${e.message}`);
  }

  console.log('\n' + '='.repeat(65));
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(65));

  if (failed > 0) {
    process.exit(1);
  }
}

runRoutingTests();
