# CommerceIQ — 7-Week Milestone & Delivery Plan

> **Project:** CommerceIQ — AI-Powered Enterprise E-Commerce & Inventory Intelligence Platform
> **Reference:** [PROPOSAL.md](PROPOSAL.md)
> **Duration:** 7 Weeks
> **Team Size:** 3
> **Cadence:** Daily 15-min sync · Friday weekly demo to mentor · End-of-week retro (30 min)
> **Source control rule:** No solo merges to `main`; every PR cross-reviewed by at least one other member.

---

## 1. Team Roles

The proposal's single **Full-Stack** role is split into **Frontend** and **Backend/Platform** so the heavy invoicing, RBAC, and DevOps load is not bottlenecked on one person. The **ML/AI** role is unchanged.

| Code | Role | Owns |
|---|---|---|
| **FE** | **Frontend Engineer** | All 3 portals (Admin / Distributor / Buyer) in Next.js 14 + TypeScript; Tailwind + shadcn/ui; dashboards (Recharts/Tremor); TanStack Query/Table; forms (RHF + Zod); RAG chat UI, NL2SQL console UI, procurement UI, invoice/ledger UI; PWA + Web Push client; client-side invoice PDF preview; E2E test authoring (Playwright). |
| **BE** | **Backend / Platform Engineer** | Core API (NestJS/Node 20); PostgreSQL 16 schema + Prisma migrations + seed; Auth (JWT + refresh) + RBAC + row-level security; order/pricing engine; **invoicing pipeline + numbering + customer billing profiles + payments + ledger atomicity**; notification worker (BullMQ); Redis; object storage; DevOps — GitHub Actions CI/CD, Vercel + Railway/Render deploy, Sentry/logging. |
| **ML** | **ML / AI Engineer** | Python 3.11 FastAPI microservice; demand forecasting (Prophet/SARIMA); event-aware modeling; NL2SQL pipeline; RAG (LangChain + pgvector); OCR (invoices + bank statements); market-basket mining (Apriori/FP-Growth); procurement crawler + identity matching; **Late-Payer Predictor**; **Invoice Anomaly Detection**; **AI Auto-Reconciliation**; churn/RFM; model retraining & monitoring. |

**Shared by all three:** architecture decisions, OpenAPI contract design, code review, documentation, demo prep.

### Role interface contracts (who unblocks whom)

- **BE → FE:** stable REST/OpenAPI endpoints + seed data. BE publishes mock endpoints early so FE is never blocked.
- **BE ↔ ML:** the Core↔ML OpenAPI contract (locked Week 1). ML consumes DB read-replica; BE exposes write endpoints for ML outputs (forecasts, scores, recon results).
- **FE → ML:** FE calls ML only through the BFF (Next.js API routes), never directly — keeps auth/RBAC centralized.

---

## 2. Milestone Overview

| Week | Theme | Headline Demo |
|---|---|---|
| **1** | Foundation & rails | Admin logs in, manages catalog; ML health-check returns model info |
| **2** | Inventory & commerce core | Inventory + tiered pricing end-to-end; first 30-day forecasts; billing profiles editable |
| **3** | Orders, pricing & invoice engine | Full order lifecycle (B2B+B2C) → auto invoice PDF + QR; first basket rules; NL2SQL answers an invoice question |
| **4** | Intelligence layer + receivables | "What to restock & who pays late?" → grounded answer; OCR invoice → inventory rows |
| **5** | Procurement intelligence & auto-reconciliation | Add SKU → live landed-cost ranking → auto-PO draft; bank statement 80%+ auto-matched |
| **6** | Automation, dashboards & analytics | Smart reminders fire multi-channel; full KPI dashboards (DSO, aging, geo, RFM) |
| **7** | Hardening, test, deploy, handover | Full live deployed product; demo video; complete documentation handover |

