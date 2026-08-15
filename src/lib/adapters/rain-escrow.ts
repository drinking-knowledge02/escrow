import type { CardCredentials } from "../types";
import { cancelCard, createRealScopedCard, revealCvc, revealLast4, revealPan } from "./rain-client";

export async function mintScopedCard(merchantId: string, amount: number): Promise<CardCredentials> {
  const { card, session } = await createRealScopedCard({
    amountInUSDCents: Math.round(amount * 100),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  });
  const pan = revealPan(card, session);
  const last4 = revealLast4(card, session) || card.last4;
  const cvc = revealCvc(card, session);
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000);

  console.log(`[rain] Minted scoped card ${card.id} •••• ${last4} for ${merchantId}`);

  return {
    cardId: card.id,
    cardNumber: pan || `************${last4}`,
    expiryMonth: String(expires.getUTCMonth() + 1).padStart(2, "0"),
    expiryYear: String(expires.getUTCFullYear()),
    cvc: cvc || "***",
    amount,
    currency: "USD",
    merchantId,
    status: card.status || "active",
    createdAt: new Date().toISOString(),
  };
}

export async function cancelRainCard(cardId: string) {
  await cancelCard(cardId);
  return {
    cardId,
    status: "canceled",
    cancelledAt: new Date().toISOString(),
  };
}
