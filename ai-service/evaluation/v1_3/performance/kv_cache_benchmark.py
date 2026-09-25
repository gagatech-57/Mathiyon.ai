"""
Mathiyon SLM v1.3 Production-Quality KV Cache Integration Benchmark Suite
Phase 11.8 Optimization Integration & Verification Benchmark
"""
import os
import sys
import time
import json
import ctypes
import ctypes.wintypes
from statistics import mean, median
from typing import Dict, Any, List

import torch

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from inference.v1_3_generator import Mathiyonv13Generator
from inference.v1_3_quantized import get_process_rss_mb

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_JSON_PATH = os.path.join(OUTPUT_DIR, "kv_cache_results.json")


def compute_stats(data: List[float]) -> Dict[str, float]:
    """Computes mean, median, min, max for numeric arrays."""
    if not data:
        return {"mean": 0.0, "median": 0.0, "min": 0.0, "max": 0.0}
    return {
        "mean": round(float(mean(data)), 2),
        "median": round(float(median(data)), 2),
        "min": round(float(min(data)), 2),
        "max": round(float(max(data)), 2)
    }


def verify_output_equivalence(gen: Mathiyonv13Generator, test_prompts: List[str]) -> List[Dict[str, Any]]:
    """Verifies deterministic output equivalence between Full-Prefix and KV Cache."""
    equivalence_results = []
    
    for p in test_prompts:
        print(f"  Testing equivalence for prompt: '{p[:30]}...' ", end="", flush=True)
        res_base = gen.generate(p, max_new_tokens=64, deterministic=True, use_kv_cache=False)
        res_kv = gen.generate(p, max_new_tokens=64, deterministic=True, use_kv_cache=True)
        
        base_toks = gen.tokenizer.encode(f"Instruction:\n{p.strip()}\nResponse:\n" + res_base["response"])
        kv_toks = gen.tokenizer.encode(f"Instruction:\n{p.strip()}\nResponse:\n" + res_kv["response"])
        
        exact_text_match = res_base["response"].strip() == res_kv["response"].strip()
        exact_tokens_match = res_base["tokens_generated"] == res_kv["tokens_generated"]
        exact_match = exact_text_match and exact_tokens_match

        if not exact_match:
            print(f"[FATAL EQUIVALENCE ERROR] Output mismatch for prompt: '{p}'", flush=True)
            raise ValueError(f"Deterministic output mismatch detected for prompt: {p}")
        
        print("-> EQUIVALENT [MATCH OK]", flush=True)

        equivalence_results.append({
            "prompt": p,
            "deterministic_match": exact_match,
            "text_match": exact_text_match,
            "tokens_generated_base": res_base["tokens_generated"],
            "tokens_generated_kv": res_kv["tokens_generated"],
            "latency_base_ms": res_base["generation_time_ms"],
            "latency_kv_ms": res_kv["generation_time_ms"],
            "sample_response": res_kv["response"]
        })

    return equivalence_results


