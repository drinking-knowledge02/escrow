import { NextRequest, NextResponse } from "next/server";
import { processCheckout } from "@/lib/contract";

export async function POST(req: NextRequest) {
  try {
    const { dealId, cardCredentials } = await req.json();
    if (!dealId) {
      return NextResponse.json({ error: "dealId is required" }, { status: 400 });
    }
    if (!cardCredentials) {
      return NextResponse.json({ error: "cardCredentials are required" }, { status: 400 });
    }
    const deal = await processCheckout(dealId, cardCredentials);
    return NextResponse.json(deal);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    const message = error instanceof Error ? error.message : "Checkout processing failed";
    return NextResponse.json({ error: message }, { status });
  }
}
