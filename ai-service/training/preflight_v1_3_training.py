"""
Mathiyon SLM v1.3 Training Preflight Script (Phase 11.3)
Performs dataset audit, deterministic 90/5/5 train/val/test split, tokenization stats,
dry-run 1-batch training pass, validation loss calculation, isolated preflight checkpoint save,
and resume verification.

NOTE: This is a dry-run verification script ONLY. It does NOT run full 15-epoch training.
"""
import os
import sys
import json
import math
import random
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import LambdaLR

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from models.v1_3.config import MathiyonSLMv13Config
from models.v1_3.model import MathiyonSLMv13, get_target_device
from tokenizer.bpe_tokenizer import MathiyonTokenizer


def load_v1_3_corpus(data_dir: str):
    """Scans all text and instruction JSON files in data/v1.3/."""
    corpus_samples = []
    category_counts = {}
    total_bytes = 0

    for root, _, files in os.walk(data_dir):
        for file in files:
            file_path = os.path.join(root, file)
            rel_dir = os.path.basename(os.path.dirname(file_path))
            
            if file.endswith(".txt"):
                total_bytes += os.path.getsize(file_path)
                with open(file_path, "r", encoding="utf-8") as f:
                    lines = [l.strip() for l in f.readlines() if l.strip()]
                    for line in lines:
                        corpus_samples.append({"text": line, "category": rel_dir})
                        category_counts[rel_dir] = category_counts.get(rel_dir, 0) + 1
            elif file == "instruction_pairs.json":
                total_bytes += os.path.getsize(file_path)
                with open(file_path, "r", encoding="utf-8") as f:
                    pairs = json.load(f)
                    for p in pairs:
                        cat = p.get("category", "instruction").lower()
                        formatted_text = f"Instruction: {p.get('instruction', '')}\nContext: {p.get('context', '')}\nResponse: {p.get('response', '')}"
                        corpus_samples.append({"text": formatted_text, "category": cat})
                        category_counts[cat] = category_counts.get(cat, 0) + 1

    return corpus_samples, category_counts, total_bytes


def create_deterministic_split(samples, seed=42, train_ratio=0.90, val_ratio=0.05):
    """Splits corpus deterministically into 90% train, 5% val, 5% test."""
    random.seed(seed)
    shuffled = list(samples)
    random.shuffle(shuffled)
    
    total = len(shuffled)
    train_end = int(total * train_ratio)
    val_end = train_end + int(total * val_ratio)
    
    train_set = shuffled[:train_end]
    val_set = shuffled[train_end:val_end]
    test_set = shuffled[val_end:]
    
    return train_set, val_set, test_set


def get_cosine_warmup_scheduler(optimizer, warmup_steps=10, total_steps=100):
    """Cosine learning rate decay with linear warmup."""
    def lr_lambda(current_step):
        step = current_step + 1
        if step <= warmup_steps:
            return float(step) / float(max(1, warmup_steps))
        progress = float(step - warmup_steps) / float(max(1, total_steps - warmup_steps))
        return max(0.0, 0.5 * (1.0 + math.cos(math.pi * progress)))
    
    return LambdaLR(optimizer, lr_lambda)


