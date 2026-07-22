const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const { createProductInDb } = require('./operations');

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Initialize Database Table and Seed Predefined Accounts
async function initDb() {
  const client = await pool.connect();
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL, -- 'admin', 'distributor', 'buyer'
        status VARCHAR(50) DEFAULT 'ACTIVE',
        
        -- Distributor fields
        business_name VARCHAR(255),
        contact_name VARCHAR(255),
        ntn_code VARCHAR(100),
        warehouse_region VARCHAR(50),
        credit_request VARCHAR(100),
        
        -- Buyer fields
        buyer_store_name VARCHAR(255),
        buyer_contact_name VARCHAR(255),
        buyer_phone VARCHAR(50),
        buyer_address TEXT,
        buyer_region VARCHAR(50),
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(50) UNIQUE NOT NULL,
        sku VARCHAR(100) UNIQUE NOT NULL,
        barcode VARCHAR(100),
        product_name VARCHAR(255) NOT NULL,
        short_description TEXT,
        brand VARCHAR(100),
        category VARCHAR(100),
        unit VARCHAR(50),
        weight NUMERIC(10, 2),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        low_stock_threshold INTEGER,
        overstock_threshold INTEGER,
        dead_stock_days INTEGER,
        total_product_limit INTEGER DEFAULT 100,
        min_wholesale_qty INTEGER DEFAULT 1,
        max_discount INTEGER DEFAULT 10,
        prices JSONB NOT NULL,
        inventory JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        order_number VARCHAR(100) UNIQUE NOT NULL,
        order_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        subtotal NUMERIC(15, 2) NOT NULL,
        discount_total NUMERIC(15, 2) NOT NULL,
        tax_total NUMERIC(15, 2) NOT NULL,
        total_amount NUMERIC(15, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'PKR',
        order_date VARCHAR(100),
        items_summary TEXT,
        items JSONB NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create quotations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id SERIAL PRIMARY KEY,
        quotation_id VARCHAR(50) UNIQUE NOT NULL,
        quotation_number VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        total_amount NUMERIC(15, 2) NOT NULL,
        valid_until VARCHAR(100) NOT NULL,
        created_at VARCHAR(100) NOT NULL
      );
    `);

    // Create suppliers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        supplier_id VARCHAR(50) UNIQUE NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(100),
        city VARCHAR(100),
        country VARCHAR(100),
        reliability_score INTEGER DEFAULT 100,
        lead_time_days INTEGER DEFAULT 0
      );
    `);

    // Create invoices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_id VARCHAR(50) UNIQUE NOT NULL,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'SENT',
        total_amount NUMERIC(15, 2) NOT NULL,
        amount_paid NUMERIC(15, 2) DEFAULT 0,
        due_date VARCHAR(100),
        late_payment_probability NUMERIC(5, 2) DEFAULT 0
      );
    `);

    // Create payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        payment_id VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        payment_method VARCHAR(100),
        reference_no VARCHAR(100),
        payment_date VARCHAR(100),
        status VARCHAR(50) DEFAULT 'RECORDED'
      );
    `);

    // Create stock_movements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        movement_id VARCHAR(50) UNIQUE NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        warehouse_id VARCHAR(50) NOT NULL,
        warehouse_name VARCHAR(255) NOT NULL,
        movement_type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        notes TEXT,
        performed_by VARCHAR(255),
        created_at VARCHAR(100)
      );
    `);

    // Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        audit_id VARCHAR(50) UNIQUE NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        record_id VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        performed_by VARCHAR(255) NOT NULL,
        notes TEXT,
        created_at VARCHAR(100) NOT NULL
      );
    `);

    // Create warehouses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        warehouse_id VARCHAR(50) UNIQUE NOT NULL,
        warehouse_name VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        country VARCHAR(255) NOT NULL,
        manager_name VARCHAR(255)
      );
    `);

    // Seed predefined warehouses
    const whCountRes = await client.query('SELECT COUNT(*) FROM warehouses');
    if (parseInt(whCountRes.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO warehouses (warehouse_id, warehouse_name, city, country, manager_name)
        VALUES 
        ('wh-1', 'Karachi Central Depot', 'Karachi', 'Pakistan', 'Asim Raza'),
        ('wh-2', 'Lahore North Terminal', 'Lahore', 'Pakistan', 'Imran Khan'),
        ('wh-3', 'Islamabad Capital Hub', 'Islamabad', 'Pakistan', 'Zafar Ali')
      `);
      console.log("Predefined warehouses seeded successfully in PostgreSQL!");
    }

    // Migrate existing DB if needed
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS total_product_limit INTEGER DEFAULT 100;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE products ALTER COLUMN image_url TYPE TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS min_wholesale_qty INTEGER DEFAULT 1;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS max_discount INTEGER DEFAULT 10;
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS items JSONB;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
    `);

    // Seed predefined admin
    await client.query(`
      INSERT INTO users (email, password, role, contact_name)
      VALUES ('saif@commerceiq.com', 'demopassword', 'admin', 'Saif Shahzad')
      ON CONFLICT (email) DO NOTHING;
    `);

    // Seed predefined distributor
    await client.query(`
      INSERT INTO users (email, password, role, contact_name, business_name, warehouse_region, credit_request)
      VALUES ('asim@commerceiq.com', 'demopassword', 'distributor', 'Asim Raza', 'Asim Distribution Pak', 'wh-1', '500000')
      ON CONFLICT (email) DO NOTHING;
    `);

    // Seed predefined buyer
    await client.query(`
      INSERT INTO users (email, password, role, buyer_contact_name, buyer_store_name, buyer_region, buyer_address, buyer_phone)
      VALUES ('demo@commerceiq.com', 'demopassword', 'buyer', 'Demo Buyer', 'Demo B2B Buyer Store', 'wh-1', 'Saddar, Karachi', '+92 300 0000000')
      ON CONFLICT (email) DO NOTHING;
    `);

    // Seed predefined products
    const prodCountResult = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(prodCountResult.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO products (
          product_id, sku, barcode, product_name, short_description, brand, 
          category, unit, weight, status, low_stock_threshold, overstock_threshold, 
          dead_stock_days, prices, inventory
        ) VALUES 
        (
          'p-1', 'SKU-CISCO-9300', '012345678901', 'Cisco Fiber Catalyst 9300', 
          'High performance catalyst networking fiber switch.', 'Cisco', 'Networking', 'Units', 4.5, 'ACTIVE', 15, 60, 90, 
          '{"RETAIL": 150000, "WHOLESALE": 120000, "LOYALTY": 135000}'::jsonb,
          '[{"warehouse_id": "wh-1", "warehouse_name": "Karachi Depot", "city": "Karachi", "country": "Pakistan", "quantity": 42, "reserved_quantity": 0, "available_quantity": 42}, {"warehouse_id": "wh-2", "warehouse_name": "Lahore Terminal", "city": "Lahore", "country": "Pakistan", "quantity": 18, "reserved_quantity": 0, "available_quantity": 18}]'::jsonb
        ),
        (
          'p-2', 'SKU-CORNING-4KM', '012345678902', 'Corning Fiber Optic Spool 4km', 
          'High speed transmission single mode fiber optic spool.', 'Corning', 'Cables', 'Spools', 12.0, 'ACTIVE', 10, 40, 60, 
          '{"RETAIL": 85000, "WHOLESALE": 68000, "LOYALTY": 75000}'::jsonb,
          '[{"warehouse_id": "wh-1", "warehouse_name": "Karachi Depot", "city": "Karachi", "country": "Pakistan", "quantity": 8, "reserved_quantity": 0, "available_quantity": 8}, {"warehouse_id": "wh-2", "warehouse_name": "Lahore Terminal", "city": "Lahore", "country": "Pakistan", "quantity": 12, "reserved_quantity": 0, "available_quantity": 12}]'::jsonb
        ),
        (
          'p-3', 'SKU-NVIDIA-CX6', '012345678903', 'Nvidia Mellanox ConnectX-6', 
          'Dual-port smart Network Interface Card 200Gb/s.', 'Nvidia', 'Hardware', 'Units', 0.8, 'ACTIVE', 8, 30, 45, 
          '{"RETAIL": 250000, "WHOLESALE": 200000, "LOYALTY": 220000}'::jsonb,
          '[{"warehouse_id": "wh-1", "warehouse_name": "Karachi Depot", "city": "Karachi", "country": "Pakistan", "quantity": 15, "reserved_quantity": 0, "available_quantity": 15}, {"warehouse_id": "wh-2", "warehouse_name": "Lahore Terminal", "city": "Lahore", "country": "Pakistan", "quantity": 4, "reserved_quantity": 0, "available_quantity": 4}]'::jsonb
        )
      `);
      console.log("Predefined catalog products seeded successfully in PostgreSQL!");
    }

    console.log("Database tables initialized, predefined users seeded successfully in PostgreSQL!");
  } catch (err) {
    console.error("Error during database tables initialization:", err);
  } finally {
    client.release();
  }
}

