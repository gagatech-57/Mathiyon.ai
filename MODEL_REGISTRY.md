# Mathiyon AI — Model Version Registry (Phase 9)

Mathiyon AI uses a versioned neural model architecture managed by Python FastAPI (`app.py`).

---

## 🤖 Registered Models

- **Active Model**: `mathiyon-slm-v1.2` (PyTorch Causal SLM, 1.2M parameters)
- **Available Models**:
  - `mathiyon-slm-v1.1`
  - `mathiyon-slm-v1.2`
  - `mathiyon-slm-v1.3` (Upcoming)
  - `mathiyon-slm-v2.0` (Planned)

---

## ⚡ PyTorch Device Auto-Detection

- `AI_DEVICE=auto`: Automatically detects CUDA GPU hardware availability (`torch.cuda.is_available()`) with fallback to CPU.

---

## 📡 Endpoint

- `GET /models`: Returns active model, available models list, device, and CUDA status.
