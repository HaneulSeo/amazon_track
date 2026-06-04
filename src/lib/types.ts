export type BrandTrend = {
  month: string;
  revenue: number;
  units: number;
  avgPrice: number | null;
  avgRank: number | null;
  reviews: number;
  productCount: number;
  momRevenueGrowth: number | null;
};

export type ProductTrend = {
  productId: string;
  asin: string;
  productName: string;
  brand: string;
  category: string;
  month: string;
  revenue: number;
  units: number;
  avgPrice: number | null;
  avgRank: number | null;
  reviews: number | null;
  rating: number | null;
  sellers: number | null;
  revenueShare: number;
  sourceRows: number;
};

export type Product = {
  productId: string;
  asin: string;
  productName: string;
  brand: string;
  category: string;
  firstMonth: string;
  latestMonth: string;
  totalRevenue: number | null;
  latestRevenue: number | null;
  latestUnits: number | null;
  latestPrice: number | null;
  latestRank: number | null;
  latestReviews: number | null;
  latestRating: number | null;
  latestRevenueShare: number;
  latestRevenueRank: number | null;
  recent3Growth: number | null;
  recent6Growth: number | null;
};

export type Summary = {
  generatedAt: string;
  sourceFileCount: number;
  sourceRowCount: number;
  productCount: number;
  monthCount: number;
  firstMonth: string | null;
  latestMonth: string | null;
  latestRevenue: number;
  latestUnits: number;
  latestAveragePrice: number | null;
  latestAverageRank: number | null;
  latestReviews: number;
  latestProductCount: number;
  latestMomGrowth: number | null;
  recent3Growth: number | null;
  recent6Growth: number | null;
  recent12Growth: number | null;
  bestRevenueMonth: BrandTrend | null;
  quarterlyBenchmarkBaseQuarter: string | null;
  topProductsByRevenue: Product[];
  topProductsByGrowth: Product[];
  decliningProducts: Product[];
  bsrImprovers: Array<Product & { bsrImprovement: number | null }>;
  reviewGrowers: Array<Product & { reviewGrowth: number | null }>;
  warnings: string[];
  notes: string[];
};

export type QuarterlyComparison = {
  company: string;
  quarter: string;
  externalRevenueEokKrw: number;
  externalYoY: number | null;
  externalQoQ: number | null;
  comment: string;
  trackedRevenueUsd: number | null;
  trackedUnits: number | null;
  trackedProductCount: number | null;
  trackedYoY: number | null;
  trackedQoQ: number | null;
  monthsPresent: number;
  isCompleteQuarter: boolean;
  externalIndex: number | null;
  trackedIndex: number | null;
  indexGap: number | null;
};

export type CorrelationConfidence = "high" | "medium" | "low" | "not_enough_data";

export type CorrelationResult = {
  company: string;
  target_source: "dart";
  target_metric: "revenue_krw";
  indicator_source: "amazon" | "trass" | "stock" | "reviews";
  indicator_metric: string;
  lag_quarters: number;
  period_type: "quarterly_to_quarterly";
  sample_size: number;
  pearson_corr: number | null;
  spearman_corr: number | null;
  r_squared: number | null;
  confidence: CorrelationConfidence;
  interpretation: string;
};

export type SourceStatus = {
  company: string;
  source: "amazon" | "trass" | "dart" | "stock" | "manual";
  latest_period: string | null;
  available: boolean;
  row_count: number;
  value_label: string | null;
  confidence: "high" | "medium" | "low";
  warning: string | null;
};

export type ComparisonSeriesOption = {
  id: string;
  label: string;
  source: "dart" | "amazon" | "trass" | "stock";
  unit: "krw" | "usd" | "units" | "index" | "price";
  available: boolean;
};

export type ComparisonPoint = {
  period: string;
  dartRevenue?: number | null;
  amazonRevenue?: number | null;
  amazonUnits?: number | null;
  trassExport?: number | null;
  stockPrice?: number | null;
};

export type ModelMode = "levels" | "yoy";

export type LagFit = {
  lag: number;
  n: number;
  slope: number | null;
  intercept: number | null;
  r2: number | null;
  adjR2: number | null;
  corr: number | null;
  pValue: number | null;
};

