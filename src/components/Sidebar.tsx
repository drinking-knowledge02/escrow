"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/shop", label: "Shop", icon: ShoppingBagIcon },
  { href: "/escrow", label: "Escrow", icon: ShieldIcon },
  { href: "/activity", label: "Activity", icon: ActivityIcon },
];

const bottomItems = [
  { href: "/stores", label: "Stores", icon: StoreIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar({ onHide }: { onHide: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-[210px] h-full flex flex-col border-r border-line bg-bg shrink-0">
      <div className="flex items-center justify-end px-3 pt-4 pb-1">
        <button
          type="button"
          onClick={onHide}
          className="h-8 w-8 flex items-center justify-center rounded-[8px] text-faint hover:text-ink hover:bg-surface-2 transition-colors"
          aria-label="Hide sidebar"
          title="Hide sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1.75" y="2.5" width="12.5" height="11" rx="1.75" />
            <path d="M6.5 2.5V13.5" />
            <path d="M4.25 8H2.5" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 flex flex-col px-3 pt-1 gap-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-soft text-brand-ink"
                  : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <item.icon active={active} />
              {item.label}
            </Link>
          );
        })}

        <div className="my-3 border-t border-line" />

        {bottomItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-soft text-brand-ink"
                  : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <item.icon active={active} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function ShoppingBagIcon({ active }: { active: boolean }) {
  const color = active ? "var(--brand-ink)" : "currentColor";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 5.25L5.25 15.75H12.75L13.5 5.25" />
      <path d="M2.25 5.25H15.75" />
      <path d="M6.75 5.25V3.75C6.75 2.50736 7.75736 1.5 9 1.5C10.2426 1.5 11.25 2.50736 11.25 3.75V5.25" />
    </svg>
  );
}

function ShieldIcon({ active }: { active: boolean }) {
  const color = active ? "var(--brand-ink)" : "currentColor";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1.5L2.25 4.5V8.25C2.25 12.5 5.25 15.75 9 16.5C12.75 15.75 15.75 12.5 15.75 8.25V4.5L9 1.5Z" />
      <path d="M6.75 9L8.25 10.5L11.25 7.5" />
    </svg>
  );
}

function ActivityIcon({ active }: { active: boolean }) {
  const color = active ? "var(--brand-ink)" : "currentColor";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 9H4.5L6.75 3L9.75 15L12 9H16.5" />
    </svg>
  );
}

function StoreIcon({ active }: { active: boolean }) {
  const color = active ? "var(--brand-ink)" : "currentColor";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.25 6.75L3 2.25H15L15.75 6.75" />
      <path d="M2.25 6.75C2.25 7.99264 3.25736 9 4.5 9C5.74264 9 6.75 7.99264 6.75 6.75" />
      <path d="M6.75 6.75C6.75 7.99264 7.75736 9 9 9C10.2426 9 11.25 7.99264 11.25 6.75" />
      <path d="M11.25 6.75C11.25 7.99264 12.2574 9 13.5 9C14.7426 9 15.75 7.99264 15.75 6.75" />
      <path d="M2.25 9V15.75H15.75V9" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  const color = active ? "var(--brand-ink)" : "currentColor";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="2.25" />
      <path d="M14.7 11.1C14.5 11.5 14.5 12 14.7 12.4L15.15 13.2C15.35 13.55 15.25 14 14.9 14.2L13.55 15C13.2 15.2 12.75 15.1 12.55 14.75L12.1 13.95C11.9 13.55 11.45 13.3 11 13.3H10.9C10.4 13.3 9.95 13.55 9.75 13.95L9.3 14.75C9.1 15.1 8.65 15.2 8.3 15L6.95 14.2C6.6 14 6.5 13.55 6.7 13.2L7.15 12.4C7.35 12 7.35 11.5 7.15 11.1L7.1 11C6.9 10.6 6.45 10.35 6 10.35H5.1C4.7 10.35 4.35 10.05 4.35 9.6V8.4C4.35 7.95 4.7 7.65 5.1 7.65H6C6.45 7.65 6.9 7.4 7.1 7L7.15 6.9C7.35 6.5 7.35 6 7.15 5.6L6.7 4.8C6.5 4.45 6.6 4 6.95 3.8L8.3 3C8.65 2.8 9.1 2.9 9.3 3.25L9.75 4.05C9.95 4.45 10.4 4.7 10.9 4.7H11C11.45 4.7 11.9 4.45 12.1 4.05L12.55 3.25C12.75 2.9 13.2 2.8 13.55 3L14.9 3.8C15.25 4 15.35 4.45 15.15 4.8L14.7 5.6C14.5 6 14.5 6.5 14.7 6.9L14.75 7C14.95 7.4 15.4 7.65 15.85 7.65H16.75C17.15 7.65 17.5 7.95 17.5 8.4V9.6" />
    </svg>
  );
}
