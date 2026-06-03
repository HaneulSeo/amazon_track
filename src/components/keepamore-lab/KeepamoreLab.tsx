"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, Database, Package, Store, TrendingUp, TriangleAlert } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { SectionCard } from "@/components/SectionCard";
import { formatNumber } from "@/lib/format";
import {
  getKeepamoreAsins,
  getKeepamoreCompanies,
  getKeepamoreFamilies,
  getKeepamoreProduct,
  keepamoreLabData
} from "@/lib/keepamore-lab-data";
import type { DisplayCurrency } from "@/lib/format";
import { KeepamoreSeriesChart } from "./KeepamoreSeriesChart";

type KeepamoreLabProps = {
  currency: DisplayCurrency;
  usdKrw: number;
};

type PeriodWindow = "all" | "1Y" | "6M" | "3M";

export function KeepamoreLab({ currency, usdKrw }: KeepamoreLabProps) {
  const companies = getKeepamoreCompanies();
  const [selectedCompany, setSelectedCompany] = useState<string>(companies[0] ?? "");
  const families = useMemo(() => getKeepamoreFamilies(selectedCompany), [selectedCompany]);
  const [selectedFamily, setSelectedFamily] = useState<string>(families[0] ?? "");
  const assins = useMemo(() => getKeepamoreAsins(selectedCompany, selectedFamily), [selectedCompany, selectedFamily]);
  const [selectedAsin, setSelectedAsin] = useState<string>(assins[0]?.asin ?? "");
  const [window, setWindow] = useState<PeriodWindow>("all");

  useEffect(() => {
    if (!companies.length) return;
    if (!selectedCompany || !companies.includes(selectedCompany)) {
      setSelectedCompany(companies[0]);
    }
  }, [companies, selectedCompany]);

  useEffect(() => {
    if (!selectedCompany) return;
    const nextFamilies = getKeepamoreFamilies(selectedCompany);
    if (!nextFamilies.length) {
      setSelectedFamily("");
      return;
    }
    if (!selectedFamily || !nextFamilies.includes(selectedFamily)) {
      setSelectedFamily(nextFamilies[0]);
    }
  }, [selectedCompany, selectedFamily]);

  useEffect(() => {
    if (!selectedCompany || !selectedFamily) {
      setSelectedAsin("");
      return;
    }
    const nextAsins = getKeepamoreAsins(selectedCompany, selectedFamily);
    if (!nextAsins.length) {
      setSelectedAsin("");
      return;
    }
    if (!selectedAsin || !nextAsins.some((item) => item.asin === selectedAsin)) {
      setSelectedAsin(nextAsins[0].asin);
    }
  }, [selectedAsin, selectedCompany, selectedFamily]);

  const selectedProduct = selectedCompany && selectedFamily && selectedAsin ? getKeepamoreProduct(selectedCompany, selectedFamily, selectedAsin) ?? null : null;
  const errorRows = keepamoreLabData.errors.slice(0, 12);
  const totalSeriesPoints = keepamoreLabData.products.reduce((sum, item) => sum + item.series.length, 0);
  const latestCollectionDate = keepamoreLabData.generatedAt ? new Date(keepamoreLabData.generatedAt).toLocaleString("ko-KR") : "-";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl2 bg-white p-6 shadow-card ring-1 ring-toss-line">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-toss-gray">Keepa 실험실</p>
            <h1 className="mt-1 text-2xl font-extrabold text-toss-ink">Amazon Tracking ASIN을 Keepamore로 별도 확인</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-toss-ink2">
              기존 Amazon Tracking 데이터는 그대로 두고, 추적 중인 ASIN만 Keepamore API로 다시 조회한 실험실입니다. 가격, 랭킹, 리뷰, Buy Box 시계열은 여기서만 확인합니다.
            </p>
          </div>
          <div className="rounded-lg bg-toss-wash px-3 py-2 text-xs font-semibold text-toss-gray">
            최신 수집일 <span className="ml-2 font-extrabold text-toss-ink">{latestCollectionDate}</span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="전체 ASIN" value={formatNumber(keepamoreLabData.summary.asinCount)} icon={Package} />
          <KpiCard label="호출 성공" value={formatNumber(keepamoreLabData.summary.successCount)} icon={TrendingUp} />
          <KpiCard label="호출 실패" value={formatNumber(keepamoreLabData.summary.errorCount)} icon={TriangleAlert} />
          <KpiCard label="회사 수" value={formatNumber(keepamoreLabData.summary.companyCount)} icon={Store} />
        </div>
      </section>

      <SectionCard eyebrow="Filters" title="회사 / 제품군 / ASIN / 기간">
        <div className="grid gap-3 lg:grid-cols-4">
          <SelectField
            label="Company"
            value={selectedCompany}
            options={companies}
            onChange={(value) => setSelectedCompany(value)}
          />
          <SelectField
            label="Product family"
            value={selectedFamily}
            options={families}
            onChange={(value) => setSelectedFamily(value)}
          />
          <SelectField
            label="ASIN"
            value={selectedAsin}
            options={assins.map((item) => item.asin)}
            onChange={(value) => setSelectedAsin(value)}
          />
          <SelectField
            label="Window"
            value={window}
            options={["all", "1Y", "6M", "3M"]}
            onChange={(value) => setWindow(value as PeriodWindow)}
          />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Chart" title="Keepa 시계열">
        <KeepamoreSeriesChart key={selectedAsin} product={selectedProduct} currency={currency} usdKrw={usdKrw} />
      </SectionCard>

      <SectionCard eyebrow="Raw Data" title="선택된 ASIN의 원자료">
        {selectedProduct ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-toss-wash px-3 py-1 font-bold text-toss-ink">{selectedProduct.title ?? "Unknown title"}</span>
              <span className="text-toss-gray">{selectedProduct.brand ?? "Unknown brand"}</span>
              <span className="text-toss-gray">{selectedProduct.category ?? "No category"}</span>
              <span className="text-toss-gray">raw: {selectedProduct.rawPath}</span>
            </div>
            <RawDataTable product={selectedProduct} window={window} />
          </div>
        ) : (
          <EmptyNotice title="선택한 ASIN 데이터가 없습니다" description="회사, 제품군, ASIN을 다시 선택하세요." />
        )}
      </SectionCard>

      <SectionCard eyebrow="Errors" title="호출 실패 / 누락 ASIN">
        {errorRows.length ? (
          <div className="space-y-3">
            {errorRows.map((error) => (
              <div key={`${error.asin}-${error.message}`} className="rounded-lg bg-toss-wash px-4 py-3 text-sm">
                <p className="font-bold text-toss-ink">{error.asin}</p>
                <p className="mt-1 text-toss-gray">
                  {error.company ? `${error.company} · ` : ""}
                  {error.message}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyNotice title="오류 없음" description="이번 수집에서 실패한 ASIN이 없습니다." />
        )}
      </SectionCard>

      <SectionCard eyebrow="Notes" title="실험실 안내">
        <div className="space-y-2 text-sm leading-6 text-toss-ink2">
          <p>Keepa 실험실은 기존 Amazon Tracker 데이터와 분리되어 있습니다. 이 화면의 데이터는 `public/data/keepamore_lab.json`만 사용합니다.</p>
          <p>Revenue estimate가 API에 없으면 자동 계산하지 않고 `not available`로 표시합니다.</p>
          <p>총 시계열 포인트 수: {formatNumber(totalSeriesPoints)}</p>
        </div>
      </SectionCard>
    </div>
  );
}

function RawDataTable({ product, window }: { product: NonNullable<ReturnType<typeof getKeepamoreProduct>>; window: PeriodWindow }) {
  const series = useMemo(() => filterSeries(product.series, window), [product.series, window]);

  return (
    <div className="overflow-auto rounded-lg ring-1 ring-toss-line">
      <table className="min-w-[980px] w-full bg-white text-left text-sm">
        <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
          <tr>
            <th className="px-4 py-3">date</th>
            <th className="px-4 py-3 text-right">buyBoxPrice</th>
            <th className="px-4 py-3 text-right">amazonPrice</th>
            <th className="px-4 py-3 text-right">newPrice</th>
            <th className="px-4 py-3 text-right">salesRank</th>
            <th className="px-4 py-3 text-right">reviews</th>
            <th className="px-4 py-3 text-right">rating</th>
            <th className="px-4 py-3 text-right">revenueEstimate</th>
            <th className="px-4 py-3 text-right">unitsEstimate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-toss-line">
          {series.length ? (
            series
              .slice()
              .reverse()
              .slice(0, 120)
              .map((point) => (
                <tr key={point.date} className="hover:bg-toss-wash/70">
                  <td className="px-4 py-3 font-semibold text-toss-ink">{point.date}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(point.buyBoxPrice)}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(point.amazonPrice)}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(point.newPrice)}</td>
                  <td className="px-4 py-3 text-right">{formatCount(point.salesRank)}</td>
                  <td className="px-4 py-3 text-right">{formatCount(point.reviews)}</td>
                  <td className="px-4 py-3 text-right">{formatRating(point.rating)}</td>
                  <td className="px-4 py-3 text-right">{formatCount(point.revenueEstimate)}</td>
                  <td className="px-4 py-3 text-right">{formatCount(point.unitsEstimate)}</td>
                </tr>
              ))
          ) : (
            <tr>
              <td className="px-4 py-5 text-sm font-semibold text-toss-gray" colSpan={9}>
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function filterSeries(series: NonNullable<ReturnType<typeof getKeepamoreProduct>>["series"], window: PeriodWindow) {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  if (window === "all" || !sorted.length) return sorted;
  const latest = new Date(sorted.at(-1)?.date ?? new Date()).getTime();
  const days = window === "1Y" ? 365 : window === "6M" ? 183 : 92;
  const cutoff = latest - days * 24 * 60 * 60 * 1000;
  return sorted.filter((point) => new Date(point.date).getTime() >= cutoff);
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-toss-gray">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-lg border border-toss-line bg-white px-3 py-2.5 pr-10 text-sm font-semibold text-toss-ink outline-none transition focus:border-toss-blue"
        >
          {options.length ? (
            options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))
          ) : (
            <option value="">No data</option>
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-toss-gray" size={16} />
      </div>
    </label>
  );
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `$${value.toFixed(2)}`;
}

function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return formatNumber(value);
}

function formatRating(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(1);
}

function EmptyNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg bg-toss-wash px-4 py-5 text-sm">
      <p className="font-bold text-toss-ink">{title}</p>
      <p className="mt-1 text-toss-gray">{description}</p>
    </div>
  );
}

