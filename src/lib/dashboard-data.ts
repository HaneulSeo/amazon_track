import dashboardJson from "../../public/data/dashboard_data.json";
import type {
  BrandTrend,
  DashboardCompany,
  DashboardData,
  DashboardIndustry,
  FamilyMonthlyLike,
  MonthlyProductLike,
  SourceGap
} from "./types";

export const dashboardData = dashboardJson as unknown as DashboardData;

export const overview = dashboardData.overview;
export const industries = dashboardData.industries;
export const companies = dashboardData.companies;
export const monthlyTrend = dashboardData.monthlyTrend;
export const productFamilies = dashboardData.productFamilies;
export const products = dashboardData.products;
export const regionalExposure = dashboardData.regionalExposure;
export const missingDataChecklist = dashboardData.missingDataChecklist;
export const methodologyNotes = dashboardData.methodologyNotes;
export const sourceGapMap = dashboardData.tables.source_gap_map;
export const companyCoverageScore = dashboardData.tables.company_coverage_score;
export const companyMonthlyProxy = dashboardData.tables.company_monthly_proxy;

export function getCompany(companyId: string): DashboardCompany | undefined {
  return companies.find((company) => company.company === companyId);
}

export function getIndustry(industryId: string): DashboardIndustry | undefined {
  return industries.find((industry) => industry.id === industryId);
}

export function getCompanyProducts(companyId: string): MonthlyProductLike[] {
  return products.filter((row) => row.company === companyId);
}

export function getCompanyProductFamilies(companyId: string): FamilyMonthlyLike[] {
  return productFamilies.filter((row) => row.company === companyId);
}

export function getCompanyCoverage(companyId: string) {
  return companyCoverageScore.find((row) => row.company === companyId);
}

export function getCompanySources(companyId: string): SourceGap[] {
  return sourceGapMap.filter((row) => row.company === companyId);
}

export function getCompanyMonthly(companyId: string) {
  return companyMonthlyProxy.filter((row) => row.company === companyId);
}

export function toBrandTrend(rows: Array<{
  month: string;
  revenue: number | null;
  units: number | null;
  avg_price?: number | null;
  avg_bsr?: number | null;
  reviews: number | null;
  asin_count?: number;
  mom_revenue_growth?: number | null;
}>): BrandTrend[] {
  return rows.map((row) => ({
    month: row.month,
    revenue: row.revenue ?? 0,
    units: row.units ?? 0,
    avgPrice: row.avg_price ?? null,
    avgRank: row.avg_bsr ?? null,
    reviews: row.reviews ?? 0,
    productCount: row.asin_count ?? 0,
    momRevenueGrowth: row.mom_revenue_growth ?? null
  }));
}
