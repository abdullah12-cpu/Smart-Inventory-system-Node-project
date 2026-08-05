const { GoogleGenerativeAI } = require('@google/generative-ai');
const { 
  createProductInDb, deleteProductFromDb, updateProductInDb, bulkUpdateProductsInDb, searchProductsInDb, getCategoryProductsFromDb, getLowStockProductsFromDb,
  createSupplierInDb, updateSupplierInDb, deleteSupplierFromDb, searchSuppliersInDb, filterSuppliersByLocationInDb,
  listOrdersFromDb, getOrderByIdFromDb, getOrdersByStatusFromDb, getOrdersByCustomerFromDb, getOrdersByDateRangeFromDb,
  getOrdersByAmountFilterFromDb, updateOrderStatusInDb, bulkApproveOrdersInDb, getOrderAnalyticsFromDb,
  getTopBuyersFromDb, getMostOrderedProductsFromDb, getOverdueOrdersFromDb, getOrdersByProductFromDb,
  getOrdersAwaitingShipmentFromDb, shipOrderInDb, shipAllOrdersInDb
} = require('./adminOperations');
const { 
  getDistributorWholesaleProductsFromDb, 
  getDistributorQuotationsFromDb,
  getDistributorQuotationsByStatusFromDb,
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
  payDistributorInvoiceInDb,
  counterOfferQuotationInDb,
  buildQuotationDescription
} = require('./distributorOperations');
const { getBuyerProductRecommendationsFromDb, compareBuyerProductsInDb, trackBuyerOrder, listBuyerOrdersByStatus } = require('./buyerOperations');
const { vectorSearchProducts, vectorSearchDistributorProducts, isEmbedModelAvailable } = require('./embeddings');

// â”€â”€â”€ Ollama config & dynamic resolution (Remote PC -> Local Mac fallback) â”€â”€â”€â”€â”€â”€
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
          console.log(`[Ollama RAG] ðŸŒ Connected to Remote PC (${remoteUrl}) â†’ Using model: ${match.name}`);
          return { baseUrl: remoteUrl, modelName: match.name, isRemote: true };
        }
      }
    } catch (err) {
      console.warn(`[Ollama RAG] âš ï¸ Remote PC (${remoteUrl}) unreachable: ${err.message}. Falling back to Mac local...`);
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
        console.log(`[Ollama RAG] ðŸ’» Running on Local Mac â†’ Using model: ${match.name}`);
        return { baseUrl: 'http://localhost:11434', modelName: match.name, isRemote: false };
      }
    }
  } catch (_) {
    console.warn('[Ollama RAG] âŒ Local Mac Ollama is not running.');
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

// â”€â”€â”€ Buyer session memory (in-process, per user email) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Distributor session memory for interactive quote flows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      return 'âŒ No products match your filter criteria.';
    }
    return '### ðŸ” Filter Results\n\n| Product | SKU | Price | Stock |\n|---|---|---|---|\n' +
      filteredRows.map(r => {
        const prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices;
        const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
        const stock = inv && inv.length > 0 ? inv.reduce((sum, item) => sum + (item.available_quantity || 0), 0) : 0;
        return `| ${r.product_name} | ${r.sku} | Rs ${prices.RETAIL?.toLocaleString() || 0} | ${stock} |`;
      }).join('\n');
  }

  if (args.action_type === 'low_stock') {
    const rows = await getLowStockProductsFromDb(pool);
    if (rows.length === 0) return 'âœ… All products have sufficient stock.';
    return '### ðŸ“‰ Low Stock Products\n\n| Product | SKU | Stock | Threshold |\n|---|---|---|---|\n' +
      rows.map(r => {
        const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
        const stock = inv && inv.length > 0 ? inv.reduce((sum, item) => sum + (item.available_quantity || 0), 0) : 0;
        return `| ${r.product_name} | ${r.sku} | **${stock}** | ${r.low_stock_threshold} |`;
      }).join('\n');
  }

  if (args.action_type === 'browse_category' && args.category) {
    const rows = await getCategoryProductsFromDb(pool, args.category);
    if (rows.length === 0) return `âŒ No products found in category: "${args.category}"`;
    return `### ðŸ“‚ Category: ${args.category}\n\n| Product | Price | Stock |\n|---|---|---|\n` +
      rows.map(r => {
        const prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices;
        const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
        const stock = inv && inv.length > 0 ? inv.reduce((sum, item) => sum + (item.available_quantity || 0), 0) : 0;
        return `| ${r.product_name} | Rs ${prices.RETAIL?.toLocaleString() || 0} | ${stock} |`;
      }).join('\n');
  }

  const rows = await searchProductsInDb(pool, args.identifier || '');
  if (rows.length === 0) return `âŒ Could not find product matching: "${args.identifier}"`;
  return `### ðŸ” Search Results\n\n| Product | SKU | Price | Stock |\n|---|---|---|---|\n` +
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

