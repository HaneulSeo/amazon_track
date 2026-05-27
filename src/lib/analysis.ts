import {
  getCompany,
  getCompanyDartQuarterly,
  getCompanyMonthly,
  getCompanyStockMonthly,
  getCompanyTradeQuarterly
} from "./dashboard-data";
import type { CorrelationConfidence, CorrelationResult, SourceStatus } from "./types";

type QuarterSeries = Array<{ quarter: string; value: number }>;

function monthToQuarter(month: string): string {
  const [year, monthPart] = month.split("-");
  const quarter = Math.ceil(Number(monthPart) / 3);
  return `${year}-Q${quarter}`;
}

function quarterSortKey(quarter: string): number {
  const [yearPart, quarterPart] = quarter.split("-Q");
  return Number(yearPart) * 10 + Number(quarterPart);
}

function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;
  for (let index = 0; index < xs.length; index += 1) {
    const dx = xs[index] - meanX;
    const dy = ys[index] - meanY;
    numerator += dx * dy;
    denominatorX += dx * dx;
    denominatorY += dy * dy;
  }
  if (!denominatorX || !denominatorY) return null;
  return numerator / Math.sqrt(denominatorX * denominatorY);
}

function rank(values: number[]): number[] {
  return values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value)
    .reduce((acc, item, sortedIndex, sortedArray) => {
      const sameStart = sortedArray.findIndex((entry) => entry.value === item.value);
      const sameEnd = sortedArray.length - 1 - [...sortedArray].reverse().findIndex((entry) => entry.value === item.value);
      const avgRank = (sameStart + sameEnd + 2) / 2;
      acc[item.index] = avgRank;
      return acc;
    }, new Array<number>(values.length));
}

function spearmanCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  return pearsonCorrelation(rank(xs), rank(ys));
}

function confidenceFrom(sampleSize: number, corr: number | null): CorrelationConfidence {
  if (sampleSize < 4 || corr === null) return "not_enough_data";
  const abs = Math.abs(corr);
  if (sampleSize >= 10 && abs >= 0.65) return "high";
  if (sampleSize >= 6 && abs >= 0.45) return "medium";
  if (sampleSize >= 4) return "low";
  return "not_enough_data";
}

function interpretationFor(
  indicatorSource: CorrelationResult["indicator_source"],
  lagQuarters: number,
  pearsonCorr: number | null,
  sampleSize: number,
  confidence: CorrelationConfidence
): string {
  if (sampleSize < 4 || pearsonCorr === null) return "Insufficient sample for a stable lag test.";
  const direction = pearsonCorr > 0 ? "moves with" : "moves opposite";
  return `${indicatorSource.toUpperCase()} ${direction} DART revenue at lag ${lagQuarters}Q. Confidence: ${confidence}.`;
}

function aggregateMonthlyToQuarter(rows: Array<{ month: string; value: number | null }>): QuarterSeries {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    if (row.value === null) continue;
    const quarter = monthToQuarter(row.month);
    buckets.set(quarter, [...(buckets.get(quarter) ?? []), row.value]);
  }
  return [...buckets.entries()]
    .map(([quarter, values]) => ({
      quarter,
      value: values.reduce((sum, value) => sum + value, 0)
    }))
    .sort((a, b) => quarterSortKey(a.quarter) - quarterSortKey(b.quarter));
}

function aggregateStockToQuarter(rows: Array<{ month: string; close: number | null; adj_close: number | null }>): QuarterSeries {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const value = row.adj_close ?? row.close;
    if (value === null) continue;
    const quarter = monthToQuarter(row.month);
    buckets.set(quarter, [...(buckets.get(quarter) ?? []), value]);
  }
  return [...buckets.entries()]
    .map(([quarter, values]) => ({
      quarter,
      value: values.reduce((sum, value) => sum + value, 0) / values.length
    }))
    .sort((a, b) => quarterSortKey(a.quarter) - quarterSortKey(b.quarter));
}

function shiftQuarter(quarter: string, lagQuarters: number): string {
  const [yearPart, qPart] = quarter.split("-Q");
  const start = Number(yearPart) * 4 + (Number(qPart) - 1) + lagQuarters;
  const year = Math.floor(start / 4);
  const quarterNumber = (start % 4) + 1;
  return `${year}-Q${quarterNumber}`;
}

