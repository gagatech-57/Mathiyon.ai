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

async function runComprehensiveTests() {
    console.log("=================================================");
    console.log(" 🚀 MATHIYON AI FULL LOGIN & Q&A SUITE TEST");
    console.log("=================================================\n");

    const results = {
        loginTests: [],
        qaTests: []
    };

    // 1. Health Checks
    console.log("--- 1. SERVER HEALTH CHECKS ---");
    try {
        const expressHealth = await getJson('http://localhost:5000/api/health');
        console.log(`[PASS] Express Server (Port 5000): ${expressHealth.body.status || 'online'} | Database: ${expressHealth.body.database}`);
    } catch (err) {
        console.log(`[FAIL] Express Server: ${err.message}`);
    }

    try {
        const fastApiHealth = await getJson('http://localhost:8000/health');
        console.log(`[PASS] FastAPI PyTorch Service (Port 8000): ${fastApiHealth.body.status} | Framework: ${fastApiHealth.body.framework}`);
    } catch (err) {
        console.log(`[FAIL] FastAPI Service: ${err.message}`);
    }

    // 2. Authentication & Login Tests
    console.log("\n--- 2. AUTHENTICATION & LOGIN TESTS ---");

    let jwtToken = "";

    // Test 2.1: Register New User
    try {
        const regRes = await postJson('http://localhost:5000/api/auth/register', {
            name: "Mathiyon Tester",
            email: `tester_${Date.now()}@mathiyon.ai`,
            password: "SecurePassword123!"
        });
        const pass = regRes.status === 201 && regRes.body.success && !!regRes.body.token;
        if (pass) jwtToken = regRes.body.token;
        results.loginTests.push({
            name: "User Registration (POST /api/auth/register)",
            status: pass ? "PASSED" : "FAILED",
            detail: pass ? `User registered ID: ${regRes.body.user.id}` : regRes.body.message
        });
        console.log(`[${pass ? 'PASS' : 'FAIL'}] Registration Test: ${pass ? 'JWT Issued' : regRes.body.message}`);
    } catch (err) {
        results.loginTests.push({ name: "User Registration", status: "FAILED", detail: err.message });
        console.log(`[FAIL] Registration Test: ${err.message}`);
    }

    // Test 2.2: Standard Login
    try {
        const loginRes = await postJson('http://localhost:5000/api/auth/login', {
            email: "mathiyon1.0@mathiyon.ai",
            password: "password123"
        });
        const pass = loginRes.status === 200 && loginRes.body.success && !!loginRes.body.token;
        if (pass && !jwtToken) jwtToken = loginRes.body.token;
        results.loginTests.push({
            name: "Standard Login (POST /api/auth/login)",
            status: pass ? "PASSED" : "FAILED",
            detail: pass ? `User: ${loginRes.body.user.email}` : loginRes.body.message
        });
        console.log(`[${pass ? 'PASS' : 'FAIL'}] Standard Login: ${pass ? 'Successfully Authenticated' : loginRes.body.message}`);
    } catch (err) {
        results.loginTests.push({ name: "Standard Login", status: "FAILED", detail: err.message });
        console.log(`[FAIL] Standard Login: ${err.message}`);
    }

    // Test 2.3: Developer Demo Login
    try {
        const demoRes = await postJson('http://localhost:5000/api/auth/login', {
            email: "developer@mathiyon.ai",
            password: "password123"
        });
        const pass = demoRes.status === 200 && demoRes.body.success;
        results.loginTests.push({
            name: "Developer Demo Login (developer@mathiyon.ai)",
            status: pass ? "PASSED" : "FAILED",
            detail: pass ? `User Name: ${demoRes.body.user.name}` : demoRes.body.message
        });
        console.log(`[${pass ? 'PASS' : 'FAIL'}] Demo Account Login: ${pass ? 'Authenticated Demo User' : demoRes.body.message}`);
    } catch (err) {
        results.loginTests.push({ name: "Developer Demo Login", status: "FAILED", detail: err.message });
        console.log(`[FAIL] Demo Login: ${err.message}`);
    }

    // Test 2.4: Session Verification (GET /api/auth/me)
    if (jwtToken) {
        try {
            const meRes = await getJson('http://localhost:5000/api/auth/me', {
                'Authorization': `Bearer ${jwtToken}`
            });
            const pass = meRes.status === 200 && meRes.body.success && meRes.body.user;
            results.loginTests.push({
                name: "Token Verification (GET /api/auth/me)",
                status: pass ? "PASSED" : "FAILED",
                detail: pass ? `Verified User: ${meRes.body.user.name}` : meRes.body.message
            });
            console.log(`[${pass ? 'PASS' : 'FAIL'}] Token Session Check: ${pass ? 'Token Valid' : meRes.body.message}`);
        } catch (err) {
            results.loginTests.push({ name: "Token Verification", status: "FAILED", detail: err.message });
            console.log(`[FAIL] Token Session Check: ${err.message}`);
        }
    }

    // Test 2.5: Invalid Password Handling
    try {
        const errRes = await postJson('http://localhost:5000/api/auth/login', {
            email: "developer@mathiyon.ai",
            password: "wrong_password_999"
        });
        const pass = errRes.status === 401 && !errRes.body.success;
        results.loginTests.push({
            name: "Invalid Password Security Handling",
            status: pass ? "PASSED" : "FAILED",
            detail: pass ? `Rejected with message: ${errRes.body.message}` : "Security breach"
        });
        console.log(`[${pass ? 'PASS' : 'FAIL'}] Security Check (Invalid Password): ${pass ? 'Correctly Denied' : 'Allowed'}`);
    } catch (err) {
        console.log(`[FAIL] Security Check: ${err.message}`);
    }

    // 3. Question & Answer (Q&A) Engine Tests
    console.log("\n--- 3. QUESTION & ANSWER (Q&A) TESTS ---");

    const questionsToTest = [
        {
            category: "Linear Algebra",
            question: "Solve 2x + 5 = 15",
            difficulty: "intermediate",
            type: "math"
        },
        {
            category: "Calculus (Differentiation)",
            question: "Differentiate x^2 + 3x + 5 with respect to x",
            difficulty: "intermediate",
            type: "math"
        },
        {
            category: "Calculus (Integration)",
            question: "Integrate 2x with respect to x",
            difficulty: "intermediate",
            type: "math"
        },
        {
            category: "Unit Conversion",
            question: "25 °C to °F",
            difficulty: "easy",
            type: "math"
        },
        {
            category: "Fractions & Arithmetic",
            question: "1/3 + 1/6",
            difficulty: "easy",
            type: "math"
        },
        {
            category: "Tanglish Multilingual Query",
            question: "25 oda 15% calculate pannu",
            difficulty: "easy",
            type: "math"
        },
        {
            category: "General Intelligence Chat",
            question: "What is Mathiyon AI and what are its features?",
            type: "chat"
        }
    ];

    for (const item of questionsToTest) {
        console.log(`\nTesting Q&A [${item.category}]: "${item.question}"`);
        if (item.type === "math") {
            try {
                const solveRes = await postJson('http://localhost:5000/api/math/solve', {
                    question: item.question,
                    difficulty: item.difficulty || "intermediate"
                }, jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {});

                const pass = solveRes.status === 200 && solveRes.body.success;
                const answer = solveRes.body.result || solveRes.body.explanation || "No result";
                console.log(`Result: ${answer}`);
                console.log(`Verified: ${solveRes.body.verified}`);

                results.qaTests.push({
                    category: item.category,
                    question: item.question,
                    answer: answer,
                    verified: solveRes.body.verified,
                    status: pass ? "PASSED" : "FAILED"
                });
            } catch (err) {
                console.log(`[FAIL] Q&A error: ${err.message}`);
                results.qaTests.push({
                    category: item.category,
                    question: item.question,
                    answer: err.message,
                    status: "FAILED"
                });
            }
        } else {
            try {
                const chatRes = await postJson('http://localhost:5000/api/chat', {
                    message: item.question,
                    model: "Mathiyon Neural v4.0"
                }, jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {});

                const pass = chatRes.status === 200 && chatRes.body.success;
                const answer = chatRes.body.response || chatRes.body.messageText || "No response";
                console.log(`Response Snippet: ${answer.substring(0, 150)}...`);

                results.qaTests.push({
                    category: item.category,
                    question: item.question,
                    answer: answer,
                    status: pass ? "PASSED" : "FAILED"
                });
            } catch (err) {
                console.log(`[FAIL] Chat Q&A error: ${err.message}`);
                results.qaTests.push({
                    category: item.category,
                    question: item.question,
                    answer: err.message,
                    status: "FAILED"
                });
            }
        }
    }

    console.log("\n=================================================");
    console.log(" 🎉 ALL TESTS COMPLETED");
    console.log("=================================================");
}

runComprehensiveTests();
