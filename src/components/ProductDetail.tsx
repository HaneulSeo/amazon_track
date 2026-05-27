"use client";

import { useMemo, useState } from "react";
import { Activity, BadgeDollarSign, PackageSearch, Star } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { Product, ProductTrend } from "@/lib/types";
import { type DisplayCurrency, formatMoneyFromUsd, formatNumber, formatPercent, productLabel, trendTone } from "@/lib/format";

type ProductDetailProps = {
  products: Product[];
  trends: ProductTrend[];
  currency: DisplayCurrency;
  usdKrw: number;
};

export function ProductDetail({ products, trends, currency, usdKrw }: ProductDetailProps) {
  const [productId, setProductId] = useState(products[0]?.productId ?? "");
  const selected = products.find((product) => product.productId === productId) ?? products[0];

  const data = useMemo(
    () => trends.filter((trend) => trend.productId === selected?.productId).sort((a, b) => a.month.localeCompare(b.month)),
    [selected?.productId, trends]
  );

  if (!selected) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="w-full sm:max-w-md">
          <span className="mb-2 block text-sm font-semibold text-toss-gray">Product</span>
          <select
            className="h-12 w-full rounded-md border-0 bg-toss-wash px-4 font-semibold text-toss-ink outline-none ring-1 ring-toss-line transition focus:ring-2 focus:ring-toss-blue"
            value={selected.productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            {products.map((product) => (
              <option key={product.productId} value={product.productId}>
                {productLabel(product.productName, product.asin)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniMetric icon={BadgeDollarSign} label="Latest revenue" value={formatMoneyFromUsd(selected.latestRevenue, currency, usdKrw)} />
          <MiniMetric icon={PackageSearch} label="Units" value={formatNumber(selected.latestUnits)} />
          <MiniMetric icon={Activity} label="3M growth" value={formatPercent(selected.recent3Growth)} tone={trendTone(selected.recent3Growth)} />
          <MiniMetric icon={Star} label="Rating" value={selected.latestRating?.toFixed(1) ?? "-"} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <DetailChart
          data={data}
          title="Revenue and unit sales"
          lines={[
            { key: "revenue", name: "Revenue", color: "#3182f6", axis: "left", formatter: (value) => formatMoneyFromUsd(value, currency, usdKrw) },
            { key: "units", name: "Units", color: "#00a661", axis: "right", formatter: formatNumber }
          ]}
        />
        <DetailChart
          data={data}
          title="Price, BSR and reviews"
          lines={[
            { key: "avgPrice", name: "Avg price", color: "#3182f6", axis: "left", formatter: (value) => `$${Number(value).toFixed(2)}` },
            { key: "avgRank", name: "Avg BSR", color: "#f59f00", axis: "right", formatter: formatNumber },
            { key: "reviews", name: "Reviews", color: "#e64980", axis: "right", formatter: formatNumber }
          ]}
        />
      </div>
    </div>
  );
}

type MiniMetricProps = {
  icon: typeof BadgeDollarSign;
  label: string;
  value: string;
  tone?: string;
};

function MiniMetric({ icon: Icon, label, value, tone = "text-toss-ink" }: MiniMetricProps) {
  return (
    <div className="rounded-lg bg-toss-wash p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-toss-gray">
        <Icon size={15} />
        {label}
      </div>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}

type DetailChartProps = {
  data: ProductTrend[];
  title: string;
  lines: Array<{
    key: keyof ProductTrend;
    name: string;
    color: string;
    axis: "left" | "right";
    formatter: (value: number) => string;
  }>;
};

function DetailChart({ data, title, lines }: DetailChartProps) {
  return (
    <div className="min-h-[330px] rounded-lg bg-toss-wash p-4">
      <p className="mb-4 text-sm font-semibold text-toss-gray">{title}</p>
      <ResponsiveContainer width="100%" height={285}>
        <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e5e8eb" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis yAxisId="left" tickLine={false} axisLine={false} width={68} />
          <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={58} />
          <Tooltip
            formatter={(value, name) => {
              const line = lines.find((item) => item.name === name);
              return line ? line.formatter(Number(value)) : String(value);
            }}
            contentStyle={{ border: "1px solid #e5e8eb", borderRadius: 8 }}
          />
          <Legend />
          {lines.map((line) => (
            <Line
              key={String(line.key)}
              yAxisId={line.axis}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={3}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
