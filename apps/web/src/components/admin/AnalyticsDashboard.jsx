import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar
} from "recharts";
import { motion, useReducedMotion } from "framer-motion";
import {
  DollarSign, ShoppingCart, Package, Truck, FileText, Users,
  TrendingUp, AlertTriangle, BarChart3, PieChart as PieChartIcon,
  Activity, Filter, Download, RefreshCw, Sparkles, CalendarDays
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/data";
import { KpiCard } from "@/components/ui";
import {
  PERIOD_OPTIONS,
  CHART_COLORS,
  filterByPeriod,
  groupOrdersByDate,
  groupByField,
  getTopProductsFromOrders,
  getProductCategoryData,
  getInventoryHealthData,
  getWarehouseStockData,
  getSupplierPerformance,
  getSupplierCountryData,
  getQuotationPipeline,
  getDistributorStatusData,
  getTopBuyers,
  getOrderTypeSplit,
  computeDashboardKpis,
  formatCompactCurrency,
  formatChartDate
} from "@/lib/analyticsUtils";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "suppliers", label: "Suppliers", icon: Truck },
  { id: "quotations", label: "Quotations", icon: FileText },
  { id: "distributors", label: "Distributors", icon: Users }
];

function ChartCard({ title, subtitle, children, className = "", action }) {
  return /* @__PURE__ */ jsxs("div", {
    className: `group bg-white/95 border border-[#E2E8F0] rounded-2xl shadow-[0_10px_30px_-20px_rgba(15,23,42,0.45)] overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(79,70,229,0.35)] ${className}`,
    children: [
      /* @__PURE__ */ jsxs("div", {
        className: "px-5 py-4 border-b border-[#E2E8F0]/80 flex items-start justify-between gap-3 bg-gradient-to-r from-white to-[#F8FAFC]",
        children: [
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsx("h3", {
                className: "text-sm font-bold text-[#0F172A] tracking-tight",
                style: { fontFamily: "Outfit, sans-serif" },
                children: title
              }),
              subtitle && /* @__PURE__ */ jsx("p", {
                className: "text-[10px] text-[#64748B] mt-0.5 font-medium",
                children: subtitle
              })
            ]
          }),
          action
        ]
      }),
      /* @__PURE__ */ jsx("div", { className: "p-4 flex-1 min-h-[280px]", children: children })
    ]
  });
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return /* @__PURE__ */ jsxs("div", {
    className: "bg-[#0F172A] text-white text-[11px] px-3 py-2.5 rounded-lg shadow-xl border border-[#334155] z-50",
    children: [
      label && /* @__PURE__ */ jsx("p", { className: "font-bold mb-1.5 text-[#94A3B8]", children: label }),
      payload.map((entry, i) => /* @__PURE__ */ jsxs("div", {
        key: i,
        className: "flex items-center gap-2 py-0.5",
        children: [
          /* @__PURE__ */ jsx("span", {
            className: "w-2 h-2 rounded-full shrink-0",
            style: { backgroundColor: entry.color || entry.payload?.fill }
          }),
          /* @__PURE__ */ jsx("span", { className: "text-[#CBD5E1]", children: entry.name }),
          /* @__PURE__ */ jsx("span", { className: "font-bold ml-auto pl-3", children: formatter ? formatter(entry.value, entry.name) : entry.value })
        ]
      }, i))
    ]
  });
}

