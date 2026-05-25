import type { LucideIcon } from "lucide-react";
import { trendTone } from "@/lib/format";

type KpiCardProps = {
  label: string;
  value: string;
  helper?: string;
  delta?: number | null;
  icon: LucideIcon;
};

export function KpiCard({ label, value, helper, delta, icon: Icon }: KpiCardProps) {
  const hasDelta = typeof delta === "number";

  return (
    <div className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-toss-line/70">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-semibold text-toss-gray">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-md bg-toss-sky text-toss-blue">
          <Icon size={19} strokeWidth={2.4} />
        </span>
      </div>
      <p className="break-words text-3xl font-bold tracking-normal text-toss-ink sm:text-4xl">{value}</p>
      <div className="mt-3 flex min-h-5 items-center gap-2 text-sm">
        {hasDelta ? <span className={`font-semibold ${trendTone(delta)}`}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}%</span> : null}
        {helper ? <span className="text-toss-gray">{helper}</span> : null}
      </div>
    </div>
  );
}
