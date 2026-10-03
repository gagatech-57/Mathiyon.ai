"""
Mathiyon AI — Phase 11.9 Benchmark Prompts Generator
Creates a deterministic 300-prompt dataset across 5 core quality categories:
1. General English (60 prompts)
2. Coding (60 prompts)
3. Mathematics (60 prompts)
4. Instruction Following (60 prompts)
5. Reasoning (60 prompts)

Also includes tags & metadata for RAG, Tool Routing, API, and Context evaluation.
Saves output to: ai-service/evaluation/v1_3/quality/benchmark_prompts.json
"""

import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
QUALITY_DIR = os.path.join(BASE_DIR, "evaluation", "v1_3", "quality")
os.makedirs(QUALITY_DIR, exist_ok=True)

PROMPT_DATA = []

# ==============================================================================
# 1. GENERAL ENGLISH (60 Prompts)
# ==============================================================================
english_prompts = [
    # Definitions & Factual Explanations (20)
    ("ENG_001", "definition", "What is artificial intelligence?", "AI is the simulation of human intelligence by computer systems.", "contains", "intelligence"),
    ("ENG_002", "definition", "What is machine learning?", "Machine learning is a subset of AI enabling systems to learn from data.", "contains", "data"),
    ("ENG_003", "definition", "What is deep learning?", "Deep learning uses multi-layer neural networks to learn representations.", "contains", "neural network"),
    ("ENG_004", "definition", "What is an operating system?", "An OS manages computer hardware and software resources.", "contains", "hardware"),
    ("ENG_005", "definition", "What is a database?", "A database is an organized collection of structured data.", "contains", "data"),
    ("ENG_006", "definition", "What is cloud computing?", "Cloud computing delivers computing services over the internet.", "contains", "internet"),
    ("ENG_007", "definition", "What is software architecture?", "Software architecture defines high-level structures of software systems.", "contains", "structure"),
    ("ENG_008", "definition", "What is a web server?", "A web server serves web content to clients over HTTP.", "contains", "http"),
    ("ENG_009", "definition", "What is cybersecurity?", "Cybersecurity protects systems and networks from digital attacks.", "contains", "protect"),
    ("ENG_010", "definition", "What is cryptography?", "Cryptography is the practice of securing communication using encryption.", "contains", "encryption"),
    ("ENG_011", "factual", "What is the capital of France?", "Paris", "contains", "paris"),
    ("ENG_012", "factual", "How many continents are there on Earth?", "7 continents", "contains", "7"),
    ("ENG_013", "factual", "What is photosynthesis?", "Photosynthesis is the process plants use to convert sunlight into food.", "contains", "plants"),
    ("ENG_014", "factual", "What is gravity?", "Gravity is a fundamental force pulling objects toward each other.", "contains", "force"),
    ("ENG_015", "factual", "What is the speed of light in a vacuum?", "Approximately 299,792,458 meters per second.", "contains", "299"),
    ("ENG_016", "factual", "What is an atom?", "An atom is the basic unit of a chemical element.", "contains", "element"),
    ("ENG_017", "factual", "Explain the structure of DNA.", "DNA is a double helix structure composed of nucleotides.", "contains", "double helix"),
    ("ENG_018", "factual", "What is renewable energy?", "Energy from natural resources that replenish faster than consumed.", "contains", "energy"),
    ("ENG_019", "factual", "What is the water cycle?", "The water cycle involves evaporation, condensation, and precipitation.", "contains", "evaporation"),
    ("ENG_020", "factual", "What is a compiler?", "A compiler translates source code into machine executable code.", "contains", "code"),

    # Technical Summaries & Explanations (20)
    ("ENG_021", "technical", "Explain how the internet works in simple terms.", "The internet connects computers via global network protocols to transfer data.", "contains", "network"),
    ("ENG_022", "technical", "Explain the concept of algorithms.", "An algorithm is a step-by-step set of rules for solving a problem.", "contains", "step"),
    ("ENG_023", "technical", "Explain the difference between hardware and software.", "Hardware is physical components while software is digital instructions.", "contains", "physical"),
    ("ENG_024", "technical", "Explain what an API is in simple terms.", "An API allows two software applications to communicate with each other.", "contains", "communicate"),
    ("ENG_025", "technical", "Explain the concept of cache memory.", "Cache is small high-speed memory storing frequently accessed data.", "contains", "fast"),
    ("ENG_026", "technical", "What is distributed computing?", "Distributed computing processes tasks across multiple connected computers.", "contains", "multiple"),
    ("ENG_027", "technical", "What is quantum computing?", "Quantum computing uses qubits and quantum mechanics for calculation.", "contains", "qubit"),
    ("ENG_028", "technical", "Explain the difference between synchronous and asynchronous execution.", "Synchronous blocks execution until complete; asynchronous runs non-blocking.", "contains", "blocking"),
    ("ENG_029", "technical", "What is virtual memory?", "Virtual memory extends RAM by using disk storage space.", "contains", "ram"),
    ("ENG_030", "technical", "What is Domain Name System (DNS)?", "DNS translates human-readable domain names into IP addresses.", "contains", "ip"),
    ("ENG_031", "technical", "What is object-oriented programming?", "OOP organizes software design around objects containing data and methods.", "contains", "objects"),
    ("ENG_032", "technical", "What is functional programming?", "Functional programming treats computation as evaluation of pure functions.", "contains", "functions"),
    ("ENG_033", "technical", "Explain scalability in software systems.", "Scalability is the capability of a system to handle growing workloads.", "contains", "workload"),
    ("ENG_034", "technical", "What is microservice architecture?", "Microservices split applications into small independent services.", "contains", "independent"),
    ("ENG_035", "technical", "What is a load balancer?", "A load balancer distributes network traffic across multiple servers.", "contains", "traffic"),
    ("ENG_036", "technical", "What is containerization?", "Containerization packages code and dependencies into isolated containers.", "contains", "container"),
    ("ENG_037", "technical", "What is CI/CD?", "Continuous Integration and Continuous Deployment automates code delivery.", "contains", "automate"),
    ("ENG_038", "technical", "Explain the role of an operating system kernel.", "The kernel manages system resources and CPU memory communication.", "contains", "kernel"),
    ("ENG_039", "technical", "What is version control?", "Version control tracks and manages changes to software code over time.", "contains", "track"),
    ("ENG_040", "technical", "What is open source software?", "Open source software makes its source code publicly available for modification.", "contains", "source code"),

    # Conversational & Short Answers (20)
    ("ENG_041", "conversation", "Hello! How can you help me today?", "Hello! I am Mathiyon AI, ready to assist with language, code, and math.", "contains", "hello"),
    ("ENG_042", "conversation", "Good morning! What features do you support?", "Good morning! I support coding, text generation, math solving, and document RAG.", "contains", "math"),
    ("ENG_043", "conversation", "Hi there! What is your name?", "My name is Mathiyon AI.", "contains", "mathiyon"),
    ("ENG_044", "conversation", "Who created you?", "I am developed as part of Mathiyon AI platform.", "contains", "mathiyon"),
    ("ENG_045", "conversation", "What is your primary purpose?", "To provide fast, verified AI intelligence across math, code, and language.", "contains", "intelligence"),
    ("ENG_046", "conversation", "Tell me a fun fact about technology.", "The first electronic computer ENIAC weighed over 27 tons.", "contains", "computer"),
    ("ENG_047", "conversation", "How are you doing today?", "I am functioning optimally and ready to assist you.", "contains", "assist"),
    ("ENG_048", "conversation", "Can you help me learn programming?", "Yes, I can explain concepts, write code, and help debug errors.", "contains", "code"),
    ("ENG_049", "conversation", "What programming language should I learn first?", "Python and JavaScript are great beginner-friendly languages.", "contains", "python"),
    ("ENG_050", "conversation", "Thank you for your assistance!", "You are very welcome!", "contains", "welcome"),
    ("ENG_051", "short_answer", "Rewrite in active voice: 'The code was tested by the engineer.'", "The engineer tested the code.", "contains", "tested"),
    ("ENG_052", "short_answer", "Rewrite politely: 'Give me the file now.'", "Could you please send me the file?", "contains", "please"),
    ("ENG_053", "short_answer", "Rewrite concisely: 'Due to the fact that we have errors, we must fix them.'", "We must fix the errors.", "contains", "errors"),
    ("ENG_054", "short_answer", "Summarize importance of clean code.", "Clean code improves readability, maintainability, and reduces bugs.", "contains", "readability"),
    ("ENG_055", "short_answer", "What does HTML stand for?", "HyperText Markup Language", "contains", "hypertext"),
    ("ENG_056", "short_answer", "What does CSS stand for?", "Cascading Style Sheets", "contains", "cascading"),
    ("ENG_057", "short_answer", "What does HTTP stand for?", "Hypertext Transfer Protocol", "contains", "transfer"),
    ("ENG_058", "short_answer", "What does SQL stand for?", "Structured Query Language", "contains", "structured"),
    ("ENG_059", "short_answer", "What is a URL?", "A Uniform Resource Locator addresses web resources.", "contains", "locator"),
    ("ENG_060", "short_answer", "What is a JSON file?", "JSON is a lightweight data-interchange text format.", "contains", "format")
]

