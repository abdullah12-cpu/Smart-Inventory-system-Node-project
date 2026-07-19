async function createProductInDb(pool, data) {
  const nameVal = data.name || data.product_name;
  const catVal = data.category;
  const brandVal = data.brand || 'Generic';
  const descVal = data.description || data.short_description || 'Product registered dynamically via AI Copilot.';

  let priceVal = 0;
  if (data.price !== undefined) {
    priceVal = parseFloat(data.price);
  } else if (data.prices && data.prices.RETAIL !== undefined) {
    priceVal = parseFloat(data.prices.RETAIL);
  }

  let stockVal = 0;
  if (data.stock !== undefined) {
    stockVal = parseInt(data.stock);
  } else if (data.inventory && Array.isArray(data.inventory)) {
    stockVal = data.inventory.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
  }

  const cleanedSku = data.sku || `SKU-AI-${Math.floor(1000 + Math.random() * 9000)}`;
  const cleanedBarcode = data.barcode || `890123${Math.floor(100000 + Math.random() * 900000)}`;
  const newProdId = data.product_id || `p-${Date.now()}`;

  const prices = data.prices || {
    RETAIL: priceVal,
    DISTRIBUTOR: Math.round(priceVal * 0.85),
    VIP: Math.round(priceVal * 0.8),
    CUSTOM: Math.round(priceVal * 0.85)
  };

  const inventory = data.inventory || [
    {
      warehouse_id: 'wh-1',
      warehouse_name: 'Karachi Central Depot',
      city: 'Karachi',
      country: 'Pakistan',
      quantity: stockVal,
      reserved_quantity: 0,
      available_quantity: stockVal
    },
    {
      warehouse_id: 'wh-2',
      warehouse_name: 'Lahore North Terminal',
      city: 'Lahore',
      country: 'Pakistan',
      quantity: 0,
      reserved_quantity: 0,
      available_quantity: 0
    }
  ];

  const imageUrl = data.image_url || 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&fit=crop';
  const minWhQty = parseInt(data.min_wholesale_qty || 20);
  const maxDisc = parseInt(data.max_discount || 15);
  const limit = parseInt(data.total_product_limit || 500);

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
      'Units',
      10.0,
      'ACTIVE',
      10,
      500,
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
    unit: 'Units',
    weight: 10.0,
    status: 'ACTIVE',
    low_stock_threshold: 10,
    overstock_threshold: 500,
    total_product_limit: limit,
    dead_stock_days: 90,
    prices,
    inventory,
    image_url: imageUrl,
    min_wholesale_qty: minWhQty,
    max_discount: maxDisc
  };
}

module.exports = {
  createProductInDb
};
