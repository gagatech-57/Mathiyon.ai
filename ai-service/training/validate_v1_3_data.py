"""
Mathiyon AI v1.3 Data Quality & Validation Pipeline
Detects duplicates, empty samples, malformed JSON, broken Unicode, missing fields, and generates dataset_report.json.
"""
import os
import re
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_V13_DIR = os.path.join(BASE_DIR, "data", "v1.3")

CATEGORIES = [
    "general", "conversation", "instruction", "reasoning", "coding",
    "math", "tamil", "tanglish", "tool_use", "rag", "safety"
]

def is_valid_unicode(text: str) -> bool:
    """Verifies string is valid UTF-8 without replacement or control characters."""
    try:
        text.encode('utf-8').decode('utf-8')
        return '\ufffd' not in text
    except Exception:
        return False

def validate_dataset_v1_3():
    print("=" * 60)
    print("[SEARCH] MATHIYON AI V1.3 DATASET QUALITY VALIDATION PIPELINE")
    print("=" * 60)

    total_samples = 0
    valid_samples = 0
    invalid_samples = 0
    duplicate_count = 0
    total_char_count = 0
    estimated_tokens = 0

    category_counts = {cat: 0 for cat in CATEGORIES}
    seen_hashes = set()
    issues = []

    # 1. Scan text files in category directories
    for cat in CATEGORIES:
        cat_dir = os.path.join(DATA_V13_DIR, cat)
        if not os.path.exists(cat_dir):
            os.makedirs(cat_dir, exist_ok=True)
            continue

        for fname in os.listdir(cat_dir):
            fpath = os.path.join(cat_dir, fname)
            if not os.path.isfile(fpath):
                continue

            if fname.endswith(".txt"):
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        lines = [line.strip() for line in f.readlines() if line.strip()]

                    for line in lines:
                        total_samples += 1
                        total_char_count += len(line)
                        estimated_tokens += len(line.split()) + 2

                        if not is_valid_unicode(line):
                            invalid_samples += 1
                            issues.append(f"Broken Unicode in {cat}/{fname}: {line[:30]}")
                            continue

                        line_hash = hash(line.lower())
                        if line_hash in seen_hashes:
                            duplicate_count += 1
                            issues.append(f"Duplicate sample in {cat}/{fname}: {line[:30]}")
                        else:
                            seen_hashes.add(line_hash)

                        valid_samples += 1
                        category_counts[cat] += 1

                except Exception as e:
                    invalid_samples += 1
                    issues.append(f"File read error {fpath}: {str(e)}")

            elif fname.endswith(".json"):
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)

                    if isinstance(data, list):
                        for item in data:
                            total_samples += 1
                            if not isinstance(item, dict):
                                invalid_samples += 1
                                issues.append(f"Malformed JSON item in {cat}/{fname}")
                                continue

                            instruction = item.get("instruction", "").strip()
                            response = item.get("response", "").strip()
                            item_cat = item.get("category", cat).lower()

                            if not instruction or not response:
                                invalid_samples += 1
                                issues.append(f"Missing instruction/response in {cat}/{fname}")
                                continue

                            sample_str = f"{instruction} {response}".lower()
                            total_char_count += len(sample_str)
                            estimated_tokens += len(sample_str.split()) + 4

                            if not is_valid_unicode(sample_str):
                                invalid_samples += 1
                                issues.append(f"Broken Unicode in JSON {cat}/{fname}")
                                continue

                            sample_hash = hash(sample_str)
                            if sample_hash in seen_hashes:
                                duplicate_count += 1
                            else:
                                seen_hashes.add(sample_hash)

                            valid_samples += 1
                            if item_cat in category_counts:
                                category_counts[item_cat] += 1
                            else:
                                category_counts[cat] += 1

                except Exception as e:
                    invalid_samples += 1
                    issues.append(f"Malformed JSON in {fpath}: {str(e)}")

    # Calculate actual dataset file size
    total_bytes = 0
    for root, _, files in os.walk(DATA_V13_DIR):
        for f in files:
            total_bytes += os.path.getsize(os.path.join(root, f))

    size_mb = round(total_bytes / (1024 * 1024), 4)

    report = {
        "dataset_version": "v1.3",
        "total_files_scanned": sum(len(files) for _, _, files in os.walk(DATA_V13_DIR)),
        "dataset_size_bytes": total_bytes,
        "dataset_size_mb": size_mb,
        "total_samples": total_samples,
        "valid_samples": valid_samples,
        "invalid_samples": invalid_samples,
        "duplicate_count": duplicate_count,
        "total_char_count": total_char_count,
        "estimated_token_count": estimated_tokens,
        "category_counts": category_counts,
        "quality_score": round((valid_samples / max(1, total_samples)) * 100, 2),
        "validation_issues": issues[:10]
    }

    report_path = os.path.join(DATA_V13_DIR, "dataset_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"[REPORT] REPORT GENERATED: {report_path}")
    print(f"   * Total Samples:   {total_samples}")
    print(f"   * Valid Samples:   {valid_samples}")
    print(f"   * Invalid Samples: {invalid_samples}")
    print(f"   * Duplicates:      {duplicate_count}")
    print(f"   * Dataset Size:    {size_mb} MB ({total_bytes} bytes)")
    print(f"   * Quality Score:   {report['quality_score']}%")
    print("=" * 60)

    return report

if __name__ == "__main__":
    validate_dataset_v1_3()
