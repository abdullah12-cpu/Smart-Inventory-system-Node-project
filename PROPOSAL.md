# CommerceIQ — AI-Powered Enterprise E-Commerce & Inventory Intelligence Platform

> **Project Proposal — Internship Capstone**
> **Duration:** 6 Weeks (1.5 Months)
> **Team Size:** 2 (1 Full-Stack Developer + 1 ML/AI Engineer)
> **Status:** Awaiting Approval

---

## 1. Executive Summary

**CommerceIQ** is an enterprise-grade, AI-augmented e-commerce and inventory management web platform that unifies **Admin**, **Distributor**, and **Buyer** workflows under one intelligent system. Unlike conventional inventory tools (Zoho Inventory, Odoo, TradeGecko) that operate reactively, CommerceIQ uses **machine learning, large language models (LLMs), retrieval-augmented generation (RAG), OCR, association-rule data mining, live web-crawled procurement intelligence, and AI-driven invoice & receivables management** to make the inventory and the back-office *think for itself* — predicting demand, surfacing trends, anticipating seasonal spikes, sourcing items at the lowest landed cost, auto-restocking, recovering late payments, and answering plain-English business questions in seconds.

The platform's differentiator is its **"Self-Driving Inventory + Self-Collecting Receivables" philosophy**: the system not only records what *has* happened — it forecasts what *will* happen, *why*, *where to buy* the next batch cheapest, *who is likely to pay late*, and *what action* the business should take next to maximize margin.

---

## 2. Problem Statement

Existing inventory and e-commerce management systems suffer from clear gaps:

| Pain Point | Current Reality | Our Solution |
|---|---|---|
| **Reactive stocking** | Owners reorder only after stockouts occur | Predictive ML forecasts 30/60/90 days out |
| **No event awareness** | Systems are blind to Christmas, Eid, Black Friday spikes | Event-aware demand modeling |
| **Complex reporting** | Need SQL/BI expertise to query data | Natural-language → SQL (NL2SQL) engine |
| **Flat pricing** | Same price for retail and bulk buyers | Tiered, dynamic pricing per role |
| **No basket intelligence** | No insight into "products bought together" | Apriori / FP-Growth market-basket mining |
| **Manual data entry** | Invoices, receipts typed in by hand | OCR auto-extraction |
| **Disconnected alerts** | Stockouts noticed too late | Real-time autonomous notification engine |
| **Blind procurement** | Vendor guesses the best supplier price | Live web-crawled price intelligence across local & international sources |
| **Manual invoicing & dunning** | Invoices typed in Word, reminders sent ad-hoc, late payers ignored until cashflow hurts | AI-driven invoicing: late-payer prediction, smart reminders, auto-reconciliation |
| **Knowledge silos** | New staff cannot navigate the system | RAG-powered AI assistant trained on store data |

---

## 3. Vision & Unique Selling Points (Novelty)

CommerceIQ stands apart from the market through **ten novel features** that, to our knowledge, do not exist together in any single mid-market product:

1. **Self-Driving Inventory Engine** — Auto-generates purchase orders when demand probability × current stock falls below a learned threshold.
2. **Natural Language Business Console** — Ask "show me the top 5 products bought together with notebooks last month in Lahore" and get charts + tables instantly. No SQL needed.
3. **Event-Aware Forecasting** — Built-in calendar of cultural & commercial events (Eid, Christmas, Black Friday, Independence Day, exam season, monsoon) with learned demand multipliers per category.
4. **Tri-Role Dynamic Pricing** — Same SKU shows three different prices in real time: retail, distributor (wholesale), VIP/loyalty — with rule-based + ML-tuned margins.
5. **RAG-Powered "Ask My Store" Assistant** — A chatbot that knows *your* inventory, *your* sales, *your* customers, *your* policies. Built on your private store data, not generic GPT answers.
6. **OCR Invoice & Receipt Intake** — Snap a photo of a supplier invoice → products, quantities, prices, dates auto-extracted into the database.
7. **Procurement Intelligence Crawler** — Live web-crawled price comparison across local marketplaces (Daraz, Telemart, PriceOye), international sources (Alibaba, AliExpress), and WhatsApp-driven wholesale price lists — finds the lowest *Total Landed Cost*, not just the lowest sticker price.
8. **Trending Product Radar** — Pulls signals from Google Trends, social commerce APIs, and competitor price feeds to suggest *new SKUs to stock* before competitors catch on.
9. **Autonomous Alert Brain** — Notification rules are not just thresholds; the system learns *which alerts the user actually acts on* and suppresses noisy ones (reinforcement signal).
10. **Invoice Intelligence & Self-Collecting Receivables** — AI-predicted late-payer scoring per invoice, smart per-customer reminder cadence that learns which channel/tone actually works, and auto-reconciliation of bank statements to invoices. Turns invoicing from an admin chore into an active margin-protection engine.

---

## 4. Detailed Feature Catalogue

### 4.1 User Roles & Access Layers

| Role | Capabilities |
|---|---|
| **Super Admin** | Full system control, user management, pricing rule editor, AI model retraining, audit logs |
| **Distributor / Wholesaler** | Bulk ordering portal, wholesale rates, credit terms, bulk invoice download, order tracking, **own ledger & statement view** |
| **Retail Buyer (User)** | Browse catalog, retail prices, cart, checkout, order history, AI product recommendations, **downloadable receipts** |
| **Inventory Manager** *(sub-role)* | Stock-in/stock-out, supplier mgmt, reorder approvals |
| **Accountant** *(sub-role)* | Read+write on invoices, payments, ledgers, tax reports; read-only on inventory |
| **Analyst** *(sub-role)* | Read-only access to dashboards & NL2SQL console |

### 4.2 Core Modules

#### A. Inventory Management
- SKU master with categories, sub-categories, brands, suppliers, units, batches, expiry
- Multi-warehouse / multi-location stock tracking
- Stock movement ledger (in/out/transfer/adjustment/return)
- Barcode & QR code generation + camera-based scanning (mobile)
- Batch & expiry tracking with FIFO/FEFO suggestions
- Low-stock, overstock, dead-stock auto-flagging
- Stock valuation (FIFO / Weighted Average)

#### B. Sales & Order Management
- POS-style quick sale screen
- B2B bulk order flow (distributor side)
- B2C cart & checkout (buyer side)
- Quotation → Sales Order → Invoice → Payment lifecycle
- Returns, refunds, exchanges
- Sales rep / agent tracking