for pid, subcat, prompt, ref, etype, pattern in english_prompts:
    PROMPT_DATA.append({
        "id": pid,
        "category": "general_english",
        "sub_category": subcat,
        "prompt": prompt,
        "reference_answer": ref,
        "deterministic_eval": True,
        "eval_type": etype,
        "eval_pattern": pattern
    })

# ==============================================================================
# 2. CODING (60 Prompts)
# ==============================================================================
coding_prompts = [
    # JavaScript / TypeScript / React / Node.js (20)
    ("COD_001", "javascript", "Write a JavaScript function to reverse a string.", "function reverseString(str) { return str.split('').reverse().join(''); }", "contains", "split"),
    ("COD_002", "javascript", "Explain the difference between let and const in JavaScript.", "let allows re-assignment; const creates read-only constant bindings.", "contains", "let"),
    ("COD_003", "javascript", "Write a JavaScript function to check if a number is even.", "function isEven(num) { return num % 2 === 0; }", "contains", "%"),
    ("COD_004", "javascript", "Write an arrow function in JS to square a number.", "const square = (x) => x * x;", "contains", "=>"),
    ("COD_005", "javascript", "What is a Promise in JavaScript?", "A Promise represents eventual completion or failure of an async operation.", "contains", "async"),
    ("COD_006", "typescript", "Define a TypeScript interface for a User object with name and age.", "interface User { name: string; age: number; }", "contains", "interface"),
    ("COD_007", "typescript", "What is the difference between interface and type in TypeScript?", "Interface is for object shapes; type alias can define unions and primitives.", "contains", "interface"),
    ("COD_008", "react", "What is useState hook in React?", "useState declares state variables in functional components.", "contains", "state"),
    ("COD_009", "react", "What is useEffect hook in React?", "useEffect performs side effects in functional components.", "contains", "effect"),
    ("COD_010", "react", "Write a simple React functional component that renders Hello World.", "function Hello() { return <h1>Hello World</h1>; }", "contains", "return"),
    ("COD_011", "nodejs", "Write an Express route in Node.js for GET /api/health returning status ok.", "app.get('/api/health', (req, res) => res.json({ status: 'ok' }));", "contains", "get"),
    ("COD_012", "nodejs", "What is event loop in Node.js?", "The event loop handles asynchronous non-blocking I/O operations.", "contains", "event loop"),
    ("COD_013", "javascript", "Write JS code to find the max number in an array.", "Math.max(...arr)", "contains", "max"),
    ("COD_014", "javascript", "Write JS code to filter even numbers from array.", "arr.filter(x => x % 2 === 0)", "contains", "filter"),
    ("COD_015", "javascript", "Write JS code to map an array of numbers to their squares.", "arr.map(x => x * x)", "contains", "map"),
    ("COD_016", "javascript", "What is closures in JavaScript?", "A closure gives access to an outer function's scope from an inner function.", "contains", "scope"),
    ("COD_017", "javascript", "What is hoisting in JavaScript?", "Hoisting moves declarations to top of their scope before execution.", "contains", "top"),
    ("COD_018", "typescript", "Write TS function signature taking string array and returning number.", "function countItems(items: string[]): number", "contains", "string[]"),
    ("COD_019", "react", "What is JSX in React?", "JSX is a syntax extension for JS producing React elements.", "contains", "syntax"),
    ("COD_020", "nodejs", "What is middleware in Express.js?", "Middleware functions have access to request, response, and next function.", "contains", "next")
]

