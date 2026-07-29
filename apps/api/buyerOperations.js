/**
 * Modular Buyer Operations Module
 * Provides helper functions for retail product search, budget filtering, natural language recommendations,
 * side-by-side product comparison, and live order tracking with status filtering.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Product Recommendations
// ─────────────────────────────────────────────────────────────────────────────
async function getBuyerProductRecommendationsFromDb(pool, args = {}) {
  const { query, max_price, min_price, category, brand, features, sort_by } = args;

  let sql = `SELECT * FROM products WHERE status = 'ACTIVE'`;
  const params = [];
  let paramIndex = 1;

  if (category && category !== 'All') {
    sql += ` AND LOWER(category) LIKE $${paramIndex}`;
    params.push(`%${category.toLowerCase()}%`);
    paramIndex++;
  }

  if (brand) {
    sql += ` AND LOWER(brand) LIKE $${paramIndex}`;
    params.push(`%${brand.toLowerCase()}%`);
    paramIndex++;
  }

  const res = params.length > 0 ? await pool.query(sql, params) : await pool.query(sql);
  let products = res.rows.map(r => {
    let prices = {};
    try { prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices || {}; } catch (e) { prices = {}; }

    let inventory = [];
    try { inventory = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory || []; } catch (e) { inventory = []; }

    const availableStock = inventory.reduce((sum, i) => sum + (i.available_quantity || i.quantity || 0), 0);

    return {
      product_id: r.product_id,
      sku: r.sku,
      product_name: r.product_name,
      short_description: r.short_description || '',
      brand: r.brand,
      category: r.category,
      retail_price: prices.RETAIL !== undefined ? parseFloat(prices.RETAIL) : 0,
      image_url: r.image_url,
      available_stock: availableStock,
      inventory
    };
  });

  // Filter by Max Price in PKR
  if (max_price && !isNaN(parseFloat(max_price))) {
    const limit = parseFloat(max_price);
    products = products.filter(p => p.retail_price <= limit);
  }

  // Filter by Min Price in PKR (for "above X", "more than X", "over X" queries)
  if (min_price && !isNaN(parseFloat(min_price))) {
    const limit = parseFloat(min_price);
    products = products.filter(p => p.retail_price >= limit);
  }

  // Natural language query & keywords filtering
  const searchTerm = (query || features || '').toLowerCase().trim();
  if (searchTerm) {
    const STOP_WORDS = new Set([
      'best', 'with', 'under', 'than', 'more', 'less', 'some', 'show', 'find', 'suggest', 'pkr', 'rs', 'rupees',
      'products', 'product', 'items', 'item', 'available', 'catalog', 'store', 'recommend', 'recommendation',
      'recommendations', 'search', 'get', 'list', 'give', 'me', 'all', 'the', 'for', 'please', 'similar',
      'image', 'photo', 'picture', 'this', 'that', 'have', 'from', 'can', 'you', 'what', 'which', 'are',
      'above', 'below', 'over', 'highest', 'lowest', 'cheapest', 'expensive', 'price', 'priced', 'budget',
      'starting', 'greater', 'most', 'top'
    ]);
    const tokens = searchTerm.split(/\s+/).filter(t => t.length > 1 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));

    if (tokens.length > 0) {
      products = products.map(p => {
        const fullText = `${p.product_name} ${p.short_description} ${p.brand} ${p.category}`.toLowerCase();
        let matchCount = 0;
        tokens.forEach(tok => { if (fullText.includes(tok)) matchCount++; });
        return { ...p, score: matchCount };
      }).filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score || a.retail_price - b.retail_price);
    }
  }

  // Apply sorting
  if (sort_by) {
    const sortKey = sort_by.toLowerCase();
    if (sortKey === 'price_high' || sortKey === 'highest' || sortKey === 'most_expensive') {
      products.sort((a, b) => b.retail_price - a.retail_price);
    } else if (sortKey === 'price_low' || sortKey === 'cheapest' || sortKey === 'lowest') {
      products.sort((a, b) => a.retail_price - b.retail_price);
    } else if (sortKey === 'name') {
      products.sort((a, b) => a.product_name.localeCompare(b.product_name));
    }
  }

  return products;
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Comparison
// ─────────────────────────────────────────────────────────────────────────────
async function compareBuyerProductsInDb(pool, args = {}) {
  const { message = '', product_a = '', product_b = '' } = args;

  const allProducts = await getBuyerProductRecommendationsFromDb(pool, {});
  if (!allProducts || allProducts.length === 0) {
    return { ai_message: "⚠️ No products available in the catalog for comparison.", products: [] };
  }

  let matchedProducts = [];

  if (product_a && product_b) {
    const itemA = allProducts.find(p => p.product_name.toLowerCase().includes(product_a.toLowerCase()) || p.sku.toLowerCase() === product_a.toLowerCase());
    const itemB = allProducts.find(p => p.product_name.toLowerCase().includes(product_b.toLowerCase()) || p.sku.toLowerCase() === product_b.toLowerCase());
    if (itemA) matchedProducts.push(itemA);
    if (itemB && itemB.product_id !== itemA?.product_id) matchedProducts.push(itemB);
  }

  if (matchedProducts.length < 2 && message) {
    const lowerMsg = message.toLowerCase();
    const cleanMsg = lowerMsg.replace(/compare|comparison|versus|\bvs\b|difference\s+between|which\s+is\s+better|and|between/g, ' ');
    const tokens = cleanMsg.split(/\s+/).filter(t => t.length > 2);

    const scored = allProducts.map(p => {
      const text = `${p.product_name} ${p.brand} ${p.category} ${p.sku}`.toLowerCase();
      let score = 0;
      tokens.forEach(tok => { if (text.includes(tok)) score += 1; });
      return { ...p, score };
    }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

    if (scored.length >= 2) {
      matchedProducts = [scored[0], scored[1]];
    } else if (scored.length === 1) {
      matchedProducts = [scored[0], allProducts.find(p => p.product_id !== scored[0].product_id)].filter(Boolean);
    } else {
      matchedProducts = allProducts.slice(0, 2);
    }
  }

  if (matchedProducts.length < 2) {
    return {
      ai_message: "Please specify at least two products or brand names to compare (e.g. *'Compare Cisco Fiber vs Corning Fiber Spool'*).",
      products: matchedProducts
    };
  }

  const p1 = matchedProducts[0];
  const p2 = matchedProducts[1];
  const priceDiff = Math.abs(p1.retail_price - p2.retail_price);
  const cheaperItem = p1.retail_price < p2.retail_price ? p1.product_name : p2.product_name;

  const tableMd = `### ⚖️ Side-by-Side Product Comparison\n\n| Specification | **${p1.product_name}** | **${p2.product_name}** |\n| --- | --- | --- |\n| **Retail Price** | **Rs ${p1.retail_price.toLocaleString()}** | **Rs ${p2.retail_price.toLocaleString()}** |\n| **Brand** | ${p1.brand || 'N/A'} | ${p2.brand || 'N/A'} |\n| **Category** | ${p1.category || 'General'} | ${p2.category || 'General'} |\n| **Availability** | ${p1.available_stock > 0 ? `In Stock (${p1.available_stock} units)` : '⚠️ Out of Stock'} | ${p2.available_stock > 0 ? `In Stock (${p2.available_stock} units)` : '⚠️ Out of Stock'} |\n| **SKU Code** | \`${p1.sku}\` | \`${p2.sku}\` |\n| **Key Specs** | ${p1.short_description || 'Standard specifications'} | ${p2.short_description || 'Standard specifications'} |\n\n💡 **Shopping Insights:**\n- **Price Difference:** **Rs ${priceDiff.toLocaleString()}** (*${cheaperItem}* is more budget-friendly).\n- **Recommendation:** Choose **${p1.product_name}** for ${p1.category} applications or **${p2.product_name}** if you need ${p2.brand || p2.category} specifications.`;

  return { ai_message: tableMd, products: [p1, p2] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Tracking Helpers
// ─────────────────────────────────────────────────────────────────────────────
const ORDER_STATUS_EMOJI = {
  PENDING:    '🕐',
  CONFIRMED:  '✅',
  PROCESSING: '⚙️',
  SHIPPED:    '🚚',
  DELIVERED:  '📦',
  CANCELLED:  '❌',
  RETURNED:   '↩️',
};

const ORDER_STATUS_LABEL = {
  PENDING:    'Pending',
  CONFIRMED:  'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED:    'Shipped',
  DELIVERED:  'Delivered',
  CANCELLED:  'Cancelled',
  RETURNED:   'Returned',
};

function formatOrderDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return String(dateStr); }
}

function buildOrderDetailMd(order) {
  let items = [];
  try { items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []); } catch { items = []; }

  const emoji = ORDER_STATUS_EMOJI[order.status?.toUpperCase()] || '📋';
  const statusLabel = ORDER_STATUS_LABEL[order.status?.toUpperCase()] || order.status;

  const itemLines = items.length > 0
    ? items.map(i => `  - **${i.product_name || i.sku || 'Item'}** × ${i.quantity || 1} — Rs ${parseFloat(i.unit_price || i.price || 0).toLocaleString()}`).join('\n')
    : (order.items_summary || 'Item details not available');

  const subtotal = order.subtotal ? `Rs ${parseFloat(order.subtotal).toLocaleString()}` : 'N/A';
  const discount = order.discount_total ? `Rs ${parseFloat(order.discount_total).toLocaleString()}` : '—';
  const tax     = order.tax_total     ? `Rs ${parseFloat(order.tax_total).toLocaleString()}`     : '—';

  return [
    `**Order Number:** \`${order.order_number || order.order_id}\``,
    `**Status:** ${emoji} **${statusLabel}**`,
    `**Order Date:** ${formatOrderDate(order.order_date || order.created_at)}`,
    `**Order Type:** ${order.order_type || 'Retail'}`,
    `\n**Items Ordered:**\n${itemLines}`,
    `\n| Subtotal | Discount | Tax | **Total** |`,
    `| --- | --- | --- | --- |`,
    `| ${subtotal} | ${discount} | ${tax} | **Rs ${parseFloat(order.total_amount || 0).toLocaleString()}** |`,
  ].join('\n');
}

/**
 * Track a specific order by order_id or order_number.
 */
