"use client";

import { useMemo, useState } from "react";
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
import type { DisplayCurrency } from "@/lib/format";
import { formatMoneyFromUsd, formatNumber } from "@/lib/format";
import type { KeepamoreLabProduct, KeepamoreLabSeriesPoint } from "@/lib/keepamore-lab-data";

type PeriodWindow = "all" | "1Y" | "6M" | "3M";
type ViewMode = "index" | "raw";

type MetricKey = "salesRank" | "buyBoxPrice" | "amazonPrice" | "newPrice" | "reviews" | "rating" | "revenueEstimate" | "unitsEstimate";

const METRIC_CONFIG: Array<{
  key: MetricKey;
  label: string;
  defaultSelected: boolean;
  kind: "price" | "rank" | "count" | "rating" | "estimate";
}> = [
  { key: "salesRank", label: "Sales Rank", defaultSelected: true, kind: "rank" },
  { key: "buyBoxPrice", label: "Buy Box price", defaultSelected: true, kind: "price" },
  { key: "amazonPrice", label: "Amazon price", defaultSelected: true, kind: "price" },
  { key: "newPrice", label: "New price", defaultSelected: true, kind: "price" },
  { key: "reviews", label: "Reviews", defaultSelected: true, kind: "count" },
  { key: "rating", label: "Rating", defaultSelected: true, kind: "rating" },
  { key: "revenueEstimate", label: "Revenue estimate", defaultSelected: false, kind: "estimate" },
  { key: "unitsEstimate", label: "Units estimate", defaultSelected: false, kind: "estimate" }
];

type KeepamoreSeriesChartProps = {
  product: KeepamoreLabProduct | null;
  currency: DisplayCurrency;
  usdKrw: number;
};

