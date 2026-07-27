async function getDistributorWholesaleProductsFromDb(pool, identifier) {
  let query = 'SELECT product_id, sku, barcode, product_name, brand, category, prices, inventory, min_wholesale_qty, max_discount, status FROM products WHERE status = $1';
  let params = ['ACTIVE'];

  if (identifier) {
    query += ' AND (product_name ILIKE $2 OR sku ILIKE $2 OR category ILIKE $2 OR brand ILIKE $2)';
    params.push(`%${identifier}%`);
  }

  query += ' LIMIT 20';
  const res = await pool.query(query, params);
  return res.rows;
}

async function getDistributorQuotationsFromDb(pool, customerEmail) {
  let query = 'SELECT * FROM quotations';
  let params = [];

  if (customerEmail) {
    query += ' WHERE customer_email ILIKE $1';
    params.push(`%${customerEmail}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT 20';
  const res = await pool.query(query, params);
  return res.rows;
}

async function getDistributorOrdersFromDb(pool, customerEmail) {
  let query = "SELECT * FROM orders WHERE order_type = 'B2B'";
  let params = [];

  if (customerEmail) {
    query += ' AND customer_email ILIKE $1';
    params.push(`%${customerEmail}%`);
  }

  query += ' ORDER BY order_date DESC LIMIT 20';
  const res = await pool.query(query, params);
  return res.rows;
}

async function getDistributorLedgerStatusFromDb(pool, customerEmail) {
  const defaultLedger = {
    distributor_name: 'Authorized Wholesale Partner',
    email: customerEmail || 'asim@commerceiq.com',
    credit_limit_pkr: 500000,
    used_credit_pkr: 185000,
    available_credit_pkr: 315000,
    outstanding_invoices_count: 2,
    overdue_amount_pkr: 0,
    payment_terms: 'NET-30'
  };

  try {
    const ordersRes = await pool.query(
      "SELECT SUM(total_amount) as total_spent FROM orders WHERE order_type = 'B2B' AND status != 'CANCELLED'"
    );
    const totalSpent = parseFloat(ordersRes.rows[0]?.total_spent || 0);
    defaultLedger.used_credit_pkr = Math.min(defaultLedger.credit_limit_pkr, totalSpent || 185000);
    defaultLedger.available_credit_pkr = defaultLedger.credit_limit_pkr - defaultLedger.used_credit_pkr;
  } catch (err) {
    console.error('Error fetching ledger details:', err.message);
  }

  return defaultLedger;
}

module.exports = {
  getDistributorWholesaleProductsFromDb,
  getDistributorQuotationsFromDb,
  getDistributorOrdersFromDb,
  getDistributorLedgerStatusFromDb
};
