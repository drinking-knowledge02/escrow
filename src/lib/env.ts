function looksLikePlaceholder(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return true;
  if (v.startsWith("your-") || v.startsWith("your_")) return true;
  if (v.includes("xxxxxxxx") || v.includes("example.com") || v.includes("example.")) return true;
  if (v.includes("your-store") || v.includes("your_shopify") || v.includes("your_openai")) return true;
  return false;
}

export function isEnvSet(value: string | undefined | null): boolean {
  if (!value) return false;
  return !looksLikePlaceholder(value);
}
