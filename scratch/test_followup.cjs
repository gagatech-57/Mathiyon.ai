const http = require('http');

function post(url, data, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function batchTest() {
  const email = `test_${Date.now()}@test.com`;
  const reg = await post('http://localhost:5000/api/auth/register', { name: 'Test', email, password: 'password123' });
  const token = reg.token;

  console.log('=== TEST 1: HTML -> "more" ===');
  const h1 = await post('http://localhost:5000/api/chat', { message: 'what is html' }, token);
  const h2 = await post('http://localhost:5000/api/chat', { message: 'more', conversationId: h1.conversationId }, token);
  console.log('Q: "more" (after html)');
  console.log('Ans:', h2.answer.substring(0, 200).replace(/\n/g, ' '));
  console.log('Verified:', h2.answer.includes('HTML') || h2.answer.includes('tag') || h2.answer.includes('element'));

  console.log('\n=== TEST 2: Python -> "give examples" ===');
  const p1 = await post('http://localhost:5000/api/chat', { message: 'python' }, token);
  const p2 = await post('http://localhost:5000/api/chat', { message: 'give examples', conversationId: p1.conversationId }, token);
  console.log('Q: "give examples" (after python)');
  console.log('Ans:', p2.answer.substring(0, 200).replace(/\n/g, ' '));
  console.log('Verified:', p2.answer.length > 50);

  console.log('\n=== TEST 3: Time -> "in Tokyo" ===');
  const t1 = await post('http://localhost:5000/api/chat', { message: 'time' }, token);
  const t2 = await post('http://localhost:5000/api/chat', { message: 'in Tokyo', conversationId: t1.conversationId }, token);
  console.log('Q: "in Tokyo" (after time)');
  console.log('Ans:', t2.answer);
  console.log('Verified:', t2.answer.toLowerCase().includes('tokyo'));

  console.log('\n=== ALL BATCH TESTS COMPLETED ===');
}

batchTest().catch(console.error);
