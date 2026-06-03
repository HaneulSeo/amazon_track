import fs from "node:fs/promises";
import path from "node:path";

type RawEnvelope = {
  company?: string;
  productFamily?: string;
  product_family?: string;
  asin?: string;
  fetchedAt?: string;
  source?: string;
  request?: Record<string, unknown>;
  response?: unknown;
  warnings?: string[];
};

type ProductPoint = {
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

type NormalizedProduct = {
  company: string;
  productFamily: string;
  asin: string;
  title?: string;
  brand?: string;
  category?: string;
  latest?: Record<string, unknown>;
  series: ProductPoint[];
  rawPath: string;
  warnings: string[];
};

type KeepamoreLabOutput = {
  generatedAt: string;
  source: "keepamore_api";
  summary: {
    asinCount: number;
    successCount: number;
    errorCount: number;
    companyCount: number;
  };
  products: NormalizedProduct[];
  errors: Array<{
    company?: string;
    asin: string;
    message: string;
  }>;
};

const REPO_ROOT = process.cwd();
const RAW_ROOT = path.join(REPO_ROOT, "data", "raw", "keepamore_lab");
const PUBLIC_OUTPUT = path.join(REPO_ROOT, "public", "data", "keepamore_lab.json");

async function main() {
  const rawFiles = await collectRawFiles(RAW_ROOT);
  const errorFiles = rawFiles.filter((file) => path.basename(file).toLowerCase() === "errors.json");
  const productFiles = rawFiles.filter((file) => path.basename(file).toLowerCase() !== "errors.json");

  const latestByKey = new Map<string, { envelope: RawEnvelope; filePath: string; mtimeMs: number }>();
  for (const filePath of productFiles) {
    const raw = await safeReadJson(filePath);
    if (!raw) continue;
    const envelope = normalizeRawEnvelope(raw);
    if (!envelope.asin) continue;
    const stat = await fs.stat(filePath);
    const key = `${envelope.company}:${envelope.asin}`;
    const existing = latestByKey.get(key);
    if (!existing || stat.mtimeMs >= existing.mtimeMs) {
      latestByKey.set(key, { envelope, filePath, mtimeMs: stat.mtimeMs });
    }
  }

  const products = [...latestByKey.values()]
    .map(({ envelope, filePath }) => normalizeProduct(envelope, filePath))
    .filter((product): product is NormalizedProduct => product !== null)
    .sort((a, b) => a.company.localeCompare(b.company) || a.productFamily.localeCompare(b.productFamily) || a.asin.localeCompare(b.asin));

  const errors = await readErrorEntries(errorFiles);

  const output: KeepamoreLabOutput = {
    generatedAt: new Date().toISOString(),
    source: "keepamore_api",
    summary: {
      asinCount: new Set(products.map((product) => `${product.company}:${product.asin}`)).size,
      successCount: products.length,
      errorCount: errors.length,
      companyCount: new Set(products.map((product) => product.company)).size
    },
    products,
    errors
  };

  await fs.mkdir(path.dirname(PUBLIC_OUTPUT), { recursive: true });
  await fs.writeFile(PUBLIC_OUTPUT, JSON.stringify(output, null, 2));
  console.log(`wrote ${path.relative(REPO_ROOT, PUBLIC_OUTPUT)} (${products.length} products, ${errors.length} errors)`);
}

async function readErrorEntries(errorFiles: string[]) {
  const entries: Array<{ company?: string; asin: string; message: string }> = [];
  for (const filePath of errorFiles) {
    const raw = await safeReadJson(filePath);
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const list = Array.isArray(record.errors) ? record.errors : [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      const asin = typeof entry.asin === "string" ? entry.asin : "";
      if (!asin) continue;
      entries.push({
        company: typeof entry.company === "string" ? entry.company : undefined,
        asin,
        message: typeof entry.message === "string" ? entry.message : "Unknown error"
      });
    }
  }
  return entries;
}

function normalizeRawEnvelope(raw: unknown): RawEnvelope {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  const payload = normalizeResponsePayload(record.response ?? record.product ?? record.data ?? raw);
  return {
    company: stringFrom(record.company) ?? stringFrom(payload.company) ?? "unknown",
    productFamily: stringFrom(record.productFamily) ?? stringFrom(record.product_family) ?? stringFrom(payload.productFamily) ?? stringFrom(payload.product_family) ?? "Other",
    product_family: stringFrom(record.product_family) ?? stringFrom(record.productFamily),
    asin: stringFrom(record.asin) ?? stringFrom(payload.asin) ?? "",
    fetchedAt: stringFrom(record.fetchedAt),
    source: stringFrom(record.source),
    request: record.request && typeof record.request === "object" ? (record.request as Record<string, unknown>) : undefined,
    response: payload,
    warnings: Array.isArray(record.warnings) ? record.warnings.map(String) : []
  };
}

function normalizeProduct(envelope: RawEnvelope, filePath: string): NormalizedProduct | null {
  const response = normalizeResponsePayload(envelope.response);
  const product = extractProductObject(response);
  const asin = envelope.asin || stringFrom(product.asin) || "";
  if (!asin) return null;

  const series = buildSeries(product);
  const latest = buildLatestSnapshot(product, series);
  const warnings = [...new Set([...(envelope.warnings ?? []), ...collectWarnings(product, series)])];
  const rawPath = path.relative(REPO_ROOT, filePath).split(path.sep).join("/");

  return {
    company: envelope.company ?? "unknown",
    productFamily: envelope.productFamily ?? "Other",
    asin,
    title: stringFrom(product.title) ?? stringFrom(product.productTitle) ?? stringFrom(product.name),
    brand: stringFrom(product.brand) ?? stringFrom(product.brandName),
    category: stringFrom(product.category) ?? stringFrom(product.categoryName),
    latest,
    series,
    rawPath,
    warnings
  };
}

function normalizeResponsePayload(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    return { products: value };
  }
  if (!value || typeof value !== "object") {
    return {};
  }
  const record = value as Record<string, unknown>;
  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    if (Array.isArray(data.products)) return { ...data, products: data.products };
    if (Array.isArray(data.product)) return { ...data, products: data.product };
    if (data.product && typeof data.product === "object") return { ...data, product: data.product };
  }
  return record;
}

