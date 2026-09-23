"""
Mathiyon AI - FastAPI PyTorch Service
Exposes GET /health and POST /generate endpoints with full model metadata & sampling parameters.
"""
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from config.settings import (
    HOST,
    PORT,
    MODEL_NAME,
    MODEL_VERSION,
    ENGINE_NAME,
    MAX_NEW_TOKENS,
    TEMPERATURE,
    TOP_K,
    TOP_P
)
from inference.generator import MathiyonGenerator

app = FastAPI(
    title="Mathiyon AI PyTorch Service",
    description="Dedicated FastAPI neural inference service powered by PyTorch SLM v1.0",
    version="1.0.0"
)

# Enable CORS for Express backend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PyTorch Model & Generator
generator = MathiyonGenerator()

class GenerateRequest(BaseModel):
    message: str = Field(..., description="User prompt message string")
    conversation: Optional[List[Dict[str, Any]]] = Field(default=[], description="Structured conversation history")
    max_new_tokens: Optional[int] = Field(default=MAX_NEW_TOKENS, description="Max new tokens to generate")
    temperature: Optional[float] = Field(default=TEMPERATURE, description="Sampling temperature")
    top_k: Optional[int] = Field(default=TOP_K, description="Top-K sampling")
    top_p: Optional[float] = Field(default=TOP_P, description="Top-P nucleus sampling")

class GenerateResponse(BaseModel):
    response: str
    model: str
    version: str
    engine: str
    tokens_processed: int
    tokens_generated: int
    generation_time_ms: float
    confidence: float

@app.get("/health")
def health_check():
    """Health check endpoint returning PyTorch service status."""
    import torch
    is_model_loaded = generator.model is not None and len(list(generator.model.parameters())) > 0
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return {
        "status": "ok",
        "service": "Mathiyon AI",
        "model": "Mathiyon Neural",
        "version": MODEL_VERSION,
        "framework": "PyTorch",
        "device": device,
        "cuda_available": torch.cuda.is_available(),
        "model_loaded": is_model_loaded
    }

@app.get("/models")
def get_model_registry():
    """Model Registry endpoint returning active & available model versions."""
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return {
        "activeModel": "mathiyon-slm-v1.2",
        "availableModels": [
            "mathiyon-slm-v1.1",
            "mathiyon-slm-v1.2",
            "mathiyon-slm-v1.3 (Upcoming)",
            "mathiyon-slm-v2.0 (Planned)"
        ],
        "defaultModel": "mathiyon-slm-v1.2",
        "device": device,
        "cudaAvailable": torch.cuda.is_available()
    }


class MathSolveRequest(BaseModel):
    question: str = Field(..., description="Mathematical question string")
    difficulty: Optional[str] = Field(default="intermediate", description="Target difficulty level")

@app.post("/math/solve")
def solve_math_problem(payload: MathSolveRequest):
    """Solves mathematical problem deterministically using SymPy & MathEngineSolver."""
    if not payload.question or not payload.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question prompt cannot be empty"
        )
        
    try:
        from math_engine.solver import MathEngineSolver
        res = MathEngineSolver.solve(payload.question)
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Math Engine execution error: {str(e)}"
        )

@app.post("/generate", response_model=GenerateResponse)
def generate_ai_response(payload: GenerateRequest):
    """Generates AI response using PyTorch neural network forward pass & autoregressive sampling."""
    if not payload.message or not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message prompt cannot be empty"
        )
        
    try:
        result = generator.generate(
            message=payload.message,
            conversation=payload.conversation,
            max_new_tokens=payload.max_new_tokens or MAX_NEW_TOKENS,
            temperature=payload.temperature if payload.temperature is not None else TEMPERATURE,
            top_k=payload.top_k if payload.top_k is not None else TOP_K,
            top_p=payload.top_p if payload.top_p is not None else TOP_P
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PyTorch inference execution error: {str(e)}"
        )


class EmbedRequest(BaseModel):
    text: str = Field(..., description="Text string to embed into vector representation")

class EmbedBatchRequest(BaseModel):
    texts: List[str] = Field(..., description="List of text strings to embed")

def _compute_dense_embedding(text: str, dim: int = 384) -> List[float]:
    """Computes normalized 384-dimensional dense vector embedding for text similarity matching."""
    import math
    import hashlib
    
    clean_text = text.lower().strip()
    words = clean_text.split()
    vector = [0.0] * dim
    
    if not clean_text:
        return vector

    # Character & Subword N-Gram feature projection
    for i in range(len(clean_text) - 2):
        ngram = clean_text[i:i+3]
        idx = int(hashlib.md5(ngram.encode('utf-8')).hexdigest(), 16) % dim
        vector[idx] += 1.0

    # Word-level feature projection
    for w in words:
        idx1 = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16) % dim
        idx2 = int(hashlib.sha256(w.encode('utf-8')).hexdigest(), 16) % dim
        vector[idx1] += 2.0
        vector[idx2] += 1.5

    # Unit L2 Normalization for fast exact cosine similarity
    magnitude = math.sqrt(sum(v * v for v in vector))
    if magnitude > 0:
        vector = [v / magnitude for v in vector]

    return vector

@app.post("/embed")
def embed_single_text(payload: EmbedRequest):
    """Generates 384-dimensional vector embedding for a single text chunk."""
    if not payload.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    vec = _compute_dense_embedding(payload.text)
    return {"success": True, "embedding": vec, "dimension": len(vec)}

@app.post("/embedBatch")
def embed_batch_texts(payload: EmbedBatchRequest):
    """Generates vector embeddings for a batch of document text chunks."""
    if not payload.texts:
        raise HTTPException(status_code=400, detail="Texts array cannot be empty")
    embeddings = [_compute_dense_embedding(t) for t in payload.texts]
    return {"success": True, "embeddings": embeddings, "count": len(embeddings), "dimension": 384}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=HOST, port=PORT, reload=False)

