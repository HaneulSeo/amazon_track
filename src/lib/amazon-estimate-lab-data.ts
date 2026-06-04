import amazonEstimateLabJson from "../../public/data/amazon_estimate_lab.json";
import type {
  AmazonEstimateLabAsinCoverage,
  AmazonEstimateLabCalibrationResult,
  AmazonEstimateLabData,
  AmazonEstimateLabDartComparison,
  AmazonEstimateLabJungleScoutObservation,
  AmazonEstimateLabKeepaMonthlyFeature,
  AmazonEstimateLabMetrics,
  AmazonEstimateLabMonthlyEstimate,
  AmazonEstimateLabQuarterlyEstimate,
  AmazonEstimateLabSelectedModel,
  AmazonEstimateLabWarning,
  AmazonEstimateLabError
} from "./types";

const fallbackData: AmazonEstimateLabData = {
  generatedAt: "",
  sourceNote: "placeholder",
  summary: {
    catalogAsinCount: 0,
    companyCount: 0,
    productFamilyCount: 0,
    jungleScoutMatchedAsinCount: 0,
    keepaMatchedAsinCount: 0,
    calibrationSampleCount: 0,
    trainSampleCount: 0,
    testSampleCount: 0,
    labelMonthCount: 0,
    modelCount: 0,
    selectedModelCount: 0,
    backcastMonthCount: 0,
    latestMonth: null
  },
  asinCatalog: [],
  jungleScoutObservations: [],
  keepaMonthlyFeatures: [],
  calibrationResults: [],
  selectedModelByCompany: [],
  selectedModelByCompanyFamily: [],
  monthlyEstimates: [],
  quarterlyCompanyEstimates: [],
  dartComparison: [],
  warnings: [],
  errors: []
};

export const amazonEstimateLabData = normalizeAmazonEstimateLab(amazonEstimateLabJson as unknown as Partial<AmazonEstimateLabData>);

function normalizeAmazonEstimateLab(input: Partial<AmazonEstimateLabData> | null | undefined): AmazonEstimateLabData {
  const catalog = Array.isArray(input?.asinCatalog) ? input.asinCatalog.map(normalizeCatalogRow).filter(Boolean) as AmazonEstimateLabData["asinCatalog"] : [];
  const observations = Array.isArray(input?.jungleScoutObservations)
    ? input.jungleScoutObservations.map(normalizeObservation).filter(Boolean) as AmazonEstimateLabJungleScoutObservation[]
    : [];
  const keepa = Array.isArray(input?.keepaMonthlyFeatures) ? input.keepaMonthlyFeatures.map(normalizeKeepaFeature).filter(Boolean) as AmazonEstimateLabKeepaMonthlyFeature[] : [];
  const calibrationResults = Array.isArray(input?.calibrationResults)
    ? input.calibrationResults.map(normalizeCalibrationResult).filter(Boolean) as AmazonEstimateLabCalibrationResult[]
    : [];
  const selected = Array.isArray(input?.selectedModelByCompanyFamily)
    ? input.selectedModelByCompanyFamily.map(normalizeSelectedModel).filter(Boolean) as AmazonEstimateLabSelectedModel[]
    : [];
  const selectedByCompany = Array.isArray(input?.selectedModelByCompany)
    ? input.selectedModelByCompany.map(normalizeSelectedModel).filter(Boolean) as AmazonEstimateLabSelectedModel[]
    : [];
  const monthlyEstimates = Array.isArray(input?.monthlyEstimates)
    ? input.monthlyEstimates.map(normalizeMonthlyEstimate).filter(Boolean) as AmazonEstimateLabMonthlyEstimate[]
    : [];
  const quarterly = Array.isArray(input?.quarterlyCompanyEstimates)
    ? input.quarterlyCompanyEstimates.map(normalizeQuarterlyEstimate).filter(Boolean) as AmazonEstimateLabQuarterlyEstimate[]
    : [];
  const dartComparison = Array.isArray(input?.dartComparison)
    ? input.dartComparison.map(normalizeDartComparison).filter(Boolean) as AmazonEstimateLabDartComparison[]
    : [];
  const warnings = Array.isArray(input?.warnings) ? input.warnings.map(normalizeWarning).filter(Boolean) as AmazonEstimateLabWarning[] : [];
  const errors = Array.isArray(input?.errors) ? input.errors.map(normalizeError).filter(Boolean) as AmazonEstimateLabError[] : [];

  return {
    generatedAt: typeof input?.generatedAt === "string" ? input.generatedAt : fallbackData.generatedAt,
    sourceNote: typeof input?.sourceNote === "string" ? input.sourceNote : fallbackData.sourceNote,
    summary: {
      catalogAsinCount: toNumber(input?.summary?.catalogAsinCount) ?? 0,
      companyCount: toNumber(input?.summary?.companyCount) ?? 0,
      productFamilyCount: toNumber(input?.summary?.productFamilyCount) ?? 0,
      jungleScoutMatchedAsinCount: toNumber(input?.summary?.jungleScoutMatchedAsinCount) ?? 0,
      keepaMatchedAsinCount: toNumber(input?.summary?.keepaMatchedAsinCount) ?? 0,
      calibrationSampleCount: toNumber(input?.summary?.calibrationSampleCount) ?? 0,
      trainSampleCount: toNumber(input?.summary?.trainSampleCount) ?? 0,
      testSampleCount: toNumber(input?.summary?.testSampleCount) ?? 0,
      labelMonthCount: toNumber(input?.summary?.labelMonthCount) ?? 0,
      modelCount: toNumber(input?.summary?.modelCount) ?? 0,
      selectedModelCount: toNumber(input?.summary?.selectedModelCount) ?? 0,
      backcastMonthCount: toNumber(input?.summary?.backcastMonthCount) ?? 0,
      latestMonth: typeof input?.summary?.latestMonth === "string" ? input.summary.latestMonth : null
    },
    asinCatalog: catalog,
    jungleScoutObservations: observations,
    keepaMonthlyFeatures: keepa,
    calibrationResults,
    selectedModelByCompany: selectedByCompany.length ? selectedByCompany : selected,
    selectedModelByCompanyFamily: selected,
    monthlyEstimates,
    quarterlyCompanyEstimates: quarterly,
    dartComparison,
    warnings,
    errors
  };
}

