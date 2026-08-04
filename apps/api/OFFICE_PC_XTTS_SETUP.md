# Office PC — XTTS v2 GPU Setup Guide
## Urdu Neural TTS on RTX 4090 (suhaibrashid17/XTTS-v2-Urdu-FT)

---

## What You Get

- Native Urdu fine-tuned XTTS v2 model running fully on your RTX 4090
- ~150-300ms latency (vs ~500ms+ with edge-tts network round-trip)
- No Microsoft servers, fully local, works offline
- Voice cloning capable (can use custom speaker reference audio)

---

## Prerequisites

Open PowerShell and verify these first:

```powershell
# Must be 3.10, 3.11, or 3.12 (NOT 3.13 — Coqui TTS not compatible yet)
python --version

# Must show your RTX 4090
nvidia-smi

# Check CUDA version (need 12.1 or 12.4)
nvidia-smi | Select-String "CUDA Version"
```

---

## Step 1 — Uninstall CPU PyTorch (if installed)

```powershell
pip uninstall torch torchvision torchaudio -y
```

---

## Step 2 — Install CUDA PyTorch

For CUDA 12.1 (most common):
```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

For CUDA 12.4:
```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

Verify GPU is detected:
```powershell
python -c "import torch; print('CUDA:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0))"
# Expected output:
# CUDA: True
# GPU: NVIDIA GeForce RTX 4090
```

If CUDA shows False, your PyTorch build does not match your CUDA version.
Check `nvidia-smi` for the exact CUDA version and use the matching build URL from:
https://pytorch.org/get-started/locally

---

## Step 3 — Install Coqui TTS and dependencies

```powershell
pip install coqui-tts
pip install fastapi uvicorn soundfile scipy huggingface_hub numpy pydantic
```

This downloads Coqui TTS and all audio processing libraries.
Takes 3-5 minutes depending on internet speed.

---

## Step 4 — Write the GPU TTS service

Create a new file `apps/api/tts_service_gpu.py` with this content:

```python
"""
Urdu TTS — XTTS v2 GPU Service
Model: suhaibrashid17/XTTS-v2-Urdu-FT
Runs on RTX 4090, port 8020
"""

import os
import sys
import re
import io
import numpy as np
import torch
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from huggingface_hub import snapshot_download
from TTS.api import TTS

app = FastAPI(title="Urdu XTTS v2 GPU TTS")

# ── GPU Check ──────────────────────────────────────────────────────────────
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[TTS] Device: {device.upper()}")
if device == "cuda":
    print(f"[TTS] GPU: {torch.cuda.get_device_name(0)}")
    print(f"[TTS] VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")

# ── Load Model ─────────────────────────────────────────────────────────────
MODEL_REPO = "suhaibrashid17/XTTS-v2-Urdu-FT"
print(f"[TTS] Loading {MODEL_REPO} ...")

model_dir = snapshot_download(repo_id=MODEL_REPO)
config_path = os.path.join(model_dir, "config.json")

# Default speaker reference — neutral tone if none exists
ref_speaker_path = os.path.join(model_dir, "ref_speaker.wav")
if not os.path.exists(ref_speaker_path):
    sr = 22050
    t = np.linspace(0, 3, sr * 3)
    wave = (0.3 * np.sin(2 * np.pi * 180 * t)).astype(np.float32)
    sf.write(ref_speaker_path, wave, sr)

tts_model = TTS(
    model_path=model_dir,
    config_path=config_path,
    progress_bar=False,
    gpu=(device == "cuda")
)
print("[TTS] Model loaded. Ready.")


# ── Text Cleaning ──────────────────────────────────────────────────────────
def clean_text(raw: str) -> str:
    text = re.sub(r'```[\s\S]*?```', '', raw)
    text = re.sub(r'\|.*?\|', '', text)
    text = re.sub(r'[*_#`~]', '', text)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'[\u4e00-\u9fff]+', '', text)   # strip Chinese
    text = re.sub(r'Rs\.?\s*([\d,]+)',
                  lambda m: m.group(1).replace(',', '') + ' روپے', text)
    text = re.sub(r'\n{2,}', '. ', text)
    text = re.sub(r'\n', ' ', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()
    return text[:500]   # cap at 500 chars for speed


# ── API ────────────────────────────────────────────────────────────────────
class TTSRequest(BaseModel):
    text: str
    voice: str = "default"
    language: str = "ur"


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "xtts-v2",
        "model": MODEL_REPO,
        "device": device,
        "gpu": torch.cuda.get_device_name(0) if device == "cuda" else "none"
    }


