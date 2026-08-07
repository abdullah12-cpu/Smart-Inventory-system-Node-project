import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageSquare, X, Send, ShoppingBag, Check, Camera, Trash2, Package, Truck, Clock, CheckCircle2, XCircle, Volume2, Square, Mic } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";

const SUGGESTED_PROMPTS = [
  "Show me all my orders",
  "Show shipped orders",
  "Show delivered orders",
  "Show pending orders",
  "Compare Cisco Fiber Catalyst 9300 vs Corning Fiber Optic Spool",
  "Suggest products under 100,000 PKR",
];

function parseInline(text) {
  // Bold+Italic: ***text***
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  text = text.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  // Inline code: `code`
  text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded text-[10px] font-mono">$1</code>');
  return text;
}

function renderMessageText(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines (add spacing)
    if (!trimmed) {
      i++;
      continue;
    }

    // Table detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const headers = tableLines[0].split('|').slice(1, -1).map(h => h.trim());
        const dataRows = tableLines.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));
        elements.push(
          <div key={i} className="overflow-x-auto my-2 border border-slate-200 rounded-lg shadow-sm bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-[10px]">
              <thead className="bg-slate-50">
                <tr>
                  {headers.map((h, idx) => (
                    <th key={idx} className="px-2 py-1.5 font-bold text-slate-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-2 py-1.5 text-slate-700 font-medium whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // H3 heading: ### text
    if (trimmed.startsWith('### ')) {
      elements.push(
        <p key={i} className="font-bold text-slate-900 text-sm mt-2 mb-1" dangerouslySetInnerHTML={{ __html: parseInline(trimmed.slice(4)) }} />
      );
      i++;
      continue;
    }

    // H2 heading: ## text
    if (trimmed.startsWith('## ')) {
      elements.push(
        <p key={i} className="font-bold text-slate-900 text-sm mt-2 mb-1" dangerouslySetInnerHTML={{ __html: parseInline(trimmed.slice(3)) }} />
      );
      i++;
      continue;
    }

    // Bullet list item: - text
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-1.5 items-start ml-1 my-0.5">
          <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
          <span className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: parseInline(trimmed.slice(2)) }} />
        </div>
      );
      i++;
      continue;
    }

    // Numbered list: 1. text or **1. text**
    const numMatch = trimmed.match(/^\*?\*?(\d+)\.\s+(.*?)\*?\*?$/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex gap-1.5 items-start ml-1 my-1">
          <span className="text-indigo-600 font-bold shrink-0 min-w-[16px]">{numMatch[1]}.</span>
          <span className="font-semibold text-slate-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: parseInline(numMatch[2]) }} />
        </div>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-slate-700 leading-relaxed my-0.5" dangerouslySetInnerHTML={{ __html: parseInline(trimmed) }} />
    );
    i++;
  }

  return <div className="space-y-0.5 text-left text-xs">{elements}</div>;
}


