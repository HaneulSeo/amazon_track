import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type {
  AmazonEstimateLabCalibrationPoint,
  AmazonEstimateLabCalibrationResult,
  AmazonEstimateLabConfidence,
  AmazonEstimateLabData,
  AmazonEstimateLabDartComparison,
  AmazonEstimateLabError,
  AmazonEstimateLabJungleScoutObservation,
  AmazonEstimateLabKeepaMonthlyFeature,
  AmazonEstimateLabMetrics,
  AmazonEstimateLabMonthlyEstimate,
  AmazonEstimateLabQuarterlyEstimate,
  AmazonEstimateLabSelectedModel,
  AmazonEstimateLabWarning
} from "../src/lib/types";

type CatalogRow = {
  company: string;
  productFamily: string;
  asin: string;
  productName: string;
  brand: string | null;
  category: string | null;
  sourceFolder: string | null;
};

type AmazonLabelRow = {
  company?: string;
  source_folder?: string;
  asin?: string;
  brand?: string;
  category?: string;
  product_name?: string;
  product_family?: string;
  family_confidence?: string;
  month?: string;
  raw_file_count?: number | string | null;
  raw_row_count?: number | string | null;
  date_min?: string;
  date_max?: string;
  revenue?: number | string | null;
  units?: number | string | null;
  avg_price?: number | string | null;
  avg_bsr?: number | string | null;
  reviews?: number | string | null;
  review_change?: number | string | null;
  rating?: number | string | null;
  sellers?: number | string | null;
  mom_revenue_growth?: number | string | null;
  yoy_revenue_growth?: number | string | null;
  rolling_3m_revenue?: number | string | null;
  rolling_6m_revenue?: number | string | null;
  revenue_share_in_company?: number | string | null;
  revenue_source?: string;
  data_quality_warnings?: string;
};

type KeepaRawEnvelope = {
  company?: string;
  productFamily?: string;
  asin?: string;
  response?: any;
  fetchedAt?: string;
};

type DartRow = {
  company?: string;
  company_label?: string;
  quarter?: string;
  revenue_krw?: string | number;
  source_url?: string;
};

type CalibrationRow = {
  company: string;
  productFamily: string;
  asin: string;
  productName: string;
  month: string;
  split: "train" | "test" | "holdout";
  actualSales: number | null;
  actualRevenue: number | null;
  observedPrice: number | null;
  observedBsr: number | null;
  keepaMedianBsr: number | null;
  keepaAvgPrice: number | null;
  monthlyPriceStdDev: number | null;
  monthlyPriceTrend: number | null;
  monthlyPriceRange: number | null;
  buyboxRatio: number | null;
  reviewGrowth: number | null;
  ratingAvg: number | null;
  salesRankReference: number | null;
  offerCount: number | null;
  offerCsvPointCount: number | null;
  liveOffersCount: number | null;
  buyboxEligibleOfferCountTotal: number | null;
  asinTrainMedianRevenue: number | null;
  asinTrainMedianSales: number | null;
  asinTrainPositiveRevenueMonths: number | null;
  monthIndex: number | null;
  monthSin: number | null;
  monthCos: number | null;
};

type TargetTransform = "raw" | "log1p" | "asinh" | "sqrt";
type FeatureScaleMode = "none" | "zscore" | "robust";

type FeatureStat = {
  mean: number | null;
  std: number | null;
  median: number | null;
  mad: number | null;
};

type FittedModel = {
  modelKey: string;
  scope: "global" | "company" | "family";
  company: string | null;
  productFamily: string | null;
  modelType: "simple_power_law" | "log_linear" | "family_adjusted" | "demand_index_only" | "ridge_search";
  targetMetric: "monthlySales" | "monthlyRevenue";
  sampleCount: number;
  trainSampleCount: number;
  testSampleCount: number;
  selected: boolean;
  activeFeatures?: string[];
  targetTransform?: TargetTransform;
  featureScaleMode?: FeatureScaleMode;
  lambda?: number;
  featureStats?: Record<string, FeatureStat>;
  formula: string;
  coefficients: Record<string, number>;
  metrics: {
    mape: number | null;
    rmse: number | null;
    mae: number | null;
    r2: number | null;
    spearman: number | null;
  };
  trainMetrics?: {
    mape: number | null;
    rmse: number | null;
    mae: number | null;
    r2: number | null;
    spearman: number | null;
  };
  testMetrics?: {
    mape: number | null;
    rmse: number | null;
    mae: number | null;
    r2: number | null;
    spearman: number | null;
  };
  confidence: AmazonEstimateLabConfidence;
  notes: string[];
  points: AmazonEstimateLabCalibrationPoint[];
};

type SearchCandidate = {
  activeFeatures: string[];
  targetTransform: TargetTransform;
  featureScaleMode: FeatureScaleMode;
  lambda: number;
  score: number;
  model: FittedModel;
};

type Prediction = {
  sales: number | null;
  revenue: number | null;
  priceUsedForRevenue: number | null;
  demandIndex: number | null;
  confidence: AmazonEstimateLabConfidence;
  notes: string[];
};

const REPO_ROOT = process.cwd();
const AMAZON_LABEL_PATH = path.join(REPO_ROOT, "data", "processed", "amazon_us_monthly.csv");
const KEEPA_PUBLIC_PATH = path.join(REPO_ROOT, "public", "data", "keepamore_lab.json");
const DART_PATH = path.join(REPO_ROOT, "data", "processed", "dart_quarterly_revenue.csv");
const OUTPUT_DIR = path.join(REPO_ROOT, "data", "processed", "amazon_estimate_lab");
const PUBLIC_JSON_PATH = path.join(REPO_ROOT, "public", "data", "amazon_estimate_lab.json");

