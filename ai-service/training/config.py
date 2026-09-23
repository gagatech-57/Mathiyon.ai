"""
Mathiyon SLM v1.1 Central Training & Hyperparameter Configuration
"""
import os

# Model Metadata
MODEL_NAME = "Mathiyon SLM v1.1"
MODEL_VERSION = "v1.1"
ENGINE_NAME = "PyTorch Causal SLM v1.1"

# Architecture Hyperparameters (~5.85M parameters)
VOCAB_SIZE = 5000
CONTEXT_LENGTH = 512
EMBEDDING_DIM = 256
NUM_LAYERS = 4
NUM_HEADS = 8
DIM_FEEDFORWARD = 1024
DROPOUT = 0.1

# Training Hyperparameters
BATCH_SIZE = 8
LEARNING_RATE = 1e-3
WEIGHT_DECAY = 0.01
EPOCHS = 10
WARMUP_STEPS = 50
GRADIENT_CLIP = 1.0
CHECKPOINT_INTERVAL = 100

# File Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
DATA_PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
CHECKPOINTS_DIR = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.1")
LATEST_CHECKPOINT_DIR = os.path.join(CHECKPOINTS_DIR, "latest")
MODEL_WEIGHTS_PATH = os.path.join(LATEST_CHECKPOINT_DIR, "model.pt")
TOKENIZER_PATH = os.path.join(LATEST_CHECKPOINT_DIR, "tokenizer_v1.1.json")
METRICS_PATH = os.path.join(LATEST_CHECKPOINT_DIR, "training_history.json")
