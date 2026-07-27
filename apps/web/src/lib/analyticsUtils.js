import { computeStockAlertStatus } from "@/lib/data";

export const CHART_COLORS = [
  "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#3B82F6",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1"
];

export const PERIOD_OPTIONS = [
  { id: "7d", label: "7 Days", days: 7 },
  { id: "30d", label: "30 Days", days: 30 },
  { id: "90d", label: "90 Days", days: 90 },
  { id: "all", label: "All Time", days: null }
];

export function filterByPeriod(items, dateField, periodId) {
  const period = PERIOD_OPTIONS.find((p) => p.id === periodId);
  if (!period || period.days == null) return items;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - period.days);
  return items.filter((item) => {
    const raw = item[dateField];
    if (!raw) return true;
    return new Date(raw) >= cutoff;
  });
}

export function groupOrdersByDate(orders, periodId) {
  const filtered = filterByPeriod(orders, "order_date", periodId);
  const buckets = {};

  filtered.forEach((o) => {
    const d = o.order_date ? new Date(o.order_date) : new Date();
    const key = d.toISOString().slice(0, 10);
    if (!buckets[key]) buckets[key] = { date: key, revenue: 0, orders: 0 };
    buckets[key].revenue += Number(o.total_amount) || 0;
    buckets[key].orders += 1;
  });

  return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
}

export function groupByField(items, field) {
  const map = {};
  items.forEach((item) => {
    const key = item[field] || "Unknown";
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }))
    .sort((a, b) => b.value - a.value);
}

export function sumByField(items, groupField, sumField) {
  const map = {};
  items.forEach((item) => {
    const key = item[groupField] || "Unknown";
    map[key] = (map[key] || 0) + (Number(item[sumField]) || 0);
  });
  return Object.entries(map)
    .map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }))
    .sort((a, b) => b.value - a.value);
}

export function getTopProductsFromOrders(orders, limit = 8) {
  const map = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const name = item.name || item.product_name || "Unknown";
      const qty = Number(item.qty || item.quantity || 1);
      if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
      map[name].qty += qty;
      map[name].revenue += qty * (Number(item.price) || 0);
    });
  });
  return Object.values(map)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit)
    .map((p, i) => ({ ...p, fill: CHART_COLORS[i % CHART_COLORS.length] }));
}

export function getProductCategoryData(products) {
  return groupByField(products, "category");
}

export function getInventoryHealthData(products) {
  const counts = { NORMAL: 0, LOW_STOCK: 0, OVERSTOCK: 0, DEAD_STOCK: 0 };
  products.forEach((p) => {
    const totalAvail = (p.inventory || []).reduce((s, inv) => s + (inv.available_quantity || 0), 0);
    const status = computeStockAlertStatus(totalAvail, p.low_stock_threshold, p.total_product_limit || 100);
    counts[status] = (counts[status] || 0) + 1;
  });
  const labels = {
    NORMAL: "Healthy",
    LOW_STOCK: "Low Stock",
    OVERSTOCK: "Overstock",
    DEAD_STOCK: "Dead Stock"
  };
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([key, value], i) => ({
      name: labels[key] || key,
      value,
      fill: CHART_COLORS[i % CHART_COLORS.length]
    }));
}

export function getWarehouseStockData(products, warehouses) {
  const map = {};
  (warehouses || []).forEach((wh) => {
    map[wh.warehouse_name] = 0;
  });
  products.forEach((p) => {
    (p.inventory || []).forEach((inv) => {
      const wh = inv.warehouse_name || "Unknown";
      map[wh] = (map[wh] || 0) + (inv.quantity || 0);
    });
  });
  return Object.entries(map)
    .map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }))
    .sort((a, b) => b.value - a.value);
}

export function getSupplierPerformance(suppliers) {
  return (suppliers || [])
    .map((s, i) => ({
      name: (s.company_name || "Unknown").slice(0, 18),
      reliability: Number(s.reliability_score) || 0,
      leadTime: Number(s.lead_time_days) || 0,
      fill: CHART_COLORS[i % CHART_COLORS.length]
    }))
    .sort((a, b) => b.reliability - a.reliability)
    .slice(0, 8);
}

