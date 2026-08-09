const { GoogleGenerativeAI } = require('@google/generative-ai');
const { 
  createProductInDb, deleteProductFromDb, updateProductInDb, bulkUpdateProductsInDb, searchProductsInDb, getCategoryProductsFromDb, getLowStockProductsFromDb,
  createSupplierInDb, updateSupplierInDb, deleteSupplierFromDb, searchSuppliersInDb, filterSuppliersByLocationInDb,
  listOrdersFromDb, getOrderByIdFromDb, getOrdersByStatusFromDb, getOrdersByCustomerFromDb, getOrdersByDateRangeFromDb,
  getOrdersByAmountFilterFromDb, updateOrderStatusInDb, bulkApproveOrdersInDb, getOrderAnalyticsFromDb,
  getTopBuyersFromDb, getMostOrderedProductsFromDb, getOverdueOrdersFromDb, getOrdersByProductFromDb,
  getOrdersAwaitingShipmentFromDb, shipOrderInDb, shipAllOrdersInDb,
  getAdminInvoicesFromDb, getInvoiceStatusCountsFromDb, getPartnerAccountsFromDb,
  getAllQuotationsFromDb, getQuotationsByStatusFromDb, approveQuotationInDb,
  rejectQuotationInDb, sendCounterOfferToDistributorInDb, getQuotationKpisFromDb
} = require('./adminOperations');
const { 
  getDistributorWholesaleProductsFromDb, 
  getDistributorQuotationsFromDb,
  getDistributorQuotationsByStatusFromDb,
  getDistributorQuotationStatusCounts,
  getDistributorQuotationByIdFromDb,
  getDistributorQuotationsByAmountFromDb,
  updateDistributorQuotationStatusInDb,
  getDistributorQuotationKpisFromDb,
  getDistributorQuotationsByProductFromDb,
  getExpiringDistributorQuotationsFromDb,
  getDistributorOrdersFromDb, 
  getDistributorLedgerStatusFromDb,
  createDistributorQuotationInDb,
  createDistributorDirectOrderInDb,
  getDistributorInvoicesFromDb,
  payDistributorInvoiceInDb,
  counterOfferQuotationInDb,
  buildQuotationDescription
} = require('./distributorOperations');
const { getBuyerProductRecommendationsFromDb, compareBuyerProductsInDb, trackBuyerOrder, listBuyerOrdersByStatus } = require('./buyerOperations');
const { requireAuth, optionalAuth, requireRole } = require('./auth');
const { vectorSearchProducts, vectorSearchDistributorProducts, isEmbedModelAvailable } = require('./embeddings');

// ─── Ollama config & dynamic resolution (Remote PC -> Local Mac fallback) ──────
const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'qwen2.5:14b';
const OLLAMA_LOCAL_MODEL = process.env.OLLAMA_LOCAL_MODEL || 'qwen2.5:3b';

async function getOllamaChatEndpoint() {
  const remoteUrl = process.env.OLLAMA_URL;

  // 1. Try Remote PC first (e.g. ngrok / PC IP)
  if (remoteUrl && remoteUrl !== 'http://localhost:11434') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const apiKey = process.env.TTS_API_KEY || 'az5nD6ceT-c4lslqzadpNA-b';
      let tagUrl = `${remoteUrl}/api/tags`;
      if (apiKey && !tagUrl.includes('key=')) {
        tagUrl += `?key=${encodeURIComponent(apiKey.trim())}`;
      }
      const res = await fetch(tagUrl, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const tagData = await res.json();
        const models = tagData.models || [];
        const match = models.find(m => m.name.includes(OLLAMA_CHAT_MODEL)) ||
                      models.find(m => /qwen|mistral|llama|phi|gemma/i.test(m.name) && !/llava|vision|embed/i.test(m.name));
        if (match) {
          console.log(`[Ollama RAG] 🌐 Connected to Remote PC (${remoteUrl}) → Using model: ${match.name}`);
          return { baseUrl: remoteUrl, modelName: match.name, isRemote: true };
        }
      }
    } catch (err) {
      console.warn(`[Ollama RAG] ⚠️ Remote PC (${remoteUrl}) unreachable: ${err.message}. Falling back to Mac local...`);
    }
  }

  // 2. Fallback to Mac Local Ollama
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const tagData = await res.json();
      const models = tagData.models || [];
      const match = models.find(m => m.name.includes(OLLAMA_LOCAL_MODEL)) ||
                    models.find(m => m.name.includes('qwen2.5:3b')) ||
                    models.find(m => /qwen|mistral|llama|phi|gemma/i.test(m.name) && !/llava|vision|embed/i.test(m.name));
      if (match) {
        console.log(`[Ollama RAG] 💻 Running on Local Mac → Using model: ${match.name}`);
        return { baseUrl: 'http://localhost:11434', modelName: match.name, isRemote: false };
      }
    }
  } catch (_) {
    console.warn('[Ollama RAG] ❌ Local Mac Ollama is not running.');
  }

  return null;
}

// The remote ngrok tunnel enforces the same API key on every route (not just /api/tags),
// so any request to it -- chat completions included -- needs the key appended or it 401s.
function ollamaUrl(endpoint, path) {
  const url = `${endpoint.baseUrl}${path}`;
  if (!endpoint.isRemote) return url;
  const apiKey = process.env.TTS_API_KEY || 'az5nD6ceT-c4lslqzadpNA-b';
  if (!apiKey) return url;
  return `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey.trim())}`;
}

async function fetchOllamaChat(endpoint, body, timeoutMs = 25000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(ollamaUrl(endpoint, '/v1/chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Buyer session memory (in-process, per user email) ───────────────────────
// Stores: { lastProducts, lastCategory, lastMinPrice, lastMaxPrice, lastSortBy, lastQuery }
// TTL: sessions expire after 30 minutes of inactivity
const buyerSessions = new Map();
const BUYER_SESSION_TTL_MS = 30 * 60 * 1000;

function getBuyerSession(email) {
  const key = (email || 'guest').toLowerCase();
  const existing = buyerSessions.get(key);
  if (existing && Date.now() - existing.updatedAt < BUYER_SESSION_TTL_MS) {
    return existing;
  }
  const fresh = { lastProducts: [], lastCategory: null, lastMinPrice: null, lastMaxPrice: null, lastSortBy: null, lastQuery: '', updatedAt: Date.now() };
  buyerSessions.set(key, fresh);
  return fresh;
}

function saveBuyerSession(email, data) {
  const key = (email || 'guest').toLowerCase();
  buyerSessions.set(key, { ...data, updatedAt: Date.now() });
}

// ─── Distributor session memory for interactive quote flows ───────────────
const distributorSessions = new Map();

function getDistributorSession(email) {
  const key = (email || 'guest').toLowerCase();
  const existing = distributorSessions.get(key);
  if (existing && Date.now() - existing.updatedAt < BUYER_SESSION_TTL_MS) {
    return existing;
  }
  const fresh = { updatedAt: Date.now() };
  distributorSessions.set(key, fresh);
  return fresh;
}

function saveDistributorSession(email, data) {
  const key = (email || 'guest').toLowerCase();
  distributorSessions.set(key, { ...data, updatedAt: Date.now() });
}

function clearDistributorSession(email) {
  const key = (email || 'guest').toLowerCase();
  distributorSessions.delete(key);
}

const URDU_SCRIPT_INSTRUCTION = ` زبان — صرف اردو رسم الخط:

قاعدہ: اپنا پورا جواب صحیح اردو رسم الخط میں لکھیں — جیسا پاکستانی اخبارات اور سرکاری دستاویزات میں لکھا جاتا ہے۔

صحیح مثالیں:
- "آپ کے آج کے 4 آرڈر ہیں۔"
- "یہ رہے آپ کے ان پیڈ انوئسس:"
- "اس ہفتے کوئی آرڈر نہیں ملا۔"
- "PS5 گیمنگ کے لیے بہترین آپشن ہے — 2 لاکھ 15 ہزار روپے میں دستیاب ہے۔"
- "کوئی ریکارڈ نہیں ملا۔"

قواعد:
1. صرف اردو رسم الخط استعمال کریں — کوئی رومن اردو یا انگریزی الفاظ نہیں
2. پروڈکٹ ناماجات، SKU، Order ID، رقم (PKR)، تاریخ — یہ انگریزی میں لکھیں
3. پہلا جملہ سیدھے سوال کا جواب ہو
4. متعدد ریکارڈز کے لیے ٹیبل فارمیٹ استعمال کریں
5. اگر کوئی ڈیٹا نہیں ملا: "کوئی ریکارڈ نہیں ملا۔" یا "آج کا کوئی آرڈر نہیں ہے۔"`;

const SYSTEM_PROMPT = 'You are CIQ Admin Copilot, an AI catalog, vendor, and order management assistant. You are strictly restricted to: creating products ("createProduct"), updating products ("updateProduct"), deleting products ("deleteProduct"), bulk updating categories ("bulkUpdateProducts"), reading product/stock data ("readProductData"), creating suppliers ("createSupplier"), updating suppliers ("updateSupplier"), deleting suppliers ("deleteSupplier"), reading/searching supplier records ("readSupplierData"), and all order management operations including listing, filtering, searching, approving, rejecting, shipping orders, and running order analytics ("manageOrders"). If the user asks about anything outside this scope, decline in Urdu. Keep answers short and direct. IMPORTANT: For create operations, do NOT invent default details if not explicitly specified.' + URDU_SCRIPT_INSTRUCTION;

const DISTRIBUTOR_SYSTEM_PROMPT = `آپ CIQ ڈسٹریبیوٹر کوپائلٹ ہیں — ایک ذہین B2B ھول سیل شراکت مشیر۔ آپ ڈسٹریبیوٹرز کی مدد کرتے ہیں:
(1) ھول سیل مصنوعات دریافت کرنا — قیمت، MOQ، اسٹاک، ڈسکاؤنٹ
(2) آرڈرز کی نگرانی — آج، کل، کسی بھی تاریخ، کیٹیگری، یا اسٹیٹس کے مطابق
(3) اقتباسات اور مذاکرات دیکھنا اور جمع کرنا
(4) انوئسس اور ادائیگی جانچنا — ادا شدہ، نہ ادا شدہ، واجب الادا
(5) کریڈٹ لیمٹ اور مالی اکاؤنٹ جانچنا
(6) براه راست B2B آرڈر دینا

RESTRICTIONS:
- ایڈمن کے کام (پروڈکٹ بنانا/حذف/اپڈیٹ، سپلائر مینیجمنٹ) بالکل نہیں کریں
- اگر کوئی ایڈمن آپریشن مانگے تو: "یہ کام صرف ایڈمن کر سکتا ہے۔ آپ کو ایڈمن پورٹل ایکسیس کرنا ہو گا۔"` + URDU_SCRIPT_INSTRUCTION;

const BUYER_SYSTEM_PROMPT = `آپ CIQ ذاتی شاپنگ اسسٹنٹ ہیں — ایک دوستانہ دکان کا ساتھی جو گراہکوں کی شاپنگ میں مدد کرتا ہے۔

آپ ان چیزوں میں مدد کرتے ہیں:
- مصنوعات تلاش کرنا — بجٹ، کیٹیگری، برینڈ، خصوصیات کے مطابق
- آرڈرز کی نگرانی — آرڈر کہاں ہے، آج کے آرڈرز، ڈلیورڈ آرڈرز
- قیمت کا موازنہ اور سفارشات
- اسٹاک دستیابی جانچنا

RESPONSE STYLE:
- بالکل فطری اور سلیس اردو رسم الخط میں جواب دیں
- مصنوعات دکھاتے وقت قیمت PKR میں دکھائیں
- اگر کوئی مصنوع نہ ملے: "ابھی یہ مصنوع ہمارے اسٹور میں دستیاب نہیں ہے۔"
- ایڈمن یا ھول سیل کام نہیں کریں — "یہ صرف ایڈمن پورٹل میں ہوتا ہے۔"` + URDU_SCRIPT_INSTRUCTION;


function filterProductsByMessage(rows, message) {
  const lower = message.toLowerCase();
  
  const hasPriceKeyword = /price|rate|cost/i.test(lower);

  const numMatch = lower.match(/(?:less than|greater than|more than|fewer than|above|below|<=|>=|<|>)\s*(\d+)/i);
  const isLessThan = /(?:less than|fewer than|below|<)/i.test(lower);
  const isGreaterThan = /(?:greater than|more than|above|>)/i.test(lower);

  const qtyGtMatch = lower.match(/(?:quantity|stock|qty)\s*(?:greater than|more than|>|above)\s*(\d+)/i);
  const qtyLtMatch = lower.match(/(?:quantity|stock|qty)\s*(?:less than|fewer than|<|below)\s*(\d+)/i);
  const qtyEqMatch = lower.match(/(?:quantity|stock|qty)\s*(?:equal to|=)\s*(\d+)/i);

  const priceGtMatch = lower.match(/(?:price|rate|cost)\s*(?:greater than|more than|>|above)\s*(\d+)/i);
  const priceLtMatch = lower.match(/(?:price|rate|cost)\s*(?:less than|fewer than|<|below)\s*(\d+)/i);

  let filtered = rows;

  if (qtyGtMatch) {
    const limit = parseInt(qtyGtMatch[1]);
    filtered = filtered.filter(r => {
      const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
      const stock = inv && inv.length > 0 ? inv.reduce((sum, item) => sum + (item.available_quantity || 0), 0) : 0;
      return stock > limit;
    });
  } else if (qtyLtMatch) {
    const limit = parseInt(qtyLtMatch[1]);
    filtered = filtered.filter(r => {
      const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
      const stock = inv && inv.length > 0 ? inv.reduce((sum, item) => sum + (item.available_quantity || 0), 0) : 0;
      return stock < limit;
    });
  } else if (qtyEqMatch) {
    const limit = parseInt(qtyEqMatch[1]);
    filtered = filtered.filter(r => {
      const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
      const stock = inv && inv.length > 0 ? inv.reduce((sum, item) => sum + (item.available_quantity || 0), 0) : 0;
      return stock === limit;
    });
  } else if (priceGtMatch) {
    const limit = parseFloat(priceGtMatch[1]);
    filtered = filtered.filter(r => {
      const prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices;
      const price = prices && prices.RETAIL !== undefined ? prices.RETAIL : 0;
      return price > limit;
    });
  } else if (priceLtMatch) {
    const limit = parseFloat(priceLtMatch[1]);
    filtered = filtered.filter(r => {
      const prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices;
      const price = prices && prices.RETAIL !== undefined ? prices.RETAIL : 0;
      return price < limit;
    });
  } else if (numMatch) {
    const limit = parseInt(numMatch[1]);
    if (hasPriceKeyword) {
      filtered = filtered.filter(r => {
        const prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices;
        const price = prices && prices.RETAIL !== undefined ? prices.RETAIL : 0;
        return isLessThan ? price < limit : (isGreaterThan ? price > limit : true);
      });
    } else {
      filtered = filtered.filter(r => {
        const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
        const stock = inv && inv.length > 0 ? inv.reduce((sum, item) => sum + (item.available_quantity || 0), 0) : 0;
        return isLessThan ? stock < limit : (isGreaterThan ? stock > limit : true);
      });
    }
  }

  return filtered;
}

async function handleReadProductData(pool, args, message) {
  const filterText = (message + ' ' + (args.identifier || '')).trim();
  const isFilterQuery = 
    /quantity|stock|qty|price|rate|cost/i.test(filterText) ||
    /(?:less than|greater than|more than|fewer than|above|below|<=|>=|<|>)\s*\d+/i.test(filterText);

  if (isFilterQuery) {
    const getRes = await pool.query('SELECT * FROM products');
    const filteredRows = filterProductsByMessage(getRes.rows, filterText);
    if (filteredRows.length === 0) {
      return '❌ No products match your filter criteria.';
    }
    return '### 🔍 Filter Results\n\n| Product | SKU | Price | Stock |\n|---|---|---|---|\n' +
      filteredRows.map(r => {
        const prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices;
        const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
        const stock = inv && inv.length > 0 ? inv.reduce((sum, item) => sum + (item.available_quantity || 0), 0) : 0;
        return `| ${r.product_name} | ${r.sku} | Rs ${prices.RETAIL?.toLocaleString() || 0} | ${stock} |`;
      }).join('\n');
  }

  if (args.action_type === 'low_stock') {
    const rows = await getLowStockProductsFromDb(pool);
    if (rows.length === 0) return '✅ All products have sufficient stock.';
    return '### 📉 Low Stock Products\n\n| Product | SKU | Stock | Threshold |\n|---|---|---|---|\n' +
      rows.map(r => {
        const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
        const stock = inv && inv.length > 0 ? inv.reduce((sum, item) => sum + (item.available_quantity || 0), 0) : 0;
        return `| ${r.product_name} | ${r.sku} | **${stock}** | ${r.low_stock_threshold} |`;
      }).join('\n');
  }

  if (args.action_type === 'browse_category' && args.category) {
    const rows = await getCategoryProductsFromDb(pool, args.category);
    if (rows.length === 0) return `❌ No products found in category: "${args.category}"`;
    return `### 📂 Category: ${args.category}\n\n| Product | Price | Stock |\n|---|---|---|\n` +
      rows.map(r => {
        const prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices;
        const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
        const stock = inv && inv.length > 0 ? inv.reduce((sum, item) => sum + (item.available_quantity || 0), 0) : 0;
        return `| ${r.product_name} | Rs ${prices.RETAIL?.toLocaleString() || 0} | ${stock} |`;
      }).join('\n');
  }

  const rows = await searchProductsInDb(pool, args.identifier || '');
  if (rows.length === 0) return `❌ Could not find product matching: "${args.identifier}"`;
  return `### 🔍 Search Results\n\n| Product | SKU | Price | Stock |\n|---|---|---|---|\n` +
    rows.map(r => {
      const prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices;
      const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
      const stock = inv && inv.length > 0 ? inv.reduce((sum, item) => sum + (item.available_quantity || 0), 0) : 0;
      return `| ${r.product_name} | ${r.sku} | Rs ${prices.RETAIL?.toLocaleString() || 0} | ${stock} |`;
    }).join('\n');
}

function extractSpecsFromMessage(message) {
  const lower = message.toLowerCase();
  const specs = {};

  const labelLookahead = '(?=\\s*(?:product name|name|category|retail rate|retail price|price|rate|stock|qty|image|image_url|img|product code|sku|upc barcode|barcode|brand name|brand|unit|weight|distributor price|distributor rate|wholesale price|min\\. wholesale qty|min wholesale qty|max discount|karachi stock|lahore stock|low stock trigger|low trigger|total limit|total product limit|short description|description)(?:\\s*\\([^)]+\\))?:|$)';

  const nameMatch = message.match(new RegExp(`(?:product name|name):\\s*([^\\n,]*?)${labelLookahead}`, 'i'));
  const catMatch = message.match(new RegExp(`category:\\s*([^\\n,]*?)${labelLookahead}`, 'i'));
  const priceMatch = message.match(/(?:retail rate|retail price|price|rate)(?:\s*\([^)]+\))?:\s*(?:rs)?\s*(\d+)/i);
  const stockMatch = message.match(/(?:stock|qty):\s*(\d+)/i);
  const imageMatch = message.match(new RegExp(`(?:image|image_url|img):\\s*([^\\n,]*?)${labelLookahead}`, 'i'));

  const skuMatch = message.match(new RegExp(`(?:product code|sku):\\s*([^\\n,]*?)${labelLookahead}`, 'i'));
  const barcodeMatch = message.match(new RegExp(`(?:upc barcode|barcode):\\s*([^\\n,]*?)${labelLookahead}`, 'i'));
  const brandMatch = message.match(new RegExp(`(?:brand name|brand):\\s*([^\\n,]*?)${labelLookahead}`, 'i'));
  const unitMatch = message.match(new RegExp(`unit:\\s*([^\\n,]*?)${labelLookahead}`, 'i'));
  const weightMatch = message.match(/weight(?:\s*\(kg\))?:\s*([\d.]+)/i);
  const distPriceMatch = message.match(/(?:distributor price|distributor rate|wholesale price)(?:\s*\([^)]+\))?:\s*(?:rs)?\s*(\d+)/i);
  const minWholesaleMatch = message.match(/(?:min\. wholesale qty|min wholesale qty):\s*(\d+)/i);
  const maxDiscountMatch = message.match(/(?:max discount)(?:\s*\([^)]+\))?:\s*(\d+)/i);
  
  const karachiStockMatch = message.match(/karachi stock:\s*(\d+)/i);
  const lahoreStockMatch = message.match(/lahore stock:\s*(\d+)/i);
  const lowTriggerMatch = message.match(/(?:low stock trigger|low trigger):\s*(\d+)/i);
  const totalLimitMatch = message.match(/(?:total limit|total product limit):\s*(\d+)/i);

  if (nameMatch) specs.name = nameMatch[1].trim();
  if (catMatch) specs.category = catMatch[1].trim();
  if (priceMatch) specs.price = parseFloat(priceMatch[1]);
  if (stockMatch) specs.stock = parseInt(stockMatch[1]);
  if (imageMatch) specs.image_url = imageMatch[1].trim();

  if (skuMatch) specs.sku = skuMatch[1].trim();
  if (barcodeMatch) specs.barcode = barcodeMatch[1].trim();
  if (brandMatch) specs.brand = brandMatch[1].trim();
  if (unitMatch) specs.unit = unitMatch[1].trim();
  if (weightMatch) specs.weight = parseFloat(weightMatch[1]);
  if (distPriceMatch) specs.distributor_price = parseFloat(distPriceMatch[1]);
  if (minWholesaleMatch) specs.min_wholesale_qty = parseInt(minWholesaleMatch[1]);
  if (maxDiscountMatch) specs.max_discount = parseInt(maxDiscountMatch[1]);
  
  if (karachiStockMatch) specs.karachi_stock = parseInt(karachiStockMatch[1]);
  if (lahoreStockMatch) specs.lahore_stock = parseInt(lahoreStockMatch[1]);
  if (lowTriggerMatch) specs.low_stock_threshold = parseInt(lowTriggerMatch[1]);
  if (totalLimitMatch) specs.total_product_limit = parseInt(totalLimitMatch[1]);

  let descVal = '';
  const descLabel = 'description:';
  const shortDescLabel = 'short description:';
  let labelUsed = '';
  if (lower.includes(shortDescLabel)) {
    labelUsed = shortDescLabel;
  } else if (lower.includes(descLabel)) {
    labelUsed = descLabel;
  }
  if (labelUsed) {
    const idx = lower.indexOf(labelUsed);
    const remaining = message.slice(idx + labelUsed.length).trim();
    const lines = remaining.split('\n');
    if (lines.length > 0 && lines[0].trim()) {
      descVal = lines[0].trim();
    }
  }
  if (descVal) specs.description = descVal;

  return specs;
}

