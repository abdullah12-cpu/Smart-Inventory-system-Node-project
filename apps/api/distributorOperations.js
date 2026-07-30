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

async function getDistributorQuotationsByStatusFromDb(pool, status) {
  const normStatus = status.toUpperCase().replace(/\s+/g, '_');
  if (normStatus === 'DRAFT' || normStatus === 'UNDER_REVIEW' || normStatus === 'PENDING') {
    const res = await pool.query(
      "SELECT * FROM quotations WHERE UPPER(status) IN ('DRAFT', 'UNDER_REVIEW', 'PENDING') ORDER BY created_at DESC LIMIT 30"
    );
    return res.rows;
  }
  const res = await pool.query(
    'SELECT * FROM quotations WHERE UPPER(status) = $1 ORDER BY created_at DESC LIMIT 30',
    [normStatus]
  );
  return res.rows;
}

async function getDistributorQuotationByIdFromDb(pool, identifier) {
  const res = await pool.query(
    'SELECT * FROM quotations WHERE quotation_id ILIKE $1 OR quotation_number ILIKE $1 LIMIT 5',
    [`%${identifier}%`]
  );
  return res.rows;
}

async function getDistributorQuotationsByAmountFromDb(pool, operator, amount) {
  const op = operator === 'above' || operator === 'greater' ? '>' : '<';
  const res = await pool.query(
    `SELECT * FROM quotations WHERE total_amount ${op} $1 ORDER BY total_amount DESC LIMIT 30`,
    [parseFloat(amount)]
  );
  return res.rows;
}

