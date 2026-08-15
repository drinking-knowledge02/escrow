"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";

const STORAGE_KEY = "sidebar-hidden";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem(STORAGE_KEY) === "true");
    setReady(true);
  }, []);

  function setSidebarHidden(next: boolean) {
    setHidden(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  return (
    <>
      {(!ready || !hidden) && <Sidebar onHide={() => setSidebarHidden(true)} />}
      <main className="relative flex-1 min-h-0 min-w-0 overflow-hidden">
        {ready && hidden && (
          <button
            type="button"
            onClick={() => setSidebarHidden(false)}
            className="absolute top-3 left-3 z-30 h-9 w-9 flex items-center justify-center rounded-[10px] border border-line bg-bg text-muted hover:text-ink hover:bg-surface-2 shadow-[0_1px_2px_rgba(48,32,12,0.06)]"
            aria-label="Show sidebar"
            title="Show sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2.25" y="3" width="13.5" height="12" rx="2" />
              <path d="M7.5 3V15" />
            </svg>
          </button>
        )}
        {children}
      </main>
    </>
  );
}
