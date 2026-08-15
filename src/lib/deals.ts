import type { Deal } from "./types";

export const DealStatus = {
  CREATED: "CREATED",
  HELD: "HELD",
  RELEASED: "RELEASED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

const deals = new Map<string, Deal>();

export function createDeal(dealData: Omit<Deal, "dealId" | "status" | "createdAt" | "updatedAt"> & Partial<Pick<Deal, "status">>): Deal {
  const dealId = `deal_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  const deal: Deal = {
    ...dealData,
    dealId,
    status: dealData.status ?? DealStatus.CREATED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  deals.set(dealId, deal);
  console.log(`[deals] Created ${dealId} with status ${deal.status}`);
  return deal;
}

export function getDeal(dealId: string): Deal | null {
  return deals.get(dealId) ?? null;
}

export function updateDealStatus(
  dealId: string,
  newStatus: Deal["status"],
  additionalData: Partial<Deal> = {},
): Deal {
  const deal = deals.get(dealId);
  if (!deal) {
    throw new Error(`Deal not found: ${dealId}`);
  }

  Object.assign(deal, additionalData, {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  });
  deals.set(dealId, deal);
  console.log(`[deals] Updated ${dealId} to ${newStatus}`);
  return deal;
}

export function addCardCredentials(dealId: string, cardCredentials: Deal["cardCredentials"]): Deal {
  const deal = deals.get(dealId);
  if (!deal) {
    throw new Error(`Deal not found: ${dealId}`);
  }
  deal.cardCredentials = cardCredentials;
  deal.updatedAt = new Date().toISOString();
  deals.set(dealId, deal);
  return deal;
}

export function getAllDeals(): Deal[] {
  return Array.from(deals.values());
}

export function deleteDeal(dealId: string): boolean {
  return deals.delete(dealId);
}

export function toDealResponse(deal: Deal) {
  return {
    dealId: deal.dealId,
    storeName: deal.storeName,
    merchantId: deal.merchantId,
    productTitle: deal.productTitle,
    amount: deal.amount,
    status: deal.status,
  };
}
