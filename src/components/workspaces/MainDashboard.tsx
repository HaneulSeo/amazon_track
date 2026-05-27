import { BarChart3, Building2, ChevronRight, CircleDollarSign, Database, Factory, LayoutDashboard, Store, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { SectionCard } from "@/components/SectionCard";
import { formatMoneyFromUsd, formatNumber } from "@/lib/format";
import { type DisplayCurrency } from "@/lib/format";
import type { DashboardOverview } from "@/lib/types";

export function MainDashboard({
  overview,
  currency,
  usdKrw,
  onOpenCompanyTracker,
  onOpenIndustryTracker,
  onOpenSourceComparison,
  onOpenCorrelationLab
}: {
  overview: DashboardOverview;
  currency: DisplayCurrency;
  usdKrw: number;
  onOpenCompanyTracker: () => void;
  onOpenIndustryTracker: () => void;
  onOpenSourceComparison: () => void;
  onOpenCorrelationLab: () => void;
}) {
  const cards = [
    {
      title: "Company Tracker",
      desc: "기업별 DART / TRASS / Amazon / Stock 요약",
      icon: Building2,
      action: onOpenCompanyTracker
    },
    {
      title: "Industry Tracker",
      desc: "산업별 기업 묶음과 소스 커버리지",
      icon: Factory,
      action: onOpenIndustryTracker
    },
    {
      title: "Source Comparison",
      desc: "최신 업데이트, 누락, 단위, 신뢰도",
      icon: Database,
      action: onOpenSourceComparison
    },
    {
      title: "Correlation Lab",
      desc: "Amazon vs DART, TRASS vs DART, lag test",
      icon: BarChart3,
      action: onOpenCorrelationLab
    }
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-[#dde2ea] sm:p-6">
        <p className="text-sm font-bold text-toss-blue">Company Revenue Intelligence</p>
        <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">DART · TRASS · Amazon · Market Signals</h2>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-gray">
          Amazon은 하나의 source module이고, 회사 매출 추적은 DART/TRASS/Stock/Market Signals와 함께 비교합니다.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <button key={card.title} className="group rounded-lg bg-white p-4 text-left shadow-soft ring-1 ring-[#dde2ea] transition hover:-translate-y-0.5 hover:ring-toss-blue" type="button" onClick={card.action}>
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-toss-blue text-white">
                  <card.icon size={21} />
                </div>
                <ChevronRight className="text-toss-gray transition group-hover:translate-x-1 group-hover:text-toss-blue" />
              </div>
              <h3 className="mt-6 text-lg font-extrabold">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-toss-gray">{card.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <SectionCard eyebrow="Top Level Snapshot" title="Portfolio summary">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Companies" value={String(overview.tracked_company_count)} helper={`${overview.tracked_industry_count} industries`} delta={null} icon={Store} />
          <KpiCard label="ASINs" value={formatNumber(overview.total_asin_count)} helper={`${overview.raw_file_count} raw CSVs`} delta={null} icon={LayoutDashboard} />
          <KpiCard label="Latest revenue" value={formatMoneyFromUsd(overview.latest_revenue, currency, usdKrw)} helper={overview.latest_month ?? "No data"} delta={null} icon={CircleDollarSign} />
          <KpiCard label="Avg coverage" value={overview.average_coverage_score === null ? "No data" : overview.average_coverage_score.toFixed(1)} helper={overview.most_needed_company ? `Next: ${overview.most_needed_company.label}` : "Coverage score"} delta={null} icon={TrendingUp} />
        </div>
      </SectionCard>
    </div>
  );
}
