import { jsx, jsxs } from "react/jsx-runtime";
import React from "react";
const VARIANT_STYLES = {
  success: "bg-[#ECFDF5] text-[#10B981]",
  warning: "bg-[#FEF3C7] text-[#F59E0B]",
  danger: "bg-[#FEF2F2] text-[#EF4444]",
  info: "bg-[#EEF2FF] text-[#4F46E5]",
  blue: "bg-[#EFF6FF] text-[#3B82F6]",
  gray: "bg-[#F1F5F9] text-[#64748B]",
  neutral: "bg-[#F8FAFC] text-[#64748B]"
};
export function Badge({ text, variant, className = "" }) {
  return /* @__PURE__ */ jsx(
    "span",
    {
      className: `inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-[4px] leading-none tracking-wide animate-pop-scale ${VARIANT_STYLES[variant]} ${className}`,
      children: text
    }
  );
}
export function StockAlertBadge({ status }) {
  const mappings = {
    LOW_STOCK: { text: "LOW STOCK", variant: "warning" },
    OVERSTOCK: { text: "OVERSTOCK", variant: "blue" },
    DEAD_STOCK: { text: "DEAD STOCK", variant: "gray" },
    NORMAL: { text: "NORMAL", variant: "success" }
  };
  const m = mappings[status] || { text: "UNKNOWN", variant: "neutral" };
  return /* @__PURE__ */ jsx(Badge, { text: m.text, variant: m.variant });
}
export function ProductStatusBadge({ status }) {
  const mappings = {
    ACTIVE: { text: "ACTIVE", variant: "success" },
    INACTIVE: { text: "INACTIVE", variant: "warning" },
    DISCONTINUED: { text: "DISCONTINUED", variant: "danger" }
  };
  const m = mappings[status] || { text: "ACTIVE", variant: "success" };
  return /* @__PURE__ */ jsx(Badge, { text: m.text, variant: m.variant });
}
export function OrderStatusBadge({ status }) {
  const mappings = {
    DRAFT: { text: "DRAFT", variant: "neutral" },
    CONFIRMED: { text: "CONFIRMED", variant: "blue" },
    PROCESSING: { text: "PROCESSING", variant: "warning" },
    SHIPPED: { text: "SHIPPED", variant: "info" },
    DELIVERED: { text: "DELIVERED", variant: "success" },
    CANCELLED: { text: "CANCELLED", variant: "danger" },
    RETURNED: { text: "RETURNED", variant: "gray" },
    PROCEED: { text: "PROCEED", variant: "warning" }
  };
  return /* @__PURE__ */ jsx(
    Badge,
    {
      text: mappings[status]?.text || status,
      variant: mappings[status]?.variant || "neutral"
    }
  );
}
export function InvoiceStatusBadge({ status }) {
  const mappings = {
    DRAFT: { text: "DRAFT", variant: "neutral" },
    ISSUED: { text: "ISSUED", variant: "neutral" },
    SENT: { text: "SENT", variant: "blue" },
    PARTIALLY_PAID: { text: "PARTIALLY PAID", variant: "warning" },
    PAID: { text: "PAID", variant: "success" },
    OVERDUE: { text: "OVERDUE", variant: "danger" },
    CLOSED: { text: "CLOSED", variant: "gray" },
    CANCELLED: { text: "CANCELLED", variant: "danger" }
  };
  return /* @__PURE__ */ jsx(
    Badge,
    {
      text: mappings[status]?.text || status,
      variant: mappings[status]?.variant || "neutral"
    }
  );
}
export function LatePaymentRiskBadge({ probability }) {
  const pct = Math.round(probability * 100);
  let variant = "success";
  let label = "Low Risk";
  if (probability > 0.6) {
    variant = "danger";
    label = "High Risk";
  } else if (probability >= 0.3) {
    variant = "warning";
    label = "Medium Risk";
  }
  return /* @__PURE__ */ jsx(Badge, { text: `${pct}% Risk (${label})`, variant });
}
export function KpiCard({
  label,
  value,
  trend,
  trendUp,
  icon,
  iconBg = "#EEF2FF",
  iconColor = "#4F46E5",
  extra,
  index,
  onClick,
  isActive
}) {
  const delay = `${index * 50}ms`;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      onClick,
      className: `kpi-card bg-white border rounded-xl p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden animate-fade-up opacity-0 transition-all duration-200 ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""}`,
      style: {
        animationDelay: delay,
        animationFillMode: "forwards",
        borderColor: isActive ? iconColor : "#E2E8F0",
        boxShadow: isActive ? `0 0 0 2px ${iconColor}15, 0 4px 6px -1px rgba(0,0,0,0.05)` : void 0
      },
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
          /* @__PURE__ */ jsx("span", { className: "text-[13px] text-[#64748B] font-medium tracking-wide", children: label }),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "w-10 h-10 rounded-[8px] flex items-center justify-center",
              style: { backgroundColor: iconBg, color: iconColor },
              children: icon
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "text-[28px] font-bold text-[#0F172A] leading-none",
            style: { fontFamily: "Outfit, sans-serif" },
            children: value
          }
        ),
        trend && /* @__PURE__ */ jsx(
          "div",
          {
            className: `flex items-center gap-1.5 text-xs font-semibold ${trendUp ? "text-[#10B981]" : "text-[#F59E0B]"}`,
            children: trend
          }
        ),
        extra
      ]
    }
  );
}
export function ReliabilityRating({ score }) {
  const segments = [1, 2, 3, 4, 5];
  const filled = Math.round(score / 20);
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsx("div", { className: "flex gap-0.5", children: segments.map((s) => /* @__PURE__ */ jsx(
      "div",
      {
        className: "w-3.5 h-1.5 rounded-sm transition-colors duration-300",
        style: {
          backgroundColor: s <= filled ? score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444" : "#E2E8F0"
        }
      },
      s
    )) }),
    /* @__PURE__ */ jsxs("span", { className: "text-xs font-bold text-[#0F172A]", children: [
      score,
      "%"
    ] })
  ] });
}
