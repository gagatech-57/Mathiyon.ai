# 🚀 MATHIYON AI — STARTUP GUIDE

## 📦 ONE-TIME SETUP

### Install Python Dependencies
```bash
cd "C:\DISK-D\Personal folder\Mathiyon\ai-service"
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install fastapi uvicorn pydantic sympy
```

### Install Node.js Dependencies
```bash
# Frontend dependencies
cd "C:\DISK-D\Personal folder\Mathiyon"
npm install

# Backend dependencies
cd "C:\DISK-D\Personal folder\Mathiyon\server"
npm install
```

---

## 🚀 STARTING THE FULL STACK

### Terminal 1: Python AI Service (Port 8000)
```bash
cd "C:\DISK-D\Personal folder\Mathiyon\ai-service"
python app.py
```

**Expected Output**:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Health Check**:
```bash
curl http://127.0.0.1:8000/health
```

---

### Terminal 2: Express Backend (Port 5000)
```bash
cd "C:\DISK-D\Personal folder\Mathiyon\server"
npm start
```

**Expected Output**:
```
Mathiyon Express Server running on http://localhost:5000
MongoDB: Connected / Fallback Memory Mode
Python AI Service: Connected at http://127.0.0.1:8000
```

---

### Terminal 3: React Frontend (Port 8645)
```bash
cd "C:\DISK-D\Personal folder\Mathiyon"
npm run dev
```

**Expected Output**:
```
VITE v8.3.0  ready in 450 ms

➜  Local:   http://localhost:8645/
➜  Network: http://192.168.x.x:8645/
➜  press h + enter to show help
```

---

## 🌐 ACCESS THE APPLICATION

**Open in Browser**: http://localhost:8645

---

## ✅ QUICK TEST CHECKLIST

Once all services are running, test these in the browser:

### Math Tests
- [ ] `2+3` → Should show "Thinking..." then "Result: 5"
- [ ] `9+2` → "Result: 11"
- [ ] `2/4` → "Result: 0.5"
- [ ] `2x+5=15` → "Result: x = 5"

### General Questions
- [ ] `What is HTML?` → Should show HTML explanation with typing animation
- [ ] `What time is it?` → Real system time

### Animations
- [ ] ThinkingIndicator appears during backend processing
- [ ] TypingResponse animates the assistant message
- [ ] No duplicate assistant bubbles
- [ ] No internal metadata shown (no "SymPy", "Math Engine", etc.)

---

## 🔧 TROUBLESHOOTING

### Port Already in Use
```bash
# Check if port is occupied
netstat -ano | findstr :8645
netstat -ano | findstr :5000
netstat -ano | findstr :8000

# Kill process if needed (replace PID)
taskkill /PID <PID> /F
```

### Python Service Not Responding
```bash
# Verify Python dependencies
cd ai-service
python -c "import torch, fastapi, sympy; print('All dependencies OK')"

# Check for errors in terminal
```

### Frontend Can't Connect to Backend
- Verify Express is running on port 5000
- Check browser console for errors
- Ensure CORS is enabled in Express

### MongoDB Connection Issues
- Backend works in memory fallback mode without MongoDB
- Messages persist across refreshes in fallback mode
- For persistent storage, configure `MONGO_URI` in `server/.env`

---

## 📁 SERVICE PORTS

| Service | Port | URL |
|---------|------|-----|
| **React Frontend** | 8645 | http://localhost:8645 |
| **Express Backend** | 5000 | http://localhost:5000 |
| **Python AI Service** | 8000 | http://127.0.0.1:8000 |

---

## 🛑 STOPPING THE SERVICES

Press `CTRL+C` in each terminal to stop the respective service.

---

## 🎉 YOU'RE ALL SET!

Your Mathiyon AI platform is ready with:
- ✅ Clean math results (no "11 ≈ 11" duplicates)
- ✅ Thinking animation during processing
- ✅ Typing animation for responses
- ✅ No internal metadata shown to users
- ✅ Production-ready configuration
