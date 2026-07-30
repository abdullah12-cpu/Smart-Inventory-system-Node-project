/**
 * Enhanced Embeddings Module with Token Chunking Support
 * 
 * Adds chunking for:
 * - Long product descriptions
 * - Product catalogs
 * - Order history
 * - Conversation context
 */

const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text';
const EMBED_DIMS  = 768;

// Chunking configuration
const MAX_TOKENS_PER_CHUNK = 512;  // Conservative limit
const CHUNK_OVERLAP = 50;           // Token overlap between chunks

/**
 * Estimate token count (rough approximation)
 * Real tokenization would use the model's tokenizer
 */
function estimateTokenCount(text) {
  // Approximation: 1 token ≈ 4 characters (for English)
  // More accurate: use tiktoken or model-specific tokenizer
  return Math.ceil(text.length / 4);
}

/**
 * Split text into chunks with overlap
 */
function chunkText(text, maxTokens = MAX_TOKENS_PER_CHUNK, overlap = CHUNK_OVERLAP) {
  const words = text.split(/\s+/);
  const chunks = [];
  
  // Rough estimation: ~1.3 tokens per word on average
  const wordsPerChunk = Math.floor(maxTokens / 1.3);
  const overlapWords = Math.floor(overlap / 1.3);
  
  let start = 0;
  
  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length);
    const chunk = words.slice(start, end).join(' ');
    chunks.push(chunk);
    
    // Move start position with overlap
    start = end - overlapWords;
    
    // Prevent infinite loop
    if (start >= words.length - overlapWords) break;
  }
  
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Build product text with metadata
 */
function buildProductText(product, includeExtendedInfo = false) {
  const name     = product.product_name || product.name || '';
  const brand    = product.brand        || '';
  const category = product.category     || '';
  const desc     = product.short_description || product.description || '';
  const unit     = product.unit         || '';
  const weight   = product.weight       ? `${product.weight}kg` : '';

  let priceText = '';
  try {
    const prices = typeof product.prices === 'string'
      ? JSON.parse(product.prices)
      : (product.prices || {});
    if (prices.RETAIL) priceText = `retail price Rs ${Number(prices.RETAIL).toLocaleString()} PKR`;
    if (prices.DISTRIBUTOR && includeExtendedInfo) {
      priceText += `, wholesale Rs ${Number(prices.DISTRIBUTOR).toLocaleString()} PKR`;
    }
  } catch (_) {}

  const parts = [
    name,
    brand   ? `by ${brand}` : '',
    category ? `category ${category}` : '',
    desc,
    unit    ? `unit ${unit}` : '',
    weight  ? `weight ${weight}` : '',
    priceText,
  ].filter(Boolean);

  let baseText = parts.join('. ');

  // Add extended information if requested
  if (includeExtendedInfo) {
    if (product.specs) {
      baseText += `. Specifications: ${product.specs}`;
    }
    if (product.features) {
      baseText += `. Features: ${Array.isArray(product.features) ? product.features.join(', ') : product.features}`;
    }
  }

  return baseText;
}

/**
 * Generate embedding with automatic chunking for long text
 */
