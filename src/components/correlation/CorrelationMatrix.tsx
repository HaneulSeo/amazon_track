import { formatNumber } from "@/lib/format";
import type { CorrelationResult } from "@/lib/types";

export function CorrelationMatrix({ rows }: { rows: CorrelationResult[] }) {
  if (!rows.length) return null;

  const sources = ["amazon", "trass", "stock"] as const;
  const lagValues = [...new Set(rows.map((row) => row.lag_quarters))].sort((a, b) => a - b);

  return (
    <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
      <table className="min-w-[760px] w-full bg-white text-left text-sm">
        <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
          <tr>
            <th className="px-4 py-3">Lag</th>
            {sources.map((source) => (
              <th key={source} className="px-4 py-3 text-right">
                {source.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-toss-line">
          {lagValues.map((lag) => (
            <tr key={lag}>
              <td className="px-4 py-3 font-semibold">{lag}Q</td>
              {sources.map((source) => {
                const row = rows.find((item) => item.lag_quarters === lag && item.indicator_source === source) ?? null;
                return (
                  <td key={source} className="px-4 py-3 text-right font-semibold">
                    {row?.pearson_corr === null || row === null ? "-" : formatNumber(row.pearson_corr, false)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
