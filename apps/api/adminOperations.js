const { upsertProductEmbedding } = require('./embeddings');

async function createProductInDb(pool, data) {
  const nameVal = data.name || data.product_name;
  const catVal = data.category || null;
  const brandVal = data.brand || null;
  const descVal = data.description || data.short_description || null;

  let priceRetail = null;
  if (data.price !== undefined && data.price !== null) {
    priceRetail = parseFloat(data.price);
  } else if (data.retail_price !== undefined && data.retail_price !== null) {
    priceRetail = parseFloat(data.retail_price);
  } else if (data.prices && data.prices.RETAIL !== undefined && data.prices.RETAIL !== null) {
    priceRetail = parseFloat(data.prices.RETAIL);
  }

  let priceDist = null;
  if (data.distributor_price !== undefined && data.distributor_price !== null) {
    priceDist = parseFloat(data.distributor_price);
  } else if (data.prices && data.prices.DISTRIBUTOR !== undefined && data.prices.DISTRIBUTOR !== null) {
    priceDist = parseFloat(data.prices.DISTRIBUTOR);
  }

  const prices = {
    RETAIL: priceRetail,
    DISTRIBUTOR: priceDist,
    VIP: priceDist,
    CUSTOM: priceDist
  };

  let kStock = null;
  let lStock = null;
  if (data.karachi_stock !== undefined && data.karachi_stock !== null) {
    kStock = parseInt(data.karachi_stock);
  }
  if (data.lahore_stock !== undefined && data.lahore_stock !== null) {
    lStock = parseInt(data.lahore_stock);
  }
  if (data.stock !== undefined && data.stock !== null && data.karachi_stock === undefined && data.lahore_stock === undefined) {
    kStock = parseInt(data.stock);
  }

  let inventory = [];
  if (data.inventory) {
    inventory = data.inventory;
  } else {
    if (kStock !== null) {
      inventory.push({
        warehouse_id: 'wh-1',
        warehouse_name: 'Karachi Central Depot',
        city: 'Karachi',
        country: 'Pakistan',
        quantity: kStock,
        reserved_quantity: 0,
        available_quantity: kStock
      });
    }
    if (lStock !== null) {
      inventory.push({
        warehouse_id: 'wh-2',
        warehouse_name: 'Lahore North Terminal',
        city: 'Lahore',
        country: 'Pakistan',
        quantity: lStock,
        reserved_quantity: 0,
        available_quantity: lStock
      });
    }
  }

  const cleanedSku = data.sku || data.product_code || `SKU-AI-${Math.floor(1000 + Math.random() * 9000)}`;
  const cleanedBarcode = data.barcode || data.upc_barcode || null;
  const newProdId = data.product_id || `p-${Date.now()}`;

  const unitVal = data.unit || null;
  const weightVal = data.weight !== undefined && data.weight !== null ? parseFloat(data.weight) : null;
  const imageUrl = data.image_url || null;
  const minWhQty = data.min_wholesale_qty !== undefined && data.min_wholesale_qty !== null ? parseInt(data.min_wholesale_qty) : null;
  const maxDisc = data.max_discount !== undefined && data.max_discount !== null ? parseInt(data.max_discount) : null;
  const limit = data.total_product_limit !== undefined && data.total_product_limit !== null ? parseInt(data.total_product_limit) : null;
  const lowStockVal = data.low_stock_threshold !== undefined && data.low_stock_threshold !== null ? parseInt(data.low_stock_threshold) : null;

  await pool.query(
    `INSERT INTO products (
      product_id, sku, barcode, product_name, short_description, brand, 
      category, unit, weight, status, low_stock_threshold, overstock_threshold, 
      dead_stock_days, total_product_limit, prices, inventory, image_url, min_wholesale_qty, max_discount
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    ON CONFLICT (sku) DO UPDATE SET 
      barcode = EXCLUDED.barcode,
      product_name = EXCLUDED.product_name,
      short_description = EXCLUDED.short_description,
      brand = EXCLUDED.brand,
      category = EXCLUDED.category,
      unit = EXCLUDED.unit,
      weight = EXCLUDED.weight,
      status = EXCLUDED.status,
      low_stock_threshold = EXCLUDED.low_stock_threshold,
      overstock_threshold = EXCLUDED.overstock_threshold,
      dead_stock_days = EXCLUDED.dead_stock_days,
      total_product_limit = EXCLUDED.total_product_limit,
      prices = EXCLUDED.prices,
      inventory = EXCLUDED.inventory,
      image_url = EXCLUDED.image_url,
      min_wholesale_qty = EXCLUDED.min_wholesale_qty,
      max_discount = EXCLUDED.max_discount`,
    [
      newProdId,
      cleanedSku,
      cleanedBarcode,
      nameVal,
      descVal,
      brandVal,
      catVal,
      unitVal,
      weightVal,
      'ACTIVE',
      lowStockVal,
      limit,
      90,
      limit,
      JSON.stringify(prices),
      JSON.stringify(inventory),
      imageUrl,
      minWhQty,
      maxDisc
    ]
  );

  const newProduct = {
    product_id: newProdId,
    sku: cleanedSku,
    barcode: cleanedBarcode,
    product_name: nameVal,
    short_description: descVal,
    brand: brandVal,
    category: catVal,
    unit: unitVal,
    weight: weightVal,
    status: 'ACTIVE',
    low_stock_threshold: lowStockVal,
    overstock_threshold: limit,
    total_product_limit: limit,
    dead_stock_days: 90,
    prices,
    inventory,
    image_url: imageUrl,
    min_wholesale_qty: minWhQty,
    max_discount: maxDisc
  };

  // Fire-and-forget embedding — non-blocking, won't fail the create operation
  upsertProductEmbedding(pool, newProduct).catch(err =>
    console.error('[Embeddings] createProduct embed failed:', err.message)
  );

  return newProduct;
}

