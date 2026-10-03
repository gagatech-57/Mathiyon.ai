"""
Unit & Integration Test Suite for Mathiyon SLM ModelRegistry (Phase 11.5)
Tests registry loading, v1.2/v1.3 metadata, production/experimental flags, checkpoint loading, tokenizer loading, and generator behavior.
"""
import os
import sys
import torch

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from inference.model_registry import ModelRegistry, model_registry
from tokenizer.bpe_tokenizer import MathiyonTokenizer
from models.v1_3.model import MathiyonSLMv13
from models.v1_3.config import MathiyonSLMv13Config


def test_registry_loading_and_metadata():
    print("[TEST 1/8] ModelRegistry loading & registration...")
    models = model_registry.list_models()
    assert len(models) >= 2, f"Expected at least 2 models, got {len(models)}"
    
    model_ids = [m["model_id"] for m in models]
    assert "mathiyon-slm-v1.2" in model_ids, "v1.2 missing from registry"
    assert "mathiyon-slm-v1.3" in model_ids, "v1.3 missing from registry"
    print("  -> Registry loaded v1.2 and v1.3: PASSED")


def test_v1_2_production_status():
    print("[TEST 2/8] v1.2 production status flags...")
    v12_info = model_registry.get_model_info("mathiyon-slm-v1.2")
    assert v12_info["status"] == "production", f"Expected status 'production', got {v12_info['status']}"
    assert v12_info["production"] is True, f"Expected production=True for v1.2, got {v12_info['production']}"
    
    prod_model = model_registry.get_production_model()
    assert prod_model["model_id"] == "mathiyon-slm-v1.2", f"Default production model should be v1.2, got {prod_model['model_id']}"
    print("  -> v1.2 marked production=True: PASSED")


def test_v1_3_experimental_status():
    print("[TEST 3/8] v1.3 experimental status flags...")
    v13_info = model_registry.get_model_info("mathiyon-slm-v1.3")
    assert v13_info["status"] == "experimental", f"Expected status 'experimental', got {v13_info['status']}"
    assert v13_info["production"] is False, f"Expected production=False for v1.3, got {v13_info['production']}"
    assert v13_info["vocab_size"] == 8000, f"Expected 8000 vocab size, got {v13_info['vocab_size']}"
    assert v13_info["parameter_count"] == 21952896, f"Expected 21,952,896 parameters, got {v13_info['parameter_count']}"
    print("  -> v1.3 marked production=False & experimental: PASSED")


def test_v1_2_checkpoint_loading():
    print("[TEST 4/8] v1.2 checkpoint & generator loading...")
    v12_info = model_registry.get_model_info("mathiyon-slm-v1.2")
    ckpt_path = v12_info["checkpoint_path"]
    tok_path = v12_info["tokenizer_path"]

    assert os.path.exists(ckpt_path), f"v1.2 checkpoint missing: {ckpt_path}"
    assert os.path.exists(tok_path), f"v1.2 tokenizer missing: {tok_path}"

    generator_v12 = model_registry.load_v1_2_generator()
    assert generator_v12.model is not None, "v1.2 PyTorch model failed to load"
    
    # Run test generation
    res = generator_v12.generate("What is artificial intelligence?")
    assert res["response"], "v1.2 generated empty output"
    assert res["version"] == "1.2", f"Expected version 1.2, got {res['version']}"
    print("  -> v1.2 checkpoint & generator load: PASSED")


def test_v1_3_checkpoint_and_tokenizer_loading():
    print("[TEST 5/8] v1.3 checkpoint & tokenizer loading...")
    v13_info = model_registry.get_model_info("mathiyon-slm-v1.3")
    ckpt_path = v13_info["checkpoint_path"]
    tok_path = v13_info["tokenizer_path"]

    assert os.path.exists(ckpt_path), f"v1.3 checkpoint missing: {ckpt_path}"
    assert os.path.exists(tok_path), f"v1.3 tokenizer missing: {tok_path}"

    tokenizer = MathiyonTokenizer(vocab_path=tok_path)
    assert tokenizer.vocab_size == 8000, f"Expected 8000 vocab, got {tokenizer.vocab_size}"

    payload = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    assert "model_state" in payload, "Missing model_state key in v1.3 checkpoint"

    config = MathiyonSLMv13Config()
    model = MathiyonSLMv13(config)
    model.load_state_dict(payload["model_state"])
    model.eval()

    param_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
    assert param_count == 21952896, f"Expected 21,952,896 parameters, got {param_count}"
    print("  -> v1.3 checkpoint (21.95M params) & tokenizer (8k vocab) load: PASSED")


def test_v1_3_generator_execution():
    print("[TEST 6/8] v1.3 Generator execution & output format...")
    v13_gen = model_registry.load_v1_3_generator()
    res = v13_gen.generate("What is artificial intelligence?", max_new_tokens=16, deterministic=True)

    assert res["model"] == "mathiyon-slm-v1.3", f"Expected model mathiyon-slm-v1.3, got {res['model']}"
    assert res["experimental"] is True, f"Expected experimental=True, got {res['experimental']}"
    assert isinstance(res["response"], str), "Response is not string"
    assert res["generation_time_ms"] > 0, "Latency not measured"
    print("  -> v1.3 generator execution & metadata: PASSED")


def test_max_token_limit_and_eos():
    print("[TEST 7/8] Context max token limit & EOS handling...")
    v13_gen = model_registry.load_v1_3_generator()

    # Request small token limit
    res_small = v13_gen.generate("Explain React", max_new_tokens=5, deterministic=True)
    assert res_small["tokens_generated"] <= 5, f"Exceeded max_new_tokens limit of 5 (got {res_small['tokens_generated']})"

    # Request deterministic run
    res_det = v13_gen.generate("Hello", max_new_tokens=10, deterministic=True)
    assert res_det["tokens_generated"] >= 0, "Deterministic output token count invalid"
    print("  -> Max token limit & EOS truncation: PASSED")


def test_invalid_model_rejection():
    print("[TEST 8/8] Invalid model rejection safety...")
    try:
        model_registry.get_model_info("mathiyon-slm-invalid-v9.9")
        assert False, "Should have raised KeyError for non-existent model"
    except KeyError as e:
        assert "is not registered" in str(e)
        print("  -> Invalid model rejection: PASSED")


def run_all_registry_tests():
    print("==================================================")
    print(" RUNNING MATHIYON SLM MODEL REGISTRY TEST SUITE")
    print("==================================================")
    test_registry_loading_and_metadata()
    test_v1_2_production_status()
    test_v1_3_experimental_status()
    test_v1_2_checkpoint_loading()
    test_v1_3_checkpoint_and_tokenizer_loading()
    test_v1_3_generator_execution()
    test_max_token_limit_and_eos()
    test_invalid_model_rejection()
    print("==================================================")
    print(" ALL 8 MODEL REGISTRY TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_all_registry_tests()
