import type { Product } from "../types";

export interface CheckoutAdapter {
  createHeldOrder(product: Product, cardLast4: string): Promise<{ shopifyOrderId: string }>;
  captureOrder(shopifyOrderId: string): Promise<void>;
  voidOrder(shopifyOrderId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

export function createMockCheckoutAdapter(): CheckoutAdapter {
  return {
    async createHeldOrder(_product, _cardLast4): Promise<{ shopifyOrderId: string }> {
      return { shopifyOrderId: `shopify_${Date.now()}` };
    },
    async captureOrder(): Promise<void> {},
    async voidOrder(): Promise<void> {},
  };
}

// ---------------------------------------------------------------------------
// Real — Shopify Admin API with manual capture (authorize-not-capture = escrow hold)
//
// Payment is NOT routed through Shop Pay / UCP checkout — that would return a
// Shop Pay token and bypass the Rain scoped card, killing the guardrail.
// Instead: cart via Storefront API → place order via Admin API with
// payment_gateway set to the Rain virtual card credentials and
// financial_status = "pending" (manual capture mode).
//
// Capture = RELEASED:  POST /admin/api/{version}/orders/{id}/transactions.json
//   { transaction: { kind: "capture", amount: ... } }
//
// Void = REFUNDED:     POST /admin/api/{version}/orders/{id}/transactions.json
//   { transaction: { kind: "void" } }
//
// TODO: confirm the exact Admin API version to use (e.g. 2025-01 or 2024-10).
// TODO: confirm how to pass the Rain virtual card as the payment method —
//   the Admin API order creation may require a payment_gateway that accepts
//   card credentials directly, or we create the order and handle payment
//   outside Shopify (Rain authorize covers the hold; capture/void are our calls).
// ---------------------------------------------------------------------------

const ADMIN_API_VERSION = "2025-01"; // TODO: confirm version

export function createRealCheckoutAdapter(): CheckoutAdapter {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_TOKEN;

  if (!storeDomain || !adminToken) {
    throw new Error("SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN must be set for real checkout");
  }

  const adminBase = `https://${storeDomain}/admin/api/${ADMIN_API_VERSION}`;

  async function adminRequest<T>(
    path: string,
    init: { method: string; body?: unknown }
  ): Promise<T> {
    const res = await fetch(`${adminBase}${path}`, {
      method: init.method,
      headers: {
        "X-Shopify-Access-Token": adminToken,
        "Content-Type": "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Admin API ${init.method} ${path} failed ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  return {
    async createHeldOrder(product, _cardLast4): Promise<{ shopifyOrderId: string }> {
      // TODO: In real integration, build a Storefront cart first, then use the
      // Admin API to create the order with manual capture. The Rain scoped card
      // handles the actual payment authorization outside of Shopify's payment flow.
      // financial_status "pending" = authorized-not-captured = escrow hold.
      const data = await adminRequest<{ order: { id: number } }>("/orders.json", {
        method: "POST",
        body: {
          order: {
            line_items: [
              {
                // TODO: use real variant_id from discovery adapter result
                title: product.name,
                price: product.price.toFixed(2),
                quantity: 1,
              },
            ],
            financial_status: "pending", // manual capture = escrow hold
            // TODO: confirm correct gateway name for Rain card payment
            // payment_gateway: "rain_virtual_card",
          },
        },
      });

      return { shopifyOrderId: String(data.order.id) };
    },

    async captureOrder(shopifyOrderId): Promise<void> {
      // Capture fires when release condition is met → RELEASED
      await adminRequest(`/orders/${shopifyOrderId}/transactions.json`, {
        method: "POST",
        body: {
          transaction: {
            kind: "capture",
            // TODO: pass exact amount from the order
          },
        },
      });
    },

    async voidOrder(shopifyOrderId): Promise<void> {
      // Void releases the authorization → REFUNDED
      await adminRequest(`/orders/${shopifyOrderId}/transactions.json`, {
        method: "POST",
        body: {
          transaction: { kind: "void" },
        },
      });
    },
  };
}
