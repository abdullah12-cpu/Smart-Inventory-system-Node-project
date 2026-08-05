"""
Urdu/English STT Microservice — faster-whisper
Transcribes short voice clips recorded by the buyer chatbot's mic button.
CPU-friendly (CTranslate2 int8), no GPU required. Model loads once at startup.

Run:  python stt_service.py
Port: 8021
"""

import os
import tempfile

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from faster_whisper import WhisperModel

app = FastAPI(title="Buyer Chatbot STT Microservice")

MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

print(f"[STT] Loading faster-whisper model '{MODEL_SIZE}' ({DEVICE}/{COMPUTE_TYPE})...")
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("[STT] Model ready.")


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE, "device": DEVICE}


@app.post("/api/stt")
async def transcribe(audio: UploadFile = File(...), language: str = Form(default=None)):
    """
    Accepts a short audio clip (webm/ogg/wav/mp3 -- anything ffmpeg/PyAV can decode)
    and returns the transcribed text. `language` is an optional ISO code hint (e.g. "ur",
    "en"); omit it to let Whisper auto-detect, which works well for buyers who mix
    Roman Urdu, Urdu, and English in the same sentence.
    """
    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"
    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty audio")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name

        segments, info = model.transcribe(
            tmp_path,
            language=language or None,
            # Translate (not transcribe) to English: the product catalog, keyword search, and
            # intent routing downstream all match against English text. Native-script Urdu
            # transcription turns English loanwords the buyer actually said (e.g. "console",
            # "recommend") into Perso-Arabic phonetic spellings that no longer match anything
            # in the catalog, so search silently falls back to a generic product list. The
            # buyer's own typed messages already mix English words into Roman Urdu sentences
            # for the same reason -- translating spoken input keeps behavior consistent with
            # that path. The assistant still replies in Urdu regardless of the input script.
            task="translate",
            # The browser already trims leading/trailing silence via client-side voice
            # activity detection before the clip ever gets here. Whisper's own vad_filter
            # (a second, differently-tuned VAD pass) was judging short clips as "no speech"
            # and returning empty text -- hence disabled.
            vad_filter=False,
            beam_size=1,               # greedy decoding -- much faster on CPU, minor accuracy cost
            condition_on_previous_text=False,
            no_speech_threshold=0.6,
        )
        text = "".join(seg.text for seg in segments).strip()
        return {
            "text": text,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT error: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8021, log_level="warning")