function mergeSpecsIntoArgs(args, specs) {
  for (const key in specs) {
    if (args[key] === undefined || args[key] === null || args[key] === '') {
      args[key] = specs[key];
    }
  }
  return args;
}

function getAdminTools(isGemini = false) {
  const productProps = {
    name: { type: isGemini ? 'STRING' : 'string', description: 'Product Name' },
    category: { type: isGemini ? 'STRING' : 'string', description: 'Catalog Category' },
    price: { type: isGemini ? 'NUMBER' : 'number', description: 'Selling price in PKR' },
    stock: { type: isGemini ? 'INTEGER' : 'integer', description: 'Initial stock units' },
    image_url: { type: isGemini ? 'STRING' : 'string', description: 'Product image URL (optional)' },
    sku: { type: isGemini ? 'STRING' : 'string', description: 'Product Code / SKU' },
    barcode: { type: isGemini ? 'STRING' : 'string', description: 'UPC Barcode' },
    brand: { type: isGemini ? 'STRING' : 'string', description: 'Brand Name' },
    description: { type: isGemini ? 'STRING' : 'string', description: 'Product short description' },
    unit: { type: isGemini ? 'STRING' : 'string', description: 'Base unit of measure' },
    weight: { type: isGemini ? 'NUMBER' : 'number', description: 'Weight of unit in kg' },
    distributor_price: { type: isGemini ? 'NUMBER' : 'number', description: 'Wholesale / distributor rate in PKR' },
    min_wholesale_qty: { type: isGemini ? 'INTEGER' : 'integer', description: 'Minimum wholesale quantity restriction' },
    max_discount: { type: isGemini ? 'INTEGER' : 'integer', description: 'Maximum discount percent (0-100)' },
    karachi_stock: { type: isGemini ? 'INTEGER' : 'integer', description: 'Karachi Central Depot stock level' },
    lahore_stock: { type: isGemini ? 'INTEGER' : 'integer', description: 'Lahore North Terminal stock level' },
    low_stock_threshold: { type: isGemini ? 'INTEGER' : 'integer', description: 'Low Stock trigger threshold limit' },
    total_product_limit: { type: isGemini ? 'INTEGER' : 'integer', description: 'Maximum total product limit capacity' }
  };

  const supplierProps = {
    company_name: { type: isGemini ? 'STRING' : 'string', description: 'Vendor company name (required)' },
    contact_person: { type: isGemini ? 'STRING' : 'string', description: 'Contact person name' },
    email: { type: isGemini ? 'STRING' : 'string', description: 'Contact email address' },
    phone: { type: isGemini ? 'STRING' : 'string', description: 'Contact phone number' },
    city: { type: isGemini ? 'STRING' : 'string', description: 'City location' },
    country: { type: isGemini ? 'STRING' : 'string', description: 'Country location (default: Pakistan)' }
  };

  const updateSupplierProps = {
    identifier: { type: isGemini ? 'STRING' : 'string', description: 'Vendor company name or supplier ID to update (required)' },
    new_company_name: { type: isGemini ? 'STRING' : 'string', description: 'New company name' },
    new_contact_person: { type: isGemini ? 'STRING' : 'string', description: 'New contact person name' },
    new_email: { type: isGemini ? 'STRING' : 'string', description: 'New contact email address' },
    new_phone: { type: isGemini ? 'STRING' : 'string', description: 'New contact phone number' },
    new_city: { type: isGemini ? 'STRING' : 'string', description: 'New city location' },
    new_country: { type: isGemini ? 'STRING' : 'string', description: 'New country location' }
  };

  const deleteSupplierProps = {
    identifier: { type: isGemini ? 'STRING' : 'string', description: 'Vendor company name or supplier ID to delete (required)' }
  };

  const readSupplierProps = {
    action_type: { type: isGemini ? 'STRING' : 'string', enum: ['search', 'list_all', 'filter_by_location'], description: 'Use "list_all" to view all suppliers, "search" to look up specific suppliers, or "filter_by_location" to filter by city or country.' },
    identifier: { type: isGemini ? 'STRING' : 'string', description: 'Supplier name, email, contact, city, or country to search for.' },
    city: { type: isGemini ? 'STRING' : 'string', description: 'City name to filter suppliers by location (e.g. "Karachi").' },
    country: { type: isGemini ? 'STRING' : 'string', description: 'Country name to filter suppliers by location (e.g. "Pakistan").' }
  };

  const fnCreateProduct = {
    name: 'createProduct',
    description: 'Creates a new SKU catalog product and registers it in database inventory.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: productProps,
      required: ['name']
    }
  };

  const fnDeleteProduct = {
    name: 'deleteProduct',
    description: 'Deletes a product by its name or SKU.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: {
        identifier: { type: isGemini ? 'STRING' : 'string', description: 'Product Name or SKU to delete' }
      },
      required: ['identifier']
    }
  };

  const fnUpdateProduct = {
    name: 'updateProduct',
    description: 'Updates specific fields of an existing individual product.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: {
        identifier: { type: isGemini ? 'STRING' : 'string', description: 'Product name or SKU to update.' },
        new_name: { type: isGemini ? 'STRING' : 'string' },
        new_category: { type: isGemini ? 'STRING' : 'string' },
        new_brand: { type: isGemini ? 'STRING' : 'string' },
        new_price: { type: isGemini ? 'NUMBER' : 'number' },
        new_distributor_price: { type: isGemini ? 'NUMBER' : 'number' },
        stock_adjustment: { type: isGemini ? 'INTEGER' : 'integer' }
      },
      required: ['identifier']
    }
  };

  const fnBulkUpdateProducts = {
    name: 'bulkUpdateProducts',
    description: 'Performs bulk updates on products matching a category or brand.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: {
        category_filter: { type: isGemini ? 'STRING' : 'string' },
        brand_filter: { type: isGemini ? 'STRING' : 'string' },
        price_percentage_change: { type: isGemini ? 'NUMBER' : 'number' },
        distributor_price_percentage_change: { type: isGemini ? 'NUMBER' : 'number' },
        new_status: { type: isGemini ? 'STRING' : 'string' },
        new_category: { type: isGemini ? 'STRING' : 'string' },
        new_brand: { type: isGemini ? 'STRING' : 'string' }
      }
    }
  };

  const fnReadProductData = {
    name: 'readProductData',
    description: 'Searches the database to read, check stock, or list products.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: {
        action_type: { type: isGemini ? 'STRING' : 'string', enum: ['search', 'browse_category', 'low_stock'] },
        identifier: { type: isGemini ? 'STRING' : 'string' },
        category: { type: isGemini ? 'STRING' : 'string' }
      },
      required: ['action_type']
    }
  };

  const fnRunAnalyticalQuery = {
    name: 'runAnalyticalQuery',
    description: 'Executes a read-only database query to answer analytical questions, statistics, summaries, and reports.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: {
        sql_query: { type: isGemini ? 'STRING' : 'string', description: 'A valid read-only SELECT SQL statement. Tables: products, orders, suppliers, stock_movements, and audit_logs.' }
      },
      required: ['sql_query']
    }
  };

  const fnCreateSupplier = {
    name: 'createSupplier',
    description: 'Creates and onboards a new vendor supplier in the system database.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: supplierProps,
      required: ['company_name']
    }
  };

  const fnUpdateSupplier = {
    name: 'updateSupplier',
    description: 'Updates details of an existing vendor supplier.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: updateSupplierProps,
      required: ['identifier']
    }
  };

  const fnDeleteSupplier = {
    name: 'deleteSupplier',
    description: 'Deletes a supplier record from the vendor directory.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: deleteSupplierProps,
      required: ['identifier']
    }
  };

  const fnReadSupplierData = {
    name: 'readSupplierData',
    description: 'Reads, searches, or lists details of vendor suppliers from the database.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: readSupplierProps,
      required: ['action_type']
    }
  };

  const fnManageOrders = {
    name: 'manageOrders',
    description: 'Manages, queries, filters, approves, rejects, ships, or analyzes orders in the system. Use this for any order-related request.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: {
        action_type: {
          type: isGemini ? 'STRING' : 'string',
          enum: ['list', 'find', 'by_status', 'by_customer', 'by_date_range', 'by_amount', 'by_product', 'update_status', 'bulk_approve', 'analytics', 'top_buyers', 'top_products', 'overdue', 'ship', 'ship_all', 'awaiting_shipment'],
          description: 'The order operation to perform.'
        },
        identifier: { type: isGemini ? 'STRING' : 'string', description: 'Order ID, order number, or customer email.' },
        status: { type: isGemini ? 'STRING' : 'string', description: 'Order status: PENDING, APPROVED, REJECTED, SHIPPED, CANCELLED, COMPLETED.' },
        new_status: { type: isGemini ? 'STRING' : 'string', description: 'New status to set on the order (for update_status action).' },
        product_name: { type: isGemini ? 'STRING' : 'string', description: 'Product name to filter orders by.' },
        amount: { type: isGemini ? 'NUMBER' : 'number', description: 'Amount threshold for by_amount filter.' },
        amount_operator: { type: isGemini ? 'STRING' : 'string', enum: ['above', 'below'], description: 'Whether to filter above or below the amount.' },
        days: { type: isGemini ? 'INTEGER' : 'integer', description: 'Number of days for overdue threshold (default: 3).' },
        limit: { type: isGemini ? 'INTEGER' : 'integer', description: 'Max number of results to return.' },
        period: { type: isGemini ? 'STRING' : 'string', enum: ['today', 'week', 'month', 'all'], description: 'Time period for analytics.' },
        date_from: { type: isGemini ? 'STRING' : 'string', description: 'Start date (ISO format) for date range filter.' },
        date_to: { type: isGemini ? 'STRING' : 'string', description: 'End date (ISO format) for date range filter.' },
        order_type: { type: isGemini ? 'STRING' : 'string', enum: ['B2C', 'B2B'], description: 'Filter by order type: B2C for retail buyers, B2B for distributors. Use when user says "buyer orders", "distributor orders", "retail orders" etc.' }
      },
      required: ['action_type']
    }
  };

  const fnCreateDistributorQuotation = {
    name: 'createDistributorQuotation',
    description: 'Submits a new wholesale quotation request for a distributor partner.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: {
        product_name: { type: isGemini ? 'STRING' : 'string', description: 'Product name or SKU code to request quotation for.' },
        quantity: { type: isGemini ? 'INTEGER' : 'integer', description: 'Wholesale batch quantity requested.' },
        target_price: { type: isGemini ? 'NUMBER' : 'number', description: 'Target wholesale unit price requested in PKR (optional).' }
      },
      required: ['product_name', 'quantity']
    }
  };

  const fnCreateDistributorDirectOrder = {
    name: 'createDistributorDirectOrder',
    description: 'Places a direct B2B wholesale order for a distributor partner.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: {
        product_name: { type: isGemini ? 'STRING' : 'string', description: 'Product name or SKU code to place direct order for.' },
        quantity: { type: isGemini ? 'INTEGER' : 'integer', description: 'Order quantity.' },
        warehouse_depot: { type: isGemini ? 'STRING' : 'string', description: 'Warehouse depot location (e.g. Karachi Central Depot, Lahore Terminal).' }
      },
      required: ['product_name', 'quantity']
    }
  };

  const fnManageDistributorQuotations = {
    name: 'manageDistributorQuotations',
    description: 'Manages, queries, filters by status/date/amount, accepts, rejects, or analyzes partner quotations and bids.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: {
        action_type: {
          type: isGemini ? 'STRING' : 'string',
          enum: ['list', 'find', 'by_status', 'by_amount', 'by_product', 'update_status', 'analytics', 'expiring'],
          description: 'The quotation operation to perform.'
        },
        identifier: { type: isGemini ? 'STRING' : 'string', description: 'Quote ID or quote number (e.g. QUO-2026-69395).' },
        status: { type: isGemini ? 'STRING' : 'string', description: 'Quotation status: PENDING, ACCEPTED, APPROVED, NEGOTIATING, REJECTED.' },
        new_status: { type: isGemini ? 'STRING' : 'string', description: 'New status to apply (ACCEPTED, REJECTED, CANCELLED).' },
        product_name: { type: isGemini ? 'STRING' : 'string', description: 'Product name to filter quotations.' },
        amount: { type: isGemini ? 'NUMBER' : 'number', description: 'Amount threshold for by_amount filter.' },
        amount_operator: { type: isGemini ? 'STRING' : 'string', enum: ['above', 'below'], description: 'Whether to filter above or below the amount.' }
      },
      required: ['action_type']
    }
  };

  const fnGetBuyerProductRecommendations = {
    name: 'getBuyerProductRecommendations',
    description: 'Searches and recommends retail catalog products based on buyer budget limits in PKR, category, brand, features, sorting, or natural language query. Supports both max_price (under/below) and min_price (above/over) filters.',
    parameters: {
      type: isGemini ? 'OBJECT' : 'object',
      properties: {
        query: { type: isGemini ? 'STRING' : 'string', description: 'Search term or product description (e.g. wireless headphones).' },
        max_price: { type: isGemini ? 'NUMBER' : 'number', description: 'Maximum budget limit in PKR (e.g. 15000). Use for "under", "below", "less than" queries.' },
        min_price: { type: isGemini ? 'NUMBER' : 'number', description: 'Minimum price in PKR (e.g. 200000). Use for "above", "over", "more than" queries.' },
        category: { type: isGemini ? 'STRING' : 'string', description: 'Product category filter (e.g. Headphones, Electronics, Laptops, Graphics Card, CPU).' },
        brand: { type: isGemini ? 'STRING' : 'string', description: 'Brand filter (e.g. Sony, Logitech, Dell, NVIDIA, AMD).' },
        features: { type: isGemini ? 'STRING' : 'string', description: 'Key features requested (e.g. active noise cancellation, bluetooth).' },
        sort_by: { type: isGemini ? 'STRING' : 'string', enum: ['price_high', 'price_low', 'name'], description: 'Sort order: price_high (most expensive first), price_low (cheapest first), name (alphabetical). Use price_high for "highest price", "most expensive" queries.' }
      }
    }
  };

  const list = [
    fnCreateProduct, fnDeleteProduct, fnUpdateProduct, fnBulkUpdateProducts, fnReadProductData, fnRunAnalyticalQuery,
    fnCreateSupplier, fnUpdateSupplier, fnDeleteSupplier, fnReadSupplierData, fnManageOrders,
    fnCreateDistributorQuotation, fnCreateDistributorDirectOrder, fnManageDistributorQuotations,
    fnGetBuyerProductRecommendations
  ];

  if (isGemini) {
    return list;
  }
  return list.map(fn => ({ type: 'function', function: fn }));
}

// ─── Buyer-only tool definitions ─────────────────────────────────────────────
function getBuyerTools(isGemini = false) {
  const T = (t) => isGemini ? t.toUpperCase() : t;

  const tools = [
    {
      name: 'getBuyerProductRecommendations',
      description: 'Search and recommend retail catalog products by budget (max_price or min_price in PKR), category, brand, sorting, or natural language query/features. Supports "above X" (min_price) and "under X" (max_price) price filters.',
      parameters: {
        type: T('object'),
        properties: {
          query:     { type: T('string'), description: 'Natural language search term, e.g. "wireless headphones", "gaming monitor".' },
          max_price: { type: T('number'), description: 'Maximum budget in PKR, e.g. 15000. For "under", "below", "less than" queries.' },
          min_price: { type: T('number'), description: 'Minimum price in PKR, e.g. 200000. For "above", "over", "more than" queries.' },
          category:  { type: T('string'), description: 'Product category, e.g. Laptops, Headphones, Networking, Graphics Card, CPU.' },
          brand:     { type: T('string'), description: 'Brand name, e.g. Sony, Dell, Logitech, NVIDIA, AMD.' },
          features:  { type: T('string'), description: 'Key feature requirements, e.g. "noise cancellation", "bluetooth 5.0".' },
          sort_by:   { type: T('string'), description: 'Sort: price_high (most expensive first), price_low (cheapest first), name. Use for "highest price", "cheapest" queries.' }
        }
      }
    },
    {
      name: 'compareBuyerProducts',
      description: 'Side-by-side spec and price comparison of two products mentioned by the buyer.',
      parameters: {
        type: T('object'),
        properties: {
          product_a: { type: T('string'), description: 'First product name or SKU to compare.' },
          product_b: { type: T('string'), description: 'Second product name or SKU to compare.' }
        }
      }
    },
    {
      name: 'trackBuyerOrder',
      description: 'Track a specific order by order number or order ID and return its current status.',
      parameters: {
        type: T('object'),
        properties: {
          order_id_query: { type: T('string'), description: 'Order number or order ID, e.g. "ORD-2026-7781".' }
        },
        required: ['order_id_query']
      }
    },
    {
      name: 'listBuyerOrders',
      description: 'List orders, optionally filtered by fulfillment status (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURNED).',
      parameters: {
        type: T('object'),
        properties: {
          status_filter: { type: T('string'), description: 'Order status to filter by. Omit to list all orders.' }
        }
      }
    }
  ];

  if (isGemini) return tools;
  return tools.map(fn => ({ type: 'function', function: fn }));
}

