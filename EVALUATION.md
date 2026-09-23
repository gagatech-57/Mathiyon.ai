# Mathiyon AI — Model & Platform Evaluation Benchmarks (Phase 9 & 10)

Mathiyon AI maintains automated evaluation suites to benchmark model accuracy, latency, and tool execution quality.

---

## 📊 Benchmark Results

| Domain / Test Suite | Executed Test Script | Tests Passed | Accuracy | Latency Range | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Master Platform Suite** | `scratch/test_master_platform_e2e.cjs` | 10 / 10 | 100% | 15ms - 180ms | `VERIFIED` |
| **Math Engine Solver** | `scratch/test_math_engine_e2e.cjs` | All 21 Domains | 100% Exact Match | 5ms - 25ms | `VERIFIED` |
| **PDF Extraction** | `scratch/test_pdf_extraction.cjs` | 5 / 5 Assertions | 100% | 1.2s | `VERIFIED` |
| **RAG Security & Chat** | `scratch/test_rag_chat.cjs` | 7 / 7 Cases | 100% | 40ms - 120ms | `VERIFIED` |
| **Vite Production Build** | `npm run build` | 0 Errors | 100% | 3.4s | `VERIFIED` |

---

## 🚦 Integration Boundaries Status

- **Text SLM v1.2**: `VERIFIED`
- **SymPy Math Engine**: `VERIFIED`
- **Vector RAG**: `VERIFIED`
- **Memory Service**: `VERIFIED`
- **Web Search Tool**: `VERIFIED`
- **Vision OCR Engine**: `READY FOR PROVIDER` (`NOT CONFIGURED`)
- **Voice STT/TTS Engine**: `READY FOR PROVIDER` (`NOT CONFIGURED`)
