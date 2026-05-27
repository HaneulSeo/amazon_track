import { BrandTrendChart } from "@/components/BrandTrendChart";
import { SectionCard } from "@/components/SectionCard";
import { getCompanyMonthly, toBrandTrend } from "@/lib/dashboard-data";
import { type DisplayCurrency, formatNumber, trendTone } from "@/lib/format";
import type { DashboardCompany } from "@/lib/types";

export function OverviewTab({
  company,
  currency,
  usdKrw
}: {
  company: DashboardCompany;
  currency: DisplayCurrency;
  usdKrw: number;
}) {
  const companyMonthly = getCompanyMonthly(company.company);
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
  const latestDartQuarter = companyMonthly.at(-1)?.month ?? null;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <SectionCard eyebrow="Executive Summary" title={`${company.label} signal snapshot`}>
        <div className="space-y-4">
          <p className="text-sm leading-6 text-toss-gray">{company.interpretation}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniCard label="Industry" value={company.industry_name} helper={company.ticker} />
            <MiniCard label="Latest Amazon month" value={company.latest_month ?? "No data"} helper={formatNumber(company.latest_revenue)} />
            <MiniCard label="Coverage" value={company.coverage_score === null ? "No data" : company.coverage_score.toFixed(1)} helper="forecasting usefulness" tone={trendTone(company.coverage_score)} />
            <MiniCard label="Need follow-up" value={company.next_data_priority_score === null ? "No data" : company.next_data_priority_score.toFixed(1)} helper="gap urgency" />
          </div>
          <div className="rounded-lg bg-[#f7f9fc] p-4 text-sm leading-6 text-toss-gray">
            Latest Amazon month: {company.latest_month ?? "No data"} · Latest DART quarter: {latestDartQuarter ?? "No data"} · Latest TRASS: see Sources tab
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Amazon US Trend" title="Monthly proxy trend">
        {companyMonthly.some((row) => row.total_revenue !== null || row.total_units !== null || row.avg_price !== null) ? (
          <BrandTrendChart data={trendData} currency={currency} usdKrw={usdKrw} />
        ) : (
          <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">No Amazon monthly data</div>
        )}
      </SectionCard>
    </div>
  );
}

function MiniCard({ label, value, helper, tone }: { label: string; value: string; helper?: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-toss-wash p-3">
      <p className="text-xs font-bold uppercase text-toss-gray">{label}</p>
      <p className={`mt-1 text-lg font-extrabold ${tone ?? "text-toss-ink"}`}>{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold text-toss-gray">{helper}</p> : null}
    </div>
  );
}
