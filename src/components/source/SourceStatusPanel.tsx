import { SectionCard } from "@/components/SectionCard";
import type { SourceStatus } from "@/lib/types";

export function SourceStatusPanel({ statuses }: { statuses: SourceStatus[] }) {
  return (
    <SectionCard eyebrow="Source Comparison" title="Latest source status">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {statuses.map((status) => (
          <div key={`${status.company}-${status.source}`} className="rounded-lg bg-toss-wash p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase text-toss-gray">{status.source}</p>
                <p className="mt-1 text-lg font-extrabold text-toss-ink">{status.latest_period ?? "No data"}</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-bold ${status.available ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {status.confidence}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-toss-gray">{status.value_label ?? "Not available"}</p>
            <p className="mt-2 text-xs text-toss-gray">
              rows {status.row_count} {status.warning ? `· ${status.warning}` : ""}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