export type ModelPair = {
  id: string;
  kind: "revenue~amazon" | "revenue~trass";
  targetLabel: string;
  predictorLabel: string;
  targetUnit: "krw" | "usd";
  predictorUnit: "krw" | "usd";
  scope: string | null;
  note: string | null;
  series: Array<{ period: string; target: number | null; predictor: number | null }>;
  fits: Record<ModelMode, LagFit[]>;
  best: Record<ModelMode, LagFit | null>;
};

export type CompanyModels = {
  company: string;
  label: string;
  availability: {
    dart: boolean;
    amazon: boolean;
    trass: boolean;
    trassScopes: string[];
  };
  pairs: ModelPair[];
};

export type RevenueModels = {
  generatedAt: string;
  maxLag: number;
  minNForBest: number;
  companies: CompanyModels[];
};

export type DemandSource = "google_trends" | "baidu_index";

export type DemandPoint = {
  date: string;
  value: number | null;
};

export type DemandSeries = {
  company: string;
  source: DemandSource;
  source_label: string;
  keyword: string;
  geo: string;
  geo_label: string;
  unit: "trends_index" | "baidu_index";
  is_sample: boolean;
  note: string;
  points: DemandPoint[];
  latest: number | null;
  latest_date: string | null;
  yoy_change: number | null;
  mom_change: number | null;
};

export type DemandSignals = {
  generatedAt: string;
  fetchedLive: boolean;
  anySample: boolean;
  sources: Array<{ id: DemandSource; label: string; auth: string; status: "live" | "sample" }>;
  series: DemandSeries[];
  notes: string[];
};

export type DashboardOverview = {
  tracked_company_count: number;
  tracked_industry_count: number;
  total_asin_count: number;
  latest_month: string | null;
  latest_revenue: number | null;
  latest_units: number | null;
  average_coverage_score: number | null;
  average_data_quality_score: number | null;
  raw_file_count: number;
  month_count: number;
  best_explanation_company: {
    company: string;
    label: string;
    score: number;
    interpretation: string;
  } | null;
  most_needed_company: {
    company: string;
    label: string;
    score: number;
    interpretation: string;
  } | null;
};

export type DashboardIndustry = {
  id: string;
  name: string;
  company_count: number;
  company: string;
  company_label: string;
  latest_month: string | null;
  latest_revenue: number | null;
  latest_units: number | null;
  average_coverage_score: number | null;
  data_quality_score: number | null;
  interpretation: string;
  companies: Array<{
    company: string;
    label: string;
    ticker: string;
    interpretation: string;
  }>;
};

export type DashboardCompany = {
  company: string;
  label: string;
  industry_id: string;
  industry_name: string;
  ticker: string;
  latest_month: string | null;
  latest_revenue: number | null;
  latest_units: number | null;
  asin_count: number;
  month_count: number;
  product_count: number;
  family_count: number;
  coverage_score: number | null;
  amazon_data_quality_score: number | null;
  revenue_exposure_score: number | null;
  missing_data_score: number | null;
  next_data_priority_score: number | null;
  interpretation: string;
  next_data_to_collect: string[];
  amazon_us_direct_coverage_of_total: {
    low: number;
    base: number;
    high: number;
  };
  top_products: MonthlyProductLike[];
  top_families: FamilyMonthlyLike[];
};

export type MonthlyProductLike = {
  company: string;
  source_folder: string;
  asin: string;
  product_name: string;
  product_family: string;
  family_confidence: "high" | "medium" | "low";
  month: string;
  raw_file_count: number;
  raw_row_count: number;
  date_min: string | null;
  date_max: string | null;
  revenue: number | null;
  units: number | null;
  avg_price: number | null;
  avg_bsr: number | null;
  reviews: number | null;
  review_change: number | null;
  rating: number | null;
  sellers: number | null;
  mom_revenue_growth: number | null;
  yoy_revenue_growth: number | null;
  rolling_3m_revenue: number | null;
  rolling_6m_revenue: number | null;
  revenue_share_in_company: number | null;
  revenue_source: "explicit" | "derived" | "missing";
  data_quality_warnings: string[];
};

