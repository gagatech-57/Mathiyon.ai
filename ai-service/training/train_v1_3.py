"""
Mathiyon SLM v1.3 Controlled Pretraining Runner (Phase 11.3D)
Executes a controlled 3-epoch training run on the English + Coding + Mathematics dataset (v1.3_focused).
Monitors overfitting, records training logs, saves epoch/latest/best checkpoints,
and runs post-training sample generation verification.
"""
import os
import sys
import json
import math
import time
import random
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torch.optim.lr_scheduler import LambdaLR

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from models.v1_3.config import MathiyonSLMv13Config
from models.v1_3.model import MathiyonSLMv13, get_target_device
from tokenizer.bpe_tokenizer import MathiyonTokenizer


class FocusedTextDataset(Dataset):
    def __init__(self, samples, tokenizer, max_seq_len=128):
        self.samples = samples
        self.tokenizer = tokenizer
        self.max_seq_len = max_seq_len
        self.encoded_items = []
        
        for item in samples:
            t_ids = tokenizer.encode(item["text"])
            if len(t_ids) < 4:
                continue
            if len(t_ids) > max_seq_len:
                t_ids = t_ids[:max_seq_len]
            self.encoded_items.append(torch.tensor(t_ids, dtype=torch.long))

    def __len__(self):
        return len(self.encoded_items)

    def __getitem__(self, idx):
        return self.encoded_items[idx]


def collate_pad_batch(batch, pad_id=0):
    max_len = max(len(x) for x in batch)
    padded_batch = []
    for x in batch:
        pad_len = max_len - len(x)
        if pad_len > 0:
            padded = torch.cat([x, torch.full((pad_len,), pad_id, dtype=torch.long)])
        else:
            padded = x
        padded_batch.append(padded)
    return torch.stack(padded_batch)


def load_focused_data(data_dir):
    corpus_samples = []
    seen_texts = set()
    for root, _, files in os.walk(data_dir):
        for file in files:
            file_path = os.path.join(root, file)
            rel_dir = os.path.basename(os.path.dirname(file_path))

            if file.endswith(".txt"):
                with open(file_path, "r", encoding="utf-8") as f:
                    lines = [l.strip() for l in f.readlines() if l.strip()]
                    for line in lines:
                        if line not in seen_texts:
                            seen_texts.add(line)
                            corpus_samples.append({"text": line, "category": rel_dir})

            elif file == "instruction_pairs.json":
                with open(file_path, "r", encoding="utf-8") as f:
                    pairs = json.load(f)
                    for p in pairs:
                        inst = p.get("instruction", "").strip()
                        resp = p.get("response", "").strip()
                        cat = p.get("category", "coding").lower()
                        text_block = f"Instruction: {inst}\nContext: {p.get('context', '')}\nResponse: {resp}"
                        if text_block not in seen_texts:
                            seen_texts.add(text_block)
                            corpus_samples.append({"text": text_block, "category": cat})

    return corpus_samples


def get_cosine_warmup_scheduler(optimizer, warmup_steps, total_steps):
    def lr_lambda(current_step):
        step = current_step + 1
        if step <= warmup_steps:
            return float(step) / float(max(1, warmup_steps))
        progress = float(step - warmup_steps) / float(max(1, total_steps - warmup_steps))
        return max(0.0, 0.5 * (1.0 + math.cos(math.pi * progress)))
    return LambdaLR(optimizer, lr_lambda)


def generate_sample(model, tokenizer, prompt, max_new_tokens=24, device="cpu"):
    model.eval()
    token_ids = tokenizer.encode(prompt)
    if not token_ids:
        token_ids = [tokenizer.bos_id]
    input_ids = torch.tensor([token_ids], device=device)
    
    with torch.no_grad():
        for _ in range(max_new_tokens):
            if input_ids.shape[1] >= 512:
                break
            logits = model(input_ids)
            next_token_logits = logits[0, -1, :]
            next_token = torch.argmax(next_token_logits, dim=-1).unsqueeze(0).unsqueeze(0)
            input_ids = torch.cat([input_ids, next_token], dim=1)
            if next_token.item() == tokenizer.eos_id:
                break
                
    generated_ids = input_ids[0].tolist()
    return tokenizer.decode(generated_ids)


