import type { OrderState } from "@/lib/types";

const STYLES: Record<OrderState, { bg: string; text: string; border: string; label: string }> = {
  DRAFT: { bg: "var(--surface-2)", text: "var(--muted)", border: "var(--line)", label: "Draft" },
  HELD: { bg: "var(--held-bg)", text: "var(--held-text)", border: "var(--held-border)", label: "Funds held" },
  RELEASED: { bg: "var(--released-bg)", text: "var(--released-text)", border: "var(--released-border)", label: "Released" },
  REFUNDED: { bg: "var(--declined-bg)", text: "var(--declined-text)", border: "var(--declined-border)", label: "Refunded" },
};

export function StatusPill({ state, animate }: { state: OrderState; animate?: boolean }) {
  const s = STYLES[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-[8px] border transition-all ${
        animate ? "scale-105" : ""
      }`}
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
    >
      {state === "HELD" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: s.text }} />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: s.text }} />
        </span>
      )}
      {s.label}
    </span>
  );
}