async function main() {
  const amazonLabels = (await readCsv<AmazonLabelRow>(AMAZON_LABEL_PATH)) ?? [];
  const keepaPublic = (await readJsonFile<any>(KEEPA_PUBLIC_PATH)) ?? { products: [] };
  const keepaRawIndex = await loadKeepaRawIndex(path.join(REPO_ROOT, "data", "raw", "keepamore_lab"));
  const dartRows = await readCsv<DartRow>(DART_PATH);

  const catalog = buildCatalog(keepaPublic.products ?? []);
  const catalogByAsin = new Map(catalog.map((row) => [row.asin, row]));

  const jungleScoutObservations = buildJungleScoutObservations(amazonLabels, catalogByAsin);
  const split = splitMonths(jungleScoutObservations.map((row) => row.month));
  const asinBaselines = buildAsinBaselines(jungleScoutObservations, split);
  const keepaMonthlyFeatures = buildKeepaMonthlyFeatures(keepaPublic.products ?? [], keepaRawIndex, catalogByAsin, asinBaselines);
  const observationsByAsinMonth = new Map(jungleScoutObservations.map((row) => [`${row.asin}:${row.month}`, row]));
  const calibrationRows = buildCalibrationRows(jungleScoutObservations, keepaMonthlyFeatures, split);
  const trainRows = calibrationRows.filter((row) => row.split === "train");
  const testRows = calibrationRows.filter((row) => row.split === "test");
  const modelCatalog = fitAllModels(trainRows, testRows);
  const selectedModelByCompany = chooseSelectedCompanyModels(modelCatalog, trainRows, testRows, catalog);
  const selectedKeys = new Set(selectedModelByCompany.map((row) => row.modelKey));
  const calibrationResults = modelCatalog.map((row) => ({ ...row, selected: selectedKeys.has(row.modelKey) }));
  const selectedModelMap = new Map(selectedModelByCompany.map((row) => [row.company, row]));
  const seasonalAdjustmentMap = buildSeasonalAdjustmentMap(keepaMonthlyFeatures, selectedModelMap, observationsByAsinMonth, split);

  const monthlyEstimates = buildMonthlyEstimates(jungleScoutObservations, keepaMonthlyFeatures, selectedModelMap, observationsByAsinMonth, split, seasonalAdjustmentMap);
  const quarterlyCompanyEstimates = buildQuarterlyCompanyEstimates(monthlyEstimates);
  const dartComparison = buildDartComparison(quarterlyCompanyEstimates, dartRows);
  const warnings = buildWarnings(catalog, jungleScoutObservations, keepaMonthlyFeatures, selectedModelByCompany, dartComparison);
  const errors: AmazonEstimateLabError[] = [];

  const summary = {
    catalogAsinCount: catalog.length,
    companyCount: new Set(catalog.map((row) => row.company)).size,
    productFamilyCount: new Set(catalog.map((row) => `${row.company}:${row.productFamily}`)).size,
    jungleScoutMatchedAsinCount: new Set(jungleScoutObservations.map((row) => row.asin)).size,
    keepaMatchedAsinCount: new Set(keepaMonthlyFeatures.map((row) => row.asin)).size,
    calibrationSampleCount: calibrationRows.length,
    trainSampleCount: trainRows.length,
    testSampleCount: testRows.length,
    labelMonthCount: split.all.length,
    modelCount: calibrationResults.length,
    selectedModelCount: selectedModelByCompany.length,
    backcastMonthCount: new Set(monthlyEstimates.filter((row) => row.kind === "keepa_backcast_estimate").map((row) => row.month)).size,
    latestMonth: getLatestMonth(jungleScoutObservations)
  };

  const output: AmazonEstimateLabData = {
    generatedAt: new Date().toISOString(),
    sourceNote:
      "Local-only calibration. Amazon monthly labels come from data/processed/amazon_us_monthly.csv for the same 20 Keepa ASINs, and Keepa/Keepamore series come from public/data/keepamore_lab.json plus raw envelopes. No external API calls were used.",
    summary,
    asinCatalog: catalog,
    jungleScoutObservations,
    keepaMonthlyFeatures,
    calibrationResults,
    selectedModelByCompany,
    selectedModelByCompanyFamily: selectedModelByCompany,
    monthlyEstimates,
    quarterlyCompanyEstimates,
    dartComparison,
    warnings,
    errors
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(path.join(REPO_ROOT, "public", "data"), { recursive: true });

  await fs.writeFile(PUBLIC_JSON_PATH, JSON.stringify(output, null, 2));
  await writeCsv(path.join(OUTPUT_DIR, "asin_catalog.csv"), catalog);
  await writeCsv(path.join(OUTPUT_DIR, "jungle_scout_observations.csv"), jungleScoutObservations);
  await writeCsv(path.join(OUTPUT_DIR, "keepa_monthly_features.csv"), keepaMonthlyFeatures);
  await writeCsv(path.join(OUTPUT_DIR, "calibration_results.csv"), calibrationResults.map(flattenModel));
  await writeCsv(path.join(OUTPUT_DIR, "calibration_points.csv"), calibrationResults.flatMap((row) => row.points.map((point) => ({ modelKey: row.modelKey, ...point }))));
  await writeCsv(path.join(OUTPUT_DIR, "selected_model_by_company.csv"), selectedModelByCompany);
  await writeCsv(path.join(OUTPUT_DIR, "selected_model_by_company_family.csv"), selectedModelByCompany);
  await writeCsv(path.join(OUTPUT_DIR, "monthly_estimates.csv"), monthlyEstimates);
  await writeCsv(path.join(OUTPUT_DIR, "quarterly_company_estimates.csv"), quarterlyCompanyEstimates);
  await writeCsv(path.join(OUTPUT_DIR, "dart_comparison.csv"), dartComparison);
  await writeCsv(path.join(OUTPUT_DIR, "warnings.csv"), warnings);
  await writeCsv(path.join(OUTPUT_DIR, "errors.csv"), errors);

  console.log(`wrote ${path.relative(REPO_ROOT, PUBLIC_JSON_PATH)} (${monthlyEstimates.length} monthly estimates)`);
}

function buildCatalog(products: any[]): CatalogRow[] {
  const seen = new Set<string>();
  const rows: CatalogRow[] = [];
  for (const product of products ?? []) {
    if (!product || typeof product !== "object") continue;
    const record = product as Record<string, unknown>;
    const asin = stringFrom(record.asin);
    if (!asin || seen.has(asin)) continue;
    seen.add(asin);
    rows.push({
      company: stringFrom(record.company) ?? "unknown",
      productFamily: stringFrom(record.product_family) ?? stringFrom(record.productFamily) ?? "Other",
      asin,
      productName: stringFrom(record.product_name) ?? stringFrom(record.productName) ?? asin,
      brand: stringFrom(record.brand),
      category: stringFrom(record.category),
      sourceFolder: stringFrom(record.source_folder) ?? stringFrom(record.sourceFolder)
    });
  }
  return rows.sort((a, b) => a.company.localeCompare(b.company) || a.productFamily.localeCompare(b.productFamily) || a.asin.localeCompare(b.asin));
}

function buildJungleScoutObservations(rows: AmazonLabelRow[], catalogByAsin: Map<string, CatalogRow>): AmazonEstimateLabJungleScoutObservation[] {
  const output: AmazonEstimateLabJungleScoutObservation[] = [];
  for (const row of rows ?? []) {
    const asin = stringFrom(row.asin);
    if (!asin) continue;
    const catalog = catalogByAsin.get(asin);
    if (!catalog) continue;
    const units = toNumber(row.units);
    const revenue = toNumber(row.revenue);
    const price = toNumber(row.avg_price);
    const calculatedRevenue = revenue === null && units !== null && price !== null;
    output.push({
      company: stringFrom(row.company) ?? catalog?.company ?? "unknown",
      productFamily: stringFrom(row.product_family) ?? catalog?.productFamily ?? "Other",
      asin,
      productName: stringFrom(row.product_name) ?? catalog?.productName ?? asin,
      brand: stringFrom(row.brand) ?? catalog?.brand ?? null,
      category: stringFrom(row.category) ?? catalog?.category ?? null,
      month: stringFrom(row.month) ?? "",
      collectedDate: `${stringFrom(row.month) ?? "1970-01"}-01`,
      monthlySales: units,
      monthlyRevenue: calculatedRevenue && units !== null && price !== null ? units * price : revenue,
      price,
      bsr: toNumber(row.avg_bsr),
      reviews: toNumber(row.reviews),
      rating: toNumber(row.rating),
      sellers: toNumber(row.sellers),
      calculatedRevenue,
      sourceRows: toNumber(row.raw_row_count),
      sourceFile: path.relative(REPO_ROOT, AMAZON_LABEL_PATH)
    });
  }
  return output.sort((a, b) => a.asin.localeCompare(b.asin) || a.month.localeCompare(b.month));
}

type SplitPlan = {
  train: Set<string>;
  test: Set<string>;
  holdout: Set<string>;
  all: string[];
};

function splitMonths(months: string[]): SplitPlan {
  const sorted = [...new Set(months.filter(Boolean))].sort();
  const train = new Set(sorted.slice(-12));
  const test = new Set(sorted.slice(-24, -12));
  const holdout = new Set(sorted.filter((month) => !train.has(month) && !test.has(month)));
  return { train, test, holdout, all: sorted };
}

async function loadKeepaRawIndex(root: string) {
  const index = new Map<
    string,
    {
      salesRankReference: number | null;
      filePath: string;
      title: string | null;
      brand: string | null;
      category: string | null;
      offerCount: number | null;
      offerCsvPointCount: number | null;
      liveOffersCount: number | null;
      buyboxEligibleOfferCountTotal: number | null;
      lastPriceChange: number | null;
      lastStockUpdate: number | null;
      lastRatingUpdate: number | null;
      lastUpdate: number | null;
    }
  >();
  const files = await collectJsonFiles(root);
  for (const filePath of files) {
    const raw = await readJsonFile<KeepaRawEnvelope>(filePath);
    const asin = stringFrom(raw?.asin);
    if (!asin) continue;
    const response = raw?.response && typeof raw.response === "object" ? (raw.response as Record<string, unknown>) : {};
    const candidate = {
      salesRankReference: toNumber(response.salesRankReference),
      filePath,
      title: stringFrom(response.title) ?? stringFrom(response.productTitle) ?? stringFrom(response.name),
      brand: stringFrom(response.brand) ?? stringFrom(response.brandName),
      category: stringFrom(response.category) ?? stringFrom(response.categoryName),
      offerCount: Array.isArray(response.offers) ? response.offers.length : null,
      offerCsvPointCount: Array.isArray(response.offers)
        ? (response.offers as Array<Record<string, unknown>>).reduce(
            (sum, offer) => sum + (Array.isArray(offer.offerCSV) ? offer.offerCSV.length : 0),
            0
          )
        : null,
      liveOffersCount: Array.isArray(response.liveOffersOrder) ? response.liveOffersOrder.length : null,
      buyboxEligibleOfferCountTotal: Array.isArray(response.buyBoxEligibleOfferCounts)
        ? response.buyBoxEligibleOfferCounts.reduce((sum: number, value: unknown) => sum + (toNumber(value) ?? 0), 0)
        : null,
      lastPriceChange: toNumber(response.lastPriceChange),
      lastStockUpdate: toNumber(response.lastStockUpdate),
      lastRatingUpdate: toNumber(response.lastRatingUpdate),
      lastUpdate: toNumber(response.lastUpdate)
    };
    const current = index.get(asin);
    if (!current || candidate.filePath.localeCompare(current.filePath) >= 0) {
      index.set(asin, candidate);
    }
  }
  return index;
}

function buildKeepaMonthlyFeatures(
  keepaPublicProducts: any[],
  keepaRawIndex: Map<
    string,
    {
      salesRankReference: number | null;
      filePath: string;
      title: string | null;
      brand: string | null;
      category: string | null;
      offerCount: number | null;
      offerCsvPointCount: number | null;
      liveOffersCount: number | null;
      buyboxEligibleOfferCountTotal: number | null;
      lastPriceChange: number | null;
      lastStockUpdate: number | null;
      lastRatingUpdate: number | null;
      lastUpdate: number | null;
    }
  >,
  catalogByAsin: Map<string, CatalogRow>,
  asinBaselines: Map<
    string,
    {
      medianRevenue: number | null;
      medianSales: number | null;
      positiveRevenueMonths: number | null;
    }
  >
): AmazonEstimateLabKeepaMonthlyFeature[] {
  const output: AmazonEstimateLabKeepaMonthlyFeature[] = [];
  for (const product of keepaPublicProducts ?? []) {
    if (!product || typeof product !== "object") continue;
    const record = product as Record<string, unknown>;
    const asin = stringFrom(record.asin);
    if (!asin) continue;
    const catalog = catalogByAsin.get(asin);
    const rawMeta = keepaRawIndex.get(asin);
    const series = Array.isArray(record.series) ? (record.series as Array<Record<string, unknown>>) : [];
    const monthBuckets = new Map<string, Array<Record<string, unknown>>>();
    for (const point of series) {
      const date = stringFrom(point.date);
      if (!date) continue;
      const month = date.slice(0, 7);
      if (!monthBuckets.has(month)) monthBuckets.set(month, []);
      monthBuckets.get(month)!.push(point);
    }
    for (const [month, points] of [...monthBuckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const buybox = numericValues(points, "buyBoxPrice");
      const amazon = numericValues(points, "amazonPrice");
      const newer = numericValues(points, "newPrice");
      const selected = selectPriceSeries(buybox, newer, amazon);
      const priceStats = summarizePriceSeries(selected.values);
      const salesRankReference = rawMeta?.salesRankReference ?? null;
      const featureWarnings: string[] = [];
      if (salesRankReference === null) featureWarnings.push("sales_rank_reference_missing");
      if (!points.length) featureWarnings.push("price_history_missing");
      output.push({
        company: catalog?.company ?? stringFrom(record.company) ?? "unknown",
        productFamily: catalog?.productFamily ?? stringFrom(record.productFamily) ?? "Other",
        asin,
        productName: stringFrom(record.title) ?? stringFrom(record.productName) ?? rawMeta?.title ?? catalog?.productName ?? asin,
        month,
        asinTrainMedianRevenue: asinBaselines.get(asin)?.medianRevenue ?? null,
        asinTrainMedianSales: asinBaselines.get(asin)?.medianSales ?? null,
        asinTrainPositiveRevenueMonths: asinBaselines.get(asin)?.positiveRevenueMonths ?? null,
        monthlyMedianBsr: salesRankReference,
        monthlyAvgBsr: salesRankReference,
        monthlyBestBsr: salesRankReference,
        monthlyWorstBsr: salesRankReference,
        monthlyAvgBuyboxPrice: average(buybox),
        monthlyAvgNewPrice: average(newer),
        monthlyAvgAmazonPrice: average(amazon),
        monthlyPriceStdDev: priceStats.stdDev,
        monthlyPriceTrend: priceStats.trend,
        monthlyPriceRange: priceStats.range,
        monthlyPriceUsedForRevenue: selected.price,
        monthlyReviewCountEnd: null,
        monthlyReviewGrowth: null,
        monthlyRatingAvg: null,
        buyboxAvailableRatio: points.length ? buybox.length / points.length : null,
        observationCount: points.length,
        salesRankReference,
        offerCount: rawMeta?.offerCount ?? null,
        offerCsvPointCount: rawMeta?.offerCsvPointCount ?? null,
        liveOffersCount: rawMeta?.liveOffersCount ?? null,
        buyboxEligibleOfferCountTotal: rawMeta?.buyboxEligibleOfferCountTotal ?? null,
        featureWarnings
      });
    }
  }
  return output.sort((a, b) => a.company.localeCompare(b.company) || a.asin.localeCompare(b.asin) || a.month.localeCompare(b.month));
}

function buildCalibrationRows(
  observations: AmazonEstimateLabJungleScoutObservation[],
  keepaFeatures: AmazonEstimateLabKeepaMonthlyFeature[],
  split: SplitPlan
): CalibrationRow[] {
  const featuresByAsinMonth = new Map(keepaFeatures.map((row) => [`${row.asin}:${row.month}`, row]));
  const trainRevenueByAsin = new Map<string, number[]>();
  const trainSalesByAsin = new Map<string, number[]>();
  for (const obs of observations) {
    const splitType = split.train.has(obs.month) ? "train" : split.test.has(obs.month) ? "test" : "holdout";
    if (splitType !== "train") continue;
    if ((obs.monthlyRevenue ?? 0) > 0) {
      if (!trainRevenueByAsin.has(obs.asin)) trainRevenueByAsin.set(obs.asin, []);
      trainRevenueByAsin.get(obs.asin)!.push(obs.monthlyRevenue ?? 0);
    }
    if ((obs.monthlySales ?? 0) > 0) {
      if (!trainSalesByAsin.has(obs.asin)) trainSalesByAsin.set(obs.asin, []);
      trainSalesByAsin.get(obs.asin)!.push(obs.monthlySales ?? 0);
    }
  }
  const asinSummary = new Map<
    string,
    {
      medianRevenue: number | null;
      medianSales: number | null;
      positiveRevenueMonths: number | null;
    }
  >();
  for (const obs of observations) {
    if (!asinSummary.has(obs.asin)) {
      asinSummary.set(obs.asin, {
        medianRevenue: median(trainRevenueByAsin.get(obs.asin) ?? []),
        medianSales: median(trainSalesByAsin.get(obs.asin) ?? []),
        positiveRevenueMonths: (trainRevenueByAsin.get(obs.asin) ?? []).length
      });
    }
  }
  const rows: CalibrationRow[] = [];
  for (const obs of observations) {
    const feature = featuresByAsinMonth.get(`${obs.asin}:${obs.month}`);
    const splitType = split.train.has(obs.month) ? "train" : split.test.has(obs.month) ? "test" : "holdout";
    const asinStats = asinSummary.get(obs.asin) ?? { medianRevenue: null, medianSales: null, positiveRevenueMonths: null };
    const monthSeasonality = monthSeasonalityFromMonth(obs.month);
    rows.push({
      company: obs.company,
      productFamily: obs.productFamily,
      asin: obs.asin,
      productName: obs.productName,
      month: obs.month,
      split: splitType,
      actualSales: obs.monthlySales,
      actualRevenue: obs.monthlyRevenue,
      observedPrice: obs.price,
      observedBsr: obs.bsr,
      monthIndex: monthIndexFromMonth(obs.month),
      monthSin: monthSeasonality.sin,
      monthCos: monthSeasonality.cos,
      keepaMedianBsr: obs.bsr ?? feature?.monthlyMedianBsr ?? null,
      keepaAvgPrice: obs.price ?? feature?.monthlyPriceUsedForRevenue ?? null,
      monthlyPriceStdDev: feature?.monthlyPriceStdDev ?? null,
      monthlyPriceTrend: feature?.monthlyPriceTrend ?? null,
      monthlyPriceRange: feature?.monthlyPriceRange ?? null,
      buyboxRatio: feature?.buyboxAvailableRatio ?? null,
      reviewGrowth: feature?.monthlyReviewGrowth ?? null,
      ratingAvg: obs.rating ?? feature?.monthlyRatingAvg ?? null,
      salesRankReference: feature?.salesRankReference ?? obs.bsr ?? null,
      offerCount: feature?.offerCount ?? null,
      offerCsvPointCount: feature?.offerCsvPointCount ?? null,
      liveOffersCount: feature?.liveOffersCount ?? null,
      buyboxEligibleOfferCountTotal: feature?.buyboxEligibleOfferCountTotal ?? null,
      asinTrainMedianRevenue: asinStats.medianRevenue,
      asinTrainMedianSales: asinStats.medianSales,
      asinTrainPositiveRevenueMonths: asinStats.positiveRevenueMonths
    });
  }
  return rows;
}

function buildAsinBaselines(
  observations: AmazonEstimateLabJungleScoutObservation[],
  split: SplitPlan
): Map<
  string,
  {
    medianRevenue: number | null;
    medianSales: number | null;
    positiveRevenueMonths: number | null;
  }
> {
  const grouped = new Map<string, AmazonEstimateLabJungleScoutObservation[]>();
  for (const obs of observations) {
    if (!split.train.has(obs.month)) continue;
    if (!grouped.has(obs.asin)) grouped.set(obs.asin, []);
    grouped.get(obs.asin)!.push(obs);
  }
  const baselines = new Map<
    string,
    {
      medianRevenue: number | null;
      medianSales: number | null;
      positiveRevenueMonths: number | null;
    }
  >();
  for (const [asin, rows] of grouped.entries()) {
    baselines.set(asin, {
      medianRevenue: median(rows.map((row) => row.monthlyRevenue ?? 0).filter((value) => value > 0)),
      medianSales: median(rows.map((row) => row.monthlySales ?? 0).filter((value) => value > 0)),
      positiveRevenueMonths: rows.filter((row) => (row.monthlyRevenue ?? 0) > 0).length
    });
  }
  return baselines;
}

function searchBestCompanyModel(company: string, trainRows: CalibrationRow[], testRows: CalibrationRow[]): FittedModel {
  const featureCandidates = rankFeatureCandidates(trainRows, [
    "log_bsr",
    "log_price",
    "buybox_ratio",
    "rating_avg",
    "log_review_growth",
    "log_price_stddev",
    "price_trend",
    "price_range",
    "log_offer_count",
    "log_live_offers",
    "log_buybox_eligible_offer_count_total",
    "month_index",
    "month_sin",
    "month_cos"
  ]);
  const priorityFeatures = ["log_asin_train_median_revenue", "log_asin_train_median_sales", "month_sin", "month_cos"];
  const topFeatures = [...new Set([...priorityFeatures, ...featureCandidates.slice(0, Math.min(6, featureCandidates.length))])];
  const subsets = enumerateFeatureSubsets(topFeatures);
  const targetTransforms: TargetTransform[] = ["log1p", "asinh", "sqrt", "raw"];
  const scaleModes: FeatureScaleMode[] = ["none", "zscore", "robust"];
  const lambdas = [1e-6, 1e-4, 1e-2, 0.1, 1];

  const validTrainRows = trainRows.filter((row) => row.actualRevenue !== null && Number.isFinite(row.actualRevenue));
  const validTestRows = testRows.filter((row) => row.actualRevenue !== null && Number.isFinite(row.actualRevenue));

  if (!validTrainRows.length) {
    return makeDemandIndexModel("company", company, null, trainRows, "No valid revenue rows for company model");
  }

  let bestCandidate: SearchCandidate | null = null;
  for (const activeFeatures of subsets) {
    for (const targetTransform of targetTransforms) {
      for (const featureScaleMode of scaleModes) {
        for (const lambda of lambdas) {
          const candidate = fitCandidateCompanyModel(company, trainRows, testRows, activeFeatures, targetTransform, featureScaleMode, lambda);
          if (!candidate) continue;
          if (!bestCandidate || compareCandidateScore(candidate, bestCandidate) < 0) {
            bestCandidate = candidate;
          }
        }
      }
    }
  }

  if (!bestCandidate) {
    return makeDemandIndexModel("company", company, null, trainRows, "No candidate fit converged");
  }

  return bestCandidate.model;
}

function fitCandidateCompanyModel(
  company: string,
  trainRows: CalibrationRow[],
  testRows: CalibrationRow[],
  activeFeatures: string[],
  targetTransform: TargetTransform,
  featureScaleMode: FeatureScaleMode,
  lambda: number
): SearchCandidate | null {
  const validTrainRows = trainRows.filter((row) => row.actualRevenue !== null && row.actualRevenue > 0);
  const validTestRows = testRows.filter((row) => row.actualRevenue !== null && row.actualRevenue > 0);
  if (!activeFeatures.length || !validTrainRows.length) return null;

  const featureStats = computeFeatureStats(validTrainRows, activeFeatures);
  const trainMatrix = buildTransformedMatrix(validTrainRows, activeFeatures, featureStats, featureScaleMode, targetTransform);
  if (!trainMatrix.length || !trainMatrix[0]?.x.length) return null;

  const beta = solveLinearSystem(
    trainMatrix.map((row) => [1, ...row.x]),
    trainMatrix.map((row) => row.y),
    lambda
  );
  if (!beta.length || beta.some((value) => !Number.isFinite(value))) return null;

  const coefficients = coefficientsFromNames(["intercept", ...activeFeatures], beta);
  const trainEvalPredictions = validTrainRows.map((row) => {
    const vector = buildFeatureVector(row, activeFeatures, featureStats, featureScaleMode);
    const raw = (beta[0] ?? 0) + dot(beta.slice(1), vector);
    return inverseTransformTarget(raw, targetTransform);
  });
  const testEvalPredictions = validTestRows.map((row) => {
    const vector = buildFeatureVector(row, activeFeatures, featureStats, featureScaleMode);
    const raw = (beta[0] ?? 0) + dot(beta.slice(1), vector);
    return inverseTransformTarget(raw, targetTransform);
  });

  const trainMetrics = calculateMetrics(
    validTrainRows.map((row) => Math.max(row.actualRevenue ?? 0, 1)),
    trainEvalPredictions.map((value) => Math.max(value ?? 0, 0))
  );
  const testMetrics = calculateMetrics(
    validTestRows.map((row) => Math.max(row.actualRevenue ?? 0, 1)),
    testEvalPredictions.map((value) => Math.max(value ?? 0, 0))
  );

  const allRows = [...validTrainRows, ...validTestRows];
  const points = allRows.map((row, index) => {
    const vector = buildFeatureVector(row, activeFeatures, featureStats, featureScaleMode);
    const rawPrediction = (beta[0] ?? 0) + dot(beta.slice(1), vector);
    const predictedRevenue = inverseTransformTarget(rawPrediction, targetTransform);
    return {
      company: row.company,
      productFamily: row.productFamily,
      asin: row.asin,
      month: row.month,
      split: row.split,
      actualSales: row.actualSales,
      predictedSales: row.keepaAvgPrice && row.keepaAvgPrice > 0 && predictedRevenue !== null ? predictedRevenue / row.keepaAvgPrice : null,
      actualRevenue: row.actualRevenue,
      predictedRevenue,
      priceUsedForRevenue: row.keepaAvgPrice ?? row.observedPrice ?? null
    };
  });

  const model = {
    modelKey: `company:${company}:ridge:${featureScaleMode}:${targetTransform}:lambda${lambda}:${activeFeatures.join("+") || "none"}`,
    scope: "company" as const,
    company,
    productFamily: null,
    modelType: "ridge_search" as const,
    targetMetric: "monthlyRevenue" as const,
    sampleCount: validTrainRows.length,
    trainSampleCount: validTrainRows.length,
    testSampleCount: validTestRows.length,
    selected: false,
    activeFeatures,
    targetTransform,
    featureScaleMode,
    lambda,
    featureStats,
    formula: buildSearchFormula(targetTransform, featureScaleMode, lambda, activeFeatures),
    coefficients,
    metrics: trainMetrics,
    trainMetrics,
    testMetrics,
    confidence: inferConfidence(validTrainRows.length, trainEvalPredictions, trainMetrics.mape),
    notes: [`features=${activeFeatures.join(",") || "none"}`, `target=${targetTransform}`, `scale=${featureScaleMode}`, `lambda=${lambda}`],
    points
  } satisfies FittedModel;

  const score = candidateScore(trainMetrics, testMetrics, activeFeatures.length, lambda);
  return { activeFeatures, targetTransform, featureScaleMode, lambda, score, model };
}

function compareCandidateScore(a: SearchCandidate, b: SearchCandidate) {
  if (a.score !== b.score) return a.score - b.score;
  const aTest = a.model.testMetrics?.mape ?? a.model.metrics.mape ?? Infinity;
  const bTest = b.model.testMetrics?.mape ?? b.model.metrics.mape ?? Infinity;
  if (aTest !== bTest) return aTest - bTest;
  const aR2 = a.model.testMetrics?.r2 ?? a.model.metrics.r2 ?? -Infinity;
  const bR2 = b.model.testMetrics?.r2 ?? b.model.metrics.r2 ?? -Infinity;
  if (aR2 !== bR2) return bR2 - aR2;
  const aSpearman = a.model.testMetrics?.spearman ?? a.model.metrics.spearman ?? -Infinity;
  const bSpearman = b.model.testMetrics?.spearman ?? b.model.metrics.spearman ?? -Infinity;
  return bSpearman - aSpearman;
}

function candidateScore(trainMetrics: AmazonEstimateLabMetrics, testMetrics: AmazonEstimateLabMetrics, featureCount: number, lambda: number) {
  const testMape = testMetrics.mape ?? 9999;
  const testR2 = testMetrics.r2 ?? -999;
  const testSpearman = testMetrics.spearman ?? -1;
  const trainMape = trainMetrics.mape ?? 9999;
  const complexityPenalty = featureCount * 0.25 + Math.log10(lambda + 1e-12) * 0.05;
  const stabilityPenalty = Math.max(0, trainMape - testMape) * 0.01;
  return testMape + Math.max(0, -testR2) * 25 + Math.max(0, 1 - testSpearman) * 10 + complexityPenalty + stabilityPenalty;
}

function enumerateFeatureSubsets(features: string[]) {
  const output: string[][] = [];
  const total = 1 << features.length;
  for (let mask = 1; mask < total; mask++) {
    const subset = features.filter((_, index) => (mask & (1 << index)) !== 0);
    output.push(subset);
  }
  return output;
}

function rankFeatureCandidates(rows: CalibrationRow[], features: string[]) {
  const target = rows.map((row) => Math.log1p(Math.max(row.actualRevenue ?? 0, 1)));
  return [...features]
    .map((feature) => {
      const values = rows.map((row) => baseFeatureValue(row, feature));
      const corr = pearson(values, target);
      return { feature, score: Math.abs(corr ?? 0) };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.feature);
}

function computeFeatureStats(rows: CalibrationRow[], features: string[]) {
  const stats: Record<string, FeatureStat> = {};
  for (const feature of features) {
    const values = rows.map((row) => baseFeatureValue(row, feature)).filter((value) => Number.isFinite(value));
    const mean = values.length ? average(values) : null;
    const med = median(values);
    const std = values.length ? Math.sqrt(average(values.map((value) => Math.pow(value - (mean ?? 0), 2)))) : null;
    const mad = values.length ? median(values.map((value) => Math.abs(value - (med ?? 0)))) : null;
    stats[feature] = {
      mean,
      std,
      median: med,
      mad
    };
  }
  return stats;
}

function buildTransformedMatrix(
  rows: CalibrationRow[],
  activeFeatures: string[],
  featureStats: Record<string, FeatureStat>,
  featureScaleMode: FeatureScaleMode,
  targetTransform: TargetTransform
) {
  const matrix: Array<{ x: number[]; y: number }> = [];
  for (const row of rows) {
    const yRaw = row.actualRevenue ?? 0;
    if (!Number.isFinite(yRaw) || yRaw < 0) continue;
    const y = transformTarget(yRaw, targetTransform);
    if (!Number.isFinite(y)) continue;
    const x = activeFeatures.map((feature) => scaleFeatureValue(baseFeatureValue(row, feature), featureStats[feature], featureScaleMode));
    matrix.push({ x, y });
  }
  return matrix;
}

function buildFeatureVector(
  row: CalibrationRow,
  activeFeatures: string[],
  featureStats: Record<string, FeatureStat>,
  featureScaleMode: FeatureScaleMode
) {
  return activeFeatures.map((feature) => scaleFeatureValue(baseFeatureValue(row, feature), featureStats[feature], featureScaleMode));
}

function baseFeatureValue(row: CalibrationRow, feature: string) {
  if (feature === "log_asin_train_median_revenue") return Math.log1p(row.asinTrainMedianRevenue ?? 0);
  if (feature === "log_asin_train_median_sales") return Math.log1p(row.asinTrainMedianSales ?? 0);
  if (feature === "log_bsr") return Math.log1p(row.keepaMedianBsr ?? row.observedBsr ?? 0);
  if (feature === "log_price") return Math.log1p(row.keepaAvgPrice ?? row.observedPrice ?? 0);
  if (feature === "buybox_ratio") return row.buyboxRatio ?? 0;
  if (feature === "rating_avg") return row.ratingAvg ?? 0;
  if (feature === "log_review_growth") {
    const value = row.reviewGrowth ?? 0;
    return Math.sign(value) * Math.log1p(Math.abs(value));
  }
  if (feature === "log_price_stddev") return Math.log1p(Math.max(0, row.monthlyPriceStdDev ?? 0));
  if (feature === "price_trend") return row.monthlyPriceTrend ?? 0;
  if (feature === "price_range") return Math.log1p(Math.max(0, row.monthlyPriceRange ?? 0));
  if (feature === "log_offer_count") return Math.log1p(row.offerCount ?? 0);
  if (feature === "log_live_offers") return Math.log1p(row.liveOffersCount ?? 0);
  if (feature === "log_buybox_eligible_offer_count_total") return Math.log1p(row.buyboxEligibleOfferCountTotal ?? 0);
  return 0;
}

function scaleFeatureValue(value: number, stat: FeatureStat | undefined, mode: FeatureScaleMode) {
  if (mode === "none") return value;
  if (!stat) return value;
  if (mode === "zscore") {
    const std = stat.std && Math.abs(stat.std) > 1e-9 ? stat.std : 1;
    return ((value - (stat.mean ?? 0)) / std) || 0;
  }
  const mad = stat.mad && Math.abs(stat.mad) > 1e-9 ? stat.mad * 1.4826 : 1;
  return ((value - (stat.median ?? 0)) / mad) || 0;
}

function transformTarget(value: number, transform: TargetTransform) {
  if (transform === "raw") return value;
  if (transform === "asinh") return Math.asinh(value);
  if (transform === "sqrt") return Math.sqrt(Math.max(0, value));
  return Math.log1p(Math.max(0, value));
}

function inverseTransformTarget(value: number, transform: TargetTransform) {
  if (!Number.isFinite(value)) return null;
  if (transform === "raw") return Math.max(0, value);
  if (transform === "asinh") return Math.sinh(value);
  if (transform === "sqrt") return Math.max(0, value) * Math.max(0, value);
  return Math.max(0, Math.expm1(value));
}

function buildSearchFormula(transform: TargetTransform, scaleMode: FeatureScaleMode, lambda: number, activeFeatures: string[]) {
  return `target=${transform}; scale=${scaleMode}; lambda=${lambda}; features=${activeFeatures.join("+") || "none"}`;
}

function fitAllModels(trainRows: CalibrationRow[], testRows: CalibrationRow[]): FittedModel[] {
  const companies = [...new Set(trainRows.map((row) => row.company))].sort();
  return companies.map((company) => searchBestCompanyModel(company, trainRows.filter((row) => row.company === company), testRows.filter((row) => row.company === company)));
}

function attachSplitMetrics(model: FittedModel, trainRows: CalibrationRow[], testRows: CalibrationRow[]): FittedModel {
  const trainMetrics = evaluateModel(model, trainRows);
  const testMetrics = evaluateModel(model, testRows);
  const trainPredictions = trainRows.map((row) => predictCalibrationRow(model, row).revenue).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return {
    ...model,
    sampleCount: trainRows.length,
    trainSampleCount: trainRows.length,
    testSampleCount: testRows.length,
    metrics: trainMetrics,
    trainMetrics,
    testMetrics,
    confidence: inferConfidence(trainRows.length, trainPredictions, trainMetrics.mape)
  };
}

function evaluateModel(model: FittedModel, rows: CalibrationRow[]): AmazonEstimateLabMetrics {
  const pairs = rows
    .map((row) => {
      const prediction = predictCalibrationRow(model, row).revenue;
      const actual = row.actualRevenue;
      if (actual === null || prediction === null || !Number.isFinite(actual) || !Number.isFinite(prediction)) return null;
      return { actual, predicted: prediction };
    })
    .filter((pair): pair is { actual: number; predicted: number } => Boolean(pair));
  if (!pairs.length) return { mape: null, rmse: null, mae: null, r2: null, spearman: null };
  const mape = average(pairs.map((pair) => Math.abs((pair.predicted - pair.actual) / Math.max(pair.actual, 1)))) * 100;
  const mae = average(pairs.map((pair) => Math.abs(pair.predicted - pair.actual)));
  const rmse = Math.sqrt(average(pairs.map((pair) => Math.pow(pair.predicted - pair.actual, 2))));
  const meanActual = average(pairs.map((pair) => pair.actual));
  const sst = pairs.reduce((sumValue, pair) => sumValue + Math.pow(pair.actual - meanActual, 2), 0);
  const sse = pairs.reduce((sumValue, pair) => sumValue + Math.pow(pair.predicted - pair.actual, 2), 0);
  const r2 = sst === 0 ? null : 1 - sse / sst;
  const spearman = spearmanCorrelation(
    pairs.map((pair) => pair.actual),
    pairs.map((pair) => pair.predicted)
  );
  return { mape, rmse, mae, r2, spearman };
}

function chooseSelectedCompanyModels(models: FittedModel[], trainRows: CalibrationRow[], testRows: CalibrationRow[], catalog: CatalogRow[]): AmazonEstimateLabSelectedModel[] {
  const companies = [...new Set(catalog.map((row) => row.company))].sort();
  const selected: AmazonEstimateLabSelectedModel[] = [];
  for (const company of companies) {
    const companyTrainRows = trainRows.filter((row) => row.company === company);
    const companyModel = models.find((model) => model.scope === "company" && model.company === company);
    const globalModel = models.find((model) => model.scope === "global");
    const preferred = selectPreferredCompanyModel(companyModel, globalModel, companyTrainRows.length, trainRows.length);
    selected.push({
      company,
      productFamily: null,
      modelKey: preferred.modelKey,
      scope: preferred.scope,
      modelType: preferred.modelType,
      targetMetric: preferred.targetMetric,
      sampleCount: preferred.sampleCount,
      trainSampleCount: preferred.trainSampleCount,
      testSampleCount: preferred.testSampleCount,
      confidence: preferred.confidence,
      formula: preferred.formula,
      coefficients: preferred.coefficients,
      metrics: preferred.metrics,
      trainMetrics: preferred.trainMetrics,
      testMetrics: preferred.testMetrics,
      reason:
        preferred.modelType === "demand_index_only"
          ? "Insufficient company sample for a calibrated fit; using demand index fallback."
          : preferred.scope === "company"
            ? "Selected company-wide model so all products share one feature set."
            : "Selected global model because company coverage was too thin."
    });
  }
  return selected;
}

function buildMonthlyEstimates(
  observations: AmazonEstimateLabJungleScoutObservation[],
  keepaFeatures: AmazonEstimateLabKeepaMonthlyFeature[],
  selectedModelMap: Map<string, AmazonEstimateLabSelectedModel>,
  observationsByAsinMonth: Map<string, AmazonEstimateLabJungleScoutObservation>,
  split: SplitPlan,
  seasonalAdjustmentMap: Map<string, number>
): AmazonEstimateLabMonthlyEstimate[] {
  const output: AmazonEstimateLabMonthlyEstimate[] = [];
  const keepaByAsin = groupBy(keepaFeatures, (row) => row.asin);
  const obsByAsin = groupBy(observations, (row) => row.asin);
  const currentMonth = new Date().toISOString().slice(0, 7);

  for (const [asin, featureRows] of keepaByAsin.entries()) {
    const sortedFeatures = [...featureRows].sort((a, b) => a.month.localeCompare(b.month));
    const asinObservations = [...(obsByAsin.get(asin) ?? [])].sort((a, b) => a.month.localeCompare(b.month));
    const firstObservedMonth = asinObservations[0]?.month ?? null;
    const hasObservedMonths = asinObservations.length > 0;
    const selected = selectedModelMap.get(sortedFeatures[0].company) ?? null;
    const baseRevenue = selected
      ? median(
          sortedFeatures.map((feature) => {
            const obs = observationsByAsinMonth.get(`${asin}:${feature.month}`) ?? null;
            const prediction = selected ? predictWithModel(selected, feature, obs) : fallbackPrediction(feature, obs);
            const seasonalFactor = seasonalAdjustmentMap.get(`${feature.company}:${monthOfYear(feature.month)}`) ?? 1;
            return prediction.revenue === null ? null : prediction.revenue * seasonalFactor;
          })
        )
      : null;

    for (const feature of sortedFeatures) {
      const obs = observationsByAsinMonth.get(`${asin}:${feature.month}`) ?? null;
      const prediction = selected ? predictWithModel(selected, feature, obs) : fallbackPrediction(feature, obs);
      const seasonalFactor = seasonalAdjustmentMap.get(`${feature.company}:${monthOfYear(feature.month)}`) ?? 1;
      const adjustedRevenue = prediction.revenue === null ? null : prediction.revenue * seasonalFactor;
      const adjustedSales = prediction.sales === null ? null : prediction.sales * seasonalFactor;
      const splitType = split.train.has(feature.month) ? "train" : split.test.has(feature.month) ? "test" : "holdout";
      const demandIndex =
        baseRevenue && adjustedRevenue !== null && baseRevenue > 0
          ? (adjustedRevenue / baseRevenue) * 100
          : feature.monthlyMedianBsr && feature.monthlyMedianBsr > 0
            ? ((feature.salesRankReference ?? feature.monthlyMedianBsr) / feature.monthlyMedianBsr) * 100
            : null;

      if (obs) {
        output.push({
          company: obs.company,
          productFamily: obs.productFamily,
          asin,
          productName: obs.productName,
          month: obs.month,
          split: splitType,
          kind: "observed_jungle_scout_estimate",
          actualSales: obs.monthlySales,
          actualRevenue: obs.monthlyRevenue,
          observedPrice: obs.price,
          observedBsr: obs.bsr,
          rawPredictedSales: prediction.sales,
          rawPredictedRevenue: prediction.revenue,
          predictedSales: adjustedSales,
          predictedRevenue: adjustedRevenue,
          seasonalAdjustmentFactor: seasonalFactor,
          demandIndex,
          priceUsedForRevenue: prediction.priceUsedForRevenue,
          confidence: prediction.confidence,
          modelKey: selected?.modelKey ?? null,
          modelType: selected?.modelType ?? null,
          notes: [...prediction.notes, ...(obs.monthlySales === null ? ["monthly_sales_missing"] : [])]
        });
      } else if (firstObservedMonth && feature.month < firstObservedMonth) {
        output.push({
          company: feature.company,
          productFamily: feature.productFamily,
          asin,
          productName: feature.productName,
          month: feature.month,
          split: splitType,
          kind: "keepa_backcast_estimate",
          actualSales: null,
          actualRevenue: null,
          observedPrice: feature.monthlyPriceUsedForRevenue,
          observedBsr: feature.monthlyMedianBsr,
          predictedSales: prediction.sales,
          predictedRevenue: prediction.revenue,
          demandIndex,
          priceUsedForRevenue: prediction.priceUsedForRevenue,
          confidence: prediction.confidence,
          modelKey: selected?.modelKey ?? null,
          modelType: selected?.modelType ?? null,
          notes: prediction.notes
        });
      } else if (feature.month === currentMonth) {
        continue;
      } else {
        output.push({
          company: feature.company,
          productFamily: feature.productFamily,
          asin,
          productName: feature.productName,
          month: feature.month,
          split: splitType,
          kind: hasObservedMonths ? "model_fitted_estimate" : "keepa_backcast_estimate",
          actualSales: null,
          actualRevenue: null,
          observedPrice: feature.monthlyPriceUsedForRevenue,
          observedBsr: feature.monthlyMedianBsr,
          rawPredictedSales: prediction.sales,
          rawPredictedRevenue: prediction.revenue,
          predictedSales: adjustedSales,
          predictedRevenue: adjustedRevenue,
          seasonalAdjustmentFactor: seasonalFactor,
          demandIndex,
          priceUsedForRevenue: prediction.priceUsedForRevenue,
          confidence: prediction.confidence,
          modelKey: selected?.modelKey ?? null,
          modelType: selected?.modelType ?? null,
          notes: prediction.notes
        });
      }
    }
  }

  return output.sort((a, b) => a.company.localeCompare(b.company) || a.asin.localeCompare(b.asin) || a.month.localeCompare(b.month) || a.kind.localeCompare(b.kind));
}

function buildSeasonalAdjustmentMap(
  keepaFeatures: AmazonEstimateLabKeepaMonthlyFeature[],
  selectedModelMap: Map<string, AmazonEstimateLabSelectedModel>,
  observationsByAsinMonth: Map<string, AmazonEstimateLabJungleScoutObservation>,
  split: SplitPlan
) {
  const sums = new Map<string, number[]>();
  const keepaByAsin = groupBy(keepaFeatures, (row) => row.asin);
  for (const [asin, featureRows] of keepaByAsin.entries()) {
    const selected = selectedModelMap.get(featureRows[0].company) ?? null;
    if (!selected) continue;
    for (const feature of featureRows) {
      const obs = observationsByAsinMonth.get(`${asin}:${feature.month}`) ?? null;
      if (!obs || !split.train.has(feature.month)) continue;
      const prediction = predictWithModel(selected, feature, obs);
      if (prediction.revenue === null || !Number.isFinite(prediction.revenue) || prediction.revenue <= 0) continue;
      if (obs.monthlyRevenue === null || !Number.isFinite(obs.monthlyRevenue) || obs.monthlyRevenue <= 0) continue;
      const key = `${feature.company}:${monthOfYear(feature.month)}`;
      if (!sums.has(key)) sums.set(key, []);
      sums.get(key)!.push(obs.monthlyRevenue / prediction.revenue);
    }
  }

  const adjustment = new Map<string, number>();
  for (const [key, values] of sums.entries()) {
    const med = median(values);
    if (med !== null && Number.isFinite(med)) {
      adjustment.set(key, clamp(med, 0.45, 2.5));
    }
  }
  return adjustment;
}

function buildQuarterlyCompanyEstimates(rows: AmazonEstimateLabMonthlyEstimate[]): AmazonEstimateLabQuarterlyEstimate[] {
  const grouped = groupBy(
    rows.filter((row) => row.predictedRevenue !== null || row.actualRevenue !== null),
    (row) => `${row.company}:${monthToQuarter(row.month)}`
  );
  const output: AmazonEstimateLabQuarterlyEstimate[] = [];
  for (const [key, items] of grouped.entries()) {
    const [company, quarter] = key.split(":");
    const estimatedRevenue = sum(items.map((item) => item.predictedRevenue ?? item.actualRevenue));
    const estimatedSales = sum(items.map((item) => item.predictedSales ?? item.actualSales));
    const observedRevenue = sum(items.filter((item) => item.kind === "observed_jungle_scout_estimate").map((item) => item.actualRevenue));
    const backcastRevenue = sum(items.filter((item) => item.kind === "keepa_backcast_estimate").map((item) => item.predictedRevenue));
    const fittedRevenue = sum(items.filter((item) => item.kind === "observed_jungle_scout_estimate").map((item) => item.predictedRevenue));
    output.push({
      company,
      quarter,
      estimatedAmazonRevenueUsd: estimatedRevenue,
      estimatedAmazonSalesUnits: estimatedSales,
      backcastEstimatedRevenueUsd: backcastRevenue,
      fittedEstimatedRevenueUsd: fittedRevenue,
      observedJungleScoutRevenueUsd: observedRevenue,
      monthsPresent: new Set(items.map((item) => item.month)).size,
      confidence: inferConfidence(items.length, items.map((item) => item.predictedRevenue))
    });
  }
  return output.sort((a, b) => a.company.localeCompare(b.company) || a.quarter.localeCompare(b.quarter));
}

function buildDartComparison(quarterlyEstimates: AmazonEstimateLabQuarterlyEstimate[], dartRows: DartRow[]): AmazonEstimateLabDartComparison[] {
  const dartMap = new Map<string, number>();
  for (const row of dartRows) {
    const company = companyFromLabel(stringFrom(row.company) ?? stringFrom(row.company_label) ?? "");
    const quarter = stringFrom(row.quarter);
    const revenue = toNumber(row.revenue_krw);
    if (!company || !quarter || revenue === null) continue;
    dartMap.set(`${company}:${quarter}`, revenue);
  }

  const output: AmazonEstimateLabDartComparison[] = [];
  const companies = [...new Set(quarterlyEstimates.map((row) => row.company))].sort();
  for (const company of companies) {
    const companyRows = quarterlyEstimates.filter((row) => row.company === company);
    const firstAmazon = companyRows.find((row) => row.estimatedAmazonRevenueUsd !== null)?.estimatedAmazonRevenueUsd ?? null;
    const firstDartQuarter = companyRows.map((row) => row.quarter).find((quarter) => dartMap.has(`${company}:${quarter}`)) ?? null;
    const firstDart = firstDartQuarter ? dartMap.get(`${company}:${firstDartQuarter}`) ?? null : null;
    for (const row of companyRows) {
      const dart = dartMap.get(`${company}:${row.quarter}`) ?? null;
      const estimatedKrw = row.estimatedAmazonRevenueUsd === null ? null : row.estimatedAmazonRevenueUsd * 1350;
      output.push({
        company,
        quarter: row.quarter,
        estimatedAmazonRevenueUsd: row.estimatedAmazonRevenueUsd,
        estimatedAmazonRevenueKrw: estimatedKrw,
        dartRevenueKrw: dart,
        estimatedIndex: firstAmazon && row.estimatedAmazonRevenueUsd !== null ? (row.estimatedAmazonRevenueUsd / firstAmazon) * 100 : null,
        dartIndex: firstDart && dart !== null ? (dart / firstDart) * 100 : null,
        indexGap:
          firstAmazon && firstDart && row.estimatedAmazonRevenueUsd !== null && dart !== null
            ? (row.estimatedAmazonRevenueUsd / firstAmazon) * 100 - (dart / firstDart) * 100
            : null,
        revenueRatio: dart && estimatedKrw ? estimatedKrw / dart : null,
        monthsPresent: row.monthsPresent,
        confidence: row.confidence
      });
    }
  }
  return output.sort((a, b) => a.company.localeCompare(b.company) || a.quarter.localeCompare(b.quarter));
}

function buildWarnings(
  catalog: CatalogRow[],
  observations: AmazonEstimateLabJungleScoutObservation[],
  keepaFeatures: AmazonEstimateLabKeepaMonthlyFeature[],
  selected: AmazonEstimateLabSelectedModel[],
  dartComparison: AmazonEstimateLabDartComparison[]
): AmazonEstimateLabWarning[] {
  const warnings: AmazonEstimateLabWarning[] = [];
  const keepaAsins = new Set(keepaFeatures.map((row) => row.asin));
  const obsAsins = new Set(observations.map((row) => row.asin));
  for (const row of catalog.filter((item) => !keepaAsins.has(item.asin)).slice(0, 25)) {
    warnings.push({
      company: row.company,
      productFamily: row.productFamily,
      asin: row.asin,
      month: null,
      message: "No Keepa/Keepamore lab series available for this ASIN in local raw data."
    });
  }
  if (!selected.length) {
    warnings.push({
      company: null,
      productFamily: null,
      asin: null,
      month: null,
      message: "No calibration sample met the minimum threshold for model selection."
    });
  }
  if (!dartComparison.length) {
    warnings.push({
      company: null,
      productFamily: null,
      asin: null,
      month: null,
      message: "DART comparison is unavailable."
    });
  }
  if (obsAsins.size < catalog.length) {
    warnings.push({
      company: null,
      productFamily: null,
      asin: null,
      month: null,
      message: "Not every catalog ASIN has Jungle Scout observations."
    });
  }
  return warnings;
}

function fitModel(
  scope: "global" | "company" | "family",
  company: string | null,
  productFamily: string | null,
  rows: CalibrationRow[],
  modelType: "simple_power_law" | "log_linear" | "family_adjusted"
): FittedModel {
  const validRows = rows.filter((row) => row.actualRevenue !== null && row.actualRevenue > 0 && row.keepaMedianBsr !== null && row.keepaMedianBsr > 0);
  if (validRows.length < 4) {
    return makeDemandIndexModel(scope, company, productFamily, rows, "Insufficient valid calibration rows");
  }

  const activeFeatures = chooseFeatures(validRows);
  if (!activeFeatures.length) {
    return makeDemandIndexModel(scope, company, productFamily, rows, "No usable calibration features");
  }

  const design = validRows.map((row) => buildDesignRow(row, activeFeatures));
  const beta = solveLinearSystem(
    design.map((row) => [1, ...row.x]),
    design.map((row) => row.y)
  );
  const coefficients = coefficientsFromNames(["intercept", ...activeFeatures], beta);
  const predictions = design.map((row) => predictFromBeta(row, beta));
  const actuals = design.map((row) => Math.max(row.actualRevenue ?? 0, 1));
  const metrics = calculateMetrics(actuals, predictions);
  const points = validRows.map((row, index) => ({
    company: row.company,
    productFamily: row.productFamily,
    asin: row.asin,
    month: row.month,
    split: row.split,
    actualSales: row.actualSales,
    predictedSales: row.keepaAvgPrice && row.keepaAvgPrice > 0 ? predictions[index] / row.keepaAvgPrice : null,
    actualRevenue: row.actualRevenue,
    predictedRevenue: predictions[index],
    priceUsedForRevenue: row.keepaAvgPrice ?? row.observedPrice ?? null
  }));

  return {
    modelKey: `${scope}:${company ?? "all"}:${productFamily ?? "all"}:${modelType}`,
    scope,
    company,
    productFamily,
    modelType,
    targetMetric: "monthlyRevenue",
    sampleCount: validRows.length,
    trainSampleCount: validRows.length,
    testSampleCount: 0,
    selected: false,
    formula: buildFormula(modelType, activeFeatures, scope),
    coefficients,
    metrics,
    trainMetrics: metrics,
    testMetrics: undefined,
    confidence: inferConfidence(validRows.length, predictions, metrics.mape),
    notes: [`active_features=${activeFeatures.join(",")}`],
    points
  };
}

function makeDemandIndexModel(
  scope: "global" | "company" | "family",
  company: string | null,
  productFamily: string | null,
  rows: CalibrationRow[],
  reason: string
): FittedModel {
  const sampleCount = rows.length;
  const baseBsr = rows.find((row) => row.keepaMedianBsr && row.keepaMedianBsr > 0)?.keepaMedianBsr ?? 1;
  const points = rows.map((row) => ({
    company: row.company,
    productFamily: row.productFamily,
    asin: row.asin,
    month: row.month,
    split: row.split,
    actualSales: row.actualSales,
    predictedSales: row.keepaMedianBsr && row.keepaMedianBsr > 0 ? (baseBsr / row.keepaMedianBsr) * 100 : null,
    actualRevenue: row.actualRevenue,
    predictedRevenue: row.keepaMedianBsr && row.keepaMedianBsr > 0 ? ((baseBsr / row.keepaMedianBsr) * 100) * (row.keepaAvgPrice ?? row.observedPrice ?? 0) : null,
    priceUsedForRevenue: row.keepaAvgPrice ?? row.observedPrice ?? null
  }));
  return {
    modelKey: `${scope}:${company ?? "all"}:${productFamily ?? "all"}:demand_index_only`,
    scope,
    company,
    productFamily,
    modelType: "demand_index_only",
    targetMetric: "monthlyRevenue",
    sampleCount,
    trainSampleCount: sampleCount,
    testSampleCount: 0,
    selected: false,
    formula: "demand_index = base_bsr / current_bsr * 100",
    coefficients: { base_bsr: baseBsr },
    metrics: { mape: null, rmse: null, mae: null, r2: null, spearman: null },
    confidence: sampleCount >= 12 ? "low" : "not_enough_data",
    notes: [reason],
    points,
    trainMetrics: { mape: null, rmse: null, mae: null, r2: null, spearman: null },
    testMetrics: undefined
  };
}

function chooseFeatures(rows: CalibrationRow[]) {
  const candidates = [
    "log_asin_train_median_revenue",
    "log_asin_train_median_sales",
    "log_bsr",
    "log_price",
    "buybox_ratio",
    "rating_avg",
    "log_review_growth",
    "log_price_stddev",
    "price_trend",
    "price_range",
    "log_offer_count",
    "log_live_offers",
    "log_buybox_eligible_offer_count_total",
    "month_index",
    "month_sin",
    "month_cos"
  ];
  return candidates.filter((key) => {
    if (key === "log_asin_train_median_revenue") return rows.some((row) => row.asinTrainMedianRevenue !== null && row.asinTrainMedianRevenue > 0);
    if (key === "log_asin_train_median_sales") return rows.some((row) => row.asinTrainMedianSales !== null && row.asinTrainMedianSales > 0);
    if (key === "log_bsr") return rows.some((row) => row.keepaMedianBsr !== null && row.keepaMedianBsr > 0);
    if (key === "log_price") return rows.some((row) => (row.keepaAvgPrice ?? row.observedPrice) !== null && (row.keepaAvgPrice ?? row.observedPrice)! > 0);
    if (key === "buybox_ratio") return rows.some((row) => row.buyboxRatio !== null);
    if (key === "rating_avg") return rows.some((row) => row.ratingAvg !== null);
    if (key === "log_review_growth") return rows.some((row) => row.reviewGrowth !== null);
    if (key === "log_price_stddev") return rows.some((row) => row.monthlyPriceStdDev !== null);
    if (key === "price_trend") return rows.some((row) => row.monthlyPriceTrend !== null);
    if (key === "price_range") return rows.some((row) => row.monthlyPriceRange !== null);
    if (key === "log_offer_count") return rows.some((row) => row.offerCount !== null);
    if (key === "log_live_offers") return rows.some((row) => row.liveOffersCount !== null);
    if (key === "log_buybox_eligible_offer_count_total") return rows.some((row) => row.buyboxEligibleOfferCountTotal !== null);
    if (key === "month_index") return rows.some((row) => row.monthIndex !== null);
    if (key === "month_sin") return rows.some((row) => row.monthSin !== null);
    if (key === "month_cos") return rows.some((row) => row.monthCos !== null);
    return false;
  });
}

function buildDesignRow(row: CalibrationRow, activeFeatures: string[]) {
  const x: number[] = [];
  for (const feature of activeFeatures) {
    if (feature === "log_asin_train_median_revenue") {
      x.push(Math.log1p(row.asinTrainMedianRevenue ?? 0));
    } else if (feature === "log_asin_train_median_sales") {
      x.push(Math.log1p(row.asinTrainMedianSales ?? 0));
    } else if (feature === "log_bsr") {
      x.push(Math.log1p(row.keepaMedianBsr ?? row.observedBsr ?? 0));
    } else if (feature === "log_price") {
      x.push(Math.log1p(row.keepaAvgPrice ?? row.observedPrice ?? 0));
    } else if (feature === "buybox_ratio") {
      x.push(row.buyboxRatio ?? 0);
    } else if (feature === "rating_avg") {
      x.push(row.ratingAvg ?? 0);
    } else if (feature === "log_review_growth") {
      const value = row.reviewGrowth ?? 0;
      x.push(Math.sign(value) * Math.log1p(Math.abs(value)));
    } else if (feature === "log_price_stddev") {
      x.push(Math.log1p(Math.max(0, row.monthlyPriceStdDev ?? 0)));
    } else if (feature === "price_trend") {
      x.push(row.monthlyPriceTrend ?? 0);
    } else if (feature === "price_range") {
      x.push(Math.log1p(Math.max(0, row.monthlyPriceRange ?? 0)));
    } else if (feature === "log_offer_count") {
      x.push(Math.log1p(row.offerCount ?? 0));
    } else if (feature === "log_live_offers") {
      x.push(Math.log1p(row.liveOffersCount ?? 0));
    } else if (feature === "log_buybox_eligible_offer_count_total") {
      x.push(Math.log1p(row.buyboxEligibleOfferCountTotal ?? 0));
    } else if (feature === "month_index") {
      x.push(row.monthIndex ?? 0);
    } else if (feature === "month_sin") {
      x.push(row.monthSin ?? 0);
    } else if (feature === "month_cos") {
      x.push(row.monthCos ?? 0);
    }
  }

  return {
    y: Math.log1p(row.actualRevenue ?? 0),
    x,
    actualSales: row.actualSales,
    actualRevenue: row.actualRevenue,
    priceUsedForRevenue: row.keepaAvgPrice ?? row.observedPrice ?? null,
    company: row.company,
    productFamily: row.productFamily,
    asin: row.asin,
    month: row.month
  };
}

function predictWithModel(
  selected: AmazonEstimateLabSelectedModel,
  feature: AmazonEstimateLabKeepaMonthlyFeature,
  obs: AmazonEstimateLabJungleScoutObservation | null
): Prediction {
  if (selected.modelType === "demand_index_only") {
    const baseBsr = selected.coefficients.base_bsr ?? feature.monthlyMedianBsr ?? feature.salesRankReference ?? null;
    const currentBsr = feature.monthlyMedianBsr ?? feature.salesRankReference ?? null;
    if (!baseBsr || !currentBsr || currentBsr <= 0) {
      return {
        sales: null,
        revenue: null,
        priceUsedForRevenue: feature.monthlyPriceUsedForRevenue ?? obs?.price ?? null,
        demandIndex: null,
        confidence: "not_enough_data",
        notes: ["demand_index_unavailable"]
      };
    }
    const sales = (baseBsr / currentBsr) * 100;
    const price = feature.monthlyPriceUsedForRevenue ?? obs?.price ?? null;
    return {
      sales,
      revenue: price === null ? null : sales * price,
      priceUsedForRevenue: price,
      demandIndex: sales,
      confidence: selected.confidence,
      notes: ["demand_index_only"]
    };
  }

  const activeFeatures = selected.activeFeatures?.length ? selected.activeFeatures : Object.keys(selected.coefficients).filter((name) => name !== "intercept");
  const scaleMode = selected.featureScaleMode ?? "none";
  const targetTransform = selected.targetTransform ?? "log1p";
  const featureStats = selected.featureStats ?? {};
  const x = activeFeatures.map((key) =>
    scaleFeatureValue(getFeatureValueFromKeepa(feature, obs, key), featureStats[key], scaleMode)
  );
  const beta = activeFeatures.map((name) => selected.coefficients[name] ?? 0);
  const price = feature.monthlyPriceUsedForRevenue ?? obs?.price ?? null;
  const revenue = inverseTransformTarget((selected.coefficients.intercept ?? 0) + dot(beta, x), targetTransform);
  const sales = price && price > 0 && revenue !== null ? revenue / price : null;
  return {
    sales,
    revenue,
    priceUsedForRevenue: price,
    demandIndex: null,
    confidence: selected.confidence,
    notes: []
  };
}

function getFeatureValueFromKeepa(
  feature: AmazonEstimateLabKeepaMonthlyFeature,
  obs: AmazonEstimateLabJungleScoutObservation | null,
  key: string
) {
  if (key === "log_asin_train_median_revenue") return Math.log1p(feature.asinTrainMedianRevenue ?? 0);
  if (key === "log_asin_train_median_sales") return Math.log1p(feature.asinTrainMedianSales ?? 0);
  if (key === "log_bsr") return Math.log1p(feature.monthlyMedianBsr ?? feature.monthlyAvgBsr ?? feature.salesRankReference ?? obs?.bsr ?? 0);
  if (key === "log_price") return Math.log1p(feature.monthlyPriceUsedForRevenue ?? obs?.price ?? 0);
  if (key === "buybox_ratio") return feature.buyboxAvailableRatio ?? 0;
  if (key === "rating_avg") return feature.monthlyRatingAvg ?? obs?.rating ?? 0;
  if (key === "log_review_growth") {
    const value = feature.monthlyReviewGrowth ?? 0;
    return Math.sign(value) * Math.log1p(Math.abs(value));
  }
  if (key === "log_price_stddev") return Math.log1p(Math.max(0, feature.monthlyPriceStdDev ?? 0));
  if (key === "price_trend") return feature.monthlyPriceTrend ?? 0;
  if (key === "price_range") return Math.log1p(Math.max(0, feature.monthlyPriceRange ?? 0));
  if (key === "log_offer_count") return Math.log1p(feature.offerCount ?? 0);
  if (key === "log_live_offers") return Math.log1p(feature.liveOffersCount ?? 0);
  if (key === "log_buybox_eligible_offer_count_total") return Math.log1p(feature.buyboxEligibleOfferCountTotal ?? 0);
  if (key === "month_index") return monthIndexFromMonth(feature.month);
  if (key === "month_sin") return monthSeasonalityFromMonth(feature.month).sin;
  if (key === "month_cos") return monthSeasonalityFromMonth(feature.month).cos;
  return 0;
}

function predictCalibrationRow(model: FittedModel, row: CalibrationRow): Prediction {
  const syntheticFeature: AmazonEstimateLabKeepaMonthlyFeature = {
    company: row.company,
    productFamily: row.productFamily,
    asin: row.asin,
    productName: row.productName,
    month: row.month,
    monthlyMedianBsr: row.keepaMedianBsr ?? row.observedBsr,
    monthlyAvgBsr: row.keepaMedianBsr ?? row.observedBsr,
    monthlyBestBsr: row.keepaMedianBsr ?? row.observedBsr,
    monthlyWorstBsr: row.keepaMedianBsr ?? row.observedBsr,
    monthlyAvgBuyboxPrice: row.keepaAvgPrice ?? row.observedPrice,
    monthlyAvgNewPrice: row.keepaAvgPrice ?? row.observedPrice,
    monthlyAvgAmazonPrice: row.keepaAvgPrice ?? row.observedPrice,
    monthlyPriceStdDev: row.monthlyPriceStdDev,
    monthlyPriceTrend: row.monthlyPriceTrend,
    monthlyPriceRange: row.monthlyPriceRange,
    monthlyPriceUsedForRevenue: row.keepaAvgPrice ?? row.observedPrice,
    monthlyReviewCountEnd: null,
    monthlyReviewGrowth: row.reviewGrowth,
    monthlyRatingAvg: row.ratingAvg,
    buyboxAvailableRatio: row.buyboxRatio,
    offerCount: row.offerCount,
    offerCsvPointCount: row.offerCsvPointCount,
    liveOffersCount: row.liveOffersCount,
    buyboxEligibleOfferCountTotal: row.buyboxEligibleOfferCountTotal,
    observationCount: 1,
    salesRankReference: row.salesRankReference,
    featureWarnings: []
  };
  return predictWithModel(
    {
      company: model.company ?? row.company,
      productFamily: model.productFamily ?? row.productFamily,
      modelKey: model.modelKey,
      scope: model.scope,
      modelType: model.modelType,
      targetMetric: model.targetMetric,
      sampleCount: model.sampleCount,
      trainSampleCount: model.trainSampleCount,
      testSampleCount: model.testSampleCount,
      confidence: model.confidence,
      formula: model.formula,
      coefficients: model.coefficients,
      metrics: model.metrics,
      trainMetrics: model.trainMetrics,
      testMetrics: model.testMetrics,
      reason: ""
    },
    syntheticFeature,
    {
      company: row.company,
      productFamily: row.productFamily,
      asin: row.asin,
      productName: row.productName,
      brand: null,
      category: null,
      month: row.month,
      collectedDate: `${row.month}-01`,
      monthlySales: row.actualSales,
      monthlyRevenue: row.actualRevenue,
      price: row.observedPrice,
      bsr: row.observedBsr,
      reviews: null,
      rating: row.ratingAvg,
      sellers: null,
      calculatedRevenue: false,
      sourceRows: null,
      sourceFile: path.relative(REPO_ROOT, AMAZON_LABEL_PATH)
    }
  );
}

function fallbackPrediction(feature: AmazonEstimateLabKeepaMonthlyFeature, obs: AmazonEstimateLabJungleScoutObservation | null): Prediction {
  const price = feature.monthlyPriceUsedForRevenue ?? obs?.price ?? null;
  const rank = feature.monthlyMedianBsr ?? feature.salesRankReference ?? null;
  const sales = rank && rank > 0 ? 100000 / rank : null;
  return {
    sales,
    revenue: sales !== null && price !== null ? sales * price : null,
    priceUsedForRevenue: price,
    demandIndex: null,
    confidence: "not_enough_data",
    notes: ["model_unavailable"]
  };
}

function selectPreferredCompanyModel(companyModel: FittedModel | undefined, globalModel: FittedModel | undefined, companyCount: number, globalCount: number) {
  if (companyModel) return companyModel;
  if (globalModel) return globalModel;
  return makeFallbackSelectedModel(companyCount, globalCount);
}

function makeFallbackSelectedModel(companyCount: number, globalCount: number): FittedModel {
  return {
    modelKey: `fallback:company:${companyCount}:global:${globalCount}`,
    scope: "global",
    company: null,
    productFamily: null,
    modelType: "demand_index_only",
    targetMetric: "monthlyRevenue",
    sampleCount: 0,
    trainSampleCount: 0,
    testSampleCount: 0,
    selected: false,
    formula: "No calibrated model available",
    coefficients: {},
    metrics: { mape: null, rmse: null, mae: null, r2: null, spearman: null },
    confidence: "not_enough_data",
    notes: ["no_company_model_available", `company_count=${companyCount}`, `global_count=${globalCount}`],
    points: []
  };
}

function modelScore(model: FittedModel) {
  const mape = model.testMetrics?.mape ?? model.metrics.mape ?? 999;
  const penalty = model.modelType === "demand_index_only" ? 100 : 0;
  const samplePenalty = Math.max(0, 24 - (model.trainSampleCount ?? model.sampleCount));
  const trainPenalty = Math.max(0, 24 - (model.trainSampleCount ?? 0)) * 0.25;
  return mape + penalty + samplePenalty + trainPenalty;
}

function inferConfidence(sampleCount: number, predictions: Array<number | null>, mape?: number | null): AmazonEstimateLabConfidence {
  const valid = predictions.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (sampleCount < 4 || !valid.length) return "not_enough_data";
  if (sampleCount >= 30 && (mape ?? 999) < 0.35) return "high";
  if (sampleCount >= 12 && (mape ?? 999) < 0.55) return "medium";
  return "low";
}

function calculateMetrics(actuals: number[], predictions: number[]) {
  const pairs = actuals.map((actual, index) => ({ actual, predicted: predictions[index] })).filter((pair) => Number.isFinite(pair.actual) && Number.isFinite(pair.predicted));
  if (!pairs.length) return { mape: null, rmse: null, mae: null, r2: null, spearman: null };
  const mape = average(pairs.map((pair) => Math.abs((pair.predicted - pair.actual) / Math.max(pair.actual, 1)))) * 100;
  const mae = average(pairs.map((pair) => Math.abs(pair.predicted - pair.actual)));
  const rmse = Math.sqrt(average(pairs.map((pair) => Math.pow(pair.predicted - pair.actual, 2))));
  const meanActual = average(pairs.map((pair) => pair.actual));
  const sst = pairs.reduce((sum, pair) => sum + Math.pow(pair.actual - meanActual, 2), 0);
  const sse = pairs.reduce((sum, pair) => sum + Math.pow(pair.predicted - pair.actual, 2), 0);
  const r2 = sst === 0 ? null : 1 - sse / sst;
  const spearman = spearmanCorrelation(
    pairs.map((pair) => pair.actual),
    pairs.map((pair) => pair.predicted)
  );
  return { mape, rmse, mae, r2, spearman };
}

function flattenModel(row: FittedModel) {
  return {
    modelKey: row.modelKey,
    scope: row.scope,
    company: row.company ?? "",
    productFamily: row.productFamily ?? "",
    modelType: row.modelType,
    targetMetric: row.targetMetric,
    sampleCount: row.sampleCount,
    selected: row.selected ? "true" : "false",
    activeFeatures: row.activeFeatures?.join("|") ?? "",
    targetTransform: row.targetTransform ?? "",
    featureScaleMode: row.featureScaleMode ?? "",
    lambda: row.lambda ?? null,
    featureStats: row.featureStats ? JSON.stringify(row.featureStats) : "",
    formula: row.formula,
    coefficients: JSON.stringify(row.coefficients),
    mape: row.metrics.mape,
    rmse: row.metrics.rmse,
    mae: row.metrics.mae,
    r2: row.metrics.r2,
    spearman: row.metrics.spearman,
    confidence: row.confidence,
    notes: row.notes.join(" | ")
  };
}

function selectPriceSeries(buybox: number[], newPrices: number[], amazonPrices: number[]) {
  const source = buybox.length ? buybox : newPrices.length ? newPrices : amazonPrices;
  return {
    price: source.length ? average(source) : null,
    source: buybox.length ? "buybox" : newPrices.length ? "new" : amazonPrices.length ? "amazon" : "missing",
    values: source
  };
}

function summarizePriceSeries(values: number[]) {
  if (!values.length) return { stdDev: null, trend: null, range: null };
  const mean = average(values);
  const variance = average(values.map((value) => Math.pow(value - mean, 2)));
  const stdDev = Math.sqrt(variance);
  const range = Math.max(...values) - Math.min(...values);
  const trend = values.length >= 2 ? values[values.length - 1] - values[0] : 0;
  return { stdDev, trend, range };
}

function numericValues(points: Array<Record<string, unknown>>, key: string) {
  return points.map((point) => toNumber(point[key])).filter((value): value is number => value !== null);
}

function companyFromLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("coway")) return "coway";
  if (normalized.includes("삼양") || normalized.includes("samyang")) return "samyang";
  if (normalized.includes("티앤엘") || normalized.includes("tnl")) return "tnl";
  return null;
}

function monthToQuarter(month: string) {
  const match = month.match(/^(\d{4})-(\d{2})/);
  if (!match) return month;
  const year = match[1];
  const quarter = Math.ceil(Number(match[2]) / 3);
  return `${year}-Q${quarter}`;
}

function monthOfYear(month: string) {
  const match = month.match(/^(\d{4})-(\d{2})/);
  if (!match) return "unknown";
  return match[2];
}

function monthIndexFromMonth(month: string) {
  const match = month.match(/^(\d{4})-(\d{2})/);
  if (!match) return 0;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(monthNumber)) return 0;
  return year * 12 + monthNumber;
}

