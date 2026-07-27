const { GoogleGenerativeAI } = require('@google/generative-ai');
const { 
  createProductInDb, deleteProductFromDb, updateProductInDb, bulkUpdateProductsInDb, searchProductsInDb, getCategoryProductsFromDb, getLowStockProductsFromDb,
  createSupplierInDb, updateSupplierInDb, deleteSupplierFromDb, searchSuppliersInDb, filterSuppliersByLocationInDb,
  listOrdersFromDb, getOrderByIdFromDb, getOrdersByStatusFromDb, getOrdersByCustomerFromDb, getOrdersByDateRangeFromDb,
  getOrdersByAmountFilterFromDb, updateOrderStatusInDb, bulkApproveOrdersInDb, getOrderAnalyticsFromDb,
  getTopBuyersFromDb, getMostOrderedProductsFromDb, getOverdueOrdersFromDb, getOrdersByProductFromDb
} = require('./adminOperations');
const { getDistributorWholesaleProductsFromDb, getDistributorQuotationsFromDb, getDistributorOrdersFromDb, getDistributorLedgerStatusFromDb } = require('./distributorOperations');

const SYSTEM_PROMPT = 'You are CIQ Admin Copilot, an AI catalog, vendor, and order management assistant. You are strictly restricted to: creating products ("createProduct"), updating products ("updateProduct"), deleting products ("deleteProduct"), bulk updating categories ("bulkUpdateProducts"), reading product/stock data ("readProductData"), creating suppliers ("createSupplier"), updating suppliers ("updateSupplier"), deleting suppliers ("deleteSupplier"), reading/searching supplier records ("readSupplierData"), and all order management operations including listing, filtering, searching, approving, rejecting, shipping orders, and running order analytics ("manageOrders"). If the user asks about anything outside this scope, decline stating: "I can only assist with registered catalog inventory, supplier management, and order operations." Keep answers short and direct. IMPORTANT: For create operations, do NOT invent default details if not explicitly specified.';
const DISTRIBUTOR_SYSTEM_PROMPT = 'You are CIQ Distributor Copilot, an AI partner assistant for wholesale distributors. You assist distributors with checking wholesale pricing, stock availability, quotations, orders, and partner account info. You are strictly prohibited from performing administrator tasks such as creating products, updating baseline catalog prices, deleting catalog items, altering system configurations, or managing suppliers. If the user asks for administrator operations, you MUST decline, stating: "❌ Security Restriction: As a Distributor Partner, you do not have authorization to modify catalog products or supplier records. Admin permissions are required." Keep your answers concise, helpful, and partner-focused.';

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
          enum: ['list', 'find', 'by_status', 'by_customer', 'by_date_range', 'by_amount', 'by_product', 'update_status', 'bulk_approve', 'analytics', 'top_buyers', 'top_products', 'overdue'],
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

  const list = [
    fnCreateProduct, fnDeleteProduct, fnUpdateProduct, fnBulkUpdateProducts, fnReadProductData, fnRunAnalyticalQuery,
    fnCreateSupplier, fnUpdateSupplier, fnDeleteSupplier, fnReadSupplierData, fnManageOrders
  ];

  if (isGemini) {
    return list;
  }
  return list.map(fn => ({ type: 'function', function: fn }));
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
  }
  throw new Error(`Unknown tool name: ${name}`);
}

function formatOrdersTable(rows, title) {
  if (rows.length === 0) return `ℹ️ No orders found.`;
  return `### ${title}\n\n| Order # | Status | Amount (PKR) | Customer | Date |\n|---|---|---|---|---|\n` +
    rows.map(r => `| ${r.order_number || r.order_id} | ${r.status} | Rs ${parseFloat(r.total_amount).toLocaleString()} | ${r.customer_email} | ${r.order_date ? new Date(r.order_date).toLocaleDateString() : 'N/A'} |`).join('\n');
}

