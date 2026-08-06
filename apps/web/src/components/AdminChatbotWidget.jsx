/**
 * Admin Copilot chat widget -- voice-driven, end-to-end control of the admin portal.
 *
 * Adds to the previous inline admin chat:
 *   - Urdu voice in (hands-free mic + VAD + STT) and out (streaming XTTS), shared with the
 *     buyer/distributor widgets via lib/voiceChat.
 *   - Inline action buttons on the records an answer returned, so an admin can approve /
 *     reject / ship an order, or approve / reject / counter a quotation, without leaving
 *     chat to go find the record.
 *
 * Mutating actions deliberately go through a separate endpoint that takes an explicit
 * action + record id (never inferred from the message text): a mistranscribed voice command
 * must not be able to approve an order by itself. Every destructive action confirms first.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Send, Mic, Volume2, Square, X, Loader2, Camera, Trash2,
  CheckCircle2, XCircle, Truck, Handshake, AlertTriangle, Minimize2,
} from "lucide-react";
import { renderMessageText, useSpeech, useVoiceRecorder } from "@/lib/voiceChat";

const SUGGESTED_PROMPTS = [
  "Which products are low stock?",
  "Show unpaid invoices",
  "Show today's shipped distributor orders",
  "Show pending quotations",
  "Show rejected orders",
  "Show distributors in USA",
];

const money = (v) => `Rs ${Number(v || 0).toLocaleString()}`;

function SpeakButton({ text, speechText, autoPlay }) {
  const { isPlaying, toggle } = useSpeech({ text, speechText, autoPlay });
  return (
    <button
      onClick={toggle}
      title={isPlaying ? "Stop voice" : "Listen in Urdu"}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold border border-indigo-200/70 shrink-0 cursor-pointer"
    >
      {isPlaying
        ? <><Square className="w-3 h-3 fill-indigo-600" /><span>Stop</span></>
        : <><Volume2 className="w-3 h-3" /><span>Listen</span></>}
    </button>
  );
}

/** Inline approve/reject/ship/counter controls for one record. */
function ActionRow({ kind, record, onAction, busyId }) {
  const id = kind === "order"
    ? (record.order_number || record.order_id)
    : (record.quotation_number || record.quotation_id);
  const status = String(record.status || "").toUpperCase();
  const busy = busyId === id;

  // Only offer transitions that make sense for the record's current state -- showing
  // "Approve" on an already-shipped order invites errors the backend would just reject.
  const actions = [];
  if (kind === "order") {
    if (!["APPROVED", "SHIPPED", "DELIVERED", "REJECTED", "CANCELLED"].includes(status)) {
      actions.push({ key: "approve_order", label: "Approve", Icon: CheckCircle2, cls: "bg-emerald-600 hover:bg-emerald-700" });
    }
    if (!["SHIPPED", "DELIVERED", "REJECTED", "CANCELLED"].includes(status)) {
      actions.push({ key: "reject_order", label: "Reject", Icon: XCircle, cls: "bg-red-600 hover:bg-red-700", confirm: true });
    }
    if (["APPROVED", "CONFIRMED", "PROCESSING", "PENDING"].includes(status)) {
      actions.push({ key: "ship_order", label: "Ship", Icon: Truck, cls: "bg-indigo-600 hover:bg-indigo-700" });
    }
  } else {
    if (!["APPROVED", "ACCEPTED", "REJECTED"].includes(status)) {
      actions.push({ key: "approve_quotation", label: "Approve", Icon: CheckCircle2, cls: "bg-emerald-600 hover:bg-emerald-700" });
      actions.push({ key: "reject_quotation", label: "Reject", Icon: XCircle, cls: "bg-red-600 hover:bg-red-700", confirm: true });
      actions.push({ key: "counter_quotation", label: "Counter", Icon: Handshake, cls: "bg-amber-600 hover:bg-amber-700", needsPrice: true });
    }
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1.5 pt-1.5 border-t border-slate-100">
      <span className="text-[10px] font-bold text-slate-500 mr-0.5">{id}</span>
      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">{status}</span>
      {actions.map(({ key, label, Icon, cls, confirm, needsPrice }) => (
        <button
          key={key}
          disabled={busy}
          onClick={() => onAction({ action: key, id, confirm, needsPrice, record })}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-white text-[10px] font-bold disabled:opacity-50 cursor-pointer ${cls}`}
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
          {label}
        </button>
      ))}
    </div>
  );
}

export default function AdminChatbotWidget({ currentUser, onProductCreated, onDataChanged }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [messages, setMessages] = useState([{
    sender: "ai",
    text: "👋 السلام علیکم! میں آپ کا CIQ ایڈمن کوپائلٹ ہوں۔ آپ بول کر یا لکھ کر پوچھ سکتے ہیں — کم اسٹاک، آرڈرز، انوائسز، کوٹیشنز، ڈسٹری بیوٹرز۔ آرڈرز اور کوٹیشنز یہیں سے منظور یا مسترد بھی کر سکتے ہیں۔",
  }]);

  const chatEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    if (isOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, loading]);

  const displayName = currentUser?.first_name || "Admin";

  const sendMessage = useCallback(async (customText) => {
    const textToSend = (customText ?? inputMsg).trim();
    if ((!textToSend && !pendingImage) || loading) return;

    const img = pendingImage?.dataUrl || "";
    setMessages(prev => [...prev, { sender: "user", text: textToSend, imagePreview: img }]);
    setInputMsg("");
    setPendingImage(null);
    setLoading(true);

    try {
      // Drop the canned greeting (index 0) and keep only the recent turns.
      const history = messagesRef.current
        .slice(1)
        .slice(-10)
        .map(m => ({ sender: m.sender, text: m.text }));

      const resp = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history,
          attached_image: img,
          portal_role: "ADMIN",
          user_name: displayName,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        setMessages(prev => [...prev, { sender: "ai", text: `❌ Copilot service error: ${errText.slice(0, 200)}` }]);
        return;
      }

      const data = await resp.json();
      if (data.action_executed === "createProduct" && data.product) onProductCreated?.(data.product);

      setMessages(prev => [...prev, {
        sender: "ai",
        text: data.ai_message || "Processed.",
        speechText: data.speech_text || null,
        orders: data.orders || [],
        quotations: data.quotations || [],
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: "ai", text: `❌ Connection error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }, [inputMsg, pendingImage, loading, displayName, onProductCreated]);

  const { isRecording, isTranscribing, toggle: toggleMic, unavailableReason } = useVoiceRecorder({
    onTranscript: (text) => sendMessage(text),
    onError: (m) => setNotice(m),
  });

  const handleAction = useCallback(async ({ action, id, confirm, needsPrice, record }) => {
    if (confirm && !window.confirm(`Are you sure you want to ${action.replace(/_/g, " ")} ${id}?`)) return;

    let value = null;
    if (needsPrice) {
      const current = record.unit_price || record.total_amount || "";
      const entered = window.prompt(`Counter-offer unit price for ${id} (PKR):`, current);
      if (entered === null) return;
      value = Number(String(entered).replace(/[^\d.]/g, ""));
      if (!value || isNaN(value)) { setNotice("A valid numeric price is required for a counter offer."); return; }
    }

    setBusyId(id);
    setNotice("");
    try {
      const resp = await fetch("/api/copilot/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target_id: id, value, portal_role: "ADMIN" }),
      });
      const data = await resp.json();
      setMessages(prev => [...prev, {
        sender: "ai",
        text: data.success ? data.message : `❌ ${data.error || "Action failed."}`,
        speechText: data.success ? data.message : null,
      }]);
      if (data.success) onDataChanged?.();
    } catch (err) {
      setMessages(prev => [...prev, { sender: "ai", text: `❌ Action failed: ${err.message}` }]);
    } finally {
      setBusyId(null);
    }
  }, [onDataChanged]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPendingImage({ dataUrl: reader.result, fileName: file.name });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg cursor-pointer"
      >
        <Sparkles className="w-5 h-5" />
        Admin Copilot
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[640px] max-h-[calc(100vh-3rem)] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <header className="bg-indigo-950 text-white px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-bold text-xs tracking-wide block">CIQ Admin Copilot</span>
          <span className="text-[11px] text-indigo-300">Voice control • orders, invoices, quotes</span>
        </div>
        <button onClick={() => setIsOpen(false)} title="Minimize" className="p-1.5 rounded-lg hover:bg-white/10 text-indigo-200 cursor-pointer">
          <Minimize2 className="w-4 h-4" />
        </button>
        <button onClick={() => setIsOpen(false)} title="Close" className="p-1.5 rounded-lg hover:bg-white/10 text-indigo-200 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </header>

      {unavailableReason === "insecure" && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 flex items-start gap-2 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-800">Voice input needs an HTTPS connection. Typing still works.</p>
        </div>
      )}

      {/* Suggested prompts */}
      <div className="bg-slate-50 border-b border-slate-200 px-2 py-2 flex gap-1.5 overflow-x-auto shrink-0">
        {SUGGESTED_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => sendMessage(p)}
            className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-950 text-[10px] font-semibold rounded-full whitespace-nowrap shrink-0 cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
              msg.sender === "user"
                ? "bg-indigo-600 text-white font-medium rounded-br-sm"
                : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm"
            }`}>
              {msg.imagePreview && (
                <img src={msg.imagePreview} alt="attached" className="w-28 h-28 object-cover rounded-lg mb-1.5 border border-indigo-300/50" />
              )}
              {msg.sender === "user" ? <p className="text-left">{msg.text}</p> : renderMessageText(msg.text)}

              {msg.sender === "ai" && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">Urdu AI Voice</span>
                  <SpeakButton text={msg.text} speechText={msg.speechText} autoPlay={idx === messages.length - 1 && idx !== 0} />
                </div>
              )}
            </div>

            {/* Inline actions for whatever this answer returned */}
            {(msg.orders?.length > 0 || msg.quotations?.length > 0) && (
              <div className="mt-1.5 w-full bg-white border border-slate-200 rounded-xl p-2 space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-0.5">Quick actions</p>
                {msg.orders?.slice(0, 8).map((o, i) => (
                  <ActionRow key={`o${i}`} kind="order" record={o} onAction={handleAction} busyId={busyId} />
                ))}
                {msg.quotations?.slice(0, 8).map((q, i) => (
                  <ActionRow key={`q${i}`} kind="quotation" record={q} onAction={handleAction} busyId={busyId} />
                ))}
              </div>
            )}
          </div>
        ))}

        {(loading || isTranscribing) && (
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {isTranscribing ? "آواز سمجھی جا رہی ہے…" : "Copilot is thinking…"}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {notice && (
        <div className="px-3 pb-1 shrink-0">
          <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">{notice}</p>
        </div>
      )}

      {pendingImage && (
        <div className="px-3 pb-1 shrink-0 flex items-center gap-2">
          <img src={pendingImage.dataUrl} alt="pending" className="w-9 h-9 rounded object-cover border border-slate-200" />
          <span className="text-[10px] text-slate-600 truncate flex-1">{pendingImage.fileName}</span>
          <button onClick={() => setPendingImage(null)} className="p-1 text-slate-400 hover:text-red-500 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="bg-white border-t border-slate-200 px-2.5 py-2 flex items-center gap-1.5 shrink-0">
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        <button
          onClick={() => imageInputRef.current?.click()}
          title="Attach image"
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setNotice(""); toggleMic(); }}
          disabled={loading}
          title={isRecording ? "Stop recording" : "Speak your question"}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer ${
            isRecording ? "bg-red-500 text-white animate-pulse" : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600"
          }`}
        >
          {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
        </button>
        <input
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
          disabled={isRecording || isTranscribing}
          placeholder={isRecording ? "سن رہا ہوں…" : "Ask about stock, orders, invoices…"}
          className="flex-1 min-w-0 px-3 py-2 rounded-full bg-slate-100 border border-slate-200 text-xs outline-none focus:border-indigo-400 disabled:opacity-60"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || (!inputMsg.trim() && !pendingImage)}
          title="Send"
          className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
