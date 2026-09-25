"""
Mathiyon AI - Phase 12.7 Automated Release Candidate Validation Script
"""
import os
import sys
import json
import hashlib

def calculate_file_checksum(filepath):
    """Calculates SHA256 checksum of a file if it exists."""
    if not os.path.isfile(filepath):
        return None
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()

def validate_release():
    print("============================================================")
    print("MATHIYON AI - RELEASE CANDIDATE VALIDATION")
    print("============================================================\n")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    required_files = [
        "docs/PHASE_12_7_ARCHITECTURE_FREEZE.md",
        "docs/PHASE_12_7_API_CONTRACT.md",
        "release/RELEASE_MANIFEST.json",
        "release/RC_CHECKLIST.md",
        "release/CHANGELOG.md",
        "release/RELEASE_NOTES.md",
        "release/ROLLBACK.md",
        "release/environment.json",
    ]

    all_passed = True

    # 1. Check Required Files
    print("[1/4] Checking Required Release Artifacts...")
    for rel_path in required_files:
        full_path = os.path.join(base_dir, rel_path)
        if os.path.exists(full_path):
            checksum = calculate_file_checksum(full_path)[:12]
            print(f"  [PASS] Found: {rel_path} (SHA256 prefix: {checksum})")
        else:
            print(f"  [FAIL] Missing: {rel_path}")
            all_passed = False

    # 2. Check Manifest Consistency
    print("\n[2/4] Verifying Release Manifest Integrity...")
    manifest_path = os.path.join(base_dir, "release", "RELEASE_MANIFEST.json")
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        prod_model = manifest.get("models", {}).get("production_model")
        prod_traffic = manifest.get("models", {}).get("production_traffic_percent")
        exp_model = manifest.get("models", {}).get("experimental_model")
        exp_traffic = manifest.get("models", {}).get("experimental_traffic_percent")

        if prod_model == "mathiyon-slm-v1.2" and prod_traffic == 100:
            print(f"  [PASS] Production model: {prod_model} at {prod_traffic}% traffic")
        else:
            print(f"  [FAIL] Production model routing violation: {prod_model} at {prod_traffic}%")
            all_passed = False

        if exp_model == "mathiyon-slm-v1.3-RC1" and exp_traffic == 0:
            print(f"  [PASS] Experimental model: {exp_model} at {exp_traffic}% traffic")
        else:
            print(f"  [FAIL] Experimental model leakage violation: {exp_model} at {exp_traffic}%")
            all_passed = False
    else:
        print("  [FAIL] Release manifest not found.")
        all_passed = False

    # 3. Model Registry Verification
    print("\n[3/4] Verifying Model Registry Configuration...")
    try:
        sys.path.insert(0, os.path.join(base_dir, "ai-service"))
        from inference.model_registry import model_registry
        reg_models = model_registry.list_models()
        prod_info = model_registry.get_production_model()
        active_prod = prod_info.get("model_id")
        
        print(f"  Model Registry Active Production Model: {active_prod}")
        print(f"  Registered Models Count: {len(reg_models)}")

        if active_prod == "mathiyon-slm-v1.2":
            print("  [PASS] Model registry default model is pinned to v1.2")
        else:
            print(f"  [FAIL] Unexpected model registry default: {active_prod}")
            all_passed = False
    except Exception as e:
        print(f"  [FAIL] Model registry check error: {e}")
        all_passed = False

    # 4. Final Verdict
    print("\n============================================================")
    if all_passed:
        print("VALIDATION SUCCESS: Release Candidate manifest & state verified.")
        print("============================================================")
        sys.exit(0)
    else:
        print("VALIDATION FAILURE: Critical release candidate criteria failed.")
        print("============================================================")
        sys.exit(1)

if __name__ == "__main__":
    validate_release()
