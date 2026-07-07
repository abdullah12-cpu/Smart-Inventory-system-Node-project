# CommerceIQ — AI-Powered Enterprise E-Commerce & Inventory Intelligence Platform

> **Project Proposal — Internship Capstone**
> **Stack:** Node.js (Express) + React (Vite & Tailwind CSS v4) + PostgreSQL
> **Duration:** 6 Weeks (1.5 Months)
> **Status:** Phase 1 (Core Foundation) Implemented; Phase 2 (Intelligence Layer) Planned

---

## 1. Executive Summary

**CommerceIQ** is an enterprise-grade, AI-augmented e-commerce and inventory management web platform that unifies **Admin**, **Distributor**, and **Buyer** workflows under one unified system. Built on a modernized, lightweight stack featuring **Node.js (Express)**, **React 19 (Vite)**, and **PostgreSQL**, CommerceIQ transitions from conventional reactive inventory applications into an intelligent, data-driven engine.

By leveraging relational database structures, dynamic role routing, transactional audit trails, and client-side notifications, the platform provides real-time transparency and operations automation. Future phases will introduce automated invoice risk prediction, OCR document processing, market-basket analysis, and web price intelligence to complete the self-driving vision of the platform.

---

## 2. Updated Tech Stack

The architecture has been simplified and refactored from a multi-service monorepo into a cohesive, high-performance Node.js and PostgreSQL environment:

### Frontend
*   **Vite + React 19:** Lightning-fast HMR, component isolation, and performant virtual DOM rendering.
*   **Tailwind CSS v4 + @tailwindcss/postcss:** Unified styling utilizing the latest styling engine for premium, responsive layouts.
*   **Lucide React:** Icon set for clean visual cues.
*   **Global Context Store:** Custom provider (`StoreProvider`) coordinating asynchronous database operations, client state, shopping carts, and real-time warnings.

### Backend & API
*   **Node.js + Express:** Asynchronous REST API routing, body parser middlewares, and CORS support.
*   **node-postgres (`pg` client pool):** High-performance pool connections executing raw SQL queries directly on PostgreSQL.

### Database
*   **PostgreSQL:** Relational integrity, JSONB support for nested document fields (e.g., prices and inventory arrays), indices for quick query operations.

---

## 3. Database Schema (As Implemented)

The backend automatically bootstraps and initializes the following PostgreSQL schema on startup:

```
                      ┌───────────────┐
                      │     users     │
                      └───────┬───────┘
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
     ┌───────────────┐                 ┌───────────────┐
     │    orders     │                 │   suppliers   │
     └───────┬───────┘                 └───────────────┘
             │
   ┌─────────┴─────────┐
   ▼                   ▼
┌───────────────┐   ┌───────────────┐
│   invoices    │   │  quotations   │
└───────┬───────┘   └───────────────┘
        │
   ┌────┴────┐
   ▼         ▼
┌────────┐┌────────┐
│payments││audit   │
└────────┘└────────┘
```

### Table Definitions

1.  **`users`**: Manages portal accounts with conditional fields:
    *   `id` (SERIAL PRIMARY KEY)
    *   `email` (VARCHAR UNIQUE)
    *   `password` (VARCHAR)
    *   `role` (admin, distributor, buyer)
    *   *Distributor fields:* `business_name`, `contact_name`, `ntn_code`, `warehouse_region`, `credit_request`
    *   *Buyer fields:* `buyer_store_name`, `buyer_contact_name`, `buyer_phone`, `buyer_address`, `buyer_region`
    *   `created_at` (TIMESTAMP)

2.  **`products`**: Supports flat attributes and nested objects via JSONB for multi-warehouse values:
    *   `id` (SERIAL PRIMARY KEY)
    *   `product_id` (VARCHAR UNIQUE)
    *   `sku` (VARCHAR UNIQUE)
    *   `barcode` (VARCHAR)
    *   `product_name` (VARCHAR)
    *   `short_description` (TEXT)
    *   `brand` / `category` / `unit` / `weight` / `status`
    *   `low_stock_threshold` / `overstock_threshold` / `dead_stock_days`
    *   `prices` (JSONB - stores retail, wholesale, and loyalty prices)
    *   `inventory` (JSONB - stores warehouse-specific quantities and reserved stock)
    *   `created_at` (TIMESTAMP)

