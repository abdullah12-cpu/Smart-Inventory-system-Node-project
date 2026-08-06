"""
Urdu TTS -- XTTS v2 GPU Service (optimized: cached conditioning latents + fp16 + true streaming)
Model: suhaibrashid17/XTTS-v2-Urdu-FT
Port:  8020
Run:   tts_env\\Scripts\\python.exe tts_service_gpu.py

Deploy on the Office PC (replaces the version built from OFFICE_PC_XTTS_SETUP.md):
  1. Copy this file over the existing tts_service_gpu.py in apps/api on the Office PC.
  2. Stop the currently running service (Ctrl+C, or `pm2 restart xtts-gpu` if using pm2).
  3. Start it again: tts_env\\Scripts\\python.exe tts_service_gpu.py
  4. Watch the startup log for "[TTS] Conditioning latents cached." before sending traffic.

What changed vs. the original setup-doc version, and why:

1. CONDITIONING LATENT CACHING (the big one). The original called
   `tts_model.tts_to_file(..., speaker_wav=ref_path, ...)` on every single request. That
   high-level convenience call recomputes `get_conditioning_latents()` from the reference
   WAV file EVERY time it runs -- a fixed cost of ~1-3+ seconds that has nothing to do with
   how long the requested text is (a diagnostic round-trip test confirmed this: a ~40-char
   Urdu phrase still took 4.2s to first byte, which only makes sense if most of that time
   is a fixed per-request tax rather than proportional generation work). This version
   switches to the lower-level Xtts API, computes `get_conditioning_latents()` ONCE per
   voice file at startup, and reuses the cached tensors for every request.

2. FP16 (half precision). Enabled automatically when running on CUDA. Real speedup on an
   RTX 4090's tensor cores for negligible quality cost. Falls back to fp32 automatically if
   anything about the environment doesn't support it cleanly -- see USE_FP16 below.

3. TRUE STREAMING GENERATION. Added an optional `stream: true` request field that uses
   `model.inference_stream(...)` instead of the blocking `model.inference(...)`, yielding
   audio chunks as they're generated rather than waiting for the entire utterance to finish
   before sending anything. The non-streaming path is left in place and still gets the full
   benefit of the cached conditioning latents from #1 -- streaming is opt-in per request.

Compatibility: accepts the same `voice`, `max_chars`, `temperature`, `top_p`, `speed`
fields the Node proxy (apps/api/copilot.js) already sends, so it's a drop-in replacement
regardless of which of those the currently deployed script actually reads.
"""

import os
import re
import io
import struct
import numpy as np
import torch
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from huggingface_hub import snapshot_download
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts

app = FastAPI(title="Urdu XTTS v2 GPU")

# ── GPU Check ──────────────────────────────────────────────────────────────
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[TTS] Device : {device.upper()}")
if device == "cuda":
    print(f"[TTS] GPU    : {torch.cuda.get_device_name(0)}")
    print(f"[TTS] VRAM   : {torch.cuda.get_device_properties(0).total_memory/1024**3:.1f} GB")
else:
    print("[TTS] WARNING: CUDA not found -- running on CPU (slow). Check PyTorch install.")

USE_FP16 = device == "cuda"

# ── Load Urdu XTTS v2 Model via the raw Xtts API (needed for cached conditioning
#    latents and streaming inference -- the high-level TTS.api.TTS wrapper used in the
#    original setup doc doesn't expose either). ─────────────────────────────────────
MODEL_REPO = "suhaibrashid17/XTTS-v2-Urdu-FT"
print(f"[TTS] Loading {MODEL_REPO} ...")

model_dir = snapshot_download(repo_id=MODEL_REPO)
config_path = os.path.join(model_dir, "config.json")

# Speaker reference -- neutral sine tone if no real WAV exists (same fallback behavior
# as the original script). Real deployments should have replaced this with an actual
# recorded voice per "Optional -- Better Voice Quality" in the setup doc.
ref_path = os.path.join(model_dir, "ref_speaker.wav")
if not os.path.exists(ref_path):
    sr = 22050
    t = np.linspace(0, 3, sr * 3)
    wave = (0.3 * np.sin(2 * np.pi * 180 * t)).astype(np.float32)
    sf.write(ref_path, wave, sr)
    print(f"[TTS] Created default speaker reference: {ref_path}")

config = XttsConfig()
config.load_json(config_path)
xtts_model = Xtts.init_from_config(config)
xtts_model.load_checkpoint(config, checkpoint_dir=model_dir, use_deepspeed=False)

if device == "cuda":
    xtts_model.cuda()
    if USE_FP16:
        try:
            xtts_model.half()
            print("[TTS] Running in fp16 (half precision) for faster GPU inference.")
        except Exception as e:
            USE_FP16 = False
            print(f"[TTS] fp16 conversion failed ({e}); continuing in fp32.")

OUTPUT_SAMPLE_RATE = int(getattr(getattr(config, "audio", None), "output_sample_rate", 24000) or 24000)
print(f"[TTS] Output sample rate: {OUTPUT_SAMPLE_RATE} Hz")
print("[TTS] Model ready.")

