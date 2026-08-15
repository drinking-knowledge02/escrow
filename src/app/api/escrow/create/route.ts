import { NextRequest, NextResponse } from "next/server";
import { createEscrowFromMessage } from "@/lib/contract";

export async function POST(req: NextRequest) {
  try {
    const { buyerMessage } = await req.json();
    if (!buyerMessage) {
      return NextResponse.json({ error: "buyerMessage is required" }, { status: 400 });
    }
    const { intent, order } = await createEscrowFromMessage(buyerMessage);
    return NextResponse.json({
      success: true,
      escrowId: order.escrowId,
      orderDetails: order,
      parsedIntent: intent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create escrow failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
