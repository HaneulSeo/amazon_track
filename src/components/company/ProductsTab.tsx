import { SectionCard } from "@/components/SectionCard";
import { getCompanyProductFamilies } from "@/lib/dashboard-data";
import { formatMoneyFromUsd, formatNumber, formatPercent, productLabel, trendTone } from "@/lib/format";
import { type DisplayCurrency } from "@/lib/format";
import type { DashboardCompany } from "@/lib/types";

export function ProductsTab({
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
            <table className="min-w-[900px] w-full bg-white text-left text-sm">
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
                    <td className="px-4 py-3">
                      <div className="font-semibold">{row.product_family}</div>
                      <div className="text-xs font-medium text-toss-gray">confidence {row.family_confidence}</div>
                    </td>
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
          <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">No family data</div>
        )}
      </SectionCard>

      <SectionCard eyebrow="Product Ranking" title="Latest month ASIN ranking">
        {latestMonthRows.length ? (
          <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
            <table className="min-w-[1100px] w-full bg-white text-left text-sm">
              <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">ASIN</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Revenue source</th>
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
                    <td className="px-4 py-3">
                      <div className="font-semibold leading-5">{productLabel(row.product_name, row.product_family)}</div>
                      <div className="mt-1 text-xs font-medium text-toss-gray">{row.asin}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${row.revenue_source === "explicit" ? "bg-emerald-50 text-emerald-700" : row.revenue_source === "derived" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>
                        {row.revenue_source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{row.product_family}</div>
                      <div className="text-xs font-medium text-toss-gray">confidence {row.family_confidence}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoneyFromUsd(row.revenue, currency, usdKrw, false)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(row.units, false)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(row.avg_bsr, false)}</td>
                    <td className="px-4 py-3 text-right">
                      <div>{formatNumber(row.reviews, false)}</div>
                      {row.data_quality_warnings.length ? <div className="mt-1 text-xs text-amber-700">{row.data_quality_warnings[0]}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">No product ranking data</div>
        )}
      </SectionCard>
    </div>
  );
}
