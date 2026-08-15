export type OrderState = "DRAFT" | "HELD" | "RELEASED" | "REFUNDED";

export interface OrderItem {
  name: string;
  meta: string;
  price: number;
  thumbSeed: string;
  productId?: string;
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
}

export interface Product {
  id: string;
  name: string;
  meta: string;
  price: number;
  thumbSeed: string;
  category: string;
}

export interface ParsedIntent {
  query: string;
  budget: number;
  releaseCondition: string;
}

export interface ChargeResult {
  status: "APPROVED" | "DECLINED";
  reason?: string;
}
