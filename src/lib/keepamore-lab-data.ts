import keepamoreLabJson from "../../public/data/keepamore_lab.json";

export type KeepamoreLabSeriesPoint = {
  date: string;
  buyBoxPrice?: number | null;
  amazonPrice?: number | null;
  newPrice?: number | null;
  salesRank?: number | null;
  reviews?: number | null;
  rating?: number | null;
  revenueEstimate?: number | null;
  unitsEstimate?: number | null;
};

export type KeepamoreLabProduct = {
  company: string;
  productFamily: string;
  asin: string;
  title?: string;
  brand?: string;
  category?: string;
  latest?: Record<string, unknown>;
  series: KeepamoreLabSeriesPoint[];
  rawPath: string;
  warnings: string[];
};

export type KeepamoreLabError = {
  company?: string;
  asin: string;
  message: string;
};

export type KeepamoreLabData = {
  generatedAt: string | null;
  source: "keepamore_api";
  summary: {
    asinCount: number;
    successCount: number;
    errorCount: number;
    companyCount: number;
  };
  products: KeepamoreLabProduct[];
  errors: KeepamoreLabError[];
};

const fallbackData: KeepamoreLabData = {
  generatedAt: null,
  source: "keepamore_api",
  summary: {
    asinCount: 0,
    successCount: 0,
    errorCount: 0,
    companyCount: 0
  },
  products: [],
  errors: []
};

export const keepamoreLabData = normalizeKeepamoreLab(keepamoreLabJson as unknown as Partial<KeepamoreLabData>);

function normalizeKeepamoreLab(input: Partial<KeepamoreLabData> | null | undefined): KeepamoreLabData {
  const products = Array.isArray(input?.products) ? input.products.map(normalizeProduct).filter(Boolean) as KeepamoreLabProduct[] : [];
  const errors = Array.isArray(input?.errors) ? input.errors.map(normalizeError).filter(Boolean) as KeepamoreLabError[] : [];
  const companyCount = input?.summary?.companyCount ?? new Set(products.map((item) => item.company)).size;
  return {
    generatedAt: typeof input?.generatedAt === "string" ? input.generatedAt : fallbackData.generatedAt,
    source: "keepamore_api",
    summary: {
      asinCount: input?.summary?.asinCount ?? new Set(products.map((item) => item.asin)).size,
      successCount: input?.summary?.successCount ?? products.length,
      errorCount: input?.summary?.errorCount ?? errors.length,
      companyCount
    },
    products,
    errors
  };
}

function normalizeProduct(product: Partial<KeepamoreLabProduct> | null | undefined): KeepamoreLabProduct | null {
  if (!product || typeof product.asin !== "string") return null;
  return {
    company: typeof product.company === "string" ? product.company : "unknown",
    productFamily: typeof product.productFamily === "string" ? product.productFamily : "Other",
    asin: product.asin,
    title: typeof product.title === "string" ? product.title : undefined,
    brand: typeof product.brand === "string" ? product.brand : undefined,
    category: typeof product.category === "string" ? product.category : undefined,
    latest: product.latest && typeof product.latest === "object" ? { ...product.latest } : undefined,
    series: Array.isArray(product.series)
      ? product.series
          .map((point) =>
            point && typeof point.date === "string"
              ? {
                  date: point.date,
                  buyBoxPrice: toNullableNumber(point.buyBoxPrice),
                  amazonPrice: toNullableNumber(point.amazonPrice),
                  newPrice: toNullableNumber(point.newPrice),
                  salesRank: toNullableNumber(point.salesRank),
                  reviews: toNullableNumber(point.reviews),
                  rating: toNullableNumber(point.rating),
                  revenueEstimate: toNullableNumber(point.revenueEstimate),
                  unitsEstimate: toNullableNumber(point.unitsEstimate)
                }
              : null
          )
          .filter(Boolean) as KeepamoreLabSeriesPoint[]
      : [],
    rawPath: typeof product.rawPath === "string" ? product.rawPath : "",
    warnings: Array.isArray(product.warnings) ? product.warnings.map(String) : []
  };
}

function normalizeError(error: Partial<KeepamoreLabError> | null | undefined): KeepamoreLabError | null {
  if (!error || typeof error.asin !== "string") return null;
  return {
    company: typeof error.company === "string" ? error.company : undefined,
    asin: error.asin,
    message: typeof error.message === "string" ? error.message : "Unknown error"
  };
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getKeepamoreCompanies(): string[] {
  return [...new Set(keepamoreLabData.products.map((product) => product.company))].sort();
}

export function getKeepamoreFamilies(company: string): string[] {
  return [...new Set(keepamoreLabData.products.filter((product) => product.company === company).map((product) => product.productFamily))].sort();
}

export function getKeepamoreAsins(company: string, productFamily?: string | null): KeepamoreLabProduct[] {
  return keepamoreLabData.products
    .filter((product) => product.company === company && (productFamily ? product.productFamily === productFamily : true))
    .sort((a, b) => a.asin.localeCompare(b.asin));
}

export function getKeepamoreProduct(company: string, productFamily: string, asin: string): KeepamoreLabProduct | undefined {
  return keepamoreLabData.products.find((product) => product.company === company && product.productFamily === productFamily && product.asin === asin);
}