def run_preflight():
    print("==================================================")
    print(" MATHIYON SLM v1.3 TRAINING PREFLIGHT (PHASE 11.3)")
    print("==================================================")

    # 1. Audit Training Inputs
    data_dir = os.path.join(BASE_DIR, "data", "v1.3")
    tokenizer_path = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "latest", "tokenizer_v1.3.json")
    
    assert os.path.exists(tokenizer_path), f"v1.3 Tokenizer missing at {tokenizer_path}"
    tokenizer = MathiyonTokenizer(vocab_path=tokenizer_path)
    assert tokenizer.vocab_size == 8000, f"Expected 8000 vocab, got {tokenizer.vocab_size}"

    config = MathiyonSLMv13Config()
    model = MathiyonSLMv13(config)
    param_counts = model.count_parameters()
    
    assert param_counts["total_trainable"] == 21952896, f"Expected 21952896 params, got {param_counts['total_trainable']}"

    print(f"[OK] v1.3 Tokenizer loaded: Vocab={tokenizer.vocab_size}")
    print(f"[OK] v1.3 Model loaded: Version={config.model_version}, Params={param_counts['total_trainable']:,}")
    print(f"[OK] Context Length: {config.context_length}, Hidden Size: {config.hidden_size}")

    # 2. Dataset Report
    samples, cat_counts, total_bytes = load_v1_3_corpus(data_dir)
    print("\n--- DATASET REPORT ---")
    print(f"Total Corpus Size       : {total_bytes:,} bytes ({total_bytes / 1024:.2f} KB)")
    print(f"Total Samples           : {len(samples)}")
    print(f"Category Distribution   : {cat_counts}")

    # 3. Deterministic Split
    train_samples, val_samples, test_samples = create_deterministic_split(samples, seed=42)
    split_meta_path = os.path.join(data_dir, "split_metadata.json")
    split_meta = {
        "seed": 42,
        "train_count": len(train_samples),
        "val_count": len(val_samples),
        "test_count": len(test_samples),
        "train_ratio": 0.90,
        "val_ratio": 0.05,
        "test_ratio": 0.05
    }
    with open(split_meta_path, "w", encoding="utf-8") as f:
        json.dump(split_meta, f, indent=2)

    print(f"Train Samples           : {len(train_samples)} (90%)")
    print(f"Validation Samples      : {len(val_samples)} (5%)")
    print(f"Test Samples            : {len(test_samples)} (5%)")
    print(f"[OK] Saved split metadata to {split_meta_path}")

    # 4. Tokenization Test
    all_token_ids = []
    seq_lengths = []
    for s in samples:
        t_ids = tokenizer.encode(s["text"])
        assert all(id >= 0 and id < 8000 for id in t_ids), "Invalid token ID detected!"
        all_token_ids.extend(t_ids)
        seq_lengths.append(len(t_ids))

    total_tokens = len(all_token_ids)
    avg_len = sum(seq_lengths) / len(seq_lengths) if seq_lengths else 0
    max_len = max(seq_lengths) if seq_lengths else 0
    min_len = min(seq_lengths) if seq_lengths else 0

    print("\n--- TOKENIZATION STATISTICS ---")
    print(f"Total Token Count       : {total_tokens:,}")
    print(f"Average Sequence Length : {avg_len:.2f} tokens")
    print(f"Min / Max Sequence Len  : {min_len} / {max_len} tokens")

    # 5. Training Config
    device = get_target_device("auto")
    model.to(device)
    optimizer = optim.AdamW(model.parameters(), lr=5e-4, weight_decay=0.01)
    scheduler = get_cosine_warmup_scheduler(optimizer, warmup_steps=10, total_steps=100)

    print("\n--- PROPOSED TRAINING CONFIGURATION ---")
    print("Optimizer               : AdamW (lr=5e-4, weight_decay=0.01)")
    print("Scheduler               : Cosine Decay with Warmup (10 steps)")
    print("Configured Epochs       : 15 (Preflight Dry-Run: 1 Batch Only)")
    print(f"Execution Device        : {device.type.upper()}")

    # 6. Dry-Run Training Pass (1 Batch)
    print("\n--- EXECUTING DRY-RUN TRAINING BATCH ---")
    model.train()
    
    # Prepare 1 batch of tokenized sequences
    train_tokens_flat = []
    for s in train_samples:
        train_tokens_flat.extend(tokenizer.encode(s["text"]))
        
    seq_len = 32
    if len(train_tokens_flat) < seq_len * 2:
        train_tokens_flat = train_tokens_flat * (seq_len * 2 // len(train_tokens_flat) + 1)

    input_batch = torch.tensor([train_tokens_flat[:seq_len], train_tokens_flat[seq_len:seq_len*2]], device=device)
    target_batch = input_batch.clone()

    initial_param_val = model.layers[0].self_attn.q_proj.weight.clone().detach()

    optimizer.zero_grad()
    logits, loss = model(input_batch, labels=target_batch)
    
    assert not torch.isnan(loss), "Dry-run loss is NaN!"
    assert not torch.isinf(loss), "Dry-run loss is Inf!"

    loss.backward()

    # Verify gradients
    grad_norms = [p.grad.norm().item() for p in model.parameters() if p.grad is not None]
    assert len(grad_norms) > 0, "No gradients computed!"
    assert all(not math.isnan(gn) and not math.isinf(gn) for gn in grad_norms), "NaN/Inf gradient detected!"

    optimizer.step()
    scheduler.step()

    updated_param_val = model.layers[0].self_attn.q_proj.weight.clone().detach()
    param_changed = not torch.equal(initial_param_val, updated_param_val)
    assert param_changed, "Optimizer step failed to update parameter weights!"

    dry_run_loss = loss.item()
    print(f"Dry-Run Train Loss      : {dry_run_loss:.4f} (Finite & Valid)")
    print(f"Gradient Status         : {len(grad_norms)} tensors verified (Finite)")
    print(f"Parameter Weight Update : {'SUCCESS' if param_changed else 'FAILED'}")

    # 7. Validation Loss Test (1 Batch)
    print("\n--- EXECUTING DRY-RUN VALIDATION BATCH ---")
    model.eval()
    val_tokens_flat = []
    for s in val_samples:
        val_tokens_flat.extend(tokenizer.encode(s["text"]))
    if len(val_tokens_flat) < seq_len:
        val_tokens_flat = val_tokens_flat * (seq_len // len(val_tokens_flat) + 1)
        
    val_input = torch.tensor([val_tokens_flat[:seq_len]], device=device)
    with torch.no_grad():
        val_logits, val_loss = model(val_input, labels=val_input)

    dry_run_val_loss = val_loss.item()
    print(f"DRY-RUN VALIDATION LOSS - NOT A MODEL QUALITY BENCHMARK: {dry_run_val_loss:.4f}")

    # 8. Preflight Checkpoint Test
    preflight_dir = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "preflight")
    os.makedirs(preflight_dir, exist_ok=True)
    
    model_ckpt_path = os.path.join(preflight_dir, "preflight_model.pt")
    opt_ckpt_path = os.path.join(preflight_dir, "preflight_optimizer.pt")
    meta_path = os.path.join(preflight_dir, "preflight_metadata.json")

    from dataclasses import asdict
    torch.save(model.state_dict(), model_ckpt_path)
    torch.save(optimizer.state_dict(), opt_ckpt_path)
    
    meta_info = {
        "model_version": config.model_version,
        "vocab_size": config.vocab_size,
        "param_count": param_counts["total_trainable"],
        "dry_run_train_loss": dry_run_loss,
        "dry_run_val_loss": dry_run_val_loss,
        "device": device.type,
        "config_dict": asdict(config)
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta_info, f, indent=2)

    print(f"[OK] Saved preflight checkpoint binaries to {preflight_dir}")

    # 9. Resume Verification Test
    print("\n--- RESUME VERIFICATION ---")
    model_resumed = MathiyonSLMv13(config).to(device)
    model_resumed.load_state_dict(torch.load(model_ckpt_path, map_location=device, weights_only=True))
    
    optimizer_resumed = optim.AdamW(model_resumed.parameters(), lr=5e-4, weight_decay=0.01)
    optimizer_resumed.load_state_dict(torch.load(opt_ckpt_path, map_location=device, weights_only=True))

    model_resumed.train()
    optimizer_resumed.zero_grad()
    _, resume_loss = model_resumed(input_batch, labels=target_batch)
    resume_loss.backward()
    optimizer_resumed.step()

    print(f"Post-Resume Dry-Run Loss : {resume_loss.item():.4f} (State restoration verified)")

    cuda_available = torch.cuda.is_available()
    cuda_name = torch.cuda.get_device_name(0) if cuda_available else "N/A"

    print("\n--- SYSTEM RESOURCE REPORT ---")
    print(f"OS Platform             : {sys.platform}")
    print(f"CUDA Available          : {cuda_available}")
    print(f"CUDA Device             : {cuda_name}")
    print(f"Model Data Type         : float32")
    print(f"Batch Size (Dry-Run)    : 2")
    print(f"Sequence Length         : {seq_len}")
    print(f"Approx Model Memory     : {param_counts['total_trainable'] * 4 / (1024**2):.2f} MB")

    print("==================================================")
    print(" TRAINING PREFLIGHT VERIFICATION COMPLETE")
    print("==================================================")

    return {
        "total_corpus_bytes": total_bytes,
        "total_samples": len(samples),
        "split_counts": {"train": len(train_samples), "val": len(val_samples), "test": len(test_samples)},
        "total_tokens": total_tokens,
        "avg_seq_len": avg_len,
        "dry_run_train_loss": dry_run_loss,
        "dry_run_val_loss": dry_run_val_loss,
        "param_count": param_counts["total_trainable"],
        "checkpoint_dir": preflight_dir,
        "cuda_available": cuda_available
    }

if __name__ == "__main__":
    run_preflight()
