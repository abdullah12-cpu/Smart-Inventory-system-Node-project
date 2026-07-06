import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { X } from "lucide-react";
export default function Modal({ open, onClose, title, children }) {
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
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "modal-backdrop",
      onClick: (e) => {
        if (e.target === e.currentTarget) onClose();
      },
      children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-dropdown mx-4 border border-[#E2E8F0]", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-6 border-b border-[#E2E8F0]", children: [
          /* @__PURE__ */ jsx(
            "h3",
            {
              className: "text-sm font-bold text-[#0F172A]",
              style: { fontFamily: "Outfit, sans-serif" },
              children: title
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onClose,
              className: "w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors border-0 bg-transparent cursor-pointer",
              children: /* @__PURE__ */ jsx(X, { size: 18 })
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "p-6", children })
      ] })
    }
  );
}
