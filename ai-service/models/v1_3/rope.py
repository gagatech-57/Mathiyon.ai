"""
Rotary Positional Embeddings (RoPE) for Mathiyon SLM v1.3
Implements dynamic sine/cosine frequency rotation for Query and Key tensors.
"""
import torch
import torch.nn as nn

def rotate_half(x: torch.Tensor) -> torch.Tensor:
    """Splits last dimension in half and rotates [x1, x2] -> [-x2, x1]."""
    x1 = x[..., : x.shape[-1] // 2]
    x2 = x[..., x.shape[-1] // 2 :]
    return torch.cat((-x2, x1), dim=-1)

def apply_rotary_pos_emb(q: torch.Tensor, k: torch.Tensor, cos: torch.Tensor, sin: torch.Tensor):
    """
    Applies rotary positional embeddings to query and key tensors.
    q, k shape: [batch_size, num_heads, seq_len, head_dim]
    cos, sin shape: [1, 1, seq_len, head_dim]
    """
    q_embed = (q * cos) + (rotate_half(q) * sin)
    k_embed = (k * cos) + (rotate_half(k) * sin)
    return q_embed, k_embed

class RotaryEmbedding(nn.Module):
    def __init__(self, dim: int, max_position_embeddings: int = 1024, base: float = 10000.0):
        super().__init__()
        self.dim = dim
        self.max_position_embeddings = max_position_embeddings
        self.base = base
        inv_freq = 1.0 / (self.base ** (torch.arange(0, self.dim, 2).float() / self.dim))
        self.register_buffer("inv_freq", inv_freq, persistent=False)
        self._set_cos_sin_cache(max_position_embeddings)

    def _set_cos_sin_cache(self, seq_len: int):
        t = torch.arange(seq_len, dtype=self.inv_freq.dtype)
        freqs = torch.outer(t, self.inv_freq) # [seq_len, dim / 2]
        emb = torch.cat((freqs, freqs), dim=-1) # [seq_len, dim]
        self.register_buffer("cos_cached", emb.cos(), persistent=False)
        self.register_buffer("sin_cached", emb.sin(), persistent=False)

    def forward(self, x: torch.Tensor, seq_len: int):
        """
        Returns cos and sin tensors shaped for broadcasting with [batch, num_heads, seq_len, head_dim].
        """
        if seq_len > self.cos_cached.shape[0]:
            self._set_cos_sin_cache(seq_len)
            
        device = x.device
        dtype = x.dtype
        cos = self.cos_cached[:seq_len, :].to(device=device, dtype=dtype).unsqueeze(0).unsqueeze(0)
        sin = self.sin_cached[:seq_len, :].to(device=device, dtype=dtype).unsqueeze(0).unsqueeze(0)
        return cos, sin