async function handleReadSupplierData(pool, args, message) {
  if (args.action_type === 'list_all') {
    const res = await pool.query('SELECT * FROM suppliers LIMIT 20');
    if (res.rows.length === 0) return 'ℹ️ No suppliers found in the vendor directory.';
    return '### 🏢 Suppliers & Vendors Directory\n\n| Company Name | Contact Person | Email | Phone | Location |\n|---|---|---|---|---|\n' +
      res.rows.map(r => `| ${r.company_name} | ${r.contact_person || 'N/A'} | ${r.email || 'N/A'} | ${r.phone || 'N/A'} | ${r.city || 'N/A'}, ${r.country || 'N/A'} |`).join('\n');
  }

  if (args.action_type === 'filter_by_location') {
    const city = args.city || '';
    const country = args.country || '';
    const rows = await filterSuppliersByLocationInDb(pool, city, country);
    const locationLabel = [city, country].filter(Boolean).join(', ');
    if (rows.length === 0) return `❌ No suppliers found in location: "${locationLabel}"`;
    return `### 📍 Suppliers in ${locationLabel}\n\n| Company Name | Contact Person | Email | Phone | Location |\n|---|---|---|---|---|\n` +
      rows.map(r => `| ${r.company_name} | ${r.contact_person || 'N/A'} | ${r.email || 'N/A'} | ${r.phone || 'N/A'} | ${r.city || 'N/A'}, ${r.country || 'N/A'} |`).join('\n');
  }

  const searchVal = args.identifier || '';
  const rows = await searchSuppliersInDb(pool, searchVal);
  if (rows.length === 0) return `❌ Could not find supplier matching search key: "${searchVal}"`;
  return '### 🔍 Searched Suppliers\n\n| Company Name | Contact Person | Email | Phone | Location |\n|---|---|---|---|---|\n' +
    rows.map(r => `| ${r.company_name} | ${r.contact_person || 'N/A'} | ${r.email || 'N/A'} | ${r.phone || 'N/A'} | ${r.city || 'N/A'}, ${r.country || 'N/A'} |`).join('\n');
}

function extractSupplierSpecsFromMessage(message) {
  const lower = message.toLowerCase();
  const specs = {};

  const labelLookahead = '(?=\\s*(?:company name|company|contact person|contact|email address|email|phone number|phone|city|country)(?:\\s*\\([^)]+\\))?:|$)';

  const nameMatch = message.match(new RegExp(`(?:company name|company):\\s*([^\\n,]*?)${labelLookahead}`, 'i'));
  const contactMatch = message.match(new RegExp(`(?:contact person|contact):\\s*([^\\n,]*?)${labelLookahead}`, 'i'));
  const emailMatch = message.match(new RegExp(`(?:email address|email):\\s*([^\\n,]*?)${labelLookahead}`, 'i'));
  const phoneMatch = message.match(new RegExp(`(?:phone number|phone):\\s*([^\\n,]*?)${labelLookahead}`, 'i'));
  const cityMatch = message.match(new RegExp(`city:\\s*([^\\n,]*?)${labelLookahead}`, 'i'));
  const countryMatch = message.match(new RegExp(`country:\\s*([^\\n,]*?)${labelLookahead}`, 'i'));

  if (nameMatch) specs.company_name = nameMatch[1].trim();
  if (contactMatch) specs.contact_person = contactMatch[1].trim();
  if (emailMatch) specs.email = emailMatch[1].trim();
  if (phoneMatch) specs.phone = phoneMatch[1].trim();
  if (cityMatch) specs.city = cityMatch[1].trim();
  if (countryMatch) specs.country = countryMatch[1].trim();

  return specs;
}

async function executeCopilotTool(pool, name, args, message, attached_image, authEmail = null) {
  // Override any LLM-supplied customer_email with the verified identity from the JWT.
  // The LLM fills args.customer_email from context (or could hallucinate any address),
  // so trusting it would let the AI create orders/quotations under another account's email.
  if (authEmail && (name === 'createDistributorQuotation' || name === 'createDistributorDirectOrder' || name === 'trackBuyerOrder' || name === 'listBuyerOrders')) {
    args = { ...args, customer_email: authEmail };
  }
  if (name === 'createProduct') {
    if (attached_image) {
      args.image_url = attached_image;
    }
    const specs = extractSpecsFromMessage(message);
    mergeSpecsIntoArgs(args, specs);
    const newProduct = await createProductInDb(pool, args);
    return {
      action_executed: 'createProduct',
      ai_message: `✅ Created: **${args.name}** (${args.category || 'N/A'}). Price: ${args.price !== undefined && args.price !== null ? 'Rs ' + args.price.toLocaleString() : 'N/A'}, Stock: ${args.stock !== undefined && args.stock !== null ? args.stock : 'N/A'}. SKU: ${newProduct.sku}.`,
      product: newProduct
    };
  } else if (name === 'deleteProduct') {
    const deleted = await deleteProductFromDb(pool, args.identifier);
    return {
      action_executed: 'deleteProduct',
      ai_message: `✅ Deleted product: **${deleted.product_name}** (SKU: ${deleted.sku}).`
    };
  } else if (name === 'updateProduct') {
    const updated = await updateProductInDb(pool, args.identifier, args);
    return {
      action_executed: 'updateProduct',
      ai_message: `✅ Updated product: **${updated.product_name}**. (Edits applied successfully)`
    };
  } else if (name === 'bulkUpdateProducts') {
    const count = await bulkUpdateProductsInDb(pool, args.category_filter, args.brand_filter, args);
    return {
      action_executed: 'bulkUpdateProducts',
      ai_message: `✅ Bulk operation completed: Successfully modified **${count}** products matching your criteria.`
    };
  } else if (name === 'readProductData') {
    const markdownMsg = await handleReadProductData(pool, args, message);
    return {
      action_executed: 'readProductData',
      ai_message: markdownMsg
    };
  } else if (name === 'runAnalyticalQuery') {
    const reportMsg = await handleAnalyticalQuery(pool, args.sql_query);
    return {
      action_executed: 'runAnalyticalQuery',
      ai_message: reportMsg
    };
  } else if (name === 'createSupplier') {
    const specs = extractSupplierSpecsFromMessage(message);
    const merged = { ...args, ...specs };
    if (!merged.company_name) {
      throw new Error('Company name is required to onboard a supplier.');
    }
    const newSup = await createSupplierInDb(pool, merged);
    return {
      action_executed: 'createSupplier',
      ai_message: `✅ Onboarded Supplier: **${newSup.company_name}** (${newSup.city || 'N/A'}, ${newSup.country || 'N/A'}). Contact Person: ${newSup.contact_person || 'N/A'}. Email: ${newSup.email || 'N/A'}. Phone: ${newSup.phone || 'N/A'}.`,
      supplier: newSup
    };
  } else if (name === 'updateSupplier') {
    const specs = extractSupplierSpecsFromMessage(message);
    const mappedSpecs = {};
    if (specs.company_name) mappedSpecs.new_company_name = specs.company_name;
    if (specs.contact_person) mappedSpecs.new_contact_person = specs.contact_person;
    if (specs.email) mappedSpecs.new_email = specs.email;
    if (specs.phone) mappedSpecs.new_phone = specs.phone;
    if (specs.city) mappedSpecs.new_city = specs.city;
    if (specs.country) mappedSpecs.new_country = specs.country;

    const merged = { ...args, ...mappedSpecs };
    const updatedSup = await updateSupplierInDb(pool, args.identifier, merged);
    return {
      action_executed: 'updateSupplier',
      ai_message: `✅ Updated Supplier profile: **${updatedSup.company_name}**. (Edits applied successfully)`
    };
  } else if (name === 'deleteSupplier') {
    const deletedSup = await deleteSupplierFromDb(pool, args.identifier);
    return {
      action_executed: 'deleteSupplier',
      ai_message: `✅ Deleted Supplier: **${deletedSup.company_name}** (ID: ${deletedSup.supplier_id}).`
    };
  } else if (name === 'readSupplierData') {
    const markdownMsg = await handleReadSupplierData(pool, args, message);
    return {
      action_executed: 'readSupplierData',
      ai_message: markdownMsg
    };
  } else if (name === 'manageOrders') {
    const md = await handleManageOrders(pool, args, message);
    return {
      action_executed: 'manageOrders',
      ai_message: md
    };
  } else if (name === 'createDistributorQuotation') {
    const quote = await createDistributorQuotationInDb(pool, args.customer_email, args.customer_name, args.product_name, args.quantity, args.target_price);
    return {
      action_executed: 'createDistributorQuotation',
      ai_message: `✅ **Quotation Request Submitted Successfully!**\n\n- **Quotation ID**: \`${quote.quotation_id}\`\n- **Quotation Number**: **${quote.quotation_number}**\n- **Product**: **${quote.product_name}** (${quote.sku})\n- **Quantity**: ${quote.quantity} units\n- **Target Unit Price**: Rs ${Number(quote.unit_price).toLocaleString()}\n- **Total Estimated Value**: Rs ${Number(quote.total_amount).toLocaleString()}\n- **Status**: \`${quote.status}\` (Under Review by Sales Team)`
    };
  } else if (name === 'createDistributorDirectOrder') {
    const order = await createDistributorDirectOrderInDb(pool, args.customer_email, args.customer_name, args.product_name, args.quantity, args.warehouse_depot);
    return {
      action_executed: 'createDistributorDirectOrder',
      ai_message: `✅ **Direct B2B Wholesale Order Placed Successfully!**\n\n- **Order Number**: **${order.order_number}**\n- **Product**: **${order.product_name}** (${order.sku})\n- **Order Quantity**: ${order.quantity} units\n- **Total Amount**: Rs ${Number(order.total_amount).toLocaleString()}\n- **Warehouse Depot**: ${order.warehouse_depot}\n- **Order Status**: \`${order.status}\` (Processing)`
    };
  } else if (name === 'manageDistributorQuotations') {
    const action = args.action_type;
    const identifier = args.identifier || '';

    if (action === 'by_status') {
      const rows = await getDistributorQuotationsByStatusFromDb(pool, args.status || 'PENDING');
      return {
        action_executed: 'manageDistributorQuotations',
        ai_message: formatQuotationsTable(rows, `📋 ${(args.status || 'PENDING').toUpperCase().replace('_',' ')} Quotations`)
      };
    }
    if (action === 'find') {
      const rows = await getDistributorQuotationByIdFromDb(pool, identifier);
      return {
        action_executed: 'manageDistributorQuotations',
        ai_message: formatQuotationsTable(rows, `🔍 Quotation Search: "${identifier}"`)
      };
    }
    if (action === 'by_amount') {
      const rows = await getDistributorQuotationsByAmountFromDb(pool, args.amount_operator || 'above', args.amount || 0);
      return {
        action_executed: 'manageDistributorQuotations',
        ai_message: formatQuotationsTable(rows, `💰 کوٹیشنز ${args.amount_operator === 'above' ? 'سے زیادہ' : 'سے کم'} Rs ${Number(args.amount || 0).toLocaleString()}`)
      };
    }
    if (action === 'by_product') {
      const rows = await getDistributorQuotationsByProductFromDb(pool, args.product_name || '');
      return {
        action_executed: 'manageDistributorQuotations',
        ai_message: formatQuotationsTable(rows, `📦 کوٹیشن برائے "${args.product_name || ''}"`)
      };
    }
    if (action === 'update_status') {
      const updated = await updateDistributorQuotationStatusInDb(pool, identifier, args.new_status || 'ACCEPTED');
      return {
        action_executed: 'manageDistributorQuotations',
        ai_message: `✅ کوٹیشن **${updated.quotation_number || updated.quotation_id}** کی حیثیت \`${updated.status}\` کر دی گئی!`
      };
    }
    if (action === 'analytics') {
      const kpi = await getDistributorQuotationKpisFromDb(pool);
      let md = `### 📊 کوٹیشنز کا خلاصہ\n\n`;
      md += `- **فعال کوٹیشنز**: **${kpi.active_quotations}**\n`;
      md += `- **کل مالیت**: **Rs ${Number(kpi.total_bid_value).toLocaleString()}**\n\n`;
      if (kpi.by_status && kpi.by_status.length > 0) {
        md += `**حیثیت کے لحاظ سے:**\n\n| حیثیت | تعداد | مالیت |\n|---|---|---|\n`;
        md += kpi.by_status.map(s => `| \`${s.status}\` | ${s.count} | Rs ${Number(s.amount || 0).toLocaleString()} |`).join('\n');
      }
      return { action_executed: 'manageDistributorQuotations', ai_message: md };
    }
    if (action === 'expiring') {
      const rows = await getExpiringDistributorQuotationsFromDb(pool, 7);
      return {
        action_executed: 'manageDistributorQuotations',
        ai_message: formatQuotationsTable(rows, `⏳ کوٹیشنز جو جلد ختم ہونے والی ہیں (7 دن)`)
      };
    }
    const rows = await getDistributorQuotationsFromDb(pool);
    return {
      action_executed: 'manageDistributorQuotations',
      ai_message: formatQuotationsTable(rows, `📋 پارٹنر کوٹیشنز`)
    };
  } else if (name === 'getBuyerProductRecommendations') {
    const products = await getBuyerProductRecommendationsFromDb(pool, args);
    let md = `### 🛍️ آپ کے لیے تجویزدہ مصنوعات\n\n`;
    if (args.max_price) md += `*Rs ${Number(args.max_price).toLocaleString()} تک کی مصنوعات*\n\n`;
    if (args.min_price) md += `*Rs ${Number(args.min_price).toLocaleString()} سے زیادہ کی مصنوعات*\n\n`;
    if (args.sort_by === 'price_high') md += `*زیادہ سے کم قیمت کی ترتیب*\n\n`;
    else if (args.sort_by === 'price_low') md += `*کم سے زیادہ قیمت کی ترتیب*\n\n`;
    if (products.length === 0) {
      let criteria = '';
      if (args.max_price) criteria += ` Rs ${Number(args.max_price).toLocaleString()} تک`;
      if (args.min_price) criteria += ` Rs ${Number(args.min_price).toLocaleString()} سے اوپر`;
      md += `معذرت، آپ کی مطلوبہ حد میں کوئی مصنوع نہیں ملی${criteria}۔ برائے کرم اپنا بجٹ تبدیل کر کے یا مختلف الفاظ سے تلاش کریں!`;
    } else {
      md += products.slice(0, 10).map((p, idx) => {
        const stockStatus = p.available_stock > 0 ? `اسٹاک میں موجود (${p.available_stock} عدد)` : `⚠️ اسٹاک ختم`;
        return `**${idx + 1}. ${p.product_name}**\n` +
          `- **برانڈ**: ${p.brand || 'N/A'} | **کیٹیگری**: ${p.category || 'عام'}\n` +
          `- **قیمت**: **Rs ${p.retail_price.toLocaleString()}**\n` +
          `- **دستیابی**: ${stockStatus}\n` +
          (p.short_description ? `- **تفصیلات**: ${p.short_description}\n` : '');
      }).join('\n');
    }
    return { action_executed: 'getBuyerProductRecommendations', ai_message: md, products: getRelevantCards(products, md || message, 6, message) };

  } else if (name === 'compareBuyerProducts') {
    const result = await compareBuyerProductsInDb(pool, { message, product_a: args.product_a || '', product_b: args.product_b || '' });
    return { action_executed: 'compareBuyerProducts', ai_message: result.ai_message, products: result.products };

  } else if (name === 'trackBuyerOrder') {
    const result = await trackBuyerOrder(pool, { order_id_query: args.order_id_query || '', customer_email: args.customer_email || null });
    return { action_executed: 'trackBuyerOrder', ai_message: result.ai_message, orders: result.orders };

  } else if (name === 'listBuyerOrders') {
    const result = await listBuyerOrdersByStatus(pool, { status_filter: args.status_filter || null, customer_email: args.customer_email || null });
    return { action_executed: 'listBuyerOrders', ai_message: result.ai_message, orders: result.orders };
  }
  throw new Error(`Unknown tool name: ${name}`);
}

