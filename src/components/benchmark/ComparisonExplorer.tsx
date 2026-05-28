"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

function tooltipStyle() {
  return {
    border: "1px solid #e5e8eb",
    borderRadius: 8,
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
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => availableOptions.map((option) => option.id)
  );
  const [view, setView] = useState<"index" | "amount">("index");

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedIds.includes(option.id) && option.available),
    [options, selectedIds]
  );

  const chartData = useMemo(() => {
    return rows.map((row) => {
      const item: Record<string, number | string | null> = { period: row.period };
      for (const option of selectedOptions) {
        const raw = getSeriesValue(row, option.id);
        if (raw === null || raw === undefined) {
          item[option.id] = null;
          item[`${option.id}Index`] = null;
          continue;
        }

        item[option.id] = raw;
        if (view === "index") {
          const base = rows.find((candidate) => getSeriesValue(candidate, option.id) !== null && getSeriesValue(candidate, option.id) !== undefined);
          const baseValue = base ? getSeriesValue(base, option.id) : null;
          item[`${option.id}Index`] = baseValue ? (raw / baseValue) * 100 : null;
        }
      }
      return item;
    });
  }, [rows, selectedOptions, view]);

  const hasData = selectedOptions.some((option) => rows.some((row) => getSeriesValue(row, option.id) !== null && getSeriesValue(row, option.id) !== undefined));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg bg-white p-4 ring-1 ring-[#dde2ea] lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-toss-blue">Comparison Explorer</p>
          <p className="mt-1 text-sm leading-6 text-toss-gray">
            선택한 시계열만 보여줍니다. 기본은 index view이며, 원 단위가 다른 값들을 같은 축에서 직접 비교하지 않도록 설계했습니다.
          </p>
        </div>
        <div className="flex items-center rounded-md bg-[#f4f6fa] p-1 ring-1 ring-[#dde2ea]">
          {(["index", "amount"] as const).map((item) => (
            <button
              key={item}
              className={`h-8 rounded px-3 text-sm font-extrabold transition ${view === item ? "bg-white text-toss-blue shadow-sm" : "text-toss-gray"}`}
              type="button"
              onClick={() => setView(item)}
            >
              {item === "index" ? "Index view" : "Amount view"}
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
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition ${
                option.available
                  ? active
                    ? "bg-toss-blue text-white"
                    : "bg-white text-toss-gray ring-1 ring-[#dde2ea] hover:text-toss-ink"
                  : "cursor-not-allowed bg-[#edf1f5] text-[#a4adba]"
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
              {!option.available ? <span className="text-[11px] font-extrabold">No data</span> : null}
            </button>
          );
        })}
      </div>

      {!hasData ? (
        <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">선택한 series 중 표시할 데이터가 없습니다.</div>
      ) : (
        <div className="min-h-[360px] rounded-lg bg-toss-wash p-4">
          <ResponsiveContainer width="100%" height={310}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e5e8eb" vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(value) => (view === "index" ? `${Number(value).toFixed(0)}` : formatNumber(Number(value)))} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const option = selectedOptions.find((item) => item.label === name);
                  if (!option) return [String(value), name];
                  const formatted = view === "index" ? `${Number(value).toFixed(1)}` : valueFormatter(option, Number(value), currency, usdKrw, false);
                  return [formatted, option.label];
                }}
                contentStyle={tooltipStyle()}
              />
              <Legend />
              {selectedOptions.map((option) => (
                <Line
                  key={option.id}
                  type="monotone"
                  dataKey={view === "index" ? `${option.id}Index` : option.id}
                  name={option.label}
                  stroke={colorBySource[option.source]}
                  strokeWidth={3}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
        <table className="min-w-[860px] w-full bg-white text-left text-sm">
          <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
            <tr>
              <th className="px-4 py-3">Series</th>
              <th className="px-4 py-3 text-right">Latest value</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-toss-line">
            {selectedOptions.map((option) => {
              const latestPoint = [...rows].reverse().find((row) => getSeriesValue(row, option.id) !== null && getSeriesValue(row, option.id) !== undefined);
              const latestValue = latestPoint ? getSeriesValue(latestPoint, option.id) : null;
              return (
                <tr key={option.id} className="hover:bg-toss-wash/70">
                  <td className="px-4 py-3 font-semibold">{option.label}</td>
                  <td className="px-4 py-3 text-right font-semibold">{latestValue === null || latestValue === undefined ? "No data" : valueFormatter(option, Number(latestValue), currency, usdKrw, false)}</td>
                  <td className="px-4 py-3 text-toss-gray">{option.unit}</td>
                  <td className="px-4 py-3 text-toss-gray">{option.source}</td>
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
