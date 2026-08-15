import { NextRequest, NextResponse } from "next/server";
import { getOrder, upsertOrder } from "@/lib/store";
import { getCardAdapter } from "@/lib/adapters";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const order = getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const card = getCardAdapter();
  const result = await card.authorizeCharge({
    cardId: order.card.id,
    merchant: "Random Shop",
    amount: 300,
  });

  order.declineResult = {
    merchant: "Random Shop",
    amount: 300,
    status: "DECLINED",
    reason: result.reason || "Scope violation",
  };
  upsertOrder(order);

  return NextResponse.json({
    chargeResult: result,
    attemptedMerchant: "Random Shop",
    attemptedAmount: 300,
  });
}