// Invoke DB initialization
initDb();

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password, portal } = req.body;
  if (!email || !password || !portal) {
    return res.status(400).json({ success: false, message: 'Please provide email, password, and portal context.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or account does not exist.' });
    }

    const user = result.rows[0];

    // Simple plain-text password comparison
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    // Status validation
    if (user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({ success: false, message: 'Your distributor account registration is pending approval by the Admin.' });
    }

    if (user.status === 'REJECTED') {
      return res.status(403).json({ success: false, message: 'Your distributor account registration has been rejected by the Admin.' });
    }

    if (user.status === 'DEACTIVATED' || user.status === 'REMOVED') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated or removed.' });
    }

    // Role vs Portal Context validation
    // Portal can be 'admin', 'distributor', 'buyer'.
    // DB user role can be 'admin', 'distributor', 'buyer'.
    if (user.role !== portal) {
      return res.status(403).json({ 
        success: false, 
        message: `Role mismatch. This account is registered as a ${user.role}, but you are trying to sign into the ${portal} portal.` 
      });
    }

    // Map to frontend user session structure
    let sessionUser = {
      user_id: `u-${user.id}`,
      email: user.email,
      role_name: user.role === 'admin' ? 'Super Admin' : (user.role === 'distributor' ? 'Inventory Manager' : 'B2B Buyer'),
      profile_image: user.role === 'admin' 
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop'
        : (user.role === 'distributor' 
            ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop'
            : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&fit=crop'),
      business_name: user.business_name || '',
      ntn_code: user.ntn_code || '',
      warehouse_region: user.warehouse_region || '',
      credit_request: user.credit_request || '2500000',
      buyer_store_name: user.buyer_store_name || '',
      buyer_phone: user.buyer_phone || '',
      buyer_address: user.buyer_address || '',
      buyer_region: user.buyer_region || '',
      country: user.country || '',
      city: user.city || ''
    };

    if (user.role === 'buyer') {
      sessionUser.first_name = user.buyer_contact_name || 'Buyer';
      sessionUser.last_name = '';
    } else {
      const names = (user.contact_name || '').split(' ');
      sessionUser.first_name = names[0] || 'User';
      sessionUser.last_name = names.slice(1).join(' ') || '';
    }

    return res.json({
      success: true,
      message: 'Logged in successfully.',
      user: sessionUser
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Database error during login.' });
  }
});

