import type { ParsedIntent } from "../types";

export interface AgentAdapter {
  parseIntent(message: string): Promise<ParsedIntent>;
}

export function createMockAgentAdapter(): AgentAdapter {
  return {
    async parseIntent(message: string): Promise<ParsedIntent> {
      const lower = message.toLowerCase();
      let budget = 130;
      const budgetMatch = lower.match(/under\s*\$?(\d+)/);
      if (budgetMatch) budget = parseInt(budgetMatch[1], 10);
      const priceMatch = lower.match(/\$(\d+)/);
      if (!budgetMatch && priceMatch) budget = parseInt(priceMatch[1], 10);

      let releaseCondition = "on_delivery";
      if (lower.includes("on arrival") || lower.includes("when it arrives")) {
        releaseCondition = "on_delivery";
      }
      if (lower.includes("on inspection") || lower.includes("after review")) {
        releaseCondition = "on_inspection";
      }

      const stopwords = new Set(["a", "an", "the", "i", "me", "my", "want", "need", "find", "buy", "get", "looking", "for", "under", "pay", "on", "delivery", "when", "it", "arrives", "matte", "and", "with", "that", "is", "in"]);
      const queryWords = lower
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 1 && !stopwords.has(w) && !/^\d+$/.test(w));

      const query = queryWords.slice(0, 5).join(" ") || "task lamp";

      return { query, budget, releaseCondition };
    },
  };
}
