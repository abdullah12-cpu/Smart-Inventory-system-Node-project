/**
 * Shared chat primitives: Urdu markdown rendering, XTTS-v2 streaming playback, and
 * hands-free mic capture (VAD + speech-to-text).
 *
 * Extracted from BuyerChatbotWidget so the mobile chat app doesn't become a third copy of
 * this logic. The two existing desktop widgets still carry their own inline copies -- they
 * work and are stable, so they were intentionally left untouched here; migrating them onto
 * this module is a safe follow-up, not a prerequisite.
 */

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Markdown rendering ──────────────────────────────────────────────────────

/**
 * The formatted output below is injected via dangerouslySetInnerHTML, and its input is LLM
 * output -- which in practice does emit stray angle brackets and half-formed tags when it
 * garbles a reply. Escaping first means only the tags parseInline itself adds can ever
 * reach the DOM; anything the model produced renders as literal text.
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function parseInline(rawText) {
  let text = escapeHtml(rawText);
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+?)\*/g, "<em>$1</em>");
  text = text.replace(
    /`([^`]+)`/g,
    '<code class="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded text-[10px] font-mono">$1</code>'
  );
  return text;
}

/**
 * Renders the assistant's markdown reply (headings, bullets, numbered lists, and the
 * pipe-delimited tables used for orders/invoices/quotations) as React elements.
 * Tables scroll horizontally so a wide 5-column table can't blow out a phone's layout.
 */
export function renderMessageText(text) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const headers = tableLines[0].split("|").slice(1, -1).map(h => h.trim());
        const dataRows = tableLines.slice(2).map(r => r.split("|").slice(1, -1).map(c => c.trim()));
        elements.push(
          <div key={i} className="overflow-x-auto my-2 border border-slate-200 rounded-lg shadow-sm bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-[10px]">
              <thead className="bg-slate-50">
                <tr>
                  {headers.map((h, idx) => (
                    <th key={idx} className="px-2 py-1.5 font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx}>
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

    if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
      const offset = trimmed.startsWith("### ") ? 4 : 3;
      elements.push(
        <p key={i} className="font-bold text-slate-900 text-sm mt-2 mb-1" dangerouslySetInnerHTML={{ __html: parseInline(trimmed.slice(offset)) }} />
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-1.5 items-start ml-1 my-0.5">
          <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
          <span className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: parseInline(trimmed.slice(2)) }} />
        </div>
      );
      i++;
      continue;
    }

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

    elements.push(
      <p key={i} className="text-slate-700 leading-relaxed my-0.5" dangerouslySetInnerHTML={{ __html: parseInline(trimmed) }} />
    );
    i++;
  }

  return <div className="space-y-0.5 text-left text-xs">{elements}</div>;
}

// ─── Text-to-speech ──────────────────────────────────────────────────────────

/**
 * Fallback speech text for replies that arrive without a server-provided `speech_text`.
 * Strips markdown/tables/URLs and converts PKR amounts to spoken Urdu. Prefer the
 * backend's `speech_text` whenever present -- tables never reduce cleanly to speech.
 */
export function cleanForSpeech(raw) {
  if (!raw) return "";
  let text = raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\|.*?\|/g, "")
    .replace(/^\s*[-|#*>]+\s*/gm, "")
    .replace(/[*_#`~]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/Rs\.?\s*([\d,]+)/gi, (_, n) => n.replace(/,/g, "") + " روپے")
    .replace(/PKR\s*([\d,]+)/gi, (_, n) => n.replace(/,/g, "") + " روپے")
    .replace(/\n{2,}/g, "۔ ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const MAX_SPEECH_CHARS = 500;
  if (text.length > MAX_SPEECH_CHARS) {
    const sentences = text.split(/(?<=[۔!؟?.])\s*/);
    let capped = "";
    for (const s of sentences) {
      if ((capped + s).length > MAX_SPEECH_CHARS) break;
      capped += (capped ? " " : "") + s;
    }
    text = capped.trim() || text.substring(0, MAX_SPEECH_CHARS).trim();
  }
  return text;
}

// XTTS streaming wire format: one 44-byte WAV header with placeholder sizes, then
// continuous raw PCM (signed 16-bit little-endian, mono, 24000 Hz, no per-chunk framing).
const XTTS_STREAM_SAMPLE_RATE = 24000;
const XTTS_WAV_HEADER_BYTES = 44;

/**
 * Streams TTS audio and schedules PCM chunks back-to-back via the Web Audio API as they
 * arrive, so playback starts after the first chunk (~0.3s) rather than waiting for the
 * whole utterance to generate (~2-5s).
 */
export async function playStreamingTTS(fullText, { stopRef, onFirstAudio, onEnded }) {
  const resp = await fetch("/api/copilot/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: fullText, voice: "ur-PK-UzmaNeural", stream: true }),
    signal: AbortSignal.timeout(120000),
  });
  if (!resp.ok || resp.status === 204 || !resp.body) throw new Error("stream unavailable");

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx();
  // iOS Safari starts new AudioContexts suspended unless created inside a user gesture;
  // resuming explicitly keeps tap-to-play working on iPhone.
  if (audioCtx.state === "suspended") await audioCtx.resume().catch(() => {});

  const activeSources = [];
  let nextStartTime = 0;
  let headerSkipped = false;
  let leftoverByte = null;
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

  const remainingMs = Math.max(0, (nextStartTime - audioCtx.currentTime) * 1000);
  const waitAndEnd = () =>
    new Promise(resolve => setTimeout(resolve, remainingMs)).then(() => onEnded?.());

  return {
    stop: () => {
      activeSources.forEach(s => { try { s.stop(); } catch {} });
      audioCtx.close().catch(() => {});
    },
    finished: scheduledSamples > 0 ? waitAndEnd() : Promise.resolve().then(() => onEnded?.()),
  };
}

