"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { BrandTrend } from "@/lib/types";
import { type DisplayCurrency, formatMoneyFromUsd, formatNumber } from "@/lib/format";

type BrandTrendChartProps = {
  data: BrandTrend[];
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

export function BrandTrendChart({ data, currency, usdKrw }: BrandTrendChartProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="min-h-[320px] rounded-lg bg-toss-wash p-4">
        <p className="mb-4 text-sm font-semibold text-toss-gray">Monthly estimated revenue</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#3182f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3182f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e5e8eb" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatMoneyFromUsd(Number(value), currency, usdKrw)} width={72} />
            <Tooltip formatter={(value) => formatMoneyFromUsd(Number(value), currency, usdKrw, false)} contentStyle={tooltipStyle()} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3182f6" strokeWidth={3} fill="url(#revenueGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="min-h-[320px] rounded-lg bg-toss-wash p-4">
        <p className="mb-4 text-sm font-semibold text-toss-gray">Monthly estimated unit sales</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e5e8eb" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(Number(value))} width={64} />
            <Tooltip formatter={(value) => formatNumber(Number(value), false)} contentStyle={tooltipStyle()} />
            <Line type="monotone" dataKey="units" name="Units" stroke="#00a661" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="min-h-[300px] rounded-lg bg-toss-wash p-4 xl:col-span-2">
        <p className="mb-4 text-sm font-semibold text-toss-gray">Price and BSR movement</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e5e8eb" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis yAxisId="price" tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} width={56} />
            <YAxis yAxisId="rank" orientation="right" tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(Number(value))} width={56} />
            <Tooltip contentStyle={tooltipStyle()} />
            <Legend />
            <Line yAxisId="price" type="monotone" dataKey="avgPrice" name="Avg price" stroke="#3182f6" strokeWidth={3} dot={false} />
            <Line yAxisId="rank" type="monotone" dataKey="avgRank" name="Avg BSR" stroke="#f59f00" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
