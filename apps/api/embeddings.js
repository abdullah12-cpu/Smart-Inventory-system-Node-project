/**
 * Embeddings Module — pgvector RAG for Buyer Chatbot
 *
 * Model : nomic-embed-text (via Ollama local) — 768 dimensions
 * DB    : PostgreSQL + pgvector extension
 *
 * Public API:
 *   generateEmbedding(text)                    → number[]  (768 floats)
 *   buildProductText(product)                  → string    (rich text for embedding)
 *   upsertProductEmbedding(pool, product)       → void      (generate + store in DB)
 *   vectorSearchProducts(pool, query, opts)     → product[] (cosine similarity ranked)
 *   backfillEmbeddings(pool)                   → void      (fill missing on startup)
 */

const OLLAMA_BASE = 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text';
const EMBED_DIMS  = 768;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Generate embedding vector from text via Ollama
// ─────────────────────────────────────────────────────────────────────────────
async function generateEmbedding(text) {
  const res = await fetch(`${OLLAMA_BASE}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: text })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama embed error (${res.status}): ${err}`);
  }

  const data = await res.json();

  // Ollama /api/embed returns { embeddings: [[...]] }
  const vector = data.embeddings?.[0] ?? data.embedding;
  if (!Array.isArray(vector) || vector.length !== EMBED_DIMS) {
    throw new Error(`Unexpected embedding shape: got ${vector?.length ?? 'null'} dims, expected ${EMBED_DIMS}`);
  }

  return vector;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Build rich text representation of a product for embedding
