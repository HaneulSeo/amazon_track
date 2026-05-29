"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComparisonPoint, ComparisonSeriesOption } from "@/lib/types";
import { type DisplayCurrency, formatMoneyFromKrw, formatMoneyFromUsd, formatNumber } from "@/lib/format";

type ComparisonExplorerProps = {
  rows: ComparisonPoint[];
  options: ComparisonSeriesOption[];
  currency: DisplayCurrency;
  usdKrw: number;
};

const colorBySource: Record<ComparisonSeriesOption["source"], string> = {
  dart: "#3182f6",
  amazon: "#00a661",
  trass: "#f59f00",
  stock: "#7048e8"
};

const sourceLabelKo: Record<ComparisonSeriesOption["source"], string> = {
  dart: "DART",
  amazon: "Amazon",
  trass: "TRASS",
  stock: "주가"
};

const unitLabelKo: Record<ComparisonSeriesOption["unit"], string> = {
  krw: "원",
  usd: "달러",
  units: "수량",
  price: "주가",
  index: "지수"
};

function tooltipStyle() {
  return {
    border: "1px solid #e5e8eb",
    borderRadius: 10,
    boxShadow: "0 16px 40px rgba(25,31,40,0.12)"
  };
}

function valueFormatter(
  option: ComparisonSeriesOption,
  value: number,
  currency: DisplayCurrency,
  usdKrw: number,
  compact = false
) {
  switch (option.unit) {
    case "krw":
      return formatMoneyFromKrw(value, currency, usdKrw, compact);
    case "usd":
      return formatMoneyFromUsd(value, currency, usdKrw, compact);
    case "units":
      return formatNumber(value, compact);
    case "price":
      return formatNumber(value, compact);
    default:
      return formatNumber(value, compact);
  }
}

