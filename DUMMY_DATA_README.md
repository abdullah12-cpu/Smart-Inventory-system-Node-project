# Dummy Data Seeding for RAG Implementation

## Overview
This project now includes comprehensive dummy data across all portions of the e-commerce platform to support RAG (Retrieval Augmented Generation) implementation.

## What's Included

### 📦 Products (15 items)
- **Networking Equipment**: Cisco switches, UniFi systems, TP-Link devices
- **Storage Devices**: WD Enterprise HDDs, Samsung SSDs, QNAP NAS systems
- **Computer Accessories**: Logitech mice, Razer keyboards, Anker chargers
- **Monitors**: Dell UltraSharp, LG OLED gaming monitors
- **Power Backup**: APC and Eaton UPS systems
- **Cables & Connectors**: UGREEN USB4, Belkin CAT8 Ethernet cables

Each product includes:
- Complete specifications (SKU, barcode, brand, category)
- Multi-tier pricing (RETAIL, DISTRIBUTOR, VIP, CUSTOM)
- Inventory across 3 warehouses (Karachi, Lahore, Islamabad)
- Stock levels, weights, images, and wholesale requirements

### 👥 Users (10 users)
- **2 Admin Users**: System administrators
- **3 Distributor Users**: B2B wholesale partners
- **5 Buyer Users**: B2C retail customers

### 🏭 Suppliers (5 suppliers)
- Cisco Systems Pakistan
- Samsung Electronics Pakistan
- Dell Technologies Distribution
- Western Digital Regional Hub
- TP-Link Pakistan Distribution

### 📋 Orders (10 orders)
- **5 B2C Retail Orders**: Individual customer purchases
- **5 B2B Wholesale Orders**: Bulk distributor orders
- Various statuses: DELIVERED, SHIPPED, PROCESSING, CONFIRMED, PENDING

### 🏢 Warehouses (3 locations)
- Karachi Central Depot
- Lahore North Terminal
- Islamabad Tech Hub

## How to Seed the Database

### Step 1: Ensure Database is Running
Make sure your PostgreSQL database is running and accessible.

### Step 2: Run the Seeding Script
```bash
cd apps/api
node seed_dummy_data.js
```

### Step 3: Verify Data
The script will:
1. Create all necessary tables if they don't exist
2. Clear existing dummy data
3. Insert all new dummy data
4. Display a summary of inserted records

## Expected Output
```
🚀 Starting dummy data seeding for RAG implementation...

📋 Creating database tables...
✅ Tables created successfully

🗑️  Clearing existing dummy data...
✅ Existing data cleared

📦 Inserting products...
✅ Inserted 15 products

👥 Inserting users...
✅ Inserted 10 users

🏭 Inserting suppliers...
✅ Inserted 5 suppliers

📋 Inserting orders...
✅ Inserted 10 orders

🏢 Inserting warehouses...
✅ Inserted 3 warehouses

🎉 Dummy data seeding completed successfully!

📊 Summary:
   - Products: 15
   - Users: 10
   - Suppliers: 5
   - Orders: 10
   - Warehouses: 3

✨ Your database is now ready for RAG implementation!
```

## RAG Use Cases

This dummy data enables various RAG scenarios:

### 1. Product Search & Recommendations
- "Find me network switches under Rs 200,000"
- "What's the best SSD for gaming?"
- "Compare Cisco and TP-Link switches"

### 2. Inventory Management
- "Show low stock items in Karachi warehouse"
- "What products are available in Lahore?"
- "Which items need restocking?"

### 3. Order Tracking
- "Show all pending B2B orders"
- "What orders are ready to ship?"
- "Track order ORD-20260115-001"

### 4. Supplier Information
- "Which supplier has the best reliability score?"
- "Show suppliers in Karachi"
- "What's the lead time for Dell products?"

### 5. Business Analytics
- "Show top-selling products"
- "What's the total inventory value?"
- "Which customers have placed the most orders?"

## Database Schema

### Products Table
- `product_id`, `sku`, `barcode`
- `product_name`, `short_description`
- `brand`, `category`
- `prices` (JSONB), `inventory` (JSONB)
- `min_wholesale_qty`, `max_discount`

### Users Table
- `user_id`, `email`, `role`
- `first_name`, `last_name`
- `phone`, `city`, `country`, `company`

### Suppliers Table
- `supplier_id`, `company_name`
- `contact_person`, `email`, `phone`
- `reliability_score`, `lead_time_days`

### Orders Table
- `order_id`, `order_number`, `order_type`
- `customer_email`, `status`
- `total_amount`, `items` (JSONB)

### Warehouses Table
- `warehouse_id`, `warehouse_name`, `warehouse_code`
- `city`, `country`, `address`
- `manager_name`, `capacity`, `current_utilization`

## Notes
- All data is realistic and based on actual product specifications
- Pricing is in Pakistani Rupees (PKR)
- Phone numbers use Pakistan format (+92)
- Inventory is distributed across 3 warehouse locations
- Orders include both B2C and B2B types for comprehensive testing

## Next Steps for RAG Implementation
1. ✅ Database populated with dummy data
2. 📝 Create vector embeddings for products and descriptions
3. 🔍 Implement semantic search capabilities
4. 🤖 Connect to LLM for natural language queries
5. 📊 Build RAG pipeline for intelligent responses