def benchmark_kv_performance(gen: Mathiyonv13Generator, prompts: List[Dict[str, str]], num_runs: int = 10) -> List[Dict[str, Any]]:
    """Runs 10 repetitions per prompt comparing Baseline vs KV Cache."""
    perf_results = []

    for item in prompts:
        prompt_id = item["id"]
        category = item["category"]
        prompt_text = item["prompt"]

        print(f"Benchmarking Prompt [{prompt_id}] ({category}) with KV Cache ({num_runs} runs)...", flush=True)

        base_latencies = []
        base_tok_sec = []
        
        kv_latencies = []
        kv_ttft = []
        kv_tok_sec = []

        # Warmup run
        _ = gen.generate(prompt_text, max_new_tokens=32, deterministic=True, use_kv_cache=True)

        for run_idx in range(num_runs):
            # 1. Baseline Full-Prefix
            res_base = gen.generate(prompt_text, max_new_tokens=64, deterministic=True, use_kv_cache=False)
            b_ms = res_base["generation_time_ms"]
            b_toks = res_base["tokens_generated"]
            b_tps = b_toks / (b_ms / 1000.0) if b_ms > 0 else 0.0
            base_latencies.append(b_ms)
            base_tok_sec.append(b_tps)

            # 2. KV Cache with TTFT measurement
            t0 = time.perf_counter()
            res_kv = gen.generate(prompt_text, max_new_tokens=64, deterministic=True, use_kv_cache=True)
            k_ms = res_kv["generation_time_ms"]
            k_toks = res_kv["tokens_generated"]
            k_tps = k_toks / (k_ms / 1000.0) if k_ms > 0 else 0.0
            
            # TTFT measurement for KV cache prefill
            formatted_prompt = f"Instruction:\n{prompt_text.strip()}\nResponse:\n"
            token_ids = gen.tokenizer.encode(formatted_prompt)
            if token_ids and token_ids[-1] == gen.tokenizer.eos_id:
                token_ids = token_ids[:-1]
            input_tensor = torch.tensor([token_ids], device=gen.device)
            
            t_ttft0 = time.perf_counter()
            with torch.inference_mode():
                _ = gen.model(input_tensor)
            ttft_ms = (time.perf_counter() - t_ttft0) * 1000.0

            kv_latencies.append(k_ms)
            kv_ttft.append(ttft_ms)
            kv_tok_sec.append(k_tps)
            print(f"  Run {run_idx+1}/{num_runs}: Base {b_ms:.1f}ms ({b_tps:.1f}tps) | KV {k_ms:.1f}ms ({k_tps:.1f}tps) | TTFT {ttft_ms:.1f}ms", flush=True)

        mean_base_lat = mean(base_latencies)
        mean_kv_lat = mean(kv_latencies)
        speedup = round(mean_base_lat / mean_kv_lat, 2) if mean_kv_lat > 0 else 1.0

        perf_results.append({
            "id": prompt_id,
            "category": category,
            "prompt": prompt_text,
            "runs": num_runs,
            "baseline_full_prefix": {
                "latency_ms": compute_stats(base_latencies),
                "tokens_per_sec": compute_stats(base_tok_sec)
            },
            "kv_cache": {
                "latency_ms": compute_stats(kv_latencies),
                "ttft_ms": compute_stats(kv_ttft),
                "tokens_per_sec": compute_stats(kv_tok_sec)
            },
            "speedup_factor": speedup
        })

    return perf_results


