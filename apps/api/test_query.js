const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:I$b2324563@localhost:5432/commerceiq' });

async function searchProductsInDb(pool, identifier) {
  const getRes = await pool.query(
    'SELECT * FROM products WHERE product_name ILIKE $1 OR sku ILIKE $1 OR product_id = $1 LIMIT 5',
    [`%${identifier}%`]
  );
  return getRes.rows;
}

searchProductsInDb(pool, 'cables').then(console.log).catch(console.error).finally(() => pool.end());
