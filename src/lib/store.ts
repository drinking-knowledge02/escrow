import type { Order } from "./types";

const orders = new Map<string, Order>();

const SEED_ORDERS: Order[] = [
  {
    id: "ORD-1001",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    item: { name: "Ceramic Pour-Over Set", meta: "Matte white · 350ml", price: 64.00, thumbSeed: "ceramic" },
    merchant: "Heirloom Home",
    amount: 64.00,
    scope: { merchantLock: true, spendCap: 64.00, expiresAt: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString() },
    card: { id: "card_seed_1", last4: "4821", state: "frozen" },
    releaseCondition: "on_delivery",
    state: "HELD",
  },
  {
    id: "ORD-1002",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    item: { name: "Walnut Desk Organizer", meta: "Natural finish · 12\"", price: 89.00, thumbSeed: "walnut" },
    merchant: "Heirloom Home",
    amount: 89.00,
    scope: { merchantLock: true, spendCap: 89.00, expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
    card: { id: "card_seed_2", last4: "7733", state: "active" },
    releaseCondition: "on_delivery",
    state: "RELEASED",
    releasedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ORD-1003",
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    item: { name: "Brass Table Lamp", meta: "Brushed finish · 18\"H", price: 145.00, thumbSeed: "lamp" },
    merchant: "Heirloom Home",
    amount: 145.00,
    scope: { merchantLock: true, spendCap: 145.00, expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    card: { id: "card_seed_3", last4: "2190", state: "expired" },
    releaseCondition: "on_delivery",
    state: "REFUNDED",
    refundedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ORD-1004",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    item: { name: "Linen Throw Blanket", meta: "Oat · 50×70\"", price: 78.00, thumbSeed: "linen" },
    merchant: "Heirloom Home",
    amount: 78.00,
    scope: { merchantLock: true, spendCap: 78.00, expiresAt: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString() },
    card: { id: "card_seed_4", last4: "5567", state: "frozen" },
    releaseCondition: "on_delivery",
    state: "HELD",
  },
];

let seeded = false;

function ensureSeeded() {
  if (seeded) return;
  seeded = true;
  for (const o of SEED_ORDERS) {
    orders.set(o.id, o);
  }
}

export function getAllOrders(): Order[] {
  ensureSeeded();
  return Array.from(orders.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getOrder(id: string): Order | undefined {
  ensureSeeded();
  return orders.get(id);
}

export function upsertOrder(order: Order): Order {
  ensureSeeded();
  orders.set(order.id, order);
  return order;
}

export function generateOrderId(): string {
  const num = 1005 + orders.size;
  return `ORD-${num}`;
}
