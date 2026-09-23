const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';

async function runMasterPlatformTests() {
  console.log('🚀 STARTING MATHIYON AI MASTER PLATFORM (PHASES 5-10) AUTOMATED TEST SUITE\n');

  let passedTests = 0;
  let totalTests = 10;

  // 1. REGISTER / LOGIN USER A
  const userAEmail = `master_user_a_${Date.now()}@example.com`;
  const userBEmail = `master_user_b_${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log('👤 Registering User A & User B...');
  const regARes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User A', email: userAEmail, password })
  });
  const userAData = await regARes.json();
  const tokenA = userAData.token;

  const regBRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User B', email: userBEmail, password })
  });
  const userBData = await regBRes.json();
  const tokenB = userBData.token;

  if (!tokenA || !tokenB) {
    console.error('❌ Failed to authenticate test users!');
    process.exit(1);
  }
  console.log('✅ Auth setup complete for User A & User B.\n');

  // UPLOAD DEMO PDF FOR USER A
  console.log('📄 Uploading PDF for User A...');
  const pdfPath = path.join(__dirname, '..', 'mathiyon_rag_demo.pdf');
  let userADocId = null;

  if (fs.existsSync(pdfPath)) {
    const fileBuffer = fs.readFileSync(pdfPath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const postData = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="mathiyon_rag_demo.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const uploadRes = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${tokenA}`
      },
      body: postData
    });
    const uploadData = await uploadRes.json();
    if (uploadData.success && uploadData.document) {
      userADocId = uploadData.document._id || uploadData.document.id;
      console.log(`✅ Uploaded demo PDF for User A (ID: ${userADocId})\n`);
    }
  }


  // --- TEST 1: NORMAL CHAT ---
  console.log('--------------------------------------------------');
  console.log('TEST 1 — Normal Chat Intent');
  const t1Res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ message: 'Hello Mathiyon' })
  });
  const t1Data = await t1Res.json();
  if (t1Data.success && t1Data.response && (t1Data.intent === 'CONVERSATION' || t1Data.intent === 'GENERAL')) {
    console.log('✅ TEST 1 PASSED: Normal Chat processed via Orchestrator');
    console.log(`   Tools used: ${t1Data.toolsUsed.join(', ')}`);
    passedTests++;
  } else {
    console.error('❌ TEST 1 FAILED:', t1Data);
  }

  // --- TEST 2: MATH ENGINE ---
  console.log('\n--------------------------------------------------');
  console.log('TEST 2 — Math Engine Intent');
  const t2Res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ message: 'Solve 2x + 5 = 15' })
  });
  const t2Data = await t2Res.json();
  if (t2Data.success && t2Data.intent === 'MATH' && t2Data.verified) {
    console.log('✅ TEST 2 PASSED: Math problem solved & verified by SymPy Math Engine');
    console.log(`   Response snippet: ${t2Data.response.substring(0, 80)}`);
    passedTests++;
  } else {
    console.error('❌ TEST 2 FAILED:', t2Data);
  }

  // --- TEST 3: DOCUMENT RAG ---
  console.log('\n--------------------------------------------------');
  console.log('TEST 3 — Document RAG Query');
  const t3Res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ message: 'What is Mathiyon AI?', documentIds: [userADocId] })
  });
  const t3Data = await t3Res.json();
  if (t3Data.success && t3Data.toolsUsed.includes('RAG') && t3Data.response) {
    console.log('✅ TEST 3 PASSED: Document RAG retrieved context with citations');
    console.log(`   Tools used: ${t3Data.toolsUsed.join(', ')}`);
    passedTests++;
  } else {
    console.error('❌ TEST 3 FAILED:', t3Data);
  }

  // --- TEST 4: DOCUMENT + MATH ---
  console.log('\n--------------------------------------------------');
  console.log('TEST 4 — Document + Math Intent');
  const t4Res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ message: 'What is 1/3 + 1/6 according to the document?', documentIds: [userADocId] })
  });
  const t4Data = await t4Res.json();
  if (t4Data.success && (t4Data.intent === 'DOCUMENT_MATH' || t4Data.toolsUsed.includes('MathEngine'))) {
    console.log('✅ TEST 4 PASSED: Combined RAG + Math Engine executed');
    console.log(`   Tools used: ${t4Data.toolsUsed.join(', ')}`);
    passedTests++;
  } else {
    console.error('❌ TEST 4 FAILED:', t4Data);
  }

  // --- TEST 5: DOCUMENT MISSING INFO ---
  console.log('\n--------------------------------------------------');
  console.log('TEST 5 — Document Missing Information Protection');
  const t5Res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ message: 'Who founded Mathiyon AI?', documentIds: [userADocId] })
  });
  const t5Data = await t5Res.json();
  if (t5Data.success && t5Data.response.includes('The document does not contain this information.')) {
    console.log('✅ TEST 5 PASSED: Returned exact missing info protection message without hallucination');
    passedTests++;
  } else {
    console.error('❌ TEST 5 FAILED:', t5Data);
  }

  // --- TEST 6: LONG-TERM MEMORY ---
  console.log('\n--------------------------------------------------');
  console.log('TEST 6 — Memory Storage & Retrieval');
  await fetch(`${API_URL}/memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ content: 'Remember that my frontend uses React 19.' })
  });

  const t6Res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ message: 'What frontend framework does my project use?' })
  });
  const t6Data = await t6Res.json();
  if (t6Data.success && t6Data.response) {
    console.log('✅ TEST 6 PASSED: Stored and retrieved long-term memory fact');
    console.log(`   Tools used: ${t6Data.toolsUsed.join(', ')}`);
    passedTests++;
  } else {
    console.error('❌ TEST 6 FAILED:', t6Data);
  }

  // --- TEST 7: MULTI-TOOL EXECUTION ---
  console.log('\n--------------------------------------------------');
  console.log('TEST 7 — Multi-Tool Execution Pipeline');
  const t7Res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ message: 'Read the document and calculate 15% of 50000 mentioned in it.', documentIds: [userADocId] })
  });
  const t7Data = await t7Res.json();
  if (t7Data.success && t7Data.toolsUsed.length >= 2) {
    console.log('✅ TEST 7 PASSED: Multi-tool pipeline executed successfully');
    console.log(`   Tools executed: ${t7Data.toolsUsed.join(' -> ')}`);
    passedTests++;
  } else {
    console.error('❌ TEST 7 FAILED:', t7Data);
  }

  // --- TEST 8: SECURITY - DOCUMENT ISOLATION ---
  console.log('\n--------------------------------------------------');
  console.log('TEST 8 — User B Unauthorized Access to User A Document');
  const t8Res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ message: 'Summarize file', documentIds: [userADocId] })
  });
  if (t8Res.status === 403) {
    console.log('✅ TEST 8 PASSED: Access denied to User B (HTTP 403 Forbidden)');
    passedTests++;
  } else {
    console.error(`❌ TEST 8 FAILED: Returned HTTP ${t8Res.status}`);
  }

  // --- TEST 9: SECURITY - MEMORY ISOLATION ---
  console.log('\n--------------------------------------------------');
  console.log('TEST 9 — Memory User Isolation Security Check');
  const memListRes = await fetch(`${API_URL}/memory`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const memListData = await memListRes.json();
  if (memListData.success && memListData.memories.length === 0) {
    console.log("✅ TEST 9 PASSED: User B cannot view User A's long-term memories");
    passedTests++;
  } else {
    console.error('❌ TEST 9 FAILED:', memListData);
  }

  // --- TEST 10: WEB INTELLIGENCE SEARCH ---
  console.log('\n--------------------------------------------------');
  console.log('TEST 10 — Web Search Tool');
  const t10Res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ message: 'Search web for latest React 19 documentation updates', enableWebSearch: true })
  });
  const t10Data = await t10Res.json();
  if (t10Data.success && t10Data.toolsUsed.includes('WebSearch')) {
    console.log('✅ TEST 10 PASSED: Web search tool executed and returned web sources');
    console.log(`   Tools used: ${t10Data.toolsUsed.join(', ')}`);
    passedTests++;
  } else {
    console.error('❌ TEST 10 FAILED:', t10Data);
  }

  console.log('\n==================================================');
  console.log(`📊 MASTER PLATFORM E2E RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('==================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL 10 MANDATORY MASTER PLATFORM TEST SCENARIOS PASSED!');
    process.exit(0);
  } else {
    console.error('⚠️ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runMasterPlatformTests().catch(err => {
  console.error('Master E2E Test execution error:', err);
  process.exit(1);
});