export function getSupplierCountryData(suppliers) {
  return groupByField(suppliers || [], "country");
}

export function getQuotationPipeline(quotations) {
  const statusLabels = {
    DRAFT: "Draft",
    NEGOTIATING: "Negotiating",
    APPROVED: "Approved",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected"
  };
  const map = {};
  (quotations || []).forEach((q) => {
    const key = q.status || "DRAFT";
    if (!map[key]) map[key] = { name: statusLabels[key] || key, value: 0, amount: 0 };
    map[key].value += 1;
    map[key].amount += Number(q.total_amount) || 0;
  });
  return Object.values(map).map((item, i) => ({ ...item, fill: CHART_COLORS[i % CHART_COLORS.length] }));
}

export function getQuoteConversionRate(quotations) {
  if (!quotations?.length) return 0;
  const converted = quotations.filter((q) => ["APPROVED", "ACCEPTED"].includes(q.status)).length;
  return Math.round((converted / quotations.length) * 100);
}

export function getDistributorStatusData(distributors) {
  const labels = {
    ACTIVE: "Active",
    PENDING_APPROVAL: "Pending",
    REJECTED: "Rejected"
  };
  const map = {};
  (distributors || []).forEach((d) => {
    const key = d.status || "ACTIVE";
    const label = labels[key] || key;
    map[label] = (map[label] || 0) + 1;
  });
  return Object.entries(map).map(([name, value], i) => ({
    name,
    value,
    fill: CHART_COLORS[i % CHART_COLORS.length]
  }));
}

export function getTopBuyers(orders, limit = 6) {
  const map = {};
  orders.forEach((o) => {
    const email = o.customer_email || "Unknown";
    if (!map[email]) map[email] = { name: email.split("@")[0], email, orders: 0, spent: 0 };
    map[email].orders += 1;
    map[email].spent += Number(o.total_amount) || 0;
  });
  return Object.values(map)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, limit)
    .map((b, i) => ({ ...b, fill: CHART_COLORS[i % CHART_COLORS.length] }));
}

export function getOrderTypeSplit(orders) {
  return groupByField(orders, "order_type");
}

export function computeDashboardKpis({ products, orders, suppliers, quotations, distributors, periodId }) {
  const filteredOrders = filterByPeriod(orders, "order_date", periodId);
  const filteredQuotes = filterByPeriod(quotations, "created_at", periodId);

  const totalRevenue = filteredOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
  const avgOrderValue = filteredOrders.length ? totalRevenue / filteredOrders.length : 0;

  const totalInventoryValue = products.reduce((acc, p) => {
    const qty = (p.inventory || []).reduce((s, inv) => s + (inv.quantity || 0), 0);
    return acc + qty * (p.prices?.RETAIL || 0);
  }, 0);

  const lowStockCount = products.filter((p) => {
    const avail = (p.inventory || []).reduce((s, inv) => s + (inv.available_quantity || 0), 0);
    return avail <= (p.low_stock_threshold || 0);
  }).length;

  const activeDistributors = (distributors || []).filter(
    (d) => d.status === "ACTIVE" || !d.status
  ).length;

  const openQuotesValue = (quotations || [])
    .filter((q) => ["DRAFT", "NEGOTIATING"].includes(q.status))
    .reduce((s, q) => s + (Number(q.total_amount) || 0), 0);

  return {
    totalRevenue,
    orderCount: filteredOrders.length,
    avgOrderValue,
    productCount: products.length,
    supplierCount: suppliers.length,
    quoteCount: filteredQuotes.length,
    quoteConversion: getQuoteConversionRate(quotations),
    inventoryValue: totalInventoryValue,
    lowStockCount,
    activeDistributors,
    openQuotesValue
  };
}

export function formatCompactCurrency(amount) {
  if (amount >= 1_000_000) return `Rs ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `Rs ${(amount / 1_000).toFixed(1)}K`;
  return `Rs ${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatChartDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
