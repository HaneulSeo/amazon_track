"use client";

import type { AmazonEstimateLabCalibrationResult, AmazonEstimateLabSelectedModel } from "@/lib/types";
import { formatNumber } from "@/lib/format";

type CalibrationModelPanelProps = {
  selectedModel: AmazonEstimateLabSelectedModel | null;
  calibrationResults: AmazonEstimateLabCalibrationResult[];
};

export function CalibrationModelPanel({ selectedModel, calibrationResults }: CalibrationModelPanelProps) {
  if (!selectedModel) {
    return <EmptyState title="선택된 모델이 없습니다" description="회사를 고르면 공통 company model의 캘리브레이션 결과가 표시됩니다." />;
  }

  const selected = calibrationResults.find((row) => row.modelKey === selectedModel.modelKey) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Train" value={formatNumber(selectedModel.trainSampleCount ?? selectedModel.sampleCount)} />
        <MiniStat label="Test" value={formatNumber(selectedModel.testSampleCount ?? 0)} />
        <MiniStat label="신뢰도" value={selectedModel.confidence} />
        <MiniStat label="Train MAPE" value={formatMetric(selectedModel.trainMetrics?.mape)} />
        <MiniStat label="Test MAPE" value={formatMetric(selectedModel.testMetrics?.mape)} />
        <MiniStat label="Train R²" value={formatMetric(selectedModel.trainMetrics?.r2, 3)} />
        <MiniStat label="Test R²" value={formatMetric(selectedModel.testMetrics?.r2, 3)} />
      </div>

      <div className="rounded-2xl bg-toss-wash p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-toss-gray">Model formula</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-toss-ink">{selectedModel.formula}</p>
        {selectedModel.reason ? <p className="mt-2 text-sm leading-6 text-toss-ink2">{selectedModel.reason}</p> : null}
        <div className="mt-3 grid gap-2 text-xs font-semibold text-toss-ink2 sm:grid-cols-2 xl:grid-cols-4">
          <Chip label="Target" value={selectedModel.targetTransform ?? "log1p"} />
          <Chip label="Scale" value={selectedModel.featureScaleMode ?? "none"} />
          <Chip label="Lambda" value={selectedModel.lambda !== undefined ? selectedModel.lambda.toString() : "n/a"} />
          <Chip label="Features" value={selectedModel.activeFeatures?.length ? selectedModel.activeFeatures.join(", ") : "none"} />
        </div>
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

      {selected?.points?.length ? (
        <details className="rounded-2xl bg-toss-wash p-4">
          <summary className="cursor-pointer text-sm font-bold text-toss-ink">Training points</summary>
          <div className="mt-3 overflow-auto rounded-xl ring-1 ring-toss-line">
            <table className="min-w-[760px] w-full bg-white text-left text-xs">
              <thead className="bg-toss-wash text-[11px] font-bold uppercase tracking-wide text-toss-gray">
                <tr>
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Split</th>
                  <th className="px-3 py-2 text-right">Actual rev</th>
                  <th className="px-3 py-2 text-right">Pred rev</th>
                  <th className="px-3 py-2 text-right">Actual sales</th>
                  <th className="px-3 py-2 text-right">Pred sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-toss-line">
                {selected.points.slice(0, 24).map((point) => (
                  <tr key={`${point.asin}:${point.month}`}>
                    <td className="px-3 py-2 font-semibold text-toss-ink">{point.month}</td>
                    <td className="px-3 py-2 text-toss-gray">{point.split ?? "train"}</td>
                    <td className="px-3 py-2 text-right">{formatMetric(point.actualRevenue)}</td>
                    <td className="px-3 py-2 text-right">{formatMetric(point.predictedRevenue)}</td>
                    <td className="px-3 py-2 text-right">{formatMetric(point.actualSales)}</td>
                    <td className="px-3 py-2 text-right">{formatMetric(point.predictedSales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
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

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-toss-line">
      <span className="block text-[11px] font-bold uppercase tracking-wide text-toss-gray">{label}</span>
      <span className="mt-1 block truncate text-xs font-semibold text-toss-ink">{value}</span>
    </div>
  );
}

function formatMetric(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "No data";
  return digits === 1 ? `${value.toFixed(1)}%` : value.toFixed(digits);
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl bg-toss-wash p-5">
      <p className="text-sm font-extrabold text-toss-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-toss-ink2">{description}</p>
    </div>
  );
}