def run_training():
    print("==================================================")
    print(" CONTROLLED SLM v1.3 PRETRAINING (PHASE 11.3D)")
    print("==================================================")

    data_dir = os.path.join(BASE_DIR, "data", "v1.3_focused")
    tokenizer_path = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "latest", "tokenizer_v1.3.json")
    checkpoint_dir = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "training")
    os.makedirs(checkpoint_dir, exist_ok=True)

    tokenizer = MathiyonTokenizer(vocab_path=tokenizer_path)
    raw_samples = load_focused_data(data_dir)
    print(f"[OK] Loaded {len(raw_samples)} focused samples from {data_dir}")

    # Deterministic 90/5/5 split
    random.seed(42)
    shuffled = list(raw_samples)
    random.shuffle(shuffled)
    
    train_end = int(len(shuffled) * 0.90)
    val_end = train_end + int(len(shuffled) * 0.05)
    
    train_samples = shuffled[:train_end]
    val_samples = shuffled[train_end:val_end]
    test_samples = shuffled[val_end:]

    print(f"Train samples: {len(train_samples)} | Val samples: {len(val_samples)} | Test samples: {len(test_samples)}")

    train_ds = FocusedTextDataset(train_samples, tokenizer, max_seq_len=128)
    val_ds = FocusedTextDataset(val_samples, tokenizer, max_seq_len=128)

    train_loader = DataLoader(train_ds, batch_size=4, shuffle=True, collate_fn=lambda b: collate_pad_batch(b, pad_id=tokenizer.pad_id))
    val_loader = DataLoader(val_ds, batch_size=4, shuffle=False, collate_fn=lambda b: collate_pad_batch(b, pad_id=tokenizer.pad_id))

    config = MathiyonSLMv13Config()
    device = get_target_device("auto")
    model = MathiyonSLMv13(config).to(device)
    param_counts = model.count_parameters()
    print(f"[OK] Instantiated Mathiyon SLM v1.3 ({param_counts['total_trainable']:,} params) on {device.type.upper()}")

    optimizer = optim.AdamW(model.parameters(), lr=5e-4, weight_decay=0.01)
    max_epochs = 3
    total_steps = len(train_loader) * max_epochs
    warmup_steps = max(1, int(total_steps * 0.1))
    scheduler = get_cosine_warmup_scheduler(optimizer, warmup_steps=warmup_steps, total_steps=total_steps)

    training_logs = []
    best_val_loss = float("inf")
    best_epoch = 0
    val_losses = []

    print("\n--- STARTING 3-EPOCH CONTROLLED TRAINING RUN ---")
    
    for epoch in range(1, max_epochs + 1):
        epoch_start = time.time()
        model.train()
        total_train_loss = 0.0
        train_batches = 0

        for step, batch in enumerate(train_loader):
            batch = batch.to(device)
            optimizer.zero_grad()
            logits, loss = model(batch, labels=batch)
            loss.backward()
            optimizer.step()
            scheduler.step()

            total_train_loss += loss.item()
            train_batches += 1

        avg_train_loss = total_train_loss / train_batches if train_batches > 0 else 0.0

        # Validation Pass
        model.eval()
        total_val_loss = 0.0
        val_batches = 0
        with torch.no_grad():
            for batch in val_loader:
                batch = batch.to(device)
                logits, loss = model(batch, labels=batch)
                total_val_loss += loss.item()
                val_batches += 1

        avg_val_loss = total_val_loss / val_batches if val_batches > 0 else 0.0
        val_losses.append(avg_val_loss)

        try:
            perplexity = math.exp(avg_val_loss) if avg_val_loss < 20.0 else float("inf")
        except OverflowError:
            perplexity = float("inf")

        current_lr = scheduler.get_last_lr()[0]
        duration = round(time.time() - epoch_start, 2)

        epoch_log = {
            "epoch": epoch,
            "train_loss": round(avg_train_loss, 4),
            "validation_loss": round(avg_val_loss, 4),
            "perplexity": round(perplexity, 4) if perplexity != float("inf") else "inf",
            "learning_rate": round(current_lr, 6),
            "duration_seconds": duration
        }
        training_logs.append(epoch_log)

        print(f"Epoch {epoch}/{max_epochs} | Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} | Perplexity: {epoch_log['perplexity']} | LR: {current_lr:.6f} | Time: {duration}s")

        # Save Epoch Checkpoint
        from dataclasses import asdict
        ckpt_meta = {
            "model_version": config.model_version,
            "param_count": param_counts["total_trainable"],
            "epoch": epoch,
            "train_loss": avg_train_loss,
            "validation_loss": avg_val_loss,
            "perplexity": epoch_log["perplexity"],
            "learning_rate": current_lr,
            "device": device.type,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "config_dict": asdict(config)
        }
        epoch_ckpt_path = os.path.join(checkpoint_dir, f"checkpoint_epoch_{epoch}.pt")
        latest_ckpt_path = os.path.join(checkpoint_dir, "latest.pt")
        
        save_payload = {
            "model_state": model.state_dict(),
            "optimizer_state": optimizer.state_dict(),
            "scheduler_state": scheduler.state_dict(),
            "metadata": ckpt_meta
        }
        torch.save(save_payload, epoch_ckpt_path)
        torch.save(save_payload, latest_ckpt_path)

        # Track Best Checkpoint
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            best_epoch = epoch
            best_ckpt_path = os.path.join(checkpoint_dir, "best.pt")
            torch.save(save_payload, best_ckpt_path)

    # Save training log JSON
    log_json_path = os.path.join(checkpoint_dir, "training_log.json")
    with open(log_json_path, "w", encoding="utf-8") as f:
        json.dump(training_logs, f, indent=2)

    # Overfitting Monitoring Analysis
    overfitting_detected = False
    if len(val_losses) >= 2:
        if val_losses[-1] > val_losses[-2] and training_logs[-1]["train_loss"] < training_logs[-2]["train_loss"]:
            overfitting_detected = True

    print("\n--- OVERFITTING ASSESSMENT ---")
    print(f"Lowest Validation Loss : {best_val_loss:.4f} (Epoch {best_epoch})")
    print(f"Overfitting Status     : {'OVERFITTING WARNING DETECTED' if overfitting_detected else 'STABLE (NO MONOTONIC VAL LOSS RISE)'}")

    # Post-Training Inference Sanity Check using best.pt
    print("\n--- POST-TRAINING SANITY CHECK (INFERENCE USING BEST.PT) ---")
    best_payload = torch.load(os.path.join(checkpoint_dir, "best.pt"), map_location=device, weights_only=False)
    model.load_state_dict(best_payload["model_state"])

    prompts = [
        ("English", "Explain what a REST API is."),
        ("Coding", "Write a JavaScript function to reverse a string."),
        ("Math", "Solve 2x + 5 = 15."),
        ("Math 2", "Calculate 25% of 200.")
    ]

    sample_generations = {}
    for domain, prompt in prompts:
        gen_text = generate_sample(model, tokenizer, prompt, max_new_tokens=24, device=device.type)
        sample_generations[domain] = {
            "prompt": prompt,
            "generated_output": gen_text
        }
        print(f"[{domain}] Prompt: '{prompt}'")
        print(f"  -> Generated Output: {gen_text}\n")

    report_meta = {
        "dataset_samples": len(raw_samples),
        "total_trainable_params": param_counts["total_trainable"],
        "max_epochs": max_epochs,
        "best_epoch": best_epoch,
        "best_val_loss": round(best_val_loss, 4),
        "overfitting_warning": overfitting_detected,
        "training_logs": training_logs,
        "sample_generations": sample_generations
    }
    return report_meta

if __name__ == "__main__":
    run_training()