function monthSeasonalityFromMonth(month: string) {
  const match = month.match(/^(\d{4})-(\d{2})/);
  if (!match) return { sin: 0, cos: 1 };
  const monthNumber = Number(match[2]);
  if (!Number.isFinite(monthNumber)) return { sin: 0, cos: 1 };
  const angle = ((monthNumber - 1) / 12) * Math.PI * 2;
  return {
    sin: Math.sin(angle),
    cos: Math.cos(angle)
  };
}

function stringFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function median(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
  if (!filtered.length) return null;
  const mid = Math.floor(filtered.length / 2);
  return filtered.length % 2 ? filtered[mid] : (filtered[mid - 1] + filtered[mid]) / 2;
}

function sum(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return filtered.length ? filtered.reduce((acc, value) => acc + value, 0) : null;
}

function dot(a: number[], b: number[]) {
  return a.reduce((sumValue, value, index) => sumValue + value * (b[index] ?? 0), 0);
}

function solveLinearSystem(xRows: number[][], y: number[], lambda = 1e-6) {
  const n = xRows.length;
  if (!n) return [0];
  const p = xRows[0].length;
  const xtx = Array.from({ length: p }, () => Array.from({ length: p }, () => 0));
  const xty = Array.from({ length: p }, () => 0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < p; a++) {
      xty[a] += xRows[i][a] * y[i];
      for (let b = 0; b < p; b++) {
        xtx[a][b] += xRows[i][a] * xRows[i][b];
      }
    }
  }
  for (let i = 0; i < p; i++) xtx[i][i] += lambda;
  return gaussianElimination(xtx, xty);
}

