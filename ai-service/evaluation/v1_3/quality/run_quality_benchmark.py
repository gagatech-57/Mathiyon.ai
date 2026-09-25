"""
Mathiyon AI — Phase 11.9 Quality & Capability Benchmark Execution Suite
Evaluates Mathiyon SLM v1.2 (Production Baseline) vs Mathiyon SLM v1.3 + KV Cache (Experimental Optimization).

Rules:
- Isolated quality evaluation.
- Mathiyon SLM v1.2 remains 100% production default.
- Mathiyon SLM v1.3 remains experimental.
- Does NOT alter production routing or retrain models.
- Uses existing KV cache implementation.
- Uses existing SymPy Math Engine for exact math computations (SLM is not authoritative calculator).
"""

import os
import sys
import time
import json
import re
import statistics
import torch

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from tokenizer.bpe_tokenizer import MathiyonTokenizer
from models.v1_3.config import MathiyonSLMv13Config
from models.v1_3.model import MathiyonSLMv13, get_target_device
from inference.generator import MathiyonGenerator as Mathiyonv12Generator
from inference.v1_3_generator import Mathiyonv13Generator
from math_engine.solver import MathEngineSolver

QUALITY_DIR = os.path.dirname(os.path.abspath(__file__))
BENCHMARK_PROMPTS_PATH = os.path.join(QUALITY_DIR, "benchmark_prompts.json")
BENCHMARK_RESULTS_PATH = os.path.join(QUALITY_DIR, "benchmark_results.json")
SUMMARY_PATH = os.path.join(QUALITY_DIR, "summary.json")

# Model Checkpoints
V1_2_CHECKPOINT = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.2", "latest", "best.pt")
V1_2_TOKENIZER = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.2", "latest", "tokenizer_v1.2.json")

V1_3_CHECKPOINT = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "instruction_tuning", "best_instruction.pt")
V1_3_TOKENIZER = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "latest", "tokenizer_v1.3.json")


def detect_prompt_echo(prompt: str, response: str) -> bool:
    """Detects if response echoes the prompt."""
    if not response or not response.strip():
        return False
    p_clean = prompt.lower().strip()
    r_clean = response.lower().strip()
    if p_clean in r_clean and len(r_clean) < len(p_clean) + 20:
        return True
    p_words = set(re.findall(r'\b\w+\b', p_clean))
    r_words = set(re.findall(r'\b\w+\b', r_clean))
    if len(p_words) > 3 and len(r_words) > 0:
        overlap = len(p_words.intersection(r_words)) / float(len(p_words))
        if overlap > 0.85 and len(r_words) < len(p_words) + 5:
            return True
    return False


def detect_repetition(response: str) -> bool:
    """Detects repeated n-grams or loops in output."""
    if not response or not response.strip():
        return False
    words = re.findall(r'\b\w+\b', response.lower())
    if len(words) < 6:
        return False
    trigrams = {}
    for i in range(len(words) - 2):
        tg = (words[i], words[i+1], words[i+2])
        trigrams[tg] = trigrams.get(tg, 0) + 1
        if trigrams[tg] >= 4:
            return True
    return False


def normalize_text(text: str) -> str:
    """Normalizes text string for exact match comparison."""
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', '', text)
    return ' '.join(text.split())


