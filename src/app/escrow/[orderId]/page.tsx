"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import type { Order } from "@/lib/types";
import { ScopedCardHero } from "@/components/ScopedCardHero";
import { StatusPill } from "@/components/StatusPill";

export default function EscrowCheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [declining, setDeclining] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [declineResult, setDeclineResult] = useState<{
    attemptedMerchant: string;
    attemptedAmount: number;
    chargeResult: { status: string; reason?: string };
  } | null>(null);
  const [showReleasedAnim, setShowReleasedAnim] = useState(false);

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    if (res.ok) {
      const { order: o } = await res.json();
      setOrder(o);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  async function handleDeclineDemo() {
    setDeclining(true);
    setDeclineResult(null);
    const res = await fetch(`/api/orders/${orderId}/decline`, { method: "POST" });
    const data = await res.json();
    setDeclineResult(data);
    setDeclining(false);
  }

  async function handleRelease() {
    setReleasing(true);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "release" }),
    });
    if (res.ok) {
      setShowReleasedAnim(true);
      const { order: updated } = await res.json();
      setTimeout(() => setOrder(updated), 300);
    }
    setReleasing(false);
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const expiresAt = new Date(order.scope.expiresAt);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <h1
          className="text-xl tracking-[-0.02em] text-ink"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          {order.id}
        </h1>
        <span className="text-sm text-muted">· {order.merchant}</span>
        <StatusPill state={order.state} animate={showReleasedAnim} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Order Summary */}
        <div className="space-y-5">
          <div className="bg-surface rounded-[16px] border border-line p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
            <h2 className="text-sm font-semibold text-ink mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Order summary
            </h2>

            {/* Line item */}
            <div className="flex gap-4 pb-4 border-b border-line">
              <div className="w-16 h-16 rounded-[10px] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-2xl shrink-0">
                🛍️
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">{order.item.name}</p>
                <p className="text-xs text-faint mt-0.5">{order.item.meta}</p>
              </div>
              <span className="text-sm font-medium text-ink shrink-0" style={{ fontFamily: "var(--font-mono)" }}>
                ${order.item.price.toFixed(2)}
              </span>
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>${order.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Shipping</span>
                <span className="text-faint">Free</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-line">
                <span>Held in escrow</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>${order.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Release condition callout */}
          <div
            className="rounded-[12px] p-4 text-sm border"
            style={{
              backgroundColor: "var(--held-bg)",
              borderColor: "var(--held-border)",
              color: "var(--held-text)",
            }}
          >
            <div className="flex items-start gap-2.5">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 mt-0.5">
                <circle cx="9" cy="9" r="7.5" />
                <path d="M9 6V9.75" strokeLinecap="round" />
                <circle cx="9" cy="12.5" r="0.5" fill="currentColor" />
              </svg>
              <div>
                <span className="font-semibold">Release on delivery</span> — capture fires when
                tracking marks delivered, or tap Release. Auto-refund if unmet in 7 days.
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {order.state === "HELD" && (
            <div className="flex gap-3">
              <button
                onClick={handleRelease}
                disabled={releasing}
                className="flex-1 py-3 bg-brand text-white text-sm font-semibold rounded-[10px] hover:bg-brand-ink transition-colors disabled:opacity-50"
              >
                {releasing ? "Confirming…" : "✓ Confirm delivery"}
              </button>
            </div>
          )}

          {order.state === "RELEASED" && (
            <div
              className="rounded-[12px] p-4 text-sm border flex items-center gap-2.5"
              style={{
                backgroundColor: "var(--released-bg)",
                borderColor: "var(--released-border)",
                color: "var(--released-text)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 9L7.5 12.5L14 5.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-semibold">Payment released</span>
              <span className="text-xs ml-auto opacity-70">
                {order.releasedAt && new Date(order.releasedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Right: Scoped Card + Guardrails */}
        <div className="space-y-5">
          <ScopedCardHero order={order} />

          {/* Guardrails panel */}
          <div className="bg-surface rounded-[16px] border border-line p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
            <h2 className="text-sm font-semibold text-ink mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Guardrails
            </h2>
            <div className="space-y-3">
              <GuardrailRow
                icon="🔒"
                label="Merchant lock"
                value={order.merchant}
              />
              <GuardrailRow
                icon="💰"
                label="Spend cap"
                value={`$${order.scope.spendCap.toFixed(2)}`}
                mono
              />
              <GuardrailRow
                icon="⏱"
                label="Auto-expire"
                value={<Countdown expiresAt={expiresAt} />}
                mono
              />
            </div>
          </div>

          {/* Decline demo */}
          {order.state === "HELD" && (
            <div
              className="rounded-[16px] border p-5"
              style={{
                backgroundColor: "var(--declined-bg)",
                borderColor: "var(--declined-border)",
              }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--declined-text)" }}>
                Try it at another store
              </h3>
              <p className="text-xs text-muted mb-3">
                Attempt a $300 charge at &quot;Random Shop&quot; — the card&apos;s scope will block it.
              </p>
              <button
                onClick={handleDeclineDemo}
                disabled={declining}
                className="px-4 py-2 text-sm font-medium rounded-[10px] border transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "var(--declined-bg)",
                  borderColor: "var(--declined-border)",
                  color: "var(--declined-text)",
                }}
              >
                {declining ? "Charging…" : "⚡ Attempt charge"}
              </button>

              {declineResult && (
                <div className="mt-3 p-3 rounded-[10px] border" style={{ borderColor: "var(--declined-border)", backgroundColor: "rgba(196,54,47,0.05)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--declined-bg)] border border-[var(--declined-border)]" style={{ color: "var(--declined-text)", fontFamily: "var(--font-mono)" }}>
                      DECLINED
                    </span>
                    <span className="text-xs text-muted" style={{ fontFamily: "var(--font-mono)" }}>
                      ${declineResult.attemptedAmount.toFixed(2)} @ {declineResult.attemptedMerchant}
                    </span>
                  </div>
                  <p className="text-xs text-faint mt-1.5">{declineResult.chargeResult.reason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GuardrailRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-[10px] bg-brand-soft/40">
      <span className="text-base">{icon}</span>
      <span className="text-sm text-muted flex-1">{label}</span>
      <span
        className="text-sm font-medium text-ink"
        style={mono ? { fontFamily: "var(--font-mono)" } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function Countdown({ expiresAt }: { expiresAt: Date }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = expiresAt.getTime() - now.getTime();
  if (diff <= 0) return <span style={{ color: "var(--declined-text)" }}>Expired</span>;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return (
    <span>
      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}
