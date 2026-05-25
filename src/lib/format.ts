export function formatCurrency(value: number | null | undefined, compact = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0
  }).format(value);
}

export function formatNumber(value: number | null | undefined, compact = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function trendTone(value: number | null | undefined): string {
  if (value === null || value === undefined) return "text-toss-gray";
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-500";
  return "text-toss-gray";
}

export function shortProductName(name: string, asin: string): string {
  if (!name || name === `Mighty Patch ${asin}`) return asin;
  return name.length > 46 ? `${name.slice(0, 43)}...` : name;
}
