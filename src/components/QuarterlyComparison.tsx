"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { QuarterlyComparison as QuarterlyComparisonType } from "@/lib/types";
import { type DisplayCurrency, formatMoneyFromKrw, formatMoneyFromUsd, formatPercent, trendTone } from "@/lib/format";

type QuarterlyComparisonProps = {
  rows: QuarterlyComparisonType[];
  baseQuarter: string | null;
  currency: DisplayCurrency;
  usdKrw: number;
};

export function QuarterlyComparison({ rows, baseQuarter, currency, usdKrw }: QuarterlyComparisonProps) {
  const chartRows = rows.filter((row) => row.trackedRevenueUsd !== null || row.externalRevenueEokKrw !== null);
  const tableRows = rows.filter((row) => row.trackedRevenueUsd !== null);
  const chartData = chartRows.map((row) => ({
    ...row,
    externalDisplayRevenue: currency === "KRW" ? row.externalRevenueEokKrw * 100_000_000 : (row.externalRevenueEokKrw * 100_000_000) / usdKrw,
    trackedDisplayRevenue: row.trackedRevenueUsd === null ? null : currency === "KRW" ? row.trackedRevenueUsd * usdKrw : row.trackedRevenueUsd
  }));

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-toss-sky px-4 py-3 text-sm font-semibold text-toss-blue">
        기준 분기 {baseQuarter ?? "-"} = 100. 원화 외부 매출과 Amazon 추적 ASIN 매출은 통화와 범위가 달라 지수로 추세를 비교합니다.
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="min-h-[330px] rounded-lg bg-toss-wash p-4">
          <p className="mb-4 text-sm font-semibold text-toss-gray">분기 매출 규모</p>
          <ResponsiveContainer width="100%" height={285}>
            <BarChart data={chartData} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e5e8eb" vertical={false} />
              <XAxis dataKey="quarter" tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => (currency === "KRW" ? formatMoneyFromKrw(Number(value), "KRW", usdKrw) : formatMoneyFromUsd(Number(value), "USD", usdKrw))} width={82} />
              <Tooltip
                formatter={(value, name) => {
                  const formatted =
                    currency === "KRW"
                      ? formatMoneyFromKrw(Number(value), "KRW", usdKrw, false)
                      : formatMoneyFromUsd(Number(value), "USD", usdKrw, false);
                  return [formatted, name];
                }}
                contentStyle={{ border: "1px solid #e5e8eb", borderRadius: 8 }}
              />
              <Legend />
              <Bar dataKey="externalDisplayRevenue" name="외부 벤치마크" fill="#8b95a1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="trackedDisplayRevenue" name="Amazon 추적" fill="#3182f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="min-h-[330px] rounded-lg bg-toss-wash p-4">
          <p className="mb-4 text-sm font-semibold text-toss-gray">지수화 추이</p>
          <ResponsiveContainer width="100%" height={285}>
            <LineChart data={chartRows} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e5e8eb" vertical={false} />
              <XAxis dataKey="quarter" tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <Tooltip contentStyle={{ border: "1px solid #e5e8eb", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="externalIndex" name="외부 지수" stroke="#8b95a1" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="trackedIndex" name="추적 지수" stroke="#3182f6" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
        <table className="min-w-[980px] w-full bg-white text-left text-sm">
          <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
            <tr>
              <th className="px-4 py-3">분기</th>
              <th className="px-4 py-3 text-right">외부 매출</th>
              <th className="px-4 py-3 text-right">외부 YoY</th>
              <th className="px-4 py-3 text-right">외부 QoQ</th>
              <th className="px-4 py-3 text-right">추적 매출</th>
              <th className="px-4 py-3 text-right">추적 YoY</th>
              <th className="px-4 py-3 text-right">추적 QoQ</th>
              <th className="px-4 py-3 text-right">지수 격차</th>
              <th className="px-4 py-3">코멘트</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-toss-line">
            {tableRows.map((row) => (
              <tr key={row.quarter} className="hover:bg-toss-wash/70">
                <td className="px-4 py-3 font-bold">
                  {row.quarter}
                  {!row.isCompleteQuarter ? <span className="ml-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">{row.monthsPresent}M</span> : null}
                </td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoneyFromKrw(row.externalRevenueEokKrw * 100_000_000, currency, usdKrw, false)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${trendTone(row.externalYoY)}`}>{formatPercent(row.externalYoY)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${trendTone(row.externalQoQ)}`}>{formatPercent(row.externalQoQ)}</td>
                <td className="px-4 py-3 text-right font-semibold text-toss-blue">{formatMoneyFromUsd(row.trackedRevenueUsd, currency, usdKrw, false)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${trendTone(row.trackedYoY)}`}>{formatPercent(row.trackedYoY)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${trendTone(row.trackedQoQ)}`}>{formatPercent(row.trackedQoQ)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${trendTone(row.indexGap)}`}>{row.indexGap === null ? "-" : row.indexGap.toFixed(1)}</td>
                <td className="px-4 py-3 text-toss-gray">{row.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
