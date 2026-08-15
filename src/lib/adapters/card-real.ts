import type { ChargeResult, ScopedCard } from "../types";
import type {
  AuthorizeChargeInput,
  CardAdapter,
  ExpireCardInput,
  IssueScopedCardInput,
  SettleChargeInput,
} from "./card";
import {
  cancelCard,
  createRealScopedCard,
  revealCvc,
  revealLast4,
  revealPan,
  reverseAuthorization,
  simulateAuthorize,
  simulateSettle,
  type RainCard,
} from "./rain-client";
import type { RainSession } from "./rain-session";

const cardSessions = new Map<string, { rainCard: RainCard; session: RainSession }>();

function toCents(amount: number): number {
  return Math.round(Number(amount.toFixed(2)) * 100);
}

function twoDigit(value: string | number | undefined, fallback: string): string {
  if (value == null || value === "") return fallback;
  return String(value).padStart(2, "0").slice(-2);
}

function fourDigitYear(value: string | number | undefined, fallback: string): string {
  if (value == null || value === "") return fallback;
  const raw = String(value);
  if (raw.length === 2) return `20${raw}`;
  return raw;
}

export function createRealCardAdapter(): CardAdapter {
  return {
    async issueScopedCard(input: IssueScopedCardInput): Promise<ScopedCard> {
      const amountInUSDCents = toCents(input.amountCap);
      const expiresAt = new Date(
        Date.now() + input.expiresInHours * 60 * 60 * 1000,
      ).toISOString();

      const { card, session } = await createRealScopedCard({
        amountInUSDCents,
        expiresAt,
      });

      const pan = revealPan(card, session);
      const last4 = revealLast4(card, session);
      const cvc = revealCvc(card, session);
      const expiry = new Date(expiresAt);
      const expiryMonth = twoDigit(
        card.expirationMonth ?? card.expiryMonth,
        String(expiry.getUTCMonth() + 1),
      );
      const expiryYear = fourDigitYear(
        card.expirationYear ?? card.expiryYear,
        String(expiry.getUTCFullYear()),
      );

      cardSessions.set(card.id, { rainCard: card, session });

      console.log(
        `[rain] scoped card ${card.id} •••• ${last4} · $${input.amountCap.toFixed(2)} · expires ${expiresAt}`,
      );

      return {
        id: card.id,
        last4,
        state: "frozen",
        pan: pan || undefined,
        expiryMonth,
        expiryYear,
        cvc: cvc || undefined,
      };
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
          return { status: "APPROVED", transactionId: auth.transactionId };
        }

        return {
          status: "DECLINED",
          reason: auth.declinedReason || `Status: ${auth.status}`,
          transactionId: auth.transactionId,
        };
      } catch (err) {
        return {
          status: "DECLINED",
          reason: err instanceof Error ? err.message : String(err),
        };
      }
    },

    async settleCharge(input: SettleChargeInput): Promise<void> {
      await simulateSettle(input.transactionId, toCents(input.amount));
      console.log(`[rain] settled ${input.transactionId} for card ${input.cardId}`);
    },

    async releaseCard(cardId: string): Promise<void> {
      cardSessions.delete(cardId);
    },

    async expireCard(input: ExpireCardInput): Promise<void> {
      if (input.transactionId) {
        await reverseAuthorization(input.transactionId);
        console.log(`[rain] reversed ${input.transactionId} for card ${input.cardId}`);
      }
      try {
        await cancelCard(input.cardId);
      } catch (error) {
        console.error("[rain] cancel card failed:", error);
      }
      cardSessions.delete(input.cardId);
    },
  };
}