> **Note on the 7th week:** The proposal explicitly warns the timeline is "aggressive but achievable" and recommends deferring slippage to buffer. Week 7 is that buffer made explicit — security hardening, full E2E/load testing, deployment polish, and documentation, so the demo is solid rather than rushed.

---

## 🟦 WEEK 1 — Foundation

**Goal:** All three engineers can develop independently by Friday. Contracts locked.

| Role | Tasks |
|---|---|
| **FE** | Next.js 14 App Router scaffold inside the monorepo; Tailwind + shadcn/ui setup; design tokens/theme; 3-portal route shells + protected-route guards; login screen + session wiring; shared component library (tables, forms, layout, toasts); Storybook (optional). |
| **BE** | Turborepo monorepo; local service setup (Postgres 16, Redis, ML service); GitHub Actions CI (lint/test/build); **final DB schema + Prisma migrations + seed data** incl. invoice/billing tables; Auth (JWT + refresh) + RBAC roles (Super Admin, Distributor, Buyer, Inventory Mgr, Accountant, Analyst); Product/Category/Supplier CRUD API. |
| **ML** | FastAPI microservice scaffold; enable **pgvector** & **TimescaleDB** extensions; embedding-model selection (BGE vs OpenAI); synthetic-data generator for forecasting/basket training; notebook + experiment-tracking (e.g. MLflow) setup; `/health` + `/model-info` endpoints. |

**Joint:** Lock the Core↔ML **OpenAPI contract**; agree repo conventions, branch strategy, decision log.

**✅ Demo:** Admin logs in and manages catalog & stock. ML health-check returns model info. CI green on every push.

---

## 🟦 WEEK 2 — Inventory & Commerce Foundation

| Role | Tasks |
|---|---|
| **FE** | Inventory screens (stock in/out/transfer, multi-warehouse, batches, expiry); Supplier UI; **Tiered Pricing Engine UI** + quantity-break editor; barcode/QR display; **Customer billing-profile UI** (tax IDs, credit limit, payment terms). |
| **BE** | Inventory module API (movements ledger, multi-warehouse, batch/expiry, FIFO/FEFO); stock valuation (FIFO/Weighted Avg); pricing-tier resolution logic + quantity-break engine; barcode/QR generation; billing-profile CRUD + credit-limit/payment-terms persistence. |
| **ML** | **Demand-forecasting MVP (Prophet)** — nightly job, top-100 SKUs; reorder-point calculator API (`ROP = avg daily sales × lead time + safety stock`); begin **NL2SQL safe-execution layer** (read-replica role, schema introspection, table whitelist, DDL/DML rejection). |

**✅ Demo:** Inventory + tiered pricing working end-to-end; ML returns first 30-day forecasts; billing profiles editable.

---

## 🟦 WEEK 3 — Orders, Pricing & Invoice Engine

| Role | Tasks |
|---|---|
| **FE** | B2C cart + checkout flow; B2B bulk-order portal (Distributor); POS quick-sale screen; returns/refunds UI; **invoice template rendering** (B2C receipt / B2B / wholesale) + PDF preview + QR display; credit-note/debit-note UI. |
| **BE** | Order lifecycle API (Quotation→SO→Invoice→Payment); **invoice generation pipeline** — gapless sequential numbering (DB sequence, per-fiscal-year), multi-currency w/ FX snapshot, multi-tax (GST/withholding), QR verify-link + public verification endpoint; PDF service (Puppeteer/react-pdf); returns/refunds; **credit-note & debit-note flow** w/ separate numbering. |
| **ML** | NL2SQL polish (auto chart selection, query history, share-as-link, **invoice example library**); **Market Basket Analysis** (Apriori + FP-Growth) → API + persisted `basket_rules`; begin **RAG** — embed catalog + sales + invoice corpus into pgvector. |

**✅ Demo:** End-to-end order lifecycle (B2B + B2C) → auto-generated invoice PDF + QR code; first "frequently bought together" rules in UI; NL2SQL answers an invoice-related question with a chart.

