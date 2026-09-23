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

function getJson(urlStr, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const req = http.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'GET',
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

        const headerStr = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${originalName}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
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

async function runRagTestSuite() {
    console.log("=================================================");
    console.log(" 📚 MATHIYON AI PHASE 4 RAG & DOC INTELLIGENCE TEST");
    console.log("=================================================\n");

    const testSummary = {
        passed: 0,
        failed: 0,
        totalDocsTested: 0,
        totalChunksCreated: 0
    };

    // 1. Authenticate User A & User B for isolation tests
    console.log("--- 1. USER AUTHENTICATION & ISOLATION SETUP ---");
    let tokenUserA = "";
    let tokenUserB = "";

    try {
        const resA = await postJson('http://localhost:5000/api/auth/register', {
            name: "RAG User A",
            email: `rag_user_a_${Date.now()}@mathiyon.ai`,
            password: "password123"
        });
        tokenUserA = resA.body.token;

        const resB = await postJson('http://localhost:5000/api/auth/register', {
            name: "RAG User B",
            email: `rag_user_b_${Date.now()}@mathiyon.ai`,
            password: "password123"
        });
        tokenUserB = resB.body.token;

        console.log("[PASS] Authenticated User A & User B successfully.");
        testSummary.passed++;
    } catch(err) {
        console.log(`[FAIL] User Auth Setup: ${err.message}`);
        testSummary.failed++;
    }

    // 2. Prepare Sample Documents for Upload
    const tempDir = path.join(__dirname, 'temp_rag_files');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const txtPath = path.join(tempDir, 'react_guide.txt');
    fs.writeFileSync(txtPath, `Mathiyon Architecture and React Guide
Chapter 1: React Router Overview
React Router v7 provides client-side routing and declarative navigation for modern web applications.
It enables single-page application routing without page reloads.

Chapter 2: State Management & Fast Context
Mathiyon AI uses custom reactive state management and Framer Motion spring drawer animations.
The platform integrates PyTorch SLM neural models with SymPy deterministic mathematics engine.

Chapter 3: Financial Growth Calculations
Company annual growth rate in Q1 was 15% and total base revenue reached $50000 dollars.`);

    const invalidPath = path.join(tempDir, 'malicious_script.exe');
    fs.writeFileSync(invalidPath, 'MZ binary dummy');

    // 3. Test Invalid File Upload Validation
    console.log("\n--- 2. FILE VALIDATION & ERROR HANDLING TESTS ---");
    try {
        const invalidRes = await uploadFileMultipart('http://localhost:5000/api/files/upload', invalidPath, 'malicious.exe', tokenUserA);
        const pass = invalidRes.status === 400 && invalidRes.body.success === false;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] Invalid File Extension (.exe) Validation: ${pass ? 'Rejected successfully' : 'Security Breach'}`);
        if (pass) testSummary.passed++; else testSummary.failed++;
    } catch(err) {
        console.log(`[FAIL] File Validation Test: ${err.message}`);
        testSummary.failed++;
    }

    // 4. Test Valid TXT Document Upload & Processing
    console.log("\n--- 3. DOCUMENT UPLOAD & EXTRACTION PIPELINE ---");
    let docIdUserA = "";

    try {
        const startTime = Date.now();
        const uploadRes = await uploadFileMultipart('http://localhost:5000/api/files/upload', txtPath, 'react_guide.txt', tokenUserA);
        const latency = Date.now() - startTime;

        const pass = uploadRes.status === 201 && uploadRes.body.success && uploadRes.body.document.status === 'ready';
        if (pass) {
            docIdUserA = uploadRes.body.document.id;
            testSummary.totalDocsTested++;
            testSummary.totalChunksCreated += uploadRes.body.document.chunkCount;
        }

        console.log(`[${pass ? 'PASS' : 'FAIL'}] Upload react_guide.txt (Latency: ${latency}ms)`);
        console.log(`Details: Status=${uploadRes.body.document?.status}, Chunks=${uploadRes.body.document?.chunkCount}, Pages=${uploadRes.body.document?.pageCount}`);
        if (pass) testSummary.passed++; else testSummary.failed++;
    } catch(err) {
        console.log(`[FAIL] TXT Upload Pipeline: ${err.message}`);
        testSummary.failed++;
    }

    // 5. Test Vector Similarity Search (POST /api/files/search)
    console.log("\n--- 4. VECTOR SIMILARITY SEARCH TESTS ---");
    try {
        const searchRes = await postJson('http://localhost:5000/api/files/search', {
            query: "What does this say about React Router?",
            documentId: docIdUserA,
            topK: 3
        }, { 'Authorization': `Bearer ${tokenUserA}` });

        const pass = searchRes.status === 200 && searchRes.body.success && searchRes.body.chunks.length > 0;
        const topChunk = pass ? searchRes.body.chunks[0] : null;

        console.log(`[${pass ? 'PASS' : 'FAIL'}] Vector Similarity Search (Top-K Chunks: ${searchRes.body.chunks ? searchRes.body.chunks.length : 0})`);
        if (topChunk) {
            console.log(`Top Score: ${topChunk.score} | Page: ${topChunk.page} | Text: "${topChunk.text.substring(0, 80)}..."`);
        }
        if (pass) testSummary.passed++; else testSummary.failed++;
    } catch(err) {
        console.log(`[FAIL] Vector Search Test: ${err.message}`);
        testSummary.failed++;
    }

    // 6. Test User Document Isolation (IDOR Security Test)
    console.log("\n--- 5. SECURITY & USER DOCUMENT ISOLATION TESTS ---");
    try {
        // User B attempts to search User A's document
        const searchIsoRes = await postJson('http://localhost:5000/api/files/search', {
            query: "React Router",
            documentId: docIdUserA
        }, { 'Authorization': `Bearer ${tokenUserB}` });

        // User B should get 0 chunks returned
        const pass = searchIsoRes.status === 200 && searchIsoRes.body.chunks.length === 0;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] IDOR Protection (User B querying User A's doc): ${pass ? 'Isolated (0 chunks returned)' : 'SECURITY BREACH'}`);
        if (pass) testSummary.passed++; else testSummary.failed++;
    } catch(err) {
        console.log(`[FAIL] User Isolation Test: ${err.message}`);
        testSummary.failed++;
    }

    // 7. Test RAG Question & Citation Flow
    console.log("\n--- 6. RAG CHAT & CITATION GENERATION TESTS ---");
    try {
        const startTime = Date.now();
        const ragRes = await postJson('http://localhost:5000/api/chat', {
            message: "What does this document say about React Router?",
            documentId: docIdUserA
        }, { 'Authorization': `Bearer ${tokenUserA}` });
        const latency = Date.now() - startTime;

        const pass = ragRes.status === 201 && ragRes.body.success && !!ragRes.body.response;
        const hasCitation = pass && ragRes.body.response.includes('react_guide.txt');

        console.log(`[${pass ? 'PASS' : 'FAIL'}] RAG Query Execution (AI Latency: ${latency}ms)`);
        console.log(`Contains Source Citation: ${hasCitation ? 'YES' : 'NO'}`);
        console.log(`Response Output:\n${ragRes.body.response}`);
        if (pass) testSummary.passed++; else testSummary.failed++;
    } catch(err) {
        console.log(`[FAIL] RAG Chat Test: ${err.message}`);
        testSummary.failed++;
    }

    // 8. Test Missing Information Handling
    console.log("\n--- 7. MISSING INFORMATION HANDLING TEST ---");
    try {
        const missingRes = await postJson('http://localhost:5000/api/chat', {
            message: "What is the capital of Mars?",
            documentId: docIdUserA
        }, { 'Authorization': `Bearer ${tokenUserA}` });

        const pass = missingRes.status === 201 && missingRes.body.response.includes("couldn't find that information");
        console.log(`[${pass ? 'PASS' : 'FAIL'}] Missing Info Response: "${missingRes.body.response}"`);
        if (pass) testSummary.passed++; else testSummary.failed++;
    } catch(err) {
        console.log(`[FAIL] Missing Info Test: ${err.message}`);
        testSummary.failed++;
    }

    // 9. Requirement 17: RAG + Math Engine Hybrid Calculation
    console.log("\n--- 8. REQUIREMENT 17: RAG + MATH ENGINE HYBRID TEST ---");
    try {
        const mathRagRes = await postJson('http://localhost:5000/api/chat', {
            message: "Calculate 15% of 50000 revenue from this document",
            documentId: docIdUserA
        }, { 'Authorization': `Bearer ${tokenUserA}` });

        const pass = mathRagRes.status === 201 && mathRagRes.body.response.includes('7500');
        console.log(`[${pass ? 'PASS' : 'FAIL'}] RAG + Verified Math Engine Integration`);
        console.log(`Calculated Output:\n${mathRagRes.body.response}`);
        if (pass) testSummary.passed++; else testSummary.failed++;
    } catch(err) {
        console.log(`[FAIL] RAG + Math Engine Test: ${err.message}`);
        testSummary.failed++;
    }

    // 10. Test Document Deletion API (DELETE /api/files/:id)
    console.log("\n--- 9. DOCUMENT DELETION TEST ---");
    try {
        const delRes = await deleteJson(`http://localhost:5000/api/files/${docIdUserA}`, {
            'Authorization': `Bearer ${tokenUserA}`
        });

        const pass = delRes.status === 200 && delRes.body.success;
        console.log(`[${pass ? 'PASS' : 'FAIL'}] Document Deletion: ${pass ? 'Document and indices removed' : delRes.body.message}`);
        if (pass) testSummary.passed++; else testSummary.failed++;
    } catch(err) {
        console.log(`[FAIL] Document Deletion Test: ${err.message}`);
        testSummary.failed++;
    }

    // Clean up temporary files
    try {
        fs.unlinkSync(txtPath);
        fs.unlinkSync(invalidPath);
        fs.rmdirSync(tempDir);
    } catch(e) {}

    console.log("\n=================================================");
    console.log(` 🎉 RAG TEST SUITE COMPLETED: ${testSummary.passed} PASSED, ${testSummary.failed} FAILED`);
    console.log(` Total Documents Processed: ${testSummary.totalDocsTested} | Total Chunks Vectorized: ${testSummary.totalChunksCreated}`);
    console.log("=================================================");
}

runRagTestSuite();
