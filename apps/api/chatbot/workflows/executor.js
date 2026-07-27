/**
 * Executor Workflow Module
 * Dispatches function tool calls and local fallback queries to database operations.
 */

const adminOps = require('../operations/adminOperations');
const distributorOps = require('../operations/distributorOperations');

async function executeAdminTool(pool, name, args, message, attached_image) {
  if (name === 'createProduct') {
    if (attached_image) args.image_url = attached_image;
    const newProduct = await adminOps.createProductInDb(pool, args);
    return {
      action_executed: 'createProduct',
      ai_message: `✅ Created: **${args.name}** (${args.category || 'N/A'}). Price: ${args.price !== undefined && args.price !== null ? 'Rs ' + args.price.toLocaleString() : 'N/A'}, Stock: ${args.stock !== undefined && args.stock !== null ? args.stock : 'N/A'}. SKU: ${newProduct.sku}.`,
      product: newProduct
    };
  }
  if (name === 'deleteProduct') {
    const deleted = await adminOps.deleteProductFromDb(pool, args.identifier);
    return {
      action_executed: 'deleteProduct',
      ai_message: `✅ Deleted product: **${deleted.product_name}** (SKU: ${deleted.sku}).`
    };
  }
  if (name === 'updateProduct') {
    const updated = await adminOps.updateProductInDb(pool, args.identifier, args);
    return {
      action_executed: 'updateProduct',
      ai_message: `✅ Updated product: **${updated.product_name}**. (Edits applied successfully)`
    };
  }
  if (name === 'bulkUpdateProducts') {
    const count = await adminOps.bulkUpdateProductsInDb(pool, args.category_filter, args.brand_filter, args);
    return {
      action_executed: 'bulkUpdateProducts',
      ai_message: `✅ Bulk operation completed: Successfully modified **${count}** products matching your criteria.`
    };
  }
  if (name === 'createSupplier') {
    const newSup = await adminOps.createSupplierInDb(pool, args);
    return {
      action_executed: 'createSupplier',
      ai_message: `✅ Onboarded Supplier: **${newSup.company_name}** (${newSup.city || 'N/A'}, ${newSup.country || 'N/A'}). Contact Person: ${newSup.contact_person || 'N/A'}.`,
      supplier: newSup
    };
  }
  if (name === 'updateSupplier') {
    const updatedSup = await adminOps.updateSupplierInDb(pool, args.identifier, args);
    return {
      action_executed: 'updateSupplier',
      ai_message: `✅ Updated Supplier profile: **${updatedSup.company_name}**.`
    };
  }
  if (name === 'deleteSupplier') {
    const deletedSup = await adminOps.deleteSupplierFromDb(pool, args.identifier);
    return {
      action_executed: 'deleteSupplier',
      ai_message: `✅ Deleted Supplier: **${deletedSup.company_name}** (ID: ${deletedSup.supplier_id}).`
    };
  }
  throw new Error(`Tool execution error: Unknown tool ${name}`);
}

async function executeDistributorTool(pool, name, args) {
  if (name === 'getDistributorWholesaleProducts') {
    const rows = await distributorOps.getDistributorWholesaleProductsFromDb(pool, args ? args.identifier : null);
    const md = "### 📦 Wholesale Product Catalog & Stock\n\n| SKU | Product Name | Wholesale Price | Minimum Order Qty | Available Stock |\n|---|---|---|---|---|\n" +
      rows.map(r => `| ${r.sku} | ${r.product_name} | Rs ${Number(r.distributor_price || r.price).toLocaleString()} | ${r.min_wholesale_qty || 10} units | ${(r.karachi_stock || 0) + (r.lahore_stock || 0)} units |`).join("\n");
    return { action_executed: name, ai_message: md };
  }
  if (name === 'getDistributorQuotations') {
    const rows = await distributorOps.getDistributorQuotationsFromDb(pool, args ? args.identifier : null);
    const md = "### 📋 Distributor Partner Quotations\n\n| Quote ID | Product / Item | Requested Price | Status |\n|---|---|---|---|\n" +
      rows.map(r => `| ${r.quotation_id || r.id || 'QUO-9012'} | ${r.product_name || r.item || 'Wholesale Batch'} | Rs ${Number(r.requested_price || r.price || 0).toLocaleString()} | ${r.status || 'UNDER_REVIEW'} |`).join("\n");
    return { action_executed: name, ai_message: md };
  }
  if (name === 'getDistributorOrders') {
    const rows = await distributorOps.getDistributorOrdersFromDb(pool, args ? args.identifier : null);
    const md = "### 🚚 Distributor B2B Purchase Orders\n\n| Order # | Date | Status | Warehouse Depot | Total Amount |\n|---|---|---|---|---|\n" +
      rows.map(r => `| ${r.order_number || r.id || 'ORD-PO-4812'} | ${r.order_date || 'Recent'} | ${r.status || 'PROCESSING'} | ${r.warehouse_depot || 'Karachi Central'} | Rs ${Number(r.total_amount || 0).toLocaleString()} |`).join("\n");
    return { action_executed: name, ai_message: md };
  }
  if (name === 'getDistributorLedgerStatus') {
    const ledger = await distributorOps.getDistributorLedgerStatusFromDb(pool);
    const md = `### 💳 Distributor Financial Ledger & Credit Status\n\n- **Approved Credit Limit**: Rs ${Number(ledger.credit_limit || 2500000).toLocaleString()}\n- **Used Credit**: Rs ${Number(ledger.used_credit || 450000).toLocaleString()}\n- **Available Credit Balance**: Rs ${Number(ledger.remaining_credit || 2050000).toLocaleString()}\n- **Outstanding Invoices**: ${ledger.open_invoices || 1} open (${ledger.payment_terms || 'NET-30'} Terms)`;
    return { action_executed: name, ai_message: md };
  }
  if (name === 'createDistributorQuotation') {
    const quote = await distributorOps.createDistributorQuotationInDb(pool, args.customer_email, args.customer_name, args.product_name, args.quantity, args.target_price);
    return {
      action_executed: name,
      ai_message: `✅ **Quotation Request Submitted Successfully!**\n\n- **Quotation ID**: \`${quote.quotation_id}\`\n- **Quotation Number**: **${quote.quotation_number}**\n- **Product**: **${quote.product_name}** (${quote.sku})\n- **Quantity**: ${quote.quantity} units\n- **Target Unit Price**: Rs ${Number(quote.unit_price).toLocaleString()}\n- **Total Estimated Value**: Rs ${Number(quote.total_amount).toLocaleString()}\n- **Status**: \`${quote.status}\` (Under Review by Sales Team)`
    };
  }
  if (name === 'createDistributorDirectOrder') {
    const order = await distributorOps.createDistributorDirectOrderInDb(pool, args.customer_email, args.customer_name, args.product_name, args.quantity, args.warehouse_depot);
    return {
      action_executed: name,
      ai_message: `✅ **Direct B2B Wholesale Order Placed Successfully!**\n\n- **Order Number**: **${order.order_number}**\n- **Product**: **${order.product_name}** (${order.sku})\n- **Order Quantity**: ${order.quantity} units\n- **Total Amount**: Rs ${Number(order.total_amount).toLocaleString()}\n- **Warehouse Depot**: ${order.warehouse_depot}\n- **Order Status**: \`${order.status}\` (Processing)`
    };
  }
  throw new Error(`Tool execution error: Unknown distributor tool ${name}`);
}

module.exports = {
  executeAdminTool,
  executeDistributorTool
};