# Python & SQL (20)
coding_prompts += [
    ("COD_021", "python", "Write a Python function to check if a string is a palindrome.", "def is_palindrome(s): return s == s[::-1]", "contains", "::-1"),
    ("COD_022", "python", "Write a Python list comprehension to filter positive numbers.", "[x for x in nums if x > 0]", "contains", "for"),
    ("COD_023", "python", "Write a Python function to compute factorial recursively.", "def factorial(n): return 1 if n <= 1 else n * factorial(n-1)", "contains", "factorial"),
    ("COD_024", "python", "What is the difference between list and tuple in Python?", "Lists are mutable; tuples are immutable.", "contains", "mutable"),
    ("COD_025", "python", "Write Python code to read a text file safely using with statement.", "with open('file.txt', 'r') as f: content = f.read()", "contains", "open"),
    ("COD_026", "python", "What is a decorator in Python?", "A decorator wraps a function to modify its behavior.", "contains", "function"),
    ("COD_027", "python", "Write a Python dictionary comprehension squaring numbers 1 to 5.", "{x: x**2 for x in range(1, 6)}", "contains", "range"),
    ("COD_028", "python", "What is global interpreter lock (GIL) in Python?", "GIL prevents multiple native threads from executing Python bytecodes simultaneously.", "contains", "thread"),
    ("COD_029", "sql", "Write SQL query to select all users where age > 18.", "SELECT * FROM users WHERE age > 18;", "contains", "SELECT"),
    ("COD_030", "sql", "Write SQL query to count total orders per customer.", "SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id;", "contains", "GROUP BY"),
    ("COD_031", "sql", "What is the difference between INNER JOIN and LEFT JOIN in SQL?", "INNER JOIN returns matching rows; LEFT JOIN returns all left rows.", "contains", "join"),
    ("COD_032", "sql", "Write SQL query to delete user with id = 5.", "DELETE FROM users WHERE id = 5;", "contains", "DELETE"),
    ("COD_033", "sql", "Write SQL query to insert a new user (name, email).", "INSERT INTO users (name, email) VALUES ('Alice', 'alice@test.com');", "contains", "INSERT"),
    ("COD_034", "sql", "What is an index in SQL database?", "An index speeds up data retrieval operations on tables.", "contains", "speed"),
    ("COD_035", "python", "Write Python code to merge two dictionaries.", "dict1 | dict2", "contains", "dict"),
    ("COD_036", "python", "What is __init__ method in Python class?", "__init__ is the class constructor initializing instance attributes.", "contains", "constructor"),
    ("COD_037", "sql", "Write SQL query to update user status to active.", "UPDATE users SET status = 'active';", "contains", "UPDATE"),
    ("COD_038", "sql", "What is primary key in database table?", "A primary key uniquely identifies each record in a table.", "contains", "uniquely"),
    ("COD_039", "python", "Write Python code to parse JSON string.", "import json; data = json.loads(json_str)", "contains", "json"),
    ("COD_040", "python", "What is virtualenv in Python?", "virtualenv creates an isolated Python environment for dependencies.", "contains", "environment")
]

# Debugging, Code Explanation & Transformation (20)
coding_prompts += [
    ("COD_041", "debugging", "Debug JS error: Uncaught TypeError: Cannot read property 'map' of undefined.", "Ensure the variable is initialized as an array before calling .map().", "contains", "array"),
    ("COD_042", "debugging", "Debug Python error: IndentationError: unexpected indent.", "Fix misaligned spaces or tabs in Python indentation.", "contains", "indent"),
    ("COD_043", "debugging", "Debug SQL error: Syntax error near 'WHERE' in UPDATE statement.", "Ensure SET clause comes before WHERE clause in UPDATE syntax.", "contains", "SET"),
    ("COD_044", "debugging", "Debug React error: Too many re-renders. React limits the number of renders.", "Avoid calling setState directly inside component body without useEffect or event handler.", "contains", "setState"),
    ("COD_045", "code_explanation", "Explain what this JS code does: `arr.reduce((acc, curr) => acc + curr, 0)`", "Calculates the sum of all elements in the array.", "contains", "sum"),
    ("COD_046", "code_explanation", "Explain what this Python code does: `list(set(items))`", "Removes duplicate items from a list.", "contains", "duplicate"),
    ("COD_047", "code_explanation", "Explain what this SQL query does: `SELECT DISTINCT country FROM users;`", "Returns list of unique countries from users table.", "contains", "unique"),
    ("COD_048", "code_explanation", "Explain what this regex does: `^[a-zA-Z0-9]+$`", "Matches alphanumeric strings with no special characters.", "contains", "alphanumeric"),
    ("COD_049", "transformation", "Convert Python loop to list comprehension: `res=[]; for x in nums: res.append(x*2)`", "`[x*2 for x in nums]`", "contains", "for"),
    ("COD_050", "transformation", "Convert JS ES5 function to ES6 arrow function: `function add(a, b) { return a + b; }`", "`const add = (a, b) => a + b;`", "contains", "=>"),
    ("COD_051", "transformation", "Convert SQL WHERE IN to EXISTS subquery.", "Use WHERE EXISTS (SELECT 1 FROM ... WHERE ...)", "contains", "EXISTS"),
    ("COD_052", "debugging", "Debug Python KeyError: 'user_id' in dict lookup.", "Use dict.get('user_id') or verify key exists.", "contains", "get"),
    ("COD_053", "debugging", "Debug JS ReferenceError: x is not defined.", "Declare variable x using let, const, or var before using it.", "contains", "declare"),
    ("COD_054", "code_explanation", "Explain JS destructuring: `const { name, age } = user;`", "Extracts name and age properties from user object.", "contains", "extract"),
    ("COD_055", "code_explanation", "Explain Python `*args` and `**kwargs`.", "`*args` passes variable positional arguments; `**kwargs` passes keyword arguments.", "contains", "arguments"),
    ("COD_056", "transformation", "Refactor callback to async/await in JS.", "Use `await fetch(...)` instead of `.then(...)`", "contains", "await"),
    ("COD_057", "debugging", "Debug Node.js error: ERR_HTTP_HEADERS_SENT.", "Prevent sending response multiple times in route handler.", "contains", "response"),
    ("COD_058", "code_explanation", "Explain SQL `HAVING` vs `WHERE` clause.", "`WHERE` filters rows before grouping; `HAVING` filters aggregated groups.", "contains", "group"),
    ("COD_059", "transformation", "Convert JS string concatenation to template literal.", "Use `` `${a} ${b}` `` instead of `a + ' ' + b`", "contains", "${"),
    ("COD_060", "debugging", "Debug Python RecursionError: maximum recursion depth exceeded.", "Ensure base condition is reachable to terminate recursion.", "contains", "base")
]