function EmptyChart({ message = "No data available for this period" }) {
  return /* @__PURE__ */ jsxs("div", {
    className: "h-full min-h-[240px] flex flex-col items-center justify-center text-[#94A3B8] gap-2",
    children: [
      /* @__PURE__ */ jsx(PieChartIcon, { size: 32, className: "opacity-40" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs font-medium", children: message })
    ]
  });
}

function InteractivePie({ data, activeIndex, onHover, innerRadius = 55, outerRadius = 90 }) {
  if (!data?.length) return /* @__PURE__ */ jsx(EmptyChart, {});
  return /* @__PURE__ */ jsx(ResponsiveContainer, {
    width: "100%",
    height: 260,
    children: /* @__PURE__ */ jsxs(PieChart, {
      children: [
        /* @__PURE__ */ jsx(Pie, {
          data,
          cx: "50%",
          cy: "50%",
          innerRadius,
          outerRadius,
          paddingAngle: 3,
          dataKey: "value",
          onMouseEnter: (_, idx) => onHover?.(idx),
          onMouseLeave: () => onHover?.(-1),
          children: data.map((entry, idx) => /* @__PURE__ */ jsx(Cell, {
            key: entry.name,
            fill: entry.fill,
            opacity: activeIndex === -1 || activeIndex === idx ? 1 : 0.45,
            stroke: activeIndex === idx ? "#0F172A" : "none",
            strokeWidth: activeIndex === idx ? 2 : 0
          }, entry.name))
        }),
        /* @__PURE__ */ jsx(Tooltip, {
          content: /* @__PURE__ */ jsx(CustomTooltip, {
            formatter: (val, name) => `${val} (${Math.round(val / data.reduce((s, d) => s + d.value, 0) * 100)}%)`
          })
        }),
        /* @__PURE__ */ jsx(Legend, {
          verticalAlign: "bottom",
          iconType: "circle",
          iconSize: 8,
          formatter: (value) => /* @__PURE__ */ jsx("span", { className: "text-[10px] text-[#64748B] font-semibold", children: value })
        })
      ]
    })
  });
}

export default function AnalyticsDashboard() {
  const shouldReduceMotion = useReducedMotion();
  const { products, orders, suppliers, quotations, distributors, warehouses } = useStore();
  const [period, setPeriod] = useState("30d");
  const [section, setSection] = useState("overview");
  const [activePieIndex, setActivePieIndex] = useState(-1);
  const [orderStatusFilter, setOrderStatusFilter] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [trendMetric, setTrendMetric] = useState("revenue");

  const filteredOrders = useMemo(
    () => filterByPeriod(orders, "order_date", period),
    [orders, period, refreshKey]
  );

  const kpis = useMemo(
    () => computeDashboardKpis({ products, orders, suppliers, quotations, distributors, periodId: period }),
    [products, orders, suppliers, quotations, distributors, period, refreshKey]
  );

  const revenueTrend = useMemo(() => groupOrdersByDate(orders, period), [orders, period, refreshKey]);
  const orderStatusData = useMemo(() => groupByField(filteredOrders, "status"), [filteredOrders]);
  const topProducts = useMemo(() => getTopProductsFromOrders(filteredOrders), [filteredOrders]);
  const categoryData = useMemo(() => getProductCategoryData(products), [products]);
  const inventoryHealth = useMemo(() => getInventoryHealthData(products), [products]);
  const warehouseStock = useMemo(() => getWarehouseStockData(products, warehouses), [products, warehouses]);
  const supplierPerf = useMemo(() => getSupplierPerformance(suppliers), [suppliers]);
  const supplierCountries = useMemo(() => getSupplierCountryData(suppliers), [suppliers]);
  const quotePipeline = useMemo(
    () => getQuotationPipeline(filterByPeriod(quotations, "created_at", period)),
    [quotations, period]
  );
  const distributorStatus = useMemo(() => getDistributorStatusData(distributors), [distributors]);
  const topBuyers = useMemo(() => getTopBuyers(filteredOrders), [filteredOrders]);
  const orderTypeSplit = useMemo(() => getOrderTypeSplit(filteredOrders), [filteredOrders]);

  const statusFilteredOrders = orderStatusFilter
    ? filteredOrders.filter((o) => o.status === orderStatusFilter)
    : filteredOrders;

  const handleExportSummary = () => {
    const summary = {
      period,
      generatedAt: new Date().toISOString(),
      kpis,
      orderStatusBreakdown: orderStatusData,
      topProducts,
      quotePipeline
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commerceiq-analytics-${period}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderOverview = () => /* @__PURE__ */ jsxs("div", {
    className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5",
    children: [
      /* Revenue Trend */
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Revenue & Order Volume",
        subtitle: "Daily trends — hover to inspect values",
        className: "xl:col-span-8",
        action: /* @__PURE__ */ jsxs("div", { className: "flex rounded-lg bg-[#EEF2FF] p-0.5", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setTrendMetric("revenue"), className: `px-2 py-1 text-[9px] font-bold rounded-md border-0 cursor-pointer ${trendMetric === "revenue" ? "bg-white text-[#4F46E5] shadow-sm" : "bg-transparent text-[#64748B]"}`, children: "Revenue" }),
          /* @__PURE__ */ jsx("button", { onClick: () => setTrendMetric("orders"), className: `px-2 py-1 text-[9px] font-bold rounded-md border-0 cursor-pointer ${trendMetric === "orders" ? "bg-white text-[#4F46E5] shadow-sm" : "bg-transparent text-[#64748B]"}`, children: "Orders" })
        ] }),
        children: [
          revenueTrend.length === 0 ? /* @__PURE__ */ jsx(EmptyChart, {}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: 300,
            children: /* @__PURE__ */ jsxs(ComposedChart, {
              data: revenueTrend.map((d) => ({ ...d, label: formatChartDate(d.date) })),
              margin: { top: 10, right: 10, left: 0, bottom: 0 },
              children: [
                /* @__PURE__ */ jsx("defs", {
                  children: /* @__PURE__ */ jsxs("linearGradient", {
                    id: "revenueGrad",
                    x1: "0", y1: "0", x2: "0", y2: "1",
                    children: [
                      /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#4F46E5", stopOpacity: 0.3 }),
                      /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#4F46E5", stopOpacity: 0 })
                    ]
                  })
                }),
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#E2E8F0", vertical: false }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "label", tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(YAxis, { yAxisId: "left", tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false, tickFormatter: (v) => trendMetric === "revenue" ? formatCompactCurrency(v) : v }),
                /* @__PURE__ */ jsx(Tooltip, {
                  content: /* @__PURE__ */ jsx(CustomTooltip, {
                    formatter: (val, name) => name === "Revenue" ? formatCurrency(val) : val
                  })
                }),
                trendMetric === "revenue" ? /* @__PURE__ */ jsx(Area, { yAxisId: "left", type: "monotone", dataKey: "revenue", name: "Revenue", stroke: "#4F46E5", strokeWidth: 2.75, fill: "url(#revenueGrad)", activeDot: { r: 5, strokeWidth: 3, stroke: "#fff" } }) : /* @__PURE__ */ jsx(Bar, { yAxisId: "left", dataKey: "orders", name: "Orders", fill: "#14B8A6", radius: [6, 6, 0, 0], barSize: 20 })
              ]
            })
          })
        ]
      }),

      /* Order Status Donut */
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Order Status Breakdown",
        subtitle: "Click a segment to filter orders below",
        className: "xl:col-span-4",
        children: [
          /* @__PURE__ */ jsx(InteractivePie, {
            data: orderStatusData,
            activeIndex: activePieIndex,
            onHover: setActivePieIndex
          }),
          orderStatusData.length > 0 && /* @__PURE__ */ jsx("div", {
            className: "px-4 pb-3 flex flex-wrap gap-1.5",
            children: orderStatusData.map((s) => /* @__PURE__ */ jsx("button", {
              key: s.name,
              onClick: () => setOrderStatusFilter(orderStatusFilter === s.name ? null : s.name),
              className: `text-[9px] font-bold px-2 py-1 rounded-full border cursor-pointer transition-all ${orderStatusFilter === s.name ? "bg-[#4F46E5] text-white border-[#4F46E5]" : "bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:border-[#C7D2FE]"}`,
              children: `${s.name} (${s.value})`
            }, s.name))
          })
        ]
      }),

      /* Top Products */
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Top Selling Products",
        subtitle: "By units sold in selected period",
        className: "xl:col-span-5",
        children: [
          topProducts.length === 0 ? /* @__PURE__ */ jsx(EmptyChart, {}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: 260,
            children: /* @__PURE__ */ jsxs(BarChart, {
              data: topProducts,
              layout: "vertical",
              margin: { top: 0, right: 20, left: 10, bottom: 0 },
              children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#E2E8F0", horizontal: false }),
                /* @__PURE__ */ jsx(XAxis, { type: "number", tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(YAxis, { type: "category", dataKey: "name", width: 90, tick: { fontSize: 9, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, {}) }),
                /* @__PURE__ */ jsx(Bar, { dataKey: "qty", name: "Units Sold", radius: [0, 6, 6, 0], barSize: 16, children: topProducts.map((e, i) => /* @__PURE__ */ jsx(Cell, { fill: e.fill }, i)) })
              ]
            })
          })
        ]
      }),

      /* Quote Pipeline mini */
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Quotation Pipeline",
        subtitle: `${kpis.quoteConversion}% conversion rate overall`,
        className: "xl:col-span-3",
        children: [
          quotePipeline.length === 0 ? /* @__PURE__ */ jsx(EmptyChart, {}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: 260,
            children: /* @__PURE__ */ jsxs(BarChart, {
              data: quotePipeline,
              margin: { top: 10, right: 10, left: 0, bottom: 0 },
              children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#E2E8F0", vertical: false }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "name", tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(YAxis, { tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(Tooltip, {
                  content: /* @__PURE__ */ jsx(CustomTooltip, {
                    formatter: (val, name) => name === "Total Value" ? formatCurrency(val) : val
                  })
                }),
                /* @__PURE__ */ jsx(Bar, { dataKey: "value", name: "Count", radius: [6, 6, 0, 0], barSize: 28, children: quotePipeline.map((e, i) => /* @__PURE__ */ jsx(Cell, { fill: e.fill }, i)) })
              ]
            })
          })
        ]
      }),

      /* Top Buyers */
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Top Buyers & Distributors",
        subtitle: "Ranked by total spend",
        className: "xl:col-span-4",
        children: [
          topBuyers.length === 0 ? /* @__PURE__ */ jsx(EmptyChart, {}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: 260,
            children: /* @__PURE__ */ jsxs(BarChart, {
              data: topBuyers,
              margin: { top: 10, right: 10, left: 0, bottom: 0 },
              children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#E2E8F0", vertical: false }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "name", tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(YAxis, { tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false, tickFormatter: (v) => formatCompactCurrency(v) }),
                /* @__PURE__ */ jsx(Tooltip, {
                  content: /* @__PURE__ */ jsx(CustomTooltip, {
                    formatter: (val, name) => name === "Total Spent" ? formatCurrency(val) : val
                  })
                }),
                /* @__PURE__ */ jsx(Bar, { dataKey: "spent", name: "Total Spent", radius: [6, 6, 0, 0], barSize: 32, children: topBuyers.map((e, i) => /* @__PURE__ */ jsx(Cell, { fill: e.fill }, i)) })
              ]
            })
          })
        ]
      })
    ]
  });

  const renderProducts = () => /* @__PURE__ */ jsxs("div", {
    className: "grid grid-cols-1 xl:grid-cols-2 gap-5",
    children: [
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Category Distribution",
        subtitle: "Products by catalog category",
        children: [/* @__PURE__ */ jsx(InteractivePie, { data: categoryData, activeIndex: activePieIndex, onHover: setActivePieIndex })]
      }),
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Inventory Health",
        subtitle: "Stock alert status across catalog",
        children: [/* @__PURE__ */ jsx(InteractivePie, { data: inventoryHealth, activeIndex: activePieIndex, onHover: setActivePieIndex, innerRadius: 45, outerRadius: 80 })]
      }),
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Warehouse Stock Levels",
        subtitle: "Total units per depot",
        className: "xl:col-span-2",
        children: [
          warehouseStock.length === 0 ? /* @__PURE__ */ jsx(EmptyChart, {}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: 280,
            children: /* @__PURE__ */ jsxs(BarChart, {
              data: warehouseStock,
              margin: { top: 10, right: 10, left: 0, bottom: 0 },
              children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#E2E8F0", vertical: false }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "name", tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(YAxis, { tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, {}) }),
                /* @__PURE__ */ jsx(Bar, { dataKey: "value", name: "Units", radius: [6, 6, 0, 0], barSize: 40, children: warehouseStock.map((e, i) => /* @__PURE__ */ jsx(Cell, { fill: e.fill }, i)) })
              ]
            })
          })
        ]
      }),
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Inventory Valuation by Category",
        subtitle: "Retail value at current stock levels",
        className: "xl:col-span-2",
        children: [
          categoryData.length === 0 ? /* @__PURE__ */ jsx(EmptyChart, {}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: 280,
            children: /* @__PURE__ */ jsxs(AreaChart, {
              data: categoryData.map((c) => {
                const catProducts = products.filter((p) => p.category === c.name);
                const value = catProducts.reduce((acc, p) => {
                  const qty = (p.inventory || []).reduce((s, inv) => s + (inv.quantity || 0), 0);
                  return acc + qty * (p.prices?.RETAIL || 0);
                }, 0);
                return { name: c.name, value };
              }),
              margin: { top: 10, right: 10, left: 0, bottom: 0 },
              children: [
                /* @__PURE__ */ jsx("defs", {
                  children: /* @__PURE__ */ jsxs("linearGradient", {
                    id: "catValGrad", x1: "0", y1: "0", x2: "0", y2: "1",
                    children: [
                      /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#10B981", stopOpacity: 0.3 }),
                      /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#10B981", stopOpacity: 0 })
                    ]
                  })
                }),
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#E2E8F0", vertical: false }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "name", tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(YAxis, { tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false, tickFormatter: (v) => formatCompactCurrency(v) }),
                /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, { formatter: (v) => formatCurrency(v) }) }),
                /* @__PURE__ */ jsx(Area, { type: "monotone", dataKey: "value", name: "Value", stroke: "#10B981", strokeWidth: 2, fill: "url(#catValGrad)" })
              ]
            })
          })
        ]
      })
    ]
  });

  const renderOrders = () => /* @__PURE__ */ jsxs("div", {
    className: "grid grid-cols-1 xl:grid-cols-2 gap-5",
    children: [
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Order Status Distribution",
        subtitle: orderStatusFilter ? `Filtered: ${orderStatusFilter}` : "All statuses",
        children: [/* @__PURE__ */ jsx(InteractivePie, { data: orderStatusData, activeIndex: activePieIndex, onHover: setActivePieIndex })]
      }),
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "B2B vs B2C Orders",
        subtitle: "Order type split",
        children: [/* @__PURE__ */ jsx(InteractivePie, { data: orderTypeSplit, activeIndex: activePieIndex, onHover: setActivePieIndex })]
      }),
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Revenue Trend",
        subtitle: "Daily revenue over time",
        className: "xl:col-span-2",
        children: [
          revenueTrend.length === 0 ? /* @__PURE__ */ jsx(EmptyChart, {}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: 280,
            children: /* @__PURE__ */ jsxs(LineChart, {
              data: revenueTrend.map((d) => ({ ...d, label: formatChartDate(d.date) })),
              margin: { top: 10, right: 10, left: 0, bottom: 0 },
              children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#E2E8F0", vertical: false }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "label", tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(YAxis, { tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false, tickFormatter: (v) => formatCompactCurrency(v) }),
                /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, { formatter: (v) => formatCurrency(v) }) }),
                /* @__PURE__ */ jsx(Line, { type: "monotone", dataKey: "revenue", name: "Revenue", stroke: "#4F46E5", strokeWidth: 2.5, dot: { r: 4, fill: "#4F46E5" }, activeDot: { r: 6 } })
              ]
            })
          })
        ]
      }),
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Recent Orders",
        subtitle: orderStatusFilter ? `Showing ${orderStatusFilter} only` : `${statusFilteredOrders.length} orders in period`,
        className: "xl:col-span-2",
        children: [
          /* @__PURE__ */ jsx("div", {
            className: "overflow-x-auto max-h-[320px] overflow-y-auto",
            children: /* @__PURE__ */ jsxs("table", {
              className: "w-full text-left text-xs",
              children: [
                /* @__PURE__ */ jsx("thead", {
                  className: "sticky top-0 bg-[#F8FAFC] z-10",
                  children: /* @__PURE__ */ jsxs("tr", {
                    className: "border-b border-[#E2E8F0]",
                    children: [
                      /* @__PURE__ */ jsx("th", { className: "px-4 py-2.5 text-[10px] font-bold text-[#64748B] uppercase", children: "Order #" }),
                      /* @__PURE__ */ jsx("th", { className: "px-4 py-2.5 text-[10px] font-bold text-[#64748B] uppercase", children: "Customer" }),
                      /* @__PURE__ */ jsx("th", { className: "px-4 py-2.5 text-[10px] font-bold text-[#64748B] uppercase", children: "Status" }),
                      /* @__PURE__ */ jsx("th", { className: "px-4 py-2.5 text-[10px] font-bold text-[#64748B] uppercase text-right", children: "Amount" })
                    ]
                  })
                }),
                /* @__PURE__ */ jsx("tbody", {
                  children: statusFilteredOrders.slice(0, 15).map((o) => /* @__PURE__ */ jsxs("tr", {
                    className: "border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors",
                    children: [
                      /* @__PURE__ */ jsx("td", { className: "px-4 py-2.5 font-bold text-[#0F172A]", children: o.order_number || o.order_id }),
                      /* @__PURE__ */ jsx("td", { className: "px-4 py-2.5 text-[#64748B]", children: o.customer_email }),
                      /* @__PURE__ */ jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsx("span", { className: "text-[9px] font-bold px-2 py-0.5 rounded bg-[#EEF2FF] text-[#4F46E5]", children: o.status }) }),
                      /* @__PURE__ */ jsx("td", { className: "px-4 py-2.5 text-right font-bold", children: formatCurrency(o.total_amount) })
                    ]
                  }, o.order_id))
                })
              ]
            })
          })
        ]
      })
    ]
  });

  const renderSuppliers = () => /* @__PURE__ */ jsxs("div", {
    className: "grid grid-cols-1 xl:grid-cols-2 gap-5",
    children: [
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Supplier Reliability Score",
        subtitle: "Higher is better — click bars to compare",
        className: "xl:col-span-2",
        children: [
          supplierPerf.length === 0 ? /* @__PURE__ */ jsx(EmptyChart, { message: "No suppliers registered yet" }) : /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: 300,
            children: /* @__PURE__ */ jsxs(BarChart, {
              data: supplierPerf,
              margin: { top: 10, right: 10, left: 0, bottom: 0 },
              children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#E2E8F0", vertical: false }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "name", tick: { fontSize: 9, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(YAxis, { tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false, domain: [0, 100] }),
                /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, { formatter: (v, n) => n === "Reliability" ? `${v}%` : `${v} days` }) }),
                /* @__PURE__ */ jsx(Legend, { iconType: "circle", iconSize: 8 }),
                /* @__PURE__ */ jsx(Bar, { dataKey: "reliability", name: "Reliability", radius: [6, 6, 0, 0], barSize: 24, children: supplierPerf.map((e, i) => /* @__PURE__ */ jsx(Cell, { fill: e.fill }, i)) }),
                /* @__PURE__ */ jsx(Bar, { dataKey: "leadTime", name: "Lead Time (days)", radius: [6, 6, 0, 0], barSize: 24, fill: "#F59E0B", opacity: 0.7 })
              ]
            })
          })
        ]
      }),
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Suppliers by Country",
        subtitle: "Geographic vendor distribution",
        children: [/* @__PURE__ */ jsx(InteractivePie, { data: supplierCountries, activeIndex: activePieIndex, onHover: setActivePieIndex })]
      }),
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Lead Time Analysis",
        subtitle: "Average delivery lead times",
        children: [
          supplierPerf.length === 0 ? /* @__PURE__ */ jsx(EmptyChart, {}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: 260,
            children: /* @__PURE__ */ jsxs(RadialBarChart, {
              cx: "50%",
              cy: "50%",
              innerRadius: "20%",
              outerRadius: "90%",
              data: supplierPerf.map((s) => ({ ...s, value: s.leadTime })),
              startAngle: 180,
              endAngle: 0,
              children: [
                /* @__PURE__ */ jsx(RadialBar, { background: { fill: "#F1F5F9" }, dataKey: "value", cornerRadius: 6, children: supplierPerf.map((e, i) => /* @__PURE__ */ jsx(Cell, { fill: e.fill }, i)) }),
                /* @__PURE__ */ jsx(Legend, { iconType: "circle", iconSize: 8, formatter: (v) => /* @__PURE__ */ jsx("span", { className: "text-[9px] text-[#64748B]", children: v }) }),
                /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, { formatter: (v) => `${v} days` }) })
              ]
            })
          })
        ]
      })
    ]
  });

  const renderQuotations = () => /* @__PURE__ */ jsxs("div", {
    className: "grid grid-cols-1 xl:grid-cols-2 gap-5",
    children: [
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Quote Status Pipeline",
        subtitle: "Count by quotation stage",
        children: [/* @__PURE__ */ jsx(InteractivePie, { data: quotePipeline, activeIndex: activePieIndex, onHover: setActivePieIndex })]
      }),
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Quote Value by Stage",
        subtitle: "Total PKR value per status",
        children: [
          quotePipeline.length === 0 ? /* @__PURE__ */ jsx(EmptyChart, {}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: 260,
            children: /* @__PURE__ */ jsxs(BarChart, {
              data: quotePipeline,
              margin: { top: 10, right: 10, left: 0, bottom: 0 },
              children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#E2E8F0", vertical: false }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "name", tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(YAxis, { tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false, tickFormatter: (v) => formatCompactCurrency(v) }),
                /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, { formatter: (v) => formatCurrency(v) }) }),
                /* @__PURE__ */ jsx(Bar, { dataKey: "amount", name: "Total Value", radius: [6, 6, 0, 0], barSize: 32, children: quotePipeline.map((e, i) => /* @__PURE__ */ jsx(Cell, { fill: e.fill }, i)) })
              ]
            })
          })
        ]
      }),
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Conversion Funnel",
        subtitle: "Draft → Negotiating → Approved → Accepted",
        className: "xl:col-span-2",
        children: [
          /* @__PURE__ */ jsx("div", {
            className: "flex flex-col sm:flex-row items-stretch gap-3 p-2",
            children: [
              { stage: "DRAFT", label: "Draft" },
              { stage: "NEGOTIATING", label: "Negotiating" },
              { stage: "APPROVED", label: "Approved" },
              { stage: "ACCEPTED", label: "Accepted" }
            ].map(({ stage, label }, idx) => {
              const item = quotePipeline.find((q) => q.name === label);
              const count = (quotations || []).filter((q) => q.status === stage).length;
              const pct = quotations?.length ? Math.round(count / quotations.length * 100) : 0;
              return /* @__PURE__ */ jsxs(motion.div, {
                initial: shouldReduceMotion ? {} : { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0 },
                transition: { delay: idx * 0.08 },
                className: "flex-1 relative",
                children: [
                  idx > 0 && /* @__PURE__ */ jsx("div", { className: "hidden sm:block absolute -left-2 top-1/2 -translate-y-1/2 text-[#CBD5E1] text-lg z-10", children: "→" }),
                  /* @__PURE__ */ jsxs("div", {
                    className: "border border-[#E2E8F0] rounded-xl p-4 text-center hover:border-[#C7D2FE] hover:shadow-sm transition-all cursor-default",
                    style: { borderTopWidth: 3, borderTopColor: CHART_COLORS[idx] },
                    children: [
                      /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-[#64748B] uppercase tracking-wider", children: label }),
                      /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-[#0F172A] mt-1", style: { fontFamily: "Outfit, sans-serif" }, children: count }),
                      /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-[#94A3B8] mt-0.5", children: [pct, "% of total"] }),
                      item && /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-[#4F46E5] mt-1", children: formatCurrency(item.amount) })
                    ]
                  })
                ]
              }, stage);
            })
          })
        ]
      })
    ]
  });

  const renderDistributors = () => /* @__PURE__ */ jsxs("div", {
    className: "grid grid-cols-1 xl:grid-cols-2 gap-5",
    children: [
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Distributor Status",
        subtitle: "Active, pending, and rejected accounts",
        children: [/* @__PURE__ */ jsx(InteractivePie, { data: distributorStatus, activeIndex: activePieIndex, onHover: setActivePieIndex })]
      }),
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Distributor Order Activity",
        subtitle: "Revenue attributed to distributor emails",
        children: [
          topBuyers.length === 0 ? /* @__PURE__ */ jsx(EmptyChart, {}) : /* @__PURE__ */ jsx(ResponsiveContainer, {
            width: "100%",
            height: 260,
            children: /* @__PURE__ */ jsxs(BarChart, {
              data: topBuyers,
              margin: { top: 10, right: 10, left: 0, bottom: 0 },
              children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#E2E8F0", vertical: false }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "name", tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(YAxis, { tick: { fontSize: 10, fill: "#64748B" }, axisLine: false, tickLine: false }),
                /* @__PURE__ */ jsx(Tooltip, { content: /* @__PURE__ */ jsx(CustomTooltip, { formatter: (v) => formatCurrency(v) }) }),
                /* @__PURE__ */ jsx(Bar, { dataKey: "orders", name: "Orders", radius: [6, 6, 0, 0], barSize: 28, fill: "#8B5CF6" })
              ]
            })
          })
        ]
      }),
      /* @__PURE__ */ jsxs(ChartCard, {
        title: "Distributor Directory",
        subtitle: `${distributors.length} registered partners`,
        className: "xl:col-span-2",
        children: [
          /* @__PURE__ */ jsx("div", {
            className: "overflow-x-auto max-h-[320px] overflow-y-auto",
            children: /* @__PURE__ */ jsxs("table", {
              className: "w-full text-left text-xs",
              children: [
                /* @__PURE__ */ jsx("thead", {
                  className: "sticky top-0 bg-[#F8FAFC]",
                  children: /* @__PURE__ */ jsxs("tr", {
                    className: "border-b border-[#E2E8F0]",
                    children: [
                      /* @__PURE__ */ jsx("th", { className: "px-4 py-2.5 text-[10px] font-bold text-[#64748B] uppercase", children: "Name" }),
                      /* @__PURE__ */ jsx("th", { className: "px-4 py-2.5 text-[10px] font-bold text-[#64748B] uppercase", children: "Email" }),
                      /* @__PURE__ */ jsx("th", { className: "px-4 py-2.5 text-[10px] font-bold text-[#64748B] uppercase", children: "City" }),
                      /* @__PURE__ */ jsx("th", { className: "px-4 py-2.5 text-[10px] font-bold text-[#64748B] uppercase", children: "Status" })
                    ]
                  })
                }),
                /* @__PURE__ */ jsx("tbody", {
                  children: (distributors || []).map((d) => /* @__PURE__ */ jsxs("tr", {
                    className: "border-b border-[#E2E8F0] hover:bg-[#F8FAFC]",
                    children: [
                      /* @__PURE__ */ jsxs("td", { className: "px-4 py-2.5 font-bold", children: [d.first_name, " ", d.last_name] }),
                      /* @__PURE__ */ jsx("td", { className: "px-4 py-2.5 text-[#64748B]", children: d.email }),
                      /* @__PURE__ */ jsx("td", { className: "px-4 py-2.5 text-[#64748B]", children: d.city || "—" }),
                      /* @__PURE__ */ jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsx("span", {
                        className: `text-[9px] font-bold px-2 py-0.5 rounded ${d.status === "ACTIVE" || !d.status ? "bg-[#ECFDF5] text-[#10B981]" : d.status === "PENDING_APPROVAL" ? "bg-[#FEF3C7] text-[#F59E0B]" : "bg-[#FEF2F2] text-[#EF4444]"}`,
                        children: d.status || "ACTIVE"
                      }) })
                    ]
                  }, d.id))
                })
              ]
            })
          })
        ]
      })
    ]
  });

  const sectionContent = {
    overview: renderOverview,
    products: renderProducts,
    orders: renderOrders,
    suppliers: renderSuppliers,
    quotations: renderQuotations,
    distributors: renderDistributors
  };

  return /* @__PURE__ */ jsxs("div", {
    className: "page-container flex flex-col gap-6 pb-10",
    children: [
      /* Executive Header */
      /* @__PURE__ */ jsxs("div", {
        className: "relative overflow-hidden rounded-2xl border border-[#E0E7FF] bg-[radial-gradient(circle_at_85%_18%,rgba(129,140,248,.20),transparent_25%),linear-gradient(115deg,#111a3c,#28348d_55%,#5b45d6)] px-6 py-6 md:px-7 md:py-7 shadow-[0_18px_40px_-22px_rgba(49,46,129,.65)] flex flex-col lg:flex-row lg:items-center justify-between gap-5",
        children: [
          /* @__PURE__ */ jsx("div", { className: "absolute -right-10 -bottom-16 h-52 w-52 rounded-full border border-white/15" }),
          /* @__PURE__ */ jsx("div", { className: "absolute right-20 top-5 h-20 w-20 rounded-full bg-[#8B5CF6]/20 blur-2xl" }),
          /* @__PURE__ */ jsxs("div", {
            className: "relative z-10",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-indigo-100", children: [/* @__PURE__ */ jsx(Sparkles, { size: 12, className: "text-[#C4B5FD]" }), " Intelligence center"] }),
              /* @__PURE__ */ jsx("h1", { className: "mt-3 text-2xl md:text-3xl font-bold text-white", style: { fontFamily: "Outfit, sans-serif" }, children: "Commerce performance, at a glance." }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-indigo-100/80 mt-1.5 max-w-xl", children: "Live operational signals across revenue, inventory, customers, and fulfillment." }),
              /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-3 text-[10px] font-semibold text-indigo-100", children: [/* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [/* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7] animate-pulse" }), "Data updated just now"] }), /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [/* @__PURE__ */ jsx(CalendarDays, { size: 12 }), "30-day operating view"] })] })
            ]
          }),
          /* @__PURE__ */ jsxs("div", {
            className: "relative z-10 flex items-center gap-2 flex-wrap",
            children: [
              /* @__PURE__ */ jsxs("div", {
                className: "flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl p-1 backdrop-blur-sm",
                children: [
                  /* @__PURE__ */ jsx(Filter, { size: 12, className: "text-indigo-100 ml-2" }),
                  PERIOD_OPTIONS.map((p) => /* @__PURE__ */ jsx("button", {
                    onClick: () => setPeriod(p.id),
                    className: `text-[10px] font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer transition-all ${period === p.id ? "bg-white text-[#4338CA] shadow-sm" : "bg-transparent text-indigo-100 hover:bg-white/10"}`,
                    children: p.label
                  }, p.id))
                ]
              }),
              /* @__PURE__ */ jsxs("button", {
                onClick: () => setRefreshKey((k) => k + 1),
                className: "flex items-center gap-1.5 text-[10px] font-bold text-white border border-white/15 px-3 py-2 rounded-xl hover:bg-white/10 cursor-pointer bg-white/5 transition-colors",
                children: [/* @__PURE__ */ jsx(RefreshCw, { size: 12 }), " Refresh"]
              }),
              /* @__PURE__ */ jsxs("button", {
                onClick: handleExportSummary,
                className: "flex items-center gap-1.5 text-[10px] font-bold text-[#312E81] bg-white px-3 py-2 rounded-xl hover:bg-indigo-50 cursor-pointer border-0 transition-colors shadow-sm",
                children: [/* @__PURE__ */ jsx(Download, { size: 12 }), " Export"]
              })
            ]
          })
        ]
      }),

      /* KPI Cards */
      /* @__PURE__ */ jsxs("div", {
        className: "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 -mt-2",
        children: [
          /* @__PURE__ */ jsx(KpiCard, { label: "Total Revenue", value: formatCompactCurrency(kpis.totalRevenue), trend: `${filteredOrders.length} orders`, trendUp: true, icon: /* @__PURE__ */ jsx(DollarSign, { size: 18 }), iconBg: "#EEF2FF", iconColor: "#4F46E5", index: 0 }),
          /* @__PURE__ */ jsx(KpiCard, { label: "Avg Order Value", value: formatCompactCurrency(kpis.avgOrderValue), trend: "Per transaction", trendUp: true, icon: /* @__PURE__ */ jsx(TrendingUp, { size: 18 }), iconBg: "#ECFDF5", iconColor: "#10B981", index: 1 }),
          /* @__PURE__ */ jsx(KpiCard, { label: "Products", value: kpis.productCount, trend: `${kpis.lowStockCount} low stock`, trendUp: kpis.lowStockCount === 0, icon: /* @__PURE__ */ jsx(Package, { size: 18 }), iconBg: "#FEF3C7", iconColor: "#F59E0B", index: 2 }),
          /* @__PURE__ */ jsx(KpiCard, { label: "Inventory Value", value: formatCompactCurrency(kpis.inventoryValue), trend: "At retail price", trendUp: true, icon: /* @__PURE__ */ jsx(Activity, { size: 18 }), iconBg: "#EFF6FF", iconColor: "#3B82F6", index: 3 }),
          /* @__PURE__ */ jsx(KpiCard, { label: "Open Quotes", value: formatCompactCurrency(kpis.openQuotesValue), trend: `${kpis.quoteConversion}% converted`, trendUp: kpis.quoteConversion > 50, icon: /* @__PURE__ */ jsx(FileText, { size: 18 }), iconBg: "#F5F3FF", iconColor: "#8B5CF6", index: 4 }),
          /* @__PURE__ */ jsx(KpiCard, { label: "Suppliers", value: kpis.supplierCount, trend: `${kpis.activeDistributors} distributors`, trendUp: true, icon: /* @__PURE__ */ jsx(Truck, { size: 18 }), iconBg: "#F0FDFA", iconColor: "#14B8A6", index: 5 })
        ]
      }),

      /* Low stock alert banner */
      kpis.lowStockCount > 0 && /* @__PURE__ */ jsxs(motion.div, {
        initial: shouldReduceMotion ? {} : { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        className: "bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-xl px-5 py-3 flex items-center gap-3",
        children: [
          /* @__PURE__ */ jsx(AlertTriangle, { size: 18, className: "text-[#F59E0B] shrink-0" }),
          /* @__PURE__ */ jsxs("div", {
            children: [
              /* @__PURE__ */ jsxs("p", { className: "text-xs font-bold text-[#92400E]", children: [kpis.lowStockCount, " products need restocking"] }),
              /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#B45309] mt-0.5", children: "Switch to Products tab to review inventory health and warehouse distribution." })
            ]
          }),
          /* @__PURE__ */ jsx("button", {
            onClick: () => setSection("products"),
            className: "ml-auto text-[10px] font-bold text-[#92400E] border border-[#F59E0B]/40 px-3 py-1.5 rounded-lg hover:bg-[#FDE68A] cursor-pointer bg-transparent transition-colors shrink-0",
            children: "View Products"
          })
        ]
      }),

      /* Section Tabs */
      /* @__PURE__ */ jsx("div", {
        className: "flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#E2E8F0]",
        children: SECTIONS.map((s) => {
          const Icon = s.icon;
          return /* @__PURE__ */ jsxs("button", {
            onClick: () => { setSection(s.id); setActivePieIndex(-1); setOrderStatusFilter(null); },
            className: `flex items-center gap-1.5 text-[11px] font-bold px-4 py-2.5 rounded-t-lg border-0 cursor-pointer transition-all whitespace-nowrap ${section === s.id ? "bg-white text-[#4F46E5] border border-[#E2E8F0] border-b-white -mb-px shadow-sm" : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] bg-transparent"}`,
            children: [/* @__PURE__ */ jsx(Icon, { size: 14 }), s.label]
          }, s.id);
        })
      }),

      /* Chart Content */
      /* @__PURE__ */ jsx(motion.div, {
        key: `${section}-${period}-${refreshKey}`,
        initial: shouldReduceMotion ? {} : { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.25 },
        children: sectionContent[section]?.()
      })
    ]
  });
}