function normalizeCatalogRow(row: Partial<AmazonEstimateLabData["asinCatalog"][number]> | null | undefined) {
  if (!row || typeof row.asin !== "string") return null;
  return {
    company: typeof row.company === "string" ? row.company : "unknown",
    productFamily: typeof row.productFamily === "string" ? row.productFamily : "Other",
    asin: row.asin,
    productName: typeof row.productName === "string" ? row.productName : "",
    brand: typeof row.brand === "string" ? row.brand : null,
    category: typeof row.category === "string" ? row.category : null,
    sourceFolder: typeof row.sourceFolder === "string" ? row.sourceFolder : null
  };
}

function normalizeObservation(row: Partial<AmazonEstimateLabJungleScoutObservation> | null | undefined) {
  if (!row || typeof row.asin !== "string") return null;
  return {
    company: typeof row.company === "string" ? row.company : "unknown",
    productFamily: typeof row.productFamily === "string" ? row.productFamily : "Other",
    asin: row.asin,
    productName: typeof row.productName === "string" ? row.productName : "",
    brand: typeof row.brand === "string" ? row.brand : null,
    category: typeof row.category === "string" ? row.category : null,
    month: typeof row.month === "string" ? row.month : "",
    collectedDate: typeof row.collectedDate === "string" ? row.collectedDate : "",
    monthlySales: toNullableNumber(row.monthlySales),
    monthlyRevenue: toNullableNumber(row.monthlyRevenue),
    price: toNullableNumber(row.price),
    bsr: toNullableNumber(row.bsr),
    reviews: toNullableNumber(row.reviews),
    rating: toNullableNumber(row.rating),
    sellers: toNullableNumber(row.sellers),
    calculatedRevenue: Boolean(row.calculatedRevenue),
    sourceRows: toNullableNumber(row.sourceRows),
    sourceFile: typeof row.sourceFile === "string" ? row.sourceFile : null
  };
}

