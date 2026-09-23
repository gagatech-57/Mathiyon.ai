"""
Mathiyon SLM v1.2 PyTorch Model Training & Instruction Fine-Tuning Pipeline
Features: 6-layer 7.43M parameter scaling, AdamW optimizer, Cosine Annealing LR scheduling,
early stopping, checkpoint saving (best.pt / latest.pt), tokenizer v1.2 serialization,
and instruction fine-tuning on 120 multi-domain instruction samples.
"""
import os
import sys
import math
import time
import json
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from tokenizer.bpe_tokenizer import MathiyonTokenizer
from models.transformer import MathiyonSLM
from training.clean_data import run_data_cleaning
from training.split_data import run_data_splitting
from training.dataset import CausalLMDataset, load_instruction_pairs

V1_2_CHECKPOINT_DIR = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.2", "latest")
INSTRUCT_CHECKPOINT_DIR = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.2-instruct", "latest")

def detect_device():
    """Detects available hardware device (CUDA vs CPU)."""
    if torch.cuda.is_available():
        device = torch.device("cuda")
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2)
        print(f"Device:    CUDA ({gpu_name})")
        print(f"GPU Name:  {gpu_name}")
        print(f"VRAM:      {vram_gb} GB")
        print("Precision: FP32 / Mixed Precision")
    else:
        device = torch.device("cpu")
        print("Device:    CPU (Safe PyTorch Fallback)")
        print("GPU Name:  N/A (CPU execution)")
        print("VRAM:      System RAM")
        print("Precision: FP32")
    return device

