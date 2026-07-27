const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:I$b2324563@localhost:5432/commerceiq' });
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products'")
  .then(res => {
    console.log("Columns:", res.rows);
    pool.end();
  }).catch(console.error);
