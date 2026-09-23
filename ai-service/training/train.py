"""
Mathiyon SLM v1.1 Real PyTorch Training & Instruction Fine-Tuning Pipeline
Supports automatic GPU/CPU detection, AdamW optimization, Cosine LR scheduling,
Cross-Entropy loss calculation, validation perplexity tracking, and checkpoint serialization.
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

# Ensure ai-service root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from training.config import (
    MODEL_NAME,
    MODEL_VERSION,
    VOCAB_SIZE,
    CONTEXT_LENGTH,
    EMBEDDING_DIM,
    NUM_LAYERS,
    NUM_HEADS,
    BATCH_SIZE,
    LEARNING_RATE,
    WEIGHT_DECAY,
    EPOCHS,
    GRADIENT_CLIP,
    CHECKPOINTS_DIR,
    LATEST_CHECKPOINT_DIR,
    MODEL_WEIGHTS_PATH,
    TOKENIZER_PATH,
    METRICS_PATH
)
from tokenizer.bpe_tokenizer import MathiyonTokenizer
from models.transformer import MathiyonSLM
from training.dataset import prepare_dataloaders, load_instruction_pairs, CausalLMDataset
from torch.utils.data import DataLoader

def detect_device():
    """Detects available hardware device (CUDA vs CPU) and prints specifications."""
    if torch.cuda.is_available():
        device = torch.device("cuda")
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2)
        precision = "FP16 / FP32"
        print(f"Device:    CUDA ({gpu_name})")
        print(f"GPU Name:  {gpu_name}")
        print(f"VRAM:      {vram_gb} GB")
        print(f"Precision: {precision}")
    else:
        device = torch.device("cpu")
        print("Device:    CPU (Safe Fallback)")
        print("GPU Name:  N/A (CPU execution)")
        print("VRAM:      System RAM")
        print("Precision: FP32")
    return device

def train_mathiyon_slm():
    """Executes real PyTorch Causal Language Model pretraining & instruction fine-tuning."""
    print("=" * 60)
    print(f"[START] INITIALIZING MATHIYON AI SLM {MODEL_VERSION} TRAINING PIPELINE")
    print("=" * 60)


    device = detect_device()
    
    # 1. Initialize Tokenizer & DataLoaders
    tokenizer = MathiyonTokenizer(vocab_size=VOCAB_SIZE)
    train_loader, val_loader = prepare_dataloaders(tokenizer)

    # 2. Instantiate PyTorch MathiyonSLM Model (~5.85M parameters)
    model = MathiyonSLM(
        vocab_size=VOCAB_SIZE,
        d_model=EMBEDDING_DIM,
        nhead=NUM_HEADS,
        num_layers=NUM_LAYERS,
        max_seq_len=CONTEXT_LENGTH
    ).to(device)

    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Model Architecture: {MODEL_NAME}")
    print(f"Total Parameters:   {total_params:,} (~{total_params / 1e6:.2f}M)")

    # 3. Setup Loss, Optimizer, and LR Scheduler
    criterion = nn.CrossEntropyLoss(ignore_index=tokenizer.pad_id)
    optimizer = AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)
    scheduler = CosineAnnealingLR(optimizer, T_max=EPOCHS * max(1, len(train_loader)))

    history = {
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "total_parameters": total_params,
        "vocab_size": VOCAB_SIZE,
        "context_length": CONTEXT_LENGTH,
        "device": str(device),
        "epochs": EPOCHS,
        "training_loss": [],
        "validation_loss": [],
        "perplexity": [],
        "training_time_seconds": 0
    }

    start_train_time = time.time()

    # 4. Stage 1: Causal Language Model Pretraining
    print("\n--- STAGE 1: CAUSAL LANGUAGE MODEL PRETRAINING ---")
    model.train()

    for epoch in range(1, EPOCHS + 1):
        running_loss = 0.0
        step_count = 0

        for input_ids, target_ids in train_loader:
            input_ids = input_ids.to(device)
            target_ids = target_ids.to(device)

            optimizer.zero_grad()

            # Forward Pass
            logits = model(input_ids)
            
            # Reshape logits and targets for CrossEntropyLoss: [batch * seq_len, vocab_size]
            loss = criterion(logits.view(-1, VOCAB_SIZE), target_ids.view(-1))

            # Backpropagation & Gradient Clipping
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), GRADIENT_CLIP)
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
                loss = criterion(logits.view(-1, VOCAB_SIZE), target_ids.view(-1))
                val_loss += loss.item()
                val_steps += 1

        avg_val_loss = val_loss / max(1, val_steps)
        perplexity = math.exp(min(avg_val_loss, 20))  # Cap for numerical stability

        history["training_loss"].append(round(avg_train_loss, 4))
        history["validation_loss"].append(round(avg_val_loss, 4))
        history["perplexity"].append(round(perplexity, 4))

        print(f"Epoch {epoch:2d}/{EPOCHS} | Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} | Perplexity: {perplexity:.2f}")

    # 5. Stage 2: Instruction Fine-Tuning
    print("\n--- STAGE 2: INSTRUCTION FINE-TUNING ---")
    instruction_pairs = load_instruction_pairs()
    if instruction_pairs:
        inst_token_seqs = []
        for pair in instruction_pairs:
            text = f"<BOS> Instruction: {pair['instruction']} \nResponse: {pair['response']} <EOS>"
            inst_token_seqs.append(tokenizer.encode(text))

        inst_dataset = CausalLMDataset(inst_token_seqs, max_seq_len=CONTEXT_LENGTH, pad_id=tokenizer.pad_id)
        inst_loader = DataLoader(inst_dataset, batch_size=BATCH_SIZE, shuffle=True)

        model.train()
        for epoch in range(1, 3):  # 2 fine-tuning epochs
            inst_loss = 0.0
            for input_ids, target_ids in inst_loader:
                input_ids = input_ids.to(device)
                target_ids = target_ids.to(device)

                optimizer.zero_grad()
                logits = model(input_ids)
                loss = criterion(logits.view(-1, VOCAB_SIZE), target_ids.view(-1))
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), GRADIENT_CLIP)
                optimizer.step()
                inst_loss += loss.item()
            
            print(f"Instruction Fine-Tuning Epoch {epoch}/2 | Loss: {inst_loss / max(1, len(inst_loader)):.4f}")

    end_train_time = time.time()
    history["training_time_seconds"] = round(end_train_time - start_train_time, 2)

    # 6. Save Model Checkpoint, Tokenizer, and Metrics
    os.makedirs(LATEST_CHECKPOINT_DIR, exist_ok=True)
    
    # Save Model Checkpoint
    torch.save(model.state_dict(), MODEL_WEIGHTS_PATH)
    print(f"\n[OK] Saved trained PyTorch model weights to: {MODEL_WEIGHTS_PATH}")

    # Save Optimizer State
    torch.save(optimizer.state_dict(), os.path.join(LATEST_CHECKPOINT_DIR, "optimizer.pt"))

    # Save Tokenizer Vocabulary
    tokenizer.save_vocab(TOKENIZER_PATH)

    # Save Metrics & Configuration History JSON
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)
    print(f"[OK] Saved training metrics history to: {METRICS_PATH}")

    print("=" * 60)
    print(f"[SUCCESS] MATHIYON SLM {MODEL_VERSION} TRAINING COMPLETE (Final Loss: {history['training_loss'][-1]}, Perplexity: {history['perplexity'][-1]})")
    print("=" * 60)

    return model, tokenizer, history

if __name__ == "__main__":
    train_mathiyon_slm()