export type FamilyMonthlyLike = {
  company: string;
  product_family: string;
  family_confidence: "high" | "medium" | "low";
  month: string;
  total_revenue: number | null;
  total_units: number | null;
  asin_count: number;
  product_count: number;
  avg_price: number | null;
  avg_bsr: number | null;
  reviews: number | null;
  review_change: number | null;
  mom_revenue_growth: number | null;
  yoy_revenue_growth: number | null;
  rolling_3m_revenue: number | null;
  rolling_6m_revenue: number | null;
  revenue_share_in_company: number | null;
  data_quality_warnings: string[];
};

export type CompanyMonthlyRow = {
  company: string;
  month: string;
  total_revenue: number | null;
  total_units: number | null;
  asin_count: number;
  product_count: number;
  family_count: number;
  avg_price: number | null;
  avg_bsr: number | null;
  reviews: number | null;
  review_change: number | null;
  mom_revenue_growth: number | null;
  yoy_revenue_growth: number | null;
  rolling_3m_revenue: number | null;
  rolling_6m_revenue: number | null;
  data_quality_warnings: string[];
};

export type SourceGap = {
  company: string;
  source_name: string;
  source_type: "official" | "marketplace" | "trade" | "retailer" | "social" | "manual" | "api";
  priority: number;
  current_status: "available" | "missing" | "manual_required" | "api_required";
  description: string;
  why_it_matters: string;
};

export type TradeMonthlyRow = {
  company: string;
  company_label: string;
  product_line: string;
  country_scope: string;
  source_file: string;
  source_descriptor: string;
  month: string;
  quarter: string;
  export_value_usd: number | null;
  export_value_krw: number | null;
  export_weight_kg: number | null;
  domestic_company_count: number | null;
  foreign_counterparty_count: number | null;
  trass_raw_value: number | null;
  trass_observed_days: number | null;
  trass_target_days: number | null;
  trass_30d_normalized: number | null;
  trass_is_partial_month: boolean;
  trass_adjustment_factor: number | null;
  trass_value_for_trend: number | null;
  trass_total_source: "reported" | "country_sum_fallback";
};

export type TradeQuarterlyRow = {
  company: string;
  company_label: string;
  product_line: string;
  country_scope: string;
  quarter: string;
  export_value_usd: number | null;
  export_value_krw: number | null;
  export_weight_kg: number | null;
  domestic_company_count: number | null;
  foreign_counterparty_count: number | null;
  trass_raw_value: number | null;
  trass_observed_days: number | null;
  trass_target_days: number | null;
  trass_30d_normalized: number | null;
  trass_is_partial_month: boolean;
  trass_adjustment_factor: number | null;
  trass_value_for_trend: number | null;
  trass_total_source: "reported" | "country_sum_fallback";
};

export type CountryTradeMonthlyRow = {
  company: string;
  company_label: string;
  country_scope: string;
  month: string;
  quarter: string;
  export_value_usd: number | null;
  export_value_krw: number | null;
  export_weight_kg: number | null;
  trass_raw_value: number | null;
  trass_observed_days: number | null;
  trass_target_days: number | null;
  trass_30d_normalized: number | null;
  trass_is_partial_month: boolean;
  trass_adjustment_factor: number | null;
  trass_value_for_trend: number | null;
};

export type TrassCompanyMonthlyRow = {
  company: string;
  month: string;
  quarter: string;
  trass_reported_total_value: number | null;
  trass_fallback_total_value: number | null;
  trass_raw_value: number | null;
  trass_observed_days: number | null;
  trass_target_days: number | null;
  trass_30d_normalized: number | null;
  trass_is_partial_month: boolean;
  trass_adjustment_factor: number | null;
  trass_value_for_trend: number | null;
  trass_total_source: "reported" | "country_sum_fallback";
  trass_country_weighted_feature: number | null;
  trass_country_weighted_normalized_feature: number | null;
  trass_country_weight_coverage: number | null;
  trass_country_count: number;
  country_scopes: string[];
  data_quality_warnings: string[];
};