for pid, subcat, prompt, ref, etype, pattern in coding_prompts:
    PROMPT_DATA.append({
        "id": pid,
        "category": "coding",
        "sub_category": subcat,
        "prompt": prompt,
        "reference_answer": ref,
        "deterministic_eval": True,
        "eval_type": etype,
        "eval_pattern": pattern
    })

# ==============================================================================
# 3. MATHEMATICS (60 Prompts) - Routed through SymPy Math Engine
# ==============================================================================
math_prompts = [
    # Arithmetic & Fractions (12)
    ("MATH_001", "arithmetic", "Solve: 15 + 27", "42", "sympy_math", "42"),
    ("MATH_002", "arithmetic", "Calculate: 144 / 12", "12", "sympy_math", "12"),
    ("MATH_003", "fractions", "Calculate: 1/3 + 1/6", "1/2", "sympy_math", "1/2"),
    ("MATH_004", "fractions", "Solve: 3/4 - 1/2", "1/4", "sympy_math", "1/4"),
    ("MATH_005", "arithmetic", "Solve: 25 * 4", "100", "sympy_math", "100"),
    ("MATH_006", "arithmetic", "Calculate: 2^8", "256", "sympy_math", "256"),
    ("MATH_007", "percentages", "What is 20% of 150?", "30", "sympy_math", "30"),
    ("MATH_008", "percentages", "What is 15% of 200?", "30", "sympy_math", "30"),
    ("MATH_009", "fractions", "Calculate: 2/5 * 5/8", "1/4", "sympy_math", "1/4"),
    ("MATH_010", "fractions", "Calculate: (3/4) / (3/2)", "1/2", "sympy_math", "1/2"),
    ("MATH_011", "arithmetic", "Solve: 100 - 45", "55", "sympy_math", "55"),
    ("MATH_012", "arithmetic", "Calculate: sqrt(144)", "12", "sympy_math", "12"),

    # Linear Equations & Algebra (12)
    ("MATH_013", "algebra", "Solve for x: 2x = 10", "x = 5", "sympy_math", "5"),
    ("MATH_014", "algebra", "Solve for x: 2x + 5 = 15", "x = 5", "sympy_math", "5"),
    ("MATH_015", "algebra", "Solve for x: 3x - 9 = 0", "x = 3", "sympy_math", "3"),
    ("MATH_016", "algebra", "Solve for x: 5x + 10 = 35", "x = 5", "sympy_math", "5"),
    ("MATH_017", "algebra", "Solve for x: 4x - 8 = 12", "x = 5", "sympy_math", "5"),
    ("MATH_018", "algebra", "Solve quadratic equation: x^2 - 4 = 0", "x = -2, 2", "sympy_math", "2"),
    ("MATH_019", "algebra", "Solve quadratic equation: x^2 - 5x + 6 = 0", "x = 2, 3", "sympy_math", "2"),
    ("MATH_020", "algebra", "Expand algebraic expression: (x + 2)*(x + 3)", "x^2 + 5*x + 6", "sympy_math", "x^2"),
    ("MATH_021", "algebra", "Factor algebraic expression: x^2 - 9", "(x - 3)*(x + 3)", "sympy_math", "x - 3"),
    ("MATH_022", "algebra", "Solve for y: 2y + 4 = 16", "y = 6", "sympy_math", "6"),
    ("MATH_023", "algebra", "Solve system: x + y = 5 and x - y = 1", "x = 3, y = 2", "sympy_math", "3"),
    ("MATH_024", "algebra", "Simplify algebraic expression: 2x + 3x - x", "4x", "sympy_math", "4*x"),

    # Calculus (Derivatives & Integrals) (12)
    ("MATH_025", "derivatives", "Find the derivative of x^2 with respect to x.", "2*x", "sympy_math", "2*x"),
    ("MATH_026", "derivatives", "Find the derivative of x^3 + 2x with respect to x.", "3*x^2 + 2", "sympy_math", "3*x^2"),
    ("MATH_027", "derivatives", "Find derivative of sin(x) with respect to x.", "cos(x)", "sympy_math", "cos"),
    ("MATH_028", "derivatives", "Find derivative of cos(x) with respect to x.", "-sin(x)", "sympy_math", "sin"),
    ("MATH_029", "derivatives", "Find derivative of e^x with respect to x.", "exp(x)", "sympy_math", "exp"),
    ("MATH_030", "derivatives", "Find derivative of 5x^4 with respect to x.", "20*x^3", "sympy_math", "20*x^3"),
    ("MATH_031", "integrals", "Find the indefinite integral of 2x dx.", "x^2", "sympy_math", "x^2"),
    ("MATH_032", "integrals", "Find the indefinite integral of 3x^2 dx.", "x^3", "sympy_math", "x^3"),
    ("MATH_033", "integrals", "Find integral of cos(x) dx.", "sin(x)", "sympy_math", "sin"),
    ("MATH_034", "integrals", "Find integral of 1/x dx.", "log(x)", "sympy_math", "log"),
    ("MATH_035", "integrals", "Calculate definite integral of x from 0 to 2.", "2", "sympy_math", "2"),
    ("MATH_036", "integrals", "Calculate definite integral of x^2 from 0 to 3.", "9", "sympy_math", "9"),

    # Matrices, Units, Probability & Word Math Problems (24)
    ("MATH_037", "matrices", "Find determinant of 2x2 matrix [[1, 2], [3, 4]]", "-2", "sympy_math", "-2"),
    ("MATH_038", "matrices", "Find determinant of 2x2 matrix [[5, 0], [0, 5]]", "25", "sympy_math", "25"),
    ("MATH_039", "units", "Convert 5 kilometers to meters.", "5000 meters", "sympy_math", "5000"),
    ("MATH_040", "units", "Convert 2 hours to minutes.", "120 minutes", "sympy_math", "120"),
    ("MATH_041", "probability", "What is the probability of flipping heads on a fair coin?", "0.5 or 1/2", "sympy_math", "1/2"),
    ("MATH_042", "probability", "What is the probability of rolling a 6 on a standard 6-sided die?", "1/6", "sympy_math", "1/6"),
    ("MATH_043", "statistics", "Find the mean of numbers: 2, 4, 6, 8, 10", "6", "sympy_math", "6"),
    ("MATH_044", "statistics", "Find the median of numbers: 1, 3, 5, 7, 9", "5", "sympy_math", "5"),
    ("MATH_045", "word_problem", "If a car travels 60 miles per hour, how far does it travel in 3 hours?", "180 miles", "sympy_math", "180"),
    ("MATH_046", "word_problem", "A store gives a 20% discount on a $50 item. What is the final price?", "$40", "sympy_math", "40"),
    ("MATH_047", "word_problem", "If 3 workers take 6 hours to finish a job, how many worker-hours are needed?", "18 worker-hours", "sympy_math", "18"),
    ("MATH_048", "arithmetic", "Solve: 7 * 8", "56", "sympy_math", "56"),
    ("MATH_049", "arithmetic", "Solve: 81 / 9", "9", "sympy_math", "9"),
    ("MATH_050", "algebra", "Solve for x: x/2 = 8", "x = 16", "sympy_math", "16"),
    ("MATH_051", "algebra", "Solve for x: 7x = 49", "x = 7", "sympy_math", "7"),
    ("MATH_052", "derivatives", "Find derivative of 4x^2 - 3x + 7.", "8*x - 3", "sympy_math", "8*x"),
    ("MATH_053", "integrals", "Find integral of (2x + 5) dx.", "x^2 + 5*x", "sympy_math", "x^2"),
    ("MATH_054", "units", "Convert 1000 grams to kilograms.", "1 kg", "sympy_math", "1"),
    ("MATH_055", "units", "Convert 3 days to hours.", "72 hours", "sympy_math", "72"),
    ("MATH_056", "statistics", "Find mode of numbers: 2, 3, 3, 4, 5", "3", "sympy_math", "3"),
    ("MATH_057", "word_problem", "A rectangle has length 8 and width 5. What is its area?", "40", "sympy_math", "40"),
    ("MATH_058", "word_problem", "A circle has radius 7. What is its circumference (2*pi*r)?", "14*pi", "sympy_math", "14"),
    ("MATH_059", "arithmetic", "Solve: 12 * 12", "144", "sympy_math", "144"),
    ("MATH_060", "arithmetic", "Solve: 10^3", "1000", "sympy_math", "1000")
]

