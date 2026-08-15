import type { Product } from "../types";
import { searchShopifyProducts } from "../shopify";

export interface DiscoveryAdapter {
  searchProducts(query: string, budget: number): Promise<Product[]>;
}

// Live product discovery. Uses Shopify's public UCP global catalog (no auth),
// or a specific configured store when Storefront/Admin credentials are set.
export function createRealDiscoveryAdapter(): DiscoveryAdapter {
  return {
    async searchProducts(query: string, budget: number): Promise<Product[]> {
      const products = await searchShopifyProducts(query, budget);
      console.log(`[discovery] returned ${products.length} products for "${query}"`);
      return products;
    },
  };
}