async function trackBuyerOrder(pool, args = {}) {
  const { order_id_query = '' } = args;

  if (!order_id_query.trim()) {
    return {
      ai_message: "Please provide an order ID or order number to track.\n\nExample: *\"Where is my order ORD-2026-7781?\"*",
      orders: []
    };
  }

  const searchVal = order_id_query.trim().toUpperCase();
  let result;

  try {
    result = await pool.query(
      `SELECT * FROM orders WHERE UPPER(order_id) = $1 OR UPPER(order_number) = $1 LIMIT 1`,
      [searchVal]
    );
  } catch (e) {
    return { ai_message: `❌ Database error: ${e.message}`, orders: [] };
  }

  // Fuzzy fallback
  if (!result.rows.length) {
    try {
      result = await pool.query(
        `SELECT * FROM orders WHERE UPPER(order_id) LIKE $1 OR UPPER(order_number) LIKE $1 LIMIT 3`,
        [`%${searchVal}%`]
      );
    } catch (e) {
      return { ai_message: `❌ Database error: ${e.message}`, orders: [] };
    }
  }

  if (!result.rows.length) {
    return {
      ai_message: `⚠️ No order found matching **"${order_id_query}"**.\n\nDouble-check the order number, or try:\n- *"Show all my orders"*\n- *"Show shipped orders"*\n- *"Show pending orders"*`,
      orders: []
    };
  }

  const order = result.rows[0];
  const s = (order.status || '').toUpperCase();

  const nextStep =
    s === 'PENDING'    ? '⏳ Waiting to be confirmed by our team. You will be notified soon.' :
    s === 'CONFIRMED'  ? '📋 Order confirmed! Being prepared for dispatch.' :
    s === 'PROCESSING' ? '⚙️ Currently being packed and processed in our warehouse.' :
    s === 'SHIPPED'    ? '🚚 On its way! Expected delivery within 2–4 business days.' :
    s === 'DELIVERED'  ? '🎉 Delivered successfully. Enjoy your purchase!' :
    s === 'CANCELLED'  ? '❌ This order was cancelled. Contact support for a refund.' :
    '';

  const md = [
    `### 📦 Live Order Tracking`,
    ``,
    buildOrderDetailMd(order),
    ``,
    nextStep ? `> **Status Update:** ${nextStep}` : '',
    ``,
    `💬 Ask: *"Show all orders"*, *"Show shipped orders"*, or track another order by number.`
  ].filter(l => l !== null).join('\n');

  return { ai_message: md, orders: result.rows };
}

