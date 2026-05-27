"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ChevronRight,
  CircleDollarSign,
  Database,
  Factory,
  Home,
  LayoutDashboard,
  LineChart,
  Package,
  Search,
  Sparkles,
  Store,
  TrendingUp
} from "lucide-react";
import { BrandTrendChart } from "@/components/BrandTrendChart";
import { QuarterlyComparison } from "@/components/QuarterlyComparison";
import { KpiCard } from "@/components/KpiCard";
import { SectionCard } from "@/components/SectionCard";
import {
  companies,
  companyCoverageScore,
  getCompany,
  getCompanyQuarterlyComparison,
  getCompanyCoverage,
  getCompanyMonthly,
  getCompanyProductFamilies,
  getCompanySources,
  getCompanyTradeCountryMonthly,
  getIndustry,
  industries,
  methodologyNotes,
  missingDataChecklist,
  overview,
  regionalExposure,
  toBrandTrend
} from "@/lib/dashboard-data";
import { type DisplayCurrency, formatMoneyFromKrw, formatMoneyFromUsd, formatNumber, formatPercent, productLabel, trendTone } from "@/lib/format";
import type { LucideIcon } from "lucide-react";
import type { DashboardCompany, DashboardIndustry } from "@/lib/types";

type Workspace = "home" | "amazon";
type DetailTab = "overview" | "products" | "benchmark" | "data";

const tabs: Array<{ id: DetailTab; label: string; icon: typeof LineChart }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "benchmark", label: "Benchmark", icon: BarChart3 },
  { id: "data", label: "Data", icon: Database }
];

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>("home");
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [currency, setCurrency] = useState<DisplayCurrency>("USD");
  const [usdKrw, setUsdKrw] = useState(1350);
  const [fxAsOf, setFxAsOf] = useState<string | null>(null);

  useEffect(() => {
    // Preserve the existing FX fetch behavior without introducing a new data dependency.
    fetch("/api/fx")
      .then((response) => response.json())
      .then((data: { usdKrw?: number; asOf?: string }) => {
        if (typeof data.usdKrw === "number") setUsdKrw(data.usdKrw);
        if (data.asOf) setFxAsOf(data.asOf);
      })
      .catch(() => setFxAsOf("Fallback rate"));
  }, []);

  const selected = selectedCompany ? getCompany(selectedCompany) ?? null : null;
  const selectedIndustry = activeIndustry ? getIndustry(activeIndustry) ?? null : null;

  const summaryCards = useMemo(
    () => [
      {
        label: "Tracked companies",
        value: String(overview.tracked_company_count),
        helper: `${overview.tracked_industry_count} industries`,
        icon: Store
      },
      {
        label: "Tracked ASINs",
        value: formatNumber(overview.total_asin_count),
        helper: `${overview.raw_file_count} raw CSVs`,
        icon: Package
      },
      {
        label: "Latest month",
        value: overview.latest_month ?? "-",
        helper: formatMoneyFromUsd(overview.latest_revenue, currency, usdKrw),
        icon: CircleDollarSign
      },
      {
        label: "Avg coverage",
        value: overview.average_coverage_score === null ? "-" : `${overview.average_coverage_score.toFixed(1)}`,
        helper: overview.most_needed_company ? `Next: ${overview.most_needed_company.label}` : "Coverage score",
        delta: null,
        icon: TrendingUp
      }
    ],
    [currency, usdKrw]
  );

  const industryRows = industries.map((industry) => ({
    ...industry,
    latestRevenueLabel: formatMoneyFromUsd(industry.latest_revenue, currency, usdKrw),
    coverageLabel: industry.average_coverage_score === null ? "-" : `${industry.average_coverage_score.toFixed(1)}`
  }));

  if (workspace === "home") {
    return (
      <Shell currency={currency} fxAsOf={fxAsOf} setCurrency={setCurrency} usdKrw={usdKrw}>
        <MainDashboard
          overviewCards={summaryCards}
          onOpenAmazon={() => {
            setWorkspace("amazon");
            setActiveIndustry(null);
            setSelectedCompany(null);
          }}
        />
      </Shell>
    );
  }

  return (
    <Shell
      currency={currency}
      fxAsOf={fxAsOf}
      setCurrency={setCurrency}
      usdKrw={usdKrw}
      sidebar={
        <AmazonSidebar
          activeIndustry={activeIndustry}
          onBackHome={() => {
            setWorkspace("home");
            setActiveIndustry(null);
            setSelectedCompany(null);
          }}
          onSelectIndustry={(industryId) => {
            setActiveIndustry(industryId);
            setSelectedCompany(null);
          }}
          onShowAll={() => {
            setActiveIndustry(null);
            setSelectedCompany(null);
          }}
        />
      }
    >
      {selected ? (
        <CompanyWorkspace
          activeTab={activeTab}
          company={selected}
          currency={currency}
          onBack={() => setSelectedCompany(null)}
          setActiveTab={setActiveTab}
          usdKrw={usdKrw}
        />
      ) : selectedIndustry ? (
        <IndustryWorkspace
          activeIndustry={selectedIndustry.id}
          currency={currency}
          onOpenCompany={(companyId) => {
            setSelectedCompany(companyId);
            setActiveTab("overview");
          }}
          usdKrw={usdKrw}
        />
      ) : (
        <AllIndustriesWorkspace
          currency={currency}
          industryRows={industryRows}
          onSelectIndustry={setActiveIndustry}
          usdKrw={usdKrw}
        />
      )}
    </Shell>
  );
}

