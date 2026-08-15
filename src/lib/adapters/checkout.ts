import type { Product } from "../types";
import {
  canUseShopify,
  captureShopifyOrder,
  createPendingShopifyOrder,
  createShopifyCart,
  isAdminOrderId,
  isOwnStoreProduct,
  voidShopifyOrder,
} from "../shopify";
import { isEnvSet } from "../env";

export interface CheckoutAdapter {
  createHeldOrder(
    product: Product,
    cardLast4: string,
  ): Promise<{ shopifyOrderId?: string; cartId?: string; checkoutUrl?: string }>;
  captureOrder(shopifyOrderId: string, amount?: number): Promise<void>;
  voidOrder(shopifyOrderId: string): Promise<void>;
}

export function createRealCheckoutAdapter(): CheckoutAdapter {
  return {
    async createHeldOrder(product, cardLast4) {
      if (product.checkoutUrl && !isOwnStoreProduct(product)) {
        console.log(`[checkout] Using seller checkout ${product.checkoutUrl} · Rain •••• ${cardLast4}`);
        return { checkoutUrl: product.checkoutUrl };
      }

      if (!canUseShopify()) {
        if (product.checkoutUrl) {
          return { checkoutUrl: product.checkoutUrl };
        }
        throw new Error("No live Shopify checkout available for this product.");
      }

      let cartId: string | undefined;
      let checkoutUrl = product.checkoutUrl;
      if (isEnvSet(process.env.SHOPIFY_STOREFRONT_TOKEN) && product.variantId) {
        const cart = await createShopifyCart(product.variantId);
        cartId = cart.cartId;
        checkoutUrl = cart.checkoutUrl || checkoutUrl;
      }

      if (isEnvSet(process.env.SHOPIFY_ADMIN_TOKEN) || isEnvSet(process.env.SHOPIFY_PASSWORD)) {
        const pending = await createPendingShopifyOrder(product);
        console.log(
          `[checkout] Shopify pending order ${pending.shopifyOrderId} · Rain •••• ${cardLast4}`,
        );
        return { shopifyOrderId: pending.shopifyOrderId, cartId, checkoutUrl };
      }

      if (cartId || checkoutUrl) {
        return { shopifyOrderId: cartId, cartId, checkoutUrl };
      }

      throw new Error("Could not add item to Shopify. Missing Storefront/Admin token and checkout URL.");
    },

    async captureOrder(shopifyOrderId, amount) {
      if (!isAdminOrderId(shopifyOrderId)) return;
      await captureShopifyOrder(shopifyOrderId, amount);
    },

    async voidOrder(shopifyOrderId) {
      if (!isAdminOrderId(shopifyOrderId)) return;
      await voidShopifyOrder(shopifyOrderId);
    },
  };
}
