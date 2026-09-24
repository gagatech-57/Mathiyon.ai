"""
Mathiyon AI — Phase 11.4 Isolated Evaluation & Benchmark Suite
Compares Production Mathiyon SLM v1.2 against Mathiyon SLM v1.3 (pretrained + instruction-tuned checkpoint).

Strict Rules:
- Isolated evaluation only.
- Does NOT modify v1.2 or v1.3 code/checkpoints.
- Does NOT alter production routing.
- Records exact empirical measurements for all 250 benchmark prompts.
"""
import os
import sys
import time
import json
import re
import math
import torch
import torch.nn.functional as F

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from tokenizer.bpe_tokenizer import MathiyonTokenizer
from models.v1_3.config import MathiyonSLMv13Config
from models.v1_3.model import MathiyonSLMv13, get_target_device
from inference.generator import MathiyonGenerator
from math_engine.solver import MathEngineSolver

EVAL_DIR = os.path.dirname(os.path.abspath(__file__))
BENCHMARK_PROMPTS_PATH = os.path.join(EVAL_DIR, "benchmark_prompts.json")
BENCHMARK_RESULTS_PATH = os.path.join(EVAL_DIR, "benchmark_results.json")
RAW_OUTPUTS_V1_2_PATH = os.path.join(EVAL_DIR, "raw_outputs_v1_2.json")
RAW_OUTPUTS_V1_3_PATH = os.path.join(EVAL_DIR, "raw_outputs_v1_3.json")

# Checkpoint Paths
V1_2_CHECKPOINT = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.2", "latest", "best.pt")
V1_2_TOKENIZER = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.2", "latest", "tokenizer_v1.2.json")

V1_3_CHECKPOINT = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "instruction_tuning", "best_instruction.pt")
V1_3_TOKENIZER = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "latest", "tokenizer_v1.3.json")


def detect_prompt_echo(prompt: str, response: str) -> bool:
    """Checks if the model response echoes or merely repeats the prompt."""
    if not response or not response.strip():
        return False
    p_clean = prompt.lower().strip()
    r_clean = response.lower().strip()
    if p_clean in r_clean:
        return True
    p_words = set(re.findall(r'\b\w+\b', p_clean))
    r_words = set(re.findall(r'\b\w+\b', r_clean))
    if len(p_words) > 3 and len(r_words) > 0:
        overlap = len(p_words.intersection(r_words)) / float(len(p_words))
        if overlap > 0.85 and len(r_words) < len(p_words) + 5:
            return True
    return False


def detect_repetition(response: str) -> bool:
    """Detects repeated n-grams or word loops in response text."""
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


def detect_code_block(response: str) -> bool:
    """Checks if response contains Markdown code blocks."""
    if not response:
        return False
    return "```" in response or "function " in response or "const " in response or "def " in response


def evaluate_instruction_following(prompt_obj: dict, response: str) -> dict:
    """Deterministic scoring of instruction following capabilities."""
    p_text = prompt_obj["prompt"].lower()
    cat = prompt_obj["category"]
    
    followed_task = True
    format_preserved = True
    score = 100.0
    deductions = []

    if not response or not response.strip():
        return {"score": 0.0, "followed_task": False, "format_preserved": False, "reason": "Empty output"}

    if "one sentence" in p_text:
        sentences = [s.strip() for s in re.split(r'[.!\n]', response) if len(s.strip()) > 5]
        if len(sentences) > 2:
            format_preserved = False
            score -= 30.0
            deductions.append("Exceeded single sentence constraint")

    if "bullet points" in p_text or "bulleted list" in p_text:
        if not ("•" in response or "-" in response or "*" in response):
            format_preserved = False
            score -= 30.0
            deductions.append("Missing requested bullet points format")

    if "json" in p_text or "json object" in p_text:
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if not json_match:
                format_preserved = False
                score -= 40.0
                deductions.append("No JSON object structure found")
        except Exception:
            format_preserved = False
            score -= 40.0
            deductions.append("Invalid JSON output")

    if "code block" in p_text or ("write a" in p_text and cat == "coding"):
        if "```" not in response and "def " not in response and "function" not in response:
            format_preserved = False
            score -= 25.0
            deductions.append("Missing code block structure")

    if detect_prompt_echo(prompt_obj["prompt"], response):
        followed_task = False
        score -= 50.0
        deductions.append("Response echoed prompt")

    if detect_repetition(response):
        score -= 30.0
        deductions.append("Response contains excessive repetition")

    score = max(0.0, score)
    return {
        "score": round(score, 2),
        "followed_task": followed_task and (score >= 50.0),
        "format_preserved": format_preserved,
        "deductions": deductions
    }


