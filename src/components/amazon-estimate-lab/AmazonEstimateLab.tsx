"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Package, Store, TrendingUp } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { ProductFamilyToggle } from "@/components/products/ProductFamilyToggle";
import { formatNumber } from "@/lib/format";
import type { DisplayCurrency } from "@/lib/format";
import {
  amazonEstimateLabData,
  getAmazonEstimateAsinCoverage,
  getAmazonEstimateAsins,
  getAmazonEstimateCompanies,
  getAmazonEstimateDartComparison,
  getAmazonEstimateFamilies,
  getAmazonEstimateModel,
  getAmazonEstimateMonthly,
  getAmazonEstimateQuarterlyByCompany
} from "@/lib/amazon-estimate-lab-data";
import { BackcastRevenueChart } from "./BackcastRevenueChart";
import { CalibrationModelPanel } from "./CalibrationModelPanel";
import { DartComparisonPanel } from "./DartComparisonPanel";

type AmazonEstimateLabProps = {
  currency: DisplayCurrency;
  usdKrw: number;
};

type TimeWindow = "all" | "24M" | "12M" | "6M";
type CoverageMode = "all" | "fullRevenue25" | "fullSales25" | "fullBoth25";

export function AmazonEstimateLab({ currency, usdKrw }: AmazonEstimateLabProps) {
  const companies = getAmazonEstimateCompanies();
  const [selectedCompany, setSelectedCompany] = useState<string>(companies[0] ?? "");
  const families = useMemo(() => getAmazonEstimateFamilies(selectedCompany), [selectedCompany]);
  const [selectedFamily, setSelectedFamily] = useState<string>(families[0] ?? "");
  const [coverageMode, setCoverageMode] = useState<CoverageMode>("fullRevenue25");
  const asinCoverageRows = useMemo(() => getAmazonEstimateAsinCoverage(selectedCompany, selectedFamily), [selectedCompany, selectedFamily]);
  const asinRows = useMemo(() => {
    const filtered = asinCoverageRows.filter((row) => {
      if (coverageMode === "all") return true;
      if (coverageMode === "fullRevenue25") return row.fullRevenueCoverage;
      if (coverageMode === "fullSales25") return row.fullSalesCoverage;
      return row.fullBothCoverage;
    });
    return filtered.length ? filtered : asinCoverageRows;
  }, [asinCoverageRows, coverageMode]);
  const [selectedAsin, setSelectedAsin] = useState<string>(asinRows[0]?.asin ?? "");
  const [window, setWindow] = useState<TimeWindow>("24M");

  useEffect(() => {
    if (!companies.length) return;
    if (!selectedCompany || !companies.includes(selectedCompany)) {
      setSelectedCompany(companies[0]);
    }
  }, [companies, selectedCompany]);

  useEffect(() => {
    const nextFamilies = getAmazonEstimateFamilies(selectedCompany);
    if (!nextFamilies.length) {
      setSelectedFamily("");
      return;
    }
    if (!selectedFamily || !nextFamilies.includes(selectedFamily)) {
      setSelectedFamily(nextFamilies[0]);
    }
  }, [selectedCompany, selectedFamily]);

  useEffect(() => {
    const nextAsins = asinRows;
    if (!nextAsins.length) {
      setSelectedAsin("");
      return;
    }
    const bestAsin = asinRows[0]?.asin ?? nextAsins[0].asin;
    if (!selectedAsin || !nextAsins.some((row) => row.asin === selectedAsin)) {
      setSelectedAsin(bestAsin);
    }
  }, [asinRows, selectedCompany, selectedFamily, selectedAsin]);

  const selectedModel = selectedCompany && selectedFamily ? getAmazonEstimateModel(selectedCompany, selectedFamily) : null;
  const monthlyRows = useMemo(
    () => (selectedCompany && selectedFamily && selectedAsin ? getAmazonEstimateMonthly(selectedCompany, selectedFamily, selectedAsin) : []),
    [selectedAsin, selectedCompany, selectedFamily]
  );
  const visibleMonthlyRows = useMemo(() => filterMonthlyRows(monthlyRows, window), [monthlyRows, window]);
  const quarterlyRows = selectedCompany ? getAmazonEstimateQuarterlyByCompany(selectedCompany) : [];
  const dartRows = selectedCompany ? getAmazonEstimateDartComparison(selectedCompany) : [];
  const selectedAsinStats = useMemo(() => asinRows.find((row) => row.asin === selectedAsin) ?? null, [asinRows, selectedAsin]);
  const fullRevenueCount = asinCoverageRows.filter((row) => row.fullRevenueCoverage).length;
  const fullSalesCount = asinCoverageRows.filter((row) => row.fullSalesCoverage).length;
  const fullBothCount = asinCoverageRows.filter((row) => row.fullBothCoverage).length;

  const summaryCards = [
    { label: "ASIN", value: formatNumber(amazonEstimateLabData.summary.catalogAsinCount), icon: Package },
    { label: "회사", value: formatNumber(amazonEstimateLabData.summary.companyCount), icon: Store },
    { label: "제품군", value: formatNumber(amazonEstimateLabData.summary.productFamilyCount), icon: BarChart3 },
    { label: "모델", value: formatNumber(amazonEstimateLabData.summary.modelCount), icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-toss-line sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold text-toss-blue">Amazon Estimate Lab</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Keepa BSR proxy backcast</h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-toss-ink2">
              Jungle Scout-like 월별 관측값과 Keepa/Keepamore 시계열을 로컬 데이터만으로 맞춰보고, 백캐스트와 DART 비교를 따로 확인합니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl bg-toss-wash p-4">
                  <div className="flex items-center gap-2 text-toss-gray">
                    <Icon size={14} />
                    <span className="text-xs font-bold uppercase tracking-wide">{card.label}</span>
                  </div>
                  <p className="tnum mt-2 text-2xl font-extrabold text-toss-ink">{card.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <SectionCard eyebrow="Filters" title="Company / Family / ASIN / Window">
          <div className="grid gap-3 lg:grid-cols-4">
          <SelectField label="Company" value={selectedCompany} options={companies} onChange={setSelectedCompany} />
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-toss-gray">Product family</p>
            <ProductFamilyToggle
              options={families.map((family) => ({
                id: family,
                label: family,
                count: getAmazonEstimateAsins(selectedCompany, family).length
              }))}
              selectedFamily={selectedFamily}
              onChange={setSelectedFamily}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-toss-gray">Coverage</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "fullRevenue25" as CoverageMode, label: `Revenue 25M (${fullRevenueCount})` },
                { id: "fullSales25" as CoverageMode, label: `Units 25M (${fullSalesCount})` },
                { id: "fullBoth25" as CoverageMode, label: `Both 25M (${fullBothCount})` },
                { id: "all" as CoverageMode, label: `All (${asinCoverageRows.length})` }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCoverageMode(item.id)}
                  className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                    coverageMode === item.id ? "bg-toss-ink text-white" : "bg-white text-toss-ink2 ring-1 ring-toss-line hover:text-toss-ink"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <SelectField
            label="ASIN"
            value={selectedAsin}
            options={asinRows.map((row) => ({
              value: row.asin,
              label: `${row.productName || row.asin} · JS ${row.positiveRevenueMonths}m${row.latestPositiveRevenueMonth ? ` · ${row.latestPositiveRevenueMonth}` : ""}`,
              hint: row.asin
            }))}
            onChange={setSelectedAsin}
          />
          <SelectField label="Window" value={window} options={["all", "24M", "12M", "6M"]} onChange={(value) => setWindow(value as TimeWindow)} />
        </div>
        <p className="mt-3 text-xs font-semibold text-toss-gray">
          Jungle Scout 원본 25개월 시계열에서 revenue/sales가 25개월 모두 양수인 ASIN을 따로 모아 보여줍니다. 현재 선택 ASIN:{" "}
          {selectedAsinStats ? `${selectedAsinStats.positiveRevenueMonths}개월 revenue / ${selectedAsinStats.positiveSalesMonths}개월 units` : "No data"}
          {selectedAsinStats?.latestPositiveRevenueMonth ? ` · 최신 양수 관측: ${selectedAsinStats.latestPositiveRevenueMonth}` : ""}
        </p>
      </SectionCard>

      <SectionCard eyebrow="Calibration" title="Keepa proxy calibration">
        <CalibrationModelPanel selectedModel={selectedModel} calibrationResults={amazonEstimateLabData.calibrationResults} />
      </SectionCard>

      <SectionCard eyebrow="Backcast" title="Monthly revenue backcast">
        <BackcastRevenueChart rows={visibleMonthlyRows} currency={currency} usdKrw={usdKrw} />
      </SectionCard>

      <SectionCard eyebrow="DART" title="Quarterly DART comparison">
        <DartComparisonPanel rows={dartRows} currency={currency} usdKrw={usdKrw} />
      </SectionCard>

      <SectionCard eyebrow="Raw Data" title="Monthly estimate table">
        {visibleMonthlyRows.length ? (
          <div className="overflow-auto rounded-2xl ring-1 ring-toss-line">
            <table className="min-w-[980px] w-full bg-white text-left text-sm">
              <thead className="bg-toss-wash text-xs font-bold uppercase tracking-wide text-toss-gray">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Kind</th>
                  <th className="px-4 py-3 text-right">Jungle Scout units</th>
                  <th className="px-4 py-3 text-right">Predicted sales</th>
                  <th className="px-4 py-3 text-right">Jungle Scout revenue</th>
                  <th className="px-4 py-3 text-right">Predicted revenue</th>
                  <th className="px-4 py-3 text-right">Demand index</th>
                  <th className="px-4 py-3">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-toss-line">
                {visibleMonthlyRows
                  .slice()
                  .reverse()
                  .slice(0, 72)
                  .map((row) => (
                    <tr key={`${row.asin}:${row.month}:${row.kind}`} className="hover:bg-toss-wash/70">
                      <td className="px-4 py-3 font-semibold text-toss-ink">{row.month}</td>
                      <td className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-toss-gray">{row.kind}</td>
                      <td className="px-4 py-3 text-right">{formatCell(row.actualSales)}</td>
                      <td className="px-4 py-3 text-right">{formatCell(row.predictedSales)}</td>
                      <td className="px-4 py-3 text-right">{formatCell(row.actualRevenue)}</td>
                      <td className="px-4 py-3 text-right">{formatCell(row.predictedRevenue)}</td>
                      <td className="px-4 py-3 text-right">{formatCell(row.demandIndex)}</td>
                      <td className="px-4 py-3">{row.confidence}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No data" description="선택한 ASIN에 대해 계산된 월별 데이터가 없습니다." />
        )}
      </SectionCard>

      <SectionCard eyebrow="Notes" title="Lab notes">
        <div className="space-y-2 text-sm leading-6 text-toss-ink2">
          <p>이 화면은 기존 Amazon Tracker와 분리되어 있습니다. 원본 tracker JSON은 수정하지 않습니다.</p>
          <p>최근 1년은 train, 그 전 1년은 test로 나눠서 같은 ASIN의 Amazon 월별 추정치에 맞춥니다.</p>
          <p>Revenue estimate가 없는 경우 임의 생성하지 않고 No data로 둡니다.</p>
          <p>
            분석 기준 ASIN 수: {formatNumber(amazonEstimateLabData.summary.jungleScoutMatchedAsinCount)} · Keepa 매칭 ASIN 수:{" "}
            {formatNumber(amazonEstimateLabData.summary.keepaMatchedAsinCount)} · 분기 비교 행 수: {formatNumber(quarterlyRows.length)}
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

function filterMonthlyRows(rows: ReturnType<typeof getAmazonEstimateMonthly>, window: TimeWindow) {
  if (window === "all") return rows;
  const months = window === "24M" ? 24 : window === "12M" ? 12 : 6;
  return [...rows]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-months);
}

function formatCell(value: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "No data";
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<string | { value: string; label: string; hint?: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-toss-gray">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border-0 bg-white px-3 text-sm font-semibold text-toss-ink ring-1 ring-toss-line outline-none transition focus:ring-2 focus:ring-toss-blue"
      >
        {options.map((option) => {
          const opt = typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </label>
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