def train_slm_v1_2():
    """Runs complete pretraining & instruction fine-tuning for Mathiyon SLM v1.2."""
    print("=" * 60)
    print("[START] INITIALIZING MATHIYON SLM v1.2 MODEL TRAINING PIPELINE")
    print("=" * 60)

    device = detect_device()

    # 1. Execute Data Cleaning & 90/5/5 Splitting
    run_data_cleaning()
    train_samples, val_samples, test_samples = run_data_splitting(seed=42)

    # 2. Train Tokenizer v1.2
    tokenizer = MathiyonTokenizer(vocab_size=5000)
    tokenizer.train_tokenizer(train_samples, target_vocab_size=5000)

    # Calculate Tokenizer UNK Rate
    unk_rate = tokenizer.compute_unk_rate(train_samples)
    print(f"[OK] Tokenizer v1.2 UNK Rate: {unk_rate}%")

    # 3. Create PyTorch DataLoaders
    train_seqs = [tokenizer.encode(s) for s in train_samples]
    val_seqs = [tokenizer.encode(s) for s in val_samples]

    train_dataset = CausalLMDataset(train_seqs, max_seq_len=512, pad_id=tokenizer.pad_id)
    val_dataset = CausalLMDataset(val_seqs, max_seq_len=512, pad_id=tokenizer.pad_id)

    train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=8, shuffle=False)

    # 4. Instantiate 6-Layer Mathiyon SLM v1.2 (~7.43M parameters)
    model = MathiyonSLM(
        vocab_size=5000,
        d_model=256,
        nhead=8,
        num_layers=6,  # Scaled from 4 to 6 layers
        max_seq_len=512
    ).to(device)

    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Model Architecture: Mathiyon SLM v1.2 (6 Layers, 256 d_model, 8 heads)")
    print(f"Total Parameters:   {total_params:,} (~{total_params / 1e6:.2f}M)")

    # 5. Loss, Optimizer, LR Scheduler
    criterion = nn.CrossEntropyLoss(ignore_index=tokenizer.pad_id)
    optimizer = AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)
    epochs = 15
    scheduler = CosineAnnealingLR(optimizer, T_max=epochs * max(1, len(train_loader)))

    best_val_loss = float("inf")
    patience = 3
    patience_counter = 0

    history = {
        "model_name": "Mathiyon SLM v1.2",
        "version": "1.2",
        "total_parameters": total_params,
        "num_layers": 6,
        "vocab_size": 5000,
        "context_length": 512,
        "tokenizer_unk_rate": unk_rate,
        "device": str(device),
        "epochs": epochs,
        "training_loss": [],
        "validation_loss": [],
        "perplexity": [],
        "training_time_seconds": 0
    }

    start_time = time.time()
    os.makedirs(V1_2_CHECKPOINT_DIR, exist_ok=True)

    # 6. Stage 1: Pretraining with Early Stopping
    print("\n--- STAGE 1: CAUSAL LANGUAGE MODEL PRETRAINING (15 EPOCHS) ---")
    model.train()

    for epoch in range(1, epochs + 1):
        running_loss = 0.0
        step_count = 0

        for input_ids, target_ids in train_loader:
            input_ids = input_ids.to(device)
            target_ids = target_ids.to(device)

            optimizer.zero_grad()
            logits = model(input_ids)
            loss = criterion(logits.view(-1, 5000), target_ids.view(-1))
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()

            running_loss += loss.item()
            step_count += 1

        avg_train_loss = running_loss / max(1, step_count)

        # Validation Step
        model.eval()
        val_loss = 0.0
        val_steps = 0
        with torch.no_grad():
            for input_ids, target_ids in val_loader:
                input_ids = input_ids.to(device)
                target_ids = target_ids.to(device)
                logits = model(input_ids)
                loss = criterion(logits.view(-1, 5000), target_ids.view(-1))
                val_loss += loss.item()
                val_steps += 1

        avg_val_loss = val_loss / max(1, val_steps)
        perplexity = math.exp(min(avg_val_loss, 20))

        history["training_loss"].append(round(avg_train_loss, 4))
        history["validation_loss"].append(round(avg_val_loss, 4))
        history["perplexity"].append(round(perplexity, 4))

        print(f"Epoch {epoch:2d}/{epochs} | Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} | Perplexity: {perplexity:.2f}")

        # Checkpoint Saving & Early Stopping
        torch.save(model.state_dict(), os.path.join(V1_2_CHECKPOINT_DIR, "latest.pt"))

        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            patience_counter = 0
            torch.save(model.state_dict(), os.path.join(V1_2_CHECKPOINT_DIR, "best.pt"))
            # Also save main model.pt
            torch.save(model.state_dict(), os.path.join(V1_2_CHECKPOINT_DIR, "model.pt"))
            print(f"  --> Saved new best checkpoint (Val Loss: {best_val_loss:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"[EARLY STOPPING] Validation loss stopped improving for {patience} epochs. Stopping early.")
                break

        model.train()

    # 7. Stage 2: Instruction Fine-Tuning
    print("\n--- STAGE 2: INSTRUCTION FINE-TUNING (120 PAIRS) ---")
    instruction_pairs = load_instruction_pairs()
    if instruction_pairs:
        inst_seqs = [tokenizer.encode(f"<BOS> Instruction: {p['instruction']}\nResponse: {p['response']} <EOS>") for p in instruction_pairs]
        inst_dataset = CausalLMDataset(inst_seqs, max_seq_len=512, pad_id=tokenizer.pad_id)
        inst_loader = DataLoader(inst_dataset, batch_size=8, shuffle=True)

        model.train()
        for inst_epoch in range(1, 3):
            inst_loss = 0.0
            for input_ids, target_ids in inst_loader:
                input_ids = input_ids.to(device)
                target_ids = target_ids.to(device)

                optimizer.zero_grad()
                logits = model(input_ids)
                loss = criterion(logits.view(-1, 5000), target_ids.view(-1))
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                inst_loss += loss.item()
            
            print(f"Instruction Epoch {inst_epoch}/2 | Loss: {inst_loss / max(1, len(inst_loader)):.4f}")

        # Save instruction tuned model checkpoint
        os.makedirs(INSTRUCT_CHECKPOINT_DIR, exist_ok=True)
        torch.save(model.state_dict(), os.path.join(INSTRUCT_CHECKPOINT_DIR, "model.pt"))
        print(f"[OK] Saved instruction tuned model to {INSTRUCT_CHECKPOINT_DIR}")

    end_time = time.time()
    history["training_time_seconds"] = round(end_time - start_time, 2)
    history["best_val_loss"] = round(best_val_loss, 4)

    # 8. Serialize Tokenizer v1.2 and History Metrics JSON
    tokenizer_v1_2_path = os.path.join(V1_2_CHECKPOINT_DIR, "tokenizer_v1.2.json")
    tokenizer.save_vocab(tokenizer_v1_2_path)

    metrics_path = os.path.join(V1_2_CHECKPOINT_DIR, "training_history_v1.2.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

    print("\n" + "=" * 60)
    print(f"[SUCCESS] MATHIYON SLM v1.2 TRAINING COMPLETE")
    print(f"Best Val Loss: {history['best_val_loss']} | Perplexity: {history['perplexity'][-1]} | Time: {history['training_time_seconds']}s")
    print("=" * 60)
    return model, tokenizer, history

if __name__ == "__main__":
    train_slm_v1_2()
