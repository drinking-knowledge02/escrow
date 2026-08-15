import { isEnvSet } from "./env";
import type { Product } from "./types";

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";

// Shopify Universal Commerce Protocol — public global catalog MCP.
// No auth token required; searches across all UCP-enabled Shopify stores.
const UCP_MCP_ENDPOINT =
  process.env.SHOPIFY_CATALOG_ENDPOINT || "https://catalog.shopify.com/api/ucp/mcp";
const UCP_AGENT_PROFILE =
  process.env.SHOPIFY_AGENT_PROFILE_URL ||
  "https://shopify.dev/ucp/agent-profiles/2026-04-08/valid-with-capabilities.json";

export function shopDomain(): string | null {
  const raw = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  if (!isEnvSet(raw)) return null;
  return raw!.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function shopDisplayName(): string {
  if (isEnvSet(process.env.SHOPIFY_STORE_NAME)) {
    return process.env.SHOPIFY_STORE_NAME as string;
  }
  const domain = shopDomain();
  if (!domain) return "Shopify Catalog";
  return domain.replace(".myshopify.com", "").replace(/-/g, " ");
}

export function isOwnStoreProduct(product: { sellerDomain?: string }): boolean {
  const domain = shopDomain();
  if (!domain || !canUseShopify()) return false;
  if (!product.sellerDomain) return true;
  const seller = product.sellerDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return seller === domain;
}

export function isAdminOrderId(id: string | undefined | null): boolean {
  if (!id) return false;
  return /^\d+$/.test(id);
}

export function canUseShopify(): boolean {
  const domain = shopDomain();
  if (!domain) return false;
  return (
    isEnvSet(process.env.SHOPIFY_STOREFRONT_TOKEN) ||
    isEnvSet(process.env.SHOPIFY_ADMIN_TOKEN) ||
    isEnvSet(process.env.SHOPIFY_PASSWORD)
  );
}

export function toVariantGid(id: string | number | undefined): string | null {
  if (id == null || id === "") return null;
  const value = String(id);
  if (value.startsWith("gid://")) return value;
  const numeric = value.match(/(\d+)$/);
  if (!numeric) return null;
  return `gid://shopify/ProductVariant/${numeric[1]}`;
}

export function toNumericId(id: string | number | undefined): number | null {
  if (id == null || id === "") return null;
  if (typeof id === "number") return id;
  const numeric = String(id).match(/(\d+)$/);
  return numeric ? Number(numeric[1]) : Number.isFinite(Number(id)) ? Number(id) : null;
}

function mapProduct(input: {
  id: string;
  name: string;
  meta: string;
  price: number;
  variantId?: string;
  imageUrl?: string;
  vendor?: string;
  currency?: string;
  checkoutUrl?: string;
  productUrl?: string;
  sellerDomain?: string;
  index: number;
}): Product {
  return {
    id: input.id,
    name: input.name,
    meta: input.meta,
    price: input.price,
    thumbSeed: `shopify-${input.index}`,
    category: "shopify",
    variantId: input.variantId,
    imageUrl: input.imageUrl,
    vendor: input.vendor,
    currency: input.currency,
    checkoutUrl: input.checkoutUrl,
    productUrl: input.productUrl,
    sellerDomain: input.sellerDomain,
  };
}

interface UcpMoney {
  amount: number;
  currency: string;
}

interface UcpMedia {
  type?: string;
  url: string;
}

interface UcpSeller {
  id?: string;
  name?: string;
  domain?: string;
  url?: string;
}

interface UcpVariant {
  id: string;
  price?: UcpMoney;
  availability?: { available?: boolean };
  url?: string;
  checkout_url?: string;
  media?: UcpMedia[];
  seller?: UcpSeller;
}

interface UcpProduct {
  id: string;
  title: string;
  description?: { plain?: string };
  media?: UcpMedia[];
  variants?: UcpVariant[];
  seller?: UcpSeller;
  url?: string;
  checkout_url?: string;
  price_range?: { min?: UcpMoney; max?: UcpMoney };
}

export async function searchUcpCatalog(query: string, budget: number): Promise<Product[]> {
  const maxCents = Number.isFinite(budget) && budget > 0 ? Math.round(budget * 100) : undefined;

  const payload = {
    jsonrpc: "2.0",
    method: "tools/call",
    id: 1,
    params: {
      name: "search_catalog",
      arguments: {
        meta: { "ucp-agent": { profile: UCP_AGENT_PROFILE } },
        catalog: {
          query,
          filters: {
            available: true,
            ships_to: { country: "US" },
            ...(maxCents != null ? { price: { max: maxCents } } : {}),
          },
          context: { address_country: "US" },
          pagination: { limit: 12 },
        },
      },
    },
  };

  const res = await fetch(UCP_MCP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as {
    result?: { structuredContent?: { products?: UcpProduct[] } };
    error?: { message?: string };
  };

  if (!res.ok || json.error) {
    throw new Error(`UCP catalog search failed: ${json.error?.message || res.status}`);
  }

  const products = json.result?.structuredContent?.products ?? [];

  return products
    .map((p, index) => {
      const variant = p.variants?.find((v) => v.availability?.available) ?? p.variants?.[0];
      const money = variant?.price ?? p.price_range?.min;
      const price = money ? money.amount / 100 : 0;
      const seller = variant?.seller ?? p.seller;
      const image = p.media?.find((m) => m.type === "image")?.url ?? variant?.media?.[0]?.url;
      return mapProduct({
        id: p.id,
        name: p.title,
        meta: [seller?.name, p.description?.plain?.slice(0, 70)].filter(Boolean).join(" · "),
        price,
        variantId: variant?.id,
        imageUrl: image,
        vendor: seller?.name,
        currency: money?.currency,
        checkoutUrl: variant?.checkout_url ?? p.checkout_url,
        productUrl: variant?.url ?? p.url,
        sellerDomain: seller?.domain,
        index,
      });
    })
    .filter((p) => p.price > 0)
    .filter((p) => p.currency !== "USD" || !Number.isFinite(budget) || budget <= 0 || p.price <= budget)
    .slice(0, 12);
}

async function storefrontGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const domain = shopDomain();
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!domain || !isEnvSet(token)) {
    throw new Error("Shopify Storefront token is not configured");
  }

  const res = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token as string,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!res.ok || json.errors?.length) {
    throw new Error(
      `Storefront GraphQL failed ${res.status}: ${json.errors?.map((e) => e.message).join("; ") || "unknown error"}`,
    );
  }
  if (!json.data) {
    throw new Error("Storefront GraphQL returned no data");
  }
  return json.data;
}