// Table cells are rendered as plain text by the chat widgets (only headings/paragraphs get
// inline markdown parsing), so **bold** and `code` markers inside a cell reach the user
// literally -- e.g. "**INV-2026-5375**" and "`SENT`". Cells therefore stay unformatted.
// Dates likewise need formatting here: a raw timestamp column rendered as
// "2026-09-04T22:58:15.718Z" is unreadable next to plain date columns.
function formatTableDate(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (isNaN(d)) return String(value).slice(0, 10);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatOrdersTable(rows, title) {
  if (rows.length === 0) return `ℹ️ کوئی آرڈر نہیں ملا۔`;
  return `### ${title}\n\n| آرڈر # | حیثیت | رقم (PKR) | صارف | تاریخ |\n|---|---|---|---|---|\n` +
    rows.map(r => `| ${r.order_number || r.order_id} | ${r.status} | Rs ${parseFloat(r.total_amount).toLocaleString()} | ${r.customer_email} | ${formatTableDate(r.order_date)} |`).join('\n');
}

// Short, natural Urdu INTRO sentence for TTS -- kept separate from the markdown table
// above (which is for on-screen display only, and is where the actual numbers/rows belong).
// Reading a pipe-delimited table aloud verbatim produced garbled/broken speech, and reading
// out totals/counts on top of that is still more than a person would naturally say out loud
// before pointing at the list on screen -- "yeh rahi aapki [X]" is the target, not a report.
function speechForOrders(rows, title) {
  if (!rows || rows.length === 0) return `کوئی آرڈر نہیں ملا۔`;
  return `یہ رہے ${title.replace(/[📦]/g, '').trim()}۔`;
}

function formatQuotationsTable(rows, title) {
  if (!rows || rows.length === 0) return `ℹ️ کوئی کوٹیشن نہیں ملی۔`;
  return `### ${title}\n\n| کوٹ نمبر | تاریخ | میعاد | حیثیت | رقم (PKR) |\n|---|---|---|---|---|\n` +
    rows.map(r => `| ${r.quotation_number || r.quotation_id} | ${r.created_at ? formatTableDate(r.created_at) : 'حالیہ'} | ${r.valid_until ? formatTableDate(r.valid_until) : '14 دن'} | ${r.status || 'PENDING'} | Rs ${Number(r.total_amount || 0).toLocaleString()} |`).join('\n');
}

function speechForQuotations(rows, title) {
  if (!rows || rows.length === 0) return `کوئی کوٹیشن نہیں ملی۔`;
  return `یہ رہیں ${title.replace(/[📋❌✅⏳]/g, '').trim()}۔`;
}

function formatInvoicesTable(rows, title) {
  if (!rows || rows.length === 0) return `ℹ️ کوئی انوائس نہیں ملی۔`;
  return `### ${title}\n\n| انوائس نمبر | کل رقم | ادا شدہ | باقی رقم | حیثیت | آخری تاریخ |\n|---|---|---|---|---|---|\n` +
    rows.map(r => {
      const total = parseFloat(r.total_amount || 0);
      const paid = parseFloat(r.amount_paid || 0);
      const remaining = Math.max(0, total - paid);
      return `| ${r.invoice_number} | Rs ${total.toLocaleString()} | Rs ${paid.toLocaleString()} | Rs ${remaining.toLocaleString()} | ${r.status || 'UNPAID'} | ${formatTableDate(r.due_date)} |`;
    }).join('\n');
}

function speechForInvoices(rows, title) {
  if (!rows || rows.length === 0) return `کوئی انوائس نہیں ملی۔`;
  return `یہ رہیں ${title.replace(/[📄💳⚠️✅]/g, '').trim()}۔`;
}

function formatLedgerMd(ledger) {
  return [
    `### 💳 مالی لیجر اور کریڈٹ کی صورتحال`,
    ``,
    `- **کریڈٹ لیمٹ**: Rs ${Number(ledger.credit_limit_pkr).toLocaleString()}`,
    `- **استعمال شدہ کریڈٹ**: Rs ${Number(ledger.used_credit_pkr).toLocaleString()}`,
    `- **دستیاب کریڈٹ**: **Rs ${Number(ledger.available_credit_pkr).toLocaleString()}**`,
    `- **زیر التواء انوائسز**: ${ledger.outstanding_invoices_count ?? 0}`,
    `- **ادائیگی کی شرائط**: ${ledger.payment_terms || 'NET-30'}`,
  ].join('\n');
}

function speechForLedger(ledger) {
  return `آپ کی کریڈٹ لیمٹ ${Math.round(Number(ledger.credit_limit_pkr)).toLocaleString()} روپے ہے، جس میں سے ${Math.round(Number(ledger.available_credit_pkr)).toLocaleString()} روپے دستیاب ہیں۔ ${Number(ledger.outstanding_invoices_count) || 0} انوائسز زیر التواء ہیں۔`;
}

async function handleManageOrders(pool, args, message) {
  let action = args.action_type;
  let identifier = args.identifier || '';
  
  let orderType = args.order_type || null;
  if (!orderType && message) {
    const lowerMsg = message.toLowerCase();
    const isBuyer = /\b(buyer|b2c|retail|customer)\b/i.test(lowerMsg);
    const isDistributor = /\b(distributor|b2b|wholesale)\b/i.test(lowerMsg);
    if (isBuyer) orderType = 'B2C';
    else if (isDistributor) orderType = 'B2B';
  }
  const typeLabel = orderType === 'B2C' ? ' (خوردہ / B2C)' : orderType === 'B2B' ? ' (تھوک / B2B)' : '';

  if (action === 'find') {
    const isBadId = !identifier || identifier.trim() === '' || identifier.toLowerCase() === 'undefined';
    const statusMatch = message ? message.toLowerCase().match(/\b(pending|approved|rejected|shipped|cancelled|completed)\b/i) : null;
    
    if (isBadId || statusMatch) {
      if (statusMatch) {
        const matchedStatus = statusMatch[1].toUpperCase();
        const rows = await getOrdersByStatusFromDb(pool, matchedStatus, orderType);
        return formatOrdersTable(rows, `📊 ${matchedStatus} آرڈرز${typeLabel}`);
      } else if (isBadId) {
        return `❌ براہ کرم درست آرڈر ID درج کریں۔`;
      }
    }
  }

  if (action === 'list') {
    const rows = await listOrdersFromDb(pool, args.limit || 20, orderType);
    return formatOrdersTable(rows, `📋 حالیہ آرڈرز${typeLabel}`);
  }
  if (action === 'find') {
    const rows = await getOrderByIdFromDb(pool, identifier);
    if (rows.length === 0) return `❌ کوئی آرڈر نہیں ملا: "${identifier}"`;
    return formatOrdersTable(rows, `🔍 تلاش: "${identifier}"`);
  }
  if (action === 'by_status') {
    const rows = await getOrdersByStatusFromDb(pool, args.status || 'PENDING', orderType);
    return formatOrdersTable(rows, `📊 ${(args.status || 'PENDING').toUpperCase()} آرڈرز${typeLabel}`);
  }
  if (action === 'by_customer') {
    const rows = await getOrdersByCustomerFromDb(pool, args.identifier || '', orderType);
    return formatOrdersTable(rows, `👤 صارف کے آرڈرز: "${args.identifier}"${typeLabel}`);
  }
  if (action === 'by_date_range') {
    const rows = await getOrdersByDateRangeFromDb(pool, args.date_from, args.date_to, orderType);
    return formatOrdersTable(rows, `📅 آرڈرز برائے ${args.date_from} تا ${args.date_to}${typeLabel}`);
  }
  if (action === 'by_amount') {
    const op = args.amount_operator || 'above';
    const rows = await getOrdersByAmountFilterFromDb(pool, op, args.amount || 0, orderType);
    return formatOrdersTable(rows, `💰 آرڈرز جن کی رقم ${op} ہے Rs ${(args.amount || 0).toLocaleString()}${typeLabel}`);
  }
  if (action === 'by_product') {
    const rows = await getOrdersByProductFromDb(pool, args.product_name || '');
    if (rows.length === 0) return `❌ اس مصنوعہ کے کوئی آرڈر نہیں ملے: "${args.product_name}"`;
    return formatOrdersTable(rows, `📦 مصنوعات آرڈرز: "${args.product_name}"`);
  }
  if (action === 'update_status') {
    const updated = await updateOrderStatusInDb(pool, args.identifier, args.new_status || args.status);
    return `✅ آرڈر **${updated.order_number}** کی حیثیت **${updated.status}** کر دی گئی۔`;
  }
  if (action === 'bulk_approve') {
    const rows = await bulkApproveOrdersInDb(pool);
    if (rows.length === 0) return `ℹ️ کوئی پینڈنگ آرڈر منظور کرنے کے لیے نہیں ہے۔`;
    return `✅ کل **${rows.length}** آرڈرز منظور کر لیے گئے:\n\n` +
      rows.map(r => `- ${r.order_number} (${r.customer_email})`).join('\n');
  }
  if (action === 'analytics') {
    const period = args.period || 'month';
    const data = await getOrderAnalyticsFromDb(pool, period);
    const t = data.totals;
    const periodLabel = { today: 'آج', week: 'اس ہفتے', month: 'اس مہینے', all: 'کل' }[period] || period;
    let md = `### 📊 آرڈر اینالٹکس — ${periodLabel}${typeLabel}\n\n`;
    md += `| میٹرک | قدر |\n|---|---|\n`;
    md += `| کل آرڈرز | **${t.total_orders}** |\n`;
    md += `| کل ریونیو | **Rs ${parseFloat(t.total_revenue).toLocaleString('en-PK', {maximumFractionDigits:0})}** |\n`;
    md += `| اوسط آرڈر ویلیو | **Rs ${parseFloat(t.avg_order_value).toLocaleString('en-PK', {maximumFractionDigits:0})}** |\n\n`;
    if (data.by_status.length > 0) {
      md += `**حیثیت کے لحاظ سے:**\n\n| حیثیت | تعداد |\n|---|---|\n`;
      md += data.by_status.map(s => `| ${s.status} | ${s.count} |`).join('\n');
    }
    return md;
  }
  if (action === 'top_buyers') {
    const rows = await getTopBuyersFromDb(pool, args.limit || 5);
    if (rows.length === 0) return `ℹ️ کوئی آرڈر ڈیٹا نہیں ملا۔`;
    return `### 🏆 ٹاپ ${args.limit || 5} خریدار\n\n| درجہ | صارف | آرڈرز | کل خرچ |\n|---|---|---|---|\n` +
      rows.map((r, i) => `| ${i+1} | ${r.customer_email} | ${r.order_count} | Rs ${parseFloat(r.total_spent).toLocaleString('en-PK', {maximumFractionDigits:0})} |`).join('\n');
  }
  if (action === 'top_products') {
    const rows = await getMostOrderedProductsFromDb(pool, args.limit || 10);
    if (rows.length === 0) return `ℹ️ کوئی ڈیٹا نہیں ملا۔`;
    return `### 🔥 مقبول ترین مصنوعات\n\n| درجہ | مصنوع | کل تعداد | آرڈرز |\n|---|---|---|---|\n` +
      rows.map((r, i) => `| ${i+1} | ${r.product_name || 'N/A'} | ${r.total_qty || 0} | ${r.order_count} |`).join('\n');
  }
  if (action === 'overdue') {
    const days = args.days || 3;
    const rows = await getOverdueOrdersFromDb(pool, days, orderType);
    if (rows.length === 0) return `✅ کوئی واجب الادا آرڈر نہیں ہے۔`;
    return formatOrdersTable(rows, `⚠️ واجب الادا آرڈرز (${days} دن سے زائد)`);
  }
  if (action === 'ship' || action === 'ship_order') {
    if (!identifier) return `❌ براہ کرم آرڈر نمبر درج کریں۔`;
    try {
      const shipResult = await shipOrderInDb(pool, identifier, args.warehouse_id || 'wh-1');
      return `🚚 **آرڈر کامیابی سے بھیج دیا گیا!**\n\n- **آرڈر نمبر**: **${shipResult.shippedOrder?.order_number || identifier}**\n- **حیثیت**: \`SHIPPED\`\n- **تفصیلات**: ${shipResult.message}`;
    } catch (err) {
      return `❌ شپنگ ناکام: ${err.message}`;
    }
  }
  if (action === 'ship_all') {
    const cat = args.category || args.product_name || null;
    const shipResult = await shipAllOrdersInDb(pool, cat, args.warehouse_id || 'wh-1');
    if (shipResult.shipped_count === 0) {
      return `ℹ️ کوئی آرڈر شپنگ کے لیے تیار نہیں ہے۔`;
    }
    let md = `🚚 **بلک آرڈر شپمنٹ مکمل!**\n\nکل **${shipResult.shipped_count}** آرڈرز بھجوا دیے گئے ہیں:\n\n`;
    md += shipResult.shipped_orders.map(o => `- **${o.order_number || o.order_id}** | ${o.customer_email}`).join('\n');
    return md;
  }
  if (action === 'awaiting_shipment' || action === 'to_ship') {
    const cat = args.category || args.product_name || null;
    const awaitingData = await getOrdersAwaitingShipmentFromDb(pool, cat);
    if (awaitingData.total_awaiting_shipment === 0) {
      return `✅ **تمام آرڈرز بھجوا دیے گئے ہیں!**`;
    }

    let md = `### 📦 آرڈرز جو شپنگ کے لیے تیار ہیں (${awaitingData.total_awaiting_shipment} کل)\n\n`;
    for (const [catName, catOrders] of Object.entries(awaitingData.by_category)) {
      md += `#### 📍 کیٹیگری: **${catName}** (${catOrders.length} آرڈر)\n`;
      md += `| آرڈر # | صارف | حیثیت | ٹوٹل |\n|---|---|---|---|\n`;
      md += catOrders.map(o => `| **${o.order_number || o.order_id}** | ${o.customer_email} | \`${o.status}\` | ${Number(o.total_amount || 0).toLocaleString()} |`).join('\n') + '\n\n';
    }
    return md;
  }
  return `❌ نامعلوم آرڈر ایکشن: "${action}"`;
}

async function handleLocalFallback(pool, message, attached_image, res, role = 'ADMIN') {
  const lowerMsg = message.toLowerCase();

  if (role === 'DISTRIBUTOR' || /\b(wholesale|distributor|quotation|quote|bid|order|po|ledger|credit limit)\b/i.test(lowerMsg)) {
    const isQuoteCreate = /\b(request|create|submit|add)\s+(?:a\s+)?(?:quote|quotation)\b/i.test(lowerMsg);
    if (isQuoteCreate) {
      const prodMatch = message.match(/(?:for|item|product)\s+["']?([^"'\n\d,]+?)["']?\s*(?:qty|quantity|amount|at|target|\d+|$)/i);
      const qtyMatch = message.match(/\b(?:qty|quantity|units?)\s*[:=]?\s*(\d+)\b/i);
      const prodName = prodMatch ? prodMatch[1].trim() : 'laptop';
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 10;
      try {
        const quote = await createDistributorQuotationInDb(pool, userEmail, displayName, prodName, qty, null);
        return res.json({ success: true, action_executed: "createDistributorQuotation", ai_message: `✅ کوٹیشن درخواست کامیابی سے جمع! ID: \`${quote.quotation_id}\`` });
      } catch (err) { return res.json({ success: true, ai_message: `❌ غلطی: ${err.message}` }); }
    }

    const isDirectOrder = /\b(place|create|buy|direct)\s+(?:a\s+)?(?:direct\s+)?order\b/i.test(lowerMsg);
    if (isDirectOrder) {
      const prodMatch = message.match(/(?:for|of|item|product)\s+["']?([^"'\n\d,]+?)["']?\s*(?:qty|quantity|amount|in|at|\d+|$)/i);
      const qtyMatch = message.match(/\b(?:qty|quantity|units?)\s*[:=]?\s*(\d+)\b/i);
      const prodName = prodMatch ? prodMatch[1].trim() : 'laptop';
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 10;
      try {
        const order = await createDistributorDirectOrderInDb(pool, userEmail, displayName, prodName, qty, 'Karachi Central Depot');
        return res.json({ success: true, action_executed: "createDistributorDirectOrder", ai_message: `✅ B2B تھوک آرڈر کامیاب! نمبر: **${order.order_number}**` });
      } catch (err) { return res.json({ success: true, ai_message: `❌ غلطی: ${err.message}` }); }
    }

    if (/\b(quotation|quote|bid)\b/i.test(lowerMsg)) {
      const statusUpdateMatch = message.match(/\b(accept|confirm|reject|cancel|approve)\s+(?:quote|quotation)?\s*([\w-]+)/i);
      if (statusUpdateMatch) {
        const verb = statusUpdateMatch[1].toLowerCase();
        const newStatus = { accept: 'ACCEPTED', confirm: 'ACCEPTED', approve: 'APPROVED', reject: 'REJECTED', cancel: 'CANCELLED' }[verb] || 'ACCEPTED';
        try {
          const updated = await updateDistributorQuotationStatusInDb(pool, statusUpdateMatch[2], newStatus);
          return res.json({ success: true, action_executed: "updateDistributorQuotationStatus", ai_message: `✅ کوٹیشن **${updated.quotation_number}** اب \`${updated.status}\` ہے!` });
        } catch (err) { return res.json({ success: true, ai_message: `❌ ${err.message}` }); }
      }
      try {
        const rows = await getDistributorQuotationsFromDb(pool);
        return res.json({ success: true, action_executed: "getDistributorQuotations", ai_message: formatQuotationsTable(rows, `📋 پارٹنر کوٹیشنز`) });
      } catch (err) { return res.json({ success: true, ai_message: `❌ غلطی: ${err.message}` }); }
    }

    if (/\b(order|po|shipping|logistics|shipment|depot)\b/i.test(lowerMsg)) {
      try {
        const rows = await getDistributorOrdersFromDb(pool);
        return res.json({ success: true, action_executed: "getDistributorOrders", ai_message: "### 🚚 تھوک آرڈرز\n\n..." });
      } catch (err) { return res.json({ success: true, ai_message: `❌ غلطی: ${err.message}` }); }
    }

    if (/\b(credit|ledger|invoice|balance|terms)\b/i.test(lowerMsg)) {
      try {
        const ledger = await getDistributorLedgerStatusFromDb(pool);
        return res.json({ success: true, action_executed: "getDistributorLedgerStatus", ai_message: `### 💳 مالی لیجر\n- دستیاب کریڈٹ: **Rs ${Number(ledger.remaining_credit).toLocaleString()}**` });
      } catch (err) { return res.json({ success: true, ai_message: `❌ غلطی: ${err.message}` }); }
    }

    try {
      const rows = await getDistributorWholesaleProductsFromDb(pool);
      return res.json({ success: true, action_executed: "getDistributorWholesaleProducts", ai_message: "### 📦 تھوک کیٹلاگ\n\n..." });
    } catch (err) { return res.json({ success: true, ai_message: `❌ غلطی: ${err.message}` }); }
  }

  if (/\b(need to ship|to ship|ready to ship|awaiting shipment|which category order|shipping category)\b/i.test(lowerMsg)) {
    try {
      const md = await handleManageOrders(pool, { action_type: 'awaiting_shipment' }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md });
    } catch (err) { return res.json({ success: true, ai_message: `❌ غلطی: ${err.message}` }); }
  }

  if (/\b(prompt\s+ship|ship\s+(?:all\s+)?orders?|ship\s+(?:the\s+)?order)\b/i.test(lowerMsg)) {
    try {
      const md = await handleManageOrders(pool, { action_type: 'ship_all' }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md });
    } catch (err) { return res.json({ success: true, ai_message: `❌ غلطی: ${err.message}` }); }
  }

  const findOrderMatch = message.match(/(?:find|show|get|check|search)\s+order\s+([\w-]+)/i);
  if (findOrderMatch) {
    try {
      const md = await handleManageOrders(pool, { action_type: 'find', identifier: findOrderMatch[1] }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md });
    } catch (err) { return res.json({ success: true, ai_message: `❌ غلطی: ${err.message}` }); }
  }

  if (/\b(add|create|onboard|register)\s+supplier\b/i.test(lowerMsg)) {
    const specs = extractSupplierSpecsFromMessage(message);
    if (!specs.company_name) return res.json({ success: true, ai_message: `❌ کمپنی کا نام درج کریں۔` });
    try {
      const newSup = await createSupplierInDb(pool, specs);
      return res.json({ success: true, action_executed: 'createSupplier', ai_message: `✅ سپلائر آن بورڈ: ${newSup.company_name}` });
    } catch (err) { return res.json({ success: true, ai_message: `❌ ${err.message}` }); }
  }

  if (/\b(search|find|list|show|check)\s+suppliers?\b/i.test(lowerMsg)) {
    try {
      const md = await handleReadSupplierData(pool, { action_type: 'list_all' }, message);
      return res.json({ success: true, action_executed: 'readSupplierData', ai_message: md });
    } catch (err) { return res.json({ success: true, ai_message: `❌ ${err.message}` }); }
  }

  const specs = extractSpecsFromMessage(message);
  if (specs.name) {
    try {
      const newProduct = await createProductInDb(pool, specs);
      return res.json({ success: true, action_executed: 'createProduct', ai_message: `✅ تخلیق شدہ: ${specs.name}` });
    } catch (err) { return res.status(500).json({ success: false, message: 'غلطی' }); }
  }

  return res.json({ success: true, ai_message: `براہ کرم صحیح آرڈر دیں (مثلاً: "سپلائر شامل کریں")۔` });
}

async function handleAnalyticalQuery(pool, sqlQuery) {
  const cleanQuery = sqlQuery.trim().toUpperCase();
  if (!cleanQuery.startsWith('SELECT') && !cleanQuery.startsWith('WITH')) {
    return '❌ رسائی مسترد: صرف SELECT سوالات کی اجازت ہے۔';
  }
  
  const result = await pool.query(sqlQuery);
  if (result.rows.length === 0) return 'کوئی ڈیٹا نہیں ملا۔';
  
  const headers = Object.keys(result.rows[0]);
  const mdHeader = '| ' + headers.join(' | ') + ' |\n| ' + headers.map(() => '---').join(' | ') + ' |';
  const mdRows = result.rows.map(row => {
    return '| ' + headers.map(h => {
      const val = row[h];
      return val !== null && val !== undefined ? String(val) : 'null';
    }).join(' | ') + ' |';
  }).join('\n');
  
  return `### 📊 رپورٹ\n\n${mdHeader}\n${mdRows}`;
}

function buildProductRecommendationMd(products) {
  if (!products || products.length === 0) {
    return 'معذرت، اس وقت کوئی مناسب مصنوع نہیں ملی۔ براہ کرم مختلف الفاظ سے تلاش کریں۔';
  }
  return `### 🛍️ آپ کے لیے تجویزدہ مصنوعات\n\n` + products.map((p, idx) => {
    const stockStatus = p.available_stock > 0 ? `اسٹاک میں موجود (${p.available_stock} عدد)` : `⚠️ اسٹاک ختم`;
    return `**${idx + 1}. ${p.product_name}**\n` +
      `- **برانڈ**: ${p.brand || 'N/A'} | **کیٹیگری**: ${p.category || 'عام'}\n` +
      `- **قیمت**: **Rs ${p.retail_price.toLocaleString()}**\n` +
      `- **دستیابی**: ${stockStatus}`;
  }).join('\n\n');
}

// Short spoken version of the same fallback -- names + count only, not the full bullet
// list with brand/category/stock lines for every item.
function buildProductRecommendationSpeech(products) {
  if (!products || products.length === 0) {
    return 'معذرت، اس وقت کوئی مناسب مصنوع نہیں ملی۔';
  }
  const names = products.slice(0, 3).map(p => p.product_name).join('، ');
  return `آپ کے لیے ${products.length} مصنوعات ملیں، جن میں ${names} شامل ہیں۔`;
}

// Latin characters fused directly against an Urdu LETTER -- "مicrosoft", "ہoon" -- are a
// reliable sign the model corrupted a word mid-token.
//
// The letter ranges deliberately EXCLUDE Arabic punctuation (U+060C comma, U+061B semicolon,
// U+061F question mark, U+06D4 full stop). Those legitimately sit right after a Latin word:
// "کوٹیشن کی حیثیت APPROVED۔" is correct Urdu, and an earlier version of this check rejected
// it -- silently replacing good admin replies with the generic fallback.
const URDU_LETTER = '\u0620-\u064A\u0660-\u066F\u0671-\u06D3\u06FA-\u06FF';
const FUSED_SCRIPT_RE = new RegExp(`[${URDU_LETTER}][A-Za-z]|[A-Za-z][${URDU_LETTER}]`);

// Guards against LLM output that leaks stray non-Urdu scripts into the reply -- a known
// failure mode of the local qwen model on this prompt. Urdu uses the Arabic script block
// (U+0600-U+06FF) plus Arabic Presentation Forms; anything from Cyrillic, the Indic scripts
// (Devanagari, Gurmukhi, Gujarati, Bengali, Tamil, Telugu, ...), Thai, CJK, or Hangul means
// the model wandered into a different script mid-reply.
function hasForeignScriptLeak(text) {
  return /[Ѐ-ӿऀ-෿฀-๿一-鿿぀-ヿ가-힯]/.test(text || '');
}

