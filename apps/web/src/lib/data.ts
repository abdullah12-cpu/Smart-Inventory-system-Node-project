// Shared data models and mock data matching the database schema from admin.sql

export type PortalType = 'admin' | 'distributor' | 'buyer';

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CLOSED' | 'CANCELLED';
export type PaymentMethod = 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA' | 'CARD' | 'CASH' | 'CHEQUE';
export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type StockAlertStatus = 'LOW_STOCK' | 'OVERSTOCK' | 'DEAD_STOCK' | 'NORMAL';

export interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  profile_image: string;
  role_name: 'Super Admin' | 'Inventory Manager' | 'Accountant' | 'Analyst' | 'Distributor' | 'Buyer';
  is_active: boolean;
}

export interface Warehouse {
  warehouse_id: string;
  warehouse_name: string;
  city: string;
  country: string;
  manager_name: string;
}

export interface WarehouseInventory {
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number; // qty - reserved
}

export interface Product {
  product_id: string;
  sku: string;
  barcode: string;
  product_name: string;
  short_description: string;
  brand: string;
  category: string;
  unit: string;
  weight: number;
  status: ProductStatus;
  
  // Multi-warehouse inventory
  inventory: WarehouseInventory[];
  
  // Pricing Tiers (price_tiers table: RETAIL, DISTRIBUTOR, VIP, CUSTOM)
  prices: {
    RETAIL: number;
    DISTRIBUTOR: number;
    VIP: number;
    CUSTOM: number;
  };
  
  // Stock alert thresholds
  low_stock_threshold: number;
  overstock_threshold: number;
  dead_stock_days: number;
}

export interface Supplier {
  supplier_id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  reliability_score: number; // 0-100
  lead_time_days: number;
}

export interface Order {
  order_id: string;
  order_number: string;
  order_type: 'B2C' | 'B2B';
  status: OrderStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total_amount: number;
  currency: string; // "PKR"
  order_date: string;
  items_summary: string;
}

export interface Invoice {
  invoice_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total_amount: number;
  amount_paid: number;
  due_date: string;
  late_payment_probability: number; // 0-1 decimal
}

export interface Payment {
  payment_id: string;
  customer_name: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_no: string;
  payment_date: string;
  status: 'RECORDED' | 'RECONCILED' | 'REVERSED';
}

export interface Notification {
  notification_id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  trigger_type: 'LOW_STOCK' | 'OVERSTOCK' | 'PAYMENT_OVERDUE' | 'CREDIT_LIMIT_BREACH';
  is_read: boolean;
  created_at: string;
}