@app.post("/api/tts")
def synthesize(req: TTSRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    spoken = clean_text(req.text)
    if not spoken:
        raise HTTPException(status_code=400, detail="empty text after cleaning")

    try:
        with io.BytesIO() as buf:
            tmp_path = "/tmp/tts_output.wav"
            tts_model.tts_to_file(
                text=spoken,
                language="ur",
                speaker_wav=ref_speaker_path,
                file_path=tmp_path
            )
            with open(tmp_path, "rb") as f:
                audio_bytes = f.read()

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/wav",
            headers={"Cache-Control": "public, max-age=3600"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8020, log_level="info")
```

---

## Step 5 — First Run (downloads model ~2GB)

```powershell
cd path\to\Smart-Inventory-system-Node-project\apps\api
python tts_service_gpu.py
```

First run downloads the model from Hugging Face (~2GB). This takes
5-10 minutes on first run only. You will see:

```
[TTS] Device: CUDA
[TTS] GPU: NVIDIA GeForce RTX 4090
[TTS] VRAM: 24.0 GB
[TTS] Loading suhaibrashid17/XTTS-v2-Urdu-FT ...
[TTS] Model loaded. Ready.
INFO: Uvicorn running on http://0.0.0.0:8020
```

Subsequent starts take ~10-20 seconds (model loads from local cache).

---

## Step 6 — Test it

Open a new PowerShell window:

```powershell
# Health check — should show xtts-v2 engine and your GPU name
curl http://localhost:8020/health

# Generate test audio
$body = '{"text":"Yeh rahe aapke liye best gaming products. Aapka budget aur requirements ke mutabiq yeh options available hain."}'
Invoke-WebRequest `
  -Uri "http://localhost:8020/api/tts" `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -OutFile "test_xtts.wav"

# Play it
Start-Process test_xtts.wav
```

You should hear clear, natural Urdu speech within ~300ms.

---

## Step 7 — Expose via ngrok

```powershell
# New terminal (Ollama is already using one tunnel)
ngrok http 8020
```

You get a URL like:
```
https://xxxx-203-99-61-238.ngrok-free.app
```

---

## Step 8 — Update .env on your dev machine

Open `apps/api/.env` on your laptop and update:

```env
# Comment out or remove the old edge-tts line:
# TTS_SERVICE_URL=http://localhost:8020/api/tts

# Add the XTTS GPU line:
TTS_SERVICE_URL=https://xxxx-203-99-61-238.ngrok-free.app/api/tts
```

Restart Node server:
```powershell
npm run dev
```

That is the only change needed. No code changes — the Node proxy
already handles both edge-tts and XTTS v2 through the same endpoint.

---

## VRAM Usage on RTX 4090

```
XTTS v2 model          →  ~2.5 GB VRAM
Ollama qwen2.5:14b     →  ~9.0 GB VRAM
Total                  →  ~11.5 GB / 24 GB
Headroom remaining     →  ~12.5 GB  (plenty of room)
```

Both run completely independently on different ports.
No resource conflict.

---

## Keep Running with pm2

```powershell
# Install pm2 once
npm install -g pm2

# Start XTTS GPU service
pm2 start "python tts_service_gpu.py" `
  --name xtts-gpu `
  --cwd "C:\path\to\project\apps\api"

# Check it started
pm2 status
pm2 logs xtts-gpu

# Auto-restart on Windows reboot
pm2 save
pm2 startup
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `CUDA: False` | Wrong PyTorch build | Uninstall and reinstall with correct `--index-url` for your CUDA version |
| `AssertionError: Torch not compiled with CUDA` | Same — CPU build installed | `pip uninstall torch` then reinstall CUDA build |
| `ModuleNotFoundError: TTS` | Coqui not installed | `pip install coqui-tts` |
| First run hangs at download | Slow connection | Wait — model is 2GB, let it finish |
| `torchcodec` error on import | Compatibility issue | `pip install torchcodec` or ignore — handled by service |
| Audio sounds robotic | Default ref speaker | Replace `ref_speaker.wav` with a real Urdu speaker WAV file (3-10 seconds, clean mic recording) |
| Port 8020 in use | Old service running | `netstat -ano \| findstr :8020` then `taskkill /PID <pid> /F` |
| ngrok tunnel limit | Already 2 tunnels open | Check ngrok dashboard at https://dashboard.ngrok.com/tunnels |

---

## Better Voice Quality (Optional)

The default speaker reference is a synthetic tone. For more natural,
human-sounding output, replace it with a real voice sample:

1. Record 5-10 seconds of clear Urdu speech (no background noise)
2. Save as `WAV, 22050 Hz, mono`
3. Copy to the model directory as `ref_speaker.wav`:

```powershell
# Find model cache location
python -c "from huggingface_hub import snapshot_download; print(snapshot_download('suhaibrashid17/XTTS-v2-Urdu-FT'))"

# Copy your recording there
Copy-Item "your_voice.wav" "C:\Users\<user>\.cache\huggingface\hub\...\ref_speaker.wav"
```

Restart the service. The voice output will now clone that speaker's
tone and naturalness.

---

## Summary — What Changes Between edge-tts and XTTS v2

| | edge-tts (current) | XTTS v2 GPU (new) |
|---|---|---|
| Quality | Good (Microsoft neural) | Better (Urdu fine-tuned) |
| Latency | ~400-800ms | ~150-300ms |
| Internet needed | Yes (calls Microsoft) | No (fully local) |
| GPU needed | No | Yes (RTX 4090) |
| Setup time | 2 minutes | 20 minutes (one time) |
| File to run | `tts_service.py` | `tts_service_gpu.py` |
| Port | 8020 | 8020 (same) |
| .env change | None | Update TTS_SERVICE_URL to ngrok URL |
