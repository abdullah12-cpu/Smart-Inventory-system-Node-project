const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createProductInDb, deleteProductFromDb, updateProductInDb, bulkUpdateProductsInDb, searchProductsInDb, getCategoryProductsFromDb, getLowStockProductsFromDb } = require('./operations');

const SYSTEM_PROMPT = 'You are CIQ Admin Copilot, an AI catalog assistant. You are strictly restricted to performing and discussing operations related to managing catalog inventory: creating products ("createProduct"), updating details/stocks ("updateProduct"), deleting products ("deleteProduct"), bulk updating categories ("bulkUpdateProducts"), and reading, searching, or checking low stock alerts ("readProductData"). If the user asks generic questions, conversational prompts, or attempts tasks outside this catalog inventory scope, you MUST decline to answer, stating: "I can only assist with the registered operations: product catalog inventory management." Keep your conversational answers extremely short, direct, and focused strictly on inventory catalog records. Do not add conversational fluff. IMPORTANT: When creating a product, do NOT invent or fill in default values (like category, price, stock, brand, etc.) if they are not explicitly specified in the user prompt. Leave them empty/null.';

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

async function handleLocalFallback(pool, message, attached_image, res) {
  const specs = extractSpecsFromMessage(message);
  
  if (!specs.name) {
    if (specs.brand && specs.sku) {
      specs.name = `${specs.brand} ${specs.sku}`;
    } else if (specs.sku) {
      specs.name = specs.sku;
    }
  }

  if (specs.name) {
    const args = {
      ...specs
    };

    if (attached_image) {
      args.image_url = attached_image;
    }
    
    try {
      const newProduct = await createProductInDb(pool, args);
      return res.json({
        success: true,
        action_executed: 'createProduct',
        ai_message: `✅ Created: **${args.name}** (${args.category || 'N/A'}). Price: ${args.price !== undefined && args.price !== null ? 'Rs ' + args.price.toLocaleString() : 'N/A'}, Stock: ${args.stock !== undefined && args.stock !== null ? args.stock : 'N/A'}. SKU: ${newProduct.sku}. *(Local fallback)*`,
        product: newProduct
      });
    } catch (err) {
      console.error('Error inserting product locally:', err);
      return res.status(500).json({ success: false, message: 'Database error during local fallback creation.' });
    }
  }


  return res.json({
    success: true,
    ai_message: `Please set MISTRAL_API_KEY, GEMINI_API_KEY or OPENAI_API_KEY environment variables to use live AI. Or type: "Add product: [Name], category: [Cat], price: [Rs], stock: [Qty]"`
  });
}

async function handleAnalyticalQuery(pool, sqlQuery) {
  const cleanQuery = sqlQuery.trim().toUpperCase();
  
  const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE', 'SCHEMA', 'DATABASE', 'TABLE'];
  const hasForbidden = forbiddenKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(cleanQuery);
  });
  
  if (!cleanQuery.startsWith('SELECT') && !cleanQuery.startsWith('WITH')) {
    return '❌ Security Access Denied: Query must be a read-only SELECT statement.';
  }
  
  if (hasForbidden) {
    return '❌ Security Access Denied: Modifying database keywords detected in query.';
  }
  
  if (/\b(users|credentials|passwords|env|secrets)\b/i.test(cleanQuery)) {
    return '❌ Security Access Denied: Access to sensitive system user information tables is strictly blocked.';
  }
  
  const result = await pool.query(sqlQuery);
  if (result.rows.length === 0) {
    return 'No records found matching query criteria.';
  }
  
  const headers = Object.keys(result.rows[0]);
  const mdHeader = '| ' + headers.join(' | ') + ' |\n| ' + headers.map(() => '---').join(' | ') + ' |';
  const mdRows = result.rows.map(row => {
    return '| ' + headers.map(h => {
      const val = row[h];
      if (val instanceof Date) return val.toISOString();
      if (typeof val === 'object' && val !== null) return JSON.stringify(val);
      return val !== null && val !== undefined ? String(val) : 'null';
    }).join(' | ') + ' |';
  }).join('\n');
  
  return `### 📊 Analytical Report\n\n${mdHeader}\n${mdRows}`;
}

