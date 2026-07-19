const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createProductInDb, deleteProductFromDb, updateProductInDb, bulkUpdateProductsInDb, searchProductsInDb, getCategoryProductsFromDb, getLowStockProductsFromDb } = require('./operations');

async function handleLocalFallback(pool, message, res) {
  const lower = message.toLowerCase();
  if (lower.includes('add product') || lower.includes('create product')) {
    const nameMatch = message.match(/(?:product|name):\s*([^,]+)/i);
    const catMatch = message.match(/category:\s*([^,]+)/i);
    const priceMatch = message.match(/price:\s*(\d+)/i);
    const stockMatch = message.match(/(?:stock|qty):\s*(\d+)/i);

    if (nameMatch && catMatch && priceMatch && stockMatch) {
      const args = {
        name: nameMatch[1].trim(),
        category: catMatch[1].trim(),
        price: parseFloat(priceMatch[1]),
        stock: parseInt(stockMatch[1])
      };
      try {
        const newProduct = await createProductInDb(pool, args);
        return res.json({
          success: true,
          action_executed: 'createProduct',
          ai_message: `✅ Created: **${args.name}** (${args.category}). Price: Rs ${args.price.toLocaleString()}, Stock: ${args.stock}. SKU: ${newProduct.sku}. *(Local fallback)*`,
          product: newProduct
        });
      } catch (err) {
        console.error('Error inserting product locally:', err);
        return res.status(500).json({ success: false, message: 'Database error during local fallback creation.' });
      }
    }
  }

  return res.json({
    success: true,
    ai_message: `Please set MISTRAL_API_KEY, GEMINI_API_KEY or OPENAI_API_KEY environment variables to use live AI. Or type: "Add product: [Name], category: [Cat], price: [Rs], stock: [Qty]"`
  });
}

