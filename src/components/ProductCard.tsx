"use client";

import type { Product } from "@/lib/types";

function formatPrice(product: Product): string {
  if (product.currency && product.currency !== "USD") {
    return `${product.currency} ${product.price.toFixed(2)}`;
  }
  return `$${product.price.toFixed(2)}`;
}

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
      className={`w-full text-left px-4 py-3.5 flex items-center gap-4 border-b border-line last:border-b-0 transition-colors ${
        selected ? "bg-brand-soft/70" : "hover:bg-surface-2/80"
      }`}
    >
      <div className="w-[88px] h-[88px] rounded-[8px] bg-[#F6F6F7] border border-line overflow-hidden flex items-center justify-center shrink-0">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain" />
        ) : (
          <span className="text-2xl opacity-40">🛍️</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h3 className="text-[15px] font-medium text-ink leading-snug line-clamp-2">{product.name}</h3>
          {bestMatch && (
            <span className="shrink-0 mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-brand text-white rounded-[4px]">
              Best
            </span>
          )}
        </div>
        {product.vendor && (
          <p className="text-[13px] text-muted mt-1">
            Sold by {product.vendor}
          </p>
        )}
        {product.meta && (
          <p className="text-[12px] text-faint mt-0.5 line-clamp-1">{product.meta}</p>
        )}
      </div>

      <div className="shrink-0 text-right pl-4">
        <p className="text-[15px] font-semibold text-ink tabular-nums">{formatPrice(product)}</p>
        <p className={`text-[12px] mt-1 ${selected ? "text-brand-ink font-medium" : "text-faint"}`}>
          {selected ? "Selected" : "Select"}
        </p>
      </div>
    </button>
  );
}