/**
 * Speech playback for one message. Prefers the server's short `speechText` and falls back
 * to stripping markdown out of the display text.
 */
export function useSpeech({ text, speechText, autoPlay = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const stopRef = useRef(false);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  const spokenText = speechText || cleanForSpeech(text);

  const stopAll = useCallback(() => {
    stopRef.current = true;
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.src = ""; } catch {}
      audioRef.current = null;
    }
    if (streamRef.current) {
      try { streamRef.current.stop(); } catch {}
      streamRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playFullBlob = useCallback(async (fullText) => {
    try {
      const resp = await fetch("/api/copilot/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullText, voice: "ur-PK-UzmaNeural" }),
        signal: AbortSignal.timeout(120000),
      });
      if (!resp.ok || resp.status === 204 || stopRef.current) { setIsPlaying(false); return; }
      const blob = await resp.blob();
      if (!blob.size || stopRef.current) { setIsPlaying(false); return; }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const play = useCallback(async () => {
    if (!spokenText) return;
    stopRef.current = false;
    setIsPlaying(true);
    try {
      const handle = await playStreamingTTS(spokenText, {
        stopRef,
        onEnded: () => { if (!stopRef.current) setIsPlaying(false); },
      });
      streamRef.current = handle;
      await handle.finished;
    } catch {
      if (!stopRef.current) await playFullBlob(spokenText);
    }
  }, [spokenText, playFullBlob]);

  const toggle = useCallback(() => {
    if (isPlaying) stopAll();
    else play();
  }, [isPlaying, stopAll, play]);

  useEffect(() => {
    if (!autoPlay) return;
    const t = setTimeout(() => play(), 300);
    return () => { clearTimeout(t); stopAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isPlaying, toggle, stop: stopAll };
}

// ─── Speech-to-text (hands-free mic) ─────────────────────────────────────────

/**
 * Why the mic may be unusable before we even ask for permission. Browsers expose
 * getUserMedia only in a secure context, so a phone opening the app over plain
 * http://<laptop-ip>:5173 gets no mic at all -- worth reporting explicitly instead of
 * failing with a generic "permission denied" the user can't act on.
 */
export function getMicUnavailableReason() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  if (typeof MediaRecorder === "undefined") return "unsupported";
  return null;
}

/**
 * Hands-free voice capture: records from the mic, auto-stops on a pause via voice activity
 * detection, sends the clip to the STT service, and hands back the transcript.
 */
/**
 * `language` is intentionally null by default: users here mix English, Urdu and Roman Urdu
 * freely, and pinning the decoder to one language forces Whisper to interpret the other as
 * that language. Auto-detection is the safer default; pass a code only to override it.
 */
export function useVoiceRecorder({ onTranscript, onError, language = null }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const vadAudioCtxRef = useRef(null);
  const vadRafRef = useRef(null);
  const stopRecordingRef = useRef(() => {});

  const unavailableReason = getMicUnavailableReason();

  const teardownVAD = useCallback(() => {
    if (vadRafRef.current) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    if (vadAudioCtxRef.current) {
      vadAudioCtxRef.current.close().catch(() => {});
      vadAudioCtxRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    teardownVAD();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, [teardownVAD]);

  stopRecordingRef.current = stopRecording;

  // Watches mic loudness and stops the moment the speaker goes quiet, so there's no manual
  // "stop" tap and no dead air padding the round trip.
  const startVAD = useCallback((stream) => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioCtx();
    vadAudioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const SILENCE_RMS_THRESHOLD = 8;
    const SILENCE_HANG_MS = 900;
    const MAX_RECORDING_MS = 15000;
    const startedAt = Date.now();
    let hasSpoken = false;
    let silenceSince = null;

    const tick = () => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") return;

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
          stopRecordingRef.current();
          return;
        }
      }

      if (Date.now() - startedAt > MAX_RECORDING_MS) {
        stopRecordingRef.current();
        return;
      }

      vadRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startRecording = useCallback(async () => {
    if (unavailableReason) {
      onError?.(
        unavailableReason === "insecure"
          ? "مائیک صرف محفوظ (HTTPS) کنکشن پر کام کرتا ہے۔ براہ کرم HTTPS لنک استعمال کریں یا ٹائپ کر کے پوچھیں۔"
          : "اس براؤزر میں مائیک دستیاب نہیں ہے۔ براہ کرم ٹائپ کر کے پوچھیں۔"
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        teardownVAD();
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 1500) { setIsRecording(false); return; } // too short / no speech

        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const resp = await fetch("/api/copilot/stt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: dataUrl, language }),
            signal: AbortSignal.timeout(30000),
          });
          const data = await resp.json();
          if (data.success && data.text) onTranscript?.(data.text);
          else onError?.("معذرت، آواز سمجھ نہیں آئی۔ براہ کرم دوبارہ بولیں۔");
        } catch {
          onError?.("معذرت، آواز کی پہچان میں خرابی ہوئی۔");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      startVAD(stream);
    } catch {
      onError?.("مائیک تک رسائی نہیں مل سکی۔ براہ کرم مائیک کی اجازت دیں۔");
    }
  }, [unavailableReason, onTranscript, onError, language, startVAD, teardownVAD]);

  const toggle = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, stopRecording, startRecording]);

  useEffect(() => () => {
    teardownVAD();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
  }, [teardownVAD]);

  return { isRecording, isTranscribing, toggle, unavailableReason };
}
