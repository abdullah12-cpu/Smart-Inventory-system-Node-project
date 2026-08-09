const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const { createProductInDb } = require('./adminOperations');
const { counterOfferQuotationInDb, buildQuotationDescription } = require('./distributorOperations');
const { verifyPassword, hashPassword, signToken, requireAuth, optionalAuth, requireRole } = require('./auth');

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

    // Enable pgvector extension for semantic search (optional — skipped if not installed)
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
      console.log('[DB] pgvector extension enabled.');
    } catch (vecErr) {
      console.warn('[DB] pgvector extension not available — vector/semantic search disabled. Install pgvector to enable it.');
    }

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

    // Add embedding column if pgvector is available (nomic-embed-text = 768 dims)
    try {
      await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(768);`);
      // Index for fast cosine similarity search
      await client.query(`
        CREATE INDEX IF NOT EXISTS products_embedding_idx
        ON products USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 10);
      `);
    } catch (vecColErr) {
      console.warn('[DB] Skipping vector column/index — pgvector not installed.');
    }


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
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS product_name TEXT;
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15,2);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS original_unit_price NUMERIC(15,2);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS min_price_allowed NUMERIC(15,2);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS max_discount_pct INTEGER DEFAULT 15;
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS last_counter_by VARCHAR(50);
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS counter_history JSONB;
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_id VARCHAR(100);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_number VARCHAR(100);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quotation_number VARCHAR(100);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS product_name TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items_summary TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS distributor_name VARCHAR(255);
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS issue_date VARCHAR(100);
    `);

    // Seed predefined admin
    await client.query(`
      INSERT INTO users (email, password, role, contact_name, name)
      VALUES ('zain@commerceiq.com', 'demopassword', 'admin', 'Zain Shahid', 'Zain Shahid')
      ON CONFLICT (email) DO UPDATE SET contact_name = 'Zain Shahid', name = 'Zain Shahid';

      INSERT INTO users (email, password, role, contact_name, name)
      VALUES ('saif@commerceiq.com', 'demopassword', 'admin', 'Zain Shahid', 'Zain Shahid')
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

    // Auto-enrich existing quotations with real product details & DB list prices if missing
    try {
      const unEnriched = await client.query(
        `SELECT * FROM quotations WHERE product_name IS NULL OR product_name = 'Wholesale Batch' OR original_unit_price IS NULL OR original_unit_price = 0`
      );
      if (unEnriched.rows.length > 0) {
        const prodRes = await client.query('SELECT * FROM products');
        const prods = prodRes.rows;

        for (let i = 0; i < unEnriched.rows.length; i++) {
          const q = unEnriched.rows[i];
          let items = [];
          try { items = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []); } catch (_) {}

          let pName = 'Wholesale Item';
          let sku = 'SKU-WHOLESALE';
          let qty = parseInt(q.quantity || 1);
          let unitP = parseFloat(q.unit_price || q.total_amount || 1000);
          let origP = 1000;
          let maxD = 15;

          if (items.length > 0) {
            const itemNames = [];
            const itemSkus = [];
            let totalQ = 0;
            let totalOrig = 0;
            for (const item of items) {
              const itemQ = parseInt(item.qty || item.quantity || 1);
              const itemP = parseFloat(item.price || item.unit_price || 0);
              const matchProd = prods.find(p => p.product_id === item.product_id || p.sku === item.sku || p.product_name === item.name || p.product_name === item.product_name) || prods[i % prods.length];
              if (matchProd) {
                itemNames.push(matchProd.product_name);
                itemSkus.push(matchProd.sku);
                const prices = typeof matchProd.prices === 'string' ? JSON.parse(matchProd.prices) : (matchProd.prices || {});
                const baseP = parseFloat(prices.DISTRIBUTOR || prices.RETAIL || itemP || 1000);
                totalOrig += baseP * itemQ;
                maxD = matchProd.max_discount !== undefined ? matchProd.max_discount : maxD;
              } else {
                itemNames.push(item.name || item.product_name || 'Wholesale Product');
                itemSkus.push(item.sku || 'SKU-WHOLESALE');
                totalOrig += (itemP > 0 ? itemP : 1000) * itemQ;
              }
              totalQ += itemQ;
            }
            pName = itemNames.join(', ');
            sku = itemSkus.join(', ');
            qty = totalQ > 0 ? totalQ : 1;
            origP = totalQ > 0 ? Math.round(totalOrig / totalQ) : Math.round(q.total_amount / qty);
            unitP = q.total_amount ? Math.round(q.total_amount / qty) : origP;
          } else if (prods.length > 0) {
            const matchedP = prods[i % prods.length];
            pName = matchedP.product_name;
            sku = matchedP.sku;
            const prices = typeof matchedP.prices === 'string' ? JSON.parse(matchedP.prices) : (matchedP.prices || {});
            origP = parseFloat(prices.DISTRIBUTOR || prices.RETAIL || 1000);
            maxD = matchedP.max_discount !== undefined ? matchedP.max_discount : 15;
            qty = Math.max(1, Math.round(parseFloat(q.total_amount || 1000) / origP)) || 1;
            unitP = Math.round(parseFloat(q.total_amount || 1000) / qty);
          }

          if (unitP > origP) origP = unitP;
          const minF = Math.round(origP * (1 - maxD / 100));

          const enrichedObj = {
            quotation_id: q.quotation_id,
            quotation_number: q.quotation_number,
            product_name: pName,
            sku: sku,
            quantity: qty,
            unit_price: unitP,
            original_unit_price: origP,
            min_price_allowed: minF,
            max_discount_pct: maxD,
            total_amount: q.total_amount,
            status: q.status,
            last_counter_by: q.last_counter_by || 'DISTRIBUTOR'
          };
          const desc = buildQuotationDescription(enrichedObj);

          await client.query(
            `UPDATE quotations SET
              product_name = $1,
              sku = $2,
              quantity = $3,
              unit_price = $4,
              original_unit_price = $5,
              min_price_allowed = $6,
              max_discount_pct = $7,
              description = $8
             WHERE quotation_id = $9`,
            [pName, sku, qty, unitP, origP, minF, maxD, desc, q.quotation_id]
          );
        }
        console.log(`[DbInit] Successfully auto-enriched ${unEnriched.rows.length} quotation records with product details & DB list prices.`);
      }

      // Auto-update order items_summary for existing B2B orders generated from quotations
      await client.query(`
        UPDATE orders o
        SET items_summary = q.product_name
        FROM quotations q
        WHERE REPLACE(o.order_number, 'ORD-', 'QUO-') = q.quotation_number
          AND q.product_name IS NOT NULL
          AND (o.items_summary LIKE 'Wholesale B2B Order generated from%' OR o.items_summary LIKE 'B2B Order Conversion%' OR o.items_summary LIKE 'B2B Order conversion%')
      `);
      console.log('[DbInit] Cleaned up order items_summary text with exact quotation product names.');
    } catch (eErr) {
      console.error('[DbInit] Error enriching quotation/order records:', eErr.message);
    }



    // Seed predefined products with proper image URLs
    const prodCountResult = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(prodCountResult.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO products (
          product_id, sku, barcode, product_name, short_description, brand, 
          category, unit, weight, status, low_stock_threshold, overstock_threshold, 
          dead_stock_days, prices, inventory, image_url
        ) VALUES 
        (
          'p-1', 'SKU-CISCO-9300', '012345678901', 'Cisco Fiber Catalyst 9300', 
          'High performance catalyst networking fiber switch.', 'Cisco', 'Networking', 'Units', 4.5, 'ACTIVE', 15, 60, 90, 
          '{"RETAIL": 150000, "WHOLESALE": 120000, "LOYALTY": 135000}'::jsonb,
          '[{"warehouse_id": "wh-1", "warehouse_name": "Karachi Depot", "city": "Karachi", "country": "Pakistan", "quantity": 42, "reserved_quantity": 0, "available_quantity": 42}, {"warehouse_id": "wh-2", "warehouse_name": "Lahore Terminal", "city": "Lahore", "country": "Pakistan", "quantity": 18, "reserved_quantity": 0, "available_quantity": 18}]'::jsonb,
          'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&auto=format&fit=crop'
        ),
        (
          'p-2', 'SKU-CORNING-4KM', '012345678902', 'Corning Fiber Optic Spool 4km', 
          'High speed transmission single mode fiber optic spool.', 'Corning', 'Cables', 'Spools', 12.0, 'ACTIVE', 10, 40, 60, 
          '{"RETAIL": 85000, "WHOLESALE": 68000, "LOYALTY": 75000}'::jsonb,
          '[{"warehouse_id": "wh-1", "warehouse_name": "Karachi Depot", "city": "Karachi", "country": "Pakistan", "quantity": 8, "reserved_quantity": 0, "available_quantity": 8}, {"warehouse_id": "wh-2", "warehouse_name": "Lahore Terminal", "city": "Lahore", "country": "Pakistan", "quantity": 12, "reserved_quantity": 0, "available_quantity": 12}]'::jsonb,
          'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop'
        ),
        (
          'p-3', 'SKU-NVIDIA-CX6', '012345678903', 'Nvidia Mellanox ConnectX-6', 
          'Dual-port smart Network Interface Card 200Gb/s.', 'Nvidia', 'Hardware', 'Units', 0.8, 'ACTIVE', 8, 30, 45, 
          '{"RETAIL": 250000, "WHOLESALE": 200000, "LOYALTY": 220000}'::jsonb,
          '[{"warehouse_id": "wh-1", "warehouse_name": "Karachi Depot", "city": "Karachi", "country": "Pakistan", "quantity": 15, "reserved_quantity": 0, "available_quantity": 15}, {"warehouse_id": "wh-2", "warehouse_name": "Lahore Terminal", "city": "Lahore", "country": "Pakistan", "quantity": 4, "reserved_quantity": 0, "available_quantity": 4}]'::jsonb,
          'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&auto=format&fit=crop'
        )
      `);
      console.log("Predefined catalog products seeded successfully in PostgreSQL!");
    }

    // Update existing product image_urls if they still have the old placeholder
    await client.query(`
      UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&auto=format&fit=crop' WHERE sku = 'SKU-CISCO-9300' AND (image_url IS NULL OR image_url LIKE '%544244015%');
      UPDATE products SET image_url = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop' WHERE sku = 'SKU-CORNING-4KM' AND (image_url IS NULL OR image_url LIKE '%544244015%');
      UPDATE products SET image_url = 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&auto=format&fit=crop' WHERE sku = 'SKU-NVIDIA-CX6' AND (image_url IS NULL OR image_url LIKE '%544244015%');
    `);

    console.log("Database initialized and seeded successfully!");
  } catch (err) {
    console.error("Error during database initialization:", err);
  } finally {
    client.release();
  }
}

