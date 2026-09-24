"""
Mathiyon AI - FastAPI PyTorch Service
Exposes GET /health, GET /models, POST /generate (v1.2 Production), and POST /generate/v1.3 (v1.3 Experimental Test Endpoint).
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
from inference.model_registry import model_registry

app = FastAPI(
    title="Mathiyon AI PyTorch Service",
    description="Dedicated FastAPI neural inference service with isolated ModelRegistry support",
    version="1.3.0"
)

# Enable CORS for Express backend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Production PyTorch Model & Generator (v1.2)
generator = MathiyonGenerator()

class GenerateRequest(BaseModel):
    message: str = Field(..., description="User prompt message string")
    conversation: Optional[List[Dict[str, Any]]] = Field(default=[], description="Structured conversation history")
    max_new_tokens: Optional[int] = Field(default=MAX_NEW_TOKENS, description="Max new tokens to generate")
    temperature: Optional[float] = Field(default=TEMPERATURE, description="Sampling temperature")
    top_k: Optional[int] = Field(default=TOP_K, description="Top-K sampling")
    top_p: Optional[float] = Field(default=TOP_P, description="Top-P nucleus sampling")
    model: Optional[str] = Field(default="mathiyon-slm-v1.2", description="Target model ID override")

class GenerateResponse(BaseModel):
    response: str
    model: str
    version: str
    engine: str
    tokens_processed: int
    tokens_generated: int
    generation_time_ms: float
    confidence: float

class Generatev13Request(BaseModel):
    prompt: Optional[str] = Field(default=None, description="User prompt string")
    message: Optional[str] = Field(default=None, description="Alternative message field")
    max_new_tokens: Optional[int] = Field(default=64, description="Max new tokens to generate")
    temperature: Optional[float] = Field(default=0.7, description="Sampling temperature")
    deterministic: Optional[bool] = Field(default=False, description="Use greedy decoding")

class Generatev13Response(BaseModel):
    model: str = "mathiyon-slm-v1.3"
    experimental: bool = True
    response: str
    generation_time_ms: float
    tokens_generated: int

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
        "model_loaded": is_model_loaded,
        "registry_active": True
    }

@app.get("/models")
def get_model_registry_info():
    """Model Registry endpoint returning active, production & experimental model details."""
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    registered = model_registry.list_models()
    return {
        "activeModel": "mathiyon-slm-v1.2",
        "defaultModel": "mathiyon-slm-v1.2",
        "availableModels": [m["model_id"] for m in registered],
        "registeredModels": registered,
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
    """Production AI response endpoint (Default: SLM v1.2)."""
    if not payload.message or not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message prompt cannot be empty"
        )
    
    # Handle explicit experimental override if requested, else use production v1.2 generator
    target_model_id = (payload.model or "mathiyon-slm-v1.2").lower()
    
    if target_model_id == "mathiyon-slm-v1.3":
        try:
            v13_gen = model_registry.load_v1_3_generator()
            res_v13 = v13_gen.generate(
                prompt=payload.message,
                max_new_tokens=payload.max_new_tokens or 64,
                temperature=payload.temperature if payload.temperature is not None else 0.7
            )
            return {
                "response": res_v13["response"],
                "model": "mathiyon-slm-v1.3",
                "version": "1.3",
                "engine": "PyTorch Causal SLM v1.3 (RoPE + RMSNorm + SwiGLU)",
                "tokens_processed": len(payload.message.split()),
                "tokens_generated": res_v13["tokens_generated"],
                "generation_time_ms": res_v13["generation_time_ms"],
                "confidence": 0.95
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"v1.3 experimental model execution error: {str(e)}"
            )

    if target_model_id not in ["mathiyon-slm-v1.2", "mathiyon-slm-v1.1", "default"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid model ID '{payload.model}'. Active production model is 'mathiyon-slm-v1.2'."
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


@app.post("/generate/v1.3", response_model=Generatev13Response)
def generate_v13_experimental_response(payload: Generatev13Request):
    """Experimental test endpoint for Mathiyon SLM v1.3."""
    user_prompt = payload.prompt or payload.message
    if not user_prompt or not user_prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt cannot be empty"
        )
        
    try:
        v13_gen = model_registry.load_v1_3_generator()
        result = v13_gen.generate(
            prompt=user_prompt,
            max_new_tokens=payload.max_new_tokens or 64,
            temperature=payload.temperature if payload.temperature is not None else 0.7,
            deterministic=payload.deterministic or False
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"v1.3 inference execution error: {str(e)}"
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