// Register Distributor endpoint
app.post('/api/auth/register-distributor', async (req, res) => {
  const { businessName, contactName, regEmail, password, country, city } = req.body;
  if (!businessName || !contactName || !regEmail || !password || !country || !city) {
    return res.status(400).json({ success: false, message: 'Required fields missing.' });
  }

  try {
    // Check if user exists
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [regEmail]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email is already registered.' });
    }

    // Insert distributor with user-provided password
    await pool.query(
      `INSERT INTO users (email, password, role, contact_name, business_name, warehouse_region, credit_request, status, country, city) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [regEmail, password, 'distributor', contactName, businessName, 'wh-1', '2500000', 'PENDING_APPROVAL', country, city]
    );

    return res.status(201).json({ success: true, message: 'Distributor application registered successfully.' });
  } catch (err) {
    console.error('Distributor registration error:', err);
    return res.status(500).json({ success: false, message: 'Database error during distributor registration.' });
  }
});

// Register Buyer endpoint
app.post('/api/auth/register-buyer', async (req, res) => {
  const { buyerStoreName, buyerContactName, buyerEmail, password } = req.body;
  if (!buyerStoreName || !buyerContactName || !buyerEmail || !password) {
    return res.status(400).json({ success: false, message: 'Required fields missing.' });
  }

  try {
    // Check if user exists
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [buyerEmail]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email is already registered.' });
    }

    // Insert buyer with user-provided password and status ACTIVE
    await pool.query(
      `INSERT INTO users (email, password, role, buyer_contact_name, buyer_store_name, buyer_region, buyer_address, buyer_phone, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [buyerEmail, password, 'buyer', buyerContactName, buyerStoreName, 'wh-1', '', '', 'ACTIVE']
    );

    return res.status(201).json({ success: true, message: 'Buyer registered successfully.' });
  } catch (err) {
    console.error('Buyer registration error:', err);
    return res.status(500).json({ success: false, message: 'Database error during buyer registration.' });
  }
});

