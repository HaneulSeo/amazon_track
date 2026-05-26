"use client";

import { useEffect, useMemo, useState } from "react";
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
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { BrandTrendChart } from "@/components/BrandTrendChart";
import { KpiCard } from "@/components/KpiCard";
import { ProductBreakdownChart } from "@/components/ProductBreakdownChart";
import { ProductDetail } from "@/components/ProductDetail";
import { ProductTable } from "@/components/ProductTable";
import { QuarterlyComparison } from "@/components/QuarterlyComparison";
import { SectionCard } from "@/components/SectionCard";
import { monthlyBrandTrend, monthlyProductTrend, productsData, quarterlyComparisonData, summaryData } from "@/lib/data";
import {
  type DisplayCurrency,
  formatMoneyFromUsd,
  formatNumber,
  formatPercent,
  shortProductName,
  trendTone
} from "@/lib/format";
import type { Product } from "@/lib/types";

type Workspace = "home" | "amazon";
type DetailTab = "overview" | "products" | "benchmark" | "data";

type Company = {
  id: string;
  name: string;
  industry: string;
  category: string;
  description: string;
  status: "Live" | "Coming soon";
};

type Industry = {
  id: string;
  name: string;
  icon: typeof Sparkles;
  description: string;
};

const companies: Company[] = [
  {
    id: "mighty-patch",
    name: "Mighty Patch",
    industry: "beauty",
    category: "Acne Care",
    description: "Amazon / Jungle Scout 기반 패치 카테고리 추적",
    status: "Live"
  }
];

const industries: Industry[] = [
  { id: "beauty", name: "Beauty", icon: Sparkles, description: "스킨케어, 패치, 퍼스널 케어 브랜드" },
  { id: "supplements", name: "Supplements", icon: Package, description: "영양제, 웰니스, 기능성 제품" },
  { id: "food", name: "Food & Grocery", icon: Factory, description: "식품, 음료, 그로서리 브랜드" },
  { id: "home", name: "Home", icon: Building2, description: "생활용품, 홈케어, 가정용 제품" }
];

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
    fetch("/api/fx")
      .then((response) => response.json())
      .then((data: { usdKrw?: number; asOf?: string }) => {
        if (typeof data.usdKrw === "number") setUsdKrw(data.usdKrw);
        if (data.asOf) setFxAsOf(data.asOf);
      })
      .catch(() => setFxAsOf("Fallback rate"));
  }, []);

  const selected = companies.find((company) => company.id === selectedCompany) ?? null;

  const summaryCards = useMemo(
    () => [
      {
        label: "Latest Revenue",
        value: formatMoneyFromUsd(summaryData.latestRevenue, currency, usdKrw),
        helper: summaryData.latestMonth ?? undefined,
        delta: summaryData.latestMomGrowth,
        icon: CircleDollarSign
      },
      {
        label: "Latest Units",
        value: formatNumber(summaryData.latestUnits),
        helper: `${summaryData.productCount} tracked ASINs`,
        icon: Package
      },
      {
        label: "Recent 3M Growth",
        value: formatPercent(summaryData.recent3Growth),
        helper: "vs previous 3M",
        delta: summaryData.recent3Growth,
        icon: TrendingUp
      },
      {
        label: "Best Month",
        value: summaryData.bestRevenueMonth?.month ?? "-",
        helper: formatMoneyFromUsd(summaryData.bestRevenueMonth?.revenue, currency, usdKrw),
        icon: BarChart3
      }
    ],
    [currency, usdKrw]
  );

  const industryRows = industries.map((industry) => {
    const industryCompanies = companies.filter((company) => company.industry === industry.id);
    const hasLiveData = industry.id === "beauty";

    return {
      ...industry,
      companyCount: industryCompanies.length,
      productCount: hasLiveData ? summaryData.productCount : 0,
      latestRevenue: hasLiveData ? summaryData.latestRevenue : null,
      averageRevenue: hasLiveData && industryCompanies.length ? summaryData.latestRevenue / industryCompanies.length : null,
      recent3Growth: hasLiveData ? summaryData.recent3Growth : null,
      latestUnits: hasLiveData ? summaryData.latestUnits : null,
      status: hasLiveData ? "Live" : "Coming soon"
    };
  });

  if (workspace === "home") {
    return (
      <Shell currency={currency} fxAsOf={fxAsOf} setCurrency={setCurrency} usdKrw={usdKrw}>
        <MainDashboard
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
          summaryCards={summaryCards}
          usdKrw={usdKrw}
        />
      ) : activeIndustry ? (
        <IndustryWorkspace
          activeIndustry={activeIndustry}
          currency={currency}
          onOpenCompany={(companyId) => {
            setSelectedCompany(companyId);
            setActiveTab("overview");
          }}
          summaryCards={summaryCards}
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
            <h1 className="text-xl font-extrabold sm:text-2xl">Revenue Tracker</h1>
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
  onOpenAmazon
}: {
  onOpenAmazon: () => void;
}) {
  return (
    <div className="grid min-h-[calc(100vh-120px)] place-items-center">
      <section className="w-full max-w-xl">
        <button
          className="group w-full rounded-lg bg-white p-7 text-left shadow-soft ring-1 ring-[#dde2ea] transition hover:-translate-y-0.5 hover:ring-toss-blue sm:p-8"
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
            Amazon / Jungle Scout CSV 기반으로 산업군, 기업, ASIN 단위 매출 추이를 분석합니다.
          </p>
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
            const IndustryIcon = industry.icon;
            const count = companies.filter((company) => company.industry === industry.id).length;
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
                  <IndustryIcon size={18} />
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
          {summaryData.sourceFileCount} CSV files · {summaryData.productCount} products · {summaryData.monthCount} months
        </p>
      </div>
    </aside>
  );
}

