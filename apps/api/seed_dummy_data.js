require('dotenv').config();
const pool = require('./db');

// ============================================================================
// COMPREHENSIVE DUMMY DATA FOR RAG IMPLEMENTATION
// ============================================================================

const DUMMY_PRODUCTS = [
  // Networking Equipment
  {
    product_id: 'prod-net-001',
    sku: 'CISCO-CAT9300-24P',
    barcode: '889728094818',
    product_name: 'Cisco Catalyst 9300 24-Port PoE+ Network Switch',
    short_description: 'Enterprise-grade managed switch with 24 PoE+ ports, 4x10G uplinks, and Cisco DNA Center support. Ideal for campus and branch deployments.',
    brand: 'Cisco',
    category: 'Networking',
    unit: 'PCS',
    weight: 5.8,
    status: 'ACTIVE',
    low_stock_threshold: 5,
    overstock_threshold: 50,
    dead_stock_days: 90,
    total_product_limit: 100,
    prices: JSON.stringify({ RETAIL: 450000, DISTRIBUTOR: 420000, VIP: 410000, CUSTOM: 420000 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 15, reserved_quantity: 2, available_quantity: 13 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 12, reserved_quantity: 1, available_quantity: 11 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 8, reserved_quantity: 0, available_quantity: 8 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800',
    min_wholesale_qty: 3,
    max_discount: 15
  },
  {
    product_id: 'prod-net-002',
    sku: 'UB-UDMSE',
    barcode: '817882029506',
    product_name: 'UniFi Dream Machine SE - All-in-One Network Gateway',
    short_description: 'Complete network solution with router, switch, WiFi controller, and NVR. 8 PoE+ ports, 128GB SSD storage, and UniFi Protect support.',
    brand: 'Ubiquiti',
    category: 'Networking',
    unit: 'PCS',
    weight: 2.3,
    status: 'ACTIVE',
    low_stock_threshold: 3,
    overstock_threshold: 30,
    dead_stock_days: 90,
    total_product_limit: 50,
    prices: JSON.stringify({ RETAIL: 185000, DISTRIBUTOR: 175000, VIP: 170000, CUSTOM: 175000 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 22, reserved_quantity: 3, available_quantity: 19 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 18, reserved_quantity: 2, available_quantity: 16 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 14, reserved_quantity: 1, available_quantity: 13 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=800',
    min_wholesale_qty: 2,
    max_discount: 12
  },
  {
    product_id: 'prod-net-003',
    sku: 'TP-TL-SG1024DE',
    barcode: '840030700842',
    product_name: 'TP-Link TL-SG1024DE 24-Port Gigabit Easy Smart Switch',
    short_description: 'Cost-effective managed switch for small businesses with VLAN, QoS, IGMP Snooping. Fanless design for silent operation.',
    brand: 'TP-Link',
    category: 'Networking',
    unit: 'PCS',
    weight: 1.8,
    status: 'ACTIVE',
    low_stock_threshold: 10,
    overstock_threshold: 80,
    dead_stock_days: 90,
    total_product_limit: 150,
    prices: JSON.stringify({ RETAIL: 28500, DISTRIBUTOR: 26000, VIP: 25000, CUSTOM: 26000 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 45, reserved_quantity: 5, available_quantity: 40 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 52, reserved_quantity: 4, available_quantity: 48 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 38, reserved_quantity: 3, available_quantity: 35 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1621331050181-2b9a29b80fa2?w=800',
    min_wholesale_qty: 5,
    max_discount: 10
  },

  // Storage Devices
  {
    product_id: 'prod-stor-001',
    sku: 'WD-GOLD-18TB',
    barcode: '718037891125',
    product_name: 'WD Gold 18TB Enterprise HDD - 7200 RPM SATA',
    short_description: 'Enterprise-class hard drive for 24/7 datacenter operations. 512MB cache, 2.5M hours MTBF, 5-year warranty.',
    brand: 'Western Digital',
    category: 'Storage',
    unit: 'PCS',
    weight: 0.65,
    status: 'ACTIVE',
    low_stock_threshold: 8,
    overstock_threshold: 60,
    dead_stock_days: 90,
    total_product_limit: 100,
    prices: JSON.stringify({ RETAIL: 89500, DISTRIBUTOR: 84000, VIP: 82000, CUSTOM: 84000 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 28, reserved_quantity: 4, available_quantity: 24 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 32, reserved_quantity: 3, available_quantity: 29 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 21, reserved_quantity: 2, available_quantity: 19 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800',
    min_wholesale_qty: 4,
    max_discount: 8
  },
  {
    product_id: 'prod-stor-002',
    sku: 'SAMSUNG-990PRO-2TB',
    barcode: '887276652283',
    product_name: 'Samsung 990 PRO 2TB NVMe M.2 SSD with Heatsink',
    short_description: 'Flagship PCIe 4.0 SSD with 7,450 MB/s read speeds. Perfect for gaming, content creation, and professional workloads.',
    brand: 'Samsung',
    category: 'Storage',
    unit: 'PCS',
    weight: 0.15,
    status: 'ACTIVE',
    low_stock_threshold: 12,
    overstock_threshold: 100,
    dead_stock_days: 90,
    total_product_limit: 200,
    prices: JSON.stringify({ RETAIL: 48500, DISTRIBUTOR: 45000, VIP: 44000, CUSTOM: 45000 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 67, reserved_quantity: 8, available_quantity: 59 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 72, reserved_quantity: 6, available_quantity: 66 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 54, reserved_quantity: 5, available_quantity: 49 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1551058622-4f5a77f61175?w=800',
    min_wholesale_qty: 6,
    max_discount: 10
  },
  {
    product_id: 'prod-stor-003',
    sku: 'QNAP-TS-464-8G',
    barcode: '885022022564',
    product_name: 'QNAP TS-464 4-Bay NAS - Intel Celeron N5105 8GB',
    short_description: 'High-performance 4-bay NAS with 2.5GbE ports, M.2 SSD caching, snapshot protection, and hybrid cloud backup support.',
    brand: 'QNAP',
    category: 'Storage',
    unit: 'PCS',
    weight: 3.2,
    status: 'ACTIVE',
    low_stock_threshold: 4,
    overstock_threshold: 25,
    dead_stock_days: 90,
    total_product_limit: 40,
    prices: JSON.stringify({ RETAIL: 142000, DISTRIBUTOR: 135000, VIP: 132000, CUSTOM: 135000 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 11, reserved_quantity: 2, available_quantity: 9 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 14, reserved_quantity: 1, available_quantity: 13 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 9, reserved_quantity: 0, available_quantity: 9 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?w=800',
    min_wholesale_qty: 2,
    max_discount: 12
  },

  // Computer Accessories
  {
    product_id: 'prod-acc-001',
    sku: 'LOGI-MX-MASTER-3S',
    barcode: '097855184498',
    product_name: 'Logitech MX Master 3S Wireless Performance Mouse',
    short_description: 'Premium ergonomic mouse with 8K DPI sensor, silent clicks, USB-C fast charging, and multi-device connectivity.',
    brand: 'Logitech',
    category: 'Computer Accessories',
    unit: 'PCS',
    weight: 0.141,
    status: 'ACTIVE',
    low_stock_threshold: 15,
    overstock_threshold: 120,
    dead_stock_days: 90,
    total_product_limit: 200,
    prices: JSON.stringify({ RETAIL: 29500, DISTRIBUTOR: 27000, VIP: 26500, CUSTOM: 27000 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 84, reserved_quantity: 10, available_quantity: 74 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 92, reserved_quantity: 8, available_quantity: 84 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 76, reserved_quantity: 7, available_quantity: 69 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800',
    min_wholesale_qty: 10,
    max_discount: 10
  },
  {
    product_id: 'prod-acc-002',
    sku: 'RAZER-BW-V4-PRO',
    barcode: '8886419378723',
    product_name: 'Razer BlackWidow V4 Pro Mechanical Gaming Keyboard',
    short_description: 'Full-size mechanical keyboard with Green switches, per-key RGB, command dial, and magnetic plush wrist rest.',
    brand: 'Razer',
    category: 'Computer Accessories',
    unit: 'PCS',
    weight: 1.48,
    status: 'ACTIVE',
    low_stock_threshold: 12,
    overstock_threshold: 80,
    dead_stock_days: 90,
    total_product_limit: 150,
    prices: JSON.stringify({ RETAIL: 52500, DISTRIBUTOR: 49000, VIP: 48000, CUSTOM: 49000 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 48, reserved_quantity: 6, available_quantity: 42 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 55, reserved_quantity: 5, available_quantity: 50 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 41, reserved_quantity: 4, available_quantity: 37 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
    min_wholesale_qty: 8,
    max_discount: 12
  },
  {
    product_id: 'prod-acc-003',
    sku: 'ANKER-737-140W',
    barcode: '194644107635',
    product_name: 'Anker 737 GaNPrime 140W 3-Port Desktop Charger',
    short_description: 'Ultra-compact GaN charger with 2x USB-C (140W max) and 1x USB-A. Charges laptops, tablets, phones simultaneously.',
    brand: 'Anker',
    category: 'Computer Accessories',
    unit: 'PCS',
    weight: 0.38,
    status: 'ACTIVE',
    low_stock_threshold: 20,
    overstock_threshold: 150,
    dead_stock_days: 90,
    total_product_limit: 250,
    prices: JSON.stringify({ RETAIL: 22500, DISTRIBUTOR: 20500, VIP: 20000, CUSTOM: 20500 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 98, reserved_quantity: 12, available_quantity: 86 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 105, reserved_quantity: 10, available_quantity: 95 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 87, reserved_quantity: 9, available_quantity: 78 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1591290619762-c588dc66d0f6?w=800',
    min_wholesale_qty: 15,
    max_discount: 10
  },

  // Monitors
  {
    product_id: 'prod-mon-001',
    sku: 'DELL-U2723DE',
    barcode: '210-BDCE',
    product_name: 'Dell UltraSharp 27" 4K USB-C Hub Monitor U2723DE',
    short_description: '27-inch IPS Black panel, 4K resolution, 99% sRGB, built-in KVM, USB-C 90W power delivery, height-adjustable stand.',
    brand: 'Dell',
    category: 'Monitors',
    unit: 'PCS',
    weight: 6.8,
    status: 'ACTIVE',
    low_stock_threshold: 6,
    overstock_threshold: 40,
    dead_stock_days: 90,
    total_product_limit: 80,
    prices: JSON.stringify({ RETAIL: 168000, DISTRIBUTOR: 158000, VIP: 155000, CUSTOM: 158000 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 18, reserved_quantity: 3, available_quantity: 15 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 22, reserved_quantity: 2, available_quantity: 20 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 16, reserved_quantity: 1, available_quantity: 15 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800',
    min_wholesale_qty: 3,
    max_discount: 12
  },
  {
    product_id: 'prod-mon-002',
    sku: 'LG-27GR95QE-B',
    barcode: '8806091248194',
    product_name: 'LG UltraGear 27" OLED Gaming Monitor 240Hz QHD',
    short_description: '27-inch OLED panel with 0.03ms response, 240Hz refresh rate, DisplayHDR True Black 400, AMD FreeSync Premium Pro.',
    brand: 'LG',
    category: 'Monitors',
    unit: 'PCS',
    weight: 5.4,
    status: 'ACTIVE',
    low_stock_threshold: 5,
    overstock_threshold: 30,
    dead_stock_days: 90,
    total_product_limit: 60,
    prices: JSON.stringify({ RETAIL: 295000, DISTRIBUTOR: 280000, VIP: 275000, CUSTOM: 280000 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 12, reserved_quantity: 2, available_quantity: 10 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 15, reserved_quantity: 1, available_quantity: 14 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 10, reserved_quantity: 1, available_quantity: 9 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800',
    min_wholesale_qty: 2,
    max_discount: 10
  },

  // Power Backup
  {
    product_id: 'prod-ups-001',
    sku: 'APC-SMT1500IC',
    barcode: '731304413233',
    product_name: 'APC Smart-UPS 1500VA LCD 230V Tower UPS',
    short_description: 'Line-interactive UPS with automatic voltage regulation, LCD interface, PowerChute management software. 980W output.',
    brand: 'APC',
    category: 'Power Backup',
    unit: 'PCS',
    weight: 22.5,
    status: 'ACTIVE',
    low_stock_threshold: 8,
    overstock_threshold: 50,
    dead_stock_days: 90,
    total_product_limit: 100,
    prices: JSON.stringify({ RETAIL: 125000, DISTRIBUTOR: 118000, VIP: 115000, CUSTOM: 118000 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 24, reserved_quantity: 4, available_quantity: 20 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 28, reserved_quantity: 3, available_quantity: 25 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 19, reserved_quantity: 2, available_quantity: 17 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    min_wholesale_qty: 4,
    max_discount: 12
  },
  {
    product_id: 'prod-ups-002',
    sku: 'EATON-5P1550IR',
    barcode: '743172053725',
    product_name: 'Eaton 5P 1550VA Line Interactive Rack/Tower UPS',
    short_description: 'Convertible rack/tower UPS with LCD, energy-efficient design, hot-swappable batteries, and network management card slot.',
    brand: 'Eaton',
    category: 'Power Backup',
    unit: 'PCS',
    weight: 16.8,
    status: 'ACTIVE',
    low_stock_threshold: 6,
    overstock_threshold: 40,
    dead_stock_days: 90,
    total_product_limit: 75,
    prices: JSON.stringify({ RETAIL: 138000, DISTRIBUTOR: 130000, VIP: 127000, CUSTOM: 130000 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 16, reserved_quantity: 2, available_quantity: 14 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 20, reserved_quantity: 2, available_quantity: 18 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 13, reserved_quantity: 1, available_quantity: 12 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1609882526374-9cb5e5c8a77c?w=800',
    min_wholesale_qty: 3,
    max_discount: 10
  },

  // Cables & Connectors
  {
    product_id: 'prod-cab-001',
    sku: 'UGREEN-USB4-240W',
    barcode: '6957303884858',
    product_name: 'UGREEN USB4 Cable 240W 40Gbps - 2 Meter Braided',
    short_description: 'Premium USB4 cable supporting 240W power delivery, 40Gbps data transfer, 8K@60Hz video. E-Marker certified.',
    brand: 'UGREEN',
    category: 'Cables & Connectors',
    unit: 'PCS',
    weight: 0.12,
    status: 'ACTIVE',
    low_stock_threshold: 30,
    overstock_threshold: 200,
    dead_stock_days: 90,
    total_product_limit: 400,
    prices: JSON.stringify({ RETAIL: 6500, DISTRIBUTOR: 5800, VIP: 5500, CUSTOM: 5800 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 156, reserved_quantity: 18, available_quantity: 138 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 178, reserved_quantity: 15, available_quantity: 163 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 142, reserved_quantity: 12, available_quantity: 130 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1589290227223-89b4e84c3bb6?w=800',
    min_wholesale_qty: 25,
    max_discount: 15
  },
  {
    product_id: 'prod-cab-002',
    sku: 'BELKIN-CAT8-10FT',
    barcode: '745883809677',
    product_name: 'Belkin CAT8 Ethernet Cable 10ft - 40Gbps Shielded',
    short_description: 'Ultra-high-speed Category 8 Ethernet cable with gold-plated connectors. Perfect for 10G networks, gaming, and servers.',
    brand: 'Belkin',
    category: 'Cables & Connectors',
    unit: 'PCS',
    weight: 0.25,
    status: 'ACTIVE',
    low_stock_threshold: 25,
    overstock_threshold: 180,
    dead_stock_days: 90,
    total_product_limit: 350,
    prices: JSON.stringify({ RETAIL: 4200, DISTRIBUTOR: 3800, VIP: 3600, CUSTOM: 3800 }),
    inventory: JSON.stringify([
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', quantity: 124, reserved_quantity: 14, available_quantity: 110 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', quantity: 138, reserved_quantity: 12, available_quantity: 126 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Tech Hub', city: 'Islamabad', country: 'Pakistan', quantity: 115, reserved_quantity: 10, available_quantity: 105 }
    ]),
    image_url: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800',
    min_wholesale_qty: 20,
    max_discount: 12
  }
];

const DUMMY_USERS = [
  // Admin Users
  { user_id: 'user-admin-001', email: 'admin@commerceiq.pk', first_name: 'Ahmed', last_name: 'Hassan', role: 'ADMIN', phone: '+92-300-1234567', city: 'Karachi', country: 'Pakistan' },
  { user_id: 'user-admin-002', email: 'sarah.malik@commerceiq.pk', first_name: 'Sarah', last_name: 'Malik', role: 'ADMIN', phone: '+92-321-9876543', city: 'Lahore', country: 'Pakistan' },
  
  // Distributor Users
  { user_id: 'user-dist-001', email: 'bilal@techglobal.pk', first_name: 'Bilal', last_name: 'Ahmed', role: 'DISTRIBUTOR', phone: '+92-311-2345678', city: 'Karachi', country: 'Pakistan', company: 'Tech Global Distributors' },
  { user_id: 'user-dist-002', email: 'farhan@innovatech.pk', first_name: 'Farhan', last_name: 'Khan', role: 'DISTRIBUTOR', phone: '+92-333-3456789', city: 'Lahore', country: 'Pakistan', company: 'InnovaTech Solutions' },
  { user_id: 'user-dist-003', email: 'zainab@smartsupply.pk', first_name: 'Zainab', last_name: 'Raza', role: 'DISTRIBUTOR', phone: '+92-345-4567890', city: 'Islamabad', country: 'Pakistan', company: 'Smart Supply Chain Ltd' },
  
  // Buyer Users
  { user_id: 'user-buyer-001', email: 'imran.sheikh@gmail.com', first_name: 'Imran', last_name: 'Sheikh', role: 'BUYER', phone: '+92-301-5678901', city: 'Karachi', country: 'Pakistan' },
  { user_id: 'user-buyer-002', email: 'ayesha.tariq@outlook.com', first_name: 'Ayesha', last_name: 'Tariq', role: 'BUYER', phone: '+92-322-6789012', city: 'Lahore', country: 'Pakistan' },
  { user_id: 'user-buyer-003', email: 'hassan.ali@yahoo.com', first_name: 'Hassan', last_name: 'Ali', role: 'BUYER', phone: '+92-334-7890123', city: 'Islamabad', country: 'Pakistan' },
  { user_id: 'user-buyer-004', email: 'fatima.noor@gmail.com', first_name: 'Fatima', last_name: 'Noor', role: 'BUYER', phone: '+92-346-8901234', city: 'Faisalabad', country: 'Pakistan' },
  { user_id: 'user-buyer-005', email: 'usman.qadir@hotmail.com', first_name: 'Usman', last_name: 'Qadir', role: 'BUYER', phone: '+92-300-9012345', city: 'Rawalpindi', country: 'Pakistan' }
];

const DUMMY_SUPPLIERS = [
  {
    supplier_id: 'sup-001',
    company_name: 'Cisco Systems Pakistan Pvt Ltd',
    contact_person: 'Muhammad Saeed',
    email: 'saeed.m@cisco.com.pk',
    phone: '+92-21-3456-7890',
    city: 'Karachi',
    country: 'Pakistan',
    reliability_score: 95,
    lead_time_days: 14
  },
  {
    supplier_id: 'sup-002',
    company_name: 'Samsung Electronics Pakistan',
    contact_person: 'Ali Raza',
    email: 'ali.raza@samsung.com.pk',
    phone: '+92-42-3567-8901',
    city: 'Lahore',
    country: 'Pakistan',
    reliability_score: 92,
    lead_time_days: 10
  },
  {
    supplier_id: 'sup-003',
    company_name: 'Dell Technologies Distribution',
    contact_person: 'Sana Khalid',
    email: 'sana.khalid@dell.com',
    phone: '+92-51-4678-9012',
    city: 'Islamabad',
    country: 'Pakistan',
    reliability_score: 90,
    lead_time_days: 12
  },
  {
    supplier_id: 'sup-004',
    company_name: 'Western Digital Regional Hub',
    contact_person: 'Omar Farooq',
    email: 'omar.f@wdc.com',
    phone: '+92-21-5789-0123',
    city: 'Karachi',
    country: 'Pakistan',
    reliability_score: 88,
    lead_time_days: 15
  },
  {
    supplier_id: 'sup-005',
    company_name: 'TP-Link Pakistan Distribution',
    contact_person: 'Nadia Iqbal',
    email: 'nadia@tplink.com.pk',
    phone: '+92-42-6890-1234',
    city: 'Lahore',
    country: 'Pakistan',
    reliability_score: 87,
    lead_time_days: 7
  }
];

const DUMMY_ORDERS = [
  // B2C Retail Orders
  {
    order_id: 'ord-b2c-001',
    order_number: 'ORD-20260115-001',
    order_type: 'B2C',
    customer_email: 'imran.sheikh@gmail.com',
    status: 'DELIVERED',
    total_amount: 52500,
    order_date: '2026-01-15',
    items: JSON.stringify([
      { product_id: 'prod-acc-002', name: 'Razer BlackWidow V4 Pro Mechanical Gaming Keyboard', sku: 'RAZER-BW-V4-PRO', quantity: 1, unit_price: 52500, price: 52500 }
    ]),
    items_summary: '1x Razer BlackWidow V4 Pro Mechanical Gaming Keyboard'
  },
  {
    order_id: 'ord-b2c-002',
    order_number: 'ORD-20260118-002',
    order_type: 'B2C',
    customer_email: 'ayesha.tariq@outlook.com',
    status: 'SHIPPED',
    total_amount: 48500,
    order_date: '2026-01-18',
    items: JSON.stringify([
      { product_id: 'prod-stor-002', name: 'Samsung 990 PRO 2TB NVMe M.2 SSD with Heatsink', sku: 'SAMSUNG-990PRO-2TB', quantity: 1, unit_price: 48500, price: 48500 }
    ]),
    items_summary: '1x Samsung 990 PRO 2TB NVMe M.2 SSD'
  },
  {
    order_id: 'ord-b2c-003',
    order_number: 'ORD-20260122-003',
    order_type: 'B2C',
    customer_email: 'hassan.ali@yahoo.com',
    status: 'PROCESSING',
    total_amount: 168000,
    order_date: '2026-01-22',
    items: JSON.stringify([
      { product_id: 'prod-mon-001', name: 'Dell UltraSharp 27" 4K USB-C Hub Monitor U2723DE', sku: 'DELL-U2723DE', quantity: 1, unit_price: 168000, price: 168000 }
    ]),
    items_summary: '1x Dell UltraSharp 27" 4K Monitor'
  },
  {
    order_id: 'ord-b2c-004',
    order_number: 'ORD-20260125-004',
    order_type: 'B2C',
    customer_email: 'fatima.noor@gmail.com',
    status: 'PENDING',
    total_amount: 52000,
    order_date: '2026-01-25',
    items: JSON.stringify([
      { product_id: 'prod-acc-001', name: 'Logitech MX Master 3S Wireless Performance Mouse', sku: 'LOGI-MX-MASTER-3S', quantity: 1, unit_price: 29500, price: 29500 },
      { product_id: 'prod-acc-003', name: 'Anker 737 GaNPrime 140W 3-Port Desktop Charger', sku: 'ANKER-737-140W', quantity: 1, unit_price: 22500, price: 22500 }
    ]),
    items_summary: '1x Logitech MX Master 3S Mouse + 1x Anker 737 Charger'
  },
  {
    order_id: 'ord-b2c-005',
    order_number: 'ORD-20260127-005',
    order_type: 'B2C',
    customer_email: 'usman.qadir@hotmail.com',
    status: 'CONFIRMED',
    total_amount: 125000,
    order_date: '2026-01-27',
    items: JSON.stringify([
      { product_id: 'prod-ups-001', name: 'APC Smart-UPS 1500VA LCD 230V Tower UPS', sku: 'APC-SMT1500IC', quantity: 1, unit_price: 125000, price: 125000 }
    ]),
    items_summary: '1x APC Smart-UPS 1500VA'
  },

  // B2B Wholesale Orders
  {
    order_id: 'ord-b2b-001',
    order_number: 'WH-ORD-20260110-001',
    order_type: 'B2B',
    customer_email: 'bilal@techglobal.pk',
    status: 'DELIVERED',
    total_amount: 1260000,
    order_date: '2026-01-10',
    items: JSON.stringify([
      { product_id: 'prod-net-001', name: 'Cisco Catalyst 9300 24-Port PoE+ Network Switch', sku: 'CISCO-CAT9300-24P', quantity: 3, unit_price: 420000, price: 1260000 }
    ]),
    items_summary: '3x Cisco Catalyst 9300 Switches (Wholesale)'
  },
  {
    order_id: 'ord-b2b-002',
    order_number: 'WH-ORD-20260112-002',
    order_type: 'B2B',
    customer_email: 'farhan@innovatech.pk',
    status: 'SHIPPED',
    total_amount: 350000,
    order_date: '2026-01-12',
    items: JSON.stringify([
      { product_id: 'prod-net-002', name: 'UniFi Dream Machine SE', sku: 'UB-UDMSE', quantity: 2, unit_price: 175000, price: 350000 }
    ]),
    items_summary: '2x UniFi Dream Machine SE (Wholesale)'
  },
  {
    order_id: 'ord-b2b-003',
    order_number: 'WH-ORD-20260116-003',
    order_type: 'B2B',
    customer_email: 'zainab@smartsupply.pk',
    status: 'PROCESSING',
    total_amount: 504000,
    order_date: '2026-01-16',
    items: JSON.stringify([
      { product_id: 'prod-stor-001', name: 'WD Gold 18TB Enterprise HDD', sku: 'WD-GOLD-18TB', quantity: 6, unit_price: 84000, price: 504000 }
    ]),
    items_summary: '6x WD Gold 18TB HDDs (Wholesale)'
  },
  {
    order_id: 'ord-b2b-004',
    order_number: 'WH-ORD-20260120-004',
    order_type: 'B2B',
    customer_email: 'bilal@techglobal.pk',
    status: 'CONFIRMED',
    total_amount: 270000,
    order_date: '2026-01-20',
    items: JSON.stringify([
      { product_id: 'prod-acc-001', name: 'Logitech MX Master 3S Mouse', sku: 'LOGI-MX-MASTER-3S', quantity: 10, unit_price: 27000, price: 270000 }
    ]),
    items_summary: '10x Logitech MX Master 3S Mice (Wholesale)'
  },
  {
    order_id: 'ord-b2b-005',
    order_number: 'WH-ORD-20260124-005',
    order_type: 'B2B',
    customer_email: 'farhan@innovatech.pk',
    status: 'PENDING',
    total_amount: 130000,
    order_date: '2026-01-24',
    items: JSON.stringify([
      { product_id: 'prod-net-003', name: 'TP-Link TL-SG1024DE Switch', sku: 'TP-TL-SG1024DE', quantity: 5, unit_price: 26000, price: 130000 }
    ]),
    items_summary: '5x TP-Link 24-Port Switches (Wholesale)'
  }
];

const DUMMY_WAREHOUSES = [
  {
    warehouse_id: 'wh-1',
    warehouse_name: 'Karachi Central Depot',
    warehouse_code: 'KHI-CD-01',
    city: 'Karachi',
    country: 'Pakistan',
    address: 'Plot 45, SITE Industrial Area, Karachi 75700',
    manager_name: 'Asif Mahmood',
    manager_email: 'asif.m@commerceiq.pk',
    manager_phone: '+92-21-3211-5544',
    capacity: 5000,
    current_utilization: 3200
  },
  {
    warehouse_id: 'wh-2',
    warehouse_name: 'Lahore North Terminal',
    warehouse_code: 'LHR-NT-02',
    city: 'Lahore',
    country: 'Pakistan',
    address: '156 Ferozepur Road, Industrial Estate, Lahore 54600',
    manager_name: 'Mehreen Siddiqui',
    manager_email: 'mehreen.s@commerceiq.pk',
    manager_phone: '+92-42-3788-6622',
    capacity: 4500,
    current_utilization: 2900
  },
  {
    warehouse_id: 'wh-3',
    warehouse_name: 'Islamabad Tech Hub',
    warehouse_code: 'ISB-TH-03',
    city: 'Islamabad',
    country: 'Pakistan',
    address: 'Sector I-9/3, Industrial Zone, Islamabad 44000',
    manager_name: 'Kamran Yousaf',
    manager_email: 'kamran.y@commerceiq.pk',
    manager_phone: '+92-51-8449-3311',
    capacity: 3500,
    current_utilization: 2100
  }
];

// ============================================================================
// DATABASE SEEDING FUNCTION
// ============================================================================

async function seedDummyData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting dummy data seeding for RAG implementation...\n');

    // Create tables if they don't exist
    console.log('📋 Creating database tables...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(100) UNIQUE NOT NULL,
        sku VARCHAR(100) UNIQUE NOT NULL,
        barcode VARCHAR(100),
        product_name TEXT NOT NULL,
        short_description TEXT,
        brand VARCHAR(200),
        category VARCHAR(200),
        unit VARCHAR(50),
        weight DECIMAL(10,3),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        low_stock_threshold INT,
        overstock_threshold INT,
        dead_stock_days INT,
        total_product_limit INT,
        prices JSONB,
        inventory JSONB,
        image_url TEXT,
        min_wholesale_qty INT,
        max_discount INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) NOT NULL,
        phone VARCHAR(50),
        city VARCHAR(100),
        country VARCHAR(100),
        company VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        supplier_id VARCHAR(100) UNIQUE NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(200),
        email VARCHAR(255),
        phone VARCHAR(50),
        city VARCHAR(100),
        country VARCHAR(100),
        reliability_score INT DEFAULT 80,
        lead_time_days INT DEFAULT 7,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(100) UNIQUE NOT NULL,
        order_number VARCHAR(100) UNIQUE NOT NULL,
        order_type VARCHAR(50) NOT NULL,
        customer_email VARCHAR(255),
        status VARCHAR(50) NOT NULL,
        total_amount DECIMAL(12,2) NOT NULL,
        order_date DATE,
        items JSONB,
        items_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        warehouse_id VARCHAR(100) UNIQUE NOT NULL,
        warehouse_name VARCHAR(255) NOT NULL,
        warehouse_code VARCHAR(50) UNIQUE,
        city VARCHAR(100),
        country VARCHAR(100),
        address TEXT,
        manager_name VARCHAR(200),
        manager_email VARCHAR(255),
        manager_phone VARCHAR(50),
        capacity INT,
        current_utilization INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        audit_id VARCHAR(100) UNIQUE NOT NULL,
        table_name VARCHAR(100),
        record_id VARCHAR(100),
        action VARCHAR(100),
        performed_by VARCHAR(200),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tables created successfully\n');

    // Clear existing data
    console.log('🗑️  Clearing existing dummy data...');
    await client.query('DELETE FROM products WHERE product_id LIKE \'prod-%\'');
    await client.query('DELETE FROM users WHERE user_id LIKE \'user-%\'');
    await client.query('DELETE FROM suppliers WHERE supplier_id LIKE \'sup-%\'');
    await client.query('DELETE FROM orders WHERE order_id LIKE \'ord-%\'');
    await client.query('DELETE FROM warehouses WHERE warehouse_id LIKE \'wh-%\'');
    console.log('✅ Existing data cleared\n');

    // Insert Products
    console.log('📦 Inserting products...');
    for (const product of DUMMY_PRODUCTS) {
      await client.query(`
        INSERT INTO products (
          product_id, sku, barcode, product_name, short_description, brand, category, 
          unit, weight, status, low_stock_threshold, overstock_threshold, dead_stock_days, 
          total_product_limit, prices, inventory, image_url, min_wholesale_qty, max_discount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (product_id) DO NOTHING
      `, [
        product.product_id, product.sku, product.barcode, product.product_name,
        product.short_description, product.brand, product.category, product.unit,
        product.weight, product.status, product.low_stock_threshold, product.overstock_threshold,
        product.dead_stock_days, product.total_product_limit, product.prices, product.inventory,
        product.image_url, product.min_wholesale_qty, product.max_discount
      ]);
    }
    console.log(`✅ Inserted ${DUMMY_PRODUCTS.length} products\n`);

    // Insert Users
    console.log('👥 Inserting users...');
    for (const user of DUMMY_USERS) {
      await client.query(`
        INSERT INTO users (user_id, email, first_name, last_name, role, phone, city, country, company)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id) DO NOTHING
      `, [
        user.user_id, user.email, user.first_name, user.last_name, user.role,
        user.phone, user.city, user.country, user.company || null
      ]);
    }
    console.log(`✅ Inserted ${DUMMY_USERS.length} users\n`);

    // Insert Suppliers
    console.log('🏭 Inserting suppliers...');
    for (const supplier of DUMMY_SUPPLIERS) {
      await client.query(`
        INSERT INTO suppliers (
          supplier_id, company_name, contact_person, email, phone, 
          city, country, reliability_score, lead_time_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (supplier_id) DO NOTHING
      `, [
        supplier.supplier_id, supplier.company_name, supplier.contact_person,
        supplier.email, supplier.phone, supplier.city, supplier.country,
        supplier.reliability_score, supplier.lead_time_days
      ]);
    }
    console.log(`✅ Inserted ${DUMMY_SUPPLIERS.length} suppliers\n`);

    // Insert Orders
    console.log('📋 Inserting orders...');
    for (const order of DUMMY_ORDERS) {
      await client.query(`
        INSERT INTO orders (
          order_id, order_number, order_type, customer_email, status, 
          total_amount, order_date, items, items_summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (order_id) DO NOTHING
      `, [
        order.order_id, order.order_number, order.order_type, order.customer_email,
        order.status, order.total_amount, order.order_date, order.items, order.items_summary
      ]);
    }
    console.log(`✅ Inserted ${DUMMY_ORDERS.length} orders\n`);

    // Insert Warehouses
    console.log('🏢 Inserting warehouses...');
    for (const warehouse of DUMMY_WAREHOUSES) {
      await client.query(`
        INSERT INTO warehouses (
          warehouse_id, warehouse_name, warehouse_code, city, country, address,
          manager_name, manager_email, manager_phone, capacity, current_utilization
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (warehouse_id) DO NOTHING
      `, [
        warehouse.warehouse_id, warehouse.warehouse_name, warehouse.warehouse_code,
        warehouse.city, warehouse.country, warehouse.address, warehouse.manager_name,
        warehouse.manager_email, warehouse.manager_phone, warehouse.capacity,
        warehouse.current_utilization
      ]);
    }
    console.log(`✅ Inserted ${DUMMY_WAREHOUSES.length} warehouses\n`);

    console.log('🎉 Dummy data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Products: ${DUMMY_PRODUCTS.length}`);
    console.log(`   - Users: ${DUMMY_USERS.length}`);
    console.log(`   - Suppliers: ${DUMMY_SUPPLIERS.length}`);
    console.log(`   - Orders: ${DUMMY_ORDERS.length}`);
    console.log(`   - Warehouses: ${DUMMY_WAREHOUSES.length}`);
    console.log('\n✨ Your database is now ready for RAG implementation!\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seeding function
if (require.main === module) {
  seedDummyData()
    .then(() => {
      console.log('✅ Seeding script completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seeding script failed:', err);
      process.exit(1);
    });
}

module.exports = { seedDummyData };