async function updateProductInDb(pool, identifier, updates) {
  const getRes = await pool.query(
    'SELECT * FROM products WHERE product_name ILIKE $1 OR sku ILIKE $1 OR product_id = $1 LIMIT 1',
    [`%${identifier}%`]
  );
  if (getRes.rows.length === 0) throw new Error('Product not found.');
  const existing = getRes.rows[0];

  const newName = updates.new_name || existing.product_name;
  const newCat = updates.new_category || existing.category;
  const newBrand = updates.new_brand || existing.brand;

  let prices = typeof existing.prices === 'string' ? JSON.parse(existing.prices) : existing.prices;
  if (updates.new_price !== undefined) prices.RETAIL = parseFloat(updates.new_price);
  if (updates.new_distributor_price !== undefined) prices.DISTRIBUTOR = parseFloat(updates.new_distributor_price);

  let inventory = typeof existing.inventory === 'string' ? JSON.parse(existing.inventory) : existing.inventory;
  if (updates.stock_adjustment !== undefined && inventory.length > 0) {
    inventory[0].quantity += parseInt(updates.stock_adjustment);
    inventory[0].available_quantity += parseInt(updates.stock_adjustment);
  }

  const upRes = await pool.query(
    `UPDATE products SET 
      product_name = $1, category = $2, brand = $3, prices = $4, inventory = $5 
     WHERE product_id = $6 RETURNING *`,
    [newName, newCat, newBrand, JSON.stringify(prices), JSON.stringify(inventory), existing.product_id]
  );
  const updatedProduct = upRes.rows[0];

  // Re-embed after update — description/price/brand may have changed
  upsertProductEmbedding(pool, {
    product_id:        updatedProduct.product_id,
    product_name:      updatedProduct.product_name,
    brand:             updatedProduct.brand,
    category:          updatedProduct.category,
    short_description: updatedProduct.short_description,
    unit:              updatedProduct.unit,
    weight:            updatedProduct.weight,
    prices:            updatedProduct.prices
  }).catch(err =>
    console.error('[Embeddings] updateProduct embed failed:', err.message)
  );

  return updatedProduct;
}

async function bulkUpdateProductsInDb(pool, categoryFilter, brandFilter, updates) {
  let conditions = [];
  let values = [];
  let idx = 1;

  if (categoryFilter) { conditions.push(`category ILIKE $${idx}`); values.push(`%${categoryFilter}%`); idx++; }
  if (brandFilter) { conditions.push(`brand ILIKE $${idx}`); values.push(`%${brandFilter}%`); idx++; }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const getRes = await pool.query(`SELECT * FROM products ${whereClause}`, values);

  if (getRes.rows.length === 0) return 0;

  let updatedCount = 0;
  for (const prod of getRes.rows) {
    let prices = typeof prod.prices === 'string' ? JSON.parse(prod.prices) : prod.prices;
    let modified = false;

    if (updates.price_percentage_change !== undefined) {
      prices.RETAIL = Math.round(prices.RETAIL * (1 + parseFloat(updates.price_percentage_change) / 100));
      modified = true;
    }
    if (updates.distributor_price_percentage_change !== undefined) {
      prices.DISTRIBUTOR = Math.round(prices.DISTRIBUTOR * (1 + parseFloat(updates.distributor_price_percentage_change) / 100));
      modified = true;
    }

    if (modified || updates.new_status !== undefined || updates.new_category !== undefined || updates.new_brand !== undefined) {
      const status = updates.new_status || prod.status;
      const category = updates.new_category || prod.category;
      const brand = updates.new_brand || prod.brand;
      await pool.query(
        'UPDATE products SET prices = $1, status = $2, category = $3, brand = $4 WHERE product_id = $5',
        [JSON.stringify(prices), status, category, brand, prod.product_id]
      );
      updatedCount++;
    }
  }
  return updatedCount;
}

async function searchProductsInDb(pool, identifier) {
  const getRes = await pool.query(
    'SELECT * FROM products WHERE product_name ILIKE $1 OR sku ILIKE $1 OR product_id = $1 LIMIT 5',
    [`%${identifier}%`]
  );
  return getRes.rows;
}

async function getCategoryProductsFromDb(pool, category) {
  const getRes = await pool.query(
    'SELECT * FROM products WHERE category ILIKE $1 LIMIT 20',
    [`%${category}%`]
  );
  return getRes.rows;
}

async function getLowStockProductsFromDb(pool) {
  // Sum available_quantity across ALL warehouses, not just inventory[0] -- a product can be
  // low/out of stock in one depot while still healthy overall in another, and the previous
  // inventory[0]-only check both missed real low-stock cases and could flag false ones.
  const getRes = await pool.query('SELECT * FROM products');
  const lowStock = getRes.rows.filter(r => {
    const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : (r.inventory || []);
    const totalAvailable = inv.reduce((sum, i) => sum + (i.available_quantity || 0), 0);
    return totalAvailable <= (r.low_stock_threshold || 0);
  }).slice(0, 20);
  return lowStock;
}

