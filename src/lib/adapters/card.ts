import type { ChargeResult, ScopedCard } from "../types";

export interface IssueScopedCardInput {
  merchant: string;
  amountCap: number;
  expiresInHours: number;
}

export interface AuthorizeChargeInput {
  cardId: string;
  merchant: string;
  amount: number;
}

export interface SettleChargeInput {
  cardId: string;
  transactionId: string;
  amount: number;
}

export interface ExpireCardInput {
  cardId: string;
  transactionId?: string;
}

export interface CardAdapter {
  issueScopedCard(input: IssueScopedCardInput): Promise<ScopedCard>;
  authorizeCharge(input: AuthorizeChargeInput): Promise<ChargeResult>;
  settleCharge(input: SettleChargeInput): Promise<void>;
  releaseCard(cardId: string): Promise<void>;
  expireCard(input: ExpireCardInput): Promise<void>;
}

export { createRealCardAdapter } from "./card-real";
