"use client";

import { useMemo, useState } from "react";
import type {
  CompanyMonthlyRow,
  DartQuarterlyRevenueRow,
  QuarterlyComparison,
  StockMonthlyRow,
  TradeMonthlyRow,
  TradeQuarterlyRow
} from "@/lib/types";
import { type DisplayCurrency, formatMoneyFromKrw, formatMoneyFromUsd, formatNumber } from "@/lib/format";
import { QuarterlyComparison as QuarterlyComparisonChart } from "@/components/QuarterlyComparison";

type BenchmarkDataTableProps = {
  companyLabel: string;
  companyMonthly: CompanyMonthlyRow[];
  tradeMonthly: TradeMonthlyRow[];
  tradeQuarterly: TradeQuarterlyRow[];
  dartRows: DartQuarterlyRevenueRow[];
  stockRows: StockMonthlyRow[];
  quarterlyComparison: QuarterlyComparison[];
  currency: DisplayCurrency;
  usdKrw: number;
};

type DatasetKey =
  | "dartQuarterlyRevenue"
  | "amazonMonthlyProxy"
  | "amazonQuarterlyAggregate"
  | "trassMonthly"
  | "trassQuarterly"
  | "stockMonthly"
  | "existingQuarterlyComparison";

function monthToQuarter(month: string) {
  const match = month.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const quarter = Math.ceil(monthNumber / 3);
  return `${year}-Q${quarter}`;
}

