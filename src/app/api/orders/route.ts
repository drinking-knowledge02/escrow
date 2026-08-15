import { NextRequest, NextResponse } from "next/server";
import { getAllOrders, upsertOrder, generateOrderId } from "@/lib/store";
import type { Order } from "@/lib/types";
import { getCardAdapter } from "@/lib/adapters";

export async function GET() {
  return NextResponse.json({ orders: getAllOrders() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = generateOrderId();
  const card = getCardAdapter();

  const scopedCard = await card.issueScopedCard({
    merchant: body.merchant || "Heirloom Home",
    amountCap: body.price,
    expiresInHours: 48,
  });

  const order: Order = {
    id,
    createdAt: new Date().toISOString(),
    item: {
      name: body.name,
      meta: body.meta,
      price: body.price,
      thumbSeed: body.thumbSeed || "product",
    },
    merchant: body.merchant || "Heirloom Home",
    amount: body.price,
    scope: {
      merchantLock: true,
      spendCap: body.price,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    },
    card: scopedCard,
    releaseCondition: body.releaseCondition || "on_delivery",
    state: "HELD",
  };

  upsertOrder(order);
  return NextResponse.json({ order });
}
