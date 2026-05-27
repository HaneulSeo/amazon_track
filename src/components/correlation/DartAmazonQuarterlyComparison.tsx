import { QuarterlyComparison } from "@/components/QuarterlyComparison";
import { type DisplayCurrency } from "@/lib/format";
import type { QuarterlyComparison as QuarterlyComparisonRow } from "@/lib/types";

export function DartAmazonQuarterlyComparison({
  rows,
  baseQuarter,
  currency,
  usdKrw
}: {
  rows: QuarterlyComparisonRow[];
  baseQuarter: string | null;
  currency: DisplayCurrency;
  usdKrw: number;
}) {
  return <QuarterlyComparison rows={rows} baseQuarter={baseQuarter} currency={currency} usdKrw={usdKrw} />;
}
