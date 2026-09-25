"""
Mathiyon AI - Phase 12.8 Final Production Release Validator
"""
import os
import sys
import json
import hashlib

def calculate_checksum(filepath):
    """Calculates SHA256 prefix of a given file."""
    if not os.path.isfile(filepath):
        return None
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()[:12]

def validate_final_release():
    print("============================================================")
    print("MATHIYON AI - FINAL PRODUCTION RELEASE VALIDATOR (PHASE 12.8)")
    print("============================================================\n")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    required_artifacts = [
        "docs/PHASE_12_8_PRODUCTION_READINESS_AUDIT.md",
        "docs/PHASE_12_8_GO_LIVE_CHECKLIST.md",
        "docs/PHASE_12_8_FINAL_PRODUCTION_READINESS_REPORT.md",
        "release/FINAL_RELEASE_MANIFEST.json",
        "release/FINAL_ROLLBACK.md",
        "release/final_environment.json",
        "release/DATABASE_RECOVERY.md"
    ]

    all_passed = True

    # 1. Artifact Verification
    print("[1/4] Checking Required Final Release Artifacts...")
    for rel_path in required_artifacts:
        full_path = os.path.join(base_dir, rel_path)
        if os.path.exists(full_path):
            chk = calculate_checksum(full_path)
            print(f"  [PASS] Artifact Found: {rel_path} (SHA256: {chk})")
        else:
            print(f"  [FAIL] Missing Artifact: {rel_path}")
            all_passed = False

    # 2. Manifest Verification
    print("\n[2/4] Verifying Final Release Manifest Integrity...")
    manifest_path = os.path.join(base_dir, "release", "FINAL_RELEASE_MANIFEST.json")
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        prod_model = manifest.get("models", {}).get("production_model")
        prod_traffic = manifest.get("models", {}).get("production_traffic_percent")
        exp_model = manifest.get("models", {}).get("experimental_model")
        exp_traffic = manifest.get("models", {}).get("experimental_traffic_percent")
        decision = manifest.get("go_live_decision")

        if prod_model == "mathiyon-slm-v1.2" and prod_traffic == 100:
            print(f"  [PASS] Production model pinned: {prod_model} at {prod_traffic}% traffic")
        else:
            print(f"  [FAIL] Production routing violation: {prod_model} at {prod_traffic}%")
            all_passed = False

        if exp_model == "mathiyon-slm-v1.3-RC1" and exp_traffic == 0:
            print(f"  [PASS] Experimental model isolated: {exp_model} at {exp_traffic}% traffic")
        else:
            print(f"  [FAIL] Experimental leakage violation: {exp_model} at {exp_traffic}%")
            all_passed = False

        if decision in ["GO_LIVE_READY", "GO_LIVE_READY_WITH_LIMITATIONS"]:
            print(f"  [PASS] Manifest go-live decision recorded: {decision}")
        else:
            print(f"  [FAIL] Invalid go-live decision: {decision}")
            all_passed = False
    else:
        print("  [FAIL] Final release manifest missing.")
        all_passed = False

    # 3. Model Registry Audit
    print("\n[3/4] Verifying AI Service Model Registry Baseline...")
    try:
        sys.path.insert(0, os.path.join(base_dir, "ai-service"))
        from inference.model_registry import model_registry
        prod_info = model_registry.get_production_model()
        active_prod = prod_info.get("model_id")

        if active_prod == "mathiyon-slm-v1.2":
            print(f"  [PASS] Python ModelRegistry active production model: {active_prod}")
        else:
            print(f"  [FAIL] Python ModelRegistry active model mismatch: {active_prod}")
            all_passed = False
    except Exception as e:
        print(f"  [FAIL] ModelRegistry audit error: {e}")
        all_passed = False

    # 4. Final Verdict
    print("\n============================================================")
    if all_passed:
        print("FINAL VALIDATION SUCCESS: Platform is ready for go-live gate.")
        print("============================================================")
        sys.exit(0)
    else:
        print("FINAL VALIDATION FAILURE: Go-Live criteria not satisfied.")
        print("============================================================")
        sys.exit(1)

if __name__ == "__main__":
    validate_final_release()