async function generateEmbedding(text, useChunking = false) {
  const tokenCount = estimateTokenCount(text);

  // If text is short enough, embed directly
  if (!useChunking || tokenCount <= MAX_TOKENS_PER_CHUNK) {
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
    const vector = data.embeddings?.[0] ?? data.embedding;
    
    if (!Array.isArray(vector) || vector.length !== EMBED_DIMS) {
      throw new Error(`Unexpected embedding shape: got ${vector?.length ?? 'null'} dims, expected ${EMBED_DIMS}`);
    }

    return vector;
  }

  // For long text, chunk and average embeddings
  console.log(`[Embeddings] Text is ${tokenCount} tokens, chunking into segments...`);
  
  const chunks = chunkText(text, MAX_TOKENS_PER_CHUNK, CHUNK_OVERLAP);
  console.log(`[Embeddings] Created ${chunks.length} chunks`);

  const chunkEmbeddings = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const res = await fetch(`${OLLAMA_BASE}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBED_MODEL, input: chunk })
    });

    if (!res.ok) {
      console.warn(`[Embeddings] Chunk ${i + 1} failed, skipping`);
      continue;
    }

    const data = await res.json();
    const vector = data.embeddings?.[0] ?? data.embedding;
    
    if (Array.isArray(vector) && vector.length === EMBED_DIMS) {
      chunkEmbeddings.push(vector);
    }

    // Small delay to avoid overwhelming Ollama
    await new Promise(r => setTimeout(r, 100));
  }

  if (chunkEmbeddings.length === 0) {
    throw new Error('Failed to generate embeddings for any chunk');
  }

  // Average all chunk embeddings
  const avgEmbedding = new Array(EMBED_DIMS).fill(0);
  
  for (const embedding of chunkEmbeddings) {
    for (let i = 0; i < EMBED_DIMS; i++) {
      avgEmbedding[i] += embedding[i];
    }
  }

  // Normalize
  for (let i = 0; i < EMBED_DIMS; i++) {
    avgEmbedding[i] /= chunkEmbeddings.length;
  }

  console.log(`[Embeddings] ✅ Averaged ${chunkEmbeddings.length} chunk embeddings`);

  return avgEmbedding;
}

/**
 * Generate embeddings for conversation history with chunking
 */
async function generateConversationEmbedding(messages, maxMessages = 10) {
  // Take last N messages
  const recentMessages = messages.slice(-maxMessages);
  
  // Build conversation text
  const conversationText = recentMessages
    .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
    .join('\n');

  const tokenCount = estimateTokenCount(conversationText);
  console.log(`[Embeddings] Conversation: ${tokenCount} tokens`);

  // Use chunking if conversation is long
  return generateEmbedding(conversationText, tokenCount > MAX_TOKENS_PER_CHUNK);
}

/**
 * Generate embeddings for order history
 */
async function generateOrderHistoryEmbedding(orders) {
  const orderTexts = orders.map(order => {
    const items = Array.isArray(order.items) 
      ? order.items.map(item => `${item.name || item.product_name} x${item.qty || item.quantity}`).join(', ')
      : 'No items';
    
    return `Order ${order.order_number}: ${items}. Status: ${order.status}. Total: Rs ${order.total_amount}. Date: ${order.order_date}`;
  });

  const orderHistoryText = orderTexts.join('. ');
  const tokenCount = estimateTokenCount(orderHistoryText);

  console.log(`[Embeddings] Order history: ${tokenCount} tokens across ${orders.length} orders`);

  return generateEmbedding(orderHistoryText, tokenCount > MAX_TOKENS_PER_CHUNK);
}

/**
 * Upsert product embedding with chunking support
 */
async function upsertProductEmbedding(pool, product, useExtendedInfo = false) {
  const productId = product.product_id;
  if (!productId) {
    console.warn('[Embeddings] Skipping upsert — no product_id on product:', product.product_name);
    return;
  }

  try {
    const text = buildProductText(product, useExtendedInfo);
    const tokenCount = estimateTokenCount(text);
    
    console.log(`[Embeddings] Product "${product.product_name}": ~${tokenCount} tokens`);
    
    // Use chunking if product text is long
    const vector = await generateEmbedding(text, tokenCount > MAX_TOKENS_PER_CHUNK);
    const vectorLiteral = `[${vector.join(',')}]`;

    await pool.query(
      `UPDATE products SET embedding = $1 WHERE product_id = $2`,
      [vectorLiteral, productId]
    );

    console.log(`[Embeddings] ✅ Stored embedding for: "${product.product_name}" (${productId})`);
  } catch (err) {
    console.error(`[Embeddings] ⚠️  Failed to embed "${product.product_name}": ${err.message}`);
  }
}

/**
 * Enhanced vector search with query expansion
 */
async function vectorSearchProducts(pool, query, opts = {}) {
  const {
    limit      = 15,
    max_price  = null,
    min_price  = null,
    category   = null,
    brand      = null,
    threshold  = 0.25,
  } = opts;

  let queryVector;
  try {
    const tokenCount = estimateTokenCount(query);
    console.log(`[Embeddings] Query: "${query}" (~${tokenCount} tokens)`);
    
    queryVector = await generateEmbedding(query, tokenCount > MAX_TOKENS_PER_CHUNK);
  } catch (err) {
    console.error('[Embeddings] Query embedding failed:', err.message);
    return [];
  }

  const vectorLiteral = `[${queryVector.join(',')}]`;
  const conditions = [`status = 'ACTIVE'`, `embedding IS NOT NULL`];
  const params = [vectorLiteral];
  let idx = 2;

  if (max_price !== null) { conditions.push(`(prices->>'RETAIL')::numeric <= $${idx}`); params.push(max_price); idx++; }
  if (min_price !== null) { conditions.push(`(prices->>'RETAIL')::numeric >= $${idx}`); params.push(min_price); idx++; }
  if (category) { conditions.push(`LOWER(category) LIKE $${idx}`); params.push(`%${category.toLowerCase()}%`); idx++; }
  if (brand) { conditions.push(`LOWER(brand) LIKE $${idx}`); params.push(`%${brand.toLowerCase()}%`); idx++; }

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
      let prices = {};
      let inventory = [];
      try { prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices || {}; } catch (_) {}
      try { inventory = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory || []; } catch (_) {}

      const availableStock = inventory.reduce((sum, i) => sum + (i.available_quantity || i.quantity || 0), 0);

      return {
        product_id: r.product_id,
        sku: r.sku,
        product_name: r.product_name,
        short_description: r.short_description || '',
        brand: r.brand,
        category: r.category,
        retail_price: prices.RETAIL !== undefined ? parseFloat(prices.RETAIL) : 0,
        image_url: r.image_url,
        available_stock: availableStock,
        inventory,
        similarity: parseFloat(r.similarity).toFixed(3)
      };
    });
  } catch (err) {
    console.error('[Embeddings] Vector search query failed:', err.message);
    return [];
  }
}

module.exports = {
  generateEmbedding,
  generateConversationEmbedding,
  generateOrderHistoryEmbedding,
  buildProductText,
  upsertProductEmbedding,
  vectorSearchProducts,
  estimateTokenCount,
  chunkText,
  // Configuration
  MAX_TOKENS_PER_CHUNK,
  CHUNK_OVERLAP
};
