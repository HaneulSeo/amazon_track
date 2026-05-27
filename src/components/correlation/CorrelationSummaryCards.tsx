import { SectionCard } from "@/components/SectionCard";
import { formatNumber, trendTone } from "@/lib/format";
import type { CorrelationResult } from "@/lib/types";

export function CorrelationSummaryCards({
  companyLabel,
  results
}: {
  companyLabel: string;
  results: CorrelationResult[];
}) {
  const best = results
    .filter((row) => row.pearson_corr !== null)
    .slice()
    .sort((a, b) => Math.abs(b.pearson_corr ?? 0) - Math.abs(a.pearson_corr ?? 0))[0] ?? null;

  const amazonBest = results.filter((row) => row.indicator_source === "amazon").slice().sort((a, b) => Math.abs(b.pearson_corr ?? 0) - Math.abs(a.pearson_corr ?? 0))[0] ?? null;
  const trassBest = results.filter((row) => row.indicator_source === "trass").slice().sort((a, b) => Math.abs(b.pearson_corr ?? 0) - Math.abs(a.pearson_corr ?? 0))[0] ?? null;
  const stockBest = results.filter((row) => row.indicator_source === "stock").slice().sort((a, b) => Math.abs(b.pearson_corr ?? 0) - Math.abs(a.pearson_corr ?? 0))[0] ?? null;

  return (
    <SectionCard eyebrow="Correlation Summary" title={`${companyLabel} signal quality`}>
      <div className="grid gap-3 md:grid-cols-4">
        <MiniStat label="Best signal" value={best ? `${best.indicator_source.toUpperCase()} · L${best.lag_quarters}` : "No data"} helper={best ? `r=${best.pearson_corr?.toFixed(2) ?? "-"}` : "Insufficient sample"} />
        <MiniStat label="Amazon best" value={amazonBest ? `L${amazonBest.lag_quarters}` : "No data"} helper={amazonBest ? `r=${amazonBest.pearson_corr?.toFixed(2) ?? "-"}` : "No data"} tone={trendTone(amazonBest?.pearson_corr)} />
        <MiniStat label="TRASS best" value={trassBest ? `L${trassBest.lag_quarters}` : "No data"} helper={trassBest ? `r=${trassBest.pearson_corr?.toFixed(2) ?? "-"}` : "No data"} tone={trendTone(trassBest?.pearson_corr)} />
        <MiniStat label="Stock best" value={stockBest ? `L${stockBest.lag_quarters}` : "No data"} helper={stockBest ? `r=${stockBest.pearson_corr?.toFixed(2) ?? "-"}` : "No data"} tone={trendTone(stockBest?.pearson_corr)} />
      </div>
    </SectionCard>
  );
}

function MiniStat({ label, value, helper, tone }: { label: string; value: string; helper?: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-toss-wash p-3">
      <p className="text-xs font-bold uppercase text-toss-gray">{label}</p>
      <p className={`mt-1 text-lg font-extrabold ${tone ?? "text-toss-ink"}`}>{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold text-toss-gray">{helper}</p> : null}
    </div>
  );
}