async function handleManageOrders(pool, args, message) {
  const action = args.action_type;
  // Parse order type: B2C = buyer/retail, B2B = distributor/wholesale
  const orderType = args.order_type || null;
  const typeLabel = orderType === 'B2C' ? ' (Buyers / B2C)' : orderType === 'B2B' ? ' (Distributors / B2B)' : '';

  if (action === 'list') {
    const rows = await listOrdersFromDb(pool, args.limit || 20, orderType);
    return formatOrdersTable(rows, `📋 Recent Orders${typeLabel} (Last ${args.limit || 20})`);
  }
  if (action === 'find') {
    const rows = await getOrderByIdFromDb(pool, args.identifier || '');
    if (rows.length === 0) return `❌ No order found matching: "${args.identifier}"`;
    return formatOrdersTable(rows, `🔍 Order Search: "${args.identifier}"`);
  }
  if (action === 'by_status') {
    const rows = await getOrdersByStatusFromDb(pool, args.status || 'PENDING', orderType);
    return formatOrdersTable(rows, `📊 ${(args.status || 'PENDING').toUpperCase()} Orders${typeLabel}`);
  }
  if (action === 'by_customer') {
    const rows = await getOrdersByCustomerFromDb(pool, args.identifier || '', orderType);
    return formatOrdersTable(rows, `👤 Orders for Customer: "${args.identifier}"${typeLabel}`);
  }
  if (action === 'by_date_range') {
    const rows = await getOrdersByDateRangeFromDb(pool, args.date_from, args.date_to, orderType);
    return formatOrdersTable(rows, `📅 Orders from ${args.date_from} to ${args.date_to}${typeLabel}`);
  }
  if (action === 'by_amount') {
    const op = args.amount_operator || 'above';
    const rows = await getOrdersByAmountFilterFromDb(pool, op, args.amount || 0, orderType);
    return formatOrdersTable(rows, `💰 Orders ${op} Rs ${(args.amount || 0).toLocaleString()}${typeLabel}`);
  }
  if (action === 'by_product') {
    const rows = await getOrdersByProductFromDb(pool, args.product_name || '');
    if (rows.length === 0) return `❌ No orders found containing product: "${args.product_name}"`;
    return formatOrdersTable(rows, `📦 Orders Containing: "${args.product_name}"`);
  }
  if (action === 'update_status') {
    const updated = await updateOrderStatusInDb(pool, args.identifier, args.new_status || args.status);
    return `✅ Order **${updated.order_number}** status updated to **${updated.status}**.`;
  }
  if (action === 'bulk_approve') {
    const rows = await bulkApproveOrdersInDb(pool);
    if (rows.length === 0) return `ℹ️ No pending orders to approve.`;
    return `✅ Bulk Approved **${rows.length}** pending order(s):\n\n` +
      rows.map(r => `- ${r.order_number} (${r.customer_email})`).join('\n');
  }
  if (action === 'analytics') {
    const period = args.period || 'month';
    const data = await getOrderAnalyticsFromDb(pool, period);
    const t = data.totals;
    const periodLabel = { today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time' }[period] || period;
    let md = `### 📊 Order Analytics — ${periodLabel}${typeLabel}\n\n`;
    md += `| Metric | Value |\n|---|---|\n`;
    md += `| Total Orders | **${t.total_orders}** |\n`;
    md += `| Total Revenue | **Rs ${parseFloat(t.total_revenue).toLocaleString('en-PK', {maximumFractionDigits:0})}** |\n`;
    md += `| Avg Order Value | **Rs ${parseFloat(t.avg_order_value).toLocaleString('en-PK', {maximumFractionDigits:0})}** |\n\n`;
    if (data.by_status.length > 0) {
      md += `**By Status:**\n\n| Status | Count |\n|---|---|\n`;
      md += data.by_status.map(s => `| ${s.status} | ${s.count} |`).join('\n');
    }
    return md;
  }
  if (action === 'top_buyers') {
    const rows = await getTopBuyersFromDb(pool, args.limit || 5);
    if (rows.length === 0) return `ℹ️ No order data found.`;
    return `### 🏆 Top ${args.limit || 5} Buyers by Order Value\n\n| Rank | Customer | Orders | Total Spent |\n|---|---|---|---|\n` +
      rows.map((r, i) => `| ${i+1} | ${r.customer_email} | ${r.order_count} | Rs ${parseFloat(r.total_spent).toLocaleString('en-PK', {maximumFractionDigits:0})} |`).join('\n');
  }
  if (action === 'top_products') {
    const rows = await getMostOrderedProductsFromDb(pool, args.limit || 10);
    if (rows.length === 0) return `ℹ️ No order product data found.`;
    return `### 🔥 Most Ordered Products\n\n| Rank | Product | Total Qty | Orders |\n|---|---|---|---|\n` +
      rows.map((r, i) => `| ${i+1} | ${r.product_name || 'N/A'} | ${r.total_qty || 0} | ${r.order_count} |`).join('\n');
  }
  if (action === 'overdue') {
    const days = args.days || 3;
    const rows = await getOverdueOrdersFromDb(pool, days, orderType);
    if (rows.length === 0) return `✅ No overdue pending orders (threshold: ${days} days)${typeLabel}.`;
    return formatOrdersTable(rows, `⚠️ Overdue Orders (Pending > ${days} days)${typeLabel}`);
  }
  return `❌ Unknown order action: "${action}"`;
}

async function handleLocalFallback(pool, message, attached_image, res, role = 'ADMIN') {
  const lowerMsg = message.toLowerCase();

  // ── DISTRIBUTOR PARTNER FALLBACKS ──────────────────────────────────────────
  if (role === 'DISTRIBUTOR' || /\b(wholesale|distributor|quotation|quote|bid|order|po|ledger|credit limit)\b/i.test(lowerMsg)) {
    if (/\b(quotation|quote|bid)\b/i.test(lowerMsg)) {
      try {
        const rows = await getDistributorQuotationsFromDb(pool);
        if (rows.length === 0) return res.json({ success: true, ai_message: "ℹ️ No active partner quotations found in record." });
        const md = "### 📋 Distributor Partner Quotations\n\n| Quote ID | Product / Item | Requested Price | Status |\n|---|---|---|---|\n" +
          rows.map(r => `| ${r.quotation_id || r.id || 'QUO-9012'} | ${r.product_name || r.item || 'Wholesale Batch'} | Rs ${Number(r.requested_price || r.price || 0).toLocaleString()} | ${r.status || 'UNDER_REVIEW'} |`).join("\n");
        return res.json({ success: true, action_executed: "getDistributorQuotations", ai_message: md });
      } catch (err) {
        return res.json({ success: true, ai_message: `❌ Error fetching quotations: ${err.message}` });
      }
    }

    if (/\b(order|po|shipping|logistics|shipment|depot)\b/i.test(lowerMsg)) {
      try {
        const rows = await getDistributorOrdersFromDb(pool);
        if (rows.length === 0) return res.json({ success: true, ai_message: "ℹ️ No B2B purchase orders found in partner history." });
        const md = "### 🚚 Distributor B2B Purchase Orders\n\n| Order # | Date | Status | Warehouse Depot | Total Amount |\n|---|---|---|---|---|\n" +
          rows.map(r => `| ${r.order_number || r.id || 'ORD-PO-4812'} | ${r.order_date || 'Recent'} | ${r.status || 'PROCESSING'} | ${r.warehouse_depot || 'Karachi Central'} | Rs ${Number(r.total_amount || 0).toLocaleString()} |`).join("\n");
        return res.json({ success: true, action_executed: "getDistributorOrders", ai_message: md });
      } catch (err) {
        return res.json({ success: true, ai_message: `❌ Error fetching orders: ${err.message}` });
      }
    }

    if (/\b(credit|ledger|invoice|balance|terms)\b/i.test(lowerMsg)) {
      try {
        const ledger = await getDistributorLedgerStatusFromDb(pool);
        const md = `### 💳 Distributor Financial Ledger & Credit Status\n\n- **Approved Credit Limit**: Rs ${Number(ledger.credit_limit || 2500000).toLocaleString()}\n- **Used Credit**: Rs ${Number(ledger.used_credit || 450000).toLocaleString()}\n- **Available Credit Balance**: Rs ${Number(ledger.remaining_credit || 2050000).toLocaleString()}\n- **Outstanding Invoices**: ${ledger.open_invoices || 1} open (${ledger.payment_terms || 'NET-30'} Terms)`;
        return res.json({ success: true, action_executed: "getDistributorLedgerStatus", ai_message: md });
      } catch (err) {
        return res.json({ success: true, ai_message: `❌ Error fetching ledger status: ${err.message}` });
      }
    }

    // Default distributor catalog query
    try {
      const rows = await getDistributorWholesaleProductsFromDb(pool);
      const md = "### 📦 Wholesale Product Catalog & Stock\n\n| SKU | Product Name | Wholesale Price | Minimum Order Qty | Available Stock |\n|---|---|---|---|---|\n" +
        rows.map(r => `| ${r.sku} | ${r.product_name} | Rs ${Number(r.distributor_price || r.price).toLocaleString()} | ${r.min_wholesale_qty || 10} units | ${(r.karachi_stock || 0) + (r.lahore_stock || 0)} units |`).join("\n");
      return res.json({ success: true, action_executed: "getDistributorWholesaleProducts", ai_message: md });
    } catch (err) {
      return res.json({ success: true, ai_message: `❌ Error fetching wholesale products: ${err.message}` });
    }
  }

  // ── ORDER MANAGEMENT FALLBACKS ────────────────────────────────────────────

  // Bulk approve all pending orders
  if (/bulk\s+approve\s+(?:all\s+)?(?:pending\s+)?orders?/i.test(lowerMsg) ||
      /approve\s+all\s+(?:pending\s+)?orders?/i.test(lowerMsg)) {
    try {
      const md = await handleManageOrders(pool, { action_type: 'bulk_approve' }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md + '\n\n*(Local fallback)*' });
    } catch (err) { return res.json({ success: true, ai_message: `❌ Error: ${err.message}` }); }
  }

  // Approve / Reject / Ship a specific order
  const statusUpdateMatch = message.match(/\b(approve|reject|ship|cancel|complete)\s+order\s+([\w-]+)/i);
  if (statusUpdateMatch) {
    const verb = statusUpdateMatch[1].toLowerCase();
    const statusMap = { approve: 'APPROVED', reject: 'REJECTED', ship: 'SHIPPED', cancel: 'CANCELLED', complete: 'COMPLETED' };
    const identifier = statusUpdateMatch[2];
    try {
      const md = await handleManageOrders(pool, { action_type: 'update_status', identifier, new_status: statusMap[verb] }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md + '\n\n*(Local fallback)*' });
    } catch (err) { return res.json({ success: true, ai_message: `❌ ${err.message}` }); }
  }

  // Find a specific order by ID/number
  const findOrderMatch = message.match(/(?:find|show|get|check|search)\s+order\s+([\w-]+)/i);
  if (findOrderMatch) {
    try {
      const md = await handleManageOrders(pool, { action_type: 'find', identifier: findOrderMatch[1] }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md + '\n\n*(Local fallback)*' });
    } catch (err) { return res.json({ success: true, ai_message: `❌ Error: ${err.message}` }); }
  }

  // Orders by status with optional buyer/distributor filter
  // Examples: "show rejected orders of buyer", "pending distributor orders", "approved B2C orders"
  const statusFilterMatch = lowerMsg.match(/\b(pending|approved|rejected|shipped|cancelled|completed)\s+orders?(?:\s+of)?(?:\s+(?:buyer|b2c|retail|customer|distributor|b2b|wholesale))?\b/) ||
    lowerMsg.match(/(?:buyer|b2c|retail|distributor|b2b|wholesale)\s+(?:pending|approved|rejected|shipped|cancelled|completed)\s+orders?/);
  if (statusFilterMatch) {
    const statusWord = lowerMsg.match(/\b(pending|approved|rejected|shipped|cancelled|completed)\b/)?.[1] || 'pending';
    // Detect buyer vs distributor
    const isBuyer = /\b(buyer|b2c|retail|customer)\b/i.test(lowerMsg);
    const isDistributor = /\b(distributor|b2b|wholesale)\b/i.test(lowerMsg);
    const orderType = isBuyer ? 'B2C' : isDistributor ? 'B2B' : null;
    try {
      const md = await handleManageOrders(pool, { action_type: 'by_status', status: statusWord, order_type: orderType }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md + '\n\n*(Local fallback)*' });
    } catch (err) { return res.json({ success: true, ai_message: `❌ Error: ${err.message}` }); }
  }

  // Overdue orders: "orders pending more than 3 days", "overdue orders"
  const overdueMatch = lowerMsg.match(/overdue\s+orders?/) ||
    lowerMsg.match(/orders?\s+pending\s+(?:for\s+)?(?:more than|over|greater than)\s+(\d+)\s+days?/);
  if (overdueMatch) {
    const days = overdueMatch[1] ? parseInt(overdueMatch[1]) : 3;
    try {
      const md = await handleManageOrders(pool, { action_type: 'overdue', days }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md + '\n\n*(Local fallback)*' });
    } catch (err) { return res.json({ success: true, ai_message: `❌ Error: ${err.message}` }); }
  }

  // High value / by amount: "orders above 50000", "orders below 10000"
  const amountFilterMatch = message.match(/orders?\s+(above|over|greater than|below|under|less than)\s+(?:rs\.?\s*)?(\d+)/i);
  if (amountFilterMatch) {
    const op = /above|over|greater/.test(amountFilterMatch[1]) ? 'above' : 'below';
    try {
      const md = await handleManageOrders(pool, { action_type: 'by_amount', amount_operator: op, amount: parseFloat(amountFilterMatch[2]) }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md + '\n\n*(Local fallback)*' });
    } catch (err) { return res.json({ success: true, ai_message: `❌ Error: ${err.message}` }); }
  }

  // Top buyers: "top buyers", "top 5 buyers"
  if (/top\s+(?:\d+\s+)?buyers?|best\s+customers?/i.test(lowerMsg)) {
    const limitMatch = lowerMsg.match(/top\s+(\d+)\s+buyers?/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 5;
    try {
      const md = await handleManageOrders(pool, { action_type: 'top_buyers', limit }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md + '\n\n*(Local fallback)*' });
    } catch (err) { return res.json({ success: true, ai_message: `❌ Error: ${err.message}` }); }
  }

  // Most ordered / top products: "most ordered products", "top products"
  if (/(?:most\s+ordered|top\s+products?|best[\s-]selling\s+products?)/i.test(lowerMsg)) {
    const limitMatch = lowerMsg.match(/top\s+(\d+)\s+products?/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 10;
    try {
      const md = await handleManageOrders(pool, { action_type: 'top_products', limit }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md + '\n\n*(Local fallback)*' });
    } catch (err) { return res.json({ success: true, ai_message: `❌ Error: ${err.message}` }); }
  }

  // Analytics / Revenue: "revenue this month", "order analytics", "total revenue"
  if (/(?:revenue|order\s+analytics?|total\s+(?:revenue|sales)|how\s+many\s+orders?)/i.test(lowerMsg)) {
    let period = 'month';
    if (/today/i.test(lowerMsg)) period = 'today';
    else if (/this\s+week|last\s+7\s+days?/i.test(lowerMsg)) period = 'week';
    else if (/all\s+time|ever|total/i.test(lowerMsg)) period = 'all';
    try {
      const md = await handleManageOrders(pool, { action_type: 'analytics', period }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md + '\n\n*(Local fallback)*' });
    } catch (err) { return res.json({ success: true, ai_message: `❌ Error: ${err.message}` }); }
  }

  // Orders containing a specific product
  const byProductMatch = message.match(/orders?\s+(?:containing|with|for|of)\s+(?:product\s+)?["']?([^"'\n,]+?)["']?\s*(?:$|[?.!])/i);
  if (byProductMatch) {
    try {
      const md = await handleManageOrders(pool, { action_type: 'by_product', product_name: byProductMatch[1].trim() }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md + '\n\n*(Local fallback)*' });
    } catch (err) { return res.json({ success: true, ai_message: `❌ Error: ${err.message}` }); }
  }

  // Orders by customer email
  const byCustomerMatch = message.match(/orders?\s+(?:from|by|for)\s+(?:customer\s+)?(\S+@\S+)/i);
  if (byCustomerMatch) {
    try {
      const md = await handleManageOrders(pool, { action_type: 'by_customer', identifier: byCustomerMatch[1] }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md + '\n\n*(Local fallback)*' });
    } catch (err) { return res.json({ success: true, ai_message: `❌ Error: ${err.message}` }); }
  }

  // List all orders (general)
  if (/\b(?:list|show|get|display)\s+(?:all\s+)?orders?\b/i.test(lowerMsg) ||
      /\ball\s+orders?\b/i.test(lowerMsg)) {
    const limitMatch = lowerMsg.match(/(?:last|recent)\s+(\d+)\s+orders?/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 20;
    try {
      const md = await handleManageOrders(pool, { action_type: 'list', limit }, message);
      return res.json({ success: true, action_executed: 'manageOrders', ai_message: md + '\n\n*(Local fallback)*' });
    } catch (err) { return res.json({ success: true, ai_message: `❌ Error: ${err.message}` }); }
  }

  // ── END ORDER FALLBACKS ───────────────────────────────────────────────────

  if (/\b(add|create|onboard|register)\s+supplier\b/i.test(lowerMsg)) {
    const specs = extractSupplierSpecsFromMessage(message);
    if (!specs.company_name) {
      return res.json({
        success: true,
        ai_message: `❌ Please specify the supplier name. Pattern: "Add supplier company: [Name], contact: [Person], email: [Email], city: [City]"`
      });
    }
    try {
      const newSup = await createSupplierInDb(pool, specs);
      return res.json({
        success: true,
        action_executed: 'createSupplier',
        ai_message: `✅ Onboarded Supplier: **${newSup.company_name}** (${newSup.city || 'N/A'}, ${newSup.country || 'N/A'}). Contact Person: ${newSup.contact_person || 'N/A'}. *(Local fallback)*`,
        supplier: newSup
      });
    } catch (err) {
      return res.json({ success: true, ai_message: `❌ Failed to create supplier: ${err.message}` });
    }
  }

  if (/\b(update|edit|change)\s+supplier\b/i.test(lowerMsg)) {
    const specs = extractSupplierSpecsFromMessage(message);
    const match = message.match(/(?:update|edit|change)\s+supplier\s+([^\n,:]+)/i);
    let identifier = match ? match[1].trim() : '';
    if (!identifier && specs.company_name) {
      identifier = specs.company_name;
    }
    if (!identifier) {
      return res.json({
        success: true,
        ai_message: `❌ Please specify which supplier to update. Pattern: "Update supplier [Company Name] contact: [New Person]"`
      });
    }
    const mapped = {};
    if (specs.company_name) mapped.new_company_name = specs.company_name;
    if (specs.contact_person) mapped.new_contact_person = specs.contact_person;
    if (specs.email) mapped.new_email = specs.email;
    if (specs.phone) mapped.new_phone = specs.phone;
    if (specs.city) mapped.new_city = specs.city;
    if (specs.country) mapped.new_country = specs.country;

    try {
      const updated = await updateSupplierInDb(pool, identifier, mapped);
      return res.json({
        success: true,
        action_executed: 'updateSupplier',
        ai_message: `✅ Updated Supplier profile: **${updated.company_name}** (Edits applied successfully). *(Local fallback)*`
      });
    } catch (err) {
      return res.json({ success: true, ai_message: `❌ Could not find or update supplier: ${err.message}` });
    }
  }

  if (/\b(delete|remove)\s+supplier\b/i.test(lowerMsg)) {
    const match = message.match(/(?:delete|remove)\s+supplier\s+([^\n,:]+)/i);
    const identifier = match ? match[1].trim() : '';
    if (!identifier) {
      return res.json({
        success: true,
        ai_message: `❌ Please specify which supplier to delete. Pattern: "Delete supplier [Company Name]"`
      });
    }
    try {
      const deleted = await deleteSupplierFromDb(pool, identifier);
      return res.json({
        success: true,
        action_executed: 'deleteSupplier',
        ai_message: `✅ Deleted Supplier: **${deleted.company_name}** (ID: ${deleted.supplier_id}). *(Local fallback)*`
      });
    } catch (err) {
      return res.json({ success: true, ai_message: `❌ Could not delete supplier: ${err.message}` });
    }
  }

  // Location-based supplier filter: "suppliers from Karachi", "show suppliers in Pakistan"
  const locationFromMatch = message.match(/(?:suppliers?|vendors?)\s+(?:from|in|based in|located in)\s+([\w\s]+?)(?:\s*$|[,?!])/i)
    || message.match(/(?:from|in|based in|located in)\s+([\w\s]+?)\s+(?:suppliers?|vendors?)/i);
  const countryOnlyMatch = message.match(/(?:show|list|find|get|display)\s+(?:all\s+)?(?:suppliers?|vendors?)\s+(?:from|in)\s+([\w\s]+)/i);
  if (locationFromMatch || countryOnlyMatch) {
    const locationRaw = (locationFromMatch ? locationFromMatch[1] : countryOnlyMatch[1]).trim();
    // Determine if it sounds like a city or country (heuristic: use as both city and country)
    const cityGuess = locationRaw;
    const countryGuess = locationRaw;
    try {
      // Try city first, then country if no results
      let rows = await filterSuppliersByLocationInDb(pool, cityGuess, null);
      if (rows.length === 0) rows = await filterSuppliersByLocationInDb(pool, null, countryGuess);
      const md = rows.length === 0
        ? `❌ No suppliers found in location: "${locationRaw}"`
        : `### 📍 Suppliers in ${locationRaw}\n\n| Company Name | Contact Person | Email | Phone | Location |\n|---|---|---|---|---|\n` +
          rows.map(r => `| ${r.company_name} | ${r.contact_person || 'N/A'} | ${r.email || 'N/A'} | ${r.phone || 'N/A'} | ${r.city || 'N/A'}, ${r.country || 'N/A'} |`).join('\n');
      return res.json({
        success: true,
        action_executed: 'readSupplierData',
        ai_message: md + `\n\n*(Local fallback)*`
      });
    } catch (err) {
      return res.json({ success: true, ai_message: `❌ Error filtering suppliers: ${err.message}` });
    }
  }

  if (/\b(search|find|list|show|check)\s+suppliers?\b/i.test(lowerMsg)) {
    const match = message.match(/(?:search|find|show|check)\s+supplier(?:s)?\s+([^\n,:]+)/i);
    const identifier = match ? match[1].trim() : '';
    try {
      const md = await handleReadSupplierData(pool, { action_type: identifier ? 'search' : 'list_all', identifier }, message);
      return res.json({
        success: true,
        action_executed: 'readSupplierData',
        ai_message: md + `\n\n*(Local fallback)*`
      });
    } catch (err) {
      return res.json({ success: true, ai_message: `❌ Error reading suppliers: ${err.message}` });
    }
  }

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
    ai_message: `Please set MISTRAL_API_KEY, GEMINI_API_KEY or OPENAI_API_KEY environment variables to use live AI. Or type: "Add supplier company: [Name], contact: [Person]"`
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
  const handleChat = async (req, res, defaultRole) => {
    const { message, history, attached_image, portal_role, user_name } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message payload is required.' });
    }

    const role = (portal_role || defaultRole).toUpperCase();
    const displayName = user_name || (role === 'DISTRIBUTOR' ? 'Partner' : 'Saif');
    const effectiveSystemPrompt = role === 'DISTRIBUTOR' ? DISTRIBUTOR_SYSTEM_PROMPT : SYSTEM_PROMPT;

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

    // Role security check: Distributors cannot modify or delete catalog items
    if (role === 'DISTRIBUTOR') {
      const isAdminModification = /\b(delete|remove product|create product|add product|bulk update|alter catalog|drop table|truncate|update price|change price)\b/i.test(lowerMsg);
      if (isAdminModification && !/\b(my order|quotation|quote|my cart)\b/i.test(lowerMsg)) {
        return res.json({
          success: true,
          ai_message: `❌ Security Restriction: As a Distributor Partner, you do not have authorization to modify or delete baseline catalog products. Admin permissions are required.`
        });
      }
    }

    // 1. Simple greetings
    const isGreeting = /^(hello|hi|hey|greetings|good morning|good afternoon|good evening)\b/i.test(lowerMsg);
    if (isGreeting && lowerMsg.split(/\s+/).length <= 3) {
      return res.json({
        success: true,
        ai_message: `Hello ${displayName}! I am your ${role === 'DISTRIBUTOR' ? 'CIQ Distributor Copilot' : 'CIQ Admin Copilot'}. How can I assist you today?`
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

        const response = await fetch('http://localhost:11434/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            messages: messages,
            tools: getAdminTools(false),
            tool_choice: 'auto'
          })
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
              const executionResult = await executeCopilotTool(pool, functionName, args, message, attached_image);
              return res.json({
                success: true,
                ...executionResult,
                ai_message: executionResult.ai_message + `\n\n*(Local Ollama Model: ${modelName})*`
              });
            } catch (err) {
              return res.json({ success: true, ai_message: `❌ Tool execution error: ${err.message}` });
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
            return res.json({ success: true, ai_message: `❌ Tool execution error: ${err.message}` });
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
            return res.json({ success: true, ai_message: `❌ Tool execution error: ${err.message}` });
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

    // 4. Fallback locally if keys are not working
    return handleLocalFallback(pool, message, attached_image, res, role);
  };

  app.post('/api/copilot/chat', (req, res) => handleChat(req, res, 'ADMIN'));
  app.post('/api/copilot/distributor/chat', (req, res) => handleChat(req, res, 'DISTRIBUTOR'));
}

module.exports = { registerCopilotRoutes };