export type TrassCompanyQuarterlyRow = {
  company: string;
  quarter: string;
  trass_reported_total_value: number | null;
  trass_fallback_total_value: number | null;
  trass_raw_value: number | null;
  trass_observed_days: number | null;
  trass_target_days: number | null;
  trass_30d_normalized: number | null;
  trass_is_partial_month: boolean;
  trass_adjustment_factor: number | null;
  trass_value_for_trend: number | null;
  trass_total_source: "reported" | "country_sum_fallback";
  trass_country_weighted_feature: number | null;
  trass_country_weighted_normalized_feature: number | null;
  trass_country_weight_coverage: number | null;
  month_count: number;
  months_present: number;
  is_complete_quarter: boolean;
  data_quality_warnings: string[];
};

export type DartQuarterlyRevenueRow = {
  company: string;
  company_label: string;
  corp_code: string;
  stock_code: string;
  year: number;
  quarter: string;
  period_type: "quarter" | "derived_q4";
  report_code: string;
  rcept_no: string;
  source_url: string;
  revenue_krw: number | null;
  cumulative_revenue_krw: number | null;
  is_derived: boolean;
};

export type StockMonthlyRow = {
  company: string;
  company_label: string;
  stock_ticker: string;
  date: string;
  month: string;
  close: number | null;
  adj_close: number | null;
  volume: number | null;
  month_return: number | null;
  index_100: number | null;
};

export type DashboardData = {
  generated_at: string;
  summary: Record<string, unknown>;
  company_exposure: Record<string, unknown>;
  overview: DashboardOverview;
  industries: DashboardIndustry[];
  companies: DashboardCompany[];
  monthlyTrend: Array<{
    company: string;
    label: string;
    month: string;
    revenue: number | null;
    units: number | null;
    avgPrice: number | null;
    avgRank: number | null;
    reviews: number | null;
    asinCount: number;
    momRevenueGrowth: number | null;
    yoyRevenueGrowth: number | null;
    rolling3mRevenue: number | null;
    rolling6mRevenue: number | null;
  }>;
  productFamilies: FamilyMonthlyLike[];
  products: MonthlyProductLike[];
  regionalExposure: Array<{
    company: string;
    label: string;
    ticker: string;
    interpretation: string;
    total_revenue_exposure: Record<string, number>;
    amazon_us_direct_coverage_of_total: {
      low: number;
      base: number;
      high: number;
    };
    regions: Array<{ region: string; share: number }>;
  }>;
  missingDataChecklist: Array<{
    company: string;
    label: string;
    items: SourceGap[];
  }>;
  methodologyNotes: string[];
  tradeMonthly: TradeMonthlyRow[];
  tradeQuarterly: TradeQuarterlyRow[];
  tradeCountryMonthly: CountryTradeMonthlyRow[];
  trassCompanyMonthly: TrassCompanyMonthlyRow[];
  trassCompanyQuarterly: TrassCompanyQuarterlyRow[];
  dartQuarterlyRevenue: DartQuarterlyRevenueRow[];
  quarterlyComparison: QuarterlyComparison[];
  correlationResults: CorrelationResult[];
  companyStockMonthly: StockMonthlyRow[];
  revenueModels: RevenueModels;
  demandSignals?: DemandSignals;
  tables: {
    amazon_us_monthly: MonthlyProductLike[];
    company_monthly_proxy: Array<{
      company: string;
      month: string;
      total_revenue: number | null;
      total_units: number | null;
      asin_count: number;
      product_count: number;
      family_count: number;
      avg_price: number | null;
      avg_bsr: number | null;
      reviews: number | null;
      review_change: number | null;
      mom_revenue_growth: number | null;
      yoy_revenue_growth: number | null;
      rolling_3m_revenue: number | null;
      rolling_6m_revenue: number | null;
      data_quality_warnings: string[];
    }>;
    product_family_monthly: FamilyMonthlyLike[];
    company_coverage_score: Array<{
      company: string;
      raw_file_count: number;
      unique_asin_count: number;
      month_count: number;
      amazon_data_quality_score: number;
      revenue_exposure_score: number;
      channel_gap_score: number;
      region_gap_score: number;
      forecasting_usefulness_score: number;
      missing_data_score: number;
      next_data_priority_score: number;
      amazon_us_direct_coverage_base: number;
      interpretation: string;
      data_confidence: "high" | "medium" | "low";
    }>;
    source_gap_map: SourceGap[];
    trass_trade_monthly?: TradeMonthlyRow[];
    trass_trade_quarterly?: TradeQuarterlyRow[];
    trass_country_monthly?: CountryTradeMonthlyRow[];
    trass_company_monthly?: TrassCompanyMonthlyRow[];
    trass_company_quarterly?: TrassCompanyQuarterlyRow[];
    dart_quarterly_revenue?: DartQuarterlyRevenueRow[];
    quarterly_comparison?: QuarterlyComparison[];
    correlation_results?: CorrelationResult[];
    company_stock_monthly?: StockMonthlyRow[];
  };
};