for pid, subcat, prompt, ref, etype, pattern in math_prompts:
    PROMPT_DATA.append({
        "id": pid,
        "category": "mathematics",
        "sub_category": subcat,
        "prompt": prompt,
        "reference_answer": ref,
        "deterministic_eval": True,
        "eval_type": etype,
        "eval_pattern": pattern
    })

# ==============================================================================
# 4. INSTRUCTION FOLLOWING (60 Prompts)
# ==============================================================================
instruction_prompts = [
    # Format Constraints (20)
    ("INST_001", "one_sentence", "Explain what Python is in exactly one sentence.", "Python is a high-level interpreted programming language known for readability.", "structure", "one_sentence"),
    ("INST_002", "one_sentence", "Explain cloud computing in exactly one sentence.", "Cloud computing provides on-demand computing resources over the internet.", "structure", "one_sentence"),
    ("INST_003", "bullet_list", "List 3 advantages of React in bullet points.", "• Component reusability\n• Virtual DOM\n• Strong community", "structure", "bullet_points"),
    ("INST_004", "bullet_list", "List 3 HTTP methods in bullet points.", "• GET\n• POST\n• DELETE", "structure", "bullet_points"),
    ("INST_005", "json_format", "Respond in valid JSON object format with keys 'status' and 'message'.", '{"status": "success", "message": "Operation completed"}', "structure", "json_object"),
    ("INST_006", "json_format", "Return a JSON object containing keys 'name' and 'role'.", '{"name": "Mathiyon", "role": "AI Assistant"}', "structure", "json_object"),
    ("INST_007", "code_only", "Write a JavaScript function to add two numbers. Output code only, no markdown or text.", "function add(a, b) { return a + b; }", "structure", "code_only"),
    ("INST_008", "code_only", "Write Python code to print Hello World. Output code only.", "print('Hello World')", "structure", "code_only"),
    ("INST_009", "concise", "Answer in 5 words or less: What is the primary function of RAM?", "Temporary high-speed memory storage.", "structure", "concise_5_words"),
    ("INST_010", "concise", "Answer in 5 words or less: What is Git?", "Distributed version control system.", "structure", "concise_5_words"),
    ("INST_011", "step_by_step", "Explain how to boil water step by step.", "Step 1: Fill pot with water.\nStep 2: Place pot on stove.\nStep 3: Heat until boiling.", "structure", "step_by_step"),
    ("INST_012", "step_by_step", "Explain how to create a Git repository step by step.", "Step 1: Open terminal.\nStep 2: Run git init.\nStep 3: Add files.", "structure", "step_by_step"),
    ("INST_013", "explain_example", "Explain what a variable is, then provide a code example.", "A variable stores data. Example: let x = 10;", "structure", "explain_then_example"),
    ("INST_014", "explain_example", "Explain what a function is, then provide a Python example.", "A function is a reusable block of code. Example: def foo(): pass", "structure", "explain_then_example"),
    ("INST_015", "one_sentence", "Summarize SQL in one sentence.", "SQL is a standard language for managing relational databases.", "structure", "one_sentence"),
    ("INST_016", "bullet_list", "List 3 features of TypeScript in bullet points.", "• Static typing\n• Interface support\n• ES6 features", "structure", "bullet_points"),
    ("INST_017", "json_format", "Return JSON object with key 'result' set to 42.", '{"result": 42}', "structure", "json_object"),
    ("INST_018", "code_only", "Write SQL query to SELECT all from users. Code only.", "SELECT * FROM users;", "structure", "code_only"),
    ("INST_019", "step_by_step", "Explain how to run a Node app step by step.", "Step 1: Install Node.\nStep 2: Run node app.js.", "structure", "step_by_step"),
    ("INST_020", "concise", "Answer in 3 words or less: Is HTML a programming language?", "No it isn't.", "structure", "concise_5_words")
]

