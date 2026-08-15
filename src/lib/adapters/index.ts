import { createRealCardAdapter, type CardAdapter } from "./card";
import { createRealDiscoveryAdapter, type DiscoveryAdapter } from "./discovery";
import { createRealCheckoutAdapter, type CheckoutAdapter } from "./checkout";
import { createOpenAIAgentAdapter, type AgentAdapter } from "./agent";
import { isEnvSet } from "../env";

let _cardAdapter: CardAdapter | null = null;
let _discoveryAdapter: DiscoveryAdapter | null = null;
let _checkoutAdapter: CheckoutAdapter | null = null;
let _agentAdapter: AgentAdapter | null = null;

export function getCardAdapter(): CardAdapter {
  if (_cardAdapter) return _cardAdapter;
  if (!isEnvSet(process.env.RAIN_API_KEY) || !isEnvSet(process.env.RAIN_USER_ID)) {
    throw new Error(
      "Rain is not configured — set RAIN_API_KEY and RAIN_USER_ID for live scoped cards.",
    );
  }
  console.log("[adapters] Live Rain card adapter");
  _cardAdapter = createRealCardAdapter();
  return _cardAdapter;
}

export function getDiscoveryAdapter(): DiscoveryAdapter {
  if (_discoveryAdapter) return _discoveryAdapter;
  // Always live: UCP global catalog needs no credentials.
  console.log("[adapters] Live Shopify product search (UCP global catalog)");
  _discoveryAdapter = createRealDiscoveryAdapter();
  return _discoveryAdapter;
}

export function getCheckoutAdapter(): CheckoutAdapter {
  if (_checkoutAdapter) return _checkoutAdapter;
  console.log("[adapters] Live Shopify checkout adapter");
  _checkoutAdapter = createRealCheckoutAdapter();
  return _checkoutAdapter;
}

export function getAgentAdapter(): AgentAdapter {
  if (_agentAdapter) return _agentAdapter;
  if (!isEnvSet(process.env.OPENAI_API_KEY)) {
    throw new Error(
      "OPENAI_API_KEY is not configured — required for the live agent intent parser.",
    );
  }
  console.log("[adapters] Live OpenAI intent parser");
  _agentAdapter = createOpenAIAgentAdapter();
  return _agentAdapter;
}
