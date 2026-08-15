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
    throw new Error('Failed to parse buyer intent');
  }
}

module.exports = { parse };