def evaluate_correctness(prompt_obj: dict, response: str, math_solver: MathEngineSolver) -> dict:
    """Evaluates response correctness using deterministic checks."""
    ref = prompt_obj.get("reference_answer", "")
    etype = prompt_obj.get("eval_type", "contains")
    pattern = prompt_obj.get("eval_pattern", "")
    category = prompt_obj.get("category", "")

    if not response or not response.strip():
        return {
            "exact_match": False,
            "normalized_match": False,
            "correctness": False,
            "score": 0.0,
            "bypassed_slm": False
        }

    # Math Category: Check SymPy Engine Integration
    bypassed_slm = False
    if category == "mathematics" or etype == "sympy_math":
        bypassed_slm = True
        math_res = math_solver.solve(prompt_obj["prompt"])
        if math_res.get("success"):
            math_output = str(math_res.get("result", ""))
            exact = (math_output.strip() == ref.strip()) or (pattern in math_output)
            norm_match = normalize_text(math_output) == normalize_text(ref)
            return {
                "exact_match": exact,
                "normalized_match": norm_match or exact,
                "correctness": exact or norm_match,
                "score": 100.0 if (exact or norm_match) else 0.0,
                "bypassed_slm": True,
                "sympy_result": math_output
            }

    # Exact text match
    exact = (response.strip() == ref.strip())
    # Normalized match
    norm_match = (normalize_text(response) == normalize_text(ref))
    
    # Pattern matching according to evaluation type
    correctness = False
    score = 0.0

    if etype == "contains":
        correctness = pattern.lower() in response.lower()
        score = 100.0 if correctness else 0.0
    elif etype == "structure":
        if pattern == "one_sentence":
            sents = [s.strip() for s in re.split(r'[.!\n]', response) if len(s.strip()) > 5]
            correctness = (len(sents) <= 2) and (len(response.strip()) > 10)
        elif pattern == "bullet_points":
            correctness = any(b in response for b in ["•", "-", "*", "1."])
        elif pattern == "json_object":
            correctness = "{" in response and "}" in response
        elif pattern == "code_only":
            correctness = ("function" in response or "def " in response or "select" in response.lower() or "const" in response or "<" in response or "print" in response)
        elif pattern == "concise_5_words":
            words = response.strip().split()
            correctness = len(words) <= 10
        elif pattern == "step_by_step":
            correctness = "step" in response.lower() or "1." in response or ":" in response
        elif pattern == "explain_then_example":
            correctness = len(response) > 20 and ("example" in response.lower() or "let " in response or "=" in response or "def " in response)
        else:
            correctness = pattern.lower() in response.lower()
        score = 100.0 if correctness else 0.0
    else:
        correctness = exact or norm_match or (pattern.lower() in response.lower())
        score = 100.0 if correctness else 0.0

    return {
        "exact_match": exact,
        "normalized_match": norm_match,
        "correctness": correctness,
        "score": score,
        "bypassed_slm": bypassed_slm
    }


def compute_category_metrics(results_list: list) -> dict:
    """Computes comprehensive evaluation metrics for a result subset."""
    total = len(results_list)
    if total == 0:
        return {}

    successful = [r for r in results_list if r.get("success", False)]
    empty = [r for r in results_list if not r.get("response") or not r["response"].strip()]
    echoed = [r for r in results_list if r.get("prompt_echo", False)]
    repeated = [r for r in results_list if r.get("repetition", False)]
    errors = [r for r in results_list if r.get("error")]

    exact_matches = [r for r in results_list if r.get("exact_match", False)]
    norm_matches = [r for r in results_list if r.get("normalized_match", False)]
    correct = [r for r in results_list if r.get("correctness", False)]

    resp_lengths = [len(r.get("response", "")) for r in results_list]
    latencies = [r.get("latency_ms", 0.0) for r in results_list]
    tokens = [r.get("tokens_generated", 0) for r in results_list]
    speeds = [r.get("tokens_per_sec", 0.0) for r in results_list if r.get("tokens_per_sec", 0.0) > 0]

    return {
        "total_prompts": total,
        "successful_responses": len(successful),
        "empty_responses": len(empty),
        "prompt_echo_count": len(echoed),
        "prompt_echo_rate": round(len(echoed) / total * 100, 2),
        "repetition_count": len(repeated),
        "repetition_rate": round(len(repeated) / total * 100, 2),
        "avg_response_length_chars": round(statistics.mean(resp_lengths), 2) if resp_lengths else 0.0,
        "median_response_length_chars": round(statistics.median(resp_lengths), 2) if resp_lengths else 0.0,
        "avg_latency_ms": round(statistics.mean(latencies), 2) if latencies else 0.0,
        "median_latency_ms": round(statistics.median(latencies), 2) if latencies else 0.0,
        "total_tokens_generated": sum(tokens),
        "avg_throughput_tps": round(statistics.mean(speeds), 2) if speeds else 0.0,
        "median_throughput_tps": round(statistics.median(speeds), 2) if speeds else 0.0,
        "errors_exceptions": len(errors),
        "exact_match_count": len(exact_matches),
        "exact_match_rate": round(len(exact_matches) / total * 100, 2),
        "normalized_match_count": len(norm_matches),
        "normalized_match_rate": round(len(norm_matches) / total * 100, 2),
        "correctness_count": len(correct),
        "correctness_rate": round(len(correct) / total * 100, 2)
    }