export function BenchmarkDataTable({
  companyLabel,
  companyMonthly,
  tradeMonthly,
  tradeQuarterly,
  dartRows,
  stockRows,
  quarterlyComparison,
  currency,
  usdKrw
}: BenchmarkDataTableProps) {
  const options = useMemo(
    () =>
      [
        { key: "dartQuarterlyRevenue" as const, label: "DART quarterly revenue", available: dartRows.length > 0 },
        { key: "amazonMonthlyProxy" as const, label: "Amazon monthly proxy", available: companyMonthly.length > 0 },
        { key: "amazonQuarterlyAggregate" as const, label: "Amazon quarterly aggregate", available: companyMonthly.length > 0 },
        { key: "trassMonthly" as const, label: "TRASS monthly", available: tradeMonthly.length > 0 },
        { key: "trassQuarterly" as const, label: "TRASS quarterly", available: tradeQuarterly.length > 0 },
        { key: "stockMonthly" as const, label: "Stock monthly", available: stockRows.length > 0 },
        { key: "existingQuarterlyComparison" as const, label: "Existing quarterly comparison", available: quarterlyComparison.length > 0 }
      ],
    [companyMonthly.length, dartRows.length, quarterlyComparison.length, stockRows.length, tradeMonthly.length, tradeQuarterly.length]
  );

  const defaultKey = options.find((option) => option.available)?.key ?? "dartQuarterlyRevenue";
  const [selectedKey, setSelectedKey] = useState<DatasetKey>(defaultKey);

  const amazonQuarterly = useMemo(() => {
    const buckets = new Map<
      string,
      {
        revenue: number;
        units: number;
        monthCount: number;
      }
    >();
    for (const row of companyMonthly) {
      const quarter = monthToQuarter(row.month);
      if (!quarter) continue;
      const current = buckets.get(quarter) ?? { revenue: 0, units: 0, monthCount: 0 };
      current.revenue += row.total_revenue ?? 0;
      current.units += row.total_units ?? 0;
      current.monthCount += 1;
      buckets.set(quarter, current);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([quarter, value]) => ({ quarter, ...value }));
  }, [companyMonthly]);

  const content = (() => {
    switch (selectedKey) {
      case "dartQuarterlyRevenue":
        return (
          <SimpleTable
            headers={["Quarter", "Revenue", "Source"]}
            rows={dartRows
              .slice()
              .sort((a, b) => b.quarter.localeCompare(a.quarter))
              .map((row) => [row.quarter, formatMoneyFromKrw(row.revenue_krw, currency, usdKrw), row.source_url ? "available" : "missing"])}
          />
        );
      case "amazonMonthlyProxy":
        return (
          <SimpleTable
            headers={["Month", "Revenue", "Units", "Warnings"]}
            rows={companyMonthly
              .slice()
              .sort((a, b) => b.month.localeCompare(a.month))
              .slice(0, 24)
              .map((row) => [
                row.month,
                formatMoneyFromUsd(row.total_revenue, currency, usdKrw),
                formatNumber(row.total_units),
                row.data_quality_warnings.length ? row.data_quality_warnings.join(" · ") : "-"
              ])}
          />
        );
      case "amazonQuarterlyAggregate":
        return (
          <SimpleTable
            headers={["Quarter", "Revenue", "Units", "Months"]}
            rows={amazonQuarterly
              .slice()
              .sort((a, b) => b.quarter.localeCompare(a.quarter))
              .map((row) => [row.quarter, formatMoneyFromUsd(row.revenue, currency, usdKrw), formatNumber(row.units), String(row.monthCount)])}
          />
        );
      case "trassMonthly":
        return (
          <SimpleTable
            headers={["Month", "Product line", "Scope", "Export value", "Weight"]}
            rows={tradeMonthly
              .slice()
              .sort((a, b) => b.month.localeCompare(a.month))
              .slice(0, 24)
              .map((row) => [row.month, row.product_line, row.country_scope, formatMoneyFromKrw(row.export_value_krw, currency, usdKrw), formatNumber(row.export_weight_kg)])}
          />
        );
      case "trassQuarterly":
        return (
          <SimpleTable
            headers={["Quarter", "Product line", "Scope", "Export value", "Weight"]}
            rows={tradeQuarterly
              .slice()
              .sort((a, b) => b.quarter.localeCompare(a.quarter))
              .slice(0, 24)
              .map((row) => [row.quarter, row.product_line, row.country_scope, formatMoneyFromKrw(row.export_value_krw, currency, usdKrw), formatNumber(row.export_weight_kg)])}
          />
        );
      case "stockMonthly":
        return (
          <SimpleTable
            headers={["Month", "Close", "Adj close", "Index 100"]}
            rows={stockRows
              .slice()
              .sort((a, b) => b.month.localeCompare(a.month))
              .slice(0, 24)
              .map((row) => [row.month, formatNumber(row.close), formatNumber(row.adj_close), formatNumber(row.index_100)])}
          />
        );
      case "existingQuarterlyComparison":
        return (
          <QuarterlyComparisonChart
            rows={quarterlyComparison.slice().sort((a, b) => a.quarter.localeCompare(b.quarter)).slice(-12)}
            baseQuarter={quarterlyComparison.find((row) => row.externalRevenueEokKrw !== null && row.trackedRevenueUsd !== null)?.quarter ?? null}
            currency={currency}
            usdKrw={usdKrw}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-4 ring-1 ring-[#dde2ea]">
        <p className="text-sm font-bold text-toss-blue">Detailed Data</p>
        <p className="mt-1 text-sm leading-6 text-toss-gray">
          {companyLabel}의 원천 데이터를 선택해서 확인합니다. 기본은 DART와 Amazon proxy 중심입니다.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {options.map((option) => (
            <button
              key={option.key}
              className={`rounded-md px-3 py-2 text-left text-sm font-bold transition ${
                selectedKey === option.key
                  ? "bg-toss-blue text-white"
                  : option.available
                    ? "bg-[#f4f6fa] text-toss-gray hover:text-toss-ink"
                    : "cursor-not-allowed bg-[#edf1f5] text-[#a4adba]"
              }`}
              disabled={!option.available}
              type="button"
              onClick={() => setSelectedKey(option.key)}
            >
              {option.label}
              {!option.available ? <span className="ml-2 text-xs font-extrabold">No data</span> : null}
            </button>
          ))}
        </div>
      </div>

      {content ?? <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">선택한 데이터가 없습니다.</div>}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
      <table className="min-w-[860px] w-full bg-white text-left text-sm">
        <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-toss-line">
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={`${row[0] ?? "row"}-${index}`} className="hover:bg-toss-wash/70">
                {row.map((cell, cellIndex) => (
                  <td key={`${index}-${cellIndex}`} className={`px-4 py-3 ${cellIndex > 0 ? "text-right" : "font-semibold"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-5 text-sm font-semibold text-toss-gray" colSpan={headers.length}>
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
