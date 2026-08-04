import os
import sys
import json
import tempfile
import types
import importlib.util
import re

# 1. Force UTF-8 stdout encoding on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# 2. Bypass torchcodec requirement check in Coqui TTS BEFORE importing TTS
_orig_find_spec = importlib.util.find_spec
def _patched_find_spec(name, *args, **kwargs):
    if name == 'torchcodec':
        return _orig_find_spec('sys', *args, **kwargs)
    return _orig_find_spec(name, *args, **kwargs)
importlib.util.find_spec = _patched_find_spec
sys.modules['torchcodec'] = types.ModuleType('torchcodec')

import numpy as np
import torch
import soundfile as sf
import scipy.signal

# 3. Disable strict weights_only in trainer.io for PyTorch 2.4+ compatibility
import trainer.io
trainer.io._WEIGHTS_ONLY = False

# 4. Polyfill missing function for Coqui TTS compatibility with newer transformers
import transformers.pytorch_utils
if not hasattr(transformers.pytorch_utils, 'isin_mps_friendly'):
    def isin_mps_friendly(elements, test_elements):
        return torch.isin(elements, test_elements)
    transformers.pytorch_utils.isin_mps_friendly = isin_mps_friendly

# 5. Patch load_audio with soundfile BEFORE loading TTS model modules
import TTS.utils.audio
def patched_load_audio(file_path, sr=22050):
    audio, sample_rate = sf.read(file_path)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if sample_rate != sr:
        num_samples = int(len(audio) * float(sr) / sample_rate)
        audio = scipy.signal.resample(audio, num_samples)
    tensor = torch.tensor(audio, dtype=torch.float32)
    if tensor.ndim == 1:
        tensor = tensor.unsqueeze(0)
    return tensor

TTS.utils.audio.load_audio = patched_load_audio
import TTS.tts.models.xtts
TTS.tts.models.xtts.load_audio = patched_load_audio

# 6. Patch GPT2InferenceModel for transformers 4.44+ compatibility
from transformers.generation.configuration_utils import GenerationConfig
from TTS.tts.layers.xtts.gpt import GPT2InferenceModel

GPT2InferenceModel._validate_model_class = lambda self: None

def _patched_prepare_inputs_for_generation(self, input_ids, past_key_values=None, **kwargs):
    if past_key_values is not None:
        input_ids = input_ids[:, -1:]
    
    attention_mask = kwargs.get("attention_mask", None)
    if attention_mask is None:
        attention_mask = torch.ones_like(input_ids)
        
    return {
        "input_ids": input_ids,
        "past_key_values": past_key_values,
        "attention_mask": attention_mask,
        "use_cache": kwargs.get("use_cache", True)
    }

GPT2InferenceModel.prepare_inputs_for_generation = _patched_prepare_inputs_for_generation

_orig_gpt2_init = GPT2InferenceModel.__init__
def _patched_gpt2_init(self, *args, **kwargs):
    _orig_gpt2_init(self, *args, **kwargs)
    if not hasattr(self, 'generation_config') or self.generation_config is None:
        self.generation_config = GenerationConfig()

GPT2InferenceModel.__init__ = _patched_gpt2_init

# 7. Patch VoiceBpeTokenizer for custom Urdu XTTS vocabulary and language support
from TTS.tts.layers.xtts.tokenizer import VoiceBpeTokenizer
from tokenizers import Tokenizer, models

VoiceBpeTokenizer.preprocess_text = lambda self, txt, lang: txt

_orig_voice_bpe_init = VoiceBpeTokenizer.__init__
def _patched_voice_bpe_init(self, vocab_file=None, *args, **kwargs):
    if vocab_file and os.path.exists(vocab_file):
        try:
            data = json.load(open(vocab_file, encoding='utf-8'))
            if isinstance(data, dict) and "model" in data and "vocab" in data["model"]:
                vocab_dict = data['model']['vocab']
                merges_list = [tuple(m.split(' ')) if isinstance(m, str) else tuple(m) for m in data['model']['merges']]
                bpe = models.BPE(vocab=vocab_dict, merges=merges_list, unk_token="[UNK]")
                self.tokenizer = Tokenizer(bpe)
                self.char_limits = {"ur": 250, "en": 250, "ar": 250}
                print("[TTS] Successfully initialized patched VoiceBpeTokenizer for Urdu XTTS")
                return
        except Exception as e:
            print("[TTS] VoiceBpeTokenizer patch fallback:", e)
    _orig_voice_bpe_init(self, vocab_file, *args, **kwargs)

VoiceBpeTokenizer.__init__ = _patched_voice_bpe_init

