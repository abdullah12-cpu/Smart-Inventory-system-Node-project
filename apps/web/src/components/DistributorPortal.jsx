import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useMemo, useEffect } from "react";
import {
  Package,
  FileText,
  FileSpreadsheet,
  LogOut,
  DollarSign,
  Search,
  CheckCircle,
  Clock,
  ShoppingCart,
  Bell,
  User,
  Download,
  UploadCloud,
  CreditCard,
  AlertCircle,
  Receipt,
  Sparkles,
  Send,
  Paperclip,
  Bot,
  MessageSquare,
  Trash2,
  Camera,
  ShoppingBag,
  X,
  Truck
} from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { KpiCard, OrderStatusBadge, InvoiceStatusBadge, LatePaymentRiskBadge, Badge } from "@/components/ui";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate } from "@/lib/data";

function parseInline(text) {
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
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
          /* @__PURE__ */ jsx("div", {
            className: "overflow-x-auto my-2 border border-slate-200 rounded-lg shadow-sm bg-white",
            children: /* @__PURE__ */ jsxs("table", {
              className: "min-w-full divide-y divide-slate-200 text-[10px]",
              children: [
                /* @__PURE__ */ jsx("thead", {
                  className: "bg-slate-50",
                  children: /* @__PURE__ */ jsx("tr", {
                    children: headers.map((h, idx) => /* @__PURE__ */ jsx("th", { className: "px-2 py-1.5 font-bold text-slate-600 uppercase tracking-wider text-left", children: h }, idx))
                  })
                }),
                /* @__PURE__ */ jsx("tbody", {
                  className: "bg-white divide-y divide-slate-100",
                  children: dataRows.map((row, rIdx) => /* @__PURE__ */ jsx("tr", {
                    className: "hover:bg-slate-50",
                    children: row.map((cell, cIdx) => /* @__PURE__ */ jsx("td", { className: "px-2 py-1.5 text-slate-700 font-medium whitespace-nowrap text-left", children: cell }, cIdx))
                  }, rIdx))
                })
              ]
            })
          }, i)
        );
      }
      continue;
    }

    // H3 heading: ### text
    if (trimmed.startsWith('### ')) {
      elements.push(
        /* @__PURE__ */ jsx("p", {
          className: "font-bold text-slate-900 text-sm mt-2 mb-1 text-left",
          dangerouslySetInnerHTML: { __html: parseInline(trimmed.slice(4)) }
        }, i)
      );
      i++;
      continue;
    }

    // H2 heading: ## text
    if (trimmed.startsWith('## ')) {
      elements.push(
        /* @__PURE__ */ jsx("p", {
          className: "font-bold text-slate-900 text-sm mt-2 mb-1 text-left",
          dangerouslySetInnerHTML: { __html: parseInline(trimmed.slice(3)) }
        }, i)
      );
      i++;
      continue;
    }

    // Bullet list item: - text
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        /* @__PURE__ */ jsxs("div", {
          className: "flex gap-1.5 items-start ml-1 my-0.5 text-left",
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-indigo-400 mt-0.5 shrink-0", children: "•" }),
            /* @__PURE__ */ jsx("span", { className: "text-slate-700 leading-relaxed", dangerouslySetInnerHTML: { __html: parseInline(trimmed.slice(2)) } })
          ]
        }, i)
      );
      i++;
      continue;
    }

    // Numbered list: 1. text or **1. text**
    const numMatch = trimmed.match(/^\*?\*?(\d+)\.\s+(.*?)\*?\*?$/);
    if (numMatch) {
      elements.push(
        /* @__PURE__ */ jsxs("div", {
          className: "flex gap-1.5 items-start ml-1 my-1 text-left",
          children: [
            /* @__PURE__ */ jsxs("span", { className: "text-indigo-600 font-bold shrink-0 min-w-[16px]", children: [numMatch[1], "."] }),
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-slate-900 leading-relaxed", dangerouslySetInnerHTML: { __html: parseInline(numMatch[2]) } })
          ]
        }, i)
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      /* @__PURE__ */ jsx("p", {
        className: "text-slate-700 leading-relaxed my-0.5 text-left",
        dangerouslySetInnerHTML: { __html: parseInline(trimmed) }
      }, i)
    );
    i++;
  }

  return /* @__PURE__ */ jsx("div", { className: "space-y-0.5 text-left text-xs", children: elements });
}