function gaussianElimination(matrix: number[][], vector: number[]) {
  const n = vector.length;
  const augmented = matrix.map((row, i) => [...row, vector[i]]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) maxRow = k;
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    const pivot = augmented[i][i] || 1e-12;
    for (let j = i; j <= n; j++) augmented[i][j] /= pivot;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = augmented[k][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }
  return augmented.map((row) => row[n]);
}

function predictFromBeta(row: { x: number[] }, beta: number[]) {
  const intercept = beta[0] ?? 0;
  const slopes = beta.slice(1);
  return Math.expm1(intercept + dot(slopes, row.x));
}

function spearmanCorrelation(x: number[], y: number[]) {
  if (x.length < 3 || x.length !== y.length) return null;
  const ranksX = rank(x);
  const ranksY = rank(y);
  return pearson(ranksX, ranksY);
}

function rank(values: number[]) {
  return values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value)
    .map((entry, rankIndex) => ({ ...entry, rank: rankIndex + 1 }))
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.rank);
}

function pearson(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 2) return null;
  const meanX = average(x);
  const meanY = average(y);
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < x.length; i++) {
    numerator += (x[i] - meanX) * (y[i] - meanY);
    denomX += Math.pow(x[i] - meanX, 2);
    denomY += Math.pow(y[i] - meanY, 2);
  }
  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? null : numerator / denom;
}

