import type { ChargeResult, ScopedCard } from "../types";
import type { CardAdapter, IssueScopedCardInput, AuthorizeChargeInput } from "./card";
import {
  createRealScopedCard,
  simulateAuthorize,
  revealLast4,
  type RainCard,
} from "./rain-client";
import type { RainSession } from "./rain-session";

const cardSessions = new Map<string, { rainCard: RainCard; session: RainSession }>();

function toCents(amount: number): number {
  return Math.round(Number(amount.toFixed(2)) * 100);
}

export function createRealCardAdapter(): CardAdapter {
  return {
    async issueScopedCard(input: IssueScopedCardInput): Promise<ScopedCard> {
      const amountInUSDCents = toCents(input.amountCap);
      const expiresAt = new Date(
        Date.now() + input.expiresInHours * 60 * 60 * 1000
      ).toISOString();

      const { card, session } = await createRealScopedCard({
        amountInUSDCents,
        expiresAt,
      });

      const last4 = revealLast4(card, session);
      cardSessions.set(card.id, { rainCard: card, session });

      console.log(
        `[rain-real] card ${card.id} •••• ${last4} · $${input.amountCap.toFixed(2)} · expires ${expiresAt}`
      );

      return { id: card.id, last4, state: "frozen" };
    },

    async authorizeCharge(input: AuthorizeChargeInput): Promise<ChargeResult> {
      try {
        const auth = await simulateAuthorize({
          cardId: input.cardId,
          amount: toCents(input.amount),
          merchantName: input.merchant,
        });

        const APPROVED = new Set(["authorized", "approved", "approved_completed"]);
        if (APPROVED.has(auth.status)) {
          return { status: "APPROVED" };
        }

        return {
          status: "DECLINED",
          reason: auth.declinedReason || `Status: ${auth.status}`,
        };
      } catch (err) {
        return {
          status: "DECLINED",
          reason: err instanceof Error ? err.message : String(err),
        };
      }
    },

    async releaseCard(cardId: string): Promise<void> {
      cardSessions.delete(cardId);
    },

    async expireCard(cardId: string): Promise<void> {
      const { cancelCard } = await import("./rain-client");
      try {
        await cancelCard(cardId);
      } catch {
        // best effort
      }
      cardSessions.delete(cardId);
    },
  };
}
