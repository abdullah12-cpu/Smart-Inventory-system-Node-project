/**
 * Modular Buyer Operations Module
 * Provides helper functions for retail product search, budget filtering, and natural language recommendations.
 */

async function getBuyerProductRecommendationsFromDb(pool, args = {}) {
  const { query, max_price, category, brand, features } = args;

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
    try {
      prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices || {};
    } catch (e) {
      prices = {};
    }

    let inventory = [];
    try {
      inventory = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory || [];
    } catch (e) {
      inventory = [];
    }

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

  // Natural language query & keywords filtering
  const searchTerm = (query || features || '').toLowerCase().trim();
  if (searchTerm) {
    const STOP_WORDS = new Set([
      'best', 'with', 'under', 'than', 'more', 'less', 'some', 'show', 'find', 'suggest', 'pkr', 'rs', 'rupees',
      'products', 'product', 'items', 'item', 'available', 'catalog', 'store', 'recommend', 'recommendation',
      'recommendations', 'search', 'get', 'list', 'give', 'me', 'all', 'the', 'for', 'please', 'similar',
      'image', 'photo', 'picture', 'this', 'that', 'have', 'from', 'can', 'you', 'what', 'which', 'are'
    ]);
    const tokens = searchTerm.split(/\s+/).filter(t => t.length > 1 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));
    
    if (tokens.length > 0) {
      products = products.map(p => {
        const fullText = `${p.product_name} ${p.short_description} ${p.brand} ${p.category}`.toLowerCase();
        let matchCount = 0;
        tokens.forEach(tok => {
          if (fullText.includes(tok)) matchCount++;
        });
        return { ...p, score: matchCount };
      }).filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score || a.retail_price - b.retail_price);
    }
  }

  return products;
}

async function compareBuyerProductsInDb(pool, args = {}) {
  const { message = '', product_a = '', product_b = '' } = args;

  const allProducts = await getBuyerProductRecommendationsFromDb(pool, {});
  if (!allProducts || allProducts.length === 0) {
    return {
      ai_message: "⚠️ No products available in the catalog for comparison.",
      products: []
    };
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
      tokens.forEach(tok => {
        if (text.includes(tok)) score += 1;
      });
      return { ...p, score };
    }).filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score);

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

  const tableMd = `### ⚖️ Side-by-Side Product Comparison

| Specification | **${p1.product_name}** | **${p2.product_name}** |
| --- | --- | --- |
| **Retail Price** | **Rs ${p1.retail_price.toLocaleString()}** | **Rs ${p2.retail_price.toLocaleString()}** |
| **Brand** | ${p1.brand || 'N/A'} | ${p2.brand || 'N/A'} |
| **Category** | ${p1.category || 'General'} | ${p2.category || 'General'} |
| **Availability** | ${p1.available_stock > 0 ? `In Stock (${p1.available_stock} units)` : '⚠️ Out of Stock'} | ${p2.available_stock > 0 ? `In Stock (${p2.available_stock} units)` : '⚠️ Out of Stock'} |
| **SKU Code** | \`${p1.sku}\` | \`${p2.sku}\` |
| **Key Specs** | ${p1.short_description || 'Standard specifications'} | ${p2.short_description || 'Standard specifications'} |

💡 **Shopping Insights:**
- **Price Difference:** **Rs ${priceDiff.toLocaleString()}** (*${cheaperItem}* is more budget-friendly).
- **Recommendation:** Choose **${p1.product_name}** for ${p1.category} applications or **${p2.product_name}** if you need ${p2.brand || p2.category} specifications.`;

  return {
    ai_message: tableMd,
    products: [p1, p2]
  };
}

module.exports = {
  getBuyerProductRecommendationsFromDb,
  compareBuyerProductsInDb
};
