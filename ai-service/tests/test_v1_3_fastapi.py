"""
Integration Test Suite for FastAPI Endpoints (Phase 11.5)
Tests GET /health, GET /models, POST /generate (v1.2 production default), POST /generate/v1.3 (v1.3 experimental),
invalid model rejections, and SymPy Math Engine preservation.
"""
import os
import sys
from fastapi import HTTPException

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import (
    health_check,
    get_model_registry_info,
    generate_ai_response,
    generate_v13_experimental_response,
    solve_math_problem,
    GenerateRequest,
    Generatev13Request,
    MathSolveRequest
)


def test_health_endpoint():
    print("[FASTAPI TEST 1/8] GET /health Endpoint...")
    data = health_check()
    assert data["status"] == "ok"
    assert data["service"] == "Mathiyon AI"
    assert data["version"] == "1.2"
    assert data["registry_active"] is True
    print("  -> GET /health status=ok & registry_active=True: PASSED")


def test_models_registry_endpoint():
    print("[FASTAPI TEST 2/8] GET /models Endpoint...")
    data = get_model_registry_info()

    assert data["activeModel"] == "mathiyon-slm-v1.2"
    assert data["defaultModel"] == "mathiyon-slm-v1.2"
    assert "mathiyon-slm-v1.2" in data["availableModels"]
    assert "mathiyon-slm-v1.3" in data["availableModels"]

    registered = data["registeredModels"]
    v12_entry = next((m for m in registered if m["model_id"] == "mathiyon-slm-v1.2"), None)
    v13_entry = next((m for m in registered if m["model_id"] == "mathiyon-slm-v1.3"), None)

    assert v12_entry is not None and v12_entry["production"] is True
    assert v12_entry["status"] == "production"

    assert v13_entry is not None and v13_entry["production"] is False
    assert v13_entry["status"] == "experimental"
    print("  -> GET /models reports v1.2 (production) and v1.3 (experimental): PASSED")


def test_generate_production_v1_2_default():
    print("[FASTAPI TEST 3/8] POST /generate Default Production (v1.2)...")
    payload = GenerateRequest(message="What is artificial intelligence?")
    data = generate_ai_response(payload)

    assert "Mathiyon SLM v1.2" in data["model"]
    assert data["version"] == "1.2"
    assert "response" in data and len(data["response"]) > 0
    assert data["generation_time_ms"] > 0
    print(f"  -> POST /generate default uses v1.2 (Latency: {data['generation_time_ms']} ms): PASSED")


def test_generate_v1_3_experimental_endpoint():
    print("[FASTAPI TEST 4/8] POST /generate/v1.3 Experimental Endpoint...")
    payload = Generatev13Request(prompt="Explain what a REST API is.", max_new_tokens=16, deterministic=True)
    data = generate_v13_experimental_response(payload)

    assert data["model"] == "mathiyon-slm-v1.3"
    assert data["experimental"] is True
    assert "response" in data
    assert data["generation_time_ms"] > 0
    print(f"  -> POST /generate/v1.3 experimental endpoint (Latency: {data['generation_time_ms']} ms): PASSED")


def test_generate_override_model_selection():
    print("[FASTAPI TEST 5/8] POST /generate with explicit model override...")
    payload = GenerateRequest(message="What is TypeScript?", model="mathiyon-slm-v1.3", max_new_tokens=16)
    data = generate_ai_response(payload)

    assert data["model"] == "mathiyon-slm-v1.3"
    assert data["version"] == "1.3"
    print("  -> POST /generate explicit v1.3 override: PASSED")


def test_invalid_model_rejection_api():
    print("[FASTAPI TEST 6/8] POST /generate invalid model rejection...")
    payload = GenerateRequest(message="Hello", model="mathiyon-invalid-v9.9")
    try:
        generate_ai_response(payload)
        assert False, "Should have raised HTTPException 400 for invalid model"
    except HTTPException as e:
        assert e.status_code == 400
        assert "Invalid model ID" in e.detail
        print("  -> Invalid model ID rejected with 400 Bad Request: PASSED")


def test_empty_prompt_rejection():
    print("[FASTAPI TEST 7/8] Empty prompt validation...")
    try:
        generate_ai_response(GenerateRequest(message="   "))
        assert False, "Should have raised HTTPException 400 for empty message"
    except HTTPException as e:
        assert e.status_code == 400

    try:
        generate_v13_experimental_response(Generatev13Request(prompt=""))
        assert False, "Should have raised HTTPException 400 for empty prompt"
    except HTTPException as e:
        assert e.status_code == 400
    print("  -> Empty prompt validation: PASSED")


def test_math_engine_preservation():
    print("[FASTAPI TEST 8/8] POST /math/solve SymPy Math Engine Preservation...")
    payload = MathSolveRequest(question="Solve 2x + 5 = 15")
    data = solve_math_problem(payload)

    assert data["success"] is True
    assert data["result"] == "x = 5"
    assert data["verified"] is True
    print("  -> SymPy Math Engine solve 2x + 5 = 15 => x = 5: PASSED")


def run_all_fastapi_tests():
    print("==================================================")
    print(" RUNNING MATHIYON FASTAPI v1.3 INTEGRATION TESTS")
    print("==================================================")
    test_health_endpoint()
    test_models_registry_endpoint()
    test_generate_production_v1_2_default()
    test_generate_v1_3_experimental_endpoint()
    test_generate_override_model_selection()
    test_invalid_model_rejection_api()
    test_empty_prompt_rejection()
    test_math_engine_preservation()
    print("==================================================")
    print(" ALL 8 FASTAPI INTEGRATION TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_all_fastapi_tests()
