const http = require('http');

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

async function runE2ETests() {
    console.log("=== MATHIYON AI MATHEMATICS ENGINE E2E TESTS ===");
    
    // 1. Direct FastAPI /math/solve
    console.log("\n1. Testing FastAPI /math/solve with Linear Algebra Equation...");
    try {
        const res1 = await postJson('http://localhost:8000/math/solve', {
            question: "Solve 2x + 5 = 15",
            difficulty: "intermediate"
        });
        console.log("FastAPI Response Status:", res1.status);
        console.log("FastAPI Success:", res1.body.success);
        console.log("FastAPI Verified:", res1.body.verified);
        console.log("FastAPI Result:", res1.body.result);
        console.log("FastAPI Category:", res1.body.category);
    } catch(err) {
        console.error("FastAPI Test Failed:", err.message);
    }

    // 2. Direct FastAPI /generate Math Router Intercept
    console.log("\n2. Testing FastAPI /generate math router intercept with Calculus Query...");
    try {
        const res2 = await postJson('http://localhost:8000/generate', {
            message: "Differentiate x^2 with respect to x"
        });
        console.log("FastAPI Generate Response Status:", res2.status);
        console.log("FastAPI Intercepted Math Engine:", res2.body.response ? res2.body.response.includes("[Verified Math Engine]") : false);
        console.log("FastAPI Response Text:\n", res2.body.response);
    } catch(err) {
        console.error("FastAPI Generate Test Failed:", err.message);
    }

    // 3. Register / Login user mathiyon 1.0 to Express backend
    console.log("\n3. Authenticating user mathiyon 1.0 on Express backend...");
    let token = "";
    try {
        let authRes = await postJson('http://localhost:5000/api/auth/register', {
            name: "mathiyon 1.0",
            email: "mathiyon1.0@mathiyon.ai",
            password: "password123"
        });
        if (!authRes.body.success) {
            authRes = await postJson('http://localhost:5000/api/auth/login', {
                email: "mathiyon1.0@mathiyon.ai",
                password: "password123"
            });
        }
        if (authRes.body.token) {
            token = authRes.body.token;
            console.log("Express Login Success! JWT Token acquired.");
        } else {
            console.log("Login output:", authRes.body);
        }
    } catch(err) {
        console.error("Express Authentication Failed:", err.message);
    }

    if (token) {
        // 4. Express Backend /api/math/solve
        console.log("\n4. Testing Express /api/math/solve (Authenticated)...");
        try {
            const res3 = await postJson('http://localhost:5000/api/math/solve', {
                question: "25 °C to °F",
                difficulty: "easy"
            }, { 'Authorization': `Bearer ${token}` });
            console.log("Express Math Solve Status:", res3.status);
            console.log("Express Success:", res3.body.success);
            console.log("Express Result:", res3.body.result);
        } catch(err) {
            console.error("Express Math Solve Failed:", err.message);
        }

        // 5. Express Tamil / Tanglish Math Query via /api/math/solve
        console.log("\n5. Testing Express Tanglish Math Query (Authenticated)...");
        try {
            const res4 = await postJson('http://localhost:5000/api/math/solve', {
                question: "25 oda 15% calculate pannu",
                difficulty: "easy"
            }, { 'Authorization': `Bearer ${token}` });
            console.log("Express Tanglish Status:", res4.status);
            console.log("Express Tanglish Success:", res4.body.success);
            console.log("Express Tanglish Result:", res4.body.result);
        } catch(err) {
            console.error("Express Tanglish Failed:", err.message);
        }

        // 6. Express /api/chat with Math Intercept
        console.log("\n6. Testing Express /api/chat with Math Intent (Authenticated)...");
        try {
            const res5 = await postJson('http://localhost:5000/api/chat', {
                message: "1/3 + 1/6"
            }, { 'Authorization': `Bearer ${token}` });
            console.log("Express Chat Status:", res5.status);
            console.log("Express Chat Verified Math Badge:", res5.body.response ? res5.body.response.includes("[Verified Math Engine]") : false);
            console.log("Express Chat Response:\n", res5.body.response);
        } catch(err) {
            console.error("Express Chat Failed:", err.message);
        }
    }

    console.log("\n=== E2E TESTS COMPLETED ===");
}

runE2ETests();
