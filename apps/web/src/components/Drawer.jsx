import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { X } from "lucide-react";
export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: `drawer-backdrop transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`,
        onClick: onClose
      }
    ),
    /* @__PURE__ */ jsxs(
      "aside",
      {
        className: `drawer-panel ${open ? "open" : ""}`,
        style: {
          boxShadow: open ? "-10px 0 30px rgba(15, 23, 42, 0.08)" : "none"
        },
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-6 border-b border-[#E2E8F0] flex-shrink-0", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(
                "h2",
                {
                  className: "text-lg font-bold text-[#0F172A]",
                  style: { fontFamily: "Outfit, sans-serif" },
                  children: title
                }
              ),
              subtitle && /* @__PURE__ */ jsx("p", { className: "text-xs text-[#94A3B8] mt-0.5", children: subtitle })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: onClose,
                className: "w-9 h-9 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors",
                children: /* @__PURE__ */ jsx(X, { size: 20 })
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto p-6 flex flex-col gap-6", children }),
          footer && /* @__PURE__ */ jsx("div", { className: "p-6 border-t border-[#E2E8F0] flex-shrink-0", children: footer })
        ]
      }
    )
  ] });
}
