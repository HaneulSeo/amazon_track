import { ArrowLeft, BarChart3, Database, LineChart, Package, Search, Signal, TrendingUp, Warehouse } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { OverviewTab } from "@/components/company/OverviewTab";
import { SalesTab } from "@/components/company/SalesTab";
import { SourcesTab } from "@/components/company/SourcesTab";
import { ProductsTab } from "@/components/company/ProductsTab";
import { CorrelationTab } from "@/components/company/CorrelationTab";
import { DataQualityTab } from "@/components/company/DataQualityTab";
import { RawDataTab } from "@/components/company/RawDataTab";
import { getCompanyDartQuarterly, getCompanyMonthly, getCompanyTradeQuarterly } from "@/lib/dashboard-data";
import { formatMoneyFromUsd, formatNumber, trendTone } from "@/lib/format";
import { type DisplayCurrency } from "@/lib/format";
import type { DashboardCompany } from "@/lib/types";

export type CompanyTabId = "overview" | "sales" | "sources" | "products" | "correlation" | "quality" | "raw";

const tabs: Array<{ id: CompanyTabId; label: string; icon: typeof LineChart }> = [
  { id: "overview", label: "Overview", icon: Warehouse },
  { id: "sales", label: "Sales", icon: BarChart3 },
  { id: "sources", label: "Sources", icon: Signal },
  { id: "products", label: "Products", icon: Package },
  { id: "correlation", label: "Correlation", icon: TrendingUp },
  { id: "quality", label: "Data Quality", icon: Database },
  { id: "raw", label: "Raw Data", icon: Search }
];

export function CompanyWorkspace({
  company,
  activeTab,
  currency,
  usdKrw,
  onBack,
  setActiveTab
}: {
  company: DashboardCompany;
  activeTab: CompanyTabId;
  currency: DisplayCurrency;
  usdKrw: number;
  onBack: () => void;
  setActiveTab: (tab: CompanyTabId) => void;
}) {
  const companyMonthly = getCompanyMonthly(company.company);
  const latestDart = getCompanyDartQuarterly(company.company).at(-1) ?? null;
  const latestTrass = getCompanyTradeQuarterly(company.company).at(-1) ?? null;

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea] sm:p-6">
        <button className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-toss-gray hover:text-toss-blue" type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          Back
        </button>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold text-toss-blue">
              {company.industry_name} / {company.ticker}
            </p>
            <h2 className="mt-1 text-4xl font-extrabold sm:text-5xl">{company.label}</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-gray">{company.interpretation}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TinyStat label="Latest month" value={company.latest_month ?? "No data"} />
            <TinyStat label="Latest DART" value={latestDart?.quarter ?? "No data"} />
            <TinyStat label="Latest TRASS" value={latestTrass?.quarter ?? "No data"} />
            <TinyStat label="Coverage" value={company.coverage_score === null ? "No data" : company.coverage_score.toFixed(1)} tone={trendTone(company.coverage_score)} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Latest revenue"
          value={formatMoneyFromUsd(company.latest_revenue, currency, usdKrw)}
          helper={company.latest_month ?? "No revenue yet"}
          delta={null}
          icon={LineChart}
        />
        <KpiCard label="Latest units" value={formatNumber(company.latest_units)} helper={`${company.product_count} tracked products`} delta={null} icon={Package} />
        <KpiCard label="Coverage score" value={company.coverage_score === null ? "No data" : company.coverage_score.toFixed(1)} helper="forecasting usefulness" delta={null} icon={TrendingUp} />
        <KpiCard label="Missing data" value={company.next_data_priority_score === null ? "No data" : company.next_data_priority_score.toFixed(1)} helper="priority" delta={null} icon={Database} />
      </div>

      <nav className="flex gap-2 overflow-auto rounded-lg bg-white p-2 shadow-soft ring-1 ring-[#dde2ea]">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-extrabold transition ${
                activeTab === tab.id ? "bg-toss-blue text-white" : "text-toss-gray hover:bg-[#f4f6fa] hover:text-toss-ink"
              }`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              <TabIcon size={17} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "overview" ? <OverviewTab company={company} currency={currency} usdKrw={usdKrw} /> : null}
      {activeTab === "sales" ? <SalesTab company={company} currency={currency} usdKrw={usdKrw} /> : null}
      {activeTab === "sources" ? <SourcesTab company={company} currency={currency} usdKrw={usdKrw} /> : null}
      {activeTab === "products" ? <ProductsTab company={company} currency={currency} usdKrw={usdKrw} /> : null}
      {activeTab === "correlation" ? <CorrelationTab company={company} currency={currency} usdKrw={usdKrw} /> : null}
      {activeTab === "quality" ? <DataQualityTab company={company} /> : null}
      {activeTab === "raw" ? <RawDataTab company={company} /> : null}
    </div>
  );
}

function TinyStat({ label, value, tone = "text-toss-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-[#f7f9fc] px-4 py-3 ring-1 ring-[#dde2ea]">
      <p className="text-xs font-bold uppercase text-toss-gray">{label}</p>
      <p className={`mt-1 text-lg font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}
