"""
Mathiyon AI Model Registry
Centralized Isolated Registry for Managing Mathiyon SLM Model Versions (v1.2 Production & v1.3 Experimental).
"""
import os
import sys
from typing import Dict, Any, List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


class ModelRegistry:
    def __init__(self):
        self._models = {
            "mathiyon-slm-v1.2": {
                "model_id": "mathiyon-slm-v1.2",
                "version": "1.2",
                "name": "Mathiyon SLM v1.2",
                "checkpoint_path": os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.2", "latest", "best.pt"),
                "tokenizer_path": os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.2", "latest", "tokenizer_v1.2.json"),
                "architecture": "PyTorch Causal SLM (Token + Learned Pos + MultiHead)",
                "parameter_count": 5850000,
                "vocab_size": 5000,
                "context_length": 512,
                "status": "production",
                "production": True
            },
            "mathiyon-slm-v1.3": {
                "model_id": "mathiyon-slm-v1.3",
                "version": "1.3",
                "name": "Mathiyon SLM v1.3",
                "checkpoint_path": os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "instruction_tuning", "best_instruction.pt"),
                "tokenizer_path": os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "latest", "tokenizer_v1.3.json"),
                "architecture": "PyTorch Causal SLM (RoPE + RMSNorm + SwiGLU)",
                "parameter_count": 21952896,
                "vocab_size": 8000,
                "context_length": 1024,
                "status": "experimental",
                "production": False
            }
        }
        self._v12_generator = None
        self._v13_generator = None

    def list_models(self) -> List[Dict[str, Any]]:
        """Returns public metadata list of registered model versions."""
        sanitized_list = []
        for model_id, meta in self._models.items():
            sanitized = {
                "model_id": meta["model_id"],
                "version": meta["version"],
                "name": meta["name"],
                "architecture": meta["architecture"],
                "parameter_count": meta["parameter_count"],
                "vocab_size": meta["vocab_size"],
                "context_length": meta["context_length"],
                "status": meta["status"],
                "production": meta["production"]
            }
            sanitized_list.append(sanitized)
        return sanitized_list

    def get_model_info(self, model_id: str) -> Dict[str, Any]:
        """Returns detailed metadata for a given model_id."""
        if model_id not in self._models:
            raise KeyError(f"Model ID '{model_id}' is not registered in Mathiyon ModelRegistry.")
        return dict(self._models[model_id])

    def get_production_model(self) -> Dict[str, Any]:
        """Returns metadata for active production model (v1.2)."""
        return dict(self._models["mathiyon-slm-v1.2"])

    def load_v1_2_generator(self):
        """Lazy-loads and returns production v1.2 generator instance."""
        if self._v12_generator is None:
            from inference.generator import MathiyonGenerator
            self._v12_generator = MathiyonGenerator()
        return self._v12_generator

    def load_v1_3_generator(self):
        """Lazy-loads and returns experimental v1.3 generator instance."""
        if self._v13_generator is None:
            from inference.v1_3_generator import Mathiyonv13Generator
            self._v13_generator = Mathiyonv13Generator()
        return self._v13_generator


# Global singleton instance
model_registry = ModelRegistry()
