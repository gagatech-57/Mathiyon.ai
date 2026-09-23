"""
Mathiyon SLM Dataset Pipeline
Loads raw multi-domain texts, performs cleaning & deduplication, builds 90/10 train/val splits,
and exposes PyTorch Dataset & DataLoader instances for pretraining and instruction fine-tuning.
"""
import os
import json
import torch
from torch.utils.data import Dataset, DataLoader
from training.config import DATA_RAW_DIR, DATA_PROCESSED_DIR, CONTEXT_LENGTH, BATCH_SIZE
from tokenizer.bpe_tokenizer import MathiyonTokenizer

def load_and_clean_raw_texts():
    """Loads, cleans, and deduplicates all raw domain text files."""
    raw_texts = []
    
    # 1. Text Domain Files
    for filename in ["general_english.txt", "tamil_corpus.txt", "programming_code.txt", "math_science.txt"]:
        filepath = os.path.join(DATA_RAW_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                lines = f.readlines()
                for line in lines:
                    cleaned_line = line.strip()
                    if cleaned_line and len(cleaned_line) > 5:
                        raw_texts.append(cleaned_line)

    # 2. Deduplication
    unique_texts = list(dict.fromkeys(raw_texts))
    print(f"[OK] Loaded & cleaned {len(unique_texts)} unique text samples from {DATA_RAW_DIR}")
    return unique_texts

def load_instruction_pairs():
    """Loads instruction fine-tuning pairs."""
    filepath = os.path.join(DATA_RAW_DIR, "instruction_pairs.json")
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            pairs = json.load(f)
            print(f"[OK] Loaded {len(pairs)} instruction fine-tuning pairs")
            return pairs
    return []


class CausalLMDataset(Dataset):
    """PyTorch Dataset for Causal Language Model Next-Token Prediction Pretraining."""
    def __init__(self, tokenized_sequences, max_seq_len=CONTEXT_LENGTH, pad_id=0):
        self.samples = []
        self.max_seq_len = max_seq_len
        self.pad_id = pad_id

        for seq in tokenized_sequences:
            if len(seq) > 2:
                # Truncate or Pad sequence
                if len(seq) > max_seq_len:
                    seq = seq[:max_seq_len]
                else:
                    seq = seq + [pad_id] * (max_seq_len - len(seq))
                
                input_ids = seq[:-1]
                target_ids = seq[1:]
                self.samples.append((torch.tensor(input_ids, dtype=torch.long), torch.tensor(target_ids, dtype=torch.long)))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        return self.samples[idx]

def prepare_dataloaders(tokenizer: MathiyonTokenizer, val_split=0.1):
    """Prepares PyTorch DataLoaders for train and validation sets."""
    raw_texts = load_and_clean_raw_texts()
    
    # Train Tokenizer on raw corpus
    tokenizer.train_tokenizer(raw_texts, target_vocab_size=tokenizer.vocab_size)
    
    # Tokenize all text samples
    tokenized_sequences = [tokenizer.encode(t) for t in raw_texts]

    # 90 / 10 Train / Val Split
    split_idx = int(len(tokenized_sequences) * (1.0 - val_split))
    train_seqs = tokenized_sequences[:split_idx]
    val_seqs = tokenized_sequences[split_idx:]

    train_dataset = CausalLMDataset(train_seqs, max_seq_len=CONTEXT_LENGTH, pad_id=tokenizer.pad_id)
    val_dataset = CausalLMDataset(val_seqs, max_seq_len=CONTEXT_LENGTH, pad_id=tokenizer.pad_id)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

    print(f"[OK] Created DataLoaders: Train Batches={len(train_loader)} | Val Batches={len(val_loader)}")
    return train_loader, val_loader


if __name__ == "__main__":
    tok = MathiyonTokenizer()
    tr, val = prepare_dataloaders(tok)
