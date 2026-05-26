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
  LayoutDashboard,
  LineChart,
  Package,
  Search,
  Sparkles,
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

type Company = {
  id: string;
  name: string;
  industry: string;
  category: string;
  description: string;
  status: "Live" | "Coming soon";
};

type DetailTab = "overview" | "products" | "benchmark" | "data";

const companies: Company[] = [
  {
    id: "mighty-patch",
    name: "Mighty Patch",
    industry: "Beauty",
    category: "Acne Care",
    description: "Amazon / Jungle Scout 기반 패치 카테고리 추적",
    status: "Live"
  }
];

const industries = [
  { id: "beauty", name: "Beauty", count: 1, icon: Sparkles },
  { id: "supplements", name: "Supplements", count: 0, icon: Package },
  { id: "food", name: "Food & Grocery", count: 0, icon: Factory },
  { id: "home", name: "Home", count: 0, icon: Building2 }
];

const tabs: Array<{ id: DetailTab; label: string; icon: typeof LineChart }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "benchmark", label: "Benchmark", icon: BarChart3 },
  { id: "data", label: "Data", icon: Database }
];

export default function Home() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [activeIndustry, setActiveIndustry] = useState("beauty");
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
      .catch(() => {
        setFxAsOf("Fallback rate");
      });
  }, []);

  const selected = companies.find((company) => company.id === selectedCompany) ?? null;
  const visibleCompanies = companies.filter((company) => company.industry.toLowerCase() === activeIndustry);

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

  return (
    <main className="min-h-screen bg-[#f4f6fa] text-toss-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[#dde2ea] bg-white px-5 py-6 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-toss-blue text-white">
              <LineChart size={22} />
            </div>
            <div>
              <p className="text-lg font-extrabold">Market Lens</p>
              <p className="text-xs font-semibold text-toss-gray">Amazon tracker console</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="mb-3 px-3 text-xs font-bold uppercase text-toss-gray">Industries</p>
            <div className="space-y-1">
              {industries.map((industry) => {
                const IndustryIcon = industry.icon;
                return (
                  <button
                    key={industry.id}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm font-bold transition ${
                      activeIndustry === industry.id ? "bg-toss-blue text-white shadow-soft" : "text-toss-gray hover:bg-[#f1f4f8] hover:text-toss-ink"
                    }`}
                    type="button"
                    onClick={() => {
                      setActiveIndustry(industry.id);
                      setSelectedCompany(null);
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <IndustryIcon size={18} />
                      {industry.name}
                    </span>
                    <span>{industry.count}</span>
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

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar currency={currency} setCurrency={setCurrency} usdKrw={usdKrw} fxAsOf={fxAsOf} />

          <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
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
            ) : (
              <IndustryWorkspace
                activeIndustry={activeIndustry}
                currency={currency}
                onOpenCompany={(companyId) => {
                  setSelectedCompany(companyId);
                  setActiveTab("overview");
                }}
                summaryCards={summaryCards}
                usdKrw={usdKrw}
                visibleCompanies={visibleCompanies}
              />
            )}
          </div>
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
          <div className="grid h-10 w-10 place-items-center rounded-md bg-toss-blue text-white lg:hidden">
            <LineChart size={21} />
          </div>
          <div>
            <p className="text-sm font-bold text-toss-gray">Industry Intelligence</p>
            <h1 className="text-xl font-extrabold sm:text-2xl">Amazon Revenue Tracker</h1>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray" size={17} />
            <input
              className="h-10 w-full rounded-md border-0 bg-[#f4f6fa] pl-9 pr-4 text-sm outline-none ring-1 ring-[#dde2ea] focus:ring-2 focus:ring-toss-blue sm:w-72"
              placeholder="Search company or ASIN"
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

function IndustryWorkspace({
  activeIndustry,
  currency,
  onOpenCompany,
  summaryCards,
  usdKrw,
  visibleCompanies
}: {
  activeIndustry: string;
  currency: DisplayCurrency;
  onOpenCompany: (companyId: string) => void;
  summaryCards: Array<{ label: string; value: string; helper?: string; delta?: number | null; icon: typeof CircleDollarSign }>;
  usdKrw: number;
  visibleCompanies: Company[];
}) {
  const industryName = industries.find((industry) => industry.id === activeIndustry)?.name ?? "Industry";

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold text-toss-blue">{industryName}</p>
            <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">Company Overview</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-gray">
              산업군별 기업을 먼저 훑고, 필요한 기업을 선택해 제품·분기·원천 데이터까지 들어가는 구조입니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TinyStat label="Live companies" value={String(visibleCompanies.length)} />
            <TinyStat label="Latest tracked" value={formatMoneyFromUsd(summaryData.latestRevenue, currency, usdKrw)} />
            <TinyStat label="3M growth" value={formatPercent(summaryData.recent3Growth)} tone={trendTone(summaryData.recent3Growth)} />
            <TinyStat label="Products" value={String(summaryData.productCount)} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-toss-blue">Companies</p>
              <h3 className="mt-1 text-xl font-extrabold">{industryName} portfolio</h3>
            </div>
            <span className="rounded-md bg-[#eef5ff] px-3 py-1 text-xs font-bold text-toss-blue">Live</span>
          </div>
          <div className="space-y-3">
            {visibleCompanies.map((company) => (
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
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-toss-blue">Trend Preview</p>
              <h3 className="mt-1 text-xl font-extrabold">Beauty revenue trajectory</h3>
            </div>
            <p className="text-xs font-bold text-toss-gray">{summaryData.firstMonth} - {summaryData.latestMonth}</p>
          </div>
          <BrandTrendChart data={monthlyBrandTrend} currency={currency} usdKrw={usdKrw} />
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
  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea] sm:p-6">
        <button className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-toss-gray hover:text-toss-blue" type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          Back to Beauty
        </button>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold text-toss-blue">Beauty / {company.category}</p>
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
