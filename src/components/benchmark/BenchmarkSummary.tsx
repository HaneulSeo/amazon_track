"use client";

import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DartQuarterlyRevenueRow, StockMonthlyRow } from "@/lib/types";
import { type DisplayCurrency, formatMoneyFromKrw, formatNumber } from "@/lib/format";

type BenchmarkSummaryProps = {
  dartRows: DartQuarterlyRevenueRow[];
  stockRows: StockMonthlyRow[];
  currency: DisplayCurrency;
  usdKrw: number;
};

function tooltipStyle() {
  return {
    border: "1px solid #e5e8eb",
    borderRadius: 8,
    boxShadow: "0 16px 40px rgba(25,31,40,0.12)"
  };
}

export function BenchmarkSummary({ dartRows, stockRows, currency, usdKrw }: BenchmarkSummaryProps) {
  const dartSeries = [...dartRows]
    .sort((a, b) => a.quarter.localeCompare(b.quarter))
    .map((row) => ({
      quarter: row.quarter,
      revenue: row.revenue_krw
    }));

  const stockSeries = [...stockRows]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => ({
      month: row.month,
      close: row.adj_close ?? row.close
    }));

  const latestDart = [...dartRows].sort((a, b) => a.quarter.localeCompare(b.quarter)).at(-1) ?? null;
  const latestStock = [...stockRows].sort((a, b) => a.month.localeCompare(b.month)).at(-1) ?? null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Latest DART quarter"
          value={latestDart?.quarter ?? "No data"}
          helper={latestDart ? (latestDart.source_url ? "Source available" : "Reported revenue") : "No data"}
        />
        <MiniStat
          label="Latest DART revenue"
          value={latestDart?.revenue_krw === null || latestDart?.revenue_krw === undefined ? "No data" : formatMoneyFromKrw(latestDart.revenue_krw, currency, usdKrw)}
          helper={latestDart?.period_type === "derived_q4" ? "Derived Q4" : "Reported quarter"}
        />
        <MiniStat label="Latest stock month" value={latestStock?.month ?? "No data"} helper={latestStock?.stock_ticker ?? "No data"} />
        <MiniStat
          label="Latest stock close"
          value={latestStock ? formatNumber(latestStock.adj_close ?? latestStock.close) : "No data"}
          helper={latestStock?.date ?? "Monthly close"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="min-h-[340px] rounded-lg bg-toss-wash p-4">
          <p className="mb-4 text-sm font-semibold text-toss-gray">DART quarterly revenue</p>
          <ResponsiveContainer width="100%" height={290}>
            <AreaChart data={dartSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="dartRevenueGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#3182f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3182f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e8eb" vertical={false} />
              <XAxis dataKey="quarter" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatMoneyFromKrw(Number(value), currency, usdKrw)} width={80} />
              <Tooltip formatter={(value) => formatMoneyFromKrw(Number(value), currency, usdKrw, false)} contentStyle={tooltipStyle()} />
              <Area type="monotone" dataKey="revenue" name="DART revenue" stroke="#3182f6" strokeWidth={3} fill="url(#dartRevenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="min-h-[340px] rounded-lg bg-toss-wash p-4">
          <p className="mb-4 text-sm font-semibold text-toss-gray">Stock monthly trend</p>
          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={stockSeries} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e5e8eb" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(Number(value))} width={64} />
              <Tooltip formatter={(value) => formatNumber(Number(value), false)} contentStyle={tooltipStyle()} />
              <Line type="monotone" dataKey="close" name="Stock close" stroke="#00a661" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-[#dde2ea]">
      <p className="text-xs font-bold uppercase text-toss-gray">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-toss-ink">{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold text-toss-gray">{helper}</p> : null}
    </div>
  );
}
