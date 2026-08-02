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
  if (name === 'readProductData') {
    const action = args.action_type || 'search';
    if (action === 'search') {
      const rows = await adminOps.searchProductsInDb(pool, args.identifier || '');
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No products found matching "${args.identifier}".` };
      const md = "### 📦 Product Search Results\n\n| SKU | Product Name | Category | Brand | Status |\n|---|---|---|---|---|\n" +
        rows.map(r => `| ${r.sku} | ${r.product_name} | ${r.category || 'N/A'} | ${r.brand || 'N/A'} | ${r.status} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    if (action === 'by_category') {
      const rows = await adminOps.getCategoryProductsFromDb(pool, args.identifier || '');
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No products found in category "${args.identifier}".` };
      const md = "### 📂 Category Products\n\n| SKU | Product Name | Category | Brand | Status |\n|---|---|---|---|---|\n" +
        rows.map(r => `| ${r.sku} | ${r.product_name} | ${r.category || 'N/A'} | ${r.brand || 'N/A'} | ${r.status} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    if (action === 'low_stock') {
      const rows = await adminOps.getLowStockProductsFromDb(pool);
      if (rows.length === 0) return { action_executed: name, ai_message: `✅ No low stock products found. All stock levels are healthy.` };
      const md = "### ⚠️ Low Stock Products\n\n| SKU | Product Name | Available Stock | Threshold |\n|---|---|---|---|\n" +
        rows.map(r => {
          const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
          const avail = inv && inv[0] ? inv[0].available_quantity : 0;
          return `| ${r.sku} | ${r.product_name} | ${avail} units | ${r.low_stock_threshold} |`;
        }).join("\n");
      return { action_executed: name, ai_message: md };
    }
    return { action_executed: name, ai_message: `ℹ️ Unknown readProductData action: ${action}` };
  }
  if (name === 'runAnalyticalQuery') {
    const rows = await adminOps.searchProductsInDb(pool, args.identifier || args.query || '');
    const md = rows.length > 0
      ? "### 📊 Analytical Query Results\n\n" + JSON.stringify(rows.slice(0, 10), null, 2)
      : "ℹ️ No results found for analytical query.";
    return { action_executed: name, ai_message: md };
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
  if (name === 'readSupplierData') {
    const action = args.action_type || 'search';
    if (action === 'search') {
      const rows = await adminOps.searchSuppliersInDb(pool, args.identifier || '');
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No suppliers found matching "${args.identifier}".` };
      const md = "### 🏢 Supplier Search Results\n\n| ID | Company | Contact | City | Country |\n|---|---|---|---|---|\n" +
        rows.map(r => `| ${r.supplier_id} | ${r.company_name} | ${r.contact_person || 'N/A'} | ${r.city || 'N/A'} | ${r.country || 'N/A'} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    if (action === 'by_location') {
      const rows = await adminOps.filterSuppliersByLocationInDb(pool, args.city, args.country);
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No suppliers found in that location.` };
      const md = "### 📍 Suppliers by Location\n\n| ID | Company | Contact | City | Country |\n|---|---|---|---|---|\n" +
        rows.map(r => `| ${r.supplier_id} | ${r.company_name} | ${r.contact_person || 'N/A'} | ${r.city || 'N/A'} | ${r.country || 'N/A'} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    return { action_executed: name, ai_message: `ℹ️ Unknown readSupplierData action: ${action}` };
  }
  if (name === 'manageOrders') {
    const action = args.action_type || 'list';
    if (action === 'list') {
      const rows = await adminOps.listOrdersFromDb(pool, args.limit || 20);
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No orders found.` };
      const md = "### 📋 Recent Orders\n\n| Order # | Status | Amount (PKR) | Customer | Date |\n|---|---|---|---|---|\n" +
        rows.map(r => `| ${r.order_number || r.order_id} | ${r.status} | Rs ${parseFloat(r.total_amount).toLocaleString()} | ${r.customer_email} | ${r.order_date ? new Date(r.order_date).toLocaleDateString() : 'N/A'} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    if (action === 'find') {
      const rows = await adminOps.getOrderByIdFromDb(pool, args.identifier || '');
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No order found matching "${args.identifier}".` };
      const md = "### 🔍 Order Search\n\n| Order # | Status | Amount (PKR) | Customer | Date |\n|---|---|---|---|---|\n" +
        rows.map(r => `| ${r.order_number || r.order_id} | ${r.status} | Rs ${parseFloat(r.total_amount).toLocaleString()} | ${r.customer_email} | ${r.order_date ? new Date(r.order_date).toLocaleDateString() : 'N/A'} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    if (action === 'by_status') {
      const rows = await adminOps.getOrdersByStatusFromDb(pool, args.status || 'PENDING');
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No ${args.status || 'PENDING'} orders found.` };
      const md = `### 📋 ${(args.status || 'PENDING').toUpperCase()} Orders\n\n| Order # | Status | Amount (PKR) | Customer | Date |\n|---|---|---|---|---|\n` +
        rows.map(r => `| ${r.order_number || r.order_id} | ${r.status} | Rs ${parseFloat(r.total_amount).toLocaleString()} | ${r.customer_email} | ${r.order_date ? new Date(r.order_date).toLocaleDateString() : 'N/A'} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    if (action === 'update_status') {
      const updated = await adminOps.updateOrderStatusInDb(pool, args.identifier, args.new_status || 'APPROVED');
      return { action_executed: name, ai_message: `✅ Order **${updated.order_number || updated.order_id}** status updated to \`${updated.status}\`.` };
    }
    if (action === 'bulk_approve') {
      const rows = await adminOps.bulkApproveOrdersInDb(pool);
      return { action_executed: name, ai_message: `✅ Bulk approved **${rows.length}** pending orders.` };
    }
    if (action === 'analytics') {
      const data = await adminOps.getOrderAnalyticsFromDb(pool, args.period || 'all');
      const t = data.totals;

      const formatHumanRevenue = (numStrOrVal) => {
        const val = parseFloat(numStrOrVal || 0);
        if (isNaN(val) || val === 0) return 'Rs 0';
        const absVal = Math.abs(val);
        if (absVal >= 1e9) return `Rs ${(val / 1e9).toFixed(3)} Billion (${(val / 1e7).toFixed(2)} Crore PKR)`;
        if (absVal >= 1e7) return `Rs ${(val / 1e7).toFixed(2)} Crore (${(val / 1e6).toFixed(1)} Million PKR)`;
        if (absVal >= 1e6) return `Rs ${(val / 1e6).toFixed(2)} Million (${(val / 1e5).toFixed(1)} Lakh PKR)`;
        if (absVal >= 1e5) return `Rs ${(val / 1e5).toFixed(2)} Lakh (Rs ${val.toLocaleString('en-PK')})`;
        return `Rs ${val.toLocaleString('en-PK')}`;
      };

      const periodLabel = { today: "Today's", week: 'This Week', month: 'This Month', all: 'Overall Lifetime' }[args.period || 'all'] || (args.period || 'Overall');
      const md = `📊 **${periodLabel} Revenue Analytics**\n\n` +
        `• **Total Revenue**: **${formatHumanRevenue(t.total_revenue)}**\n` +
        `• **Total Orders**: **${t.total_orders} orders**\n` +
        `• **Average Order Value**: **${formatHumanRevenue(t.avg_order_value)}**`;
      return { action_executed: name, ai_message: md };
    }
    if (action === 'top_buyers') {
      const rows = await adminOps.getTopBuyersFromDb(pool, args.limit || 5);
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No buyer data found.` };
      const md = `### 🏆 Top Buyers\n\n| Rank | Customer | Orders | Total Spent |\n|---|---|---|---|\n` +
        rows.map((r, i) => `| ${i+1} | ${r.customer_email} | ${r.order_count} | Rs ${parseFloat(r.total_spent).toLocaleString('en-PK', {maximumFractionDigits:0})} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    if (action === 'top_products') {
      const rows = await adminOps.getMostOrderedProductsFromDb(pool, args.limit || 10);
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No product order data found.` };
      const md = `### 🔥 Most Ordered Products\n\n| Rank | Product | Total Qty | Orders |\n|---|---|---|---|\n` +
        rows.map((r, i) => `| ${i+1} | ${r.product_name || 'N/A'} | ${r.total_qty || 0} | ${r.order_count} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    if (action === 'overdue') {
      const rows = await adminOps.getOverdueOrdersFromDb(pool, args.days || 3);
      if (rows.length === 0) return { action_executed: name, ai_message: `✅ No overdue orders found.` };
      const md = `### ⚠️ Overdue Orders\n\n| Order # | Status | Amount (PKR) | Customer | Date |\n|---|---|---|---|---|\n` +
        rows.map(r => `| ${r.order_number || r.order_id} | ${r.status} | Rs ${parseFloat(r.total_amount).toLocaleString()} | ${r.customer_email} | ${r.order_date ? new Date(r.order_date).toLocaleDateString() : 'N/A'} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    return { action_executed: name, ai_message: `ℹ️ Unknown manageOrders action: ${action}` };
  }
  throw new Error(`Tool execution error: Unknown tool ${name}`);
}

async function executeDistributorTool(pool, name, args) {
  if (name === 'getDistributorWholesaleProducts') {
    const rows = await distributorOps.getDistributorWholesaleProductsFromDb(pool, args ? args.identifier : null);
    if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No wholesale products found${args?.identifier ? ` matching "${args.identifier}"` : ''}.` };
    const md = "### 📦 Wholesale Product Catalog & Stock\n\n| SKU | Product Name | Category | Wholesale Price | MOQ | Available Stock |\n|---|---|---|---|---|---|\n" +
      rows.map(r => `| ${r.sku} | ${r.product_name} | ${r.category || 'N/A'} | Rs ${Number(r.wholesale_price || r.distributor_price || 0).toLocaleString()} | ${r.min_wholesale_qty || 1} units | ${r.available_stock || 0} units |`).join("\n");
    return { action_executed: name, ai_message: md, products: rows };
  }
  if (name === 'getDistributorQuotations') {
    const rows = await distributorOps.getDistributorQuotationsFromDb(pool, args ? args.identifier : null);
    if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No quotations found.` };
    const md = "### 📋 Distributor Partner Quotations\n\n| Quote No | Date | Valid Until | Status | Amount (PKR) |\n|---|---|---|---|---|\n" +
      rows.map(r => `| **${r.quotation_number || r.quotation_id}** | ${r.created_at ? String(r.created_at).slice(0,10) : 'Recent'} | ${r.valid_until || '14 Days'} | \`${r.status || 'PENDING'}\` | Rs ${Number(r.total_amount || 0).toLocaleString()} |`).join("\n");
    return { action_executed: name, ai_message: md };
  }
  if (name === 'getDistributorOrders') {
    const rows = await distributorOps.getDistributorOrdersFromDb(pool, args ? args.identifier : null);
    if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No B2B orders found.` };
    const md = "### 🚚 Distributor B2B Purchase Orders\n\n| Order # | Date | Status | Items Summary | Total Amount |\n|---|---|---|---|---|\n" +
      rows.map(r => `| ${r.order_number || r.order_id} | ${r.order_date ? new Date(r.order_date).toLocaleDateString() : 'N/A'} | ${r.status || 'PENDING'} | ${r.items_summary || 'N/A'} | Rs ${Number(r.total_amount || 0).toLocaleString()} |`).join("\n");
    return { action_executed: name, ai_message: md };
  }
  if (name === 'getDistributorLedgerStatus') {
    const ledger = await distributorOps.getDistributorLedgerStatusFromDb(pool);
    const md = `### 💳 Distributor Financial Ledger & Credit Status\n\n` +
      `- **Approved Credit Limit**: **Rs ${Number(ledger.credit_limit_pkr || 2500000).toLocaleString()}**\n` +
      `- **Used Credit**: Rs ${Number(ledger.used_credit_pkr || 0).toLocaleString()}\n` +
      `- **Available Credit Balance**: **Rs ${Number(ledger.available_credit_pkr || 2500000).toLocaleString()}**\n` +
      `- **Outstanding Invoices**: ${ledger.outstanding_invoices_count || 0} open (${ledger.payment_terms || 'NET-30'} Terms)`;
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
  if (name === 'manageDistributorQuotations') {
    const action = args.action_type || 'list';
    if (action === 'by_status') {
      const rows = await distributorOps.getDistributorQuotationsByStatusFromDb(pool, args.status || 'PENDING');
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No ${(args.status || 'PENDING')} quotations found.` };
      const md = "### 📋 " + (args.status || 'PENDING').toUpperCase().replace('_', ' ') + " Quotations\n\n| Quote No | Date | Valid Until | Status | Amount (PKR) |\n|---|---|---|---|---|\n" +
        rows.map(r => `| **${r.quotation_number || r.quotation_id}** | ${r.created_at ? String(r.created_at).slice(0,10) : 'Recent'} | ${r.valid_until || '14 Days'} | \`${r.status || 'PENDING'}\` | Rs ${Number(r.total_amount || 0).toLocaleString()} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    if (action === 'find') {
      const rows = await distributorOps.getDistributorQuotationByIdFromDb(pool, args.identifier || '');
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No quotation found matching "${args.identifier}".` };
      const md = "### 🔍 Quotation Details\n\n| Quote No | Date | Valid Until | Status | Amount (PKR) |\n|---|---|---|---|---|\n" +
        rows.map(r => `| **${r.quotation_number || r.quotation_id}** | ${r.created_at ? String(r.created_at).slice(0,10) : 'Recent'} | ${r.valid_until || '14 Days'} | \`${r.status || 'PENDING'}\` | Rs ${Number(r.total_amount || 0).toLocaleString()} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    if (action === 'by_amount') {
      const rows = await distributorOps.getDistributorQuotationsByAmountFromDb(pool, args.amount_operator || 'above', args.amount || 0);
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No quotations found ${args.amount_operator || 'above'} Rs ${Number(args.amount || 0).toLocaleString()}.` };
      const md = `### 💰 Quotations ${args.amount_operator || 'above'} Rs ${Number(args.amount || 0).toLocaleString()}\n\n| Quote No | Date | Valid Until | Status | Amount (PKR) |\n|---|---|---|---|---|\n` +
        rows.map(r => `| **${r.quotation_number || r.quotation_id}** | ${r.created_at ? String(r.created_at).slice(0,10) : 'Recent'} | ${r.valid_until || '14 Days'} | \`${r.status || 'PENDING'}\` | Rs ${Number(r.total_amount || 0).toLocaleString()} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    if (action === 'by_product') {
      const rows = await distributorOps.getDistributorQuotationsByProductFromDb(pool, args.product_name || '');
      if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No quotations found for product "${args.product_name}".` };
      const md = `### 📦 Quotations for "${args.product_name}"\n\n| Quote No | Date | Valid Until | Status | Amount (PKR) |\n|---|---|---|---|---|\n` +
        rows.map(r => `| **${r.quotation_number || r.quotation_id}** | ${r.created_at ? String(r.created_at).slice(0,10) : 'Recent'} | ${r.valid_until || '14 Days'} | \`${r.status || 'PENDING'}\` | Rs ${Number(r.total_amount || 0).toLocaleString()} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    if (action === 'update_status') {
      const updated = await distributorOps.updateDistributorQuotationStatusInDb(pool, args.identifier, args.new_status || 'ACCEPTED');
      return {
        action_executed: name,
        ai_message: `✅ Quotation **${updated.quotation_number || updated.quotation_id}** status updated to \`${updated.status}\`!`
      };
    }
    if (action === 'analytics') {
      const kpi = await distributorOps.getDistributorQuotationKpisFromDb(pool);
      let md = `### 📊 Distributor Quotations & Bids Summary\n\n`;
      md += `- **Active Quotations**: **${kpi.active_quotations}**\n`;
      md += `- **Total Bid Value**: **Rs ${Number(kpi.total_bid_value).toLocaleString()}**\n`;
      md += `- **Pending Acceptance**: **${kpi.pending_acceptance}** (Action required)\n\n`;
      if (kpi.by_status && kpi.by_status.length > 0) {
        md += `**Status Breakdown:**\n\n| Status | Count | Total Amount |\n|---|---|---|\n`;
        md += kpi.by_status.map(s => `| \`${s.status}\` | ${s.count} | Rs ${Number(s.amount || 0).toLocaleString()} |`).join('\n');
      }
      return { action_executed: name, ai_message: md };
    }
    if (action === 'expiring') {
      const rows = await distributorOps.getExpiringDistributorQuotationsFromDb(pool, 7);
      if (rows.length === 0) return { action_executed: name, ai_message: `✅ No quotations expiring in the next 7 days.` };
      const md = "### ⏰ Quotations Expiring Soon (Next 7 Days)\n\n| Quote No | Date | Valid Until | Status | Amount (PKR) |\n|---|---|---|---|---|\n" +
        rows.map(r => `| **${r.quotation_number || r.quotation_id}** | ${r.created_at ? String(r.created_at).slice(0,10) : 'Recent'} | ${r.valid_until || '14 Days'} | \`${r.status || 'PENDING'}\` | Rs ${Number(r.total_amount || 0).toLocaleString()} |`).join("\n");
      return { action_executed: name, ai_message: md };
    }
    // Default: list all quotations
    const rows = await distributorOps.getDistributorQuotationsFromDb(pool);
    if (rows.length === 0) return { action_executed: name, ai_message: `ℹ️ No quotations found.` };
    const md = "### 📋 All Partner Quotations & Bids\n\n| Quote No | Date | Valid Until | Status | Amount (PKR) |\n|---|---|---|---|---|\n" +
      rows.map(r => `| **${r.quotation_number || r.quotation_id}** | ${r.created_at ? String(r.created_at).slice(0,10) : 'Recent'} | ${r.valid_until || '14 Days'} | \`${r.status || 'PENDING'}\` | Rs ${Number(r.total_amount || 0).toLocaleString()} |`).join("\n");
    return { action_executed: name, ai_message: md };
  }
  throw new Error(`Tool execution error: Unknown distributor tool ${name}`);
}

module.exports = {
  executeAdminTool,
  executeDistributorTool
};