function normalizeKeepaFeature(row: Partial<AmazonEstimateLabKeepaMonthlyFeature> | null | undefined) {
  if (!row || typeof row.asin !== "string") return null;
  return {
    company: typeof row.company === "string" ? row.company : "unknown",
    productFamily: typeof row.productFamily === "string" ? row.productFamily : "Other",
    asin: row.asin,
    productName: typeof row.productName === "string" ? row.productName : "",
    month: typeof row.month === "string" ? row.month : "",
    monthlyMedianBsr: toNullableNumber(row.monthlyMedianBsr),
    monthlyAvgBsr: toNullableNumber(row.monthlyAvgBsr),
    monthlyBestBsr: toNullableNumber(row.monthlyBestBsr),
    monthlyWorstBsr: toNullableNumber(row.monthlyWorstBsr),
    monthlyAvgBuyboxPrice: toNullableNumber(row.monthlyAvgBuyboxPrice),
    monthlyAvgNewPrice: toNullableNumber(row.monthlyAvgNewPrice),
    monthlyAvgAmazonPrice: toNullableNumber(row.monthlyAvgAmazonPrice),
    monthlyPriceStdDev: toNullableNumber((row as Record<string, unknown>).monthlyPriceStdDev),
    monthlyPriceTrend: toNullableNumber((row as Record<string, unknown>).monthlyPriceTrend),
    monthlyPriceRange: toNullableNumber((row as Record<string, unknown>).monthlyPriceRange),
    monthlyPriceUsedForRevenue: toNullableNumber(row.monthlyPriceUsedForRevenue),
    monthlyReviewCountEnd: toNullableNumber(row.monthlyReviewCountEnd),
    monthlyReviewGrowth: toNullableNumber(row.monthlyReviewGrowth),
    monthlyRatingAvg: toNullableNumber(row.monthlyRatingAvg),
    buyboxAvailableRatio: toNullableNumber(row.buyboxAvailableRatio),
    offerCount: toNullableNumber((row as Record<string, unknown>).offerCount),
    offerCsvPointCount: toNullableNumber((row as Record<string, unknown>).offerCsvPointCount),
    liveOffersCount: toNullableNumber((row as Record<string, unknown>).liveOffersCount),
    buyboxEligibleOfferCountTotal: toNullableNumber((row as Record<string, unknown>).buyboxEligibleOfferCountTotal),
    observationCount: toNumber(row.observationCount) ?? 0,
    salesRankReference: toNullableNumber(row.salesRankReference),
    featureWarnings: Array.isArray(row.featureWarnings) ? row.featureWarnings.map(String) : []
  };
}

function normalizeCalibrationResult(row: Partial<AmazonEstimateLabCalibrationResult> | null | undefined) {
  if (!row || typeof row.modelKey !== "string") return null;
  return {
    modelKey: row.modelKey,
    scope: row.scope ?? "global",
    company: typeof row.company === "string" ? row.company : null,
    productFamily: typeof row.productFamily === "string" ? row.productFamily : null,
    modelType: row.modelType ?? "demand_index_only",
    targetMetric: row.targetMetric ?? "monthlySales",
    sampleCount: toNumber(row.sampleCount) ?? 0,
    trainSampleCount: toNumber((row as Record<string, unknown>).trainSampleCount) ?? undefined,
    testSampleCount: toNumber((row as Record<string, unknown>).testSampleCount) ?? undefined,
    selected: Boolean(row.selected),
    activeFeatures: Array.isArray((row as Record<string, unknown>).activeFeatures) ? ((row as Record<string, unknown>).activeFeatures as unknown[]).map(String) : undefined,
    targetTransform: toTargetTransform((row as Record<string, unknown>).targetTransform),
    featureScaleMode: toFeatureScaleMode((row as Record<string, unknown>).featureScaleMode),
    lambda: toNullableNumber((row as Record<string, unknown>).lambda) ?? undefined,
    featureStats: normalizeFeatureStats((row as Record<string, unknown>).featureStats),
    formula: typeof row.formula === "string" ? row.formula : "",
    coefficients: typeof row.coefficients === "object" && row.coefficients ? { ...(row.coefficients as Record<string, number>) } : {},
    metrics: normalizeMetrics(row.metrics),
    trainMetrics: row && typeof row === "object" && (row as Record<string, unknown>).trainMetrics ? normalizeMetrics((row as Record<string, unknown>).trainMetrics) : undefined,
    testMetrics: row && typeof row === "object" && (row as Record<string, unknown>).testMetrics ? normalizeMetrics((row as Record<string, unknown>).testMetrics) : undefined,
    confidence: row.confidence ?? "not_enough_data",
    notes: Array.isArray(row.notes) ? row.notes.map(String) : [],
    points: Array.isArray(row.points)
      ? row.points.map((point) =>
          point && typeof point === "object"
            ? {
                company: typeof point.company === "string" ? point.company : "unknown",
                productFamily: typeof point.productFamily === "string" ? point.productFamily : "Other",
                asin: typeof point.asin === "string" ? point.asin : "",
                month: typeof point.month === "string" ? point.month : "",
                split: (point as Record<string, unknown>).split === "train" || (point as Record<string, unknown>).split === "test" || (point as Record<string, unknown>).split === "holdout" ? ((point as Record<string, unknown>).split as "train" | "test" | "holdout") : undefined,
                actualSales: toNullableNumber((point as Record<string, unknown>).actualSales),
                predictedSales: toNullableNumber((point as Record<string, unknown>).predictedSales),
                actualRevenue: toNullableNumber((point as Record<string, unknown>).actualRevenue),
                predictedRevenue: toNullableNumber((point as Record<string, unknown>).predictedRevenue),
                priceUsedForRevenue: toNullableNumber((point as Record<string, unknown>).priceUsedForRevenue)
              }
            : null
        ).filter(Boolean)
      : []
  };
}