export type AmazonEstimateLabConfidence = "high" | "medium" | "low" | "not_enough_data";

export type AmazonEstimateLabCatalogRow = {
  company: string;
  productFamily: string;
  asin: string;
  productName: string;
  brand: string | null;
  category: string | null;
  sourceFolder: string | null;
};

export type AmazonEstimateLabJungleScoutObservation = {
  company: string;
  productFamily: string;
  asin: string;
  productName: string;
  brand: string | null;
  category: string | null;
  month: string;
  collectedDate: string;
  monthlySales: number | null;
  monthlyRevenue: number | null;
  price: number | null;
  bsr: number | null;
  reviews: number | null;
  rating: number | null;
  sellers: number | null;
  calculatedRevenue: boolean;
  sourceRows: number | null;
  sourceFile: string | null;
};

export type AmazonEstimateLabAsinCoverage = {
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
  fullRevenueCoverage: boolean;
  fullSalesCoverage: boolean;
  fullBothCoverage: boolean;
};

export type AmazonEstimateLabKeepaMonthlyFeature = {
  company: string;
  productFamily: string;
  asin: string;
  productName: string;
  month: string;
  monthlyMedianBsr: number | null;
  monthlyAvgBsr: number | null;
  monthlyBestBsr: number | null;
  monthlyWorstBsr: number | null;
  monthlyAvgBuyboxPrice: number | null;
  monthlyAvgNewPrice: number | null;
  monthlyAvgAmazonPrice: number | null;
  monthlyPriceStdDev: number | null;
  monthlyPriceTrend: number | null;
  monthlyPriceRange: number | null;
  monthlyPriceUsedForRevenue: number | null;
  monthlyReviewCountEnd: number | null;
  monthlyReviewGrowth: number | null;
  monthlyRatingAvg: number | null;
  buyboxAvailableRatio: number | null;
  offerCount: number | null;
  offerCsvPointCount: number | null;
  liveOffersCount: number | null;
  buyboxEligibleOfferCountTotal: number | null;
  observationCount: number;
  salesRankReference: number | null;
  featureWarnings: string[];
};

export type AmazonEstimateLabCalibrationPoint = {
  company: string;
  productFamily: string;
  asin: string;
  month: string;
  split?: "train" | "test" | "holdout";
  actualSales: number | null;
  predictedSales: number | null;
  actualRevenue: number | null;
  predictedRevenue: number | null;
  priceUsedForRevenue: number | null;
};

export type AmazonEstimateLabMetrics = {
  mape: number | null;
  rmse: number | null;
  mae: number | null;
  r2: number | null;
  spearman: number | null;
};

export type AmazonEstimateLabCalibrationResult = {
  modelKey: string;
  scope: "global" | "company" | "family";
  company: string | null;
  productFamily: string | null;
  modelType: "simple_power_law" | "log_linear" | "family_adjusted" | "demand_index_only" | "ridge_search";
  targetMetric: "monthlySales" | "monthlyRevenue";
  sampleCount: number;
  trainSampleCount?: number;
  testSampleCount?: number;
  selected: boolean;
  activeFeatures?: string[];
  targetTransform?: "raw" | "log1p" | "asinh" | "sqrt";
  featureScaleMode?: "none" | "zscore" | "robust";
  lambda?: number;
  featureStats?: Record<string, { mean: number | null; std: number | null; median: number | null; mad: number | null }>;
  formula: string;
  coefficients: Record<string, number>;
  metrics: AmazonEstimateLabMetrics;
  trainMetrics?: AmazonEstimateLabMetrics;
  testMetrics?: AmazonEstimateLabMetrics;
  confidence: AmazonEstimateLabConfidence;
  notes: string[];
  points: AmazonEstimateLabCalibrationPoint[];
};

