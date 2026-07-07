import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  formatCurrency,
  computeStockAlertStatus,
  formatDate
} from "@/lib/data";
import { ProductStatusBadge, StockAlertBadge, Badge } from "@/components/ui";
import Drawer from "@/components/Drawer";
import {
  CheckCircle,
  Warehouse,
  Edit3,
  Save,
  ArrowUpCircle,
  ArrowDownCircle,
  History
} from "lucide-react";
export default function ProductDrawer({ product, open, onClose }) {
  const { adjustWarehouseStock, updateProductAlertRules, stockMovements, deleteProduct } = useStore();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    product.inventory[0]?.warehouse_id || ""
  );
  const [delta, setDelta] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [toast, setToast] = useState("");
  const [editingThresholds, setEditingThresholds] = useState(false);
  const [lowThreshold, setLowThreshold] = useState(product.low_stock_threshold);
  const [totalProductLimit, setTotalProductLimit] = useState(
    product.total_product_limit || 100
  );
  const [detailTab, setDetailTab] = useState("stock");
  const handleAdjust = (e) => {
    e.preventDefault();
    const n = parseInt(delta);
    if (isNaN(n) || !selectedWarehouseId) return;
    adjustWarehouseStock(
      product.product_id,
      selectedWarehouseId,
      n,
      adjustNotes || "Manual inventory audit adjustment."
    );
    setDelta("");
    setAdjustNotes("");
    setToast("Ledger adjustment applied successfully!");
    setTimeout(() => setToast(""), 2500);
  };
  const handleSaveThresholds = () => {
    updateProductAlertRules(product.product_id, lowThreshold, totalProductLimit, totalProductLimit);
    setEditingThresholds(false);
    setToast("Alert thresholds and limit rules updated!");
    setTimeout(() => setToast(""), 2500);
  };
  const totalQuantity = product.inventory.reduce(
    (sum, inv) => sum + inv.quantity,
    0
  );
  const totalReserved = product.inventory.reduce(
    (sum, inv) => sum + inv.reserved_quantity,
    0
  );
  const totalAvailable = product.inventory.reduce(
    (sum, inv) => sum + inv.available_quantity,
    0
  );
  const derivedAlertStatus = computeStockAlertStatus(
    totalAvailable,
    product.low_stock_threshold,
    product.total_product_limit || 100
  );
  const productMovements = stockMovements.filter(
    (m) => m.product_id === product.product_id
  );
  const DETAIL_TABS = [
    { id: "stock", label: "Warehouse Stock" },
    { id: "prices", label: "Price Tiers" },
    { id: "history", label: "Movement Log" }
  ];
  return /* @__PURE__ */ jsxs(
    Drawer,
    {
      open,
      onClose,
      title: product.product_name,
      subtitle: `SKU: ${product.sku} | Barcode: ${product.barcode}`,
      footer: /* @__PURE__ */ jsxs("div", { className: "flex gap-2 w-full", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              if (window.confirm(`Are you sure you want to permanently delete "${product.product_name}" from the inventory catalog?`)) {
                deleteProduct(product.product_id);
                onClose();
              }
            },
            className: "flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border-0",
            children: "Delete Product"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onClose,
            className: "flex-1 py-2.5 border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer bg-white",
            children: "Close Sheet"
          }
        )
      ] }),
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsx(ProductStatusBadge, { status: product.status }),
          /* @__PURE__ */ jsx(StockAlertBadge, { status: derivedAlertStatus }),
          /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-[#64748B] font-medium ml-auto", children: [
            "Total: ",
            /* @__PURE__ */ jsx("strong", { className: "text-[#0F172A]", children: totalQuantity }),
            " | Reserved: ",
            /* @__PURE__ */ jsx("strong", { className: "text-[#E11D48]", children: totalReserved }),
            " ",
            "| Available:",
            " ",
            /* @__PURE__ */ jsx("strong", { className: "text-[#4F46E5]", children: totalAvailable })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(InfoSection, { title: "Product Metadata", children: [
          /* @__PURE__ */ jsx(
            InfoGrid,
            {
              items: [
                { label: "Brand", val: product.brand },
                { label: "Category Group", val: product.category },
                { label: "Base Unit", val: product.unit },
                { label: "Weight (kg)", val: `${product.weight.toFixed(2)} kg` }
              ]
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-[#64748B] mt-3 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] leading-relaxed", children: product.short_description })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "border-t border-[#F1F5F9] pt-4 mt-4", children: [
          /* @__PURE__ */ jsx("div", { className: "flex border border-[#E2E8F0] rounded-lg overflow-hidden mb-4", children: DETAIL_TABS.map((t) => /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setDetailTab(t.id),
              className: `flex-1 px-3 py-2 text-[11px] font-bold border-0 cursor-pointer transition-all duration-150 ${detailTab === t.id ? "bg-[#4F46E5] text-white" : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"}`,
              children: t.label
            },
            t.id
          )) }),
          detailTab === "stock" && /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-2.5 animate-cross-fade", children: product.inventory.map((inv) => {
            const pct = totalQuantity > 0 ? inv.quantity / totalQuantity * 100 : 0;
            return /* @__PURE__ */ jsxs(
              "div",
              {
                className: "bg-white border border-[#E2E8F0] rounded-lg p-3 flex flex-col gap-2 shadow-sm hover:border-[#4F46E5]/30 transition-colors",
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-[11px] font-bold text-[#0F172A]", children: [
                      /* @__PURE__ */ jsx(Warehouse, { size: 13, className: "text-[#4F46E5]" }),
                      inv.warehouse_name
                    ] }),
                    /* @__PURE__ */ jsx(
                      StockAlertBadge,
                      {
                        status: computeStockAlertStatus(
                          inv.available_quantity,
                          product.low_stock_threshold,
                          product.total_product_limit || 100
                        )
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: "h-full bg-[#4F46E5] rounded-full transition-all duration-500",
                      style: { width: `${Math.min(pct, 100)}%` }
                    }
                  ) }),
                  /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2 text-center text-[10px] pt-1 border-t border-[#F8FAFC]", children: [
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { className: "text-[#64748B]", children: "Quantity" }),
                      /* @__PURE__ */ jsx("div", { className: "font-bold text-[#0F172A]", children: inv.quantity })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { className: "text-[#64748B]", children: "Reserved" }),
                      /* @__PURE__ */ jsx("div", { className: "font-bold text-[#E11D48]", children: inv.reserved_quantity })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { className: "text-[#4F46E5] font-semibold", children: "Available" }),
                      /* @__PURE__ */ jsx("div", { className: "font-bold text-[#4F46E5]", children: inv.available_quantity })
                    ] })
                  ] })
                ]
              },
              inv.warehouse_id
            );
          }) }),
          detailTab === "prices" && /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-2 text-xs animate-cross-fade", children: [
            {
              tier: "Retail Rate",
              price: product.prices.RETAIL,
              color: "#0F172A",
              bg: "#F8FAFC"
            },
            {
              tier: "Distributor Rate",
              price: product.prices.DISTRIBUTOR,
              color: "#4F46E5",
              bg: "#EEF2FF"
            },
            {
              tier: "VIP Tier Rate",
              price: product.prices.VIP,
              color: "#059669",
              bg: "#ECFDF5"
            },
            {
              tier: "Custom Rate",
              price: product.prices.CUSTOM,
              color: "#7C3AED",
              bg: "#F5F3FF"
            }
          ].map((p) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "border border-[#E2E8F0] p-3 rounded-lg",
              style: { backgroundColor: p.bg },
              children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: "font-semibold block text-[11px]",
                    style: { color: p.color },
                    children: p.tier
                  }
                ),
                /* @__PURE__ */ jsx(
                  "strong",
                  {
                    className: "text-sm mt-1 block",
                    style: { color: p.color },
                    children: formatCurrency(p.price)
                  }
                )
              ]
            },
            p.tier
          )) }),
          detailTab === "history" && /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-2 animate-cross-fade", children: productMovements.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-center text-[11px] text-[#94A3B8] py-6 font-medium", children: "No stock movements recorded for this SKU yet." }) : productMovements.map((m) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "border border-[#E2E8F0] rounded-lg p-3 flex items-start gap-3 bg-white hover:bg-[#F8FAFC] transition-colors",
              children: [
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: `w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${m.movement_type === "IN" ? "bg-[#ECFDF5] text-[#10B981]" : m.movement_type === "OUT" ? "bg-[#FEF2F2] text-[#EF4444]" : "bg-[#EEF2FF] text-[#4F46E5]"}`,
                    children: m.movement_type === "IN" ? /* @__PURE__ */ jsx(ArrowUpCircle, { size: 14 }) : m.movement_type === "OUT" ? /* @__PURE__ */ jsx(ArrowDownCircle, { size: 14 }) : /* @__PURE__ */ jsx(History, { size: 14 })
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx("span", { className: "text-[11px] font-bold text-[#0F172A]", children: m.movement_type }),
                    /* @__PURE__ */ jsx(
                      Badge,
                      {
                        text: `${m.quantity > 0 ? "+" : ""}${m.quantity}`,
                        variant: m.quantity > 0 ? "success" : "danger"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B] mt-0.5 leading-relaxed", children: m.notes }),
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mt-1 text-[9px] text-[#94A3B8]", children: [
                    /* @__PURE__ */ jsx("span", { children: m.warehouse_name }),
                    /* @__PURE__ */ jsx("span", { children: "\u2022" }),
                    /* @__PURE__ */ jsx("span", { children: formatDate(m.created_at) }),
                    /* @__PURE__ */ jsx("span", { children: "\u2022" }),
                    /* @__PURE__ */ jsx("span", { children: m.performed_by })
                  ] })
                ] })
              ]
            },
            m.movement_id
          )) })
        ] }),
        /* @__PURE__ */ jsx(InfoSection, { title: "Stock Alert Threshold Rules", children: editingThresholds ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-medium block mb-1", children: "Low Stock Trigger" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  className: "input-field py-2 text-xs",
                  value: lowThreshold,
                  onChange: (e) => setLowThreshold(parseInt(e.target.value) || 0)
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-medium block mb-1", children: "Total Product Limit" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  className: "input-field py-2 text-xs",
                  value: totalProductLimit,
                  onChange: (e) => setTotalProductLimit(parseInt(e.target.value) || 0)
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: handleSaveThresholds,
                className: "flex items-center gap-1.5 px-3 py-1.5 bg-[#4F46E5] text-white text-[11px] font-bold rounded-lg hover:bg-[#4338CA] transition-colors cursor-pointer border-0",
                children: [
                  /* @__PURE__ */ jsx(Save, { size: 12 }),
                  " Save Changes"
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => {
                  setEditingThresholds(false);
                  setLowThreshold(product.low_stock_threshold);
                  setTotalProductLimit(product.total_product_limit || 100);
                },
                className: "px-3 py-1.5 text-[11px] font-bold text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] cursor-pointer bg-white",
                children: "Cancel"
              }
            )
          ] })
        ] }) : /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx(
            InfoGrid,
            {
              items: [
                {
                  label: "Low Stock Trigger",
                  val: `${product.low_stock_threshold} units`
                },
                {
                  label: "Total Product Limit",
                  val: `${product.total_product_limit || 100} units`
                },
                {
                  label: "Dead Stock Limit",
                  val: `${product.dead_stock_days} days`
                }
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => setEditingThresholds(true),
              className: "flex items-center gap-1 text-[10px] font-bold text-[#4F46E5] hover:text-[#4338CA] cursor-pointer border-0 bg-transparent flex-shrink-0 ml-3",
              children: [
                /* @__PURE__ */ jsx(Edit3, { size: 12 }),
                " Edit"
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "bg-[#F8FAFC] border border-dashed border-[#E2E8F0] rounded-xl p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-[#0F172A] uppercase tracking-wider mb-3", children: "Quick Stock Adjuster" }),
          /* @__PURE__ */ jsxs("form", { onSubmit: handleAdjust, className: "flex flex-col gap-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-medium mb-1.5 block", children: "Target Warehouse" }),
              /* @__PURE__ */ jsx(
                "select",
                {
                  className: "input-field py-2 text-xs",
                  value: selectedWarehouseId,
                  onChange: (e) => setSelectedWarehouseId(e.target.value),
                  required: true,
                  children: product.inventory.map((inv) => /* @__PURE__ */ jsxs("option", { value: inv.warehouse_id, children: [
                    inv.warehouse_name,
                    " (Avail: ",
                    inv.available_quantity,
                    ")"
                  ] }, inv.warehouse_id))
                }
              )
            ] }),
            /* @__PURE__ */ jsx("div", { className: "flex gap-3", children: /* @__PURE__ */ jsx(
              "input",
              {
                className: "input-field py-2 text-xs flex-1",
                type: "number",
                placeholder: "e.g. +20 or -15",
                value: delta,
                onChange: (e) => setDelta(e.target.value),
                required: true
              }
            ) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-[10px] text-[#64748B] font-medium mb-1.5 block", children: "Movement Notes" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "input-field py-2 text-xs",
                  placeholder: "Reason for adjustment (optional)",
                  value: adjustNotes,
                  onChange: (e) => setAdjustNotes(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "submit",
                className: "w-full px-4 py-2.5 bg-[#4F46E5] text-white text-[11px] font-bold rounded-lg hover:bg-[#4338CA] transition-colors cursor-pointer border-0",
                children: "Apply Adjustment"
              }
            )
          ] }),
          toast && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mt-3 text-[11px] text-[#10B981] font-bold animate-fade-up", children: [
            /* @__PURE__ */ jsx(CheckCircle, { size: 14 }),
            " ",
            toast
          ] })
        ] })
      ]
    }
  );
}
function InfoSection({ title, children }) {
  return /* @__PURE__ */ jsxs("div", { className: "border-t border-[#F1F5F9] pt-4 mt-4 first:border-0 first:pt-0 first:mt-0", children: [
    /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2.5", children: title }),
    children
  ] });
}
function InfoGrid({ items }) {
  return /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3.5", children: items.map((i) => /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#64748B]", children: i.label }),
    /* @__PURE__ */ jsx("p", { className: "text-[11px] font-bold text-[#0F172A] mt-0.5", children: i.val })
  ] }, i.label)) });
}