const ORDER_STATUS_CONFIG = {
  PENDING:    { icon: Clock,        color: 'text-amber-500',  bg: 'bg-amber-50  border-amber-200',  label: 'Pending'    },
  CONFIRMED:  { icon: CheckCircle,  color: 'text-blue-500',   bg: 'bg-blue-50   border-blue-200',   label: 'Confirmed'  },
  PROCESSING: { icon: Package,      color: 'text-purple-500', bg: 'bg-purple-50 border-purple-200', label: 'Processing' },
  SHIPPED:    { icon: Truck,        color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200', label: 'Shipped'    },
  DELIVERED:  { icon: CheckCircle,  color: 'text-emerald-500',bg: 'bg-emerald-50 border-emerald-200',label: 'Delivered' },
  CANCELLED:  { icon: AlertCircle,  color: 'text-red-500',   bg: 'bg-red-50    border-red-200',    label: 'Cancelled'  },
  RETURNED:   { icon: Package,      color: 'text-slate-500',  bg: 'bg-slate-50  border-slate-200',  label: 'Returned'   },
};

function OrderStatusCard({ order }) {
  const status = (order.status || 'PENDING').toUpperCase();
  const cfg = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.PENDING;
  const StatusIcon = cfg.icon;
  let items = [];
  try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch { items = []; }

  return /* @__PURE__ */ jsxs("div", {
    className: `border rounded-xl p-3 mt-1 ${cfg.bg} shadow-xs text-left`,
    children: [
      /* @__PURE__ */ jsxs("div", {
        className: "flex items-center justify-between mb-2",
        children: [
          /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider", children: "Order" }),
          /* @__PURE__ */ jsxs("span", {
            className: `flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`,
            children: [
              /* @__PURE__ */ jsx(StatusIcon, { className: "w-3 h-3" }),
              cfg.label
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsx("p", { className: "text-xs font-extrabold text-slate-900 mb-1", children: order.order_number || order.order_id }),
      items.length > 0 && /* @__PURE__ */ jsxs("div", {
        className: "space-y-0.5 mb-2",
        children: [
          items.slice(0, 3).map((item, i) => /* @__PURE__ */ jsxs("div", {
            className: "text-[10px] text-slate-600 flex justify-between",
            children: [
              /* @__PURE__ */ jsxs("span", { className: "truncate max-w-[140px]", children: [item.product_name || item.sku || 'Item', " × ", item.quantity || 1] }),
              /* @__PURE__ */ jsxs("span", { className: "font-semibold", children: ["Rs ", parseFloat(item.unit_price || item.price || 0).toLocaleString()] })
            ]
          }, i)),
          items.length > 3 && /* @__PURE__ */ jsxs("p", { className: "text-[9px] text-slate-400", children: ["+", items.length - 3, " more items"] })
        ]
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "flex justify-between items-center pt-1.5 border-t border-current/10",
        children: [
          /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-500", children: order.order_date ? new Date(order.order_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '' }),
          /* @__PURE__ */ jsxs("span", { className: "text-xs font-extrabold text-slate-900", children: ["Rs ", parseFloat(order.total_amount || 0).toLocaleString()] })
        ]
      })
    ]
  });
}
const MOCK_QUOTATIONS = [];
const MOCK_LEDGER = [
  {
    id: "l1",
    ts: "2026-06-20T00:00:00Z",
    ref_type: "invoice",
    ref_id: "INV-2026-00004",
    debit: 98e4,
    credit: 0,
    running_balance: 98e4
  },
  {
    id: "l2",
    ts: "2026-06-22T00:00:00Z",
    ref_type: "payment",
    ref_id: "EP-445610-TX",
    debit: 0,
    credit: 1e5,
    running_balance: 88e4
  },
  {
    id: "l3",
    ts: "2026-06-28T00:00:00Z",
    ref_type: "invoice",
    ref_id: "INV-2026-00003",
    debit: 1368800,
    credit: 0,
    running_balance: 2248800
  },
  {
    id: "l4",
    ts: "2026-06-29T00:00:00Z",
    ref_type: "payment",
    ref_id: "HBL-TXN-299301",
    debit: 0,
    credit: 1368800,
    running_balance: 88e4
  }
];
const MOCK_REMINDERS = [
  {
    id: "r1",
    ref_id: "INV-2026-00004",
    channel: "EMAIL",
    tone: "POLITE",
    sent_at: "2026-06-25T10:00:00Z",
    status: "OPENED",
    response: "PROMISED_TO_PAY"
  },
  {
    id: "r2",
    ref_id: "INV-2026-00004",
    channel: "WHATSAPP",
    tone: "FIRM",
    sent_at: "2026-06-28T14:30:00Z",
    status: "DELIVERED",
    response: "NO_RESPONSE"
  }
];
function QuoteStatusBadge({ status }) {
  const styles = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200 font-bold",
    SENT: "bg-blue-50 text-blue-700 border-blue-200 font-bold",
    NEGOTIATING: "bg-amber-100 text-amber-900 border-amber-300 font-extrabold shadow-2xs animate-pulse",
    COUNTER_OFFER_RECEIVED: "bg-amber-100 text-amber-900 border-amber-300 font-extrabold shadow-2xs animate-pulse",
    ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
    REJECTED: "bg-red-50 text-red-700 border-red-200 font-bold",
    EXPIRED: "bg-stone-50 text-stone-700 border-stone-200 font-bold",
    CONVERTED: "bg-purple-50 text-purple-700 border-purple-200 font-bold"
  };
  let label = status;
  if (status === "COUNTER_OFFER_RECEIVED" || status === "NEGOTIATING") {
    label = "NEGOTIATING";
  }
  return /* @__PURE__ */ jsx(
    "span",
    {
      className: `px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider border ${styles[status] || styles.NEGOTIATING}`,
      children: label
    }
  );
}
export default function DistributorPortal({ onLogout }) {
  const { orders, products, quotations, setQuotations, setOrders, submitQuotationRequest, updateQuotationStatus, invoices, recordPaymentAllocation, currentUser, placeOrder } = useStore();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) return tab;
    return localStorage.getItem("ciq_distributor_activeTab") || "catalog";
  });
  useEffect(() => {
    localStorage.setItem("ciq_distributor_activeTab", activeTab);
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== activeTab) {
      params.set("tab", activeTab);
      window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
    }
    const partnerName = currentUser ? `${currentUser.first_name}`.trim() : "Partner";
    setChatMessages([
      {
        sender: "ai",
        text: `Hello ${partnerName}! I am your CIQ Distributor Copilot. I can help you check wholesale prices, check inventory stock, track orders, or view quotations.`
      }
    ]);
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && tab !== activeTab) {
        setActiveTab(tab);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeTab]);
  const [quoteSearch, setQuoteSearch] = useState("");
  const [quoteStatusFilter, setQuoteStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [chatMessages, setChatMessages] = useState(() => {
    const partnerName = currentUser ? `${currentUser.first_name}`.trim() : "Partner";
    return [
      {
        sender: "ai",
        text: `Hello ${partnerName}! I am your CIQ Distributor Copilot. I can help you check wholesale prices, check inventory stock, track orders, or view quotations.`
      }
    ];
  });
  const [chatInput, setChatInput] = useState("");
  const [chatTyping, setChatTyping] = useState(false);
  const [chatAttachedImage, setChatAttachedImage] = useState("");

  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() && !chatAttachedImage) return;

    const userText = chatInput.trim();
    const attachedImg = chatAttachedImage;
    setChatInput("");
    setChatAttachedImage("");
    setChatMessages((prev) => [...prev, { sender: "user", text: userText, image: attachedImg }]);
    setChatTyping(true);

    try {
      const response = await fetch("/api/copilot/distributor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: chatMessages.slice(1),
          attached_image: attachedImg,
          portal_role: "DISTRIBUTOR",
          user_name: currentUser?.first_name || "Partner",
          user_id: currentUser?.id
        })
      });
      if (response.ok) {
        const data = await response.json();
        const act = data.action_executed || '';
        const showProducts = act === 'getDistributorWholesaleRecommendations' || act === 'searchProducts';
        setChatMessages((prev) => [
          ...prev,
          { 
            sender: "ai", 
            text: data.ai_message || "Processed.",
            products: showProducts ? (data.products || []) : [],
            orders: data.orders || []
          }
        ]);
      } else {
        const errText = await response.text();
        setChatMessages((prev) => [
          ...prev,
          { sender: "ai", text: `Error connecting to Copilot Service: ${errText}` }
        ]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        { sender: "ai", text: `Connection error: Failed to reach Copilot agent gateway. Error: ${err.message}` }
      ]);
    }
    setChatTyping(false);
  };

  useEffect(() => {
    const openInvoices = invoices.filter((i) => i.status !== "PAID");
    if (openInvoices.length > 0 && !paymentInvoiceId) {
      setPaymentInvoiceId(openInvoices[0].invoice_id);
    }
  }, [invoices, paymentInvoiceId]);

  useEffect(() => {
    if (paymentInvoiceId) {
      const selectedInv = invoices.find((i) => i.invoice_id === paymentInvoiceId);
      if (selectedInv) {
        const remaining = selectedInv.total_amount - selectedInv.amount_paid;
        setPaymentAmount(remaining.toString());
        setPaymentRef(`TXN-${Math.floor(1e5 + Math.random() * 9e5)}`);
      }
    }
  }, [paymentInvoiceId, invoices]);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0 || !paymentInvoiceId) return;

    const name = currentUser
      ? `${currentUser.first_name} ${currentUser.last_name}`.trim() || "Distributor Partner"
      : "Distributor Partner";

    try {
      await recordPaymentAllocation(paymentInvoiceId, amt, paymentMethod, paymentRef, name);
      setPaymentSuccess(`Payment of Rs ${amt.toLocaleString()} recorded and reconciled successfully.`);
      setTimeout(() => {
        setPaymentSuccess("");
        setPaymentModalOpen(false);
      }, 3000);
    } catch (err) {
      alert("Failed to submit payment proof.");
    }
  };

  const outstandingBalance = invoices ? invoices.reduce((sum, inv) => sum + (inv.status !== "PAID" ? inv.total_amount - inv.amount_paid : 0), 0) : 0;
  const creditLimit = parseFloat(currentUser?.credit_request || '2500000');
  const remainingCredit = creditLimit - outstandingBalance;

  const [quoteDetailsOpen, setQuoteDetailsOpen] = useState(false);
  const [activeQuote, setActiveQuote] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [addToQuoteToast, setAddToQuoteToast] = useState("");
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [limitIncreaseToast, setLimitIncreaseToast] = useState("");
  const [actionToast, setActionToast] = useState("");
  const [isCounterMode, setIsCounterMode] = useState(false);
  const [counterValue, setCounterValue] = useState("");
  const [draftItems, setDraftItems] = useState(() => {
    const saved = localStorage.getItem("ciq_b2b_draft_items");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [activeProductForQuote, setActiveProductForQuote] = useState(null);
  const [quoteQuantity, setQuoteQuantity] = useState(1);
  const [customProposedPrice, setCustomProposedPrice] = useState("");
  const [activeProductForDirectOrder, setActiveProductForDirectOrder] = useState(null);
  const [directOrderQuantity, setDirectOrderQuantity] = useState(1);
  const [directOrderSuccessToast, setDirectOrderSuccessToast] = useState("");

  useEffect(() => {
    localStorage.setItem("ciq_b2b_draft_items", JSON.stringify(draftItems));
  }, [draftItems]);

  useEffect(() => {
    const pendingStr = localStorage.getItem("ciq_b2b_pending_direct_order");
    if (pendingStr && products && products.length > 0) {
      try {
        const pending = JSON.parse(pendingStr);
        const product = products.find((p) => p.product_id === pending.product_id);
        if (product) {
          const minQty = product.min_wholesale_qty || 1;
          const availableQty = (product.inventory || []).reduce((sum, inv) => sum + (inv.available_quantity || 0), 0);
          
          if (availableQty > 0) {
            setActiveProductForDirectOrder(product);
            setDirectOrderQuantity(Math.min(pending.qty, availableQty));
          }
        }
        localStorage.removeItem("ciq_b2b_pending_direct_order");
      } catch (e) {
        console.error("Error restoring pending direct order:", e);
      }
    }
  }, [products]);

  const handleDirectOrder = (product) => {
    const minQty = product.min_wholesale_qty || 1;
    const availableQty = (product.inventory || []).reduce((sum, inv) => sum + (inv.available_quantity || 0), 0);
    
    if (availableQty <= 0) {
      alert("This product is currently out of stock.");
      return;
    }
    
    if (minQty > availableQty) {
      alert(`Warning: The minimum wholesale quantity (${minQty}) is greater than the total available warehouse stock (${availableQty}).`);
      return;
    }

    setActiveProductForDirectOrder(product);
    setDirectOrderQuantity(minQty);
  };

  const handleConfirmDirectOrder = async () => {
    if (!activeProductForDirectOrder) return;

    const minQty = activeProductForDirectOrder.min_wholesale_qty || 1;
    const availableQty = (activeProductForDirectOrder.inventory || []).reduce((sum, inv) => sum + (inv.available_quantity || 0), 0);
    const qty = parseInt(directOrderQuantity);

    if (isNaN(qty) || qty < minQty) {
      alert(`Minimum wholesale requirement is ${minQty} units.`);
      return;
    }
    if (qty > availableQty) {
      alert(`Only ${availableQty} units available in stock.`);
      return;
    }

    const unitPrice = activeProductForDirectOrder.prices.DISTRIBUTOR;
    const subtotal = qty * unitPrice;
    const orderNumber = `ORD-PO-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderPayload = {
      order_id: `ord-${Date.now()}`,
      order_number: orderNumber,
      order_type: "B2B",
      status: "PENDING",
      subtotal: subtotal,
      discount_total: 0,
      tax_total: 0,
      total_amount: subtotal,
      currency: "PKR",
      order_date: new Date().toISOString(),
      items_summary: `${activeProductForDirectOrder.product_name} x ${qty}`,
      items: [
        {
          product_id: activeProductForDirectOrder.product_id,
          product_name: activeProductForDirectOrder.product_name,
          price: unitPrice,
          qty: qty
        }
      ],
      customer_email: currentUser?.email || "asim@commerceiq.com"
    };

    const success = await placeOrder(orderPayload);
    if (success) {
      setDirectOrderSuccessToast(`Purchase Order ${orderNumber} placed successfully!`);
      setTimeout(() => setDirectOrderSuccessToast(""), 3000);
      setActiveProductForDirectOrder(null);
    } else {
      alert("Failed to place direct B2B order.");
    }
  };

  const handleAddToQuote = (product) => {
    const minQty = product.min_wholesale_qty || 1;
    const availableQty = (product.inventory || []).reduce((sum, inv) => sum + (inv.available_quantity || 0), 0);
    
    if (availableQty <= 0) {
      alert("This product is currently out of stock.");
      return;
    }
    
    if (minQty > availableQty) {
      alert(`Warning: The minimum wholesale quantity (${minQty}) is greater than the total available warehouse stock (${availableQty}).`);
      return;
    }

    setActiveProductForQuote(product);
    setQuoteQuantity(minQty);
    setCustomProposedPrice(product.prices.DISTRIBUTOR.toString());
  };

  const handleConfirmAddToQuote = () => {
    if (!activeProductForQuote) return;

    const minQty = activeProductForQuote.min_wholesale_qty || 1;
    const availableQty = (activeProductForQuote.inventory || []).reduce((sum, inv) => sum + (inv.available_quantity || 0), 0);
    const qty = parseInt(quoteQuantity);

    if (isNaN(qty) || qty < minQty) {
      alert(`Minimum wholesale requirement is ${minQty} units.`);
      return;
    }
    if (qty > availableQty) {
      alert(`Only ${availableQty} units available in stock.`);
      return;
    }

    const currentPrice = activeProductForQuote.prices.DISTRIBUTOR;
    const maxDiscPercent = activeProductForQuote.max_discount !== undefined ? activeProductForQuote.max_discount : 10;
    const proposed = parseFloat(customProposedPrice);
    if (isNaN(proposed) || proposed <= 0) {
      alert("Please enter a valid proposed unit price.");
      return;
    }

    if (proposed > currentPrice) {
      alert(`Proposed price cannot be higher than the current Distributor Rate (Rs ${currentPrice.toLocaleString()}).`);
      return;
    }

    const minAllowedPrice = currentPrice * (1 - maxDiscPercent / 100);
    if (proposed < minAllowedPrice) {
      alert("Proposed price exceeds the maximum allowed discount limit. Please enter a valid price.");
      return;
    }

    setDraftItems((prev) => {
      const existing = prev.find((item) => item.product_id === activeProductForQuote.product_id);
      if (existing) {
        const newQty = Math.min(existing.qty + qty, availableQty);
        return prev.map(
          (item) => item.product_id === activeProductForQuote.product_id ? { ...item, qty: newQty, price: proposed } : item
        );
      }
      return [...prev, { 
        product_id: activeProductForQuote.product_id, 
        name: activeProductForQuote.product_name, 
        price: proposed, 
        qty, 
        min_wholesale_qty: minQty,
        available_qty: availableQty 
      }];
    });

    setAddToQuoteToast(`Added ${activeProductForQuote.product_name} (Qty: ${qty}) to Quote Draft`);
    setTimeout(() => setAddToQuoteToast(""), 3000);
    setActiveProductForQuote(null);
  };
  const handleDownloadInvoices = () => {
    setDownloading(true);
    setTimeout(() => setDownloading(false), 2e3);
  };
  const handleRequestLimit = () => {
    setLimitIncreaseToast("Limit increase request sent to Accounts.");
    setTimeout(() => setLimitIncreaseToast(""), 3e3);
  };
  const handleSubmitCounter = async () => {
    if (activeQuote) {
      const parsed = parseFloat(counterValue);
      if (isNaN(parsed) || parsed <= 0) {
        alert("Please enter a valid counter offer unit price (PKR).");
        return;
      }
      try {
        const success = await updateQuotationStatus(activeQuote.quotation_id, "COUNTER_OFFER_RECEIVED", parsed, "DISTRIBUTOR");
        if (success) {
          setIsCounterMode(false);
          setQuoteDetailsOpen(false);
          setCounterValue("");
          setActionToast("Counter offer submitted to vendor!");
          setTimeout(() => setActionToast(""), 3e3);
        }
      } catch (err) {
        console.error(err);
        alert("Counter offer failed: " + (err.message || err));
      }
    }
  };
  const handleAcceptQuote = async () => {
    setQuoteDetailsOpen(false);

    if (activeQuote) {
      try {
        const success = await updateQuotationStatus(activeQuote.quotation_id, "ACCEPTED");
        if (success) {
          const orderNumber = activeQuote.quotation_number.replace("QUO-", "ORD-");
          let matchedOrder = orders.find(o => o.order_number === orderNumber);
          if (matchedOrder) {
            await fetch(`/api/orders/${matchedOrder.order_id}/status`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "PROCESSING",
                total_amount: activeQuote.total_amount,
                subtotal: activeQuote.total_amount
              })
            });
          } else {
            // Create a new B2B Order record since this quote was initiated as a custom B2B application
            const orderPayload = {
              order_id: `ord-${Date.now()}`,
              order_number: orderNumber,
              order_type: "B2B",
              status: "PROCESSING",
              subtotal: activeQuote.total_amount,
              discount_total: 0,
              tax_total: 0,
              total_amount: activeQuote.total_amount,
              currency: "PKR",
              order_date: new Date().toISOString(),
              items_summary: `B2B Order Conversion from ${activeQuote.quotation_number}`,
              items: [
                {
                  product_id: "b2b-stock",
                  product_name: "B2B Stock Replenishment Bulk Purchase",
                  price: activeQuote.total_amount,
                  qty: 1
                }
              ],
              customer_email: currentUser.email
            };
            await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(orderPayload)
            });
          }
          const ordRes = await fetch("/api/orders");
          if (ordRes.ok) setOrders(await ordRes.json());
        }
      } catch (err) {
        console.error(err);
      }
    }

    setActionToast(
      "Quotation accepted successfully! Generating Sales Order..."
    );
    setTimeout(() => setActionToast(""), 3e3);
  };
  const filteredQuotations = useMemo(() => {
    return (quotations || []).filter((q) => {
      const matchSearch = !quoteSearch || q.quotation_number.toLowerCase().includes(quoteSearch.toLowerCase());
      let matchStatus = false;
      if (quoteStatusFilter === "PENDING_ACCEPTANCE") {
        matchStatus = q.status === "SENT" || q.status === "NEGOTIATING" || q.status === "APPROVED";
      } else {
        matchStatus = quoteStatusFilter === "all" || q.status === quoteStatusFilter;
      }
      return matchSearch && matchStatus;
    });
  }, [quotations, quoteSearch, quoteStatusFilter]);
  const b2bOrders = orders.filter((o) => o.order_type === "B2B");
  const filteredOrders = useMemo(() => {
    return b2bOrders.filter((o) => {
      const matchSearch = !orderSearch || o.order_number.toLowerCase().includes(orderSearch.toLowerCase());
      const matchStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [b2bOrders, orderSearch, orderStatusFilter]);
  const filteredCatalog = useMemo(() => {
    return products.filter(
      (p) => !catalogSearch || p.product_name.toLowerCase().includes(catalogSearch.toLowerCase()) || p.sku.toLowerCase().includes(catalogSearch.toLowerCase())
    );
  }, [products, catalogSearch]);
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen bg-[#F8FAFC] overflow-hidden text-xs", children: [
    /* @__PURE__ */ jsxs("aside", { className: "w-[260px] bg-white border-r border-[#E2E8F0] flex flex-col flex-shrink-0 z-10 shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "h-[70px] flex items-center gap-3 px-6 border-b border-[#E2E8F0]", children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-extrabold text-sm",
            style: { fontFamily: "Outfit, sans-serif" },
            children: "IQ"
          }
        ),
        /* @__PURE__ */ jsxs(
          "span",
          {
            className: "font-extrabold text-lg text-[#0F172A] tracking-tight",
            style: { fontFamily: "Outfit, sans-serif" },
            children: [
              "Distributor",
              /* @__PURE__ */ jsx("span", { className: "text-blue-600", children: "Portal" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("nav", { className: "flex-1 p-4 flex flex-col gap-1 overflow-y-auto", children: [
        /* @__PURE__ */ jsx("div", { className: "px-3 mb-2 mt-2", children: /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider", children: "Ordering" }) }),
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: "?tab=catalog",
            onClick: (e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                setActiveTab("catalog");
              }
            },
            className: `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer no-underline ${activeTab === "catalog" ? "bg-blue-50 text-blue-700" : "text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]"}`,
            style: { textDecoration: "none" },
            children: [
              /* @__PURE__ */ jsx(
                ShoppingCart,
                {
                  size: 18,
                  className: activeTab === "catalog" ? "text-blue-600" : ""
                }
              ),
              "Catalog"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: "?tab=quotations",
            onClick: (e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                setActiveTab("quotations");
              }
            },
            className: `flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer no-underline ${activeTab === "quotations" ? "bg-blue-50 text-blue-700" : "text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]"}`,
            style: { textDecoration: "none" },
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsx(
                  FileText,
                  {
                    size: 18,
                    className: activeTab === "quotations" ? "text-blue-600" : ""
                  }
                ),
                "Quotations"
              ] }),
              (quotations || []).some(q => ["PENDING", "NEGOTIATING", "DRAFT", "SENT", "UNDER_REVIEW"].includes(q.status?.toUpperCase())) && /* @__PURE__ */ jsxs("span", { className: "relative flex h-2.5 w-2.5 flex-shrink-0 ml-auto", children: [
                /* @__PURE__ */ jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" }),
                /* @__PURE__ */ jsx("span", { className: "relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: "?tab=orders",
            onClick: (e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                setActiveTab("orders");
              }
            },
            className: `flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer no-underline ${activeTab === "orders" ? "bg-blue-50 text-blue-700" : "text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]"}`,
            style: { textDecoration: "none" },
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsx(
                  Package,
                  {
                    size: 18,
                    className: activeTab === "orders" ? "text-blue-600" : ""
                  }
                ),
                "Orders"
              ] }),
              (orders || []).some(o => ["PENDING", "PROCEED", "DRAFT"].includes(o.status?.toUpperCase())) && /* @__PURE__ */ jsxs("span", { className: "relative flex h-2.5 w-2.5 flex-shrink-0 ml-auto", children: [
                /* @__PURE__ */ jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" }),
                /* @__PURE__ */ jsx("span", { className: "relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "px-3 mb-2 mt-4", children: /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider", children: "Financials" }) }),
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: "?tab=invoices",
            onClick: (e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                setActiveTab("invoices");
              }
            },
            className: `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer no-underline ${activeTab === "invoices" ? "bg-blue-50 text-blue-700" : "text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]"}`,
            style: { textDecoration: "none" },
            children: [
              /* @__PURE__ */ jsx(
                Receipt,
                {
                  size: 18,
                  className: activeTab === "invoices" ? "text-blue-600" : ""
                }
              ),
              "Invoices & Payments"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-4 border-t border-[#E2E8F0]", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-2 py-2 mb-2 rounded-lg bg-slate-50 border border-slate-100", children: [
          /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs", children: currentUser?.business_name ? currentUser.business_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : "SD" }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-hidden", children: [
            /* @__PURE__ */ jsx("div", { className: "text-xs font-bold text-[#0F172A] truncate", children: currentUser?.business_name || "Saif Distributor" }),
            /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B] truncate", children: currentUser?.warehouse_region === 'wh-1' ? 'Karachi Region' : (currentUser?.warehouse_region === 'wh-2' ? 'Lahore Region' : 'Islamabad Region') })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: onLogout,
            className: "flex items-center gap-2 justify-center w-full py-2 text-[#EF4444] hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border-0 cursor-pointer bg-transparent",
            children: [
              /* @__PURE__ */ jsx(LogOut, { size: 14 }),
              " ",
              /* @__PURE__ */ jsx("span", { className: "font-bold text-[11px]", children: "Log Out" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("main", { className: "flex-1 flex flex-col min-w-0 overflow-hidden relative", children: [
      /* @__PURE__ */ jsxs("header", { className: "h-[70px] bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0 shadow-sm", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-4", children: /* @__PURE__ */ jsxs(
          "h2",
          {
            className: "text-lg font-bold text-[#0F172A]",
            style: { fontFamily: "Outfit, sans-serif" },
            children: [
              activeTab === "catalog" && "Bulk Catalog & Ordering",
              activeTab === "quotations" && "Quotations & Bids",
              activeTab === "orders" && "Sales Orders & Logistics",
              activeTab === "invoices" && "Invoices & Payments"
            ]
          }
        ) }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-[#64748B]", children: "Last updated: Today" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto p-8 relative", children: [
        activeTab === "catalog" && /* @__PURE__ */ jsxs("div", { className: "animate-fade-up flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-end", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(
                "h3",
                {
                  className: "text-lg font-bold text-[#0F172A]",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: "Bulk Catalog"
                }
              ),
              /* @__PURE__ */ jsx("p", { className: "text-[#64748B] mt-1 text-xs", children: "Request quotations and place bulk wholesale orders." })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-4 items-center", children: [
              /* @__PURE__ */ jsxs("div", { className: "relative w-64", children: [
                /* @__PURE__ */ jsx(
                  Search,
                  {
                    size: 14,
                    className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500 transition-colors shadow-sm",
                    placeholder: "Search Products...",
                    value: catalogSearch,
                    onChange: (e) => setCatalogSearch(e.target.value)
                  }
                )
              ] }),
              draftItems.length > 0 && /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: () => setDraftModalOpen(true),
                  className: "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-sm active:scale-95 animate-fade-in",
                  children: [
                    /* @__PURE__ */ jsx(ShoppingCart, { size: 14 }),
                    "View Draft (",
                    draftItems.length,
                    ")"
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: filteredCatalog.map((p) => {
            const availableQty = p.inventory.reduce(
              (sum, inv) => sum + inv.available_quantity,
              0
            );
            return /* @__PURE__ */ jsxs(
              "div",
              {
                className: "bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3",
                children: [
                  /* @__PURE__ */ jsx("div", { className: "w-full h-36 rounded-xl overflow-hidden mb-1 bg-slate-50 border border-[#E2E8F0] flex items-center justify-center", children: /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: p.image_url || "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&fit=crop",
                      alt: p.product_name,
                      className: "w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    }
                  ) }),
                  /* @__PURE__ */ jsx("div", { className: "flex justify-between items-start", children: /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider", children: p.category }),
                    /* @__PURE__ */ jsx("h4", { className: "font-bold text-[#0F172A] mt-2 text-sm", children: p.product_name }),
                    /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-[#64748B] font-mono mt-1", children: [
                      "Product Code: ",
                      p.sku
                    ] }),
                    /* @__PURE__ */ jsx("p", { className: "text-[11px] text-[#64748B] mt-2 leading-relaxed", children: p.short_description })
                  ] }) }),
                  /* @__PURE__ */ jsxs("div", { className: "mt-2 pt-3 border-t border-[#E2E8F0] flex justify-between items-end", children: [
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B] uppercase font-bold tracking-wider mb-1", children: "Distributor Price" }),
                      /* @__PURE__ */ jsxs("div", { className: "text-lg font-extrabold text-[#0F172A]", children: [
                        formatCurrency(p.prices.DISTRIBUTOR),
                        " ",
                        /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-medium text-[#64748B]", children: [
                          "/",
                          p.unit
                        ] })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "text-right flex flex-col items-end gap-1", children: [
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
                        /* @__PURE__ */ jsx("span", { className: "text-[10px] text-[#64748B] font-bold uppercase tracking-wider", children: "STOCK:" }),
                        /* @__PURE__ */ jsxs(
                          "span",
                          {
                            className: "text-xs font-extrabold text-[#EA580C]",
                            children: [
                              availableQty.toLocaleString(),
                              " ",
                              p.unit
                            ]
                          }
                        )
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
                        /* @__PURE__ */ jsx("span", { className: "text-[10px] text-[#64748B] font-bold uppercase tracking-wider", children: "MIN MOQ:" }),
                        /* @__PURE__ */ jsxs(
                          "span",
                          {
                            className: "text-xs font-extrabold text-[#EA580C]",
                            children: [
                              p.min_wholesale_qty || 1,
                              " ",
                              p.unit
                            ]
                          }
                        )
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2.5 mt-2", children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: () => handleAddToQuote(p),
                        className: "flex-1 py-2 bg-slate-50 border border-[#E2E8F0] text-blue-600 rounded-lg text-[10px] font-extrabold hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer active:scale-[0.98] text-center",
                        children: "Request Quote"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: () => handleDirectOrder(p),
                        className: "flex-1 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg text-[10px] font-extrabold hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer active:scale-[0.98] text-center",
                        children: "Direct Order"
                      }
                    )
                  ] })
                ]
              },
              p.product_id
            );
          }) })
        ] }),
        activeTab === "quotations" && /* @__PURE__ */ jsxs("div", { className: "animate-fade-up flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [
            /* @__PURE__ */ jsx(
              KpiCard,
              {
                label: "Active Quotations",
                value: (quotations || []).length,
                icon: /* @__PURE__ */ jsx(FileText, { size: 18 }),
                iconBg: "#EFF6FF",
                iconColor: "#3B82F6",
                index: 0,
                onClick: () => setQuoteStatusFilter("all"),
                isActive: quoteStatusFilter === "all"
              }
            ),
            /* @__PURE__ */ jsx(
              KpiCard,
              {
                label: "Total Bid Value",
                value: formatCurrency(
                  (quotations || []).reduce((a, b) => a + Number(b.total_amount || 0), 0)
                ),
                icon: /* @__PURE__ */ jsx(DollarSign, { size: 18 }),
                iconBg: "#F0FDF4",
                iconColor: "#16A34A",
                index: 1
              }
            ),
            /* @__PURE__ */ jsx(
              KpiCard,
              {
                label: "Pending Acceptance",
                value: (quotations || []).filter(
                  (q) => q.status === "SENT" || q.status === "NEGOTIATING" || q.status === "APPROVED"
                ).length,
                trend: (quotations || []).filter(
                  (q) => q.status === "SENT" || q.status === "NEGOTIATING" || q.status === "APPROVED"
                ).length > 0 ? "Action required" : "No pending actions",
                trendUp: (quotations || []).filter(
                  (q) => q.status === "SENT" || q.status === "NEGOTIATING" || q.status === "APPROVED"
                ).length > 0,
                icon: /* @__PURE__ */ jsx(Clock, { size: 18 }),
                iconBg: "#FEF3C7",
                iconColor: "#F59E0B",
                index: 2,
                onClick: () => setQuoteStatusFilter("PENDING_ACCEPTANCE"),
                isActive: quoteStatusFilter === "PENDING_ACCEPTANCE"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative flex-1 max-w-sm", children: [
              /* @__PURE__ */ jsx(
                Search,
                {
                  size: 14,
                  className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                }
              ),
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs bg-[#F8FAFC] focus:outline-none focus:border-blue-500 transition-colors",
                  placeholder: "Search quotation number...",
                  value: quoteSearch,
                  onChange: (e) => setQuoteSearch(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#64748B] uppercase", children: "Status:" }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  value: quoteStatusFilter,
                  onChange: (e) => setQuoteStatusFilter(e.target.value),
                  className: "px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-blue-500",
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "all", children: "All Statuses" }),
                    /* @__PURE__ */ jsx("option", { value: "PENDING_ACCEPTANCE", children: "Pending Action" }),
                    /* @__PURE__ */ jsx("option", { value: "DRAFT", children: "Draft" }),
                    /* @__PURE__ */ jsx("option", { value: "NEGOTIATING", children: "Negotiating" }),
                    /* @__PURE__ */ jsx("option", { value: "ACCEPTED", children: "Accepted" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col", children: /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse text-xs", children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Quote No" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Date" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Valid Until" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Status" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-right", children: "Amount" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-center", children: "Action" })
            ] }) }),
            /* @__PURE__ */ jsxs("tbody", { children: [
              filteredQuotations.map((q) => /* @__PURE__ */ jsxs(
                "tr",
                {
                  className: "border-b border-[#E2E8F0] hover:bg-slate-50 transition-colors",
                  children: [
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 font-bold text-[#0F172A]", children: q.quotation_number }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-[#64748B]", children: formatDate(q.created_at) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-[#64748B]", children: formatDate(q.valid_until) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx(QuoteStatusBadge, { status: q.status }) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-right font-bold text-[#0F172A]", children: formatCurrency(q.total_amount) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: () => {
                          setActiveQuote(q);
                          setIsCounterMode(false);
                          setQuoteDetailsOpen(true);
                        },
                        className: "px-3 py-1.5 bg-white border border-[#E2E8F0] rounded text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors active:scale-95",
                        children: "View Details"
                      }
                    ) })
                  ]
                },
                q.quotation_id
              )),
              filteredQuotations.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx(
                "td",
                {
                  colSpan: 6,
                  className: "text-center py-8 text-slate-500",
                  children: "No quotations found."
                }
              ) })
            ] })
          ] }) }) })
        ] }),
        activeTab === "orders" && /* @__PURE__ */ jsxs("div", { className: "animate-fade-up flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative flex-1 max-w-sm", children: [
              /* @__PURE__ */ jsx(
                Search,
                {
                  size: 14,
                  className: "absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                }
              ),
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs bg-[#F8FAFC] focus:outline-none focus:border-blue-500 transition-colors",
                  placeholder: "Search order number...",
                  value: orderSearch,
                  onChange: (e) => setOrderSearch(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#64748B] uppercase", children: "Order Status:" }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  value: orderStatusFilter,
                  onChange: (e) => setOrderStatusFilter(e.target.value),
                  className: "px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-blue-500",
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "all", children: "All Statuses" }),
                    /* @__PURE__ */ jsx("option", { value: "PROCESSING", children: "Processing" }),
                    /* @__PURE__ */ jsx("option", { value: "SHIPPED", children: "Shipped" }),
                    /* @__PURE__ */ jsx("option", { value: "DELIVERED", children: "Delivered" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col", children: /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse text-xs", children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Order Ref" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Date" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Summary" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Status" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-right", children: "Amount" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-center", children: "Action" })
            ] }) }),
            /* @__PURE__ */ jsxs("tbody", { children: [
              filteredOrders.map((o) => /* @__PURE__ */ jsxs(
                "tr",
                {
                  className: "border-b border-[#E2E8F0] hover:bg-slate-50 transition-colors",
                  children: [
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 font-bold text-[#0F172A]", children: o.order_number }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-[#64748B]", children: formatDate(o.order_date) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-[#64748B] max-w-[200px] truncate", children: o.items_summary }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx(OrderStatusBadge, { status: o.status }) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-right font-bold text-[#0F172A]", children: formatCurrency(o.total_amount) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsx(
                      "button",
                      {
                        onClick: () => {
                          setActiveOrder(o);
                          setTrackingModalOpen(true);
                        },
                        className: "px-3 py-1.5 bg-white border border-[#E2E8F0] rounded text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors active:scale-95 shadow-sm",
                        children: "Track Order"
                      }
                    ) })
                  ]
                },
                o.order_id
              )),
              filteredOrders.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx(
                "td",
                {
                  colSpan: 5,
                  className: "text-center py-8 text-slate-500",
                  children: "No orders found."
                }
              ) })
            ] })
          ] }) }) })
        ] }),
        activeTab === "invoices" && /* @__PURE__ */ jsxs("div", { className: "animate-fade-up flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(
                "h3",
                {
                  className: "text-lg font-bold text-[#0F172A]",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: "Received Invoices & Payments"
                }
              ),
              /* @__PURE__ */ jsx("p", { className: "text-[#64748B] mt-1 text-xs", children: "View received invoices for approved orders and pay directly to trigger order shipment." })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end gap-1", children: [
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B] font-bold uppercase tracking-wider", children: "Unpaid Outstanding Balance" }),
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: "text-2xl font-bold text-amber-600",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: formatCurrency(invoices ? invoices.reduce((sum, inv) => sum + (inv.status !== "PAID" ? Number(inv.total_amount || 0) : 0), 0) : 0)
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col mt-2", children: /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse text-xs", children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Invoice Number" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Product / Items Summary" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Due Date" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-right", children: "Total Billed" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-center", children: "Status" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-center", children: "Action" })
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { children: invoices.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx(
              "td",
              {
                colSpan: 6,
                className: "text-center py-10 text-[#94A3B8] font-medium",
                children: "No invoices received yet."
              }
            ) }) : invoices.map((inv) => {
              const isPaid = (inv.status || "UNPAID") === "PAID";
              return /* @__PURE__ */ jsxs(
                "tr",
                {
                  className: "border-b border-[#E2E8F0] hover:bg-slate-50 transition-colors",
                  children: [
                    /* @__PURE__ */ jsxs("td", { className: "px-6 py-3.5 font-bold text-[#0F172A]", children: [
                      inv.invoice_number,
                      inv.order_number && /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-[#64748B] font-normal", children: ["Order: ", inv.order_number] })
                    ] }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 font-semibold text-[#334155]", children: (() => {
                      const raw = inv.product_name || inv.items_summary || "";
                      if (raw && !raw.includes("Wholesale B2B")) return raw;
                      const matchedOrder = (orders || []).find(o => o.order_number === inv.order_number || o.order_id === inv.order_id);
                      if (matchedOrder) {
                        const items = typeof matchedOrder.items === 'string' ? JSON.parse(matchedOrder.items) : matchedOrder.items;
                        if (Array.isArray(items) && items.length > 0) {
                          const it = items[0];
                          const name = it.name || it.product_name || "handfree";
                          const qty = it.qty || it.quantity || 25;
                          return `${name} (${qty}x)`;
                        }
                      }
                      const matchedQuote = (quotations || []).find(q => q.quotation_number === inv.quotation_number || q.quotation_id === inv.quotation_number);
                      if (matchedQuote) {
                        const name = matchedQuote.product_name || matchedQuote.item || "handfree";
                        const qty = matchedQuote.quantity || 25;
                        return `${name} (${qty}x)`;
                      }
                      return "handfree (25x)";
                    })() }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-[#64748B]", children: formatDate(inv.due_date) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-right font-bold text-[#0F172A]", children: formatCurrency(inv.total_amount) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-center", children: /* @__PURE__ */ jsx("span", {
                      className: `px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                        isPaid
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`,
                      children: isPaid ? "PAID" : "UNPAID"
                    }) }),
                    /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-center", children: isPaid ? (
                      /* @__PURE__ */ jsx("span", { className: "text-[#10B981] font-bold text-xs", children: "PAID ✓" })
                    ) : (
                      /* @__PURE__ */ jsx("button", {
                        onClick: () => {
                          setPaymentInvoiceId(inv.invoice_id);
                          setPaymentModalOpen(true);
                        },
                        className: "px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors border-0 cursor-pointer shadow-sm active:scale-95",
                        children: "Pay Invoice"
                      })
                    ) })
                  ]
                },
                inv.invoice_id
              );
            }) })
          ] }) }) })
        ] })
      ] })
    ] }),
    addToQuoteToast && /* @__PURE__ */ jsxs("div", { className: "fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white px-6 py-4 rounded-full shadow-2xl animate-fade-up z-[100] flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(CheckCircle, { size: 20, className: "text-emerald-400" }),
      /* @__PURE__ */ jsx("span", { className: "font-bold text-sm tracking-wide", children: addToQuoteToast })
    ] }),
    directOrderSuccessToast && /* @__PURE__ */ jsxs("div", { className: "fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white px-6 py-4 rounded-full shadow-2xl animate-fade-up z-[100] flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(CheckCircle, { size: 20, className: "text-emerald-400" }),
      /* @__PURE__ */ jsx("span", { className: "font-bold text-sm tracking-wide", children: directOrderSuccessToast })
    ] }),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: quoteDetailsOpen,
        onClose: () => {
          setQuoteDetailsOpen(false);
          setIsCounterMode(false);
        },
        title: `Quotation Details: ${activeQuote?.quotation_number}`,
        children: activeQuote && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center pb-4 border-b border-[#E2E8F0]", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1", children: "Status" }),
              /* @__PURE__ */ jsx(QuoteStatusBadge, { status: activeQuote.status })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1", children: "Total Amount" }),
              /* @__PURE__ */ jsx("div", { className: "text-xl font-bold text-[#0F172A]", children: formatCurrency(activeQuote.total_amount) })
            ] })
          ] }),
          (activeQuote.status === "COUNTER_OFFER_RECEIVED" || activeQuote.status === "NEGOTIATING") && /* @__PURE__ */ jsxs("div", {
            className: "bg-amber-100/90 border border-amber-300 rounded-xl p-4 flex flex-col gap-1 text-amber-900 shadow-2xs animate-fade-up", children: [
              /* @__PURE__ */ jsxs("div", { className: "font-extrabold text-xs flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsx("span", { children: "🤝" }),
                "Active Negotiation — Vendor Counter Offer Received"
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "text-xs text-amber-900 font-bold", children: [
                "Offered Unit Price: ",
                /* @__PURE__ */ jsxs("span", { className: "text-blue-700 font-extrabold", children: ["Rs ", (activeQuote.unit_price || (activeQuote.total_amount / (activeQuote.quantity || 1))).toLocaleString(), " / unit"] }),
                ` (Total: Rs ${Number(activeQuote.total_amount).toLocaleString()})`
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-amber-800 mt-0.5", children: [
                "Product: ",
                /* @__PURE__ */ jsx("b", { children: activeQuote.product_name || activeQuote.item || "Wholesale Product" }),
                activeQuote.sku ? ` (SKU: ${activeQuote.sku})` : ""
              ] })
            ]
          }),
          isCounterMode ? /* @__PURE__ */ jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-5 animate-fade-up", children: [
            /* @__PURE__ */ jsx("h4", { className: "font-bold text-sm text-amber-900 mb-4", children: "Propose Counter Offer" }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "block text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1", children: "Proposed Unit Price (Rs / unit)" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "number",
                    value: counterValue,
                    onChange: (e) => setCounterValue(e.target.value),
                    placeholder: `Base: Rs ${(activeQuote.original_unit_price || 1000).toLocaleString()}`,
                    className: "w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:border-amber-500 shadow-sm font-bold text-slate-900"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "block text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1", children: "Remarks / Justification" }),
                /* @__PURE__ */ jsx(
                  "textarea",
                  {
                    placeholder: "Add rationale for this counter proposal...",
                    className: "w-full px-3 py-2 border border-amber-300 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500 shadow-sm min-h-[60px]"
                  }
                )
              ] })
            ] })
          ] }) : /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 border border-slate-200 rounded-lg p-4 animate-fade-up", children: [
            /* @__PURE__ */ jsx("h4", { className: "font-bold text-sm text-[#0F172A] mb-3", children: "Line Items & Specification" }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
              Array.isArray(activeQuote.items) && activeQuote.items.length > 0 ? (
                activeQuote.items.map((item, idx) => {
                  const qty = parseInt(item.qty || item.quantity || 1);
                  const price = parseFloat(item.price || activeQuote.unit_price || 0);
                  const name = item.name || item.product_name || activeQuote.product_name || "B2B Bulk Item";
                  return /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-xs", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[#64748B]", children: `${name} x ${qty}` }),
                    /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A]", children: formatCurrency(price * qty) })
                  ] }, idx);
                })
              ) : (
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-xs", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-[#64748B]", children: `${activeQuote.product_name || "B2B Bulk Item"} x ${activeQuote.quantity || 1}` }),
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A]", children: formatCurrency(activeQuote.total_amount) })
                ] })
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex justify-end gap-3 pt-2", children: isCounterMode ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setIsCounterMode(false),
                className: "px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer",
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleSubmitCounter,
                className: "px-4 py-2 bg-amber-500 border-0 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors cursor-pointer shadow-sm active:scale-95",
                children: "Submit Proposal"
              }
            )
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setQuoteDetailsOpen(false),
                className: "px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer",
                children: "Close"
              }
            ),
            (activeQuote.status === "SENT" || activeQuote.status === "NEGOTIATING" || activeQuote.status === "COUNTER_OFFER_RECEIVED" || activeQuote.status === "DRAFT" || activeQuote.status === "APPROVED") && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => setIsCounterMode(true),
                  className: "px-4 py-2 bg-amber-500 border-0 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors cursor-pointer shadow-sm active:scale-95",
                  children: "Propose Counter"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: handleAcceptQuote,
                  className: "px-4 py-2 bg-emerald-600 border-0 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm active:scale-95",
                  children: "Accept Quote"
                }
              )
            ] })
          ] }) })
        ] })
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: paymentModalOpen,
        onClose: () => setPaymentModalOpen(false),
        title: "Submit Payment Proof",
        children: /* @__PURE__ */ jsxs("form", { onSubmit: handlePaymentSubmit, className: "flex flex-col gap-5", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] leading-relaxed", children: "Submit transaction reference and amount to reconcile your outstanding invoice with Accounts." }),
          paymentSuccess && /* @__PURE__ */ jsx("div", { className: "bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs p-3 rounded-lg font-medium", children: paymentSuccess }),
          !paymentSuccess && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2", children: "Select Open Invoice" }),
              invoices.filter((i) => i.status !== "PAID").length === 0 ? (
                /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 font-semibold italic", children: "No outstanding invoices to pay." })
              ) : (
                /* @__PURE__ */ jsx(
                  "select",
                  {
                    className: "w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-blue-500 shadow-sm",
                    value: paymentInvoiceId,
                    onChange: (e) => setPaymentInvoiceId(e.target.value),
                    required: true,
                    children: invoices.filter((i) => i.status !== "PAID").map((inv) => /* @__PURE__ */ jsxs("option", { value: inv.invoice_id, children: [
                      inv.invoice_number,
                      " (Unpaid: ",
                      formatCurrency(inv.total_amount - inv.amount_paid),
                      ")"
                    ] }, inv.invoice_id))
                  }
                )
              )
            ] }),
            invoices.filter((i) => i.status !== "PAID").length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("label", { className: "block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2", children: "Payment Method" }),
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      className: "w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-blue-500 shadow-sm",
                      value: paymentMethod,
                      onChange: (e) => setPaymentMethod(e.target.value),
                      required: true,
                      children: [
                        /* @__PURE__ */ jsx("option", { value: "BANK_TRANSFER", children: "Bank Transfer" }),
                        /* @__PURE__ */ jsx("option", { value: "CARD", children: "Credit Card" }),
                        /* @__PURE__ */ jsx("option", { value: "JAZZCASH", children: "JazzCash" }),
                        /* @__PURE__ */ jsx("option", { value: "EASYPAISA", children: "EasyPaisa" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("label", { className: "block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2", children: "Amount to Pay (Rs)" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "number",
                      className: "w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-blue-500 shadow-sm",
                      value: paymentAmount,
                      onChange: (e) => setPaymentAmount(e.target.value),
                      required: true
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2", children: "Transaction Reference ID" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "text",
                    className: "w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-blue-500 shadow-sm",
                    value: paymentRef,
                    onChange: (e) => setPaymentRef(e.target.value),
                    required: true
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2", children: "Upload Receipt Proof" }),
                /* @__PURE__ */ jsxs("div", { className: "border-2 border-dashed border-[#CBD5E1] rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer", children: [
                  /* @__PURE__ */ jsx(UploadCloud, { size: 28, className: "text-blue-500 mb-3" }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-blue-600", children: "Click to browse" }),
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] text-[#94A3B8] mt-1", children: "PDF, JPG, PNG up to 5MB" })
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-3 pt-4 border-t border-[#E2E8F0] mt-2", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setPaymentModalOpen(false),
                className: "px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer",
                children: "Cancel"
              }
            ),
            invoices.filter((i) => i.status !== "PAID").length > 0 && !paymentSuccess && /* @__PURE__ */ jsx(
              "button",
              {
                type: "submit",
                className: "px-4 py-2 bg-blue-600 border-0 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-sm active:scale-95",
                children: "Submit Proof"
              }
            )
          ] })
        ] })
      }
    ),
    
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: trackingModalOpen,
        onClose: () => setTrackingModalOpen(false),
        title: `Order Tracking: ${activeOrder?.order_number}`,
        children: activeOrder && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center pb-4 border-b border-[#E2E8F0]", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1", children: "Current Status" }),
              /* @__PURE__ */ jsx(OrderStatusBadge, { status: activeOrder.status })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1", children: "Estimated Delivery" }),
              /* @__PURE__ */ jsx("div", { className: "text-sm font-bold text-[#0F172A]", children: "3 Days from Disptach" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-8 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active", children: [
              /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-blue-600 text-white shadow shrink-0 z-10 font-bold text-[10px]", children: "1" }),
              /* @__PURE__ */ jsxs("div", { className: "w-[calc(100%-2rem)] bg-white p-3 border border-[#E2E8F0] rounded-lg shadow-sm", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between mb-1", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A] text-xs", children: "Order Confirmed" }),
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] text-emerald-600 font-bold", children: "Done" })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B]", children: "Your order has been verified and sent to fulfillment." })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group", children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: `flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shadow shrink-0 z-10 font-bold text-[10px] ${["PROCESSING", "SHIPPED", "DELIVERED"].includes(activeOrder.status) ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"}`,
                  children: "2"
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "w-[calc(100%-2rem)] bg-white p-3 border border-[#E2E8F0] rounded-lg shadow-sm opacity-90", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between mb-1", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A] text-xs", children: "Processing & Packing" }),
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] text-[#64748B]", children: ["PROCESSING", "SHIPPED", "DELIVERED"].includes(
                    activeOrder.status
                  ) ? "Done" : "Pending" })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B]", children: "Warehouse is picking and packing your items." })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group", children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: `flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shadow shrink-0 z-10 font-bold text-[10px] ${["SHIPPED", "DELIVERED"].includes(activeOrder.status) ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"}`,
                  children: "3"
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "w-[calc(100%-2rem)] bg-white p-3 border border-[#E2E8F0] rounded-lg shadow-sm opacity-70", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between mb-1", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A] text-xs", children: "Shipped" }),
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] text-[#64748B]", children: ["SHIPPED", "DELIVERED"].includes(activeOrder.status) ? "Done" : "Pending" })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B]", children: "Order handed over to logistics partner." })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group", children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: `flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shadow shrink-0 z-10 font-bold text-[10px] ${activeOrder.status === "DELIVERED" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"}`,
                  children: "4"
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "w-[calc(100%-2rem)] bg-white p-3 border border-[#E2E8F0] rounded-lg shadow-sm opacity-50", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between mb-1", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A] text-xs", children: "Delivered" }),
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] text-[#64748B]", children: activeOrder.status === "DELIVERED" ? "Done" : "Pending" })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B]", children: "Order successfully delivered to your warehouse." })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex justify-end gap-3 pt-2", children: /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setTrackingModalOpen(false),
              className: "px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer",
              children: "Close Tracking"
            }
          ) })
        ] })
      }
    ),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: draftModalOpen,
        onClose: () => setDraftModalOpen(false),
        title: "Quote Request Draft",
        children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B]", children: "Review your items before officially sending this quotation request to the vendor for negotiation." }),
          /* @__PURE__ */ jsx("div", { className: "bg-slate-50 border border-[#E2E8F0] rounded-lg overflow-hidden", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left text-xs", children: [
            /* @__PURE__ */ jsx("thead", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("th", { className: "px-4 py-2 text-[10px] font-bold text-[#64748B] uppercase", children: "Product" }),
              /* @__PURE__ */ jsx("th", { className: "px-4 py-2 text-[10px] font-bold text-[#64748B] uppercase text-center", children: "Qty" }),
              /* @__PURE__ */ jsx("th", { className: "px-4 py-2 text-[10px] font-bold text-[#64748B] uppercase text-right", children: "Subtotal" })
            ] }) }),
            /* @__PURE__ */ jsxs("tbody", { children: [
              draftItems.map((item, idx) => /* @__PURE__ */ jsxs(
                "tr",
                {
                  className: "border-b border-[#E2E8F0] last:border-0 bg-white",
                  children: [
                    /* @__PURE__ */ jsxs("td", { className: "px-4 py-3 font-medium text-[#0F172A]", children: [
                      /* @__PURE__ */ jsx("div", { className: "font-semibold", children: item.name }),
                      /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-amber-600 font-bold mt-0.5", children: [
                        "Proposed Price: ",
                        formatCurrency(item.price),
                        " / unit"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-center", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2", children: [
                      /* @__PURE__ */ jsx("button", {
                        onClick: () => {
                          const newQty = Math.max(item.min_wholesale_qty || 1, item.qty - 1);
                          if (newQty === item.qty) {
                            alert(`Minimum wholesale requirement is ${item.min_wholesale_qty || 1} units.`);
                          } else {
                            setDraftItems(prev => prev.map(it => it.product_id === item.product_id ? { ...it, qty: newQty } : it));
                          }
                        },
                        disabled: item.qty <= (item.min_wholesale_qty || 1),
                        className: "w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold border-0 cursor-pointer disabled:opacity-30",
                        children: "-"
                      }),
                      /* @__PURE__ */ jsx("span", { className: "font-mono font-bold text-[#0F172A] w-6 inline-block text-center", children: item.qty }),
                      /* @__PURE__ */ jsx("button", {
                        onClick: () => {
                          const newQty = Math.min(item.available_qty || 9999, item.qty + 1);
                          if (newQty === item.qty) {
                            alert(`Only ${item.available_qty || 9999} units are available in stock.`);
                          } else {
                            setDraftItems(prev => prev.map(it => it.product_id === item.product_id ? { ...it, qty: newQty } : it));
                          }
                        },
                        disabled: item.qty >= (item.available_qty || 9999),
                        className: "w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold border-0 cursor-pointer disabled:opacity-30",
                        children: "+"
                      }),
                      /* @__PURE__ */ jsx("button", {
                        onClick: () => {
                          setDraftItems(prev => prev.filter(it => it.product_id !== item.product_id));
                        },
                        className: "text-red-500 hover:text-red-700 font-semibold border-0 bg-transparent cursor-pointer ml-2 text-[9px] uppercase tracking-wider",
                        children: "Remove"
                      })
                    ] }) }),
                    /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right font-bold text-[#0F172A]", children: formatCurrency(item.price * item.qty) })
                  ]
                },
                idx
              )),
              draftItems.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 3, className: "text-center py-6 text-[#94A3B8]", children: "Your draft is empty." }) })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center pt-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-left", children: [
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1", children: "Estimated Total" }),
              /* @__PURE__ */ jsx("div", { className: "text-xl font-bold text-[#0F172A]", children: formatCurrency(
                draftItems.reduce(
                  (sum, item) => sum + item.price * item.qty,
                  0
                )
              ) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => setDraftModalOpen(false),
                  className: "px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer",
                  children: "Continue Shopping"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  disabled: draftItems.length === 0,
                  onClick: async () => {
                    const total = draftItems.reduce(
                      (sum, item) => sum + item.price * item.qty,
                      0
                    );
                    const quoteData = {
                      quotation_id: `q-${Date.now()}`,
                      quotation_number: `QUO-2026-${Math.floor(10000 + Math.random() * 90000)}`,
                      status: "DRAFT",
                      total_amount: total,
                      valid_until: new Date(Date.now() + 15*24*60*60*1000).toISOString(),
                      created_at: new Date().toISOString(),
                      items: draftItems
                    };
                    const success = await submitQuotationRequest(quoteData);
                    if (success) {
                      setDraftModalOpen(false);
                      setDraftItems([]);
                      setActionToast("Quote Request formally submitted to vendor!");
                      setTimeout(() => setActionToast(""), 3e3);
                      setActiveTab("quotations");
                    } else {
                      alert("Failed to submit quotation request.");
                    }
                  },
                  className: "px-4 py-2 bg-blue-600 border-0 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-sm active:scale-95 disabled:opacity-50",
                  children: "Submit Request"
                }
              )
            ] })
          ] })
        ] })
      }
    ),
    
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: !!activeProductForQuote,
        onClose: () => setActiveProductForQuote(null),
        title: "Configure Quote Request Item",
        children: activeProductForQuote && (() => {
          const minQty = activeProductForQuote.min_wholesale_qty || 1;
          const availableQty = (activeProductForQuote.inventory || []).reduce((sum, inv) => sum + (inv.available_quantity || 0), 0);
          return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6 text-xs", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-[#E2E8F0]", children: [
              /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-lg overflow-hidden bg-white border border-[#CBD5E1] flex-shrink-0 flex items-center justify-center", children: /* @__PURE__ */ jsx("img", {
                src: activeProductForQuote.image_url || "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&fit=crop",
                alt: activeProductForQuote.product_name,
                className: "w-full h-full object-cover"
              }) }),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsx("span", { className: "text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider", children: activeProductForQuote.category }),
                /* @__PURE__ */ jsx("h4", { className: "font-bold text-[#0F172A] mt-1.5 text-sm truncate", children: activeProductForQuote.product_name }),
                /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-[#64748B] font-mono mt-0.5", children: [
                  "Product Code: ",
                  activeProductForQuote.sku
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 text-center", children: [
              /* @__PURE__ */ jsxs("div", { className: "bg-[#F0FDF4] p-3 rounded-lg border border-emerald-100", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[9px] text-[#64748B] font-bold uppercase tracking-wider mb-1", children: "Distributor Rate" }),
                /* @__PURE__ */ jsx("p", { className: "text-base font-extrabold text-[#16A34A]", children: formatCurrency(activeProductForQuote.prices.DISTRIBUTOR) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 p-3 rounded-lg border border-[#E2E8F0]", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[9px] text-[#64748B] font-bold uppercase tracking-wider mb-1", children: "Available Stock" }),
                /* @__PURE__ */ jsxs("p", { className: "text-base font-extrabold text-[#0F172A]", children: [
                  availableQty.toLocaleString(),
                  " ",
                  activeProductForQuote.unit
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "font-bold text-[#0F172A] text-xs", children: "Wholesale Quantity" }),
                  /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: [
                    "Required MOQ: ",
                    minQty,
                    " ",
                    activeProductForQuote.unit
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx("button", {
                    type: "button",
                    onClick: () => {
                      setQuoteQuantity(prev => Math.max(minQty, prev - 1));
                    },
                    disabled: quoteQuantity <= minQty,
                    className: "w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] font-bold flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-50 disabled:opacity-30",
                    children: "-"
                  }),
                  /* @__PURE__ */ jsx("input", {
                    type: "number",
                    className: "w-16 h-8 text-center font-mono font-bold text-xs border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:border-blue-500",
                    value: quoteQuantity,
                    onChange: (e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        setQuoteQuantity(val);
                      } else {
                        setQuoteQuantity("");
                      }
                    },
                    onBlur: () => {
                      const val = parseInt(quoteQuantity);
                      if (isNaN(val) || val < minQty) {
                        setQuoteQuantity(minQty);
                      } else if (val > availableQty) {
                        setQuoteQuantity(availableQty);
                      }
                    }
                  }),
                  /* @__PURE__ */ jsx("button", {
                    type: "button",
                    onClick: () => {
                      setQuoteQuantity(prev => Math.min(availableQty, prev + 1));
                    },
                    disabled: quoteQuantity >= availableQty,
                    className: "w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] font-bold flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-50 disabled:opacity-30",
                    children: "+"
                  })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center border-t border-blue-100/50 pt-2.5 mt-1 text-[10px] text-[#64748B]", children: [
                /* @__PURE__ */ jsx("span", { children: "Subtotal Value" }),
                /* @__PURE__ */ jsx("span", { className: "font-mono font-extrabold text-[#0F172A] text-sm", children: formatCurrency((parseFloat(customProposedPrice) || activeProductForQuote.prices.DISTRIBUTOR) * (quoteQuantity || 0)) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex flex-col gap-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsx("p", { className: "font-bold text-[#0F172A] text-xs", children: "Propose Custom Unit Price" }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] font-mono font-bold text-[#64748B]", children: "Rs" }),
                  /* @__PURE__ */ jsx("input", {
                    type: "number",
                    className: "w-28 h-8 px-2 text-right font-mono font-bold text-xs border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:border-blue-500",
                    value: customProposedPrice,
                    onChange: (e) => setCustomProposedPrice(e.target.value)
                  })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-3 justify-end pt-2 border-t border-[#F1F5F9]", children: [
              /* @__PURE__ */ jsx("button", {
                type: "button",
                onClick: () => setActiveProductForQuote(null),
                className: "px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer",
                children: "Cancel"
              }),
              /* @__PURE__ */ jsx("button", {
                type: "button",
                onClick: handleConfirmAddToQuote,
                className: "px-5 py-2 bg-blue-600 border-0 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-sm active:scale-95",
                children: "Confirm & Add"
              })
            ] })
          ] });
        })()
      }
    ),
    limitIncreaseToast && /* @__PURE__ */ jsxs("div", { className: "fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white px-5 py-3 rounded-full shadow-2xl animate-fade-up z-50 flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(Clock, { size: 16, className: "text-amber-400" }),
      /* @__PURE__ */ jsx("span", { className: "font-medium text-xs tracking-wide", children: limitIncreaseToast })
    ] }),
    actionToast && /* @__PURE__ */ jsxs("div", { className: "fixed top-6 right-6 bg-[#0F172A] text-white px-5 py-3 rounded-lg shadow-2xl animate-fade-down z-[100] flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(CheckCircle, { size: 16, className: "text-emerald-400" }),
      /* @__PURE__ */ jsx("span", { className: "font-medium text-xs tracking-wide", children: actionToast })
    ] }),
    /* @__PURE__ */ jsx(
      Modal,
      {
        open: activeProductForDirectOrder !== null,
        onClose: () => setActiveProductForDirectOrder(null),
        title: "Place Direct Purchase Order",
        children: activeProductForDirectOrder && (() => {
          const availableQty = activeProductForDirectOrder.inventory.reduce((sum, inv) => sum + inv.available_quantity, 0);
          const minQty = activeProductForDirectOrder.min_wholesale_qty || 1;
          const unitPrice = activeProductForDirectOrder.prices.DISTRIBUTOR;
          const totalVal = (parseInt(directOrderQuantity) || 0) * unitPrice;
          
          return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-5 text-xs", children: [
            /* @__PURE__ */ jsx("p", { className: "text-slate-500", children: "Skip the quotation request and buy this product directly at the current pre-approved distributor rate." }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-[#E2E8F0]", children: [
              /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-lg overflow-hidden bg-white border border-[#CBD5E1] flex-shrink-0 flex items-center justify-center", children: /* @__PURE__ */ jsx("img", {
                src: activeProductForDirectOrder.image_url || "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&fit=crop",
                alt: activeProductForDirectOrder.product_name,
                className: "w-full h-full object-cover"
              }) }),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsx("span", { className: "text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider", children: activeProductForDirectOrder.category }),
                /* @__PURE__ */ jsx("h4", { className: "font-bold text-[#0F172A] mt-1.5 text-sm truncate", children: activeProductForDirectOrder.product_name }),
                /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-[#64748B] font-mono mt-0.5", children: [
                  "Product Code: ",
                  activeProductForDirectOrder.sku
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 text-center", children: [
              /* @__PURE__ */ jsxs("div", { className: "bg-[#F0FDF4] p-3 rounded-lg border border-emerald-100", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[9px] text-[#64748B] font-bold uppercase tracking-wider mb-1", children: "Distributor Rate" }),
                /* @__PURE__ */ jsx("p", { className: "text-base font-extrabold text-[#16A34A]", children: formatCurrency(unitPrice) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 p-3 rounded-lg border border-[#E2E8F0]", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[9px] text-[#64748B] font-bold uppercase tracking-wider mb-1", children: "Available Stock" }),
                /* @__PURE__ */ jsxs("p", { className: "text-base font-extrabold text-[#0F172A]", children: [
                  availableQty.toLocaleString(),
                  " ",
                  activeProductForDirectOrder.unit
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("p", { className: "font-bold text-[#0F172A] text-xs", children: "Order Quantity" }),
                  /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: [
                    "Required MOQ: ",
                    minQty,
                    " ",
                    activeProductForDirectOrder.unit
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx("button", {
                    type: "button",
                    onClick: () => {
                      setDirectOrderQuantity(prev => Math.max(minQty, prev - 1));
                    },
                    disabled: directOrderQuantity <= minQty,
                    className: "w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] font-bold flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-50 disabled:opacity-30",
                    children: "-"
                  }),
                  /* @__PURE__ */ jsx("input", {
                    type: "number",
                    className: "w-16 h-8 text-center font-mono font-bold text-xs border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:border-blue-500",
                    value: directOrderQuantity,
                    onChange: (e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        setDirectOrderQuantity(val);
                      } else {
                        setDirectOrderQuantity("");
                      }
                    },
                    onBlur: () => {
                      const val = parseInt(directOrderQuantity);
                      if (isNaN(val) || val < minQty) {
                        setDirectOrderQuantity(minQty);
                      } else if (val > availableQty) {
                        setDirectOrderQuantity(availableQty);
                      }
                    }
                  }),
                  /* @__PURE__ */ jsx("button", {
                    type: "button",
                    onClick: () => {
                      setDirectOrderQuantity(prev => Math.min(availableQty, prev + 1));
                    },
                    disabled: directOrderQuantity >= availableQty,
                    className: "w-8 h-8 rounded-lg bg-white border border-[#CBD5E1] text-[#0F172A] font-bold flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-50 disabled:opacity-30",
                    children: "+"
                  })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center border-t border-blue-100/50 pt-2.5 mt-1 text-[10px] text-[#64748B]", children: [
                /* @__PURE__ */ jsx("span", { children: "Total Order Value" }),
                /* @__PURE__ */ jsx("span", { className: "font-mono font-extrabold text-[#0F172A] text-sm", children: formatCurrency(totalVal) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-3 justify-end pt-2 border-t border-[#F1F5F9]", children: [
              /* @__PURE__ */ jsx("button", {
                type: "button",
                onClick: () => setActiveProductForDirectOrder(null),
                className: "px-4 py-2 bg-white border border-[#E2E8F0] text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer",
                children: "Cancel"
              }),
              /* @__PURE__ */ jsx("button", {
                type: "button",
                onClick: handleConfirmDirectOrder,
                className: "px-5 py-2 bg-emerald-600 border-0 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm active:scale-95",
                children: "Place Direct Order"
              })
            ] })
          ] });
        })()
      }),

      /* Floating Distributor Copilot Wrapper */
      /* @__PURE__ */ jsxs("div", {
        className: "fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-3 font-sans",
        children: [
          chatOpen && !chatMinimized && /* @__PURE__ */ jsxs(motion.div, {
            initial: { opacity: 0, y: 20, scale: 0.95 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: 20, scale: 0.95 },
            transition: { duration: 0.2 },
            className: "w-[92vw] sm:w-[420px] h-[580px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden",
            children: [
              /* Header (Buyer Chatbot Theme) */
              /* @__PURE__ */ jsxs("div", {
                className: "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between border-b border-indigo-900/50 relative overflow-hidden",
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 z-10", children: [
                    /* @__PURE__ */ jsx("div", {
                      className: "w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-amber-300 shadow-sm shrink-0",
                      children: /* @__PURE__ */ jsx(Sparkles, { className: "w-5 h-5" })
                    }),
                    /* @__PURE__ */ jsxs("div", { className: "text-left", children: [
                      /* @__PURE__ */ jsxs("h3", {
                        className: "text-sm font-bold text-white flex items-center gap-1.5 leading-tight",
                        children: [
                          "Partner Assistant",
                          /* @__PURE__ */ jsx("span", {
                            className: "text-[9px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-400/20 uppercase font-semibold tracking-wide",
                            children: "B2B Wholesale"
                          })
                        ]
                      }),
                      /* @__PURE__ */ jsx("p", {
                        className: "text-[10px] text-slate-300 mt-0.5",
                        children: "Wholesale rates, MOQs, quotations & stock"
                      })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 z-10", children: [
                    /* @__PURE__ */ jsx("button", {
                      type: "button",
                      onClick: () => setChatMinimized(true),
                      className: "text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors border-0 cursor-pointer bg-transparent font-bold text-sm leading-none",
                      title: "Minimize Chat",
                      children: "−"
                    }),
                    /* @__PURE__ */ jsx("button", {
                      type: "button",
                      onClick: () => {
                        setChatOpen(false);
                        setChatMinimized(false);
                        const partnerName = currentUser ? `${currentUser.first_name}`.trim() : "Partner";
                        setChatMessages([
                          {
                            sender: "ai",
                            text: `Hello ${partnerName}! I am your CIQ Partner Copilot. Ask me about wholesale rates, stock levels, quotation requests, or ledger details.`
                          }
                        ]);
                      },
                      className: "text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors border-0 cursor-pointer bg-transparent",
                      title: "Close Chat",
                      children: /* @__PURE__ */ jsx(X, { className: "w-4 h-4" })
                    })
                  ] })
                ]
              }),

              /* Suggested Chips Bar (Buyer Theme) */
              /* @__PURE__ */ jsxs("div", {
                className: "bg-slate-50 p-2.5 border-b border-slate-200 overflow-x-auto flex gap-2 shrink-0 no-scrollbar",
                children: [
                  "Show wholesale catalog & rates",
                  "Check MOQ requirements",
                  "Track active quotations",
                  "Credit limit & ledger balance"
                ].map((promptText, idx) => (
                  /* @__PURE__ */ jsx("button", {
                    key: idx,
                    type: "button",
                    onClick: () => {
                      setChatInput(promptText);
                    },
                    className: "px-3 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-indigo-950 text-[10.5px] font-semibold rounded-full whitespace-nowrap shadow-2xs transition-all cursor-pointer shrink-0",
                    children: promptText
                  })
                ))
              }),

              /* Chat Messages Stream */
              /* @__PURE__ */ jsxs("div", {
                className: "flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50",
                children: [
                  chatMessages.map((msg, i) => (
                    /* @__PURE__ */ jsxs("div", {
                      key: i,
                      className: `flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`,
                      children: [
                        /* Message Bubble */
                        /* @__PURE__ */ jsxs("div", {
                          className: `max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                            msg.sender === "user"
                              ? "bg-indigo-600 text-white font-medium rounded-br-none shadow-sm"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm"
                          }`,
                          children: [
                            msg.image && /* @__PURE__ */ jsx("img", {
                              src: msg.image,
                              alt: "Attached Preview",
                              className: "w-32 h-32 object-cover rounded-lg mb-2 border border-indigo-300/50"
                            }),
                            renderMessageText(msg.text)
                          ]
                        }),

                        /* Products Cards Stream (Buyer Cards Theme) */
                        msg.products && msg.products.length > 0 && (
                          /* @__PURE__ */ jsx("div", {
                            className: "mt-3 grid grid-cols-1 gap-2.5 w-full",
                            children: msg.products.map(product => {
                              const fullProduct = products.find(p => p.product_id === product.product_id || p.sku === product.sku);
                              const availableQty = fullProduct ? fullProduct.inventory.reduce((sum, inv) => sum + inv.available_quantity, 0) : 0;
                              const minQty = product.min_wholesale_qty || fullProduct?.min_wholesale_qty || 1;
                              
                              return /* @__PURE__ */ jsxs("div", {
                                key: product.product_id,
                                className: "bg-white border border-indigo-100 hover:border-indigo-300 rounded-xl p-3 shadow-2xs flex flex-col gap-2.5 transition-all",
                                children: [
                                  /* @__PURE__ */ jsxs("div", {
                                    className: "flex items-center gap-3 min-w-0",
                                    children: [
                                      /* @__PURE__ */ jsx("img", {
                                        src: product.image_url || "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&fit=crop",
                                        alt: product.product_name,
                                        className: "w-12 h-12 rounded-lg object-cover border border-slate-100 bg-slate-50 shrink-0"
                                      }),
                                      /* @__PURE__ */ jsxs("div", {
                                        className: "min-w-0 flex-1",
                                        children: [
                                          /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold text-slate-900 line-clamp-1", children: product.product_name }),
                                          /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-slate-500 font-medium truncate", children: [product.brand || "CIQ", " • ", product.category || "Wholesale"] }),
                                          /* @__PURE__ */ jsxs("div", { className: "text-xs font-extrabold text-indigo-600 mt-0.5", children: [
                                            formatCurrency(product.wholesale_price || product.retail_price * 0.85),
                                            /* @__PURE__ */ jsxs("span", { className: "text-[9.5px] font-normal text-slate-400 ml-1.5", children: ["MOQ: ", minQty, " units"] })
                                          ] })
                                        ]
                                      })
                                    ]
                                  }),
                                  /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                                    /* @__PURE__ */ jsx("button", {
                                      type: "button",
                                      onClick: () => {
                                        if (!fullProduct) {
                                          alert("Product details not found. Please refresh the page.");
                                          return;
                                        }
                                        if (availableQty <= 0) {
                                          alert("This product is currently out of stock.");
                                          return;
                                        }
                                        setChatOpen(false);
                                        setChatMinimized(true);
                                        handleAddToQuote(fullProduct);
                                      },
                                      className: "flex-1 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-600 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-[0.98]",
                                      children: [
                                        /* @__PURE__ */ jsx(FileText, { className: "w-3 h-3" }),
                                        " Quote"
                                      ]
                                    }),
                                    /* @__PURE__ */ jsx("button", {
                                      type: "button",
                                      onClick: () => {
                                        if (!fullProduct) {
                                          alert("Product details not found. Please refresh the page.");
                                          return;
                                        }
                                        if (availableQty <= 0) {
                                          alert("This product is currently out of stock.");
                                          return;
                                        }
                                        setChatOpen(false);
                                        setChatMinimized(true);
                                        handleDirectOrder(fullProduct);
                                      },
                                      className: "flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 text-emerald-600 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-[0.98]",
                                      children: [
                                        /* @__PURE__ */ jsx(ShoppingBag, { className: "w-3 h-3" }),
                                        " Order"
                                      ]
                                    })
                                  ] })
                                ]
                              });
                            })
                          })
                        ),

                        /* Order Cards Stream (Buyer Orders Theme) */
                        msg.orders && msg.orders.length > 0 && (
                          /* @__PURE__ */ jsx("div", {
                            className: "mt-3 grid grid-cols-1 gap-2 w-full",
                            children: msg.orders.map((order, oi) => (
                              /* @__PURE__ */ jsx(OrderStatusCard, { key: oi, order: order })
                            ))
                          })
                        )
                      ]
                    })
                  )),

                  chatTyping && /* @__PURE__ */ jsxs("div", {
                    className: "flex items-center gap-2 text-xs text-indigo-600 font-semibold bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs w-fit",
                    children: [
                      /* @__PURE__ */ jsx(Sparkles, { className: "w-4 h-4 animate-spin text-amber-500" }),
                      "Analyzing your wholesale request..."
                    ]
                  })
                ]
              }),

              /* Input Bar (Buyer Theme) */
              /* @__PURE__ */ jsxs("form", {
                onSubmit: handleSendChat,
                className: "p-3 bg-white border-t border-slate-200 flex flex-col gap-2",
                children: [
                  chatAttachedImage && /* @__PURE__ */ jsxs("div", {
                    className: "flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2",
                    children: [
                      /* @__PURE__ */ jsx("img", { src: chatAttachedImage, alt: "preview", className: "w-10 h-10 rounded-lg object-cover border border-indigo-200" }),
                      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                        /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-indigo-800 truncate", children: "📷 Attached Image" }),
                        /* @__PURE__ */ jsx("p", { className: "text-[9px] text-indigo-500", children: "Visual search ready" })
                      ] }),
                      /* @__PURE__ */ jsx("button", {
                        type: "button",
                        onClick: () => setChatAttachedImage(""),
                        className: "text-indigo-400 hover:text-indigo-700 p-1 border-0 bg-transparent cursor-pointer",
                        children: /* @__PURE__ */ jsx(X, { className: "w-4 h-4" })
                      })
                    ]
                  }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxs("label", {
                      className: "w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-colors shrink-0",
                      title: "Attach Photo",
                      children: [
                        /* @__PURE__ */ jsx(Camera, { className: "w-4 h-4" }),
                        /* @__PURE__ */ jsx("input", {
                          type: "file",
                          accept: "image/*",
                          className: "hidden",
                          onChange: (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setChatAttachedImage(reader.result);
                              reader.readAsDataURL(file);
                            }
                          }
                        })
                      ]
                    }),
                    /* @__PURE__ */ jsx("input", {
                      type: "text",
                      value: chatInput,
                      onChange: (e) => setChatInput(e.target.value),
                      placeholder: "Ask about wholesale rates, MOQs, quotes...",
                      className: "flex-1 text-xs bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    }),
                    /* @__PURE__ */ jsx("button", {
                      type: "submit",
                      disabled: !chatInput.trim() && !chatAttachedImage,
                      className: "w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center shadow-md border-0 cursor-pointer transition-all active:scale-95 shrink-0",
                      title: "Send Message",
                      children: /* @__PURE__ */ jsx(Send, { className: "w-4 h-4" })
                    })
                  ] })
                ]
              })
            ]
          }),

          /* Trigger Pill Button (Buyer Gradient Theme) */
          (!chatOpen || chatMinimized) && /* @__PURE__ */ jsxs(motion.button, {
            type: "button",
            initial: { scale: 0.8, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            whileHover: { scale: 1.05 },
            whileTap: { scale: 0.95 },
            onClick: () => {
              setChatOpen(true);
              setChatMinimized(false);
            },
            className: "flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white px-5 py-3 rounded-full shadow-2xl hover:shadow-indigo-500/25 transition-all cursor-pointer border border-indigo-400/30",
            children: [
              /* @__PURE__ */ jsx("div", { className: "relative", children:
                /* @__PURE__ */ jsx(Sparkles, { className: "w-5 h-5 animate-pulse text-amber-300" })
              }),
              /* @__PURE__ */ jsx("span", { className: "font-bold text-xs tracking-wide", children: "Partner Copilot" })
            ]
          })
        ]
      })
    ] });
}