/**
 * List orders optionally filtered by status, with a summary table.
 */
async function listBuyerOrdersByStatus(pool, args = {}) {
  const { status_filter = null, customer_email = null } = args;

  let sql = `SELECT * FROM orders`;
  const params = [];
  const conditions = [];

  if (customer_email) {
    conditions.push(`LOWER(customer_email) = $${params.length + 1}`);
    params.push(customer_email.toLowerCase());
  }

  if (status_filter) {
    conditions.push(`UPPER(status) = $${params.length + 1}`);
    params.push(status_filter.toUpperCase());
  }

  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY created_at DESC LIMIT 20';

  let result;
  try {
    result = params.length > 0 ? await pool.query(sql, params) : await pool.query(sql);
  } catch (e) {
    return { ai_message: `❌ Database error: ${e.message}`, orders: [] };
  }

  const orders = result.rows;

  if (!orders.length) {
    const statusMsg = status_filter ? ` with status **${ORDER_STATUS_LABEL[status_filter.toUpperCase()] || status_filter}**` : '';
    return {
      ai_message: `📭 No orders found${statusMsg}.\n\nTry:\n- *"Show all orders"*\n- *"Show pending orders"*\n- *"Show shipped orders"*\n- *"Show delivered orders"*`,
      orders: []
    };
  }

  const emoji = status_filter ? (ORDER_STATUS_EMOJI[status_filter.toUpperCase()] || '📋') : '📋';
  const statusLabel = status_filter ? (ORDER_STATUS_LABEL[status_filter.toUpperCase()] || status_filter) : 'All';

  // Status breakdown counts
  const statusCounts = {};
  orders.forEach(o => {
    const s = (o.status || 'UNKNOWN').toUpperCase();
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const statusSummary = Object.entries(statusCounts)
    .map(([s, c]) => `${ORDER_STATUS_EMOJI[s] || '📋'} **${ORDER_STATUS_LABEL[s] || s}**: ${c}`)
    .join('  |  ');

  // Summary table
  const tableRows = orders.map(o => {
    const sEmoji = ORDER_STATUS_EMOJI[o.status?.toUpperCase()] || '📋';
    const sLabel = ORDER_STATUS_LABEL[o.status?.toUpperCase()] || o.status;
    return `| \`${o.order_number || o.order_id}\` | ${sEmoji} ${sLabel} | ${formatOrderDate(o.order_date || o.created_at)} | **Rs ${parseFloat(o.total_amount || 0).toLocaleString()}** |`;
  }).join('\n');

  const md = [
    `### ${emoji} ${statusLabel} Orders — ${orders.length} Found`,
    ``,
    statusSummary,
    ``,
    `| Order Number | Status | Date | Amount |`,
    `| --- | --- | --- | --- |`,
    tableRows,
    ``,
    `💬 Ask: *"Track order ORD-2026-XXXX"* for full details on any order.`
  ].join('\n');

  return { ai_message: md, orders };
}

module.exports = {
  getBuyerProductRecommendationsFromDb,
  compareBuyerProductsInDb,
  trackBuyerOrder,
  listBuyerOrdersByStatus,
};
