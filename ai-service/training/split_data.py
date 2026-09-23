"""
Mathiyon SLM v1.2 Deterministic Dataset Splitter
Performs 90% Train, 5% Validation, 5% Test split with fixed random seed (seed=42).
Ensures zero data leakage across train and val/test sets. Saves outputs to data/processed/.
"""
import os
import sys
import random
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLEANED_DIR = os.path.join(BASE_DIR, "data", "cleaned")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

def run_data_splitting(seed=42, train_ratio=0.90, val_ratio=0.05, test_ratio=0.05):
    """Executes deterministic 90/5/5 train/val/test data splitting."""
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    random.seed(seed)

    print("=" * 60)
    print(f"[SPLIT] STARTING DETERMINISTIC DATA SPLIT (Seed={seed}, Train={train_ratio:.0%}, Val={val_ratio:.0%}, Test={test_ratio:.0%})")
    print("=" * 60)

    all_samples = []
    files = ["general_english.txt", "tamil_corpus.txt", "programming_code.txt", "math_science.txt"]

    for fname in files:
        fpath = os.path.join(CLEANED_DIR, fname)
        if os.path.exists(fpath):
            with open(fpath, "r", encoding="utf-8") as f:
                lines = f.readlines()
                for line in lines:
                    line_clean = line.strip()
                    if line_clean:
                        all_samples.append(line_clean)

    # Absolute deduplication across dataset
    unique_samples = list(dict.fromkeys(all_samples))
    random.shuffle(unique_samples)

    total_count = len(unique_samples)
    train_end = int(total_count * train_ratio)
    val_end = train_end + int(total_count * val_ratio)

    train_set = unique_samples[:train_end]
    val_set = unique_samples[train_end:val_end]
    test_set = unique_samples[val_end:]

    # Save split JSON files
    with open(os.path.join(PROCESSED_DIR, "train.json"), "w", encoding="utf-8") as f:
        json.dump(train_set, f, indent=2, ensure_ascii=False)

    with open(os.path.join(PROCESSED_DIR, "val.json"), "w", encoding="utf-8") as f:
        json.dump(val_set, f, indent=2, ensure_ascii=False)

    with open(os.path.join(PROCESSED_DIR, "test.json"), "w", encoding="utf-8") as f:
        json.dump(test_set, f, indent=2, ensure_ascii=False)

    print(f"[OK] Total Samples: {total_count}")
    print(f"[OK] Train Set:    {len(train_set):>3} samples ({len(train_set)/total_count:.1%}) -> data/processed/train.json")
    print(f"[OK] Val Set:      {len(val_set):>3} samples ({len(val_set)/total_count:.1%}) -> data/processed/val.json")
    print(f"[OK] Test Set:     {len(test_set):>3} samples ({len(test_set)/total_count:.1%}) -> data/processed/test.json")

    print("=" * 60)
    return train_set, val_set, test_set

if __name__ == "__main__":
    run_data_splitting()
