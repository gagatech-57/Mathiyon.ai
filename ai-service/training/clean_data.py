"""
Mathiyon SLM v1.2 Data Cleaning Pipeline
Performs Unicode NFKC normalization, whitespace collapse, deduplication, length filtering,
code syntax preservation, and Tamil Unicode preservation. Saves outputs to data/cleaned/.
"""
import os
import sys
import unicodedata
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
CLEANED_DIR = os.path.join(BASE_DIR, "data", "cleaned")

def clean_text_sample(text: str) -> str:
    """Normalizes and cleans a single text sample."""
    if not text:
        return ""
        
    # 1. Unicode NFKC Normalization
    text_norm = unicodedata.normalize("NFKC", text)

    # 2. Collapse excessive horizontal whitespace while preserving newlines
    lines = text_norm.splitlines()
    cleaned_lines = []
    for line in lines:
        line_sub = re.sub(r'[ \t]+', ' ', line).strip()
        if line_sub:
            cleaned_lines.append(line_sub)
            
    cleaned_text = "\n".join(cleaned_lines)
    return cleaned_text

def run_data_cleaning():
    """Runs data cleaning across all raw dataset text files."""
    os.makedirs(CLEANED_DIR, exist_ok=True)
    print("=" * 60)
    print("[CLEANING] STARTING DATA CLEANING PIPELINE FOR SLM v1.2")
    print("=" * 60)

    files = ["general_english.txt", "tamil_corpus.txt", "programming_code.txt", "math_science.txt"]
    all_cleaned_samples = []

    for fname in files:
        raw_path = os.path.join(RAW_DIR, fname)
        if not os.path.exists(raw_path):
            continue

        with open(raw_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        cleaned_file_samples = []
        for line in lines:
            cleaned = clean_text_sample(line)
            # Filter samples shorter than 10 characters unless valid code symbol
            if len(cleaned) >= 10 or ("{" in cleaned or "=" in cleaned):
                cleaned_file_samples.append(cleaned)

        # File-level deduplication
        unique_file_samples = list(dict.fromkeys(cleaned_file_samples))
        all_cleaned_samples.extend(unique_file_samples)

        cleaned_out_path = os.path.join(CLEANED_DIR, fname)
        with open(cleaned_out_path, "w", encoding="utf-8") as f:
            f.write("\n".join(unique_file_samples))

        print(f"[OK] Cleaned {fname:<22} | Original: {len(lines):>3} lines -> Cleaned Unique: {len(unique_file_samples):>3} lines")

    print("\n" + "=" * 60)
    print(f"[SUCCESS] DATA CLEANING COMPLETED. Total Cleaned Samples: {len(all_cleaned_samples)}")
    print("=" * 60)
    return all_cleaned_samples

if __name__ == "__main__":
    run_data_cleaning()
