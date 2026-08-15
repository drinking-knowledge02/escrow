import { NextResponse } from "next/server";
import { isEnvSet } from "@/lib/env";
import { canUseShopify } from "@/lib/shopify";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      openai: isEnvSet(process.env.OPENAI_API_KEY),
      rain: isEnvSet(process.env.RAIN_API_KEY) && isEnvSet(process.env.RAIN_USER_ID),
      shopifyCatalog: true,
      shopifyStore: canUseShopify(),
    },
  });
}
