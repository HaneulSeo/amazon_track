"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AmazonEstimateLabDartComparison } from "@/lib/types";
import { type DisplayCurrency, formatMoneyFromKrw, formatMoneyFromUsd, formatNumber } from "@/lib/format";

type DartComparisonPanelProps = {
  rows: AmazonEstimateLabDartComparison[];
  currency: DisplayCurrency;
  usdKrw: number;
};

type ViewMode = "index" | "amount";

export function DartComparisonPanel({ rows, currency, usdKrw }: DartComparisonPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("index");

  const chartData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.quarter.localeCompare(b.quarter));
    const baseAmazon = sorted.find((row) => row.estimatedAmazonRevenueKrw !== null)?.estimatedAmazonRevenueKrw ?? null;
    const baseDart = sorted.find((row) => row.dartRevenueKrw !== null)?.dartRevenueKrw ?? null;
    return sorted.map((row) => ({
      quarter: row.quarter,
      estimatedAmazonRevenueKrw: row.estimatedAmazonRevenueKrw,
      dartRevenueKrw: row.dartRevenueKrw,
      estimatedAmazonRevenueIndex:
        baseAmazon && row.estimatedAmazonRevenueKrw !== null ? (row.estimatedAmazonRevenueKrw / baseAmazon) * 100 : null,
      dartRevenueIndex: baseDart && row.dartRevenueKrw !== null ? (row.dartRevenueKrw / baseDart) * 100 : null
    }));
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-toss-wash p-4">
        <p className="text-sm leading-6 text-toss-ink2">
          같은 분기 축에서 Amazon 추정치와 DART 매출을 비교합니다. 단위가 달라 기본은 지수 모드입니다.
        </p>
        <div className="flex items-center rounded-lg bg-white p-1 ring-1 ring-toss-line">
          {(["index", "amount"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`h-8 rounded-md px-3 text-sm font-extrabold transition ${viewMode === mode ? "bg-toss-blue text-white" : "text-toss-gray hover:text-toss-ink"}`}
            >
              {mode === "index" ? "지수" : "실제 값"}
            </button>
          ))}
        </div>
      </div>

      {rows.length ? (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-toss-line">
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 14, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e8eb" />
                  <XAxis dataKey="quarter" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={viewMode === "index" ? 52 : 76}
                    tickFormatter={(value) =>
                      viewMode === "index" ? String(Math.round(Number(value))) : formatMoneyFromKrw(Number(value), currency, usdKrw)
                    }
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (viewMode === "index") return [`${Number(value).toFixed(1)}x`, name];
                      return [formatMoneyFromKrw(Number(value), currency, usdKrw), name];
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={viewMode === "index" ? "dartRevenueIndex" : "dartRevenueKrw"}
                    name="DART"
                    stroke="#3182f6"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey={viewMode === "index" ? "estimatedAmazonRevenueIndex" : "estimatedAmazonRevenueKrw"}
                    name="Amazon estimate"
                    stroke="#00a661"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-auto rounded-2xl ring-1 ring-toss-line">
            <table className="min-w-[680px] w-full bg-white text-left text-sm">
              <thead className="bg-toss-wash text-xs font-bold uppercase tracking-wide text-toss-gray">
                <tr>
                  <th className="px-4 py-3">분기</th>
                  <th className="px-4 py-3 text-right">Amazon</th>
                  <th className="px-4 py-3 text-right">DART</th>
                  <th className="px-4 py-3 text-right">Ratio</th>
                  <th className="px-4 py-3 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-toss-line">
                {rows
                  .slice()
                  .sort((a, b) => b.quarter.localeCompare(a.quarter))
                  .map((row) => (
                    <tr key={`${row.company}:${row.quarter}`}>
                      <td className="px-4 py-3 font-semibold text-toss-ink">{row.quarter}</td>
                      <td className="px-4 py-3 text-right font-semibold text-toss-blue">
                        {row.estimatedAmazonRevenueKrw === null ? "No data" : formatMoneyFromKrw(row.estimatedAmazonRevenueKrw, currency, usdKrw)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-toss-ink">
                        {row.dartRevenueKrw === null ? "No data" : formatMoneyFromKrw(row.dartRevenueKrw, currency, usdKrw)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-toss-ink2">
                        {row.revenueRatio === null ? "No data" : row.revenueRatio.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-toss-ink2">{row.confidence}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-toss-wash p-5 text-sm font-semibold text-toss-gray">DART 비교 데이터가 없습니다.</div>
      )}
    </div>
  );
}