def generate_v1_3_autoregressive(model, tokenizer, prompt: str, max_new_tokens: int = 32, device: torch.device = None) -> tuple:
    """Generates autoregressive output for SLM v1.3 model."""
    formatted_prompt = f"Instruction:\n{prompt}\nResponse:\n"
    token_ids = tokenizer.encode(formatted_prompt)
    
    if token_ids and token_ids[-1] == tokenizer.eos_id:
        token_ids = token_ids[:-1]

    if not token_ids:
        token_ids = [tokenizer.bos_id]

    input_tensor = torch.tensor([token_ids], device=device)
    prompt_len = input_tensor.shape[1]

    t0 = time.perf_counter()
    with torch.no_grad():
        for _ in range(max_new_tokens):
            if input_tensor.shape[1] >= 512:
                break
            logits = model(input_tensor)
            next_token_logits = logits[0, -1, :] / 0.7
            
            top_k_logits, top_k_indices = torch.topk(next_token_logits, min(40, next_token_logits.size(-1)))
            probs = F.softmax(top_k_logits, dim=-1)
            next_idx_in_topk = torch.multinomial(probs, num_samples=1).item()
            next_token_id = top_k_indices[next_idx_in_topk].item()

            input_tensor = torch.cat([input_tensor, torch.tensor([[next_token_id]], device=device)], dim=1)
            if next_token_id == tokenizer.eos_id:
                break

    t1 = time.perf_counter()
    gen_time_ms = round((t1 - t0) * 1000, 2)

    gen_token_ids = input_tensor[0].tolist()
    new_token_ids = gen_token_ids[prompt_len:]
    
    response_text = tokenizer.decode(new_token_ids)
    return response_text, len(new_token_ids), gen_time_ms