// â”€â”€â”€ Buyer-only tool definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    if (res.rows.length === 0) return 'â„¹ï¸ No suppliers found in the vendor directory.';
    return '### ðŸ¢ Suppliers & Vendors Directory\n\n| Company Name | Contact Person | Email | Phone | Location |\n|---|---|---|---|---|\n' +
      res.rows.map(r => `| ${r.company_name} | ${r.contact_person || 'N/A'} | ${r.email || 'N/A'} | ${r.phone || 'N/A'} | ${r.city || 'N/A'}, ${r.country || 'N/A'} |`).join('\n');
  }

  if (args.action_type === 'filter_by_location') {
    const city = args.city || '';
    const country = args.country || '';
    const rows = await filterSuppliersByLocationInDb(pool, city, country);
    const locationLabel = [city, country].filter(Boolean).join(', ');
    if (rows.length === 0) return `âŒ No suppliers found in location: "${locationLabel}"`;
    return `### ðŸ“ Suppliers in ${locationLabel}\n\n| Company Name | Contact Person | Email | Phone | Location |\n|---|---|---|---|---|\n` +
      rows.map(r => `| ${r.company_name} | ${r.contact_person || 'N/A'} | ${r.email || 'N/A'} | ${r.phone || 'N/A'} | ${r.city || 'N/A'}, ${r.country || 'N/A'} |`).join('\n');
  }

  const searchVal = args.identifier || '';
  const rows = await searchSuppliersInDb(pool, searchVal);
  if (rows.length === 0) return `âŒ Could not find supplier matching search key: "${searchVal}"`;
  return '### ðŸ” Searched Suppliers\n\n| Company Name | Contact Person | Email | Phone | Location |\n|---|---|---|---|---|\n' +
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

