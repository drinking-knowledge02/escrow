"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Order } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";

export default function ActivityPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then(({ orders: o }) => setOrders(Array.isArray(o) ? o : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-ink tracking-[-0.02em] mb-1">Activity</h1>
        <p className="text-sm text-muted mb-6">Live escrow events from Rain-held Shopify checkouts.</p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-[16px] border border-line bg-surface p-10 text-center">
            <p className="text-sm text-muted">No activity yet.</p>
            <Link href="/shop" className="inline-block mt-3 text-sm font-medium text-brand">
              Search Shopify →
            </Link>
          </div>
        ) : (
          <div className="bg-surface rounded-[16px] border border-line overflow-hidden">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/escrow/${order.id}`}
                className="flex items-center gap-4 px-5 py-4 border-b border-line last:border-0 hover:bg-surface-2/70 transition-colors"
              >
                <div className="w-11 h-11 rounded-[8px] bg-surface-2 overflow-hidden flex items-center justify-center shrink-0">
                  {order.item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={order.item.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "🛍️"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{order.item.name}</p>
                  <p className="text-xs text-faint mt-0.5">
                    {order.merchant} · {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm tabular-nums mr-3" style={{ fontFamily: "var(--font-mono)" }}>
                  ${order.amount.toFixed(2)}
                </span>
                <StatusPill state={order.state} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