#### C. Invoice Management & Billing

A complete invoicing and accounts-receivable layer — not a bolt-on. Every transaction in the system flows through it.

##### C.1 Invoice Generation & Lifecycle
- Auto-generated from Sales Order; states: **Draft → Issued → Sent → Partially Paid → Paid → Overdue → Closed → Cancelled**
- **Sequential, legally-compliant invoice numbering** with per-fiscal-year reset rules and prefix templates (e.g. `INV-2026-00001`)
- Customizable PDF templates per role: B2C receipt-style, B2B detailed line-item, distributor wholesale tax invoice
- Company branding (logo, colors, footer terms) configurable
- Multi-currency support with snapshot FX rate locked at issue time
- Multi-tax: GST 17%, withholding tax, custom tax codes, exempt categories
- Pakistan-ready: **NTN, STRN, FBR-compliant fields, SRN tracking**
- **QR code on every invoice** — links to a public verification page (anti-fraud) and an "Instant Pay" link
- Digital signature support
- Bulk invoice generation (e.g. monthly recurring for credit-line distributors)
- Credit notes & debit notes (separate sequential numbering)

##### C.2 Customer Billing Profile (Billing Information Master)
- Multiple billing & shipping addresses per customer
- Tax IDs: NTN, CNIC, STRN, VAT, GSTIN
- **Credit limit** + **payment terms** (Net 0 / 15 / 30 / 60 / 90 / custom)
- Default payment method on file
- Preferred currency & invoice language
- Default template per customer
- **Customer Ledger** — running balance, full statement view, downloadable PDF/Excel
- **Outstanding balance** drillable from customer → invoice → line item
- **Aging buckets** dashboard: 0–30 / 31–60 / 61–90 / 90+ days
- Per-customer **discount agreements** and historical override log

##### C.3 Payments & Reconciliation
- Multiple methods per invoice: bank transfer, JazzCash, EasyPaisa, card, cash, cheque
- **Partial payments** — split one invoice across multiple payments
- **Payment allocation** — one inbound payment applied across multiple invoices (FIFO or vendor-chosen order)
- Refunds, credit notes, debit notes — fully audit-logged
- **AI Auto-Reconciliation**: import bank statement (CSV or image → OCR) → ML matches each line to the right invoice with a confidence score → vendor approves only the uncertain matches
- Adjustments: write-offs, rounding, post-issue discounts (audit-logged)

##### C.4 Invoice Intelligence (the differentiation)
- **Late-Payer Predictor** — every invoice gets a *probability-of-late-payment* score at issue time, based on customer history, invoice size, days-to-due, season, and prior excuses. Drives prioritized collection effort.
- **Smart Reminder Cadence** — the notification brain learns *which channel* (email / SMS / WhatsApp) and *which tone* (polite / firm / final) makes each customer actually pay → fully personalized dunning.
- **Invoice Anomaly Detection** — flags invoices that deviate from norms (10× usual basket size, brand-new customer with large credit ask, mismatched line totals) for human review before send.
- **NL2SQL on invoices** — *"Show distributors with > 500K overdue more than 45 days"* → instant table.
- **RAG over billing history** — *"Why did we give Distributor X a 5% extra discount last March?"* → cites the actual invoice and supporting note.

##### C.5 Automation & Workflow
- Auto-send invoice on order completion (configurable per customer)
- Recurring invoices (subscription / standing-order distributors)
- Tiered auto-reminders: gentle (3 days before due) → firm (overdue day 1) → final (overdue day 14) → escalation to sales rep
- Auto-pause new orders when customer hits credit limit (override-able by Admin)
- Auto-generate monthly statements per customer
- Webhook on every state transition (for accounting-system sync)

##### C.6 Tax & Compliance
- Per-product HS codes for customs / cross-border
- Tax reports: GST collected, GST input, net payable
- **FBR-ready exports** for Pakistan
- Reverse-charge handling for export invoices
- Tax-exempt customer flagging
- Withholding-tax certificate tracking

##### C.7 Search, Audit & Export
- Full-text + filter search across all invoices (status, date range, customer, amount, overdue-only)
- Every invoice action audit-logged (created / edited / cancelled / refunded / by whom / when / diff)
- Bulk export: Excel / CSV / PDF zip
- Accountant view: scoped to billing + ledger only

#### D. Tiered Pricing Engine
- Price tiers: Retail, Distributor, VIP, Custom (per customer)
- Quantity-break pricing ("buy 100+ get $1 off each")
- Promotional pricing with start/end windows
- Dynamic pricing suggestions from ML (margin optimizer)
- Currency support (PKR, USD)

#### E. Predictive Inventory & Demand Forecasting
- Time-series forecasting per SKU using **Prophet / SARIMA / LSTM**
- 7-day, 30-day, 90-day horizons
- Confidence intervals, not just point forecasts
- Reorder-point calculator: ROP = (avg daily sales × lead time) + safety stock
- Slow-mover detection & clearance-sale suggestion

#### F. Event-Aware Demand Modeling
- Built-in event calendar (configurable)
- Per-category event multipliers learned from historical lift
- Example: "Last 2 years, sweets category sold 3.4× during Eid" → auto-suggest stockup 2 weeks prior
- Custom event creation (local festivals, school exam dates)

#### G. Market Basket Analysis (Data Mining)
- **Apriori** and **FP-Growth** algorithms
- Surfaces frequent itemsets, association rules with support / confidence / lift
- Drives:
  - Cross-sell recommendations ("frequently bought together")
  - Combo bundle suggestions
  - Store-layout / shelf-placement advice (offline retail clients)

#### H. Natural Language SQL Console (NL2SQL)
- User types: *"Top 10 distributors by revenue this quarter"*
- LLM (Claude/GPT-4) generates safe, parameterized SQL
- SQL runs against a read-replica with row-level security
- Results render as table + auto-suggested chart
- Query history, saved queries, share-as-link
- Pre-built example library for invoices/inventory/sales

#### I. RAG-Powered AI Assistant ("Ask My Store")
- Vector embeddings of: product catalog, sales history, customer notes, supplier docs, **invoices and credit notes**, store policies
- Vector DB: **pgvector** (Postgres extension) or Pinecone
- Retrieves top-k relevant chunks → LLM composes grounded answer with citations
- Example: *"Which supplier gave us the best price on cooking oil last 6 months?"* → cites actual invoices