function normalizeSelectedModel(row: Partial<AmazonEstimateLabSelectedModel> | null | undefined) {
  if (!row || typeof row.modelKey !== "string") return null;
  return {
    company: typeof row.company === "string" ? row.company : "unknown",
    productFamily: typeof row.productFamily === "string" ? row.productFamily : null,
    modelKey: row.modelKey,
    scope: row.scope ?? "global",
    modelType: row.modelType ?? "demand_index_only",
    targetMetric: row.targetMetric ?? "monthlySales",
    sampleCount: toNumber(row.sampleCount) ?? 0,
    trainSampleCount: toNumber((row as Record<string, unknown>).trainSampleCount) ?? undefined,
    testSampleCount: toNumber((row as Record<string, unknown>).testSampleCount) ?? undefined,
    confidence: row.confidence ?? "not_enough_data",
    activeFeatures: Array.isArray((row as Record<string, unknown>).activeFeatures) ? ((row as Record<string, unknown>).activeFeatures as unknown[]).map(String) : undefined,
    targetTransform: toTargetTransform((row as Record<string, unknown>).targetTransform),
    featureScaleMode: toFeatureScaleMode((row as Record<string, unknown>).featureScaleMode),
    lambda: toNullableNumber((row as Record<string, unknown>).lambda) ?? undefined,
    featureStats: normalizeFeatureStats((row as Record<string, unknown>).featureStats),
    formula: typeof row.formula === "string" ? row.formula : "",
    coefficients: typeof row.coefficients === "object" && row.coefficients ? { ...(row.coefficients as Record<string, number>) } : {},
    metrics: normalizeMetrics(row.metrics),
    trainMetrics: row && typeof row === "object" && (row as Record<string, unknown>).trainMetrics ? normalizeMetrics((row as Record<string, unknown>).trainMetrics) : undefined,
    testMetrics: row && typeof row === "object" && (row as Record<string, unknown>).testMetrics ? normalizeMetrics((row as Record<string, unknown>).testMetrics) : undefined,
    reason: typeof row.reason === "string" ? row.reason : ""
  };
}

function normalizeFeatureStats(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const out: Record<string, { mean: number | null; std: number | null; median: number | null; mad: number | null }> = {};
  for (const [key, raw] of Object.entries(record)) {
    const stat = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    out[key] = {
      mean: toNullableNumber(stat.mean),
      std: toNullableNumber(stat.std),
      median: toNullableNumber(stat.median),
      mad: toNullableNumber(stat.mad)
    };
  }
  return out;
}

function toTargetTransform(value: unknown): "raw" | "log1p" | "asinh" | "sqrt" | undefined {
  return value === "raw" || value === "log1p" || value === "asinh" || value === "sqrt" ? value : undefined;
}

function toFeatureScaleMode(value: unknown): "none" | "zscore" | "robust" | undefined {
  return value === "none" || value === "zscore" || value === "robust" ? value : undefined;
}

