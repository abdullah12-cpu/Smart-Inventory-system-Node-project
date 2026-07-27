/**
 * Memory Workflow Module
 * Manages conversation history context windowing, sliding memory, and dynamic catalog keywords.
 */

const STATIC_BUSINESS_KEYWORDS = [
  'product', 'catalog', 'inventory', 'stock', 'qty', 'quantity', 'price', 'rate', 'cost', 
  'wholesale', 'distributor', 'discount', 'category', 'brand', 'low trigger', 'limit', 
  'karachi', 'lahore', 'depot', 'warehouse', 'add', 'create', 'insert', 'register', 
  'update', 'edit', 'change', 'modify', 'delete', 'remove', 'bulk', 'alert', 'threshold',
  'find', 'search', 'get', 'list', 'show', 'check', 'audit', 'under', 'over', 'less', 'greater',
  'above', 'below', 'equal', 'sku', 'barcode', 'upc', 'description', 'unit', 'weight',
  'switch', 'router', 'access point', 'fiber', 'cable', 'cisco', 'tp-link', 'samsung', 'ssd',
  'box', 'pcs', 'user', 'admin', 'dashboard', 'portal', 'profile', 'account', 'settings', 
  'logout', 'notification', 'order', 'supplier', 'invoice', 'payment', 'movement', 'log', 
  'history', 'analytics', 'report', 'view', 'display', 'tell', 'info', 'detail', 'total', 
  'count', 'summary', 'status', 'quotation', 'quote', 'bid', 'ledger', 'balance'
];

/**
 * Filters conversation history to fit sliding context window.
 */
function buildSlidingContext(history = [], maxMessages = 10) {
  if (!Array.isArray(history)) return [];
  return history.slice(-maxMessages).map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text || ''
  }));
}

/**
 * Dynamic keyword loader to expand business intent checks against active database state.
 */
async function loadDynamicKeywords(pool) {
  const dynamic = [];
  try {
    const res = await pool.query('SELECT DISTINCT category, brand FROM products');
    for (const r of res.rows) {
      if (r.category) dynamic.push(r.category.toLowerCase().trim());
      if (r.brand) dynamic.push(r.brand.toLowerCase().trim());
    }
  } catch (e) {
    console.error("Error building dynamic memory keywords:", e);
  }
  return Array.from(new Set([...STATIC_BUSINESS_KEYWORDS, ...dynamic]));
}

/**
 * Checks if user prompt matches business memory domain keywords.
 */
async function hasBusinessKeyword(pool, lowerMsg) {
  const keywords = await loadDynamicKeywords(pool);
  return keywords.some(kw => lowerMsg.includes(kw));
}

module.exports = {
  buildSlidingContext,
  loadDynamicKeywords,
  hasBusinessKeyword,
  STATIC_BUSINESS_KEYWORDS
};
