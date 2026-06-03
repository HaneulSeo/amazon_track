"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AmazonEstimateLabMonthlyEstimate } from "@/lib/types";
import { formatMoneyFromUsd, formatNumber } from "@/lib/format";
import type { DisplayCurrency } from "@/lib/format";

type MetricKey = "actualRevenue" | "predictedRevenue" | "actualSales" | "predictedSales" | "demandIndex";
type ViewMode = "index" | "amount";

const METRICS: Array<{ key: MetricKey; label: string; defaultSelected: boolean; kind: "money" | "count" | "index" }> = [
  { key: "actualRevenue", label: "Observed revenue", defaultSelected: true, kind: "money" },
  { key: "predictedRevenue", label: "Modeled revenue", defaultSelected: true, kind: "money" },
  { key: "actualSales", label: "Observed units", defaultSelected: true, kind: "count" },
  { key: "predictedSales", label: "Modeled units", defaultSelected: false, kind: "count" },
  { key: "demandIndex", label: "Demand index", defaultSelected: true, kind: "index" }
];

type BackcastRevenueChartProps = {
  rows: AmazonEstimateLabMonthlyEstimate[];
  currency: DisplayCurrency;
  usdKrw: number;
};

export function BackcastRevenueChart({ rows, currency, usdKrw }: BackcastRevenueChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("index");
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(
    METRICS.filter((metric) => metric.defaultSelected).map((metric) => metric.key)
  );

  const availableMetrics = useMemo(() => {
    const set = new Set<MetricKey>();
    for (const metric of METRICS) {
      if (rows.some((row) => row[metric.key] !== null && row[metric.key] !== undefined)) set.add(metric.key);
    }
    return set;
  }, [rows]);

  const visibleMetrics = selectedMetrics.filter((metric) => availableMetrics.has(metric)).filter((metric) => viewMode === "index" || metric !== "demandIndex");
  const chartData = useMemo(() => buildChartData(rows, viewMode, visibleMetrics), [rows, viewMode, visibleMetrics]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-toss-wash p-4">
        <p className="text-sm leading-6 text-toss-ink2">
          선택한 ASIN의 실제 관측값과 모델 백캐스트를 함께 봅니다. 지수 모드에서는 시작점을 100으로 맞춰 추세만 비교합니다.
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

      <div className="flex flex-wrap gap-2">
        {METRICS.map((metric) => {
          const active = selectedMetrics.includes(metric.key);
          const disabled = !availableMetrics.has(metric.key);
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
              className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                active
                  ? "bg-toss-ink text-white"
                  : disabled
                    ? "cursor-not-allowed bg-toss-wash2 text-toss-gray"
                    : "bg-white text-toss-ink2 ring-1 ring-toss-line hover:text-toss-ink"
              }`}
            >
              {metric.label}
              {!disabled ? null : <span className="ml-2 text-[11px]">No data</span>}
            </button>
          );
        })}
      </div>

      {!chartData.length || !visibleMetrics.length ? (
        <div className="rounded-2xl bg-toss-wash p-5 text-sm font-semibold text-toss-gray">선택한 기간에 표시할 데이터가 없습니다.</div>
      ) : (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-toss-line">
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e8eb" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={24} />
                {viewMode === "index" ? (
                  <YAxis yAxisId="index" tickLine={false} axisLine={false} width={52} tickFormatter={(value) => String(Math.round(Number(value)))} />
                ) : (
                  <>
                    <YAxis
                      yAxisId="left"
                      tickLine={false}
                      axisLine={false}
                      width={78}
                      tickFormatter={(value) => formatMoneyFromUsd(Number(value), currency, usdKrw)}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(value) => formatNumber(Number(value))}
                    />
                  </>
                )}
                <Tooltip content={<EstimateTooltip currency={currency} usdKrw={usdKrw} viewMode={viewMode} />} />
                <Legend />
                {visibleMetrics.map((metric, index) => (
                  <Line
                    key={metric}
                    type="monotone"
                    dataKey={viewMode === "index" ? `${metric}Index` : metric}
                    name={METRICS.find((item) => item.key === metric)?.label ?? metric}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={metric === "actualRevenue" || metric === "actualSales" ? 3.2 : 2.5}
                    dot={false}
                    strokeDasharray={metric === "actualRevenue" || metric === "actualSales" ? undefined : metric === "predictedRevenue" || metric === "predictedSales" ? "4 3" : undefined}
                    yAxisId={viewMode === "index" ? "index" : metric === "actualRevenue" || metric === "predictedRevenue" ? "left" : metric === "actualSales" || metric === "predictedSales" ? "right" : "left"}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function buildChartData(rows: AmazonEstimateLabMonthlyEstimate[], viewMode: ViewMode, metrics: MetricKey[]) {
  const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month));
  const baseValues = new Map<MetricKey, number>();
  if (viewMode === "index") {
    for (const metric of metrics) {
      const first = sorted.find((row) => typeof row[metric] === "number");
      const value = typeof first?.[metric] === "number" ? (first[metric] as number) : null;
      if (value !== null && value !== 0) baseValues.set(metric, value);
    }
  }

  return sorted.map((row) => {
    const item: Record<string, number | string | null> = { month: row.month };
    for (const metric of metrics) {
      const value = typeof row[metric] === "number" ? (row[metric] as number) : null;
      item[metric] = value;
      item[`${metric}Index`] = viewMode === "index" && value !== null && baseValues.get(metric) ? (value / (baseValues.get(metric) ?? 1)) * 100 : null;
      if (viewMode === "amount" && metric === "actualSales") item[metric] = value;
    }
    return item;
  });
}

function EstimateTooltip({
  active,
  payload,
  label,
  currency,
  usdKrw,
  viewMode
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number | null; name?: string }>;
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
            <span className="tnum font-bold text-toss-blue">{formatTooltipValue(String(entry.dataKey ?? ""), Number(entry.value ?? 0), viewMode, currency, usdKrw)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const COLORS = ["#3182f6", "#00a661", "#f59f00", "#7048e8", "#f04452"];

function formatTooltipValue(dataKey: string, value: number, viewMode: ViewMode, currency: DisplayCurrency, usdKrw: number) {
  const metricKey = dataKey.replace(/Index$/, "") as MetricKey;
  const metric = METRICS.find((entry) => entry.key === metricKey);
  if (viewMode === "index") return `${Number(value).toFixed(1)}x`;
  if (!metric) return formatNumber(value);
  if (metric.kind === "money") return formatMoneyFromUsd(value, currency, usdKrw);
  return formatNumber(value);
}
