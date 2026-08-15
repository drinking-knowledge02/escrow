"use client";

import { useEffect, useState } from "react";

interface HealthPayload {
  status: string;
  timestamp?: string;
  services?: {
    openai: boolean;
    rain: boolean;
    shopifyCatalog: boolean;
    shopifyStore: boolean;
  };
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then(async (res) => {
        const data = (await res.json()) as HealthPayload;
        if (!res.ok) throw new Error("Health check failed");
        setHealth(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load settings");
      });
  }, []);

  const services = health?.services;

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-ink tracking-[-0.02em] mb-1">Settings</h1>
        <p className="text-sm text-muted mb-6">Live integration status. Secrets stay in `.env.local`.</p>

        {error && <p className="text-sm text-declined-text mb-4">{error}</p>}

        <div className="bg-surface rounded-[16px] border border-line divide-y divide-line">
          <Row
            label="Shopify catalog"
            detail="Public UCP search at catalog.shopify.com"
            ok={services?.shopifyCatalog ?? true}
          />
          <Row
            label="Shopify store"
            detail="Optional Admin/Storefront for a store you own"
            ok={services?.shopifyStore ?? false}
            warn
          />
          <Row
            label="Rain cards"
            detail="Scoped card mint, authorize, settle, reverse"
            ok={services?.rain ?? false}
          />
          <Row
            label="OpenAI"
            detail="Intent parser for shop queries"
            ok={services?.openai ?? false}
          />
        </div>

        {health?.timestamp && (
          <p className="text-xs text-faint mt-4">Last check {new Date(health.timestamp).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  detail,
  ok,
  warn,
}: {
  label: string;
  detail: string;
  ok: boolean;
  warn?: boolean;
}) {
  const connected = ok;
  const optionalMissing = warn && !ok;
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-faint mt-0.5">{detail}</p>
      </div>
      <span
        className="text-xs font-medium px-2 py-1 rounded-[6px]"
        style={{
          backgroundColor: connected
            ? "var(--released-bg)"
            : optionalMissing
              ? "var(--held-bg)"
              : "var(--declined-bg)",
          color: connected
            ? "var(--released-text)"
            : optionalMissing
              ? "var(--held-text)"
              : "var(--declined-text)",
        }}
      >
        {connected ? "Connected" : optionalMissing ? "Optional" : "Not configured"}
      </span>
    </div>
  );
}
