import { jsx, jsxs } from "react/jsx-runtime";
export default function LoadingScreen({ portal }) {
  const messages = {
    admin: "Connecting to Admin Command Center...",
    distributor: "Syncing Distributor Inventory Channels...",
    buyer: "Securing B2B Purchasing Tunnel..."
  };
  return /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 bg-[#F8FAFC]/95 flex flex-col items-center justify-center z-[100] gap-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          className: "w-16 h-16 bg-[#4F46E5] rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl animate-pulse-glow",
          style: { fontFamily: "Outfit, sans-serif" },
          children: "IQ"
        }
      ),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 border-4 border-[#EEF2FF] border-t-[#4F46E5] rounded-full animate-spin scale-150" })
    ] }),
    /* @__PURE__ */ jsx(
      "p",
      {
        className: "text-lg font-semibold text-[#0F172A] mt-2",
        style: { fontFamily: "Outfit, sans-serif" },
        children: messages[portal]
      }
    ),
    /* @__PURE__ */ jsx("p", { className: "text-sm text-[#64748B]", children: "Setting up your secure workspace\u2026" })
  ] });
}
