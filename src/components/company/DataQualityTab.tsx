import type { ReactNode } from "react";
import { SectionCard } from "@/components/SectionCard";
import { getCompanyCoverage, getCompanySources } from "@/lib/dashboard-data";
import type { DashboardCompany } from "@/lib/types";

export function DataQualityTab({ company }: { company: DashboardCompany }) {
  const coverage = getCompanyCoverage(company.company);
  const sources = getCompanySources(company.company);

  return (
    <div className="space-y-5">
      <SectionCard eyebrow="Data Quality" title="Coverage and missing data">
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <MiniCard label="Amazon quality" value={coverage ? coverage.amazon_data_quality_score.toFixed(1) : "No data"} helper="CSV completeness" />
            <MiniCard label="Revenue exposure" value={coverage ? coverage.revenue_exposure_score.toFixed(1) : "No data"} helper="proxy weight" />
            <MiniCard label="Missing data score" value={coverage ? coverage.missing_data_score.toFixed(1) : "No data"} helper="larger = more gap" />
            <MiniCard label="Next priority" value={coverage ? coverage.next_data_priority_score.toFixed(1) : "No data"} helper="larger = collect sooner" />
          </div>
          <div className="space-y-3">
            {sources.map((source) => (
              <div key={source.source_name} className="rounded-lg bg-toss-wash p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{source.source_name}</p>
                  <div className="flex gap-2 text-xs font-bold">
                    <Badge>{source.source_type}</Badge>
                    <Badge>{source.current_status}</Badge>
                    <Badge>P{source.priority}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-toss-gray">{source.description}</p>
                <p className="mt-1 text-xs text-toss-gray">{source.why_it_matters}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
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

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-toss-blue ring-1 ring-[#dde2ea]">{children}</span>;
}
