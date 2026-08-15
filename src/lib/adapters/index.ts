import { createMockCardAdapter, type CardAdapter } from "./card";
import { createMockDiscoveryAdapter, type DiscoveryAdapter } from "./discovery";
import { createMockCheckoutAdapter, type CheckoutAdapter } from "./checkout";
import { createMockAgentAdapter, type AgentAdapter } from "./agent";

const useMocks = process.env.USE_MOCKS !== "false";

let _cardAdapter: CardAdapter | null = null;
let _discoveryAdapter: DiscoveryAdapter | null = null;
let _checkoutAdapter: CheckoutAdapter | null = null;
let _agentAdapter: AgentAdapter | null = null;

export function getCardAdapter(): CardAdapter {
  if (_cardAdapter) return _cardAdapter;
  if (useMocks || !process.env.RAIN_API_KEY) {
    console.log("[adapters] Using mock card adapter");
    _cardAdapter = createMockCardAdapter();
  } else {
    console.log("[adapters] Using REAL Rain card adapter");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createRealCardAdapter } = require("./card-real");
    _cardAdapter = createRealCardAdapter();
  }
  return _cardAdapter;
}

export function getDiscoveryAdapter(): DiscoveryAdapter {
  if (_discoveryAdapter) return _discoveryAdapter;
  if (useMocks || !process.env.SHOPIFY_STORE_DOMAIN) {
    console.log("[adapters] Using mock discovery adapter");
    _discoveryAdapter = createMockDiscoveryAdapter();
  } else {
    console.log("[adapters] Using REAL Shopify UCP Catalog discovery adapter");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createRealDiscoveryAdapter } = require("./discovery");
    _discoveryAdapter = createRealDiscoveryAdapter();
  }
  return _discoveryAdapter;
}

export function getCheckoutAdapter(): CheckoutAdapter {
  if (_checkoutAdapter) return _checkoutAdapter;
  if (useMocks || !process.env.SHOPIFY_ADMIN_TOKEN) {
    console.log("[adapters] Using mock checkout adapter");
    _checkoutAdapter = createMockCheckoutAdapter();
  } else {
    console.log("[adapters] Using REAL Shopify Admin API checkout adapter");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createRealCheckoutAdapter } = require("./checkout");
    _checkoutAdapter = createRealCheckoutAdapter();
  }
  return _checkoutAdapter;
}

export function getAgentAdapter(): AgentAdapter {
  if (_agentAdapter) return _agentAdapter;
  // TODO: swap in real Anthropic agent when ANTHROPIC_API_KEY is set
  _agentAdapter = createMockAgentAdapter();
  return _agentAdapter;
}
