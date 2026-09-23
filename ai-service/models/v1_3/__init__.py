"""
Mathiyon SLM v1.3 Architecture Package
Isolated implementation of RoPE, RMSNorm, SwiGLU, and 8-layer Transformer.
"""
from .config import MathiyonSLMv13Config
from .model import MathiyonSLMv13, get_target_device

__all__ = ["MathiyonSLMv13Config", "MathiyonSLMv13", "get_target_device"]
