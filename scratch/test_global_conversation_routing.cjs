const fs = require('fs');
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

async function runGlobalTests() {
  console.log('='.repeat(70));
  console.log('MATHIYON AI — GLOBAL CONVERSATION INTELLIGENCE & ROUTING TEST');
  console.log('='.repeat(70));

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

  const FORBIDDEN_FALLBACK_STRINGS = [
    'Here is the information regarding',
    'Mathiyon AI has analyzed your request',
    'provided the output based on verified context',
    'Let me know if you need code snippets',
    'How would you like me to assist you further',
    'a*d*o*t*y',
    'SYSTEM:',
    'PyTorch Forward Pass Confidence'
  ];

  const testCases = [
    // 1. GREETINGS & CASUAL
    {
      group: 'GENERAL',
      query: 'hi',
      expectedIntents: ['GENERAL'],
      validate: (ans) => ans.toLowerCase().includes('hi') || ans.toLowerCase().includes('hello')
    },
    {
      group: 'GENERAL',
      query: 'hello',
      expectedIntents: ['GENERAL'],
      validate: (ans) => ans.toLowerCase().includes('hello') || ans.toLowerCase().includes('hi')
    },
    {
      group: 'GENERAL',
      query: 'hey',
      expectedIntents: ['GENERAL'],
      validate: (ans) => ans.toLowerCase().includes('hey')
    },
    {
      group: 'GENERAL',
      query: 'hay',
      expectedIntents: ['GENERAL'],
      validate: (ans) => ans.toLowerCase().includes('hey') || ans.toLowerCase().includes('hello')
    },
    {
      group: 'GENERAL',
      query: 'hlo',
      expectedIntents: ['GENERAL'],
      validate: (ans) => ans.toLowerCase().includes('hello') || ans.toLowerCase().includes('hi')
    },
    {
      group: 'GENERAL',
      query: 'hai',
      expectedIntents: ['GENERAL'],
      validate: (ans) => ans.toLowerCase().includes('hi') || ans.toLowerCase().includes('hello')
    },
    {
      group: 'GENERAL',
      query: 'how are you',
      expectedIntents: ['GENERAL'],
      validate: (ans) => ans.toLowerCase().includes('doing well') || ans.toLowerCase().includes('ready to help')
    },
    {
      group: 'GENERAL',
      query: 'thanks',
      expectedIntents: ['GENERAL'],
      validate: (ans) => ans.toLowerCase().includes('welcome')
    },
    {
      group: 'GENERAL',
      query: 'good morning',
      expectedIntents: ['GENERAL'],
      validate: (ans) => ans.toLowerCase().includes('good morning')
    },

    // 2. IDENTITY
    {
      group: 'IDENTITY',
      query: 'who are you',
      expectedIntents: ['ASSISTANT_IDENTITY', 'GENERAL'],
      validate: (ans) => ans.includes('Mathiyon AI') && !ans.includes('PyTorch Forward Pass')
    },
    {
      group: 'IDENTITY',
      query: 'what is Mathiyon',
      expectedIntents: ['ASSISTANT_IDENTITY', 'GENERAL'],
      validate: (ans) => ans.includes('Mathiyon AI')
    },
    {
      group: 'IDENTITY',
      query: 'what can you do',
      expectedIntents: ['ASSISTANT_IDENTITY', 'GENERAL'],
      validate: (ans) => ans.includes('Mathiyon AI') || ans.toLowerCase().includes('help')
    },

    // 3. TIME
    {
      group: 'TIME',
      query: 'time',
      expectedIntents: ['TIME_DATE'],
      forbiddenTools: ['MathEngine'],
      validate: (ans) => ans.includes('current time') && (ans.includes('AM') || ans.includes('PM'))
    },
    {
      group: 'TIME',
      query: 'what time',
      expectedIntents: ['TIME_DATE'],
      forbiddenTools: ['MathEngine'],
      validate: (ans) => ans.includes('current time') && (ans.includes('AM') || ans.includes('PM'))
    },
    {
      group: 'TIME',
      query: 'what time is it',
      expectedIntents: ['TIME_DATE'],
      forbiddenTools: ['MathEngine'],
      validate: (ans) => ans.includes('current time') && (ans.includes('AM') || ans.includes('PM'))
    },
    {
      group: 'TIME',
      query: 'current time',
      expectedIntents: ['TIME_DATE'],
      forbiddenTools: ['MathEngine'],
      validate: (ans) => ans.includes('current time') && (ans.includes('AM') || ans.includes('PM'))
    },
    {
      group: 'TIME',
      query: 'time now',
      expectedIntents: ['TIME_DATE'],
      forbiddenTools: ['MathEngine'],
      validate: (ans) => ans.includes('current time') && (ans.includes('AM') || ans.includes('PM'))
    },

    // 4. DATE
    {
      group: 'DATE',
      query: 'today',
      expectedIntents: ['TIME_DATE'],
      forbiddenTools: ['MathEngine'],
      validate: (ans) => ans.includes('2026')
    },
    {
      group: 'DATE',
      query: 'today date',
      expectedIntents: ['TIME_DATE'],
      forbiddenTools: ['MathEngine'],
      validate: (ans) => ans.includes('2026')
    },
    {
      group: 'DATE',
      query: "what is today's date",
      expectedIntents: ['TIME_DATE'],
      forbiddenTools: ['MathEngine'],
      validate: (ans) => ans.includes('2026')
    },
    {
      group: 'DATE',
      query: 'what day is today',
      expectedIntents: ['TIME_DATE'],
      forbiddenTools: ['MathEngine'],
      validate: (ans) => ans.includes('2026') || ans.toLowerCase().includes('day')
    },

    // 5. MATH & ARITHMETIC
    {
      group: 'MATH',
      query: '25 + 30',
      expectedIntents: ['CALCULATOR', 'MATH'],
      validate: (ans) => ans.includes('55')
    },
    {
      group: 'MATH',
      query: '234 - 2342',
      expectedIntents: ['CALCULATOR', 'MATH'],
      validate: (ans) => ans.includes('-2108')
    },
    {
      group: 'MATH',
      query: '2x + 5 = 15',
      expectedIntents: ['MATH'],
      validate: (ans) => ans.includes('5')
    },
    {
      group: 'MATH',
      query: 'what is 25 plus 30',
      expectedIntents: ['CALCULATOR', 'MATH'],
      validate: (ans) => ans.includes('55')
    },
    {
      group: 'MATH',
      query: '25 oda 15%',
      expectedIntents: ['CALCULATOR', 'MATH'],
      validate: (ans) => ans.includes('3.75')
    },

    // 6. CODING
    {
      group: 'CODING',
      query: 'what is React',
      expectedIntents: ['CODING'],
      validate: (ans) => ans.toLowerCase().includes('react') && ans.toLowerCase().includes('library')
    },
    {
      group: 'CODING',
      query: 'create a React login form',
      expectedIntents: ['CODING'],
      validate: (ans) => ans.includes('LoginForm') || ans.includes('React')
    },

    // 7. WEB
    {
      group: 'WEB',
      query: 'search online about quantum computing',
      expectedIntents: ['WEB'],
      validate: (ans) => ans.toLowerCase().includes('quantum')
    },
    {
      group: 'WEB',
      query: 'latest React version',
      expectedIntents: ['WEB', 'MULTI_TOOL'],
      validate: (ans) => ans.includes('React 19') || ans.toLowerCase().includes('react')
    },

    // 8. RAG
    {
      group: 'RAG',
      query: 'What does my uploaded PDF say about authentication?',
      expectedIntents: ['DOCUMENT'],
      validate: (ans) => Boolean(ans)
    },

    // 9. MEMORY
    {
      group: 'MEMORY',
      query: 'remember that my project name is SuperApp',
      expectedIntents: ['MEMORY'],
      validate: (ans) => Boolean(ans)
    },

    // 10. TAMIL & TANGLISH
    {
      group: 'MULTILINGUAL',
      query: 'வணக்கம்',
      expectedIntents: ['GENERAL', 'TRANSLATION'],
      validate: (ans) => ans.includes('வணக்கம்')
    },
    {
      group: 'MULTILINGUAL',
      query: 'ஹாய்',
      expectedIntents: ['GENERAL'],
      validate: (ans) => ans.includes('வணக்கம்') || ans.toLowerCase().includes('mathiyon')
    },
    {
      group: 'MULTILINGUAL',
      query: 'எப்படி இருக்க?',
      expectedIntents: ['GENERAL'],
      validate: (ans) => ans.includes('நன்றாக') || ans.toLowerCase().includes('help')
    },
    {
      group: 'MULTILINGUAL',
      query: 'இன்னைக்கு என்ன தேதி?',
      expectedIntents: ['TIME_DATE'],
      validate: (ans) => ans.includes('2026')
    },
    {
      group: 'MULTILINGUAL',
      query: 'இப்போ என்ன time?',
      expectedIntents: ['TIME_DATE'],
      validate: (ans) => ans.includes('AM') || ans.includes('PM') || ans.includes('2026')
    },
    {
      group: 'MULTILINGUAL',
      query: 'epdi iruka',
      expectedIntents: ['GENERAL'],
      validate: (ans) => ans.includes('நன்றாக') || ans.toLowerCase().includes('well')
    },
    {
      group: 'MULTILINGUAL',
      query: 'innaiku enna date',
      expectedIntents: ['TIME_DATE'],
      validate: (ans) => ans.includes('2026')
    }
  ];

  let passed = 0;
  let failed = 0;
  const testResults = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    process.stdout.write(`Test ${i + 1}/${testCases.length}: [${tc.group}] "${tc.query}" ... `);
    try {
      const res = await postJson(`${BASE_URL}/api/chat`, {
        message: tc.query,
        enableWebSearch: tc.group === 'WEB'
      }, token);

      const resp = res.body;
      const intent = resp.intent;
      const answer = resp.answer || '';
      const model = resp.model || '';
      const tools = resp.toolsUsed || [];

      let ok = true;
      let failureReason = '';

      // Check intent
      if (tc.expectedIntents && !tc.expectedIntents.includes(intent)) {
        ok = false;
        failureReason += `Intent mismatch (got ${intent}, expected one of [${tc.expectedIntents.join(', ')}]). `;
      }

      // Check forbidden tools
      if (tc.forbiddenTools) {
        for (const ft of tc.forbiddenTools) {
          if (tools.includes(ft)) {
            ok = false;
            failureReason += `Forbidden tool "${ft}" was used. `;
          }
        }
      }

      // Check forbidden fallback leakage
      for (const leak of FORBIDDEN_FALLBACK_STRINGS) {
        if (answer.includes(leak)) {
          ok = false;
          failureReason += `Found forbidden template string: "${leak}". `;
        }
      }

      // Validate answer logic
      if (tc.validate && !tc.validate(answer)) {
        ok = false;
        failureReason += `Answer content failed custom validator. `;
      }

      const itemResult = {
        id: i + 1,
        group: tc.group,
        query: tc.query,
        status: ok ? 'PASS' : 'FAIL',
        intent,
        model,
        tools,
        latencyMs: resp.totalLatencyMs,
        answerSnippet: answer.slice(0, 100).replace(/\n/g, ' '),
        reason: failureReason || undefined
      };
      testResults.push(itemResult);

      if (ok) {
        passed++;
        console.log(`PASS | Intent: ${intent} | Model: "${model}"`);
        console.log(`   Answer: "${answer.slice(0, 75).replace(/\n/g, ' ')}..."`);
      } else {
        failed++;
        console.log(`FAIL! -> ${failureReason}`);
        console.log(`   Response Intent: ${intent}, Model: ${model}, Tools: [${tools.join(', ')}]`);
        console.log(`   Answer: "${answer.slice(0, 120).replace(/\n/g, ' ')}..."`);
      }
    } catch (e) {
      failed++;
      console.log(`ERROR: ${e.message}`);
      testResults.push({
        id: i + 1,
        group: tc.group,
        query: tc.query,
        status: 'ERROR',
        error: e.message
      });
    }
  }

  // Multi-Turn Temporal Follow-Up Test (What time is it? -> in London?)
  console.log('\n--- Multi-Turn Follow-Up Test ---');
  try {
    const turn1 = await postJson(`${BASE_URL}/api/chat`, { message: 'what time is it' }, token);
    const convId = turn1.body.conversationId;
    const turn2 = await postJson(`${BASE_URL}/api/chat`, {
      message: 'in London?',
      conversationId: convId
    }, token);

    const t2Answer = turn2.body.answer || '';
    const t2Intent = turn2.body.intent;
    const t2Model = turn2.body.model;

    if (t2Intent === 'TIME_DATE' && (t2Answer.includes('London') || t2Answer.includes('Europe/London'))) {
      passed++;
      console.log(`[PASS] Multi-Turn Follow-Up ("what time is it" -> "in London?"): PASS`);
      console.log(`   Intent: ${t2Intent}, Model: ${t2Model}`);
      console.log(`   Answer: "${t2Answer.slice(0, 80).replace(/\n/g, ' ')}..."`);
      testResults.push({
        id: 38,
        group: 'MULTI_TURN',
        query: 'in London? (follow up to what time is it)',
        status: 'PASS',
        intent: t2Intent,
        model: t2Model,
        answerSnippet: t2Answer.slice(0, 100).replace(/\n/g, ' ')
      });
    } else {
      failed++;
      console.log(`[FAIL] Multi-Turn Follow-Up failed. Intent: ${t2Intent}, Answer: "${t2Answer.slice(0, 80)}..."`);
      testResults.push({
        id: 38,
        group: 'MULTI_TURN',
        query: 'in London?',
        status: 'FAIL',
        intent: t2Intent,
        reason: 'Did not resolve to London time'
      });
    }
  } catch (e) {
    failed++;
    console.log(`ERROR in Multi-Turn test: ${e.message}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`TOTAL RESULTS: ${passed} PASSED, ${failed} FAILED (${testCases.length + 1} total)`);
  console.log('='.repeat(70));

  fs.writeFileSync('mathiyon_global_chat_test_results.json', JSON.stringify({
    totalTests: testCases.length + 1,
    passed,
    failed,
    timestamp: new Date().toISOString(),
    results: testResults
  }, null, 2));

  console.log('Saved test results to mathiyon_global_chat_test_results.json');

  if (failed > 0) {
    process.exit(1);
  }
}

runGlobalTests();
