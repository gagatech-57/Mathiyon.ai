const http = require('http');
const fs = require('fs');
const path = require('path');

function postJson(urlStr, data, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const postData = JSON.stringify(data);
        const req = http.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                ...headers
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch(e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function deleteJson(urlStr, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const req = http.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch(e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function uploadFileMultipart(urlStr, filePath, originalName, token) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const fileContent = fs.readFileSync(filePath);

        const headerStr = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${originalName}"\r\nContent-Type: application/pdf\r\n\r\n`;
        const footerStr = `\r\n--${boundary}--\r\n`;

        const headerBuf = Buffer.from(headerStr, 'utf-8');
        const footerBuf = Buffer.from(footerStr, 'utf-8');
        const payloadLength = headerBuf.length + fileContent.length + footerBuf.length;

        const req = http.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': payloadLength,
                'Authorization': `Bearer ${token}`
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch(e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', reject);
        req.write(headerBuf);
        req.write(fileContent);
        req.write(footerBuf);
        req.end();
    });
}

async function runRagChatTest() {
    console.log("=================================================");
    console.log(" 🧪 PART 16 — RAG CHAT & SECURITY SUITE TEST");
    console.log("=================================================\n");

    const pdfPath = path.join(__dirname, '../mathiyon_rag_demo.pdf');
    if (!fs.existsSync(pdfPath)) {
        console.error("FATAL: mathiyon_rag_demo.pdf file not found.");
        process.exit(1);
    }

    // 1. Authenticate Users A and B
    let tokenUserA = "";
    let tokenUserB = "";

    try {
        const resA = await postJson('http://localhost:5000/api/auth/register', {
            name: "RAG Chat User A",
            email: `rag_chat_a_${Date.now()}@mathiyon.ai`,
            password: "password123"
        });
        tokenUserA = resA.body.token;

        const resB = await postJson('http://localhost:5000/api/auth/register', {
            name: "RAG Chat User B",
            email: `rag_chat_b_${Date.now()}@mathiyon.ai`,
            password: "password123"
        });
        tokenUserB = resB.body.token;

        console.log("[PASS] User Authentication Setup");
    } catch(err) {
        console.error(`[FAIL] Auth Setup: ${err.message}`);
        process.exit(1);
    }

    // 2. Upload mathiyon_rag_demo.pdf
    let docId = "";
    try {
        const uploadRes = await uploadFileMultipart('http://localhost:5000/api/files/upload', pdfPath, 'mathiyon_rag_demo.pdf', tokenUserA);
        const pass = uploadRes.status === 201 && uploadRes.body.success && uploadRes.body.document.status === 'ready';
        if (pass) docId = uploadRes.body.document.id;

        console.log(`[${pass ? 'PASS' : 'FAIL'}] PDF Upload & Extraction Pipeline`);
        console.log(`Details: ID=${docId}, Status=${uploadRes.body.document?.status}, Chunks=${uploadRes.body.document?.chunkCount}, Pages=${uploadRes.body.document?.pageCount}`);
    } catch(err) {
        console.error(`[FAIL] PDF Upload: ${err.message}`);
        process.exit(1);
    }

    // 3. Security Check: User B accessing User A's document via search (PART 8)
    try {
        const secRes = await postJson('http://localhost:5000/api/files/search', {
            query: "Mathiyon AI",
            documentIds: [docId]
        }, { 'Authorization': `Bearer ${tokenUserB}` });

        const pass = secRes.status === 403;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] User Isolation Security Check (HTTP Status: ${secRes.status})`);
    } catch(err) {
        console.error(`[FAIL] Security Check: ${err.message}`);
    }

    // 4. RAG Chat Question: "What is Mathiyon AI?"
    try {
        const chatRes = await postJson('http://localhost:5000/api/chat', {
            message: "What is Mathiyon AI?",
            documentIds: [docId]
        }, { 'Authorization': `Bearer ${tokenUserA}` });

        const pass = chatRes.status === 201 && chatRes.body.success && !!chatRes.body.response;
        const hasCitation = pass && (chatRes.body.response.includes('mathiyon_rag_demo.pdf') || chatRes.body.response.includes('Page 1'));

        console.log(`[${pass ? 'PASS' : 'FAIL'}] RAG Chat Answer Generation`);
        console.log(`Has Source Citation: ${hasCitation ? 'PASS' : 'FAIL'}`);
        console.log(`Response Output:\n${chatRes.body.response}`);
    } catch(err) {
        console.error(`[FAIL] RAG Chat Answer: ${err.message}`);
    }

    // 5. Math Engine RAG Calculation: "What is 1/3 + 1/6?"
    try {
        const mathRes = await postJson('http://localhost:5000/api/chat', {
            message: "What is 1/3 + 1/6?",
            documentIds: [docId]
        }, { 'Authorization': `Bearer ${tokenUserA}` });

        const pass = mathRes.status === 201 && mathRes.body.response.includes('1/2');
        console.log(`[${pass ? 'PASS' : 'FAIL'}] RAG + Verified Math Engine Calculation ("1/3 + 1/6")`);
        console.log(`Result Output:\n${mathRes.body.response}`);
    } catch(err) {
        console.error(`[FAIL] Math Engine RAG: ${err.message}`);
    }

    // 6. Missing Information Test: "Who founded Mathiyon AI?"
    try {
        const missingRes = await postJson('http://localhost:5000/api/chat', {
            message: "Who founded Mathiyon AI?",
            documentIds: [docId]
        }, { 'Authorization': `Bearer ${tokenUserA}` });

        const pass = missingRes.status === 201 && missingRes.body.response.includes("The document does not contain this information.");
        console.log(`[${pass ? 'PASS' : 'FAIL'}] Missing Information Behavior`);
        console.log(`Response: "${missingRes.body.response}"`);
    } catch(err) {
        console.error(`[FAIL] Missing Info Test: ${err.message}`);
    }

    // 7. Delete Document
    try {
        const delRes = await deleteJson(`http://localhost:5000/api/files/${docId}`, {
            'Authorization': `Bearer ${tokenUserA}`
        });
        const pass = delRes.status === 200 && delRes.body.success;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] Document Cleanup`);
    } catch(err) {
        console.error(`[FAIL] Cleanup: ${err.message}`);
    }

    console.log("\n=================================================");
    console.log(" 🎉 PART 16 RAG CHAT SUITE TEST COMPLETED");
    console.log("=================================================");
}

runRagChatTest();
