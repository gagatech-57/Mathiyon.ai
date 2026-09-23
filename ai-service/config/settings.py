"""
Mathiyon AI Service Settings & Hyperparameters
"""
import os

PORT = int(os.getenv("AI_PORT", "8000"))
HOST = os.getenv("AI_HOST", "0.0.0.0")

# Small Language Model (SLM v1.2) Central Configuration
MODEL_NAME = "Mathiyon SLM v1.2"
MODEL_VERSION = "1.2"
ENGINE_NAME = "PyTorch Causal SLM v1.2"



# Context Window & Sampling Parameters
MAX_CONTEXT_MESSAGES = 20
MAX_SEQ_LEN = 512
MAX_NEW_TOKENS = 64
TEMPERATURE = 0.7
TOP_K = 40
TOP_P = 0.9

# Transformer Architecture Hyperparameters (~5.85M parameters)
VOCAB_SIZE = 5000
D_MODEL = 256
NHEAD = 8
NUM_LAYERS = 4