export function ComparisonExplorer({ rows, options, currency, usdKrw }: ComparisonExplorerProps) {
  const availableOptions = options.filter((option) => option.available);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => availableOptions.map((option) => option.id));
  const [view, setView] = useState<"index" | "amount">("index");

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedIds.includes(option.id) && option.available),
    [options, selectedIds]
  );

  // The cleanest way to compare series with different scales is to rebase every
  // selected series to a SHARED base period — the first quarter where all of them
  // have data — so the lines all start together at 100.
  const baseIndex = useMemo(() => {
    if (!selectedOptions.length) return -1;
    return rows.findIndex((row) =>
      selectedOptions.every((option) => {
        const value = getSeriesValue(row, option.id);
        return value !== null && value !== undefined;
      })
    );
  }, [rows, selectedOptions]);

  const basePeriod = baseIndex >= 0 ? rows[baseIndex]?.period ?? null : null;

  const baseValues = useMemo(() => {
    const map = new Map<string, number>();
    for (const option of selectedOptions) {
      // Prefer the shared base period; if the series never fully overlaps, fall
      // back to each series' own first available point.
      const baseRow =
        baseIndex >= 0
          ? rows[baseIndex]
          : rows.find((row) => {
              const value = getSeriesValue(row, option.id);
              return value !== null && value !== undefined;
            });
      const value = baseRow ? getSeriesValue(baseRow, option.id) : null;
      if (value !== null && value !== undefined && value !== 0) map.set(option.id, value);
    }
    return map;
  }, [rows, selectedOptions, baseIndex]);

  const chartData = useMemo(() => {
    // In index view, only render from the shared base period onward so every line
    // departs from 100 at the same x position.
    const visibleRows = view === "index" && baseIndex >= 0 ? rows.slice(baseIndex) : rows;
    return visibleRows.map((row) => {
      const item: Record<string, number | string | null> = { period: row.period };
      for (const option of selectedOptions) {
        const raw = getSeriesValue(row, option.id);
        if (raw === null || raw === undefined) {
          item[option.id] = null;
          item[`${option.id}Index`] = null;
          continue;
        }
        item[option.id] = raw;
        const base = baseValues.get(option.id);
        item[`${option.id}Index`] = base ? (raw / base) * 100 : null;
      }
      return item;
    });
  }, [rows, selectedOptions, view, baseIndex, baseValues]);

  const hasData = selectedOptions.some((option) => rows.some((row) => {
    const value = getSeriesValue(row, option.id);
    return value !== null && value !== undefined;
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl bg-toss-wash p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm leading-6 text-toss-ink2">
            {view === "index" ? (
              basePeriod ? (
                <>
                  단위가 다른 지표를 한 화면에서 비교하기 위해, 모든 지표가 값을 갖는 첫 분기{" "}
                  <span className="font-bold text-toss-ink">{basePeriod}</span>를 <span className="font-bold text-toss-ink">100</span>으로 맞춰 추이를 봅니다.
                </>
              ) : (
                <>각 지표를 첫 데이터 시점 <span className="font-bold text-toss-ink">100</span> 기준으로 환산했습니다. (공통 시작 분기가 없어 시작점이 다를 수 있습니다.)</>
              )
            ) : (
              "각 지표를 실제 단위 그대로 표시합니다. 단위가 서로 달라 같은 축에서의 절대 크기 비교는 권장하지 않습니다."
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center rounded-lg bg-white p-1 ring-1 ring-toss-line">
          {(["index", "amount"] as const).map((item) => (
            <button
              key={item}
              className={`h-8 rounded-md px-3 text-sm font-extrabold transition ${view === item ? "bg-toss-blue text-white shadow-sm" : "text-toss-gray hover:text-toss-ink2"}`}
              type="button"
              onClick={() => setView(item)}
            >
              {item === "index" ? "지수 (시작=100)" : "실제 값"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selectedIds.includes(option.id);
          return (
            <button
              key={option.id}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold transition ${
                option.available
                  ? active
                    ? "bg-toss-ink text-white"
                    : "bg-white text-toss-ink2 ring-1 ring-toss-line hover:ring-toss-gray"
                  : "cursor-not-allowed bg-toss-wash2 text-toss-gray"
              }`}
              type="button"
              disabled={!option.available}
              onClick={() =>
                setSelectedIds((current) =>
                  current.includes(option.id) ? current.filter((id) => id !== option.id) : [...current, option.id]
                )
              }
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorBySource[option.source] }} />
              {option.label}
              {!option.available ? <span className="text-[11px] font-extrabold">데이터 없음</span> : null}
            </button>
          );
        })}
      </div>

      {!hasData ? (
        <div className="rounded-2xl bg-toss-wash p-5 text-sm font-semibold text-toss-gray">선택한 지표 중 표시할 데이터가 없습니다.</div>
      ) : (
        <div className="rounded-2xl bg-toss-wash p-4">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e5e8eb" vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} minTickGap={24} tick={{ fontWeight: 600 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={view === "index" ? 48 : 64}
                tickFormatter={(value) => (view === "index" ? `${Number(value).toFixed(0)}` : formatNumber(Number(value)))}
              />
              {view === "index" ? <ReferenceLine y={100} stroke="#cdd3db" strokeDasharray="4 4" /> : null}
              <Tooltip
                formatter={(value: number, name: string) => {
                  const option = selectedOptions.find((item) => item.label === name);
                  if (!option) return [String(value), name];
                  const formatted =
                    view === "index" ? `${Number(value).toFixed(1)} (100 → 현재)` : valueFormatter(option, Number(value), currency, usdKrw, false);
                  return [formatted, option.label];
                }}
                contentStyle={tooltipStyle()}
                labelStyle={{ color: "#8b95a1", fontWeight: 700 }}
              />
              <Legend wrapperStyle={{ paddingTop: 8, fontWeight: 700 }} />
              {selectedOptions.map((option) => (
                <Line
                  key={option.id}
                  type="monotone"
                  dataKey={view === "index" ? `${option.id}Index` : option.id}
                  name={option.label}
                  stroke={colorBySource[option.source]}
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-auto rounded-2xl ring-1 ring-toss-line">
        <table className="min-w-[760px] w-full bg-white text-left text-sm">
          <thead className="bg-toss-wash text-xs font-bold uppercase tracking-wide text-toss-gray">
            <tr>
              <th className="px-4 py-3">지표</th>
              <th className="px-4 py-3 text-right">최신 값</th>
              {view === "index" ? <th className="px-4 py-3 text-right">지수</th> : null}
              <th className="px-4 py-3">단위</th>
              <th className="px-4 py-3">출처</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-toss-line">
            {selectedOptions.map((option) => {
              const latestPoint = [...rows].reverse().find((row) => {
                const value = getSeriesValue(row, option.id);
                return value !== null && value !== undefined;
              });
              const latestValue = latestPoint ? getSeriesValue(latestPoint, option.id) : null;
              const base = baseValues.get(option.id);
              const latestIndex = latestValue !== null && latestValue !== undefined && base ? (Number(latestValue) / base) * 100 : null;
              return (
                <tr key={option.id} className="hover:bg-toss-wash/70">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-bold text-toss-ink">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorBySource[option.source] }} />
                      {option.label}
                    </span>
                  </td>
                  <td className="tnum px-4 py-3 text-right font-bold">
                    {latestValue === null || latestValue === undefined ? "데이터 없음" : valueFormatter(option, Number(latestValue), currency, usdKrw, false)}
                  </td>
                  {view === "index" ? (
                    <td className="tnum px-4 py-3 text-right font-bold text-toss-ink2">{latestIndex === null ? "-" : latestIndex.toFixed(1)}</td>
                  ) : null}
                  <td className="px-4 py-3 text-toss-gray">{unitLabelKo[option.unit]}</td>
                  <td className="px-4 py-3 text-toss-gray">{sourceLabelKo[option.source]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getSeriesValue(row: ComparisonPoint, key: string) {
  switch (key) {
    case "dartRevenue":
      return row.dartRevenue ?? null;
    case "amazonRevenue":
      return row.amazonRevenue ?? null;
    case "amazonUnits":
      return row.amazonUnits ?? null;
    case "trassExport":
      return row.trassExport ?? null;
    case "stockPrice":
      return row.stockPrice ?? null;
    default:
      return null;
  }
}