async function executeCopilotTool(pool, name, args, message, attached_image) {
  if (name === 'createProduct') {
    if (attached_image) {
      args.image_url = attached_image;
    }
    const specs = extractSpecsFromMessage(message);
    mergeSpecsIntoArgs(args, specs);
    const newProduct = await createProductInDb(pool, args);
    return {
      action_executed: 'createProduct',
      ai_message: `âœ… Created: **${args.name}** (${args.category || 'N/A'}). Price: ${args.price !== undefined && args.price !== null ? 'Rs ' + args.price.toLocaleString() : 'N/A'}, Stock: ${args.stock !== undefined && args.stock !== null ? args.stock : 'N/A'}. SKU: ${newProduct.sku}.`,
      product: newProduct
    };
  } else if (name === 'deleteProduct') {
    const deleted = await deleteProductFromDb(pool, args.identifier);
    return {
      action_executed: 'deleteProduct',
      ai_message: `âœ… Deleted product: **${deleted.product_name}** (SKU: ${deleted.sku}).`
    };
  } else if (name === 'updateProduct') {
    const updated = await updateProductInDb(pool, args.identifier, args);
    return {
      action_executed: 'updateProduct',
      ai_message: `âœ… Updated product: **${updated.product_name}**. (Edits applied successfully)`
    };
  } else if (name === 'bulkUpdateProducts') {
    const count = await bulkUpdateProductsInDb(pool, args.category_filter, args.brand_filter, args);
    return {
      action_executed: 'bulkUpdateProducts',
      ai_message: `âœ… Bulk operation completed: Successfully modified **${count}** products matching your criteria.`
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
      ai_message: `âœ… Onboarded Supplier: **${newSup.company_name}** (${newSup.city || 'N/A'}, ${newSup.country || 'N/A'}). Contact Person: ${newSup.contact_person || 'N/A'}. Email: ${newSup.email || 'N/A'}. Phone: ${newSup.phone || 'N/A'}.`,
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
      ai_message: `âœ… Updated Supplier profile: **${updatedSup.company_name}**. (Edits applied successfully)`
    };
  } else if (name === 'deleteSupplier') {
    const deletedSup = await deleteSupplierFromDb(pool, args.identifier);
    return {
      action_executed: 'deleteSupplier',
      ai_message: `âœ… Deleted Supplier: **${deletedSup.company_name}** (ID: ${deletedSup.supplier_id}).`
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
      ai_message: `âœ… **Quotation Request Submitted Successfully!**\n\n- **Quotation ID**: \`${quote.quotation_id}\`\n- **Quotation Number**: **${quote.quotation_number}**\n- **Product**: **${quote.product_name}** (${quote.sku})\n- **Quantity**: ${quote.quantity} units\n- **Target Unit Price**: Rs ${Number(quote.unit_price).toLocaleString()}\n- **Total Estimated Value**: Rs ${Number(quote.total_amount).toLocaleString()}\n- **Status**: \`${quote.status}\` (Under Review by Sales Team)`
    };
  } else if (name === 'createDistributorDirectOrder') {
    const order = await createDistributorDirectOrderInDb(pool, args.customer_email, args.customer_name, args.product_name, args.quantity, args.warehouse_depot);
    return {
      action_executed: 'createDistributorDirectOrder',
      ai_message: `âœ… **Direct B2B Wholesale Order Placed Successfully!**\n\n- **Order Number**: **${order.order_number}**\n- **Product**: **${order.product_name}** (${order.sku})\n- **Order Quantity**: ${order.quantity} units\n- **Total Amount**: Rs ${Number(order.total_amount).toLocaleString()}\n- **Warehouse Depot**: ${order.warehouse_depot}\n- **Order Status**: \`${order.status}\` (Processing)`
    };
  } else if (name === 'manageDistributorQuotations') {
    const action = args.action_type;
    const identifier = args.identifier || '';

    if (action === 'by_status') {
      const rows = await getDistributorQuotationsByStatusFromDb(pool, args.status || 'PENDING');
      return {
        action_executed: 'manageDistributorQuotations',
        ai_message: formatQuotationsTable(rows, `ðŸ“‹ ${(args.status || 'PENDING').toUpperCase().replace('_',' ')} Quotations`)
      };
    }
    if (action === 'find') {
      const rows = await getDistributorQuotationByIdFromDb(pool, identifier);
      return {
        action_executed: 'manageDistributorQuotations',
        ai_message: formatQuotationsTable(rows, `ðŸ” Quotation Search: "${identifier}"`)
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

function formatOrdersTable(rows, title) {
  if (rows.length === 0) return `ℹ️ کوئی آرڈر نہیں ملا۔`;
  return `### ${title}\n\n| آرڈر # | حیثیت | رقم (PKR) | صارف | تاریخ |\n|---|---|---|---|---|\n` +
    rows.map(r => `| ${r.order_number || r.order_id} | ${r.status} | Rs ${parseFloat(r.total_amount).toLocaleString()} | ${r.customer_email} | ${r.order_date ? new Date(r.order_date).toLocaleDateString() : 'N/A'} |`).join('\n');
}

function formatQuotationsTable(rows, title) {
  if (!rows || rows.length === 0) return `ℹ️ کوئی کوٹیشن نہیں ملی۔`;
  return `### ${title}\n\n| کوٹ نمبر | تاریخ | میعاد | حیثیت | رقم (PKR) |\n|---|---|---|---|---|\n` +
    rows.map(r => `| **${r.quotation_number || r.quotation_id}** | ${r.created_at ? String(r.created_at).slice(0,10) : 'حالیہ'} | ${r.valid_until || '14 دن'} | \`${r.status || 'PENDING'}\` | Rs ${Number(r.total_amount || 0).toLocaleString()} |`).join('\n');
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
        const quote = await createDistributorQuotationInDb(pool, 'asim@commerceiq.com', 'Asim Distribution', prodName, qty, null);
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
        const order = await createDistributorDirectOrderInDb(pool, 'asim@commerceiq.com', 'Asim Distribution', prodName, qty, 'Karachi Central Depot');
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

// Guards against LLM output that leaks stray non-Urdu scripts into the reply -- a known
// failure mode of the local qwen model on this prompt. Urdu uses the Arabic script block
// (U+0600-U+06FF) plus Arabic Presentation Forms; anything from Cyrillic, the Indic scripts
// (Devanagari, Gurmukhi, Gujarati, Bengali, Tamil, Telugu, ...), Thai, CJK, or Hangul means
// the model wandered into a different script mid-reply.
function hasForeignScriptLeak(text) {
  return /[Ѐ-ӿऀ-෿฀-๿一-鿿぀-ヿ가-힯]/.test(text || '');
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

function registerCopilotRoutes(app, pool) {
  const handleChat = async (req, res, defaultRole) => {
    const { message, history, attached_image, portal_role, user_name } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'پیغام درکار ہے۔' });
    }

    const role = (portal_role || defaultRole).toUpperCase();
    const displayName = user_name || 'صارف';

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
        const userEmail = req.body.user_email || 'partner@commerceiq.com';
        
        const isOrderTrack = /\b(where is my order|track|order\s+status)\b/i.test(message);
        if (isOrderTrack && !attached_image) {
          const trackResult = await trackBuyerOrder(pool, { order_id_query: message.match(/ORD[-_]?\d+/i)?.[0] || '' });
          return res.json({ success: true, action_executed: 'trackBuyerOrder', ai_message: trackResult.ai_message, orders: trackResult.orders });
        }

        const wholesaleProducts = await vectorSearchDistributorProducts(pool, message);
        const productContext = wholesaleProducts.map((p, i) => `${i + 1}. "${p.product_name}" (SKU: ${p.sku}) | قیمت: Rs ${p.wholesale_price}`).join('\n');

        const distributorRagPrompt = [
          'آپ CIQ ڈسٹری بیوٹر کو پائلٹ ہیں (Urdu Script only).',
          'ڈیٹا:', productContext,
          'سوال:', message,
          'جواب صرف سلیس اردو رسم الخط میں دیں۔'
        ].join('\n');

        const endpoint = await getOllamaChatEndpoint();
        if (endpoint) {
          const resOllama = await fetchOllamaChat(endpoint, {
            model: endpoint.modelName,
            messages: [{ role: 'system', content: distributorRagPrompt }, { role: 'user', content: message }],
            options: { temperature: 0.15, top_p: 0.9, num_predict: 220 }
          });
          if (resOllama.ok) {
            const data = await resOllama.json();
            const content = data.choices?.[0]?.message?.content?.trim().replace(/[\t\r]+/g, ' ').replace(/ {2,}/g, ' ');
            if (content && !hasForeignScriptLeak(content)) {
              return res.json({ success: true, action_executed: 'getDistributorWholesaleRecommendations', ai_message: content });
            }
          } else {
            console.error('[Distributor RAG] Ollama HTTP error:', resOllama.status, await resOllama.text());
          }
        }

        // Deterministic fallback (model unreachable or output was garbled)
        const wsMd = wholesaleProducts.length === 0
          ? 'معذرت، اس وقت کوئی مناسب ھول سیل مصنوع نہیں ملی۔'
          : `### 📦 ھول سیل مصنوعات\n\n` + wholesaleProducts.slice(0, 8).map((p, i) =>
              `**${i + 1}. ${p.product_name}** (SKU: ${p.sku}) — Rs ${Number(p.wholesale_price).toLocaleString()}`
            ).join('\n');
        return res.json({ success: true, action_executed: 'getDistributorWholesaleRecommendations', ai_message: wsMd });
      } catch (err) {
        return res.json({ success: true, ai_message: `❌ غلطی: ${err.message}` });
      }
    }

    if (role === 'BUYER') {
      try {
        const userEmail = req.body.user_email || 'guest@commerceiq.com';
        const emailForOrders = userEmail !== 'guest@commerceiq.com' ? userEmail : null;

        // Fast deterministic routing for order tracking/listing — skips the LLM entirely so
        // these are instant, always correct (real DB data), and never derailed into product search.
        const orderNumMatch = !attached_image && message.match(/ORD[-_]?\d+/i);
        const mentionsOrder = /\border(s)?\b/i.test(message);
        if (!attached_image && (orderNumMatch || mentionsOrder)) {
          if (orderNumMatch) {
            const trackResult = await trackBuyerOrder(pool, { order_id_query: orderNumMatch[0], customer_email: emailForOrders });
            return res.json({ success: true, action_executed: 'trackBuyerOrder', ai_message: trackResult.ai_message, orders: trackResult.orders });
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
          const dateFilter = /\b(today|aaj|aj)\b/i.test(lowerMsg) ? 'today' : (/\b(week|hafte|hafta)\b/i.test(lowerMsg) ? 'week' : null);

          const listResult = await listBuyerOrdersByStatus(pool, { status_filter: statusFilter, customer_email: emailForOrders, date_filter: dateFilter });
          return res.json({ success: true, action_executed: 'listBuyerOrders', ai_message: listResult.ai_message, orders: listResult.orders });
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
          return `${i + 1}. "${p.product_name}" | برانڈ: ${p.brand || 'N/A'} | کیٹیگری: ${p.category || 'عام'} | قیمت: Rs ${p.retail_price.toLocaleString()} | اسٹاک: ${p.available_stock > 0 ? `دستیاب (${p.available_stock})` : 'اسٹاک ختم'} | ${p.short_description || ''}${simNote}`;
        }).join('\n');

        const conversationHistory = (history || [])
          .slice(-8)
          .map(m => `${m.sender === 'user' ? 'خریدار' : 'معاون'}: ${m.text || ''}`)
          .join('\n');

        // Fetch this buyer's own orders for RAG context (so LLM can answer order questions)
        let buyerOrderContext = '';
        try {
          const buyerEmailRag = req.body.user_email || null;
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
          'صرف اور صرف سلیس اردو رسم الخط میں جواب دیں۔ جواب مختصر، واضح اور دوستانہ ہو۔',
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
              options: { temperature: 0.15, top_p: 0.9, num_predict: 220 }
            });
              if (ollamaRagRes.ok) {
                const ollamaData = await ollamaRagRes.json();
                const ragText = ollamaData.choices?.[0]?.message?.content?.trim().replace(/[\t\r]+/g, ' ').replace(/ {2,}/g, ' ');
                if (ragText) {
                  // Output validation â€” same injection guard
                  const looksInjected = /ignore|system prompt|instructions|i am now|you are now/i.test(ragText);
                  if (looksInjected) {
                    console.warn('[Buyer RAG] Possible injection response detected, returning safe fallback.');
                    return res.json({
                      success: true,
                      action_executed: 'getBuyerProductRecommendations',
                      ai_message: 'معذرت، میں ابھی آپ کی درخواست پر عمل نہیں کر سکا۔ براہ کرم دوبارہ کوشش کریں۔',
                      products: ragProducts.slice(0, 6)
                    });
                  }
                  if (hasForeignScriptLeak(ragText)) {
                    console.warn('[Buyer RAG] Foreign-script leak detected in model output, using deterministic fallback.');
                    return res.json({
                      success: true,
                      action_executed: 'getBuyerProductRecommendations',
                      ai_message: buildProductRecommendationMd(ragProducts.slice(0, 6)),
                      products: ragProducts.slice(0, 6)
                    });
                  }
                  // ragProducts is already scored/filtered for relevance to this query (see
                  // getBuyerProductRecommendationsFromDb), so use it directly for cards instead
                  // of requiring the model to reproduce exact English product names in its reply
                  // (it often paraphrases/transliterates them, which silently dropped all cards).
                  return res.json({
                    success: true,
                    action_executed: 'getBuyerProductRecommendations',
                    ai_message: ragText,
                    products: ragProducts.slice(0, 6)
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
          products: fallbackCards
        });
      } catch (err) {
        return res.json({ success: true, ai_message: `❌ مصنوعات تلاش کرنے میں خرابی: ${err.message}` });
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
              return res.json({ success: true, ai_message: `âŒ Ollama returned invalid JSON for arguments: ${toolCall.function.arguments}` });
            }
            try {
              const executionResult = await executeCopilotTool(pool, functionName, args, message, attached_image);
              return res.json({
                success: true,
                ...executionResult,
                ai_message: executionResult.ai_message + `\n\n*(Local Ollama Model: ${modelName})*`
              });
            } catch (err) {
              return res.json({ success: true, ai_message: `âŒ Tool execution error: ${err.message}` });
            }
          }

          return res.json({
            success: true,
            ai_message: choice.message.content
          });
        }
      }
    } catch (ollamaErr) {
      if (ollamaErr.code === 'ECONNREFUSED' || (ollamaErr.message && ollamaErr.message.includes('fetch'))) {
        // Local Ollama is not active, fallback to cloud APIs
      } else {
        console.error('Ollama Execution Error:', ollamaErr);
        return res.json({ success: true, ai_message: `âŒ Ollama Agent Error: ${ollamaErr.message}` });
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
            const executionResult = await executeCopilotTool(pool, functionName, args, message, attached_image);
            return res.json({
              success: true,
              ...executionResult
            });
          } catch (err) {
            return res.json({ success: true, ai_message: `âŒ Tool execution error: ${err.message}` });
          }
        }

        return res.json({
          success: true,
          ai_message: choice.message.content
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
            const executionResult = await executeCopilotTool(pool, functionName, args, message, attached_image);
            return res.json({
              success: true,
              ...executionResult
            });
          } catch (err) {
            return res.json({ success: true, ai_message: `âŒ Tool execution error: ${err.message}` });
          }
        }

        return res.json({
          success: true,
          ai_message: choice.message.content
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
            const executionResult = await executeCopilotTool(pool, functionName, args, message, attached_image);
            return res.json({
              success: true,
              ...executionResult
            });
          } catch (err) {
            return res.json({ success: true, ai_message: `âŒ Tool execution error: ${err.message}` });
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

  app.post('/api/copilot/chat', safeHandleChat('ADMIN'));
  app.post('/api/copilot/distributor/chat', safeHandleChat('DISTRIBUTOR'));
  // Urdu & Multilingual TTS — ElevenLabs (when ELEVENLABS_API_KEY is present) or Edge Neural TTS
  app.post('/api/copilot/tts', async (req, res) => {
    const { text, voice = 'ur-PK-UzmaNeural' } = req.body || {};
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

    // 1. Primary: Office PC GPU TTS Service (RTX 4090 GPU Urdu Neural TTS)
    const ttsServiceUrl = process.env.TTS_SERVICE_URL || 'https://bronco-antsy-magnetize.ngrok-free.dev/api/tts';
    const ttsApiKey = process.env.TTS_API_KEY || 'az5nD6ceT-c4lslqzadpNA-b';
    const defaultVoice = process.env.TTS_DEFAULT_VOICE || 'demo-urdu-male.wav';

    if (ttsServiceUrl) {
      try {
        let targetUrl = ttsServiceUrl;
        if (ttsApiKey && !targetUrl.includes('key=')) {
          targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(ttsApiKey.trim());
        }

        let targetVoice = voice;
        if (!targetVoice || targetVoice.includes('Neural') || targetVoice.includes('ur-PK') || targetVoice === 'default') {
          targetVoice = defaultVoice;
        }

        console.log(`[TTS] 🚀 Attempting Office PC GPU TTS (${targetUrl}, voice=${targetVoice})...`);
        const gpuResp = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'x-api-key': ttsApiKey
          },
          body: JSON.stringify({
            text: spoken,
            voice: targetVoice,
            max_chars: 120,
            temperature: 0.1,
            top_p: 0.3,
            speed: 1.05
          }),
          signal: AbortSignal.timeout(120000)
        });

        if (gpuResp.ok) {
          const contentType = gpuResp.headers.get('content-type') || 'audio/wav';
          console.log(`[TTS] ✅ Office PC GPU TTS speech synthesis successful! Returning audio (${contentType})...`);
          res.setHeader('Content-Type', contentType);
          res.setHeader('X-TTS-Engine', 'Office-GPU-TTS');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          const { Readable } = require('stream');
          return Readable.fromWeb(gpuResp.body).pipe(res);
        } else {
          const errText = await gpuResp.text();
          console.warn(`[TTS] ⚠️ Office PC GPU TTS returned HTTP ${gpuResp.status}: ${errText}. Falling back...`);
        }
      } catch (err) {
        console.warn(`[TTS] ⚠️ Office PC GPU TTS request error: ${err.message}. Falling back...`);
      }
    }

    // 2. Secondary Fallback: ElevenLabs API if key is provided
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY ? process.env.ELEVENLABS_API_KEY.trim() : '';
    if (elevenLabsApiKey) {
      try {
        const isElevenLabsId = (v) => typeof v === 'string' && /^[a-zA-Z0-9]{15,32}$/.test(v.trim()) && !/neural|edge|ur-pk/i.test(v);
        const voiceId = isElevenLabsId(voice) ? voice.trim() : (process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM');
        const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
        const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
        
        console.log(`[TTS] 🎙️ Attempting ElevenLabs API (model=${modelId}, voiceId=${voiceId})...`);
        const elevenResp = await fetch(elevenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey,
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({
            text: spoken,
            model_id: modelId,
            voice_settings: {
              stability: parseFloat(process.env.ELEVENLABS_STABILITY || '0.5'),
              similarity_boost: parseFloat(process.env.ELEVENLABS_SIMILARITY_BOOST || '0.75')
            }
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (elevenResp.ok) {
          console.log(`[TTS] ✅ ElevenLabs speech synthesis successful! Returning audio...`);
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('X-TTS-Engine', 'ElevenLabs');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          const { Readable } = require('stream');
          return Readable.fromWeb(elevenResp.body).pipe(res);
        } else {
          const errBody = await elevenResp.text();
          console.warn(`[TTS] ⚠️ ElevenLabs API returned HTTP ${elevenResp.status}: ${errBody}`);
        }
      } catch (err) {
        console.warn(`[TTS] ⚠️ ElevenLabs request error: ${err.message}...`);
      }
    }

    // 3. Final Fallback: Edge Neural TTS Microservice
    const LOCAL_TTS_URL = 'http://localhost:8020/api/tts';
    try {
      const ttsResp = await fetch(LOCAL_TTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spoken, voice: 'ur-PK-UzmaNeural' }),
        signal: AbortSignal.timeout(12000)
      });
      if (!ttsResp.ok) {
        const err = await ttsResp.text();
        return res.status(502).json({ success: false, error: err });
      }
      const contentType = ttsResp.headers.get('content-type') || 'audio/mpeg';
      console.log(`[TTS] 🔊 Edge-TTS speech synthesis returning audio (${contentType})...`);
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-TTS-Engine', 'Edge-TTS');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      const { Readable } = require('stream');
      Readable.fromWeb(ttsResp.body).pipe(res);
    } catch (err) {
      console.error('[TTS] proxy error:', err.message);
      return res.status(204).send();
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

      const sttResp = await fetch(STT_SERVICE_URL, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(30000)
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

  app.post('/api/copilot/buyer/chat', safeHandleChat('BUYER'));
}

module.exports = { registerCopilotRoutes };

