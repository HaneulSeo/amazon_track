"use client";

import { Globe, Search, TrendingDown, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { DemandSeries } from "@/lib/types";

type DemandSignalPanelProps = {
  series: DemandSeries[];
  anySample: boolean;
};

const SOURCE_ACCENT: Record<DemandSeries["source"], { ring: string; chip: string; stroke: string }> = {
  google_trends: { ring: "ring-toss-blue/30", chip: "bg-toss-sky text-toss-blue", stroke: "#3182f6" },
  baidu_index: { ring: "ring-[#ff8f00]/30", chip: "bg-[#fff3e0] text-[#b45309]", stroke: "#ff8f00" }
};

function formatValue(series: DemandSeries): string {
  if (series.latest === null) return "-";
  return series.unit === "trends_index" ? String(series.latest) : series.latest.toLocaleString("ko-KR");
}

function ChangeChip({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs font-semibold text-toss-gray">YoY -</span>;
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${positive ? "text-pos" : "text-neg"}`}>
      <Icon size={13} />
      YoY {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function SignalCard({ series }: { series: DemandSeries }) {
  const accent = SOURCE_ACCENT[series.source];
  const chartData = series.points.map((point) => ({ date: point.date, value: point.value }));
  const unitLabel = series.unit === "trends_index" ? "0–100 지수" : "검색지수";

  return (
    <div className={`rounded-xl bg-white p-4 shadow-card ring-1 ${accent.ring}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${accent.chip}`}>
              {series.source === "baidu_index" ? <Globe size={11} /> : <Search size={11} />}
              {series.source_label}
            </span>
            <span className="rounded-md bg-toss-wash2 px-2 py-0.5 text-[11px] font-bold text-toss-ink2">{series.geo_label}</span>
          </div>
          <p className="mt-2 truncate text-base font-extrabold text-toss-ink" title={series.keyword}>
            {series.keyword}
          </p>
        </div>
        {series.is_sample ? (
          <span className="shrink-0 rounded-full bg-toss-wash2 px-2 py-0.5 text-[11px] font-bold text-toss-gray">샘플</span>
        ) : null}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="tnum text-2xl font-extrabold text-toss-ink">{formatValue(series)}</p>
          <p className="text-[11px] font-semibold text-toss-gray">
            {unitLabel}
            {series.latest_date ? ` · ${series.latest_date}` : ""}
          </p>
        </div>
        <ChangeChip value={series.yoy_change} />
      </div>

      <div className="mt-3 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip
              cursor={{ stroke: "#cdd3db", strokeWidth: 1 }}
              contentStyle={{ border: "1px solid #e5e8eb", borderRadius: 8, fontSize: 12, padding: "4px 8px" }}
              labelStyle={{ color: "#8b95a1", fontWeight: 700 }}
              formatter={(value: number) => [series.unit === "trends_index" ? value : value.toLocaleString("ko-KR"), series.keyword]}
            />
            <Line type="monotone" dataKey="value" stroke={accent.stroke} strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DemandSignalPanel({ series, anySample }: DemandSignalPanelProps) {
  if (!series.length) {
    return (
      <div className="rounded-lg bg-toss-wash p-5 text-sm font-semibold text-toss-gray">
        이 기업에 연결된 검색 수요 신호가 아직 없습니다.
      </div>
    );
  }

  const ordered = [...series].sort((a, b) => {
    if (a.source !== b.source) return a.source === "baidu_index" ? 1 : -1;
    return a.keyword.localeCompare(b.keyword);
  });

  return (
    <div className="space-y-4">
      {anySample ? (
        <div className="rounded-lg bg-[#fff8ec] p-3 text-sm leading-6 text-[#92400e] ring-1 ring-[#ff8f00]/20">
          일부 값은 <span className="font-bold">샘플</span>입니다. 실제 값은{" "}
          <code className="rounded bg-white px-1 py-0.5 text-[12px] font-bold">npx tsx scripts/fetch-demand-signals.ts</code> 실행 후 채워집니다.
          중국(바이두) 지수는 <code className="rounded bg-white px-1 py-0.5 text-[12px] font-bold">BAIDU_COOKIE</code> 환경변수가 필요합니다.
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ordered.map((entry) => (
          <SignalCard key={`${entry.source}-${entry.keyword}-${entry.geo}`} series={entry} />
        ))}
      </div>
      <p className="text-xs leading-5 text-toss-gray">
        검색 관심도는 판매량 자체가 아니라 수요의 선행/동행 신호입니다. 중국 직접 판매(타오바오·티몰) 데이터는 무료로 공개되지 않아, 바이두 검색지수를 중국
        수요의 무료 대체 지표로 사용합니다.
      </p>
    </div>
  );
}
