"use client";

import type { AmazonEstimateLabCalibrationResult, AmazonEstimateLabSelectedModel } from "@/lib/types";
import { formatNumber } from "@/lib/format";

type CalibrationModelPanelProps = {
  selectedModel: AmazonEstimateLabSelectedModel | null;
  calibrationResults: AmazonEstimateLabCalibrationResult[];
};

export function CalibrationModelPanel({ selectedModel, calibrationResults }: CalibrationModelPanelProps) {
  if (!selectedModel) {
    return <EmptyState title="선택된 모델이 없습니다" description="회사와 제품군을 고르면 캘리브레이션 결과가 표시됩니다." />;
  }

  const selected = calibrationResults.find((row) => row.modelKey === selectedModel.modelKey) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="샘플 수" value={formatNumber(selectedModel.sampleCount)} />
        <MiniStat label="신뢰도" value={selectedModel.confidence} />
        <MiniStat label="MAPE" value={selected?.metrics.mape === null || selected?.metrics.mape === undefined ? "No data" : `${selected.metrics.mape.toFixed(1)}%`} />
        <MiniStat label="R²" value={selected?.metrics.r2 === null || selected?.metrics.r2 === undefined ? "No data" : selected.metrics.r2.toFixed(3)} />
      </div>

      <div className="rounded-2xl bg-toss-wash p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-toss-gray">Model formula</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-toss-ink">{selectedModel.formula}</p>
        {selectedModel.reason ? <p className="mt-2 text-sm leading-6 text-toss-ink2">{selectedModel.reason}</p> : null}
      </div>

      <div className="overflow-auto rounded-2xl ring-1 ring-toss-line">
        <table className="min-w-[680px] w-full bg-white text-left text-sm">
          <thead className="bg-toss-wash text-xs font-bold uppercase tracking-wide text-toss-gray">
            <tr>
              <th className="px-4 py-3">Metric</th>
              <th className="px-4 py-3 text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-toss-line">
            {Object.entries(selectedModel.coefficients).map(([key, value]) => (
              <tr key={key}>
                <td className="px-4 py-3 font-semibold text-toss-ink">{key}</td>
                <td className="px-4 py-3 text-right font-mono text-toss-blue">{value.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-toss-line">
      <p className="text-xs font-bold uppercase tracking-wide text-toss-gray">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-toss-ink">{value}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl bg-toss-wash p-5">
      <p className="text-sm font-extrabold text-toss-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-toss-ink2">{description}</p>
    </div>
  );
}
