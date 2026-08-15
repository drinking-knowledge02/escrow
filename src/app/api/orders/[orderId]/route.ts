import { NextRequest, NextResponse } from "next/server";
import { getOrder, upsertOrder } from "@/lib/store";

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

  if (body.action === "release") {
    order.state = "RELEASED";
    order.releasedAt = new Date().toISOString();
    order.card.state = "active";
    upsertOrder(order);
    return NextResponse.json({ order });
  }

  if (body.action === "refund") {
    order.state = "REFUNDED";
    order.refundedAt = new Date().toISOString();
    order.card.state = "expired";
    upsertOrder(order);
    return NextResponse.json({ order });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