// GET application status for a distributor or buyer by email
app.get('/api/auth/application-status', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email query parameter is required.' });
  }

  try {
    const result = await pool.query('SELECT email, role, status, business_name, contact_name, created_at FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No registered application found for this email address.' });
    }

    const user = result.rows[0];
    return res.json({
      success: true,
      email: user.email,
      role: user.role,
      status: user.status || 'ACTIVE',
      business_name: user.business_name || user.contact_name || 'Partner',
      created_at: user.created_at
    });
  } catch (err) {
    console.error('Error fetching application status:', err);
    return res.status(500).json({ success: false, message: 'Database error fetching status.' });
  }
});

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    const products = result.rows.map(row => ({
      product_id: row.product_id,
      sku: row.sku,
      barcode: row.barcode,
      product_name: row.product_name,
      short_description: row.short_description || '',
      brand: row.brand || '',
      category: row.category || '',
      unit: row.unit || 'Units',
      weight: parseFloat(row.weight || 0),
      status: row.status || 'ACTIVE',
      low_stock_threshold: row.low_stock_threshold || 0,
      overstock_threshold: row.overstock_threshold || 0,
      dead_stock_days: row.dead_stock_days || 0,
      total_product_limit: row.total_product_limit || 100,
      min_wholesale_qty: parseInt(row.min_wholesale_qty || 1),
      max_discount: parseInt(row.max_discount || 10),
      prices: typeof row.prices === 'string' ? JSON.parse(row.prices) : row.prices,
      inventory: typeof row.inventory === 'string' ? JSON.parse(row.inventory) : row.inventory,
      image_url: row.image_url || ''
    }));
    return res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ success: false, message: 'Database error fetching products.' });
  }
});