#### J. OCR Document Intake
- Upload photo/PDF of supplier invoice, receipt, packing slip, **bank statement**
- **Tesseract / Google Cloud Vision / AWS Textract** extracts text
- LLM post-processing structures it into JSON (product, qty, unit price, total / payee, amount, ref no)
- One-click commit to inventory or to reconciliation queue after human review

#### K. Trending Product Radar
- Pulls signals from:
  - **Google Trends API** for category interest
  - Pakistan-relevant marketplaces (Daraz, OLX) — public listing scraping
  - Internal "search-but-no-result" logs
- Weekly recommendation: "Consider adding *X* — search volume up 142% this month"

#### L. Smart Notification & Automation Brain
- Trigger types: low stock, overstock, expiring batch, demand spike, price-change anomaly, abandoned cart, **payment overdue, credit-limit breach, late-payer score crossed**, price-drop detected on a tracked source
- Channels: in-app, email (SendGrid), SMS (Twilio), WhatsApp (Business API), push (Web Push API)
- **Learning layer**: tracks which alerts users acted on vs dismissed → adjusts threshold sensitivity
- Quiet hours, escalation chains (Manager → Owner if ignored 4h)

#### M. Analytics & Dashboards
- Role-specific dashboards
- KPIs: GMV, AOV, sell-through rate, inventory turnover, gross margin, stockout %, fill rate, **DSO (Days Sales Outstanding), Aging %, Collection Rate**
- Heatmaps: hour-of-day × day-of-week sales
- Customer cohort retention curves
- Geo-map of sales (Pakistan-focused, drillable by city)
- Exportable PDF / Excel reports

#### N. Supplier & Procurement Management
- Supplier master with reliability score (on-time delivery, defect rate)
- Auto-generated purchase orders from reorder triggers
- Supplier comparison: same SKU across multiple suppliers, recommends cheapest reliable one
- Payment terms tracking, **accounts-payable aging report**

#### O. Customer Intelligence
- RFM segmentation (Recency, Frequency, Monetary)
- Churn-risk prediction (logistic regression / XGBoost)
- Lifetime value (LTV) estimation
- Personalized product recommendations (collaborative filtering)
- **Payment behavior profile** — feeds the Late-Payer Predictor

#### P. Procurement Intelligence Crawler (Web Price Intelligence)

The vendor's biggest hidden margin leak is **not knowing where to buy cheapest right now**. This module solves that by combining APIs, scraping, and offline-source ingestion into a single ranked recommendation.

##### P.1 Source Strategy (tiered priority)

| Tier | Source Type | Access Method | Why |
|---|---|---|---|
| **1 — Official APIs** | Daraz Open Platform, AliExpress Dropshipping API, Amazon SP-API, Alibaba RapidAPI | Direct API key | Legal, stable, structured. Always tried first. |
| **2 — Sitemap + RSS** | Symbios, Telemart, PriceOye, MegaPK | Parse `sitemap.xml` for product URLs | Polite, fast, no JS rendering needed |
| **3 — HTML scraping** | OLX, niche B2B portals | Scrapy + rotating proxies | When no API/sitemap exists |
| **4 — Headless browser** | SPAs and JS-loaded prices | Playwright cluster | Last resort — expensive but necessary for some sites |
| **5 — Manual + WhatsApp** | Wholesale markets (Akbari Mandi, Hall Road) | Vendor uploads supplier price-lists; OCR + LLM parse | Captures *offline* pricing no scraper can reach — **the local-market novelty** |

Tier 5 is the differentiator: most Pakistani wholesale prices are still WhatsApp-based. No global competitor has this data — we do, via OCR.

##### P.2 Product Identity Matching Pipeline

The hardest problem: "iPhone 15 Pro 256GB Natural Titanium" on Site A is not a string-match for "Apple iPhone 15 Pro Max 256GB" on Site B. Our pipeline:

```
[scraped listing]
    │
    ├─▶ Step 1: Hard match (GTIN / EAN / UPC / MPN if present)  ─── 95% confidence
    │
    ├─▶ Step 2: Brand + Model regex extraction                  ─── 70% confidence
    │
    ├─▶ Step 3: Text embedding (BGE / multilingual-E5) → cosine sim → top-5 candidates
    │
    ├─▶ Step 4: Image embedding (CLIP) → visual sim → disambiguates color / variant
    │
    ├─▶ Step 5: LLM verifier (cheap model)
    │         "Are these two listings the same exact SKU? Answer YES/NO + reason."
    │
    └─▶ Step 6: Human-in-the-loop for low-confidence matches (Admin reviews)
```

Verified matches are cached. The match graph compounds — every confirmed pair makes the next match cheaper. Over time, this becomes the moat.

##### P.3 Total Landed Cost Formula

Comparing sticker price is wrong. The actual decision metric:

```
Total Landed Cost (PKR)
  = (unit_price × fx_rate)
  + shipping_cost
  + customs_duty                            (HS-code based; auto-lookup table)
  + sales_tax / GST                         (17% Pakistan default, overridable)
  + payment_gateway_fee                     (2–4% for international cards)
  + (expected_defect_rate × unit_price)     ← risk-adjusted
  + (lead_time_days × daily_carrying_cost)  ← time-money tradeoff
```

Example: Alibaba lists at $5; Daraz at PKR 1,800.
- Alibaba landed = ($5 × 280) + shipping + duty + tax + defect risk ≈ **PKR 1,920**
- Daraz landed = **PKR 1,800** + 0 shipping

Daraz wins despite Alibaba *looking* cheaper. **This is the feature vendors will pay for.**

##### P.4 Decision Engine — What the Vendor Actually Sees

Cheapest isn't always best. The recommender ranks each source by:

```
Score = w1 × (1 / landed_cost_normalized)
      + w2 × supplier_reliability_score
      + w3 × (1 / lead_time_days)
      − w4 × stockout_risk_if_we_wait
      − w5 × historical_defect_rate
```

The UI shows **three ranked options**: *Cheapest / Fastest / Best Overall*, each with the math shown — no black box. The vendor accepts → auto-PO is drafted.

##### P.5 Crawler Economics (How We Keep It Affordable)

- **Tiered refresh**: high-velocity SKUs every 6h; mid-tier daily; long-tail weekly. Saves ~80% versus uniform schedules.
- **Conditional GETs** (`If-Modified-Since` / `ETag`) — skip downloads when content is unchanged.
- **Hash-diff parsing** — store the page hash; if unchanged, skip parsing.
- **Sitemap-first** — far cheaper than crawling category pages.
- **Polite backoff** on 429/503 — avoids IP bans.
- **Residential proxies only on Tier-4 sites**; datacenter proxies elsewhere.

