import { randomUUID } from "node:crypto";
import { createRainSession, decryptSecret, type RainSession } from "./rain-session";

export interface RainCard {
  id: string;
  last4: string;
  status?: string;
  expirationMonth?: string | number;
  expirationYear?: string | number;
  expiryMonth?: string | number;
  expiryYear?: string | number;
  limit?: { amount: number; frequency?: string };
  encryptedPan?: { data: string; iv: string } | string;
  encryptedCvc?: { data: string; iv: string } | string;
}

export interface RainAuthorization {
  transactionId: string;
  status: string;
  declinedReason?: string;
}

class RainApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "RainApiError";
  }
}

interface RainConfig {
  apiKey: string;
  baseUrl: string;
  userId: string;
}

function getConfig(): RainConfig {
  const apiKey = process.env.RAIN_API_KEY;
  const userId = process.env.RAIN_USER_ID;
  const baseUrl = process.env.RAIN_API_BASE_URL || "https://api-dev.raincards.xyz/v1";

  if (!apiKey || !userId) {
    throw new Error("RAIN_API_KEY and RAIN_USER_ID must be set");
  }

  return { apiKey, baseUrl, userId };
}

async function request<T>(
  cfg: RainConfig,
  path: string,
  init: { method: string; body?: unknown; headers?: Record<string, string> },
): Promise<T> {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: init.method,
    headers: {
      "Api-Key": cfg.apiKey,
      "Content-Type": "application/json",
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const raw = await res.text();
  let parsed: unknown = raw;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    // leave as text
  }

  if (!res.ok) {
    throw new RainApiError(
      `Rain ${init.method} ${path} failed with ${res.status}: ${
        typeof parsed === "string" ? parsed : JSON.stringify(parsed)
      }`,
      res.status,
      parsed,
    );
  }

  return parsed as T;
}

function unwrap<T>(body: unknown): T {
  if (body && typeof body === "object" && "data" in (body as Record<string, unknown>)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export async function createRealScopedCard(input: {
  amountInUSDCents: number;
  expiresAt: string;
}): Promise<{ card: RainCard; session: RainSession }> {
  const cfg = getConfig();
  const session = createRainSession();

  const body = await request<unknown>(cfg, `/issuing/users/${cfg.userId}/cards/scoped`, {
    method: "POST",
    headers: {
      sessionid: session.sessionId,
      "Idempotency-Key": randomUUID(),
    },
    body: {
      amountInUSDCents: input.amountInUSDCents,
      expiresAt: input.expiresAt,
    },
  });

  return { card: unwrap<RainCard>(body), session };
}

export async function simulateAuthorize(input: {
  cardId: string;
  amount: number;
  merchantName: string;
}): Promise<RainAuthorization> {
  const cfg = getConfig();
  const body = await request<unknown>(cfg, `/simulate/transactions/authorize`, {
    method: "POST",
    body: {
      cardId: input.cardId,
      amount: input.amount,
      currency: "USD",
      merchantName: input.merchantName,
      merchantCategoryCode: "5065",
    },
  });
  return unwrap<RainAuthorization>(body);
}

export async function simulateSettle(
  transactionId: string,
  amountInUSDCents: number,
): Promise<RainAuthorization> {
  const cfg = getConfig();
  const body = await request<unknown>(
    cfg,
    `/simulate/transactions/${transactionId}/settle`,
    { method: "POST", body: { amount: amountInUSDCents } },
  );
  return unwrap<RainAuthorization>(body);
}

export async function reverseAuthorization(transactionId: string): Promise<RainAuthorization> {
  const cfg = getConfig();
  const body = await request<unknown>(
    cfg,
    `/simulate/transactions/${transactionId}/reverse`,
    { method: "POST", body: {} },
  );
  return unwrap<RainAuthorization>(body);
}

export async function cancelCard(cardId: string): Promise<void> {
  const cfg = getConfig();
  await request<unknown>(cfg, `/issuing/cards/${cardId}`, {
    method: "PATCH",
    body: { status: "canceled" },
  });
}

function decryptField(
  field: RainCard["encryptedPan"],
  session: RainSession,
): string | null {
  if (!field || typeof field === "string" || !field.data || !field.iv) {
    return null;
  }
  try {
    return decryptSecret(field.data, field.iv, session.secretKey);
  } catch {
    return null;
  }
}

export function revealPan(card: RainCard, session: RainSession): string {
  return decryptField(card.encryptedPan, session) ?? "";
}

export function revealCvc(card: RainCard, session: RainSession): string {
  return decryptField(card.encryptedCvc, session) ?? "";
}

export function revealLast4(card: RainCard, session: RainSession): string {
  const pan = revealPan(card, session);
  if (pan) return pan.slice(-4);
  return card.last4 ?? "";
}
