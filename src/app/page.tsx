"use client";

import { Activity, BarChart3, Boxes, DollarSign, Package, TrendingUp } from "lucide-react";
import { BrandTrendChart } from "@/components/BrandTrendChart";
import { KpiCard } from "@/components/KpiCard";
import { ProductBreakdownChart } from "@/components/ProductBreakdownChart";
import { ProductDetail } from "@/components/ProductDetail";
import { ProductTable } from "@/components/ProductTable";
import { QuarterlyComparison } from "@/components/QuarterlyComparison";
import { SectionCard } from "@/components/SectionCard";
import { monthlyBrandTrend, monthlyProductTrend, productsData, quarterlyComparisonData, summaryData } from "@/lib/data";
import { formatCurrency, formatNumber, formatPercent, shortProductName, trendTone } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="pt-10 sm:pt-16">
        <div className="max-w-4xl">
          <p className="mb-4 inline-flex rounded-md bg-toss-sky px-3 py-2 text-sm font-bold text-toss-blue">
            Amazon / Jungle Scout CSV Dashboard
          </p>
          <h1 className="text-5xl font-extrabold tracking-normal text-toss-ink sm:text-7xl">
            Mighty Patch Revenue Tracker
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-toss-gray sm:text-xl">
            Amazon / Jungle Scout CSV 기반 2년치 매출 추이 분석
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={DollarSign}
            label="Latest month revenue"
            value={formatCurrency(summaryData.latestRevenue)}
            delta={summaryData.latestMomGrowth}
            helper={summaryData.latestMonth ?? undefined}
          />
          <KpiCard
            icon={BarChart3}
            label="Latest month units"
            value={formatNumber(summaryData.latestUnits)}
            helper={`Avg price ${formatCurrency(summaryData.latestAveragePrice, false)}`}
          />
          <KpiCard
            icon={Boxes}
            label="Tracked products"
            value={formatNumber(summaryData.productCount, false)}
            helper={`${summaryData.sourceFileCount} CSV files`}
          />
          <KpiCard
            icon={TrendingUp}
            label="Recent 3M growth"
            value={formatPercent(summaryData.recent3Growth)}
            delta={summaryData.recent3Growth}
            helper="vs previous 3M"
          />
        </div>
      </header>

      <SectionCard eyebrow="Section 1" title="Brand Overview">
        <BrandTrendChart data={monthlyBrandTrend} />
      </SectionCard>

      <SectionCard eyebrow="Section 2" title="Quarterly Benchmark">
        <QuarterlyComparison rows={quarterlyComparisonData} baseQuarter={summaryData.quarterlyBenchmarkBaseQuarter} />
      </SectionCard>

      <SectionCard eyebrow="Section 3" title="Product Breakdown">
        <ProductBreakdownChart products={productsData} trends={monthlyProductTrend} latestMonth={summaryData.latestMonth} />
        <div className="mt-6 overflow-auto rounded-lg ring-1 ring-toss-line">
          <table className="min-w-[760px] w-full bg-white text-left text-sm">
            <thead className="bg-toss-wash text-xs uppercase text-toss-gray">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">ASIN</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Share</th>
                <th className="px-4 py-3 text-right">3M Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-toss-line">
              {productsData.map((product) => (
                <tr key={product.productId}>
                  <td className="px-4 py-3 font-bold">{product.latestRevenueRank}</td>
                  <td className="px-4 py-3 text-toss-gray">{product.asin}</td>
                  <td className="px-4 py-3">{shortProductName(product.productName, product.asin)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(product.latestRevenue, false)}</td>
                  <td className="px-4 py-3 text-right">{product.latestRevenueShare.toFixed(1)}%</td>
                  <td className={`px-4 py-3 text-right font-semibold ${trendTone(product.recent3Growth)}`}>{formatPercent(product.recent3Growth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Section 4" title="Product Detail">
        <ProductDetail products={productsData} trends={monthlyProductTrend} />
      </SectionCard>

      <SectionCard eyebrow="Section 5" title="Winners & Losers">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <RankingList title="3M growth leaders" icon={TrendingUp} items={summaryData.topProductsByGrowth} metric={(product) => formatPercent(product.recent3Growth)} />
          <RankingList title="3M revenue decliners" icon={Activity} items={summaryData.decliningProducts} metric={(product) => formatPercent(product.recent3Growth)} />
          <RankingList
            title="BSR improvers"
            icon={BarChart3}
            items={summaryData.bsrImprovers}
            metric={(product) => (product.bsrImprovement === null ? "-" : formatNumber(Math.abs(product.bsrImprovement), false))}
          />
          <RankingList
            title="Review gainers"
            icon={Package}
            items={summaryData.reviewGrowers}
            metric={(product) => (product.reviewGrowth === null ? "-" : `+${formatNumber(product.reviewGrowth, false)}`)}
          />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Section 6" title="Raw Data Table">
        <ProductTable rows={monthlyProductTrend} />
      </SectionCard>

      <footer className="pb-10 text-sm text-toss-gray">
        <div className="rounded-lg bg-white p-5 ring-1 ring-toss-line">
          <p className="font-semibold text-toss-ink">Data notes</p>
          <p className="mt-2">
            Generated from {summaryData.sourceFileCount} CSV files and {formatNumber(summaryData.sourceRowCount, false)} source rows.
            Daily snapshots are averaged into product-month estimates before brand totals are calculated.
          </p>
          {summaryData.warnings.length ? (
            <p className="mt-2 text-amber-700">{summaryData.warnings.length} parsing warning(s) are documented in public/data/summary.json.</p>
          ) : null}
        </div>
      </footer>
    </main>
  );
}

type RankingListProps<T extends Product> = {
  title: string;
  icon: typeof TrendingUp;
  items: T[];
  metric: (product: T) => string;
};

function RankingList<T extends Product>({ title, icon: Icon, items, metric }: RankingListProps<T>) {
  return (
    <div className="rounded-lg bg-toss-wash p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-toss-ink">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-toss-blue ring-1 ring-toss-line">
          <Icon size={17} />
        </span>
        {title}
      </div>
      <div className="space-y-3">
        {items.slice(0, 6).map((product, index) => (
          <div key={`${title}-${product.productId}`} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-toss-ink">
                {index + 1}. {shortProductName(product.productName, product.asin)}
              </p>
              <p className="text-xs text-toss-gray">{product.asin}</p>
            </div>
            <p className={`shrink-0 text-sm font-bold ${trendTone(product.recent3Growth)}`}>{metric(product)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
