"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { CompanyModels, LagFit, ModelMode, ModelPair } from "@/lib/types";
import { type DisplayCurrency, formatMoneyFromKrw, formatMoneyFromUsd } from "@/lib/format";

type Props = {
  models: CompanyModels | null;
  currency: DisplayCurrency;
  usdKrw: number;
  minNForBest?: number;
};

const KIND_LABEL: Record<ModelPair["kind"], string> = {
  "revenue~amazon": "매출 ~ 아마존",
  "revenue~trass": "매출 ~ TRASS"
};

const KIND_ORDER: ModelPair["kind"][] = ["revenue~amazon", "revenue~trass"];

function qIndex(quarter: string): number | null {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  return match ? Number(match[1]) * 4 + (Number(match[2]) - 1) : null;
}

function qFromIndex(index: number): string {
  return `${Math.floor(index / 4)}-Q${(index % 4) + 1}`;
}

function toYoY(map: Map<string, number>): Map<string, number> {
  const out = new Map<string, number>();
  for (const [quarter, value] of map) {
    const idx = qIndex(quarter);
    if (idx === null) continue;
    const prev = map.get(qFromIndex(idx - 4));
    if (prev === undefined || prev === 0) continue;
    out.set(quarter, (value - prev) / Math.abs(prev));
  }
  return out;
}

function formatValue(value: number, unit: "krw" | "usd", mode: ModelMode, currency: DisplayCurrency, usdKrw: number) {
  if (mode === "yoy") return `${(value * 100).toFixed(1)}%`;
  return unit === "krw" ? formatMoneyFromKrw(value, currency, usdKrw, true) : formatMoneyFromUsd(value, currency, usdKrw, true);
}

function confidence(fit: LagFit | null, minN: number): { label: string; tone: string } {
  if (!fit || fit.r2 === null) return { label: "데이터 부족", tone: "bg-[#edf1f5] text-[#7c8696]" };
  if (fit.n < minN) return { label: `표본 부족 (n=${fit.n})`, tone: "bg-amber-50 text-amber-600" };
  if (fit.pValue !== null && fit.pValue < 0.05) return { label: "통계적으로 유의 (p<0.05)", tone: "bg-emerald-50 text-emerald-600" };
  return { label: "유의성 약함", tone: "bg-[#eef1f5] text-toss-gray" };
}