##### P.6 Price-Drop Prediction

Stored price history (TimescaleDB hypertable) lets the system identify recurring patterns: *"This SKU has dropped 8% on average every 3rd week of the month — wait 4 days."* Surfaced as a procurement alert.

##### P.7 Legal & Ethical Guardrails

| Concern | Our Policy |
|---|---|
| `robots.txt` | Strict default = obey |
| ToS prohibitions | Per-source allowlist; API-first wherever possible |
| Rate limits | Max 1 req/sec/domain unless API permits more |
| Personal data | Never scrape user reviews containing PII |
| Copyright | Store only structured fields; thumbnails under fair-use |

This is what gets the project signed off by compliance.

#### Q. Security & Compliance
- Role-based access control (RBAC)
- Row-level security for multi-tenant data
- Audit log (every CRUD + every AI query + every crawl event + every invoice action)
- 2FA for Admin/Distributor/Accountant accounts
- Encrypted at rest (DB) and in transit (HTTPS/TLS)
- GDPR-style data export / delete-my-data
- Invoice-PDF tamper protection (hash + optional digital signature)

---

## 5. Margin Maximization Strategy — How CommerceIQ Earns Its Keep

The single most important question for the vendor: *will this software make me more money than it costs?* Below is the explicit mapping from feature → margin lever, organized by the margin equation:

> `Margin = Revenue − COGS − Opex − Shrinkage − Capital Cost`

### 5.1 Revenue-Side Levers (sell more, at better prices)

| Feature | Margin Lever | Realistic Uplift\* |
|---|---|---|
| **Demand forecast + auto-reorder** | Cuts stockouts → captures sales lost to empty shelves | **+3–8% revenue** |
| **Event-aware stocking** (Eid/Christmas/exam-season) | Vendor stocks 2–3 weeks *before* competitors → holds premium price during peak | **+5–12% peak-season revenue** |
| **Market basket cross-sell** (Apriori/FP-Growth) | Frequently-bought-together suggestions raise basket size; combo bundles attach slow movers to fast ones | **+10–15% Average Order Value** |
| **Tiered + quantity-break pricing** | Captures distributor volume without leaking retail margin | **+2–4% blended margin** |
| **Dynamic pricing suggestions** | ML finds SKUs the vendor was under-pricing within elasticity bands | **+1–3% gross margin** |
| **Trending Product Radar** | Stock high-search-volume SKUs early → near-zero competition → premium pricing | New revenue stream |
| **Personalized recommendations on storefront** | Lifts conversion + repeat purchase | **+5–10% conversion** |

### 5.2 COGS-Side Levers (buy smarter — powered by the Procurement Crawler)

| Feature | Margin Lever |
|---|---|
| **Web-crawled price intelligence (Total Landed Cost)** | Vendor sees real cheapest source across local + international → **2–5% COGS reduction** typical |
| **Supplier reliability scoring + comparison** | Cheapest *after* defect rate + lateness — avoids "fake cheap" suppliers |
| **Auto-PO timing aligned to demand forecast** | Buys in bulk when truly needed; avoids panic-buying at marked-up rates |
| **Quantity-break logic on the buy side** | System recommends pushing PO qty across a supplier discount threshold → free 3–7% discount |
| **OCR invoice intake** | Catches supplier overcharge / mismatched line items instantly → recovers leaked margin |
| **Price-drop prediction** | Tells vendor *when to wait* instead of buying at the wrong time |

### 5.3 Shrinkage / Waste Reduction

| Feature | Margin Lever |
|---|---|
| **Batch + expiry tracking with FEFO** | Eliminates dead-stock write-offs — saves 1–3% of inventory value annually |
| **Slow-mover detection + clearance suggestions** | Frees capital before product is worthless; clear at partial margin instead of full loss |
| **Audit logs on every stock movement** | Internal shrinkage (theft, mis-entry) becomes traceable — typical retail shrink is ~1.4% of sales; cutting half = **+0.7% margin** |
| **Invoice anomaly detection** | Catches mispriced or fraudulent outgoing invoices before send — protects against accidental revenue leak |

### 5.4 Opex / Labor Reduction

| Feature | Margin Lever |
|---|---|
| **NL2SQL console** | Replaces analyst time — owner asks questions instead of paying for reports |
| **OCR invoice intake** | Removes 10–30 min/day of manual data entry per warehouse staff |
| **RAG assistant** | Cuts new-staff training time dramatically |
| **Smart notifications (learning, not noisy)** | Manager attention is the scarcest resource — focused only on alerts that matter |
| **Auto-invoicing + recurring invoices + auto-reminders** | Eliminates 1–2 hours/day of manual invoicing & dunning labor for SMB owners |
| **AI Auto-Reconciliation** | A task that takes an accountant a full day per month is reduced to a 30-minute review |

### 5.5 Capital Velocity (the hidden lever)

This is the one most vendors don't track but matters most:

- **Inventory turnover** rises when forecasting is accurate → the same capital does **8 cycles/year instead of 5** → **60% more gross profit on the same working capital**.
- **Working capital freed** from overstock can be redeployed into trending SKUs or marketing.
- **DSO (Days Sales Outstanding) reduction** — the **Late-Payer Predictor + Smart Reminder Cadence** typically cuts DSO by **5–10 days** for SMB distributors. Each day shaved off DSO is a permanent boost to working capital.
- **Credit-limit auto-enforcement** prevents bad-debt accumulation that silently kills cashflow.

### 5.6 What We Must Build to Make This Real (Not Slideware)

1. **Telemetry everywhere** — every stock movement, every price change, every promo, every alert acted-on, every invoice state change. Without telemetry the ML degrades.
2. **Counterfactuals in the dashboard** — not just "you sold X," but *"you sold X; without our forecast you would have stocked-out on day 12 and lost ~Y units. The Late-Payer Predictor accelerated PKR Z worth of payments by N days."* Vendors *feel* value when they see avoided loss.
3. **A/B test the recommendations** — every bundle suggestion, every reorder, every dynamic-price tip, every reminder cadence variant has an "ignore" button → we learn which advice is right and improve it.
4. **1-click approvals, not auto-applied changes** — vendors won't trust auto-pricing on day 1; they will accept *"5 SKUs you should raise price on"* every morning. Same for invoice reminders — vendor approves the queue, system sends.
5. **"Margin Saved This Month" + "Cash Collected Faster This Month" as headline KPIs** on the Admin home screen — the first thing the vendor sees. That is what gets us renewed.

