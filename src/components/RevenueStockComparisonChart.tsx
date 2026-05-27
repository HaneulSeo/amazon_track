"use client";

import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CompanyMonthlyRow, StockMonthlyRow } from "@/lib/types";
import { type DisplayCurrency, formatMoneyFromUsd, formatNumber } from "@/lib/format";

type RevenueStockComparisonChartProps = {
  companyLabel: string;
  revenueRows: CompanyMonthlyRow[];
  stockRows: StockMonthlyRow[];
  currency: DisplayCurrency;
  usdKrw: number;
};

type ComparisonPoint = {
  month: string;
  revenue: number | null;
  stockIndex: number | null;
  revenueIndex: number | null;
  stockClose: number | null;
};

function tooltipStyle() {
  return {
    border: "1px solid #e5e8eb",
    borderRadius: 8,
    boxShadow: "0 16px 40px rgba(25,31,40,0.12)"
  };
}

export function RevenueStockComparisonChart({
  companyLabel,
  revenueRows,
  stockRows,
  currency,
  usdKrw
}: RevenueStockComparisonChartProps) {
  const stockByMonth = new Map(stockRows.map((row) => [row.month, row]));
  const revenueByMonth = new Map(revenueRows.map((row) => [row.month, row]));
  const sharedMonths = [...revenueByMonth.keys()].filter((month) => stockByMonth.has(month)).sort((a, b) => a.localeCompare(b));

  if (!sharedMonths.length) {
    return <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">주가와 매출이 동시에 존재하는 월이 없어 비교 차트를 만들 수 없습니다.</div>;
  }

  const firstMonth = sharedMonths[0];
  const revenueBase = revenueByMonth.get(firstMonth)?.total_revenue ?? null;
  const stockBase = stockByMonth.get(firstMonth)?.index_100 ?? null;
  const comparisonData: ComparisonPoint[] = sharedMonths.map((month) => {
    const revenueRow = revenueByMonth.get(month)!;
    const stockRow = stockByMonth.get(month)!;
    return {
      month,
      revenue: revenueRow.total_revenue ?? null,
      stockIndex: stockBase && stockRow.index_100 !== null ? (stockRow.index_100 / stockBase) * 100 : stockRow.index_100 ?? null,
      revenueIndex: revenueBase && revenueRow.total_revenue !== null ? (revenueRow.total_revenue / revenueBase) * 100 : null,
      stockClose: stockRow.adj_close ?? stockRow.close ?? null
    };
  });

  const latest = comparisonData.at(-1) ?? null;
  const latestRevenue = revenueRows.at(-1)?.total_revenue ?? null;
  const latestStock = stockRows.at(-1)?.adj_close ?? stockRows.at(-1)?.close ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-toss-wash p-3">
          <p className="text-xs font-bold uppercase text-toss-gray">Latest revenue</p>
          <p className="mt-1 text-lg font-extrabold text-toss-ink">{formatMoneyFromUsd(latestRevenue, currency, usdKrw, false)}</p>
          <p className="mt-1 text-xs font-semibold text-toss-gray">{companyLabel}</p>
        </div>
        <div className="rounded-lg bg-toss-wash p-3">
          <p className="text-xs font-bold uppercase text-toss-gray">Latest stock</p>
          <p className="mt-1 text-lg font-extrabold text-toss-ink">{latestStock === null ? "-" : formatNumber(latestStock, false)}</p>
          <p className="mt-1 text-xs font-semibold text-toss-gray">Adj close</p>
        </div>
        <div className="rounded-lg bg-toss-wash p-3">
          <p className="text-xs font-bold uppercase text-toss-gray">Shared months</p>
          <p className="mt-1 text-lg font-extrabold text-toss-ink">{sharedMonths.length}</p>
          <p className="mt-1 text-xs font-semibold text-toss-gray">{firstMonth} base = 100</p>
        </div>
      </div>

      <div className="min-h-[340px] rounded-lg bg-toss-wash p-4">
        <p className="mb-4 text-sm font-semibold text-toss-gray">Normalized revenue vs stock</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={comparisonData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueStockFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#3182f6" stopOpacity={0.24} />
                <stop offset="95%" stopColor="#3182f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e5e8eb" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value).toFixed(0)}`} width={56} />
            <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value).toFixed(0)}`} width={56} />
            <Tooltip
              contentStyle={tooltipStyle()}
              formatter={(value, name) => {
                if (name === "Revenue index") return [`${Number(value).toFixed(1)}`, name];
                if (name === "Stock index") return [`${Number(value).toFixed(1)}`, name];
                if (name === "Revenue") return [formatMoneyFromUsd(Number(value), currency, usdKrw, false), name];
                if (name === "Stock close") return [formatNumber(Number(value), false), name];
                return [String(value), name];
              }}
            />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="revenueIndex" name="Revenue index" stroke="#3182f6" strokeWidth={3} fill="url(#revenueStockFill)" />
            <Line yAxisId="right" type="monotone" dataKey="stockIndex" name="Stock index" stroke="#00a661" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
