"use client";

import type { Product } from "@/lib/types";

const GRADIENTS: Record<string, string> = {
  "lamp-black": "from-gray-800 to-gray-900",
  "lamp-brass": "from-amber-200 to-yellow-300",
  "lamp-ceramic": "from-stone-100 to-stone-200",
  organizer: "from-amber-700 to-amber-800",
  pourover: "from-stone-50 to-stone-100",
  blanket: "from-orange-50 to-amber-100",
  planter: "from-gray-400 to-gray-500",
  shelf: "from-amber-100 to-orange-200",
};

const ICONS: Record<string, string> = {
  "lamp-black": "💡",
  "lamp-brass": "🪔",
  "lamp-ceramic": "🏺",
  organizer: "📦",
  pourover: "☕",
  blanket: "🧣",
  planter: "🪴",
  shelf: "📚",
};

export function ProductCard({
  product,
  selected,
  bestMatch,
  onSelect,
}: {
  product: Product;
  selected: boolean;
  bestMatch: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group relative text-left bg-surface rounded-[16px] border-2 transition-all overflow-hidden ${
        selected
          ? "border-brand shadow-[0_0_0_3px_var(--brand-soft)]"
          : "border-line hover:border-muted/30"
      }`}
    >
      {bestMatch && (
        <span className="absolute top-3 right-3 z-10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-brand text-white rounded-[6px]">
          Best match
        </span>
      )}

      {/* Thumbnail placeholder */}
      <div
        className={`h-36 bg-gradient-to-br ${GRADIENTS[product.thumbSeed] || "from-gray-100 to-gray-200"} flex items-center justify-center`}
      >
        <span className="text-4xl opacity-60">{ICONS[product.thumbSeed] || "🛍️"}</span>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-ink leading-tight">{product.name}</h3>
        <p className="text-xs text-faint mt-1">{product.meta}</p>
        <div className="flex items-center justify-between mt-3">
          <span
            className="text-sm font-medium text-ink"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            ${product.price.toFixed(2)}
          </span>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-[8px] transition-colors ${
              selected
                ? "bg-brand text-white"
                : "bg-surface-2 text-muted group-hover:bg-brand-soft group-hover:text-brand-ink"
            }`}
          >
            {selected ? "Selected" : "Pick"}
          </span>
        </div>
      </div>
    </button>
  );
}
