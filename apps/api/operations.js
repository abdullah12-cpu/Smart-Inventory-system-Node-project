async function createProductInDb(pool, data) {
  const nameVal = data.name || data.product_name;
  const catVal = data.category || null;
  const brandVal = data.brand || null;
  const descVal = data.description || data.short_description || null;

  let priceRetail = 0;
  if (data.price !== undefined) {
    priceRetail = parseFloat(data.price);
  } else if (data.retail_price !== undefined) {
    priceRetail = parseFloat(data.retail_price);
  } else if (data.prices && data.prices.RETAIL !== undefined) {
    priceRetail = parseFloat(data.prices.RETAIL);
  }

  let priceDist = null;
  if (data.distributor_price !== undefined) {
    priceDist = parseFloat(data.distributor_price);
  } else if (data.prices && data.prices.DISTRIBUTOR !== undefined) {
    priceDist = parseFloat(data.prices.DISTRIBUTOR);
  }

  const prices = data.prices || {
    RETAIL: priceRetail,
    DISTRIBUTOR: priceDist,
    VIP: priceDist,
    CUSTOM: priceDist
  };

  let kStock = 0;
  let lStock = 0;
  if (data.karachi_stock !== undefined) {
    kStock = parseInt(data.karachi_stock);
  }
  if (data.lahore_stock !== undefined) {
    lStock = parseInt(data.lahore_stock);
  }
  if (data.stock !== undefined && data.karachi_stock === undefined && data.lahore_stock === undefined) {
    kStock = parseInt(data.stock);
  }

  const inventory = data.inventory || [
    {
      warehouse_id: 'wh-1',
      warehouse_name: 'Karachi Central Depot',
      city: 'Karachi',
      country: 'Pakistan',
      quantity: kStock,
      reserved_quantity: 0,
      available_quantity: kStock
    },
    {
      warehouse_id: 'wh-2',
      warehouse_name: 'Lahore North Terminal',
      city: 'Lahore',
      country: 'Pakistan',
      quantity: lStock,
      reserved_quantity: 0,
      available_quantity: lStock
    }
  ];

  const cleanedSku = data.sku || data.product_code || `SKU-AI-${Math.floor(1000 + Math.random() * 9000)}`;
  const cleanedBarcode = data.barcode || data.upc_barcode || null;
  const newProdId = data.product_id || `p-${Date.now()}`;

  const unitVal = data.unit || null;
  const weightVal = data.weight !== undefined ? parseFloat(data.weight) : null;
  const imageUrl = data.image_url || null;
  const minWhQty = data.min_wholesale_qty !== undefined ? parseInt(data.min_wholesale_qty) : null;
  const maxDisc = data.max_discount !== undefined ? parseInt(data.max_discount) : null;
  const limit = data.total_product_limit !== undefined ? parseInt(data.total_product_limit) : null;
  const lowStockVal = data.low_stock_threshold !== undefined ? parseInt(data.low_stock_threshold) : null;

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

  return {
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
  return upRes.rows[0];
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
  const getRes = await pool.query(
    `SELECT * FROM products 
     WHERE (inventory->0->>'available_quantity')::int <= low_stock_threshold
     LIMIT 20`
  );
  return getRes.rows;
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

module.exports = {
  createProductInDb,
  updateProductInDb,
  bulkUpdateProductsInDb,
  searchProductsInDb,
  getCategoryProductsFromDb,
  getLowStockProductsFromDb,
  deleteProductFromDb
};
