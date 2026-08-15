import type { ParsedIntent } from "../types";
import { parseBuyerIntent, toParsedIntent } from "../intent";

export interface AgentAdapter {
  parseIntent(message: string): Promise<ParsedIntent>;
}

export function createOpenAIAgentAdapter(): AgentAdapter {
  return {
    async parseIntent(message: string): Promise<ParsedIntent> {
      const intent = await parseBuyerIntent(message);
      return toParsedIntent(intent);
    },
  };
}

