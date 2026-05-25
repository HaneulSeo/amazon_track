import type { ReactNode } from "react";

type SectionCardProps = {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({ eyebrow, title, action, children }: SectionCardProps) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-soft ring-1 ring-toss-line/70 sm:p-7">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? <p className="text-sm font-semibold text-toss-blue">{eyebrow}</p> : null}
          <h2 className="mt-1 text-2xl font-bold tracking-normal text-toss-ink">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
