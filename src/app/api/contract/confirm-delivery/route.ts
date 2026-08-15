import { NextRequest, NextResponse } from "next/server";
import { confirmDelivery } from "@/lib/contract";

export async function POST(req: NextRequest) {
  try {
    const { dealId } = await req.json();
    if (!dealId) {
      return NextResponse.json({ error: "dealId is required" }, { status: 400 });
    }
    const deal = await confirmDelivery(dealId);
    return NextResponse.json(deal);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    const message = error instanceof Error ? error.message : "Delivery confirmation failed";
    return NextResponse.json({ error: message }, { status });
  }
}