\* *Uplift ranges based on published benchmarks from retail-analytics literature (Gartner, McKinsey, Shopify reports); actual results depend on vendor baseline.*

---

## 6. System Architecture

### 6.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (Browsers / Mobile)            │
│   Admin Portal  │  Distributor Portal  │  Buyer Storefront      │
└────────────┬────────────────┬─────────────────┬─────────────────┘
             │                │                 │
             └────────────────┴─────────────────┘
                              │ HTTPS
                ┌─────────────▼─────────────┐
                │   Next.js 14 (App Router) │
                │   Server Components +     │
                │   API Routes (BFF)        │
                └─────────────┬─────────────┘
                              │
        ┌─────────────────────┼─────────────────────────────┐
        │                     │                             │
┌───────▼────────┐  ┌─────────▼──────────┐  ┌───────────────▼────────┐
│  Core Service  │  │   ML / AI Service  │  │  Notification Service  │
│  (Node/Express │  │   (FastAPI/Python) │  │  (Node Worker + Queue) │
│   or NestJS)   │  │                    │  │                        │
│ Auth, CRUD,    │  │ Forecasting,       │  │ Email/SMS/WhatsApp/    │
│ Orders,        │  │ NL2SQL, RAG, OCR,  │  │ Push, scheduler,       │
│ Invoices,      │  │ Market Basket,     │  │ smart reminder cadence │
│ Payments,      │  │ Procurement Crawler│  │                        │
│ RBAC           │  │ Late-Payer model   │  │                        │
│                │  │ Auto-Reconciliation│  │                        │
└───────┬────────┘  └────────┬───────────┘  └────────────┬───────────┘
        │                    │                            │
        └────────────────────┼────────────────────────────┘
                             │
            ┌────────────────┼──────────────────────────┐
            │                │                          │
   ┌────────▼─────────┐  ┌──▼────────────┐   ┌──────────▼─────────┐
   │ PostgreSQL 16    │  │  Redis        │   │  Vector DB         │
   │ (+ TimescaleDB)  │  │  (cache,      │   │  (pgvector or      │
   │ + pgvector       │  │   sessions,   │   │   Pinecone) for    │
   │ Primary OLTP     │  │   queues)     │   │   RAG embeddings   │
   └──────────────────┘  └───────────────┘   └────────────────────┘
                             │
                  ┌──────────▼──────────────┐
                  │ Object Storage (S3 /    │
                  │ Supabase Storage)       │
                  │ Images, invoices, PDFs, │
                  │ bank statements         │
                  └─────────────────────────┘
```

### 6.2 Procurement Crawler Sub-Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                       SCHEDULER (BullMQ cron)                       │
│  High-velocity SKUs: every 6h │ Medium: daily │ Long-tail: weekly  │
└────────────────┬────────────────────────────────────┬──────────────┘
                 │                                    │
        ┌────────▼────────┐                  ┌────────▼────────┐
        │  Scrapy workers │                  │   Playwright    │
        │  (HTML / API)   │                  │   pool (SPA)    │
        └────────┬────────┘                  └────────┬────────┘
                 │                                    │
                 └────────────┬───────────────────────┘
                              │
                ┌─────────────▼─────────────┐
                │  Proxy rotation layer     │
                │  + Cloudflare-bypass      │
                │  + User-Agent pool        │
                └─────────────┬─────────────┘
                              │
                ┌─────────────▼──────────────┐
                │  Normalizer & deduper      │
                │  (currency, units, title)  │
                └─────────────┬──────────────┘
                              │
                ┌─────────────▼──────────────┐
                │  Identity matcher          │
                │  (embeddings + LLM verify) │
                └─────────────┬──────────────┘
                              │
                ┌─────────────▼──────────────┐
                │  TimescaleDB price_history │
                │  hypertable                │
                └─────────────┬──────────────┘
                              │
                ┌─────────────▼──────────────┐
                │  Decision engine →         │
                │  Ranked sources, Auto-PO   │
                │  Price-drop alerts         │
                └────────────────────────────┘
```

### 6.3 Service Responsibilities

- **Next.js BFF**: SSR/SSG pages, API routes for fast CRUD, talks to backend services.
- **Core Service**: business logic, transactional integrity, **invoice & ledger atomicity**, RBAC.
- **ML/AI Service** (Python FastAPI): forecasting, NL2SQL, RAG, OCR, market basket, procurement crawler & matching pipeline, **late-payer prediction**, **bank-statement auto-reconciliation**. Isolated so heavy ML never blocks the user request path.
- **Notification Worker**: consumes a Redis/BullMQ queue, dispatches multi-channel alerts and smart reminder cadences.

---

## 7. Recommended Tech Stack

