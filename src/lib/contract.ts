import type { BuyerIntent, CardCredentials, DealResponse, ProductInfo } from "./types";
import {
  createDeal,
  DealStatus,
  getDeal,
  toDealResponse,
  updateDealStatus,
} from "./deals";
import { parseBuyerIntent } from "./intent";
import { capturePayment, createOrder, searchProduct, voidPayment } from "./adapters/shopify-escrow";
import { mintScopedCard } from "./adapters/rain-escrow";

export async function processIntent(buyerMessage: string): Promise<DealResponse> {
  const intent = await parseBuyerIntent(buyerMessage);
  const productInfo = await searchProduct(intent.productQuery || "product", intent.targetStore);
  const merchantId =
    intent.targetStore || process.env.SHOPIFY_STORE_NAME || "default_merchant";
  const amount = intent.maxAmount || parseFloat(productInfo.price);

  const deal = createDeal({
    storeName: intent.targetStore || process.env.SHOPIFY_STORE_NAME || "Unknown Store",
    merchantId,
    productTitle: productInfo.title,
    amount,
    productInfo,
    parsedIntent: intent,
    releaseCondition: intent.releaseCondition,
  });

  return toDealResponse(deal);
}

export async function processCheckout(
  dealId: string,
  cardCredentials: CardCredentials,
): Promise<DealResponse> {
  const deal = getDeal(dealId);
  if (!deal) {
    throw Object.assign(new Error("Deal not found"), { status: 404 });
  }
  if (deal.status !== DealStatus.CREATED) {
    throw Object.assign(
      new Error(`Deal is in ${deal.status} state, cannot checkout`),
      { status: 400 },
    );
  }
  if (!deal.productInfo) {
    throw Object.assign(new Error("Deal is missing product info"), { status: 400 });
  }

  const orderResult = await createOrder({
    productInfo: deal.productInfo,
    maxAmount: deal.amount,
    releaseCondition: deal.releaseCondition,
    cardCredentials,
  });

  const updated = updateDealStatus(dealId, DealStatus.HELD, {
    shopifyDraftOrderId: orderResult.draftOrderId,
    shopifyOrderId: orderResult.orderId,
    cardCredentials,
    checkoutProcessedAt: new Date().toISOString(),
  });

  return toDealResponse(updated);
}

export async function confirmDelivery(dealId: string): Promise<DealResponse> {
  const deal = getDeal(dealId);
  if (!deal) {
    throw Object.assign(new Error("Deal not found"), { status: 404 });
  }
  if (deal.status !== DealStatus.HELD) {
    throw Object.assign(
      new Error(`Deal is in ${deal.status} state, cannot confirm delivery`),
      { status: 400 },
    );
  }

  const captureResult = await capturePayment(deal.shopifyDraftOrderId || dealId);
  const updated = updateDealStatus(dealId, DealStatus.RELEASED, {
    captureDetails: captureResult,
    releasedAt: new Date().toISOString(),
  });

  return toDealResponse(updated);
}

export async function cancelDeal(dealId: string): Promise<DealResponse> {
  const deal = getDeal(dealId);
  if (!deal) {
    throw Object.assign(new Error("Deal not found"), { status: 404 });
  }

  await voidPayment(deal.shopifyDraftOrderId || dealId);
  const updated = updateDealStatus(dealId, DealStatus.CANCELLED);
  return toDealResponse(updated);
}

export async function createEscrowFromMessage(buyerMessage: string) {
  const intent: BuyerIntent = await parseBuyerIntent(buyerMessage);
  const productInfo: ProductInfo = await searchProduct(
    intent.productQuery || "product",
    intent.targetStore,
  );
  const order = await createOrder({
    productInfo,
    maxAmount: intent.maxAmount,
    releaseCondition: intent.releaseCondition,
  });
  return { intent, order };
}

export { mintScopedCard };
