import type { Product } from "../types";

export interface DiscoveryAdapter {
  searchProducts(query: string, budget: number): Promise<Product[]>;
}

// ---------------------------------------------------------------------------
// Mock — seeded catalog, identical shape to what the UI expects.
// ---------------------------------------------------------------------------

const CATALOG: Product[] = [
  { id: "prod_1", name: "Matte Black Task Lamp", meta: "Adjustable · LED · 18\"H", price: 119.00, thumbSeed: "lamp-black", category: "lighting" },
  { id: "prod_2", name: "Brass Desk Lamp", meta: "Warm tone · E26 · 16\"H", price: 89.00, thumbSeed: "lamp-brass", category: "lighting" },
  { id: "prod_3", name: "Ceramic Table Lamp", meta: "Speckled white · Linen shade", price: 125.00, thumbSeed: "lamp-ceramic", category: "lighting" },
  { id: "prod_4", name: "Walnut Desk Organizer", meta: "Natural finish · 12\"", price: 89.00, thumbSeed: "organizer", category: "desk" },
  { id: "prod_5", name: "Ceramic Pour-Over Set", meta: "Matte white · 350ml", price: 64.00, thumbSeed: "pourover", category: "kitchen" },
  { id: "prod_6", name: "Linen Throw Blanket", meta: "Oat · 50×70\"", price: 78.00, thumbSeed: "blanket", category: "textile" },
  { id: "prod_7", name: "Concrete Planter", meta: "Charcoal · 6\" diameter", price: 42.00, thumbSeed: "planter", category: "garden" },
  { id: "prod_8", name: "Oak Wall Shelf", meta: "Floating mount · 24\"", price: 95.00, thumbSeed: "shelf", category: "furniture" },
];

function scoreProduct(product: Product, queryTerms: string[]): number {
  const text = `${product.name} ${product.meta} ${product.category}`.toLowerCase();
  let score = 0;
  for (const term of queryTerms) {
    if (text.includes(term)) score += 1;
  }
  return score;
}

export function createMockDiscoveryAdapter(): DiscoveryAdapter {
  return {
    async searchProducts(query: string, budget: number): Promise<Product[]> {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      const scored = CATALOG
        .filter((p) => p.price <= budget)
        .map((p) => ({ product: p, score: scoreProduct(p, terms) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
      return scored.map((s) => s.product);
    },
  };
}

// ---------------------------------------------------------------------------
// Real — Shopify UCP Catalog MCP (JSON-RPC 2.0 over HTTP POST)
//
// Endpoint:  POST https://{SHOPIFY_STORE_DOMAIN}/api/ucp/mcp
// Headers:   Content-Type: application/json  (no auth header needed)
// Agent identity goes inside arguments.meta, NOT as a header.
//
// Confirmed request shape:
// {
//   "jsonrpc": "2.0",
//   "method": "tools/call",
//   "id": 1,
//   "params": {
//     "name": "search_catalog",
//     "arguments": {
//       "meta": { "ucp-agent": { "profile": "<agent-profile-url>" } },
//       "catalog": {
//         "query": "<string>",
//         "filters": { "price": { "max": <cents> }, "available": true },
//         "context": { "address_country": "US" },
//         "pagination": { "limit": 5 }
//       }
//     }
//   }
// }
//
// Price is in CENTS — $130.00 = 13000. Convert budget (dollars) before sending.
// The agent profile URL can be SHOPIFY_AGENT_PROFILE_URL or the Shopify example URL.
//
// Response shape: MCP content array — result.content[0].text is a JSON string.
// TODO: confirm exact field names in each product object returned by search_catalog.
// ---------------------------------------------------------------------------

// Shopify's public example agent profile — works without hosting anything.
const DEFAULT_AGENT_PROFILE =
  "https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json";

interface UCPProduct {
  id: string;
  title: string;
  description?: string;
  // TODO: confirm exact price field shape in search_catalog response
  priceRange?: {
    minVariantPrice?: { amount: string; currencyCode: string };
  };
  featuredImage?: { url: string; altText?: string };
  variants?: { edges: Array<{ node: { id: string; price: { amount: string } } }> };
}

function mapUCPProduct(p: UCPProduct, index: number): Product {
  // Price comes back in dollars as a string (e.g. "119.00") from priceRange,
  // or cents from the filters — use priceRange.minVariantPrice as canonical.
  const priceStr =
    p.priceRange?.minVariantPrice?.amount ??
    p.variants?.edges?.[0]?.node?.price?.amount ??
    "0";
  const price = parseFloat(priceStr);

  return {
    id: p.id,
    name: p.title,
    meta: p.description?.slice(0, 60) ?? "",
    price,
    thumbSeed: `ucp-${index}`,
    category: "general",
  };
}

export function createRealDiscoveryAdapter(): DiscoveryAdapter {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const agentProfileUrl =
    process.env.SHOPIFY_AGENT_PROFILE_URL || DEFAULT_AGENT_PROFILE;

  if (!storeDomain) {
    throw new Error("SHOPIFY_STORE_DOMAIN must be set for real discovery adapter");
  }

  const endpoint = `https://${storeDomain}/api/ucp/mcp`;

  return {
    async searchProducts(query: string, budget: number): Promise<Product[]> {
      // Budget arrives in dollars; UCP price filter expects cents.
      const budgetCents = Math.round(budget * 100);

      const body = {
        jsonrpc: "2.0",
        method: "tools/call",
        id: 1,
        params: {
          name: "search_catalog",
          arguments: {
            meta: {
              "ucp-agent": { profile: agentProfileUrl },
            },
            catalog: {
              query,
              filters: {
                price: { max: budgetCents },
                available: true,
              },
              context: { address_country: "US" },
              pagination: { limit: 5 },
            },
          },
        },
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(
          `UCP Catalog MCP search_catalog failed: ${res.status} ${await res.text()}`
        );
      }

      const json = await res.json() as {
        jsonrpc: string;
        id: number;
        result?: {
          content?: Array<{ type: string; text: string }>;
        };
        error?: { code: number; message: string };
      };

      if (json.error) {
        throw new Error(`UCP Catalog MCP error ${json.error.code}: ${json.error.message}`);
      }

      // MCP tools return content as an array; the first text item is a JSON string.
      const text = json.result?.content?.[0]?.text;
      if (!text) return [];

      const parsed = JSON.parse(text);
      // TODO: confirm whether parsed is a bare array or { products: [] }
      const products: UCPProduct[] = Array.isArray(parsed)
        ? parsed
        : (parsed.products ?? []);

      return products.slice(0, 4).map(mapUCPProduct);
    },
  };
}
