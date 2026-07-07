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
  AlertCircle
} from "lucide-react";
import { useStore } from "@/lib/store";
import { KpiCard, OrderStatusBadge, InvoiceStatusBadge, LatePaymentRiskBadge, Badge } from "@/components/ui";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate } from "@/lib/data";
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
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    SENT: "bg-blue-50 text-blue-700 border-blue-200",
    NEGOTIATING: "bg-amber-50 text-amber-700 border-amber-200",
    ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
    EXPIRED: "bg-stone-50 text-stone-700 border-stone-200",
    CONVERTED: "bg-purple-50 text-purple-700 border-purple-200"
  };
  return /* @__PURE__ */ jsx(
    "span",
    {
      className: `px-2.5 py-1 rounded-full text-[10px] font-bold border ${styles[status] || styles.DRAFT}`,
      children: status
    }
  );
}
export default function DistributorPortal({ onLogout }) {
  const { orders, products, quotations, setQuotations, setOrders, submitQuotationRequest, updateQuotationStatus, invoices, recordPaymentAllocation, currentUser } = useStore();
  const [activeTab, setActiveTab] = useState("catalog");
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
  const [draftItems, setDraftItems] = useState([]);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const handleAddToQuote = (productName, price) => {
    setDraftItems((prev) => {
      const existing = prev.find((item) => item.name === productName);
      if (existing) {
        return prev.map(
          (item) => item.name === productName ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { name: productName, price, qty: 1 }];
    });
    setAddToQuoteToast(`Added ${productName} to Quote Draft`);
    setTimeout(() => setAddToQuoteToast(""), 3e3);
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
    setIsCounterMode(false);
    setQuoteDetailsOpen(false);
    setCounterValue("");

    if (activeQuote) {
      try {
        const parsed = parseFloat(counterValue);
        const amt = !isNaN(parsed) && parsed > 0 ? parsed : undefined;
        await updateQuotationStatus(activeQuote.quotation_id, "NEGOTIATING", amt);
      } catch (err) {
        console.error(err);
      }
    }

    setActionToast("Counter offer submitted for review.");
    setTimeout(() => setActionToast(""), 3e3);
  };
  const handleAcceptQuote = async () => {
    setQuoteDetailsOpen(false);

    if (activeQuote) {
      try {
        const success = await updateQuotationStatus(activeQuote.quotation_id, "ACCEPTED");
        if (success) {
          const orderNumber = activeQuote.quotation_number.replace("QUO-", "ORD-");
          const matchedOrder = orders.find(o => o.order_number === orderNumber);
          if (matchedOrder) {
            await fetch(`/api/orders/${matchedOrder.order_id}/status`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "PROCESSING" })
            });
            const ordRes = await fetch("/api/orders");
            if (ordRes.ok) setOrders(await ordRes.json());
          }
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
        matchStatus = q.status === "SENT" || q.status === "NEGOTIATING";
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
          "button",
          {
            onClick: () => setActiveTab("catalog"),
            className: `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer ${activeTab === "catalog" ? "bg-blue-50 text-blue-700" : "text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]"}`,
            children: [
              /* @__PURE__ */ jsx(
                ShoppingCart,
                {
                  size: 18,
                  className: activeTab === "catalog" ? "text-blue-600" : ""
                }
              ),
              "Bulk Catalog"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("quotations"),
            className: `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer ${activeTab === "quotations" ? "bg-blue-50 text-blue-700" : "text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]"}`,
            children: [
              /* @__PURE__ */ jsx(
                FileText,
                {
                  size: 18,
                  className: activeTab === "quotations" ? "text-blue-600" : ""
                }
              ),
              "Quotations"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("orders"),
            className: `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer ${activeTab === "orders" ? "bg-blue-50 text-blue-700" : "text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]"}`,
            children: [
              /* @__PURE__ */ jsx(
                Package,
                {
                  size: 18,
                  className: activeTab === "orders" ? "text-blue-600" : ""
                }
              ),
              "Sales Orders"
            ]
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "px-3 mb-2 mt-4", children: /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider", children: "Financials" }) }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("ledger"),
            className: `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer ${activeTab === "ledger" ? "bg-blue-50 text-blue-700" : "text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]"}`,
            children: [
              /* @__PURE__ */ jsx(
                FileSpreadsheet,
                {
                  size: 18,
                  className: activeTab === "ledger" ? "text-blue-600" : ""
                }
              ),
              "Invoices & Ledger"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("reminders"),
            className: `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer ${activeTab === "reminders" ? "bg-blue-50 text-blue-700" : "text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]"}`,
            children: [
              /* @__PURE__ */ jsx(
                Bell,
                {
                  size: 18,
                  className: activeTab === "reminders" ? "text-blue-600" : ""
                }
              ),
              "Smart Reminders"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("profile"),
            className: `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-0 cursor-pointer ${activeTab === "profile" ? "bg-blue-50 text-blue-700" : "text-[#64748B] bg-transparent hover:bg-slate-50 hover:text-[#0F172A]"}`,
            children: [
              /* @__PURE__ */ jsx(
                User,
                {
                  size: 18,
                  className: activeTab === "profile" ? "text-blue-600" : ""
                }
              ),
              "Billing Profile"
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
              activeTab === "ledger" && "Customer Statement Ledger",
              activeTab === "reminders" && "Smart Reminders History",
              activeTab === "profile" && "Billing Profile & Terms"
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
                    /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
                      /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B] uppercase font-bold tracking-wider mb-1", children: "Available" }),
                      /* @__PURE__ */ jsxs(
                        "div",
                        {
                          className: `text-sm font-bold ${availableQty > 100 ? "text-emerald-600" : "text-amber-600"}`,
                          children: [
                            availableQty.toLocaleString(),
                            " ",
                            p.unit
                          ]
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => handleAddToQuote(p.product_name, p.prices.DISTRIBUTOR),
                      className: "mt-2 w-full py-2 bg-slate-50 border border-[#E2E8F0] text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer active:scale-[0.98]",
                      children: "Add to Quote Request"
                    }
                  )
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
                  (q) => q.status === "SENT" || q.status === "NEGOTIATING"
                ).length,
                trend: "Action required",
                trendUp: false,
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
        activeTab === "ledger" && /* @__PURE__ */ jsxs("div", { className: "animate-fade-up flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(
                "h3",
                {
                  className: "text-lg font-bold text-[#0F172A]",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: "Statement of Account"
                }
              ),
              /* @__PURE__ */ jsx("p", { className: "text-[#64748B] mt-1 text-xs", children: "A running ledger of invoices computed dynamically from database logs." })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end gap-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
                /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#64748B] font-bold uppercase tracking-wider", children: "Current Balance" }),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "text-2xl font-bold text-red-600",
                    style: { fontFamily: "Outfit, sans-serif" },
                    children: formatCurrency(invoices ? invoices.reduce((sum, inv) => sum + (inv.status !== "PAID" ? inv.total_amount - inv.amount_paid : 0), 0) : 0)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: handleDownloadInvoices,
                    className: "flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shadow-sm active:scale-95 disabled:opacity-50",
                    disabled: downloading,
                    children: [
                      /* @__PURE__ */ jsx(
                        Download,
                        {
                          size: 14,
                          className: downloading ? "animate-bounce" : ""
                        }
                      ),
                      downloading ? "Preparing ZIP..." : "Bulk Invoice Download"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => setPaymentModalOpen(true),
                    className: "flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer border-0 shadow-sm active:scale-95",
                    children: [
                      /* @__PURE__ */ jsx(UploadCloud, { size: 14 }),
                      " Submit Payment Proof"
                    ]
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-4 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] p-4 rounded-xl flex flex-col justify-center shadow-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "0 - 30 Days" }),
              /* @__PURE__ */ jsx("span", { className: "text-lg font-bold text-[#0F172A] mt-1", children: formatCurrency(invoices ? invoices.reduce((sum, inv) => sum + (inv.status !== "PAID" ? inv.total_amount - inv.amount_paid : 0), 0) : 0) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col justify-center shadow-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-amber-700 uppercase tracking-wider", children: "31 - 60 Days" }),
              /* @__PURE__ */ jsx("span", { className: "text-lg font-bold text-amber-800 mt-1", children: formatCurrency(0) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col justify-center shadow-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-red-700 uppercase tracking-wider", children: "61 - 90 Days" }),
              /* @__PURE__ */ jsx("span", { className: "text-lg font-bold text-red-800 mt-1", children: formatCurrency(0) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-red-50 border border-red-200 p-4 rounded-xl flex flex-col justify-center shadow-sm", children: [
              /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-red-700 uppercase tracking-wider", children: "90+ Days" }),
              /* @__PURE__ */ jsx("span", { className: "text-lg font-bold text-red-800 mt-1", children: formatCurrency(0) })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col mt-2", children: /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse text-xs", children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Invoice Number" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Due Date" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-right", children: "Billed (Debit)" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-right", children: "Settled (Credit)" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-center", children: "Status" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase text-center", children: "Late Risk tier" })
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { children: invoices.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx(
              "td",
              {
                colSpan: 6,
                className: "text-center py-8 text-[#94A3B8] font-medium",
                children: "No invoices logged in database."
              }
            ) }) : invoices.map((inv) => /* @__PURE__ */ jsxs(
              "tr",
              {
                className: "border-b border-[#E2E8F0] hover:bg-slate-50 transition-colors",
                children: [
                  /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 font-bold text-[#0F172A]", children: inv.invoice_number }),
                  /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-[#64748B]", children: formatDate(inv.due_date) }),
                  /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-right font-semibold text-slate-700", children: formatCurrency(inv.total_amount) }),
                  /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-right font-bold text-emerald-600", children: formatCurrency(inv.amount_paid) }),
                  /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-center", children: /* @__PURE__ */ jsx(InvoiceStatusBadge, { status: inv.status }) }),
                  /* @__PURE__ */ jsx("td", { className: "px-6 py-3.5 text-center", children: /* @__PURE__ */ jsx(LatePaymentRiskBadge, { probability: inv.late_payment_probability }) })
                ]
              },
              inv.invoice_id
            )) })
          ] }) }) })
        ] }),
        activeTab === "reminders" && /* @__PURE__ */ jsxs("div", { className: "animate-fade-up flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(
              "h3",
              {
                className: "text-lg font-bold text-[#0F172A]",
                style: { fontFamily: "Outfit, sans-serif" },
                children: "Smart Reminders History"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-[#64748B] mt-1 text-xs", children: "Record of automated and manual payment reminders sent for outstanding invoices." })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse text-xs", children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Invoice Ref" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Sent Date" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Channel & Tone" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Delivery Status" }),
              /* @__PURE__ */ jsx("th", { className: "px-6 py-3.5 text-[11px] font-bold text-[#64748B] uppercase", children: "Response" })
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { children: MOCK_REMINDERS.map((rem) => /* @__PURE__ */ jsxs(
              "tr",
              {
                className: "border-b border-[#E2E8F0] hover:bg-slate-50",
                children: [
                  /* @__PURE__ */ jsx("td", { className: "px-6 py-4 font-bold text-[#0F172A]", children: rem.ref_id }),
                  /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-[#64748B]", children: formatDate(rem.sent_at) }),
                  /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-center", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded", children: rem.channel }),
                    /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: `text-[10px] font-bold px-2 py-0.5 rounded ${rem.tone === "FIRM" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`,
                        children: rem.tone
                      }
                    )
                  ] }) }),
                  /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: `text-[10px] font-bold ${rem.status === "OPENED" ? "text-emerald-600" : "text-amber-600"}`,
                      children: rem.status
                    }
                  ) }),
                  /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("span", { className: "text-[#64748B]", children: rem.response.replace(/_/g, " ") }) })
                ]
              },
              rem.id
            )) })
          ] }) })
        ] }),
        activeTab === "profile" && /* @__PURE__ */ jsxs("div", { className: "animate-fade-up flex flex-col gap-6", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(
              "h3",
              {
                className: "text-lg font-bold text-[#0F172A]",
                style: { fontFamily: "Outfit, sans-serif" },
                children: "Billing Profile"
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-[#64748B] mt-1 text-xs", children: "Manage credit terms, limits, and taxation identities." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
                /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600", children: /* @__PURE__ */ jsx(CreditCard, { size: 20 }) }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("h4", { className: "font-bold text-sm text-[#0F172A]", children: "Credit & Payment Terms" }),
                  /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B]", children: "Active limits and settlement timelines." })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs mb-1", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[#64748B] font-medium", children: "Credit Limit Utilized" }),
                    /* @__PURE__ */ jsxs("span", { className: "font-bold text-[#0F172A]", children: [
                      formatCurrency(outstandingBalance),
                      " / ",
                      formatCurrency(creditLimit)
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: "bg-blue-600 h-full rounded-full",
                      style: {
                        width: `${Math.min(100, Math.round((outstandingBalance / creditLimit) * 100))}%`
                      }
                    }
                  ) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "pt-4 border-t border-[#E2E8F0] flex justify-between items-center", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs text-[#64748B]", children: "Approved Terms" }),
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-xs bg-slate-100 px-3 py-1 rounded-md", children: "Net 30 Days" })
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: handleRequestLimit,
                    className: "w-full mt-2 py-2 bg-slate-50 border border-[#E2E8F0] text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors cursor-pointer active:scale-[0.98]",
                    children: "Request Limit Increase"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
                /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600", children: /* @__PURE__ */ jsx(AlertCircle, { size: 20 }) }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("h4", { className: "font-bold text-sm text-[#0F172A]", children: "Business Identity" }),
                  /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B]", children: "Taxation and compliance records." })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center pb-3 border-b border-[#E2E8F0]", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs text-[#64748B]", children: "Business Name" }),
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-xs text-[#0F172A]", children: currentUser?.business_name || "Saif Distributor LLC" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center pb-3 border-b border-[#E2E8F0]", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs text-[#64748B]", children: "NTN (National Tax No)" }),
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-xs text-[#0F172A]", children: currentUser?.ntn_code || "823901-4" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs text-[#64748B]", children: "STRN (Sales Tax Reg)" }),
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-xs text-[#0F172A]", children: "29048123000" })
                ] })
              ] })
            ] })
          ] })
        ] })
      ] })
    ] }),
    addToQuoteToast && /* @__PURE__ */ jsxs("div", { className: "fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white px-6 py-4 rounded-full shadow-2xl animate-fade-up z-[100] flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(CheckCircle, { size: 20, className: "text-emerald-400" }),
      /* @__PURE__ */ jsx("span", { className: "font-bold text-sm tracking-wide", children: addToQuoteToast })
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
          isCounterMode ? /* @__PURE__ */ jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-5 animate-fade-up", children: [
            /* @__PURE__ */ jsx("h4", { className: "font-bold text-sm text-amber-900 mb-4", children: "Propose Counter Offer" }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "block text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1", children: "Proposed Value (Rs)" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "number",
                    value: counterValue,
                    onChange: (e) => setCounterValue(e.target.value),
                    placeholder: "e.g. 1400000",
                    className: "w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:border-amber-500 shadow-sm"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "block text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1", children: "Remarks / Justification" }),
                /* @__PURE__ */ jsx(
                  "textarea",
                  {
                    placeholder: "Add context for this counter offer...",
                    className: "w-full px-3 py-2 border border-amber-300 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500 shadow-sm min-h-[60px]"
                  }
                )
              ] })
            ] })
          ] }) : /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 border border-slate-200 rounded-lg p-4 animate-fade-up", children: [
            /* @__PURE__ */ jsx("h4", { className: "font-bold text-sm text-[#0F172A] mb-3", children: "Line Items" }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-xs", children: [
                /* @__PURE__ */ jsx("span", { className: "text-[#64748B]", children: "Cement 50kg Bags x 1000" }),
                /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A]", children: formatCurrency(145e4) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-xs", children: [
                /* @__PURE__ */ jsx("span", { className: "text-[#64748B]", children: "Steel Rebar 12mm x 500" }),
                /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A]", children: formatCurrency(2231600) })
              ] })
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
            (activeQuote.status === "SENT" || activeQuote.status === "NEGOTIATING") && /* @__PURE__ */ jsxs(Fragment, { children: [
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
                    /* @__PURE__ */ jsx("td", { className: "px-4 py-3 font-medium text-[#0F172A]", children: item.name }),
                    /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-center", children: item.qty }),
                    /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right font-bold text-[#0F172A]", children: formatCurrency(item.price * item.qty) })
                  ]
                },
                idx
              )),
              draftItems.length === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 3, className: "text-center py-6 text-[#94A3B8]", children: "Your draft is empty." }) })
            ] })
          ] }) }),
          (() => {
            const total = draftItems.reduce((sum, item) => sum + item.price * item.qty, 0);
            if (total > remainingCredit) {
              return /* @__PURE__ */ jsxs("div", { className: "bg-red-50 border border-red-200 text-red-800 text-[11px] p-3.5 rounded-lg flex items-start gap-2.5 animate-fade-up", children: [
                /* @__PURE__ */ jsx(AlertCircle, { size: 14, className: "text-red-600 flex-shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "This order exceeds your remaining credit limit of ",
                  formatCurrency(remainingCredit),
                  ". Please request a limit increase or settle outstanding invoices."
                ] })
              ] });
            }
            return null;
          })(),
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
                  disabled: draftItems.length === 0 || draftItems.reduce((sum, item) => sum + item.price * item.qty, 0) > remainingCredit,
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
                      created_at: new Date().toISOString()
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
    limitIncreaseToast && /* @__PURE__ */ jsxs("div", { className: "fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white px-5 py-3 rounded-full shadow-2xl animate-fade-up z-50 flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(Clock, { size: 16, className: "text-amber-400" }),
      /* @__PURE__ */ jsx("span", { className: "font-medium text-xs tracking-wide", children: limitIncreaseToast })
    ] }),
    actionToast && /* @__PURE__ */ jsxs("div", { className: "fixed top-6 right-6 bg-[#0F172A] text-white px-5 py-3 rounded-lg shadow-2xl animate-fade-down z-[100] flex items-center gap-3", children: [
      /* @__PURE__ */ jsx(CheckCircle, { size: 16, className: "text-emerald-400" }),
      /* @__PURE__ */ jsx("span", { className: "font-medium text-xs tracking-wide", children: actionToast })
    ] })
  ] });
}
