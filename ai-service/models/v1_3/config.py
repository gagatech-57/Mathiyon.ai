"""
Mathiyon SLM v1.3 Configuration Module
Defines explicit hyperparameters for Mathiyon SLM v1.3 architecture.
"""
from dataclasses import dataclass

@dataclass
class MathiyonSLMv13Config:
    model_version: str = "mathiyon-slm-v1.3"
    vocab_size: int = 8000
    context_length: int = 1024
    hidden_size: int = 384
    num_layers: int = 8
    num_heads: int = 12
    ffn_hidden_size: int = 1536
    rope_theta: float = 10000.0
    rms_norm_eps: float = 1e-6
    tie_word_embeddings: bool = True
    dropout: float = 0.0

    @property
    def head_dim(self) -> int:
        assert self.hidden_size % self.num_heads == 0, (
            f"hidden_size ({self.hidden_size}) must be divisible by num_heads ({self.num_heads})"
        )
        return self.hidden_size // self.num_heads