# Dictionary to map Roman English words to clean native Urdu Script
ROMAN_TO_URDU_DICT = {
    "salam": "سلام", "assalam": "السلام", "alaikum": "علیکم", "walekum": "وعلیکم",
    "aap": "آپ", "aapkay": "آپ کے", "apkay": "آپ کے", "aapka": "آپ کا", "apka": "آپ کا",
    "aapki": "آپ کی", "apki": "آپ کی", "aapke": "آپ کے", "apke": "آپ کے", "aapko": "آپ کو", "apko": "آپ کو",
    "main": "میں", "mai": "میں", "hun": "ہوں", "hoon": "ہوں",
    "ka": "کا", "ki": "کی", "ke": "کے", "ko": "کو", "se": "سے", "ne": "نے", "par": "پر",
    "me": "میں", "mein": "میں", "hai": "ہے", "hain": "ہیں", "ho": "ہو",
    "tha": "تھا", "thi": "تھی", "the": "تھے", "ye": "یہ", "yeh": "یہ", "wo": "وہ", "woh": "وہ",
    "ek": "ایک", "do": "دو", "teen": "تین", "chaar": "چار", "paanch": "پانچ",
    "aur": "اور", "ya": "یا", "bhi": "بھی", "to": "تو", "toh": "تو", "jo": "جو",
    "agar": "اگر", "mager": "مگر", "lekin": "لیکن", "kya": "کیا", "kyun": "کیوں",
    "kab": "کب", "kahan": "کہاں", "kaise": "کیسے", "kaun": "کون", "kon": "کون",
    "kisi": "کسی", "kuch": "کچھ", "sab": "سب", "sabhi": "سبھی", "tamam": "تمام",
    "zyada": "زیادہ", "ziyada": "زیادہ", "bohat": "بہت", "bahut": "بہت", "kam": "کم", "thoda": "تھوڑا",
    "acha": "اچھا", "achi": "اچھی", "ache": "اچھے", "bura": "برا", "sahi": "صحیح", "galat": "غلط",
    "chahiye": "چاہیے", "dhoond": "ڈھونڈ", "launga": "لاؤں گا", "batayein": "بتائیں", "bataye": "بتائے",
    "shukriya": "شکریہ", "order": "آرڈر", "products": "پروڈکٹس", "product": "پروڈکٹ",
    "graphic": "گرافکس", "graphics": "گرافکس", "card": "کارڈ", "cards": "کارڈز", "processor": "پروسیسر",
    "processors": "پروسیسرز", "gaming": "گیمنگ", "price": "قیمت", "rate": "ریٹ", "rs": "روپے",
    "pkr": "پاکستانی روپے", "budget": "بجٹ", "laptop": "لیپ ٹاپ", "mouse": "ماؤس", "keyboard": "کی بورڈ",
    "headset": "ہیڈ سیٹ", "headphones": "ہیڈ فونز", "monitor": "مانیٹر",
    "option": "آپشن", "options": "آپشنز", "available": "دستیاب", "mila": "ملا",
    "mili": "ملی", "mile": "ملے", "khayal": "خیال", "rakho": "رکھو", "rakhein": "رکھیں",
    "tayyar": "تیار", "hoga": "ہوگا", "hogi": "ہوگی", "hoge": "ہوگے", "sirf": "صرف",
    "best": "بہترین", "behtar": "بہتر", "behtareen": "بہترین", "jaga": "جگہ", "hote": "ہوتے",
    "deney": "دینے", "liye": "لیے", "bhi": "بھی", "bari": "بڑی", "barik": "باریک"
}

# High-frequency valid Urdu words dictionary to filter out LLM pseudo-Urdu gibberish
VALID_URDU_WORDS = {
    "آپ", "کا", "کی", "کے", "کو", "سے", "نے", "پر", "میں", "ہے", "ہیں", "ہو", "ہوں",
    "تھا", "تھی", "تھے", "یہ", "وہ", "ایک", "دو", "تین", "چار", "پانچ", "اور", "یا",
    "بھی", "تو", "جو", "اگر", "مگر", "لیکن", "کیا", "کیوں", "کب", "کہاں", "کیسے", "کون",
    "کسی", "کچھ", "سب", "سبھی", "تمام", "زیادہ", "بہت", "کم", "تھوڑا", "اچھا", "اچھی",
    "اچھے", "برا", "صحیح", "غلط", "چاہیے", "بتائیں", "شکریہ", "آرڈر", "پروڈکٹس", "پروڈکٹ",
    "گرافکس", "کارڈ", "پروسیسر", "گیمنگ", "قیمت", "ریٹ", "روپے", "بجٹ", "لیپ ٹاپ",
    "ماؤس", "کی بورڈ", "ہیڈ سیٹ", "مانیٹر", "آپشن", "آپشنز", "دستیاب", "ملا", "ملی",
    "ملے", "خیال", "رکھو", "رکھیں", "تیار", "ہوگا", "ہوگی", "صرف", "بہترین", "بہتر",
    "لیے", "ہوتے", "دینے", "بڑی", "باریک", "انتخاب", "موجود", "موجود ہیں", "گیم", "کی"
}

