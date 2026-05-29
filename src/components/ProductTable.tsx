"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import type { ProductTrend } from "@/lib/types";
import { type DisplayCurrency, formatMoneyFromUsd, formatNumber, productLabel } from "@/lib/format";

type ProductTableProps = {
  rows: ProductTrend[];
  currency: DisplayCurrency;
  usdKrw: number;
};

export function ProductTable({ rows, currency, usdKrw }: ProductTableProps) {
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("all");
  const months = useMemo(() => [...new Set(rows.map((row) => row.month))].sort().reverse(), [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => month === "all" || row.month === month)
      .filter((row) => {
        if (!needle) return true;
        return `${row.productName} ${row.asin} ${row.month}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => b.month.localeCompare(a.month) || b.revenue - a.revenue);
  }, [month, query, rows]);

  function downloadCsv() {
    const header = ["month", "asin", "productName", "revenue", "units", "avgPrice", "avgRank", "reviews", "rating", "revenueShare"];
    const csv = [
      header.join(","),
      ...filtered.map((row) =>
        header
          .map((key) => {
            const value = row[key as keyof ProductTrend] ?? "";
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(",")
      )
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mighty-patch-monthly-product-trend.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray" size={18} />
          <input
            className="h-11 w-full rounded-md border-0 bg-toss-wash pl-10 pr-4 outline-none ring-1 ring-toss-line transition focus:ring-2 focus:ring-toss-blue"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="제품, ASIN, 월 검색"
          />
        </div>
        <div className="flex gap-3">
          <select
            className="h-11 rounded-md border-0 bg-toss-wash px-3 outline-none ring-1 ring-toss-line transition focus:ring-2 focus:ring-toss-blue"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          >
            <option value="all">전체 월</option>
            {months.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-md bg-toss-blue px-4 text-sm font-bold text-white transition hover:bg-blue-600"
            onClick={downloadCsv}
            type="button"
          >
            <Download size={17} />
            CSV
          </button>
        </div>
      </div>

      <div className="max-h-[520px] overflow-auto rounded-lg ring-1 ring-toss-line">
        <table className="min-w-[980px] w-full border-collapse bg-white text-left text-sm">
          <thead className="sticky top-0 bg-toss-wash text-xs uppercase text-toss-gray">
            <tr>
              <th className="px-4 py-3">월</th>
              <th className="px-4 py-3">ASIN</th>
              <th className="px-4 py-3">제품 / ASIN</th>
              <th className="px-4 py-3 text-right">매출</th>
              <th className="px-4 py-3 text-right">판매량</th>
              <th className="px-4 py-3 text-right">가격</th>
              <th className="px-4 py-3 text-right">BSR</th>
              <th className="px-4 py-3 text-right">리뷰</th>
              <th className="px-4 py-3 text-right">비중</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-toss-line">
            {filtered.map((row) => (
              <tr key={`${row.productId}-${row.month}`} className="hover:bg-toss-wash/70">
                <td className="px-4 py-3 font-semibold">{row.month}</td>
                <td className="px-4 py-3 text-toss-gray">{row.asin}</td>
                <td className="px-4 py-3">{productLabel(row.productName, row.asin)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoneyFromUsd(row.revenue, currency, usdKrw, false)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(row.units, false)}</td>
                <td className="px-4 py-3 text-right">{row.avgPrice === null ? "-" : `$${row.avgPrice.toFixed(2)}`}</td>
                <td className="px-4 py-3 text-right">{formatNumber(row.avgRank, false)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(row.reviews, false)}</td>
                <td className="px-4 py-3 text-right">{row.revenueShare.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