async function adminFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const domain = shopDomain();
  const token = process.env.SHOPIFY_ADMIN_TOKEN || process.env.SHOPIFY_PASSWORD;
  if (!domain || !isEnvSet(token)) {
    throw new Error("Shopify Admin token is not configured");
  }

  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}${path}`, {
    method: init.method || "GET",
    headers: {
      "X-Shopify-Access-Token": token as string,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Admin API ${init.method || "GET"} ${path} failed ${res.status}: ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

async function searchViaStorefront(query: string, budget: number): Promise<Product[]> {
  const data = await storefrontGraphql<{
    products: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          description?: string;
          vendor?: string;
          featuredImage?: { url: string } | null;
          priceRange: { minVariantPrice: { amount: string } };
          variants: {
            edges: Array<{
              node: { id: string; title: string; availableForSale: boolean; price: { amount: string } };
            }>;
          };
        };
      }>;
    };
  }>(
    `query SearchProducts($query: String!, $first: Int!) {
      products(first: $first, query: $query) {
        edges {
          node {
            id
            title
            description
            vendor
            featuredImage { url }
            priceRange { minVariantPrice { amount } }
            variants(first: 3) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  price { amount }
                }
              }
            }
          }
        }
      }
    }`,
    { query, first: 12 },
  );

  return data.products.edges
    .map((edge, index) => {
      const node = edge.node;
      const variant = node.variants.edges.find((v) => v.node.availableForSale)?.node
        ?? node.variants.edges[0]?.node;
      const price = parseFloat(variant?.price.amount ?? node.priceRange.minVariantPrice.amount);
      return mapProduct({
        id: node.id,
        name: node.title,
        meta: [node.vendor, node.description?.replace(/<[^>]+>/g, "").slice(0, 60)]
          .filter(Boolean)
          .join(" · "),
        price,
        variantId: variant?.id,
        imageUrl: node.featuredImage?.url,
        vendor: node.vendor,
        index,
      });
    })
    .filter((p) => p.price <= budget)
    .slice(0, 12);
}

async function searchViaAdmin(query: string, budget: number): Promise<Product[]> {
  const data = await adminFetch<{
    products: Array<{
      id: number;
      title: string;
      body_html?: string;
      vendor?: string;
      image?: { src: string } | null;
      variants: Array<{ id: number; price: string; inventory_quantity?: number }>;
    }>;
  }>(`/products.json?limit=50`);

  const terms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const scored = (data.products || []).map((p) => {
    const hay = `${p.title} ${p.body_html ?? ""} ${p.vendor ?? ""}`.toLowerCase();
    const score = terms.length === 0 ? 1 : terms.filter((t) => hay.includes(t)).length;
    return { p, score };
  });
  const pool = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.p);
  const chosen = pool.length > 0 ? pool : data.products || [];

  return chosen
    .map((p, index) => {
      const variant = p.variants[0];
      const price = parseFloat(variant?.price ?? "0");
      return mapProduct({
        id: `gid://shopify/Product/${p.id}`,
        name: p.title,
        meta: [p.vendor, p.body_html?.replace(/<[^>]+>/g, "").slice(0, 60)]
          .filter(Boolean)
          .join(" · "),
        price,
        variantId: variant ? `gid://shopify/ProductVariant/${variant.id}` : undefined,
        imageUrl: p.image?.src,
        vendor: p.vendor,
        index,
      });
    })
    .filter((p) => p.price <= budget)
    .slice(0, 12);
}

