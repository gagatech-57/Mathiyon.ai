"""
Mathiyon SLM v1.3 Neural Generator Module
Performs PyTorch autoregressive forward passes for SLM v1.3.
Supports both FP32 full-prefix recomputation and production-quality KV-cache acceleration.
Production remains 100% v1.2.
"""
import os
import sys
import time
from typing import Dict, Any, Optional, List, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from tokenizer.bpe_tokenizer import MathiyonTokenizer
from models.v1_3.config import MathiyonSLMv13Config
from models.v1_3.model import MathiyonSLMv13, get_target_device
from models.v1_3.rope import apply_rotary_pos_emb

V1_3_CHECKPOINT = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "instruction_tuning", "best_instruction.pt")
V1_3_TOKENIZER = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "latest", "tokenizer_v1.3.json")


def forward_kv_cache(
    model: MathiyonSLMv13,
    input_ids: torch.Tensor,
    past_kv: Optional[List[Tuple[torch.Tensor, torch.Tensor]]] = None,
    start_pos: int = 0
) -> Tuple[torch.Tensor, List[Tuple[torch.Tensor, torch.Tensor]]]:
    """
    Executes KV-cached forward pass across model layers.
    - If past_kv is None: prefill phase for prompt sequence.
    - If past_kv is provided: 1-token autoregressive step at start_pos offset.
    """
    batch_size, seq_len = input_ids.shape
    x = model.embed_tokens(input_ids)
    new_kv = []
    
    for i, layer in enumerate(model.layers):
        attn = layer.self_attn
        norm_x = layer.input_layernorm(x)
        
        q = attn.q_proj(norm_x).view(batch_size, seq_len, attn.num_heads, attn.head_dim).transpose(1, 2)
        k = attn.k_proj(norm_x).view(batch_size, seq_len, attn.num_heads, attn.head_dim).transpose(1, 2)
        v = attn.v_proj(norm_x).view(batch_size, seq_len, attn.num_heads, attn.head_dim).transpose(1, 2)
        
        if past_kv is None:
            # Prefill phase for entire prompt
            cos, sin = attn.rotary_emb(q, seq_len)
            q, k = apply_rotary_pos_emb(q, k, cos, sin)
            causal_mask = torch.triu(torch.full((seq_len, seq_len), float('-inf'), device=x.device), diagonal=1)
            scores = torch.matmul(q, k.transpose(-2, -1)) / (attn.head_dim ** 0.5)
            scores = scores + causal_mask.unsqueeze(0).unsqueeze(0)
            attn_weights = F.softmax(scores, dim=-1)
            attn_out = torch.matmul(attn_weights, v)
            k_cache, v_cache = k, v
        else:
            # Autoregressive generation phase
            prev_k, prev_v = past_kv[i]
            total_len = start_pos + seq_len
            cos_full, sin_full = attn.rotary_emb(q, total_len)
            cos = cos_full[:, :, start_pos:total_len, :]
            sin = sin_full[:, :, start_pos:total_len, :]
            
            q, k = apply_rotary_pos_emb(q, k, cos, sin)
            
            k_cache = torch.cat([prev_k, k], dim=2)
            v_cache = torch.cat([prev_v, v], dim=2)
            
            scores = torch.matmul(q, k_cache.transpose(-2, -1)) / (attn.head_dim ** 0.5)
            attn_weights = F.softmax(scores, dim=-1)
            attn_out = torch.matmul(attn_weights, v_cache)
            
        new_kv.append((k_cache, v_cache))
        attn_out = attn_out.transpose(1, 2).contiguous().view(batch_size, seq_len, attn.hidden_size)
        attn_out = attn.out_proj(attn_out)
        
        h = x + attn_out
        x = h + layer.mlp(layer.post_attention_layernorm(h))
        
    x = model.norm(x)
    logits = model.lm_head(x)
    return logits, new_kv


