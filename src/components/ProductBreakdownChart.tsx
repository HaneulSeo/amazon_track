"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Product, ProductTrend } from "@/lib/types";
import { formatCurrency, shortProductName } from "@/lib/format";

type ProductBreakdownChartProps = {
  products: Product[];
  trends: ProductTrend[];
  latestMonth: string | null;
};

const colors = ["#3182f6", "#00a661", "#f59f00", "#e64980", "#7048e8", "#12b886", "#ff6b6b", "#228be6", "#868e96"];

export function ProductBreakdownChart({ products, trends, latestMonth }: ProductBreakdownChartProps) {
  const topProducts = products.slice(0, 8);
  const topIds = new Set(topProducts.map((product) => product.productId));
  const labels = new Map(topProducts.map((product) => [product.productId, shortProductName(product.productName, product.asin)]));
  const months = [...new Set(trends.map((trend) => trend.month))].sort();

  const stackedData = months.map((month) => {
    const rows = trends.filter((trend) => trend.month === month);
    const item: Record<string, string | number> = { month };
    for (const row of rows) {
      if (topIds.has(row.productId)) {
        item[labels.get(row.productId) ?? row.asin] = row.revenue;
      } else {
        item.Other = Number(item.Other ?? 0) + row.revenue;
      }
    }
    return item;
  });

  const latestRows = trends
    .filter((trend) => trend.month === latestMonth)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12)
    .map((row) => ({
      name: shortProductName(row.productName, row.asin),
      revenue: row.revenue,
      share: row.revenueShare
    }));

  const stackedKeys = [...topProducts.map((product) => labels.get(product.productId) ?? product.asin), "Other"];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="min-h-[360px] rounded-lg bg-toss-wash p-4">
        <p className="mb-4 text-sm font-semibold text-toss-gray">Revenue contribution by product</p>
        <ResponsiveContainer width="100%" height={310}>
          <AreaChart data={stackedData} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e5e8eb" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(Number(value))} width={72} />
            <Tooltip formatter={(value) => formatCurrency(Number(value), false)} contentStyle={{ border: "1px solid #e5e8eb", borderRadius: 8 }} />
            {stackedKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="revenue"
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.72}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="min-h-[360px] rounded-lg bg-toss-wash p-4">
        <p className="mb-4 text-sm font-semibold text-toss-gray">Latest month revenue share</p>
        <ResponsiveContainer width="100%" height={310}>
          <BarChart data={latestRows} layout="vertical" margin={{ top: 0, right: 18, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e5e8eb" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={96} />
            <Tooltip formatter={(value) => formatCurrency(Number(value), false)} contentStyle={{ border: "1px solid #e5e8eb", borderRadius: 8 }} />
            <Bar dataKey="revenue" name="Revenue" fill="#3182f6" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