// ─── Natural-language date range parsing (today / yesterday / this-or-last week / month /
// year / a specific date) shared by both the buyer and distributor order/invoice/quotation
// listing routes below.
function getUrduDateRange(lowerMsg) {
  const now = new Date();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

  if (/\b(today|aaj|aj)\b/i.test(lowerMsg)) {
    return { start: startOfDay(now), end: endOfDay(now), label: 'آج' };
  }
  if (/\b(yesterday|kal|gzashta\s*kal)\b/i.test(lowerMsg)) {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { start: startOfDay(y), end: endOfDay(y), label: 'گزشتہ کل' };
  }
  // "tomorrow" is usually a mishearing of "today"/"yesterday", but honour it literally
  // rather than ignoring it -- an unmatched date word would otherwise silently fall through
  // and list *every* record, which reads as though the filter worked.
  if (/\btomorrow\b/i.test(lowerMsg)) {
    const t = new Date(now); t.setDate(t.getDate() + 1);
    return { start: startOfDay(t), end: endOfDay(t), label: 'آنے والا کل' };
  }
  if (/\blast\s*week\b/i.test(lowerMsg)) {
    const end = new Date(now); end.setDate(end.getDate() - 7);
    const start = new Date(end); start.setDate(start.getDate() - 7);
    return { start: startOfDay(start), end: endOfDay(end), label: 'پچھلا ہفتہ' };
  }
  if (/\b(this\s*)?week|hafte|hafta\b/i.test(lowerMsg)) {
    const start = new Date(now); start.setDate(start.getDate() - 7);
    return { start: startOfDay(start), end: endOfDay(now), label: 'اس ہفتے' };
  }
  if (/\blast\s*month\b/i.test(lowerMsg)) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end, label: 'پچھلے مہینے' };
  }
  if (/\b(this\s*)?month\b/i.test(lowerMsg)) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: endOfDay(now), label: 'اس مہینے' };
  }
  if (/\blast\s*year\b/i.test(lowerMsg)) {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { start, end, label: 'پچھلے سال' };
  }
  if (/\b(this\s*)?year\b/i.test(lowerMsg)) {
    const start = new Date(now.getFullYear(), 0, 1);
    return { start, end: endOfDay(now), label: 'اس سال' };
  }

  // Specific date: "2026-08-06", "06/08/2026" (assumed DD/MM/YYYY), "6 august" / "august 6"
  const isoMatch = lowerMsg.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const d = new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
    if (!isNaN(d)) return { start: startOfDay(d), end: endOfDay(d), label: d.toLocaleDateString('en-PK') };
  }
  const slashMatch = lowerMsg.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (slashMatch) {
    const d = new Date(+slashMatch[3], +slashMatch[2] - 1, +slashMatch[1]);
    if (!isNaN(d)) return { start: startOfDay(d), end: endOfDay(d), label: d.toLocaleDateString('en-PK') };
  }
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthPattern = MONTHS.join('|');
  const md1 = lowerMsg.match(new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})\\b`, 'i'));
  const md2 = lowerMsg.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthPattern})\\b`, 'i'));
  const md = md1 || md2;
  if (md) {
    const monthName = (md1 ? md[1] : md[2]).toLowerCase();
    const day = md1 ? md[2] : md[1];
    const monthIdx = MONTHS.indexOf(monthName);
    if (monthIdx >= 0) {
      const d = new Date(now.getFullYear(), monthIdx, +day);
      if (!isNaN(d)) return { start: startOfDay(d), end: endOfDay(d), label: d.toLocaleDateString('en-PK') };
    }
  }

  return null;
}

// Filters an already-fetched row array (order_date / created_at / due_date) down to a
// getUrduDateRange() result. Filtering in JS (rather than adding SQL params everywhere)
// keeps this usable uniformly across orders/quotations/invoices, whose date columns differ.
function filterRowsByDateRange(rows, range, dateFields = ['order_date', 'created_at']) {
  if (!range) return rows;
  return (rows || []).filter(r => {
    for (const f of dateFields) {
      if (r[f]) {
        const d = new Date(r[f]);
        if (!isNaN(d) && d >= range.start && d <= range.end) return true;
      }
    }
    return false;
  });
}

// Product cards must reflect exactly what the model actually recommended in its reply --
// not just "whatever the search happened to return." Search similarity is intentionally
// loose (so related items aren't missed), which means a query like "suggest a console"
// can legitimately match a gaming chair or headset too; showing all of them as cards next
// to a reply that only discusses two consoles is the bug.
//
// A machine-readable "[SKUS: ...]" tag the model appends to its reply was tried first, but
// proved unreliable with this model: it's frequently omitted, and when the model gets the
// format wrong (wrong brackets, invented SKUs) the malformed tag leaks straight into the
// visible reply instead of being stripped. stripRecommendationTag below stays as a
// defensive cleanup for either bracket style, but is no longer trusted as the filtering
// signal.
//
// What the model *does* reliably do is reproduce real English product names verbatim in
// its prose (names are explicitly kept in English per the prompt's language rule, even
// when the rest of the sentence is Urdu and occasionally garbled). So cards are filtered
// by checking which candidate products are actually named in the reply text.
function stripRecommendationTag(rawResponse) {
  return (rawResponse || '').replace(/\s*[\[(]SKUS?:\s*[^\])]*[\])]\s*$/i, '').trim();
}

function filterProductsByNameMention(products, text) {
  const lowerText = (text || '').toLowerCase();
  if (!lowerText) return [];
  return (products || []).filter(p => {
    const name = (p.product_name || '').toLowerCase().trim();
    return name && lowerText.includes(name);
  });
}

// ─── Urdu reply quality gate ─────────────────────────────────────────────────
// qwen2.5:14b cannot be trusted to write Urdu prose. Measured against the live model on
// this exact RAG prompt, at temperature 0 / top_k 1 (i.e. fully deterministic, no sampling
// randomness to blame), it still:
//   - phonetically transliterates English product names into nonsense Urdu
//     ("Microsoft Xbox" -> "میکسوس کسین", "PlayStation" -> "پلاٹ فارم"/"platform"),
//     which both reads as gibberish AND breaks card matching, since that relies on the
//     model reproducing real product names verbatim;
//   - occasionally answers entirely in English instead of Urdu;
//   - and in the worst observed case collapsed mid-sentence into a long Chinese digression
//     on non-linear regression -- from a "suggest a gaming console" prompt.
// Adding the explicit "never transliterate product names" rule to the prompt fixed the
// name-preservation problem (verified: exact names present in every reply afterwards), but
// nothing fixed the prose. Hence this gate: anything that doesn't look like clean Urdu is
// discarded in favour of buildUrduProductReply below.
//
// Industry/technical vocabulary that has no natural Urdu equivalent and reads better left
// in English -- forcing these through a phonetic Urdu spelling is exactly the "translate
// everything" behaviour that made replies unreadable. Keeping them in English is correct,
// so they must not count as a language leak when the gate below looks for stray Latin.
const TECHNICAL_ENGLISH_TERMS = new RegExp(
  '\\b(' + [
    'SKU', 'MOQ', 'PKR', 'B2B', 'B2C', 'ID', 'NTN', 'GST', 'PO', 'INV', 'ORD', 'QT',
    'console', 'gaming', 'wireless', 'keyboard', 'mouse', 'headset', 'headphone', 'chair',
    'monitor', 'laptop', 'desktop', 'controller', 'edition', 'series', 'pro', 'slim',
    'disc', 'bluetooth', 'USB', 'HDMI', 'RGB', 'TB', 'GB', 'MB', 'Hz', 'inch',
    'stock', 'order', 'orders', 'invoice', 'invoices', 'quotation', 'quotations',
    'status', 'pending', 'shipped', 'delivered', 'cancelled', 'rejected', 'approved',
    'paid', 'unpaid', 'overdue', 'discount', 'warranty', 'brand', 'model', 'category',
    'wholesale', 'retail', 'delivery', 'shipping', 'payment', 'credit', 'ledger',
  ].join('|') + ')\\b',
  'gi'
);