def run_eval_suite():
    print("==================================================================", flush=True)
    print(" MATHIYON AI — PHASE 11.4 SLM v1.2 vs v1.3 BENCHMARK SUITE", flush=True)
    print("==================================================================", flush=True)

    device = get_target_device("auto")
    device_name = "CUDA" if device.type == "cuda" else "CPU"
    print(f"[ENV] Benchmark Execution Device: {device_name} ({device})", flush=True)

    assert os.path.exists(V1_2_CHECKPOINT), f"v1.2 Checkpoint missing at {V1_2_CHECKPOINT}"
    assert os.path.exists(V1_3_CHECKPOINT), f"v1.3 Checkpoint missing at {V1_3_CHECKPOINT}"
    assert os.path.exists(V1_2_TOKENIZER), f"v1.2 Tokenizer missing at {V1_2_TOKENIZER}"
    assert os.path.exists(V1_3_TOKENIZER), f"v1.3 Tokenizer missing at {V1_3_TOKENIZER}"

    print(f"[CHECKPOINT v1.2] Path: {V1_2_CHECKPOINT} | Status: VERIFIED", flush=True)
    print(f"[CHECKPOINT v1.3] Path: {V1_3_CHECKPOINT} | Status: VERIFIED", flush=True)

    t0_v12 = time.perf_counter()
    v12_generator = MathiyonGenerator()
    v12_load_ms = round((time.perf_counter() - t0_v12) * 1000, 2)
    tok_v12 = MathiyonTokenizer(vocab_size=5000, vocab_path=V1_2_TOKENIZER)
    print(f"[LOAD v1.2] Loaded in {v12_load_ms} ms", flush=True)

    t0_v13 = time.perf_counter()
    tok_v13 = MathiyonTokenizer(vocab_path=V1_3_TOKENIZER)
    v13_payload = torch.load(V1_3_CHECKPOINT, map_location=device, weights_only=False)
    v13_config = MathiyonSLMv13Config()
    v13_model = MathiyonSLMv13(v13_config).to(device)
    v13_model.load_state_dict(v13_payload["model_state"])
    v13_model.eval()
    v13_load_ms = round((time.perf_counter() - t0_v13) * 1000, 2)
    print(f"[LOAD v1.3] Loaded in {v13_load_ms} ms (Param Count: 21.95M)", flush=True)

    assert os.path.exists(BENCHMARK_PROMPTS_PATH), f"Benchmark prompts file missing at {BENCHMARK_PROMPTS_PATH}"
    with open(BENCHMARK_PROMPTS_PATH, "r", encoding="utf-8") as f:
        prompts_dataset = json.load(f)

    prompts_list = prompts_dataset["prompts"]
    print(f"[DATASET] Loaded {len(prompts_list)} benchmark prompts across categories: {prompts_dataset['metadata']['category_counts']}", flush=True)

    raw_outputs_v12 = []
    raw_outputs_v13 = []
    comparison_results = []

    metrics_v12 = {
        "total_time_ms": 0.0,
        "first_latency_ms": 0.0,
        "total_tokens": 0,
        "empty_count": 0,
        "echo_count": 0,
        "repetition_count": 0,
        "code_block_count": 0,
        "math_exact_matches": 0,
        "math_total": 0,
        "instruction_scores": []
    }

    metrics_v13 = {
        "total_time_ms": 0.0,
        "first_latency_ms": 0.0,
        "total_tokens": 0,
        "empty_count": 0,
        "echo_count": 0,
        "repetition_count": 0,
        "code_block_count": 0,
        "math_exact_matches": 0,
        "math_total": 0,
        "instruction_scores": []
    }

    category_breakdown = {}

    print("\n--- EXECUTING 250-PROMPT SIDE-BY-SIDE BENCHMARK EVALUATION ---", flush=True)

    for idx, p_obj in enumerate(prompts_list):
        p_id = p_obj["id"]
        cat = p_obj["category"]
        prompt_text = p_obj["prompt"]

        if cat not in category_breakdown:
            category_breakdown[cat] = {
                "count": 0,
                "v12_latency_sum": 0.0,
                "v13_latency_sum": 0.0,
                "v12_tokens_sum": 0,
                "v13_tokens_sum": 0,
                "v12_math_exact": 0,
                "v13_math_exact": 0,
                "math_count": 0
            }

        category_breakdown[cat]["count"] += 1

        # v1.2 Evaluation
        res_v12 = v12_generator.generate(prompt_text)
        text_v12 = res_v12["response"]
        time_v12 = res_v12["generation_time_ms"]
        tokens_v12 = len(tok_v12.encode(text_v12))

        if idx == 0:
            metrics_v12["first_latency_ms"] = time_v12

        metrics_v12["total_time_ms"] += time_v12
        metrics_v12["total_tokens"] += tokens_v12
        category_breakdown[cat]["v12_latency_sum"] += time_v12
        category_breakdown[cat]["v12_tokens_sum"] += tokens_v12

        is_empty_v12 = len(text_v12.strip()) == 0
        is_echo_v12 = detect_prompt_echo(prompt_text, text_v12)
        is_rep_v12 = detect_repetition(text_v12)
        has_code_v12 = detect_code_block(text_v12)

        if is_empty_v12: metrics_v12["empty_count"] += 1
        if is_echo_v12: metrics_v12["echo_count"] += 1
        if is_rep_v12: metrics_v12["repetition_count"] += 1
        if has_code_v12: metrics_v12["code_block_count"] += 1

        inst_eval_v12 = evaluate_instruction_following(p_obj, text_v12)
        metrics_v12["instruction_scores"].append(inst_eval_v12["score"])

        raw_outputs_v12.append({
            "id": p_id,
            "category": cat,
            "prompt": prompt_text,
            "raw_response": text_v12,
            "tokens_generated": tokens_v12,
            "generation_time_ms": time_v12,
            "is_empty": is_empty_v12,
            "prompt_echo": is_echo_v12,
            "repetition_detected": is_rep_v12,
            "code_block_present": has_code_v12,
            "instruction_score": inst_eval_v12["score"]
        })

        # v1.3 Evaluation
        text_v13, tokens_v13, time_v13 = generate_v1_3_autoregressive(
            v13_model, tok_v13, prompt_text, max_new_tokens=32, device=device
        )

        if idx == 0:
            metrics_v13["first_latency_ms"] = time_v13

        metrics_v13["total_time_ms"] += time_v13
        metrics_v13["total_tokens"] += tokens_v13
        category_breakdown[cat]["v13_latency_sum"] += time_v13
        category_breakdown[cat]["v13_tokens_sum"] += tokens_v13

        is_empty_v13 = len(text_v13.strip()) == 0
        is_echo_v13 = detect_prompt_echo(prompt_text, text_v13)
        is_rep_v13 = detect_repetition(text_v13)
        has_code_v13 = detect_code_block(text_v13)

        if is_empty_v13: metrics_v13["empty_count"] += 1
        if is_echo_v13: metrics_v13["echo_count"] += 1
        if is_rep_v13: metrics_v13["repetition_count"] += 1
        if has_code_v13: metrics_v13["code_block_count"] += 1

        inst_eval_v13 = evaluate_instruction_following(p_obj, text_v13)
        metrics_v13["instruction_scores"].append(inst_eval_v13["score"])

        raw_outputs_v13.append({
            "id": p_id,
            "category": cat,
            "prompt": prompt_text,
            "raw_response": text_v13,
            "tokens_generated": tokens_v13,
            "generation_time_ms": time_v13,
            "is_empty": is_empty_v13,
            "prompt_echo": is_echo_v13,
            "repetition_detected": is_rep_v13,
            "code_block_present": has_code_v13,
            "instruction_score": inst_eval_v13["score"]
        })

        # Math verification
        verified_answer = None
        exact_match_v12 = False
        exact_match_v13 = False

        if cat == "mathematics":
            metrics_v12["math_total"] += 1
            metrics_v13["math_total"] += 1
            category_breakdown[cat]["math_count"] += 1

            solver_res = MathEngineSolver.solve(prompt_text)
            if solver_res["success"]:
                verified_answer = str(solver_res["result"])
            else:
                verified_answer = "N/A"

            if verified_answer and verified_answer != "N/A":
                v12_num = re.findall(r'\b\d+(?:\.\d+)?\b', text_v12)
                v13_num = re.findall(r'\b\d+(?:\.\d+)?\b', text_v13)
                v_num = re.findall(r'\b\d+(?:\.\d+)?\b', verified_answer)

                if v_num:
                    target_val = v_num[0]
                    exact_match_v12 = target_val in v12_num or verified_answer in text_v12
                    exact_match_v13 = target_val in v13_num or verified_answer in text_v13

            if exact_match_v12:
                metrics_v12["math_exact_matches"] += 1
                category_breakdown[cat]["v12_math_exact"] += 1

            if exact_match_v13:
                metrics_v13["math_exact_matches"] += 1
                category_breakdown[cat]["v13_math_exact"] += 1

        comparison_results.append({
            "id": p_id,
            "category": cat,
            "prompt": prompt_text,
            "verified_mathematical_answer": verified_answer,
            "v1_2": {
                "response": text_v12,
                "latency_ms": time_v12,
                "tokens": tokens_v12,
                "exact_math_match": exact_match_v12,
                "instruction_score": inst_eval_v12["score"]
            },
            "v1_3": {
                "response": text_v13,
                "latency_ms": time_v13,
                "tokens": tokens_v13,
                "exact_math_match": exact_match_v13,
                "instruction_score": inst_eval_v13["score"]
            }
        })

        if (idx + 1) % 25 == 0 or (idx + 1) == len(prompts_list):
            print(f"  [PROGRESS] Evaluated {idx + 1}/250 prompts...", flush=True)

    # Tokenizer Benchmark
    print("\n--- EXECUTING TOKENIZER BENCHMARK ---", flush=True)
    domain_samples = {
        "English": ["What is artificial intelligence?", "Explain cloud computing and microservices architecture.", "Describe software engineering best practices."],
        "Coding": ["const sum = (a, b) => a + b;", "def calculate_factorial(n: int) -> int:", "import React, { useState } from 'react';"],
        "Mathematics": ["Calculate 25 + 37.", "Solve 2x + 5 = 15.", "f'(x) = 2x + 3 for f(x) = x^2 + 3x + 5"]
    }

    tokenizer_benchmark = {}
    for dom, samples in domain_samples.items():
        v12_tokens_list = [tok_v12.encode(s) for s in samples]
        v13_tokens_list = [tok_v13.encode(s) for s in samples]

        v12_flat = [t for seq in v12_tokens_list for t in seq]
        v13_flat = [t for seq in v13_tokens_list for t in seq]

        v12_unk = v12_flat.count(tok_v12.unk_id)
        v13_unk = v13_flat.count(tok_v13.unk_id)

        tokenizer_benchmark[dom] = {
            "v12_vocab_size": tok_v12.vocab_size,
            "v12_avg_tokens": round(len(v12_flat) / len(samples), 2),
            "v12_max_tokens": max(len(seq) for seq in v12_tokens_list),
            "v12_unk_rate_pct": round((v12_unk / max(1, len(v12_flat))) * 100, 2),
            "v13_vocab_size": tok_v13.vocab_size,
            "v13_avg_tokens": round(len(v13_flat) / len(samples), 2),
            "v13_max_tokens": max(len(seq) for seq in v13_tokens_list),
            "v13_unk_rate_pct": round((v13_unk / max(1, len(v13_flat))) * 100, 2)
        }

    with open(RAW_OUTPUTS_V1_2_PATH, "w", encoding="utf-8") as f:
        json.dump(raw_outputs_v12, f, indent=2, ensure_ascii=False)

    with open(RAW_OUTPUTS_V1_3_PATH, "w", encoding="utf-8") as f:
        json.dump(raw_outputs_v13, f, indent=2, ensure_ascii=False)

    num_prompts = len(prompts_list)

    summary_report = {
        "metadata": {
            "evaluation_date": time.strftime("%Y-%m-%d %H:%M:%S"),
            "hardware_device": device_name,
            "total_prompts_tested": num_prompts,
            "checkpoint_v1_2": V1_2_CHECKPOINT,
            "checkpoint_v1_3": V1_3_CHECKPOINT
        },
        "v1_2_summary": {
            "model_name": "Mathiyon SLM v1.2 (Production)",
            "checkpoint_load_time_ms": v12_load_ms,
            "first_generation_latency_ms": round(metrics_v12["first_latency_ms"], 2),
            "avg_generation_latency_ms": round(metrics_v12["total_time_ms"] / num_prompts, 2),
            "total_tokens_generated": metrics_v12["total_tokens"],
            "tokens_per_second": round(metrics_v12["total_tokens"] / max(0.001, metrics_v12["total_time_ms"] / 1000.0), 2),
            "empty_output_rate_pct": round((metrics_v12["empty_count"] / num_prompts) * 100, 2),
            "prompt_echo_rate_pct": round((metrics_v12["echo_count"] / num_prompts) * 100, 2),
            "repetition_rate_pct": round((metrics_v12["repetition_count"] / num_prompts) * 100, 2),
            "code_block_rate_pct": round((metrics_v12["code_block_count"] / num_prompts) * 100, 2),
            "math_exact_match_accuracy_pct": round((metrics_v12["math_exact_matches"] / max(1, metrics_v12["math_total"])) * 100, 2),
            "avg_instruction_following_score": round(sum(metrics_v12["instruction_scores"]) / num_prompts, 2)
        },
        "v1_3_summary": {
            "model_name": "Mathiyon SLM v1.3 (Instruction Tuned Checkpoint)",
            "checkpoint_load_time_ms": v13_load_ms,
            "first_generation_latency_ms": round(metrics_v13["first_latency_ms"], 2),
            "avg_generation_latency_ms": round(metrics_v13["total_time_ms"] / num_prompts, 2),
            "total_tokens_generated": metrics_v13["total_tokens"],
            "tokens_per_second": round(metrics_v13["total_tokens"] / max(0.001, metrics_v13["total_time_ms"] / 1000.0), 2),
            "empty_output_rate_pct": round((metrics_v13["empty_count"] / num_prompts) * 100, 2),
            "prompt_echo_rate_pct": round((metrics_v13["echo_count"] / num_prompts) * 100, 2),
            "repetition_rate_pct": round((metrics_v13["repetition_count"] / num_prompts) * 100, 2),
            "code_block_rate_pct": round((metrics_v13["code_block_count"] / num_prompts) * 100, 2),
            "math_exact_match_accuracy_pct": round((metrics_v13["math_exact_matches"] / max(1, metrics_v13["math_total"])) * 100, 2),
            "avg_instruction_following_score": round(sum(metrics_v13["instruction_scores"]) / num_prompts, 2)
        },
        "category_breakdown": category_breakdown,
        "tokenizer_benchmark": tokenizer_benchmark,
        "comparison_results": comparison_results
    }

    with open(BENCHMARK_RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, indent=2, ensure_ascii=False)

    print("\n==================================================================", flush=True)
    print(" BENCHMARK COMPLETED SUCCESSFULLY!", flush=True)
    print(f" Summary Results Saved to : {BENCHMARK_RESULTS_PATH}", flush=True)
    print(f" Raw Outputs v1.2 Saved to : {RAW_OUTPUTS_V1_2_PATH}", flush=True)
    print(f" Raw Outputs v1.3 Saved to : {RAW_OUTPUTS_V1_3_PATH}", flush=True)
    print("==================================================================", flush=True)

    print(f" v1.2 Avg Latency : {summary_report['v1_2_summary']['avg_generation_latency_ms']} ms | Math Accuracy: {summary_report['v1_2_summary']['math_exact_match_accuracy_pct']}%", flush=True)
    print(f" v1.3 Avg Latency : {summary_report['v1_3_summary']['avg_generation_latency_ms']} ms | Math Accuracy: {summary_report['v1_3_summary']['math_exact_match_accuracy_pct']}%", flush=True)
    print("==================================================================", flush=True)

    return summary_report

if __name__ == "__main__":
    run_eval_suite()
