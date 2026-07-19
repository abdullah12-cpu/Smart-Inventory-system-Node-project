const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createProductInDb } = require('./operations');

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
            }
          }

          return res.json({
            success: true,
            ai_message: choice.message.content
          });
        }
      }
    } catch (ollamaErr) {
      // Local Ollama is not active, fallback to cloud APIs
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