function normalizeMonthlyEstimate(row: Partial<AmazonEstimateLabMonthlyEstimate> | null | undefined) {
  if (!row || typeof row.asin !== "string") return null;
  return {
    company: typeof row.company === "string" ? row.company : "unknown",
    productFamily: typeof row.productFamily === "string" ? row.productFamily : "Other",
    asin: row.asin,
    productName: typeof row.productName === "string" ? row.productName : "",
    month: typeof row.month === "string" ? row.month : "",
    split: row.split === "train" || row.split === "test" || row.split === "holdout" ? row.split : "holdout",
    kind: row.kind ?? "observed_jungle_scout_estimate",
    actualSales: toNullableNumber(row.actualSales),
    actualRevenue: toNullableNumber(row.actualRevenue),
    observedPrice: toNullableNumber(row.observedPrice),
    observedBsr: toNullableNumber(row.observedBsr),
    predictedSales: toNullableNumber(row.predictedSales),
    predictedRevenue: toNullableNumber(row.predictedRevenue),
    demandIndex: toNullableNumber((row as Record<string, unknown>).demandIndex),
    priceUsedForRevenue: toNullableNumber(row.priceUsedForRevenue),
    confidence: row.confidence ?? "not_enough_data",
    modelKey: typeof row.modelKey === "string" ? row.modelKey : null,
    modelType: typeof row.modelType === "string" ? row.modelType : null,
    notes: Array.isArray(row.notes) ? row.notes.map(String) : []
  };
}

function normalizeQuarterlyEstimate(row: Partial<AmazonEstimateLabQuarterlyEstimate> | null | undefined) {
  if (!row || typeof row.company !== "string" || typeof row.quarter !== "string") return null;
  return {
    company: row.company,
    quarter: row.quarter,
    estimatedAmazonRevenueUsd: toNullableNumber(row.estimatedAmazonRevenueUsd),
    estimatedAmazonSalesUnits: toNullableNumber(row.estimatedAmazonSalesUnits),
    backcastEstimatedRevenueUsd: toNullableNumber(row.backcastEstimatedRevenueUsd),
    fittedEstimatedRevenueUsd: toNullableNumber(row.fittedEstimatedRevenueUsd),
    observedJungleScoutRevenueUsd: toNullableNumber(row.observedJungleScoutRevenueUsd),
    monthsPresent: toNumber(row.monthsPresent) ?? 0,
    confidence: row.confidence ?? "not_enough_data"
  };
}

function normalizeDartComparison(row: Partial<AmazonEstimateLabDartComparison> | null | undefined) {
  if (!row || typeof row.company !== "string" || typeof row.quarter !== "string") return null;
  return {
    company: row.company,
    quarter: row.quarter,
    estimatedAmazonRevenueUsd: toNullableNumber(row.estimatedAmazonRevenueUsd),
    estimatedAmazonRevenueKrw: toNullableNumber(row.estimatedAmazonRevenueKrw),
    dartRevenueKrw: toNullableNumber(row.dartRevenueKrw),
    estimatedIndex: toNullableNumber(row.estimatedIndex),
    dartIndex: toNullableNumber(row.dartIndex),
    indexGap: toNullableNumber(row.indexGap),
    revenueRatio: toNullableNumber(row.revenueRatio),
    monthsPresent: toNumber(row.monthsPresent) ?? 0,
    confidence: row.confidence ?? "not_enough_data"
  };
}

function normalizeWarning(row: Partial<AmazonEstimateLabWarning> | null | undefined) {
  if (!row || typeof row.message !== "string") return null;
  return {
    company: typeof row.company === "string" ? row.company : null,
    productFamily: typeof row.productFamily === "string" ? row.productFamily : null,
    asin: typeof row.asin === "string" ? row.asin : null,
    month: typeof row.month === "string" ? row.month : null,
    message: row.message
  };
}

function normalizeError(row: Partial<AmazonEstimateLabError> | null | undefined) {
  if (!row || typeof row.message !== "string") return null;
  return {
    company: typeof row.company === "string" ? row.company : null,
    productFamily: typeof row.productFamily === "string" ? row.productFamily : null,
    asin: typeof row.asin === "string" ? row.asin : null,
    message: row.message
  };
}

