const http = require('http');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYmIzNjQzMDc1MzAxZjg0YTMxMDEwZSIsImVtYWlsIjoidGVzdHVzZXJAbWF0aGl5b24uYWkiLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNzkwNjU0MDE5LCJleHAiOjE3OTMyNDYwMTl9.8qN9kVi85jEcTq8gK7LdXL4PUHRarpY5d_XA6U-aGTc';

const queries = [
  '3 > 5',
  '2.344 + 1.2',
  'derivative of x^2',
  'what is today date',
  'hi',
  'sin(30 deg)',
  '2x + 5 = 15',
  '25% of 200'
];

function test(msg) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ message: msg });
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 15000
    };
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        const j = JSON.parse(b);
        const answer = j.answer || j.response || 'N/A';
        console.log(`[${j.intent}] "${msg}" => "${answer.substring(0, 80)}"`);
        resolve();
      });
    });
    req.on('error', e => { console.log('ERR:', e.message); resolve(); });
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('='.repeat(60));
  console.log('   MATHIYON AI — LIVE SPOT CHECK');
  console.log('='.repeat(60));
  for (const q of queries) {
    await test(q);
    await new Promise(r => setTimeout(r, 600));
  }
  console.log('='.repeat(60));
  console.log('   All checks complete');
  console.log('='.repeat(60));
}

run();