//    More descriptive = better semantic search quality
// ─────────────────────────────────────────────────────────────────────────────
function buildProductText(product) {
  const name     = product.product_name || product.name || '';
  const brand    = product.brand        || '';
  const category = product.category     || '';
  const desc     = product.short_description || product.description || '';
  const unit     = product.unit         || '';
  const weight   = product.weight       ? `${product.weight}kg` : '';

  // Parse price
  let priceText = '';
  try {
    const prices = typeof product.prices === 'string'
      ? JSON.parse(product.prices)
      : (product.prices || {});
    if (prices.RETAIL) priceText = `retail price Rs ${Number(prices.RETAIL).toLocaleString()} PKR`;
  } catch (_) {}

  // Structured sentence the LLM embedding model can reason over
  const parts = [
    name,
    brand   ? `by ${brand}` : '',
    category ? `category ${category}` : '',
    desc,
    unit    ? `unit ${unit}` : '',
    weight  ? `weight ${weight}` : '',
    priceText,
  ].filter(Boolean);

  return parts.join('. ');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Generate embedding for a product and store it in the DB
// ─────────────────────────────────────────────────────────────────────────────
async function upsertProductEmbedding(pool, product) {
  const productId = product.product_id;
  if (!productId) {
    console.warn('[Embeddings] Skipping upsert — no product_id on product:', product.product_name);
    return;
  }

  try {
    const text   = buildProductText(product);
    const vector = await generateEmbedding(text);

    // Store as pgvector literal: '[0.1, 0.2, ...]'
    const vectorLiteral = `[${vector.join(',')}]`;

    await pool.query(
      `UPDATE products SET embedding = $1 WHERE product_id = $2`,
      [vectorLiteral, productId]
    );

    console.log(`[Embeddings] ✅ Stored embedding for: "${product.product_name}" (${productId})`);
  } catch (err) {
    // Non-fatal — product is still usable, just won't have vector search
    console.error(`[Embeddings] ⚠️  Failed to embed "${product.product_name}": ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Vector similarity search — the core RAG retrieval step
//    Returns products ranked by cosine similarity to the query
// ─────────────────────────────────────────────────────────────────────────────
async function vectorSearchProducts(pool, query, opts = {}) {
  const {
    limit      = 15,    // max products to return
    max_price  = null,
    min_price  = null,
    category   = null,
    brand      = null,
    threshold  = 0.25,  // minimum similarity score (0–1); lower = more results
  } = opts;

  // Embed the query
  let queryVector;
  try {
    queryVector = await generateEmbedding(query);
  } catch (err) {
    console.error('[Embeddings] Query embedding failed:', err.message);
    return [];  // caller will fall back to keyword search
  }

  const vectorLiteral = `[${queryVector.join(',')}]`;

  // Build dynamic SQL with optional filters
  const conditions = [`status = 'ACTIVE'`, `embedding IS NOT NULL`];
  const params     = [vectorLiteral];
  let   idx        = 2;

  if (max_price !== null) { conditions.push(`(prices->>'RETAIL')::numeric <= $${idx}`); params.push(max_price); idx++; }
  if (min_price !== null) { conditions.push(`(prices->>'RETAIL')::numeric >= $${idx}`); params.push(min_price); idx++; }
  if (category)           { conditions.push(`LOWER(category) LIKE $${idx}`);            params.push(`%${category.toLowerCase()}%`); idx++; }
  if (brand)              { conditions.push(`LOWER(brand) LIKE $${idx}`);               params.push(`%${brand.toLowerCase()}%`);    idx++; }

  const whereClause = conditions.join(' AND ');

  // Cosine similarity: 1 - cosine_distance  (pgvector <=> operator = cosine distance)
  const sql = `
    SELECT *,
           1 - (embedding <=> $1::vector) AS similarity
    FROM   products
    WHERE  ${whereClause}
      AND  1 - (embedding <=> $1::vector) >= ${threshold}
    ORDER  BY similarity DESC
    LIMIT  $${idx}
  `;
  params.push(limit);

  try {
    const result = await pool.query(sql, params);

    return result.rows.map(r => {
      let prices    = {};
      let inventory = [];
      try { prices    = typeof r.prices    === 'string' ? JSON.parse(r.prices)    : r.prices    || {}; } catch (_) {}
      try { inventory = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory || []; } catch (_) {}

      const availableStock = inventory.reduce((sum, i) => sum + (i.available_quantity || i.quantity || 0), 0);

      return {
        product_id:        r.product_id,
        sku:               r.sku,
        product_name:      r.product_name,
        short_description: r.short_description || '',
        brand:             r.brand,
        category:          r.category,
        retail_price:      prices.RETAIL !== undefined ? parseFloat(prices.RETAIL) : 0,
        image_url:         r.image_url,
        available_stock:   availableStock,
        inventory,
        similarity:        parseFloat(r.similarity).toFixed(3)
      };
    });
  } catch (err) {
    console.error('[Embeddings] Vector search query failed:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Startup backfill — embed all products that have no embedding yet
//    Runs once on server start, non-blocking (fire-and-forget)
// ─────────────────────────────────────────────────────────────────────────────
async function backfillEmbeddings(pool) {
  let rows;
  try {
    const res = await pool.query(
      `SELECT product_id, product_name, brand, category, short_description, unit, weight, prices
       FROM products
       WHERE status = 'ACTIVE' AND embedding IS NULL
       ORDER BY created_at ASC`
    );
    rows = res.rows;
  } catch (err) {
    console.error('[Embeddings] Backfill query failed:', err.message);
    return;
  }

  if (rows.length === 0) {
    console.log('[Embeddings] ✅ All products already have embeddings.');
    return;
  }

  console.log(`[Embeddings] 🔄 Backfilling embeddings for ${rows.length} product(s)...`);

  // Sequential to avoid overwhelming Ollama
  for (const row of rows) {
    await upsertProductEmbedding(pool, row);
    // Small delay between calls so Ollama doesn't queue up
    await new Promise(r => setTimeout(r, 150));
  }

  console.log('[Embeddings] ✅ Backfill complete.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Check if Ollama embed model is available
// ─────────────────────────────────────────────────────────────────────────────
async function isEmbedModelAvailable() {
  try {
    const res  = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) return false;
    const data = await res.json();
    return (data.models || []).some(m => m.name.includes('nomic-embed-text'));
  } catch (_) {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Distributor-specific vector search
//    Same embedding column, but returns WHOLESALE pricing fields instead of retail.
//    Also applies min_wholesale_qty / max_discount context in the prompt text.
// ─────────────────────────────────────────────────────────────────────────────
async function vectorSearchWholesaleProducts(pool, query, opts = {}) {
  const {
    limit     = 15,
    max_price = null,   // wholesale price ceiling
    min_price = null,   // wholesale price floor
    category  = null,
    brand     = null,
    threshold = 0.20,
  } = opts;

  let queryVector;
  try {
    queryVector = await generateEmbedding(query);
  } catch (err) {
    console.error('[Embeddings] Distributor query embedding failed:', err.message);
    return [];
  }

  const vectorLiteral = `[${queryVector.join(',')}]`;

  const conditions = [`status = 'ACTIVE'`, `embedding IS NOT NULL`];
  const params     = [vectorLiteral];
  let   idx        = 2;

  // Filter by wholesale/distributor price stored in JSONB prices column
  if (max_price !== null) {
    conditions.push(`COALESCE((prices->>'DISTRIBUTOR')::numeric, (prices->>'RETAIL')::numeric) <= $${idx}`);
    params.push(max_price); idx++;
  }
  if (min_price !== null) {
    conditions.push(`COALESCE((prices->>'DISTRIBUTOR')::numeric, (prices->>'RETAIL')::numeric) >= $${idx}`);
    params.push(min_price); idx++;
  }
  if (category) { conditions.push(`LOWER(category) LIKE $${idx}`); params.push(`%${category.toLowerCase()}%`); idx++; }
  if (brand)    { conditions.push(`LOWER(brand) LIKE $${idx}`);    params.push(`%${brand.toLowerCase()}%`);    idx++; }

  const whereClause = conditions.join(' AND ');

  const sql = `
    SELECT *,
           1 - (embedding <=> $1::vector) AS similarity
    FROM   products
    WHERE  ${whereClause}
      AND  1 - (embedding <=> $1::vector) >= ${threshold}
    ORDER  BY similarity DESC
    LIMIT  $${idx}
  `;
  params.push(limit);

  try {
    const result = await pool.query(sql, params);

    return result.rows.map(r => {
      let prices    = {};
      let inventory = [];
      try { prices    = typeof r.prices    === 'string' ? JSON.parse(r.prices)    : r.prices    || {}; } catch (_) {}
      try { inventory = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory || []; } catch (_) {}

      const totalStock = inventory.reduce((sum, i) => sum + (i.available_quantity || i.quantity || 0), 0);

      return {
        product_id:        r.product_id,
        sku:               r.sku,
        product_name:      r.product_name,
        short_description: r.short_description || '',
        brand:             r.brand,
        category:          r.category,
        retail_price:      prices.RETAIL      !== undefined ? parseFloat(prices.RETAIL)      : 0,
        wholesale_price:   prices.DISTRIBUTOR !== undefined ? parseFloat(prices.DISTRIBUTOR) : (prices.RETAIL !== undefined ? parseFloat(prices.RETAIL) : 0),
        min_wholesale_qty: r.min_wholesale_qty || 1,
        max_discount:      r.max_discount      || 0,
        image_url:         r.image_url,
        available_stock:   totalStock,
        inventory,
        similarity:        parseFloat(r.similarity).toFixed(3)
      };
    });
  } catch (err) {
    console.error('[Embeddings] Distributor vector search failed:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Build rich text for a wholesale product (includes wholesale price + MOQ)
// ─────────────────────────────────────────────────────────────────────────────
function buildWholesaleProductText(product) {
  const base = buildProductText(product);

  let wholesalePriceText = '';
  try {
    const prices = typeof product.prices === 'string' ? JSON.parse(product.prices) : (product.prices || {});
    if (prices.DISTRIBUTOR) wholesalePriceText = `wholesale price Rs ${Number(prices.DISTRIBUTOR).toLocaleString()} PKR`;
  } catch (_) {}

  const moq     = product.min_wholesale_qty ? `minimum order ${product.min_wholesale_qty} units` : '';
  const discount = product.max_discount      ? `maximum discount ${product.max_discount}%`         : '';

  return [base, wholesalePriceText, moq, discount].filter(Boolean).join('. ');
}

module.exports = {
  generateEmbedding,
  buildProductText,
  buildWholesaleProductText,
  upsertProductEmbedding,
  vectorSearchProducts,
  vectorSearchWholesaleProducts,
  backfillEmbeddings,
  isEmbedModelAvailable,
};
