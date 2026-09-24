"""
Mathiyon SLM v1.3 Experimental Neural Generator Module
Performs isolated PyTorch autoregressive forward passes for SLM v1.3 pretrained + instruction-tuned checkpoint.
"""
import os
import sys
import time
import torch
import torch.nn.functional as F
from typing import Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from tokenizer.bpe_tokenizer import MathiyonTokenizer
from models.v1_3.config import MathiyonSLMv13Config
from models.v1_3.model import MathiyonSLMv13, get_target_device

V1_3_CHECKPOINT = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "instruction_tuning", "best_instruction.pt")
V1_3_TOKENIZER = os.path.join(BASE_DIR, "checkpoints", "mathiyon-slm-v1.3", "latest", "tokenizer_v1.3.json")


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
        deterministic: bool = False
    ) -> Dict[str, Any]:
        """
        Executes real PyTorch v1.3 forward pass and returns generated text and latency.
        """
        t0 = time.perf_counter()
        
        if not prompt or not prompt.strip():
            t1 = time.perf_counter()
            return {
                "response": "",
                "model": "mathiyon-slm-v1.3",
                "version": "1.3",
                "experimental": True,
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

        with torch.no_grad():
            for _ in range(max_allowed_new):
                if input_tensor.shape[1] >= self.config.context_length:
                    break
                logits = self.model(input_tensor)
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

                input_tensor = torch.cat([input_tensor, torch.tensor([[next_token_id]], device=self.device)], dim=1)
                
                # EOS handling: break loop immediately
                if next_token_id == self.tokenizer.eos_id:
                    break

        t1 = time.perf_counter()
        gen_time_ms = round((t1 - t0) * 1000, 2)

        gen_ids = input_tensor[0].tolist()
        new_token_ids = gen_ids[prompt_len:]
        
        response_text = self.tokenizer.decode(new_token_ids).strip()

        return {
            "response": response_text,
            "model": "mathiyon-slm-v1.3",
            "version": "1.3",
            "experimental": True,
            "tokens_generated": len(new_token_ids),
            "generation_time_ms": gen_time_ms
        }
