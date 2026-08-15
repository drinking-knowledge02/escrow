import { NextRequest, NextResponse } from "next/server";
import { getAllOrders, upsertOrder, generateOrderId } from "@/lib/store";
import type { Order, Product } from "@/lib/types";
import { getCardAdapter, getCheckoutAdapter } from "@/lib/adapters";
import { createDeal, DealStatus, getDeal } from "@/lib/deals";
import { shopDisplayName } from "@/lib/shopify";

export async function GET() {
  return NextResponse.json({ orders: getAllOrders() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = generateOrderId();
    const card = getCardAdapter();
    const checkout = getCheckoutAdapter();
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Invalid product price" }, { status: 400 });
    }

    const merchant = body.merchant || body.vendor || shopDisplayName();

    const product: Product = {
      id: body.productId || id,
      name: body.name,
      meta: body.meta,
      price,
      thumbSeed: body.thumbSeed || "product",
      category: "shopify",
      variantId: body.variantId,
      imageUrl: body.imageUrl,
      vendor: body.vendor || merchant,
      currency: body.currency,
      checkoutUrl: body.checkoutUrl || undefined,
      productUrl: body.productUrl,
      sellerDomain: body.sellerDomain || undefined,
    };

    const scopedCard = await card.issueScopedCard({
      merchant,
      amountCap: price,
      expiresInHours: 48,
    });

    const charge = await card.authorizeCharge({
      cardId: scopedCard.id,
      merchant,
      amount: price,
    });

    if (charge.status === "DECLINED") {
      await card.expireCard({ cardId: scopedCard.id });
      return NextResponse.json(
        { error: charge.reason || "Rain card declined this charge", charge },
        { status: 402 },
      );
    }

    const held = await checkout.createHeldOrder(product, scopedCard.last4);
    const checkoutUrl = held.checkoutUrl || product.checkoutUrl;
    if (!checkoutUrl && !held.shopifyOrderId) {
      await card.expireCard({
        cardId: scopedCard.id,
        transactionId: charge.transactionId,
      });
      return NextResponse.json(
        { error: "No live Shopify checkout available for this product." },
        { status: 502 },
      );
    }

    const deal = createDeal({
      storeName: merchant,
      merchantId: merchant,
      productTitle: product.name,
      amount: price,
      status: DealStatus.HELD,
      productInfo: {
        productId: product.id,
        title: product.name,
        variantId: product.variantId || product.id,
        price: price.toFixed(2),
        available: true,
      },
      parsedIntent: {
        productQuery: product.name,
        targetStore: merchant,
        maxAmount: price,
        releaseCondition: body.releaseCondition || "on_delivery",
      },
      releaseCondition: body.releaseCondition || "on_delivery",
      shopifyOrderId: held.shopifyOrderId,
      shopifyDraftOrderId: held.shopifyOrderId,
    });

    const order: Order = {
      id,
      createdAt: new Date().toISOString(),
      item: {
        name: product.name,
        meta: product.meta,
        price,
        thumbSeed: product.thumbSeed,
        productId: product.id,
        imageUrl: product.imageUrl,
        productUrl: product.productUrl,
      },
      merchant,
      amount: price,
      scope: {
        merchantLock: true,
        spendCap: price,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      },
      card: scopedCard,
      releaseCondition: body.releaseCondition || "on_delivery",
      state: "HELD",
      dealId: deal.dealId,
      shopifyOrderId: held.shopifyOrderId,
      shopifyCartId: held.cartId,
      checkoutUrl,
      productUrl: product.productUrl,
      sellerDomain: product.sellerDomain,
      rainTransactionId: charge.transactionId,
    };

    upsertOrder(order);
    return NextResponse.json({
      order,
      deal: {
        dealId: deal.dealId,
        status: getDeal(deal.dealId)?.status ?? DealStatus.HELD,
      },
    });
  } catch (error) {
    console.error("[orders] Checkout failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 502 },
    );
  }
}