// POST (UPSERT) product
app.post('/api/products', async (req, res) => {
  const prod = req.body;
  if (!prod.product_id || !prod.sku || !prod.product_name) {
    return res.status(400).json({ success: false, message: 'Missing product ID, SKU, or name.' });
  }

  // Formula validation: Sum of warehouse quantities cannot exceed total_product_limit
  const inventory = typeof prod.inventory === 'string' ? JSON.parse(prod.inventory) : (prod.inventory || []);
  const totalQty = inventory.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
  const limit = parseInt(prod.total_product_limit || 100);
  if (totalQty > limit) {
    return res.status(400).json({ 
      success: false, 
      message: `Validation failed: The sum of warehouse stock quantities (${totalQty}) cannot exceed the total product limit of ${limit}.` 
    });
  }

  try {
    const saved = await createProductInDb(pool, prod);
    return res.status(201).json({ success: true, message: 'Product created/updated successfully.', product: saved });
  } catch (err) {
    console.error('Error inserting product:', err);
    return res.status(500).json({ success: false, message: 'Database error during product creation.' });
  }
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM products WHERE product_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    
    // Log audit entry
    await pool.query(
      `INSERT INTO audit_logs (audit_id, table_name, record_id, action, performed_by, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [`aud-del-prod-${Date.now()}`, 'products', id, 'DELETE', 'Admin User', `Deleted product ${result.rows[0].product_name} (SKU: ${result.rows[0].sku}) from inventory catalog.`, new Date().toISOString()]
    );

    return res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('Error deleting product:', err);
    return res.status(500).json({ success: false, message: 'Database error during product deletion.' });
  }
});

// GET all orders
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    const orders = result.rows.map(row => ({
      order_id: row.order_id,
      order_number: row.order_number,
      order_type: row.order_type,
      status: row.status,
      subtotal: parseFloat(row.subtotal),
      discount_total: parseFloat(row.discount_total),
      tax_total: parseFloat(row.tax_total),
      total_amount: parseFloat(row.total_amount),
      currency: row.currency,
      order_date: row.order_date,
      items_summary: row.items_summary,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      customer_email: row.customer_email
    }));
    return res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    return res.status(500).json({ success: false, message: 'Database error fetching orders.' });
  }
});

// POST a new order (with auto quotation generation if type is B2C / placed by buyer)
app.post('/api/orders', async (req, res) => {
  const ord = req.body;
  if (!ord.order_id || !ord.order_number || !ord.total_amount) {
    return res.status(400).json({ success: false, message: 'Required order details missing.' });
  }

  try {
    // Insert order
    const result = await pool.query(
      `INSERT INTO orders (
        order_id, order_number, order_type, status, subtotal, discount_total, 
        tax_total, total_amount, currency, order_date, items_summary, items, customer_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        ord.order_id,
        ord.order_number,
        ord.order_type || 'B2C',
        ord.status || 'PENDING',
        ord.subtotal || 0,
        ord.discount_total || 0,
        ord.tax_total || 0,
        ord.total_amount,
        ord.currency || 'PKR',
        ord.order_date || new Date().toISOString(),
        ord.items_summary || '',
        JSON.stringify(ord.items || []),
        ord.customer_email || 'demo@commerceiq.com'
      ]
    );

    // If order type is B2C (placed by a buyer/retailer), auto-generate a matching Quotation in status 'NEGOTIATING' for the distributor
    if (ord.order_type === 'B2C') {
      const quoteId = `q-${Date.now()}`;
      const quoteNumber = `QUO-2026-${ord.order_number.split('-')[2]}`;
      await pool.query(
        `INSERT INTO quotations (quotation_id, quotation_number, status, total_amount, valid_until, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          quoteId,
          quoteNumber,
          'NEGOTIATING',
          ord.total_amount,
          new Date(Date.now() + 15*24*60*60*1000).toISOString(),
          new Date().toISOString()
        ]
      );
    }

    const row = result.rows[0];
    const savedOrder = {
      order_id: row.order_id,
      order_number: row.order_number,
      order_type: row.order_type,
      status: row.status,
      subtotal: parseFloat(row.subtotal),
      discount_total: parseFloat(row.discount_total),
      tax_total: parseFloat(row.tax_total),
      total_amount: parseFloat(row.total_amount),
      currency: row.currency,
      order_date: row.order_date,
      items_summary: row.items_summary,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      customer_email: row.customer_email
    };

    return res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Error creating order:', err);
    return res.status(500).json({ success: false, message: 'Database error creating order.' });
  }
});

// PUT update order status
app.put('/api/orders/:order_id/status', async (req, res) => {
  const { order_id } = req.params;
  const { status, total_amount, subtotal, items, warehouse_id } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, message: 'Required status missing.' });
  }

  try {
    let result;
    if (total_amount !== undefined && subtotal !== undefined && items !== undefined) {
      result = await pool.query(
        'UPDATE orders SET status = $1, total_amount = $2, subtotal = $3, items = $4 WHERE order_id = $5 RETURNING *',
        [status, total_amount, subtotal, JSON.stringify(items), order_id]
      );
    } else if (total_amount !== undefined) {
      result = await pool.query(
        'UPDATE orders SET status = $1, total_amount = $2, subtotal = $2 WHERE order_id = $3 RETURNING *',
        [status, total_amount, order_id]
      );
    } else {
      result = await pool.query(
        'UPDATE orders SET status = $1 WHERE order_id = $2 RETURNING *',
        [status, order_id]
      );
    }
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Stock deduction logic if shipping order from a specific warehouse
    if (status === 'SHIPPED' && warehouse_id) {
      const order = result.rows[0];
      const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      
      const whDbRes = await pool.query('SELECT warehouse_name FROM warehouses WHERE warehouse_id = $1', [warehouse_id]);
      const warehouseName = whDbRes.rows.length > 0 ? whDbRes.rows[0].warehouse_name : 'Unknown Depot';

      for (const item of orderItems) {
        const qty = parseInt(item.qty || item.quantity || 0);
        if (qty <= 0) continue;

        // Find product by id or sku
        const prodRes = await pool.query('SELECT * FROM products WHERE product_id = $1 OR sku = $2', [item.product_id, item.sku]);
        if (prodRes.rows.length > 0) {
          const product = prodRes.rows[0];
          let inventory = typeof product.inventory === 'string' ? JSON.parse(product.inventory) : product.inventory;
          
          let updated = false;
          let remainingToDeductReserved = qty;
          inventory = inventory.map(inv => {
            let invQty = inv.quantity;
            let invReserved = inv.reserved_quantity || 0;

            if (inv.warehouse_id === warehouse_id) {
              updated = true;
              invQty = Math.max(0, invQty - qty);
            }

            if (invReserved > 0 && remainingToDeductReserved > 0) {
              updated = true;
              const deductRes = Math.min(invReserved, remainingToDeductReserved);
              invReserved = invReserved - deductRes;
              remainingToDeductReserved = remainingToDeductReserved - deductRes;
            }

            const invAvail = Math.max(0, invQty - invReserved);
            return {
              ...inv,
              quantity: invQty,
              reserved_quantity: invReserved,
              available_quantity: invAvail
            };
          });

          if (updated) {
            await pool.query('UPDATE products SET inventory = $1 WHERE product_id = $2', [JSON.stringify(inventory), product.product_id]);
            
            // Record stock movement
            const movementId = `mv-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            await pool.query(
              `INSERT INTO stock_movements (movement_id, product_id, product_name, warehouse_id, warehouse_name, movement_type, quantity, notes, performed_by, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                movementId,
                product.product_id,
                product.product_name,
                warehouse_id,
                warehouseName,
                'OUT',
                -qty,
                `Shipped for order ${order.order_number}`,
                'System Admin',
                new Date().toISOString()
              ]
            );
          }
        }
      }
    }

    return res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.error('Error updating order status:', err);
    return res.status(500).json({ success: false, message: 'Database error updating order status.' });
  }
});

// GET all warehouses
app.get('/api/warehouses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM warehouses ORDER BY id ASC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching warehouses:', err);
    return res.status(500).json({ success: false, message: 'Database error fetching warehouses.' });
  }
});

// POST a new warehouse
app.post('/api/warehouses', async (req, res) => {
  const { warehouse_id, warehouse_name, city, country, manager_name } = req.body;
  if (!warehouse_id || !warehouse_name || !city || !country) {
    return res.status(400).json({ success: false, message: 'Required fields missing.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO warehouses (warehouse_id, warehouse_name, city, country, manager_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [warehouse_id, warehouse_name, city, country, manager_name]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating warehouse:', err);
    return res.status(500).json({ success: false, message: 'Database error creating warehouse.' });
  }
});

// GET all quotations
app.get('/api/quotations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quotations ORDER BY id DESC');
    const quotations = result.rows.map(row => ({
      quotation_id: row.quotation_id,
      quotation_number: row.quotation_number,
      status: row.status,
      total_amount: parseFloat(row.total_amount),
      valid_until: row.valid_until,
      created_at: row.created_at
    }));
    return res.json(quotations);
  } catch (err) {
    console.error('Error fetching quotations:', err);
    return res.status(500).json({ success: false, message: 'Database error fetching quotations.' });
  }
});
// POST new quotation
app.post('/api/quotations', async (req, res) => {
  const q = req.body;
  if (!q.quotation_id || !q.quotation_number || !q.total_amount) {
    return res.status(400).json({ success: false, message: 'Missing quotation details.' });
  }

  try {
    await pool.query(
      `INSERT INTO quotations (quotation_id, quotation_number, status, total_amount, valid_until, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        q.quotation_id,
        q.quotation_number,
        q.status || 'DRAFT',
        q.total_amount,
        q.valid_until || new Date(Date.now() + 15*24*60*60*1000).toISOString(),
        q.created_at || new Date().toISOString()
      ]
    );
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error creating quotation:', err);
    return res.status(500).json({ success: false, message: 'Database error creating quotation.' });
  }
});

// PUT update quotation status
app.put('/api/quotations/:quotation_id/status', async (req, res) => {
  const { quotation_id } = req.params;
  const { status, total_amount } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, message: 'Required status missing.' });
  }

  try {
    let result;
    if (total_amount !== undefined) {
      result = await pool.query(
        'UPDATE quotations SET status = $1, total_amount = $2 WHERE quotation_id = $3 RETURNING *',
        [status, total_amount, quotation_id]
      );
    } else {
      result = await pool.query(
        'UPDATE quotations SET status = $1 WHERE quotation_id = $2 RETURNING *',
        [status, quotation_id]
      );
    }
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }
    return res.json({ success: true, quotation: result.rows[0] });
  } catch (err) {
    console.error('Error updating quotation status:', err);
    return res.status(500).json({ success: false, message: 'Database error updating quotation status.' });
  }
});