// Invoke DB initialization
initDb();

// Explicit admin action: populate a useful analytics dataset in PostgreSQL.
// It is idempotent, so pressing the button again will not duplicate records.
app.post('/api/admin/seed-demo-data', async (_req, res) => {
  const client = await pool.connect();
  try {
    const productsResult = await client.query('SELECT product_id, product_name, sku, prices FROM products ORDER BY id ASC');
    if (productsResult.rows.length === 0) {
      return res.status(409).json({ success: false, message: 'Add products before loading sample analytics data.' });
    }

    const products = productsResult.rows;
    const customers = ['northstar', 'vertex', 'atlas', 'kite', 'bloom', 'lumen', 'orbit', 'summit'];
    const statuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
    const quoteStatuses = ['DRAFT', 'NEGOTIATING', 'APPROVED', 'ACCEPTED', 'REJECTED'];
    let orderCount = 0;
    let quoteCount = 0;

    await client.query('BEGIN');

    for (let i = 1; i <= 50; i += 1) {
      const product = products[(i - 1) % products.length];
      const priceMap = typeof product.prices === 'string' ? JSON.parse(product.prices) : product.prices;
      const unitPrice = Number(priceMap?.RETAIL || priceMap?.WHOLESALE || 10000);
      const quantity = (i % 6) + 1;
      const subtotal = unitPrice * quantity;
      const tax = Math.round(subtotal * 0.18);
      const total = subtotal + tax;
      const date = new Date();
      date.setDate(date.getDate() - ((i * 3) % 88));
      const customer = customers[i % customers.length];
      const inserted = await client.query(
        `INSERT INTO orders (order_id, order_number, order_type, status, subtotal, discount_total, tax_total, total_amount, currency, order_date, items_summary, items, customer_email)
         VALUES ($1, $2, $3, $4, $5, 0, $6, $7, 'PKR', $8, $9, $10, $11)
         ON CONFLICT (order_id) DO NOTHING`,
        [
          `demo-order-${String(i).padStart(3, '0')}`,
          `DEMO-SO-${String(i).padStart(4, '0')}`,
          i % 3 === 0 ? 'B2B' : 'B2C',
          statuses[i % statuses.length],
          subtotal,
          tax,
          total,
          date.toISOString(),
          `${quantity} × ${product.product_name}`,
          JSON.stringify([{ product_id: product.product_id, sku: product.sku, name: product.product_name, qty: quantity, quantity, price: unitPrice }]),
          `${customer}@demo.com`
        ]
      );
      orderCount += inserted.rowCount;

      if (i <= 15) {
        const quoteInserted = await client.query(
          `INSERT INTO quotations (quotation_id, quotation_number, status, total_amount, valid_until, created_at, items)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (quotation_id) DO NOTHING`,
          [
            `demo-quote-${String(i).padStart(3, '0')}`,
            `DEMO-QT-${String(i).padStart(4, '0')}`,
            quoteStatuses[i % quoteStatuses.length],
            total,
            new Date(Date.now() + (i + 5) * 86400000).toISOString(),
            date.toISOString(),
            JSON.stringify([{ product_id: product.product_id, name: product.product_name, qty: quantity, price: unitPrice }])
          ]
        );
        quoteCount += quoteInserted.rowCount;
      }
    }

    const supplierRows = [
      ['demo-sup-01', 'PakTech Supply Co.', 'Karachi', 'Pakistan', 94, 4],
      ['demo-sup-02', 'Northern Components', 'Lahore', 'Pakistan', 89, 6],
      ['demo-sup-03', 'Capital Network Systems', 'Islamabad', 'Pakistan', 91, 5],
      ['demo-sup-04', 'Global Fiber Trading', 'Dubai', 'UAE', 84, 10],
      ['demo-sup-05', 'EastLink Hardware', 'Shenzhen', 'China', 82, 14],
      ['demo-sup-06', 'Metro Office Solutions', 'Karachi', 'Pakistan', 96, 3]
    ];
    for (const [supplierId, company, city, country, score, leadTime] of supplierRows) {
      await client.query(
        `INSERT INTO suppliers (supplier_id, company_name, contact_person, email, phone, city, country, reliability_score, lead_time_days)
         VALUES ($1, $2, 'Demo Contact', $3, '+92 300 0000000', $4, $5, $6, $7)
         ON CONFLICT (supplier_id) DO NOTHING`,
        [supplierId, company, `${supplierId}@demo.com`, city, country, score, leadTime]
      );
    }

    for (let i = 1; i <= 6; i += 1) {
      await client.query(
        `INSERT INTO users (email, password, role, status, contact_name, business_name, warehouse_region, city, country)
         VALUES ($1, 'demopassword', 'distributor', $2, $3, $4, $5, $6, 'Pakistan')
         ON CONFLICT (email) DO NOTHING`,
        [`demo-distributor-${i}@demo.com`, i === 6 ? 'PENDING_APPROVAL' : 'ACTIVE', `Demo Distributor ${i}`, `Demo Distribution ${i}`, `wh-${((i - 1) % 3) + 1}`, ['Karachi', 'Lahore', 'Islamabad'][i % 3]]
      );
    }

    await client.query('COMMIT');
    return res.json({ success: true, inserted: { orders: orderCount, quotations: quoteCount }, message: 'Sample analytics data is ready.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding demo analytics data:', err);
    return res.status(500).json({ success: false, message: 'Could not load sample analytics data.' });
  } finally {
    client.release();
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password, portal } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or account does not exist.' });
    }

    const user = result.rows[0];

    // bcrypt comparison, with in-place upgrade of any remaining plain-text password the
    // first time its owner signs in (see auth.js). Passwords were previously compared as
    // plain text and stored the same way.
    const { ok: passwordOk, upgradedHash } = await verifyPassword(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }
    if (upgradedHash) {
      try {
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [upgradedHash, user.id]);
        console.log(`[auth] Upgraded stored password to bcrypt for ${user.email}`);
      } catch (e) {
        // A failed upgrade must not block a valid login -- it just retries next time.
        console.error('[auth] Password upgrade failed:', e.message);
      }
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
    const activePortal = portal || user.role;
    if (user.role !== activePortal) {
      return res.status(403).json({ 
        success: false, 
        message: `Role mismatch. This account is registered as a ${user.role}, but you are trying to sign into the ${activePortal} portal.` 
      });
    }

    // Map to frontend user session structure
    let sessionUser = {
      user_id: `u-${user.id}`,
      email: user.email,
      role: user.role,
      role_name: user.role === 'admin' ? 'Admin' : (user.role === 'distributor' ? 'Distributor Partner' : 'Buyer'),
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

    // The token is the client's proof of identity for privileged calls. Roles are read from
    // it server-side, so a client can no longer assert its own role in a request body.
    return res.json({
      success: true,
      message: 'Logged in successfully.',
      token: signToken({ ...sessionUser, role: user.role }),
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
      `INSERT INTO users (email, password, role, contact_name, business_name, warehouse_region, status, country, city) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [regEmail, await hashPassword(password), 'distributor', contactName, businessName, 'wh-1', 'PENDING_APPROVAL', country, city]
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
      [buyerEmail, await hashPassword(password), 'buyer', buyerContactName, buyerStoreName, 'wh-1', '', '', 'ACTIVE']
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

// GET all products (optionally filtered by category or warehouse for distributors)
app.get('/api/products', async (req, res) => {
  try {
    const { category, portal, warehouse_region } = req.query;
    let query = 'SELECT * FROM products WHERE status = \'ACTIVE\'';
    const params = [];
    
    // Filter by category if specified
    if (category) {
      query += ' AND category ILIKE $' + (params.length + 1);
      params.push(`%${category}%`);
    }
    
    query += ' ORDER BY category ASC, product_name ASC';
    
    const result = await pool.query(query, params);
    let products = result.rows.map(row => ({
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
    
    // For distributor portal: show all ACTIVE products regardless of warehouse
    // (distributors should see all products; stock level is shown on the card)
    // Only hide products that are completely out of stock across ALL warehouses
    if (portal === 'distributor') {
      products = products.filter(product => {
        const inventory = product.inventory || [];
        const totalAvailable = inventory.reduce((sum, inv) => sum + (inv.available_quantity || 0), 0);
        return totalAvailable >= 0; // show all — even 0 stock shows as "Out of Stock"
      });
    }
    
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

// GET all orders (with optional customer_email and order_type filters for buyer portal)
app.get('/api/orders', optionalAuth, async (req, res) => {
  try {
    const { customer_email, order_type } = req.query;
    let query = 'SELECT * FROM orders';
    const params = [];
    const conditions = [];

    // Server-side scoping: distributor and buyer tokens can only see their own data.
    // The client sends customer_email as a query param, but we must not trust it —
    // a distributor could name any email to read another account's orders.
    // We override with the verified identity from the JWT when the role requires it.
    const role = String(req.auth?.role || '').toLowerCase();
    const enforcedEmail = (role === 'distributor' || role === 'buyer')
      ? req.auth.email
      : customer_email || null;

    if (enforcedEmail) {
      conditions.push(`LOWER(customer_email) = $${params.length + 1}`);
      params.push(enforcedEmail.toLowerCase());
    }
    if (order_type) {
      conditions.push(`UPPER(order_type) = $${params.length + 1}`);
      params.push(order_type.toUpperCase());
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY id DESC';
    const result = params.length > 0
      ? await pool.query(query, params)
      : await pool.query(query);
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
    // Stock validation before creating the order -- applies to every order type (B2C
    // buyer checkout included). Previously this only ran for B2B/DISTRIBUTOR, which let
    // buyers order more units than were actually in stock.
    const orderItems = typeof ord.items === 'string' ? JSON.parse(ord.items) : (ord.items || []);
    if (orderItems.length > 0) {
      for (const item of orderItems) {
        const qty = parseInt(item.qty || item.quantity || 0);
        if (qty <= 0) continue;
        const prodRes = await pool.query(
          'SELECT * FROM products WHERE product_id = $1 OR sku = $2 OR product_name ILIKE $3 LIMIT 1',
          [item.product_id || '', item.sku || '', `%${item.name || item.product_name || ''}%`]
        );
        if (prodRes.rows.length > 0) {
          const product = prodRes.rows[0];
          const inventory = typeof product.inventory === 'string' ? JSON.parse(product.inventory) : (product.inventory || []);
          const totalAvailable = inventory.reduce((sum, inv) => sum + (inv.available_quantity || 0), 0);
          if (totalAvailable < qty) {
            return res.status(400).json({
              success: false,
              insufficient_stock: true,
              message: `Stock Check Failed for ${ord.order_number}:\n\nItem: "${product.product_name}"\nRequired Quantity: ${qty}\nAvailable Inventory: ${totalAvailable}\n\nCannot place order due to insufficient stock.`,
              product_name: product.product_name,
              required: qty,
              available: totalAvailable
            });
          }
        }
      }
    }

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

    // Buyer orders (B2C) remain exclusively as orders and do not create quotations
    const row = result.rows[0];

    // Reserve stock on placement -- for every order type. Reserving (rather than physically
    // decrementing `quantity`) immediately drops `available_quantity`, which is what the
    // buyer/admin stock views read, while the physical count is only decremented at actual
    // shipment (see PUT /api/orders/:order_id/status below).
    if (orderItems.length > 0) {
      for (const item of orderItems) {
        const qty = parseInt(item.qty || item.quantity || 0);
        if (qty <= 0) continue;
        const prodRes = await pool.query(
          'SELECT * FROM products WHERE product_id = $1 OR sku = $2 OR product_name ILIKE $3 LIMIT 1',
          [item.product_id || '', item.sku || '', `%${item.name || item.product_name || ''}%`]
        );
        if (prodRes.rows.length > 0) {
          const product = prodRes.rows[0];
          let inventory = typeof product.inventory === 'string' ? JSON.parse(product.inventory) : (product.inventory || []);
          // Reserve from first warehouse with sufficient stock
          let remaining = qty;
          inventory = inventory.map(inv => {
            if (remaining <= 0) return inv;
            const avail = inv.available_quantity || 0;
            const toReserve = Math.min(avail, remaining);
            remaining -= toReserve;
            const newReserved = (inv.reserved_quantity || 0) + toReserve;
            const newAvail = Math.max(0, inv.quantity - newReserved);
            return { ...inv, reserved_quantity: newReserved, available_quantity: newAvail };
          });
          await pool.query('UPDATE products SET inventory = $1 WHERE product_id = $2', [JSON.stringify(inventory), product.product_id]);
        }
      }
    }
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
// The :order_id path segment is matched against BOTH order_id and order_number. Callers
// legitimately hold one or the other (the UI passes order_id; the AI copilot's own
// updateOrderStatusInDb already accepted either), and matching only order_id made a request
// carrying an order number fail as a silent 404 -- the status never changed, so stock was
// never deducted or released and the order simply appeared stuck.
const ORDER_MATCH_CLAUSE = (n) => `WHERE order_id = $${n} OR order_number = $${n}`;

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
        `UPDATE orders SET status = $1, total_amount = $2, subtotal = $3, items = $4 ${ORDER_MATCH_CLAUSE(5)} RETURNING *`,
        [status, total_amount, subtotal, JSON.stringify(items), order_id]
      );
    } else if (total_amount !== undefined) {
      result = await pool.query(
        `UPDATE orders SET status = $1, total_amount = $2, subtotal = $2 ${ORDER_MATCH_CLAUSE(3)} RETURNING *`,
        [status, total_amount, order_id]
      );
    } else {
      result = await pool.query(
        `UPDATE orders SET status = $1 ${ORDER_MATCH_CLAUSE(2)} RETURNING *`,
        [status, order_id]
      );
    }
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Stock deduction logic when shipping an order
    if (status === 'SHIPPED' || status === 'DELIVERED') {
      const order = result.rows[0];
      const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
      const targetWh = warehouse_id || 'wh-1';

      const whDbRes = await pool.query('SELECT warehouse_name FROM warehouses WHERE warehouse_id = $1', [targetWh]);
      const warehouseName = whDbRes.rows.length > 0 ? whDbRes.rows[0].warehouse_name : 'Central Depot';

      for (const item of orderItems) {
        const qty = parseInt(item.qty || item.quantity || 0);
        if (qty <= 0) continue;

        // Find product by id, sku, or name
        const prodRes = await pool.query(
          'SELECT * FROM products WHERE product_id = $1 OR sku = $2 OR product_name ILIKE $3 LIMIT 1',
          [item.product_id || '', item.sku || '', `%${item.name || item.product_name || ''}%`]
        );

        if (prodRes.rows.length > 0) {
          const product = prodRes.rows[0];
          let inventory = typeof product.inventory === 'string' ? JSON.parse(product.inventory) : (product.inventory || []);
          
          let remainingToDeductPhysical = qty;
          let remainingToDeductReserved = qty;

          inventory = inventory.map(inv => {
            let invQty = inv.quantity || 0;
            let invReserved = inv.reserved_quantity || 0;

            // Deduct physical count for real (from specified warehouse first, or any warehouse with stock)
            if (remainingToDeductPhysical > 0 && (inv.warehouse_id === targetWh || !warehouse_id || invQty > 0)) {
              const deductPhys = Math.min(invQty, remainingToDeductPhysical);
              invQty = Math.max(0, invQty - deductPhys);
              remainingToDeductPhysical -= deductPhys;
            }

            // Release reserved count
            if (invReserved > 0 && remainingToDeductReserved > 0) {
              const deductRes = Math.min(invReserved, remainingToDeductReserved);
              invReserved = Math.max(0, invReserved - deductRes);
              remainingToDeductReserved -= deductRes;
            }

            const invAvail = Math.max(0, invQty - invReserved);
            return {
              ...inv,
              quantity: invQty,
              reserved_quantity: invReserved,
              available_quantity: invAvail
            };
          });

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
              targetWh,
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

    if (status === 'APPROVED' || status === 'CONFIRMED' || status === 'PROCESSING') {
      try {
        const order = result.rows[0];
        const invId = `inv-${Date.now()}`;
        const invNum = (order.order_number || order_id).replace('ORD-', 'INV-').replace('QUO-', 'INV-');
        const checkInv = await pool.query('SELECT * FROM invoices WHERE invoice_number = $1 OR order_number = $2', [invNum, order.order_number]);
        if (checkInv.rows.length === 0) {
          const issueDate = new Date().toISOString().split('T')[0];
          const dueDateObj = new Date();
          dueDateObj.setDate(dueDateObj.getDate() + 30);
          const dueDate = dueDateObj.toISOString().split('T')[0];

          const itemsArr = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          let prodName = 'handfree (25x)';
          if (itemsArr && itemsArr.length > 0) {
            const item = itemsArr[0];
            const name = item.name || item.product_name || 'handfree';
            const qty = item.qty || item.quantity || 1;
            prodName = `${name} (${qty}x)`;
          } else if (order.items_summary && !order.items_summary.includes('Wholesale B2B')) {
            prodName = order.items_summary;
          }
          const itemsSummary = prodName;

          await pool.query(
            `INSERT INTO invoices (
              invoice_id, invoice_number, order_id, order_number, quotation_number,
              product_name, items_summary, customer_email, distributor_name,
              total_amount, amount_paid, issue_date, due_date, status, late_payment_probability
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (invoice_number) DO UPDATE SET total_amount = EXCLUDED.total_amount, status = EXCLUDED.status`,
            [
              invId,
              invNum,
              order.order_id,
              order.order_number,
              null,
              prodName,
              itemsSummary,
              order.customer_email || null,
              order.distributor_name || null,
              parseFloat(order.total_amount || 0),
              0,
              issueDate,
              dueDate,
              'UNPAID',
              0
            ]
          );
        }
      } catch (invErr) {
        console.error('Error auto-creating invoice on order approval:', invErr.message);
      }
    }

    // ── Inventory reversal when order is REJECTED or CANCELLED ───────────────
    // Release any reserved stock back so it becomes available again
    if (status === 'REJECTED' || status === 'CANCELLED') {
      try {
        const order = result.rows[0];
        const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

        for (const item of orderItems) {
          const qty = parseInt(item.qty || item.quantity || 0);
          if (qty <= 0) continue;

          const prodRes = await pool.query(
            'SELECT * FROM products WHERE product_id = $1 OR sku = $2 OR product_name ILIKE $3 LIMIT 1',
            [item.product_id || '', item.sku || '', `%${item.name || item.product_name || ''}%`]
          );

          if (prodRes.rows.length > 0) {
            const product = prodRes.rows[0];
            let inventory = typeof product.inventory === 'string' ? JSON.parse(product.inventory) : (product.inventory || []);

            // Release reserved quantity back to available
            let remaining = qty;
            inventory = inventory.map(inv => {
              if (remaining <= 0) return inv;
              const reserved = inv.reserved_quantity || 0;
              const toRelease = Math.min(reserved, remaining);
              remaining -= toRelease;
              const newReserved = reserved - toRelease;
              const newAvail = Math.max(0, inv.quantity - newReserved);
              return { ...inv, reserved_quantity: newReserved, available_quantity: newAvail };
            });

            await pool.query(
              'UPDATE products SET inventory = $1 WHERE product_id = $2',
              [JSON.stringify(inventory), product.product_id]
            );

            // Record stock movement
            const movId = `mv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await pool.query(
              `INSERT INTO stock_movements (movement_id, product_id, product_name, warehouse_id, warehouse_name, movement_type, quantity, notes, performed_by, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                movId, product.product_id, product.product_name,
                'wh-1', 'System', 'REVERSAL', qty,
                `Stock released — order ${order.order_number} ${status}`,
                'System', new Date().toISOString()
              ]
            );
          }
        }
      } catch (revErr) {
        console.error('Error reversing stock on order rejection:', revErr.message);
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
app.get('/api/quotations', optionalAuth, async (req, res) => {
  try {
    const { customer_email } = req.query;

    // Server-side scoping: distributor tokens can only see their own quotations.
    const role = String(req.auth?.role || '').toLowerCase();
    const enforcedEmail = (role === 'distributor' || role === 'buyer')
      ? req.auth.email
      : customer_email || null;

    const result = enforcedEmail
      ? await pool.query('SELECT * FROM quotations WHERE LOWER(customer_email) = $1 ORDER BY id DESC', [enforcedEmail.toLowerCase()])
      : await pool.query('SELECT * FROM quotations ORDER BY id DESC');
    const quotations = result.rows.map(row => ({
      ...row,
      total_amount: parseFloat(row.total_amount || 0),
      unit_price: parseFloat(row.unit_price || 0),
      original_unit_price: parseFloat(row.original_unit_price || 0),
      min_price_allowed: parseFloat(row.min_price_allowed || 0),
      quantity: parseInt(row.quantity || 1),
      max_discount_pct: parseInt(row.max_discount_pct || 15),
      items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
      counter_history: typeof row.counter_history === 'string' ? JSON.parse(row.counter_history) : (row.counter_history || [])
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
    let items = [];
    try {
      items = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []);
    } catch (_) { items = []; }

    let prodName = q.product_name;
    let sku = q.sku;
    let qty = parseInt(q.quantity || 0);
    let unitPrice = parseFloat(q.unit_price || 0);
    let origPrice = parseFloat(q.original_unit_price || 0);
    let maxDisc = parseInt(q.max_discount_pct || 15);
    let minFloor = parseFloat(q.min_price_allowed || 0);

    if (items.length > 0) {
      const itemNames = [];
      const itemSkus = [];
      let calcQty = 0;
      let calcOrigPriceTotal = 0;
      let calcOfferedTotal = 0;

      for (const item of items) {
        const itemQty = parseInt(item.qty || item.quantity || 1);
        const itemPrice = parseFloat(item.price || item.unit_price || 0);
        const itemSearch = item.product_id || item.sku || item.name || item.product_name;

        let dbProd = null;
        if (itemSearch) {
          const pRes = await pool.query(
            'SELECT * FROM products WHERE product_id = $1 OR sku = $1 OR product_name ILIKE $2 LIMIT 1',
            [itemSearch, `%${itemSearch}%`]
          );
          if (pRes.rows.length > 0) dbProd = pRes.rows[0];
        }

        const name = dbProd ? dbProd.product_name : (item.name || item.product_name || 'Wholesale Item');
        const itemSkuStr = dbProd ? dbProd.sku : (item.sku || 'SKU-WHOLESALE');
        itemNames.push(name);
        itemSkus.push(itemSkuStr);
        calcQty += itemQty;

        let itemBasePrice = 0;
        if (dbProd && dbProd.prices) {
          const prices = typeof dbProd.prices === 'string' ? JSON.parse(dbProd.prices) : dbProd.prices;
          itemBasePrice = parseFloat(prices.DISTRIBUTOR || prices.RETAIL || itemPrice || 1000);
          maxDisc = dbProd.max_discount !== undefined ? dbProd.max_discount : maxDisc;
        } else {
          itemBasePrice = itemPrice > 0 ? itemPrice : 1000;
        }

        calcOrigPriceTotal += itemBasePrice * itemQty;
        calcOfferedTotal += (itemPrice > 0 ? itemPrice : itemBasePrice) * itemQty;
      }

      prodName = itemNames.join(', ');
      sku = itemSkus.join(', ');
      qty = calcQty > 0 ? calcQty : 1;
      origPrice = calcQty > 0 ? Math.round(calcOrigPriceTotal / calcQty) : 1000;
      unitPrice = calcQty > 0 ? Math.round(calcOfferedTotal / calcQty) : (q.total_amount ? Math.round(q.total_amount / qty) : 1000);
      minFloor = Math.round(origPrice * (1 - maxDisc / 100));
    }

    if (!prodName) prodName = 'Wholesale Batch';
    if (!sku) sku = 'SKU-WHOLESALE';
    if (!qty || qty <= 0) qty = 1;
    if (!unitPrice || unitPrice <= 0) unitPrice = q.total_amount ? Math.round(q.total_amount / qty) : 1000;
    if (!origPrice || origPrice <= 0) origPrice = unitPrice;
    if (!minFloor || minFloor <= 0) minFloor = Math.round(origPrice * (1 - maxDisc / 100));

    const initialHistory = [{
      action: 'CREATED',
      by: 'DISTRIBUTOR',
      unit_price: unitPrice,
      total_amount: q.total_amount,
      timestamp: new Date().toISOString()
    }];

    const quoteObj = {
      quotation_id: q.quotation_id,
      quotation_number: q.quotation_number,
      product_name: prodName,
      sku: sku,
      quantity: qty,
      unit_price: unitPrice,
      original_unit_price: origPrice,
      min_price_allowed: minFloor,
      max_discount_pct: maxDisc,
      total_amount: q.total_amount,
      status: q.status || 'DRAFT',
      customer_email: q.customer_email || 'partner@commerceiq.com',
      customer_name: q.customer_name || 'Authorized Wholesale Partner',
      last_counter_by: 'DISTRIBUTOR',
      counter_history: JSON.stringify(initialHistory)
    };

    quoteObj.description = buildQuotationDescription(quoteObj);

    await pool.query(
      `INSERT INTO quotations (
        quotation_id, quotation_number, status, total_amount, valid_until, created_at, items,
        product_name, sku, quantity, unit_price, original_unit_price, min_price_allowed,
        max_discount_pct, customer_email, customer_name, last_counter_by, counter_history, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (quotation_id) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        sku = EXCLUDED.sku,
        quantity = EXCLUDED.quantity,
        unit_price = EXCLUDED.unit_price,
        original_unit_price = EXCLUDED.original_unit_price,
        min_price_allowed = EXCLUDED.min_price_allowed,
        max_discount_pct = EXCLUDED.max_discount_pct,
        description = EXCLUDED.description`,
      [
        quoteObj.quotation_id,
        quoteObj.quotation_number,
        quoteObj.status,
        quoteObj.total_amount,
        q.valid_until || new Date(Date.now() + 15*24*60*60*1000).toISOString(),
        q.created_at || new Date().toISOString(),
        q.items ? (typeof q.items === 'string' ? q.items : JSON.stringify(q.items)) : null,
        quoteObj.product_name,
        quoteObj.sku,
        quoteObj.quantity,
        quoteObj.unit_price,
        quoteObj.original_unit_price,
        quoteObj.min_price_allowed,
        quoteObj.max_discount_pct,
        quoteObj.customer_email,
        quoteObj.customer_name,
        quoteObj.last_counter_by,
        quoteObj.counter_history,
        quoteObj.description
      ]
    );
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error creating quotation:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update quotation status / proposal counter offer
app.put('/api/quotations/:quotation_id/status', async (req, res) => {
  const { quotation_id } = req.params;
  const { status, total_amount, counter_unit_price, counter_by, notes } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, message: 'Required status missing.' });
  }

  const proposedPrice = counter_unit_price !== undefined ? counter_unit_price : total_amount;

  try {
    let quote;
    // If a counter price is provided or status is NEGOTIATING / COUNTER_OFFER_RECEIVED
    if (proposedPrice !== undefined && proposedPrice !== null && !isNaN(parseFloat(proposedPrice))) {
      quote = await counterOfferQuotationInDb(pool, quotation_id, proposedPrice, counter_by || 'ADMIN', notes || '');
    } else {
      const result = await pool.query(
        'UPDATE quotations SET status = $1 WHERE quotation_id = $2 OR quotation_number = $2 RETURNING *',
        [status, quotation_id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Quotation not found.' });
      }
      quote = result.rows[0];
    }

    // If quotation is APPROVED or ACCEPTED, auto-create corresponding B2B order
    const normStatus = (status || '').toUpperCase();
    if (normStatus === 'APPROVED' || normStatus === 'ACCEPTED') {
      try {
        const orderNumber = (quote.quotation_number || quotation_id).replace("QUO-", "ORD-");
        const checkOrder = await pool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
        if (checkOrder.rows.length === 0) {
          const orderId = `ord-b2b-${Date.now()}`;
          const items = quote.items || [{
            product_id: 'b2b-stock',
            name: quote.product_name || 'B2B Wholesale Order',
            qty: 1,
            price: quote.total_amount
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
              quote.product_name && quote.product_name !== 'Wholesale Batch' ? quote.product_name : (items.length > 0 ? items.map(i => i.name || i.product_name).join(', ') : `B2B Order for ${quote.quotation_number}`),
              JSON.stringify(items),
              quote.customer_email || 'demo@commerceiq.com'
            ]
          );
        }
      } catch (orderErr) {
        console.error('Error auto-creating B2B order from quotation API status update:', orderErr.message);
      }
    }

    return res.json({ success: true, quotation: quote });
  } catch (err) {
    console.error('Error updating quotation status / counter offer:', err.message);
    return res.status(400).json({ success: false, message: err.message });
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
app.get('/api/invoices', optionalAuth, async (req, res) => {
  try {
    const { customer_email } = req.query;

    // Server-side scoping: distributor and buyer tokens can only see their own invoices.
    const role = String(req.auth?.role || '').toLowerCase();
    const enforcedEmail = (role === 'distributor' || role === 'buyer')
      ? req.auth.email
      : customer_email || null;

    const result = enforcedEmail
      ? await pool.query('SELECT * FROM invoices WHERE LOWER(customer_email) = $1 ORDER BY id DESC', [enforcedEmail.toLowerCase()])
      : await pool.query('SELECT * FROM invoices ORDER BY id DESC');
    const invoices = result.rows.map(row => ({
      invoice_id: row.invoice_id,
      invoice_number: row.invoice_number,
      order_id: row.order_id,
      order_number: row.order_number,
      quotation_number: row.quotation_number,
      product_name: row.product_name || row.items_summary || 'Wholesale B2B Order',
      items_summary: row.items_summary || row.product_name || 'Wholesale B2B Batch',
      customer_email: row.customer_email || '',
      distributor_name: row.distributor_name || '',
      total_amount: parseFloat(row.total_amount || 0),
      amount_paid: parseFloat(row.amount_paid || 0),
      issue_date: row.issue_date || (row.due_date ? String(row.due_date).slice(0,10) : new Date().toISOString().split('T')[0]),
      due_date: row.due_date,
      status: row.status || 'UNPAID',
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
  const invoiceNum = inv.invoice_number || `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const invoiceId = inv.invoice_id || `inv-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    await pool.query(
      `INSERT INTO invoices (
        invoice_id, invoice_number, order_id, order_number, quotation_number,
        product_name, items_summary, customer_email, distributor_name,
        total_amount, amount_paid, issue_date, due_date, status, late_payment_probability
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (invoice_number) DO UPDATE SET total_amount = EXCLUDED.total_amount, status = EXCLUDED.status`,
      [
        invoiceId,
        invoiceNum,
        inv.order_id || null,
        inv.order_number || null,
        inv.quotation_number || null,
        inv.product_name || inv.items_summary || 'Wholesale B2B Order',
        inv.items_summary || inv.product_name || 'Wholesale B2B Order',
        inv.customer_email || null,
        inv.distributor_name || null,
        inv.total_amount || 0,
        inv.amount_paid || 0,
        inv.issue_date || new Date().toISOString().split('T')[0],
        inv.due_date || new Date().toISOString().split('T')[0],
        inv.status || 'UNPAID',
        inv.late_payment_probability || 0
      ]
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

    // Auto-convert matching order to READY_TO_SHIP when invoice is PAID
    const invRes = await pool.query('SELECT * FROM invoices WHERE invoice_id = $1', [id]);
    if (invRes.rows.length > 0) {
      const inv = invRes.rows[0];
      const isPaid = (status && status.toUpperCase() === 'PAID') || parseFloat(amount_paid) >= parseFloat(inv.total_amount || 0);
      if (isPaid) {
        const ordNum = inv.order_number || inv.invoice_number.replace('INV-', 'ORD-');
        await pool.query(
          "UPDATE orders SET status = 'READY_TO_SHIP' WHERE (order_number = $1 OR order_id = $2) AND status != 'SHIPPED'",
          [ordNum, inv.order_id || '']
        );
      }
    }

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
app.post('/api/admin/distributors/approve', optionalAuth, async (req, res) => {
  if (req.auth && String(req.auth.role).toLowerCase() !== 'admin') {
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
  }
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, message: 'Missing user ID.' });

  try {
    const result = await pool.query(
      "UPDATE users SET status = 'ACTIVE' WHERE (id::text = $1::text OR email = $1) AND LOWER(role) = 'distributor' RETURNING *",
      [String(id)]
    );
    if (result.rowCount === 0) {
      await pool.query("UPDATE users SET status = 'ACTIVE' WHERE (id::text = $1::text OR email = $1) RETURNING *", [String(id)]);
    }
    return res.json({ success: true, message: 'Distributor approved successfully.' });
  } catch (err) {
    console.error('Error approving distributor:', err);
    return res.status(500).json({ success: false, message: 'Database error approving distributor.' });
  }
});

// POST remove distributor (reject application)
app.post('/api/admin/distributors/remove', optionalAuth, async (req, res) => {
  if (req.auth && String(req.auth.role).toLowerCase() !== 'admin') {
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
  }
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, message: 'Missing user ID.' });

  try {
    const result = await pool.query(
      "UPDATE users SET status = 'REJECTED' WHERE (id::text = $1::text OR email = $1) AND LOWER(role) = 'distributor' RETURNING *",
      [String(id)]
    );
    if (result.rowCount === 0) {
      await pool.query("UPDATE users SET status = 'REJECTED' WHERE (id::text = $1::text OR email = $1) RETURNING *", [String(id)]);
    }
    return res.json({ success: true, message: 'Distributor application rejected.' });
  } catch (err) {
    console.error('Error rejecting distributor:', err);
    return res.status(500).json({ success: false, message: 'Database error rejecting distributor.' });
  }
});

// Register AI Copilot modular routes
const { registerCopilotRoutes } = require('./copilot');
registerCopilotRoutes(app, pool);

// Process-wide safety net: an unhandled 'error' event or rejected promise anywhere
// (e.g. a stream piping a proxied response, like TTS audio from the Office PC) is
// fatal to the whole Node process by default -- it takes down every route, not just
// the one that failed. Logging and continuing here is what makes those failures
// isolated request errors instead of full server outages.
process.on('uncaughtException', (err) => {
  console.error('[FATAL-GUARD] Uncaught exception (server kept alive):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL-GUARD] Unhandled promise rejection (server kept alive):', reason);
});

app.listen(port, () => {
  console.log(`CommerceIQ Auth API Server running on port ${port}`);

  // ── Embedding backfill: runs after server is up, non-blocking ───────────
  // Generates nomic-embed-text vectors for any products missing embeddings.
  // Safe to run on every restart — skips products that already have one.
  const { backfillEmbeddings, isEmbedModelAvailable } = require('./embeddings');
  isEmbedModelAvailable().then(available => {
    if (available) {
      console.log('[Embeddings] nomic-embed-text detected — starting backfill...');
      backfillEmbeddings(pool).catch(err =>
        console.error('[Embeddings] Backfill error:', err.message)
      );
    } else {
      console.warn('[Embeddings] nomic-embed-text not found in Ollama. Vector search will fall back to keyword search.');
      console.warn('[Embeddings] To enable: ollama pull nomic-embed-text');
    }
  });
});