# Multi-Requirement Constraints & Specific Output Rules (40)
instruction_prompts += [
    ("INST_021", "multi_constraint", "List 2 programming languages. Start each line with 'Language: '.", "Language: Python\nLanguage: JavaScript", "contains", "Language:"),
    ("INST_022", "multi_constraint", "Write 'CONFIRMED' in all uppercase as your entire response.", "CONFIRMED", "contains", "CONFIRMED"),
    ("INST_023", "multi_constraint", "Write the number '100' without any letters or explanation.", "100", "contains", "100"),
    ("INST_024", "multi_constraint", "List 3 colors in bullet points, using hyphens for bullets.", "- Red\n- Blue\n- Green", "contains", "-"),
    ("INST_025", "multi_constraint", "Write a 3-step guide to debug code. Use 'Step 1:', 'Step 2:', 'Step 3:'.", "Step 1: Read error\nStep 2: Locate line\nStep 3: Fix bug", "contains", "Step 1:"),
    ("INST_026", "multi_constraint", "Respond with a JSON array containing ['apple', 'banana'].", "[\"apple\", \"banana\"]", "structure", "json_object"),
    ("INST_027", "multi_constraint", "Explain REST API using bullet points with asterisks (*).", "* REST uses HTTP methods\n* Stateless architecture", "contains", "*"),
    ("INST_028", "multi_constraint", "Write 'PASSED' in square brackets: [PASSED].", "[PASSED]", "contains", "[PASSED]"),
    ("INST_029", "multi_constraint", "Define 'recursion' in exactly two sentences.", "Recursion is when a function calls itself. It must have a base case to terminate.", "contains", "calls itself"),
    ("INST_030", "multi_constraint", "Write a Python function `def greet():` that returns 'Hello'. Output code only.", "def greet():\n    return 'Hello'", "contains", "def greet"),
    ("INST_031", "multi_constraint", "State the chemical symbol for Gold in a single word.", "Au", "contains", "Au"),
    ("INST_032", "multi_constraint", "Provide 3 examples of databases using numbered list (1., 2., 3.).", "1. PostgreSQL\n2. MongoDB\n3. MySQL", "contains", "1."),
    ("INST_033", "multi_constraint", "Translate 'Hello World' to Spanish in double quotes.", "\"Hola Mundo\"", "contains", "Hola"),
    ("INST_034", "multi_constraint", "Output the boolean value `true` as raw JSON.", "true", "contains", "true"),
    ("INST_035", "multi_constraint", "Write a headline for a tech launch starting with 'Introducing'.", "Introducing Mathiyon AI SLM v1.3", "contains", "Introducing"),
    ("INST_036", "multi_constraint", "Answer with 'Yes' or 'No' only: Is 7 a prime number?", "Yes", "contains", "Yes"),
    ("INST_037", "multi_constraint", "List 2 database types starting each line with 'Type: '.", "Type: Relational\nType: NoSQL", "contains", "Type:"),
    ("INST_038", "multi_constraint", "Write a Markdown h1 header '# Tech Overview'.", "# Tech Overview", "contains", "#"),
    ("INST_039", "multi_constraint", "Output only the number of bits in a byte.", "8", "contains", "8"),
    ("INST_040", "multi_constraint", "Write a 1-line comment in JavaScript explaining a variable.", "// Stores user name", "contains", "//"),
    ("INST_041", "multi_constraint", "Write 'READY' in angle brackets: <READY>.", "<READY>", "contains", "<READY>"),
    ("INST_042", "multi_constraint", "List 3 frontend frameworks in bullet points.", "• React\n• Vue\n• Angular", "structure", "bullet_points"),
    ("INST_043", "multi_constraint", "Define API in one sentence.", "An API connects two systems.", "structure", "one_sentence"),
    ("INST_044", "multi_constraint", "Output code only for HTML button tag.", "<button>Click Me</button>", "contains", "<button>"),
    ("INST_045", "multi_constraint", "Respond with JSON containing key 'valid' set to true.", '{"valid": true}', "structure", "json_object"),
    ("INST_046", "multi_constraint", "Write 3 bullet points starting with '+'.", "+ Point 1\n+ Point 2\n+ Point 3", "contains", "+"),
    ("INST_047", "multi_constraint", "Write 'SUCCESS' in uppercase.", "SUCCESS", "contains", "SUCCESS"),
    ("INST_048", "multi_constraint", "State the boiling point of water in Celsius.", "100°C", "contains", "100"),
    ("INST_049", "multi_constraint", "Write a Python print statement. Code only.", "print('test')", "contains", "print"),
    ("INST_050", "multi_constraint", "Answer in 2 words: Primary color of grass.", "Green color", "contains", "green"),
    ("INST_051", "multi_constraint", "List 2 operating systems using numbered list.", "1. Linux\n2. Windows", "contains", "1."),
    ("INST_052", "multi_constraint", "Write 'OK' inside parentheses: (OK).", "(OK)", "contains", "(OK)"),
    ("INST_053", "multi_constraint", "Explain RAM in one sentence.", "RAM is temporary working memory.", "structure", "one_sentence"),
    ("INST_054", "multi_constraint", "Output code only for CSS rule setting body background to black.", "body { background: black; }", "contains", "background"),
    ("INST_055", "multi_constraint", "Respond with JSON key 'count' set to 5.", '{"count": 5}', "structure", "json_object"),
    ("INST_056", "multi_constraint", "Write 2 steps using 'Phase 1:', 'Phase 2:'.", "Phase 1: Build\nPhase 2: Deploy", "contains", "Phase 1:"),
    ("INST_057", "multi_constraint", "Write 'DONE' in quotes.", "\"DONE\"", "contains", "DONE"),
    ("INST_058", "multi_constraint", "State 2 + 2 in 1 word.", "4", "contains", "4"),
    ("INST_059", "multi_constraint", "Write a Python comment starting with '#'.", "# Python comment", "contains", "#"),
    ("INST_060", "multi_constraint", "Write 'APPROVED' as your entire output.", "APPROVED", "contains", "APPROVED")
]

