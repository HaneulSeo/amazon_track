export type DisplayCurrency = "USD" | "KRW";

export function formatCurrency(value: number | null | undefined, compact = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0
  }).format(value);
}

export function formatMoneyFromUsd(
  valueUsd: number | null | undefined,
  currency: DisplayCurrency,
  usdKrw: number,
  compact = true
): string {
  if (valueUsd === null || valueUsd === undefined || Number.isNaN(valueUsd)) return "-";
  if (currency === "KRW") {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: 0
    }).format(valueUsd * usdKrw);
  }

  return formatCurrency(valueUsd, compact);
}

export function formatMoneyFromKrw(
  valueKrw: number | null | undefined,
  currency: DisplayCurrency,
  usdKrw: number,
  compact = true
): string {
  if (valueKrw === null || valueKrw === undefined || Number.isNaN(valueKrw)) return "-";
  if (currency === "USD") {
    return formatCurrency(valueKrw / usdKrw, compact);
  }

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 0
  }).format(valueKrw);
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
  const normalized = (name ?? "").trim();
  if (!normalized) return "품명 미확인";
  if (/^ASIN\s+/i.test(normalized)) return "품명 미확인";
  if (normalized === asin) return "품명 미확인";
  if (normalized === `Mighty Patch ${asin}`) return "품명 미확인";
  if (/^unknown product$/i.test(normalized)) return "품명 미확인";
  return name.length > 46 ? `${name.slice(0, 43)}...` : name;
}

export function productLabel(name: string, asin: string): string {
  return `${shortProductName(name, asin)} / ${asin}`;
}
