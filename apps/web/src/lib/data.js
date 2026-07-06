// Shared data models and mock data matching the database schema from admin.sql

// FORMATTING UTILITIES
export function formatCurrency(amount) {
  return `Rs ${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function computeStockAlertStatus(availableQty, low, over) {
  if (availableQty <= low) return "LOW_STOCK";
  if (availableQty >= over) return "OVERSTOCK";
  return "NORMAL";
}

// LOGGED-IN USERS
export const MOCK_USERS = {
  admin: {
    user_id: "u-1",
    first_name: "Saif",
    last_name: "Shahzad",
    email: "saif@commerceiq.com",
    phone: "+92 300 1234567",
    profile_image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop",
    role_name: "Super Admin",
    is_active: true,
  },
  manager: {
    user_id: "u-2",
    first_name: "Asim",
    last_name: "Raza",
    email: "asim@commerceiq.com",
    phone: "+92 301 7654321",
    profile_image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop",
    role_name: "Inventory Manager",
    is_active: true,
  },
};

// MULTI-WAREHOUSES
export const MOCK_WAREHOUSES = [
  {
    warehouse_id: "wh-1",
    warehouse_name: "Karachi Central Depot",
    city: "Karachi",
    country: "Pakistan",
    manager_name: "Asim Raza",
  },
  {
    warehouse_id: "wh-2",
    warehouse_name: "Lahore North Terminal",
    city: "Lahore",
    country: "Pakistan",
    manager_name: "Imran Khan",
  },
  {
    warehouse_id: "wh-3",
    warehouse_name: "Islamabad Capital Hub",
    city: "Islamabad",
    country: "Pakistan",
    manager_name: "Zafar Ali",
  },
];

// PRODUCTS WITH MULTI-WAREHOUSE INVENTORY & 4 PRICE TIERS
export const INITIAL_PRODUCTS = [];

// SUPPLIERS
export const MOCK_SUPPLIERS = [];
export const MOCK_ORDERS = [];
export const MOCK_INVOICES = [];
export const MOCK_PAYMENTS = [];
export const INITIAL_NOTIFICATIONS = [];
export const MOCK_STOCK_MOVEMENTS = [];
export const MOCK_AUDIT_LOGS = [];
