import { formatNumber, trendTone } from "@/lib/format";
import type { CorrelationResult } from "@/lib/types";

export function LagCorrelationTable({ rows }: { rows: CorrelationResult[] }) {
  if (!rows.length) {
    return <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">No correlation data</div>;
  }

  return (
    <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
      <table className="min-w-[1100px] w-full bg-white text-left text-sm">
        <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
          <tr>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3 text-right">Lag</th>
            <th className="px-4 py-3 text-right">Sample</th>
            <th className="px-4 py-3 text-right">Pearson</th>
            <th className="px-4 py-3 text-right">Spearman</th>
            <th className="px-4 py-3 text-right">R²</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Interpretation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-toss-line">
          {rows.map((row) => (
            <tr key={`${row.indicator_source}-${row.lag_quarters}`} className="hover:bg-toss-wash/70">
              <td className="px-4 py-3 font-semibold">{row.indicator_source.toUpperCase()}</td>
              <td className="px-4 py-3 text-right font-semibold">{row.lag_quarters}Q</td>
              <td className="px-4 py-3 text-right">{formatNumber(row.sample_size, false)}</td>
              <td className={`px-4 py-3 text-right font-semibold ${trendTone(row.pearson_corr)}`}>{row.pearson_corr === null ? "-" : row.pearson_corr.toFixed(2)}</td>
              <td className={`px-4 py-3 text-right font-semibold ${trendTone(row.spearman_corr)}`}>{row.spearman_corr === null ? "-" : row.spearman_corr.toFixed(2)}</td>
              <td className={`px-4 py-3 text-right font-semibold ${trendTone(row.r_squared)}`}>{row.r_squared === null ? "-" : row.r_squared.toFixed(2)}</td>
              <td className="px-4 py-3">{row.confidence}</td>
              <td className="px-4 py-3 text-toss-gray">{row.interpretation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
