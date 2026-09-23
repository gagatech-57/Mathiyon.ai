const http = require('http');

function postJson(urlStr, data) {
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
                'Content-Length': Buffer.byteLength(postData)
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

async function runE2ETests() {
    console.log("=== MATHIYON AI MATHEMATICS ENGINE E2E TESTS ===");
    
    // Test 1: Direct FastAPI /math/solve
    console.log("\n1. Testing FastAPI /math/solve with Linear Algebra Equation...");
    try {
        const res1 = await postJson('http://localhost:8000/math/solve', {
            question: "Solve 2x + 5 = 15",
            difficulty: "intermediate"
        });
        console.log("FastAPI Response Status:", res1.status);
        console.log("FastAPI Success:", res1.body.success);
        console.log("FastAPI Verified:", res1.body.verified);
        console.log("FastAPI Answer:", res1.body.answer);
    } catch(err) {
        console.error("FastAPI Test Failed:", err.message);
    }

    // Test 2: Direct FastAPI /chat Math Router Integration
    console.log("\n2. Testing FastAPI /chat router intercept with Calculus Query...");
    try {
        const res2 = await postJson('http://localhost:8000/chat', {
            message: "Differentiate x^2 with respect to x",
            history: []
        });
        console.log("FastAPI Chat Response Status:", res2.status);
        console.log("FastAPI Chat Intercepted Math Engine:", res2.body.response.includes("[Verified Math Engine]"));
        console.log("FastAPI Chat Response Snippet:", res2.body.response.substring(0, 150) + "...");
    } catch(err) {
        console.error("FastAPI Chat Test Failed:", err.message);
    }

    // Test 3: Express Backend /api/math/solve
    console.log("\n3. Testing Express Backend /api/math/solve with Unit Conversion...");
    try {
        const res3 = await postJson('http://localhost:5000/api/math/solve', {
            question: "25 °C to °F",
            difficulty: "easy"
        });
        console.log("Express Response Status:", res3.status);
        console.log("Express Success:", res3.body.success);
        console.log("Express Result:", res3.body.result);
    } catch(err) {
        console.error("Express Test Failed:", err.message);
    }

    // Test 4: Express Backend Tamil / Tanglish Math Query
    console.log("\n4. Testing Tamil & Tanglish Math Queries...");
    try {
        const res4 = await postJson('http://localhost:5000/api/math/solve', {
            question: "25 oda 15% calculate pannu",
            difficulty: "easy"
        });
        console.log("Express Tanglish Response Status:", res4.status);
        console.log("Express Tanglish Success:", res4.body.success);
        console.log("Express Tanglish Result:", res4.body.result);
    } catch(err) {
        console.error("Express Tanglish Test Failed:", err.message);
    }

    console.log("\n=== E2E TESTS COMPLETED ===");
}

runE2ETests();
