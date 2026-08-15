const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Parse buyer's natural language message into structured intent
 * @param {string} buyerMessage - The buyer's natural language input
 * @returns {Object} Parsed intent with productQuery, targetStore, maxAmount, releaseCondition
 */
async function parse(buyerMessage) {
  try {
    // Check if we have a valid OpenAI API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-act') || process.env.OPENAI_API_KEY.includes('test-key')) {
      console.log('Using mock intent parser (no valid OpenAI API key)');
      return mockParse(buyerMessage);
    }

    const systemPrompt = `You are an intent parser for an escrow commerce system. Parse the buyer's message into structured fields.
  
  Return ONLY a JSON object with these exact fields:
  - productQuery: what product they want to buy
  - targetStore: which store they want to buy from (if specified)
  - maxAmount: maximum amount they're willing to pay (as number, null if not specified)
  - releaseCondition: condition for releasing payment (e.g., "delivery", "pickup", specific timeframe)
  
  Handle vague input gracefully - make reasonable assumptions and mark uncertain fields as null.
  If the amount is unclear, set maxAmount to null.
  If no release condition is specified, default to "delivery".`;

    const userPrompt = `Parse this buyer message: "${buyerMessage}"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    
    // Validate and sanitize
    return {
      productQuery: parsed.productQuery || null,
      targetStore: parsed.targetStore || null,
      maxAmount: parsed.maxAmount || null,
      releaseCondition: parsed.releaseCondition || "delivery"
    };

  } catch (error) {
    console.error('Intent parsing error:', error);
    // Fallback to mock parser if API call fails
    console.log('Falling back to mock intent parser due to API error');
    return mockParse(buyerMessage);
  }
}

/**
 * Mock intent parser for testing without OpenAI API
 * @param {string} buyerMessage - The buyer's natural language input
 * @returns {Object} Parsed intent with best-guess structured fields
 */
function mockParse(buyerMessage) {
  const message = buyerMessage.toLowerCase();
  
  // Extract product (simple keyword extraction)
  const productKeywords = ['wireless headset', 'headset', 'phone', 'laptop', 'watch', 'shoes', 'shirt', 'book'];
  let productQuery = null;
  for (const keyword of productKeywords) {
    if (message.includes(keyword)) {
      productQuery = keyword;
      break;
    }
  }
  if (!productQuery) {
    // Fallback to first few meaningful words
    const words = message.split(' ').filter(w => w.length > 3);
    productQuery = words.slice(0, 2).join(' ') || 'unknown product';
  }

  // Extract store
  const storeKeywords = ['techstore', 'amazon', 'ebay', 'walmart', 'target', 'best buy'];
  let targetStore = null;
  for (const store of storeKeywords) {
    if (message.includes(store)) {
      targetStore = store;
      break;
    }
  }

  // Extract amount
  const amountMatch = message.match(/\$?(\d+)/);
  const maxAmount = amountMatch ? parseFloat(amountMatch[1]) : null;

  // Extract release condition
  let releaseCondition = 'delivery';
  if (message.includes('pickup')) releaseCondition = 'pickup';
  if (message.includes('delivery')) releaseCondition = 'delivery';

  return {
    productQuery,
    targetStore,
    maxAmount,
    releaseCondition
  };
}

module.exports = { parse };