function buildIndustryRow(industry: Industry) {
  const industryCompanies = companies.filter((company) => company.industry === industry.id);
  const hasLiveData = industry.id === "beauty";
  return {
    ...industry,
    companyCount: industryCompanies.length,
    productCount: hasLiveData ? summaryData.productCount : 0,
    latestRevenue: hasLiveData ? summaryData.latestRevenue : null,
    averageRevenue: hasLiveData && industryCompanies.length ? summaryData.latestRevenue / industryCompanies.length : null,
    recent3Growth: hasLiveData ? summaryData.recent3Growth : null,
    latestUnits: hasLiveData ? summaryData.latestUnits : null,
    status: hasLiveData ? "Live" : "Coming soon"
  };
}

function AllIndustriesWorkspace({
  currency,
  industryRows,
  onSelectIndustry,
  usdKrw
}: {
  currency: DisplayCurrency;
  industryRows: Array<ReturnType<typeof buildIndustryRow>>;
  onSelectIndustry: (industryId: string) => void;
  usdKrw: number;
}) {
  const liveRows = industryRows.filter((row) => row.status === "Live");

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold text-toss-blue">Amazon Tracker</p>
            <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">Industry Overview</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-gray">
              트래킹 중인 전체 산업군의 평균 매출, 성장률, 제품 수를 먼저 확인하고 산업군별 상세 화면으로 들어갑니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TinyStat label="Tracked industries" value={String(liveRows.length)} />
            <TinyStat label="Companies" value={String(companies.length)} />
            <TinyStat label="Avg latest" value={formatMoneyFromUsd(summaryData.latestRevenue / Math.max(liveRows.length, 1), currency, usdKrw)} />
            <TinyStat label="Avg 3M" value={formatPercent(summaryData.recent3Growth)} tone={trendTone(summaryData.recent3Growth)} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {industryRows.map((industry) => {
          const IndustryIcon = industry.icon;
          return (
            <button
              key={industry.id}
              className="group rounded-lg bg-white p-5 text-left shadow-soft ring-1 ring-[#dde2ea] transition hover:-translate-y-0.5 hover:ring-toss-blue"
              type="button"
              onClick={() => onSelectIndustry(industry.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-[#eef5ff] text-toss-blue">
                  <IndustryIcon size={20} />
                </span>
                <span className={`rounded px-2 py-1 text-xs font-bold ${industry.status === "Live" ? "bg-emerald-50 text-emerald-600" : "bg-[#f1f4f8] text-toss-gray"}`}>
                  {industry.status}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-extrabold">{industry.name}</h3>
              <p className="mt-2 min-h-10 text-sm font-medium leading-5 text-toss-gray">{industry.description}</p>
              <div className="mt-5 space-y-2 text-sm">
                <MetricRow label="Avg revenue" value={formatMoneyFromUsd(industry.averageRevenue, currency, usdKrw)} />
                <MetricRow label="3M growth" value={formatPercent(industry.recent3Growth)} tone={trendTone(industry.recent3Growth)} />
                <MetricRow label="Companies" value={String(industry.companyCount)} />
              </div>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-toss-blue">
                Open industry
                <ChevronRight className="transition group-hover:translate-x-1" size={17} />
              </div>
            </button>
          );
        })}
      </div>

      <SectionCard eyebrow="Average Movement" title="Tracked industry trend">
        <BrandTrendChart data={monthlyBrandTrend} currency={currency} usdKrw={usdKrw} />
      </SectionCard>
    </div>
  );
}

function IndustryWorkspace({
  activeIndustry,
  currency,
  onOpenCompany,
  summaryCards,
  usdKrw
}: {
  activeIndustry: string;
  currency: DisplayCurrency;
  onOpenCompany: (companyId: string) => void;
  summaryCards: Array<{ label: string; value: string; helper?: string; delta?: number | null; icon: typeof CircleDollarSign }>;
  usdKrw: number;
}) {
  const industry = industries.find((item) => item.id === activeIndustry) ?? industries[0];
  const visibleCompanies = companies.filter((company) => company.industry === activeIndustry);
  const isLive = activeIndustry === "beauty";

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold text-toss-blue">Amazon Tracker / {industry.name}</p>
            <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">Industry Company Overview</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-gray">
              {industry.description}. 산업군 안의 기업별 추적 현황과 평균 동향을 보고, 기업을 선택해 상세 분석으로 들어갑니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TinyStat label="Live companies" value={String(visibleCompanies.length)} />
            <TinyStat label="Avg tracked" value={isLive ? formatMoneyFromUsd(summaryData.latestRevenue / Math.max(visibleCompanies.length, 1), currency, usdKrw) : "-"} />
            <TinyStat label="Avg 3M" value={isLive ? formatPercent(summaryData.recent3Growth) : "-"} tone={isLive ? trendTone(summaryData.recent3Growth) : "text-toss-gray"} />
            <TinyStat label="Products" value={isLive ? String(summaryData.productCount) : "0"} />
          </div>
        </div>
      </section>

      {isLive ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <KpiCard key={card.label} {...card} />
          ))}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-toss-blue">Companies</p>
              <h3 className="mt-1 text-xl font-extrabold">{industry.name} portfolio</h3>
            </div>
            <span className="rounded-md bg-[#eef5ff] px-3 py-1 text-xs font-bold text-toss-blue">{visibleCompanies.length} companies</span>
          </div>
          <div className="space-y-3">
            {visibleCompanies.length ? (
              visibleCompanies.map((company) => (
                <button
                  key={company.id}
                  className="group flex w-full items-center justify-between rounded-lg bg-[#f7f9fc] p-4 text-left ring-1 ring-transparent transition hover:bg-white hover:ring-toss-blue"
                  type="button"
                  onClick={() => onOpenCompany(company.id)}
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded bg-white px-2 py-1 text-xs font-bold text-toss-blue ring-1 ring-[#dde2ea]">{company.category}</span>
                      <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">{company.status}</span>
                    </div>
                    <p className="text-lg font-extrabold">{company.name}</p>
                    <p className="mt-1 text-sm font-medium text-toss-gray">{company.description}</p>
                  </div>
                  <ChevronRight className="shrink-0 text-toss-gray transition group-hover:translate-x-1 group-hover:text-toss-blue" size={20} />
                </button>
              ))
            ) : (
              <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">아직 이 산업군에 연결된 기업 데이터가 없습니다.</div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-toss-blue">Average Trend</p>
              <h3 className="mt-1 text-xl font-extrabold">{industry.name} movement</h3>
            </div>
            <p className="text-xs font-bold text-toss-gray">{isLive ? `${summaryData.firstMonth} - ${summaryData.latestMonth}` : "No data"}</p>
          </div>
          {isLive ? (
            <BrandTrendChart data={monthlyBrandTrend} currency={currency} usdKrw={usdKrw} />
          ) : (
            <div className="grid min-h-[320px] place-items-center rounded-lg bg-[#f7f9fc] text-sm font-semibold text-toss-gray">
              CSV가 추가되면 산업 평균 동향이 여기에 표시됩니다.
            </div>
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
  summaryCards,
  usdKrw
}: {
  activeTab: DetailTab;
  company: Company;
  currency: DisplayCurrency;
  onBack: () => void;
  setActiveTab: (tab: DetailTab) => void;
  summaryCards: Array<{ label: string; value: string; helper?: string; delta?: number | null; icon: typeof CircleDollarSign }>;
  usdKrw: number;
}) {
  const industry = industries.find((item) => item.id === company.industry);

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea] sm:p-6">
        <button className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-toss-gray hover:text-toss-blue" type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          Back to {industry?.name ?? "Industry"}
        </button>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold text-toss-blue">{industry?.name ?? "Industry"} / {company.category}</p>
            <h2 className="mt-1 text-4xl font-extrabold sm:text-5xl">{company.name}</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-gray">{company.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TinyStat label="Latest" value={formatMoneyFromUsd(summaryData.latestRevenue, currency, usdKrw)} />
            <TinyStat label="Units" value={formatNumber(summaryData.latestUnits)} />
            <TinyStat label="3M" value={formatPercent(summaryData.recent3Growth)} tone={trendTone(summaryData.recent3Growth)} />
            <TinyStat label="ASINs" value={String(summaryData.productCount)} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
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

      {activeTab === "overview" ? <OverviewTab currency={currency} usdKrw={usdKrw} /> : null}
      {activeTab === "products" ? <ProductsTab currency={currency} usdKrw={usdKrw} /> : null}
      {activeTab === "benchmark" ? <BenchmarkTab currency={currency} usdKrw={usdKrw} /> : null}
      {activeTab === "data" ? <DataTab currency={currency} usdKrw={usdKrw} /> : null}
    </div>
  );
}

function OverviewTab({ currency, usdKrw }: { currency: DisplayCurrency; usdKrw: number }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <SectionCard eyebrow="Overview" title="Brand trend">
        <BrandTrendChart data={monthlyBrandTrend} currency={currency} usdKrw={usdKrw} />
      </SectionCard>
      <SectionCard eyebrow="Signals" title="Winners & Losers">
        <div className="grid gap-4">
          <RankingList title="3M growth leaders" icon={TrendingUp} items={summaryData.topProductsByGrowth} metric={(product) => formatPercent(product.recent3Growth)} />
          <RankingList title="3M revenue decliners" icon={TrendingDown} items={summaryData.decliningProducts} metric={(product) => formatPercent(product.recent3Growth)} />
        </div>
      </SectionCard>
    </div>
  );
}

function ProductsTab({ currency, usdKrw }: { currency: DisplayCurrency; usdKrw: number }) {
  return (
    <div className="space-y-5">
      <SectionCard eyebrow="Products" title="Revenue mix">
        <ProductBreakdownChart products={productsData} trends={monthlyProductTrend} latestMonth={summaryData.latestMonth} currency={currency} usdKrw={usdKrw} />
      </SectionCard>
      <SectionCard eyebrow="Products" title="Product detail">
        <ProductDetail products={productsData} trends={monthlyProductTrend} currency={currency} usdKrw={usdKrw} />
      </SectionCard>
      <SectionCard eyebrow="Products" title="Latest ranking">
        <ProductRankingTable currency={currency} usdKrw={usdKrw} />
      </SectionCard>
    </div>
  );
}

function BenchmarkTab({ currency, usdKrw }: { currency: DisplayCurrency; usdKrw: number }) {
  return (
    <SectionCard eyebrow="Benchmark" title="External quarterly revenue vs tracked Amazon">
      <QuarterlyComparison rows={quarterlyComparisonData} baseQuarter={summaryData.quarterlyBenchmarkBaseQuarter} currency={currency} usdKrw={usdKrw} />
    </SectionCard>
  );
}

function DataTab({ currency, usdKrw }: { currency: DisplayCurrency; usdKrw: number }) {
  return (
    <SectionCard eyebrow="Raw Data" title="Monthly product table">
      <ProductTable rows={monthlyProductTrend} currency={currency} usdKrw={usdKrw} />
    </SectionCard>
  );
}

function ProductRankingTable({ currency, usdKrw }: { currency: DisplayCurrency; usdKrw: number }) {
  return (
    <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
      <table className="min-w-[760px] w-full bg-white text-left text-sm">
        <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
          <tr>
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">ASIN</th>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3 text-right">Revenue</th>
            <th className="px-4 py-3 text-right">Share</th>
            <th className="px-4 py-3 text-right">3M Growth</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-toss-line">
          {productsData.map((product) => (
            <tr key={product.productId}>
              <td className="px-4 py-3 font-bold">{product.latestRevenueRank}</td>
              <td className="px-4 py-3 text-toss-gray">{product.asin}</td>
              <td className="px-4 py-3">{shortProductName(product.productName, product.asin)}</td>
              <td className="px-4 py-3 text-right font-semibold">{formatMoneyFromUsd(product.latestRevenue, currency, usdKrw, false)}</td>
              <td className="px-4 py-3 text-right">{product.latestRevenueShare.toFixed(1)}%</td>
              <td className={`px-4 py-3 text-right font-semibold ${trendTone(product.recent3Growth)}`}>{formatPercent(product.recent3Growth)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

function IndustrySummaryList({
  currency,
  industryRows,
  usdKrw
}: {
  currency: DisplayCurrency;
  industryRows: Array<ReturnType<typeof buildIndustryRow>>;
  usdKrw: number;
}) {
  return (
    <div className="space-y-3">
      {industryRows.map((industry) => {
        const IndustryIcon = industry.icon;
        return (
          <div key={industry.id} className="flex items-center justify-between gap-4 rounded-lg bg-[#f7f9fc] p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-toss-blue ring-1 ring-[#dde2ea]">
                <IndustryIcon size={19} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{industry.name}</p>
                <p className="text-xs font-semibold text-toss-gray">{industry.companyCount} companies · {industry.productCount} products</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-extrabold">{formatMoneyFromUsd(industry.averageRevenue, currency, usdKrw)}</p>
              <p className={`text-xs font-bold ${trendTone(industry.recent3Growth)}`}>{formatPercent(industry.recent3Growth)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type RankingListProps<T extends Product> = {
  title: string;
  icon: typeof TrendingUp;
  items: T[];
  metric: (product: T) => string;
};

function RankingList<T extends Product>({ title, icon: Icon, items, metric }: RankingListProps<T>) {
  return (
    <div className="rounded-lg bg-toss-wash p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-toss-ink">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-toss-blue ring-1 ring-toss-line">
          <Icon size={17} />
        </span>
        {title}
      </div>
      <div className="space-y-3">
        {items.slice(0, 6).map((product, index) => (
          <div key={`${title}-${product.productId}`} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-toss-ink">
                {index + 1}. {shortProductName(product.productName, product.asin)}
              </p>
              <p className="text-xs text-toss-gray">{product.asin}</p>
            </div>
            <p className={`shrink-0 text-sm font-bold ${trendTone(product.recent3Growth)}`}>{metric(product)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
