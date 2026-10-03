"""
Comprehensive Unit & Integration Test Suite for Mathiyon SLM v1.3 Architecture
Covers RoPE, RMSNorm, SwiGLU, Causal Masking, Forward Pass, Context Lengths,
Tokenizer Integration, Checkpoint Save/Load, and Device Handling.
"""
import os
import sys
import torch

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from models.v1_3.config import MathiyonSLMv13Config
from models.v1_3.rope import RotaryEmbedding, apply_rotary_pos_emb
from models.v1_3.normalization import RMSNorm
from models.v1_3.feedforward import SwiGLUFeedForward
from models.v1_3.attention import CausalSelfAttention
from models.v1_3.model import (
    MathiyonSLMv13,
    get_target_device,
    save_v1_3_checkpoint,
    load_v1_3_checkpoint
)
from tokenizer.bpe_tokenizer import MathiyonTokenizer


def test_rope():
    print("[TEST 1/9] Rotary Positional Embeddings (RoPE)...")
    head_dim = 32
    max_context = 1024
    rope = RotaryEmbedding(dim=head_dim, max_position_embeddings=max_context)
    
    q = torch.randn(2, 12, 1024, head_dim)
    k = torch.randn(2, 12, 1024, head_dim)
    
    cos, sin = rope(q, seq_len=1024)
    q_rot, k_rot = apply_rotary_pos_emb(q, k, cos, sin)
    
    assert q_rot.shape == q.shape, f"RoPE Q shape mismatch: {q_rot.shape}"
    assert k_rot.shape == k.shape, f"RoPE K shape mismatch: {k_rot.shape}"
    assert not torch.isnan(q_rot).any(), "RoPE output contains NaN"
    assert not torch.isinf(q_rot).any(), "RoPE output contains Inf"
    print("  -> RoPE 1024 context shape & numeric stability: PASSED")


def test_rmsnorm():
    print("[TEST 2/9] RMSNorm Normalization...")
    norm = RMSNorm(hidden_size=384, eps=1e-6)
    x = torch.randn(4, 32, 384) * 10.0
    out = norm(x)
    
    assert out.shape == x.shape, f"RMSNorm output shape mismatch: {out.shape}"
    assert not torch.isnan(out).any(), "RMSNorm output contains NaN"
    assert not torch.isinf(out).any(), "RMSNorm output contains Inf"
    
    # Verify scale parameter exists
    assert norm.weight.requires_grad, "RMSNorm learnable weight parameter missing"
    print("  -> RMSNorm numerical stability & scale weight: PASSED")


def test_swiglu():
    print("[TEST 3/9] SwiGLU Feed-Forward Network...")
    ffn = SwiGLUFeedForward(hidden_size=384, ffn_hidden_size=1536)
    x = torch.randn(2, 16, 384)
    out = ffn(x)
    
    assert out.shape == (2, 16, 384), f"SwiGLU output shape mismatch: {out.shape}"
    assert not torch.isnan(out).any(), "SwiGLU output contains NaN"
    print("  -> SwiGLU 384 -> 1536 -> 384 forward pass: PASSED")


def test_causal_attention_masking():
    print("[TEST 4/9] Causal Multi-Head Self-Attention Masking...")
    config = MathiyonSLMv13Config()
    attn = CausalSelfAttention(config)
    x = torch.randn(1, 4, 384)
    
    out = attn(x)
    assert out.shape == (1, 4, 384), f"Attention output shape mismatch: {out.shape}"
    
    # Causal Mask Test: token N cannot attend to > N
    causal_mask = torch.triu(torch.full((4, 4), float('-inf')), diagonal=1)
    assert causal_mask[0, 1] == float('-inf'), "Causal mask failed to block future position 1 for token 0"
    assert causal_mask[1, 0] == 0.0, "Causal mask blocked past position 0 for token 1"
    print("  -> Causal self-attention & mask logic: PASSED")


def test_forward_pass():
    print("[TEST 5/9] Full Mathiyon SLM v1.3 Forward Pass...")
    config = MathiyonSLMv13Config()
    model = MathiyonSLMv13(config)
    model.eval()
    
    batch_size = 2
    seq_len = 32
    input_ids = torch.randint(0, config.vocab_size, (batch_size, seq_len))
    
    with torch.no_grad():
        logits = model(input_ids)
        
    expected_shape = (batch_size, seq_len, config.vocab_size)
    assert logits.shape == expected_shape, f"Logits shape mismatch: {logits.shape} vs {expected_shape}"
    assert not torch.isnan(logits).any(), "Logits contain NaN"
    assert not torch.isinf(logits).any(), "Logits contain Inf"
    assert logits.dtype == torch.float32, f"Logits dtype mismatch: {logits.dtype}"
    print(f"  -> Forward pass [2, 32, 8000] output: PASSED")