// FORMATTING UTILITIES
export function formatCurrency(amount: number): string {
  return `Rs ${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function computeStockAlertStatus(availableQty: number, low: number, over: number): StockAlertStatus {
  if (availableQty <= low) return 'LOW_STOCK';
  if (availableQty >= over) return 'OVERSTOCK';
  return 'NORMAL';
}

// LOGGED-IN USERS
export const MOCK_USERS: Record<string, User> = {
  admin: {
    user_id: 'u-1',
    first_name: 'Saif',
    last_name: 'Shahzad',
    email: 'saif@commerceiq.com',
    phone: '+92 300 1234567',
    profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop',
    role_name: 'Super Admin',
    is_active: true
  },
  manager: {
    user_id: 'u-2',
    first_name: 'Asim',
    last_name: 'Raza',
    email: 'asim@commerceiq.com',
    phone: '+92 301 7654321',
    profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop',
    role_name: 'Inventory Manager',
    is_active: true
  }
};

// MULTI-WAREHOUSES
export const MOCK_WAREHOUSES: Warehouse[] = [
  { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', city: 'Karachi', country: 'Pakistan', manager_name: 'Asim Raza' },
  { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', city: 'Lahore', country: 'Pakistan', manager_name: 'Imran Khan' },
  { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Capital Hub', city: 'Islamabad', country: 'Pakistan', manager_name: 'Zafar Ali' }
];

// PRODUCTS WITH MULTI-WAREHOUSE INVENTORY & 4 PRICE TIERS
export const INITIAL_PRODUCTS: Product[] = [
  {
    product_id: 'p-1',
    sku: 'CIQ-NET-902',
    barcode: '8806090123456',
    product_name: 'Enterprise Server Switch 48P',
    short_description: 'Managed L3 rackmount switch with 48 gigabit ethernet ports and 4 SFP+ uplinks.',
    brand: 'Cisco Systems',
    category: 'Networking Systems',
    unit: 'Units',
    weight: 4.5,
    status: 'ACTIVE',
    low_stock_threshold: 20,
    overstock_threshold: 120,
    dead_stock_days: 45,
    prices: {
      RETAIL: 245000,
      DISTRIBUTOR: 215000,
      VIP: 195000,
      CUSTOM: 185000
    },
    inventory: [
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', quantity: 45, reserved_quantity: 10, available_quantity: 35 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', quantity: 30, reserved_quantity: 5, available_quantity: 25 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Capital Hub', quantity: 15, reserved_quantity: 0, available_quantity: 15 }
    ]
  },
  {
    product_id: 'p-2',
    sku: 'CIQ-CAB-102',
    barcode: '8806090789123',
    product_name: 'High-Speed Fiber Optic Cable 100m',
    short_description: 'OM4 duplex LC-LC armored multi-mode patch cord for high-density datacenters.',
    brand: 'Corning Inc.',
    category: 'Cabling Infrastructure',
    unit: 'Rolls',
    weight: 2.1,
    status: 'ACTIVE',
    low_stock_threshold: 50,
    overstock_threshold: 400,
    dead_stock_days: 90,
    prices: {
      RETAIL: 4200,
      DISTRIBUTOR: 3600,
      VIP: 3200,
      CUSTOM: 2900
    },
    inventory: [
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', quantity: 150, reserved_quantity: 40, available_quantity: 110 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', quantity: 90, reserved_quantity: 20, available_quantity: 70 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Capital Hub', quantity: 60, reserved_quantity: 10, available_quantity: 50 }
    ]
  },
  {
    product_id: 'p-3',
    sku: 'CIQ-ML-505',
    barcode: '8806090333444',
    product_name: 'AI Edge Jetson Nano Compute Unit',
    short_description: 'Compact AI developer kit for embedded vision, IoT edge inference, and sensor networks.',
    brand: 'NVIDIA Corp',
    category: 'Processors & Modules',
    unit: 'Units',
    weight: 0.8,
    status: 'ACTIVE',
    low_stock_threshold: 15,
    overstock_threshold: 80,
    dead_stock_days: 30,
    prices: {
      RETAIL: 89000,
      DISTRIBUTOR: 79000,
      VIP: 74000,
      CUSTOM: 69000
    },
    inventory: [
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', quantity: 6, reserved_quantity: 2, available_quantity: 4 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', quantity: 8, reserved_quantity: 1, available_quantity: 7 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Capital Hub', quantity: 2, reserved_quantity: 0, available_quantity: 2 }
    ]
  },
  {
    product_id: 'p-4',
    sku: 'CIQ-PWR-401',
    barcode: '8806090555666',
    product_name: 'UPS Smart Backup Battery 10kVA',
    short_description: 'Double-conversion online UPS with expandable runtimes and network card.',
    brand: 'APC Power',
    category: 'Power Systems',
    unit: 'Units',
    weight: 48.0,
    status: 'DISCONTINUED',
    low_stock_threshold: 5,
    overstock_threshold: 25,
    dead_stock_days: 120,
    prices: {
      RETAIL: 580000,
      DISTRIBUTOR: 510000,
      VIP: 480000,
      CUSTOM: 450000
    },
    inventory: [
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', quantity: 0, reserved_quantity: 0, available_quantity: 0 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', quantity: 0, reserved_quantity: 0, available_quantity: 0 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Capital Hub', quantity: 1, reserved_quantity: 1, available_quantity: 0 }
    ]
  },
  {
    product_id: 'p-5',
    sku: 'CIQ-SEC-110',
    barcode: '8806090999888',
    product_name: 'SaaS FortiGate Next-Gen Firewall',
    short_description: 'Unified Threat Management secure firewall gateway for branch office and datacenters.',
    brand: 'Fortinet',
    category: 'Networking Systems',
    unit: 'Units',
    weight: 3.2,
    status: 'ACTIVE',
    low_stock_threshold: 12,
    overstock_threshold: 60,
    dead_stock_days: 60,
    prices: {
      RETAIL: 125000,
      DISTRIBUTOR: 112000,
      VIP: 105000,
      CUSTOM: 99000
    },
    inventory: [
      { warehouse_id: 'wh-1', warehouse_name: 'Karachi Central Depot', quantity: 25, reserved_quantity: 3, available_quantity: 22 },
      { warehouse_id: 'wh-2', warehouse_name: 'Lahore North Terminal', quantity: 12, reserved_quantity: 2, available_quantity: 10 },
      { warehouse_id: 'wh-3', warehouse_name: 'Islamabad Capital Hub', quantity: 8, reserved_quantity: 0, available_quantity: 8 }
    ]
  }
];

// SUPPLIERS
export const MOCK_SUPPLIERS: Supplier[] = [
  { supplier_id: 's-1', company_name: 'Cisco Distribution Pakistan', contact_person: 'Salman Ahmed', email: 'salman@cisco-pk.com', phone: '+92 21 34567890', city: 'Karachi', country: 'Pakistan', reliability_score: 95, lead_time_days: 3 },
  { supplier_id: 's-2', company_name: 'Corning Cable Tech Inc.', contact_person: 'Faisal Mehmood', email: 'faisal@cabletech.com.pk', phone: '+92 42 35789012', city: 'Lahore', country: 'Pakistan', reliability_score: 88, lead_time_days: 5 },
  { supplier_id: 's-3', company_name: 'NVIDIA Advanced Edge Ltd.', contact_person: 'Zahid Hussain', email: 'zahid@nvidia-edge.pk', phone: '+92 51 22890123', city: 'Islamabad', country: 'Pakistan', reliability_score: 74, lead_time_days: 14 }
];

// ORDERS WITH PKR CURRENCY & ENUM STATUSES
export const MOCK_ORDERS: Order[] = [
  {
    order_id: 'o-1',
    order_number: 'ORD-2026-9201',
    order_type: 'B2B',
    status: 'PROCESSING',
    subtotal: 3400000,
    discount_total: 280000,
    tax_total: 561600,
    total_amount: 3681600,
    currency: 'PKR',
    order_date: '2026-07-02T10:00:00Z',
    items_summary: '4x Enterprise Server Switch 48P'
  },
  {
    order_id: 'o-2',
    order_number: 'ORD-2026-8711',
    order_type: 'B2B',
    status: 'SHIPPED',
    subtotal: 1344000,
    discount_total: 156000,
    tax_total: 213840,
    total_amount: 1401840,
    currency: 'PKR',
    order_date: '2026-06-30T14:30:00Z',
    items_summary: '12x SaaS FortiGate Next-Gen Firewall'
  },
  {
    order_id: 'o-3',
    order_number: 'ORD-2026-7622',
    order_type: 'B2C',
    status: 'DELIVERED',
    subtotal: 1160000,
    discount_total: 0,
    tax_total: 208800,
    total_amount: 1368800,
    currency: 'PKR',
    order_date: '2026-06-28T11:15:00Z',
    items_summary: '2x UPS Smart Backup Battery 10kVA'
  }
];

// INVOICES WITH LATE PAYMENT PROBABILITY RISK BADGES
export const MOCK_INVOICES: Invoice[] = [
  { invoice_id: 'inv-1', invoice_number: 'INV-2026-00001', status: 'PARTIALLY_PAID', total_amount: 3681600, amount_paid: 1500000, due_date: '2026-07-15T00:00:00Z', late_payment_probability: 0.18 },
  { invoice_id: 'inv-2', invoice_number: 'INV-2026-00002', status: 'SENT', total_amount: 1401840, amount_paid: 0, due_date: '2026-07-10T00:00:00Z', late_payment_probability: 0.45 },
  { invoice_id: 'inv-3', invoice_number: 'INV-2026-00003', status: 'PAID', total_amount: 1368800, amount_paid: 1368800, due_date: '2026-07-05T00:00:00Z', late_payment_probability: 0.05 },
  { invoice_id: 'inv-4', invoice_number: 'INV-2026-00004', status: 'OVERDUE', total_amount: 980000, amount_paid: 100000, due_date: '2026-06-20T00:00:00Z', late_payment_probability: 0.85 }
];

// PAYMENTS WITH JAZZCASH & EASYPAISA METHOD SUPPORT
export const MOCK_PAYMENTS: Payment[] = [
  { payment_id: 'pay-1', customer_name: 'Karachi Tech Ltd', amount: 1500000, payment_method: 'JAZZCASH', reference_no: 'JC-887192-PK', payment_date: '2026-07-01T11:00:00Z', status: 'RECORDED' },
  { payment_id: 'pay-2', customer_name: 'Lahore Distributing Co', amount: 1368800, payment_method: 'BANK_TRANSFER', reference_no: 'HBL-TXN-299301', payment_date: '2026-06-29T10:00:00Z', status: 'RECONCILED' },
  { payment_id: 'pay-3', customer_name: 'Islamabad Office Solutions', amount: 100000, payment_method: 'EASYPAISA', reference_no: 'EP-445610-TX', payment_date: '2026-06-22T16:20:00Z', status: 'RECORDED' }
];

// NOTIFICATIONS
export const INITIAL_NOTIFICATIONS: Notification[] = [
  { notification_id: 'n-1', title: 'Low Stock Alert', message: 'AI Edge Jetson Nano Compute Unit available quantity is 13 units (below threshold of 15).', severity: 'WARNING', trigger_type: 'LOW_STOCK', is_read: false, created_at: '2026-07-01T13:40:00Z' },
  { notification_id: 'n-2', title: 'Payment Overdue Alert', message: 'Invoice INV-2026-00004 is overdue by 11 days. Customer credit risk limit breach imminent.', severity: 'CRITICAL', trigger_type: 'CREDIT_LIMIT_BREACH', is_read: false, created_at: '2026-07-01T09:10:00Z' },
  { notification_id: 'n-3', title: 'System Capacity Overstock', message: 'High-Speed Fiber Optic Cable 100m quantity at Karachi Depot exceeded overstock buffer.', severity: 'INFO', trigger_type: 'OVERSTOCK', is_read: true, created_at: '2026-06-30T16:00:00Z' }
];

export interface StockMovement {
  movement_id: string;
  product_id: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  movement_type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  notes: string;
  performed_by: string;
  created_at: string;
}

export interface AuditLog {
  audit_id: string;
  table_name: string;
  record_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  performed_by: string;
  notes: string;
  created_at: string;
}

export const MOCK_STOCK_MOVEMENTS: StockMovement[] = [
  {
    movement_id: 'mv-1',
    product_id: 'p-1',
    product_name: 'Enterprise Server Switch 48P',
    warehouse_id: 'wh-1',
    warehouse_name: 'Karachi Central Depot',
    movement_type: 'ADJUSTMENT',
    quantity: 15,
    notes: 'Re-inventoried during weekend warehouse cycle audit.',
    performed_by: 'Asim Raza (Inventory Manager)',
    created_at: '2026-07-01T12:00:00Z'
  },
  {
    movement_id: 'mv-2',
    product_id: 'p-3',
    product_name: 'AI Edge Jetson Nano Compute Unit',
    warehouse_id: 'wh-2',
    warehouse_name: 'Lahore North Terminal',
    movement_type: 'IN',
    quantity: 50,
    notes: 'Inbound consignment cargo shipment cleared customs.',
    performed_by: 'Saif Shahzad (Super Admin)',
    created_at: '2026-07-01T09:30:00Z'
  },
  {
    movement_id: 'mv-3',
    product_id: 'p-2',
    product_name: 'High-Speed Fiber Optic Cable 100m',
    warehouse_id: 'wh-1',
    warehouse_name: 'Karachi Central Depot',
    movement_type: 'OUT',
    quantity: -40,
    notes: 'Allocated to B2B Order ORD-2026-8711.',
    performed_by: 'Saif Shahzad (Super Admin)',
    created_at: '2026-06-30T14:40:00Z'
  }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    audit_id: 'aud-1',
    table_name: 'inventory',
    record_id: 'p-1',
    action: 'UPDATE',
    performed_by: 'Asim Raza (Inventory Manager)',
    notes: 'Manually updated stock quantity at Karachi Central Depot (+15 units)',
    created_at: '2026-07-01T12:00:00Z'
  },
  {
    audit_id: 'aud-2',
    table_name: 'products',
    record_id: 'p-4',
    action: 'UPDATE',
    performed_by: 'Saif Shahzad (Super Admin)',
    notes: 'Updated product status of UPS Smart Backup Battery 10kVA to DISCONTINUED.',
    created_at: '2026-06-29T10:15:00Z'
  }
];

