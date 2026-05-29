"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Database,
  Factory,
  Gauge,
  Globe,
  Home,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  Package,
  Search,
  ShieldHalf,
  Sigma,
  Sparkles,
  Store,
  TrendingUp
} from "lucide-react";
import { BrandTrendChart } from "@/components/BrandTrendChart";
import { KpiCard } from "@/components/KpiCard";
import { SectionCard } from "@/components/SectionCard";
import { BenchmarkSummary } from "@/components/benchmark/BenchmarkSummary";
import { BenchmarkDataTable } from "@/components/benchmark/BenchmarkDataTable";
import { ComparisonExplorer } from "@/components/benchmark/ComparisonExplorer";
import { ProductFamilyToggle } from "@/components/products/ProductFamilyToggle";
import { RevenueModelExplorer } from "@/components/model/RevenueModelExplorer";
import { DemandSignalPanel } from "@/components/model/DemandSignalPanel";
import {
  companies,
  companyCoverageScore,
  getCompany,
  getCompanyDartQuarterly,
  getCompanyDemandSeries,
  getCompanyModels,
  getCompanyCoverage,
  getCompanyMonthly,
  getCompanyProducts,
  getCompanySources,
  getCompanyTradeMonthly,
  getCompanyTradeQuarterly,
  getCompanyStockMonthly,
  getIndustry,
  industries,
  methodologyNotes,
  missingDataChecklist,
  overview,
  quarterlyComparison,
  revenueModels,
  toBrandTrend
} from "@/lib/dashboard-data";
import { type DisplayCurrency, formatMoneyFromKrw, formatMoneyFromUsd, formatNumber, formatPercent, productLabel, trendTone } from "@/lib/format";
import type { LucideIcon } from "lucide-react";
import type {
  ComparisonPoint,
  ComparisonSeriesOption,
  CompanyMonthlyRow,
  DashboardCompany,
  DashboardIndustry,
  MonthlyProductLike,
  TradeMonthlyRow,
  TradeQuarterlyRow,
  StockMonthlyRow
} from "@/lib/types";

type Workspace = "home" | "amazon";
type DetailTab = "overview" | "products" | "benchmark" | "model" | "data";

const tabs: Array<{ id: DetailTab; label: string; icon: typeof LineChart }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "benchmark", label: "Benchmark", icon: BarChart3 },
  { id: "model", label: "Model", icon: Sigma },
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

  const industryRows = industries.map((industry) => ({
    ...industry,
    latestRevenueLabel: formatMoneyFromUsd(industry.latest_revenue, currency, usdKrw),
    coverageLabel: industry.average_coverage_score === null ? "-" : `${industry.average_coverage_score.toFixed(1)}`
  }));

  if (workspace === "home") {
    return (
      <Shell currency={currency} fxAsOf={fxAsOf} setCurrency={setCurrency} usdKrw={usdKrw}>
        <Launcher
          currency={currency}
          usdKrw={usdKrw}
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
      appName="Amazon Tracker"
      onHome={() => {
        setWorkspace("home");
        setActiveIndustry(null);
        setSelectedCompany(null);
      }}
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
  usdKrw,
  appName,
  onHome
}: {
  children: React.ReactNode;
  currency: DisplayCurrency;
  fxAsOf: string | null;
  setCurrency: (currency: DisplayCurrency) => void;
  sidebar?: React.ReactNode;
  usdKrw: number;
  appName?: string;
  onHome?: () => void;
}) {
  return (
    <main className="min-h-screen text-toss-ink">
      <div className="flex min-h-screen">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar currency={currency} setCurrency={setCurrency} usdKrw={usdKrw} fxAsOf={fxAsOf} appName={appName} onHome={onHome} />
          <div className="mx-auto w-full max-w-[1520px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </main>
  );
}