export function RevenueModelExplorer({ models, currency, usdKrw, minNForBest = 4 }: Props) {
  const pairs = models?.pairs ?? [];
  const maxLag = Math.max(0, (pairs[0]?.fits.levels.length ?? 1) - 1);
  const minN = minNForBest;

  const [pairId, setPairId] = useState<string>(() => pairs[0]?.id ?? "");
  const [mode, setMode] = useState<ModelMode>("levels");
  const [lag, setLag] = useState<number>(0);

  const pair = pairs.find((entry) => entry.id === pairId) ?? pairs[0] ?? null;

  // When the pair or mode changes, jump to the best-fitting lag so the strongest
  // relationship is shown first; the user can still sweep lags manually.
  useEffect(() => {
    if (!pair) return;
    const best = pair.best[mode];
    setLag(best ? best.lag : 0);
  }, [pair, mode]);

  const fits = pair?.fits[mode] ?? [];
  const fit = fits.find((entry) => entry.lag === lag) ?? null;

  const scatter = useMemo(() => {
    if (!pair) return [] as Array<{ x: number; y: number; period: string }>;
    const targetRaw = new Map<string, number>();
    const predictorRaw = new Map<string, number>();
    for (const row of pair.series) {
      if (row.target !== null) targetRaw.set(row.period, row.target);
      if (row.predictor !== null) predictorRaw.set(row.period, row.predictor);
    }
    const target = mode === "yoy" ? toYoY(targetRaw) : targetRaw;
    const predictor = mode === "yoy" ? toYoY(predictorRaw) : predictorRaw;
    const points: Array<{ x: number; y: number; period: string }> = [];
    for (const [quarter, y] of target) {
      const idx = qIndex(quarter);
      if (idx === null) continue;
      const x = predictor.get(qFromIndex(idx - lag));
      if (x === undefined) continue;
      points.push({ x, y, period: quarter });
    }
    return points;
  }, [pair, mode, lag]);

  if (!pair) {
    return <div className="rounded-lg bg-[#f7f9fc] p-5 text-sm font-semibold text-toss-gray">이 회사는 모델링할 시계열이 없습니다.</div>;
  }

  const xs = scatter.map((p) => p.x);
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 0;
  const lineSegment =
    fit && fit.slope !== null && fit.intercept !== null && xs.length >= 2
      ? [
          { x: xMin, y: fit.intercept + fit.slope * xMin },
          { x: xMax, y: fit.intercept + fit.slope * xMax }
        ]
      : null;

  const conf = confidence(fit, minN);
  const pairsByKind = KIND_ORDER.map((kind) => ({ kind, items: pairs.filter((entry) => entry.kind === kind) })).filter(
    (group) => group.items.length
  );

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-[#eef5ff] p-4 text-sm leading-6 text-toss-gray">
        DART 분기 매출을 타깃으로, <span className="font-bold text-toss-ink">Amazon US</span> 또는{" "}
        <span className="font-bold text-toss-ink">TRASS 수출</span>로 예측력을 회귀로 측정합니다. 두 proxy는 같은 수요를 측정하므로
        한 모델에 함께 넣지 않고 <span className="font-bold text-toss-ink">쌍(pair)</span>으로만 비교합니다. 매출 인식 시차를 보기 위해
        lag 0~{maxLag}분기를 모두 적합합니다. (DART는 전사 매출이며 사업부별 분해가 아닙니다.)
      </div>

      {!models?.availability.trass ? (
        <div className="rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-700">
          이 회사는 TRASS 수출 데이터가 없어 매출~TRASS / 아마존~TRASS 비교가 불가능합니다. 현재는 매출~아마존만 제공됩니다.
        </div>
      ) : null}

      <div className="space-y-3">
        {pairsByKind.map((group) => (
          <div key={group.kind}>
            <p className="mb-2 text-xs font-bold uppercase text-toss-gray">{KIND_LABEL[group.kind]}</p>
            <div className="flex flex-wrap gap-2">
              {group.items.map((entry) => {
                const active = entry.id === pair.id;
                const scopeLabel = entry.predictorLabel.match(/\(([^)]+)\)/)?.[1];
                const label = entry.kind === "revenue~amazon" ? "Amazon US" : scopeLabel ?? entry.predictorLabel;
                return (
                  <button
                    key={entry.id}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      active ? "bg-toss-blue text-white" : "bg-white text-toss-gray ring-1 ring-[#dde2ea] hover:text-toss-ink"
                    }`}
                    type="button"
                    onClick={() => setPairId(entry.id)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-lg bg-white p-4 ring-1 ring-[#dde2ea] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-extrabold text-toss-ink">
            {pair.targetLabel} <span className="text-toss-gray">~</span> {pair.predictorLabel}
          </p>
          <p className="mt-1 text-xs font-semibold text-toss-gray">
            {mode === "levels" ? "원 수준(level) 회귀" : "전년동기대비(YoY) 회귀 — 추세·계절성 제거"} · lag {lag}분기
          </p>
        </div>
        <div className="flex items-center rounded-md bg-[#f4f6fa] p-1 ring-1 ring-[#dde2ea]">
          {(["levels", "yoy"] as ModelMode[]).map((item) => (
            <button
              key={item}
              className={`h-8 rounded px-3 text-sm font-extrabold transition ${mode === item ? "bg-white text-toss-blue shadow-sm" : "text-toss-gray"}`}
              type="button"
              onClick={() => setMode(item)}
            >
              {item === "levels" ? "Levels" : "YoY"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg bg-toss-wash p-4">
          <p className="mb-2 text-sm font-bold text-toss-ink">적합 산점도 (predictor → target)</p>
          {scatter.length >= 2 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="#e5e8eb" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={pair.predictorLabel}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatValue(Number(value), pair.predictorUnit, mode, currency, usdKrw)}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={pair.targetLabel}
                  width={70}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatValue(Number(value), pair.targetUnit, mode, currency, usdKrw)}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ border: "1px solid #e5e8eb", borderRadius: 8 }}
                  formatter={(value: number, name: string) => {
                    const unit = name === "y" ? pair.targetUnit : pair.predictorUnit;
                    const label = name === "y" ? pair.targetLabel : pair.predictorLabel;
                    return [formatValue(Number(value), unit, mode, currency, usdKrw), label];
                  }}
                  labelFormatter={() => ""}
                />
                {lineSegment ? <ReferenceLine stroke="#3182f6" strokeWidth={2} ifOverflow="extendDomain" segment={lineSegment} /> : null}
                <Scatter data={scatter} fill="#00a661" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-[300px] place-items-center text-sm font-semibold text-toss-gray">
              이 lag/모드에서는 적합할 점이 부족합니다 (점 {scatter.length}개).
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="R²" value={fit?.r2 != null ? fit.r2.toFixed(3) : "-"} tone="text-toss-ink" />
            <StatCard label="조정 R²" value={fit?.adjR2 != null ? fit.adjR2.toFixed(3) : "-"} />
            <StatCard label="상관계수" value={fit?.corr != null ? fit.corr.toFixed(3) : "-"} />
            <StatCard label="표본 수 (n)" value={fit ? String(fit.n) : "-"} />
            <StatCard label="기울기" value={fit?.slope != null ? fit.slope.toPrecision(3) : "-"} />
            <StatCard label="p-value" value={fit?.pValue != null ? fit.pValue.toFixed(4) : "-"} />
          </div>
          <div className={`rounded-lg px-4 py-3 text-sm font-bold ${conf.tone}`}>{conf.label}</div>
          {pair.note ? <p className="text-xs font-medium leading-5 text-toss-gray">{pair.note}</p> : null}
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 ring-1 ring-[#dde2ea]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-toss-ink">시차(lag)별 R² — 막대를 눌러 lag 선택</p>
          <input
            type="range"
            min={0}
            max={maxLag}
            value={lag}
            onChange={(event) => setLag(Number(event.target.value))}
            className="w-40 accent-[#3182f6]"
          />
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={fits.map((entry) => ({ lag: entry.lag, r2: entry.r2 ?? 0, n: entry.n }))} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#eef1f5" vertical={false} />
            <XAxis dataKey="lag" tickLine={false} axisLine={false} tickFormatter={(value) => `lag ${value}`} />
            <YAxis domain={[0, 1]} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              cursor={{ fill: "rgba(49,130,246,0.06)" }}
              contentStyle={{ border: "1px solid #e5e8eb", borderRadius: 8 }}
              formatter={(value: number, _name, item) => [`R² ${Number(value).toFixed(3)} (n=${item?.payload?.n})`, "설명력"]}
              labelFormatter={(value) => `lag ${value}분기`}
            />
            <Bar dataKey="r2" radius={[4, 4, 0, 0]} onClick={(data) => setLag(Number(data.lag))} cursor="pointer">
              {fits.map((entry) => (
                <Cell key={entry.lag} fill={entry.lag === lag ? "#3182f6" : "#c6d6f0"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = "text-toss-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-toss-wash p-3">
      <p className="text-xs font-bold uppercase text-toss-gray">{label}</p>
      <p className={`mt-1 text-lg font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}