---

## 🟦 WEEK 4 — Intelligence Layer + Receivables

**Theme:** The system starts thinking.

| Role | Tasks |
|---|---|
| **FE** | Forecast / reorder / basket suggestion UIs; pricing-optimization suggestion UI (1-click approve, not auto-apply); **Customer Ledger + Aging Dashboard** (0-30/31-60/61-90/90+); **Payment recording UI** (partial pay + allocation); RAG chat UI wired to ML; **Margin Impact Dashboard** shell. |
| **BE** | Payments API — partial payments, **payment allocation** (one payment → many invoices, FIFO), reconciliation status fields; ledger view + running balance + aging buckets; endpoints to persist ML outputs (`late_payer_score`, `anomaly_score`); webhook on invoice state transitions. |
| **ML** | **RAG assistant complete** (grounded answers w/ citations across catalog, sales, invoices); **event-aware demand multipliers** (Eid/Christmas/exam/monsoon from historical lift); **OCR invoice intake** (Tesseract + LLM JSON post-processing); **Late-Payer Predictor v1** (XGBoost → probability per invoice); foundation of identity-matching pipeline (text embeddings + LLM verifier). |

**✅ Demo:** Owner asks chat *"what should I restock next week, and who's about to pay late?"* → grounded answer + forecast + late-payer list. OCR: photo of supplier invoice → inventory rows committed after review.

---

## 🟦 WEEK 5 — Procurement Intelligence & Auto-Reconciliation

**Theme:** Crawler online + receivables intelligence.

| Role | Tasks |
|---|---|
| **FE** | **Procurement Intelligence UI** — ranked sources table (Cheapest / Fastest / Best Overall) with score breakdown + 1-click auto-PO draft; **Trending Product Radar UI**; **Auto-Reconciliation review queue UI** (confirm uncertain matches); identity-match human-review screen. |
| **BE** | Purchase-order API + auto-PO draft from reorder/decision-engine triggers; supplier reliability scoring + comparison; AP aging report; ingest endpoints for bank CSV / OCR scans → reconciliation queue; payment-allocation on confirmed matches; object-storage wiring for bank statements/supplier docs. |
| **ML** | **Procurement Crawler** — Daraz API + Alibaba API + sitemap scrapers for 2 PK marketplaces; **Total Landed Cost** calculator (FX+shipping+duty+tax+defect-risk); identity matching across sources; decision-engine ranking; Trending Radar signals; **AI Auto-Reconciliation pipeline** (match bank lines → invoices w/ confidence); **Invoice Anomaly Detection**; churn (XGBoost) + RFM segmentation. |

**✅ Demo:** Vendor adds an SKU → system fetches live prices, computes landed cost, drafts a PO. Vendor uploads bank statement → 80%+ of lines auto-matched. Anomalous invoice flagged before send.

---

## 🟦 WEEK 6 — Automation, Notifications & Dashboards

**Theme:** Everything talks; the vendor sees value on the home screen.

| Role | Tasks |
|---|---|
| **FE** | Notification rules UI + learning-suppression toggle; **Smart Reminder Cadence UI** (per-customer rules, A/B templates, tone selector); role-specific dashboards — KPIs (GMV, AOV, turnover, stockout %, **DSO, Aging %, Collection Rate**), sales heatmaps, cohort retention, **geo-map (Pakistan, drillable by city)**, RFM view; **"Margin Saved" + "Cash Collected Faster" headline KPIs** on Admin home. |
| **BE** | **Notification engine** (BullMQ worker → email/SMS/WhatsApp/push) with quiet hours + escalation chains; reminder-cadence persistence + send-queue + A/B logging; **recurring invoices** + auto-send on order completion; credit-limit auto-enforcement (pause orders, admin override); auto monthly statements; analytics/KPI aggregation endpoints; PDF/Excel report export incl. **FBR tax report**. |
| **ML** | Reminder-channel/tone learning layer (which channel/tone makes each customer pay); notification-suppression reinforcement signal (acted-on vs dismissed); price-drop prediction (TimescaleDB patterns); reconciliation accuracy tuning; forecasting/late-payer/churn accuracy review + retrain. |

