"""
Mathiyon SLM v1.2 Systematic 120-Prompt Evaluation Benchmark Script
Evaluates model across 6 categories (20 General, 20 Coding, 20 Math, 20 Tamil, 20 English, 20 Instruction),
performs repetition & hallucination robustness tests, and saves benchmark report to evaluation_v1.2.json.
"""
import os
import sys
import time
import json
import torch

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from tokenizer.bpe_tokenizer import MathiyonTokenizer
from models.transformer import MathiyonSLM
from inference.generator import MathiyonGenerator

V1_2_CHECKPOINT_DIR = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.2", "latest")
V1_2_WEIGHTS_PATH = os.path.join(V1_2_CHECKPOINT_DIR, "best.pt")
TOKENIZER_V1_2_PATH = os.path.join(V1_2_CHECKPOINT_DIR, "tokenizer_v1.2.json")
EVAL_RESULTS_PATH = os.path.join(V1_2_CHECKPOINT_DIR, "evaluation_v1.2.json")

def generate_120_eval_prompts():
    """Generates 120 benchmark prompts across 6 categories."""
    categories = {
        "General Q&A": [
            "Who are you?", "What is artificial intelligence?", "What is machine learning?", "What is a neural network?",
            "What is deep learning?", "What is a database?", "What is the internet?", "What is an operating system?",
            "What is cloud computing?", "What is open source software?", "What is a server?", "What is a web browser?",
            "What is cybersecurity?", "What is cryptography?", "What is data science?", "What is an algorithm?",
            "What is a computer network?", "What is software architecture?", "What is a compiler?", "What is version control?"
        ],
        "Coding": [
            "Explain React.", "Give me a simple React example.", "Explain JavaScript.", "What is TypeScript?",
            "Explain Express.js", "What is MongoDB?", "What is JWT authentication?", "What is PyTorch?",
            "What is HTML?", "What is CSS?", "What is SQL?", "What is Git?", "What is Docker?", "What is REST API?",
            "How does useState work in React?", "How does useEffect work in React?", "Explain async/await in JS.",
            "What is a Promise in JS?", "What is Big O notation?", "What is a Binary Search Tree?"
        ],
        "Mathematics": [
            "What is linear algebra?", "What is calculus?", "What is derivative?", "What is integral?",
            "What is probability theory?", "What is gradient descent?", "What is a matrix?", "What is a vector?",
            "What is prime number?", "What is Pythagorean theorem?", "What is a function?", "What is an equation?",
            "What is statistics?", "What is standard deviation?", "What is variance?", "What is mean?",
            "What is median?", "What is mode?", "What is exponential function?", "What is logarithm?"
        ],
        "Tamil Language": [
            "தமிழ் மொழி பற்றி கூறுக.", "இந்தியாவின் தலைநகர் எது?", "தமிழ்நாட்டின் தலைநகரம் எது?",
            "செயற்கை நுண்ணறிவு என்றால் என்ன?", "கணினி நிரலாக்கம் என்றால் என்ன?", "மதியோன் AI எவ்வாறு செயல்படுகிறது?",
            "வணக்கம்!", "நன்றி!", "நல்வரவு!", "தமிழ் இலக்கணம் என்றால் என்ன?",
            "திருக்குறள் என்றால் என்ன?", "தமிழ் எழுத்துக்கள் எத்தனை?", "தமிழ் காப்பியங்கள் யாவை?",
            "கணினி என்றால் என்ன?", "இணையம் என்றால் என்ன?", "மென்பொருள் என்றால் என்ன?",
            "தரவுத்தளம் என்றால் என்ன?", "செயலி என்றால் என்ன?", "அறிவியல் என்றால் என்ன?", "கணிதம் என்றால் என்ன?"
        ],
        "English Conversational": [
            "Hello, my name is Guna.", "What is my name?", "Nice to meet you.", "How are you today?",
            "Can you help me code?", "I am learning React.", "What am I learning?", "Good morning!",
            "Thank you for your help.", "What can you do?", "Tell me a fun fact.", "How does AI work?",
            "What programming language should I learn?", "Why is React popular?", "How to learn TypeScript?",
            "What is the best database for web apps?", "Explain frontend vs backend.", "What is fullstack development?",
            "How to build a web app?", "What is Mathiyon AI?"
        ],
        "Instruction Following": [
            "Summarize what React is in one sentence.", "List 3 features of TypeScript.", "Write a JS arrow function.",
            "Convert JSON string to object in JS.", "Write a basic HTML button.", "Explain HTTP 404 code.",
            "Explain HTTP 200 code.", "Explain HTTP 500 code.", "Explain HTTP 401 code.", "What is .env file?",
            "What is npm?", "What is package.json?", "What is ESLint?", "What is Prettier?",
            "What is single page application?", "What is server-side rendering?", "What is static site generation?",
            "What is Next.js?", "What is Mathiyon SLM v1.2?", "Explain clean code principles."
        ]
    }
    return categories