function registerCopilotRoutes(app, pool) {
  app.post('/api/copilot/chat', async (req, res) => {
    const { message, history, attached_image } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message payload is required.' });
    }

    const lowerMsg = message.toLowerCase().trim();

    // 0. Sensitive environment/password queries guardrail
    const SENSITIVE_KEYWORDS = [
      'password', 'passwords', 'env', 'envs', 'secret', 'secrets', 'credential', 'credentials', 
      'token', 'tokens', 'key', 'keys', 'database_url', 'connectionstring',
      'port', 'ports', 'config', 'configs', 'process.env', 'leak', 'hack', 'exploit', 'bypass'
    ];
    const isSensitive = SENSITIVE_KEYWORDS.some(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(lowerMsg);
    });
    if (isSensitive) {
      return res.json({
        success: true,
        ai_message: `❌ Security Block: Access to environment variables, system passwords, or sensitive platform configurations is strictly prohibited.`
      });
    }



    // 1. Simple greetings
    const isGreeting = /^(hello|hi|hey|greetings|good morning|good afternoon|good evening)\b/i.test(lowerMsg);
    if (isGreeting && lowerMsg.split(/\s+/).length <= 3) {
      return res.json({
        success: true,
        ai_message: `Hello Saif! How can I assist with your product catalog inventory today?`
      });
    }

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
    const hasKeyword = ALLOWED_KEYWORDS.some(kw => lowerMsg.includes(kw));

    if (!hasKeyword) {
      return res.json({
        success: true,
        ai_message: `I can only assist with the registered operations: product catalog inventory management.`
      });
    }

    const mistralKey = process.env.MISTRAL_API_KEY || 't2d7sL1xG1bmzcPP9avwhHXyq6lMppSH';
    const openaiKey = process.env.OPENAI_API_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY || '';

    // 0. Try local Ollama model first if running on local system
    try {
      const probeRes = await fetch('http://localhost:11434/api/tags');
      if (probeRes.ok) {
        const probeData = await probeRes.json();
        const models = probeData.models || [];
        let modelName = 'qwen2.5:3b';
        if (models.length > 0) {
          const hasQwen = models.some(m => m.name.startsWith('qwen2.5:3b'));
          if (!hasQwen) {
            modelName = models[0].name;
          }
        }

        const messages = [
          {
            role: 'system',
            content: SYSTEM_PROMPT
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

        const response = await fetch('http://localhost:11434/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            messages: messages,
            tools: [
              {
                type: 'function',
                function: {
                  name: 'createProduct',
                  description: 'Creates a new SKU catalog product and registers it in database inventory.',
                  parameters: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Product Name' },
                      category: { type: 'string', description: 'Catalog Category' },
                      price: { type: 'number', description: 'Selling price in PKR' },
                      stock: { type: 'integer', description: 'Initial stock units' },
                      image_url: { type: 'string', description: 'Product image URL (optional)' },
                      sku: { type: 'string', description: 'Product Code / SKU (e.g. C9200L-24T-4G)' },
                      barcode: { type: 'string', description: 'UPC Barcode (e.g. 889728248741)' },
                      brand: { type: 'string', description: 'Brand Name (e.g. Cisco)' },
                      description: { type: 'string', description: 'Product short description' },
                      unit: { type: 'string', description: 'Base unit of measure (e.g. PCS, units)' },
                      weight: { type: 'number', description: 'Weight of unit in kg' },
                      distributor_price: { type: 'number', description: 'Wholesale / distributor rate in PKR' },
                      min_wholesale_qty: { type: 'integer', description: 'Minimum wholesale quantity restriction' },
                      max_discount: { type: 'integer', description: 'Maximum discount percent (0-100)' },
                      karachi_stock: { type: 'integer', description: 'Karachi Central Depot stock level' },
                      lahore_stock: { type: 'integer', description: 'Lahore North Terminal stock level' },
                      low_stock_threshold: { type: 'integer', description: 'Low Stock trigger threshold limit' },
                      total_product_limit: { type: 'integer', description: 'Maximum total product limit capacity' }
                    },
                    required: ['name']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'deleteProduct',
                  description: 'Deletes a product by its name or SKU.',
                  parameters: {
                    type: 'object',
                    properties: {
                      identifier: { type: 'string', description: 'Product Name or SKU to delete' }
                    },
                    required: ['identifier']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'updateProduct',
                  description: 'Updates specific fields of an existing individual product. Do NOT use this to rename an entire category.',
                  parameters: {
                    type: 'object',
                    properties: {
                      identifier: { type: 'string', description: 'Product name or SKU to update. Strictly exclude any prices, numbers, or update keywords from this identifier (e.g. if the user says "update price of Samsung ssd 25000", the identifier is "Samsung ssd").' },
                      new_name: { type: 'string' },
                      new_category: { type: 'string' },
                      new_brand: { type: 'string' },
                      new_price: { type: 'number', description: 'New retail / buyer price to set' },
                      new_distributor_price: { type: 'number', description: 'New distributor, wholesale, or agent price to set (e.g. 25000 if user says "25000 for the distributor").' },
                      stock_adjustment: { type: 'integer', description: 'Amount to add/subtract from stock' }
                    },
                    required: ['identifier']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'bulkUpdateProducts',
                  description: 'Performs bulk updates on products matching a category or brand. Use this to explicitly rename an entire category or brand.',
                  parameters: {
                    type: 'object',
                    properties: {
                      category_filter: { type: 'string', description: 'Category to target (e.g. Networking)' },
                      brand_filter: { type: 'string', description: 'Brand to target' },
                      price_percentage_change: { type: 'number', description: 'Percentage to change retail prices (e.g., 5 for +5%)' },
                      distributor_price_percentage_change: { type: 'number', description: 'Percentage to change distributor prices' },
                      new_status: { type: 'string', description: 'New status for all matched products' },
                      new_category: { type: 'string', description: 'New category for all matched products' },
                      new_brand: { type: 'string', description: 'New brand for all matched products' }
                    }
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'readProductData',
                  description: 'Searches the database to read, check stock, or list products. Use this BEFORE updating/deleting if you are unsure.',
                  parameters: {
                    type: 'object',
                    properties: {
                      action_type: { type: 'string', enum: ['search', 'browse_category', 'low_stock'], description: 'Use "search" for specific products (even if asking for stock), "browse_category" for a whole category, and "low_stock" ONLY to list all globally low items.' },
                      identifier: { type: 'string', description: 'Product Name or SKU to search for (if action_type is search)' },
                      category: { type: 'string', description: 'Category to browse (if action_type is browse_category)' }
                    },
                    required: ['action_type']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'runAnalyticalQuery',
                  description: 'Executes a read-only database query to answer analytical questions, statistics, summaries, counts, and reports. Do NOT use this for updating, deleting, inserting, or modifying data.',
                  parameters: {
                    type: 'object',
                    properties: {
                      sql_query: { type: 'string', description: 'A valid read-only SELECT SQL statement. Only reference tables: products, orders, stock_movements, and audit_logs. Do NOT use modifying commands.' }
                    },
                    required: ['sql_query']
                  }
                }
              }
            ],
            tool_choice: 'auto'
          })
        });

        if (response.ok) {
          const data = await response.json();
          const choice = data.choices[0];
          const toolCalls = choice.message.tool_calls;

          if (toolCalls && toolCalls.length > 0) {
            const toolCall = toolCalls[0];
            if (toolCall.function.name === 'createProduct') {
              const args = JSON.parse(toolCall.function.arguments);
              if (attached_image) {
                args.image_url = attached_image;
              }
              const specs = extractSpecsFromMessage(message);
              mergeSpecsIntoArgs(args, specs);
              const newProduct = await createProductInDb(pool, args);
              return res.json({
                success: true,
                action_executed: 'createProduct',
                ai_message: `✅ Created: **${args.name}** (${args.category || 'N/A'}). Price: ${args.price !== undefined && args.price !== null ? 'Rs ' + args.price.toLocaleString() : 'N/A'}, Stock: ${args.stock !== undefined && args.stock !== null ? args.stock : 'N/A'}. SKU: ${newProduct.sku}. *(Local Ollama Model: ${modelName})*`,
                product: newProduct
              });
            } else if (toolCall.function.name === 'deleteProduct') {
              const args = JSON.parse(toolCall.function.arguments);
              try {
                const deleted = await deleteProductFromDb(pool, args.identifier);
                return res.json({
                  success: true,
                  action_executed: 'deleteProduct',
                  ai_message: `✅ Deleted product: **${deleted.product_name}** (SKU: ${deleted.sku}). *(Local Ollama Model: ${modelName})*`
                });
              } catch (err) {
                return res.json({ success: true, ai_message: `❌ Could not find or delete product matching: "${args.identifier}"` });
              }
            } else if (toolCall.function.name === 'updateProduct') {
              const args = JSON.parse(toolCall.function.arguments);
              try {
                const updated = await updateProductInDb(pool, args.identifier, args);
                return res.json({
                  success: true,
                  action_executed: 'updateProduct',
                  ai_message: `✅ Updated product: **${updated.product_name}**. (Edits applied successfully) *(Local Ollama Model: ${modelName})*`
                });
              } catch (err) {
                return res.json({ success: true, ai_message: `❌ Could not update product matching: "${args.identifier}"` });
              }
            } else if (toolCall.function.name === 'bulkUpdateProducts') {
              const args = JSON.parse(toolCall.function.arguments);
              try {
                const count = await bulkUpdateProductsInDb(pool, args.category_filter, args.brand_filter, args);
                return res.json({
                  success: true,
                  action_executed: 'bulkUpdateProducts',
                  ai_message: `✅ Bulk operation completed: Successfully modified **${count}** products matching your criteria. *(Local Ollama Model: ${modelName})*`
                });
              } catch (err) {
                return res.json({ success: true, ai_message: `❌ Failed to execute bulk update.` });
              }
            } else if (toolCall.function.name === 'readProductData') {
              let args;
              try {
                args = JSON.parse(toolCall.function.arguments);
              } catch (e) {
                return res.json({ success: true, ai_message: `❌ Ollama returned invalid JSON for arguments: ${toolCall.function.arguments}` });
              }
              try {
                const markdownMsg = await handleReadProductData(pool, args, message);
                return res.json({ success: true, action_executed: 'readProductData', ai_message: markdownMsg + `\n\n*(Local Ollama Model: ${modelName})*` });
              } catch (err) {
                console.error("Error in readProductData:", err);
                return res.json({ success: true, ai_message: `❌ Failed to read product data: ${err.message}` });
              }
            } else if (toolCall.function.name === 'runAnalyticalQuery') {
              let args;
              try {
                args = JSON.parse(toolCall.function.arguments);
              } catch (e) {
                return res.json({ success: true, ai_message: `❌ Ollama returned invalid JSON for arguments: ${toolCall.function.arguments}` });
              }
              try {
                const reportMsg = await handleAnalyticalQuery(pool, args.sql_query);
                return res.json({
                  success: true,
                  action_executed: 'runAnalyticalQuery',
                  ai_message: reportMsg + `\n\n*(Local Ollama Model: ${modelName})*`
                });
              } catch (err) {
                return res.json({ success: true, ai_message: `❌ Query execution error: ${err.message}` });
              }
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
        return res.json({ success: true, ai_message: `❌ Ollama Agent Error: ${ollamaErr.message}` });
      }
    }

    // 1. Try Mistral AI if key is present
    if (mistralKey) {
      try {
        const messages = [
          {
            role: 'system',
            content: SYSTEM_PROMPT
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
            tools: [
              {
                type: 'function',
                function: {
                  name: 'createProduct',
                  description: 'Creates a new SKU catalog product and registers it in database inventory.',
                  parameters: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Product Name' },
                      category: { type: 'string', description: 'Catalog Category' },
                      price: { type: 'number', description: 'Selling price in PKR' },
                      stock: { type: 'integer', description: 'Initial stock units' },
                      image_url: { type: 'string', description: 'Product image URL (optional)' },
                      sku: { type: 'string', description: 'Product Code / SKU (e.g. C9200L-24T-4G)' },
                      barcode: { type: 'string', description: 'UPC Barcode (e.g. 889728248741)' },
                      brand: { type: 'string', description: 'Brand Name (e.g. Cisco)' },
                      description: { type: 'string', description: 'Product short description' },
                      unit: { type: 'string', description: 'Base unit of measure (e.g. PCS, units)' },
                      weight: { type: 'number', description: 'Weight of unit in kg' },
                      distributor_price: { type: 'number', description: 'Wholesale / distributor rate in PKR' },
                      min_wholesale_qty: { type: 'integer', description: 'Minimum wholesale quantity restriction' },
                      max_discount: { type: 'integer', description: 'Maximum discount percent (0-100)' },
                      karachi_stock: { type: 'integer', description: 'Karachi Central Depot stock level' },
                      lahore_stock: { type: 'integer', description: 'Lahore North Terminal stock level' },
                      low_stock_threshold: { type: 'integer', description: 'Low Stock trigger threshold limit' },
                      total_product_limit: { type: 'integer', description: 'Maximum total product limit capacity' }
                    },
                    required: ['name']
                  }
                }
              }
            ],
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
          if (toolCall.function.name === 'createProduct') {
            const args = JSON.parse(toolCall.function.arguments);
            if (attached_image) {
              args.image_url = attached_image;
            }
            const specs = extractSpecsFromMessage(message);
            mergeSpecsIntoArgs(args, specs);
            const newProduct = await createProductInDb(pool, args);
            return res.json({
              success: true,
              action_executed: 'createProduct',
              ai_message: `✅ Created: **${args.name}** (${args.category || 'N/A'}). Price: ${args.price !== undefined && args.price !== null ? 'Rs ' + args.price.toLocaleString() : 'N/A'}, Stock: ${args.stock !== undefined && args.stock !== null ? args.stock : 'N/A'}. SKU: ${newProduct.sku}.`,
              product: newProduct
            });
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
            content: SYSTEM_PROMPT
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
            tools: [
              {
                type: 'function',
                function: {
                  name: 'createProduct',
                  description: 'Creates a new SKU catalog product and registers it in database inventory.',
                  parameters: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Product Name' },
                      category: { type: 'string', description: 'Catalog Category' },
                      price: { type: 'number', description: 'Selling price in PKR' },
                      stock: { type: 'integer', description: 'Initial stock units' },
                      image_url: { type: 'string', description: 'Product image URL (optional)' },
                      sku: { type: 'string', description: 'Product Code / SKU (e.g. C9200L-24T-4G)' },
                      barcode: { type: 'string', description: 'UPC Barcode (e.g. 889728248741)' },
                      brand: { type: 'string', description: 'Brand Name (e.g. Cisco)' },
                      description: { type: 'string', description: 'Product short description' },
                      unit: { type: 'string', description: 'Base unit of measure (e.g. PCS, units)' },
                      weight: { type: 'number', description: 'Weight of unit in kg' },
                      distributor_price: { type: 'number', description: 'Wholesale / distributor rate in PKR' },
                      min_wholesale_qty: { type: 'integer', description: 'Minimum wholesale quantity restriction' },
                      max_discount: { type: 'integer', description: 'Maximum discount percent (0-100)' },
                      karachi_stock: { type: 'integer', description: 'Karachi Central Depot stock level' },
                      lahore_stock: { type: 'integer', description: 'Lahore North Terminal stock level' },
                      low_stock_threshold: { type: 'integer', description: 'Low Stock trigger threshold limit' },
                      total_product_limit: { type: 'integer', description: 'Maximum total product limit capacity' }
                    },
                    required: ['name']
                  }
                }
              }
            ]
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
          if (toolCall.function.name === 'createProduct') {
            const args = JSON.parse(toolCall.function.arguments);
            if (attached_image) {
              args.image_url = attached_image;
            }
            const specs = extractSpecsFromMessage(message);
            mergeSpecsIntoArgs(args, specs);
            const newProduct = await createProductInDb(pool, args);
            return res.json({
              success: true,
              action_executed: 'createProduct',
              ai_message: `✅ Created: **${args.name}** (${args.category || 'N/A'}). Price: ${args.price !== undefined && args.price !== null ? 'Rs ' + args.price.toLocaleString() : 'N/A'}, Stock: ${args.stock !== undefined && args.stock !== null ? args.stock : 'N/A'}. SKU: ${newProduct.sku}.`,
              product: newProduct
            });
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
          systemInstruction: SYSTEM_PROMPT,
        });

        const createProductTool = {
          name: 'createProduct',
          description: 'Creates a new SKU catalog product and registers it in database inventory.',
          parameters: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'Product Name' },
              category: { type: 'STRING', description: 'Catalog Category' },
              price: { type: 'NUMBER', description: 'Selling price in PKR' },
              stock: { type: 'INTEGER', description: 'Initial stock units' },
              image_url: { type: 'STRING', description: 'Product image URL (optional)' },
              sku: { type: 'STRING', description: 'Product Code / SKU (e.g. C9200L-24T-4G)' },
              barcode: { type: 'STRING', description: 'UPC Barcode (e.g. 889728248741)' },
              brand: { type: 'STRING', description: 'Brand Name (e.g. Cisco)' },
              description: { type: 'STRING', description: 'Product short description' },
              unit: { type: 'STRING', description: 'Base unit of measure (e.g. PCS, units)' },
              weight: { type: 'NUMBER', description: 'Weight of unit in kg' },
              distributor_price: { type: 'NUMBER', description: 'Wholesale / distributor rate in PKR' },
              min_wholesale_qty: { type: 'INTEGER', description: 'Minimum wholesale quantity restriction' },
              max_discount: { type: 'INTEGER', description: 'Maximum discount percent (0-100)' },
              karachi_stock: { type: 'INTEGER', description: 'Karachi Central Depot stock level' },
              lahore_stock: { type: 'INTEGER', description: 'Lahore North Terminal stock level' },
              low_stock_threshold: { type: 'INTEGER', description: 'Low Stock trigger threshold limit' },
              total_product_limit: { type: 'INTEGER', description: 'Maximum total product limit capacity' }
            },
            required: ['name']
          }
        };

        const chatHistory = (history || []).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

        const chat = model.startChat({
          history: chatHistory,
          tools: [{ functionDeclarations: [createProductTool] }]
        });

        const result = await chat.sendMessage(message);
        const response = result.response;
        
        const calls = response.functionCalls;
        if (calls && calls.length > 0) {
          const call = calls[0];
          if (call.name === 'createProduct') {
            const args = call.args;
            if (attached_image) {
              args.image_url = attached_image;
            }
            const specs = extractSpecsFromMessage(message);
            mergeSpecsIntoArgs(args, specs);
            const newProduct = await createProductInDb(pool, args);
            return res.json({
              success: true,
              action_executed: 'createProduct',
              ai_message: `✅ Created: **${args.name}** (${args.category || 'N/A'}). Price: ${args.price !== undefined && args.price !== null ? 'Rs ' + args.price.toLocaleString() : 'N/A'}, Stock: ${args.stock !== undefined && args.stock !== null ? args.stock : 'N/A'}. SKU: ${newProduct.sku}.`,
              product: newProduct
            });
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

    // 4. Fallback locally if keys are not working
    return handleLocalFallback(pool, message, attached_image, res);
  });
}

module.exports = { registerCopilotRoutes };