### 7.1 Frontend
- **Framework**: Next.js 14 (App Router, React Server Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui component library
- **State**: TanStack Query (React Query) + Zustand for client state
- **Charts**: Recharts + Tremor (for dashboards)
- **Forms**: React Hook Form + Zod validation
- **Tables**: TanStack Table (sorting, filtering, virtualization)
- **PDF generation**: `@react-pdf/renderer` *or* server-side Puppeteer (for invoice templates)
- **Animations**: Framer Motion
- **PWA**: Service worker for offline POS mode + Web Push notifications

### 7.2 Backend — Core API
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS *(or)* Express + TypeScript
- **ORM**: Prisma (type-safe, migration-friendly)
- **Validation**: Zod / class-validator
- **Auth**: NextAuth.js v5 *or* custom JWT + refresh tokens

### 7.3 Backend — AI / ML Microservice
- **Runtime**: Python 3.11
- **Framework**: FastAPI
- **ML**: scikit-learn, XGBoost, Prophet, statsmodels
- **NLP / LLM orchestration**: LangChain *or* LlamaIndex
- **LLM provider**: Anthropic Claude (Sonnet 4.6) for NL2SQL & RAG (primary), with OpenAI fallback
- **Embeddings**: `text-embedding-3-small` *or* open-source `bge-small-en`
- **Image embeddings**: CLIP (for product visual matching)
- **OCR**: Tesseract + Google Cloud Vision fallback
- **Market Basket**: `mlxtend` (Apriori, FP-Growth)
- **Crawling**: Scrapy (HTML/API) + Playwright (SPA) + Crawlee for orchestration

### 7.4 Database & Storage
- **Primary OLTP**: PostgreSQL 16
- **Extensions**: TimescaleDB (sales + price-history time-series), pgvector (RAG embeddings), PostGIS (geo)
- **Cache & Queue**: Redis 7 + BullMQ
- **Object Storage**: AWS S3 / Supabase Storage / Cloudflare R2 (for invoice PDFs, bank statements, supplier docs)
- **Search**: Postgres full-text search (Phase 1) → Meilisearch / Typesense (Phase 2)

### 7.5 DevOps & Tooling
- **Orchestration**: Coolify / Railway / Render
- **Frontend hosting**: Vercel
- **CI/CD**: GitHub Actions (lint, test, build, deploy)
- **Monitoring**: Sentry (errors), PostHog (product analytics)
- **Logging**: Pino + Better Stack / Logtail

### 7.6 Notifications & Integrations
- **Email**: Resend / SendGrid
- **SMS**: Twilio / Vonage
- **WhatsApp**: Meta WhatsApp Business Cloud API
- **Web Push**: VAPID + Service Workers
- **Payments** *(future-ready)*: Stripe (international), JazzCash / EasyPaisa / Razorpay (regional)

### 7.7 Testing
- **Unit**: Vitest (frontend) / Jest (backend) / pytest (ML service)
- **E2E**: Playwright
- **API**: Supertest / Postman / Bruno
- **Load**: k6

---

## 8. Database Schema (High-Level)

```
users (id, role, name, email, password_hash, tier, created_at)
   └─< orders, audit_logs, customer_profile

products (id, sku, name, category_id, brand, unit, base_cost)
   ├─< inventory_batches (batch_no, expiry, qty, location_id)
   ├─< prices (tier, price, currency, valid_from, valid_to)
   ├─< sales_line_items
   └─< embeddings (pgvector)

categories (id, name, parent_id, event_multipliers JSON)

suppliers (id, name, contact, reliability_score, lead_time_days)
   └─< purchase_orders

orders (id, user_id, type [B2B|B2C], status, total, created_at)
   └─< sales_line_items (product_id, qty, unit_price, discount)

inventory_movements (id, product_id, batch_id, qty_delta, reason, ts)

forecasts (product_id, horizon_days, predicted_qty, lower_ci, upper_ci, ts)

basket_rules (antecedent[], consequent[], support, confidence, lift)

notifications (id, user_id, type, channel, payload, sent_at, acted_on)

audit_logs (id, user_id, action, table, row_id, diff JSON, ts)

ai_queries (id, user_id, nl_query, generated_sql, result_meta, ts)

events (id, name, date, category_lifts JSON, region)

-- Invoice & Billing tables
customer_billing_profiles (customer_id PK, ntn, cnic, strn, tax_country,
                           credit_limit, payment_terms_days, preferred_currency,
                           default_template_id, billing_addresses JSON[],
                           shipping_addresses JSON[], created_at, updated_at)

invoices (id, invoice_number UNIQUE, order_id, customer_id, status
          [draft|issued|sent|partial|paid|overdue|closed|cancelled],
          subtotal, tax_total, discount_total, total, currency, fx_rate,
          issued_at, due_at, paid_at, template_id, pdf_url,
          late_payer_score, anomaly_score, created_by, fiscal_year)
   └─< invoice_line_items (id, invoice_id, product_id, description,
                           qty, unit_price, tax_rate, discount, line_total)

credit_notes (id, credit_note_number UNIQUE, original_invoice_id,
              customer_id, amount, reason, issued_at, issued_by)

debit_notes  (id, debit_note_number UNIQUE, original_invoice_id,
              customer_id, amount, reason, issued_at, issued_by)

payments (id, customer_id, amount, currency, method
          [bank|jazzcash|easypaisa|card|cash|cheque],
          ref_number, received_at, reconciliation_status
          [unmatched|auto_matched|user_confirmed|disputed],
          recon_confidence, source [manual|bank_csv|ocr])
   └─< payment_allocations (id, payment_id, invoice_id, amount_applied)

tax_rates (id, name, rate_pct, jurisdiction, applies_to_category_ids[])

invoice_reminders (id, invoice_id, channel [email|sms|whatsapp],
                   tone [polite|firm|final], sent_at, status,
                   customer_response, payment_resulted bool)

customer_ledger_view (customer_id, ts, ref_type [invoice|payment|credit|debit],
                      ref_id, debit, credit, running_balance)

-- Procurement intelligence tables
external_sources (id, name, type [API|HTML|SPA|MANUAL], base_url, auth_meta)

external_listings (id, source_id, external_sku_id, title, url, image_url,
                   raw_price, currency, last_seen_ts)

sku_match_map (internal_sku_id, external_listing_id, confidence,
               verified_by_user_id, verified_at)

price_history (TimescaleDB hypertable:
               external_listing_id, ts, unit_price, shipping, landed_cost_pkr)

procurement_recommendations (product_id, source_id, ranked_position,
                             score, score_breakdown JSON, generated_at)
```

---

## 9. Six-Week Milestone Plan (Two-Person Team)

> **Team:** 1 × Full-Stack Developer (`FS`) | 1 × ML/AI Engineer (`ML`)
> **Cadence:** Weekly demo every Friday; daily 15-min sync.

### 🟦 WEEK 1 — Foundation

**Theme:** Skeleton on rails. Both engineers can develop independently by end of week.

| Role | Tasks |
|---|---|
| **FS** | Repo setup (Turborepo monorepo), GitHub Actions CI; final DB schema + Prisma migrations + seed data (incl. invoice + billing tables); Auth (JWT + RBAC) + 3-portal routing; Product / Category / Supplier CRUD (Admin) |
| **ML** | FastAPI microservice scaffolding; configure pgvector & TimescaleDB extensions; embed-model selection (BGE / OpenAI); synthetic-data generator for forecasting/basket training; notebook + experiment-tracking setup |

**Joint:** Lock the API contract between Core and ML services (OpenAPI schema).

**Week 1 Demo:** Admin logs in, manages catalog & stock. ML service health-check returns model info.

---

### 🟦 WEEK 2 — Inventory & Commerce Foundation

| Role | Tasks |
|---|---|
| **FS** | Inventory module (stock in/out/transfer, multi-warehouse, batches, expiry); Supplier UI; Tiered Pricing Engine UI; Quantity-break pricing logic; Barcode generation; **Customer billing-profile UI** (tax IDs, credit limit, payment terms) |
| **ML** | Demand-forecasting MVP (Prophet) — daily nightly job for top-100 SKUs; Reorder-point calculator API; Begin NL2SQL safe-execution layer (read-replica role, schema introspection, query whitelist) |

**Week 2 Demo:** Inventory + tiered pricing working end-to-end; ML returns first 30-day forecasts; customer billing profiles editable.

---

### 🟦 WEEK 3 — Orders, Pricing & Invoice Engine

| Role | Tasks |
|---|---|
| **FS** | B2C cart + checkout; B2B bulk order portal (Distributor); **Invoice generation pipeline** — templates (B2C / B2B / wholesale), sequential numbering, multi-currency, multi-tax, PDF rendering, QR code w/ verify-link; POS quick-sale screen; Returns / refunds module; **Credit-note & debit-note flow** |
| **ML** | NL2SQL polish (auto chart selection, query history, share-as-link, **example library for invoices**); Market Basket Analysis (Apriori + FP-Growth on order history) → API + persisted `basket_rules`; Begin RAG: embed catalog + sales + invoice corpus into pgvector |

**Week 3 Demo:** End-to-end order lifecycle (B2B + B2C) with auto-generated invoice PDF + QR code; first "frequently bought together" rules in UI; NL2SQL answers an invoice-related question with a chart.

---

### 🟦 WEEK 4 — Intelligence Layer + Receivables

**Theme:** The system starts thinking.

| Role | Tasks |
|---|---|
| **FS** | UI for forecast / reorder / basket suggestions; pricing-optimization suggestion UI; **Margin Impact Dashboard** (lift attributed to each recommendation); **Customer Ledger + Aging Dashboard** (0-30 / 31-60 / 61-90 / 90+); **Payment recording UI** with partial-pay + allocation; RAG chat UI wired to ML endpoint |
| **ML** | RAG assistant complete (grounded answers w/ citations across catalog, sales, **invoices**); Event-aware demand multipliers (Eid, Christmas, exam season, monsoon — learned from historical lift); OCR invoice intake (Tesseract + LLM JSON post-processing); **Late-Payer Predictor v1** (XGBoost on customer history → probability score per invoice); foundation of identity-matching pipeline (text embeddings + LLM verifier) |

**Week 4 Demo:** Owner asks chat *"what should I restock next week, and who's about to pay late?"* → grounded answer + forecast + late-payer list. OCR demo: photo of supplier invoice → inventory rows committed.

---

### 🟦 WEEK 5 — Procurement Intelligence, Auto-Reconciliation & Automation

**Theme:** Crawler online + receivables intelligence + alerts wired.

| Role | Tasks |
|---|---|
| **FS** | Notification engine (BullMQ worker, email + SMS + WhatsApp + push); Notification rules UI + learning-suppression toggle; **Smart Reminder Cadence UI** (per-customer rules, A/B-able templates); **Recurring invoices** + auto-send on order completion; **Procurement Intelligence UI** — ranked sources table (Cheapest / Fastest / Best Overall), score breakdown, 1-click auto-PO draft; Trending Product Radar UI |
| **ML** | **Procurement Crawler** — Daraz API + Alibaba API + sitemap-based scrapers for 2 PK marketplaces; Landed-cost calculator (FX + shipping + duty + tax + defect-risk); Identity matching across sources; Decision-engine ranking; Trending Radar; **AI Auto-Reconciliation pipeline** — ingest bank CSV / OCR-scan → match each line to invoice with confidence → review queue API; **Invoice Anomaly Detection** model; Customer churn prediction (XGBoost) + RFM segmentation |

**Week 5 Demo:** Vendor adds an SKU → system fetches live prices, computes landed cost, drafts a PO. Vendor uploads bank statement → 80%+ of lines auto-matched to invoices. Late-payer alerts fire on WhatsApp.

---

### 🟦 WEEK 6 — Polish, Test, Deploy, Demo

| Role | Tasks |
|---|---|
| **FS** | Final dashboards (KPIs incl. DSO + Collection Rate, geo-map, RFM); Audit logs viewer; Security hardening (rate limiting, input sanitization, RBAC review); E2E tests (Playwright); Deploy (Vercel + Railway / Render); UI polish; PDF / Excel report exports incl. FBR tax report; Admin / Distributor / Accountant user guides |
| **ML** | Model retraining cron jobs (forecasting, late-payer, churn); Crawler resilience (backoff, proxy rotation, dead-source detection); Reconciliation accuracy tuning; Documentation (API reference, model cards, NL2SQL + invoice example library); Final demo dataset preparation; Bug-fix sprint; Demo walkthrough rehearsal |

**Week 6 Demo:** Full live deployed product across 3 portals + AI assistant + procurement crawler + invoicing & receivables + notifications + dashboards. Demo video recorded. Handover documentation delivered.

---

## 10. Deliverables

By end of Week 6, the team will hand over:

1. **Live deployed web app** (3 portals, fully functional)
2. **Source code** in a private GitHub repo with clean commit history
3. **Database schema & ERD** (PDF + dbdiagram.io link)
4. **API documentation** (Swagger / OpenAPI 3.0)
5. **Invoice template pack** — B2C receipt, B2B tax invoice, distributor wholesale, credit note, debit note, monthly statement
6. **Admin user manual** + **Distributor guide** + **Accountant guide** + **Buyer guide** (PDFs)
7. **Architecture diagram** + **deployment runbook**
8. **Model cards** for every ML model (inputs, outputs, accuracy, retraining cadence) — including Late-Payer Predictor and Auto-Reconciliation
9. **Test reports** (coverage, E2E, load test)
10. **Demo video** (5–8 min walkthrough)
11. **Pitch deck** (15–20 slides) for company-internal presentation
12. **Future roadmap document** (Phase 2 features)

---

## 11. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Two-person team is thin for the scope | High | High | Strict weekly demos; defer non-core items to Phase 2; pair-program critical features; daily standup |
| Single point of failure (one FS, one ML) | Medium | High | Daily commits, shared README & decision log, cross-review of each other's code, no solo merging to `main` |
| ML forecasts inaccurate on cold-start (no history) | High | Medium | Fall back to category averages; communicate confidence interval clearly; allow vendor override |
| OCR fails on poor-quality invoice / bank-statement photos | Medium | Low | Always require human review before commit; show extracted JSON for editing |
| NL2SQL generates unsafe queries | Low | High | Run only against read-replica with row-level security; whitelist tables; reject DDL/DML; log every query for audit |
| Crawler IP-banned / source ToS issue | Medium | Medium | Tier-1 (official APIs) first; respect robots.txt; per-source allowlist; rotating proxies on Tier-3/4 only |
| Identity-match false positives in crawler | Medium | Medium | LLM-verifier step + low-confidence → human review; never auto-PO against unverified matches |
| **Tax / regulatory compliance complexity (FBR, GST)** | **Medium** | **High** | **Tax rules fully configurable in DB (not hard-coded); accountant review of templates before go-live; FBR-aligned defaults; legal-disclaimer on tax suggestions** |
| **Invoice numbering integrity** | **Low** | **High** | **Sequential ID issued by DB sequence (gapless within fiscal year); cancellations leave gaps but log reason; reconciled monthly** |
| **Auto-reconciliation false matches** | **Medium** | **Medium** | **Confidence threshold + human approval queue; never auto-close an invoice on low-confidence match** |
| Integration coupling between FS and ML | High | Medium | Lock OpenAPI contract Week 1; mock endpoints early so FS isn't blocked |
| Scope creep | High | High | Strict weekly demos; non-MVP features go to Phase 2 list immediately |

---

## 12. Team Composition

| Role | Responsibilities |
|---|---|
| **Full-Stack Developer** | Next.js frontend (all 3 portals), Node/NestJS backend (Core API), DB schema & migrations (Prisma + Postgres), auth & RBAC, order & pricing engine, **invoicing pipeline + customer billing profiles + payment recording + ledger UI**, notification engine plumbing + reminder-cadence UI, dashboards, deployment, CI/CD |
| **ML/AI Engineer** | Python FastAPI ML microservice, demand forecasting (Prophet/SARIMA), NL2SQL pipeline, RAG (LangChain + pgvector), OCR pipeline (supplier invoices + bank statements), market-basket mining, procurement crawler + identity matching, **Late-Payer Predictor**, **Invoice Anomaly Detection**, **AI Auto-Reconciliation engine**, customer churn / RFM, model retraining & monitoring |

**Shared responsibilities:** Architecture decisions, API contract design, code review, documentation, demo prep.

**Cadence:**
- Daily 15-min sync (blockers, today's plan)
- Friday weekly demo to internship mentor
- End-of-week retro (30 min)

---

## 13. Future Roadmap (Phase 2 — Post-Internship)

Items intentionally deferred to keep the 6-week scope tight, but worth pitching as "next quarter":

- **Mobile apps** (React Native) for distributor & buyer
- **Voice-driven queries** ("Hey CommerceIQ, how much did we sell yesterday?")
- **Image-based product search on the storefront** (CLIP — buyer-facing)
- **AR product preview** for buyers
- **Blockchain supply-chain ledger** for premium clients
- **Carbon-footprint tracking** per order (ESG / sustainability angle)
- **Multi-language UI** (Urdu, Arabic)
- **Marketplace integration** (sync listings to Daraz, Amazon)
- **Fraud detection** on transactions
- **Loyalty & referral program** engine
- **Multi-currency, multi-tax-region** (full ERP-grade)
- **Expanded Tier-3/4 crawler sources** (more local + international marketplaces)
- **WhatsApp wholesale-list intake at scale**
- **Competitor retail-price monitoring**
- **Direct payment-gateway integration** for one-click invoice settlement (Stripe / JazzCash / EasyPaisa)
- **Full double-entry accounting module** (P&L, Balance Sheet, Trial Balance) — Phase 1 is invoice/billing only; full GL is Phase 2
- **E-invoicing & FBR PRAL integration** for real-time tax reporting

---

## 14. Why This Project Is Worth Approving

1. **Real business value** — every feature maps to a measurable KPI: inventory turnover, stockout rate, AOV, retention, landed-cost reduction, **DSO, collection rate, bad-debt %**.
2. **Showcases cutting-edge AI** — RAG, NL2SQL, OCR, forecasting, live procurement intelligence, and **invoice intelligence** in one cohesive product.
3. **Differentiated in the market** — most SMB inventory tools are CRUD-only. The procurement crawler, landed-cost engine, WhatsApp-friendly architecture, and AI receivables management target real local-market gaps.
4. **Reusable IP** — the AI/ML services, the crawler, and the invoice-intelligence layer are each modular. The company can license any one to other clients independently.
5. **Defensible 6-week timeline** — milestones are aggressive but achievable for a 2-person team with the proposed scope split.
6. **Trains the team** on production-grade AI + data-engineering — not toy notebooks, but a deployed product.

---

## 15. Open Questions for Approval Meeting

Before we begin Week 1, we'd appreciate alignment on:

1. **Target client profile** — SMB retailers? Mid-market distributors? Single-tenant or multi-tenant SaaS?
2. **Hosting preference** — cloud (recommended) or on-premise for early clients?
3. **Brand & UI direction** — fully custom, or do you have a design system we should match?
4. **LLM provider preference** — Claude (our recommendation), OpenAI, or both with a router?
5. **Data sensitivity & compliance** — any specific regulatory constraints?
6. **Crawler source approval** — which marketplaces does compliance approve for Tier-3 HTML scraping (vs API-only)?
7. **Invoice / tax compliance scope** — Pakistan-FBR only, or do you want multi-jurisdiction tax engine ready from day 1?
8. **Demo audience** — internal-only, or a real pilot client we should design for?
9. **Post-internship continuity** — will either of us continue as part-time maintainers?

---

## 16. Conclusion

CommerceIQ is not "another inventory CRUD app." It's an opportunity to ship a genuinely intelligent, differentiated B2B/B2C platform in 6 weeks — one that uses the same AI techniques powering products at Shopify, Amazon, and Square, packaged for the SMB and distributor market the company already understands, **with a procurement intelligence layer and an AI-driven receivables engine that no global competitor currently offers for the local market**.

We're asking for the green light to begin Week 1 on **Monday following approval**, with a structured weekly demo cadence so leadership stays in the loop.

> **"Inventory that thinks for itself, sources itself at the lowest price, invoices itself, chases its own late payers — and tells you exactly how much margin and cash it made you this month."**

---

*Prepared by:* **[Team — Full-Stack Developer & ML/AI Engineer]**
*Date:* June 29, 2026
*Version:* 2.1 — Added Invoice Management & Billing module, AI Receivables Intelligence, FBR-ready tax compliance, Accountant role