export type AmazonEstimateLabSelectedModel = {
  company: string;
  productFamily: string | null;
  modelKey: string;
  scope: "global" | "company" | "family";
  modelType: "simple_power_law" | "log_linear" | "family_adjusted" | "demand_index_only" | "ridge_search";
  targetMetric: "monthlySales" | "monthlyRevenue";
  sampleCount: number;
  trainSampleCount?: number;
  testSampleCount?: number;
  confidence: AmazonEstimateLabConfidence;
  activeFeatures?: string[];
  targetTransform?: "raw" | "log1p" | "asinh" | "sqrt";
  featureScaleMode?: "none" | "zscore" | "robust";
  lambda?: number;
  featureStats?: Record<string, { mean: number | null; std: number | null; median: number | null; mad: number | null }>;
  formula: string;
  coefficients: Record<string, number>;
  metrics: AmazonEstimateLabMetrics;
  trainMetrics?: AmazonEstimateLabMetrics;
  testMetrics?: AmazonEstimateLabMetrics;
  reason: string;
};

export type AmazonEstimateLabMonthlyEstimate = {
  company: string;
  productFamily: string;
  asin: string;
  productName: string;
  month: string;
  split: "train" | "test" | "holdout";
  kind: "observed_jungle_scout_estimate" | "model_fitted_estimate" | "keepa_backcast_estimate";
  actualSales: number | null;
  actualRevenue: number | null;
  observedPrice: number | null;
  observedBsr: number | null;
  predictedSales: number | null;
  predictedRevenue: number | null;
  demandIndex: number | null;
  priceUsedForRevenue: number | null;
  confidence: AmazonEstimateLabConfidence;
  modelKey: string | null;
  modelType: string | null;
  notes: string[];
};

export type AmazonEstimateLabQuarterlyEstimate = {
  company: string;
  quarter: string;
  estimatedAmazonRevenueUsd: number | null;
  estimatedAmazonSalesUnits: number | null;
  backcastEstimatedRevenueUsd: number | null;
  fittedEstimatedRevenueUsd: number | null;
  observedJungleScoutRevenueUsd: number | null;
  monthsPresent: number;
  confidence: AmazonEstimateLabConfidence;
};

export type AmazonEstimateLabDartComparison = {
  company: string;
  quarter: string;
  estimatedAmazonRevenueUsd: number | null;
  estimatedAmazonRevenueKrw: number | null;
  dartRevenueKrw: number | null;
  estimatedIndex: number | null;
  dartIndex: number | null;
  indexGap: number | null;
  revenueRatio: number | null;
  monthsPresent: number;
  confidence: AmazonEstimateLabConfidence;
};

export type AmazonEstimateLabWarning = {
  company: string | null;
  productFamily: string | null;
  asin: string | null;
  month: string | null;
  message: string;
};

export type AmazonEstimateLabError = {
  company: string | null;
  productFamily: string | null;
  asin: string | null;
  message: string;
};

export type AmazonEstimateLabData = {
  generatedAt: string;
  sourceNote: string;
  summary: {
    catalogAsinCount: number;
    companyCount: number;
    productFamilyCount: number;
    jungleScoutMatchedAsinCount: number;
    keepaMatchedAsinCount: number;
    calibrationSampleCount: number;
    trainSampleCount?: number;
    testSampleCount?: number;
    labelMonthCount?: number;
    modelCount: number;
    selectedModelCount: number;
    backcastMonthCount: number;
    latestMonth: string | null;
  };
  asinCatalog: AmazonEstimateLabCatalogRow[];
  jungleScoutObservations: AmazonEstimateLabJungleScoutObservation[];
  keepaMonthlyFeatures: AmazonEstimateLabKeepaMonthlyFeature[];
  calibrationResults: AmazonEstimateLabCalibrationResult[];
  selectedModelByCompany: AmazonEstimateLabSelectedModel[];
  selectedModelByCompanyFamily: AmazonEstimateLabSelectedModel[];
  monthlyEstimates: AmazonEstimateLabMonthlyEstimate[];
  quarterlyCompanyEstimates: AmazonEstimateLabQuarterlyEstimate[];
  dartComparison: AmazonEstimateLabDartComparison[];
  warnings: AmazonEstimateLabWarning[];
  errors: AmazonEstimateLabError[];
};
