/**
 * Mobile web chat app -- a phone-sized, standalone entry point into the same AI copilot the
 * desktop portals use (?page=mobile).
 *
 * Deliberately self-contained: it signs in against /api/auth/login and talks straight to the
 * copilot endpoints, without mounting StoreProvider. The store eagerly fetches products,
 * orders, quotations, invoices, suppliers, payments, stock movements and audit logs on
 * mount, none of which this screen renders -- the copilot already returns the specific
 * products/orders each answer refers to. Skipping it keeps the phone payload small.
 *
 * Account scoping is what makes answers correct: user_email is sent with every message, and
 * the backend scopes orders/quotations/invoices to that account, so a distributor only ever
 * sees their own data.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Send, Mic, Volume2, Square, LogOut, Loader2, Package, Truck,
  Clock, CheckCircle2, XCircle, ShieldCheck, Store, AlertTriangle,
} from "lucide-react";
import { renderMessageText, useSpeech, useVoiceRecorder } from "@/lib/voiceChat";

const SESSION_KEY = "ciq_mobile_session";

const PORTALS = {
  buyer: {
    label: "Buyer",
    icon: Store,
    endpoint: "/api/copilot/buyer/chat",
    role: "BUYER",
    title: "Shopping Assistant",
    subtitle: "Products, prices & your orders",
    greeting:
      "👋 السلام علیکم! میں آپ کا شاپنگ اسسٹنٹ ہوں۔ مصنوعات، قیمتیں یا اپنے آرڈرز کے بارے میں پوچھیں — بول کر یا لکھ کر۔",
    prompts: [
      "Show me all my orders",
      "Show shipped orders",
      "Suggest products under 100,000 PKR",
      "Show today's orders",
    ],
    priceOf: (p) => p.retail_price,
    metaOf: () => null,
  },
  distributor: {
    label: "Distributor",
    icon: ShieldCheck,
    endpoint: "/api/copilot/distributor/chat",
    role: "DISTRIBUTOR",
    title: "Partner Assistant",
    subtitle: "Wholesale rates, quotes & invoices",
    greeting:
      "👋 السلام علیکم! میں آپ کا ڈسٹری بیوٹر کوپائلٹ ہوں۔ تھوک قیمتیں، کوٹیشنز، آرڈرز اور انوائسز کے بارے میں پوچھیں۔",
    prompts: [
      "Show wholesale catalog & rates",
      "Track active negotiations",
      "Show unpaid invoices",
      "Show today's orders",
    ],
    priceOf: (p) => p.wholesale_price ?? p.retail_price,
    metaOf: (p) => (p.min_wholesale_qty ? `MOQ: ${p.min_wholesale_qty}` : null),
  },
};

const money = (v) => `Rs ${Number(v || 0).toLocaleString()}`;

const ORDER_STATUS_CONFIG = {
  PENDING:    { icon: Clock,        cls: "bg-amber-50 border-amber-200 text-amber-600",     label: "Pending" },
  CONFIRMED:  { icon: CheckCircle2, cls: "bg-blue-50 border-blue-200 text-blue-600",        label: "Confirmed" },
  PROCESSING: { icon: Package,      cls: "bg-purple-50 border-purple-200 text-purple-600",  label: "Processing" },
  SHIPPED:    { icon: Truck,        cls: "bg-indigo-50 border-indigo-200 text-indigo-600",  label: "Shipped" },
  DELIVERED:  { icon: CheckCircle2, cls: "bg-emerald-50 border-emerald-200 text-emerald-600", label: "Delivered" },
  CANCELLED:  { icon: XCircle,      cls: "bg-red-50 border-red-200 text-red-600",           label: "Cancelled" },
  REJECTED:   { icon: XCircle,      cls: "bg-red-50 border-red-200 text-red-600",           label: "Rejected" },
  RETURNED:   { icon: Package,      cls: "bg-slate-50 border-slate-200 text-slate-600",     label: "Returned" },
};

function OrderCard({ order }) {
  const status = (order.status || "PENDING").toUpperCase();
  const cfg = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.PENDING;
  const StatusIcon = cfg.icon;
  let items = [];
  try {
    items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
  } catch { items = []; }

  return (
    <div className="border border-slate-200 bg-white rounded-xl p-3 shadow-xs">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-extrabold text-slate-900">{order.order_number || order.order_id}</span>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
          <StatusIcon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>
      {items.slice(0, 3).map((item, i) => (
        <div key={i} className="text-[11px] text-slate-600 flex justify-between gap-2">
          <span className="truncate">{item.product_name || item.sku || "Item"} × {item.quantity || 1}</span>
          <span className="font-semibold shrink-0">{money(item.unit_price || item.price)}</span>
        </div>
      ))}
      {items.length > 3 && <p className="text-[10px] text-slate-400 mt-0.5">+{items.length - 3} more items</p>}
      <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t border-slate-100">
        <span className="text-[10px] text-slate-500">
          {order.order_date ? new Date(order.order_date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : ""}
        </span>
        <span className="text-xs font-extrabold text-slate-900">{money(order.total_amount)}</span>
      </div>
    </div>
  );
}

function ProductCard({ product, cfg }) {
  const meta = cfg.metaOf(product);
  return (
    <div className="bg-white border border-indigo-100 rounded-xl p-3 shadow-xs flex items-center gap-3">
      <img
        src={product.image_url || "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&fit=crop"}
        alt={product.product_name}
        className="w-14 h-14 rounded-lg object-cover border border-slate-100 bg-slate-50 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <h4 className="text-xs font-bold text-slate-900 line-clamp-2">{product.product_name}</h4>
        <div className="text-[10px] text-slate-500 font-medium truncate">
          {product.brand} • {product.category}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm font-extrabold text-indigo-600">{money(cfg.priceOf(product))}</span>
          {meta && <span className="text-[10px] font-semibold text-slate-500">{meta}</span>}
        </div>
      </div>
    </div>
  );
}

function SpeakButton({ text, speechText, autoPlay }) {
  const { isPlaying, toggle } = useSpeech({ text, speechText, autoPlay });
  return (
    <button
      onClick={toggle}
      title={isPlaying ? "Stop voice" : "Listen in Urdu"}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 active:bg-indigo-100 text-indigo-700 text-[11px] font-semibold border border-indigo-200/70 shrink-0"
    >
      {isPlaying ? (
        <><Square className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600" /><span>Stop</span></>
      ) : (
        <><Volume2 className="w-3.5 h-3.5" /><span>Listen</span></>
      )}
    </button>
  );
}

// ─── Login ───────────────────────────────────────────────────────────────────

function MobileLogin({ onSignedIn }) {
  const [portal, setPortal] = useState("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError("");
    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, portal }),
      });
      const data = await resp.json();
      if (data.success && data.user) onSignedIn({ user: data.user, portal });
      else setError(data.message || "Sign in failed.");
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-900 flex flex-col justify-center px-6 py-10">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white text-lg font-extrabold leading-tight">CommerceIQ</h1>
            <p className="text-indigo-300 text-xs font-medium">Mobile AI Assistant</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {Object.entries(PORTALS).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = portal === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPortal(key)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-colors ${
                  active
                    ? "bg-white text-indigo-900 border-white"
                    : "bg-white/5 text-indigo-200 border-white/15"
                }`}
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-indigo-300/70 text-base outline-none focus:border-indigo-400"
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-indigo-300/70 text-base outline-none focus:border-indigo-400"
          />

          {error && (
            <p className="text-red-300 text-xs font-medium bg-red-500/10 border border-red-400/25 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-indigo-500 active:bg-indigo-600 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : `Sign in as ${PORTALS[portal].label}`}
          </button>
        </form>

        <p className="text-indigo-300/70 text-[11px] text-center mt-6 leading-relaxed">
          Use the same account you use on the web portal.
        </p>
      </div>
    </div>
  );
}

// ─── Chat ────────────────────────────────────────────────────────────────────

function MobileChat({ session, onSignOut }) {
  const cfg = PORTALS[session.portal] || PORTALS.buyer;
  const displayName =
    session.user?.first_name?.trim() ||
    session.user?.business_name?.trim() ||
    (session.portal === "distributor" ? "Partner" : "Buyer");

  const [messages, setMessages] = useState([{ sender: "ai", text: cfg.greeting }]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [micNotice, setMicNotice] = useState("");

  const chatEndRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (customText) => {
    const textToSend = (customText ?? inputMsg).trim();
    if (!textToSend || loading) return;

    setMessages(prev => [...prev, { sender: "user", text: textToSend }]);
    setInputMsg("");
    setLoading(true);

    try {
      const history = messagesRef.current
        .filter(m => m.text && m.sender)
        .slice(-10)
        .map(m => ({ sender: m.sender, text: m.text }));

      const response = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history,
          portal_role: cfg.role,
          user_email: session.user?.email || null,
          user_name: displayName,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          sender: "ai",
          text: data.ai_message,
          speechText: data.speech_text || null,
          products: data.products || [],
          orders: data.orders || [],
        }]);
      } else {
        setMessages(prev => [...prev, { sender: "ai", text: data.message || "معذرت، جواب حاصل نہیں ہو سکا۔" }]);
      }
    } catch {
      setMessages(prev => [...prev, { sender: "ai", text: "کنکشن میں مسئلہ ہے۔ براہ کرم دوبارہ کوشش کریں۔" }]);
    } finally {
      setLoading(false);
    }
  }, [inputMsg, loading, cfg, session, displayName]);

  const { isRecording, isTranscribing, toggle: toggleMic, unavailableReason } = useVoiceRecorder({
    onTranscript: (text) => sendMessage(text),
    onError: (msg) => setMicNotice(msg),
  });

  const micBusy = isRecording || isTranscribing;

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-indigo-950 text-white px-4 py-3 flex items-center gap-3 shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-extrabold leading-tight truncate">{cfg.title}</h1>
          <p className="text-[11px] text-indigo-300 truncate">{displayName} • {cfg.subtitle}</p>
        </div>
        <button
          onClick={onSignOut}
          title="Sign out"
          className="p-2 rounded-lg active:bg-white/10 text-indigo-200 shrink-0"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Mic availability warning -- shown once, up front, because the fix is environmental */}
      {unavailableReason === "insecure" && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Voice input needs a secure (HTTPS) connection. You can still type your questions.
          </p>
        </div>
      )}

      {/* Suggested prompts */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex gap-2 overflow-x-auto shrink-0">
        {cfg.prompts.map((p, i) => (
          <button
            key={i}
            onClick={() => sendMessage(p)}
            className="px-3 py-1.5 bg-slate-50 active:bg-indigo-50 border border-slate-200 text-indigo-950 text-[11px] font-semibold rounded-full whitespace-nowrap shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-indigo-600 text-white font-medium rounded-br-sm"
                  : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm"
              }`}
            >
              {msg.sender === "user" ? <p className="text-left">{msg.text}</p> : renderMessageText(msg.text)}

              {msg.sender === "ai" && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">Urdu AI Voice</span>
                  <SpeakButton
                    text={msg.text}
                    speechText={msg.speechText}
                    autoPlay={idx === messages.length - 1 && idx !== 0}
                  />
                </div>
              )}
            </div>

            {msg.orders?.length > 0 && (
              <div className="mt-2 grid grid-cols-1 gap-2 w-full">
                {msg.orders.map((o, i) => <OrderCard key={i} order={o} />)}
              </div>
            )}

            {msg.products?.length > 0 && (
              <div className="mt-2 grid grid-cols-1 gap-2 w-full">
                {msg.products.map((p, i) => <ProductCard key={p.product_id || i} product={p} cfg={cfg} />)}
              </div>
            )}
          </div>
        ))}

        {(loading || isTranscribing) && (
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            {isTranscribing ? "آواز سمجھی جا رہی ہے…" : "سوچ رہا ہوں…"}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {micNotice && (
        <div className="px-3 pb-1 shrink-0">
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {micNotice}
          </p>
        </div>
      )}

      {/* Composer */}
      <div className="bg-white border-t border-slate-200 px-3 py-2.5 flex items-center gap-2 shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => { setMicNotice(""); toggleMic(); }}
          disabled={loading}
          title={isRecording ? "Stop recording" : "Speak your question"}
          className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 ${
            isRecording ? "bg-red-500 text-white animate-pulse" : "bg-indigo-50 text-indigo-600 active:bg-indigo-100"
          }`}
        >
          {isTranscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
        </button>

        <input
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
          disabled={micBusy}
          placeholder={isRecording ? "سن رہا ہوں…" : "Ask about products, orders…"}
          // text-base (16px) keeps iOS Safari from auto-zooming the page on focus
          className="flex-1 min-w-0 px-4 py-2.5 rounded-full bg-slate-100 border border-slate-200 text-base outline-none focus:border-indigo-400 disabled:opacity-60"
        />

        <button
          onClick={() => sendMessage()}
          disabled={loading || !inputMsg.trim()}
          title="Send"
          className="w-11 h-11 rounded-full bg-indigo-600 active:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export default function MobileChatApp() {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.user?.email ? parsed : null;
    } catch {
      return null;
    }
  });

  const signIn = (next) => {
    setSession(next);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(next)); } catch {}
  };

  const signOut = () => {
    setSession(null);
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  };

  if (!session) return <MobileLogin onSignedIn={signIn} />;
  // Remount on account/portal switch so chat history never carries across sessions.
  return <MobileChat key={`${session.portal}:${session.user?.email}`} session={session} onSignOut={signOut} />;
}