export function KeepamoreSeriesChart({ product, currency, usdKrw }: KeepamoreSeriesChartProps) {
  const [period, setPeriod] = useState<PeriodWindow>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("index");
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(
    METRIC_CONFIG.filter((metric) => metric.defaultSelected).map((metric) => metric.key)
  );

  const availableMetrics = useMemo(() => {
    if (!product?.series.length) return new Set<MetricKey>();
    const set = new Set<MetricKey>();
    for (const metric of METRIC_CONFIG) {
      if (product.series.some((point) => point[metric.key] !== null && point[metric.key] !== undefined)) {
        set.add(metric.key);
      }
    }
    return set;
  }, [product]);

  const visibleMetrics = selectedMetrics.filter((metric) => availableMetrics.has(metric));
  const data = useMemo(() => buildChartData(product?.series ?? [], period, viewMode, visibleMetrics), [period, product?.series, viewMode, visibleMetrics]);
  const latestDate = product?.series.at(-1)?.date ?? null;

  if (!product) {
    return <EmptyState title="ASIN을 선택하세요" description="회사, 제품군, ASIN을 고른 뒤 Keepa 시계열을 확인할 수 있습니다." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg bg-toss-wash px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-bold text-toss-blue">{product.asin}</p>
          <p className="mt-1 text-sm font-semibold text-toss-ink">
            {product.title ?? "Unknown title"} <span className="text-toss-gray">/</span> {product.brand ?? "Unknown brand"}
          </p>
          <p className="mt-1 text-xs font-semibold text-toss-gray">
            {product.category ?? "No category"} · last point {latestDate ?? "No data"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "1Y", "6M", "3M"] as PeriodWindow[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                period === value ? "bg-toss-blue text-white" : "bg-white text-toss-gray hover:text-toss-ink"
              }`}
            >
              {value}
            </button>
          ))}
          {(["index", "raw"] as ViewMode[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setViewMode(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                viewMode === value ? "bg-toss-ink text-white" : "bg-white text-toss-gray hover:text-toss-ink"
              }`}
            >
              {value === "index" ? "Index view" : "Raw view"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {METRIC_CONFIG.map((metric) => {
          const disabled = !availableMetrics.has(metric.key);
          const active = selectedMetrics.includes(metric.key);
          return (
            <button
              key={metric.key}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                setSelectedMetrics((current) =>
                  current.includes(metric.key) ? current.filter((item) => item !== metric.key) : [...current, metric.key]
                );
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "bg-toss-blue text-white"
                  : disabled
                    ? "cursor-not-allowed bg-toss-wash2 text-toss-gray"
                    : "bg-white text-toss-gray hover:text-toss-ink"
              }`}
            >
              {metric.label}
              {disabled && metric.key === "revenueEstimate" ? <span className="ml-2">Revenue estimate not available</span> : null}
              {disabled && metric.key === "unitsEstimate" ? <span className="ml-2">Units estimate not available</span> : null}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg bg-white p-4 ring-1 ring-toss-line">
        {data.length ? (
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 18, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7edf5" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#7b8494" }} minTickGap={28} />
                <YAxis tick={{ fontSize: 12, fill: "#7b8494" }} width={52} tickFormatter={(value) => formatAxisTick(value, viewMode)} />
                <Tooltip content={<KeepaTooltip currency={currency} usdKrw={usdKrw} viewMode={viewMode} />} />
                <Legend />
                {visibleMetrics.map((metric, index) => (
                  <Line
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    name={METRIC_CONFIG.find((entry) => entry.key === metric)?.label ?? metric}
                    stroke={LINE_COLORS[index % LINE_COLORS.length]}
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="선택한 기간에 데이터가 없습니다" description="다른 기간을 선택하거나 다른 ASIN을 골라보세요." />
        )}
      </div>

      <p className="text-xs font-semibold text-toss-gray">
        Raw view는 Keepa 원자료를 그대로 보여줍니다. Index view는 첫 유효값을 100으로 맞춰 서로 다른 단위를 비교하기 쉽게 표시합니다.
      </p>
    </div>
  );
}

function buildChartData(series: KeepamoreLabSeriesPoint[], period: PeriodWindow, viewMode: ViewMode, metrics: MetricKey[]) {
  const filtered = filterSeries(series, period);
  if (!filtered.length) return [];

  const bases = new Map<MetricKey, number>();
  if (viewMode === "index") {
    for (const metric of metrics) {
      const first = filtered.find((point) => typeof point[metric] === "number");
      const value = typeof first?.[metric] === "number" ? (first[metric] as number) : null;
      if (value !== null && Number.isFinite(value) && value !== 0) bases.set(metric, value);
    }
  }

  return filtered.map((point) => {
    const row: Record<string, unknown> = { date: point.date };
    for (const metric of metrics) {
      const raw = typeof point[metric] === "number" ? (point[metric] as number) : null;
      row[metric] = viewMode === "index" ? (raw === null || !bases.get(metric) ? null : (raw / (bases.get(metric) ?? 1)) * 100) : raw;
      row[`${metric}Raw`] = raw;
    }
    return row;
  });
}

function filterSeries(series: KeepamoreLabSeriesPoint[], period: PeriodWindow) {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  if (period === "all" || !sorted.length) return sorted;
  const latest = new Date(sorted[sorted.length - 1].date).getTime();
  const days = period === "1Y" ? 365 : period === "6M" ? 183 : 92;
  const cutoff = latest - days * 24 * 60 * 60 * 1000;
  return sorted.filter((point) => new Date(point.date).getTime() >= cutoff);
}

function formatAxisTick(value: number, viewMode: ViewMode) {
  if (viewMode === "index") return String(Math.round(value));
  return formatNumber(value);
}

function KeepaTooltip({
  active,
  payload,
  label,
  currency,
  usdKrw,
  viewMode
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number | null; color?: string; name?: string }>;
  label?: string;
  currency: DisplayCurrency;
  usdKrw: number;
  viewMode: ViewMode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-toss-line bg-white px-3 py-2 shadow-card">
      <p className="text-xs font-bold text-toss-gray">{label}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold text-toss-ink">{entry.name}</span>
            <span className="tnum font-bold text-toss-blue">{formatValue(entry.value ?? null, entry.dataKey, currency, usdKrw, viewMode)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValue(value: number | null, dataKey: unknown, currency: DisplayCurrency, usdKrw: number, viewMode: ViewMode) {
  if (value === null || Number.isNaN(value)) return "-";
  const key = String(dataKey ?? "");
  if (viewMode === "index") return `${value.toFixed(1)}x`;
  if (/price|revenue/i.test(key)) return formatMoneyFromUsd(value, currency, usdKrw);
  if (/rating/i.test(key)) return value.toFixed(1);
  return formatNumber(value);
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-lg bg-toss-wash px-6 py-10 text-center">
      <div>
        <p className="text-sm font-bold text-toss-ink">{title}</p>
        <p className="mt-2 text-sm leading-6 text-toss-gray">{description}</p>
      </div>
    </div>
  );
}

const LINE_COLORS = ["#3182f6", "#00a661", "#f04452", "#7c5cff", "#f59e0b", "#06b6d4", "#0f172a", "#8b5cf6"];
