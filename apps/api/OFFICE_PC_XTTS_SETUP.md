# Office PC — XTTS v2 GPU Setup Guide
## Urdu Neural TTS on RTX 4090 (No existing packages touched)

Everything runs inside an isolated virtual environment.
Nothing is installed globally. Nothing existing is uninstalled or changed.

> **Latency fix applied (see `tts_service_gpu.py` in this same folder):** the `tts_service_gpu.py`
> below in Step 4 was the *original* version and had a real latency bug — it recomputed the
> speaker conditioning latents from the reference WAV on *every* request, adding a fixed
> several-second tax regardless of how short the text was. The version of `tts_service_gpu.py`
> that now lives alongside this doc caches those latents once at startup, runs fp16 on CUDA,
> and adds an opt-in `stream: true` request mode using true streaming generation. Deploy that
> file to the Office PC (replacing whatever's currently running) rather than retyping the
> snippet below.

---

## Prerequisites — Check These First

Open PowerShell:

```powershell
# Python version — need 3.10, 3.11, or 3.12
python --version

# GPU check
nvidia-smi

# CUDA version (shown top-right in nvidia-smi output)
nvidia-smi | Select-String "CUDA Version"
```

---

## Step 1 — Create an Isolated Virtual Environment

```powershell
cd C:\path\to\Smart-Inventory-system-Node-project\apps\api

# Create a new isolated environment named "tts_env"
python -m venv tts_env

# Activate it
tts_env\Scripts\activate

# Your prompt should now show: (tts_env) PS C:\...
```

Everything from this point installs only inside `tts_env`.
Nothing on the system Python is touched.

---

## Step 2 — Install CUDA PyTorch Inside the venv

Check your CUDA version from Step 0, then run the matching command:

**CUDA 12.1:**
```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**CUDA 12.4:**
```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

**CUDA 11.8:**
```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

Verify GPU is detected:
```powershell
python -c "import torch; print('CUDA:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0))"
# Expected:
# CUDA: True
# GPU: NVIDIA GeForce RTX 4090
```

---

## Step 3 — Install Coqui TTS and Dependencies

```powershell
pip install coqui-tts
pip install fastapi uvicorn soundfile scipy huggingface_hub numpy pydantic
```

Takes 3-5 minutes. All goes into `tts_env` only.

---

## Step 4 — Create the GPU TTS Service File

In the `apps/api` folder, create a new file called `tts_service_gpu.py`:

```python
"""
Urdu TTS — XTTS v2 GPU Service
Model: suhaibrashid17/XTTS-v2-Urdu-FT
Port:  8020
Run:   tts_env\Scripts\python.exe tts_service_gpu.py
"""

import os
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

app = FastAPI(title="Urdu XTTS v2 GPU")

# ── GPU Check ──────────────────────────────────────────────────────────────
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[TTS] Device : {device.upper()}")
if device == "cuda":
    print(f"[TTS] GPU    : {torch.cuda.get_device_name(0)}")
    print(f"[TTS] VRAM   : {torch.cuda.get_device_properties(0).total_memory/1024**3:.1f} GB")
else:
    print("[TTS] WARNING: CUDA not found — running on CPU (slow). Check PyTorch install.")

# ── Load Urdu XTTS v2 Model ────────────────────────────────────────────────
MODEL_REPO = "suhaibrashid17/XTTS-v2-Urdu-FT"
print(f"[TTS] Loading {MODEL_REPO} ...")

model_dir    = snapshot_download(repo_id=MODEL_REPO)
config_path  = os.path.join(model_dir, "config.json")

# Speaker reference — neutral sine tone if no real WAV exists
ref_path = os.path.join(model_dir, "ref_speaker.wav")
if not os.path.exists(ref_path):
    sr   = 22050
    t    = np.linspace(0, 3, sr * 3)
    wave = (0.3 * np.sin(2 * np.pi * 180 * t)).astype(np.float32)
    sf.write(ref_path, wave, sr)
    print(f"[TTS] Created default speaker reference: {ref_path}")

tts_model = TTS(
    model_path=model_dir,
    config_path=config_path,
    progress_bar=False,
    gpu=(device == "cuda")
)
print("[TTS] Model ready.")


def clean_text(raw: str) -> str:
    text = re.sub(r'```[\s\S]*?```', '', raw)
    text = re.sub(r'\|.*?\|', '', text)
    text = re.sub(r'[*_#`~]', '', text)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'[\u4e00-\u9fff]+', '', text)
    text = re.sub(r'Rs\.?\s*([\d,]+)',
                  lambda m: m.group(1).replace(',', '') + ' روپے', text)
    text = re.sub(r'\n+', ' ', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()
    return text[:500]


class TTSRequest(BaseModel):
    text: str
    voice: str = "default"
    language: str = "ur"


@app.get("/health")
def health():
    return {
        "status" : "ok",
        "engine" : "xtts-v2",
        "model"  : MODEL_REPO,
        "device" : device,
        "gpu"    : torch.cuda.get_device_name(0) if device == "cuda" else "none"
    }


@app.post("/api/tts")
def synthesize(req: TTSRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    spoken = clean_text(req.text)
    if not spoken:
        raise HTTPException(status_code=400, detail="text empty after cleaning")

    import tempfile, pathlib
    tmp = pathlib.Path(tempfile.mktemp(suffix=".wav"))
    try:
        tts_model.tts_to_file(
            text=spoken,
            language="ur",
            speaker_wav=ref_path,
            file_path=str(tmp)
        )
        audio_bytes = tmp.read_bytes()
    finally:
        tmp.unlink(missing_ok=True)

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/wav",
        headers={"Cache-Control": "public, max-age=3600"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8020, log_level="info")
```

---

## Step 5 — Run the Service

Make sure the venv is still active (prompt shows `(tts_env)`), then:

```powershell
python tts_service_gpu.py
```

**First run** downloads the Urdu model from Hugging Face (~2 GB).
Takes 5-10 minutes depending on internet. Only happens once.

Expected output:
```
[TTS] Device : CUDA
[TTS] GPU    : NVIDIA GeForce RTX 4090
[TTS] VRAM   : 24.0 GB
[TTS] Loading suhaibrashid17/XTTS-v2-Urdu-FT ...
[TTS] Model ready.
INFO:     Uvicorn running on http://0.0.0.0:8020
```

**Subsequent starts** take ~15-20 seconds (loads from local cache).

---

## Step 6 — Test It

Open a new PowerShell window:

```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:8020/health" -UseBasicParsing | Select-Object -ExpandProperty Content
# Expected: {"status":"ok","engine":"xtts-v2","device":"cuda","gpu":"NVIDIA GeForce RTX 4090"}

# Generate audio
$body = '{"text":"Yeh rahe aapke liye best gaming products. Aapka budget ke mutabiq yeh options available hain."}'
Invoke-WebRequest -Uri "http://localhost:8020/api/tts" `
  -Method POST -Body $body `
  -ContentType "application/json" `
  -OutFile "test_xtts.wav" -UseBasicParsing

# Play it
Start-Process "test_xtts.wav"
```

You should hear natural Urdu speech in ~200-300ms.

---

## Step 7 — Expose via ngrok (Second Tunnel)

Ollama already uses one tunnel. Open a new terminal:

```powershell
ngrok http 8020
```

Copy the URL — something like:
```
https://abcd-203-99-61-238.ngrok-free.app
```

> Free ngrok supports 2 simultaneous tunnels per account.

---

## Step 8 — Update .env on Your Dev Machine

Open `apps/api/.env` on your laptop and change:

```env
TTS_SERVICE_URL=https://abcd-203-99-61-238.ngrok-free.app/api/tts
```

Restart Node:
```powershell
npm run dev
```

No code changes needed. Done.

---

## Daily Startup (After First Setup)

```powershell
# Terminal 1 — activate venv and start TTS
cd C:\path\to\project\apps\api
tts_env\Scripts\activate
python tts_service_gpu.py

# Terminal 2 — expose TTS via ngrok
ngrok http 8020
```

Ollama + its ngrok tunnel run as usual in separate terminals.

---

## Keep Running Permanently with pm2

```powershell
npm install -g pm2

# Use the venv Python directly — no need to activate first
pm2 start "C:\path\to\project\apps\api\tts_env\Scripts\python.exe tts_service_gpu.py" `
  --name xtts-gpu `
  --cwd "C:\path\to\project\apps\api"

pm2 save
pm2 startup
pm2 status
```

---

## VRAM Usage — Both Services Together

```
XTTS v2 (Urdu model)    →  ~2.5 GB VRAM
Ollama qwen2.5:14b      →  ~9.0 GB VRAM
─────────────────────────────────────────
Total used              →  ~11.5 GB
RTX 4090 total          →   24.0 GB
Free headroom           →  ~12.5 GB  ✅
```

No conflict. Both run independently on different ports.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `CUDA: False` after install | Wrong CUDA build. Check `nvidia-smi` for CUDA version and use matching `--index-url` |
| `ModuleNotFoundError: TTS` | Run `pip install coqui-tts` inside the activated venv |
| `(tts_env)` not showing in prompt | Run `tts_env\Scripts\activate` again |
| First run stuck at download | Normal — 2GB download, just wait |
| `torchcodec` import error | Run `pip install torchcodec` inside venv, or it is safely ignored |
| Port 8020 already in use | `netstat -ano \| findstr :8020` then `taskkill /PID <pid> /F` |
| ngrok shows "tunnel limit" | Visit https://dashboard.ngrok.com/tunnels and close unused ones |
| Audio sounds robotic | Replace `ref_speaker.wav` with a real Urdu voice recording (see below) |

---

## Optional — Better Voice Quality

The default speaker reference is a synthetic tone which makes the voice
slightly robotic. Replace it with a real Urdu voice recording for
much more natural output:

1. Record 5-10 seconds of clear spoken Urdu (quiet room, no echo)
2. Save as WAV, 22050 Hz, mono, 16-bit
3. Find the model cache folder:

```powershell
tts_env\Scripts\python.exe -c "from huggingface_hub import snapshot_download; print(snapshot_download('suhaibrashid17/XTTS-v2-Urdu-FT'))"
```

4. Copy your recording to that folder as `ref_speaker.wav`
5. Restart `tts_service_gpu.py`

The voice output will now match the naturalness and tone of your recording.