class Mathiyonv13Generator:
    def __init__(self, checkpoint_path: str = V1_3_CHECKPOINT, tokenizer_path: str = V1_3_TOKENIZER, device: str = "auto"):
        self.device = get_target_device(device)
        self.tokenizer = MathiyonTokenizer(vocab_path=tokenizer_path)
        self.config = MathiyonSLMv13Config()
        
        self.model = MathiyonSLMv13(self.config).to(self.device)
        if not os.path.exists(checkpoint_path):
            raise FileNotFoundError(f"v1.3 Checkpoint missing at {checkpoint_path}")
            
        payload = torch.load(checkpoint_path, map_location=self.device, weights_only=False)
        self.model.load_state_dict(payload["model_state"])
        self.model.eval()

    def generate(
        self,
        prompt: str,
        max_new_tokens: int = 64,
        temperature: float = 0.7,
        top_k: int = 40,
        deterministic: bool = False,
        use_kv_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Executes PyTorch v1.3 forward pass with optional KV-cache acceleration.
        """
        t0 = time.perf_counter()
        
        if not prompt or not prompt.strip():
            t1 = time.perf_counter()
            return {
                "response": "",
                "model": "mathiyon-slm-v1.3",
                "version": "1.3",
                "experimental": True,
                "use_kv_cache": use_kv_cache,
                "tokens_generated": 0,
                "generation_time_ms": round((t1 - t0) * 1000, 2)
            }

        # Format prompt according to v1.3 instruction template
        formatted_prompt = f"Instruction:\n{prompt.strip()}\nResponse:\n"
        token_ids = self.tokenizer.encode(formatted_prompt)

        # Strip trailing EOS if appended by tokenizer
        if token_ids and token_ids[-1] == self.tokenizer.eos_id:
            token_ids = token_ids[:-1]

        if not token_ids:
            token_ids = [self.tokenizer.bos_id]

        input_tensor = torch.tensor([token_ids], device=self.device)
        prompt_len = input_tensor.shape[1]

        # Context length protection
        max_allowed_new = min(max_new_tokens, self.config.context_length - prompt_len - 1)
        max_allowed_new = max(1, max_allowed_new)

        with torch.inference_mode():
            if use_kv_cache:
                # Production-Quality KV Cache Autoregressive Path
                logits, past_kv = forward_kv_cache(self.model, input_tensor)
                gen_tokens = []
                current_pos = prompt_len
                curr_input = input_tensor

                for _ in range(max_allowed_new):
                    if current_pos >= self.config.context_length:
                        break

                    if curr_input.shape[1] == prompt_len:
                        next_logits = logits[0, -1, :]
                    else:
                        next_logits, past_kv = forward_kv_cache(
                            self.model,
                            curr_input,
                            past_kv=past_kv,
                            start_pos=current_pos - 1
                        )
                        next_logits = next_logits[0, -1, :]

                    if deterministic or temperature <= 0.0:
                        next_token_id = torch.argmax(next_logits, dim=-1).item()
                    else:
                        scaled_logits = next_logits / max(temperature, 0.01)
                        top_k_val = min(top_k, scaled_logits.size(-1))
                        top_k_logits, top_k_indices = torch.topk(scaled_logits, top_k_val)
                        probs = F.softmax(top_k_logits, dim=-1)
                        idx_in_topk = torch.multinomial(probs, num_samples=1).item()
                        next_token_id = top_k_indices[idx_in_topk].item()

                    gen_tokens.append(next_token_id)
                    if next_token_id == self.tokenizer.eos_id:
                        break

                    curr_input = torch.tensor([[next_token_id]], device=self.device)
                    current_pos += 1

                response_text = self.tokenizer.decode(gen_tokens).strip()
                tokens_generated = len(gen_tokens)

            else:
                # Full-Prefix Recomputation Path
                curr_tensor = input_tensor
                for _ in range(max_allowed_new):
                    if curr_tensor.shape[1] >= self.config.context_length:
                        break
                    logits = self.model(curr_tensor)
                    next_logits = logits[0, -1, :]

                    if deterministic or temperature <= 0.0:
                        next_token_id = torch.argmax(next_logits, dim=-1).item()
                    else:
                        scaled_logits = next_logits / max(temperature, 0.01)
                        top_k_val = min(top_k, scaled_logits.size(-1))
                        top_k_logits, top_k_indices = torch.topk(scaled_logits, top_k_val)
                        probs = F.softmax(top_k_logits, dim=-1)
                        idx_in_topk = torch.multinomial(probs, num_samples=1).item()
                        next_token_id = top_k_indices[idx_in_topk].item()

                    curr_tensor = torch.cat([curr_tensor, torch.tensor([[next_token_id]], device=self.device)], dim=1)
                    if next_token_id == self.tokenizer.eos_id:
                        break

                new_token_ids = curr_tensor[0].tolist()[prompt_len:]
                response_text = self.tokenizer.decode(new_token_ids).strip()
                tokens_generated = len(new_token_ids)

        t1 = time.perf_counter()
        gen_time_ms = round((t1 - t0) * 1000, 2)

        return {
            "response": response_text,
            "model": "mathiyon-slm-v1.3",
            "version": "1.3",
            "experimental": True,
            "use_kv_cache": use_kv_cache,
            "tokens_generated": tokens_generated,
            "generation_time_ms": gen_time_ms
        }