function coefficientsFromNames(names: string[], beta: number[]) {
  const coefficients: Record<string, number> = {};
  names.forEach((name, index) => {
    coefficients[name] = beta[index] ?? 0;
  });
  return coefficients;
}

function buildFormula(modelType: string, activeFeatures: string[], scope: string) {
  const parts = ["log1p(sales) = intercept"];
  for (const feature of activeFeatures) {
    parts.push(`+ ${feature}`);
  }
  if (scope !== "family") parts.push("+ scope_effects");
  return `${modelType}: ${parts.join(" ")}`;
}

function getLatestMonth(rows: AmazonEstimateLabJungleScoutObservation[]) {
  return rows.length ? [...rows].sort((a, b) => a.month.localeCompare(b.month)).at(-1)?.month ?? null : null;
}

function groupBy<T>(items: T[], getter: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getter(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

async function readJsonFile<T>(filePath: string) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function readCsv<T>(filePath: string) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as T[];
  } catch {
    return [];
  }
}

async function collectJsonFiles(root: string) {
  const out: string[] = [];
  await walk(root, out);
  return out.filter((file) => file.endsWith(".json"));
}

async function walk(dir: string, out: string[]) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, out);
      } else {
        out.push(fullPath);
      }
    }
  } catch {
    return;
  }
}

async function writeCsv(filePath: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    await fs.writeFile(filePath, "");
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  }
  await fs.writeFile(filePath, `${lines.join("\n")}\n`);
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[,"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
