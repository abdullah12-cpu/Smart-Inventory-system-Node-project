import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import {
  ArrowRight,
  Landmark,
  Warehouse,
  Sparkles,
  TrendingUp,
  Database,
  ShieldAlert
} from "lucide-react";
export default function LandingPage({ onGetStarted, onRegisterClick }) {
  const { products, invoices } = useStore();
  const [activeDemoTab, setActiveDemoTab] = useState("warehouse");
  const [selectedSimProduct, setSelectedSimProduct] = useState("cisco");
  const [paymentAllocated, setPaymentAllocated] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(128e4);
  const [paidProgress, setPaidProgress] = useState(45);
  const handleSimulateAllocation = () => {
    if (paymentAllocated) {
      setPaidProgress(45);
      setPaymentAllocated(false);
    } else {
      setPaidProgress(100);
      setPaymentAllocated(true);
    }
  };
  const ciscoDb = products.find(p => p.sku === 'SKU-CISCO-9300');
  const corningDb = products.find(p => p.sku === 'SKU-CORNING-4KM');
  const nvidiaDb = products.find(p => p.sku === 'SKU-NVIDIA-CX6');

  const ciscoStock = {
    name: ciscoDb?.product_name || "Cisco Fiber Catalyst 9300",
    karachi: ciscoDb?.inventory.find(i => i.warehouse_id === 'wh-1' || i.warehouse_name.includes('Karachi'))?.quantity ?? 42,
    lahore: ciscoDb?.inventory.find(i => i.warehouse_id === 'wh-2' || i.warehouse_name.includes('Lahore'))?.quantity ?? 18,
    threshold: ciscoDb?.low_stock_threshold ?? 15
  };

  const corningStock = {
    name: corningDb?.product_name || "Corning Fiber Optic Spool 4km",
    karachi: corningDb?.inventory.find(i => i.warehouse_id === 'wh-1' || i.warehouse_name.includes('Karachi'))?.quantity ?? 8,
    lahore: corningDb?.inventory.find(i => i.warehouse_id === 'wh-2' || i.warehouse_name.includes('Lahore'))?.quantity ?? 12,
    threshold: corningDb?.low_stock_threshold ?? 10
  };

  const nvidiaStock = {
    name: nvidiaDb?.product_name || "Nvidia Mellanox ConnectX-6",
    karachi: nvidiaDb?.inventory.find(i => i.warehouse_id === 'wh-1' || i.warehouse_name.includes('Karachi'))?.quantity ?? 15,
    lahore: nvidiaDb?.inventory.find(i => i.warehouse_id === 'wh-2' || i.warehouse_name.includes('Lahore'))?.quantity ?? 4,
    threshold: nvidiaDb?.low_stock_threshold ?? 8
  };

  const productStockData = {
    cisco: ciscoStock,
    corning: corningStock,
    nvidia: nvidiaStock
  };

  const activeInvoice = invoices && invoices.length > 0 ? invoices.find(inv => inv.status !== 'PAID') || invoices[0] : null;
  const simulatedInvoiceNo = activeInvoice ? activeInvoice.invoice_number : "INV-2026-8802";
  const simulatedTotal = activeInvoice ? parseFloat(activeInvoice.total_amount) : 1280000;
  const simulatedPaid = activeInvoice 
    ? (paymentAllocated ? simulatedTotal : parseFloat(activeInvoice.amount_paid)) 
    : (paymentAllocated ? 1280000 : 576000);
  const simulatedProgress = Math.min(100, Math.round((simulatedPaid / (simulatedTotal || 1)) * 100));
  const simulatedStatus = paymentAllocated ? "PAID" : (activeInvoice ? activeInvoice.status.replace(/_/g, ' ') : "PARTIALLY PAID");

  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans overflow-x-hidden relative selection:bg-[#4F46E5] selection:text-white transition-colors duration-300", children: [
    /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 w-[85vw] h-[65vh] bg-gradient-to-b from-[#6366F1]/8 via-[#38BDF8]/2 to-transparent rounded-full blur-[110px] pointer-events-none z-0" }),
    /* @__PURE__ */ jsxs("header", { className: "h-16 border-b border-[#E2E8F0] bg-white/70 backdrop-blur-md flex items-center justify-between px-6 sm:px-16 z-20 sticky top-0 transition-all", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-[0_4px_12px_rgba(79,70,229,0.2)]",
            style: { fontFamily: "Outfit, sans-serif" },
            children: "IQ"
          }
        ),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "text-[#0F172A] font-extrabold text-base tracking-tight leading-none",
              style: { fontFamily: "Outfit, sans-serif" },
              children: "CommerceIQ"
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "text-[9px] text-[#4F46E5] font-bold tracking-widest uppercase mt-0.5", children: "Enterprise Logistics" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onGetStarted,
            className: "text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors bg-transparent border-0 cursor-pointer",
            children: "Sign In"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onRegisterClick,
            className: "px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-sm cursor-pointer border-0",
            children: "Apply B2B Account"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "relative z-10 pt-16 pb-10 px-6 text-center max-w-4xl mx-auto flex flex-col items-center gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 bg-[#EEF2FF] border border-[#C7D2FE] px-3.5 py-1.5 rounded-full text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider animate-fade-up", children: [
        /* @__PURE__ */ jsx(Sparkles, { size: 12, className: "text-amber-500 fill-amber-500" }),
        /* @__PURE__ */ jsx("span", { children: "Multi-Warehouse Inventory & PKR Ledger System" })
      ] }),
      /* @__PURE__ */ jsxs(
        "h1",
        {
          className: "text-4xl sm:text-[52px] font-black text-[#0F172A] leading-tight tracking-tight mt-1",
          style: { fontFamily: "Outfit, sans-serif" },
          children: [
            "Smarter Warehousing for ",
            /* @__PURE__ */ jsx("br", {}),
            /* @__PURE__ */ jsx("span", { className: "bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#0EA5E9] bg-clip-text text-transparent", children: "Modern B2B Supply Chains" })
          ]
        }
      ),
      /* @__PURE__ */ jsx("p", { className: "text-xs sm:text-sm text-[#64748B] max-w-2xl leading-relaxed", children: "CommerceIQ consolidates inventory allocations between Karachi Depot and Lahore Terminal, predicts late payment risk metrics, and automates JazzCash, EasyPaisa, and bank transfer reconciliations." }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-3.5 mt-3", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: onGetStarted,
            className: "flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs px-6 py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer border-0",
            children: [
              "Launch Interactive Demo ",
              /* @__PURE__ */ jsx(ArrowRight, { size: 14 })
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onRegisterClick,
            className: "bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#4F46E5] font-bold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-sm",
            children: "Register B2B Account"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "relative z-10 max-w-4xl w-full mx-auto px-6 pb-16", children: /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-3xl shadow-xl overflow-hidden animate-fade-up", children: [
      /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider block", children: "Operational Simulator" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-[#0F172A] mt-0.5 block", children: "Click tabs to interact with live backend features" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex bg-[#E2E8F0]/60 p-1 rounded-lg self-start", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setActiveDemoTab("warehouse"),
              className: `px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors border-0 cursor-pointer ${activeDemoTab === "warehouse" ? "bg-white text-[#4F46E5] shadow-xs" : "text-[#64748B] hover:text-[#0F172A] bg-transparent"}`,
              children: "Warehouse Logs"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setActiveDemoTab("reconciliation"),
              className: `px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors border-0 cursor-pointer ${activeDemoTab === "reconciliation" ? "bg-white text-[#4F46E5] shadow-xs" : "text-[#64748B] hover:text-[#0F172A] bg-transparent"}`,
              children: "PKR Reconciliation"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setActiveDemoTab("risk"),
              className: `px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors border-0 cursor-pointer ${activeDemoTab === "risk" ? "bg-white text-[#4F46E5] shadow-xs" : "text-[#64748B] hover:text-[#0F172A] bg-transparent"}`,
              children: "Payment Risk Radar"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 sm:p-8 min-h-[220px] flex flex-col justify-center", children: [
        activeDemoTab === "warehouse" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-5 animate-cross-fade", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold text-[#0F172A]", children: "Real-time Multi-Warehouse stock tracker" }),
              /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: "Select a catalog SKU to view Karachi vs Lahore balances." })
            ] }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: selectedSimProduct,
                onChange: (e) => setSelectedSimProduct(e.target.value),
                className: "px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-[10px] font-bold text-[#0F172A] bg-white",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "cisco", children: "Cisco Fiber Catalyst 9300" }),
                  /* @__PURE__ */ jsx("option", { value: "corning", children: "Corning Fiber Optic Spool 4km" }),
                  /* @__PURE__ */ jsx("option", { value: "nvidia", children: "Nvidia Mellanox ConnectX-6" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl flex flex-col gap-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-[10px]", children: [
                /* @__PURE__ */ jsxs("span", { className: "font-bold text-[#475569] flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsx(Warehouse, { size: 13, className: "text-[#4F46E5]" }),
                  " ",
                  "Karachi Depot"
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "font-extrabold text-[#0F172A]", children: [
                  productStockData[selectedSimProduct].karachi,
                  " PCS Available"
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
                "div",
                {
                  className: `h-full transition-all duration-500 rounded-full ${productStockData[selectedSimProduct].karachi <= productStockData[selectedSimProduct].threshold ? "bg-amber-500" : "bg-[#4F46E5]"}`,
                  style: {
                    width: `${Math.min(100, productStockData[selectedSimProduct].karachi / 50 * 100)}%`
                  }
                }
              ) }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[9px] text-[#94A3B8]", children: [
                /* @__PURE__ */ jsx("span", { children: "Reserved: 0 pcs" }),
                /* @__PURE__ */ jsx("span", { children: "Capacity: 50 pcs" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl flex flex-col gap-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-[10px]", children: [
                /* @__PURE__ */ jsxs("span", { className: "font-bold text-[#475569] flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsx(Warehouse, { size: 13, className: "text-[#0EA5E9]" }),
                  " ",
                  "Lahore Terminal"
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "font-extrabold text-[#0F172A]", children: [
                  productStockData[selectedSimProduct].lahore,
                  " PCS Available"
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
                "div",
                {
                  className: `h-full transition-all duration-500 rounded-full ${productStockData[selectedSimProduct].lahore <= productStockData[selectedSimProduct].threshold ? "bg-amber-500" : "bg-[#0EA5E9]"}`,
                  style: {
                    width: `${Math.min(100, productStockData[selectedSimProduct].lahore / 50 * 100)}%`
                  }
                }
              ) }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[9px] text-[#94A3B8]", children: [
                /* @__PURE__ */ jsx("span", { children: "Reserved: 0 pcs" }),
                /* @__PURE__ */ jsx("span", { children: "Capacity: 50 pcs" })
              ] })
            ] })
          ] }),
          (productStockData[selectedSimProduct].karachi <= productStockData[selectedSimProduct].threshold || productStockData[selectedSimProduct].lahore <= productStockData[selectedSimProduct].threshold) && /* @__PURE__ */ jsxs("div", { className: "bg-amber-50 border border-amber-200/50 rounded-xl p-2.5 flex items-center gap-2 text-[10px] text-amber-700 font-semibold animate-fade-up", children: [
            /* @__PURE__ */ jsx(
              ShieldAlert,
              {
                size: 14,
                className: "text-amber-500 flex-shrink-0"
              }
            ),
            /* @__PURE__ */ jsxs("span", { children: [
              "Trigger Warning: Stock level fell below the safety alert rule of ",
              productStockData[selectedSimProduct].threshold,
              " ",
              "units. Replenishment lead time required."
            ] })
          ] })
        ] }),
        activeDemoTab === "reconciliation" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-5 animate-cross-fade", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold text-[#0F172A]", children: "Digital Wallet Payment Allocation" }),
              /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: "Automates Pakistani payment gateways JazzCash, EasyPaisa, and bank transfer routing." })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleSimulateAllocation,
                className: "px-3.5 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[10px] font-bold rounded-lg border-0 cursor-pointer transition-colors shadow-xs",
                children: paymentAllocated ? "Reset Invoice Payment" : "Simulate PKR Mobile Wallet Transfer"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-[#F8FAFC] border border-[#E2E8F0] p-5 rounded-2xl flex flex-col gap-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row justify-between sm:items-center gap-2", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#4F46E5] font-bold uppercase tracking-wider block", children: "B2B Wholesale Invoice" }),
                /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-[#0F172A] mt-0.5 block", children: `${simulatedInvoiceNo} (${activeInvoice ? 'Live DB Record' : 'Cisco Distribution Pakistan'})` })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: /* @__PURE__ */ jsx(
                "span",
                {
                  className: `px-2 py-0.5 rounded text-[10px] font-bold ${simulatedStatus === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`,
                  children: `STATUS: ${simulatedStatus}`
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[10px] text-[#475569] font-medium", children: [
                /* @__PURE__ */ jsxs("span", { children: [
                  "Amount Received: ",
                  formatCurrency(simulatedPaid)
                ] }),
                /* @__PURE__ */ jsxs("span", { children: ["Total Invoice: ", formatCurrency(simulatedTotal)] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
                "div",
                {
                  className: "h-full bg-emerald-500 transition-all duration-700 rounded-full",
                  style: { width: `${simulatedProgress}%` }
                }
              ) })
            ] }),
            paymentAllocated && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-[10px] text-emerald-700 font-bold bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl animate-fade-up", children: [
              /* @__PURE__ */ jsx(Landmark, { size: 14 }),
              /* @__PURE__ */ jsx("span", { children: "Reconciled! JazzCash reference ID TXN-9982713 matched and invoice status set to PAID instantly." })
            ] })
          ] })
        ] }),
        activeDemoTab === "risk" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 animate-cross-fade", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold text-[#0F172A]", children: "Late Payment Risk Prediction Radar" }),
            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] mt-0.5", children: "Calculates customer DSO indicators and risk alerts dynamically." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#F8FAFC]", children: [
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 bg-[#EEF2FF] border-b border-[#E2E8F0] px-4 py-2 text-[9px] font-bold text-[#4F46E5] uppercase tracking-wider", children: [
              /* @__PURE__ */ jsx("span", { children: "Company / Wholesaler" }),
              /* @__PURE__ */ jsx("span", { className: "text-center", children: "Days Sales Outstanding" }),
              /* @__PURE__ */ jsx("span", { className: "text-right", children: "Risk Score" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "divide-y divide-[#E2E8F0] text-[11px]", children: [
              {
                name: "Karam Cables Corp",
                dso: "14 days",
                risk: "Low Risk",
                color: "text-emerald-600 bg-emerald-50"
              },
              {
                name: "Siddique Networking Ltd",
                dso: "42 days",
                risk: "Medium Risk",
                color: "text-amber-600 bg-amber-50"
              },
              {
                name: "Nvidia Advanced Edge Ltd",
                dso: "64 days",
                risk: "High Risk Alert",
                color: "text-rose-600 bg-rose-50"
              }
            ].map((client) => /* @__PURE__ */ jsxs(
              "div",
              {
                className: "grid grid-cols-3 px-4 py-2.5 items-center font-medium bg-white",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-[#0F172A]", children: client.name }),
                  /* @__PURE__ */ jsx("span", { className: "text-center text-[#64748B]", children: client.dso }),
                  /* @__PURE__ */ jsx("span", { className: "text-right", children: /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: `px-2 py-0.5 rounded text-[10px] font-bold ${client.color}`,
                      children: client.risk
                    }
                  ) })
                ]
              },
              client.name
            )) })
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: "relative z-10 max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-4 gap-4", children: [
      {
        icon: /* @__PURE__ */ jsx(Database, { size: 16 }),
        title: "Multi-Warehouse",
        desc: "Stock sync between Karachi Central & Lahore terminals."
      },
      {
        icon: /* @__PURE__ */ jsx(Landmark, { size: 16 }),
        title: "Wallet Auto-Reconcile",
        desc: "JazzCash, EasyPaisa transaction confirmation."
      },
      {
        icon: /* @__PURE__ */ jsx(TrendingUp, { size: 16 }),
        title: "Price Tier Matrix",
        desc: "Retail, Distributor, VIP pricing structures."
      },
      {
        icon: /* @__PURE__ */ jsx(ShieldAlert, { size: 16 }),
        title: "Audit compliance",
        desc: "Strict security audit log logs every action."
      }
    ].map((feat, idx) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: "bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col gap-2",
        children: [
          /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-semibold", children: feat.icon }),
          /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[#0F172A] mt-1", children: feat.title }),
          /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] leading-normal", children: feat.desc })
        ]
      },
      idx
    )) }),
    /* @__PURE__ */ jsxs("section", { className: "relative z-10 max-w-3xl mx-auto px-6 py-8 text-center flex flex-col items-center gap-4", children: [
      /* @__PURE__ */ jsx(
        "h3",
        {
          className: "text-base font-extrabold text-[#0F172A]",
          style: { fontFamily: "Outfit, sans-serif" },
          children: "Designed for B2B Wholesale Commerce"
        }
      ),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] max-w-xl leading-relaxed", children: "Integrate inventory status, logistics alerts, ledger payment allocation models, and role policies. No complex setups. Start operating immediately." })
    ] }),
    /* @__PURE__ */ jsx("footer", { className: "mt-auto border-t border-[#E2E8F0] bg-white py-6 text-center text-[#94A3B8] text-xs", children: /* @__PURE__ */ jsx("p", { children: "\xA9 2026 CommerceIQ. Created for Smart Inventory B2B Management & Credit Term Ledgering." }) })
  ] });
}
