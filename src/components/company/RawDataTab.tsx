import { useMemo, useState } from "react";
import { SectionCard } from "@/components/SectionCard";
import {
  getCompanyDartQuarterly,
  getCompanyMonthly,
  getCompanyProductFamilies,
  getCompanyStockMonthly,
  getCompanyTradeMonthly,
  getCompanyTradeQuarterly,
  getCompanyQuarterlyComparison
} from "@/lib/dashboard-data";
import type { DashboardCompany } from "@/lib/types";

type RawView = "amazon" | "families" | "trade-monthly" | "trade-quarterly" | "dart" | "stock" | "comparison";

export function RawDataTab({ company }: { company: DashboardCompany }) {
  const [view, setView] = useState<RawView>("amazon");
  const views: Array<{ id: RawView; label: string }> = [
    { id: "amazon", label: "Amazon monthly" },
    { id: "families", label: "Product families" },
    { id: "trade-monthly", label: "TRASS monthly" },
    { id: "trade-quarterly", label: "TRASS quarterly" },
    { id: "dart", label: "DART quarterly" },
    { id: "stock", label: "Stock monthly" },
    { id: "comparison", label: "Quarterly comparison" }
  ];

  const rows = useMemo(() => {
    switch (view) {
      case "families":
        return getCompanyProductFamilies(company.company).slice(-24);
      case "trade-monthly":
        return getCompanyTradeMonthly(company.company).slice(-24);
      case "trade-quarterly":
        return getCompanyTradeQuarterly(company.company).slice(-24);
      case "dart":
        return getCompanyDartQuarterly(company.company).slice(-12);
      case "stock":
        return getCompanyStockMonthly(company.company).slice(-24);
      case "comparison":
        return getCompanyQuarterlyComparison(company.company).slice(-12);
      default:
        return getCompanyMonthly(company.company).slice(-24);
    }
  }, [company.company, view]);

  return (
    <div className="space-y-5">
      <SectionCard eyebrow="Raw Data" title="Recent rows">
        <div className="flex flex-wrap gap-2">
          {views.map((item) => (
            <button
              key={item.id}
              className={`rounded-md px-3 py-2 text-sm font-bold ${view === item.id ? "bg-toss-blue text-white" : "bg-toss-wash text-toss-gray"}`}
              type="button"
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-5 overflow-auto rounded-lg ring-1 ring-toss-line">
          <table className="min-w-[980px] w-full bg-white text-left text-xs">
            <thead className="bg-toss-wash uppercase text-toss-gray">
              <tr>{headersFor(view).map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-toss-line">
              {rows.length ? rows.map((row, index) => <Row key={index} view={view} row={row} />) : <tr><td className="px-4 py-4 text-sm text-toss-gray" colSpan={headersFor(view).length}>No data</td></tr>}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function headersFor(view: RawView): string[] {
  switch (view) {
    case "families":
      return ["Month", "Family", "Revenue", "Units", "Share", "Confidence"];
    case "trade-monthly":
      return ["Month", "Quarter", "Line", "Country", "USD", "KRW", "Weight"];
    case "trade-quarterly":
      return ["Quarter", "Line", "Country", "USD", "KRW", "Weight"];
    case "dart":
      return ["Quarter", "Revenue KRW", "Period", "Derived", "Source"];
    case "stock":
      return ["Month", "Close", "Adj Close", "Volume", "Return", "Index"];
    case "comparison":
      return ["Quarter", "External", "Tracked", "Gap", "Months", "Comment"];
    default:
      return ["Month", "ASIN", "Product", "Revenue", "Units", "Family", "Source"];
  }
}

function Row({ view, row }: { view: RawView; row: any }) {
  switch (view) {
    case "families":
      return (
        <tr>
          <td className="px-4 py-3">{row.month}</td>
          <td className="px-4 py-3">{row.product_family}</td>
          <td className="px-4 py-3">{row.total_revenue ?? "-"}</td>
          <td className="px-4 py-3">{row.total_units ?? "-"}</td>
          <td className="px-4 py-3">{row.revenue_share_in_company ?? "-"}</td>
          <td className="px-4 py-3">{row.family_confidence}</td>
        </tr>
      );
    case "trade-monthly":
      return (
        <tr>
          <td className="px-4 py-3">{row.month}</td>
          <td className="px-4 py-3">{row.quarter}</td>
          <td className="px-4 py-3">{row.product_line}</td>
          <td className="px-4 py-3">{row.country_scope}</td>
          <td className="px-4 py-3">{row.export_value_usd ?? "-"}</td>
          <td className="px-4 py-3">{row.export_value_krw ?? "-"}</td>
          <td className="px-4 py-3">{row.export_weight_kg ?? "-"}</td>
        </tr>
      );
    case "trade-quarterly":
      return (
        <tr>
          <td className="px-4 py-3">{row.quarter}</td>
          <td className="px-4 py-3">{row.product_line}</td>
          <td className="px-4 py-3">{row.country_scope}</td>
          <td className="px-4 py-3">{row.export_value_usd ?? "-"}</td>
          <td className="px-4 py-3">{row.export_value_krw ?? "-"}</td>
          <td className="px-4 py-3">{row.export_weight_kg ?? "-"}</td>
        </tr>
      );
    case "dart":
      return (
        <tr>
          <td className="px-4 py-3">{row.quarter}</td>
          <td className="px-4 py-3">{row.revenue_krw ?? "-"}</td>
          <td className="px-4 py-3">{row.period_type}</td>
          <td className="px-4 py-3">{String(row.is_derived)}</td>
          <td className="px-4 py-3">{row.source_url}</td>
        </tr>
      );
    case "stock":
      return (
        <tr>
          <td className="px-4 py-3">{row.month}</td>
          <td className="px-4 py-3">{row.close ?? "-"}</td>
          <td className="px-4 py-3">{row.adj_close ?? "-"}</td>
          <td className="px-4 py-3">{row.volume ?? "-"}</td>
          <td className="px-4 py-3">{row.month_return ?? "-"}</td>
          <td className="px-4 py-3">{row.index_100 ?? "-"}</td>
        </tr>
      );
    case "comparison":
      return (
        <tr>
          <td className="px-4 py-3">{row.quarter}</td>
          <td className="px-4 py-3">{row.externalRevenueEokKrw ?? "-"}</td>
          <td className="px-4 py-3">{row.trackedRevenueUsd ?? "-"}</td>
          <td className="px-4 py-3">{row.indexGap ?? "-"}</td>
          <td className="px-4 py-3">{row.monthsPresent}</td>
          <td className="px-4 py-3">{row.comment}</td>
        </tr>
      );
    default:
      return (
        <tr>
          <td className="px-4 py-3">{row.month}</td>
          <td className="px-4 py-3">{row.asin}</td>
          <td className="px-4 py-3">{row.product_name}</td>
          <td className="px-4 py-3">{row.revenue ?? "-"}</td>
          <td className="px-4 py-3">{row.units ?? "-"}</td>
          <td className="px-4 py-3">{row.product_family}</td>
          <td className="px-4 py-3">{row.revenue_source}</td>
        </tr>
      );
  }
}