// Accepts only replies that are (a) genuinely Urdu-script dominant, (b) free of other
// scripts, and (c) free of stray Latin words beyond the product/brand names we handed in
// and the technical vocabulary above.
function isCleanUrduReply(text, allowedNames = []) {
  if (!text || text.trim().length < 3) return false;

  // Any CJK / Devanagari / Cyrillic / Thai / Hangul at all means the model wandered off.
  if (hasForeignScriptLeak(text)) return false;

  // Latin glued directly onto an Urdu letter ("ہoon", "مicrosoft") = corrupted word.
  if (FUSED_SCRIPT_RE.test(text)) return false;

  let stripped = text;
  allowedNames.filter(Boolean).forEach(n => {
    stripped = stripped.split(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join(' ');
  });
  stripped = stripped
    .replace(/Rs\.?\s*[\d,]+/gi, ' ')
    .replace(TECHNICAL_ENGLISH_TERMS, ' ')
    .replace(/[\d,.\-_/()%]+/g, ' ');

  // Any leftover Latin run of 2+ letters is prose the model wrote in the wrong language.
  if ((stripped.match(/[A-Za-z]{2,}/g) || []).length > 0) return false;

  // Must actually contain Urdu -- guards against a reply that is only a product name.
  const urduChars = (text.match(/[؀-ۿ]/g) || []).length;
  return urduChars >= 8;
}

// Small talk / clearly non-commerce input (often a mistranscription -- "May God bless you
// all", "I have lost my voice") used to fall through to product search, which always returns
// *something*, so the model was handed unrelated products and asked to be helpful about
// them. It responded with religious/philosophical rambling and a random product carousel.
// Detecting this up front and answering with a fixed, polite Urdu redirect is both correct
// and instant.
const OFF_TOPIC_PATTERNS = [
  /\b(god|allah|bless|pray|dua|ameen|amen)\b/i,
  /\b(how are you|kaise ho|kya haal|what'?s up)\b/i,
  /\b(thank you|thanks|shukriya|jazak)\b/i,
  /\b(joke|weather|news|song|movie|poem|story)\b/i,
  /\b(lost my voice|test testing|hello world)\b/i,
  /\b(who are you|what can you do|your name)\b/i,
];

function isOffTopicSmallTalk(message) {
  const msg = message || '';
  // Only treat it as off-topic when nothing commerce-related is present, so "thanks, now
  // show my orders" still routes to orders.
  const commerceHint = /\b(order|invoice|quot|negotiat|product|price|stock|rate|catalog|buy|purchase|payment|credit|ledger|moq|discount|deliver|ship)/i;
  if (commerceHint.test(msg)) return false;
  return OFF_TOPIC_PATTERNS.some(re => re.test(msg));
}

function offTopicReply(role) {
  return role === 'DISTRIBUTOR'
    ? 'میں آپ کا B2B ڈسٹری بیوٹر اسسٹنٹ ہوں۔ میں تھوک قیمتیں، اسٹاک، کوٹیشنز، آرڈرز اور انوائسز کے بارے میں مدد کر سکتا ہوں۔ آپ کیا جاننا چاہیں گے؟'
    : 'میں آپ کا شاپنگ اسسٹنٹ ہوں۔ میں مصنوعات تلاش کرنے، قیمتیں بتانے اور آپ کے آرڈرز دیکھنے میں مدد کر سکتا ہوں۔ آپ کیا جاننا چاہیں گے؟';
}

// Vector search is intentionally loose so related items aren't missed, which means a query
// for "a gaming console" legitimately also returns a gaming keyboard/mouse. When the buyer
// named a specific kind of product, narrow to matching categories so the reply (and the
// cards built from it) answer what was actually asked instead of the whole gaming aisle.
// Falls back to the unfiltered ranking whenever the query doesn't clearly name a type.
const PRODUCT_TYPE_HINTS = [
  { re: /\bconsole|playstation|ps5|xbox\b/i,             matches: /console/i },
  { re: /\bheadset|headphone|earphone|headset\b/i,       matches: /headset|headphone|audio/i },
  { re: /\bkeyboard\b/i,                                 matches: /keyboard/i },
  { re: /\bmouse|mice\b/i,                               matches: /mouse|mice/i },
  { re: /\bchair|furniture\b/i,                          matches: /chair|furniture/i },
  { re: /\bmonitor|display|screen\b/i,                   matches: /monitor|display/i },
  { re: /\blaptop|notebook\b/i,                          matches: /laptop|notebook/i },
];

function narrowProductsToQueryType(products, message) {
  if (!products || products.length === 0) return products || [];
  const hint = PRODUCT_TYPE_HINTS.find(h => h.re.test(message || ''));
  if (!hint) return products;
  const narrowed = products.filter(p =>
    hint.matches.test(p.category || '') || hint.matches.test(p.product_name || '')
  );
  return narrowed.length > 0 ? narrowed : products;
}

// Guardrail for the admin agent's free-form replies.
//
// Deliberately more permissive than isCleanUrduReply: admin answers legitimately quote
// English product names, supplier names and order IDs, so the "no stray Latin words" rule
// used for buyer/distributor product replies would reject perfectly good output here.
// This only catches the unambiguous corruption seen in practice -- the model sliding into
// Chinese mid-sentence, or emitting Latin letters fused onto Urdu words.
function isGarbledReply(text) {
  if (!text || !text.trim()) return true;
  if (hasForeignScriptLeak(text)) return true;              // CJK / Devanagari / Cyrillic / ...
  if (FUSED_SCRIPT_RE.test(text)) return true;  // "مicrosoft", "ہoon"
  return false;
}

const ADMIN_GARBLED_FALLBACK =
  'معذرت، میں آپ کی بات ٹھیک سے سمجھ نہیں سکا۔ براہ کرم دوبارہ واضح الفاظ میں پوچھیں — مثلاً "کم اسٹاک والی مصنوعات دکھائیں"، "غیر ادا شدہ انوائسز دکھائیں"، یا "آج کے آرڈرز دکھائیں"۔';

/** Returns model text when usable, otherwise a deterministic Urdu prompt for a retry. */
function guardAdminReply(text) {
  return isGarbledReply(text) ? ADMIN_GARBLED_FALLBACK : text;
}

// Deterministic, always-correct Urdu reply for product results -- the same approach the
// orders/invoices/quotations paths already use, which is why those never garble. Product
// names stay in English exactly as stored, so card matching downstream is exact by
// construction rather than dependent on model behaviour.
function buildUrduProductReply(products, { wholesale = false } = {}) {
  const list = (products || []).slice(0, 3);
  if (list.length === 0) {
    return 'معذرت، آپ کی بات واضح نہیں ہوئی۔ براہ کرم بتائیں آپ کون سی مصنوع تلاش کر رہے ہیں؟';
  }

  const priceOf = (p) => Number(wholesale ? (p.wholesale_price ?? p.retail_price) : p.retail_price) || 0;
  const money = (p) => `Rs ${priceOf(p).toLocaleString()}`;

  if (list.length === 1) {
    const p = list[0];
    return `آپ کے لیے ${p.product_name} دستیاب ہے، قیمت ${money(p)}۔`;
  }

  const named = list.map(p => `${p.product_name} (${money(p)})`);
  const lead = named.slice(0, -1).join('، ');
  const last = named[named.length - 1];
  return `آپ کے لیے ${lead} اور ${last} دستیاب ہیں۔ کسی ایک کے بارے میں مزید تفصیل چاہیے تو بتائیں۔`;
}

function getRelevantCards(ragProducts, llmText, maxCards = 6, userMessage = '') {
  if (!ragProducts || ragProducts.length === 0) return [];
  const lower = (llmText || '').toLowerCase();
  const lowerMsg = (userMessage || '').toLowerCase();

  const scored = ragProducts.map(p => {
    let score = 0;
    const productNameLower = (p.product_name || '').toLowerCase();
    if (productNameLower && lower.includes(productNameLower)) score += 5;
    if (productNameLower && lowerMsg.includes(productNameLower)) score += 2;
    if (score === 1) score = 0;
    return { ...p, _score: score };
  });

  return scored.filter(p => p._score >= 3).sort((a, b) => b._score - a._score).slice(0, maxCards);
}

// ─── ADMIN deterministic query routing ───────────────────────────────────────
// Every branch returns the raw rows alongside the rendered table, so the admin chat widget
// can attach inline action buttons (approve / reject / ship / counter-offer) to what it
// just showed, instead of the admin having to leave chat and hunt for the record.

function adminOrderTypeFilter(msg) {
  // "buyer orders" -> retail (B2C), "distributor/partner orders" -> wholesale (B2B).
  if (/\b(distributor|wholesale|partner|b2b)\b/i.test(msg)) return { type: 'B2B', label: 'ڈسٹری بیوٹر' };
  if (/\b(buyer|retail|customer|b2c)\b/i.test(msg)) return { type: 'B2C', label: 'خریدار' };
  return { type: null, label: null };
}

function formatAdminOrdersTable(rows, title) {
  if (!rows || rows.length === 0) return `ℹ️ کوئی آرڈر نہیں ملا۔`;
  return `### ${title} — ${rows.length}\n\n| آرڈر # | حیثیت | قسم | رقم (PKR) | کسٹمر | تاریخ |\n|---|---|---|---|---|---|\n` +
    rows.map(r => `| ${r.order_number || r.order_id} | ${r.status} | ${r.order_type || '-'} | Rs ${Number(r.total_amount || 0).toLocaleString()} | ${r.customer_email || r.customer_name || '-'} | ${formatTableDate(r.order_date || r.created_at)} |`).join('\n');
}

function formatAdminInvoicesTable(rows, title) {
  if (!rows || rows.length === 0) return `ℹ️ کوئی انوائس نہیں ملی۔`;
  return `### ${title} — ${rows.length}\n\n| انوائس نمبر | کسٹمر | کل رقم | باقی رقم | حیثیت | آخری تاریخ |\n|---|---|---|---|---|---|\n` +
    rows.map(r => {
      const total = Number(r.total_amount || 0);
      const remaining = Math.max(0, total - Number(r.amount_paid || 0));
      return `| ${r.invoice_number} | ${r.distributor_name || r.customer_email || '-'} | Rs ${total.toLocaleString()} | Rs ${remaining.toLocaleString()} | ${r.status} | ${formatTableDate(r.due_date)} |`;
    }).join('\n');
}

// Products keep their price tiers in a `prices` JSON column ({RETAIL, DISTRIBUTOR, VIP,
// CUSTOM}) rather than a flat retail_price column, so read through that -- falling back to
// the flat columns used by the buyer/distributor search projections.
function productPriceOf(product, tier = 'RETAIL') {
  let prices = product.prices;
  try { if (typeof prices === 'string') prices = JSON.parse(prices); } catch { prices = null; }
  if (prices && typeof prices === 'object') {
    const v = prices[tier] ?? prices.RETAIL ?? prices.DISTRIBUTOR;
    if (v != null) return Number(v);
  }
  return Number(product.retail_price ?? product.wholesale_price ?? product.price ?? 0);
}

function formatAdminProductsTable(rows, title) {
  if (!rows || rows.length === 0) return `ℹ️ کوئی مصنوع نہیں ملی۔`;
  return `### ${title} — ${rows.length}\n\n| مصنوع | SKU | برانڈ | کیٹیگری | اسٹاک | ریٹیل (PKR) | ڈسٹری بیوٹر (PKR) |\n|---|---|---|---|---|---|---|\n` +
    rows.map(r => {
      const stock = r.total_stock ?? r.available_stock ?? r.quantity ?? 0;
      return `| ${r.product_name} | ${r.sku || '-'} | ${r.brand || '-'} | ${r.category || '-'} | ${stock} | Rs ${productPriceOf(r, 'RETAIL').toLocaleString()} | Rs ${productPriceOf(r, 'DISTRIBUTOR').toLocaleString()} |`;
    }).join('\n');
}

function formatPartnersTable(rows, title) {
  if (!rows || rows.length === 0) return `ℹ️ کوئی اکاؤنٹ نہیں ملا۔`;
  return `### ${title} — ${rows.length}\n\n| نام | ای میل | کردار | شہر | ملک | حیثیت |\n|---|---|---|---|---|---|\n` +
    rows.map(r => {
      const name = r.business_name || r.buyer_store_name || r.contact_name || r.buyer_contact_name || '-';
      const city = r.city || r.warehouse_region || r.buyer_region || '-';
      return `| ${name} | ${r.email} | ${r.role} | ${city} | ${r.country || '-'} | ${r.status || '-'} |`;
    }).join('\n');
}

// Sums stock across every warehouse. The inventory JSON holds one entry per warehouse, so
// reading only the first (as some older call sites did) under-reports multi-warehouse items.
function totalStockOf(product) {
  let inv = product.inventory;
  try { if (typeof inv === 'string') inv = JSON.parse(inv); } catch { inv = null; }
  if (Array.isArray(inv)) {
    return inv.reduce((s, w) => s + Number(w.available_quantity ?? w.quantity ?? 0), 0);
  }
  return Number(product.quantity ?? 0);
}

async function routeAdminQuery(pool, message) {
  const msg = message || '';
  const lower = msg.toLowerCase();
  const dateRange = getUrduDateRange(lower);
  const dateSuffix = dateRange ? ` — ${dateRange.label}` : '';

  // 1) Low stock -----------------------------------------------------------
  if (/\b(low stock|low-stock|understock|out of stock|stock ?out|reorder|running out|kam stock)\b/i.test(lower)) {
    const rows = await getLowStockProductsFromDb(pool);
    const speech = rows.length
      ? `${rows.length} مصنوعات کا اسٹاک کم ہے۔`
      : 'کسی بھی مصنوع کا اسٹاک کم نہیں ہے۔';
    return {
      action_executed: 'getLowStockProducts',
      ai_message: formatAdminProductsTable(rows, '⚠️ کم اسٹاک والی مصنوعات'),
      speech_text: speech,
      products: rows,
    };
  }

  // 2) Invoices ------------------------------------------------------------
  if (/\b(invoice|invoices|billing|receivable)\b/i.test(lower)) {
    let statusFilter = null;
    if (/\b(unpaid|outstanding|pending|due|not paid)\b/i.test(lower)) statusFilter = 'unpaid';
    else if (/\boverdue|late\b/i.test(lower)) statusFilter = 'overdue';
    else if (/\bpaid|settled|cleared\b/i.test(lower)) statusFilter = 'paid';

    // "unpaid invoices of Zain" / "Asim ki invoices"
    const nameMatch = msg.match(/\b(?:of|for|from|ki|ke)\s+([A-Za-z][\w.@'-]{2,})/i);
    const customer = nameMatch ? nameMatch[1] : null;

    let rows = await getAdminInvoicesFromDb(pool, statusFilter, customer);
    if (dateRange) rows = filterRowsByDateRange(rows, dateRange, ['due_date', 'issue_date']);

    const title = (statusFilter === 'unpaid' ? '💳 غیر ادا شدہ انوائسز'
      : statusFilter === 'overdue' ? '⚠️ زائد المیعاد انوائسز'
      : statusFilter === 'paid' ? '✅ ادا شدہ انوائسز'
      : '📄 تمام انوائسز') + (customer ? ` — ${customer}` : '') + dateSuffix;

    const outstanding = rows.reduce((s, r) => s + Math.max(0, Number(r.total_amount || 0) - Number(r.amount_paid || 0)), 0);
    const speech = rows.length
      ? `${rows.length} انوائسز ملیں، باقی رقم ${Math.round(outstanding).toLocaleString()} روپے۔`
      : 'کوئی انوائس نہیں ملی۔';
    return { action_executed: 'getAdminInvoices', ai_message: formatAdminInvoicesTable(rows, title), speech_text: speech, invoices: rows };
  }

  // 3) Quotations ----------------------------------------------------------
  if (/\b(quotation|quotations|quote|quotes|negotiat|counter[- ]?offer)\b/i.test(lower)) {
    let rows, title;
    if (/\breject|declin/i.test(lower)) {
      rows = await getQuotationsByStatusFromDb(pool, 'REJECTED');
      title = '❌ مسترد شدہ کوٹیشنز';
    } else if (/\bapprov|accept|confirm|won/i.test(lower)) {
      rows = await getQuotationsByStatusFromDb(pool, 'APPROVED');
      title = '✅ منظور شدہ کوٹیشنز';
    } else if (/\bpending|awaiting|negotiat|review/i.test(lower)) {
      rows = await getQuotationsByStatusFromDb(pool, 'PENDING');
      title = '📋 زیر التواء کوٹیشنز';
    } else {
      rows = await getAllQuotationsFromDb(pool);
      title = '📋 تمام کوٹیشنز';
    }
    if (dateRange) rows = filterRowsByDateRange(rows, dateRange, ['created_at', 'valid_until']);
    const speech = rows.length ? `${rows.length} کوٹیشنز ملیں۔` : 'کوئی کوٹیشن نہیں ملی۔';
    return {
      action_executed: 'getAdminQuotations',
      ai_message: formatQuotationsTable(rows, title + dateSuffix),
      speech_text: speech,
      quotations: rows,
    };
  }

  // 4) Distributor / buyer accounts, optionally by city or country ----------
  if (/\b(distributors?|buyers?|partners?|accounts?|vendors?)\b/i.test(lower) && !/\border|invoice|quotation/i.test(lower)) {
    const role = /\bdistributors?\b/i.test(lower) ? 'distributor'
      : /\bbuyers?\b/i.test(lower) ? 'buyer' : null;
    // "distributors in Karachi" / "distributors from USA"
    const locMatch = msg.match(/\b(?:in|from|at|of)\s+([A-Za-z][A-Za-z\s]{2,25}?)(?:\s*[?.,]|$)/i);
    const loc = locMatch ? locMatch[1].trim() : null;
    const status = /\bpending|approval\b/i.test(lower) ? 'PENDING_APPROVAL'
      : /\bactive\b/i.test(lower) ? 'ACTIVE'
      : /\breject/i.test(lower) ? 'REJECTED' : null;

    let rows = await getPartnerAccountsFromDb(pool, { role, city: loc, status });
    // A location word can be either a city or a country -- retry as country before giving up.
    if (rows.length === 0 && loc) {
      rows = await getPartnerAccountsFromDb(pool, { role, country: loc, status });
    }
    const label = role === 'distributor' ? 'ڈسٹری بیوٹرز' : role === 'buyer' ? 'خریدار' : 'پارٹنر اکاؤنٹس';
    const title = `🏢 ${label}${loc ? ` — ${loc}` : ''}`;
    const speech = rows.length ? `${rows.length} ${label} ملے۔` : `کوئی ${label} نہیں ملے۔`;
    return { action_executed: 'getPartnerAccounts', ai_message: formatPartnersTable(rows, title), speech_text: speech, partners: rows };
  }

  // 5) Orders --------------------------------------------------------------
  if (/\border|orders\b/i.test(lower)) {
    const { type: orderType, label: typeLabel } = adminOrderTypeFilter(lower);

    const STATUS_MAP = {
      SHIPPED:    /\bshipped|shipping|dispatch/i,
      PENDING:    /\bpending|awaiting|new\b/i,
      APPROVED:   /\bapproved\b/i,
      CONFIRMED:  /\bconfirmed\b/i,
      PROCESSING: /\bprocessing\b/i,
      DELIVERED:  /\bdelivered|completed\b/i,
      REJECTED:   /\brejected|declined\b/i,
      CANCELLED:  /\bcancell?ed\b/i,
      RETURNED:   /\breturned\b/i,
    };
    let matchedStatus = null;
    for (const [s, re] of Object.entries(STATUS_MAP)) {
      if (re.test(lower)) { matchedStatus = s; break; }
    }

    let rows = matchedStatus
      ? await getOrdersByStatusFromDb(pool, matchedStatus, orderType)
      : await listOrdersFromDb(pool, 40, orderType);
    if (dateRange) rows = filterRowsByDateRange(rows, dateRange, ['order_date', 'created_at']);

    const title = `📦 ${matchedStatus ? matchedStatus + ' ' : ''}${typeLabel ? typeLabel + ' ' : ''}آرڈرز${dateSuffix}`;
    const total = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const speech = rows.length
      ? `${rows.length} آرڈرز ملے، کل رقم ${Math.round(total).toLocaleString()} روپے۔`
      : 'کوئی آرڈر نہیں ملا۔';
    return { action_executed: 'getAdminOrders', ai_message: formatAdminOrdersTable(rows, title), speech_text: speech, orders: rows };
  }

  // 6) Specific product lookup (stock / quantity / price of a named product) -
  if (/\b(stock|quantity|qty|how many|price|rate|available)\b/i.test(lower)) {
    // Strip the question scaffolding to leave just the product name.
    const cleaned = msg
      .replace(/\b(show|me|what|whats|what's|is|the|of|for|how|many|much|check|tell|give|please|current|available|in|do|we|have|there|any)\b/gi, ' ')
      .replace(/\b(stock|quantity|qty|price|rate)\b/gi, ' ')
      .replace(/[?.,!]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (cleaned.length >= 3) {
      const rows = await searchProductsInDb(pool, cleaned);
      if (rows.length > 0) {
        const withStock = rows.map(r => ({ ...r, total_stock: totalStockOf(r) }));
        const top = withStock[0];
        const speech = withStock.length === 1
          ? `${top.product_name} کا اسٹاک ${top.total_stock} ہے، ریٹیل قیمت ${productPriceOf(top, 'RETAIL').toLocaleString()} روپے۔`
          : `${withStock.length} مصنوعات ملیں۔`;
        return {
          action_executed: 'searchProducts',
          ai_message: formatAdminProductsTable(withStock, `🔎 "${cleaned}" کے نتائج`),
          speech_text: speech,
          products: withStock,
        };
      }
    }
  }

  return null; // Not an admin query we handle deterministically -- fall through to the LLM.
}

function registerCopilotRoutes(app, pool) {
  const handleChat = async (req, res, defaultRole) => {
    const { message, history, attached_image, portal_role, user_name } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'پیغام درکار ہے۔' });
    }

    const role = (portal_role || defaultRole).toUpperCase();
    const displayName = user_name || 'صارف';

    // ── Access control for the assistants that expose account or company-wide data ──
    // `portal_role` is client-supplied, so it selects which assistant to talk to but grants
    // nothing. Entitlement is checked against the verified session token here.
    //
    // Without this, two anonymous requests were enough to dump the business: asking the
    // ADMIN assistant returned every order and invoice on the platform, and asking the
    // DISTRIBUTOR assistant with no session left the account filter empty -- which the
    // queries read as "no filter", returning every distributor's invoices at once.
    if (role === 'ADMIN' && String(req.auth?.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({
        success: true,
        ai_message: '⛔ یہ معلومات صرف ایڈمن کے لیے ہیں۔ براہ کرم ایڈمن اکاؤنٹ سے سائن اِن کریں۔',
        speech_text: 'یہ معلومات صرف ایڈمن کے لیے ہیں۔',
      });
    }
    if (role === 'DISTRIBUTOR' && !req.auth?.email) {
      return res.status(401).json({
        success: true,
        ai_message: 'براہ کرم اپنے ڈسٹری بیوٹر اکاؤنٹ سے سائن اِن کریں تاکہ میں آپ کے آرڈرز، کوٹیشنز اور انوائسز دکھا سکوں۔',
        speech_text: 'براہ کرم پہلے سائن اِن کریں۔',
      });
    }

    const SENSITIVE_KEYWORDS = ['password', 'env', 'secret', 'token', 'key'];
    const isSensitive = SENSITIVE_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(message));
    if (isSensitive) {
      return res.json({ success: true, ai_message: `❌ سیکیورٹی بلاک: حساس معلومات تک رسائی ممنوع ہے۔` });
    }

    if (role === 'DISTRIBUTOR') {
      const isAdminModification = /\b(delete|remove product|create product)\b/i.test(message);
      if (isAdminModification) {
        return res.json({ success: true, ai_message: `❌ آپ کو یہ تبدیلی کرنے کا اختیار نہیں ہے۔` });
      }
    }

    const isGreeting = /^(hello|hi|hey|greetings|good morning)\b/i.test(message);
    if (isGreeting) {
      return res.json({ success: true, ai_message: `السلام علیکم ${displayName}! میں آپ کی کیا مدد کر سکتا ہوں؟` });
    }

    if (role === 'DISTRIBUTOR') {
      try {
        // Identity comes from the verified session token, never from the request body.
        // Trusting body.user_email let an anonymous caller read any distributor's orders,
        // quotations and invoices simply by naming their email address.
        const userEmail = req.auth?.email || null;
        const lowerMsg = message.toLowerCase();

        if (!attached_image && isOffTopicSmallTalk(message)) {
          const reply = offTopicReply('DISTRIBUTOR');
          return res.json({ success: true, ai_message: reply, speech_text: reply });
        }

        // ── Fast, deterministic intent routing ──────────────────────────────────────
        // Mirrors the buyer copilot's approach: each category below is answered directly
        // from the DB, scoped to this distributor's own email everywhere the underlying
        // query supports it -- store.js's "/api/orders", "/api/quotations", "/api/invoices"
        // fetches are scoped the same way now, so the chatbot's answers always match what
        // this specific partner account can see on screen, and never surface another
        // distributor's orders, quotations, or invoices.

        // 1) Track a specific order by number
        const orderNumMatch = !attached_image && message.match(/\bORD[-_][\w-]+/i);
        if (orderNumMatch) {
          const trackResult = await trackBuyerOrder(pool, { order_id_query: orderNumMatch[0], customer_email: userEmail });
          return res.json({ success: true, action_executed: 'trackBuyerOrder', ai_message: trackResult.ai_message, speech_text: trackResult.speech_text, orders: trackResult.orders });
        }

        const ORDER_STATUS_PATTERNS = {
          PENDING:    /\bpending|awaiting\b/i,
          PROCESSING: /\bprocessing\b/i,
          CONFIRMED:  /\bconfirmed\b/i,
          SHIPPED:    /\bshipped|shipping|dispatch(ed)?\b/i,
          DELIVERED:  /\bdelivered\b/i,
          CANCELLED:  /\bcancell?ed\b/i,
          REJECTED:   /\brejected|declined\b/i,
          RETURNED:   /\breturned\b/i,
        };
        const extractOrderStatus = (msg) => {
          for (const [status, re] of Object.entries(ORDER_STATUS_PATTERNS)) {
            if (re.test(msg)) return status;
          }
          return null;
        };

        // 2) Invoices -- unpaid / paid / overdue / all
        if (!attached_image && /\b(invoice|invoices|bill|billing|receipt)\b/i.test(lowerMsg)) {
          let statusFilter = null;
          if (/\b(unpaid|outstanding|due|pending)\b/i.test(lowerMsg)) statusFilter = 'unpaid';
          else if (/\boverdue|late\b/i.test(lowerMsg)) statusFilter = 'overdue';
          else if (/\bpaid\b/i.test(lowerMsg)) statusFilter = 'paid';

          let rows = await getDistributorInvoicesFromDb(pool, userEmail, statusFilter);
          const dateRange = getUrduDateRange(lowerMsg);
          if (dateRange) rows = filterRowsByDateRange(rows, dateRange, ['due_date', 'created_at', 'invoice_date']);
          let title = statusFilter === 'unpaid' ? '💳 غیر ادا شدہ انوائسز'
            : statusFilter === 'overdue' ? '⚠️ زائد المیعاد انوائسز'
            : statusFilter === 'paid' ? '✅ ادا شدہ انوائسز'
            : '📄 آپ کی تمام انوائسز';
          if (dateRange) title += ` — ${dateRange.label}`;
          return res.json({ success: true, action_executed: 'getDistributorInvoices', ai_message: formatInvoicesTable(rows, title), speech_text: speechForInvoices(rows, title) });
        }

        // 3) Quotations / negotiations -- active / negotiating / confirmed / rejected /
        //    expiring / all. Each branch queries a lifecycle GROUP of statuses rather than
        //    one literal value (see QUOTATION_STATUS_GROUPS) -- matching a single status
        //    silently missed equivalents written by other code paths.
        if (!attached_image && /\b(quotation|quote|negotiat|bid|counter[- ]?offer)/i.test(lowerMsg)) {
          let rows, title, appliedFilter = null;
          if (/\bexpir/i.test(lowerMsg)) {
            rows = await getExpiringDistributorQuotationsFromDb(pool, 7, userEmail);
            title = '⏳ جلد ختم ہونے والی کوٹیشنز';
            appliedFilter = 'expiring';
          } else if (/\breject|declin|lost\b/i.test(lowerMsg)) {
            rows = await getDistributorQuotationsByStatusFromDb(pool, 'REJECTED', userEmail);
            title = '❌ مسترد شدہ کوٹیشنز';
            appliedFilter = 'rejected';
          } else if (/\baccept|approv|won|confirm/i.test(lowerMsg)) {
            rows = await getDistributorQuotationsByStatusFromDb(pool, 'CONFIRMED', userEmail);
            title = '✅ منظور شدہ کوٹیشنز';
            appliedFilter = 'confirmed';
          } else if (/\bnegotiat|counter[- ]?offer|bid\b/i.test(lowerMsg)) {
            // Checked before "active" so "negotiations" is its own view rather than being
            // swallowed by the broader active set.
            rows = await getDistributorQuotationsByStatusFromDb(pool, 'NEGOTIATING', userEmail);
            title = '🤝 زیر گفتگو کوٹیشنز (نیگوشی ایشنز)';
            appliedFilter = 'negotiating';
          } else if (/\bactive|pending|open|awaiting|live\b/i.test(lowerMsg)) {
            rows = await getDistributorQuotationsByStatusFromDb(pool, 'ACTIVE', userEmail);
            title = '📋 فعال کوٹیشنز';
            appliedFilter = 'active';
          } else {
            rows = await getDistributorQuotationsFromDb(pool, userEmail);
            title = '📋 آپ کی تمام کوٹیشنز';
          }
          const quoteDateRange = getUrduDateRange(lowerMsg);
          if (quoteDateRange) {
            rows = filterRowsByDateRange(rows, quoteDateRange, ['created_at', 'valid_until']);
            title += ` — ${quoteDateRange.label}`;
          }

          // An empty filtered result is ambiguous on its own -- "no quotations found" reads
          // the same whether the filter excluded everything or the account has none at all.
          // Report which is the case, and what statuses do exist, so the answer is actionable.
          if (rows.length === 0 && appliedFilter) {
            const counts = await getDistributorQuotationStatusCounts(pool, userEmail);
            const totalAll = counts.reduce((s, c) => s + c.count, 0);
            const msg = totalAll === 0
              ? 'آپ کے اکاؤنٹ میں ابھی کوئی کوٹیشن موجود نہیں ہے۔ نئی کوٹیشن بنانے کے لیے کیٹلاگ سے مصنوعات منتخب کریں۔'
              : `اس فلٹر میں کوئی کوٹیشن نہیں ملی۔ آپ کی کل ${totalAll} کوٹیشنز ہیں: ${counts.map(c => `${c.count} ${c.status}`).join('، ')}۔`;
            return res.json({ success: true, action_executed: 'manageDistributorQuotations', ai_message: msg, speech_text: msg });
          }

          return res.json({ success: true, action_executed: 'manageDistributorQuotations', ai_message: formatQuotationsTable(rows, title), speech_text: speechForQuotations(rows, title) });
        }

        // 4) Credit / ledger status
        if (!attached_image && /\bcredit|ledger|financial account\b/i.test(lowerMsg)) {
          const ledger = await getDistributorLedgerStatusFromDb(pool, userEmail);
          return res.json({ success: true, action_executed: 'getDistributorLedgerStatus', ai_message: formatLedgerMd(ledger), speech_text: speechForLedger(ledger) });
        }

        // 5) Generic order listing (no specific order number) -- all / by status / by date
        if (!attached_image && /\border(s)?\b/i.test(lowerMsg)) {
          const statusFilter = extractOrderStatus(lowerMsg);
          const dateRange = getUrduDateRange(lowerMsg);
          let rows = await getDistributorOrdersFromDb(pool, userEmail);
          if (statusFilter) rows = rows.filter(r => (r.status || '').toUpperCase() === statusFilter);
          if (dateRange) rows = filterRowsByDateRange(rows, dateRange, ['order_date', 'created_at']);
          let title = statusFilter ? `📦 ${statusFilter} آرڈرز` : '📦 آپ کے تمام آرڈرز';
          if (dateRange) title += ` — ${dateRange.label}`;
          return res.json({ success: true, action_executed: 'getDistributorOrders', ai_message: formatOrdersTable(rows, title), speech_text: speechForOrders(rows, title), orders: rows });
        }

        // 6) Otherwise: open-ended wholesale product / catalog question -- RAG over real
        // catalog data via the LLM, with the same reliability hardening as the buyer copilot.
        const wholesaleProducts = await vectorSearchDistributorProducts(pool, message);
        const productContext = wholesaleProducts.slice(0, 15).map((p, i) =>
          `${i + 1}. "${p.product_name}" | برانڈ: ${p.brand || 'N/A'} | کیٹیگری: ${p.category || 'عام'} | تھوک قیمت: Rs ${Number(p.wholesale_price).toLocaleString()} | کم از کم آرڈر مقدار (MOQ): ${p.min_wholesale_qty} | زیادہ سے زیادہ رعایت: ${p.max_discount}% | اسٹاک: ${p.available_stock > 0 ? `دستیاب (${p.available_stock})` : 'اسٹاک ختم'}`
        ).join('\n');

        const distributorRagPrompt = [
          'آپ CIQ ڈسٹری بیوٹر کوپائلٹ ہیں — ایک ذہین B2B ھول سیل شراکت مشیر۔',
          '',
          '## زبان — صرف اردو رسم الخط:',
          'اپنا پورا جواب صرف سلیس اردو رسم الخط میں لکھیں۔ رومن اردو یا کوئی اور رسم الخط استعمال نہ کریں۔',
          'پروڈکٹ ناموں، SKU، اور قیمتوں (PKR) کو انگریزی حروف/اعداد میں رکھا جا سکتا ہے۔',
          '',
          '## قواعد:',
          '1. صرف نیچے دی گئی WHOLESALE DATA میں سے مصنوعات تجویز کریں — اپنے پاس سے قیمت یا اسٹاک نہ بنائیں۔',
          '2. اگر مصنوع ڈیٹا میں نہیں ہے تو کہیں: "یہ مصنوع ابھی ھول سیل کیٹلاگ میں دستیاب نہیں ہے۔"',
          '3. اگر خریدار کا سوال شاپنگ/ھول سیل کاروبار سے غیر متعلق ہو، تو شائستگی سے وضاحت کریں کہ آپ صرف B2B ڈسٹری بیوٹر اسسٹنٹ ہیں۔',
          '4. جواب زیادہ سے زیادہ 2 مختصر جملوں میں دیں — کوئی طویل پیراگراف، فہرست یا وضاحت نہ لکھیں۔ ایک انسان کی طرح سیدھا اور واضح جواب دیں۔',
          '5. صرف انہی مصنوعات کا ذکر کریں جو صارف کے سوال سے براہ راست متعلقہ ہوں — WHOLESALE DATA میں موجود ہر چیز کی فہرست نہ بنائیں۔',
          // Without this the model phonetically transliterates names into nonsense Urdu
          // ("Microsoft Xbox" -> "میکسوس کسین"), which reads as gibberish and breaks the
          // name-based product card matching. Verified to fix it against the live model.
          '5b. مصنوعات کے نام انگریزی حروف میں، بالکل ویسے ہی کاپی کریں جیسے WHOLESALE DATA میں لکھے ہیں۔ ناموں کا اردو ترجمہ یا اردو میں آوازی نقل (transliteration) ہرگز نہ کریں۔',
          '   مثال — درست: "Sony PlayStation 5 Slim Disc Edition دستیاب ہے۔"',
          '   مثال — غلط: "سونی پلے اسٹیشن دستیاب ہے۔"',
          '5c. اسی طرح وہ تکنیکی اصطلاحات جن کا کوئی مناسب اردو لفظ نہیں (مثلاً console، wireless، keyboard، headset، SKU، MOQ، warranty، stock) انہیں انگریزی میں ہی رہنے دیں — زبردستی اردو میں تبدیل نہ کریں۔',
          '6. اگر صارف کا سوال غیر واضح یا نامکمل ہو (جیسے کہ آواز صحیح طور پر سمجھ نہ آئی ہو)، تو مصنوعات کی فہرست دکھانے کے بجائے صرف ایک مختصر وضاحتی سوال پوچھیں، مثلاً: "معذرت، مجھے صاف سمجھ نہیں آیا — آپ کس پروڈکٹ یا موضوع کے بارے میں پوچھ رہے ہیں؟"',
          '',
          '## WHOLESALE DATA:',
          productContext || 'کوئی مناسب مصنوع نہیں ملی۔',
          '',
          '## سوال:',
          message.replace(/\b(system|assistant|ignore\s+instructions?|forget\s+your|you\s+are\s+now)\b/gi, '[filtered]').slice(0, 500),
        ].join('\n');

        const endpoint = await getOllamaChatEndpoint();
        if (endpoint) {
          const resOllama = await fetchOllamaChat(endpoint, {
            model: endpoint.modelName,
            messages: [{ role: 'system', content: distributorRagPrompt }, { role: 'user', content: message }],
            options: { temperature: 0.15, top_p: 0.9, num_predict: 130 }
          });
          if (resOllama.ok) {
            const data = await resOllama.json();
            const rawContent = data.choices?.[0]?.message?.content?.trim().replace(/[\t\r]+/g, ' ').replace(/ {2,}/g, ' ');
            const allowedNames = wholesaleProducts.map(p => p.product_name).concat(wholesaleProducts.map(p => p.brand));
            const cleanText = stripRecommendationTag(rawContent);
            // Use the model's phrasing only when it's genuinely clean Urdu; otherwise fall
            // back to the deterministic template. See isCleanUrduReply for what this model
            // actually does when left ungated.
            if (isCleanUrduReply(cleanText, allowedNames)) {
              const mentioned = filterProductsByNameMention(wholesaleProducts, cleanText);
              const cardProducts = mentioned.length > 0 ? mentioned : wholesaleProducts.slice(0, 2);
              // cleanText is already a short 1-2 sentence reply per the prompt rules above,
              // so it doubles as the spoken text directly -- no table/list to strip.
              return res.json({ success: true, action_executed: 'getDistributorWholesaleRecommendations', ai_message: cleanText, speech_text: cleanText, products: cardProducts });
            }
            if (rawContent) console.warn('[Distributor RAG] Model output rejected by Urdu quality gate; using deterministic reply.');
            const narrowed = narrowProductsToQueryType(wholesaleProducts, message).slice(0, 3);
            const fallbackText = buildUrduProductReply(narrowed, { wholesale: true });
            return res.json({
              success: true,
              action_executed: 'getDistributorWholesaleRecommendations',
              ai_message: fallbackText,
              speech_text: fallbackText,
              products: narrowed,
            });
          } else {
            console.error('[Distributor RAG] Ollama HTTP error:', resOllama.status, await resOllama.text());
          }
        }

        // Deterministic fallback (model unreachable or output was garbled). Kept short --
        // dumping the whole catalog here is what used to happen on every unrecognized/
        // mistranscribed query, which read out as an overwhelming wall of products.
        const wsMd = wholesaleProducts.length === 0
          ? 'معذرت، مجھے آپ کی بات سمجھ نہیں آئی۔ براہ کرم پروڈکٹ یا موضوع واضح طور پر بتائیں۔'
          : `معذرت، مجھے آپ کا سوال واضح طور پر سمجھ نہیں آیا۔ کیا آپ ان میں سے کسی مصنوع کے بارے میں پوچھ رہے ہیں؟\n\n` + wholesaleProducts.slice(0, 3).map((p, i) =>
              `**${i + 1}. ${p.product_name}** — Rs ${Number(p.wholesale_price).toLocaleString()}`
            ).join('\n');
        const wsSpeech = wholesaleProducts.length === 0
          ? 'معذرت، مجھے آپ کی بات سمجھ نہیں آئی۔ براہ کرم دوبارہ واضح طور پر بتائیں۔'
          : 'معذرت، مجھے سوال واضح طور پر سمجھ نہیں آیا۔ براہ کرم دوبارہ بتائیں۔';
        return res.json({ success: true, action_executed: 'getDistributorWholesaleRecommendations', ai_message: wsMd, speech_text: wsSpeech, products: wholesaleProducts.slice(0, 3) });
      } catch (err) {
        return res.json({ success: true, ai_message: `❌ غلطی: ${err.message}` });
      }
    }

    if (role === 'BUYER') {
      try {
        // Token identity only -- see the distributor branch. Without a session this stays
        // a guest conversation: product discovery works, personal order data does not.
        const userEmail = req.auth?.email || 'guest@commerceiq.com';
        const emailForOrders = userEmail !== 'guest@commerceiq.com' ? userEmail : null;

        if (!attached_image && isOffTopicSmallTalk(message)) {
          const reply = offTopicReply('BUYER');
          return res.json({ success: true, ai_message: reply, speech_text: reply });
        }

        // Fast deterministic routing for order tracking/listing — skips the LLM entirely so
        // these are instant, always correct (real DB data), and never derailed into product search.
        const orderNumMatch = !attached_image && message.match(/\bORD[-_][\w-]+/i);
        const mentionsOrder = /\border(s)?\b/i.test(message);
        if (!attached_image && (orderNumMatch || mentionsOrder)) {
          // A guest has no orders to show. This must return nothing rather than falling
          // through with a null customer filter -- the order queries read a null email as
          // "no filter", so an anonymous visitor asking for "my orders" was served every
          // order on the platform.
          if (!emailForOrders) {
            const msg = 'اپنے آرڈرز دیکھنے کے لیے براہ کرم سائن اِن کریں۔';
            return res.json({ success: true, ai_message: msg, speech_text: msg, orders: [] });
          }
          if (orderNumMatch) {
            const trackResult = await trackBuyerOrder(pool, { order_id_query: orderNumMatch[0], customer_email: emailForOrders });
            return res.json({ success: true, action_executed: 'trackBuyerOrder', ai_message: trackResult.ai_message, speech_text: trackResult.speech_text, orders: trackResult.orders });
          }

          const lowerMsg = message.toLowerCase();
          const STATUS_PATTERNS = {
            SHIPPED:    /\bshipped|shipping|bhej/i,
            DELIVERED:  /\bdelivered|pahonch|pohunch|pohonch/i,
            PROCESSING: /\bprocessing\b/i,
            CONFIRMED:  /\bconfirmed\b/i,
            CANCELLED:  /\bcancelled|cancel|mansookh/i,
            RETURNED:   /\breturned|\breturn\b|wapis/i,
            PENDING:    /\bpending|zair|zer/i,
          };
          let statusFilter = null;
          for (const [status, re] of Object.entries(STATUS_PATTERNS)) {
            if (re.test(lowerMsg)) { statusFilter = status; break; }
          }
          const dateRange = getUrduDateRange(lowerMsg);

          const listResult = await listBuyerOrdersByStatus(pool, {
            status_filter: statusFilter,
            customer_email: emailForOrders,
            date_start: dateRange?.start || null,
            date_end: dateRange?.end || null,
            date_label: dateRange?.label || null,
          });
          return res.json({ success: true, action_executed: 'listBuyerOrders', ai_message: listResult.ai_message, speech_text: listResult.speech_text, orders: listResult.orders });
        }

        // Fast deterministic routing for side-by-side product comparisons.
        if (!attached_image && /\bcompare|\bvs\b|versus|difference\s+between/i.test(message)) {
          const compareResult = await compareBuyerProductsInDb(pool, { message });
          return res.json({ success: true, action_executed: 'compareBuyerProducts', ai_message: compareResult.ai_message, products: compareResult.products });
        }

        let ragProducts = await getBuyerProductRecommendationsFromDb(pool, { query: message });
        if (!ragProducts || ragProducts.length === 0) {
          ragProducts = await getBuyerProductRecommendationsFromDb(pool, { query: '', sort_by: 'price_low' });
        }

        saveBuyerSession(userEmail, {
          lastProducts:  ragProducts,
          lastCategory:  null,
          lastMinPrice:  null,
          lastMaxPrice:  null,
          lastSortBy:    null,
          lastQuery:     message
        });

        // 4. Build RAG prompt — inject ONLY real DB products, no hallucination possible
        const productContext = ragProducts.slice(0, 15).map((p, i) => {
          const simNote = p.similarity ? ` [موازنہ: ${p.similarity}]` : '';
          return `${i + 1}. "${p.product_name}" | SKU: ${p.sku || 'N/A'} | برانڈ: ${p.brand || 'N/A'} | کیٹیگری: ${p.category || 'عام'} | قیمت: Rs ${p.retail_price.toLocaleString()} | اسٹاک: ${p.available_stock > 0 ? `دستیاب (${p.available_stock})` : 'اسٹاک ختم'} | ${p.short_description || ''}${simNote}`;
        }).join('\n');

        const conversationHistory = (history || [])
          .slice(-8)
          .map(m => `${m.sender === 'user' ? 'خریدار' : 'معاون'}: ${m.text || ''}`)
          .join('\n');

        // Fetch this buyer's own orders for RAG context (so LLM can answer order questions)
        let buyerOrderContext = '';
        try {
          const buyerEmailRag = req.auth?.email || null;
          if (buyerEmailRag) {
            const buyerOrdersRes = await listBuyerOrdersByStatus(pool, { customer_email: buyerEmailRag });
            if (buyerOrdersRes.orders && buyerOrdersRes.orders.length > 0) {
              buyerOrderContext = buyerOrdersRes.orders.slice(0, 10).map((o, i) =>
                `${i+1}. آرڈر #${o.order_number||o.order_id} | حیثيت: ${o.status||'PENDING'} | کل: Rs ${Number(o.total_amount||0).toLocaleString()}`
              ).join('\n');
            }
          }
        } catch (_) {}

        const ragSystemPrompt = [
          'آپ CIQ ذاتی شاپنگ اسسٹنٹ ہیں — ایک دوستانہ پاکستانی دکان کے AI نمائندے۔',
          '',
          '## اہم ترین زبان کا قانون — صرف اردو رسم الخط (URDU SCRIPT ONLY):',
          'اپنا پورا جواب صرف اور صرف سلیس اردو رسم الخط (اردو زبان) میں لکھیں۔',
          'ممنوع (FORBIDDEN): انگریزی جملے، رومن اردو، چینی حروف، ہندی رسم الخط (دیوناگری) — یہ سب سخت ممنوع ہیں۔',
          'پروڈکٹ کے نام، SKU، Order ID اور قیمت (PKR) انگریزی حروف/اعداد میں رکھے جا سکتے ہیں، لیکن تمام جملے اور تفصیلات 100% اردو رسم الخط میں ہونے چاہئیں۔',
          '',
          'صحیح اردو کی مثالیں:',
          '- یہ رہے آپ کے لیے بہترین مصنوعات:',
          '- اس بجٹ میں یہ آپشنز دستیاب ہیں:',
          '- یہ مصنوع ابھی ہمارے اسٹور میں دستیاب نہیں ہے۔',
          '',
          '## قواعد:',
          '1. صرف نیچے دی گئی PRODUCT DATA میں سے مصنوعات تجویز کریں۔',
          '2. اگر مصنوع ڈیٹا میں نہیں ہے تو کہیں: "یہ مصنوع ابھی ہمارے اسٹور میں دستیاب نہیں ہے۔"',
          '3. صرف ڈیٹا میں دی گئی قیمتیں بتائیں۔ اپنے پاس سے قیمت نہ بنائیں۔',
          '4. اگر خریدار کا پیغام شاپنگ، مصنوعات، یا آرڈرز سے غیر متعلق ہو (مثلاً کھیل، گپ شپ، یا کوئی اور موضوع)، تو شائستگی سے وضاحت کریں کہ آپ صرف شاپنگ اسسٹنٹ ہیں اور صرف مصنوعات تلاش کرنے یا آرڈرز دیکھنے میں مدد کر سکتے ہیں۔ جھوٹا یا من گھڑت جواب ہرگز نہ دیں۔',
          '5. صرف انہی مصنوعات کا ذکر کریں جو خریدار کے سوال سے براہ راست متعلقہ ہوں — PRODUCT DATA میں موجود ہر چیز کی فہرست نہ بنائیں۔',
          // See the matching rule in the distributor prompt: without this the model turns
          // "Microsoft Xbox" into "میکسوس کسین" and card matching stops working.
          '5b. مصنوعات کے نام انگریزی حروف میں، بالکل ویسے ہی کاپی کریں جیسے PRODUCT DATA میں لکھے ہیں۔ ناموں کا اردو ترجمہ یا اردو میں آوازی نقل (transliteration) ہرگز نہ کریں۔',
          '   مثال — درست: "Sony PlayStation 5 Slim Disc Edition دستیاب ہے۔"',
          '   مثال — غلط: "سونی پلے اسٹیشن دستیاب ہے۔"',
          '5c. اسی طرح وہ تکنیکی اصطلاحات جن کا کوئی مناسب اردو لفظ نہیں (مثلاً console، wireless، keyboard، headset، SKU، MOQ، warranty، stock) انہیں انگریزی میں ہی رہنے دیں — زبردستی اردو میں تبدیل نہ کریں۔',
          '6. جواب زیادہ سے زیادہ 2 مختصر جملوں میں دیں — طویل پیراگراف یا فہرست نہ لکھیں، ایک انسان کی طرح سیدھا جواب دیں۔',
          '7. اگر خریدار کا پیغام غیر واضح یا نامکمل لگے (جیسے آواز صحیح طور پر سمجھ نہ آئی ہو)، تو مصنوعات کی فہرست دکھانے کے بجائے صرف مختصر وضاحتی سوال پوچھیں۔',
          '',
          '## PRODUCT DATA (اسٹور کی تمام دستیاب مصنوعات):',
          productContext || 'کوئی مناسب مصنوع نہیں ملی۔',
          '',
          '## سابقہ گفتگو:',
          conversationHistory || 'کوئی سابقہ پیغام نہیں۔',
          '',
          buyerOrderContext ? ('## خریدار کے آرڈرز:\n' + buyerOrderContext + '\n') : '',
          '',
          '## خریدار کا پیغام:',
          message.replace(/\b(system|assistant|ignore\s+instructions?|forget\s+your|you\s+are\s+now)\b/gi, '[filtered]').slice(0, 500),
          '',
          'صرف اور صرف سلیس اردو رسم الخط میں جواب دیں۔ جواب مختصر (زیادہ سے زیادہ 2 جملے)، واضح اور دوستانہ ہو۔',
        ].join('\n');

        // 5. Call local Ollama model with the RAG prompt (Remote PC -> Local Mac fallback)
        try {
          const endpoint = await getOllamaChatEndpoint();
          if (endpoint) {
            const ollamaRagRes = await fetchOllamaChat(endpoint, {
              model: endpoint.modelName,
              messages: [
                { role: 'system', content: ragSystemPrompt },
                { role: 'user',   content: message.replace(/\b(system|assistant|ignore\s+instructions?|forget\s+your|you\s+are\s+now)\b/gi, '[filtered]').slice(0, 500) }
              ],
              options: { temperature: 0.15, top_p: 0.9, num_predict: 130 }
            });
              if (ollamaRagRes.ok) {
                const ollamaData = await ollamaRagRes.json();
                const ragText = ollamaData.choices?.[0]?.message?.content?.trim().replace(/[\t\r]+/g, ' ').replace(/ {2,}/g, ' ');
                if (ragText) {
                  // Output validation — same injection guard
                  const looksInjected = /ignore|system prompt|instructions|i am now|you are now/i.test(ragText);
                  if (looksInjected) {
                    console.warn('[Buyer RAG] Possible injection response detected, returning safe fallback.');
                    return res.json({
                      success: true,
                      action_executed: 'getBuyerProductRecommendations',
                      ai_message: 'معذرت، میں ابھی آپ کی درخواست پر عمل نہیں کر سکا۔ براہ کرم دوبارہ کوشش کریں۔',
                      speech_text: 'معذرت، میں ابھی آپ کی درخواست پر عمل نہیں کر سکا۔ براہ کرم دوبارہ کوشش کریں۔',
                      products: ragProducts.slice(0, 6)
                    });
                  }
                  const buyerAllowedNames = ragProducts.map(p => p.product_name).concat(ragProducts.map(p => p.brand));
                  // Cards must reflect exactly what the model recommended, not just the top
                  // of the search results -- otherwise a query about one product type (e.g.
                  // "suggest a console") can show unrelated cards (a chair, a headset, ...)
                  // that were in the search results but never mentioned in the reply.
                  const cleanText = stripRecommendationTag(ragText);
                  if (isCleanUrduReply(cleanText, buyerAllowedNames)) {
                    const mentioned = filterProductsByNameMention(ragProducts, cleanText);
                    const cardProducts = mentioned.length > 0 ? mentioned : ragProducts.slice(0, 2);
                    return res.json({
                      success: true,
                      action_executed: 'getBuyerProductRecommendations',
                      ai_message: cleanText,
                      speech_text: cleanText,
                      products: cardProducts
                    });
                  }
                  console.warn('[Buyer RAG] Model output rejected by Urdu quality gate; using deterministic reply.');
                  const buyerNarrowed = narrowProductsToQueryType(ragProducts, message).slice(0, 3);
                  const buyerFallback = buildUrduProductReply(buyerNarrowed);
                  return res.json({
                    success: true,
                    action_executed: 'getBuyerProductRecommendations',
                    ai_message: buyerFallback,
                    speech_text: buyerFallback,
                    products: buyerNarrowed
                  });
                }
              } else {
                const errText = await ollamaRagRes.text();
                console.error('[Buyer RAG] Ollama HTTP error:', ollamaRagRes.status, errText);
              }
            }
        } catch (ollamaErr) {
          console.error('[Buyer RAG] Ollama connection error:', ollamaErr.message);
        }

        // Final fallback: the AI model is unreachable — build a deterministic Urdu reply
        // from the real product data instead of a bare apology, so the buyer still gets
        // a useful answer.
        const fallbackCards = ragProducts ? ragProducts.slice(0, 6) : [];
        return res.json({
          success: true,
          action_executed: 'getBuyerProductRecommendations',
          ai_message: buildProductRecommendationMd(fallbackCards),
          speech_text: buildProductRecommendationSpeech(fallbackCards),
          products: fallbackCards
        });
      } catch (err) {
        return res.json({ success: true, ai_message: `❌ مصنوعات تلاش کرنے میں خرابی: ${err.message}` });
      }
    }

    // ─── ADMIN: deterministic intent routing ─────────────────────────────────
    // Answered straight from the DB before the LLM tool-calling path below, for the same
    // reasons it was done for buyer/distributor: instant, always accurate, and immune to
    // the model garbling Urdu or picking the wrong tool. Anything not matched here still
    // falls through to the full tool-calling agent, so this only adds reliability.
    if (role === 'ADMIN' && !attached_image) {
      try {
        const adminResult = await routeAdminQuery(pool, message);
        if (adminResult) return res.json({ success: true, ...adminResult });
      } catch (err) {
        console.error('[Admin routing] error:', err.message);
        // Fall through to the LLM agent rather than failing the request.
      }
    }

    const effectiveSystemPrompt = role === 'DISTRIBUTOR' ? DISTRIBUTOR_SYSTEM_PROMPT : SYSTEM_PROMPT;

    // 2. Allowed business keywords (Static list + Platform tabs + Synonyms)
    const STATIC_KEYWORDS = [
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
      'count', 'summary', 'status'
    ];

    let dbKeywords = [];
    try {
      const catRes = await pool.query('SELECT DISTINCT category, brand FROM products');
      for (const r of catRes.rows) {
        if (r.category) dbKeywords.push(r.category.toLowerCase().trim());
        if (r.brand) dbKeywords.push(r.brand.toLowerCase().trim());
      }
    } catch (e) {
      console.error("Error fetching dynamic keywords from DB:", e);
    }

    const ALLOWED_KEYWORDS = [...STATIC_KEYWORDS, ...dbKeywords];
    const hasKeyword = ALLOWED_KEYWORDS.some(kw => message.toLowerCase().includes(kw));

    if (!hasKeyword) {
      return res.json({
        success: true,
        ai_message: `I can only assist with the registered operations: product catalog inventory management.`
      });
    }

    // 0. Try Ollama model (Remote PC -> Local Mac fallback)
    try {
      const endpoint = await getOllamaChatEndpoint();
      if (endpoint) {
        const modelName = endpoint.modelName;

        const messages = [
          {
            role: 'system',
            content: effectiveSystemPrompt
          },
          ...(history || []).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          })),
          {
            role: 'user',
            content: message
          }
        ];

        const response = await fetchOllamaChat(endpoint, {
          model: modelName,
          messages: messages,
          tools: getAdminTools(false),
          tool_choice: 'auto'
        });

        if (response.ok) {
          const data = await response.json();
          const choice = data.choices[0];
          const toolCalls = choice.message.tool_calls;

          if (toolCalls && toolCalls.length > 0) {
            const toolCall = toolCalls[0];
            const functionName = toolCall.function.name;
            let args;
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch (e) {
              return res.json({ success: true, ai_message: `❌ Ollama returned invalid JSON for arguments: ${toolCall.function.arguments}` });
            }
            try {
              const executionResult = await executeCopilotTool(pool, functionName, args, message, attached_image, req.auth?.email || null);
              return res.json({
                success: true,
                ...executionResult,
                // No model-name suffix: it is developer diagnostics, and because the reply
                // is also sent to TTS it ended up being read aloud to the user.
                ai_message: executionResult.ai_message
              });
            } catch (err) {
              return res.json({ success: true, ai_message: `❌ Tool execution error: ${err.message}` });
            }
          }

          return res.json({
            success: true,
            ai_message: guardAdminReply(choice.message.content)
          });
        }
      }
    } catch (ollamaErr) {
      if (ollamaErr.code === 'ECONNREFUSED' || (ollamaErr.message && ollamaErr.message.includes('fetch'))) {
        // Local Ollama is not active, fallback to cloud APIs
      } else {
        console.error('Ollama Execution Error:', ollamaErr);
        return res.json({ success: true, ai_message: `❌ Ollama Agent Error: ${ollamaErr.message}` });
      }
    }

    // 1. Try Mistral AI if key is present
    if (mistralKey) {
      try {
        const messages = [
          {
            role: 'system',
            content: effectiveSystemPrompt
          },
          ...(history || []).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          })),
          {
            role: 'user',
            content: message
          }
        ];

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${mistralKey}`
          },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: messages,
            tools: getAdminTools(false),
            tool_choice: 'auto'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Mistral API responded with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices[0];
        const toolCalls = choice.message.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
          const toolCall = toolCalls[0];
          const functionName = toolCall.function.name;
          let args;
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            args = toolCall.function.arguments;
          }
          try {
            const executionResult = await executeCopilotTool(pool, functionName, args, message, attached_image, req.auth?.email || null);
            return res.json({
              success: true,
              ...executionResult
            });
          } catch (err) {
            return res.json({ success: true, ai_message: `❌ Tool execution error: ${err.message}` });
          }
        }

        return res.json({
          success: true,
          ai_message: guardAdminReply(choice.message.content)
        });

      } catch (err) {
        console.error('Mistral Error:', err);
      }
    }

    // 2. Try OpenAI if key is present
    if (openaiKey) {
      try {
        const messages = [
          {
            role: 'system',
            content: effectiveSystemPrompt
          },
          ...(history || []).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          })),
          {
            role: 'user',
            content: message
          }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            tools: getAdminTools(false)
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API responded with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices[0];
        const toolCalls = choice.message.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
          const toolCall = toolCalls[0];
          const functionName = toolCall.function.name;
          let args;
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            args = toolCall.function.arguments;
          }
          try {
            const executionResult = await executeCopilotTool(pool, functionName, args, message, attached_image, req.auth?.email || null);
            return res.json({
              success: true,
              ...executionResult
            });
          } catch (err) {
            return res.json({ success: true, ai_message: `❌ Tool execution error: ${err.message}` });
          }
        }

        return res.json({
          success: true,
          ai_message: guardAdminReply(choice.message.content)
        });

      } catch (err) {
        console.error('OpenAI Error:', err);
      }
    }

    // 3. Try Gemini if key is present
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: effectiveSystemPrompt,
        });

        const chatHistory = (history || []).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

        const chat = model.startChat({
          history: chatHistory,
          tools: [{ functionDeclarations: getAdminTools(true) }]
        });

        const result = await chat.sendMessage(message);
        const response = result.response;
        
        const calls = response.functionCalls;
        if (calls && calls.length > 0) {
          const call = calls[0];
          const functionName = call.name;
          const args = call.args;
          try {
            const executionResult = await executeCopilotTool(pool, functionName, args, message, attached_image, req.auth?.email || null);
            return res.json({
              success: true,
              ...executionResult
            });
          } catch (err) {
            return res.json({ success: true, ai_message: `❌ Tool execution error: ${err.message}` });
          }
        }

        return res.json({
          success: true,
          ai_message: response.text()
        });

      } catch (err) {
        console.error('Generative AI Error:', err);
      }
    }

    // 5. Fallback locally if keys are not working
    return handleLocalFallback(pool, message, attached_image, res, role);
  };

  // Any uncaught error inside handleChat would otherwise become an unhandled promise
  // rejection and crash the whole Node process -- taking down chat for every portal at once.
  const safeHandleChat = (defaultRole) => (req, res) => {
    handleChat(req, res, defaultRole).catch(err => {
      console.error(`[Copilot Chat] Unhandled error (${defaultRole}):`, err);
      if (!res.headersSent) {
        res.status(200).json({ success: true, ai_message: `❌ غیر متوقع خرابی پیش آگئی۔ براہ کرم دوبارہ کوشش کریں۔` });
      }
    });
  };

  app.post('/api/copilot/chat', optionalAuth, safeHandleChat('ADMIN'));
  app.post('/api/copilot/distributor/chat', optionalAuth, safeHandleChat('DISTRIBUTOR'));
  // Urdu & Multilingual TTS — ElevenLabs (when ELEVENLABS_API_KEY is present) or Edge Neural TTS
  app.post('/api/copilot/tts', async (req, res) => {
    const { text, voice = 'ur-PK-UzmaNeural', stream = false } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, error: 'text is required' });
    }
    const spoken = text
      .replace(/[*_#`~]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[\u4e00-\u9fff]+/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!spoken) return res.status(204).send();

    try { require('dotenv').config(); } catch {}

    // XTTS v2 on the Office PC GPU is the ONLY voice engine used here -- no edge-tts /
    // ElevenLabs fallback. If the Office PC is unreachable, this fails loudly (502/204)
    // rather than silently switching to a different voice.
    // Note for manual diagnostics against this service: its health endpoint is
    // /api/health, not /health (confirmed against the live service).
    const ttsServiceUrl = process.env.TTS_SERVICE_URL || 'https://bronco-antsy-magnetize.ngrok-free.dev/api/tts';
    const ttsApiKey = process.env.TTS_API_KEY || 'az5nD6ceT-c4lslqzadpNA-b';
    const defaultVoice = process.env.TTS_DEFAULT_VOICE || 'demo-urdu-male.wav';

    try {
      let targetUrl = ttsServiceUrl;
      if (ttsApiKey && !targetUrl.includes('key=')) {
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(ttsApiKey.trim());
      }

      let targetVoice = voice;
      if (!targetVoice || targetVoice.includes('Neural') || targetVoice.includes('ur-PK') || targetVoice === 'default') {
        targetVoice = defaultVoice;
      }

      console.log(`[TTS] 🚀 XTTS v2 (Office PC GPU) request (${targetUrl}, voice=${targetVoice})...`);
      const gpuResp = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'X-API-Key': ttsApiKey
        },
        body: JSON.stringify({
          text: spoken,
          voice: targetVoice,
          max_chars: 120,
          temperature: 0.1,
          top_p: 0.3,
          speed: 1.05,
          stream: !!stream
        }),
        // Only guards connection setup / time-to-first-byte. A fixed timeout must not keep
        // ticking through the whole body stream -- for longer replies that legitimately take
        // >60s to fully synthesize/stream, AbortSignal.timeout used to fire mid-pipe, erroring
        // gpuResp.body with no listener attached, which crashed the entire Node process
        // ("Unhandled 'error' event") and took every other route down with it. 120s here is
        // still a safety net, not a normal-path limit -- the error handling below is what
        // actually prevents a crash if it (or anything else) fires.
        signal: AbortSignal.timeout(120000)
      });

      if (gpuResp.ok) {
        const contentType = gpuResp.headers.get('content-type') || 'audio/wav';
        console.log(`[TTS] ✅ XTTS v2 synthesis successful! Returning audio (${contentType}, stream=${!!stream})...`);
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-TTS-Engine', 'XTTS-v2-Office-GPU');
        // Streamed responses are generated progressively and must reach the browser as
        // each chunk arrives -- caching (which implies a complete, static response) and
        // buffering both defeat the point, so only apply Cache-Control to the
        // non-streaming path, and explicitly disable any proxy/compression buffering.
        if (stream) {
          res.setHeader('X-Accel-Buffering', 'no');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
        const { Readable } = require('stream');
        const audioStream = Readable.fromWeb(gpuResp.body);
        // CRITICAL: a stream error (e.g. the upstream connection dropping or aborting
        // mid-transfer) emits an 'error' event. With no listener, Node treats it as
        // unhandled and crashes the whole process. This listener is what makes that
        // failure mode a normal, contained request error instead.
        audioStream.on('error', (streamErr) => {
          console.error(`[TTS] ⚠️ Stream error while piping XTTS audio: ${streamErr.message}`);
          if (!res.headersSent) {
            res.status(502).json({ success: false, error: `TTS stream interrupted: ${streamErr.message}` });
          } else {
            res.destroy();
          }
        });
        res.on('close', () => {
          if (!res.writableEnded) audioStream.destroy();
        });
        return audioStream.pipe(res);
      }

      const errText = await gpuResp.text();
      console.error(`[TTS] ❌ XTTS v2 (Office PC) returned HTTP ${gpuResp.status}: ${errText}`);
      return res.status(502).json({ success: false, error: `XTTS v2 service error (${gpuResp.status}): ${errText}` });
    } catch (err) {
      console.error(`[TTS] ❌ XTTS v2 (Office PC) unreachable: ${err.message}`);
      return res.status(502).json({ success: false, error: `XTTS v2 (Office PC) unreachable: ${err.message}` });
    }
  });

  // ─── Admin inline actions from chat ──────────────────────────────────────────
  // Lets the admin act on a record straight from the chat message that surfaced it
  // (approve/reject/ship an order, approve/reject/counter a quotation) instead of leaving
  // chat to find it. Deliberately a separate endpoint from /chat: these mutate data, so
  // they take an explicit action + id rather than being inferred from free text -- a
  // mistranscribed voice command must never be able to approve an order by accident.
  app.post('/api/copilot/admin/action', requireAuth, requireRole('admin'), async (req, res) => {
    const { action, target_id, value, reason } = req.body || {};

    // Role is taken from the verified token by requireRole above. It used to be read from a
    // `portal_role` field in this body -- which the client supplies, so sending
    // {"portal_role":"ADMIN"} approved/rejected/shipped any order with no credentials at all.
    if (!action || !target_id) {
      return res.status(400).json({ success: false, error: 'action and target_id are required.' });
    }

    try {
      switch (String(action).toLowerCase()) {
        case 'approve_order': {
          const r = await updateOrderStatusInDb(pool, target_id, 'APPROVED');
          return res.json({ success: true, message: `✅ آرڈر ${target_id} منظور کر دیا گیا۔`, result: r });
        }
        case 'reject_order': {
          // Rejection reverses any reserved stock -- handled inside updateOrderStatusInDb.
          const r = await updateOrderStatusInDb(pool, target_id, 'REJECTED');
          return res.json({ success: true, message: `❌ آرڈر ${target_id} مسترد کر دیا گیا اور اسٹاک واپس ہو گیا۔`, result: r });
        }
        case 'ship_order': {
          const r = await shipOrderInDb(pool, target_id);
          return res.json({ success: true, message: `🚚 آرڈر ${target_id} روانہ کر دیا گیا۔`, result: r });
        }
        case 'approve_quotation': {
          const r = await approveQuotationInDb(pool, target_id, value != null ? Number(value) : null);
          return res.json({ success: true, message: `✅ کوٹیشن ${target_id} منظور کر دی گئی۔`, result: r });
        }
        case 'reject_quotation': {
          const r = await rejectQuotationInDb(pool, target_id, reason || '');
          return res.json({ success: true, message: `❌ کوٹیشن ${target_id} مسترد کر دی گئی۔`, result: r });
        }
        case 'counter_quotation': {
          if (value == null || isNaN(Number(value))) {
            return res.status(400).json({ success: false, error: 'A numeric counter price (value) is required.' });
          }
          const r = await sendCounterOfferToDistributorInDb(pool, target_id, Number(value), reason || '');
          return res.json({ success: true, message: `🤝 کوٹیشن ${target_id} پر Rs ${Number(value).toLocaleString()} کی کاؤنٹر آفر بھیج دی گئی۔`, result: r });
        }
        default:
          return res.status(400).json({ success: false, error: `Unknown action "${action}".` });
      }
    } catch (err) {
      console.error('[Admin action] error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  });

  // ─── Speech-to-Text (buyer mic input) — proxies to local faster-whisper microservice ──
  const STT_SERVICE_URL = process.env.STT_SERVICE_URL || 'http://localhost:8021/api/stt';

  app.post('/api/copilot/stt', async (req, res) => {
    const { audio, language } = req.body || {};
    if (!audio || typeof audio !== 'string') {
      return res.status(400).json({ success: false, error: 'audio (base64 data URL) is required' });
    }

    try {
      // Data URLs look like "data:<mime>[;params...];base64,<data>" -- the mime itself can
      // carry parameters (Chrome reports MediaRecorder's mimeType as "audio/webm;codecs=opus",
      // so the header becomes "data:audio/webm;codecs=opus;base64"). Split on the first comma
      // rather than assuming ";base64," follows the mime type directly, or codec params here
      // cause the whole data URL (including the "data:...;base64," prefix) to be mis-decoded
      // as if it were the audio payload.
      const commaIdx = audio.indexOf(',');
      const header = commaIdx >= 0 ? audio.slice(0, commaIdx) : '';
      const mimeMatch = header.match(/^data:([^;,]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'audio/webm';
      const base64Data = commaIdx >= 0 && /;base64$/.test(header) ? audio.slice(commaIdx + 1) : audio;
      const audioBuffer = Buffer.from(base64Data, 'base64');
      if (audioBuffer.length === 0) {
        return res.status(400).json({ success: false, error: 'empty audio payload' });
      }

      const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : 'webm';
      const form = new FormData();
      form.append('audio', new Blob([audioBuffer], { type: mimeType }), `voice.${ext}`);
      if (language) form.append('language', language);

      // Supports pointing STT_SERVICE_URL at a remote GPU box (e.g. the Office PC, the way
      // XTTS and Ollama already are). Those are fronted by an ngrok tunnel that enforces an
      // API key on every route, so send it when one is configured; harmless for localhost.
      const sttApiKey = process.env.STT_API_KEY || process.env.TTS_API_KEY || '';
      let sttUrl = STT_SERVICE_URL;
      const isRemoteStt = !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(sttUrl);
      if (isRemoteStt && sttApiKey && !sttUrl.includes('key=')) {
        sttUrl += (sttUrl.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(sttApiKey.trim());
      }

      const sttResp = await fetch(sttUrl, {
        method: 'POST',
        body: form,
        headers: isRemoteStt
          ? { 'ngrok-skip-browser-warning': 'true', ...(sttApiKey ? { 'X-API-Key': sttApiKey } : {}) }
          : undefined,
        // CPU transcription of a ~15s clip can legitimately take well over 30s on a
        // laptop-class machine; a short timeout here surfaced as "speech service
        // unavailable" on perfectly good audio.
        signal: AbortSignal.timeout(90000)
      });

      if (!sttResp.ok) {
        const errText = await sttResp.text();
        console.error('[STT] service error:', sttResp.status, errText);
        return res.status(502).json({ success: false, error: 'Speech recognition service unavailable.' });
      }

      const data = await sttResp.json();
      return res.json({ success: true, text: (data.text || '').trim(), language: data.language });
    } catch (err) {
      console.error('[STT] proxy error:', err.message);
      return res.status(502).json({ success: false, error: 'Speech recognition service unavailable.' });
    }
  });

  app.post('/api/copilot/buyer/chat', optionalAuth, safeHandleChat('BUYER'));
}

module.exports = { registerCopilotRoutes };