// GET all suppliers
app.get('/api/suppliers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY id DESC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    return res.status(500).json({ success: false, message: 'Database error fetching suppliers.' });
  }
});

// POST new supplier
app.post('/api/suppliers', async (req, res) => {
  const s = req.body;
  if (!s.supplier_id || !s.company_name) {
    return res.status(400).json({ success: false, message: 'Required supplier fields missing.' });
  }
  try {
    await pool.query(
      `INSERT INTO suppliers (supplier_id, company_name, contact_person, email, phone, city, country, reliability_score, lead_time_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [s.supplier_id, s.company_name, s.contact_person || '', s.email || '', s.phone || '', s.city || '', s.country || '', s.reliability_score || 100, s.lead_time_days || 0]
    );
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error creating supplier:', err);
    return res.status(500).json({ success: false, message: 'Database error creating supplier.' });
  }
});

// PUT update supplier
app.put('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  const s = req.body;
  try {
    await pool.query(
      `UPDATE suppliers SET company_name = $1, contact_person = $2, email = $3, phone = $4, city = $5, country = $6, reliability_score = $7, lead_time_days = $8
       WHERE supplier_id = $9`,
      [s.company_name, s.contact_person || '', s.email || '', s.phone || '', s.city || '', s.country || '', s.reliability_score || 100, s.lead_time_days || 0, id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Error updating supplier:', err);
    return res.status(500).json({ success: false, message: 'Database error updating supplier.' });
  }
});

// DELETE supplier
app.delete('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM suppliers WHERE supplier_id = $1', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting supplier:', err);
    return res.status(500).json({ success: false, message: 'Database error deleting supplier.' });
  }
});

// GET all invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM invoices ORDER BY id DESC');
    const invoices = result.rows.map(row => ({
      invoice_id: row.invoice_id,
      invoice_number: row.invoice_number,
      status: row.status,
      total_amount: parseFloat(row.total_amount),
      amount_paid: parseFloat(row.amount_paid),
      due_date: row.due_date,
      late_payment_probability: parseFloat(row.late_payment_probability || 0)
    }));
    return res.json(invoices);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return res.status(500).json({ success: false, message: 'Database error fetching invoices.' });
  }
});

// POST new invoice
app.post('/api/invoices', async (req, res) => {
  const inv = req.body;
  try {
    await pool.query(
      `INSERT INTO invoices (invoice_id, invoice_number, status, total_amount, amount_paid, due_date, late_payment_probability)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (invoice_id) DO NOTHING`,
      [inv.invoice_id, inv.invoice_number, inv.status || 'SENT', inv.total_amount, inv.amount_paid || 0, inv.due_date || new Date().toISOString(), inv.late_payment_probability || 0]
    );
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error creating invoice:', err);
    return res.status(500).json({ success: false, message: 'Database error creating invoice.' });
  }
});

// PUT update invoice payment
app.put('/api/invoices/:id', async (req, res) => {
  const { id } = req.params;
  const { amount_paid, status } = req.body;
  try {
    await pool.query(
      `UPDATE invoices SET amount_paid = $1, status = $2 WHERE invoice_id = $3`,
      [amount_paid, status, id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Error updating invoice:', err);
    return res.status(500).json({ success: false, message: 'Database error updating invoice.' });
  }
});

// GET all payments
app.get('/api/payments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payments ORDER BY id DESC');
    const payments = result.rows.map(row => ({
      payment_id: row.payment_id,
      customer_name: row.customer_name,
      amount: parseFloat(row.amount),
      payment_method: row.payment_method,
      reference_no: row.reference_no,
      payment_date: row.payment_date,
      status: row.status
    }));
    return res.json(payments);
  } catch (err) {
    console.error('Error fetching payments:', err);
    return res.status(500).json({ success: false, message: 'Database error fetching payments.' });
  }
});

// POST new payment
app.post('/api/payments', async (req, res) => {
  const p = req.body;
  try {
    await pool.query(
      `INSERT INTO payments (payment_id, customer_name, amount, payment_method, reference_no, payment_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [p.payment_id, p.customer_name, p.amount, p.payment_method || '', p.reference_no || '', p.payment_date || new Date().toISOString(), p.status || 'RECORDED']
    );
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error creating payment:', err);
    return res.status(500).json({ success: false, message: 'Database error creating payment.' });
  }
});

// GET all stock movements
app.get('/api/stock-movements', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stock_movements ORDER BY id DESC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stock movements:', err);
    return res.status(500).json({ success: false, message: 'Database error fetching stock movements.' });
  }
});

