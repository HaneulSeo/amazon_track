"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DualIndexPoint = {
  period: string;
  left: number | null;
  right: number | null;
};

type DualIndexTrendChartProps = {
  title: string;
  note?: string;
  leftLabel: string;
  rightLabel: string;
  periodLabel?: string;
  data: DualIndexPoint[];
};

function tooltipStyle() {
  return {
    border: "1px solid #e5e8eb",
    borderRadius: 8,
    boxShadow: "0 16px 40px rgba(25,31,40,0.12)"
  };
}

export function DualIndexTrendChart({
  title,
  note,
  leftLabel,
  rightLabel,
  periodLabel = "Base month = 100",
  data
}: DualIndexTrendChartProps) {
  const baseRow = data.find((row) => row.left !== null && row.right !== null) ?? data.find((row) => row.left !== null || row.right !== null) ?? null;
  const leftBase = baseRow?.left ?? null;
  const rightBase = baseRow?.right ?? null;

  const chartData = data.map((row) => ({
    period: row.period,
    leftIndex: leftBase && row.left !== null ? (row.left / leftBase) * 100 : null,
    rightIndex: rightBase && row.right !== null ? (row.right / rightBase) * 100 : null
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-toss-gray">{title}</p>
        <div className="flex flex-wrap gap-3 text-xs font-semibold text-toss-gray">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-toss-blue" />
            {leftLabel}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {rightLabel}
          </span>
          <span>{periodLabel}</span>
        </div>
        {note ? <p className="text-xs font-medium leading-5 text-toss-gray">{note}</p> : null}
      </div>
      <div className="min-h-[300px] rounded-lg bg-toss-wash p-4">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e5e8eb" vertical={false} />
            <XAxis dataKey="period" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={tooltipStyle()} />
            <Legend />
            <Line type="monotone" dataKey="leftIndex" name={leftLabel} stroke="#3182f6" strokeWidth={3.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="rightIndex" name={rightLabel} stroke="#00a661" strokeWidth={3.5} strokeDasharray="6 4" dot={{ r: 2 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