function registerCopilotRoutes(app, pool) {
  app.post('/api/copilot/chat', async (req, res) => {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message payload is required.' });
    }

    const mistralKey = process.env.MISTRAL_API_KEY || 't2d7sL1xG1bmzcPP9avwhHXyq6lMppSH';
    const openaiKey = process.env.OPENAI_API_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY || '';

    // 0. Try local Ollama model first if running on local system
    try {
      const probeRes = await fetch('http://localhost:11434/api/tags');
      if (probeRes.ok) {
        const probeData = await probeRes.json();
        const models = probeData.models || [];
        let modelName = 'qwen2.5:3b';
        if (models.length > 0) {
          const hasQwen = models.some(m => m.name.startsWith('qwen2.5:3b'));
          if (!hasQwen) {
            modelName = models[0].name;
          }
        }

        const messages = [
          {
            role: 'system',
            content: 'You are CIQ Admin Copilot. You are strictly restricted to performing and discussing the operations defined in operations.js (currently, only product creation via the \'createProduct\' tool is supported). If the user asks generic questions, conversational prompts, or attempts tasks outside this scope, you must decline to answer, stating: "I can only assist with the registered operations: product catalog creation." Keep your answers extremely minimalistic, short, direct, and strictly within the catalog context. Do not add conversational fluff.'
          },
          ...(history || []).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          })),
          {
            role: 'user',
            content: message
          }
        ];

        const response = await fetch('http://localhost:11434/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            messages: messages,
            tools: [
              {
                type: 'function',
                function: {
                  name: 'createProduct',
                  description: 'Creates a new SKU catalog product and registers it in database inventory.',
                  parameters: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Product Name' },
                      category: { type: 'string', description: 'Catalog Category' },
                      price: { type: 'number', description: 'Selling price in PKR' },
                      stock: { type: 'integer', description: 'Initial stock units' }
                    },
                    required: ['name', 'category', 'price', 'stock']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'deleteProduct',
                  description: 'Deletes a product by its name or SKU.',
                  parameters: {
                    type: 'object',
                    properties: {
                      identifier: { type: 'string', description: 'Product Name or SKU to delete' }
                    },
                    required: ['identifier']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'updateProduct',
                  description: 'Updates specific fields of an existing individual product. Do NOT use this to rename an entire category.',
                  parameters: {
                    type: 'object',
                    properties: {
                      identifier: { type: 'string', description: 'Product Name or SKU to update' },
                      new_name: { type: 'string' },
                      new_category: { type: 'string' },
                      new_brand: { type: 'string' },
                      new_price: { type: 'number', description: 'New buyer/retail price' },
                      new_distributor_price: { type: 'number', description: 'New wholesale price' },
                      stock_adjustment: { type: 'integer', description: 'Amount to add/subtract from stock' }
                    },
                    required: ['identifier']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'bulkUpdateProducts',
                  description: 'Performs bulk updates on products matching a category or brand. Use this to explicitly rename an entire category or brand.',
                  parameters: {
                    type: 'object',
                    properties: {
                      category_filter: { type: 'string', description: 'Category to target (e.g. Networking)' },
                      brand_filter: { type: 'string', description: 'Brand to target' },
                      price_percentage_change: { type: 'number', description: 'Percentage to change retail prices (e.g., 5 for +5%)' },
                      distributor_price_percentage_change: { type: 'number', description: 'Percentage to change distributor prices' },
                      new_status: { type: 'string', description: 'New status for all matched products' },
                      new_category: { type: 'string', description: 'New category for all matched products' },
                      new_brand: { type: 'string', description: 'New brand for all matched products' }
                    }
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'readProductData',
                  description: 'Searches the database to read, check stock, or list products. Use this BEFORE updating/deleting if you are unsure.',
                  parameters: {
                    type: 'object',
                    properties: {
                      action_type: { type: 'string', enum: ['search', 'browse_category', 'low_stock'], description: 'Use "search" for specific products (even if asking for stock), "browse_category" for a whole category, and "low_stock" ONLY to list all globally low items.' },
                      identifier: { type: 'string', description: 'Product Name or SKU to search for (if action_type is search)' },
                      category: { type: 'string', description: 'Category to browse (if action_type is browse_category)' }
                    },
                    required: ['action_type']
                  }
                }
              }
            ],
            tool_choice: 'auto'
          })
        });

        if (response.ok) {
          const data = await response.json();
          const choice = data.choices[0];
          const toolCalls = choice.message.tool_calls;

          if (toolCalls && toolCalls.length > 0) {
            const toolCall = toolCalls[0];
            if (toolCall.function.name === 'createProduct') {
              const args = JSON.parse(toolCall.function.arguments);
              const newProduct = await createProductInDb(pool, args);
              return res.json({
                success: true,
                action_executed: 'createProduct',
                ai_message: `✅ Created: **${args.name}** (${args.category}). Price: Rs ${args.price.toLocaleString()}, Stock: ${args.stock}. SKU: ${newProduct.sku}. *(Local Ollama Model: ${modelName})*`,
                product: newProduct
              });
            } else if (toolCall.function.name === 'deleteProduct') {
              const args = JSON.parse(toolCall.function.arguments);
              try {
                const deleted = await deleteProductFromDb(pool, args.identifier);
                return res.json({
                  success: true,
                  action_executed: 'deleteProduct',
                  ai_message: `✅ Deleted product: **${deleted.product_name}** (SKU: ${deleted.sku}). *(Local Ollama Model: ${modelName})*`
                });
              } catch (err) {
                return res.json({ success: true, ai_message: `❌ Could not find or delete product matching: "${args.identifier}"` });
              }
            } else if (toolCall.function.name === 'updateProduct') {
              const args = JSON.parse(toolCall.function.arguments);
              try {
                const updated = await updateProductInDb(pool, args.identifier, args);
                return res.json({
                  success: true,
                  action_executed: 'updateProduct',
                  ai_message: `✅ Updated product: **${updated.product_name}**. (Edits applied successfully) *(Local Ollama Model: ${modelName})*`
                });
              } catch (err) {
                return res.json({ success: true, ai_message: `❌ Could not update product matching: "${args.identifier}"` });
              }
            } else if (toolCall.function.name === 'bulkUpdateProducts') {
              const args = JSON.parse(toolCall.function.arguments);
              try {
                const count = await bulkUpdateProductsInDb(pool, args.category_filter, args.brand_filter, args);
                return res.json({
                  success: true,
                  action_executed: 'bulkUpdateProducts',
                  ai_message: `✅ Bulk operation completed: Successfully modified **${count}** products matching your criteria. *(Local Ollama Model: ${modelName})*`
                });
              } catch (err) {
                return res.json({ success: true, ai_message: `❌ Failed to execute bulk update.` });
              }
            } else if (toolCall.function.name === 'readProductData') {
              let args;
              try {
                args = JSON.parse(toolCall.function.arguments);
              } catch (e) {
                return res.json({ success: true, ai_message: `❌ Ollama returned invalid JSON for arguments: ${toolCall.function.arguments}` });
              }
              try {
                let markdownMsg = '';
                if (args.action_type === 'low_stock') {
                  const rows = await getLowStockProductsFromDb(pool);
                  if (rows.length === 0) markdownMsg = '✅ All products have sufficient stock.';
                  else {
                    markdownMsg = '### 📉 Low Stock Products\n\n| Product | SKU | Stock | Threshold |\n|---|---|---|---|\n' + 
                      rows.map(r => {
                        const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
                        const stock = inv && inv.length > 0 ? inv[0].available_quantity : 0;
                        return `| ${r.product_name} | ${r.sku} | **${stock}** | ${r.low_stock_threshold} |`;
                      }).join('\n');
                  }
                } else if (args.action_type === 'browse_category' && args.category) {
                  const rows = await getCategoryProductsFromDb(pool, args.category);
                  if (rows.length === 0) markdownMsg = `❌ No products found in category: "${args.category}"`;
                  else {
                    markdownMsg = `### 📂 Category: ${args.category}\n\n| Product | Price | Stock |\n|---|---|---|\n` + 
                      rows.map(r => {
                        const prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices;
                        const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
                        const stock = inv && inv.length > 0 ? inv[0].available_quantity : 0;
                        return `| ${r.product_name} | Rs ${prices.RETAIL?.toLocaleString() || 0} | ${stock} |`;
                      }).join('\n');
                  }
                } else {
                  const rows = await searchProductsInDb(pool, args.identifier || '');
                  if (rows.length === 0) markdownMsg = `❌ Could not find product matching: "${args.identifier}"`;
                  else {
                    markdownMsg = `### 🔍 Search Results\n\n| Product | SKU | Price | Stock |\n|---|---|---|---|\n` + 
                      rows.map(r => {
                        const prices = typeof r.prices === 'string' ? JSON.parse(r.prices) : r.prices;
                        const inv = typeof r.inventory === 'string' ? JSON.parse(r.inventory) : r.inventory;
                        const stock = inv && inv.length > 0 ? inv[0].available_quantity : 0;
                        return `| ${r.product_name} | ${r.sku} | Rs ${prices.RETAIL?.toLocaleString() || 0} | ${stock} |`;
                      }).join('\n');
                  }
                }
                return res.json({ success: true, action_executed: 'readProductData', ai_message: markdownMsg + `\n\n*(Local Ollama Model: ${modelName})*` });
              } catch (err) {
                console.error("Error in readProductData:", err);
                return res.json({ success: true, ai_message: `❌ Failed to read product data: ${err.message}` });
              }
            }
          }

          return res.json({
            success: true,
            ai_message: choice.message.content
          });
        }
      }
    } catch (ollamaErr) {
      if (ollamaErr.code === 'ECONNREFUSED' || (ollamaErr.message && ollamaErr.message.includes('fetch'))) {
        // Local Ollama is not active, fallback to cloud APIs
      } else {
        console.error('Ollama Execution Error:', ollamaErr);
        return res.json({ success: true, ai_message: `❌ Ollama Agent Error: ${ollamaErr.message}` });
      }
    }

    // 1. Try Mistral AI if key is present
    if (mistralKey) {
      try {
        const messages = [
          {
            role: 'system',
            content: 'You are CIQ Admin Copilot. You are strictly restricted to performing and discussing the operations defined in operations.js (currently, only product creation via the \'createProduct\' tool is supported). If the user asks generic questions, conversational prompts, or attempts tasks outside this scope, you must decline to answer, stating: "I can only assist with the registered operations: product catalog creation." Keep your answers extremely minimalistic, short, direct, and strictly within the catalog context. Do not add conversational fluff.'
          },
          ...(history || []).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          })),
          {
            role: 'user',
            content: message
          }
        ];

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${mistralKey}`
          },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: messages,
            tools: [
              {
                type: 'function',
                function: {
                  name: 'createProduct',
                  description: 'Creates a new SKU catalog product and registers it in database inventory.',
                  parameters: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Product Name' },
                      category: { type: 'string', description: 'Catalog Category' },
                      price: { type: 'number', description: 'Selling price in PKR' },
                      stock: { type: 'integer', description: 'Initial stock units' }
                    },
                    required: ['name', 'category', 'price', 'stock']
                  }
                }
              }
            ],
            tool_choice: 'auto'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Mistral API responded with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices[0];
        const toolCalls = choice.message.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
          const toolCall = toolCalls[0];
          if (toolCall.function.name === 'createProduct') {
            const args = JSON.parse(toolCall.function.arguments);
            const newProduct = await createProductInDb(pool, args);
            return res.json({
              success: true,
              action_executed: 'createProduct',
              ai_message: `✅ Created: **${args.name}** (${args.category}). Price: Rs ${args.price.toLocaleString()}, Stock: ${args.stock}. SKU: ${newProduct.sku}.`,
              product: newProduct
            });
          }
        }

        return res.json({
          success: true,
          ai_message: choice.message.content
        });

      } catch (err) {
        console.error('Mistral Error:', err);
      }
    }

    // 2. Try OpenAI if key is present
    if (openaiKey) {
      try {
        const messages = [
          {
            role: 'system',
            content: 'You are CIQ Admin Copilot. You are strictly restricted to performing and discussing the operations defined in operations.js (currently, only product creation via the \'createProduct\' tool is supported). If the user asks generic questions, conversational prompts, or attempts tasks outside this scope, you must decline to answer, stating: "I can only assist with the registered operations: product catalog creation." Keep your answers extremely minimalistic, short, direct, and strictly within the catalog context. Do not add conversational fluff.'
          },
          ...(history || []).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          })),
          {
            role: 'user',
            content: message
          }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            tools: [
              {
                type: 'function',
                function: {
                  name: 'createProduct',
                  description: 'Creates a new SKU catalog product and registers it in database inventory.',
                  parameters: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Product Name' },
                      category: { type: 'string', description: 'Catalog Category' },
                      price: { type: 'number', description: 'Selling price in PKR' },
                      stock: { type: 'integer', description: 'Initial stock units' }
                    },
                    required: ['name', 'category', 'price', 'stock']
                  }
                }
              }
            ]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API responded with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices[0];
        const toolCalls = choice.message.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
          const toolCall = toolCalls[0];
          if (toolCall.function.name === 'createProduct') {
            const args = JSON.parse(toolCall.function.arguments);
            const newProduct = await createProductInDb(pool, args);
            return res.json({
              success: true,
              action_executed: 'createProduct',
              ai_message: `✅ Created: **${args.name}** (${args.category}). Price: Rs ${args.price.toLocaleString()}, Stock: ${args.stock}. SKU: ${newProduct.sku}.`,
              product: newProduct
            });
          }
        }

        return res.json({
          success: true,
          ai_message: choice.message.content
        });

      } catch (err) {
        console.error('OpenAI Error:', err);
      }
    }

    // 3. Try Gemini if key is present
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: 'You are CIQ Admin Copilot. You are strictly restricted to performing and discussing the operations defined in operations.js (currently, only product creation via the \'createProduct\' tool is supported). If the user asks generic questions, conversational prompts, or attempts tasks outside this scope, you must decline to answer, stating: "I can only assist with the registered operations: product catalog creation." Keep your answers extremely minimalistic, short, direct, and strictly within the catalog context. Do not add conversational fluff.',
        });

        const createProductTool = {
          name: 'createProduct',
          description: 'Creates a new SKU catalog product and registers it in database inventory.',
          parameters: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'Product Name' },
              category: { type: 'STRING', description: 'Catalog Category' },
              price: { type: 'NUMBER', description: 'Selling price in PKR' },
              stock: { type: 'INTEGER', description: 'Initial stock units' }
            },
            required: ['name', 'category', 'price', 'stock']
          }
        };

        const chatHistory = (history || []).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

        const chat = model.startChat({
          history: chatHistory,
          tools: [{ functionDeclarations: [createProductTool] }]
        });

        const result = await chat.sendMessage(message);
        const response = result.response;
        
        const calls = response.functionCalls;
        if (calls && calls.length > 0) {
          const call = calls[0];
          if (call.name === 'createProduct') {
            const args = call.args;
            const newProduct = await createProductInDb(pool, args);
            return res.json({
              success: true,
              action_executed: 'createProduct',
              ai_message: `✅ Created: **${args.name}** (${args.category}). Price: Rs ${args.price.toLocaleString()}, Stock: ${args.stock}. SKU: ${newProduct.sku}.`,
              product: newProduct
            });
          }
        }

        return res.json({
          success: true,
          ai_message: response.text()
        });

      } catch (err) {
        console.error('Generative AI Error:', err);
      }
    }

    // 4. Fallback locally if keys are not working
    return handleLocalFallback(pool, message, res);
  });
}

module.exports = { registerCopilotRoutes };
