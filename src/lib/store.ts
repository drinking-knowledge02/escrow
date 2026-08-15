import type { Order } from "./types";

const orders = new Map<string, Order>();
let nextOrderNumber = 1001;

export function getAllOrders(): Order[] {
  return Array.from(orders.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getOrder(id: string): Order | undefined {
  return orders.get(id);
}

export function upsertOrder(order: Order): Order {
  orders.set(order.id, order);
  return order;
}

export function generateOrderId(): string {
  const id = `ORD-${nextOrderNumber}`;
  nextOrderNumber += 1;
  return id;
}
