import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import {
  Plus,
  DollarSign,
  Clock,
  ShieldAlert,
  BarChart3,
  CheckCircle
} from "lucide-react";
import { useStore } from "@/lib/store";
import { computeStockAlertStatus, formatCurrency } from "@/lib/data";
import { KpiCard, StockAlertBadge, ProductStatusBadge } from "@/components/ui";
import ProductDrawer from "./ProductDrawer";
import AddSkuModal from "./AddSkuModal";
const ALIGN_TABS = [
  { id: "all", label: "My Products" },
  { id: "LOW_STOCK", label: "Low Stock" }
];
export default function AdminDashboard({ search, mode }) {
  const { products } = useStore();
  const [tab, setTab] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockTypeFilter, setStockTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [addSkuOpen, setAddSkuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [flashingIds, setFlashingIds] = useState({});
  const [prevStock, setPrevStock] = useState({});
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [tab, search, warehouseFilter, categoryFilter, stockTypeFilter]);
  const categories = Array.from(new Set(products.map((p) => p.category)));
  useEffect(() => {
    const newFlashing = {};
    let hasChanges = false;
    products.forEach((p) => {
      const totalQty = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const prev = prevStock[p.product_id];
      if (prev !== void 0 && prev !== totalQty) {
        newFlashing[p.product_id] = true;
        hasChanges = true;
      }
    });
    if (hasChanges) {
      setFlashingIds((prev) => ({ ...prev, ...newFlashing }));
      const timer = setTimeout(() => {
        setFlashingIds({});
      }, 500);
      const newStockMap = {};
      products.forEach((p) => {
        newStockMap[p.product_id] = p.inventory.reduce(
          (sum, inv) => sum + inv.quantity,
          0
        );
      });
      setPrevStock(newStockMap);
      return () => clearTimeout(timer);
    } else if (Object.keys(prevStock).length === 0 && products.length > 0) {
      const initMap = {};
      products.forEach((p) => {
        initMap[p.product_id] = p.inventory.reduce(
          (sum, inv) => sum + inv.quantity,
          0
        );
      });
      setPrevStock(initMap);
    }
  }, [products, prevStock]);
  const totalValuation = products.reduce((acc, p) => {
    const totalQty = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    return acc + totalQty * p.prices.RETAIL;
  }, 0);
  const lowStockCount = products.filter((p) => {
    const totalAvail = p.inventory.reduce(
      (sum, inv) => sum + inv.available_quantity,
      0
    );
    return totalAvail <= p.low_stock_threshold;
  }).length;
  const stockoutRate = Math.round(
    products.filter(
      (p) => p.inventory.reduce((sum, inv) => sum + inv.quantity, 0) === 0
    ).length / products.length * 100
  );
  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.product_name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
    const totalAvail = p.inventory.reduce(
      (sum, inv) => sum + inv.available_quantity,
      0
    );
    const alertStatus = computeStockAlertStatus(
      totalAvail,
      p.low_stock_threshold,
      p.overstock_threshold
    );
    const matchTab = tab === "all" || tab === alertStatus;
    let matchWarehouse = true;
    if (warehouseFilter !== "all") {
      const invItem = p.inventory.find(
        (i) => i.warehouse_name === warehouseFilter
      );
      matchWarehouse = invItem ? invItem.quantity > 0 : false;
    }
    const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
    const totalReserved = p.inventory.reduce((sum, inv) => sum + (inv.reserved_quantity || 0), 0);
    const matchStockType = stockTypeFilter === "all" || (stockTypeFilter === "locked" && totalReserved > 0);
    return matchSearch && matchTab && matchWarehouse && matchCategory && matchStockType;
  });
  const selectedProduct = selectedId != null ? products.find((p) => p.product_id === selectedId) : null;
  if (mode === "dashboard") {
    return /* @__PURE__ */ jsx("div", { className: "px-8 pt-8", children: 
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: loading ? Array.from({ length: 4 }).map((_, idx) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: "bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm flex flex-col gap-4 animate-fade-up",
          children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
              /* @__PURE__ */ jsx("div", { className: "w-24 h-4 rounded shimmer-skeleton" }),
              /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-lg shimmer-skeleton" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "w-32 h-8 rounded shimmer-skeleton" }),
            /* @__PURE__ */ jsx("div", { className: "w-28 h-3 rounded shimmer-skeleton" })
          ]
        },
        idx
      )) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(
          KpiCard,
          {
            label: "GMV (Global Valuation)",
            value: formatCurrency(totalValuation),
            trend: "\u2191 +14.2% versus last snapshot",
            trendUp: true,
            icon: /* @__PURE__ */ jsx(DollarSign, { size: 18 }),
            index: 0
          }
        ),
        /* @__PURE__ */ jsx(
          KpiCard,
          {
            label: "DSO (Days Sales Outstanding)",
            value: "18.4 Days",
            trend: "\u2193 -2.1 days improvement",
            trendUp: true,
            icon: /* @__PURE__ */ jsx(Clock, { size: 18 }),
            iconBg: "#EFF6FF",
            iconColor: "#3B82F6",
            index: 1
          }
        ),
        /* @__PURE__ */ jsx(
          KpiCard,
          {
            label: "GROSS_MARGIN (Global)",
            value: "34.8%",
            trend: "Stable within tax band",
            trendUp: true,
            icon: /* @__PURE__ */ jsx(BarChart3, { size: 18 }),
            iconBg: "#ECFDF5",
            iconColor: "#10B981",
            index: 2
          }
        ),
        /* @__PURE__ */ jsx(
          KpiCard,
          {
            label: "STOCKOUT_RATE",
            value: `${stockoutRate}%`,
            trend: lowStockCount > 0 ? `${lowStockCount} products currently flagged` : "Healthy capacity limits",
            trendUp: stockoutRate < 10,
            icon: /* @__PURE__ */ jsx(ShieldAlert, { size: 18 }),
            iconBg: "#FEF2F2",
            iconColor: "#EF4444",
            index: 3
          }
        )
      ] }) })
    });
  }

  return /* @__PURE__ */ jsxs("div", { className: "page-container relative", children: [
    toast && /* @__PURE__ */ jsxs("div", { className: "fixed bottom-6 right-6 bg-[#ECFDF5] border border-[#10B981]/30 px-4 py-3 rounded-lg shadow-xl flex items-center gap-2.5 z-[9999] text-xs font-bold text-[#059669] animate-fade-up", children: [
      /* @__PURE__ */ jsx(CheckCircle, { size: 16 }),
      toast
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(
          "h1",
          {
            className: "text-2xl font-bold text-[#0F172A]",
            style: { fontFamily: "Outfit, sans-serif" },
            children: "My Products Catalog"
          }
        ),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-[#64748B] mt-1", children: "Real-time tracking of multi-warehouse availability, supply chain alert signals, and price tiers." })
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setAddSkuOpen(true),
          className: "flex items-center gap-2 bg-[#4F46E5] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#4338CA] transition-colors shadow-sm cursor-pointer border-0",
          children: [
            /* @__PURE__ */ jsx(Plus, { size: 16 }),
            " Add Product"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-4 flex-wrap", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-bold text-[#0F172A] tracking-tight", children: "Stock Alert Ledgers" }),
          /* @__PURE__ */ jsx("div", { className: "flex border border-[#E2E8F0] rounded-md overflow-hidden text-[11px]", children: ALIGN_TABS.map((t) => /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setTab(t.id),
              className: `px-3 py-1.5 font-bold border-0 bg-white cursor-pointer transition-all duration-150 ${tab === t.id ? "bg-[#EEF2FF] text-[#4F46E5]" : "text-[#64748B] hover:bg-[#F8FAFC]"}`,
              children: t.label
            },
            t.id
          )) })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "text-xs font-semibold text-[#64748B] border border-[#E2E8F0] px-3 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer bg-white", children: "Export CSV" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "px-6 py-3 bg-[#F8FAFC]/55 border-b border-[#E2E8F0] flex items-center gap-4 flex-wrap text-xs", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Depot filter:" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: warehouseFilter,
              onChange: (e) => setWarehouseFilter(e.target.value),
              className: "px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
              children: [
                /* @__PURE__ */ jsx("option", { value: "all", children: "All Warehouses" }),
                /* @__PURE__ */ jsx("option", { value: "Karachi Central Depot", children: "Karachi Central Depot" }),
                /* @__PURE__ */ jsx("option", { value: "Lahore North Terminal", children: "Lahore North Terminal" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Category filter:" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: categoryFilter,
              onChange: (e) => setCategoryFilter(e.target.value),
              className: "px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
              children: [
                /* @__PURE__ */ jsx("option", { value: "all", children: "All Categories" }),
                categories.map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: "Stock Type:" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: stockTypeFilter,
              onChange: (e) => setStockTypeFilter(e.target.value),
              className: "px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#4F46E5] transition-colors",
              children: [
                /* @__PURE__ */ jsx("option", { value: "all", children: "All Stock" }),
                /* @__PURE__ */ jsx("option", { value: "locked", children: "Locked Stock (Reserved)" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "ml-auto text-[10px] text-[#64748B] font-medium bg-[#EEF2FF] border border-[#C7D2FE] px-2.5 py-1 rounded-full", children: [
          "Filtered:",
          " ",
          /* @__PURE__ */ jsx("span", { className: "font-extrabold text-[#4F46E5]", children: filtered.length }),
          " ",
          "Products"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left border-collapse", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-[#F8FAFC] border-b border-[#E2E8F0]", children: [
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Product Details" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider", children: "Brand & Category" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right", children: "Quantity" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right", children: "Reserved" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right", children: "Available" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-center", children: "Alert Status" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider text-right", children: "Retail Price" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: loading ? Array.from({ length: 5 }).map((_, rowIdx) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-[#E2E8F0]", children: [
          /* @__PURE__ */ jsxs("td", { className: "px-6 py-4", children: [
            /* @__PURE__ */ jsx("div", { className: "w-36 h-3 rounded shimmer-skeleton mb-1.5" }),
            /* @__PURE__ */ jsx("div", { className: "w-20 h-2 rounded shimmer-skeleton" })
          ] }),
          /* @__PURE__ */ jsxs("td", { className: "px-6 py-4", children: [
            /* @__PURE__ */ jsx("div", { className: "w-24 h-3 rounded shimmer-skeleton mb-1.5" }),
            /* @__PURE__ */ jsx("div", { className: "w-16 h-2 rounded shimmer-skeleton" })
          ] }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-12 h-3 rounded shimmer-skeleton ml-auto" }) }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-10 h-3 rounded shimmer-skeleton ml-auto" }) }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-12 h-3 rounded shimmer-skeleton ml-auto" }) }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-16 h-4 rounded shimmer-skeleton mx-auto" }) }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "w-16 h-3 rounded shimmer-skeleton ml-auto" }) })
        ] }, rowIdx)) : filtered.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx(
          "td",
          {
            colSpan: 7,
            className: "text-center py-12 text-xs text-[#94A3B8] font-medium",
            children: "No products match the selected criteria."
          }
        ) }) : filtered.map((p) => {
          const totalQty = p.inventory.reduce(
            (sum, inv) => sum + inv.quantity,
            0
          );
          const totalRes = p.inventory.reduce(
            (sum, inv) => sum + inv.reserved_quantity,
            0
          );
          const totalAvail = p.inventory.reduce(
            (sum, inv) => sum + inv.available_quantity,
            0
          );
          const alertStatus = computeStockAlertStatus(
            totalAvail,
            p.low_stock_threshold,
            p.overstock_threshold
          );
          const isFlashing = flashingIds[p.product_id];
          return /* @__PURE__ */ jsxs(
            "tr",
            {
              onClick: () => setSelectedId(p.product_id),
              className: `data-row border-b border-[#E2E8F0] cursor-pointer text-xs ${isFlashing ? "animate-row-flash" : ""}`,
              children: [
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("div", { className: "font-bold text-[#0F172A]", children: p.product_name }),
                  /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#94A3B8] font-medium mt-0.5", children: p.sku })
                ] }) }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-[#64748B]", children: /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("div", { className: "font-semibold", children: p.brand }),
                  /* @__PURE__ */ jsx("div", { className: "text-[10px] text-[#94A3B8] mt-0.5", children: p.category })
                ] }) }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-right font-semibold text-[#0F172A]", children: totalQty.toLocaleString("en-US") }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-right font-medium text-[#E11D48]", children: totalRes.toLocaleString("en-US") }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-right font-bold text-[#4F46E5]", children: totalAvail.toLocaleString("en-US") }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-center", children: /* @__PURE__ */ jsx(StockAlertBadge, { status: alertStatus }) }),
                /* @__PURE__ */ jsx("td", { className: "px-6 py-4 text-right font-bold text-[#0F172A]", children: formatCurrency(p.prices.RETAIL) })
              ]
            },
            p.product_id
          );
        }) })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B] font-semibold", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          "Showing ",
          loading ? 0 : filtered.length,
          " of ",
          products.length,
          " Products"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              disabled: true,
              className: "px-2.5 py-1.5 border border-[#E2E8F0] rounded-md text-[11px] disabled:opacity-40 cursor-default bg-white",
              children: "Prev"
            }
          ),
          /* @__PURE__ */ jsx("button", { className: "px-2.5 py-1.5 border border-[#E2E8F0] rounded-md text-[11px] hover:bg-[#F8FAFC] cursor-pointer bg-white", children: "Next" })
        ] })
      ] })
    ] }),
    selectedProduct && /* @__PURE__ */ jsx(
      ProductDrawer,
      {
        product: selectedProduct,
        open: selectedId !== null,
        onClose: () => setSelectedId(null)
      }
    ),
    /* @__PURE__ */ jsx(
      AddSkuModal,
      {
        open: addSkuOpen,
        onClose: () => setAddSkuOpen(false),
        onSuccess: (name) => {
          setToast(`Product catalog item "${name}" registered successfully!`);
          setTimeout(() => setToast(""), 4e3);
        }
      }
    )
  ] });
}