**✅ Demo:** Smart reminders fire on the right channel per customer; learning suppresses noisy alerts; full KPI dashboards live with DSO, aging, geo-map, and headline margin/cash KPIs.

---

## 🟦 WEEK 7 — Hardening, Test, Deploy & Handover

**Theme:** Make it production-solid and hand it over.

| Role | Tasks |
|---|---|
| **FE** | UI polish pass across all 3 portals; accessibility + responsive cleanup; **E2E tests (Playwright)** for critical flows (login, order→invoice→payment, reconciliation, procurement); audit-log viewer UI; loading/error/empty states; record **demo video (5–8 min)**. |
| **BE** | **Security hardening** — rate limiting, input sanitization, RBAC review, 2FA for Admin/Distributor/Accountant, encryption-at-rest/in-transit check, invoice-PDF tamper protection (hash); audit-log coverage review; **production deploy** (Vercel + Railway/Render); load test (k6); backups + runbook; **deployment runbook** + API docs (Swagger/OpenAPI 3.0). |
| **ML** | **Model retraining cron jobs** (forecasting, late-payer, churn, reconciliation); crawler resilience (backoff, proxy rotation, dead-source detection, robots.txt compliance); **model cards** for every model (inputs/outputs/accuracy/retrain cadence); NL2SQL + invoice example-library docs; final demo dataset prep; bug-fix sprint; demo rehearsal. |

**Joint:** User guides (Admin / Distributor / Accountant / Buyer); ERD export; pitch deck (15–20 slides); Phase-2 roadmap doc; final demo walkthrough rehearsal.

**✅ Demo:** Full live deployed product across 3 portals + AI assistant + procurement crawler + invoicing & receivables + notifications + dashboards. Demo video recorded. Handover documentation delivered.

---

## 3. Final Deliverables (end of Week 7)

1. Live deployed web app (3 portals, fully functional)
2. Source code in a private GitHub repo with clean commit history
3. Database schema & ERD (PDF + dbdiagram.io link)
4. API documentation (Swagger / OpenAPI 3.0)
5. Invoice template pack (B2C receipt, B2B tax invoice, distributor wholesale, credit note, debit note, monthly statement)
6. User manuals — Admin, Distributor, Accountant, Buyer (PDFs)
7. Architecture diagram + deployment runbook
8. Model cards for every ML model (incl. Late-Payer Predictor, Auto-Reconciliation)
9. Test reports (coverage, E2E, load test)
10. Demo video (5–8 min walkthrough)
11. Pitch deck (15–20 slides)
12. Future roadmap document (Phase 2)

---

## 4. Risk & Buffer Notes

| Risk | Mitigation in this 7-week plan |
|---|---|
| 3-person team thin for scope | Clear role split (FE/BE/ML) removes the single-person Full-Stack bottleneck; weekly demos force prioritization; non-MVP → Phase 2. |
| FE blocked waiting on BE | BE ships mock endpoints + OpenAPI contract in Week 1; FE codes against mocks. |
| FS↔ML integration coupling | OpenAPI contract locked Week 1; ML outputs persisted via BE endpoints, never direct FE→ML calls. |
| Aggressive timeline slippage | Week 7 is an explicit hardening/buffer week; if Weeks 1–6 slip, polish absorbs it rather than the demo. |
| Single point of failure per role | Daily commits, cross-review, shared decision log, no solo merges to `main`. |

---

*Derived from [PROPOSAL.md](PROPOSAL.md) (v2.1). Adjusts the original 6-week / 2-person plan to a 7-week / 3-person plan by splitting Full-Stack into Frontend + Backend roles and adding a dedicated hardening week.*
