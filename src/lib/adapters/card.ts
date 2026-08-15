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

export interface CardAdapter {
  issueScopedCard(input: IssueScopedCardInput): Promise<ScopedCard>;
  authorizeCharge(input: AuthorizeChargeInput): Promise<ChargeResult>;
  releaseCard(cardId: string): Promise<void>;
  expireCard(cardId: string): Promise<void>;
}

interface MockCard {
  id: string;
  last4: string;
  merchant: string;
  cap: number;
  expiresAt: string;
  state: ScopedCard["state"];
}

const mockCards = new Map<string, MockCard>();

export function createMockCardAdapter(): CardAdapter {
  return {
    async issueScopedCard(input): Promise<ScopedCard> {
      const id = `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const last4 = String(Math.floor(1000 + Math.random() * 9000));
      const card: MockCard = {
        id,
        last4,
        merchant: input.merchant,
        cap: input.amountCap,
        expiresAt: new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000).toISOString(),
        state: "frozen",
      };
      mockCards.set(id, card);
      return { id, last4, state: "frozen" };
    },

    async authorizeCharge(input): Promise<ChargeResult> {
      const card = mockCards.get(input.cardId);
      if (!card) {
        return { status: "DECLINED", reason: "Card not found" };
      }
      if (new Date(card.expiresAt) < new Date()) {
        return { status: "DECLINED", reason: "Card expired" };
      }
      if (input.merchant.toLowerCase() !== card.merchant.toLowerCase()) {
        return { status: "DECLINED", reason: `Merchant mismatch: card locked to ${card.merchant}` };
      }
      if (input.amount > card.cap) {
        return { status: "DECLINED", reason: `Amount $${input.amount.toFixed(2)} exceeds cap of $${card.cap.toFixed(2)}` };
      }
      return { status: "APPROVED" };
    },

    async releaseCard(cardId): Promise<void> {
      const card = mockCards.get(cardId);
      if (card) card.state = "active";
    },

    async expireCard(cardId): Promise<void> {
      const card = mockCards.get(cardId);
      if (card) card.state = "expired";
    },
  };
}
