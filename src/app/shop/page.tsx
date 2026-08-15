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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const msg = input.trim();
    if (!msg) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    const parseRes = await fetch("/api/agent/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    const parsed: ParsedIntent = await parseRes.json();
    setIntent(parsed);

    const searchRes = await fetch("/api/store/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: parsed.query, budget: parsed.budget }),
    });
    const { products: results } = await searchRes.json();
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
        text: `Found ${results.length} match${results.length !== 1 ? "es" : ""} within your budget. Here's what I've locked in:`,
        chips: [
          { label: "Heirloom Home", type: "merchant" },
          { label: `≤ $${parsed.budget.toFixed(2)}`, type: "cap" },
          { label: conditionLabel, type: "condition" },
        ],
      },
    ]);
    setLoading(false);
  }

  async function handleConfirm() {
    const product = products.find((p) => p.id === selectedId);
    if (!product || !intent) return;
    setCreating(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: product.name,
        meta: product.meta,
        price: product.price,
        thumbSeed: product.thumbSeed,
        merchant: "Heirloom Home",
        releaseCondition: intent.releaseCondition,
      }),
    });
    const { order } = await res.json();
    router.push(`/escrow/${order.id}`);
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-64px)]">
      {/* Chat Panel */}
      <div className="w-[340px] shrink-0 flex flex-col bg-surface rounded-[16px] border border-line shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="px-5 pt-5 pb-3 border-b border-line">
          <h2 className="text-sm font-semibold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            Shop with your agent
          </h2>
          <p className="text-xs text-faint mt-0.5">Describe what you want, set your terms</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-brand-soft flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--brand)" strokeWidth="1.5">
                  <path d="M3 10L5.5 7.5L8 10" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5.5 7.5V15" strokeLinecap="round"/>
                  <path d="M12 5L14.5 7.5L17 5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14.5 7.5V15" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm text-muted">Tell me what you&apos;re looking for</p>
              <p className="text-xs text-faint mt-1">e.g. &quot;matte black task lamp under $130, pay on delivery&quot;</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-[14px] text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-brand text-white"
                    : "bg-surface-2 text-ink border border-line"
                }`}
              >
                <p>{msg.text}</p>
                {msg.chips && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.chips.map((chip, ci) => (
                      <span
                        key={ci}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-xs font-medium"
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
                        {chip.type === "merchant" && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <rect x="1" y="1" width="8" height="8" rx="1.5" />
                          </svg>
                        )}
                        {chip.type === "cap" && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <circle cx="5" cy="5" r="3.5" />
                          </svg>
                        )}
                        {chip.type === "condition" && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <path d="M3 5L4.5 6.5L7 3.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {chip.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-2 border border-line px-4 py-3 rounded-[14px]">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-faint animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-faint animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-faint animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="p-3 border-t border-line">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="What are you looking for?"
              className="flex-1 px-3.5 py-2.5 text-sm bg-surface-2 border border-line rounded-[10px] text-ink placeholder:text-faint outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-10 h-10 flex items-center justify-center rounded-[10px] bg-brand text-white disabled:opacity-40 hover:bg-brand-ink transition-colors shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2.25 9L15.75 2.25L12.75 15.75L9 10.5L2.25 9Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Results Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {products.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="text-sm text-muted">
                  {products.length} match{products.length !== 1 ? "es" : ""} · from{" "}
                  <span className="font-medium text-ink">Heirloom Home</span>
                </span>
              </div>
              {selectedId && (
                <button
                  onClick={handleConfirm}
                  disabled={creating}
                  className="px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-[10px] hover:bg-brand-ink transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating order…" : "Confirm & checkout →"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-[16px] bg-surface-2 border border-line flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--faint)" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M18 18L24 24" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-muted text-sm">Products will appear here</p>
              <p className="text-faint text-xs mt-1">Start a conversation to search the store</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