const ORDER_STATUS_CONFIG = {
  PENDING:    { icon: Clock,        color: 'text-amber-500',  bg: 'bg-amber-50  border-amber-200',  label: 'Pending'    },
  CONFIRMED:  { icon: CheckCircle2, color: 'text-blue-500',   bg: 'bg-blue-50   border-blue-200',   label: 'Confirmed'  },
  PROCESSING: { icon: Package,      color: 'text-purple-500', bg: 'bg-purple-50 border-purple-200', label: 'Processing' },
  SHIPPED:    { icon: Truck,        color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200', label: 'Shipped'    },
  DELIVERED:  { icon: CheckCircle2, color: 'text-emerald-500',bg: 'bg-emerald-50 border-emerald-200',label: 'Delivered' },
  CANCELLED:  { icon: XCircle,      color: 'text-red-500',   bg: 'bg-red-50    border-red-200',    label: 'Cancelled'  },
  RETURNED:   { icon: Package,      color: 'text-slate-500',  bg: 'bg-slate-50  border-slate-200',  label: 'Returned'   },
};

function OrderStatusCard({ order }) {
  const status = (order.status || 'PENDING').toUpperCase();
  const cfg = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.PENDING;
  const StatusIcon = cfg.icon;
  let items = [];
  try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch { items = []; }

  return (
    <div className={`border rounded-xl p-3 mt-1 ${cfg.bg} shadow-xs`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Order</span>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
          <StatusIcon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>
      <p className="text-xs font-extrabold text-slate-900 mb-1">{order.order_number || order.order_id}</p>
      {items.length > 0 && (
        <div className="space-y-0.5 mb-2">
          {items.slice(0, 3).map((item, i) => (
            <div key={i} className="text-[10px] text-slate-600 flex justify-between">
              <span className="truncate max-w-[140px]">{item.product_name || item.sku || 'Item'} × {item.quantity || 1}</span>
              <span className="font-semibold">Rs {parseFloat(item.unit_price || item.price || 0).toLocaleString()}</span>
            </div>
          ))}
          {items.length > 3 && <p className="text-[9px] text-slate-400">+{items.length - 3} more items</p>}
        </div>
      )}
      <div className="flex justify-between items-center pt-1.5 border-t border-current/10">
        <span className="text-[10px] text-slate-500">{order.order_date ? new Date(order.order_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
        <span className="text-xs font-extrabold text-slate-900">Rs {parseFloat(order.total_amount || 0).toLocaleString()}</span>
      </div>
    </div>
  );
}

// ── TTS helpers ────────────────────────────────────────────────────────────

/** Clean Urdu-script AI response for TTS: strip markdown/tables/URLs, preserve Urdu text */
function cleanForSpeech(raw) {
  if (!raw) return '';
  let text = raw
    .replace(/```[\s\S]*?```/g, '')              // remove code blocks
    .replace(/\|.*?\|/g, '')                     // remove table rows
    .replace(/^\s*[-|#*>]+\s*/gm, '')            // remove markdown symbols at line start
    .replace(/[*_#`~]/g, '')                     // remaining inline markdown
    .replace(/https?:\/\/\S+/g, '')              // URLs
    // Convert PKR amounts to Urdu spoken form
    .replace(/Rs\.?\s*([\d,]+)/gi, (_, n) => n.replace(/,/g, '') + ' روپے')
    .replace(/PKR\s*([\d,]+)/gi, (_, n) => n.replace(/,/g, '') + ' روپے')
    .replace(/\n{2,}/g, '۔ ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Speak the full answer (not just a fragment) so it stays meaningful, but cap very long
  // replies to a sane length for latency -- cutting at a sentence boundary, never mid-thought.
  const MAX_SPEECH_CHARS = 500;
  if (text.length > MAX_SPEECH_CHARS) {
    const sentences = text.split(/(?<=[۔!؟?.])\s*/);
    let capped = '';
    for (const s of sentences) {
      if ((capped + s).length > MAX_SPEECH_CHARS) break;
      capped += (capped ? ' ' : '') + s;
    }
    text = capped.trim() || text.substring(0, MAX_SPEECH_CHARS).trim();
  }
  return text;
}


// XTTS streaming wire format (as specified by the service): one 44-byte WAV header with
// placeholder sizes, then continuous raw PCM -- signed 16-bit little-endian, mono, 24000 Hz,
// no per-chunk framing. Sentence chunks are pre-concatenated server-side with ~120ms silence
// between them, so the client only has to append bytes and schedule playback.
const XTTS_STREAM_SAMPLE_RATE = 24000;
const XTTS_WAV_HEADER_BYTES = 44;

/**
 * Streams TTS audio and schedules PCM chunks back-to-back via the Web Audio API as they
 * arrive, so playback starts after the first chunk (~0.3s) instead of waiting for the
 * entire utterance to finish generating (~2-5s). Falls back to the old full-blob approach
 * (playFullBlob) on any failure -- older/unusual browsers, network hiccups, etc.
 */
async function playStreamingTTS(fullText, { stopRef, onFirstAudio, onEnded }) {
  const resp = await fetch('/api/copilot/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: fullText, voice: 'ur-PK-UzmaNeural', stream: true }),
    signal: AbortSignal.timeout(120000)
  });
  if (!resp.ok || resp.status === 204 || !resp.body) throw new Error('stream unavailable');

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx();
  const activeSources = [];
  let nextStartTime = 0;
  let headerSkipped = false;
  let leftoverByte = null; // odd trailing byte carried across chunk boundaries (2 bytes/sample)
  let announcedFirstAudio = false;
  let scheduledSamples = 0;

  const scheduleChunk = (int16Samples) => {
    if (int16Samples.length === 0) return;
    const float32 = new Float32Array(int16Samples.length);
    for (let i = 0; i < int16Samples.length; i++) float32[i] = int16Samples[i] / 32768;

    const buffer = audioCtx.createBuffer(1, float32.length, XTTS_STREAM_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    const startAt = Math.max(nextStartTime, audioCtx.currentTime);
    source.start(startAt);
    nextStartTime = startAt + buffer.duration;
    scheduledSamples += int16Samples.length;
    activeSources.push(source);

    if (!announcedFirstAudio) { announcedFirstAudio = true; onFirstAudio?.(); }
  };

  const reader = resp.body.getReader();
  try {
    while (true) {
      if (stopRef.current) break;
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.length === 0) continue;

      let bytes = value;
      if (!headerSkipped) {
        bytes = bytes.length > XTTS_WAV_HEADER_BYTES ? bytes.slice(XTTS_WAV_HEADER_BYTES) : bytes.slice(bytes.length);
        headerSkipped = true;
        if (bytes.length === 0) continue;
      }

      let combined = bytes;
      if (leftoverByte !== null) {
        combined = new Uint8Array(bytes.length + 1);
        combined[0] = leftoverByte;
        combined.set(bytes, 1);
        leftoverByte = null;
      }

      let usableLength = combined.length;
      if (usableLength % 2 !== 0) {
        leftoverByte = combined[usableLength - 1];
        usableLength -= 1;
      }
      if (usableLength <= 0) continue;

      const int16 = new Int16Array(combined.buffer, combined.byteOffset, usableLength / 2);
      scheduleChunk(int16);
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  // Wait for scheduled playback to actually finish before reporting "ended" (the fetch/
  // decode loop above can finish well before the audio scheduled at the tail end has
  // played out).
  const remainingMs = Math.max(0, (nextStartTime - audioCtx.currentTime) * 1000);
  const waitAndEnd = () => new Promise(resolve => setTimeout(resolve, remainingMs)).then(() => {
    onEnded?.();
  });

  return {
    stop: () => {
      activeSources.forEach(s => { try { s.stop(); } catch {} });
      audioCtx.close().catch(() => {});
    },
    finished: scheduledSamples > 0 ? waitAndEnd() : Promise.resolve().then(() => onEnded?.())
  };
}

function TTSPlayButton({ text, speechText, autoPlay = false }) {
  const [isPlaying, setIsPlaying]   = useState(false);
  const stopRef    = useRef(false);
  const audioRef   = useRef(null);
  const streamRef  = useRef(null);

  const stopAll = () => {
    stopRef.current = true;
    if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.src = ''; } catch {} audioRef.current = null; }
    if (streamRef.current) { try { streamRef.current.stop(); } catch {} streamRef.current = null; }
    setIsPlaying(false);
  };

  /** Full-blob fallback: waits for the whole response before playing anything. */
  const playFullBlob = async (fullText) => {
    try {
      const resp = await fetch('/api/copilot/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText, voice: 'ur-PK-UzmaNeural' }),
        signal: AbortSignal.timeout(120000)
      });

      if (!resp.ok || resp.status === 204 || stopRef.current) { setIsPlaying(false); return; }

      const blob = await resp.blob();
      if (!blob.size || stopRef.current) { setIsPlaying(false); return; }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended  = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
      audio.onerror  = () => { setIsPlaying(false); };
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const playFull = async (fullText) => {
    if (!fullText) return;
    stopRef.current = false;
    setIsPlaying(true);

    try {
      const handle = await playStreamingTTS(fullText, {
        stopRef,
        onEnded: () => { if (!stopRef.current) setIsPlaying(false); }
      });
      streamRef.current = handle;
      await handle.finished;
    } catch {
      // Streaming unavailable (older browser, network hiccup) -- fall back to the
      // full-response path rather than staying silent.
      if (!stopRef.current) await playFullBlob(fullText);
    }
  };

  // Prefer the backend's dedicated short speech_text (a natural sentence) over stripping
  // markdown from the display text -- tables/bullet lists in ai_message don't reduce to
  // clean speech no matter how the regex is tuned, which is what caused garbled/broken-word
  // playback for order/invoice responses.
  const spokenText = speechText || cleanForSpeech(text);

  const handleClick = () => {
    if (isPlaying) { stopAll(); return; }
    playFull(spokenText);
  };

  // Auto-play on mount for the latest AI message
  useEffect(() => {
    if (!autoPlay) return;
    const t = setTimeout(() => playFull(spokenText), 300);
    return () => { clearTimeout(t); stopAll(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      onClick={handleClick}
      title={isPlaying ? 'Stop Voice' : 'Listen Urdu Voice'}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold transition-all cursor-pointer border border-indigo-200/70 shrink-0"
    >
      {isPlaying ? (
        <><Square className="w-3 h-3 fill-indigo-600 text-indigo-600" /><span>Stop</span></>
      ) : (
        <><Volume2 className="w-3 h-3 text-indigo-600" /><span>Listen Urdu</span></>
      )}
    </button>
  );
}

export default function BuyerChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "👋 السلام علیکم! میں آپ کا ذاتی شاپنگ اسسٹنٹ ہوں۔ مجھے بتائیں آپ کیا تلاش کر رہے ہیں — بجٹ، کیٹیگری، یا خصوصیات کے مطابق بہترین مصنوعات تلاش کریں گا! آپ 📷 تصویر اپلوڈ کر کے بھی تلاش کر سکتے ہیں!"
    }
  ]);
  const [addedItemIds, setAddedItemIds] = useState([]);
  const [pendingImage, setPendingImage] = useState(null); // { dataUrl, fileName }
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { addToCart, currentUser } = useStore();

  const chatEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const vadAudioCtxRef = useRef(null);
  const vadRafRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPendingImage({ dataUrl: reader.result, fileName: file.name });
      if (!inputMsg.trim()) setInputMsg("Find similar products to this image");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const teardownVAD = () => {
    if (vadRafRef.current) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    if (vadAudioCtxRef.current) {
      vadAudioCtxRef.current.close().catch(() => {});
      vadAudioCtxRef.current = null;
    }
  };

  // Voice Activity Detection: watches mic volume and auto-stops recording the moment the
  // buyer goes quiet, so there's no manual "stop" tap and no dead air added to the round trip.
  const startVAD = (stream) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    vadAudioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const SILENCE_RMS_THRESHOLD = 8;    // below this = silence (0-128 scale)
    const SILENCE_HANG_MS = 900;        // pause length that confirms "done speaking"
    const MAX_RECORDING_MS = 15000;     // hard safety cap
    const startedAt = Date.now();
    let hasSpoken = false;
    let silenceSince = null;

    const tick = () => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;

      analyser.getByteTimeDomainData(dataArray);
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] - 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      if (rms > SILENCE_RMS_THRESHOLD) {
        hasSpoken = true;
        silenceSince = null;
      } else if (hasSpoken) {
        if (silenceSince === null) silenceSince = Date.now();
        else if (Date.now() - silenceSince > SILENCE_HANG_MS) {
          stopRecording();
          return;
        }
      }

      if (Date.now() - startedAt > MAX_RECORDING_MS) {
        stopRecording();
        return;
      }

      vadRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        teardownVAD();
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 1500) { setIsRecording(false); return; } // too short / no speech captured

        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const resp = await fetch('/api/copilot/stt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // No forced language: users mix English/Urdu/Roman Urdu, and pinning the
            // decoder to Urdu makes it interpret English speech as Urdu.
            body: JSON.stringify({ audio: dataUrl }),
            // Generous: speech-to-text runs on CPU here, where a normal utterance takes several
            // seconds and a long one can take much longer. A 30s cap was aborting valid
            // in-flight transcriptions, which surfaced to the user as "voice recognition failed"
            // even though the server was about to return a correct transcript.
            signal: AbortSignal.timeout(120000)
          });
          const data = await resp.json();
          if (data.success && data.text) {
            handleSendMessage(data.text);
          } else {
            setMessages(prev => [...prev, { sender: "ai", text: "معذرت، آواز سمجھ نہیں آئی۔ براہ کرم دوبارہ بولیں۔" }]);
          }
        } catch (err) {
          setMessages(prev => [...prev, { sender: "ai", text: "معذرت، آواز کی پہچان میں خرابی ہوئی۔" }]);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      startVAD(stream);
    } catch (err) {
      setMessages(prev => [...prev, { sender: "ai", text: "مائیک تک رسائی نہیں مل سکی۔ براہ کرم مائیک کی اجازت دیں۔" }]);
    }
  };

  const stopRecording = () => {
    teardownVAD();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleMicClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleSendMessage = async (customText) => {
    const textToSend = customText || inputMsg;
    if ((!textToSend.trim() && !pendingImage) || loading) return;

    const userMessage = {
      sender: "user",
      text: textToSend || "Find similar products to this image",
      imagePreview: pendingImage?.dataUrl
    };
    setMessages(prev => [...prev, userMessage]);
    if (!customText) setInputMsg("");
    const imageToSend = pendingImage?.dataUrl || null;
    setPendingImage(null);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.text && m.sender)
        .slice(-10)
        .map(m => ({ sender: m.sender, text: m.text }));

      const response = await fetch("/api/copilot/buyer/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend || "Find similar products to this image",
          attached_image: imageToSend,
          history,
          portal_role: "BUYER",
          user_email: currentUser?.email || null,
          user_name: currentUser?.first_name || "Customer"
        })
      });
      const data = await response.json();

      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            sender: "ai",
            text: data.ai_message,
            speechText: data.speech_text || null,
            products: data.products || [],
            orders: data.orders || []
          }
        ]);
      } else {
        setMessages(prev => [...prev, { sender: "ai", text: `Sorry, I ran into an issue: ${data.message}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: "ai", text: `Connection error: Unable to reach Assistant backend.` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product.product_id);
    setAddedItemIds(prev => [...prev, product.product_id]);
    setTimeout(() => {
      setAddedItemIds(prev => prev.filter(id => id !== product.product_id));
    }, 2000);
  };

  return (
    <>
      {/* Floating Widget Launcher Button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white px-5 py-3 rounded-full shadow-2xl hover:shadow-indigo-500/25 transition-all cursor-pointer border border-indigo-400/30"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
          </div>
          <span className="font-bold text-xs tracking-wide">AI Shopping Assistant</span>
        </motion.button>
      </div>

      {/* Slide-Up Chat Window Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-[92vw] sm:w-[420px] h-[580px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[9999] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between border-b border-indigo-900/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-amber-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5 leading-tight">
                    Shopping Assistant
                    <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-400/20 uppercase font-semibold">B2C Retail</span>
                  </h3>
                   <p className="text-[10px] text-slate-300 mt-0.5">Products, orders, budget limits &amp; specs</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors border-0 cursor-pointer bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Suggested Chips */}
            <div className="bg-slate-50 p-2.5 border-b border-slate-200 overflow-x-auto flex gap-2 shrink-0 no-scrollbar">
              {SUGGESTED_PROMPTS.map((promptText, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(promptText)}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-indigo-950 text-[10.5px] font-semibold rounded-full whitespace-nowrap shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  {promptText}
                </button>
              ))}
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white font-medium rounded-br-none shadow-sm"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {msg.imagePreview && (
                      <img
                        src={msg.imagePreview}
                        alt="uploaded"
                        className="w-32 h-32 object-cover rounded-lg mb-2 border border-indigo-300/50"
                      />
                    )}
                    {renderMessageText(msg.text)}
                    {msg.sender === "ai" && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">Urdu AI Voice</span>
                        <TTSPlayButton text={msg.text} speechText={msg.speechText} autoPlay={idx === messages.length - 1} />
                      </div>
                    )}
                  </div>

                  {/* Render Order Cards if available */}
                  {msg.orders && msg.orders.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2 w-full">
                      {msg.orders.map((order, oi) => (
                        <OrderStatusCard key={oi} order={order} />
                      ))}
                    </div>
                  )}

                  {/* Render Product Cards if available */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2.5 w-full">
                      {msg.products.map(product => {
                        const isAdded = addedItemIds.includes(product.product_id);
                        return (
                          <div
                            key={product.product_id}
                            className="bg-white border border-indigo-100 hover:border-indigo-300 rounded-xl p-3 shadow-xs flex items-center justify-between gap-3 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={product.image_url || "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&fit=crop"}
                                alt={product.product_name}
                                className="w-12 h-12 rounded-lg object-cover border border-slate-100 bg-slate-50 shrink-0"
                              />
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{product.product_name}</h4>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {product.brand} • {product.category}
                                </div>
                                <div className="text-xs font-extrabold text-indigo-600 mt-0.5">
                                  {formatCurrency(product.retail_price)}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddToCart(product)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border-0 shrink-0 ${
                                isAdded
                                  ? "bg-emerald-600 text-white"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Check className="w-3 h-3" /> Added
                                </>
                              ) : (
                                <>
                                  <ShoppingBag className="w-3 h-3" /> Add
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs w-fit">
                  <Sparkles className="w-4 h-4 animate-spin text-amber-500" />
                  {"Analyzing" + (messages[messages.length - 1]?.imagePreview ? " your image" : " your query")}...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white border-t border-slate-200 flex flex-col gap-2"
            >
              {/* Image Preview */}
              {pendingImage && (
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2">
                  <img src={pendingImage.dataUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-indigo-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-indigo-800 truncate">📷 {pendingImage.fileName}</p>
                    <p className="text-[9px] text-indigo-500">Visual search ready</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                {/* Hidden file input */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {/* Camera Upload Button */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  title="Upload product photo for visual search"
                  disabled={isRecording || isTranscribing}
                  className="p-2.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-500 rounded-xl transition-all cursor-pointer border-0 shrink-0 disabled:opacity-40"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={isTranscribing || loading}
                  title={isRecording ? "Stop recording" : "Speak your request"}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer border-0 shrink-0 disabled:opacity-40 ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : "bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-500"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder={
                    isRecording ? "سن رہا ہوں... بولیں" :
                    isTranscribing ? "آواز سمجھی جا رہی ہے..." :
                    pendingImage ? "Add a budget or details (optional)..." : "Track order, search products, compare specs..."
                  }
                  disabled={isRecording || isTranscribing}
                  className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 bg-slate-50/50 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={(!inputMsg.trim() && !pendingImage) || loading || isRecording || isTranscribing}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer border-0 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
