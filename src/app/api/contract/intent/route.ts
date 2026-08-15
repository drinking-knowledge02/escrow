import { NextRequest, NextResponse } from "next/server";
import { processIntent } from "@/lib/contract";

export async function POST(req: NextRequest) {
  try {
    const { buyerMessage } = await req.json();
    if (!buyerMessage) {
      return NextResponse.json({ error: "buyerMessage is required" }, { status: 400 });
    }
    const deal = await processIntent(buyerMessage);
    return NextResponse.json(deal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Intent processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
