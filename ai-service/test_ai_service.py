"""
Mathiyon AI PyTorch Service Test Suite
Tests FastAPI health, PyTorch forward pass, tokenizer encoding/decoding, and POST /generate endpoint.
"""
import pytest
from fastapi.testclient import TestClient
from app import app
from tokenizer.bpe_tokenizer import MathiyonTokenizer
from models.transformer import MathiyonSLM
import torch

client = TestClient(app)

def test_health_endpoint():
    """Test 1: GET /health status check"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "Mathiyon AI"
    assert data["model"] == "Mathiyon Neural"
    assert data["version"] == "1.2"
    assert data["framework"] == "PyTorch"
    assert data["model_loaded"] is True



def test_tokenizer_encoding_decoding():
    """Test 2: Tokenizer encode/decode consistency"""
    tokenizer = MathiyonTokenizer()
    texts = ["Hello Mathiyon", "Who are you?", "What is JavaScript?"]
    for text in texts:
        tokens = tokenizer.encode(text)
        assert isinstance(tokens, list)
        assert len(tokens) > 2  # Includes BOS & EOS
        decoded = tokenizer.decode(tokens)
        assert isinstance(decoded, str)

def test_pytorch_model_forward_pass():
    """Test 3: PyTorch SLM model forward pass tensor shapes"""
    model = MathiyonSLM(vocab_size=1000, d_model=128)
    dummy_input = torch.tensor([[2, 10, 15, 3]], dtype=torch.long)
    logits = model(dummy_input)
    assert logits.shape == (1, 4, 1000)

def test_generate_endpoint_success():
    """Test 4: POST /generate valid payload with multi-turn context & sampling parameters"""
    payload = {
        "message": "What is my name?",
        "conversation": [
            {"role": "user", "content": "My name is Guna."},
            {"role": "assistant", "content": "Nice to meet you Guna!"}
        ],
        "max_new_tokens": 16,
        "temperature": 0.7,
        "top_k": 40,
        "top_p": 0.9
    }
    response = client.post("/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "model" in data
    assert "version" in data
    assert "engine" in data
    assert data["tokens_processed"] > 0
    assert "generation_time_ms" in data

def test_generate_endpoint_empty_message():
    """Test 5: POST /generate empty message validation"""
    payload = {"message": "   "}
    response = client.post("/generate", json=payload)
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"].lower()
