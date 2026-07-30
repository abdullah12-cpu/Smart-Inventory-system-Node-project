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

function buildQuotationDescription(quote) {
  const prodName = quote.product_name || quote.item || 'Wholesale Item';
  const sku = quote.sku || 'SKU-WHOLESALE';
  const qty = quote.quantity || 1;
  const unitPrice = parseFloat(quote.unit_price || 0);
  const origPrice = parseFloat(quote.original_unit_price || unitPrice || 1000);
  const maxDisc = quote.max_discount_pct !== undefined && quote.max_discount_pct !== null ? parseInt(quote.max_discount_pct) : 0;
  const minPrice = quote.min_price_allowed ? parseFloat(quote.min_price_allowed) : Math.round(origPrice * (1 - maxDisc / 100));
  const totalAmt = parseFloat(quote.total_amount || unitPrice * qty);
  const status = quote.status || 'DRAFT';
  const lastCounter = quote.last_counter_by || 'DISTRIBUTOR';

  const discountPct = origPrice > 0 ? Math.round(((origPrice - unitPrice) / origPrice) * 100) : 0;

  return [
    `📋 **Quotation Item Breakdown & Specification:**`,
    `- **Quotation Number**: **${quote.quotation_number || quote.quotation_id}**`,
    `- **Product Name**: **${prodName}** (SKU: \`${sku}\`)`,
    `- **Order Quantity**: ${qty} units`,
    `- **Original List Price**: Rs ${origPrice.toLocaleString()} / unit`,
    `- **Max Allowed Discount**: ${maxDisc}% (Minimum Allowed Price: Rs ${minPrice.toLocaleString()})`,
    `- **Offered Unit Price**: **Rs ${unitPrice.toLocaleString()} / unit** (${discountPct}% discount)`,
    `- **Total Quotation Amount**: **Rs ${totalAmt.toLocaleString()}**`,
    `- **Quotation Status**: \`${status}\``,
    `- **Last Counter Proposed By**: **${lastCounter}**`
  ].join('\n');
}

