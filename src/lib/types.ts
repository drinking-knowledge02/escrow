export type OrderState = "DRAFT" | "HELD" | "RELEASED" | "REFUNDED";
export type DealStatus = "CREATED" | "HELD" | "RELEASED" | "CANCELLED" | "EXPIRED";

export interface OrderItem {
  name: string;
  meta: string;
  price: number;
  thumbSeed: string;
  productId?: string;
  imageUrl?: string;
  productUrl?: string;
}

export interface CardScope {
  merchantLock: boolean;
  spendCap: number;
  expiresAt: string;
}

export interface ScopedCard {
  id: string;
  last4: string;
  state: "frozen" | "active" | "expired" | "canceled";
  pan?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvc?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  item: OrderItem;
  merchant: string;
  amount: number;
  scope: CardScope;
  card: ScopedCard;
  releaseCondition: string;
  state: OrderState;
  declineResult?: {
    merchant: string;
    amount: number;
    status: "DECLINED";
    reason: string;
  };
  releasedAt?: string;
  refundedAt?: string;
  dealId?: string;
  shopifyOrderId?: string;
  shopifyCartId?: string;
  checkoutUrl?: string;
  productUrl?: string;
  sellerDomain?: string;
  rainTransactionId?: string;
}

export interface BuyerIntent {
  productQuery: string | null;
  targetStore: string | null;
  maxAmount: number | null;
  releaseCondition: string;
}

export interface ProductInfo {
  productId: string | number;
  title: string;
  variantId: string | number;
  price: string;
  available: boolean;
}

export interface CardCredentials {
  cardId: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  amount: number;
  currency: string;
  merchantId: string;
  status: string;
  createdAt: string;
}

export interface Deal {
  dealId: string;
  status: DealStatus;
  createdAt: string;
  updatedAt: string;
  storeName: string;
  merchantId: string;
  productTitle: string;
  amount: number;
  productInfo?: ProductInfo;
  parsedIntent?: BuyerIntent;
  releaseCondition?: string;
  shopifyDraftOrderId?: string;
  shopifyOrderId?: string;
  cardCredentials?: CardCredentials;
  checkoutProcessedAt?: string;
  captureDetails?: unknown;
  releasedAt?: string;
}

export interface DealResponse {
  dealId: string;
  storeName: string;
  merchantId: string;
  productTitle: string;
  amount: number;
  status: DealStatus;
}

export interface Product {
  id: string;
  name: string;
  meta: string;
  price: number;
  thumbSeed: string;
  category: string;
  variantId?: string;
  imageUrl?: string;
  vendor?: string;
  currency?: string;
  checkoutUrl?: string;
  productUrl?: string;
  sellerDomain?: string;
}

export interface ParsedIntent {
  query: string;
  budget: number;
  releaseCondition: string;
}

export interface ChargeResult {
  status: "APPROVED" | "DECLINED";
  reason?: string;
  transactionId?: string;
}