function TopBar({
  currency,
  setCurrency,
  usdKrw,
  fxAsOf,
  appName,
  onHome
}: {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  usdKrw: number;
  fxAsOf: string | null;
  appName?: string;
  onHome?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-toss-line/80 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onHome}
          disabled={!onHome}
          className="flex items-center gap-2.5 text-left disabled:cursor-default"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#3182f6] to-[#1b64da] text-white shadow-sm">
            <LayoutGrid size={18} strokeWidth={2.4} />
          </span>
          <span className="flex items-center gap-2">
            <span className="text-base font-extrabold tracking-tight">Research Console</span>
            {appName ? (
              <>
                <ChevronRight size={15} className="text-toss-gray" />
                <span className="text-base font-bold text-toss-ink2">{appName}</span>
              </>
            ) : null}
          </span>
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray" size={16} />
            <input
              className="h-9 w-56 rounded-lg border-0 bg-toss-wash2 pl-9 pr-4 text-sm outline-none ring-1 ring-toss-line transition focus:bg-white focus:ring-2 focus:ring-toss-blue lg:w-64"
              placeholder="검색"
            />
          </div>
          <div className="flex items-center rounded-lg bg-toss-wash2 p-1 ring-1 ring-toss-line">
            {(["USD", "KRW"] as DisplayCurrency[]).map((item) => (
              <button
                key={item}
                className={`h-7 rounded-md px-3 text-sm font-extrabold transition ${currency === item ? "bg-white text-toss-blue shadow-sm" : "text-toss-gray hover:text-toss-ink2"}`}
                type="button"
                onClick={() => setCurrency(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div
            className="hidden items-center gap-1.5 rounded-lg bg-toss-wash2 px-3 py-2 ring-1 ring-toss-line sm:flex"
            title={fxAsOf ? `FX updated ${fxAsOf}` : undefined}
          >
            <span className="text-xs font-bold text-toss-gray">USD/KRW</span>
            <span className="tnum text-xs font-extrabold">{usdKrw.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

type MiniApp = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  status: "live" | "soon";
};

const MINI_APPS: MiniApp[] = [
  {
    id: "amazon",
    name: "Amazon Tracker",
    tagline: "해외 수요 선행지표",
    description: "Amazon US 판매 데이터를 산업·기업·제품군·월 단위로 표준화하고, DART 분기 매출·TRASS 수출과 회귀로 연결합니다.",
    icon: Store,
    accent: "from-[#3182f6] to-[#1b64da]",
    status: "live"
  },
  {
    id: "trade",
    name: "무역 데이터",
    tagline: "수출입 통관 흐름",
    description: "관세청·TRASS 기반 국가별 수출입 물량과 단가를 수집해 수요 동향을 추적합니다.",
    icon: Globe,
    accent: "from-[#00a661] to-[#018a52]",
    status: "soon"
  },
  {
    id: "screener",
    name: "종목 스크리너",
    tagline: "중소형주 발굴",
    description: "재무·수급 조건으로 중소형주를 선별하고 회사별 추적 리스트를 만듭니다.",
    icon: Gauge,
    accent: "from-[#7c5cff] to-[#5b3fd6]",
    status: "soon"
  },
  {
    id: "risk",
    name: "리스크 엔진",
    tagline: "시장 국면 신호",
    description: "저점·고점 양방향 신호와 크래시 동행 밀도로 시장 국면을 점검합니다.",
    icon: ShieldHalf,
    accent: "from-[#ff8f00] to-[#f04452]",
    status: "soon"
  }
];

function Launcher({
  currency,
  usdKrw,
  onOpenAmazon
}: {
  currency: DisplayCurrency;
  usdKrw: number;
  onOpenAmazon: () => void;
}) {
  const heroStats = [
    { label: "추적 기업", value: String(overview.tracked_company_count), icon: Store },
    { label: "추적 ASIN", value: formatNumber(overview.total_asin_count), icon: Package },
    { label: "최신 데이터", value: overview.latest_month ?? "-", icon: CircleDollarSign },
    { label: "평균 커버리지", value: overview.average_coverage_score === null ? "-" : overview.average_coverage_score.toFixed(1), icon: TrendingUp }
  ];

  const amazonStats = [
    { label: "추적 기업", value: String(overview.tracked_company_count) },
    { label: "최신 월", value: overview.latest_month ?? "-" },
    { label: "ASIN", value: formatNumber(overview.total_asin_count) },
    { label: "커버리지", value: overview.average_coverage_score === null ? "-" : overview.average_coverage_score.toFixed(1) }
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-xl2 bg-gradient-to-br from-[#10172a] via-[#16233f] to-[#1b3a6b] p-7 text-white shadow-soft sm:p-9">
        <p className="text-sm font-bold text-white/70">투자 리서치 콘솔</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">데이터로 보는 기업 추적</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">
          여러 데이터 모듈을 한 곳에서 실행합니다. 아래 아이콘을 눌러 각 프로그램으로 이동하세요.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {heroStats.map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
                <div className="flex items-center gap-2 text-white/70">
                  <StatIcon size={15} />
                  <span className="text-xs font-bold uppercase tracking-wide">{stat.label}</span>
                </div>
                <p className="tnum mt-2 text-2xl font-extrabold">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <LayoutGrid size={16} className="text-toss-gray" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-toss-gray">프로그램</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {MINI_APPS.map((app) => (
            <AppTile
              key={app.id}
              app={app}
              stats={app.id === "amazon" ? amazonStats : undefined}
              onOpen={app.id === "amazon" ? onOpenAmazon : undefined}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function AppTile({
  app,
  stats,
  onOpen
}: {
  app: MiniApp;
  stats?: Array<{ label: string; value: string }>;
  onOpen?: () => void;
}) {
  const Icon = app.icon;
  const isLive = app.status === "live";
  return (
    <button
      type="button"
      disabled={!isLive}
      onClick={isLive ? onOpen : undefined}
      className={`group relative flex h-full flex-col rounded-xl2 p-6 text-left transition ${
        isLive
          ? "cursor-pointer bg-white shadow-card ring-1 ring-toss-line/70 hover:-translate-y-1 hover:shadow-pop hover:ring-toss-blue/40"
          : "cursor-default border-2 border-dashed border-toss-line bg-white/50"
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-sm ${app.accent} ${isLive ? "" : "opacity-40 grayscale"}`}
        >
          <Icon size={26} strokeWidth={2.2} />
        </span>
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pos/10 px-2.5 py-1 text-xs font-bold text-pos">
            <span className="h-1.5 w-1.5 rounded-full bg-pos" /> 실시간
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-toss-wash2 px-2.5 py-1 text-xs font-bold text-toss-gray">
            <Clock size={12} /> 준비 중
          </span>
        )}
      </div>
      <h3 className={`mt-5 text-xl font-extrabold ${isLive ? "text-toss-ink" : "text-toss-gray"}`}>{app.name}</h3>
      <p className={`mt-1 text-sm font-bold ${isLive ? "text-toss-blue" : "text-toss-gray"}`}>{app.tagline}</p>
      <p className="mt-2 text-sm leading-6 text-toss-ink2">{app.description}</p>
      {isLive && stats ? (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-toss-wash px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-toss-gray">{stat.label}</p>
              <p className="tnum mt-0.5 text-base font-extrabold text-toss-ink">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}
      <div className={`mt-6 inline-flex items-center gap-1.5 text-sm font-extrabold ${isLive ? "text-toss-blue" : "text-toss-gray"}`}>
        {isLive ? (
          <>
            열기
            <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </>
        ) : (
          "공개 예정"
        )}
      </div>
    </button>
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
        <p className="mt-2 text-sm leading-6 text-toss-ink2">
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
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-ink2">
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
            <p className="mt-2 min-h-10 text-sm font-medium leading-5 text-toss-ink2">{industry.interpretation}</p>
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
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-ink2">
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
                  <p className="mt-1 text-sm font-medium text-toss-ink2">{company.interpretation}</p>
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
  const dartRows = getCompanyDartQuarterly(company.company);
  const stockRows = getCompanyStockMonthly(company.company);
  const latestDart = dartRows.slice().sort((a, b) => a.quarter.localeCompare(b.quarter)).at(-1) ?? null;
  const latestStock = stockRows.slice().sort((a, b) => a.month.localeCompare(b.month)).at(-1) ?? null;
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
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-ink2">{company.interpretation}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <TinyStat label="Latest Amazon month" value={company.latest_month ?? "No data"} />
            <TinyStat label="Latest Amazon revenue" value={formatMoneyFromUsd(company.latest_revenue, currency, usdKrw)} />
            <TinyStat label="Latest Amazon units" value={formatNumber(company.latest_units)} />
            <TinyStat label="Latest DART quarter" value={latestDart?.quarter ?? "No data"} />
            <TinyStat
              label="Latest DART revenue"
              value={latestDart?.revenue_krw === null || latestDart?.revenue_krw === undefined ? "No data" : formatMoneyFromKrw(latestDart.revenue_krw, currency, usdKrw)}
            />
            <TinyStat label="Latest stock close" value={latestStock ? formatNumber(latestStock.adj_close ?? latestStock.close) : "No data"} helper={latestStock?.month ?? "No data"} />
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
      {activeTab === "products" ? <ProductsTab key={company.company} company={company} currency={currency} usdKrw={usdKrw} /> : null}
      {activeTab === "benchmark" ? <BenchmarkTab company={company} currency={currency} usdKrw={usdKrw} /> : null}
      {activeTab === "model" ? <ModelTab company={company} currency={currency} usdKrw={usdKrw} /> : null}
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
          <p className="text-sm leading-6 text-toss-ink2">{company.interpretation}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniCard label="Amazon proxy role" value={company.amazon_us_direct_coverage_of_total.base >= 0.05 ? "Useful signal" : "Reference signal"} helper="proxy strength" />
            <MiniCard label="Tracked families" value={String(company.family_count)} helper={`${company.asin_count} ASINs`} />
          </div>
          <div className="rounded-lg bg-[#f7f9fc] p-4 text-sm leading-6 text-toss-ink2">
            {company.latest_month ? (
              <p>
                Latest Amazon month is <span className="font-bold text-toss-ink">{company.latest_month}</span> and latest revenue is{" "}
                <span className="font-bold text-toss-ink">{formatMoneyFromUsd(company.latest_revenue, currency, usdKrw)}</span>.
              </p>
            ) : (
              <p>Amazon monthly proxy data is not available yet.</p>
            )}
            {companyMonthly.length ? (
              <p className="mt-2">
                Latest DART quarter and stock trend are reviewed in Benchmark. Overview is a short read-through, not a full comparison screen.
              </p>
            ) : null}
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
  const productRows = getCompanyProducts(company.company);
  const latestProductRows = buildLatestProductRows(productRows);
  const familyGroups = buildProductFamilyGroups(company.company, productRows);
  const [selectedFamily, setSelectedFamily] = useState(familyGroups[0]?.id ?? "all");
  const visibleRows = familyGroups.find((group) => group.id === selectedFamily)?.rows ?? [];

  return (
    <div className="space-y-5">
      <SectionCard eyebrow="Product Family Analysis" title="Family selector">
        {familyGroups.length ? (
          <div className="space-y-4">
            <ProductFamilyToggle options={familyGroups.map((group) => ({ id: group.id, label: group.label, count: group.rows.length }))} selectedFamily={selectedFamily} onChange={setSelectedFamily} />
            <div className="rounded-lg bg-[#f7f9fc] p-4 text-sm leading-6 text-toss-ink2">
              {company.company === "samyang" ? (
                <p>
                  Samyang은 <span className="font-bold text-toss-ink">Sauce</span>와 <span className="font-bold text-toss-ink">Ramen</span>으로만 묶어 보여줍니다. Sauce는 Buldak sauce만, 나머지는 Ramen으로 봅니다.
                </p>
              ) : (
                <p>
                  선택한 family의 최신 ASIN만 보여줍니다. family가 많으면 상위 family와 Other만 먼저 노출하고 나머지는 묶습니다.
                </p>
              )}
            </div>
            {visibleRows.length ? (
              <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
                <table className="min-w-[1080px] w-full bg-white text-left text-sm">
                  <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
                    <tr>
                      <th className="px-4 py-3">ASIN</th>
                      <th className="px-4 py-3">Product name / family</th>
                      <th className="px-4 py-3 text-right">Latest month</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Units</th>
                      <th className="px-4 py-3 text-right">BSR</th>
                      <th className="px-4 py-3 text-right">Reviews</th>
                      <th className="px-4 py-3">Revenue source</th>
                      <th className="px-4 py-3">Warnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-toss-line">
                    {visibleRows.map((row) => (
                      <tr key={`${row.asin}-${row.month}`} className="hover:bg-toss-wash/70">
                        <td className="px-4 py-3 font-semibold">{row.asin}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold leading-5">{productLabel(row.product_name, row.product_family)}</div>
                          <div className="mt-1 text-xs font-medium text-toss-gray">{row.product_family}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-toss-gray">{row.month}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatMoneyFromUsd(row.revenue, currency, usdKrw, false)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.units, false)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.avg_bsr, false)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.reviews, false)}</td>
                        <td className="px-4 py-3">
                          <Badge>{row.revenue_source}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {row.data_quality_warnings.length ? <Badge>{row.data_quality_warnings[0]}</Badge> : <span className="text-xs font-semibold text-toss-gray">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="선택한 family에 표시할 제품이 없습니다." />
            )}
          </div>
        ) : (
          <EmptyState message="제품군 데이터가 아직 없습니다." />
        )}
      </SectionCard>

      <SectionCard eyebrow="Product Ranking" title="Latest month ASIN ranking">
        {productRows.length ? (
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
                {latestProductRows
                  .slice()
                  .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0) || (b.avg_bsr ?? Number.MAX_SAFE_INTEGER) - (a.avg_bsr ?? Number.MAX_SAFE_INTEGER))
                  .map((row, index) => (
                  <tr key={`${row.asin}-${row.month}`} className="hover:bg-toss-wash/70">
                    <td className="px-4 py-3 font-bold">{index + 1}</td>
                    <td className="px-4 py-3 text-toss-gray">{row.asin}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold leading-5">{productLabel(row.product_name, row.product_family)}</div>
                      <div className="mt-1 text-xs font-medium text-toss-gray">{row.asin}</div>
                    </td>
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
  const companyMonthly = getCompanyMonthly(company.company);
  const tradeMonthly = getCompanyTradeMonthly(company.company);
  const tradeQuarterly = getCompanyTradeQuarterly(company.company);
  const stockRows = getCompanyStockMonthly(company.company);
  const dartRows = getCompanyDartQuarterly(company.company);
  const comparisonRows = buildComparisonRows(company.company, companyMonthly, tradeQuarterly, dartRows, stockRows);
  const comparisonOptions = buildComparisonOptions(company.company, companyMonthly, tradeQuarterly, dartRows, stockRows);

  return (
    <div className="space-y-5">
      <SectionCard eyebrow="Benchmark Summary" title="DART and stock first">
        <BenchmarkSummary key={company.company} dartRows={dartRows} stockRows={stockRows} currency={currency} usdKrw={usdKrw} />
      </SectionCard>

      <SectionCard eyebrow="Comparison Explorer" title="Pick the series to compare">
        <ComparisonExplorer key={company.company} rows={comparisonRows} options={comparisonOptions} currency={currency} usdKrw={usdKrw} />
      </SectionCard>

      <SectionCard eyebrow="Detailed Data" title="Select a dataset to inspect">
        <BenchmarkDataTable
          key={company.company}
          companyLabel={company.label}
          companyMonthly={companyMonthly}
          tradeMonthly={tradeMonthly}
          tradeQuarterly={tradeQuarterly}
          dartRows={dartRows}
          stockRows={stockRows}
          quarterlyComparison={quarterlyComparison.filter((row) => row.company === company.company)}
          currency={currency}
          usdKrw={usdKrw}
        />
      </SectionCard>
    </div>
  );
}

function ModelTab({
  company,
  currency,
  usdKrw
}: {
  company: DashboardCompany;
  currency: DisplayCurrency;
  usdKrw: number;
}) {
  const models = getCompanyModels(company.company);
  const demandSeries = getCompanyDemandSeries(company.company);
  const demandHasSample = demandSeries.some((entry) => entry.is_sample);
  return (
    <div className="space-y-5">
      <SectionCard eyebrow="Revenue Modeling" title="분기 매출 예측 회귀">
        <RevenueModelExplorer models={models} currency={currency} usdKrw={usdKrw} minNForBest={revenueModels?.minNForBest} />
      </SectionCard>
      {demandSeries.length ? (
        <SectionCard eyebrow="Demand Signals" title="검색 수요 신호 (무료)">
          <DemandSignalPanel series={demandSeries} anySample={demandHasSample} />
        </SectionCard>
      ) : null}
    </div>
  );
}

type ProductFamilyGroup = {
  id: string;
  label: string;
  rows: MonthlyProductLike[];
};

type ComparisonRow = ComparisonPoint;

function buildLatestProductRows(rows: MonthlyProductLike[]): MonthlyProductLike[] {
  const latestByProduct = new Map<string, MonthlyProductLike>();
  for (const row of rows) {
    const current = latestByProduct.get(row.asin);
    if (!current || row.month.localeCompare(current.month) > 0) {
      latestByProduct.set(row.asin, row);
    }
  }
  return [...latestByProduct.values()];
}

function buildProductFamilyGroups(company: string, rows: MonthlyProductLike[]): ProductFamilyGroup[] {
  const latestRows = buildLatestProductRows(rows);
  const mapped = latestRows.map((row) => ({
    ...row,
    family: mapProductFamily(company, row.product_family)
  }));

  const familyRevenue = new Map<string, number>();
  for (const row of mapped) {
    familyRevenue.set(row.family, (familyRevenue.get(row.family) ?? 0) + (row.revenue ?? 0));
  }

  const familyOrder =
    company === "samyang"
      ? ["Ramen", "Sauce"]
      : [...familyRevenue.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([family]) => family);

  const visibleFamilies =
    company === "samyang"
      ? familyOrder
      : familyOrder.length > 6
        ? [...familyOrder.slice(0, 5), "Other"]
        : familyOrder;

  const grouped = visibleFamilies.map((family) => ({
    id: family,
    label: family,
    rows: mapped
      .filter((row) => (family === "Other" ? !visibleFamilies.slice(0, 5).includes(row.family) : row.family === family))
      .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0) || b.month.localeCompare(a.month))
  }));

  return grouped.filter((group) => group.rows.length > 0);
}

function mapProductFamily(company: string, family: string) {
  const normalized = (family ?? "").trim() || "Other";
  if (company === "samyang") {
    return normalized.toLowerCase() === "buldak sauce" ? "Sauce" : "Ramen";
  }
  return normalized;
}

function buildComparisonRows(
  _company: string,
  companyMonthly: CompanyMonthlyRow[],
  tradeQuarterly: TradeQuarterlyRow[],
  dartRows: ReturnType<typeof getCompanyDartQuarterly>,
  stockRows: StockMonthlyRow[]
): ComparisonRow[] {
  const quarters = new Set<string>();
  for (const row of companyMonthly) {
    const quarter = monthToQuarter(row.month);
    if (quarter) quarters.add(quarter);
  }
  for (const row of tradeQuarterly) quarters.add(row.quarter);
  for (const row of dartRows) quarters.add(row.quarter);
  for (const row of stockRows) {
    const quarter = monthToQuarter(row.month);
    if (quarter) quarters.add(quarter);
  }

  return [...quarters]
    .sort((a, b) => a.localeCompare(b))
    .slice(-24)
    .map((period) => {
      const amazonRows = companyMonthly.filter((row) => monthToQuarter(row.month) === period);
      const trassQuarterRows = tradeQuarterly.filter((row) => row.quarter === period);
      const dartRow = dartRows.find((row) => row.quarter === period) ?? null;
      const stockQuarterRows = stockRows.filter((row) => monthToQuarter(row.month) === period);

      const totalTrassRows = trassQuarterRows.filter((row) => row.country_scope === "total");
      const trassSourceRows = totalTrassRows.length ? totalTrassRows : trassQuarterRows;

      const latestStockRow = stockQuarterRows.slice().sort((a, b) => a.month.localeCompare(b.month)).at(-1) ?? null;

      return {
        period,
        dartRevenue: dartRow?.revenue_krw ?? null,
        amazonRevenue: amazonRows.reduce((sum, row) => sum + (row.total_revenue ?? 0), 0) || null,
        amazonUnits: amazonRows.reduce((sum, row) => sum + (row.total_units ?? 0), 0) || null,
        trassExport: trassSourceRows.reduce((sum, row) => sum + (row.export_value_krw ?? 0), 0) || null,
        stockPrice: latestStockRow ? latestStockRow.adj_close ?? latestStockRow.close : null
      };
    });
}

function buildComparisonOptions(
  _company: string,
  companyMonthly: CompanyMonthlyRow[],
  tradeQuarterly: TradeQuarterlyRow[],
  dartRows: ReturnType<typeof getCompanyDartQuarterly>,
  stockRows: StockMonthlyRow[]
): ComparisonSeriesOption[] {
  const comparisonRows = buildComparisonRows(_company, companyMonthly, tradeQuarterly, dartRows, stockRows);
  return [
    { id: "dartRevenue", label: "DART quarterly revenue", source: "dart", unit: "krw", available: comparisonRows.some((row) => row.dartRevenue !== null) },
    { id: "amazonRevenue", label: "Amazon tracked revenue", source: "amazon", unit: "usd", available: comparisonRows.some((row) => row.amazonRevenue !== null) },
    { id: "amazonUnits", label: "Amazon tracked units", source: "amazon", unit: "units", available: comparisonRows.some((row) => row.amazonUnits !== null) },
    { id: "trassExport", label: "TRASS export value", source: "trass", unit: "krw", available: comparisonRows.some((row) => row.trassExport !== null) },
    { id: "stockPrice", label: "Stock price", source: "stock", unit: "price", available: comparisonRows.some((row) => row.stockPrice !== null) }
  ];
}

function monthToQuarter(month: string) {
  const match = month.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = match[1];
  const monthNumber = Number(match[2]);
  const quarter = Math.ceil(monthNumber / 3);
  return `${year}-Q${quarter}`;
}

function collectRawWarnings(companyMonthly: CompanyMonthlyRow[], productRows: MonthlyProductLike[]) {
  const warnings = new Set<string>();
  for (const row of companyMonthly) {
    for (const warning of row.data_quality_warnings) warnings.add(warning);
  }
  for (const row of productRows) {
    for (const warning of row.data_quality_warnings) warnings.add(warning);
  }
  return [...warnings].slice(0, 12);
}

function DataTab({ company }: { company: DashboardCompany }) {
  const checklist = getCompanySources(company.company);
  const groupedChecklist = missingDataChecklist.find((row) => row.company === company.company)?.items ?? checklist;
  const coverage = getCompanyCoverage(company.company);
  const companyMonthly = getCompanyMonthly(company.company);
  const productRows = getCompanyProducts(company.company);
  const rawWarnings = collectRawWarnings(companyMonthly, productRows);

  return (
    <div className="space-y-5">
      <details className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea]">
        <summary className="cursor-pointer list-none text-sm font-extrabold text-toss-ink">Missing Data Checklist</summary>
        <div className="mt-4 space-y-3">
          {groupedChecklist.map((item) => (
            <div key={item.source_name} className="rounded-lg bg-[#f7f9fc] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-extrabold">{item.source_name}</p>
                  <p className="mt-1 text-sm leading-6 text-toss-ink2">{item.description}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Badge>{item.source_type}</Badge>
                  <Badge>{item.current_status}</Badge>
                  <Badge>P{item.priority}</Badge>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-toss-ink2">{item.why_it_matters}</p>
            </div>
          ))}
        </div>
      </details>

      <details className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea]">
        <summary className="cursor-pointer list-none text-sm font-extrabold text-toss-ink">Source Status</summary>
        <div className="mt-4 space-y-3">
          {checklist.map((item) => (
            <div key={item.source_name} className="flex flex-col gap-2 rounded-lg bg-[#f7f9fc] p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-extrabold">{item.source_name}</p>
                <p className="mt-1 text-sm leading-6 text-toss-ink2">{item.description}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Badge>{item.current_status}</Badge>
                <Badge>{item.source_type}</Badge>
              </div>
            </div>
          ))}
        </div>
      </details>

      <details className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea]">
        <summary className="cursor-pointer list-none text-sm font-extrabold text-toss-ink">Raw Warnings</summary>
        <div className="mt-4">
          {rawWarnings.length ? (
            <div className="flex flex-wrap gap-2">
              {rawWarnings.map((warning) => (
                <Badge key={warning}>{warning}</Badge>
              ))}
            </div>
          ) : (
            <EmptyState message="Raw warning이 없습니다." />
          )}
        </div>
      </details>

      <details className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea]">
        <summary className="cursor-pointer list-none text-sm font-extrabold text-toss-ink">Diagnostics</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MiniCard label="Amazon data quality" value={coverage ? coverage.amazon_data_quality_score.toFixed(1) : "-"} helper="hidden diagnostic" />
          <MiniCard label="Revenue exposure" value={coverage ? coverage.revenue_exposure_score.toFixed(1) : "-"} helper="hidden diagnostic" />
          <MiniCard label="Channel gap" value={coverage ? coverage.channel_gap_score.toFixed(1) : "-"} helper="hidden diagnostic" />
          <MiniCard label="Region gap" value={coverage ? coverage.region_gap_score.toFixed(1) : "-"} helper="hidden diagnostic" />
          <MiniCard label="Missing data" value={coverage ? coverage.missing_data_score.toFixed(1) : "-"} helper="hidden diagnostic" />
          <MiniCard label="Next priority" value={coverage ? coverage.next_data_priority_score.toFixed(1) : "-"} helper="hidden diagnostic" />
        </div>
      </details>

      <details className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea]">
        <summary className="cursor-pointer list-none text-sm font-extrabold text-toss-ink">Methodology</summary>
        <div className="mt-4 space-y-3 text-sm leading-6 text-toss-ink2">
          {methodologyNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
          <p>추정치는 assumption으로만 사용하고, 투자 판단의 최종 근거로 쓰지 않습니다.</p>
        </div>
      </details>
    </div>
  );
}

function TinyStat({ label, value, tone = "text-toss-ink", helper }: { label: string; value: string; tone?: string; helper?: string }) {
  return (
    <div className="rounded-lg bg-[#f7f9fc] px-4 py-3 ring-1 ring-[#dde2ea]">
      <p className="text-xs font-bold uppercase text-toss-gray">{label}</p>
      <p className={`mt-1 text-lg font-extrabold ${tone}`}>{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold text-toss-gray">{helper}</p> : null}
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