3.  **`orders`**: Stores transaction states:
    *   `id` (SERIAL PRIMARY KEY)
    *   `order_id` (VARCHAR UNIQUE)
    *   `order_number` (VARCHAR UNIQUE)
    *   `order_type` (B2C, B2B)
    *   `status` (PENDING, CONFIRMED, SHIPPED, etc.)
    *   `subtotal` / `discount_total` / `tax_total` / `total_amount`
    *   `currency` / `order_date` / `items_summary`
    *   `items` (JSONB)
    *   `customer_email` (VARCHAR)
    *   `created_at` (TIMESTAMP)

4.  **`quotations`**: Handles buyer negotiation proposals:
    *   `id` (SERIAL PRIMARY KEY)
    *   `quotation_id` (VARCHAR UNIQUE)
    *   `quotation_number` (VARCHAR UNIQUE)
    *   `status` (DRAFT, NEGOTIATING, APPROVED)
    *   `total_amount` (NUMERIC)
    *   `valid_until` / `created_at`

5.  **`suppliers`**: Stores vendor contact details and metrics:
    *   `id` (SERIAL PRIMARY KEY)
    *   `supplier_id` (VARCHAR UNIQUE)
    *   `company_name` (VARCHAR)
    *   `contact_person` / `email` / `phone` / `city` / `country`
    *   `reliability_score` / `lead_time_days`

6.  **`invoices`**: Tracks accounts receivables:
    *   `id` (SERIAL PRIMARY KEY)
    *   `invoice_id` (VARCHAR UNIQUE)
    *   `invoice_number` (VARCHAR UNIQUE)
    *   `status` (SENT, PAID, PARTIALLY_PAID)
    *   `total_amount` / `amount_paid` / `due_date`
    *   `late_payment_probability` (NUMERIC)

7.  **`payments`**: Records customer incoming capital:
    *   `id` (SERIAL PRIMARY KEY)
    *   `payment_id` (VARCHAR UNIQUE)
    *   `customer_name` / `amount` / `payment_method` / `reference_no` / `payment_date` / `status`

8.  **`stock_movements`**: Logs incremental item changes for compliance and stock audits:
    *   `id` (SERIAL PRIMARY KEY)
    *   `movement_id` (VARCHAR UNIQUE)
    *   `product_id` / `product_name` / `warehouse_id` / `warehouse_name` / `movement_type` / `quantity` / `notes` / `performed_by` / `created_at`

9.  **`audit_logs`**: Append-only security ledger logging administrative actions:
    *   `id` (SERIAL PRIMARY KEY)
    *   `audit_id` (VARCHAR UNIQUE)
    *   `table_name` / `record_id` / `action` / `performed_by` / `notes` / `created_at`

---

## 4. Current Implementation Status

You have successfully completed **Phase 1 (The Core Foundation)** of the platform. The frontend and backend are fully wired together to interact with your local PostgreSQL database:

### 🟢 Implemented Functionalities (Backend)
1.  **Automatic Database Bootstrapping:** Express initializes all nine relational tables on startup, creates unique keys, and seeds pre-defined logins.
2.  **Role-Based Auth Guard APIs:** `/api/auth/login` checks credentials and matches role contexts (Admin, Distributor, Buyer) against active portals. Dedicated `/api/auth/register-distributor` and `/api/auth/register-buyer` endpoints are implemented.
3.  **SKU master with JSONB support:** Upserting and fetching products with detailed pricing objects and array-based warehouse stocks.
4.  **Automatic Negotiation Triggering:** When a B2C order is posted to `/api/orders`, the API automatically creates a corresponding quotation/negotiation log in `NEGOTIATING` status.
5.  **Payment Allocation Engine:** API to record payments and update invoice metrics (`amount_paid`, updating state to `PAID` or `PARTIALLY_PAID`).
6.  **Comprehensive Auditing & Stock Logs:** Active write endpoints for logging manual adjustments (`/api/stock-movements`) and administrative history (`/api/audit-logs`).

### 🟢 Implemented Functionalities (Frontend)
1.  **Unified Authentication Experience:** The LoginPage allows logins to three different workspaces (`Super Admin`, `Inventory Manager`, `B2B Buyer`) with role mismatch validation alerts.
2.  **Interactive Admin Portal:**
    *   *Dashboard Tab:* Shows product details, filters, safety triggers (low-stock warning banners), and enables manual stock additions/subtractions.
    *   *Suppliers Tab:* Allows onboarding, profiling, editing, and deleting suppliers.
    *   *Orders Tab:* Allows admins to approve orders (confirming state) or ship them (which automatically generates a corresponding customer invoice with a 30-day due date).
    *   *Negotiations Tab:* Views quotations and submits counter-proposals.
    *   *Settings Tab:* Shows system configurations, database alignment alerts, and displays the append-only audit ledger database log.
