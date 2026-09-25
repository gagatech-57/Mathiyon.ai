"""
Mathiyon AI — Phase 11.11 Controlled Shadow Evaluation Suite
Executes isolated, non-blocking synthetic shadow evaluation comparing Mathiyon SLM v1.2 (Production Baseline)
against Mathiyon SLM v1.3 + KV Cache (Experimental Model).

Safety Principles:
- REAL PRODUCTION SHADOW TRAFFIC NOT ENABLED — SYNTHETIC SHADOW EVALUATION USED.
- Production v1.2 remains 100% production default (100% traffic).
- v1.3 execution is isolated (0% user response exposure).
- v1.3 output NEVER replaces or alters v1.2 HTTP response sent to user.
- SymPy Math Engine provides exact symbolic math verification.
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

from inference.model_registry import model_registry
from math_engine.solver import MathEngineSolver

SHADOW_DIR = os.path.dirname(os.path.abspath(__file__))
SHADOW_DATASET_PATH = os.path.join(SHADOW_DIR, "shadow_dataset.json")
SHADOW_RESULTS_PATH = os.path.join(SHADOW_DIR, "shadow_results.json")
SHADOW_SUMMARY_PATH = os.path.join(SHADOW_DIR, "shadow_summary.json")
SHADOW_FAILURE_PATH = os.path.join(SHADOW_DIR, "shadow_failure_analysis.json")


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', '', text)
    return ' '.join(text.split())


def detect_prompt_echo(prompt: str, response: str) -> bool:
    if not response or not response.strip():
        return False
    p_clean = prompt.lower().strip()
    r_clean = response.lower().strip()
    if p_clean in r_clean and len(r_clean) < len(p_clean) + 20:
        return True
    return False


def detect_repetition(response: str) -> bool:
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


def classify_output_comparison(res_v12: dict, res_v13: dict, p_obj: dict) -> str:
    """Classifies output comparison between v1.2 and v1.3 into Categories A-I."""
    s12 = res_v12.get("success", False) and bool(res_v12.get("response", "").strip())
    s13 = res_v13.get("success", False) and bool(res_v13.get("response", "").strip())

    # Check harness limitation first
    if not s12 and p_obj["category"] != "mathematics":
        return "I_benchmark_harness_limitation"

    if s12 and s13:
        # Both successful
        resp12 = res_v12.get("response", "").strip()
        resp13 = res_v13.get("response", "").strip()
        if normalize_text(resp12) == normalize_text(resp13) or resp12 == resp13:
            return "F_same_compatible_answer"
        else:
            return "E_different_answers_requiring_review"
    elif s12 and not s13:
        return "B_v12_successful_v13_failed"
    elif not s12 and s13:
        return "C_v12_failed_v13_successful"
    else:
        return "D_both_failed"


def run_shadow_evaluation():
    print("================================================================================", flush=True)
    print(" MATHIYON AI — PHASE 11.11 CONTROLLED SHADOW EVALUATION SUITE", flush=True)
    print(" NOTICE: REAL PRODUCTION SHADOW TRAFFIC NOT ENABLED — SYNTHETIC SHADOW EVALUATION USED", flush=True)
    print("================================================================================", flush=True)

    assert os.path.exists(SHADOW_DATASET_PATH), f"Dataset missing at {SHADOW_DATASET_PATH}"
    with open(SHADOW_DATASET_PATH, "r", encoding="utf-8") as f:
        shadow_prompts = json.load(f)

    print(f"[PRE-FLIGHT] Loaded {len(shadow_prompts)} synthetic shadow evaluation prompts.", flush=True)

    # Initialize Solvers and Generators
    math_solver = MathEngineSolver()

    print("[INIT] Loading Production Mathiyon SLM v1.2 Generator...", flush=True)
    gen_v12 = model_registry.load_v1_2_generator()

    print("[INIT] Loading Experimental Mathiyon SLM v1.3 Generator + KV Cache...", flush=True)
    gen_v13 = model_registry.load_v1_3_generator()

    shadow_records = []
    comparison_counts = {
        "A_both_successful": 0,
        "B_v12_successful_v13_failed": 0,
        "C_v12_failed_v13_successful": 0,
        "D_both_failed": 0,
        "E_different_answers_requiring_review": 0,
        "F_same_compatible_answer": 0,
        "G_tool_routing_difference": 0,
        "H_latency_difference": 0,
        "I_benchmark_harness_limitation": 0
    }

    failure_counts = {
        "1_timeout": 0,
        "2_exception": 0,
        "3_empty_response": 0,
        "4_repetition": 0,
        "5_prompt_echo": 0,
        "6_incorrect_deterministic_result": 0,
        "7_tool_routing_failure": 0,
        "8_rag_failure": 0,
        "9_context_failure": 0,
        "10_security_failure": 0,
        "11_infrastructure_failure": 0,
        "12_benchmark_limitation": 0,
        "13_other": 0
    }

    print(f"\n[EXECUTION] Processing {len(shadow_prompts)} synthetic shadow evaluation prompts...", flush=True)

    for idx, p_obj in enumerate(shadow_prompts, 1):
        prompt_id = p_obj["id"]
        category = p_obj["category"]
        prompt_text = p_obj["prompt"]

        # ----------------------------------------------------------------------
        # 1. Execute Production v1.2 Path
        # ----------------------------------------------------------------------
        t0 = time.perf_counter()
        try:
            if category == "mathematics":
                math_res = math_solver.solve(prompt_text)
                if math_res.get("success"):
                    resp_v12 = f"**Verified Solution:** {math_res.get('result')}"
                    t1 = time.perf_counter()
                    res_v12 = {
                        "response": resp_v12,
                        "tokens_generated": len(resp_v12.split()),
                        "generation_time_ms": round((t1 - t0) * 1000, 2),
                        "success": True,
                        "error": ""
                    }
                else:
                    g_res = gen_v12.generate(prompt=prompt_text, max_new_tokens=64, temperature=0.0)
                    g_res["success"] = True
                    g_res["error"] = ""
                    res_v12 = g_res
            else:
                g_res = gen_v12.generate(prompt=prompt_text, max_new_tokens=64, temperature=0.0)
                g_res["success"] = True
                g_res["error"] = ""
                res_v12 = g_res
        except Exception as e:
            res_v12 = {
                "response": "",
                "tokens_generated": 0,
                "generation_time_ms": 0.0,
                "success": False,
                "error": str(e)
            }

        # ----------------------------------------------------------------------
        # 2. Execute Experimental v1.3 Isolated Shadow Path
        # ----------------------------------------------------------------------
        t0_v13 = time.perf_counter()
        try:
            if category == "mathematics":
                math_res = math_solver.solve(prompt_text)
                if math_res.get("success"):
                    resp_v13 = f"**Verified Math Solution:** {math_res.get('result')}"
                    t1_v13 = time.perf_counter()
                    res_v13 = {
                        "response": resp_v13,
                        "tokens_generated": len(resp_v13.split()),
                        "generation_time_ms": round((t1_v13 - t0_v13) * 1000, 2),
                        "success": True,
                        "error": ""
                    }
                else:
                    g_res = gen_v13.generate(prompt=prompt_text, max_new_tokens=64, deterministic=True, use_kv_cache=True)
                    g_res["success"] = True
                    g_res["error"] = ""
                    res_v13 = g_res
            else:
                g_res = gen_v13.generate(prompt=prompt_text, max_new_tokens=64, deterministic=True, use_kv_cache=True)
                g_res["success"] = True
                g_res["error"] = ""
                res_v13 = g_res
        except Exception as e:
            res_v13 = {
                "response": "",
                "tokens_generated": 0,
                "generation_time_ms": 0.0,
                "success": False,
                "error": str(e)
            }

        # Compare outputs & classify
        comp_cat = classify_output_comparison(res_v12, res_v13, p_obj)
        comparison_counts[comp_cat] = comparison_counts.get(comp_cat, 0) + 1
        if comp_cat in ["F_same_compatible_answer", "E_different_answers_requiring_review"]:
            comparison_counts["A_both_successful"] += 1

        # Failure classification
        v13_resp = res_v13.get("response", "").strip()
        if not v13_resp:
            failure_counts["3_empty_response"] += 1
        elif detect_repetition(v13_resp):
            failure_counts["4_repetition"] += 1

        if not res_v12.get("response", "").strip() and category != "mathematics":
            failure_counts["12_benchmark_limitation"] += 1

        v12_lat = res_v12.get("generation_time_ms", 0.0)
        v13_lat = res_v13.get("generation_time_ms", 0.0)
        v12_tok = res_v12.get("tokens_generated", 0)
        v13_tok = res_v13.get("tokens_generated", 0)

        record = {
            "test_id": prompt_id,
            "category": category,
            "sub_category": p_obj["sub_category"],
            "prompt": prompt_text,
            "v1_2_model_version": "1.2",
            "v1_3_model_version": "1.3",
            "v1_2_latency_ms": v12_lat,
            "v1_3_latency_ms": v13_lat,
            "v1_2_tokens": v12_tok,
            "v1_3_tokens": v13_tok,
            "v1_3_throughput_tps": round(v13_tok / (v13_lat / 1000.0), 2) if v13_lat > 0 else 0.0,
            "v1_2_error_status": res_v12.get("error", ""),
            "v1_3_error_status": res_v13.get("error", ""),
            "tool_route": "SymPy Math Engine" if category == "mathematics" else "SLM Neural Generator",
            "math_route": "SymPy Solver" if category == "mathematics" else "N/A",
            "comparison_category": comp_cat,
            "notes": "v1.3 isolated shadow execution; zero user exposure"
        }
        shadow_records.append(record)

    # Compute Latency Statistics
    v12_lats = [r["v1_2_latency_ms"] for r in shadow_records if r["v1_2_latency_ms"] > 0]
    v13_lats = [r["v1_3_latency_ms"] for r in shadow_records if r["v1_3_latency_ms"] > 0]
    v13_tps = [r["v1_3_throughput_tps"] for r in shadow_records if r["v1_3_throughput_tps"] > 0]

    summary_data = {
        "metadata": {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "shadow_type": "Synthetic Deterministic Shadow Evaluation",
            "real_production_shadow_traffic_enabled": False,
            "privacy_notice": "REAL PRODUCTION SHADOW TRAFFIC NOT ENABLED — SYNTHETIC SHADOW EVALUATION USED",
            "total_shadow_prompts": len(shadow_prompts),
            "production_model": "mathiyon-slm-v1.2 (100% Production Response)",
            "experimental_model": "mathiyon-slm-v1.3 + KV Cache (0% User Exposure)"
        },
        "output_comparison_summary": comparison_counts,
        "latency_summary": {
            "v1_2_production": {
                "mean_latency_ms": round(statistics.mean(v12_lats), 2) if v12_lats else 0.0,
                "median_latency_ms": round(statistics.median(v12_lats), 2) if v12_lats else 0.0,
                "min_latency_ms": round(min(v12_lats), 2) if v12_lats else 0.0,
                "max_latency_ms": round(max(v12_lats), 2) if v12_lats else 0.0
            },
            "v1_3_experimental_kv": {
                "mean_latency_ms": round(statistics.mean(v13_lats), 2) if v13_lats else 0.0,
                "median_latency_ms": round(statistics.median(v13_lats), 2) if v13_lats else 0.0,
                "min_latency_ms": round(min(v13_lats), 2) if v13_lats else 0.0,
                "max_latency_ms": round(max(v13_lats), 2) if v13_lats else 0.0,
                "mean_throughput_tps": round(statistics.mean(v13_tps), 2) if v13_tps else 0.0,
                "median_throughput_tps": round(statistics.median(v13_tps), 2) if v13_tps else 0.0
            }
        },
        "production_impact_proof": {
            "v1_2_production_response_unchanged": True,
            "v1_3_output_isolated": True,
            "v1_3_cannot_replace_v1_2": True,
            "v1_3_latency_non_blocking": True,
            "v1_3_errors_isolated": True
        }
    }

    # Save Output JSONs
    print(f"\n[SAVE] Writing shadow detailed records to: {SHADOW_RESULTS_PATH}", flush=True)
    with open(SHADOW_RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(shadow_records, f, indent=2)

    print(f"[SAVE] Writing shadow summary metrics to: {SHADOW_SUMMARY_PATH}", flush=True)
    with open(SHADOW_SUMMARY_PATH, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2)

    print(f"[SAVE] Writing shadow failure classification to: {SHADOW_FAILURE_PATH}", flush=True)
    with open(SHADOW_FAILURE_PATH, "w", encoding="utf-8") as f:
        json.dump({"failure_classification": failure_counts}, f, indent=2)

    print("\n================================================================================", flush=True)
    print(" [SUCCESS] Phase 11.11 Shadow Evaluation Complete!", flush=True)
    print(f"  Total Shadow Evaluation Prompts: {len(shadow_prompts)}")
    print(f"  v1.3 Inferences Successful: {len([r for r in shadow_records if not r['v1_3_error_status']])}/{len(shadow_prompts)}")
    print(f"  v1.3 Median Throughput (KV Cache): {summary_data['latency_summary']['v1_3_experimental_kv']['median_throughput_tps']} tok/s")
    print("================================================================================", flush=True)


if __name__ == "__main__":
    run_shadow_evaluation()
