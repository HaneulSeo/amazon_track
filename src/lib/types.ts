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

export type SourceGap = {
  company: string;
  source_name: string;
  source_type: "official" | "marketplace" | "trade" | "retailer" | "social" | "manual" | "api";
  priority: number;
  current_status: "available" | "missing" | "manual_required" | "api_required";
  description: string;
  why_it_matters: string;
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
  };
};
