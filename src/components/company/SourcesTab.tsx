import { SectionCard } from "@/components/SectionCard";
import { BrandTrendChart } from "@/components/BrandTrendChart";
import { getCompanyMonthly, getCompanyTradeQuarterly, getCompanyStockMonthly, toBrandTrend } from "@/lib/dashboard-data";
import { formatMoneyFromKrw, formatMoneyFromUsd, formatNumber } from "@/lib/format";
import { type DisplayCurrency } from "@/lib/format";
import type { DashboardCompany } from "@/lib/types";
import { buildSourceStatuses } from "@/lib/analysis";
import { SourceStatusPanel } from "@/components/source/SourceStatusPanel";

export function SourcesTab({
  company,
  currency,
  usdKrw
}: {
  company: DashboardCompany;
  currency: DisplayCurrency;
  usdKrw: number;
}) {
  const sourceStatuses = buildSourceStatuses(company.company);
  const amazonRows = getCompanyMonthly(company.company);
  const stockRows = getCompanyStockMonthly(company.company);
  const trassRows = getCompanyTradeQuarterly(company.company).filter((row) => row.country_scope === "total");
  const amazonTrend = toBrandTrend(
    amazonRows.map((row) => ({
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

  const latestStock = stockRows.at(-1) ?? null;
  const latestTrass = trassRows.at(-1) ?? null;

  return (
    <div className="space-y-5">
      <SourceStatusPanel statuses={sourceStatuses} />

      <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <SectionCard eyebrow="Amazon Source" title="Amazon US monthly proxy">
          {amazonRows.length ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniCard label="Latest month" value={amazonRows.at(-1)?.month ?? "No data"} helper={formatMoneyFromUsd(amazonRows.at(-1)?.total_revenue, currency, usdKrw, false)} />
                <MiniCard label="Units" value={formatNumber(amazonRows.at(-1)?.total_units)} helper="monthly total" />
                <MiniCard label="ASINs" value={formatNumber(amazonRows.at(-1)?.asin_count)} helper="tracked set" />
              </div>
              <BrandTrendChart data={amazonTrend} currency={currency} usdKrw={usdKrw} />
            </div>
          ) : (
            <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">No Amazon data</div>
          )}
        </SectionCard>

        <SectionCard eyebrow="Stock & TRASS" title="Other source snapshots">
          <div className="space-y-4">
            <MiniCard label="Latest stock" value={latestStock ? latestStock.month : "No data"} helper={latestStock ? formatNumber(latestStock.adj_close ?? latestStock.close) : "No stock data"} />
            <MiniCard label="Latest TRASS" value={latestTrass ? latestTrass.quarter : "No data"} helper={latestTrass ? formatMoneyFromKrw(latestTrass.export_value_krw, currency, usdKrw, false) : "No TRASS data"} />
          </div>
        </SectionCard>
      </div>
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