function normalizeMetrics(metrics: unknown): AmazonEstimateLabMetrics {
  const record = metrics && typeof metrics === "object" ? (metrics as Record<string, unknown>) : {};
  return {
    mape: toNullableNumber(record.mape),
    rmse: toNullableNumber(record.rmse),
    mae: toNullableNumber(record.mae),
    r2: toNullableNumber(record.r2),
    spearman: toNullableNumber(record.spearman)
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toNullableNumber(value: unknown): number | null {
  return toNumber(value);
}

export function getAmazonEstimateCompanies() {
  return [...new Set(amazonEstimateLabData.asinCatalog.map((row) => row.company))].sort();
}

export function getAmazonEstimateFamilies(company: string) {
  return [...new Set(amazonEstimateLabData.asinCatalog.filter((row) => row.company === company).map((row) => row.productFamily))].sort();
}

export function getAmazonEstimateAsins(company: string, productFamily?: string | null) {
  return amazonEstimateLabData.asinCatalog
    .filter((row) => row.company === company && (productFamily ? row.productFamily === productFamily : true))
    .sort((a, b) => a.asin.localeCompare(b.asin));
}

export function getAmazonEstimateAsinCoverage(company: string, productFamily?: string | null): AmazonEstimateLabAsinCoverage[] {
  const stats = new Map<
    string,
    {
      company: string;
      productFamily: string;
      asin: string;
      productName: string;
      totalMonths: number;
      positiveRevenueMonths: number;
      positiveSalesMonths: number;
      latestMonth: string | null;
      latestPositiveRevenueMonth: string | null;
      latestPositiveSalesMonth: string | null;
    }
  >();

  for (const row of amazonEstimateLabData.jungleScoutObservations) {
    if (row.company !== company) continue;
    if (productFamily && row.productFamily !== productFamily) continue;
    const current =
      stats.get(row.asin) ?? {
        company: row.company,
        productFamily: row.productFamily,
        asin: row.asin,
        productName: row.productName,
        totalMonths: 0,
        positiveRevenueMonths: 0,
        positiveSalesMonths: 0,
        latestMonth: null,
        latestPositiveRevenueMonth: null,
        latestPositiveSalesMonth: null
      };
    current.totalMonths += 1;
    current.latestMonth = !current.latestMonth || row.month > current.latestMonth ? row.month : current.latestMonth;
    if ((row.monthlyRevenue ?? 0) > 0) {
      current.positiveRevenueMonths += 1;
      current.latestPositiveRevenueMonth = !current.latestPositiveRevenueMonth || row.month > current.latestPositiveRevenueMonth ? row.month : current.latestPositiveRevenueMonth;
    }
    if ((row.monthlySales ?? 0) > 0) {
      current.positiveSalesMonths += 1;
      current.latestPositiveSalesMonth = !current.latestPositiveSalesMonth || row.month > current.latestPositiveSalesMonth ? row.month : current.latestPositiveSalesMonth;
    }
    stats.set(row.asin, current);
  }

  return [...stats.values()]
    .map((row) => ({
      ...row,
      fullRevenueCoverage: row.totalMonths >= 25 && row.positiveRevenueMonths === 25,
      fullSalesCoverage: row.totalMonths >= 25 && row.positiveSalesMonths === 25,
      fullBothCoverage: row.totalMonths >= 25 && row.positiveRevenueMonths === 25 && row.positiveSalesMonths === 25
    }))
    .sort(
      (a, b) =>
        Number(b.fullRevenueCoverage) - Number(a.fullRevenueCoverage) ||
        Number(b.fullSalesCoverage) - Number(a.fullSalesCoverage) ||
        b.positiveRevenueMonths - a.positiveRevenueMonths ||
        b.positiveSalesMonths - a.positiveSalesMonths ||
        b.totalMonths - a.totalMonths ||
        a.asin.localeCompare(b.asin)
    );
}

export function getAmazonEstimateModel(company: string, productFamily: string) {
  return (
    amazonEstimateLabData.selectedModelByCompany.find((row) => row.company === company) ??
    amazonEstimateLabData.selectedModelByCompanyFamily.find((row) => row.company === company && row.productFamily === productFamily) ??
    null
  );
}

export function getAmazonEstimateMonthly(company: string, productFamily: string, asin: string) {
  return amazonEstimateLabData.monthlyEstimates
    .filter((row) => row.company === company && row.productFamily === productFamily && row.asin === asin)
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function getAmazonEstimateCalibrationByModelKey(modelKey: string) {
  return amazonEstimateLabData.calibrationResults.find((row) => row.modelKey === modelKey) ?? null;
}

export function getAmazonEstimateQuarterlyByCompany(company: string) {
  return amazonEstimateLabData.quarterlyCompanyEstimates.filter((row) => row.company === company).sort((a, b) => a.quarter.localeCompare(b.quarter));
}

export function getAmazonEstimateDartComparison(company: string) {
  return amazonEstimateLabData.dartComparison.filter((row) => row.company === company).sort((a, b) => a.quarter.localeCompare(b.quarter));
}
