import { SectionCard } from "@/components/SectionCard";
import { getCompanyDartQuarterly } from "@/lib/dashboard-data";
import { formatMoneyFromKrw } from "@/lib/format";
import { type DisplayCurrency } from "@/lib/format";
import type { DashboardCompany } from "@/lib/types";

export function SalesTab({
  company,
  currency,
  usdKrw
}: {
  company: DashboardCompany;
  currency: DisplayCurrency;
  usdKrw: number;
}) {
  const rows = getCompanyDartQuarterly(company.company);
  const visibleRows = rows.filter((row) => row.revenue_krw !== null);

  return (
    <div className="space-y-5">
      <SectionCard eyebrow="Sales" title="DART quarterly revenue">
        {visibleRows.length ? (
          <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
            <table className="min-w-[900px] w-full bg-white text-left text-sm">
              <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
                <tr>
                  <th className="px-4 py-3">Quarter</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">YoY</th>
                  <th className="px-4 py-3 text-right">QoQ</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-toss-line">
                {visibleRows.map((row) => (
                  <tr key={row.quarter} className="hover:bg-toss-wash/70">
                    <td className="px-4 py-3 font-semibold">{row.quarter}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoneyFromKrw(row.revenue_krw, currency, usdKrw, false)}</td>
                    <td className="px-4 py-3 text-right text-toss-gray">No data</td>
                    <td className="px-4 py-3 text-right text-toss-gray">No data</td>
                    <td className="px-4 py-3">
                      <a className="text-toss-blue hover:underline" href={row.source_url} target="_blank" rel="noreferrer">
                        DART
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">No DART data</div>
        )}
      </SectionCard>
    </div>
  );
}
