"use client";

import type { CorrelationResult } from "@/lib/types";

type CorrelationSummaryCardsProps = {
  results: CorrelationResult[];
};

const sourceLabel: Record<CorrelationResult["indicator_source"], string> = {
  amazon: "Amazon",
  trass: "TRASS",
  stock: "Stock",
  reviews: "Reviews"
};

function formatValue(value: number | null) {
  return value === null || Number.isNaN(value) ? "No data" : value.toFixed(3);
}

function bestResult(rows: CorrelationResult[], source: CorrelationResult["indicator_source"]) {
  const filtered = rows.filter((row) => row.indicator_source === source && row.pearson_corr !== null);
  return filtered
    .slice()
    .sort((a, b) => (Math.abs(b.pearson_corr ?? 0) - Math.abs(a.pearson_corr ?? 0)) || a.lag_quarters - b.lag_quarters)[0] ?? null;
}

export function CorrelationSummaryCards({ results }: CorrelationSummaryCardsProps) {
  const sources: CorrelationResult["indicator_source"][] = ["amazon", "trass", "stock"];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {sources.map((source) => {
        const best = bestResult(results, source);
        return (
          <div key={source} className="rounded-lg bg-[#f7f9fc] p-4 ring-1 ring-[#dde2ea]">
            <p className="text-xs font-bold uppercase text-toss-gray">{sourceLabel[source]} vs DART</p>
            <p className="mt-2 text-xl font-extrabold text-toss-ink">{best ? `${best.lag_quarters}Q lag` : "No data"}</p>
            <div className="mt-3 space-y-1 text-sm font-semibold text-toss-gray">
              <p>Pearson {formatValue(best?.pearson_corr ?? null)}</p>
              <p>Spearman {formatValue(best?.spearman_corr ?? null)}</p>
              <p>Sample {best ? best.sample_size : "No data"}</p>
            </div>
            <p className="mt-3 text-xs font-medium leading-5 text-toss-gray">
              {best?.interpretation ?? "Insufficient sample to judge a stable lag relationship."}
            </p>
          </div>
        );
      })}
    </div>
  );
}
