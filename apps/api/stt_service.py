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

# Model/device selection adapts to the hardware, because the accuracy ceiling here is set by
# compute, not by which checkpoint you ask for. Measured on this project's dev laptop
# (8-core CPU, no GPU, int8) against ~3s clips:
#
#     small     ~3.3s per clip      medium   ~10-12s      large-v3  ~25-40s (extrapolated)
#
# Raising cpu_threads or lowering beam_size did not move those numbers meaningfully -- it is
# raw CPU throughput. So large-v3 on CPU is not a usable option for a voice interface no
# matter how much more accurate it is, and medium is already borderline.
#
# On a CUDA GPU the same work takes well under a second, which is why the accurate model is
# selected automatically there and only there. To get large-v3 accuracy at usable speed,
# run this service on the Office PC's RTX 4090 alongside XTTS/Ollama and point the backend
# at it with STT_SERVICE_URL -- that plumbing already exists in copilot.js.
#
# Every value stays overridable:  set WHISPER_MODEL_SIZE=small   (or medium / large-v3)
try:
    import ctranslate2
    _HAS_CUDA = "cuda" in ctranslate2.get_supported_compute_types("cuda") or bool(
        ctranslate2.get_cuda_device_count()
    )
except Exception:
    _HAS_CUDA = False

if _HAS_CUDA:
    DEFAULT_MODEL, DEFAULT_DEVICE, DEFAULT_COMPUTE = "large-v3", "cuda", "float16"
else:
    DEFAULT_MODEL, DEFAULT_DEVICE, DEFAULT_COMPUTE = "medium", "cpu", "int8"

MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", DEFAULT_MODEL)
DEVICE = os.getenv("WHISPER_DEVICE", DEFAULT_DEVICE)
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", DEFAULT_COMPUTE)

# Whisper accepts an `initial_prompt` that biases decoding toward an expected vocabulary.
# This is the single cheapest accuracy win available here: without it the decoder has no
# reason to prefer "invoices"/"quotations"/"PlayStation" over similar-sounding everyday
# words, which is exactly how the misrecognitions above happened. Listing the domain terms
# and real brand names the user actually speaks makes those tokens far likelier.
DOMAIN_PROMPT = os.getenv(
    "WHISPER_INITIAL_PROMPT",
    "CommerceIQ wholesale distributor portal. "
    "Common requests: show me my orders, pending orders, shipped orders, delivered orders, "
    "rejected orders, cancelled orders, today's orders, yesterday's orders, last week, "
    "last month, this month, unpaid invoices, paid invoices, overdue invoices, "
    "quotations, active negotiations, rejected negotiations, wholesale rates, stock, "
    "MOQ, credit limit, ledger. "
    "Brands and products: Sony PlayStation 5 Slim Disc Edition, Microsoft Xbox Series X "
    "Console, Logitech G Pro X Superlight Wireless Gaming Mouse, ASUS ROG Strix Scope "
    "Wireless Gaming Keyboard, SteelSeries Arctis Nova Pro Wireless Gaming Headset, "
    "Secretlab TITAN Evo Gaming Chair."
)

print(f"[STT] GPU detected: {_HAS_CUDA}")
print(f"[STT] Loading faster-whisper model '{MODEL_SIZE}' ({DEVICE}/{COMPUTE_TYPE})...")
print("[STT] First run downloads model weights -- this can take a few minutes.")
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("[STT] Model ready.")
if not _HAS_CUDA:
    print("[STT] Running on CPU -- expect several seconds per clip. For faster, more "
          "accurate speech recognition, run this service on a CUDA GPU machine and set "
          "STT_SERVICE_URL in apps/api/.env to point at it.")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_SIZE,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
        "gpu": _HAS_CUDA,
    }


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
            # Accuracy prioritized over raw speed here (explicit product requirement) --
            # beam_size=1 (greedy) was producing garbled/hallucinated fragments on real
            # spoken queries (e.g. "shipped orders" -> "Safe Shift Order"), especially in
            # translate mode, which hallucinates more readily than plain transcription under
            # greedy decoding. beam_size=5 + temperature=0.0 trades a bit of latency for a
            # meaningfully more accurate/deterministic transcript.
            beam_size=5,
            temperature=0.0,
            condition_on_previous_text=False,
            no_speech_threshold=0.6,
            # Biases decoding toward this app's vocabulary -- see DOMAIN_PROMPT above.
            initial_prompt=DOMAIN_PROMPT,
            # Drops low-confidence hallucinations rather than emitting confident-looking
            # nonsense. Whisper invents plausible sentences from noise/silence, and a
            # hallucinated transcript routes the chatbot to a completely wrong intent.
            log_prob_threshold=-1.0,
            compression_ratio_threshold=2.4,
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
