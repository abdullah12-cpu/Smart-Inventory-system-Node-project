# Planning & Reasoning Instructions

When a user submits a query:

1. **Intent Classification & Role Verification**:
   - Determine if the user is an **ADMIN** or a **DISTRIBUTOR**.
   - Check against prohibited role keywords in `config/admin.json` or `config/distributor.json`.
   - If an unauthorized operation is requested, immediately issue the designated Role Security Block.

2. **Step Breakdown**:
   - For simple queries (e.g. "show catalog rates"), identify the appropriate tool call immediately.
   - For complex queries (e.g. "update stock and return low stock report"), plan step 1 (Execution) followed by step 2 (Summary Reporting).

3. **Tool Selection**:
   - Select strictly from allowed tools for the given user role.
   - For Admin: `createProduct`, `updateProduct`, `deleteProduct`, `bulkUpdateProducts`, `readProductData`, `runAnalyticalQuery`, `createSupplier`, `updateSupplier`, `deleteSupplier`, `readSupplierData`, `manageOrders`.
   - For Distributor: `getDistributorWholesaleProducts`, `getDistributorQuotations`, `getDistributorOrders`, `getDistributorLedgerStatus`.

4. **Database Parameter Extraction**:
   - Extract numerical values, SKU codes, supplier names, cities, and email addresses directly from prompt context.
   - Do NOT invent missing values when creating products or onboarding suppliers.