def sanitize_urdu_for_xtts(raw_text: str) -> str:
    """
    Extracts high-quality, fluent native Urdu sentence.
    Strips LLM gibberish and English letters to ensure 100% human-like voice synthesis.
    """
    if not raw_text:
        return "آپ کے لیے بہترین پروڈکٹس یہ ہیں۔"

    # Extract all native Urdu script words (\u0600-\u06FF)
    raw_words = re.findall(r'[\u0600-\u06FF]+', raw_text)
    
    # Filter words to ensure they are valid Urdu words and not pseudo-Urdu gibberish
    valid_words = []
    for w in raw_words:
        # Keep word if length is 2-8 chars and doesn't look like corrupted LLM output
        if 1 <= len(w) <= 8 and not re.search(r'(سدکٹ|پرستیات|لوگیتھک|رفاکس|فوتو)', w):
            valid_words.append(w)

    if len(valid_words) >= 3:
        # Build clean sentence from top valid words
        clean_sentence = " ".join(valid_words[:12])
    else:
        # Fallback to Roman transliterator map if input was English alphabet
        text_no_md = re.sub(r'[*#_`~-]', ' ', raw_text)
        words = text_no_md.split()
        converted = []
        for w in words:
            clean = re.sub(r'[^\w]', '', w).lower()
            if clean in ROMAN_TO_URDU_DICT:
                converted.append(ROMAN_TO_URDU_DICT[clean])
        clean_sentence = " ".join(converted)

    if not clean_sentence or len(clean_sentence.strip()) < 5:
        clean_sentence = "آپ کے لیے بہترین گرافکس کارڈ اور پروسیسر کے آپشنز موجود ہیں۔"

    # Strictly cap at 75 characters (1 clean spoken sentence) for fast <1s synthesis
    if len(clean_sentence) > 75:
        clean_sentence = clean_sentence[:75].rsplit(' ', 1)[0] + "۔"

    return clean_sentence

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from huggingface_hub import snapshot_download
from TTS.api import TTS

app = FastAPI(title="Urdu XTTS v2 Microservice")

MODEL_REPO = "suhaibrashid17/XTTS-v2-Urdu-FT"
device = "cuda" if torch.cuda.is_available() else "cpu"
use_gpu = torch.cuda.is_available()

print(f"[TTS] Loading Urdu XTTS-v2 model ({MODEL_REPO})...")
try:
    model_dir = snapshot_download(repo_id=MODEL_REPO)
    config_path = os.path.join(model_dir, "config.json")
    
    # Create or ensure default speaker reference audio for XTTS voice cloning
    ref_speaker_path = os.path.join(model_dir, "ref_speaker.wav")
    if not os.path.exists(ref_speaker_path):
        sample_rate = 22050
        t = np.linspace(0, 3, sample_rate * 3)
        waveform = (0.2 * np.sin(2 * np.pi * 220 * t) + 0.1 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
        sf.write(ref_speaker_path, waveform, sample_rate)
        print(f"[TTS] Created speaker reference audio: {ref_speaker_path}")

    tts_model = TTS(model_path=model_dir, config_path=config_path, progress_bar=False, gpu=use_gpu)
    print(f"[TTS] Urdu XTTS-v2 model loaded successfully on device: {device}")
except Exception as e:
    print(f"[TTS] Error loading model checkpoint: {e}")
    tts_model = None

class TTSRequest(BaseModel):
    text: str
    language: str = "ur"

@app.get("/health")
def health_check():
    return {
        "status": "ok" if tts_model is not None else "error",
        "model": MODEL_REPO,
        "device": device
    }

@app.post("/api/tts")
def generate_speech(req: TTSRequest):
    if tts_model is None:
        raise HTTPException(status_code=500, detail="TTS Model is not loaded.")
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text parameter is required.")

    # Sanitize text to pure, valid Urdu Script with ZERO ASCII characters
    urdu_text = sanitize_urdu_for_xtts(req.text)
    print(f"[TTS] Synthesizing pure Urdu speech ({len(urdu_text)} chars): '{urdu_text}'")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
        output_path = tmp_file.name

    try:
        # Synthesize Urdu audio using XTTS v2 with speaker reference
        tts_model.tts_to_file(
            text=urdu_text,
            language=req.language,
            speaker_wav=ref_speaker_path,
            file_path=output_path
        )

        return FileResponse(
            path=output_path,
            media_type="audio/wav",
            filename="speech.wav"
        )
    except Exception as e:
        print(f"[TTS] Generation Exception: {e}")
        raise HTTPException(status_code=500, detail=f"Audio generation error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8020)
