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
// Real — Shopify UCP Catalog MCP (JSON-RPC over HTTP)
//
// Endpoint: POST https://{SHOPIFY_STORE_DOMAIN}/api/ucp/mcp
// No auth token needed. Agent identity is declared via the agent profile URL.
//
// JSON-RPC 2.0 body:
// {
//   "jsonrpc": "2.0",
//   "id": <string>,
//   "method": "tools/call",
//   "params": {
//     "name": "search_catalog",
//     "arguments": {
//       // TODO: confirm exact top-level wrapper field name from Shopify docs.
//       // The prompt spec calls it a "UCP catalog wrapper object". Likely shape:
//       "catalog": {
//         "query": <string>,
//         "filters": { "price": { "max": <number> } },  // TODO: confirm filter shape
//         "limit": 4
//       }
//     }
//   }
// }
//
// Agent profile is declared via:
//   Header: "Shopify-Agent-Profile-Url: <SHOPIFY_AGENT_PROFILE_URL>"
//   TODO: confirm exact header name from Shopify docs (may be X-Shopify-Agent-Profile,
//         or passed as a body field — not confirmed in available docs).
//
// Response shape (assumed from MCP tool conventions):
// {
//   "jsonrpc": "2.0",
//   "id": <string>,
//   "result": {
//     "content": [{ "type": "text", "text": "<JSON string with products array>" }]
//   }
// }
// TODO: confirm whether result.content[0].text is JSON or the array is nested differently.
// ---------------------------------------------------------------------------

interface UCPProduct {
  id: string;
  title: string;
  // TODO: confirm exact field names returned by search_catalog
  description?: string;
  priceRange?: {
    minVariantPrice?: { amount: string; currencyCode: string };
  };
  // TODO: confirm image field shape
  featuredImage?: { url: string; altText?: string };
  variants?: { edges: Array<{ node: { id: string; price: { amount: string } } }> };
}

function mapUCPProduct(p: UCPProduct, index: number): Product {
  const priceStr =
    p.priceRange?.minVariantPrice?.amount ??
    p.variants?.edges?.[0]?.node?.price?.amount ??
    "0";
  const price = parseFloat(priceStr);

  return {
    id: p.id,
    name: p.title,
    meta: p.description?.slice(0, 50) ?? "",
    price,
    thumbSeed: `ucp-${index}`,
    category: "general",
  };
}

export function createRealDiscoveryAdapter(): DiscoveryAdapter {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const agentProfileUrl = process.env.SHOPIFY_AGENT_PROFILE_URL;

  if (!storeDomain) {
    throw new Error("SHOPIFY_STORE_DOMAIN must be set for real discovery adapter");
  }

  // TODO: confirm exact endpoint path from Shopify docs — assumed /api/ucp/mcp
  const endpoint = `https://${storeDomain}/api/ucp/mcp`;

  return {
    async searchProducts(query: string, budget: number): Promise<Product[]> {
      const requestId = `latch-${Date.now()}`;

      // TODO: confirm exact wrapper field name ("catalog" assumed) and filter shape.
      // Also confirm whether limit is a top-level arg or inside catalog.
      const body = {
        jsonrpc: "2.0",
        id: requestId,
        method: "tools/call",
        params: {
          name: "search_catalog",
          arguments: {
            // TODO: wrapper field name unconfirmed — "catalog" is assumed
            catalog: {
              query,
              filters: {
                // TODO: confirm price filter shape
                price: { max: budget },
              },
              limit: 4,
            },
          },
        },
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        // TODO: confirm exact header name for agent profile
        ...(agentProfileUrl ? { "Shopify-Agent-Profile-Url": agentProfileUrl } : {}),
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(
          `UCP Catalog MCP search_catalog failed: ${res.status} ${await res.text()}`
        );
      }

      const json = await res.json() as {
        jsonrpc: string;
        id: string;
        result?: {
          // TODO: confirm whether result is content array or products directly
          content?: Array<{ type: string; text: string }>;
          products?: UCPProduct[];
        };
        error?: { code: number; message: string };
      };

      if (json.error) {
        throw new Error(`UCP Catalog MCP error ${json.error.code}: ${json.error.message}`);
      }

      // TODO: confirm exact result shape — content[0].text assumed to be JSON
      let products: UCPProduct[] = [];
      if (json.result?.content?.[0]?.text) {
        const parsed = JSON.parse(json.result.content[0].text);
        // TODO: confirm whether parsed is array or { products: [] }
        products = Array.isArray(parsed) ? parsed : (parsed.products ?? []);
      } else if (Array.isArray(json.result?.products)) {
        products = json.result.products;
      }

      return products
        .filter((p) => {
          const price = parseFloat(
            p.priceRange?.minVariantPrice?.amount ??
            p.variants?.edges?.[0]?.node?.price?.amount ?? "0"
          );
          return price <= budget;
        })
        .slice(0, 4)
        .map(mapUCPProduct);
    },
  };
}