async function updateDistributorQuotationStatusInDb(pool, identifier, newStatus) {
  const normStatus = newStatus.toUpperCase().replace(/\s+/g, '_');
  const res = await pool.query(
    'UPDATE quotations SET status = $1 WHERE quotation_id ILIKE $2 OR quotation_number ILIKE $2 RETURNING *',
    [normStatus, `%${identifier}%`]
  );
  if (res.rows.length === 0) throw new Error(`Quotation not found matching: "${identifier}"`);
  
  const quote = res.rows[0];

  if (normStatus === 'APPROVED' || normStatus === 'ACCEPTED') {
    try {
      const orderNumber = (quote.quotation_number || quote.quotation_id).replace("QUO-", "ORD-");
      const checkOrder = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
      if (checkOrder.rows.length === 0) {
        const orderId = `ord-b2b-${Date.now()}`;
        const items = quote.items || [{
          product_id: 'b2b-stock',
          name: quote.product_name || quote.item || 'B2B Wholesale Order',
          qty: quote.quantity || 1,
          price: quote.unit_price || quote.total_amount
        }];
        await pool.query(
          `INSERT INTO orders (
            order_id, order_number, order_type, status, subtotal, discount_total, 
            tax_total, total_amount, currency, order_date, items_summary, items, customer_email
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            orderId,
            orderNumber,
            'B2B',
            'PROCESSING',
            quote.total_amount || 0,
            0,
            0,
            quote.total_amount || 0,
            'PKR',
            new Date().toISOString(),
            `Wholesale B2B Order generated from ${quote.quotation_number || quote.quotation_id}`,
            JSON.stringify(items),
            quote.customer_email || 'asim@commerceiq.com'
          ]
        );
      }
    } catch (orderErr) {
      console.error('Error auto-creating B2B order from quotation status update:', orderErr.message);
    }
  }

  return quote;
}

async function getDistributorQuotationKpisFromDb(pool) {
  const countRes = await pool.query('SELECT COUNT(*) as active_count, COALESCE(SUM(total_amount), 0) as total_value FROM quotations');
  const pendingRes = await pool.query("SELECT COUNT(*) as pending_count FROM quotations WHERE UPPER(status) IN ('PENDING', 'NEGOTIATING', 'DRAFT')");
  const statusRes = await pool.query('SELECT status, COUNT(*) as count, SUM(total_amount) as amount FROM quotations GROUP BY status ORDER BY count DESC');

  return {
    active_quotations: parseInt(countRes.rows[0]?.active_count || 0),
    total_bid_value: parseFloat(countRes.rows[0]?.total_value || 0),
    pending_acceptance: parseInt(pendingRes.rows[0]?.pending_count || 0),
    by_status: statusRes.rows
  };
}

async function getDistributorQuotationsByProductFromDb(pool, productName) {
  const res = await pool.query(
    'SELECT * FROM quotations WHERE item ILIKE $1 OR quotation_id ILIKE $1 ORDER BY created_at DESC LIMIT 20',
    [`%${productName}%`]
  );
  return res.rows;
}

async function getExpiringDistributorQuotationsFromDb(pool, days = 7) {
  const res = await pool.query(
    `SELECT * FROM quotations 
     WHERE valid_until IS NOT NULL 
       AND CAST(valid_until AS DATE) <= CURRENT_DATE + INTERVAL '${parseInt(days)} days'
     ORDER BY valid_until ASC LIMIT 20`
  );
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

async function createDistributorQuotationInDb(pool, customerEmail, customerName, productNameOrSku, quantity = 10, targetPrice = null) {
  const email = customerEmail || 'asim@commerceiq.com';
  const name = customerName || 'Authorized Wholesale Partner';
  const qty = parseInt(quantity) || 10;

  // Find product by name or SKU
  let product = null;
  if (productNameOrSku) {
    const prodRes = await pool.query(
      'SELECT * FROM products WHERE product_name ILIKE $1 OR sku ILIKE $1 LIMIT 1',
      [`%${productNameOrSku}%`]
    );
    if (prodRes.rows.length > 0) {
      product = prodRes.rows[0];
    }
  }

  const prodName = product ? product.product_name : (productNameOrSku || 'Wholesale Batch');
  const sku = product ? product.sku : 'SKU-WHOLESALE';

  let unitPrice = 0;
  if (targetPrice && parseFloat(targetPrice) > 0) {
    unitPrice = parseFloat(targetPrice);
  } else if (product && product.prices) {
    const prices = typeof product.prices === 'string' ? JSON.parse(product.prices) : product.prices;
    unitPrice = parseFloat(prices.DISTRIBUTOR || prices.RETAIL || 1000);
  } else {
    unitPrice = 1500;
  }

  const totalAmount = unitPrice * qty;
  const quoteId = `quo-${Date.now()}`;
  const quoteNumber = `QUO-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const res = await pool.query(
    `INSERT INTO quotations (quotation_id, quotation_number, status, total_amount, valid_until, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [quoteId, quoteNumber, 'DRAFT', totalAmount, validUntil, new Date().toISOString()]
  );

  return {
    quotation_id: res.rows[0].quotation_id,
    quotation_number: res.rows[0].quotation_number,
    product_name: prodName,
    sku: sku,
    quantity: qty,
    unit_price: unitPrice,
    total_amount: totalAmount,
    status: 'DRAFT',
    valid_until: validUntil,
    customer_name: name,
    customer_email: email
  };
}

async function createDistributorDirectOrderInDb(pool, customerEmail, customerName, productNameOrSku, quantity = 10, warehouseDepot = 'Karachi Central Depot') {
  const email = customerEmail || 'asim@commerceiq.com';
  const qty = parseInt(quantity) || 10;

  // Find product by name or SKU
  const prodRes = await pool.query(
    'SELECT * FROM products WHERE product_name ILIKE $1 OR sku ILIKE $1 LIMIT 1',
    [`%${productNameOrSku}%`]
  );
  if (prodRes.rows.length === 0) {
    throw new Error(`Product "${productNameOrSku}" not found in wholesale catalog.`);
  }
  const product = prodRes.rows[0];

  const prices = typeof product.prices === 'string' ? JSON.parse(product.prices) : product.prices;
  const unitPrice = parseFloat(prices.DISTRIBUTOR || prices.RETAIL || 1000);
  const minQty = product.min_wholesale_qty || 1;

  if (qty < minQty) {
    throw new Error(`Minimum Wholesale Order Quantity (MOQ) for ${product.product_name} is ${minQty} units.`);
  }

  // Stock deduction
  let inventory = typeof product.inventory === 'string' ? JSON.parse(product.inventory) : product.inventory;
  if (Array.isArray(inventory) && inventory.length > 0) {
    if (inventory[0].available_quantity < qty) {
      throw new Error(`Insufficient stock for ${product.product_name}. Available: ${inventory[0].available_quantity} units.`);
    }
    inventory[0].quantity = Math.max(0, inventory[0].quantity - qty);
    inventory[0].available_quantity = Math.max(0, inventory[0].available_quantity - qty);

    await pool.query(
      'UPDATE products SET inventory = $1 WHERE product_id = $2',
      [JSON.stringify(inventory), product.product_id]
    );
  }

  const subtotal = unitPrice * qty;
  const totalAmount = subtotal;
  const orderId = `ord-po-${Date.now()}`;
  const orderNumber = `ORD-PO-${Math.floor(1000 + Math.random() * 9000)}`;

  const items = [{
    product_id: product.product_id,
    sku: product.sku,
    name: product.product_name,
    qty: qty,
    price: unitPrice,
    depot: warehouseDepot
  }];
  const itemsSummary = `${qty}x ${product.product_name} (${product.sku})`;

  const res = await pool.query(
    `INSERT INTO orders (
      order_id, order_number, order_type, status, subtotal, discount_total, 
      tax_total, total_amount, currency, order_date, items_summary, items, customer_email
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      orderId,
      orderNumber,
      'B2B',
      'PROCESSING',
      subtotal,
      0,
      0,
      totalAmount,
      'PKR',
      new Date().toISOString(),
      itemsSummary,
      JSON.stringify(items),
      email
    ]
  );

  return {
    order_id: res.rows[0].order_id,
    order_number: res.rows[0].order_number,
    product_name: product.product_name,
    sku: product.sku,
    quantity: qty,
    unit_price: unitPrice,
    total_amount: totalAmount,
    warehouse_depot: warehouseDepot,
    status: 'PROCESSING',
    customer_email: email
  };
}

async function payDistributorInvoiceInDb(pool, invoiceIdOrNumber, paymentAmount, customerEmail) {
  let invQuery = 'SELECT * FROM invoices WHERE invoice_id ILIKE $1 OR invoice_number ILIKE $1';
  let invRes = await pool.query(invQuery, [`%${invoiceIdOrNumber || ''}%`]);

  if (invRes.rows.length === 0) {
    const openInvRes = await pool.query("SELECT * FROM invoices WHERE UPPER(status) != 'PAID' ORDER BY id DESC LIMIT 1");
    if (openInvRes.rows.length > 0) {
      invRes = openInvRes;
    } else {
      throw new Error(`Invoice matching "${invoiceIdOrNumber || 'open'}" not found.`);
    }
  }

  const invoice = invRes.rows[0];
  const totalAmt = parseFloat(invoice.total_amount || 0);
  const currentPaid = parseFloat(invoice.amount_paid || 0);
  const remaining = totalAmt - currentPaid;
  const payAmt = paymentAmount ? parseFloat(paymentAmount) : (remaining > 0 ? remaining : totalAmt);
  
  const newAmountPaid = Math.min(totalAmt, currentPaid + payAmt);
  const newStatus = newAmountPaid >= totalAmt ? 'PAID' : 'PARTIAL';

  const updateRes = await pool.query(
    'UPDATE invoices SET amount_paid = $1, status = $2 WHERE invoice_id = $3 RETURNING *',
    [newAmountPaid, newStatus, invoice.invoice_id]
  );

  return updateRes.rows[0];
}

module.exports = {
  getDistributorWholesaleProductsFromDb,
  getDistributorQuotationsFromDb,
  getDistributorQuotationsByStatusFromDb,
  getDistributorQuotationByIdFromDb,
  getDistributorQuotationsByAmountFromDb,
  updateDistributorQuotationStatusInDb,
  getDistributorQuotationKpisFromDb,
  getDistributorQuotationsByProductFromDb,
  getExpiringDistributorQuotationsFromDb,
  getDistributorOrdersFromDb,
  getDistributorLedgerStatusFromDb,
  createDistributorQuotationInDb,
  createDistributorDirectOrderInDb,
  payDistributorInvoiceInDb
};