async function createDistributorQuotationInDb(pool, customerEmail, customerName, productNameOrSku, quantity = 10, targetPrice = null) {
  const email = customerEmail || 'asim@commerceiq.com';
  const name = customerName || 'Authorized Wholesale Partner';
  const qty = parseInt(quantity) || 10;

  let product = null;
  if (productNameOrSku) {
    const prodRes = await pool.query(
      'SELECT * FROM products WHERE product_name ILIKE $1 OR sku ILIKE $1 LIMIT 1',
      [`%${productNameOrSku}%`]
    );
    if (prodRes.rows.length > 0) product = prodRes.rows[0];
  }

  const prodName = product ? product.product_name : (productNameOrSku || 'Wholesale Batch');
  const sku = product ? product.sku : 'SKU-WHOLESALE';

  let origUnitPrice = 0;
  let maxDiscountPct = product && product.max_discount !== undefined && product.max_discount !== null ? parseInt(product.max_discount) : 0;
  if (product && product.prices) {
    const prices = typeof product.prices === 'string' ? JSON.parse(product.prices) : product.prices;
    origUnitPrice = parseFloat(prices.DISTRIBUTOR || prices.RETAIL || 1000);
  } else {
    origUnitPrice = 1500;
  }

  const minPriceAllowed = Math.round(origUnitPrice * (1 - maxDiscountPct / 100));
  let unitPrice = targetPrice && parseFloat(targetPrice) > 0 ? parseFloat(targetPrice) : origUnitPrice;

  // Validation Checks
  if (unitPrice < minPriceAllowed) {
    throw new Error(`Proposed unit price Rs ${unitPrice.toLocaleString()} is below the minimum allowed price threshold of ${maxDiscountPct}% discount (Minimum allowed: Rs ${minPriceAllowed.toLocaleString()}).`);
  }
  if (unitPrice > origUnitPrice) {
    throw new Error(`Proposed unit price Rs ${unitPrice.toLocaleString()} cannot exceed the original wholesale list price (Maximum allowed: Rs ${origUnitPrice.toLocaleString()}).`);
  }

  const totalAmount = unitPrice * qty;
  const quoteId = `quo-${Date.now()}`;
  const quoteNumber = `QUO-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const initialHistory = [{
    action: 'CREATED',
    by: 'DISTRIBUTOR',
    unit_price: unitPrice,
    total_amount: totalAmount,
    timestamp: new Date().toISOString()
  }];

  const quoteObj = {
    quotation_id: quoteId,
    quotation_number: quoteNumber,
    product_name: prodName,
    sku: sku,
    quantity: qty,
    unit_price: unitPrice,
    original_unit_price: origUnitPrice,
    min_price_allowed: minPriceAllowed,
    max_discount_pct: maxDiscountPct,
    total_amount: totalAmount,
    status: 'PENDING',  // Changed from COUNTER_OFFER_RECEIVED to PENDING for new quotes
    valid_until: validUntil,
    customer_name: name,
    customer_email: email,
    last_counter_by: 'DISTRIBUTOR',
    counter_history: JSON.stringify(initialHistory)
  };

  quoteObj.description = buildQuotationDescription(quoteObj);

  const res = await pool.query(
    `INSERT INTO quotations (
      quotation_id, quotation_number, status, total_amount, valid_until, created_at,
      product_name, sku, quantity, unit_price, original_unit_price, min_price_allowed,
      max_discount_pct, customer_email, customer_name, last_counter_by, counter_history, description
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     RETURNING *`,
    [
      quoteObj.quotation_id, quoteObj.quotation_number, quoteObj.status, quoteObj.total_amount,
      quoteObj.valid_until, new Date().toISOString(), quoteObj.product_name, quoteObj.sku,
      quoteObj.quantity, quoteObj.unit_price, quoteObj.original_unit_price, quoteObj.min_price_allowed,
      quoteObj.max_discount_pct, quoteObj.customer_email, quoteObj.customer_name, quoteObj.last_counter_by,
      quoteObj.counter_history, quoteObj.description
    ]
  );

  return res.rows[0];
}

async function counterOfferQuotationInDb(pool, quoteIdentifier, counterUnitPrice, counterBy = 'DISTRIBUTOR', notes = '') {
  const findRes = await pool.query(
    'SELECT * FROM quotations WHERE quotation_id ILIKE $1 OR quotation_number ILIKE $1 ORDER BY id DESC LIMIT 1',
    [`%${quoteIdentifier}%`]
  );

  let quote;
  if (findRes.rows.length === 0) {
    const recentRes = await pool.query('SELECT * FROM quotations ORDER BY id DESC LIMIT 1');
    if (recentRes.rows.length === 0) {
      throw new Error(`Quotation matching "${quoteIdentifier}" not found.`);
    }
    quote = recentRes.rows[0];
  } else {
    quote = findRes.rows[0];
  }

  const newUnitPrice = parseFloat(counterUnitPrice);
  const origPrice = parseFloat(quote.original_unit_price || quote.unit_price || 1000);
  const maxDisc = quote.max_discount_pct !== undefined && quote.max_discount_pct !== null ? parseInt(quote.max_discount_pct) : 0;
  const minPrice = quote.min_price_allowed ? parseFloat(quote.min_price_allowed) : Math.round(origPrice * (1 - maxDisc / 100));

  const role = counterBy.toUpperCase();

  // Role-Specific Validation Checks
  if (role === 'ADMIN') {
    // Admin cannot send counter less than distributor's requested price
    const distRequestedPrice = parseFloat(quote.unit_price || minPrice);
    if (newUnitPrice < distRequestedPrice) {
      throw new Error(`Admin counter offer (Rs ${newUnitPrice.toLocaleString()}) cannot be lower than the price requested by the distributor (Rs ${distRequestedPrice.toLocaleString()}).`);
    }
    // Admin cannot send counter higher than original base wholesale price
    if (newUnitPrice > origPrice) {
      throw new Error(`Admin counter offer (Rs ${newUnitPrice.toLocaleString()}) cannot exceed the original base wholesale price (Rs ${origPrice.toLocaleString()}).`);
    }
  } else {
    // Distributor cannot send proposal lower than discounted floor price
    if (newUnitPrice < minPrice) {
      throw new Error(`Distributor proposed price (Rs ${newUnitPrice.toLocaleString()}) cannot be lower than the minimum allowed floor price set by vendor (Minimum floor price: Rs ${minPrice.toLocaleString()}).`);
    }
    // Distributor cannot send proposal higher than original base wholesale price
    if (newUnitPrice > origPrice) {
      throw new Error(`Distributor proposed price (Rs ${newUnitPrice.toLocaleString()}) cannot exceed the original base wholesale price (Rs ${origPrice.toLocaleString()}).`);
    }
  }

  const qty = parseInt(quote.quantity || 10);
  const newTotal = newUnitPrice * qty;
  const newStatus = 'COUNTER_OFFER_RECEIVED';

  let historyArr = [];
  try {
    historyArr = typeof quote.counter_history === 'string' ? JSON.parse(quote.counter_history) : (quote.counter_history || []);
  } catch (_) { historyArr = []; }

  historyArr.push({
    action: 'COUNTER_OFFER',
    by: counterBy.toUpperCase(),
    unit_price: newUnitPrice,
    total_amount: newTotal,
    notes: notes || `Counter offer of Rs ${newUnitPrice.toLocaleString()} submitted by ${counterBy}`,
    timestamp: new Date().toISOString()
  });

  const updatedData = {
    ...quote,
    unit_price: newUnitPrice,
    total_amount: newTotal,
    status: newStatus,
    last_counter_by: counterBy.toUpperCase(),
    counter_history: JSON.stringify(historyArr)
  };

  const newDescription = buildQuotationDescription(updatedData);

  const res = await pool.query(
    `UPDATE quotations SET
      unit_price = $1,
      total_amount = $2,
      status = $3,
      last_counter_by = $4,
      counter_history = $5,
      description = $6
     WHERE quotation_id = $7
     RETURNING *`,
    [newUnitPrice, newTotal, newStatus, counterBy.toUpperCase(), JSON.stringify(historyArr), newDescription, quote.quotation_id]
  );

  return res.rows[0];
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
  payDistributorInvoiceInDb,
  counterOfferQuotationInDb,
  buildQuotationDescription
};

