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
  const extraClass = status === "NORMAL" ? "badge-normal-pulse" : "";
  return /* @__PURE__ */ jsx(Badge, { text: m.text, variant: m.variant, className: extraClass });
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
import { motion, useReducedMotion } from "framer-motion";

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
  const shouldReduceMotion = useReducedMotion();
  const delay = index * 0.08;

  const cardVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, delay, ease: "easeOut" }
    }
  };

  const trendText = trend || "";
  const hasArrow = trendText.includes("↑") || trendText.includes("↓") || trendText.includes("↓") || trendText.includes("↑");
  const cleanTrendText = trendText.replace(/[↑↓]/g, "").trim();

  return /* @__PURE__ */ jsxs(
    motion.div,
    {
      onClick,
      initial: "hidden",
      animate: "visible",
      variants: cardVariants,
      whileHover: shouldReduceMotion ? {} : { 
        y: -4, 
        borderColor: "#C7D2FE",
        boxShadow: "0 8px 24px rgba(79,70,229,0.10)"
      },
      className: `bg-white border rounded-xl p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden transition-all duration-200 ${onClick ? "cursor-pointer" : ""}`,
      style: {
        borderColor: isActive ? iconColor : "#E2E8F0",
        boxShadow: isActive ? `0 0 0 2px ${iconColor}15, 0 4px 6px -1px rgba(0,0,0,0.05)` : void 0
      },
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center z-10", children: [
          /* @__PURE__ */ jsx("span", { className: "text-[13px] text-[#64748B] font-semibold tracking-wide", children: label }),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0",
              style: { backgroundColor: iconBg, color: iconColor },
              children: icon
            }
          )
        ] }),
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "text-[28px] font-bold text-[#0F172A] leading-none z-10",
            style: { fontFamily: "Outfit, sans-serif" },
            children: /* @__PURE__ */ jsx(CountUp, { value })
          }
        ),
        trend && /* @__PURE__ */ jsxs(
          "div",
          {
            className: `flex items-center gap-1.5 text-xs font-semibold z-10 ${trendUp ? "text-[#10B981]" : "text-[#F59E0B]"}`,
            children: [
              hasArrow && /* @__PURE__ */ jsx(
                motion.span,
                {
                  animate: shouldReduceMotion ? {} : { y: [0, -2, 0] },
                  transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
                  children: trendText.includes("↑") ? "↑" : "↓"
                }
              ),
              /* @__PURE__ */ jsx("span", { children: cleanTrendText })
            ]
          }
        ),
        /* @__PURE__ */ jsxs("svg", {
          className: "absolute bottom-0 left-0 right-0 h-12 w-full opacity-10 pointer-events-none z-0",
          viewBox: "0 0 100 20",
          preserveAspectRatio: "none",
          children: [
            /* @__PURE__ */ jsx("defs", {
              children: /* @__PURE__ */ jsxs("linearGradient", {
                id: `spark-grad-${index}`,
                x1: "0",
                y1: "0",
                x2: "0",
                y2: "1",
                children: [
                  /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: iconColor }),
                  /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "transparent" })
                ]
              })
            }),
            /* @__PURE__ */ jsx(motion.path, {
              initial: shouldReduceMotion ? {} : { pathLength: 0 },
              animate: { pathLength: 1 },
              transition: { duration: 1.5, delay: delay + 0.2, ease: "easeInOut" },
              d: index === 0 ? "M0 15 Q 20 8, 40 18 T 80 5 T 100 12 L 100 20 L 0 20 Z" : 
                 index === 1 ? "M0 18 Q 25 12, 50 16 T 75 10 T 100 6 L 100 20 L 0 20 Z" :
                 index === 2 ? "M0 12 Q 30 15, 60 8 T 100 14 L 100 20 L 0 20 Z" :
                               "M0 10 Q 20 15, 40 5 T 80 12 T 100 18 L 100 20 L 0 20 Z",
              fill: `url(#spark-grad-${index})`,
              stroke: iconColor,
              strokeWidth: "0.75"
  })
          ]
        }),
        extra
      ]
    }
  );
}
export function ReliabilityRating({ score }) {
  const segments = [1, 2, 3, 4, 5];
  const filled = Math.round(score / 20);
  const shouldReduceMotion = useReducedMotion();
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
    /* @__PURE__ */ jsxs(motion.span, {
      initial: shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: { type: "spring", stiffness: 400, damping: 15 },
      className: "text-xs font-bold text-[#0F172A] inline-block",
      children: [
        score,
        "%"
      ]
    })
  ] });
}

export function CountUp({ value, duration = 1.2 }) {
  const [displayValue, setDisplayValue] = React.useState("");

  React.useEffect(() => {
    const stringVal = (value ?? "").toString();
    const end = parseFloat(stringVal.replace(/[^0-9.-]/g, "")) || 0;
    if (end === 0) {
      setDisplayValue(stringVal);
      return;
    }
    const startTime = performance.now();
    
    const animate = (now) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // Ease-out quad
      const current = Math.floor(easeProgress * end);
      
      if (stringVal.includes("Rs")) {
        setDisplayValue(`Rs ${current.toLocaleString()}`);
      } else if (stringVal.includes("%")) {
        setDisplayValue(`${current}%`);
      } else if (stringVal.includes("Days")) {
        setDisplayValue(`${current} Days`);
      } else {
        setDisplayValue(current.toLocaleString());
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(stringVal);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return /* @__PURE__ */ jsx(React.Fragment, { children: displayValue });
}

export function Typewriter({ text, speed = 10 }) {
  const [displayText, setDisplayText] = React.useState("");

  React.useEffect(() => {
    const stringText = (text ?? "").toString();
    let i = 0;
    setDisplayText("");
    const timer = setInterval(() => {
      if (i < stringText.length) {
        setDisplayText((prev) => prev + stringText.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return /* @__PURE__ */ jsx(React.Fragment, { children: displayText });
}