function extractProductObject(response: Record<string, unknown>) {
  const products = Array.isArray(response.products) ? response.products : [];
  if (products.length > 0 && products[0] && typeof products[0] === "object") {
    return products[0] as Record<string, unknown>;
  }
  if (response.product && typeof response.product === "object") {
    return response.product as Record<string, unknown>;
  }
  return response;
}

function buildSeries(product: Record<string, unknown>): ProductPoint[] {
  const seriesByDate = new Map<string, ProductPoint>();
  const csv = Array.isArray(product.csv) ? product.csv : [];

  const mappings: Array<[string, number]> = [
    ["amazonPrice", 0],
    ["newPrice", 1],
    ["salesRank", 3],
    ["rating", 16],
    ["reviews", 17],
    ["buyBoxPrice", 18]
  ];

  for (const [field, index] of mappings) {
    const history = Array.isArray(csv[index]) ? (csv[index] as unknown[]) : [];
    mergeHistory(seriesByDate, history, field as keyof ProductPoint);
  }

  const offers = Array.isArray(product.offers) ? (product.offers as Record<string, unknown>[]) : [];
  mergeOfferHistory(seriesByDate, offers);

  return [...seriesByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function mergeHistory(seriesByDate: Map<string, ProductPoint>, history: unknown[], field: keyof ProductPoint) {
  for (let i = 0; i < history.length - 1; i += 2) {
    const keepaMinute = toNumber(history[i]);
    const rawValue = toNumber(history[i + 1]);
    if (keepaMinute === null) continue;
    const date = keepaMinuteToDate(keepaMinute);
    const value = normalizeKeepaValue(rawValue, field);
    const current = (seriesByDate.get(date) ?? { date }) as ProductPoint;
    if (field === "buyBoxPrice") current.buyBoxPrice = value;
    if (field === "amazonPrice") current.amazonPrice = value;
    if (field === "newPrice") current.newPrice = value;
    if (field === "salesRank") current.salesRank = value;
    if (field === "reviews") current.reviews = value;
    if (field === "rating") current.rating = value;
    if (field === "revenueEstimate") current.revenueEstimate = value;
    if (field === "unitsEstimate") current.unitsEstimate = value;
    seriesByDate.set(date, current);
  }
}

function mergeOfferHistory(seriesByDate: Map<string, ProductPoint>, offers: Record<string, unknown>[]) {
  for (const offer of offers) {
    const history = Array.isArray(offer.offerCSV) ? (offer.offerCSV as unknown[]) : [];
    const isAmazon = Boolean(offer.isAmazon);
    const condition = toNumber(offer.condition);

    for (let i = 0; i < history.length - 2; i += 3) {
      const keepaMinute = toNumber(history[i]);
      const rawPrice = toNumber(history[i + 1]);
      if (keepaMinute === null || rawPrice === null) continue;
      const date = keepaMinuteToDate(keepaMinute);
      const price = rawPrice > 1000 ? rawPrice / 100 : rawPrice;
      const current = (seriesByDate.get(date) ?? { date }) as ProductPoint;

      if (isAmazon) {
        current.amazonPrice = pickBetterPrice(current.amazonPrice, price);
      }

      if (condition === 1) {
        current.newPrice = pickBetterPrice(current.newPrice, price);
      }

      current.buyBoxPrice = pickBetterPrice(current.buyBoxPrice, price);
      seriesByDate.set(date, current);
    }

  }
}

function pickBetterPrice(current: number | null | undefined, candidate: number) {
  if (current === null || current === undefined || Number.isNaN(current)) return candidate;
  if (candidate <= 0) return current;
  return Math.min(current, candidate);
}

function normalizeKeepaValue(value: number | null, field: keyof ProductPoint) {
  if (value === null) return null;
  if (value === -1) return null;
  if (field === "buyBoxPrice" || field === "amazonPrice" || field === "newPrice") {
    return value > 1000 ? value / 100 : value;
  }
  if (field === "rating") return value / 10;
  return value;
}

function buildLatestSnapshot(product: Record<string, unknown>, series: ProductPoint[]) {
  const latestPoint = series.at(-1);
  const stats = product.stats && typeof product.stats === "object" ? (product.stats as Record<string, unknown>) : {};
  const latest: Record<string, unknown> = {
    title: stringFrom(product.title) ?? stringFrom(product.productTitle) ?? stringFrom(product.name),
    brand: stringFrom(product.brand) ?? stringFrom(product.brandName),
    category: stringFrom(product.category) ?? stringFrom(product.categoryName),
    buyBoxPrice: latestPoint?.buyBoxPrice ?? toNullableNumber(stats.buyBoxPrice),
    amazonPrice: latestPoint?.amazonPrice ?? toNullableNumber(stats.amazonPrice),
    newPrice: latestPoint?.newPrice ?? toNullableNumber(stats.newPrice),
    salesRank: latestPoint?.salesRank ?? toNullableNumber(stats.salesRank),
    reviews: latestPoint?.reviews ?? toNullableNumber(stats.reviews),
    rating: latestPoint?.rating ?? toNullableNumber(stats.rating),
    revenueEstimate: toNullableNumber(stats.revenueEstimate) ?? toNullableNumber(product.revenueEstimate) ?? toNullableNumber(product.salesEstimate),
    unitsEstimate: toNullableNumber(stats.monthlySold) ?? toNullableNumber(product.monthlySold) ?? toNullableNumber(product.unitsEstimate)
  };
  return latest;
}

function collectWarnings(product: Record<string, unknown>, series: ProductPoint[]) {
  const warnings: string[] = [];
  if (!series.length) warnings.push("no_history_available");
  if (!Array.isArray(product.csv) || !product.csv.length) warnings.push("csv_missing");
  if (product.stats && typeof product.stats === "object" && !("revenueEstimate" in product.stats) && !("monthlySold" in product.stats)) {
    warnings.push("revenue_units_estimate_not_available");
  }
  return warnings;
}

function keepaMinuteToDate(keepaMinute: number) {
  const unixMillis = (keepaMinute + 21_564_000) * 60_000;
  return new Date(unixMillis).toISOString().slice(0, 10);
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toNumber(value: unknown): number | null {
  return toNullableNumber(value);
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

async function collectRawFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  if (!(await exists(root))) return result;
  await walk(root, result);
  return result;
}

async function walk(dir: string, out: string[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, out);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      out.push(fullPath);
    }
  }
}

async function safeReadJson(filePath: string) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
