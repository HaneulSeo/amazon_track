import { SectionCard } from "@/components/SectionCard";
import { DartAmazonQuarterlyComparison } from "@/components/correlation/DartAmazonQuarterlyComparison";
import { CorrelationMatrix } from "@/components/correlation/CorrelationMatrix";
import { CorrelationSummaryCards } from "@/components/correlation/CorrelationSummaryCards";
import { LagCorrelationTable } from "@/components/correlation/LagCorrelationTable";
import { getCompanyQuarterlyComparison } from "@/lib/dashboard-data";
import { buildCorrelationSummary } from "@/lib/analysis";
import { type DisplayCurrency } from "@/lib/format";
import type { DashboardCompany } from "@/lib/types";

export function CorrelationTab({
  company,
  currency,
  usdKrw
}: {
  company: DashboardCompany;
  currency: DisplayCurrency;
  usdKrw: number;
}) {
  const summary = buildCorrelationSummary(company.company);
  const quarterlyRows = getCompanyQuarterlyComparison(company.company);
  const baseQuarter = quarterlyRows.find((row) => row.externalRevenueEokKrw !== null && row.trackedRevenueUsd !== null)?.quarter ?? null;

  return (
    <div className="space-y-5">
      <CorrelationSummaryCards companyLabel={company.label} results={summary.results} />
      <SectionCard eyebrow="DART vs Amazon" title="Quarterly benchmark comparison">
        {quarterlyRows.length ? (
          <DartAmazonQuarterlyComparison rows={quarterlyRows} baseQuarter={baseQuarter} currency={currency} usdKrw={usdKrw} />
        ) : (
          <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">No quarterly comparison data</div>
        )}
      </SectionCard>
      <SectionCard eyebrow="Lag Analysis" title="Quarterly correlation by lag">
        <div className="space-y-4">
          <LagCorrelationTable rows={summary.results} />
          <CorrelationMatrix rows={summary.results} />
        </div>
      </SectionCard>
    </div>
  );
}
