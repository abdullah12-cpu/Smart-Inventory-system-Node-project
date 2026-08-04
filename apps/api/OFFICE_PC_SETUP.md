# Office PC Setup Guide
## Smart Inventory System — LLM + TTS Services on RTX 4090

This guide sets up both services that the Node.js API depends on:
- **Ollama** (already running) — LLM for chatbot responses
- **TTS Service** (new) — Urdu voice synthesis

---

## Prerequisites (check these first)

Open PowerShell and verify:

```powershell
# Check Python version (need 3.10, 3.11, or 3.12)
python --version

# Check NVIDIA driver
nvidia-smi

# Check ngrok is installed
ngrok version

# Check if Ollama is already running
curl http://localhost:11434/api/tags
```

---

## Part 1 — Ollama (Already Running — Just Verify)

If Ollama is already running and exposed via ngrok, skip to Part 2.

To verify it is running:
```powershell
# Should return a list of installed models
curl http://localhost:11434/api/tags

# Confirm qwen2.5:14b is installed
ollama list
```

If the model is missing:
```powershell
ollama pull qwen2.5:14b
```

To expose Ollama via ngrok (if not already):
```powershell
ngrok http 11434
# Copy the https URL e.g. https://f17c-203-99-61-238.ngrok-free.app
# Set this as OLLAMA_URL in apps/api/.env on your dev machine
```

---

## Part 2 — Urdu TTS Service (New Setup)

### Step 1 — Install Python dependencies

```powershell
pip install edge-tts fastapi uvicorn pydantic
```

That is all. edge-tts does NOT need a GPU — it streams audio from
Microsoft's servers. The install takes under 30 seconds.

### Step 2 — Clone or copy the project (if not already on office PC)

If the project is already on the office PC, skip this.

```powershell
git clone https://github.com/abdullah12-cpu/Smart-Inventory-system-Node-project.git
cd Smart-Inventory-system-Node-project
```

### Step 3 — Run the TTS service

```powershell
cd apps/api
python tts_service.py
```

You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8020
```

### Step 4 — Test it is working

Open a new PowerShell window:
```powershell
# Health check
curl http://localhost:8020/health
# Expected: {"status":"ok","engine":"edge-tts","default_voice":"ur-PK-UzmaNeural"}

# Test actual audio generation
$body = '{"text":"Yeh rahe aapke liye best products","voice":"ur-PK-UzmaNeural"}'
Invoke-WebRequest -Uri "http://localhost:8020/api/tts" -Method POST `
  -Body $body -ContentType "application/json" `
  -OutFile "test_audio.mp3"
# Open test_audio.mp3 and you should hear clear Urdu speech
Start-Process test_audio.mp3
```

### Step 5 — Expose via ngrok (second tunnel)

Ollama is already using one ngrok tunnel. Open a new terminal for the TTS tunnel:

```powershell
ngrok http 8020
```

You will get a URL like:
```
https://abcd-203-99-61-238.ngrok-free.app
```

> Note: Free ngrok allows 2 simultaneous tunnels on one account.
> If you hit the limit, sign in to ngrok dashboard and check your tunnel count.

### Step 6 — Update .env on your dev machine

On your laptop/dev machine, open `apps/api/.env` and update:

```env
TTS_SERVICE_URL=https://abcd-203-99-61-238.ngrok-free.app/api/tts
```

Restart the Node server after this change:
```powershell
npm run dev
```

---

## Part 3 — Keep Both Services Running (Production)

### Option A — Two separate PowerShell windows (simple)

Window 1:
```powershell
ollama serve
```

Window 2:
```powershell
cd path\to\project\apps\api
python tts_service.py
```

Window 3:
```powershell
ngrok http 11434
```

Window 4:
```powershell
ngrok http 8020
```

### Option B — Use pm2 to auto-manage (recommended)

```powershell
# Install pm2 once
npm install -g pm2

# Start TTS service
pm2 start "python tts_service.py" --name urdu-tts --cwd "C:\path\to\project\apps\api"

# Start Ollama (if not running as a Windows service)
pm2 start "ollama serve" --name ollama

# Save process list so they restart on reboot
pm2 save

# Set pm2 to start on Windows boot
pm2 startup
# Follow the instruction it prints

# Check status
pm2 status
pm2 logs urdu-tts
```

---

## Architecture Overview

```
Office PC (RTX 4090)
│
├── Port 11434  →  Ollama (qwen2.5:14b)
│                  VRAM usage: ~9 GB
│                  ngrok tunnel → OLLAMA_URL in .env
│
└── Port 8020   →  TTS Service (edge-tts)
                   VRAM usage: 0 GB (network-based, no GPU needed)
                   ngrok tunnel → TTS_SERVICE_URL in .env

Dev Machine (your laptop)
└── Node.js API
    ├── /api/copilot/*/chat  →  calls OLLAMA_URL for LLM
    └── /api/copilot/tts     →  calls TTS_SERVICE_URL for audio
```

---

## Upgrade Path — XTTS v2 GPU (Higher Quality, Future)

When you want native GPU-accelerated Urdu TTS (better quality, fully offline):

```powershell
# Install CUDA PyTorch (one time, large download ~2GB)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install Coqui TTS
pip install TTS soundfile scipy huggingface_hub numpy

# Run the GPU TTS service (downloads Urdu model ~2GB on first run)
python tts_service_gpu.py
```

Then expose port 8020 via ngrok exactly the same way.
No other changes needed — same TTS_SERVICE_URL env variable.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `edge-tts` not found | `pip install edge-tts` |
| Port 8020 already in use | `netstat -ano \| findstr :8020` then `taskkill /PID <pid> /F` |
| ngrok tunnel limit reached | Go to ngrok dashboard and close unused tunnels |
| TTS returns no audio | Check internet connection — edge-tts calls Microsoft servers |
| Audio is silent / 0 bytes | Ensure the text is not empty after cleaning |
| OLLAMA_URL not responding | Restart ngrok tunnel, update URL in .env |

---

## Quick Reference — Daily Startup

```powershell
# 1. Start TTS service
cd C:\path\to\project\apps\api
python tts_service.py

# 2. Expose TTS via ngrok (new terminal)
ngrok http 8020

# 3. Copy the ngrok URL and update .env on dev machine if it changed
#    TTS_SERVICE_URL=https://NEW-URL.ngrok-free.app/api/tts
```

Ollama + its ngrok tunnel should already be running from your normal workflow.
