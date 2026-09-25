"""
Mathiyon AI — Phase 11.11 Shadow Benchmark Dataset Generator
Creates 150 sanitized, synthetic deterministic shadow evaluation prompts across 5 core categories:
- General English (30)
- Coding (30)
- Mathematics (30) (SymPy Engine exact calculation)
- Instruction Following (30)
- Reasoning (30)

Also includes metadata tags for RAG, Tool Routing, API, and Context evaluation.
Saves output to: ai-service/evaluation/v1_3/shadow/shadow_dataset.json
"""

import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
SHADOW_DIR = os.path.join(BASE_DIR, "evaluation", "v1_3", "shadow")
os.makedirs(SHADOW_DIR, exist_ok=True)

PROMPT_DATA = []

# ==============================================================================
# 1. GENERAL ENGLISH (30 Prompts)
# ==============================================================================
english_prompts = [
    ("SHADOW_ENG_001", "definition", "What is artificial intelligence?", "AI is the simulation of human intelligence by machines.", "contains", "intelligence"),
    ("SHADOW_ENG_002", "definition", "What is machine learning?", "Machine learning enables computers to learn from data.", "contains", "data"),
    ("SHADOW_ENG_003", "definition", "What is deep learning?", "Deep learning uses multi-layer neural networks.", "contains", "neural network"),
    ("SHADOW_ENG_004", "definition", "What is an operating system?", "An OS manages hardware and software resources.", "contains", "hardware"),
    ("SHADOW_ENG_005", "definition", "What is a database?", "A database is an organized collection of structured data.", "contains", "data"),
    ("SHADOW_ENG_006", "technical", "Explain what an API is in simple terms.", "An API enables applications to communicate with each other.", "contains", "communicate"),
    ("SHADOW_ENG_007", "technical", "Explain how the internet works.", "The internet connects global networks using standard protocols.", "contains", "network"),
    ("SHADOW_ENG_008", "technical", "What is cloud computing?", "Cloud computing delivers computing services over the internet.", "contains", "internet"),
    ("SHADOW_ENG_009", "technical", "What is cybersecurity?", "Cybersecurity protects digital systems and networks.", "contains", "protect"),
    ("SHADOW_ENG_010", "technical", "What is cryptography?", "Cryptography secures communication using data encryption.", "contains", "encryption"),
    ("SHADOW_ENG_011", "factual", "What is the capital of France?", "Paris", "contains", "paris"),
    ("SHADOW_ENG_012", "factual", "How many continents are there on Earth?", "7 continents", "contains", "7"),
    ("SHADOW_ENG_013", "factual", "What is photosynthesis?", "Process plants use to convert sunlight into food.", "contains", "plants"),
    ("SHADOW_ENG_014", "factual", "What is gravity?", "Gravity is a fundamental force pulling objects together.", "contains", "force"),
    ("SHADOW_ENG_015", "factual", "What is the speed of light?", "Approximately 299,792,458 m/s.", "contains", "299"),
    ("SHADOW_ENG_016", "short_answer", "Rewrite in active voice: 'The code was written by Alice.'", "Alice wrote the code.", "contains", "wrote"),
    ("SHADOW_ENG_017", "short_answer", "Rewrite politely: 'Give me the report now.'", "Could you please provide the report?", "contains", "please"),
    ("SHADOW_ENG_018", "short_answer", "What does HTML stand for?", "HyperText Markup Language", "contains", "hypertext"),
    ("SHADOW_ENG_019", "short_answer", "What does CSS stand for?", "Cascading Style Sheets", "contains", "cascading"),
    ("SHADOW_ENG_020", "short_answer", "What does SQL stand for?", "Structured Query Language", "contains", "structured"),
    ("SHADOW_ENG_021", "conversation", "Hello! How can you help me today?", "Hello! I am Mathiyon AI, ready to assist.", "contains", "hello"),
    ("SHADOW_ENG_022", "conversation", "What features do you support?", "I support text, code generation, math solving, and document RAG.", "contains", "math"),
    ("SHADOW_ENG_023", "conversation", "Hi there! What is your name?", "My name is Mathiyon AI.", "contains", "mathiyon"),
    ("SHADOW_ENG_024", "technical", "What is cache memory?", "Cache is small fast memory storing frequent data.", "contains", "fast"),
    ("SHADOW_ENG_025", "technical", "What is microservice architecture?", "Splitting apps into small independent services.", "contains", "independent"),
    ("SHADOW_ENG_026", "technical", "What is a load balancer?", "Distributes network traffic across servers.", "contains", "traffic"),
    ("SHADOW_ENG_027", "technical", "What is containerization?", "Packages code into isolated containers.", "contains", "container"),
    ("SHADOW_ENG_028", "technical", "What is version control?", "Tracks software code changes over time.", "contains", "track"),
    ("SHADOW_ENG_029", "short_answer", "Summarize clean code importance.", "Improves readability and reduces bugs.", "contains", "readability"),
    ("SHADOW_ENG_030", "short_answer", "What is a URL?", "Addresses web resources.", "contains", "locator")
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
# 2. CODING (30 Prompts)
# ==============================================================================
coding_prompts = [
    ("SHADOW_COD_001", "javascript", "Write a JavaScript function to reverse a string.", "function reverseString(str) { return str.split('').reverse().join(''); }", "contains", "split"),
    ("SHADOW_COD_002", "javascript", "Explain difference between let and const in JS.", "let allows re-assignment; const creates constant binding.", "contains", "let"),
    ("SHADOW_COD_003", "javascript", "Write JS function to check if number is even.", "function isEven(n) { return n % 2 === 0; }", "contains", "%"),
    ("SHADOW_COD_004", "javascript", "Write JS arrow function to square a number.", "const square = x => x * x;", "contains", "=>"),
    ("SHADOW_COD_005", "javascript", "What is a Promise in JavaScript?", "Represents eventual completion of async operation.", "contains", "async"),
    ("SHADOW_COD_006", "typescript", "Define TypeScript interface for User with name and age.", "interface User { name: string; age: number; }", "contains", "interface"),
    ("SHADOW_COD_007", "react", "What is useState hook in React?", "Declares state variables in functional components.", "contains", "state"),
    ("SHADOW_COD_008", "react", "What is useEffect hook in React?", "Performs side effects in functional components.", "contains", "effect"),
    ("SHADOW_COD_009", "nodejs", "Write Express route for GET /api/health returning ok.", "app.get('/api/health', (req, res) => res.json({ status: 'ok' }));", "contains", "get"),
    ("SHADOW_COD_010", "nodejs", "What is event loop in Node.js?", "Handles async non-blocking I/O operations.", "contains", "event loop"),
    ("SHADOW_COD_011", "python", "Write Python function to check palindrome.", "def is_palindrome(s): return s == s[::-1]", "contains", "::-1"),
    ("SHADOW_COD_012", "python", "Write Python list comprehension for positive numbers.", "[x for x in nums if x > 0]", "contains", "for"),
    ("SHADOW_COD_013", "python", "Write Python function for factorial.", "def factorial(n): return 1 if n <= 1 else n * factorial(n-1)", "contains", "factorial"),
    ("SHADOW_COD_014", "python", "Difference between list and tuple in Python?", "Lists are mutable; tuples are immutable.", "contains", "mutable"),
    ("SHADOW_COD_015", "python", "Write Python code to open file safely.", "with open('file.txt', 'r') as f: content = f.read()", "contains", "open"),
    ("SHADOW_COD_016", "sql", "Write SQL query to select all users where age > 18.", "SELECT * FROM users WHERE age > 18;", "contains", "SELECT"),
    ("SHADOW_COD_017", "sql", "Write SQL query to count orders per customer.", "SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id;", "contains", "GROUP BY"),
    ("SHADOW_COD_018", "sql", "Difference between INNER JOIN and LEFT JOIN in SQL?", "INNER JOIN returns matching rows; LEFT JOIN returns all left rows.", "contains", "join"),
    ("SHADOW_COD_019", "sql", "Write SQL query to delete user with id = 5.", "DELETE FROM users WHERE id = 5;", "contains", "DELETE"),
    ("SHADOW_COD_020", "sql", "Write SQL query to insert new user.", "INSERT INTO users (name, email) VALUES ('Alice', 'alice@test.com');", "contains", "INSERT"),
    ("SHADOW_COD_021", "debugging", "Debug JS error: Cannot read property 'map' of undefined.", "Ensure variable is initialized as an array before calling map.", "contains", "array"),
    ("SHADOW_COD_022", "debugging", "Debug Python IndentationError: unexpected indent.", "Fix misaligned spaces or tabs in Python indentation.", "contains", "indent"),
    ("SHADOW_COD_023", "debugging", "Debug React error: Too many re-renders.", "Avoid calling setState directly inside component body.", "contains", "setState"),
    ("SHADOW_COD_024", "code_explanation", "Explain JS reduce: arr.reduce((a, b) => a + b, 0)", "Calculates sum of all array elements.", "contains", "sum"),
    ("SHADOW_COD_025", "code_explanation", "Explain Python list(set(items)).", "Removes duplicate items from list.", "contains", "duplicate"),
    ("SHADOW_COD_026", "code_explanation", "Explain SQL SELECT DISTINCT country FROM users;", "Returns list of unique countries.", "contains", "unique"),
    ("SHADOW_COD_027", "transformation", "Convert Python loop to comprehension: res=[]; for x in nums: res.append(x*2)", "[x*2 for x in nums]", "contains", "for"),
    ("SHADOW_COD_028", "transformation", "Convert ES5 function to arrow function.", "const add = (a, b) => a + b;", "contains", "=>"),
    ("SHADOW_COD_029", "debugging", "Debug Python KeyError: 'user_id'", "Use dict.get('user_id') or check key existence.", "contains", "get"),
    ("SHADOW_COD_030", "transformation", "Convert string concat to template literal in JS.", "Use `` `${a} ${b}` `` instead of `a + ' ' + b`", "contains", "${")
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
# 3. MATHEMATICS (30 Prompts) — SymPy Math Engine Target
# ==============================================================================
math_prompts = [
    ("SHADOW_MATH_001", "arithmetic", "Solve: 15 + 27", "42", "sympy_math", "42"),
    ("SHADOW_MATH_002", "arithmetic", "Calculate: 144 / 12", "12", "sympy_math", "12"),
    ("SHADOW_MATH_003", "fractions", "Calculate: 1/3 + 1/6", "1/2", "sympy_math", "1/2"),
    ("SHADOW_MATH_004", "fractions", "Solve: 3/4 - 1/2", "1/4", "sympy_math", "1/4"),
    ("SHADOW_MATH_005", "arithmetic", "Solve: 25 * 4", "100", "sympy_math", "100"),
    ("SHADOW_MATH_006", "percentages", "What is 20% of 150?", "30", "sympy_math", "30"),
    ("SHADOW_MATH_007", "algebra", "Solve for x: 2x = 10", "x = 5", "sympy_math", "5"),
    ("SHADOW_MATH_008", "algebra", "Solve for x: 2x + 5 = 15", "x = 5", "sympy_math", "5"),
    ("SHADOW_MATH_009", "algebra", "Solve for x: 3x - 9 = 0", "x = 3", "sympy_math", "3"),
    ("SHADOW_MATH_010", "algebra", "Solve quadratic equation: x^2 - 4 = 0", "x = -2, 2", "sympy_math", "2"),
    ("SHADOW_MATH_011", "algebra", "Solve quadratic equation: x^2 - 5x + 6 = 0", "x = 2, 3", "sympy_math", "2"),
    ("SHADOW_MATH_012", "derivatives", "Find derivative of x^2 with respect to x.", "2*x", "sympy_math", "2*x"),
    ("SHADOW_MATH_013", "derivatives", "Find derivative of sin(x) with respect to x.", "cos(x)", "sympy_math", "cos"),
    ("SHADOW_MATH_014", "integrals", "Find indefinite integral of 2x dx.", "x^2", "sympy_math", "x^2"),
    ("SHADOW_MATH_015", "integrals", "Calculate definite integral of x from 0 to 2.", "2", "sympy_math", "2"),
    ("SHADOW_MATH_016", "matrices", "Find determinant of 2x2 matrix [[1, 2], [3, 4]]", "-2", "sympy_math", "-2"),
    ("SHADOW_MATH_017", "units", "Convert 5 kilometers to meters.", "5000 meters", "sympy_math", "5000"),
    ("SHADOW_MATH_018", "probability", "Probability of flipping heads on fair coin?", "0.5 or 1/2", "sympy_math", "1/2"),
    ("SHADOW_MATH_019", "statistics", "Find mean of numbers: 2, 4, 6, 8, 10", "6", "sympy_math", "6"),
    ("SHADOW_MATH_020", "word_problem", "If a car travels 60 mph, distance in 3 hours?", "180 miles", "sympy_math", "180"),
    ("SHADOW_MATH_021", "word_problem", "20% discount on $50 item. Final price?", "$40", "sympy_math", "40"),
    ("SHADOW_MATH_022", "arithmetic", "Solve: 7 * 8", "56", "sympy_math", "56"),
    ("SHADOW_MATH_023", "arithmetic", "Solve: 81 / 9", "9", "sympy_math", "9"),
    ("SHADOW_MATH_024", "algebra", "Solve for x: x/2 = 8", "x = 16", "sympy_math", "16"),
    ("SHADOW_MATH_025", "derivatives", "Find derivative of 4x^2 - 3x + 7.", "8*x - 3", "sympy_math", "8*x"),
    ("SHADOW_MATH_026", "integrals", "Find integral of (2x + 5) dx.", "x^2 + 5*x", "sympy_math", "x^2"),
    ("SHADOW_MATH_027", "units", "Convert 1000 grams to kg.", "1 kg", "sympy_math", "1"),
    ("SHADOW_MATH_028", "statistics", "Find median of numbers: 1, 3, 5, 7, 9", "5", "sympy_math", "5"),
    ("SHADOW_MATH_029", "word_problem", "Rectangle length 8, width 5. Area?", "40", "sympy_math", "40"),
    ("SHADOW_MATH_030", "arithmetic", "Solve: 12 * 12", "144", "sympy_math", "144")
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
# 4. INSTRUCTION FOLLOWING (30 Prompts)
# ==============================================================================
instruction_prompts = [
    ("SHADOW_INST_001", "one_sentence", "Explain Python in exactly one sentence.", "Python is a high-level interpreted programming language.", "structure", "one_sentence"),
    ("SHADOW_INST_002", "bullet_list", "List 3 advantages of React in bullet points.", "• Component reusability\n• Virtual DOM\n• Community", "structure", "bullet_points"),
    ("SHADOW_INST_003", "json_format", "Respond in JSON object format with keys 'status' and 'message'.", '{"status": "success", "message": "OK"}', "structure", "json_object"),
    ("SHADOW_INST_004", "code_only", "Write JS function to add two numbers. Code only.", "function add(a, b) { return a + b; }", "structure", "code_only"),
    ("SHADOW_INST_005", "concise", "Answer in 5 words or less: Primary function of RAM?", "Temporary high-speed memory storage.", "structure", "concise_5_words"),
    ("SHADOW_INST_006", "step_by_step", "Explain how to boil water step by step.", "Step 1: Fill pot.\nStep 2: Heat on stove.", "structure", "step_by_step"),
    ("SHADOW_INST_007", "explain_example", "Explain what a variable is, then provide a code example.", "A variable stores data. Example: let x = 10;", "structure", "explain_then_example"),
    ("SHADOW_INST_008", "multi_constraint", "List 2 programming languages. Start each line with 'Language: '.", "Language: Python\nLanguage: JS", "contains", "Language:"),
    ("SHADOW_INST_009", "multi_constraint", "Write 'CONFIRMED' in all uppercase as your entire response.", "CONFIRMED", "contains", "CONFIRMED"),
    ("SHADOW_INST_010", "multi_constraint", "Write the number '100' without letters.", "100", "contains", "100"),
    ("SHADOW_INST_011", "multi_constraint", "List 3 colors in bullet points with hyphens.", "- Red\n- Blue\n- Green", "contains", "-"),
    ("SHADOW_INST_012", "multi_constraint", "Write 3-step guide using 'Step 1:', 'Step 2:', 'Step 3:'.", "Step 1: Read\nStep 2: Fix\nStep 3: Test", "contains", "Step 1:"),
    ("SHADOW_INST_013", "multi_constraint", "Respond with JSON array ['apple', 'banana'].", "[\"apple\", \"banana\"]", "structure", "json_object"),
    ("SHADOW_INST_014", "multi_constraint", "Write 'PASSED' in square brackets: [PASSED].", "[PASSED]", "contains", "[PASSED]"),
    ("SHADOW_INST_015", "multi_constraint", "Define recursion in two sentences.", "Function calls itself. Has base case.", "contains", "calls itself"),
    ("SHADOW_INST_016", "multi_constraint", "Write Python function `def greet():` returning 'Hello'. Code only.", "def greet(): return 'Hello'", "contains", "def greet"),
    ("SHADOW_INST_017", "multi_constraint", "Chemical symbol for Gold in a single word.", "Au", "contains", "Au"),
    ("SHADOW_INST_018", "multi_constraint", "Numbered list 1., 2., 3. of databases.", "1. Postgres\n2. Mongo\n3. MySQL", "contains", "1."),
    ("SHADOW_INST_019", "multi_constraint", "Translate 'Hello World' to Spanish in double quotes.", "\"Hola Mundo\"", "contains", "Hola"),
    ("SHADOW_INST_020", "multi_constraint", "Headline for tech launch starting with 'Introducing'.", "Introducing Mathiyon AI SLM v1.3", "contains", "Introducing"),
    ("SHADOW_INST_021", "multi_constraint", "Answer Yes or No: Is 7 a prime number?", "Yes", "contains", "Yes"),
    ("SHADOW_INST_022", "multi_constraint", "Markdown h1 header '# Tech Overview'.", "# Tech Overview", "contains", "#"),
    ("SHADOW_INST_023", "multi_constraint", "Output number of bits in a byte.", "8", "contains", "8"),
    ("SHADOW_INST_024", "multi_constraint", "Write JS 1-line comment starting with '//'.", "// Comment", "contains", "//"),
    ("SHADOW_INST_025", "multi_constraint", "Write 'READY' in angle brackets: <READY>.", "<READY>", "contains", "<READY>"),
    ("SHADOW_INST_026", "multi_constraint", "List 3 frontend frameworks in bullet points.", "• React\n• Vue\n• Angular", "structure", "bullet_points"),
    ("SHADOW_INST_027", "multi_constraint", "Define API in one sentence.", "An API connects two systems.", "structure", "one_sentence"),
    ("SHADOW_INST_028", "multi_constraint", "HTML button tag code only.", "<button>Click</button>", "contains", "<button>"),
    ("SHADOW_INST_029", "multi_constraint", "JSON with key 'valid' set to true.", '{"valid": true}', "structure", "json_object"),
    ("SHADOW_INST_030", "multi_constraint", "Write 'APPROVED' as your entire output.", "APPROVED", "contains", "APPROVED")
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
# 5. REASONING (30 Prompts)
# ==============================================================================
reasoning_prompts = [
    ("SHADOW_REAS_001", "logic", "If all humans are mortal and Socrates is human, is Socrates mortal?", "Yes, Socrates is mortal.", "contains", "yes"),
    ("SHADOW_REAS_002", "logic", "If A > B and B > C, who is tallest?", "A is tallest.", "contains", "a"),
    ("SHADOW_REAS_003", "logic", "Red box inside blue box, blue inside green. Outermost box?", "Green box.", "contains", "green"),
    ("SHADOW_REAS_004", "word_problem", "If Alice has 5 apples and gives 2 to Bob, how many left?", "3 apples.", "contains", "3"),
    ("SHADOW_REAS_005", "word_problem", "Train travels at 60 mph. Distance in 2.5 hours?", "150 miles.", "contains", "150"),
    ("SHADOW_REAS_006", "word_problem", "Shirt costs $20 after 50% discount. Original price?", "$40", "contains", "40"),
    ("SHADOW_REAS_007", "word_problem", "Farmer has 15 sheep, all but 8 die. How many remain?", "8 sheep.", "contains", "8"),
    ("SHADOW_REAS_008", "logic", "If X implies Y, and Y is false, what about X?", "X is false.", "contains", "false"),
    ("SHADOW_REAS_009", "logic", "In a race, pass person in 2nd place. What place are you?", "2nd place.", "contains", "2nd"),
    ("SHADOW_REAS_010", "sequence", "Next in sequence: 2, 4, 8, 16, __?", "32", "contains", "32"),
    ("SHADOW_REAS_011", "word_problem", "Book 200 pages, read 20 pages/day. Days to finish?", "10 days.", "contains", "10"),
    ("SHADOW_REAS_012", "word_problem", "Buy 3 items for $5 each, pay with $20 bill. Change?", "$5 change.", "contains", "5"),
    ("SHADOW_REAS_013", "puzzle", "What has keys but no locks, space but no room?", "A keyboard.", "contains", "keyboard"),
    ("SHADOW_REAS_014", "puzzle", "What gets wetter the more it dries?", "A towel.", "contains", "towel"),
    ("SHADOW_REAS_015", "puzzle", "What has head and tail but no body?", "A coin.", "contains", "coin"),
    ("SHADOW_REAS_016", "step_reasoning", "Solve step by step: (5 + 3) * (10 - 4)", "8 * 6 = 48", "contains", "48"),
    ("SHADOW_REAS_017", "step_reasoning", "If 3x + 2 = 14, solve step by step for x.", "3x = 12 => x = 4", "contains", "4"),
    ("SHADOW_REAS_018", "step_reasoning", "Car 30 mpg, miles 120. Gallons needed?", "4 gallons.", "contains", "4"),
    ("SHADOW_REAS_019", "logic", "If all squares are rectangles, is square S a rectangle?", "Yes.", "contains", "yes"),
    ("SHADOW_REAS_020", "sequence", "Next in Fibonacci: 1, 1, 2, 3, 5, 8, __?", "13", "contains", "13"),
    ("SHADOW_REAS_021", "sequence", "Next in sequence: 1, 4, 9, 16, 25, __?", "36", "contains", "36"),
    ("SHADOW_REAS_022", "word_problem", "2 cats catch 2 mice in 2 minutes. Time for 1 cat to catch 1 mouse?", "2 minutes.", "contains", "2"),
    ("SHADOW_REAS_023", "puzzle", "What has hands but cannot clap?", "A clock.", "contains", "clock"),
    ("SHADOW_REAS_024", "step_reasoning", "Solve step by step: 10 + 2 * 5", "10 + 10 = 20", "contains", "20"),
    ("SHADOW_REAS_025", "word_problem", "Baker makes 60 cookies/hour. Cookies in 4 hours?", "240 cookies.", "contains", "240"),
    ("SHADOW_REAS_026", "logic", "If all dogs bark and Buddy is a dog, does Buddy bark?", "Yes.", "contains", "yes"),
    ("SHADOW_REAS_027", "sequence", "Next number: 3, 6, 12, 24, __?", "48", "contains", "48"),
    ("SHADOW_REAS_028", "word_problem", "5 pens cost $10. Cost per pen?", "$2", "contains", "2"),
    ("SHADOW_REAS_029", "logic", "Is 0 an even number?", "Yes, 0 is an even integer.", "contains", "yes"),
    ("SHADOW_REAS_030", "puzzle", "What has teeth but cannot bite?", "A comb.", "contains", "comb")
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

print(f"[SHADOW DATASET] Total Prompts Generated: {len(PROMPT_DATA)}")
output_file = os.path.join(SHADOW_DIR, "shadow_dataset.json")

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(PROMPT_DATA, f, indent=2)

print(f"[SHADOW DATASET] Shadow dataset saved cleanly to: {output_file}")
