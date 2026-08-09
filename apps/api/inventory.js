/**
 * Stock reservation, shared across every place an order gets created.
 *
 * There used to be five separate `INSERT INTO orders` call sites (buyer/distributor
 * checkout, quotation-approval auto-order in three different files, the AI copilot's own
 * order flow) and only one of them -- POST /api/orders -- actually reserved stock. Every
 * order created by approving a B2B quotation (the normal distributor negotiation flow, and
 * the same thing the admin/distributor chatbots do) silently skipped inventory entirely:
 * `available_quantity` never moved, so the dashboard kept showing full stock no matter how
 * many orders had gone through.
 *
 * Call reserveStockForItems right after inserting any new order row.
 */

/** Matches a line item back to its product the same way every existing call site did. */
async function findProductForItem(pool, item) {
  const res = await pool.query(
    'SELECT * FROM products WHERE product_id = $1 OR sku = $2 OR product_name ILIKE $3 LIMIT 1',
    [item.product_id || '', item.sku || '', `%${item.name || item.product_name || ''}%`]
  );
  return res.rows[0] || null;
}

/**
 * Reserves stock for each item: `reserved_quantity` goes up and `available_quantity` goes
 * down by the same amount, but the physical `quantity` is untouched until shipment. Items
 * that can't be matched to a real product (e.g. a quotation's generic 'b2b-stock'
 * placeholder) are silently skipped -- there's nothing to reserve against.
 */
async function reserveStockForItems(pool, items) {
  if (!Array.isArray(items) || items.length === 0) return;

  for (const item of items) {
    const qty = parseInt(item.qty || item.quantity || 0);
    if (qty <= 0) continue;

    const product = await findProductForItem(pool, item);
    if (!product) continue;

    let inventory = typeof product.inventory === 'string' ? JSON.parse(product.inventory) : (product.inventory || []);
    let remaining = qty;
    inventory = inventory.map(inv => {
      if (remaining <= 0) return inv;
      const avail = inv.available_quantity || 0;
      const toReserve = Math.min(avail, remaining);
      remaining -= toReserve;
      const newReserved = (inv.reserved_quantity || 0) + toReserve;
      const newAvail = Math.max(0, inv.quantity - newReserved);
      return { ...inv, reserved_quantity: newReserved, available_quantity: newAvail };
    });

    await pool.query('UPDATE products SET inventory = $1 WHERE product_id = $2', [JSON.stringify(inventory), product.product_id]);
  }
}

module.exports = { reserveStockForItems, findProductForItem };