# ── Cache speaker conditioning latents ONCE per reference voice file. This was the
# fixed per-request cost identified above -- computing it here at startup (and lazily
# for any other voice files referenced later) means every /api/tts call reuses the
# cached tensors instead of recomputing them from the reference WAV each time. ──────
_cond_cache = {}


def get_cached_conditioning(speaker_wav_path: str):
    if speaker_wav_path not in _cond_cache:
        print(f"[TTS] Computing conditioning latents for: {speaker_wav_path}")
        gpt_cond_latent, speaker_embedding = xtts_model.get_conditioning_latents(
            audio_path=[speaker_wav_path]
        )
        if USE_FP16:
            gpt_cond_latent = gpt_cond_latent.half()
            speaker_embedding = speaker_embedding.half()
        _cond_cache[speaker_wav_path] = (gpt_cond_latent, speaker_embedding)
    return _cond_cache[speaker_wav_path]


get_cached_conditioning(ref_path)
print("[TTS] Conditioning latents cached. Model warm and ready.")


def resolve_speaker_wav(voice: str) -> str:
    """
    The Node proxy sends a `voice` field (e.g. "demo-urdu-male.wav"). If a matching file
    exists alongside the model (or in this script's directory), use and cache it;
    otherwise fall back to the default reference voice so requests never fail outright
    just because a named voice file isn't present on this machine.
    """
    if not voice or voice in ("default", "ur-PK-UzmaNeural", "ur-PK-AsadNeural"):
        return ref_path
    candidates = [
        os.path.join(model_dir, voice),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), voice),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return ref_path


def clean_text(raw: str, max_chars: int = 500) -> str:
    text = re.sub(r'```[\s\S]*?```', '', raw)
    text = re.sub(r'\|.*?\|', '', text)
    text = re.sub(r'[*_#`~]', '', text)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'[一-鿿]+', '', text)
    text = re.sub(r'Rs\.?\s*([\d,]+)',
                  lambda m: m.group(1).replace(',', '') + ' روپے', text)
    text = re.sub(r'\n+', ' ', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()
    return text[:max_chars]


class TTSRequest(BaseModel):
    text: str
    voice: str = "default"
    language: str = "ur"
    max_chars: int = 500
    temperature: float = 0.1
    top_p: float = 0.3
    speed: float = 1.0
    stream: bool = False


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "xtts-v2",
        "model": MODEL_REPO,
        "device": device,
        "fp16": USE_FP16,
        "gpu": torch.cuda.get_device_name(0) if device == "cuda" else "none",
        "cached_voices": list(_cond_cache.keys()),
    }


def _pcm_to_wav_bytes(pcm_float32: np.ndarray, sample_rate: int) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, pcm_float32, sample_rate, format="WAV", subtype="PCM_16")
    return buf.getvalue()


def _streaming_wav_header(sample_rate: int, channels: int = 1, bits: int = 16) -> bytes:
    """
    A WAV header with an oversized placeholder data-length field -- the standard trick
    for HTTP-streamed WAV, since the true length isn't known until generation finishes.
    Browsers and media players read streamed WAV by consuming bytes as they arrive
    rather than strictly trusting the header's declared size.
    """
    byte_rate = sample_rate * channels * bits // 8
    block_align = channels * bits // 8
    riff_size = 0x7FFFFFFF
    data_size = 0x7FFFFFFF - 36
    return struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF', riff_size, b'WAVE',
        b'fmt ', 16, 1, channels, sample_rate, byte_rate, block_align, bits,
        b'data', data_size
    )


@app.post("/api/tts")
def synthesize(req: TTSRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    spoken = clean_text(req.text, req.max_chars or 500)
    if not spoken:
        raise HTTPException(status_code=400, detail="text empty after cleaning")

    speaker_wav = resolve_speaker_wav(req.voice)
    gpt_cond_latent, speaker_embedding = get_cached_conditioning(speaker_wav)

    if req.stream:
        def gen():
            yield _streaming_wav_header(sample_rate=OUTPUT_SAMPLE_RATE)
            chunk_stream = xtts_model.inference_stream(
                text=spoken,
                language="ur",
                gpt_cond_latent=gpt_cond_latent,
                speaker_embedding=speaker_embedding,
                temperature=req.temperature,
                top_p=req.top_p,
                speed=req.speed,
            )
            for chunk in chunk_stream:
                pcm = chunk.detach().to(torch.float32).cpu().numpy()
                pcm16 = (np.clip(pcm, -1.0, 1.0) * 32767).astype(np.int16)
                yield pcm16.tobytes()

        return StreamingResponse(gen(), media_type="audio/wav")

    out = xtts_model.inference(
        text=spoken,
        language="ur",
        gpt_cond_latent=gpt_cond_latent,
        speaker_embedding=speaker_embedding,
        temperature=req.temperature,
        top_p=req.top_p,
        speed=req.speed,
    )
    wav = np.array(out["wav"], dtype=np.float32)
    audio_bytes = _pcm_to_wav_bytes(wav, sample_rate=OUTPUT_SAMPLE_RATE)

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/wav",
        headers={"Cache-Control": "public, max-age=3600"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8020, log_level="info")
