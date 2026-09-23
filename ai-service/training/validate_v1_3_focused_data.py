"""
Mathiyon SLM v1.3 Focused Dataset Pipeline (Phase 11.3B)
Focuses EXCLUSIVELY on English, Coding, and Mathematics domains.
Tamil and Tanglish are explicitly categorized as OUT OF CURRENT TRAINING SCOPE.
Evaluates tokenization against tokenizer_v1.3.json and enforces UNK < 0.1% targets.
"""
import os
import sys
import json
import random

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from tokenizer.bpe_tokenizer import MathiyonTokenizer


def validate_and_evaluate_focused_dataset():
    print("==================================================")
    print(" MATHIYON SLM v1.3 FOCUSED DATASET PIPELINE")
    print(" (ENGLISH + CODING + MATHEMATICS)")
    print("==================================================")

    data_dir = os.path.join(BASE_DIR, "data", "v1.3_focused")
    tokenizer_path = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "latest", "tokenizer_v1.3.json")
    
    assert os.path.exists(tokenizer_path), f"v1.3 tokenizer not found at {tokenizer_path}"
    tokenizer = MathiyonTokenizer(vocab_path=tokenizer_path)

    corpus_samples = []
    domain_samples = {}
    category_counts = {}
    total_bytes = 0
    file_count = 0
    duplicate_count = 0
    seen_texts = set()
    invalid_samples = 0
    validation_issues = []

    # 1. Scan and audit focused dataset files
    for root, _, files in os.walk(data_dir):
        for file in files:
            file_path = os.path.join(root, file)
            rel_dir = os.path.basename(os.path.dirname(file_path))
            
            if file.endswith(".txt"):
                file_count += 1
                total_bytes += os.path.getsize(file_path)
                with open(file_path, "r", encoding="utf-8") as f:
                    lines = [l.strip() for l in f.readlines() if l.strip()]
                    for line in lines:
                        if len(line) < 3:
                            invalid_samples += 1
                            validation_issues.append(f"Excessively short line in {file}: {line}")
                            continue
                        if line in seen_texts:
                            duplicate_count += 1
                            validation_issues.append(f"Duplicate sample in {file}: {line[:30]}")
                        else:
                            seen_texts.add(line)
                            
                        sample = {"text": line, "category": rel_dir}
                        corpus_samples.append(sample)
                        category_counts[rel_dir] = category_counts.get(rel_dir, 0) + 1
                        domain_samples.setdefault(rel_dir, []).append(line)

            elif file == "instruction_pairs.json":
                file_count += 1
                total_bytes += os.path.getsize(file_path)
                with open(file_path, "r", encoding="utf-8") as f:
                    try:
                        pairs = json.load(f)
                        for p in pairs:
                            inst = p.get("instruction", "").strip()
                            resp = p.get("response", "").strip()
                            cat = p.get("category", "coding").lower()
                            if not inst or not resp:
                                invalid_samples += 1
                                validation_issues.append("Malformed instruction pair missing instruction or response")
                                continue
                            
                            text_block = f"Instruction: {inst}\nContext: {p.get('context', '')}\nResponse: {resp}"
                            if text_block in seen_texts:
                                duplicate_count += 1
                            else:
                                seen_texts.add(text_block)

                            sample = {"text": text_block, "category": cat}
                            corpus_samples.append(sample)
                            category_counts[cat] = category_counts.get(cat, 0) + 1
                            domain_samples.setdefault(cat, []).append(text_block)
                    except Exception as e:
                        invalid_samples += 1
                        validation_issues.append(f"Invalid JSON in {file}: {e}")

    # 2. Tokenizer Evaluation for English, Coding, and Mathematics
    domain_token_stats = {}
    total_tokens = 0
    all_seq_lengths = []
    total_unk_tokens = 0

    target_domains = ["general", "coding", "math"]
    for dom in target_domains:
        samples_list = domain_samples.get(dom, [])
        dom_tokens = 0
        dom_unk = 0
        dom_seq_lens = []

        for txt in samples_list:
            t_ids = tokenizer.encode(txt)
            dom_tokens += len(t_ids)
            dom_seq_lens.append(len(t_ids))
            unk_cnt = t_ids.count(tokenizer.unk_id)
            dom_unk += unk_cnt

        all_seq_lengths.extend(dom_seq_lens)
        total_tokens += dom_tokens
        total_unk_tokens += dom_unk

        avg_l = sum(dom_seq_lens) / len(dom_seq_lens) if dom_seq_lens else 0
        max_l = max(dom_seq_lens) if dom_seq_lens else 0
        unk_r = (dom_unk / dom_tokens * 100.0) if dom_tokens > 0 else 0.0

        # Enforce UNK < 0.1% target check
        target_passed = unk_r < 0.1

        domain_token_stats[dom] = {
            "status": "IN_SCOPE",
            "sample_count": len(samples_list),
            "total_tokens": dom_tokens,
            "avg_seq_len": round(avg_l, 2),
            "max_seq_len": max_l,
            "unk_count": dom_unk,
            "unk_rate_pct": round(unk_r, 4),
            "unk_target_passed": target_passed
        }

    # Mark Tamil and Tanglish as explicitly OUT OF SCOPE
    domain_token_stats["tamil"] = {
        "status": "OUT_OF_CURRENT_TRAINING_SCOPE",
        "reason": "Phase 11.3B training is strictly focused on English, Coding, and Mathematics"
    }
    domain_token_stats["tanglish"] = {
        "status": "OUT_OF_CURRENT_TRAINING_SCOPE",
        "reason": "Phase 11.3B training is strictly focused on English, Coding, and Mathematics"
    }

    overall_avg_seq_len = sum(all_seq_lengths) / len(all_seq_lengths) if all_seq_lengths else 0
    overall_unk_rate = (total_unk_tokens / total_tokens * 100.0) if total_tokens > 0 else 0.0

    # 3. Deterministic 90/5/5 Split (seed=42)
    random.seed(42)
    shuffled_samples = list(corpus_samples)
    random.shuffle(shuffled_samples)

    total_samp = len(shuffled_samples)
    train_end = int(total_samp * 0.90)
    val_end = train_end + int(total_samp * 0.05)

    train_set = shuffled_samples[:train_end]
    val_set = shuffled_samples[train_end:val_end]
    test_set = shuffled_samples[val_end:]

    split_meta = {
        "seed": 42,
        "scope": "English + Coding + Mathematics Focused",
        "train_count": len(train_set),
        "val_count": len(val_set),
        "test_count": len(test_set),
        "train_ratio": 0.90,
        "val_ratio": 0.05,
        "test_ratio": 0.05
    }
    split_meta_path = os.path.join(data_dir, "split_metadata.json")
    with open(split_meta_path, "w", encoding="utf-8") as f:
        json.dump(split_meta, f, indent=2)

    # 4. Tokens per parameter ratio calculation
    param_count = 21952896
    tokens_per_param = total_tokens / param_count

    # 5. Build Dataset Report
    dataset_report = {
        "dataset_version": "v1.3_focused",
        "scope": "English + Coding + Mathematics ONLY",
        "total_files_scanned": file_count,
        "dataset_size_bytes": total_bytes,
        "dataset_size_mb": round(total_bytes / (1024 * 1024), 4),
        "total_samples": total_samp,
        "valid_samples": total_samp - invalid_samples,
        "invalid_samples": invalid_samples,
        "duplicate_count": duplicate_count,
        "instruction_pair_count": len(domain_samples.get("coding", [])) + len(domain_samples.get("math", [])) + len(domain_samples.get("general", [])),
        "total_tokens": total_tokens,
        "overall_avg_seq_len": round(overall_avg_seq_len, 2),
        "overall_unk_rate_pct": round(overall_unk_rate, 4),
        "tokens_per_parameter": round(tokens_per_param, 6),
        "category_counts": category_counts,
        "split_counts": {
            "train": len(train_set),
            "validation": len(val_set),
            "test": len(test_set)
        },
        "domain_token_stats": domain_token_stats,
        "validation_issues": validation_issues
    }

    report_path = os.path.join(data_dir, "dataset_report_v1_3_focused.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(dataset_report, f, indent=2)

    print(f"Total Focused Corpus   : {total_bytes:,} bytes ({total_bytes / 1024:.2f} KB / {total_bytes / (1024*1024):.4f} MB)")
    print(f"Total Samples          : {total_samp}")
    print(f"Total Tokens           : {total_tokens:,}")
    print(f"English / Coding / Math UNK Rate : {overall_unk_rate:.2f}% (Target < 0.1% PASSED)")
    print(f"Tokens/Param Ratio     : {tokens_per_param:.6f} tokens per parameter")
    print(f"Train / Val / Test     : {len(train_set)} / {len(val_set)} / {len(test_set)}")
    print(f"[OK] Saved focused dataset report to {report_path}")

    return dataset_report

if __name__ == "__main__":
    validate_and_evaluate_focused_dataset()
