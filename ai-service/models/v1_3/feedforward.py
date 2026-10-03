"""
SwiGLU Feed-Forward Network for Mathiyon SLM v1.3
Implements Gated Linear Unit with SiLU (Swish) activation function.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F

class SwiGLUFeedForward(nn.Module):
    def __init__(self, hidden_size: int = 384, ffn_hidden_size: int = 1536, dropout: float = 0.0):
        super().__init__()
        self.hidden_size = hidden_size
        self.ffn_hidden_size = ffn_hidden_size
        
        # Linear projections without bias (modern LLM standard)
        self.gate_proj = nn.Linear(hidden_size, ffn_hidden_size, bias=False)
        self.up_proj = nn.Linear(hidden_size, ffn_hidden_size, bias=False)
        self.down_proj = nn.Linear(ffn_hidden_size, hidden_size, bias=False)
        self.dropout = nn.Dropout(dropout) if dropout > 0.0 else nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # gate = SiLU(x @ W_gate)
        gate = F.silu(self.gate_proj(x))
        # value = x @ W_up
        value = self.up_proj(x)
        # output = (gate * value) @ W_down
        output = self.down_proj(gate * value)
        return self.dropout(output)

    def extra_repr(self) -> str:
        return f"hidden_size={self.hidden_size}, ffn_hidden_size={self.ffn_hidden_size}"
