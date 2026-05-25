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
