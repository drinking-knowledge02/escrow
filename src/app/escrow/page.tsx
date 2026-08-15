"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Order } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";

export default function EscrowDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then(({ orders: o }) => {
        setOrders(o);
        setLoading(false);
      });
  }, []);

  const held = orders.filter((o) => o.state === "HELD");
  const released = orders.filter((o) => o.state === "RELEASED");
  const refunded = orders.filter((o) => o.state === "REFUNDED");

  const heldTotal = held.reduce((s, o) => s + o.amount, 0);
  const releasedTotal = released.reduce((s, o) => s + o.amount, 0);
  const refundedTotal = refunded.reduce((s, o) => s + o.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-xl tracking-[-0.02em] text-ink"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          Escrow
        </h1>
        <Link
          href="/shop"
          className="px-4 py-2.5 bg-brand text-white text-sm font-medium rounded-[10px] hover:bg-brand-ink transition-colors"
        >
          + New purchase
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Held in escrow"
          total={heldTotal}
          count={held.length}
          bgColor="var(--held-bg)"
          textColor="var(--held-text)"
          borderColor="var(--held-border)"
        />
        <StatCard
          label="Released this week"
          total={releasedTotal}
          count={released.length}
          bgColor="var(--released-bg)"
          textColor="var(--released-text)"
          borderColor="var(--released-border)"
        />
        <StatCard
          label="Auto-refunded"
          total={refundedTotal}
          count={refunded.length}
          bgColor="var(--surface-2)"
          textColor="var(--faint)"
          borderColor="var(--line)"
        />
      </div>

      {/* Orders table */}
      <div className="bg-surface rounded-[16px] border border-line shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-2 border-b border-line text-xs text-faint uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Item</th>
                <th className="text-left px-5 py-3 font-medium">Merchant</th>
                <th className="text-right px-5 py-3 font-medium">Amount</th>
                <th className="text-left px-5 py-3 font-medium">Condition</th>
                <th className="text-left px-5 py-3 font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-line last:border-0 hover:bg-surface-2/50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <Link href={`/escrow/${order.id}`} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-[8px] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-base shrink-0">
                        🛍️
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink group-hover:text-brand transition-colors">
                          {order.item.name}
                        </p>
                        <p className="text-xs text-faint" style={{ fontFamily: "var(--font-mono)" }}>
                          {order.id}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted">{order.merchant}</td>
                  <td className="px-5 py-4 text-sm text-right" style={{ fontFamily: "var(--font-mono)" }}>
                    ${order.amount.toFixed(2)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-muted">
                      {order.state === "RELEASED" && order.releasedAt
                        ? `Delivered ${new Date(order.releasedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                        : order.state === "REFUNDED"
                        ? "Unmet · 7 days"
                        : "On delivery"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill state={order.state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  total,
  count,
  bgColor,
  textColor,
  borderColor,
}: {
  label: string;
  total: number;
  count: number;
  bgColor: string;
  textColor: string;
  borderColor: string;
}) {
  return (
    <div
      className="rounded-[16px] border p-5"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      <p className="text-xs font-medium mb-2" style={{ color: textColor }}>
        {label}
      </p>
      <p
        className="text-2xl font-semibold tracking-tight"
        style={{ color: textColor, fontFamily: "var(--font-mono)" }}
      >
        ${total.toFixed(2)}
      </p>
      <p className="text-xs mt-1 opacity-70" style={{ color: textColor }}>
        {count} order{count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
