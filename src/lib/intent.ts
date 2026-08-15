import type { BuyerIntent, ParsedIntent } from "./types";
import { isEnvSet } from "./env";

export async function parseBuyerIntent(buyerMessage: string): Promise<BuyerIntent> {
  if (!isEnvSet(process.env.OPENAI_API_KEY)) {
    throw new Error(
      "OPENAI_API_KEY is not configured — required for live intent parsing (no mock fallback).",
    );
  }

  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an intent parser for an escrow commerce system. Parse the buyer's message into structured fields.

Return ONLY a JSON object with these exact fields:
- productQuery: what product they want to buy
- targetStore: which store they want to buy from (if specified)
- maxAmount: maximum amount they're willing to pay (as number, null if not specified)
- releaseCondition: condition for releasing payment (e.g., "delivery", "pickup", specific timeframe)

Handle vague input gracefully - make reasonable assumptions and mark uncertain fields as null.
If the amount is unclear, set maxAmount to null.
If no release condition is specified, default to "delivery".`,
      },
      { role: "user", content: `Parse this buyer message: "${buyerMessage}"` },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}") as Partial<BuyerIntent>;
  return {
    productQuery: parsed.productQuery || null,
    targetStore: parsed.targetStore || null,
    maxAmount: parsed.maxAmount || null,
    releaseCondition: parsed.releaseCondition || "delivery",
  };
}

export function toParsedIntent(intent: BuyerIntent): ParsedIntent {
  const condition = (intent.releaseCondition || "delivery").toLowerCase();
  let releaseCondition = "on_delivery";
  if (condition.includes("inspect") || condition.includes("review")) {
    releaseCondition = "on_inspection";
  } else if (condition.includes("pickup")) {
    releaseCondition = "on_pickup";
  }

  return {
    query: intent.productQuery || "product",
    budget: intent.maxAmount ?? 130,
    releaseCondition,
  };
}
