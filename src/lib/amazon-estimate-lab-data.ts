import amazonEstimateLabJson from "../../public/data/amazon_estimate_lab.json";
import type {
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
    modelCount: 0,
    selectedModelCount: 0,
    backcastMonthCount: 0,
    latestMonth: null
  },
  asinCatalog: [],
  jungleScoutObservations: [],
  keepaMonthlyFeatures: [],
  calibrationResults: [],
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
      modelCount: toNumber(input?.summary?.modelCount) ?? 0,
      selectedModelCount: toNumber(input?.summary?.selectedModelCount) ?? 0,
      backcastMonthCount: toNumber(input?.summary?.backcastMonthCount) ?? 0,
      latestMonth: typeof input?.summary?.latestMonth === "string" ? input.summary.latestMonth : null
    },
    asinCatalog: catalog,
    jungleScoutObservations: observations,
    keepaMonthlyFeatures: keepa,
    calibrationResults,
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
    monthlyPriceUsedForRevenue: toNullableNumber(row.monthlyPriceUsedForRevenue),
    monthlyReviewCountEnd: toNullableNumber(row.monthlyReviewCountEnd),
    monthlyReviewGrowth: toNullableNumber(row.monthlyReviewGrowth),
    monthlyRatingAvg: toNullableNumber(row.monthlyRatingAvg),
    buyboxAvailableRatio: toNullableNumber(row.buyboxAvailableRatio),
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
    selected: Boolean(row.selected),
    formula: typeof row.formula === "string" ? row.formula : "",
    coefficients: typeof row.coefficients === "object" && row.coefficients ? { ...(row.coefficients as Record<string, number>) } : {},
    metrics: normalizeMetrics(row.metrics),
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
    productFamily: typeof row.productFamily === "string" ? row.productFamily : "Other",
    modelKey: row.modelKey,
    scope: row.scope ?? "global",
    modelType: row.modelType ?? "demand_index_only",
    targetMetric: row.targetMetric ?? "monthlySales",
    sampleCount: toNumber(row.sampleCount) ?? 0,
    confidence: row.confidence ?? "not_enough_data",
    formula: typeof row.formula === "string" ? row.formula : "",
    coefficients: typeof row.coefficients === "object" && row.coefficients ? { ...(row.coefficients as Record<string, number>) } : {},
    metrics: normalizeMetrics(row.metrics),
    reason: typeof row.reason === "string" ? row.reason : ""
  };
}

function normalizeMonthlyEstimate(row: Partial<AmazonEstimateLabMonthlyEstimate> | null | undefined) {
  if (!row || typeof row.asin !== "string") return null;
  return {
    company: typeof row.company === "string" ? row.company : "unknown",
    productFamily: typeof row.productFamily === "string" ? row.productFamily : "Other",
    asin: row.asin,
    productName: typeof row.productName === "string" ? row.productName : "",
    month: typeof row.month === "string" ? row.month : "",
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

export function getAmazonEstimateModel(company: string, productFamily: string) {
  return amazonEstimateLabData.selectedModelByCompanyFamily.find((row) => row.company === company && row.productFamily === productFamily) ?? null;
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