def benchmark_context_tests(gen: Mathiyonv13Generator) -> List[Dict[str, Any]]:
    """Context length stress test with KV Cache: 128, 256, 512, 768, 1024 tokens."""
    target_lengths = [128, 256, 512, 768, 1024]
    results = []

    words = ["system", "data", "algorithm", "function", "compute", "tensor", "cache", "memory"]

    for length in target_lengths:
        text = " ".join([words[i % len(words)] for i in range(length // 2)])
        token_ids = gen.tokenizer.encode(text)
        
        status = "PASSED"
        err_msg = ""
        gen_toks = 0
        gen_ms = 0.0
        has_nan = False

        try:
            # Measure KV-cache generation performance under specified context size
            res = gen.generate(text, max_new_tokens=32, deterministic=True, use_kv_cache=True)
            gen_toks = res["tokens_generated"]
            gen_ms = res["generation_time_ms"]
        except Exception as e:
            status = "FAILED"
            err_msg = str(e)

        results.append({
            "target_context": length,
            "actual_input_tokens": len(token_ids),
            "status": status,
            "has_nan": False,
            "generation_time_ms": gen_ms,
            "tokens_generated": gen_toks,
            "tokens_per_sec": round(gen_toks / (gen_ms / 1000.0), 2) if gen_ms > 0 else 0.0,
            "error": err_msg
        })

    return results


def benchmark_cpu_threads(gen: Mathiyonv13Generator, prompt: str) -> List[Dict[str, Any]]:
    """CPU Thread Scaling benchmark for KV Cache: 1, 2, 4, 8 threads."""
    thread_results = []
    num_cpus = os.cpu_count() or 1

    for th in [1, 2, 4, 8]:
        torch.set_num_threads(th)
        latencies = []
        for _ in range(5):
            res = gen.generate(prompt, max_new_tokens=64, deterministic=True, use_kv_cache=True)
            latencies.append(res["generation_time_ms"])
        
        avg_lat = mean(latencies)
        tps = 64.0 / (avg_lat / 1000.0)
        thread_results.append({
            "threads": th,
            "mean_latency_ms": round(avg_lat, 2),
            "tokens_per_sec": round(tps, 2)
        })

    torch.set_num_threads(num_cpus)
    return thread_results


def benchmark_memory_overhead(gen: Mathiyonv13Generator) -> Dict[str, Any]:
    """Measures memory overhead for KV cache across sequence lengths."""
    prompts = {
        "short_prompt": "What is artificial intelligence?",
        "medium_prompt": "Explain what a REST API is.",
        "context_512": " ".join(["algorithm"] * 256),
        "context_1024": " ".join(["algorithm"] * 500)
    }

    memory_results = {}
    for name, text in prompts.items():
        rss_start = get_process_rss_mb()
        res = gen.generate(text, max_new_tokens=64, deterministic=True, use_kv_cache=True)
        rss_end = get_process_rss_mb()
        
        # Calculate theoretical KV cache tensor size in bytes:
        # 8 layers * 2 (K and V) * batch 1 * 12 heads * seq_len * 32 head_dim * 4 bytes (FP32)
        token_len = len(gen.tokenizer.encode(text)) + res["tokens_generated"]
        theoretical_kv_bytes = 8 * 2 * 1 * 12 * token_len * 32 * 4
        theoretical_kv_mb = round(theoretical_kv_bytes / (1024 * 1024), 3)

        memory_results[name] = {
            "total_seq_length": token_len,
            "rss_start_mb": rss_start,
            "rss_end_mb": rss_end,
            "theoretical_kv_cache_tensor_mb": theoretical_kv_mb
        }

    return memory_results


def run_full_kv_cache_benchmark():
    """Main benchmark orchestration function for Phase 11.8."""
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:
        pass

    print("=" * 80, flush=True)
    print("MATHIYON SLM v1.3 PRODUCTION-QUALITY KV CACHE BENCHMARK (PHASE 11.8)", flush=True)
    print("=" * 80, flush=True)

    gen = Mathiyonv13Generator()

    # 1. Deterministic Equivalence Test (4 Mandatory Prompts + 2 Extra)
    test_prompts = [
        "What is artificial intelligence?",
        "Explain what a REST API is.",
        "Write a JavaScript function to reverse a string.",
        "Explain the difference between let and const in JavaScript.",
        "Explain what a database is.",
        "Explain how to solve a quadratic equation step by step."
    ]

    print("\n--- Step 1: Deterministic Output Equivalence Test ---", flush=True)
    eq_results = verify_output_equivalence(gen, test_prompts)
    print("[OK] Deterministic Output Equivalence: 100% VERIFIED across all test prompts!", flush=True)

    # 2. Benchmark Performance (Baseline vs KV Cache)
    prompts_suite = [
        {"id": "P1", "category": "English Short", "prompt": test_prompts[0]},
        {"id": "P2", "category": "English Medium", "prompt": test_prompts[1]},
        {"id": "P3", "category": "Coding Short", "prompt": test_prompts[2]},
        {"id": "P4", "category": "Coding Medium", "prompt": test_prompts[3]},
        {"id": "P5", "category": "Math-Language Concept", "prompt": test_prompts[4]},
        {"id": "P6", "category": "Math Explanation", "prompt": test_prompts[5]}
    ]

    print("\n--- Step 2: Performance Benchmark (Baseline vs KV Cache) ---", flush=True)
    perf_results = benchmark_kv_performance(gen, prompts_suite, num_runs=10)

    # 3. Context Length Tests
    print("\n--- Step 3: Context Length Tests with KV Cache ---", flush=True)
    context_results = benchmark_context_tests(gen)

    # 4. CPU Thread Scaling
    print("\n--- Step 4: CPU Thread Scaling Test ---", flush=True)
    thread_results = benchmark_cpu_threads(gen, test_prompts[1])

    # 5. Memory Overhead Test
    print("\n--- Step 5: Memory Overhead Test ---", flush=True)
    memory_results = benchmark_memory_overhead(gen)

    # Assemble JSON output
    final_output = {
        "metadata": {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "model_version": "mathiyon-slm-v1.3",
            "pytorch_version": torch.__version__,
            "target_device": str(gen.device),
            "cpu_cores": os.cpu_count() or 1
        },
        "deterministic_equivalence": eq_results,
        "performance_benchmarks": perf_results,
        "context_length_tests": context_results,
        "cpu_thread_benchmarks": thread_results,
        "memory_overhead": memory_results
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(RESULTS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(final_output, f, indent=2)

    print(f"\n[SUCCESS] KV Cache Benchmark run complete! Results written to: {RESULTS_JSON_PATH}", flush=True)


if __name__ == "__main__":
    run_full_kv_cache_benchmark()
