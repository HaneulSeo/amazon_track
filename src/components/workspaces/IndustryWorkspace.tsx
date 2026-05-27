import { ChevronRight, Factory, LayoutDashboard } from "lucide-react";
import { BrandTrendChart } from "@/components/BrandTrendChart";
import { SectionCard } from "@/components/SectionCard";
import { companies, getCompanyMonthly, getIndustry, industries, toBrandTrend } from "@/lib/dashboard-data";
import { trendTone } from "@/lib/format";
import { type DisplayCurrency } from "@/lib/format";

export function IndustryWorkspace({
  activeIndustry,
  currency,
  usdKrw,
  onOpenCompany
}: {
  activeIndustry: string;
  currency: DisplayCurrency;
  usdKrw: number;
  onOpenCompany: (companyId: string) => void;
}) {
  const industry = getIndustry(activeIndustry) ?? industries[0];
  const visibleCompanies = companies.filter((company) => company.industry_id === activeIndustry);
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
            <p className="text-sm font-bold text-toss-blue">Industry Tracker / {industry?.name ?? "Industry"}</p>
            <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">Industry Company Overview</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-toss-gray">
              산업별 기업 묶음과 소스 커버리지를 먼저 확인합니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TinyStat label="Companies" value={String(visibleCompanies.length)} />
            <TinyStat label="ASINs" value={String(visibleCompanies.reduce((sum, company) => sum + (company.asin_count ?? 0), 0))} />
            <TinyStat label="Coverage" value={industry?.average_coverage_score === null ? "No data" : industry.average_coverage_score.toFixed(1)} tone={trendTone(industry?.average_coverage_score)} />
            <TinyStat label="Latest month" value={industry?.latest_month ?? "No data"} />
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
                      {company.coverage_score === null ? "No data" : `${company.coverage_score.toFixed(1)} coverage`}
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
          {trendData.some((row) => row.revenue !== 0 || row.units !== 0) ? (
            <BrandTrendChart data={trendData} currency={currency} usdKrw={usdKrw} />
          ) : (
            <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">No trend data</div>
          )}
        </div>
      </section>
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
