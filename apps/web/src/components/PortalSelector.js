import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import {
  ShoppingCart,
  Server,
  Package,
  ChevronDown,
  Check
} from "lucide-react";
const PORTAL_OPTIONS = [
  {
    id: "buyer",
    name: "Buyer Portal",
    desc: "Product catalog and purchasing",
    icon: /* @__PURE__ */ jsx(ShoppingCart, { size: 18 }),
    iconBg: "#EEF2FF",
    iconColor: "#4F46E5"
  },
  {
    id: "admin",
    name: "Admin Portal",
    desc: "Platform administration and analytics",
    icon: /* @__PURE__ */ jsx(Server, { size: 18 }),
    iconBg: "#F1F5F9",
    iconColor: "#475569"
  },
  {
    id: "distributor",
    name: "Distributor Portal",
    desc: "Inventory and order management",
    icon: /* @__PURE__ */ jsx(Package, { size: 18 }),
    iconBg: "#F0FDF4",
    iconColor: "#16A34A"
  }
];
export default function PortalSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = PORTAL_OPTIONS.find((o) => o.id === value) || PORTAL_OPTIONS[0];
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "relative", ref, children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: () => setOpen((o) => !o),
        className: `w-full flex items-center justify-between p-3 rounded-[10px] border-[1.5px] transition-all duration-150 bg-white text-left cursor-pointer ${open ? "border-[#4F46E5] shadow-[0_0_20px_rgba(79,70,229,0.15)]" : "border-[#E2E8F0] hover:border-[#94A3B8] hover:bg-[#F8FAFC]"}`,
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all duration-150",
                style: {
                  backgroundColor: selected.iconBg,
                  color: selected.iconColor
                },
                children: selected.icon
              }
            ),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "font-semibold text-sm text-[#0F172A]", children: selected.name }),
              /* @__PURE__ */ jsx("div", { className: "text-xs text-[#64748B]", children: selected.desc })
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            ChevronDown,
            {
              size: 18,
              className: `text-[#94A3B8] transition-transform duration-300 ${open ? "rotate-180" : ""}`
            }
          )
        ]
      }
    ),
    open && /* @__PURE__ */ jsx("div", { className: "absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[#E2E8F0] rounded-[10px] shadow-lg z-50 p-1.5 animate-dropdown", children: PORTAL_OPTIONS.map((opt) => /* @__PURE__ */ jsxs(
      "div",
      {
        onMouseDown: (e) => e.stopPropagation(),
        onClick: () => {
          onChange(opt.id);
          setOpen(false);
        },
        className: `flex items-center justify-between px-3 py-2.5 rounded-[6px] cursor-pointer transition-all duration-150 ${value === opt.id ? "bg-[#EEF2FF]" : "hover:bg-[#F8FAFC]"}`,
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0",
                style: { backgroundColor: opt.iconBg, color: opt.iconColor },
                children: opt.icon
              }
            ),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "font-semibold text-sm text-[#0F172A]", children: opt.name }),
              /* @__PURE__ */ jsx("div", { className: "text-xs text-[#64748B]", children: opt.desc })
            ] })
          ] }),
          value === opt.id && /* @__PURE__ */ jsx(Check, { size: 16, className: "text-[#4F46E5]" })
        ]
      },
      opt.id
    )) })
  ] });
}