def run_120_evaluation_benchmark():
    """Executes full 120-prompt evaluation benchmark and outputs quantitative metric comparison."""
    print("=" * 60)
    print(f"[EVALUATION] RUNNING 120-PROMPT BENCHMARK EVALUATION FOR MATHIYON SLM v1.2")
    print("=" * 60)

    # Load Tokenizer v1.2 & Trained Model Checkpoint
    tokenizer = MathiyonTokenizer(vocab_size=5000, vocab_path=TOKENIZER_V1_2_PATH if os.path.exists(TOKENIZER_V1_2_PATH) else None)
    model = MathiyonSLM(vocab_size=5000, d_model=256, nhead=8, num_layers=6, max_seq_len=512)

    if os.path.exists(V1_2_WEIGHTS_PATH):
        model.load_state_dict(torch.load(V1_2_WEIGHTS_PATH, map_location=torch.device('cpu')))
        print(f"[OK] Loaded trained Mathiyon SLM v1.2 weights from: {V1_2_WEIGHTS_PATH}")

    generator = MathiyonGenerator()
    prompt_categories = generate_120_eval_prompts()

    total_prompts = 0
    total_time_ms = 0.0
    total_confidence = 0.0
    category_summary = {}
    benchmark_results = []
    context = []

    for cat_name, prompts in prompt_categories.items():
        cat_time = 0.0
        cat_conf = 0.0

        for prompt in prompts:
            result = generator.generate(prompt, context)
            
            # Maintain conversation context for multi-turn testing
            context.append({"role": "user", "content": prompt})
            context.append({"role": "assistant", "content": result["response"]})

            total_prompts += 1
            total_time_ms += result["generation_time_ms"]
            total_confidence += result["confidence"]

            cat_time += result["generation_time_ms"]
            cat_conf += result["confidence"]

            benchmark_results.append({
                "category": cat_name,
                "prompt": prompt,
                "response": result["response"],
                "generation_time_ms": result["generation_time_ms"],
                "confidence": result["confidence"]
            })

        avg_cat_time = round(cat_time / len(prompts), 2)
        avg_cat_conf = round(cat_conf / len(prompts), 4)
        category_summary[cat_name] = {
            "count": len(prompts),
            "avg_time_ms": avg_cat_time,
            "avg_confidence": avg_cat_conf
        }
        print(f"  [OK] Category '{cat_name:<22}': Tested {len(prompts)} prompts | Avg Latency: {avg_cat_time:>5} ms | Avg Conf: {avg_cat_conf}")

    # Robustness Tests (Repetition & Unknowns)
    robustness_prompts = [
        "What is the exact population of Mars right now?",
        "repeat repeat repeat repeat repeat repeat repeat repeat",
        "React தமிழ் Python JavaScript 123 !@#",
        "Please explain a concept that does not exist in universe XYZ"
    ]
    robustness_results = []
    for rob_p in robustness_prompts:
        res = generator.generate(rob_p)
        robustness_results.append({"prompt": rob_p, "response": res["response"]})

    avg_latency = round(total_time_ms / max(1, total_prompts), 2)
    avg_conf = round(total_confidence / max(1, total_prompts), 4)

    report = {
        "model": "Mathiyon SLM v1.2",
        "version": "1.2",
        "checkpoint_path": V1_2_WEIGHTS_PATH,
        "total_prompts_tested": total_prompts,
        "overall_avg_latency_ms": avg_latency,
        "overall_avg_confidence": avg_conf,
        "category_summary": category_summary,
        "robustness_test": robustness_results,
        "benchmark_results": benchmark_results
    }

    os.makedirs(V1_2_CHECKPOINT_DIR, exist_ok=True)
    with open(EVAL_RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 60)
    print(f"[SUCCESS] 120-PROMPT BENCHMARK EVALUATION COMPLETED")
    print(f"Total Tested: {total_prompts} | Avg Latency: {avg_latency} ms | Saved: {EVAL_RESULTS_PATH}")
    print("=" * 60)
    return report

if __name__ == "__main__":
    run_120_evaluation_benchmark()