async function deleteProductFromDb(pool, identifier) {
  const getRes = await pool.query(
    'SELECT * FROM products WHERE product_name ILIKE $1 OR sku ILIKE $1 OR product_id = $1 LIMIT 1',
    [identifier]
  );
  if (getRes.rows.length === 0) {
    throw new Error('Product not found');
  }
  const prod = getRes.rows[0];
  await pool.query('DELETE FROM products WHERE product_id = $1', [prod.product_id]);
  return prod;
}

async function createSupplierInDb(pool, data) {
  const companyName = data.company_name;
  const contactPerson = data.contact_person || null;
  const email = data.email || null;
  const phone = data.phone || null;
  const city = data.city || null;
  const country = data.country || 'Pakistan';
  const reliability = data.reliability_score !== undefined ? parseInt(data.reliability_score) : 80;
  const leadTime = data.lead_time_days !== undefined ? parseInt(data.lead_time_days) : 7;
  const supplierId = data.supplier_id || `sup-${Date.now()}`;

  const res = await pool.query(
    `INSERT INTO suppliers (supplier_id, company_name, contact_person, email, phone, city, country, reliability_score, lead_time_days)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [supplierId, companyName, contactPerson, email, phone, city, country, reliability, leadTime]
  );
  return res.rows[0];
}

async function updateSupplierInDb(pool, identifier, updates) {
  const getRes = await pool.query(
    'SELECT * FROM suppliers WHERE company_name ILIKE $1 OR supplier_id = $1 LIMIT 1',
    [identifier]
  );
  if (getRes.rows.length === 0) {
    throw new Error('Supplier not found');
  }
  const sup = getRes.rows[0];

  const companyName = updates.new_company_name !== undefined ? updates.new_company_name : sup.company_name;
  const contactPerson = updates.new_contact_person !== undefined ? updates.new_contact_person : sup.contact_person;
  const email = updates.new_email !== undefined ? updates.new_email : sup.email;
  const phone = updates.new_phone !== undefined ? updates.new_phone : sup.phone;
  const city = updates.new_city !== undefined ? updates.new_city : sup.city;
  const country = updates.new_country !== undefined ? updates.new_country : sup.country;

  const res = await pool.query(
    `UPDATE suppliers 
     SET company_name = $1, contact_person = $2, email = $3, phone = $4, city = $5, country = $6
     WHERE supplier_id = $7
     RETURNING *`,
    [companyName, contactPerson, email, phone, city, country, sup.supplier_id]
  );
  return res.rows[0];
}

async function deleteSupplierFromDb(pool, identifier) {
  const getRes = await pool.query(
    'SELECT * FROM suppliers WHERE company_name ILIKE $1 OR supplier_id = $1 LIMIT 1',
    [identifier]
  );
  if (getRes.rows.length === 0) {
    throw new Error('Supplier not found');
  }
  const sup = getRes.rows[0];
  await pool.query('DELETE FROM suppliers WHERE supplier_id = $1', [sup.supplier_id]);
  return sup;
}

async function searchSuppliersInDb(pool, identifier) {
  const getRes = await pool.query(
    'SELECT * FROM suppliers WHERE company_name ILIKE $1 OR contact_person ILIKE $1 OR email ILIKE $1 OR city ILIKE $1 OR country ILIKE $1 OR CAST(supplier_id AS TEXT) = $2 LIMIT 20',
    [`%${identifier}%`, identifier]
  );
  return getRes.rows;
}

async function filterSuppliersByLocationInDb(pool, city, country) {
  const conditions = [];
  const params = [];
  if (city) {
    params.push(`%${city}%`);
    conditions.push(`city ILIKE $${params.length}`);
  }
  if (country) {
    params.push(`%${country}%`);
    conditions.push(`country ILIKE $${params.length}`);
  }
  if (conditions.length === 0) {
    const res = await pool.query('SELECT * FROM suppliers LIMIT 20');
    return res.rows;
  }
  const whereClause = conditions.join(' AND ');
  const res = await pool.query(`SELECT * FROM suppliers WHERE ${whereClause} LIMIT 20`, params);
  return res.rows;
}


// ─────────────────────────────────────────────────────────────────────────────
// INVOICES (admin-wide view -- unscoped, unlike the distributor's own-invoices query)
// ─────────────────────────────────────────────────────────────────────────────

// SENT means issued-but-unpaid, so it belongs with UNPAID whenever the admin asks about
// outstanding money -- treating only literal 'UNPAID' as unpaid hides most of the ledger.
const INVOICE_STATUS_GROUPS = {
  unpaid:  ['UNPAID', 'SENT', 'PARTIAL', 'OVERDUE'],
  paid:    ['PAID', 'SETTLED', 'CLOSED'],
  overdue: ['OVERDUE'],
};

/**
 * @param {string|null} statusFilter  'unpaid' | 'paid' | 'overdue' | null (all)
 * @param {string|null} customer      Partial email/name match, for "X ki invoices"
 */
async function getAdminInvoicesFromDb(pool, statusFilter = null, customer = null) {
  const conditions = [];
  const params = [];

  if (statusFilter === 'overdue') {
    // Overdue is a date fact, not just a status -- anything unpaid past its due date.
    params.push(INVOICE_STATUS_GROUPS.unpaid);
    conditions.push(`UPPER(status) = ANY($${params.length})`);
    conditions.push(`due_date IS NOT NULL AND due_date::timestamptz < NOW()`);
  } else if (statusFilter && INVOICE_STATUS_GROUPS[statusFilter]) {
    params.push(INVOICE_STATUS_GROUPS[statusFilter]);
    conditions.push(`UPPER(status) = ANY($${params.length})`);
  }

  if (customer) {
    params.push(`%${customer}%`);
    conditions.push(`(customer_email ILIKE $${params.length} OR distributor_name ILIKE $${params.length})`);
  }

  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const res = await pool.query(
    `SELECT * FROM invoices${where} ORDER BY due_date DESC NULLS LAST LIMIT 40`,
    params
  );
  return res.rows;
}

async function getInvoiceStatusCountsFromDb(pool) {
  const res = await pool.query(
    'SELECT UPPER(status) AS status, COUNT(*)::int AS count, SUM(total_amount - COALESCE(amount_paid,0))::float AS outstanding FROM invoices GROUP BY UPPER(status) ORDER BY count DESC'
  );
  return res.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// DISTRIBUTORS / BUYERS (registered accounts, filterable by location)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registered partner accounts, optionally filtered by role, city/country, or status.
 * Distinct from filterSuppliersByLocationInDb -- suppliers are who we buy FROM, these are
 * the distributor/buyer accounts that trade ON the platform.
 */
async function getPartnerAccountsFromDb(pool, { role = null, city = null, country = null, status = null } = {}) {
  const conditions = [];
  const params = [];

  if (role) {
    params.push(role.toLowerCase());
    conditions.push(`LOWER(role) = $${params.length}`);
  } else {
    conditions.push(`LOWER(role) IN ('distributor', 'buyer')`);
  }
  if (city) {
    params.push(`%${city}%`);
    // warehouse_region / buyer_region often carry the city when the city column is blank.
    conditions.push(`(city ILIKE $${params.length} OR warehouse_region ILIKE $${params.length} OR buyer_region ILIKE $${params.length})`);
  }
  if (country) {
    params.push(`%${country}%`);
    conditions.push(`country ILIKE $${params.length}`);
  }
  if (status) {
    params.push(status.toUpperCase());
    conditions.push(`UPPER(status) = $${params.length}`);
  }

  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const res = await pool.query(
    `SELECT id, email, role, status, business_name, contact_name, buyer_store_name,
            buyer_contact_name, city, country, warehouse_region, buyer_region, created_at
     FROM users${where} ORDER BY created_at DESC LIMIT 40`,
    params
  );
  return res.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER MANAGEMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function formatOrder(r) {
  return {
    order_id: r.order_id,
    order_number: r.order_number,
    order_type: r.order_type,
    status: r.status,
    total_amount: parseFloat(r.total_amount),
    customer_email: r.customer_email,
    order_date: r.order_date,
    items_summary: r.items_summary || ''
  };
}

async function listOrdersFromDb(pool, limit = 20, orderType = null) {
  const typeFilter = orderType ? `AND UPPER(order_type) = '${orderType.toUpperCase()}'` : '';
  const res = await pool.query(
    `SELECT * FROM orders WHERE 1=1 ${typeFilter} ORDER BY id DESC LIMIT $1`, [limit]
  );
  return res.rows.map(formatOrder);
}

async function getOrderByIdFromDb(pool, identifier) {
  if (!identifier || identifier.trim() === '' || identifier.toLowerCase() === 'undefined') {
    return [];
  }
  const res = await pool.query(
    `SELECT * FROM orders WHERE order_id ILIKE $1 OR order_number ILIKE $1 LIMIT 5`,
    [`%${identifier}%`]
  );
  return res.rows.map(formatOrder);
}

async function getOrdersByStatusFromDb(pool, status, orderType = null) {
  const typeFilter = orderType ? `AND UPPER(order_type) = '${orderType.toUpperCase()}'` : '';
  const res = await pool.query(
    `SELECT * FROM orders WHERE UPPER(status) = $1 ${typeFilter} ORDER BY id DESC LIMIT 30`,
    [status.toUpperCase()]
  );
  return res.rows.map(formatOrder);
}

async function getOrdersByCustomerFromDb(pool, customer, orderType = null) {
  if (!customer || customer.trim() === '' || customer.toLowerCase() === 'undefined') {
    return [];
  }
  const typeFilter = orderType ? `AND UPPER(order_type) = '${orderType.toUpperCase()}'` : '';
  const res = await pool.query(
    `SELECT * FROM orders WHERE customer_email ILIKE $1 ${typeFilter} ORDER BY id DESC LIMIT 20`,
    [`%${customer}%`]
  );
  return res.rows.map(formatOrder);
}

async function getOrdersByDateRangeFromDb(pool, dateFrom, dateTo, orderType = null) {
  const typeFilter = orderType ? `AND UPPER(order_type) = '${orderType.toUpperCase()}'` : '';
  const res = await pool.query(
    `SELECT * FROM orders WHERE created_at >= $1 AND created_at <= $2 ${typeFilter} ORDER BY id DESC LIMIT 50`,
    [dateFrom, dateTo]
  );
  return res.rows.map(formatOrder);
}

async function getOrdersByAmountFilterFromDb(pool, operator, amount, orderType = null) {
  const op = operator === 'above' ? '>' : '<';
  const typeFilter = orderType ? `AND UPPER(order_type) = '${orderType.toUpperCase()}'` : '';
  const res = await pool.query(
    `SELECT * FROM orders WHERE total_amount ${op} $1 ${typeFilter} ORDER BY total_amount DESC LIMIT 30`,
    [parseFloat(amount)]
  );
  return res.rows.map(formatOrder);
}

async function updateOrderStatusInDb(pool, identifier, newStatus) {
  const status = newStatus.toUpperCase();
  const res = await pool.query(
    `UPDATE orders SET status = $1 WHERE order_id ILIKE $2 OR order_number ILIKE $2 RETURNING *`,
    [status, `%${identifier}%`]
  );
  if (res.rows.length === 0) throw new Error(`Order not found: "${identifier}"`);

  // Release reserved stock back to available when an order is rejected/cancelled via the
  // chatbot -- mirrors the same reversal PUT /api/orders/:order_id/status performs, so stock
  // stays correct regardless of which surface (admin UI or AI copilot) changed the status.
  if (status === 'REJECTED' || status === 'CANCELLED') {
    const order = res.rows[0];
    const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    for (const item of orderItems) {
      const qty = parseInt(item.qty || item.quantity || 0);
      if (qty <= 0) continue;
      const prodRes = await pool.query(
        'SELECT * FROM products WHERE product_id = $1 OR sku = $2 OR product_name ILIKE $3 LIMIT 1',
        [item.product_id || '', item.sku || '', `%${item.name || item.product_name || ''}%`]
      );
      if (prodRes.rows.length === 0) continue;
      const product = prodRes.rows[0];
      let inventory = typeof product.inventory === 'string' ? JSON.parse(product.inventory) : (product.inventory || []);
      let remaining = qty;
      inventory = inventory.map(inv => {
        if (remaining <= 0) return inv;
        const reserved = inv.reserved_quantity || 0;
        const toRelease = Math.min(reserved, remaining);
        remaining -= toRelease;
        const newReserved = reserved - toRelease;
        const newAvail = Math.max(0, inv.quantity - newReserved);
        return { ...inv, reserved_quantity: newReserved, available_quantity: newAvail };
      });
      await pool.query('UPDATE products SET inventory = $1 WHERE product_id = $2', [JSON.stringify(inventory), product.product_id]);
    }
  }

  return formatOrder(res.rows[0]);
}

async function bulkApproveOrdersInDb(pool) {
  const res = await pool.query(
    `UPDATE orders SET status = 'APPROVED' WHERE UPPER(status) = 'PENDING' RETURNING *`
  );
  return res.rows.map(formatOrder);
}

async function getOrderAnalyticsFromDb(pool, period) {
  // period: 'today' | 'week' | 'month' | 'all'
  let dateFilter = '';
  if (period === 'today') dateFilter = `AND created_at >= CURRENT_DATE`;
  else if (period === 'week') dateFilter = `AND created_at >= CURRENT_DATE - INTERVAL '7 days'`;
  else if (period === 'month') dateFilter = `AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`;

  const totalsRes = await pool.query(
    `SELECT COUNT(*) as total_orders,
            COALESCE(SUM(total_amount),0) as total_revenue,
            COALESCE(AVG(total_amount),0) as avg_order_value
     FROM orders WHERE 1=1 ${dateFilter}`
  );

  const statusRes = await pool.query(
    `SELECT status, COUNT(*) as count FROM orders WHERE 1=1 ${dateFilter} GROUP BY status ORDER BY count DESC`
  );

  return {
    totals: totalsRes.rows[0],
    by_status: statusRes.rows
  };
}

async function getTopBuyersFromDb(pool, limit = 5) {
  const res = await pool.query(
    `SELECT customer_email,
            COUNT(*) as order_count,
            COALESCE(SUM(total_amount),0) as total_spent
     FROM orders
     GROUP BY customer_email
     ORDER BY total_spent DESC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

async function getMostOrderedProductsFromDb(pool, limit = 10) {
  // Extract product names from items JSONB array
  const res = await pool.query(
    `SELECT item->>'name' as product_name,
            SUM((item->>'qty')::int) as total_qty,
            COUNT(*) as order_count
     FROM orders, jsonb_array_elements(items) AS item
     GROUP BY item->>'name'
     ORDER BY total_qty DESC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

async function getOverdueOrdersFromDb(pool, days = 3, orderType = null) {
  const typeFilter = orderType ? `AND UPPER(order_type) = '${orderType.toUpperCase()}'` : '';
  const res = await pool.query(
    `SELECT * FROM orders
     WHERE UPPER(status) = 'PENDING'
       AND created_at <= NOW() - INTERVAL '${parseInt(days)} days'
       ${typeFilter}
     ORDER BY created_at ASC LIMIT 20`
  );
  return res.rows.map(formatOrder);
}

async function getOrdersByProductFromDb(pool, productName) {
  if (!productName || productName.trim() === '' || productName.toLowerCase() === 'undefined') {
    return [];
  }
  const res = await pool.query(
    `SELECT o.order_id, o.order_number, o.status, o.total_amount, o.customer_email, o.order_date
     FROM orders o
     WHERE EXISTS (
       SELECT 1 FROM jsonb_array_elements(o.items) AS item
       WHERE item->>'name' ILIKE $1
     )
     ORDER BY o.id DESC LIMIT 20`,
    [`%${productName}%`]
  );
  return res.rows.map(formatOrder);
}

// Intelligent shipping operations
async function getOrdersAwaitingShipmentFromDb(pool, categoryFilter = null) {
  const res = await pool.query(
    `SELECT o.*, i.status as invoice_status
     FROM orders o
     LEFT JOIN invoices i ON (i.order_number = o.order_number OR i.order_id = o.order_id)
     WHERE UPPER(o.status) IN ('READY_TO_SHIP', 'APPROVED', 'CONFIRMED', 'PROCESSING')
     ORDER BY o.id DESC`
  );

  const productsRes = await pool.query(`SELECT product_id, sku, product_name, category FROM products`);
  const prodCategoryMap = {};
  productsRes.rows.forEach(p => {
    if (p.product_name) prodCategoryMap[p.product_name.toLowerCase()] = p.category;
    if (p.sku) prodCategoryMap[p.sku.toLowerCase()] = p.category;
    if (p.product_id) prodCategoryMap[p.product_id.toLowerCase()] = p.category;
  });

  const ordersWithCat = res.rows.map(row => {
    const formatted = formatOrder(row);
    const items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
    let category = 'General Inventory';
    if (items.length > 0) {
      const it = items[0];
      const name = (it.name || it.product_name || '').toLowerCase();
      const sku = (it.sku || '').toLowerCase();
      category = prodCategoryMap[name] || prodCategoryMap[sku] || 'General Inventory';
    }
    return {
      ...formatted,
      category,
      invoice_status: row.invoice_status || 'UNPAID'
    };
  });

  let filtered = ordersWithCat;
  if (categoryFilter && categoryFilter.trim() !== '' && categoryFilter.toLowerCase() !== 'all') {
    filtered = filtered.filter(o => o.category.toLowerCase().includes(categoryFilter.toLowerCase()));
  }

  const byCategory = {};
  filtered.forEach(o => {
    if (!byCategory[o.category]) byCategory[o.category] = [];
    byCategory[o.category].push(o);
  });

  return {
    total_awaiting_shipment: filtered.length,
    by_category: byCategory,
    orders: filtered
  };
}

async function shipOrderInDb(pool, identifier, warehouseId = 'wh-1') {
  const res = await pool.query(
    `SELECT * FROM orders WHERE order_id ILIKE $1 OR order_number ILIKE $1 LIMIT 1`,
    [`%${identifier}%`]
  );
  if (res.rows.length === 0) throw new Error(`Order not found matching: "${identifier}"`);

  const order = res.rows[0];
  if (order.status === 'SHIPPED') {
    return { message: `Order ${order.order_number || order.order_id} is already SHIPPED.`, order: formatOrder(order) };
  }

  const updateRes = await pool.query(
    `UPDATE orders SET status = 'SHIPPED' WHERE id = $1 RETURNING *`,
    [order.id]
  );
  const shippedOrder = formatOrder(updateRes.rows[0]);

  const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
  for (const item of items) {
    const prodName = item.name || item.product_name;
    const qty = parseInt(item.qty || item.quantity || 1);
    if (prodName) {
      const pRes = await pool.query(
        `SELECT * FROM products WHERE product_name ILIKE $1 OR sku ILIKE $1 OR product_id = $1 LIMIT 1`,
        [`%${prodName}%`]
      );
      if (pRes.rows.length > 0) {
        const prod = pRes.rows[0];
        const inv = typeof prod.inventory === 'string' ? JSON.parse(prod.inventory) : prod.inventory;
        if (Array.isArray(inv)) {
          let whItem = inv.find(w => w.warehouse_id === warehouseId) || inv[0];
          if (whItem) {
            whItem.available_quantity = Math.max(0, (whItem.available_quantity || 0) - qty);
            whItem.quantity = Math.max(0, (whItem.quantity || 0) - qty);
            await pool.query('UPDATE products SET inventory = $1 WHERE product_id = $2', [JSON.stringify(inv), prod.product_id]);
          }
        }
      }
    }
  }

  const auditId = `aud-${Date.now()}`;
  await pool.query(
    `INSERT INTO audit_logs (audit_id, table_name, record_id, action, performed_by, notes) VALUES ($1, $2, $3, $4, $5, $6)`,
    [auditId, 'orders', shippedOrder.order_id, 'SHIP_ORDER', 'CIQ Copilot', `Shipped order ${shippedOrder.order_number} from warehouse ${warehouseId}`]
  );

  return {
    success: true,
    message: `Order ${shippedOrder.order_number || shippedOrder.order_id} successfully SHIPPED from warehouse depot ${warehouseId}! Inventory stock deducted.`,
    shippedOrder
  };
}

async function shipAllOrdersInDb(pool, categoryFilter = null, warehouseId = 'wh-1') {
  const awaiting = await getOrdersAwaitingShipmentFromDb(pool, categoryFilter);
  const targetOrders = awaiting.orders;
  if (targetOrders.length === 0) {
    return { success: true, message: `No orders awaiting shipment${categoryFilter ? ` in category "${categoryFilter}"` : ''}.`, shipped_count: 0 };
  }

  const shippedList = [];
  for (const o of targetOrders) {
    const res = await shipOrderInDb(pool, o.order_number || o.order_id, warehouseId);
    shippedList.push(res.shippedOrder || o);
  }

  return {
    success: true,
    message: `Successfully shipped ${shippedList.length} order(s)${categoryFilter ? ` in category "${categoryFilter}"` : ''}!`,
    shipped_count: shippedList.length,
    shipped_orders: shippedList
  };
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  createProductInDb,
  updateProductInDb,
  bulkUpdateProductsInDb,
  searchProductsInDb,
  getCategoryProductsFromDb,
  getLowStockProductsFromDb,
  deleteProductFromDb,
  createSupplierInDb,
  updateSupplierInDb,
  deleteSupplierFromDb,
  searchSuppliersInDb,
  filterSuppliersByLocationInDb,
  getAdminInvoicesFromDb,
  getInvoiceStatusCountsFromDb,
  getPartnerAccountsFromDb,
  // Orders
  listOrdersFromDb,
  getOrderByIdFromDb,
  getOrdersByStatusFromDb,
  getOrdersByCustomerFromDb,
  getOrdersByDateRangeFromDb,
  getOrdersByAmountFilterFromDb,
  updateOrderStatusInDb,
  bulkApproveOrdersInDb,
  getOrderAnalyticsFromDb,
  getTopBuyersFromDb,
  getMostOrderedProductsFromDb,
  getOverdueOrdersFromDb,
  getOrdersByProductFromDb,
  getOrdersAwaitingShipmentFromDb,
  shipOrderInDb,
  shipAllOrdersInDb,
  // Quotations (defined below this block -- function declarations hoist, so exporting
  // them here is fine and keeps all exports in one place)
  getAllQuotationsFromDb,
  getQuotationsByStatusFromDb,
  getPendingQuotationsFromDb,
  getQuotationByIdFromDb,
  approveQuotationInDb,
  rejectQuotationInDb,
  sendCounterOfferToDistributorInDb,
  getQuotationKpisFromDb,
  getQuotationsByCustomerFromDb,
  getHighValueQuotationsFromDb
};



// ─────────────────────────────────────────────────────────────────────────────
// QUOTATION MANAGEMENT FUNCTIONS (ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

async function getAllQuotationsFromDb(pool, limit = 50) {
  const res = await pool.query(
    'SELECT * FROM quotations ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return res.rows;
}

async function getQuotationsByStatusFromDb(pool, status) {
  const normStatus = status.toUpperCase().replace(/\s+/g, '_');
  const res = await pool.query(
    'SELECT * FROM quotations WHERE UPPER(status) = $1 ORDER BY created_at DESC LIMIT 50',
    [normStatus]
  );
  return res.rows;
}

async function getPendingQuotationsFromDb(pool) {
  const res = await pool.query(
    `SELECT * FROM quotations 
     WHERE UPPER(status) IN ('PENDING', 'UNDER_REVIEW', 'COUNTER_OFFER_RECEIVED', 'NEGOTIATING')
     ORDER BY created_at ASC LIMIT 50`
  );
  return res.rows;
}

async function getQuotationByIdFromDb(pool, identifier) {
  const res = await pool.query(
    'SELECT * FROM quotations WHERE quotation_id ILIKE $1 OR quotation_number ILIKE $1 LIMIT 1',
    [`%${identifier}%`]
  );
  if (res.rows.length === 0) {
    throw new Error(`Quotation "${identifier}" not found.`);
  }
  return res.rows[0];
}

async function approveQuotationInDb(pool, identifier, approvedUnitPrice = null) {
  const quote = await getQuotationByIdFromDb(pool, identifier);
  
  const finalUnitPrice = approvedUnitPrice 
    ? parseFloat(approvedUnitPrice) 
    : parseFloat(quote.unit_price);
  
  const origPrice = parseFloat(quote.original_unit_price || quote.unit_price);
  const maxDisc = quote.max_discount_pct !== undefined && quote.max_discount_pct !== null ? parseInt(quote.max_discount_pct) : 0;
  const minPrice = quote.min_price_allowed ? parseFloat(quote.min_price_allowed) : origPrice * (1 - maxDisc / 100);
  
  // Validation: Admin approved price should be between min_price and original_price
  if (finalUnitPrice < minPrice) {
    throw new Error(`Approved price Rs ${finalUnitPrice.toLocaleString()} is below minimum allowed price Rs ${minPrice.toLocaleString()}.`);
  }
  if (finalUnitPrice > origPrice) {
    throw new Error(`Approved price Rs ${finalUnitPrice.toLocaleString()} cannot exceed original price Rs ${origPrice.toLocaleString()}.`);
  }
  
  const qty = parseInt(quote.quantity || 10);
  const newTotal = finalUnitPrice * qty;
  
  let historyArr = [];
  try {
    historyArr = typeof quote.counter_history === 'string' ? JSON.parse(quote.counter_history) : (quote.counter_history || []);
  } catch (_) { historyArr = []; }
  
  historyArr.push({
    action: 'APPROVED',
    by: 'ADMIN',
    unit_price: finalUnitPrice,
    total_amount: newTotal,
    notes: `Quote approved by Admin at Rs ${finalUnitPrice.toLocaleString()} per unit`,
    timestamp: new Date().toISOString()
  });
  
  const res = await pool.query(
    `UPDATE quotations SET
      unit_price = $1,
      total_amount = $2,
      status = 'APPROVED',
      last_counter_by = 'ADMIN',
      counter_history = $3
     WHERE quotation_id = $4
     RETURNING *`,
    [finalUnitPrice, newTotal, JSON.stringify(historyArr), quote.quotation_id]
  );
  
  // Auto-create B2B order
  const orderNumber = (quote.quotation_number || quote.quotation_id).replace("QUO-", "ORD-");
  const orderId = `ord-b2b-${Date.now()}`;
  const items = [{
    product_id: quote.product_id || 'wholesale-item',
    sku: quote.sku || 'SKU-WHOLESALE',
    name: quote.product_name || 'Wholesale Order',
    qty: qty,
    price: finalUnitPrice
  }];
  
  await pool.query(
    `INSERT INTO orders (
      order_id, order_number, order_type, status, subtotal, discount_total, 
      tax_total, total_amount, currency, order_date, items_summary, items, customer_email
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      orderId,
      orderNumber,
      'B2B',
      'CONFIRMED',
      newTotal,
      0,
      0,
      newTotal,
      'PKR',
      new Date().toISOString(),
      `B2B Order from approved quotation ${quote.quotation_number}`,
      JSON.stringify(items),
      quote.customer_email || 'distributor@commerceiq.com'
    ]
  );
  
  return res.rows[0];
}

async function rejectQuotationInDb(pool, identifier, reason = '') {
  const quote = await getQuotationByIdFromDb(pool, identifier);
  
  let historyArr = [];
  try {
    historyArr = typeof quote.counter_history === 'string' ? JSON.parse(quote.counter_history) : (quote.counter_history || []);
  } catch (_) { historyArr = []; }
  
  historyArr.push({
    action: 'REJECTED',
    by: 'ADMIN',
    notes: reason || 'Quotation rejected by admin',
    timestamp: new Date().toISOString()
  });
  
  const res = await pool.query(
    `UPDATE quotations SET
      status = 'REJECTED',
      last_counter_by = 'ADMIN',
      counter_history = $1
     WHERE quotation_id = $2
     RETURNING *`,
    [JSON.stringify(historyArr), quote.quotation_id]
  );
  
  return res.rows[0];
}

async function sendCounterOfferToDistributorInDb(pool, identifier, counterUnitPrice, notes = '') {
  const quote = await getQuotationByIdFromDb(pool, identifier);
  
  const newUnitPrice = parseFloat(counterUnitPrice);
  const origPrice = parseFloat(quote.original_unit_price || quote.unit_price);
  const distRequestedPrice = parseFloat(quote.unit_price);
  
  // Admin counter validation: should be between distributor's request and original price
  if (newUnitPrice < distRequestedPrice) {
    throw new Error(`Admin counter offer Rs ${newUnitPrice.toLocaleString()} cannot be lower than distributor's requested price Rs ${distRequestedPrice.toLocaleString()}.`);
  }
  if (newUnitPrice > origPrice) {
    throw new Error(`Admin counter offer Rs ${newUnitPrice.toLocaleString()} cannot exceed original base price Rs ${origPrice.toLocaleString()}.`);
  }
  
  const qty = parseInt(quote.quantity || 10);
  const newTotal = newUnitPrice * qty;
  
  let historyArr = [];
  try {
    historyArr = typeof quote.counter_history === 'string' ? JSON.parse(quote.counter_history) : (quote.counter_history || []);
  } catch (_) { historyArr = []; }
  
  historyArr.push({
    action: 'COUNTER_OFFER',
    by: 'ADMIN',
    unit_price: newUnitPrice,
    total_amount: newTotal,
    notes: notes || `Admin counter offer: Rs ${newUnitPrice.toLocaleString()} per unit`,
    timestamp: new Date().toISOString()
  });
  
  const res = await pool.query(
    `UPDATE quotations SET
      unit_price = $1,
      total_amount = $2,
      status = 'COUNTER_OFFER_SENT',
      last_counter_by = 'ADMIN',
      counter_history = $3
     WHERE quotation_id = $4
     RETURNING *`,
    [newUnitPrice, newTotal, JSON.stringify(historyArr), quote.quotation_id]
  );
  
  return res.rows[0];
}

async function getQuotationKpisFromDb(pool) {
  const totalRes = await pool.query('SELECT COUNT(*) as total, COALESCE(SUM(total_amount), 0) as total_value FROM quotations');
  const pendingRes = await pool.query(
    `SELECT COUNT(*) as count FROM quotations 
     WHERE UPPER(status) IN ('PENDING', 'UNDER_REVIEW', 'COUNTER_OFFER_RECEIVED', 'NEGOTIATING')`
  );
  const approvedRes = await pool.query("SELECT COUNT(*) as count FROM quotations WHERE UPPER(status) = 'APPROVED'");
  const rejectedRes = await pool.query("SELECT COUNT(*) as count FROM quotations WHERE UPPER(status) = 'REJECTED'");
  
  const statusRes = await pool.query(
    'SELECT status, COUNT(*) as count, SUM(total_amount) as amount FROM quotations GROUP BY status ORDER BY count DESC'
  );
  
  return {
    total_quotations: parseInt(totalRes.rows[0]?.total || 0),
    total_value: parseFloat(totalRes.rows[0]?.total_value || 0),
    pending_review: parseInt(pendingRes.rows[0]?.count || 0),
    approved: parseInt(approvedRes.rows[0]?.count || 0),
    rejected: parseInt(rejectedRes.rows[0]?.count || 0),
    by_status: statusRes.rows
  };
}

async function getQuotationsByCustomerFromDb(pool, customerEmail) {
  const res = await pool.query(
    'SELECT * FROM quotations WHERE customer_email ILIKE $1 ORDER BY created_at DESC LIMIT 30',
    [`%${customerEmail}%`]
  );
  return res.rows;
}

async function getHighValueQuotationsFromDb(pool, minAmount = 100000) {
  const res = await pool.query(
    'SELECT * FROM quotations WHERE total_amount >= $1 ORDER BY total_amount DESC LIMIT 30',
    [parseFloat(minAmount)]
  );
  return res.rows;
}

