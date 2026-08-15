import { NextRequest, NextResponse } from "next/server";
import { getDiscoveryAdapter } from "@/lib/adapters";
import { canUseShopify, shopDisplayName } from "@/lib/shopify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = typeof body.query === "string" ? body.query : "";
    const budget = Number(body.budget);
    const safeBudget = Number.isFinite(budget) && budget > 0 ? budget : 0;

    const discovery = getDiscoveryAdapter();
    const products = await discovery.searchProducts(query, safeBudget);
    const storeName = canUseShopify() ? shopDisplayName() : "Shopify Catalog";

    return NextResponse.json({ products, source: "shopify", storeName });
  } catch (error) {
    console.error("[store/search] Live Shopify search failed:", error);
    return NextResponse.json(
      { products: [], source: "shopify", error: error instanceof Error ? error.message : "Search failed" },
      { status: 200 },
    );
  }
}
