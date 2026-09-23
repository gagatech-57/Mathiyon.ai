"""
Mathiyon SLM v1.3 Core Transformer Architecture
Pre-norm architecture integrating RMSNorm, CausalSelfAttention with RoPE, and SwiGLU FFN.
"""
import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from .config import MathiyonSLMv13Config
from .normalization import RMSNorm
from .attention import CausalSelfAttention
from .feedforward import SwiGLUFeedForward


class TransformerBlock(nn.Module):
    def __init__(self, config: MathiyonSLMv13Config):
        super().__init__()
        self.input_layernorm = RMSNorm(config.hidden_size, eps=config.rms_norm_eps)
        self.self_attn = CausalSelfAttention(config)
        self.post_attention_layernorm = RMSNorm(config.hidden_size, eps=config.rms_norm_eps)
        self.mlp = SwiGLUFeedForward(
            hidden_size=config.hidden_size,
            ffn_hidden_size=config.ffn_hidden_size,
            dropout=config.dropout
        )

    def forward(self, x: torch.Tensor, attention_mask: torch.Tensor = None) -> torch.Tensor:
        # Pre-normalization Residual Connections
        h = x + self.self_attn(self.input_layernorm(x), attention_mask=attention_mask)
        out = h + self.mlp(self.post_attention_layernorm(h))
        return out


class MathiyonSLMv13(nn.Module):
    def __init__(self, config: MathiyonSLMv13Config = None):
        super().__init__()
        if config is None:
            config = MathiyonSLMv13Config()
        self.config = config

        # Token Embedding (No learned positional embedding table)
        self.embed_tokens = nn.Embedding(config.vocab_size, config.hidden_size)
        
        # 8 Transformer Encoder Blocks
        self.layers = nn.ModuleList([TransformerBlock(config) for _ in range(config.num_layers)])
        
        # Final RMSNorm Layer
        self.norm = RMSNorm(config.hidden_size, eps=config.rms_norm_eps)
        
        # Output Language Model Head
        self.lm_head = nn.Linear(config.hidden_size, config.vocab_size, bias=False)

        # Weight Tying (Ties output linear weights to embedding weights)
        if config.tie_word_embeddings:
            self.lm_head.weight = self.embed_tokens.weight

        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor = None, labels: torch.Tensor = None):
        batch_size, seq_len = input_ids.shape
        x = self.embed_tokens(input_ids)

        for layer in self.layers:
            x = layer(x, attention_mask=attention_mask)

        x = self.norm(x)
        logits = self.lm_head(x)

        loss = None
        if labels is not None:
            shift_logits = logits[..., :-1, :].contiguous()
            shift_labels = labels[..., 1:].contiguous()
            loss = F.cross_entropy(shift_logits.view(-1, self.config.vocab_size), shift_labels.view(-1))

        return logits if loss is None else (logits, loss)

    def count_parameters(self) -> dict:
        """Returns detailed section-by-section parameter breakdown."""
        embed_params = sum(p.numel() for p in self.embed_tokens.parameters())
        attn_params = sum(p.numel() for layer in self.layers for p in layer.self_attn.parameters())
        swiglu_params = sum(p.numel() for layer in self.layers for p in layer.mlp.parameters())
        norm_params = (
            sum(p.numel() for layer in self.layers for p in layer.input_layernorm.parameters()) +
            sum(p.numel() for layer in self.layers for p in layer.post_attention_layernorm.parameters()) +
            sum(p.numel() for p in self.norm.parameters())
        )
        
        lm_head_params = 0 if self.config.tie_word_embeddings else sum(p.numel() for p in self.lm_head.parameters())
        total_trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)

        return {
            "embedding": embed_params,
            "attention": attn_params,
            "swiglu": swiglu_params,
            "normalization": norm_params,
            "lm_head": lm_head_params,
            "tied_weights": self.config.tie_word_embeddings,
            "total_trainable": total_trainable
        }


def get_target_device(requested_device: str = "auto") -> torch.device:
    """Supports AI_DEVICE=auto, cpu, or cuda with graceful fallback and strict errors."""
    env_device = os.getenv("AI_DEVICE", requested_device).lower()
    if env_device == "cuda":
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA was explicitly requested via AI_DEVICE=cuda, but CUDA is not available on this machine.")
        return torch.device("cuda")
    elif env_device == "cpu":
        return torch.device("cpu")
    else:  # auto
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def save_v1_3_checkpoint(model: MathiyonSLMv13, checkpoint_dir: str = None) -> str:
    """Saves v1.3 architecture checkpoint into checkpoints/mathiyon-slm-v1.3/latest/model_architecture.pt."""
    from dataclasses import asdict
    if checkpoint_dir is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        checkpoint_dir = os.path.join(base_dir, "checkpoints", "mathiyon-slm-v1.3", "latest")

    os.makedirs(checkpoint_dir, exist_ok=True)
    checkpoint_path = os.path.join(checkpoint_dir, "model_architecture.pt")
    
    checkpoint_data = {
        "model_version": model.config.model_version,
        "config_dict": asdict(model.config),
        "state_dict": model.state_dict(),
    }
    torch.save(checkpoint_data, checkpoint_path)
    return checkpoint_path


def load_v1_3_checkpoint(checkpoint_path: str, device: str = "auto") -> MathiyonSLMv13:
    """Loads v1.3 model architecture checkpoint strictly into isolated instance."""
    target_device = get_target_device(device)
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"v1.3 checkpoint not found at: {checkpoint_path}")

    checkpoint_data = torch.load(checkpoint_path, map_location=target_device, weights_only=False)
    config_dict = checkpoint_data.get("config_dict")
    if config_dict and isinstance(config_dict, dict):
        config = MathiyonSLMv13Config(**config_dict)
    else:
        config = checkpoint_data.get("config", MathiyonSLMv13Config())

    model = MathiyonSLMv13(config=config)
    model.load_state_dict(checkpoint_data["state_dict"])
    model.to(target_device)
    model.eval()
    return model