for pid, subcat, prompt, ref, etype, pattern in instruction_prompts:
    PROMPT_DATA.append({
        "id": pid,
        "category": "instruction_following",
        "sub_category": subcat,
        "prompt": prompt,
        "reference_answer": ref,
        "deterministic_eval": True,
        "eval_type": etype,
        "eval_pattern": pattern
    })

# ==============================================================================
# 5. REASONING (60 Prompts)
# ==============================================================================
reasoning_prompts = [
    # Logical Deduction & Word Problems (20)
    ("REAS_001", "logic", "If all humans are mortal, and Socrates is human, is Socrates mortal?", "Yes, Socrates is mortal.", "contains", "yes"),
    ("REAS_002", "logic", "If A is taller than B, and B is taller than C, who is the tallest?", "A is the tallest.", "contains", "a"),
    ("REAS_003", "logic", "A red box is inside a blue box, and the blue box is inside a green box. Which box is outermost?", "The green box is outermost.", "contains", "green"),
    ("REAS_004", "logic", "If it rains, the ground gets wet. The ground is wet. Does that strictly prove it rained?", "No, because another water source could cause wet ground.", "contains", "no"),
    ("REAS_005", "logic", "Tom is older than Jerry. Jerry is older than Spike. Is Tom older than Spike?", "Yes, Tom is older than Spike.", "contains", "yes"),
    ("REAS_006", "word_problem", "If Alice has 5 apples and gives 2 to Bob, how many apples does Alice have left?", "Alice has 3 apples left.", "contains", "3"),
    ("REAS_007", "word_problem", "A train leaves Station A at 60 mph. How far does it travel in 2.5 hours?", "150 miles.", "contains", "150"),
    ("REAS_008", "word_problem", "If a shirt costs $20 after a 50% discount, what was the original price?", "The original price was $40.", "contains", "40"),
    ("REAS_009", "word_problem", "If 4 cats catch 4 mice in 4 minutes, how many cats catch 100 mice in 100 minutes?", "4 cats.", "contains", "4"),
    ("REAS_010", "word_problem", "A farmer has 15 sheep and all but 8 die. How many sheep remain?", "8 sheep remain.", "contains", "8"),
    ("REAS_011", "logic", "If X implies Y, and Y is false, what can we deduce about X?", "X must be false.", "contains", "false"),
    ("REAS_012", "logic", "In a race, if you pass the person in 2nd place, what place are you in?", "You are in 2nd place.", "contains", "2nd"),
    ("REAS_013", "logic", "If today is Tuesday, what day will it be in 3 days?", "Friday.", "contains", "friday"),
    ("REAS_014", "logic", "What comes next in sequence: 2, 4, 8, 16, __?", "32", "contains", "32"),
    ("REAS_015", "logic", "What comes next in sequence: 5, 10, 15, 20, __?", "25", "contains", "25"),
    ("REAS_016", "word_problem", "If a book has 200 pages and you read 20 pages a day, how many days to finish?", "10 days.", "contains", "10"),
    ("REAS_017", "word_problem", "You buy 3 items for $5 each and pay with a $20 bill. What is your change?", "$5 change.", "contains", "5"),
    ("REAS_018", "logic", "If no mammals can fly except bats, is a dolphin able to fly?", "No, a dolphin cannot fly.", "contains", "no"),
    ("REAS_019", "logic", "A room has 4 corners. A cat sits in each corner. How many cats are in the room?", "4 cats.", "contains", "4"),
    ("REAS_020", "logic", "If yesterday was Sunday, what day is tomorrow?", "Tuesday.", "contains", "tuesday")
]