3.  **Distributor Portal:**
    *   Provides bulk catalog ordering, order lists, smart notifications, invoice ledgers, and billing profile settings.
4.  **Buyer Storefront:**
    *   *Catalog Tab:* Lists items with pricing cards.
    *   *Cart Tab:* Dynamic cart adding, updating quantities, checking against available stock limits, and checkout logic (which reserves stock and records order data to PG).

---

## 5. What You Should Do Next (Recommended Roadmap)

To expand this solid foundation into the fully intelligent application pitched in your vision, you should build the following features:

```mermaid
graph TD
    A[Current Postgres/Express Core] --> B[Step 1: Financial Analytics & Dashboards]
    B --> C[Step 2: Simple AI Integrations (Tensorflow.js / OpenAI APIs)]
    C --> D[Step 3: Web Crawler Scraper Agent]
    D --> E[Step 4: OCR Document Intake]
```

### 🟦 Step 1: Real-Time Analytics & Financial Dashboards
*   **Why:** Currently, your dashboard displays table records, but lack graphical analytics.
*   **What to do:** Integrate a chart library (e.g. **Recharts**) to build visual panels:
    *   *DSO (Days Sales Outstanding)* and Accounts Receivable Aging Buckets (0-30, 30-60, 60-90 days).
    *   *Inventory Turnover Rate* and category-wise sales charts.
    *   *Gross Margin Metrics* showing capital velocity.

### 🟦 Step 2: In-Database AI & Prediction Models
*   **Why:** The database contains fields like `late_payment_probability` in invoices and rules in configurations, but these are currently hardcoded or set to defaults.
*   **What to do:** Integrate lightweight intelligence:
    *   **Option A (Node.js native):** Use packages like `simple-statistics` or `@tensorflow/tfjs` to train a logistic regression model directly in Node.js predicting late payment risk based on customer aging balances.
    *   **Option B (API wrapper):** Wire up an Express route to a LLM API (e.g. OpenAI SDK) to power a Natural Language SQL (NL2SQL) query endpoint or the RAG chatbot query tool over the catalog.

### 🟦 Step 3: Web-Crawled Price Intelligence Scraper
*   **Why:** The procurement value proposition depends on identifying the cheapest market suppliers.
*   **What to do:** Create a backend worker task (using **Puppeteer** or **Axios + Cheerio**):
    *   Periodically scrape competitor catalog listings from local sites (e.g. Daraz/Telemart sitemaps).
    *   Populate a price comparison table in PostgreSQL.
    *   Implement your *Landed Cost Formula* in JavaScript to display the cheapest options in the Admin supplier dashboard.

### 🟦 Step 4: OCR Bill Intake
*   **Why:** Automating product intake from supplier invoices saves significant manual labor.
*   **What to do:**
    *   Integrate a node wrapper (e.g., `tesseract.js`) or use a cloud service (Google Cloud Vision API).
    *   Allow managers to upload invoice PDFs, extract texts, parse line items into JSON objects, and push them directly to products/stock tables.

---

## 6. Milestone Plan (Adjusted 6-Week Execution)

### 🟩 Week 1 & 2: Core Infrastructure (Completed)
*   Express REST APIs setup and PostgreSQL pool configuration.
*   Database initialization and seeding scripts.
*   LoginPage, Admin Dashboard, Buyer Portal, and Distributor Portal templates.
*   Transactional integration (Cart → Order → Invoice → Payment).

### 🟦 Week 3: Dashboard Graphs & Compliance Reports
*   Install Recharts on the frontend.
*   Build aging credit dashboards, cash flow charts, and low stock warnings.
*   Export options (CSV/PDF invoice generators).

### 🟦 Week 4: Procurement Price Scraper & Landed Cost Engine
*   Build a scraping worker in Express parsing price feeds.
*   Write the Landed Cost logic on the backend.
*   Build a comparison layout in the Admin interface to display competitor prices.

### 🟦 Week 5: OCR Document Processing & Simple Predictions
*   Integrate OCR library in the backend to parse invoice files.
*   Implement a risk-analysis module in Express to dynamically compute payment delays using historical invoice data.

### 🟦 Week 6: Polish, Testing & Deployment
*   Polish UI elements (micro-animations, transitions, alerts).
*   Add request logs and transaction locking mechanisms.
*   Deploy backend (e.g., Render/Railway) and frontend (Vite static build) with a live cloud PostgreSQL database.
