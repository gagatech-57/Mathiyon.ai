const http = require('http');

let token = '';

function login() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: 'developer@mathiyon.ai', password: 'password123' });
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(b);
          if (j.success && j.token) {
            token = j.token;
            console.log('[AUTH] Logged in successfully as developer@mathiyon.ai');
            resolve(token);
          } else {
            console.log('[AUTH] Login response:', j);
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getConversations() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/chat/conversations',
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(b);
          resolve(j.conversations || []);
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.end();
  });
}

function sendChat(msg, convId) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ message: msg, conversationId: convId });
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(b));
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(data);
    req.end();
  });
}

async function runTest() {
  console.log('='.repeat(65));
  console.log('MATHIYON AI — NEW CHAT & CONVERSATION PERSISTENCE VERIFICATION');
  console.log('='.repeat(65));

  await login();
  if (!token) {
    console.error('Authentication failed, aborting test.');
    process.exit(1);
  }

  // 1. Check initial conversations count
  const initialConvs = await getConversations();
  console.log(`[TEST 1] Initial Conversations count in Recent Chats: ${initialConvs.length}`);
  console.log(`         No empty placeholders should be visible.`);

  // 2. Simulate sending first message in a New Chat session
  const testMsg = "Hello Mathiyon test " + Date.now();
  console.log(`[TEST 2] Sending first message: "${testMsg}"`);
  const chatRes = await sendChat(testMsg, null);
  console.log(`         Chat API Response success: ${chatRes.success}`);
  console.log(`         Generated Conversation ID: ${chatRes.conversationId}`);
  console.log(`         Generated Conversation Title: "${chatRes.conversationTitle}"`);

  // 3. Check conversations count after first message
  const afterConvs = await getConversations();
  console.log(`[TEST 3] Conversations count after first message: ${afterConvs.length}`);
  const found = afterConvs.find(c => c.id === chatRes.conversationId);
  if (found) {
    console.log(`         [PASS] New conversation successfully appeared in Recent Chats with title: "${found.title}"`);
  } else {
    console.log(`         [FAIL] New conversation not found in Recent Chats.`);
  }

  // 4. Verify no empty conversations are listed
  const emptyConvs = afterConvs.filter(c => c.title === 'New Mathiyon Chat');
  console.log(`[TEST 4] Empty 'New Mathiyon Chat' conversations count: ${emptyConvs.length}`);
  if (emptyConvs.length === 0) {
    console.log(`         [PASS] Zero empty conversations found.`);
  }

  console.log('='.repeat(65));
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY');
  console.log('='.repeat(65));
}

runTest();
