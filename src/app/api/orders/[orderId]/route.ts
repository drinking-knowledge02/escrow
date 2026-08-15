import { NextRequest, NextResponse } from "next/server";
import { getOrder, upsertOrder } from "@/lib/store";
import { getCardAdapter, getCheckoutAdapter } from "@/lib/adapters";
import { DealStatus, getDeal, updateDealStatus } from "@/lib/deals";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const order = getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ order });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const order = getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const body = await req.json();
  const checkout = getCheckoutAdapter();
  const card = getCardAdapter();

  try {
    if (body.action === "release") {
      if (order.state !== "HELD") {
        return NextResponse.json(
          { error: `Cannot release an order in ${order.state} state` },
          { status: 400 },
        );
      }

      if (order.rainTransactionId) {
        await card.settleCharge({
          cardId: order.card.id,
          transactionId: order.rainTransactionId,
          amount: order.amount,
        });
      }
      if (order.shopifyOrderId) {
        await checkout.captureOrder(order.shopifyOrderId, order.amount);
      }
      await card.releaseCard(order.card.id);

      order.state = "RELEASED";
      order.releasedAt = new Date().toISOString();
      order.card.state = "active";
      upsertOrder(order);
      if (order.dealId) {
        updateDealStatus(order.dealId, DealStatus.RELEASED, { releasedAt: order.releasedAt });
      }
      return NextResponse.json({
        order,
        deal: order.dealId ? getDeal(order.dealId) : null,
      });
    }

    if (body.action === "refund") {
      if (order.state !== "HELD") {
        return NextResponse.json(
          { error: `Cannot refund an order in ${order.state} state` },
          { status: 400 },
        );
      }

      await card.expireCard({
        cardId: order.card.id,
        transactionId: order.rainTransactionId,
      });
      if (order.shopifyOrderId) {
        await checkout.voidOrder(order.shopifyOrderId);
      }

      order.state = "REFUNDED";
      order.refundedAt = new Date().toISOString();
      order.card.state = "expired";
      upsertOrder(order);
      if (order.dealId) {
        updateDealStatus(order.dealId, DealStatus.CANCELLED);
      }
      return NextResponse.json({
        order,
        deal: order.dealId ? getDeal(order.dealId) : null,
      });
    }
  } catch (error) {
    console.error(`[orders] ${body.action} failed:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : `${body.action} failed` },
      { status: 502 },
    );
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
