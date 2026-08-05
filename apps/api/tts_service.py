"""
Urdu TTS Microservice — Microsoft Edge Neural TTS
Uses edge-tts (ur-PK-AsadNeural / ur-PK-UzmaNeural)
Fast: < 400ms latency, human-quality neural voice, no GPU needed.

Run:  python tts_service.py
Port: 8020
"""

import asyncio
import re
import sys
import io

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(title="Urdu Edge TTS Microservice")

# Available voices:
#   ur-PK-AsadNeural   (Male,   warm, natural)
#   ur-PK-UzmaNeural   (Female, clear, natural)
DEFAULT_VOICE = "ur-PK-UzmaNeural"

def clean_text(raw: str) -> str:
    """Strip markdown, convert amounts, collapse whitespace for Urdu script TTS."""
    text = re.sub(r'```[\s\S]*?```', '', raw)       # remove code blocks
    text = re.sub(r'\|.*?\|', '', text)              # remove table rows
    text = re.sub(r'^[\s\-#*>|]+', '', text, flags=re.MULTILINE)  # markdown symbols at line start
    text = re.sub(r'[*_#`~]', '', text)              # inline markdown
    text = re.sub(r'https?://\S+', '', text)         # URLs
    # Convert PKR amounts to spoken Urdu
    text = re.sub(r'Rs\.?\s*([\d,]+)', lambda m: m.group(1).replace(',', '') + ' روپے', text)
    text = re.sub(r'PKR\s*([\d,]+)', lambda m: m.group(1).replace(',', '') + ' روپے', text)
    text = re.sub(r'\n{2,}', '۔ ', text)
    text = re.sub(r'\n', ' ', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()
    return text



class TTSRequest(BaseModel):
    text: str
    language: str = "ur"
    voice: str = DEFAULT_VOICE


import os
import json
import urllib.request

def synthesize_elevenlabs(text: str, voice: str = None) -> bytes:
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        return None
    
    def is_eleven_voice(v: str) -> bool:
        if not v or not isinstance(v, str):
            return False
        v_clean = v.strip()
        return bool(re.match(r'^[a-zA-Z0-9]{15,32}$', v_clean)) and not re.search(r'neural|edge|ur-pk', v_clean, re.IGNORECASE)

    voice_id = voice.strip() if is_eleven_voice(voice) else os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
    model_id = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": float(os.getenv("ELEVENLABS_STABILITY", "0.5")),
            "similarity_boost": float(os.getenv("ELEVENLABS_SIMILARITY_BOOST", "0.75"))
        }
    }
    
    headers = {
        "Content-Type": "application/json",
        "xi-api-key": api_key,
        "Accept": "audio/mpeg"
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                return resp.read()
    except Exception as e:
        print(f"[ElevenLabs Python] Synthesis failed: {e}. Falling back to edge-tts...")
    return None


@app.get("/health")
def health():
    engine = "elevenlabs" if os.getenv("ELEVENLABS_API_KEY") else "edge-tts"
    return {"status": "ok", "engine": engine, "default_voice": DEFAULT_VOICE}


@app.post("/api/tts")
async def synthesize(req: TTSRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    spoken = clean_text(req.text)
    if not spoken:
        raise HTTPException(status_code=400, detail="text is empty after cleaning")

    # Try ElevenLabs first if API Key is configured
    eleven_audio = synthesize_elevenlabs(spoken, req.voice)
    if eleven_audio:
        buf = io.BytesIO(eleven_audio)
        return StreamingResponse(
            buf,
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=3600"}
        )

    # Fallback to Edge TTS
    voice = req.voice if req.voice else DEFAULT_VOICE
    if req.voice == "female":
        voice = "ur-PK-UzmaNeural"
    elif req.voice == "male":
        voice = "ur-PK-AsadNeural"

    try:
        communicate = edge_tts.Communicate(spoken, voice=voice, rate="+0%", volume="+0%")
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        buf.seek(0)

        if buf.getbuffer().nbytes == 0:
            raise HTTPException(status_code=500, detail="No audio generated")

        return StreamingResponse(
            buf,
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=3600"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8020, log_level="warning")
