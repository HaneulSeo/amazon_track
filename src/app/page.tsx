"use client";

import { useEffect, useState } from "react";
import { Home, LineChart, Search } from "lucide-react";
import { companies, industries, overview } from "@/lib/dashboard-data";
import { type DisplayCurrency, formatMoneyFromUsd } from "@/lib/format";
import { CompanyWorkspace, type CompanyTabId } from "@/components/workspaces/CompanyWorkspace";
import { IndustryWorkspace } from "@/components/workspaces/IndustryWorkspace";
import { MainDashboard } from "@/components/workspaces/MainDashboard";

type Workspace = "home" | "analysis";

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>("home");
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CompanyTabId>("overview");
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

  const selected = selectedCompany ? companies.find((company) => company.company === selectedCompany) ?? null : null;
  const selectedIndustry = activeIndustry ? industries.find((industry) => industry.id === activeIndustry) ?? null : null;
  const fallbackIndustry = selectedIndustry ?? industries[0] ?? null;

  return (
    <Shell currency={currency} fxAsOf={fxAsOf} setCurrency={setCurrency} usdKrw={usdKrw}>
      {workspace === "home" ? (
        <MainDashboard
          overview={overview}
          currency={currency}
          usdKrw={usdKrw}
          onOpenCompanyTracker={() => {
            setWorkspace("analysis");
            setSelectedCompany(null);
            setActiveIndustry(null);
            setActiveTab("overview");
          }}
          onOpenIndustryTracker={() => {
            setWorkspace("analysis");
            setSelectedCompany(null);
            setActiveIndustry(industries[0]?.id ?? null);
            setActiveTab("overview");
          }}
          onOpenSourceComparison={() => {
            setWorkspace("analysis");
            setSelectedCompany(companies[0]?.company ?? null);
            setActiveIndustry(null);
            setActiveTab("sources");
          }}
          onOpenCorrelationLab={() => {
            setWorkspace("analysis");
            setSelectedCompany(companies[0]?.company ?? null);
            setActiveIndustry(null);
            setActiveTab("correlation");
          }}
        />
      ) : selected ? (
        <CompanyWorkspace
          activeTab={activeTab}
          company={selected}
          currency={currency}
          onBack={() => setSelectedCompany(null)}
          setActiveTab={setActiveTab}
          usdKrw={usdKrw}
        />
      ) : (
        <IndustryWorkspace
          activeIndustry={fallbackIndustry?.id ?? industries[0]?.id ?? ""}
          currency={currency}
          onOpenCompany={(companyId) => {
            setSelectedCompany(companyId);
            setActiveTab("overview");
          }}
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
  usdKrw
}: {
  children: React.ReactNode;
  currency: DisplayCurrency;
  fxAsOf: string | null;
  setCurrency: (currency: DisplayCurrency) => void;
  usdKrw: number;
}) {
  return (
    <main className="min-h-screen bg-[#f4f6fa] text-toss-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[#dde2ea] bg-white px-5 py-6 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-toss-blue text-white">
              <LineChart size={22} />
            </div>
            <div>
              <p className="text-lg font-extrabold">Company Revenue Intelligence</p>
              <p className="text-xs font-semibold text-toss-gray">Industry console</p>
            </div>
          </div>
          <div className="mt-8 rounded-lg bg-[#f7f9fc] p-4">
            <p className="text-sm font-bold">Data status</p>
            <p className="mt-2 text-sm leading-6 text-toss-gray">
              {overview.raw_file_count} CSV files · {overview.total_asin_count} ASINs · {overview.month_count} months
            </p>
          </div>
          <button className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-toss-gray hover:text-toss-blue" type="button">
            <Home size={16} />
            Dashboard focus
          </button>
        </aside>
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
        <div>
          <p className="text-sm font-bold text-toss-gray">Dashboard</p>
          <h1 className="text-xl font-extrabold sm:text-2xl">Company Revenue Intelligence</h1>
          <p className="text-xs font-semibold text-toss-gray">DART · TRASS · Amazon · Market Signals</p>
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
