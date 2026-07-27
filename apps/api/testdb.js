const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:I$b2324563@localhost:5432/commerceiq' });
pool.query('SELECT count(*) FROM products').then(res => {
  console.log('Total products:', res.rows[0].count);
  pool.end();
}).catch(console.error);