# Puzzles, Step-by-Step Reasoning & Problem Solving (40)
reasoning_prompts += [
    ("REAS_021", "puzzle", "Brother and sister have same number of siblings. Each son has half as many brothers as sisters. How many children?", "7 children (4 daughters, 3 sons).", "contains", "7"),
    ("REAS_022", "puzzle", "What has keys but no locks, space but no room, and allows you to enter but not go outside?", "A keyboard.", "contains", "keyboard"),
    ("REAS_023", "puzzle", "What gets wetter the more it dries?", "A towel.", "contains", "towel"),
    ("REAS_024", "puzzle", "What has a head and a tail but no body?", "A coin.", "contains", "coin"),
    ("REAS_025", "puzzle", "What goes up but never comes down?", "Your age.", "contains", "age"),
    ("REAS_026", "step_reasoning", "Calculate step by step: (5 + 3) * (10 - 4)", "8 * 6 = 48", "contains", "48"),
    ("REAS_027", "step_reasoning", "If 3x + 2 = 14, step by step solve for x.", "3x = 12 => x = 4", "contains", "4"),
    ("REAS_028", "step_reasoning", "A car uses 1 gallon of gas per 30 miles. How many gallons for a 120 mile trip?", "120 / 30 = 4 gallons.", "contains", "4"),
    ("REAS_029", "step_reasoning", "If a rectangle has perimeter 20 and length 6, what is its width?", "2*(6 + w) = 20 => w = 4", "contains", "4"),
    ("REAS_030", "step_reasoning", "Find average of 10, 20, 30 step by step.", "(10+20+30)/3 = 20", "contains", "20"),
    ("REAS_031", "logic", "If all squares are rectangles, and shape S is a square, is S a rectangle?", "Yes, S is a rectangle.", "contains", "yes"),
    ("REAS_032", "word_problem", "If a clock strikes 3 times in 3 seconds, how many seconds to strike 6 times?", "7.5 seconds.", "contains", "7"),
    ("REAS_033", "word_problem", "An item costs $80. Price increases by 10%, then decreases by 10%. What is final price?", "$79.20", "contains", "79"),
    ("REAS_034", "logic", "If John is taller than Mark, and Mark is shorter than Paul, who is shortest?", "Mark is shortest.", "contains", "mark"),
    ("REAS_035", "logic", "True or False: All prime numbers are odd.", "False, 2 is an even prime number.", "contains", "false"),
    ("REAS_036", "sequence", "What is the next number in Fibonacci sequence: 1, 1, 2, 3, 5, 8, __?", "13", "contains", "13"),
    ("REAS_037", "sequence", "What is next number in sequence: 1, 4, 9, 16, 25, __?", "36", "contains", "36"),
    ("REAS_038", "word_problem", "If 2 cats catch 2 mice in 2 minutes, how long for 1 cat to catch 1 mouse?", "2 minutes.", "contains", "2"),
    ("REAS_039", "logic", "If a statement is a tautology, is it always true?", "Yes, a tautology is always true.", "contains", "yes"),
    ("REAS_040", "logic", "If set A is subset of B, and x is in A, is x in B?", "Yes, x is in B.", "contains", "yes"),
    ("REAS_041", "puzzle", "What has hands but cannot clap?", "A clock.", "contains", "clock"),
    ("REAS_042", "puzzle", "What belongs to you, but other people use it more than you do?", "Your name.", "contains", "name"),
    ("REAS_043", "step_reasoning", "Solve step by step: 10 + 2 * 5", "10 + 10 = 20", "contains", "20"),
    ("REAS_044", "step_reasoning", "Solve step by step: (100 - 20) / 4", "80 / 4 = 20", "contains", "20"),
    ("REAS_045", "word_problem", "If a container is 1/4 full and holds 10 liters when full, how many liters are in it?", "2.5 liters.", "contains", "2.5"),
    ("REAS_046", "word_problem", "A baker makes 60 cookies per hour. How many cookies in 4 hours?", "240 cookies.", "contains", "240"),
    ("REAS_047", "logic", "If all dogs bark, and Buddy is a dog, does Buddy bark?", "Yes, Buddy barks.", "contains", "yes"),
    ("REAS_048", "logic", "If A > B and B > 5, is A > 5?", "Yes, A > 5.", "contains", "yes"),
    ("REAS_049", "sequence", "Next number: 3, 6, 12, 24, __?", "48", "contains", "48"),
    ("REAS_050", "sequence", "Next number: 100, 90, 80, 70, __?", "60", "contains", "60"),
    ("REAS_051", "word_problem", "If a bag has 3 red balls and 2 blue balls, total balls?", "5 balls.", "contains", "5"),
    ("REAS_052", "word_problem", "If 5 pens cost $10, cost per pen?", "$2.", "contains", "2"),
    ("REAS_053", "logic", "Is 0 an even number?", "Yes, 0 is an even integer.", "contains", "yes"),
    ("REAS_054", "logic", "If today is Friday, what day was yesterday?", "Thursday.", "contains", "thursday"),
    ("REAS_055", "puzzle", "What has teeth but cannot bite?", "A comb.", "contains", "comb"),
    ("REAS_056", "puzzle", "What has an eye but cannot see?", "A needle.", "contains", "needle"),
    ("REAS_057", "step_reasoning", "Solve step by step: 2^3 + 4", "8 + 4 = 12", "contains", "12"),
    ("REAS_058", "word_problem", "A runner completes a 400m track loop 5 times. Total distance?", "2000 meters.", "contains", "2000"),
    ("REAS_059", "logic", "If X = 5 and Y = X + 3, what is Y?", "Y = 8", "contains", "8"),
    ("REAS_060", "logic", "If a triangle has angles 60° and 60°, what is the third angle?", "60°", "contains", "60")
]

for pid, subcat, prompt, ref, etype, pattern in reasoning_prompts:
    PROMPT_DATA.append({
        "id": pid,
        "category": "reasoning",
        "sub_category": subcat,
        "prompt": prompt,
        "reference_answer": ref,
        "deterministic_eval": True,
        "eval_type": etype,
        "eval_pattern": pattern
    })

print(f"[DATASET] Total Prompts Generated: {len(PROMPT_DATA)}")
output_file = os.path.join(QUALITY_DIR, "benchmark_prompts.json")

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(PROMPT_DATA, f, indent=2)

print(f"[DATASET] Benchmark prompts saved cleanly to: {output_file}")
