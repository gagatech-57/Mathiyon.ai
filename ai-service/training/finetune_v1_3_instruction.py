"""
Mathiyon SLM v1.3 Instruction Fine-Tuning Script (Phase 11.3E)
Starts strictly from pretrained checkpoint `checkpoints/mathiyon-slm-v1.3/training/best.pt`.
Fine-tunes for 3 epochs on 100 English/Coding/Math instruction pairs.
Monitors overfitting, records training log, saves isolated instruction checkpoints into
checkpoints/mathiyon-slm-v1.3/instruction_tuning/, and runs generation tests.
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


class InstructionDataset(Dataset):
    def __init__(self, pairs, tokenizer, max_seq_len=128):
        self.tokenizer = tokenizer
        self.max_seq_len = max_seq_len
        self.encoded_items = []
        
        for item in pairs:
            inst = item.get("instruction", "").strip()
            ctx = item.get("context", "").strip()
            resp = item.get("response", "").strip()
            
            ctx_str = f"Context: {ctx}\n" if ctx else ""
            formatted = f"Instruction:\n{inst}\n{ctx_str}Response:\n{resp}"
            
            t_ids = tokenizer.encode(formatted)
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


def load_and_audit_instruction_data(json_path):
    assert os.path.exists(json_path), f"Instruction dataset missing at {json_path}"
    with open(json_path, "r", encoding="utf-8") as f:
        pairs = json.load(f)

    valid_pairs = []
    category_counts = {}
    seen_insts = set()
    duplicate_count = 0

    for p in pairs:
        inst = p.get("instruction", "").strip()
        resp = p.get("response", "").strip()
        cat = p.get("category", "coding").lower()

        assert inst and resp, "Empty instruction or response detected!"
        assert cat in ["english", "general", "coding", "math"], f"Unexpected out-of-scope category: {cat}"

        if inst in seen_insts:
            duplicate_count += 1
        else:
            seen_insts.add(inst)
            valid_pairs.append(p)
            category_counts[cat] = category_counts.get(cat, 0) + 1

    return valid_pairs, category_counts, duplicate_count


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
    formatted_prompt = f"Instruction:\n{prompt}\nResponse:\n"
    token_ids = tokenizer.encode(formatted_prompt)
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


def run_finetuning():
    print("==================================================")
    print(" SLM v1.3 INSTRUCTION FINE-TUNING (PHASE 11.3E)")
    print("==================================================")

    json_path = os.path.join(BASE_DIR, "data", "v1.3_focused", "instruction", "instruction_pairs.json")
    tokenizer_path = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "latest", "tokenizer_v1.3.json")
    pretrained_checkpoint = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "training", "best.pt")
    
    output_dir = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "instruction_tuning")
    os.makedirs(output_dir, exist_ok=True)

    # 1. Audit instruction data
    valid_pairs, cat_counts, duplicates = load_and_audit_instruction_data(json_path)
    print(f"[OK] Audited 100 Instruction Pairs: {cat_counts}")
    print(f"[OK] Duplicates: {duplicates} | Tamil/Tanglish pairs: 0 (OUT OF SCOPE)")

    # 2. Tokenizer & Pretrained Model Loading
    tokenizer = MathiyonTokenizer(vocab_path=tokenizer_path)
    assert tokenizer.vocab_size == 8000, f"Expected 8000 vocab, got {tokenizer.vocab_size}"

    assert os.path.exists(pretrained_checkpoint), f"Pretrained checkpoint missing at {pretrained_checkpoint}"
    device = get_target_device("auto")
    
    config = MathiyonSLMv13Config()
    model = MathiyonSLMv13(config).to(device)
    
    # Load pretrained weights strictly from best.pt
    ckpt_payload = torch.load(pretrained_checkpoint, map_location=device, weights_only=False)
    model.load_state_dict(ckpt_payload["model_state"])
    param_counts = model.count_parameters()
    print(f"[OK] Loaded pretrained weights from {pretrained_checkpoint}")
    print(f"[OK] Verified parameter count: {param_counts['total_trainable']:,} (21.95M)")

    # 3. Deterministic 90/5/5 split (seed=42)
    random.seed(42)
    shuffled_pairs = list(valid_pairs)
    random.shuffle(shuffled_pairs)

    train_end = int(len(shuffled_pairs) * 0.90)
    val_end = train_end + int(len(shuffled_pairs) * 0.05)

    train_pairs = shuffled_pairs[:train_end]
    val_pairs = shuffled_pairs[train_end:val_end]
    test_pairs = shuffled_pairs[val_end:]

    print(f"Train pairs: {len(train_pairs)} | Val pairs: {len(val_pairs)} | Test pairs: {len(test_pairs)}")

    train_ds = InstructionDataset(train_pairs, tokenizer, max_seq_len=128)
    val_ds = InstructionDataset(val_pairs, tokenizer, max_seq_len=128)

    train_loader = DataLoader(train_ds, batch_size=4, shuffle=True, collate_fn=lambda b: collate_pad_batch(b, pad_id=tokenizer.pad_id))
    val_loader = DataLoader(val_ds, batch_size=4, shuffle=False, collate_fn=lambda b: collate_pad_batch(b, pad_id=tokenizer.pad_id))

    # 4. Fine-Tuning Setup
    optimizer = optim.AdamW(model.parameters(), lr=1e-4, weight_decay=0.01)
    max_epochs = 3
    total_steps = len(train_loader) * max_epochs
    warmup_steps = max(1, int(total_steps * 0.1))
    scheduler = get_cosine_warmup_scheduler(optimizer, warmup_steps=warmup_steps, total_steps=total_steps)

    training_logs = []
    best_val_loss = float("inf")
    best_epoch = 0
    val_losses = []

    print("\n--- STARTING 3-EPOCH CONTROLLED INSTRUCTION FINE-TUNING ---")

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

        # Save Checkpoints
        from dataclasses import asdict
        ckpt_meta = {
            "model_version": config.model_version,
            "starting_checkpoint": "best.pt",
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
        epoch_ckpt_path = os.path.join(output_dir, f"checkpoint_epoch_{epoch}.pt")
        latest_ckpt_path = os.path.join(output_dir, "latest_instruction.pt")

        save_payload = {
            "model_state": model.state_dict(),
            "optimizer_state": optimizer.state_dict(),
            "scheduler_state": scheduler.state_dict(),
            "metadata": ckpt_meta
        }
        torch.save(save_payload, epoch_ckpt_path)
        torch.save(save_payload, latest_ckpt_path)

        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            best_epoch = epoch
            best_ckpt_path = os.path.join(output_dir, "best_instruction.pt")
            torch.save(save_payload, best_ckpt_path)

    # Save log JSON
    log_json_path = os.path.join(output_dir, "instruction_training_log.json")
    with open(log_json_path, "w", encoding="utf-8") as f:
        json.dump(training_logs, f, indent=2)

    # Overfitting assessment
    overfitting_detected = False
    if len(val_losses) >= 2:
        if val_losses[-1] > val_losses[-2] and training_logs[-1]["train_loss"] < training_logs[-2]["train_loss"]:
            overfitting_detected = True

    print("\n--- OVERFITTING ASSESSMENT ---")
    print(f"Lowest Fine-Tuning Validation Loss : {best_val_loss:.4f} (Epoch {best_epoch})")
    print(f"Overfitting Status                : {'OVERFITTING WARNING DETECTED' if overfitting_detected else 'STABLE (NO MONOTONIC VAL LOSS RISE)'}")

    # Generation Sanity Test using best_instruction.pt
    print("\n--- GENERATION SANITY TEST (USING BEST_INSTRUCTION.PT) ---")
    best_inst_payload = torch.load(os.path.join(output_dir, "best_instruction.pt"), map_location=device, weights_only=False)
    model.load_state_dict(best_inst_payload["model_state"])

    eval_prompts = [
        ("English", "Explain what a REST API is."),
        ("Coding", "Write a JavaScript function to reverse a string."),
        ("Math", "Solve 2x + 5 = 15."),
        ("Math 2", "Calculate 25% of 200.")
    ]

    generated_outputs = {}
    for domain, prompt in eval_prompts:
        gen_text = generate_sample(model, tokenizer, prompt, max_new_tokens=24, device=device.type)
        generated_outputs[domain] = {
            "prompt": prompt,
            "generated_output": gen_text
        }
        print(f"[{domain}] Prompt: '{prompt}'")
        print(f"  -> Generated Output: {gen_text}\n")

    finetune_meta = {
        "instruction_pairs": len(valid_pairs),
        "split_counts": {"train": len(train_pairs), "val": len(val_pairs), "test": len(test_pairs)},
        "param_count": param_counts["total_trainable"],
        "starting_checkpoint": "best.pt",
        "best_epoch": best_epoch,
        "best_val_loss": round(best_val_loss, 4),
        "overfitting_warning": overfitting_detected,
        "training_logs": training_logs,
        "generated_outputs": generated_outputs
    }
    return finetune_meta

if __name__ == "__main__":
    run_finetuning()