def run_benchmark():
    print("================================================================================", flush=True)
    print(" MATHIYON AI — PHASE 11.9 QUALITY & CAPABILITY EVALUATION SUITE", flush=True)
    print("================================================================================", flush=True)

    assert os.path.exists(BENCHMARK_PROMPTS_PATH), f"Prompts missing at {BENCHMARK_PROMPTS_PATH}"
    with open(BENCHMARK_PROMPTS_PATH, "r", encoding="utf-8") as f:
        prompts = json.load(f)

    print(f"[PRE-FLIGHT] Loaded {len(prompts)} quality benchmark prompts.", flush=True)

    # Instantiate Models & Solvers
    math_solver = MathEngineSolver()

    print("[INIT] Loading Mathiyon SLM v1.2 Generator (Production Baseline)...", flush=True)
    from inference.model_registry import model_registry
    gen_v12 = model_registry.load_v1_2_generator()

    print("[INIT] Loading Mathiyon SLM v1.3 Generator (Experimental + KV Cache)...", flush=True)
    gen_v13 = model_registry.load_v1_3_generator()

    results_v12 = []
    results_v13 = []

    print(f"\n[EXECUTION] Evaluating {len(prompts)} prompts across 5 categories...", flush=True)

    for idx, p_obj in enumerate(prompts, 1):
        prompt_id = p_obj["id"]
        category = p_obj["category"]
        prompt_text = p_obj["prompt"]

        if idx % 50 == 0 or idx == 1 or idx == len(prompts):
            print(f"  Processing prompt {idx}/{len(prompts)} [{prompt_id}] ({category})...", flush=True)

        # ----------------------------------------------------------------------
        # Model A: v1.2 Production Baseline Execution
        # ----------------------------------------------------------------------
        try:
            t0 = time.perf_counter()
            # If math category, check math solver integration
            if category == "mathematics":
                math_res = math_solver.solve(prompt_text)
                if math_res.get("success"):
                    resp_v12_text = f"**Verified Solution:** {math_res.get('result')}"
                    t1 = time.perf_counter()
                    gen_v12_res = {
                        "response": resp_v12_text,
                        "tokens_generated": len(resp_v12_text.split()),
                        "generation_time_ms": round((t1 - t0) * 1000, 2)
                    }
                else:
                    gen_v12_res = gen_v12.generate(prompt=prompt_text, max_new_tokens=64, temperature=0.0)
            else:
                gen_v12_res = gen_v12.generate(prompt=prompt_text, max_new_tokens=64, temperature=0.0)

            v12_resp = gen_v12_res.get("response", "").strip()
            v12_latency = gen_v12_res.get("generation_time_ms", 0.0)
            v12_tokens = gen_v12_res.get("tokens_generated", 0)
            v12_tps = round(v12_tokens / (v12_latency / 1000.0), 2) if v12_latency > 0 else 0.0

            v12_eval = evaluate_correctness(p_obj, v12_resp, math_solver)

            results_v12.append({
                "id": prompt_id,
                "category": category,
                "sub_category": p_obj["sub_category"],
                "prompt": prompt_text,
                "response": v12_resp,
                "success": True,
                "error": "",
                "latency_ms": v12_latency,
                "tokens_generated": v12_tokens,
                "tokens_per_sec": v12_tps,
                "prompt_echo": detect_prompt_echo(prompt_text, v12_resp),
                "repetition": detect_repetition(v12_resp),
                "exact_match": v12_eval["exact_match"],
                "normalized_match": v12_eval["normalized_match"],
                "correctness": v12_eval["correctness"],
                "score": v12_eval["score"],
                "bypassed_slm": v12_eval["bypassed_slm"]
            })
        except Exception as e:
            results_v12.append({
                "id": prompt_id,
                "category": category,
                "prompt": prompt_text,
                "response": "",
                "success": False,
                "error": str(e),
                "latency_ms": 0.0,
                "tokens_generated": 0,
                "tokens_per_sec": 0.0,
                "exact_match": False,
                "normalized_match": False,
                "correctness": False,
                "score": 0.0
            })

        # ----------------------------------------------------------------------
        # Model B: v1.3 Experimental + KV Cache Execution
        # ----------------------------------------------------------------------
        try:
            t0 = time.perf_counter()
            if category == "mathematics":
                # For exact mathematics, routing detects math intent & sends to SymPy Math Engine
                math_res = math_solver.solve(prompt_text)
                if math_res.get("success"):
                    resp_v13_text = f"**Verified Math Solution:** {math_res.get('result')}"
                    t1 = time.perf_counter()
                    gen_v13_res = {
                        "response": resp_v13_text,
                        "tokens_generated": len(resp_v13_text.split()),
                        "generation_time_ms": round((t1 - t0) * 1000, 2)
                    }
                else:
                    gen_v13_res = gen_v13.generate(prompt=prompt_text, max_new_tokens=64, deterministic=True, use_kv_cache=True)
            else:
                gen_v13_res = gen_v13.generate(prompt=prompt_text, max_new_tokens=64, deterministic=True, use_kv_cache=True)

            v13_resp = gen_v13_res.get("response", "").strip()
            v13_latency = gen_v13_res.get("generation_time_ms", 0.0)
            v13_tokens = gen_v13_res.get("tokens_generated", 0)
            v13_tps = round(v13_tokens / (v13_latency / 1000.0), 2) if v13_latency > 0 else 0.0

            v13_eval = evaluate_correctness(p_obj, v13_resp, math_solver)

            results_v13.append({
                "id": prompt_id,
                "category": category,
                "sub_category": p_obj["sub_category"],
                "prompt": prompt_text,
                "response": v13_resp,
                "success": True,
                "error": "",
                "latency_ms": v13_latency,
                "tokens_generated": v13_tokens,
                "tokens_per_sec": v13_tps,
                "prompt_echo": detect_prompt_echo(prompt_text, v13_resp),
                "repetition": detect_repetition(v13_resp),
                "exact_match": v13_eval["exact_match"],
                "normalized_match": v13_eval["normalized_match"],
                "correctness": v13_eval["correctness"],
                "score": v13_eval["score"],
                "bypassed_slm": v13_eval["bypassed_slm"]
            })
        except Exception as e:
            results_v13.append({
                "id": prompt_id,
                "category": category,
                "prompt": prompt_text,
                "response": "",
                "success": False,
                "error": str(e),
                "latency_ms": 0.0,
                "tokens_generated": 0,
                "tokens_per_sec": 0.0,
                "exact_match": False,
                "normalized_match": False,
                "correctness": False,
                "score": 0.0
            })

    # Group by category and compute summary metrics
    categories = ["general_english", "coding", "mathematics", "instruction_following", "reasoning"]

    summary_data = {
        "metadata": {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "device": str(get_target_device("auto")),
            "cpu_threads": torch.get_num_threads(),
            "total_benchmark_prompts": len(prompts),
            "model_v1_2": {
                "version": "1.2",
                "checkpoint": V1_2_CHECKPOINT,
                "parameter_count": 5850000,
                "vocab_size": 5000,
                "context_length": 512,
                "decoding": "Greedy (deterministic)",
                "routing": "Production hybrid (SLM + Tools + SymPy)"
            },
            "model_v1_3": {
                "version": "1.3",
                "checkpoint": V1_3_CHECKPOINT,
                "parameter_count": 21952896,
                "vocab_size": 8000,
                "context_length": 1024,
                "kv_cache": True,
                "decoding": "Greedy (deterministic)",
                "routing": "Experimental (SLM v1.3 + KV Cache + SymPy Math Engine)"
            }
        },
        "overall_summary": {
            "v1_2_production": compute_category_metrics(results_v12),
            "v1_3_experimental_kv": compute_category_metrics(results_v13)
        },
        "category_breakdown": {}
    }

    for cat in categories:
        sub_v12 = [r for r in results_v12 if r["category"] == cat]
        sub_v13 = [r for r in results_v13 if r["category"] == cat]

        summary_data["category_breakdown"][cat] = {
            "v1_2_production": compute_category_metrics(sub_v12),
            "v1_3_experimental_kv": compute_category_metrics(sub_v13)
        }

    # Save outputs
    print(f"\n[SAVE] Writing per-prompt evaluation results to: {BENCHMARK_RESULTS_PATH}", flush=True)
    with open(BENCHMARK_RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "v1_2_results": results_v12,
            "v1_3_results": results_v13
        }, f, indent=2)

    print(f"[SAVE] Writing aggregated summary to: {SUMMARY_PATH}", flush=True)
    with open(SUMMARY_PATH, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2)

    print("\n================================================================================", flush=True)
    print(" [SUCCESS] Quality Benchmark Evaluation Complete!", flush=True)
    print(f"  v1.2 Overall Correctness Rate: {summary_data['overall_summary']['v1_2_production']['correctness_rate']}%")
    print(f"  v1.3 Overall Correctness Rate: {summary_data['overall_summary']['v1_3_experimental_kv']['correctness_rate']}%")
    print(f"  v1.3 Throughput with KV Cache: {summary_data['overall_summary']['v1_3_experimental_kv']['avg_throughput_tps']} tok/s")
    print("================================================================================", flush=True)


if __name__ == "__main__":
    run_benchmark()
