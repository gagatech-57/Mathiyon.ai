"""
Mathiyon SLM v1.1 Benchmark Evaluation Script
Evaluates trained model checkpoints across General Knowledge, Tamil, Coding, Mathematics,
Context Retention, and Instruction Following. Saves benchmark report to evaluation_results.json.
"""
import os
import sys
import json
import torch

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from training.config import (
    MODEL_NAME,
    MODEL_VERSION,
    VOCAB_SIZE,
    EMBEDDING_DIM,
    NUM_LAYERS,
    NUM_HEADS,
    CONTEXT_LENGTH,
    MODEL_WEIGHTS_PATH,
    TOKENIZER_PATH,
    LATEST_CHECKPOINT_DIR
)
from tokenizer.bpe_tokenizer import MathiyonTokenizer
from models.transformer import MathiyonSLM
from inference.generator import MathiyonGenerator

def run_evaluation_benchmark():
    """Runs systematic benchmark evaluation on the trained Mathiyon SLM v1.1 checkpoint."""
    print("=" * 60)
    print(f"[BENCHMARK] RUNNING EVALUATION BENCHMARK FOR {MODEL_NAME}")
    print("=" * 60)

    # 1. Load Trained Checkpoint & Tokenizer
    tokenizer = MathiyonTokenizer(vocab_size=VOCAB_SIZE, vocab_path=TOKENIZER_PATH)
    model = MathiyonSLM(
        vocab_size=VOCAB_SIZE,
        d_model=EMBEDDING_DIM,
        nhead=NUM_HEADS,
        num_layers=NUM_LAYERS,
        max_seq_len=CONTEXT_LENGTH
    )

    if os.path.exists(MODEL_WEIGHTS_PATH):
        model.load_state_dict(torch.load(MODEL_WEIGHTS_PATH, map_location=torch.device('cpu')))
        print(f"[OK] Loaded trained weights from {MODEL_WEIGHTS_PATH}")
    else:
        print(f"[WARNING] Checkpoint file {MODEL_WEIGHTS_PATH} not found. Running evaluation on prototype weights.")


    generator = MathiyonGenerator()

    # Benchmark Prompts
    eval_prompts = [
        ("General Knowledge", "Who are you?"),
        ("Tamil Language", "தமிழ் மொழி பற்றி கூறுக."),
        ("English Conversational", "Hello, my name is Guna."),
        ("Context Retention", "What is my name?"),
        ("Coding (React)", "Explain React."),
        ("Coding (JavaScript)", "Give me a simple React example."),
        ("Science & Math", "What is calculus?")
    ]

    benchmark_results = []
    conversation_context = []

    for category, prompt in eval_prompts:
        result = generator.generate(prompt, conversation_context)
        
        # Accumulate context for multi-turn testing
        conversation_context.append({"role": "user", "content": prompt})
        conversation_context.append({"role": "assistant", "content": result["response"]})

        benchmark_item = {
            "category": category,
            "prompt": prompt,
            "response": result["response"],
            "generation_time_ms": result["generation_time_ms"],
            "tokens_processed": result["tokens_processed"],
            "confidence": result["confidence"]
        }
        benchmark_results.append(benchmark_item)

        print(f"\nCategory: {category}")
        safe_prompt = prompt.encode("ascii", errors="replace").decode("ascii")
        print(f"Prompt:   \"{safe_prompt}\"")
        safe_response = result["response"][:100].encode("ascii", errors="replace").decode("ascii")
        print(f"Response: \"{safe_response}...\"")
        print(f"Time:     {result['generation_time_ms']} ms | Confidence: {result['confidence']}")


    from datetime import datetime
    report = {
        "model": MODEL_NAME,
        "version": MODEL_VERSION,
        "checkpoint_path": MODEL_WEIGHTS_PATH,
        "eval_date": datetime.now().isoformat(),
        "benchmark_results": benchmark_results
    }


    eval_results_path = os.path.join(LATEST_CHECKPOINT_DIR, "evaluation_results.json")
    with open(eval_results_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 60)
    print(f"[OK] EVALUATION BENCHMARK COMPLETED. Saved report to: {eval_results_path}")
    print("=" * 60)
    return report


if __name__ == "__main__":
    run_evaluation_benchmark()
