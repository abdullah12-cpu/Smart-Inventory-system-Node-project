const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://mac@localhost:5432/commerceiq';

const pool = new Pool({
  connectionString,
});

module.exports = pool;
