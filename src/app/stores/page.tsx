"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Order } from "@/lib/types";

interface StoreRow {
  name: string;
  domain?: string;
  orders: number;
  held: number;
}

export default function StoresPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then(({ orders: o }) => setOrders(Array.isArray(o) ? o : []))
      .finally(() => setLoading(false));
  }, []);

  const stores = useMemo(() => {
    const map = new Map<string, StoreRow>();
    for (const order of orders) {
      const key = order.sellerDomain || order.merchant;
      const existing = map.get(key);
      if (existing) {
        existing.orders += 1;
        if (order.state === "HELD") existing.held += 1;
      } else {
        map.set(key, {
          name: order.merchant,
          domain: order.sellerDomain,
          orders: 1,
          held: order.state === "HELD" ? 1 : 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.orders - a.orders);
  }, [orders]);

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-ink tracking-[-0.02em] mb-1">Stores</h1>
        <p className="text-sm text-muted mb-6">
          Shopify merchants from live catalog checkouts. Search on Shop hits the public Shopify catalog.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stores.length === 0 ? (
          <div className="rounded-[16px] border border-line bg-surface p-10 text-center">
            <p className="text-sm text-muted">No stores yet — checkout a catalog product to pin its merchant here.</p>
            <Link href="/shop" className="inline-block mt-3 text-sm font-medium text-brand">
              Search Shopify →
            </Link>
          </div>
        ) : (
          <div className="bg-surface rounded-[16px] border border-line overflow-hidden">
            {stores.map((store) => (
              <div key={store.domain || store.name} className="flex items-center gap-4 px-5 py-4 border-b border-line last:border-0">
                <div className="w-10 h-10 rounded-[10px] bg-brand-soft text-brand-ink flex items-center justify-center text-sm font-semibold">
                  {store.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">{store.name}</p>
                  {store.domain && <p className="text-xs text-faint mt-0.5">{store.domain}</p>}
                </div>
                <p className="text-xs text-muted">
                  {store.orders} order{store.orders !== 1 ? "s" : ""}
                  {store.held > 0 ? ` · ${store.held} held` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