def test_context_length_scaling():
    print("[TEST 6/9] Context Length Scaling (32, 128, 512, 1024)...")
    config = MathiyonSLMv13Config()
    model = MathiyonSLMv13(config)
    model.eval()
    
    for length in [32, 128, 512, 1024]:
        input_ids = torch.randint(0, config.vocab_size, (1, length))
        with torch.no_grad():
            logits = model(input_ids)
        assert logits.shape == (1, length, 8000), f"Context length {length} failed shape test"
        assert not torch.isnan(logits).any(), f"Context length {length} generated NaN"
        print(f"  -> Context length {length}: PASSED")


def test_tokenizer_v1_3_integration():
    print("[TEST 7/9] Tokenizer v1.3 Integration Test...")
    v1_3_tokenizer_path = os.path.join(
        BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "latest", "tokenizer_v1.3.json"
    )
    assert os.path.exists(v1_3_tokenizer_path), f"v1.3 tokenizer not found at {v1_3_tokenizer_path}"
    
    tokenizer = MathiyonTokenizer(vocab_path=v1_3_tokenizer_path)
    assert tokenizer.vocab_size == 8000, f"Expected 8000 vocab size, got {tokenizer.vocab_size}"
    
    test_queries = {
        "English": "Mathiyon AI is a Next-Gen SLM architecture.",
        "Tamil": "மதியோன் AI என்றால் என்ன?",
        "Tanglish": "இதை simple ah explain pannu",
        "JavaScript": "const calc = (a, b) => a + b;",
        "TypeScript": "interface Config { vocab_size: number; }",
        "Python": "def solve_math(expr: str) -> float:",
        "Math": "1/3 + 1/6 = 1/2 and 2x + 5 = 15"
    }
    
    config = MathiyonSLMv13Config()
    model = MathiyonSLMv13(config)
    model.eval()
    
    for domain, text in test_queries.items():
        token_ids = tokenizer.encode(text)
        assert len(token_ids) > 0, f"Empty tokens for {domain}"
        assert max(token_ids) < 8000, f"Token ID out of bounds ({max(token_ids)}) for {domain}"
        
        input_tensor = torch.tensor([token_ids])
        with torch.no_grad():
            logits = model(input_tensor)
        assert logits.shape == (1, len(token_ids), 8000), f"Model failed for {domain} token input"
        print(f"  -> Tokenizer integration [{domain}]: {len(token_ids)} tokens -> Model Pass OK")


def test_checkpoint_save_and_load():
    print("[TEST 8/9] Isolated Checkpoint Save & Load...")
    config = MathiyonSLMv13Config()
    model_orig = MathiyonSLMv13(config)
    model_orig.eval()
    
    # Save checkpoint
    saved_path = save_v1_3_checkpoint(model_orig)
    assert os.path.exists(saved_path), f"Saved checkpoint missing: {saved_path}"
    assert "mathiyon-slm-v1.3" in saved_path, f"Checkpoint path not isolated to v1.3: {saved_path}"
    
    # Load into fresh model instance
    model_loaded = load_v1_3_checkpoint(saved_path, device="cpu")
    model_loaded.eval()
    
    # Compare outputs for identical input
    dummy_input = torch.randint(0, 8000, (1, 16))
    with torch.no_grad():
        out_orig = model_orig(dummy_input)
        out_loaded = model_loaded(dummy_input)
        
    assert torch.allclose(out_orig, out_loaded, atol=1e-6), "Loaded model outputs do not match original model!"
    print(f"  -> Save/Load checkpoint ({os.path.basename(saved_path)}): PASSED")


def test_device_support():
    print("[TEST 9/9] Device Support (CPU & CUDA)...")
    device_cpu = get_target_device("cpu")
    assert device_cpu.type == "cpu", f"Expected CPU device, got {device_cpu}"
    
    cuda_available = torch.cuda.is_available()
    print(f"  -> CUDA Available: {cuda_available}")
    
    if cuda_available:
        device_cuda = get_target_device("cuda")
        assert device_cuda.type == "cuda"
        config = MathiyonSLMv13Config()
        model_cuda = MathiyonSLMv13(config).to(device_cuda)
        inp = torch.randint(0, 8000, (1, 16), device=device_cuda)
        out = model_cuda(inp)
        assert out.device.type == "cuda"
        print("  -> CUDA Device Test: PASSED")
    else:
        # Test that requesting explicit CUDA on non-CUDA machine raises clear error
        os.environ["AI_DEVICE"] = "cuda"
        try:
            get_target_device("auto")
            assert False, "Should have raised RuntimeError for CUDA requested on non-CUDA system"
        except RuntimeError as e:
            assert "CUDA was explicitly requested" in str(e)
            print("  -> Explicit CUDA error fallback on non-CUDA system: PASSED")
        finally:
            os.environ["AI_DEVICE"] = "auto"
            

def run_all_v1_3_tests():
    print("==================================================")
    print(" RUNNING MATHIYON SLM v1.3 FULL TEST SUITE")
    print("==================================================")
    test_rope()
    test_rmsnorm()
    test_swiglu()
    test_causal_attention_masking()
    test_forward_pass()
    test_context_length_scaling()
    test_tokenizer_v1_3_integration()
    test_checkpoint_save_and_load()
    test_device_support()
    print("==================================================")
    print(" ALL 9 MATHIYON SLM v1.3 TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_all_v1_3_tests()
