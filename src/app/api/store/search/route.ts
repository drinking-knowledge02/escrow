import { NextRequest, NextResponse } from "next/server";
import { getDiscoveryAdapter } from "@/lib/adapters";

export async function POST(req: NextRequest) {
  const { query, budget } = await req.json();
  const discovery = getDiscoveryAdapter();
  const products = await discovery.searchProducts(query, budget);
  return NextResponse.json({ products });
}
