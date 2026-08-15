"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Product, ParsedIntent } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  chips?: { label: string; type: "merchant" | "cap" | "condition" }[];
}

export default function ShopPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [storeName, setStoreName] = useState("Shopify Catalog");
  const [queryLabel, setQueryLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const lastAgent = [...messages].reverse().find((m) => m.role === "agent");

  async function handleSend() {
    const msg = input.trim();
    if (!msg) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const parseRes = await fetch("/api/agent/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const parsed = (await parseRes.json()) as ParsedIntent;
      if (!parsed?.query) {
        throw new Error("Could not parse that request");
      }
      setIntent(parsed);
      setQueryLabel(parsed.query);

      const searchRes = await fetch("/api/store/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: parsed.query, budget: parsed.budget }),
      });
      const searchBody = await searchRes.text();
      if (!searchBody) {
        throw new Error("Store search returned an empty response");
      }
      const searchJson = JSON.parse(searchBody) as {
        products?: Product[];
        error?: string;
        storeName?: string;
      };
      if (searchJson.error && (!searchJson.products || searchJson.products.length === 0)) {
        throw new Error(searchJson.error);
      }
      const results = Array.isArray(searchJson.products) ? searchJson.products : [];
      const vendors = Array.from(new Set(results.map((p) => p.vendor).filter(Boolean))) as string[];
      const merchant =
        vendors.length === 1
          ? vendors[0]
          : vendors.length > 1
            ? `${vendors.length} Shopify stores`
            : searchJson.storeName || "Shopify Catalog";
      setStoreName(merchant);
      setProducts(results);
      if (results.length > 0) setSelectedId(results[0].id);

      const conditionLabel =
        parsed.releaseCondition === "on_delivery"
          ? "Release on delivery"
          : parsed.releaseCondition === "on_inspection"
            ? "Release on inspection"
            : parsed.releaseCondition;

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: `Found ${results.length} match${results.length !== 1 ? "es" : ""} for “${parsed.query}”.`,
          chips: [
            { label: merchant, type: "merchant" },
            { label: `≤ $${Number(parsed.budget || 0).toFixed(2)}`, type: "cap" },
            { label: conditionLabel, type: "condition" },
          ],
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: `I couldn't complete that search. ${message}` },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleConfirm() {
    const product = products.find((p) => p.id === selectedId);
    if (!product || !intent) return;
    setCreating(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          meta: product.meta,
          price: product.price,
          thumbSeed: product.thumbSeed,
          productId: product.id,
          variantId: product.variantId,
          imageUrl: product.imageUrl,
          vendor: product.vendor,
          currency: product.currency,
          checkoutUrl: product.checkoutUrl,
          productUrl: product.productUrl,
          sellerDomain: product.sellerDomain,
          merchant: product.vendor || storeName,
          releaseCondition: intent.releaseCondition,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.order) {
        throw new Error(payload.error || "Checkout failed");
      }
      router.push(`/escrow/${payload.order.id}`);
    } catch (error) {
      setCreating(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text:
            error instanceof Error
              ? `Checkout failed: ${error.message}`
              : "Checkout failed",
        },
      ]);
    }
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="h-full flex flex-col bg-bg">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {products.length > 0 ? (
          <div className="max-w-[920px] mx-auto px-6 py-6">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <h1 className="text-[22px] font-semibold text-ink tracking-[-0.02em]">
                  {queryLabel ? `Results for “${queryLabel}”` : "Search results"}
                </h1>
                <p className="text-sm text-muted mt-1">
                  {products.length} product{products.length !== 1 ? "s" : ""} from {storeName}
                </p>
              </div>
              {selectedId && (
                <button
                  onClick={handleConfirm}
                  disabled={creating}
                  className="px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-[10px] hover:bg-brand-ink transition-colors disabled:opacity-50 shrink-0"
                >
                  {creating ? "Minting Rain card…" : "Checkout with Rain"}
                </button>
              )}
            </div>

            <div className="bg-surface rounded-[12px] border border-line overflow-hidden shadow-[0_1px_2px_rgba(48,32,12,0.04)]">
              {products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selected={product.id === selectedId}
                  bestMatch={i === 0}
                  onSelect={() => setSelectedId(product.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center px-6">
            <div className="text-center max-w-md">
              <p className="text-[22px] font-semibold text-ink tracking-[-0.02em]">Search Shopify</p>
              <p className="text-sm text-muted mt-2">
                Type what you want below. Live catalog results fill this page, then checkout with a Rain card.
              </p>
              {lastAgent && (
                <p className="text-sm text-faint mt-4">{lastAgent.text}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-surface/90 backdrop-blur-sm">
        {lastAgent?.chips && (
          <div className="max-w-[920px] mx-auto px-6 pt-3 flex flex-wrap gap-1.5">
            {lastAgent.chips.map((chip, ci) => (
              <span
                key={ci}
                className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-medium"
                style={{
                  fontFamily: chip.type === "cap" ? "var(--font-mono)" : undefined,
                  backgroundColor:
                    chip.type === "merchant" ? "var(--brand-soft)" :
                    chip.type === "cap" ? "var(--held-bg)" :
                    "var(--released-bg)",
                  color:
                    chip.type === "merchant" ? "var(--brand-ink)" :
                    chip.type === "cap" ? "var(--held-text)" :
                    "var(--released-text)",
                }}
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}

        <form
          className="max-w-[920px] mx-auto px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div className="flex items-center gap-2 rounded-[14px] border border-line bg-bg px-3 py-2 shadow-[0_8px_24px_rgba(48,32,12,0.08)]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--faint)" strokeWidth="1.6" className="shrink-0 ml-1">
              <circle cx="8" cy="8" r="5.25" />
              <path d="M12 12L16 16" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search products, e.g. wireless headphones under $100"
              className="flex-1 px-2 py-2.5 text-[15px] bg-transparent text-ink placeholder:text-faint outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-10 px-4 flex items-center justify-center rounded-[10px] bg-brand text-white text-sm font-medium disabled:opacity-40 hover:bg-brand-ink transition-colors shrink-0"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
