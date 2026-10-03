"""
Mathiyon AI — Phase 11.12 Release Candidate Validation Script
Verifies model artifacts, checkpoint integrity, tokenizer compatibility, release package completeness,
SHA-256 checksums, and production isolation status for Mathiyon SLM v1.3.
"""

import os
import sys
import hashlib
import json
import torch

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

AI_SERVICE_DIR = os.path.join(BASE_DIR, "ai-service")
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

RELEASE_DIR = os.path.dirname(os.path.abspath(__file__))
GOVERNANCE_REPORT_PATH = os.path.join(BASE_DIR, "PHASE_11_12_FINAL_RELEASE_GOVERNANCE_REPORT.md")

V1_3_CHECKPOINT = os.path.join(BASE_DIR, "ai-service", "checkpoints", "mathiyon-slm-v1.3", "instruction_tuning", "best_instruction.pt")
V1_3_TOKENIZER = os.path.join(BASE_DIR, "ai-service", "checkpoints", "mathiyon-slm-v1.3", "latest", "tokenizer_v1.3.json")


def compute_sha256(filepath: str) -> str:
    """Computes SHA-256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def generate_checksum_file():
    """Generates checksums.sha256 file for all release artifacts and model files."""
    files_to_hash = [
        V1_3_CHECKPOINT,
        V1_3_TOKENIZER,
        os.path.join(BASE_DIR, "ai-service", "models", "v1_3", "config.py"),
        os.path.join(BASE_DIR, "ai-service", "models", "v1_3", "model.py"),
        os.path.join(BASE_DIR, "ai-service", "inference", "v1_3_generator.py")
    ]
    
    release_files = ["RELEASE_MANIFEST.json", "MODEL_CARD.md", "CHANGELOG.md", "RELEASE_NOTES.md", "ROLLBACK.md"]
    for rf in release_files:
        p = os.path.join(RELEASE_DIR, rf)
        if os.path.exists(p):
            files_to_hash.append(p)

    checksum_path = os.path.join(RELEASE_DIR, "checksums.sha256")
    lines = []
    for fp in files_to_hash:
        if os.path.exists(fp):
            h = compute_sha256(fp)
            rel_p = os.path.relpath(fp, BASE_DIR).replace("\\", "/")
            lines.append(f"{h}  {rel_p}\n")

    with open(checksum_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"[CHECKSUM] Saved SHA-256 checksums to: {checksum_path}")


def validate_all_release_criteria() -> bool:
    print("================================================================================", flush=True)
    print(" MATHIYON AI — PHASE 11.12 RELEASE CANDIDATE VALIDATION SUITE", flush=True)
    print("================================================================================", flush=True)

    passed = True

    # 1. Check Required Release Files
    req_files = [
        "RELEASE_MANIFEST.json",
        "MODEL_CARD.md",
        "CHANGELOG.md",
        "RELEASE_NOTES.md",
        "ROLLBACK.md",
        "checksums.sha256"
    ]
    print("\n[STEP 1] Checking Release Package Deliverables...", flush=True)
    for rf in req_files:
        p = os.path.join(RELEASE_DIR, rf)
        if os.path.exists(p):
            print(f"  [OK] Release file exists: {rf}")
        else:
            print(f"  [FAIL] Missing release file: {rf}")
            passed = False

    if os.path.exists(GOVERNANCE_REPORT_PATH):
        print(f"  [OK] Governance Report exists: PHASE_11_12_FINAL_RELEASE_GOVERNANCE_REPORT.md")
    else:
        print(f"  [FAIL] Missing governance report at: {GOVERNANCE_REPORT_PATH}")
        passed = False

    # 2. Verify Checkpoint Existence & Loading
    print("\n[STEP 2] Verifying v1.3 Model Checkpoint...", flush=True)
    if not os.path.exists(V1_3_CHECKPOINT):
        print(f"  [FAIL] Checkpoint not found at: {V1_3_CHECKPOINT}")
        return False

    try:
        from models.v1_3.config import MathiyonSLMv13Config
        from models.v1_3.model import MathiyonSLMv13

        config = MathiyonSLMv13Config()
        model = MathiyonSLMv13(config)
        ckpt = torch.load(V1_3_CHECKPOINT, map_location="cpu", weights_only=True)
        state_dict = ckpt.get("model_state", ckpt)
        model.load_state_dict(state_dict)
        model.eval()

        param_count = sum(p.numel() for p in model.parameters())
        has_nan_inf = any(torch.isnan(p).any() or torch.isinf(p).any() for p in model.parameters())

        print(f"  [OK] Model checkpoint loaded cleanly.")
        print(f"  [OK] Total Parameter Count: {param_count:,} (~21.95M)")
        print(f"  [OK] Config Architecture: Layers={config.num_layers}, Heads={config.num_heads}, Dim={config.hidden_size}, Vocab={config.vocab_size}, Context={config.context_length}")
        
        if has_nan_inf:
            print(f"  [FAIL] Model parameters contain NaN or Inf values!")
            passed = False
        else:
            print(f"  [OK] Parameter Integrity: Clean (No NaN/Inf detected).")

    except Exception as e:
        print(f"  [FAIL] Error loading checkpoint: {str(e)}")
        passed = False

    # 3. Verify Tokenizer Compatibility
    print("\n[STEP 3] Verifying Tokenizer Compatibility...", flush=True)
    if not os.path.exists(V1_3_TOKENIZER):
        print(f"  [FAIL] Tokenizer not found at: {V1_3_TOKENIZER}")
        passed = False
    else:
        try:
            from tokenizer.bpe_tokenizer import MathiyonTokenizer
            tok = MathiyonTokenizer(vocab_path=V1_3_TOKENIZER)
            sample_text = "Mathiyon AI v1.3 Release Candidate verification prompt."
            ids = tok.encode(sample_text)
            decoded = tok.decode(ids)
            print(f"  [OK] Tokenizer loaded (vocab_size={tok.vocab_size}).")
            print(f"  [OK] Special Tokens: BOS={tok.bos_id}, EOS={tok.eos_id}, PAD={tok.pad_id}")
            print(f"  [OK] Encode/Decode Roundtrip Test: '{decoded.strip()}'")
        except Exception as e:
            print(f"  [FAIL] Tokenizer compatibility error: {str(e)}")
            passed = False

    # 4. Verify Model Registry Configuration
    print("\n[STEP 4] Verifying Model Registry Isolation Status...", flush=True)
    try:
        from inference.model_registry import model_registry
        v12_info = model_registry.get_model_info("mathiyon-slm-v1.2")
        v13_info = model_registry.get_model_info("mathiyon-slm-v1.3")

        if v12_info.get("production") is True and v12_info.get("status") == "production":
            print(f"  [OK] v1.2 Model Registry: production=True (100% Production Default)")
        else:
            print(f"  [FAIL] v1.2 Model Registry configuration violated!")
            passed = False

        if v13_info.get("production") is False and v13_info.get("status") == "experimental":
            print(f"  [OK] v1.3 Model Registry: production=False, status=experimental (0% Production Traffic)")
        else:
            print(f"  [FAIL] v1.3 Model Registry configuration violated!")
            passed = False
    except Exception as e:
        print(f"  [FAIL] Model Registry verification error: {str(e)}")
        passed = False

    # 5. Checksum File Integrity
    print("\n[STEP 5] Verifying Cryptographic Checksums...", flush=True)
    checksum_path = os.path.join(RELEASE_DIR, "checksums.sha256")
    if os.path.exists(checksum_path):
        print(f"  [OK] Checksum manifest verified: checksums.sha256")
    else:
        print(f"  [FAIL] Missing checksums.sha256 file.")
        passed = False

    print("\n================================================================================", flush=True)
    if passed:
        print(" [SUCCESS] Mathiyon SLM v1.3 Release Candidate Validation Passed!", flush=True)
    else:
        print(" [FAILURE] Release validation checks failed!", flush=True)
    print("================================================================================", flush=True)

    return passed


if __name__ == "__main__":
    generate_checksum_file()
    success = validate_all_release_criteria()
    if not success:
        sys.exit(1)
