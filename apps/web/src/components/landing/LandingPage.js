import { Fragment, jsx, jsxs } from "react/jsx-runtime";
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
    /* @__PURE__ */ jsxs("section", { className: "relative z-10 pt-16 pb-12 px-6 text-center max-w-4xl mx-auto flex flex-col items-center gap-6 mt-6 sm:mt-12", children: [
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
    /* @__PURE__ */ jsx("section", { className: "relative z-10 max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-4", children: [
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
    /* @__PURE__ */ jsx("footer", { className: "mt-auto border-t border-[#E2E8F0] bg-white py-6 text-center text-[#94A3B8] text-xs", children: /* @__PURE__ */ jsx("p", { children: "© 2026 CommerceIQ. Created for Smart Inventory B2B Management & Credit Term Ledgering." }) })
  ] });
}