function alignLaggedSeriesFixed(indicator: QuarterSeries, target: QuarterSeries, lagQuarters: number) {
  const targetByQuarter = new Map(target.map((row) => [row.quarter, row.value]));
  return indicator
    .map((row) => ({
      indicatorQuarter: row.quarter,
      targetQuarter: shiftQuarter(row.quarter, lagQuarters),
      indicatorValue: row.value,
      targetValue: targetByQuarter.get(shiftQuarter(row.quarter, lagQuarters)) ?? null
    }))
    .filter((row) => row.targetValue !== null);
}

function makeResult(
  company: string,
  indicatorSource: CorrelationResult["indicator_source"],
  lagQuarters: number,
  pairs: Array<{ indicatorValue: number; targetValue: number }>
): CorrelationResult {
  const xs = pairs.map((row) => row.indicatorValue);
  const ys = pairs.map((row) => row.targetValue);
  const pearson = pearsonCorrelation(xs, ys);
  const spearman = spearmanCorrelation(xs, ys);
  const sampleSize = pairs.length;
  const confidence = confidenceFrom(sampleSize, pearson);
  return {
    company,
    target_source: "dart",
    target_metric: "revenue_krw",
    indicator_source: indicatorSource,
    indicator_metric: indicatorSource === "stock" ? "quarterly_avg_close" : "quarterly_revenue",
    lag_quarters: lagQuarters,
    period_type: "quarterly_to_quarterly",
    sample_size: sampleSize,
    pearson_corr: pearson,
    spearman_corr: spearman,
    r_squared: pearson === null ? null : pearson * pearson,
    confidence,
    interpretation: interpretationFor(indicatorSource, lagQuarters, pearson, sampleSize, confidence)
  };
}

export function buildCorrelationResults(companyId: string): CorrelationResult[] {
  const dart = getCompanyDartQuarterly(companyId)
    .filter((row) => row.revenue_krw !== null)
    .map((row) => ({ quarter: row.quarter, value: row.revenue_krw ?? 0 }))
    .sort((a, b) => quarterSortKey(a.quarter) - quarterSortKey(b.quarter));
  const amazon = aggregateMonthlyToQuarter(
    getCompanyMonthly(companyId).map((row) => ({
      month: row.month,
      value: row.total_revenue
    }))
  );
  const stock = aggregateStockToQuarter(getCompanyStockMonthly(companyId));
  const trass = getCompanyTradeQuarterly(companyId)
    .filter((row) => row.country_scope === "total" && row.export_value_krw !== null)
    .map((row) => ({
      quarter: row.quarter,
      value: row.export_value_krw ?? 0
    }))
    .sort((a, b) => quarterSortKey(a.quarter) - quarterSortKey(b.quarter));

  const results: CorrelationResult[] = [];
  for (let lag = 0; lag <= 4; lag += 1) {
    const amazonPairs = alignLaggedSeriesFixed(amazon, dart, lag).map((row) => ({ indicatorValue: row.indicatorValue, targetValue: row.targetValue ?? 0 }));
    if (amazonPairs.length) results.push(makeResult(companyId, "amazon", lag, amazonPairs));
    const trassPairs = alignLaggedSeriesFixed(trass, dart, lag).map((row) => ({ indicatorValue: row.indicatorValue, targetValue: row.targetValue ?? 0 }));
    if (trassPairs.length) results.push(makeResult(companyId, "trass", lag, trassPairs));
    const stockPairs = alignLaggedSeriesFixed(stock, dart, lag).map((row) => ({ indicatorValue: row.indicatorValue, targetValue: row.targetValue ?? 0 }));
    if (stockPairs.length) results.push(makeResult(companyId, "stock", lag, stockPairs));
  }
  return results.sort((a, b) => a.lag_quarters - b.lag_quarters || a.indicator_source.localeCompare(b.indicator_source));
}

