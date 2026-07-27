const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:I$b2324563@localhost:5432/commerceiq' });

async function searchProductsInDb(pool, identifier) {
  const getRes = await pool.query(
    'SELECT * FROM products WHERE product_name ILIKE $1 OR sku ILIKE $1 OR product_id = $1 LIMIT 5',
    [`%${identifier}%`]
  );
  return getRes.rows;
}

async function test() {
  try {
    const rows = await searchProductsInDb(pool, 'cables');
    let markdownMsg = `### 🔍 Search Results\n| Product | SKU | Price | Stock |\n|---|---|---|---|\n` + 
      rows.map(r => {
        const prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices;
        const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
        const stock = inv && inv.length > 0 ? inv[0].available_quantity : 0;
        return `| ${r.product_name} | ${r.sku} | Rs ${prices.RETAIL?.toLocaleString() || 0} | ${stock} |`;
      }).join('\n');
    console.log(markdownMsg);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    pool.end();
  }
}
test();
