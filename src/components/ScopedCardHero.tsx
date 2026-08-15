"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/lib/types";

export function ScopedCardHero({ order }: { order: Order }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const expiresAt = new Date(order.scope.expiresAt);
  const diff = expiresAt.getTime() - now.getTime();
  const expired = diff <= 0;
  const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
  const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));

  const isHeld = order.state === "HELD";
  const isReleased = order.state === "RELEASED";

  return (
    <div
      className="relative rounded-[16px] overflow-hidden p-6 text-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
      style={{
        background: isReleased
          ? "linear-gradient(135deg, #0E7C5A 0%, #0A5C43 100%)"
          : "linear-gradient(135deg, #4C46E0 0%, #6C3ABA 50%, #2E2A8A 100%)",
      }}
    >
      {/* Gold chip mark */}
      <div className="absolute top-5 right-5 w-8 h-5 rounded-[3px] bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-80" />

      {/* Label */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs font-medium opacity-80 tracking-wide uppercase">
          Scoped card · Rain
        </span>
      </div>

      {/* Status chip */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-white/15 backdrop-blur-sm">
          {isHeld && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: "var(--held-text)" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "#F4DFB8" }} />
            </span>
          )}
          {isReleased && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2">
              <path d="M2.5 6L5 8.5L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span className="text-xs font-semibold">
            {order.state === "HELD" ? "Held" : order.state === "RELEASED" ? "Released" : order.state}
          </span>
        </div>
      </div>

      {/* Card number */}
      <div className="mb-6" style={{ fontFamily: "var(--font-mono)" }}>
        <span className="text-lg tracking-[0.15em] opacity-60">•••• •••• ••••</span>{" "}
        <span className="text-lg tracking-[0.15em]">{order.card.last4}</span>
      </div>

      {/* Scope row */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <span>Locked to {order.merchant}</span>
        <span>·</span>
        <span>Spend cap ${order.scope.spendCap.toFixed(2)}</span>
        <span>·</span>
        <span>
          {expired
            ? "Expired"
            : `Expires ${hours}h ${minutes}m`}
        </span>
      </div>
    </div>
  );
}