// POST new stock movement
app.post('/api/stock-movements', async (req, res) => {
  const m = req.body;
  try {
    await pool.query(
      `INSERT INTO stock_movements (movement_id, product_id, product_name, warehouse_id, warehouse_name, movement_type, quantity, notes, performed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [m.movement_id, m.product_id, m.product_name, m.warehouse_id, m.warehouse_name, m.movement_type, m.quantity, m.notes || '', m.performed_by || '', m.created_at || new Date().toISOString()]
    );
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error creating stock movement:', err);
    return res.status(500).json({ success: false, message: 'Database error creating stock movement.' });
  }
});

// GET all audit logs
app.get('/api/audit-logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY id DESC');
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return res.status(500).json({ success: false, message: 'Database error fetching audit logs.' });
  }
});

// POST new audit log
app.post('/api/audit-logs', async (req, res) => {
  const a = req.body;
  try {
    await pool.query(
      `INSERT INTO audit_logs (audit_id, table_name, record_id, action, performed_by, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [a.audit_id, a.table_name, a.record_id, a.action, a.performed_by, a.notes || '', a.created_at || new Date().toISOString()]
    );
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error creating audit log:', err);
    return res.status(500).json({ success: false, message: 'Database error creating audit log.' });
  }
});

// GET all distributors for admin approval/management page
app.get('/api/admin/distributors', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE role = 'distributor' ORDER BY id DESC");
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching distributors:', err);
    return res.status(500).json({ success: false, message: 'Database error fetching distributors.' });
  }
});

// POST approve distributor
app.post('/api/admin/distributors/approve', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, message: 'Missing user ID.' });

  try {
    await pool.query("UPDATE users SET status = 'ACTIVE' WHERE id = $1 AND role = 'distributor'", [id]);
    return res.json({ success: true, message: 'Distributor approved successfully.' });
  } catch (err) {
    console.error('Error approving distributor:', err);
    return res.status(500).json({ success: false, message: 'Database error approving distributor.' });
  }
});

// POST remove distributor (reject application)
app.post('/api/admin/distributors/remove', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, message: 'Missing user ID.' });

  try {
    await pool.query("UPDATE users SET status = 'REJECTED' WHERE id = $1 AND role = 'distributor'", [id]);
    return res.json({ success: true, message: 'Distributor application rejected.' });
  } catch (err) {
    console.error('Error rejecting distributor:', err);
    return res.status(500).json({ success: false, message: 'Database error rejecting distributor.' });
  }
});

// Register AI Copilot modular routes
const { registerCopilotRoutes } = require('./copilot');
registerCopilotRoutes(app, pool);

app.listen(port, () => {
  console.log(`CommerceIQ Auth API Server running on port ${port}`);
});