function Shell({
  children,
  currency,
  fxAsOf,
  setCurrency,
  sidebar,
  usdKrw
}: {
  children: React.ReactNode;
  currency: DisplayCurrency;
  fxAsOf: string | null;
  setCurrency: (currency: DisplayCurrency) => void;
  sidebar?: React.ReactNode;
  usdKrw: number;
}) {
  return (
    <main className="min-h-screen bg-[#f4f6fa] text-toss-ink">
      <div className="flex min-h-screen">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar currency={currency} setCurrency={setCurrency} usdKrw={usdKrw} fxAsOf={fxAsOf} />
          <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </main>
  );
}

function TopBar({
  currency,
  setCurrency,
  usdKrw,
  fxAsOf
}: {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  usdKrw: number;
  fxAsOf: string | null;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#dde2ea] bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-toss-blue text-white">
            <LineChart size={21} />
          </div>
          <div>
            <p className="text-sm font-bold text-toss-gray">Dashboard</p>
            <h1 className="text-xl font-extrabold sm:text-2xl">Amazon Tracking</h1>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray" size={17} />
            <input
              className="h-10 w-full rounded-md border-0 bg-[#f4f6fa] pl-9 pr-4 text-sm outline-none ring-1 ring-[#dde2ea] focus:ring-2 focus:ring-toss-blue sm:w-72"
              placeholder="Search"
            />
          </div>
          <div className="flex items-center rounded-md bg-[#f4f6fa] p-1 ring-1 ring-[#dde2ea]">
            {(["USD", "KRW"] as DisplayCurrency[]).map((item) => (
              <button
                key={item}
                className={`h-8 rounded px-3 text-sm font-extrabold transition ${currency === item ? "bg-white text-toss-blue shadow-sm" : "text-toss-gray"}`}
                type="button"
                onClick={() => setCurrency(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold text-toss-gray">USD/KRW {usdKrw.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}</p>
        </div>
      </div>
      {fxAsOf ? <p className="mx-auto mt-1 max-w-[1480px] text-right text-[11px] font-semibold text-toss-gray">FX updated {fxAsOf}</p> : null}
    </header>
  );
}

function MainDashboard({
  overviewCards,
  onOpenAmazon
}: {
  overviewCards: Array<{ label: string; value: string; helper?: string; delta?: number | null; icon: LucideIcon }>;
  onOpenAmazon: () => void;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea] sm:p-6">
        <button
          className="group w-full rounded-lg bg-white p-2 text-left transition"
          type="button"
          onClick={onOpenAmazon}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-toss-blue text-white">
              <Store size={23} />
            </div>
            <ChevronRight className="text-toss-gray transition group-hover:translate-x-1 group-hover:text-toss-blue" />
          </div>
          <p className="mt-8 text-sm font-bold text-toss-blue">Data Module</p>
          <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">Amazon Tracker</h2>
          <p className="mt-3 text-sm font-medium leading-6 text-toss-gray">
            Amazon US CSV를 산업, 기업, 제품군, 월 단위로 표준화해서 선행지표로 봅니다.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => (
              <KpiCard key={card.label} {...card} />
            ))}
          </div>
          <div className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-toss-blue">
            Open tracker
            <ChevronRight className="transition group-hover:translate-x-1" size={17} />
          </div>
        </button>
      </section>
    </div>
  );
}

function AmazonSidebar({
  activeIndustry,
  onBackHome,
  onSelectIndustry,
  onShowAll
}: {
  activeIndustry: string | null;
  onBackHome: () => void;
  onSelectIndustry: (industryId: string) => void;
  onShowAll: () => void;
}) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-[#dde2ea] bg-white px-5 py-6 lg:block">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-toss-blue text-white">
          <Store size={22} />
        </div>
        <div>
          <p className="text-lg font-extrabold">Amazon Tracker</p>
          <p className="text-xs font-semibold text-toss-gray">Industry console</p>
        </div>
      </div>

      <button className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-toss-gray hover:text-toss-blue" type="button" onClick={onBackHome}>
        <Home size={16} />
        Main dashboard
      </button>

      <div className="mt-7">
        <p className="mb-3 px-3 text-xs font-bold uppercase text-toss-gray">Amazon sections</p>
        <div className="space-y-1">
          <button
            className={`flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm font-bold transition ${
              activeIndustry === null ? "bg-toss-blue text-white shadow-soft" : "text-toss-gray hover:bg-[#f1f4f8] hover:text-toss-ink"
            }`}
            type="button"
            onClick={onShowAll}
          >
            <span className="flex items-center gap-3">
              <LayoutDashboard size={18} />
              All Industries
            </span>
            <span>{industries.length}</span>
          </button>
          {industries.map((industry) => {
            const count = industry.company_count;
            return (
              <button
                key={industry.id}
                className={`flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm font-bold transition ${
                  activeIndustry === industry.id ? "bg-toss-blue text-white shadow-soft" : "text-toss-gray hover:bg-[#f1f4f8] hover:text-toss-ink"
                }`}
                type="button"
                onClick={() => onSelectIndustry(industry.id)}
              >
                <span className="flex items-center gap-3">
                  <IndustryIcon industry={industry} />
                  {industry.name}
                </span>
                <span>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-lg bg-[#f7f9fc] p-4">
        <p className="text-sm font-bold">Data status</p>
        <p className="mt-2 text-sm leading-6 text-toss-gray">
          {overview.raw_file_count} CSV files · {overview.total_asin_count} ASINs · {overview.month_count} months
        </p>
      </div>
    </aside>
  );
}

function IndustryIcon({ industry }: { industry: DashboardIndustry }) {
  switch (industry.company) {
    case "coway":
      return <Building2 size={18} />;
    case "samyang":
      return <Factory size={18} />;
    default:
      return <Sparkles size={18} />;
  }
}

function AllIndustriesWorkspace({
  currency,
  industryRows,
  onSelectIndustry,
  usdKrw
}: {
  currency: DisplayCurrency;
  industryRows: Array<DashboardIndustry & { latestRevenueLabel: string; coverageLabel: string }>;
  onSelectIndustry: (industryId: string) => void;
  usdKrw: number;
}) {
  const trendRows = getAggregatedMonthlyTrend();
  const latestTrend = trendRows.some((row) => row.revenue !== null || row.units !== null || row.avg_price !== null || row.avg_bsr !== null);

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold text-toss-blue">Amazon Tracker</p>
            <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">Industry Overview</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-gray">
              산업별로 Amazon US proxy의 설명력과 데이터 보강 우선순위를 먼저 확인합니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TinyStat label="Tracked industries" value={String(overview.tracked_industry_count)} />
            <TinyStat label="Tracked companies" value={String(overview.tracked_company_count)} />
            <TinyStat label="ASINs" value={formatNumber(overview.total_asin_count)} />
            <TinyStat label="Avg coverage" value={overview.average_coverage_score === null ? "-" : `${overview.average_coverage_score.toFixed(1)}`} tone={trendTone(overview.average_coverage_score)} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {industryRows.map((industry) => (
          <button
            key={industry.id}
            className="group rounded-lg bg-white p-5 text-left shadow-soft ring-1 ring-[#dde2ea] transition hover:-translate-y-0.5 hover:ring-toss-blue"
            type="button"
            onClick={() => onSelectIndustry(industry.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-[#eef5ff] text-toss-blue">
                <IndustryIcon industry={industry} />
              </span>
              <span className="rounded px-2 py-1 text-xs font-bold bg-emerald-50 text-emerald-600">{industry.company_count} company</span>
            </div>
            <h3 className="mt-5 text-xl font-extrabold">{industry.name}</h3>
            <p className="mt-2 min-h-10 text-sm font-medium leading-5 text-toss-gray">{industry.interpretation}</p>
            <div className="mt-5 space-y-2 text-sm">
              <MetricRow label="Latest revenue" value={industry.latestRevenueLabel} />
              <MetricRow label="Coverage" value={industry.coverageLabel} />
              <MetricRow label="Latest month" value={industry.latest_month ?? "-"} />
            </div>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-toss-blue">
              Open industry
              <ChevronRight className="transition group-hover:translate-x-1" size={17} />
            </div>
          </button>
        ))}
      </div>

      <SectionCard eyebrow="Average Movement" title="Tracked industry trend">
        {latestTrend ? (
          <BrandTrendChart data={toBrandTrend(trendRows)} currency={currency} usdKrw={usdKrw} />
        ) : (
          <EmptyState message="현재 CSV에는 매출/판매량이 비어 있어 추세 차트는 비활성입니다." />
        )}
      </SectionCard>
    </div>
  );
}

function IndustryWorkspace({
  activeIndustry,
  currency,
  onOpenCompany,
  usdKrw
}: {
  activeIndustry: string;
  currency: DisplayCurrency;
  onOpenCompany: (companyId: string) => void;
  usdKrw: number;
}) {
  const industry = getIndustry(activeIndustry) ?? industries[0];
  const visibleCompanies = companies.filter((company) => company.industry_id === activeIndustry);
  const hasTrend = visibleCompanies.some((company) => getCompanyMonthly(company.company).some((row) => row.total_revenue !== null || row.total_units !== null || row.avg_price !== null));
  const asinCount = visibleCompanies.reduce((sum, company) => sum + (getCompany(company.company)?.asin_count ?? 0), 0);
  const trendData = visibleCompanies.flatMap((company) =>
    toBrandTrend(
      getCompanyMonthly(company.company).map((row) => ({
        month: row.month,
        revenue: row.total_revenue,
        units: row.total_units,
        avg_price: row.avg_price,
        avg_bsr: row.avg_bsr,
        reviews: row.reviews,
        asin_count: row.asin_count,
        mom_revenue_growth: row.mom_revenue_growth
      }))
    )
  );

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold text-toss-blue">Amazon Tracker / {industry?.name ?? "Industry"}</p>
            <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">Industry Company Overview</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-gray">
              산업군 안의 기업별 트래킹 상태와 커버리지 점수를 보고, 기업 상세로 들어갑니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TinyStat label="Companies" value={String(visibleCompanies.length)} />
            <TinyStat label="ASINs" value={String(asinCount)} />
            <TinyStat label="Coverage" value={industry?.average_coverage_score === null ? "-" : `${industry.average_coverage_score.toFixed(1)}`} tone={trendTone(industry?.average_coverage_score)} />
            <TinyStat label="Latest month" value={industry?.latest_month ?? "-"} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-toss-blue">Companies</p>
              <h3 className="mt-1 text-xl font-extrabold">{industry?.name ?? "Industry"} portfolio</h3>
            </div>
            <span className="rounded-md bg-[#eef5ff] px-3 py-1 text-xs font-bold text-toss-blue">{visibleCompanies.length} company</span>
          </div>
          <div className="space-y-3">
            {visibleCompanies.map((company) => (
              <button
                key={company.company}
                className="group flex w-full items-center justify-between rounded-lg bg-[#f7f9fc] p-4 text-left ring-1 ring-transparent transition hover:bg-white hover:ring-toss-blue"
                type="button"
                onClick={() => onOpenCompany(company.company)}
              >
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-white px-2 py-1 text-xs font-bold text-toss-blue ring-1 ring-[#dde2ea]">{company.ticker}</span>
                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                      {company.coverage_score === null ? "Low signal" : `${company.coverage_score.toFixed(1)} coverage`}
                    </span>
                  </div>
                  <p className="text-lg font-extrabold">{company.label}</p>
                  <p className="mt-1 text-sm font-medium text-toss-gray">{company.interpretation}</p>
                </div>
                <ChevronRight className="shrink-0 text-toss-gray transition group-hover:translate-x-1 group-hover:text-toss-blue" size={20} />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-toss-blue">Average Trend</p>
              <h3 className="mt-1 text-xl font-extrabold">{industry?.name ?? "Industry"} movement</h3>
            </div>
            <p className="text-xs font-bold text-toss-gray">{industry?.latest_month ?? "No data"}</p>
          </div>
          {hasTrend ? (
            <BrandTrendChart data={trendData} currency={currency} usdKrw={usdKrw} />
          ) : (
            <EmptyState message="현재 CSV에는 매출/판매량 값이 없어 추세 차트는 비어 있습니다." />
          )}
        </div>
      </section>
    </div>
  );
}

function CompanyWorkspace({
  activeTab,
  company,
  currency,
  onBack,
  setActiveTab,
  usdKrw
}: {
  activeTab: DetailTab;
  company: DashboardCompany;
  currency: DisplayCurrency;
  onBack: () => void;
  setActiveTab: (tab: DetailTab) => void;
  usdKrw: number;
}) {
  const industry = getIndustry(company.industry_id);
  const companyMonthly = getCompanyMonthly(company.company);
  const hasTrend = companyMonthly.some((row) => row.total_revenue !== null || row.total_units !== null || row.avg_price !== null);

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea] sm:p-6">
        <button className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-toss-gray hover:text-toss-blue" type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          Back to {industry?.name ?? "Industry"}
        </button>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold text-toss-blue">
              {industry?.name ?? "Industry"} / {company.ticker}
            </p>
            <h2 className="mt-1 text-4xl font-extrabold sm:text-5xl">{company.label}</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-gray">{company.interpretation}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TinyStat label="Latest month" value={company.latest_month ?? "-"} />
            <TinyStat label="ASINs" value={String(company.asin_count)} />
            <TinyStat label="Coverage" value={company.coverage_score === null ? "-" : `${company.coverage_score.toFixed(1)}`} tone={trendTone(company.coverage_score)} />
            <TinyStat label="Gap" value={company.missing_data_score === null ? "-" : `${company.missing_data_score.toFixed(1)}`} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Latest revenue"
          value={formatMoneyFromUsd(company.latest_revenue, currency, usdKrw)}
          helper={company.latest_month ?? "No revenue yet"}
          delta={null}
          icon={CircleDollarSign}
        />
        <KpiCard label="Latest units" value={formatNumber(company.latest_units)} helper={`${company.product_count} tracked products`} delta={null} icon={Package} />
        <KpiCard
          label="Coverage score"
          value={company.coverage_score === null ? "-" : company.coverage_score.toFixed(1)}
          helper="forecasting usefulness"
          delta={null}
          icon={TrendingUp}
        />
        <KpiCard
          label="Missing data"
          value={company.next_data_priority_score === null ? "-" : company.next_data_priority_score.toFixed(1)}
          helper="next priority"
          delta={null}
          icon={Database}
        />
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

      {activeTab === "overview" ? <OverviewTab company={company} companyMonthly={companyMonthly} currency={currency} usdKrw={usdKrw} hasTrend={hasTrend} /> : null}
      {activeTab === "products" ? <ProductsTab company={company} currency={currency} usdKrw={usdKrw} /> : null}
      {activeTab === "benchmark" ? <BenchmarkTab company={company} currency={currency} usdKrw={usdKrw} /> : null}
      {activeTab === "data" ? <DataTab company={company} /> : null}
    </div>
  );
}

function OverviewTab({
  company,
  companyMonthly,
  currency,
  usdKrw,
  hasTrend
}: {
  company: DashboardCompany;
  companyMonthly: ReturnType<typeof getCompanyMonthly>;
  currency: DisplayCurrency;
  usdKrw: number;
  hasTrend: boolean;
}) {
  const trendData = toBrandTrend(
    companyMonthly.map((row) => ({
      month: row.month,
      revenue: row.total_revenue,
      units: row.total_units,
      avg_price: row.avg_price,
      avg_bsr: row.avg_bsr,
      reviews: row.reviews,
      asin_count: row.asin_count,
      mom_revenue_growth: row.mom_revenue_growth
    }))
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <SectionCard eyebrow="Executive Summary" title={`${company.label} proxy summary`}>
        <div className="space-y-4">
          <p className="text-sm leading-6 text-toss-gray">{company.interpretation}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniCard label="Direct coverage" value={`${Math.round(company.amazon_us_direct_coverage_of_total.base * 100)}%`} helper="base assumption" />
            <MiniCard label="Coverage confidence" value={company.coverage_score === null ? "-" : `${company.coverage_score.toFixed(1)}`} helper="forecasting usefulness" />
            <MiniCard label="Next data priority" value={company.next_data_priority_score === null ? "-" : `${company.next_data_priority_score.toFixed(1)}`} helper="gap urgency" />
            <MiniCard label="Tracked families" value={String(company.family_count)} helper={`${company.asin_count} ASINs`} />
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Amazon US Trend" title="Monthly proxy trend">
        {hasTrend ? <BrandTrendChart data={trendData} currency={currency} usdKrw={usdKrw} /> : <EmptyState message="추세 차트는 현재 매출/판매량 값이 있는 CSV가 들어오면 활성화됩니다." />}
      </SectionCard>
    </div>
  );
}

function ProductsTab({
  company,
  currency,
  usdKrw
}: {
  company: DashboardCompany;
  currency: DisplayCurrency;
  usdKrw: number;
}) {
  const latestMonthRows = company.top_products
    .slice()
    .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0) || (b.avg_bsr ?? Number.MAX_SAFE_INTEGER) - (a.avg_bsr ?? Number.MAX_SAFE_INTEGER));
  const familyRows = getCompanyProductFamilies(company.company)
    .slice()
    .sort((a, b) => (b.total_revenue ?? 0) - (a.total_revenue ?? 0));

  return (
    <div className="space-y-5">
      <SectionCard eyebrow="Product Family Analysis" title="Family mix">
        {familyRows.length ? (
          <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
            <table className="min-w-[860px] w-full bg-white text-left text-sm">
              <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
                <tr>
                  <th className="px-4 py-3">Family</th>
                  <th className="px-4 py-3 text-right">Latest month</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Units</th>
                  <th className="px-4 py-3 text-right">Share</th>
                  <th className="px-4 py-3 text-right">MoM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-toss-line">
                {familyRows.map((row) => (
                  <tr key={`${row.product_family}-${row.month}`}>
                    <td className="px-4 py-3 font-semibold">{row.product_family}</td>
                    <td className="px-4 py-3 text-right text-toss-gray">{row.month}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoneyFromUsd(row.total_revenue, currency, usdKrw, false)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(row.total_units, false)}</td>
                    <td className="px-4 py-3 text-right">{row.revenue_share_in_company === null ? "-" : `${row.revenue_share_in_company.toFixed(1)}%`}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${trendTone(row.mom_revenue_growth)}`}>{formatPercent(row.mom_revenue_growth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="제품군 데이터가 아직 없습니다." />
        )}
      </SectionCard>

      <SectionCard eyebrow="Product Ranking" title="Latest month ASIN ranking">
        {latestMonthRows.length ? (
          <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
            <table className="min-w-[980px] w-full bg-white text-left text-sm">
              <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">ASIN</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Family</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Units</th>
                  <th className="px-4 py-3 text-right">BSR</th>
                  <th className="px-4 py-3 text-right">Reviews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-toss-line">
                {latestMonthRows.map((row, index) => (
                  <tr key={`${row.asin}-${row.month}`} className="hover:bg-toss-wash/70">
                    <td className="px-4 py-3 font-bold">{index + 1}</td>
                    <td className="px-4 py-3 text-toss-gray">{row.asin}</td>
                    <td className="px-4 py-3">{productLabel(row.product_name, row.asin)}</td>
                    <td className="px-4 py-3">{row.product_family}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoneyFromUsd(row.revenue, currency, usdKrw, false)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(row.units, false)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(row.avg_bsr, false)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(row.reviews, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="최신 월 제품 랭킹을 계산할 수 없습니다." />
        )}
      </SectionCard>
    </div>
  );
}

function BenchmarkTab({
  company,
  currency,
  usdKrw
}: {
  company: DashboardCompany;
  currency: DisplayCurrency;
  usdKrw: number;
}) {
  const exposure = regionalExposure.find((row) => row.company === company.company);
  const coverage = getCompanyCoverage(company.company);
  const quarterlyRows = getCompanyQuarterlyComparison(company.company);
  const countryRows = getCompanyTradeCountryMonthly(company.company);
  const countryQuarterRows = [...new Set(countryRows.map((row) => row.quarter))]
    .sort((a, b) => a.localeCompare(b))
    .slice(-8)
    .map((quarter) => {
      const group = countryRows.filter((row) => row.quarter === quarter);
      return {
        quarter,
        total: group.filter((row) => row.country_scope === "total").reduce((sum, row) => sum + (row.export_value_krw ?? 0), 0),
        us: group.filter((row) => row.country_scope === "us").reduce((sum, row) => sum + (row.export_value_krw ?? 0), 0),
        cn: group.filter((row) => row.country_scope === "cn").reduce((sum, row) => sum + (row.export_value_krw ?? 0), 0),
        weight: group.reduce((sum, row) => sum + (row.export_weight_kg ?? 0), 0)
      };
    });
  const latestCountryQuarter = countryQuarterRows.at(-1) ?? null;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard eyebrow="Regional Exposure" title="Revenue mix assumption">
          {exposure ? (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-toss-gray">{exposure.interpretation}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {exposure.regions.map((region) => (
                  <MiniCard key={region.region} label={region.region} value={`${(region.share * 100).toFixed(0)}%`} helper="revenue exposure" />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="지역 비중 데이터가 아직 없습니다." />
          )}
        </SectionCard>

        <SectionCard eyebrow="Explanation Power" title="Coverage score">
          {coverage ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniCard label="Amazon quality" value={coverage.amazon_data_quality_score.toFixed(1)} helper="CSV completeness" />
                <MiniCard label="Forecasting usefulness" value={coverage.forecasting_usefulness_score.toFixed(1)} helper="proxy strength" />
                <MiniCard label="Missing data" value={coverage.missing_data_score.toFixed(1)} helper="gap size" />
                <MiniCard label="Next priority" value={coverage.next_data_priority_score.toFixed(1)} helper="priority score" />
              </div>
              <p className="text-sm leading-6 text-toss-gray">{coverage.interpretation}</p>
            </div>
          ) : (
            <EmptyState message="커버리지 점수가 아직 없습니다." />
          )}
        </SectionCard>
      </div>

      <SectionCard eyebrow="Quarterly Comparison" title="DART vs Amazon US">
        {quarterlyRows.length ? (
          <QuarterlyComparison rows={quarterlyRows} baseQuarter={quarterlyRows.find((row) => row.externalRevenueEokKrw !== null && row.trackedRevenueUsd !== null)?.quarter ?? null} currency={currency} usdKrw={usdKrw} />
        ) : (
          <EmptyState message="DART 분기 비교 데이터가 아직 없습니다." />
        )}
      </SectionCard>

      <SectionCard eyebrow="Country Trend" title="Export trend by country">
        {countryQuarterRows.length ? (
          <div className="space-y-4">
            {latestCountryQuarter ? (
              <div className="grid gap-3 md:grid-cols-4">
                <MiniCard label="Latest quarter" value={latestCountryQuarter.quarter} helper="country bridge" />
                <MiniCard label="Total KRW" value={formatMoneyFromKrw(latestCountryQuarter.total, currency, usdKrw, false)} helper="all countries" />
                <MiniCard label="US KRW" value={formatMoneyFromKrw(latestCountryQuarter.us, currency, usdKrw, false)} helper="US export" />
                <MiniCard label="CN KRW" value={formatMoneyFromKrw(latestCountryQuarter.cn, currency, usdKrw, false)} helper="China export" />
              </div>
            ) : null}
            <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
              <table className="min-w-[860px] w-full bg-white text-left text-sm">
                <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
                  <tr>
                    <th className="px-4 py-3">Quarter</th>
                    <th className="px-4 py-3 text-right">Total KRW</th>
                    <th className="px-4 py-3 text-right">US KRW</th>
                    <th className="px-4 py-3 text-right">CN KRW</th>
                    <th className="px-4 py-3 text-right">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-toss-line">
                  {countryQuarterRows.map((row) => (
                    <tr key={row.quarter} className="hover:bg-toss-wash/70">
                      <td className="px-4 py-3 font-semibold">{row.quarter}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMoneyFromKrw(row.total, currency, usdKrw, false)}</td>
                      <td className="px-4 py-3 text-right">{formatMoneyFromKrw(row.us, currency, usdKrw, false)}</td>
                      <td className="px-4 py-3 text-right">{formatMoneyFromKrw(row.cn, currency, usdKrw, false)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(row.weight, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState message="국가별 TRASS 추이 데이터가 아직 없습니다." />
        )}
      </SectionCard>
    </div>
  );
}

function DataTab({ company }: { company: DashboardCompany }) {
  const checklist = getCompanySources(company.company);
  const groupedChecklist = missingDataChecklist.find((row) => row.company === company.company)?.items ?? checklist;

  return (
    <div className="space-y-5">
      <SectionCard eyebrow="Missing Data Checklist" title="Next data to collect">
        <div className="space-y-3">
          {groupedChecklist.map((item) => (
            <div key={item.source_name} className="rounded-lg bg-[#f7f9fc] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-extrabold">{item.source_name}</p>
                  <p className="mt-1 text-sm leading-6 text-toss-gray">{item.description}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Badge>{item.source_type}</Badge>
                  <Badge>{item.current_status}</Badge>
                  <Badge>P{item.priority}</Badge>
                </div>
              </div>
              <p className="mt-3 text-sm text-toss-gray">{item.why_it_matters}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Methodology" title="What Amazon US can and cannot explain">
        <div className="space-y-3 text-sm leading-6 text-toss-gray">
          {methodologyNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
          <p>추정치는 assumption으로만 사용하고, 투자 판단의 최종 근거로 쓰지 않습니다.</p>
        </div>
      </SectionCard>
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

function MetricRow({ label, value, tone = "text-toss-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold text-toss-gray">{label}</span>
      <span className={`font-extrabold ${tone}`}>{value}</span>
    </div>
  );
}

function MiniCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg bg-toss-wash p-3">
      <p className="text-xs font-bold uppercase text-toss-gray">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-toss-ink">{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold text-toss-gray">{helper}</p> : null}
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-toss-blue ring-1 ring-[#dde2ea]">{children}</span>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">{message}</div>;
}

function getAggregatedMonthlyTrend() {
  const allRows = companyCoverageScore.flatMap((row) => getCompanyMonthly(row.company));
  const buckets = new Map<string, Array<ReturnType<typeof getCompanyMonthly>[number]>>();
  for (const row of allRows) {
    buckets.set(row.month, [...(buckets.get(row.month) ?? []), row]);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, rows]) => ({
      month: rows[0].month,
      revenue: rows.reduce((sum, row) => sum + (row.total_revenue ?? 0), 0) || null,
      units: rows.reduce((sum, row) => sum + (row.total_units ?? 0), 0) || null,
      avg_price: rows.length ? rows.reduce((sum, row) => sum + (row.avg_price ?? 0), 0) / rows.length : null,
      avg_bsr: rows.length ? rows.reduce((sum, row) => sum + (row.avg_bsr ?? 0), 0) / rows.length : null,
      reviews: rows.reduce((sum, row) => sum + (row.reviews ?? 0), 0) || null,
      asin_count: rows.reduce((sum, row) => sum + row.asin_count, 0),
      mom_revenue_growth: null
    }));
}