export async function searchShopifyProducts(query: string, budget: number): Promise<Product[]> {
  const errors: string[] = [];

  // Optional: if a specific store is configured, search it directly first.
  if (isEnvSet(process.env.SHOPIFY_STOREFRONT_TOKEN)) {
    try {
      const products = await searchViaStorefront(query, budget);
      if (products.length > 0) {
        console.log(`[shopify] Storefront search "${query}" → ${products.length} products`);
        return products;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      console.error("[shopify] Storefront search failed:", error);
    }
  } else if (isEnvSet(process.env.SHOPIFY_ADMIN_TOKEN) || isEnvSet(process.env.SHOPIFY_PASSWORD)) {
    try {
      const products = await searchViaAdmin(query, budget);
      if (products.length > 0) {
        console.log(`[shopify] Admin search "${query}" → ${products.length} products`);
        return products;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      console.error("[shopify] Admin search failed:", error);
    }
  }

  // Primary live source: Shopify's public UCP global catalog (no auth).
  try {
    const products = await searchUcpCatalog(query, budget);
    console.log(`[shopify] UCP catalog search "${query}" → ${products.length} products`);
    return products;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    console.error("[shopify] UCP catalog search failed:", error);
  }

  throw new Error(errors[0] || "Shopify product search failed");
}

export async function createShopifyCart(variantId: string): Promise<{ cartId: string; checkoutUrl?: string }> {
  const gid = toVariantGid(variantId);
  if (!gid) {
    throw new Error("Missing Shopify variant id for cart");
  }

  const data = await storefrontGraphql<{
    cartCreate: {
      cart: { id: string; checkoutUrl?: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    `mutation CartCreate($lines: [CartLineInput!]!) {
      cartCreate(input: { lines: $lines, note: "Latch escrow — pay with Rain scoped card" }) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }`,
    { lines: [{ merchandiseId: gid, quantity: 1 }] },
  );

  if (data.cartCreate.userErrors.length) {
    throw new Error(data.cartCreate.userErrors.map((e) => e.message).join("; "));
  }
  if (!data.cartCreate.cart) {
    throw new Error("Shopify cartCreate returned no cart");
  }

  console.log(`[shopify] Created cart ${data.cartCreate.cart.id}`);
  return {
    cartId: data.cartCreate.cart.id,
    checkoutUrl: data.cartCreate.cart.checkoutUrl,
  };
}

export async function createPendingShopifyOrder(product: Product): Promise<{ shopifyOrderId: string }> {
  const variantId = toNumericId(product.variantId);
  const body = {
    order: {
      line_items: [
        variantId
          ? { variant_id: variantId, quantity: 1 }
          : { title: product.name, price: product.price.toFixed(2), quantity: 1 },
      ],
      financial_status: "pending",
      note: "Latch escrow hold — Rain scoped card",
      tags: "latch,escrow,rain",
      inventory_behaviour: "bypass",
    },
  };

  const data = await adminFetch<{ order: { id: number } }>("/orders.json", {
    method: "POST",
    body,
  });

  return { shopifyOrderId: String(data.order.id) };
}

export async function captureShopifyOrder(shopifyOrderId: string, amount?: number): Promise<void> {
  await adminFetch(`/orders/${shopifyOrderId}/transactions.json`, {
    method: "POST",
    body: {
      transaction: {
        kind: "capture",
        ...(amount != null ? { amount: amount.toFixed(2) } : {}),
      },
    },
  });
}

export async function voidShopifyOrder(shopifyOrderId: string): Promise<void> {
  await adminFetch(`/orders/${shopifyOrderId}/transactions.json`, {
    method: "POST",
    body: { transaction: { kind: "void" } },
  });
}
