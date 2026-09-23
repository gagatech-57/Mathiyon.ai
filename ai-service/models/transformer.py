"""
Mathiyon SLM PyTorch Model Definition
Implements Token Embedding + Positional Encoding + Multi-Head Self-Attention + Logits Projection.
"""
import os
import torch
import torch.nn as nn
import torch.nn.functional as F

class MathiyonSLM(nn.Module):
    def __init__(self, vocab_size=5000, d_model=256, nhead=8, num_layers=4, max_seq_len=512):
        super(MathiyonSLM, self).__init__()
        self.vocab_size = vocab_size
        self.d_model = d_model
        
        # Token Embedding
        self.embedding = nn.Embedding(vocab_size, d_model)
        
        # Learned Positional Embeddings
        self.pos_embedding = nn.Embedding(max_seq_len, d_model)
        
        # Transformer Encoder Blocks (Multi-Head Self-Attention + Feed Forward + LayerNorm)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=d_model * 4,
            dropout=0.1,
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        # Final Output Projection Layer
        self.fc_out = nn.Linear(d_model, vocab_size)

    def forward(self, input_ids):
        # input_ids shape: [batch_size, seq_len]
        batch_size, seq_len = input_ids.shape
        
        positions = torch.arange(0, seq_len, device=input_ids.device).unsqueeze(0).repeat(batch_size, 1)
        
        # Embedding + Positional Encoding
        tok_emb = self.embedding(input_ids)
        pos_emb = self.pos_embedding(positions)
        x = tok_emb + pos_emb
        
        # Neural Transformer Forward Pass
        out = self.transformer(x)
        
        # Output Logits
        logits = self.fc_out(out)
        return logits

def get_or_create_model(weights_path=None, vocab_size=5000, d_model=256):
    model = MathiyonSLM(vocab_size=vocab_size, d_model=d_model)
    
    # Target trained checkpoint path
    v1_1_checkpoint = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "checkpoints", "mathiyon-slm-v1.1", "latest", "model.pt")
    target_weights = weights_path or (v1_1_checkpoint if os.path.exists(v1_1_checkpoint) else "models/slm_model.pt")

    if os.path.exists(target_weights):
        try:
            model.load_state_dict(torch.load(target_weights, map_location=torch.device('cpu')))
            print(f"[OK] Loaded trained PyTorch SLM v1.1 weights from {target_weights}")
        except Exception as e:
            print(f"[WARNING] Initializing PyTorch weights ({e})")
            save_model(model, target_weights)
    else:
        save_model(model, target_weights)
        
    model.eval()
    return model


def save_model(model, weights_path="models/slm_model.pt"):
    try:
        os.makedirs(os.path.dirname(weights_path), exist_ok=True)
        torch.save(model.state_dict(), weights_path)
        print(f"Saved PyTorch weights to {weights_path}")
    except Exception as e:
        print(f"Model save notice: {e}")
