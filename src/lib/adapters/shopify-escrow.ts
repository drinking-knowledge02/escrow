import type { CardCredentials, Product, ProductInfo } from "../types";
import {
  captureShopifyOrder,
  createPendingShopifyOrder,
  searchShopifyProducts,
  voidShopifyOrder,
} from "../shopify";

export interface ShopifyOrderResult {
  escrowId: string;
  draftOrderId: string;
  orderId: string;
  productInfo: ProductInfo;
  maxAmount?: number | null;
  releaseCondition?: string;
  status: string;
  createdAt: string;
  cardCredentials: string | null;
}

export interface CaptureResult {
  draftOrderId: string;
  orderId: string;
  status: string;
  capturedAt: string;
  amount: string;
  currency: string;
}

export interface VoidResult {
  draftOrderId: string;
  status: string;
  voidedAt: string;
}

function toProduct(info: ProductInfo): Product {
  return {
    id: String(info.productId),
    name: info.title,
    meta: "",
    price: parseFloat(info.price),
    thumbSeed: "shopify",
    category: "shopify",
    variantId: info.variantId != null ? String(info.variantId) : undefined,
  };
}

export async function searchProduct(
  productQuery: string,
  _targetStore: string | null = null,
): Promise<ProductInfo> {
  void _targetStore;
  const products = await searchShopifyProducts(productQuery || "product", Number.MAX_SAFE_INTEGER);
  if (products.length === 0) {
    throw new Error(`No live Shopify products matched "${productQuery}"`);
  }
  const p = products[0];
  return {
    productId: p.id,
    title: p.name,
    variantId: p.variantId ?? p.id,
    price: p.price.toFixed(2),
    available: true,
  };
}

export async function createOrder(orderData: {
  productInfo: ProductInfo;
  maxAmount?: number | null;
  releaseCondition?: string;
  cardCredentials?: CardCredentials;
}): Promise<ShopifyOrderResult> {
  const { shopifyOrderId } = await createPendingShopifyOrder(toProduct(orderData.productInfo));

  return {
    escrowId: shopifyOrderId,
    draftOrderId: shopifyOrderId,
    orderId: shopifyOrderId,
    productInfo: orderData.productInfo,
    maxAmount: orderData.maxAmount,
    releaseCondition: orderData.releaseCondition,
    status: "authorized",
    createdAt: new Date().toISOString(),
    cardCredentials: orderData.cardCredentials
      ? `****${orderData.cardCredentials.cardNumber?.slice(-4)}`
      : null,
  };
}

export async function capturePayment(shopifyOrderId: string): Promise<CaptureResult> {
  await captureShopifyOrder(shopifyOrderId);
  return {
    draftOrderId: shopifyOrderId,
    orderId: shopifyOrderId,
    status: "captured",
    capturedAt: new Date().toISOString(),
    amount: "0.00",
    currency: "USD",
  };
}

export async function voidPayment(shopifyOrderId: string): Promise<VoidResult> {
  await voidShopifyOrder(shopifyOrderId);
  return {
    draftOrderId: shopifyOrderId,
    status: "voided",
    voidedAt: new Date().toISOString(),
  };
}