function latestRowLabel(companyId: string, source: SourceStatus["source"]): { period: string | null; label: string | null; rowCount: number; available: boolean; confidence: SourceStatus["confidence"]; warning: string | null } {
  const company = getCompany(companyId);
  if (!company) return { period: null, label: null, rowCount: 0, available: false, confidence: "low", warning: "Company missing" };

  if (source === "amazon") {
    const rows = getCompanyMonthly(companyId);
    const latest = rows.at(-1) ?? null;
    return {
      period: latest?.month ?? null,
      label: latest ? `Revenue ${latest.total_revenue?.toFixed(1) ?? "-"} | Units ${latest.total_units?.toFixed(0) ?? "-"}` : null,
      rowCount: rows.length,
      available: rows.length > 0,
      confidence: company.amazon_data_quality_score !== null && company.amazon_data_quality_score >= 70 ? "high" : company.amazon_data_quality_score !== null && company.amazon_data_quality_score >= 45 ? "medium" : "low",
      warning: latest ? null : "No Amazon proxy data"
    };
  }
  if (source === "dart") {
    const rows = getCompanyDartQuarterly(companyId);
    const latest = rows.at(-1) ?? null;
    return {
      period: latest?.quarter ?? null,
      label: latest ? `KRW ${(latest.revenue_krw ?? 0).toLocaleString("en-US")}` : null,
      rowCount: rows.length,
      available: rows.length > 0,
      confidence: rows.length > 0 ? "high" : "low",
      warning: latest?.source_url ? null : "No DART source URL"
    };
  }
  if (source === "trass") {
    const rows = getCompanyTradeQuarterly(companyId).filter((row) => row.country_scope === "total");
    const latest = rows.at(-1) ?? null;
    return {
      period: latest?.quarter ?? null,
      label: latest ? `KRW ${(latest.export_value_krw ?? 0).toLocaleString("en-US")}` : null,
      rowCount: rows.length,
      available: rows.length > 0,
      confidence: rows.length > 0 ? "medium" : "low",
      warning: rows.length > 0 ? null : "TRASS not available"
    };
  }
  if (source === "stock") {
    const rows = getCompanyStockMonthly(companyId);
    const latest = rows.at(-1) ?? null;
    return {
      period: latest?.month ?? null,
      label: latest ? `Close ${latest.adj_close ?? latest.close ?? 0}` : null,
      rowCount: rows.length,
      available: rows.length > 0,
      confidence: rows.length > 0 ? "medium" : "low",
      warning: rows.length > 0 ? null : "Stock data missing"
    };
  }
  return {
    period: null,
    label: company.next_data_to_collect.length ? "Checklist" : null,
    rowCount: company.next_data_to_collect.length,
    available: false,
    confidence: "low",
    warning: company.next_data_to_collect.length ? "Manual inputs still required" : "No manual checklist"
  };
}

export function buildSourceStatuses(companyId: string): SourceStatus[] {
  return (["amazon", "trass", "dart", "stock", "manual"] as const).map((source) => {
    const latest = latestRowLabel(companyId, source);
    return {
      company: companyId,
      source,
      latest_period: latest.period,
      available: latest.available,
      row_count: latest.rowCount,
      value_label: latest.label,
      confidence: latest.confidence,
      warning: latest.warning
    };
  });
}

export function buildCorrelationSummary(companyId: string) {
  const results = buildCorrelationResults(companyId);
  const bySource = new Map<string, CorrelationResult[]>();
  for (const result of results) {
    bySource.set(result.indicator_source, [...(bySource.get(result.indicator_source) ?? []), result]);
  }

  return {
    company: companyId,
    results,
    amazon_best: bySource.get("amazon")?.slice().sort((a, b) => (Math.abs(b.pearson_corr ?? 0) - Math.abs(a.pearson_corr ?? 0)))[0] ?? null,
    trass_best: bySource.get("trass")?.slice().sort((a, b) => (Math.abs(b.pearson_corr ?? 0) - Math.abs(a.pearson_corr ?? 0)))[0] ?? null,
    stock_best: bySource.get("stock")?.slice().sort((a, b) => (Math.abs(b.pearson_corr ?? 0) - Math.abs(a.pearson_corr ?? 0)))[0] ?? null
  };
}
