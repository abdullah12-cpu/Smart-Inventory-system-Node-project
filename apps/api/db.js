require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');

// Load local environment variables from .env if it exists
try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch (e) {
  // Ignore if .env is missing (e.g., on your friend's Mac)
}

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:I$b2324563@localhost:5432/commerceiq';

const pool = new Pool({
  connectionString,
});

module.exports = pool;

