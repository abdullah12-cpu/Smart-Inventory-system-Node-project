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

ROMAN_TO_URDU = {
    "salam": "سلام", "aap": "آپ", "main": "میں", "hun": "ہوں", "hoon": "ہوں",
    "ka": "کا", "ki": "کی", "ke": "کے", "ko": "کو", "se": "سے", "ne": "نے",
    "par": "پر", "me": "میں", "mein": "میں", "hai": "ہے", "hain": "ہیں",
    "aur": "اور", "ya": "یا", "bhi": "بھی", "to": "تو", "toh": "تو",
    "jo": "جو", "agar": "اگر", "lekin": "لیکن", "kya": "کیا",
    "kyun": "کیوں", "kab": "کب", "kahan": "کہاں", "kaise": "کیسے",
    "bohat": "بہت", "bahut": "بہت", "zyada": "زیادہ", "kam": "کم",
    "acha": "اچھا", "sahi": "صحیح", "galat": "غلط", "best": "بہترین",
    "order": "آرڈر", "product": "پروڈکٹ", "products": "پروڈکٹس",
    "price": "قیمت", "budget": "بجٹ", "laptop": "لیپ ٹاپ",
    "keyboard": "کی بورڈ", "monitor": "مانیٹر", "gaming": "گیمنگ",
}


def clean_text(raw: str) -> str:
    """Strip markdown, convert amounts, collapse whitespace."""
    text = re.sub(r'[*_#`~]', '', raw)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'Rs\.?\s*([\d,]+)', lambda m: m.group(1).replace(',', '') + ' روپے', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()
    return text


class TTSRequest(BaseModel):
    text: str
    language: str = "ur"
    voice: str = DEFAULT_VOICE


@app.get("/health")
def health():
    return {"status": "ok", "engine": "edge-tts", "default_voice": DEFAULT_VOICE}


@app.post("/api/tts")
async def synthesize(req: TTSRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    spoken = clean_text(req.text)
    if not spoken:
        raise HTTPException(status_code=400, detail="text is empty after cleaning")

    # Pick voice
    voice = req.voice if req.voice else DEFAULT_VOICE
    # If caller passes 'female' / 'male' shorthand
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
