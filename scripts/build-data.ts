import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

type CanonicalColumn =
  | "asin"
  | "productName"
  | "brand"
  | "category"
  | "price"
  | "units"
  | "revenue"
  | "rank"
  | "reviews"
  | "rating"
  | "sellers"
  | "date";

type CleanRecord = {
  asin: string;
  productId: string;
  productName: string;
  brand: string;
  category: string;
  date: string;
  month: string;
  price: number | null;
  units: number | null;
  revenue: number | null;
  rank: number | null;
  reviews: number | null;
  rating: number | null;
  sellers: number | null;
  sourceFile: string;
};

type ProductMonth = {
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

const root = process.cwd();
const rawDir = path.join(root, "data", "raw");
const outDir = path.join(root, "public", "data");

const columnAliases: Record<CanonicalColumn, string[]> = {
  asin: ["asin", "product asin", "product_asin", "amazon asin"],
  productName: ["product name", "title", "product title", "name", "item name"],
  brand: ["brand", "brand name"],
  category: ["category", "sub category", "product category"],
  price: ["price", "buy box price", "current price", "avg price", "average price"],
  units: [
    "monthly sales",
    "unit sales",
    "estimated sales",
    "units sold",
    "sales",
    "monthly units",
    "estimated units sold"
  ],
  revenue: [
    "monthly revenue",
    "revenue",
    "estimated revenue",
    "sales revenue",
    "monthly sales revenue"
  ],
  rank: ["rank", "bsr", "sales rank", "best sellers rank", "category rank"],
  reviews: ["reviews", "review count", "ratings count", "number of reviews"],
  rating: ["rating", "star rating", "stars", "average rating"],
  sellers: ["sellers", "seller count", "number of sellers"],
  date: ["date", "snapshot date", "tracking date", "month", "report date"]
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeProductId(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]+/g, "-");
}

function round(value: number | null | undefined, digits = 2): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (typeof value === "number" && Number.isFinite(value) ? value : 0), 0);
}

function average(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((total, value) => total + value, 0) / valid.length;
}

function parseNumber(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (input === null || input === undefined) return null;
  let value = String(input).trim();
  if (!value || /^(-|--|n\.?a\.?|nan|null)$/i.test(value)) return null;

  const negative = /^\(.*\)$/.test(value) || value.startsWith("-");
  value = value.replace(/[()]/g, "").replace(/[$,%+]/g, "").replace(/,/g, "").trim();

  const multiplierMatch = value.match(/([kmb])$/i);
  const multiplier = multiplierMatch
    ? multiplierMatch[1].toLowerCase() === "k"
      ? 1_000
      : multiplierMatch[1].toLowerCase() === "m"
        ? 1_000_000
        : 1_000_000_000
    : 1;
  value = value.replace(/[kmb]$/i, "");

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return (negative ? -parsed : parsed) * multiplier;
}

function monthFromDate(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim();
  if (!raw || /^(-|--|n\.?a\.?)$/i.test(raw)) return null;

  const yearMonth = raw.match(/(20\d{2}|19\d{2})[-_/.\s](0?[1-9]|1[0-2])\b/);
  if (yearMonth) return `${yearMonth[1]}-${yearMonth[2].padStart(2, "0")}`;

  const monthYear = raw.match(/\b(0?[1-9]|1[0-2])[-_/.\s](20\d{2}|19\d{2})\b/);
  if (monthYear) return `${monthYear[2]}-${monthYear[1].padStart(2, "0")}`;

  const parsed = new Date(raw.replace(/_/g, ":"));
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
  }

  return null;
}

function isoDateFromInput(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim();
  const ymd = raw.match(/\b(20\d{2}|19\d{2})[-_/.\s](0?[1-9]|1[0-2])[-_/.\s](0?[1-9]|[12]\d|3[01])\b/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  const parsed = new Date(raw.replace(/_/g, ":"));
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const month = monthFromDate(raw);
  return month ? `${month}-01` : null;
}

function extractMetadata(content: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  for (const line of content.split(/\r?\n/).slice(0, 20)) {
    const match = line.match(/^([^:,]+):\s*(.+)$/);
    if (match) metadata[normalizeHeader(match[1])] = match[2].trim();
  }
  return metadata;
}

function headerScore(line: string): number {
  const cells = line.split(",").map(normalizeHeader);
  const allAliases = Object.values(columnAliases).flat();
  return cells.reduce((score, cell) => score + (allAliases.includes(cell) ? 1 : 0), 0);
}

function findTable(content: string): string {
  const lines = content.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => headerScore(line) >= 2);
  return headerIndex >= 0 ? lines.slice(headerIndex).join("\n") : content;
}

function buildColumnMap(headers: string[]): Partial<Record<CanonicalColumn, string>> {
  const normalized = new Map(headers.map((header) => [normalizeHeader(header), header]));
  const map: Partial<Record<CanonicalColumn, string>> = {};

  for (const [canonical, aliases] of Object.entries(columnAliases) as Array<[CanonicalColumn, string[]]>) {
    for (const alias of aliases) {
      const exact = normalized.get(normalizeHeader(alias));
      if (exact) {
        map[canonical] = exact;
        break;
      }
    }

    if (!map[canonical]) {
      const fuzzy = headers.find((header) => {
        const normalizedHeader = normalizeHeader(header);
        return aliases.some((alias) => normalizedHeader.includes(normalizeHeader(alias)));
      });
      if (fuzzy) map[canonical] = fuzzy;
    }
  }

  return map;
}

function value(row: Record<string, unknown>, map: Partial<Record<CanonicalColumn, string>>, key: CanonicalColumn): unknown {
  const column = map[key];
  return column ? row[column] : undefined;
}

function growth(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return round(((current - previous) / previous) * 100, 1);
}

function periodGrowth<T extends { month: string; revenue: number }>(rows: T[], months: number): number | null {
  const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month));
  if (sorted.length < months * 2) return null;
  const current = sorted.slice(-months);
  const previous = sorted.slice(-(months * 2), -months);
  return growth(sum(current.map((row) => row.revenue)), sum(previous.map((row) => row.revenue)));
}

function lastValue<T>(rows: T[], selector: (row: T) => number | null): number | null {
  for (const row of [...rows].reverse()) {
    const selected = selector(row);
    if (selected !== null && Number.isFinite(selected)) return selected;
  }
  return null;
}

function readSourceFiles(): string[] {
  if (!fs.existsSync(rawDir)) {
    throw new Error(`Missing data/raw directory: ${rawDir}`);
  }
  return fs
    .readdirSync(rawDir)
    .filter((file) => file.toLowerCase().endsWith(".csv"))
    .sort();
}

const warnings: string[] = [];
const columnMappings: Record<string, Partial<Record<CanonicalColumn, string>>> = {};
const cleanRecords: CleanRecord[] = [];

for (const file of readSourceFiles()) {
  const sourceFile = path.join(rawDir, file);
  const content = fs.readFileSync(sourceFile, "utf8");
  const metadata = extractMetadata(content);
  const table = findTable(content);
  const rows = parse(table, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true
  }) as Array<Record<string, unknown>>;

  if (!rows.length) {
    warnings.push(`${file}: parsed no data rows.`);
    continue;
  }

  const headers = Object.keys(rows[0]);
  const map = buildColumnMap(headers);
  columnMappings[file] = map;

  const stat = fs.statSync(sourceFile);
  const fallbackDate = isoDateFromInput(file) ?? stat.mtime.toISOString().slice(0, 10);
  const metadataAsin = metadata["product asin"] ?? metadata.asin ?? "";
  const metadataTitle = metadata["product title"] ?? metadata["product name"] ?? metadata.title ?? "";

  for (const [index, row] of rows.entries()) {
    const parsedDate = isoDateFromInput(value(row, map, "date")) ?? isoDateFromInput(file);
    let date = parsedDate;
    if (!date) {
      date = fallbackDate;
      if (index === 0) {
        warnings.push(`${file}: date column and filename date were unavailable; file modified date was used.`);
      }
    }

    const month = monthFromDate(date);
    if (!month) {
      warnings.push(`${file}: row ${index + 1} could not be assigned to a month.`);
      continue;
    }

    const asin = String(value(row, map, "asin") ?? metadataAsin ?? "").trim().toUpperCase();
    const productName = String(value(row, map, "productName") ?? metadataTitle ?? "").trim();
    const productId = normalizeProductId(asin || productName || file.replace(/\.csv$/i, ""));

    const price = parseNumber(value(row, map, "price"));
    const units = parseNumber(value(row, map, "units"));
    const explicitRevenue = parseNumber(value(row, map, "revenue"));
    const revenue = explicitRevenue ?? (price !== null && units !== null ? price * units : null);

    cleanRecords.push({
      asin: asin || productId,
      productId,
      productName: productName || `Mighty Patch ${asin || productId}`,
      brand: String(value(row, map, "brand") ?? "Mighty Patch").trim() || "Mighty Patch",
      category: String(value(row, map, "category") ?? "").trim(),
      date,
      month,
      price,
      units,
      revenue,
      rank: parseNumber(value(row, map, "rank")),
      reviews: parseNumber(value(row, map, "reviews")),
      rating: parseNumber(value(row, map, "rating")),
      sellers: parseNumber(value(row, map, "sellers")),
      sourceFile: file
    });
  }
}

const groupedProductMonths = new Map<string, CleanRecord[]>();
for (const record of cleanRecords) {
  const key = `${record.productId}__${record.month}`;
  groupedProductMonths.set(key, [...(groupedProductMonths.get(key) ?? []), record]);
}

const monthlyProductTrend: ProductMonth[] = [...groupedProductMonths.values()]
  .map((rows) => {
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    return {
      productId: latest.productId,
      asin: latest.asin,
      productName: latest.productName,
      brand: latest.brand,
      category: latest.category,
      month: latest.month,
      revenue: round(average(sorted.map((row) => row.revenue)) ?? 0, 2) ?? 0,
      units: round(average(sorted.map((row) => row.units)) ?? 0, 0) ?? 0,
      avgPrice: round(average(sorted.map((row) => row.price)), 2),
      avgRank: round(average(sorted.map((row) => row.rank)), 0),
      reviews: round(lastValue(sorted, (row) => row.reviews), 0),
      rating: round(lastValue(sorted, (row) => row.rating), 1),
      sellers: round(lastValue(sorted, (row) => row.sellers), 0),
      revenueShare: 0,
      sourceRows: sorted.length
    };
  })
  .sort((a, b) => a.month.localeCompare(b.month) || b.revenue - a.revenue);

const groupedBrandMonths = new Map<string, ProductMonth[]>();
for (const row of monthlyProductTrend) {
  groupedBrandMonths.set(row.month, [...(groupedBrandMonths.get(row.month) ?? []), row]);
}

const monthlyBrandTrend = [...groupedBrandMonths.entries()]
  .map(([month, rows]) => {
    const revenue = sum(rows.map((row) => row.revenue));
    const units = sum(rows.map((row) => row.units));
    return {
      month,
      revenue: round(revenue, 2) ?? 0,
      units: round(units, 0) ?? 0,
      avgPrice: units ? round(revenue / units, 2) : round(average(rows.map((row) => row.avgPrice)), 2),
      avgRank: round(average(rows.map((row) => row.avgRank)), 0),
      reviews: round(sum(rows.map((row) => row.reviews)), 0) ?? 0,
      productCount: rows.length,
      momRevenueGrowth: null as number | null
    };
  })
  .sort((a, b) => a.month.localeCompare(b.month));

for (let index = 0; index < monthlyBrandTrend.length; index += 1) {
  monthlyBrandTrend[index].momRevenueGrowth = growth(
    monthlyBrandTrend[index].revenue,
    index > 0 ? monthlyBrandTrend[index - 1].revenue : null
  );
}

const brandRevenueByMonth = new Map(monthlyBrandTrend.map((row) => [row.month, row.revenue]));
for (const row of monthlyProductTrend) {
  const brandRevenue = brandRevenueByMonth.get(row.month) ?? 0;
  row.revenueShare = brandRevenue ? round((row.revenue / brandRevenue) * 100, 2) ?? 0 : 0;
}

const productRows = new Map<string, ProductMonth[]>();
for (const row of monthlyProductTrend) {
  productRows.set(row.productId, [...(productRows.get(row.productId) ?? []), row]);
}

const latestMonth = monthlyBrandTrend.at(-1)?.month ?? null;
const latestProductRows = monthlyProductTrend.filter((row) => row.month === latestMonth).sort((a, b) => b.revenue - a.revenue);
const latestRankByProduct = new Map(latestProductRows.map((row, index) => [row.productId, index + 1]));

const products = [...productRows.entries()]
  .map(([productId, rows]) => {
    const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month));
    const latest = sorted[sorted.length - 1];
    return {
      productId,
      asin: latest.asin,
      productName: latest.productName,
      brand: latest.brand,
      category: latest.category,
      firstMonth: sorted[0].month,
      latestMonth: latest.month,
      totalRevenue: round(sum(sorted.map((row) => row.revenue)), 2),
      latestRevenue: round(latest.revenue, 2),
      latestUnits: round(latest.units, 0),
      latestPrice: latest.avgPrice,
      latestRank: latest.avgRank,
      latestReviews: latest.reviews,
      latestRating: latest.rating,
      latestRevenueShare: latest.revenueShare,
      latestRevenueRank: latestRankByProduct.get(productId) ?? null,
      recent3Growth: periodGrowth(sorted, 3),
      recent6Growth: periodGrowth(sorted, 6)
    };
  })
  .sort((a, b) => (b.latestRevenue ?? 0) - (a.latestRevenue ?? 0));

function productPeriodMetric(productId: string, months: number, selector: (row: ProductMonth) => number | null): number | null {
  const rows = productRows.get(productId)?.sort((a, b) => a.month.localeCompare(b.month)) ?? [];
  if (rows.length < months * 2) return null;
  const current = average(rows.slice(-months).map(selector));
  const previous = average(rows.slice(-(months * 2), -months).map(selector));
  if (current === null || previous === null) return null;
  return round(current - previous, 2);
}

const topProductsByRevenue = products.slice(0, 8);
const topProductsByGrowth = [...products]
  .filter((product) => product.recent3Growth !== null)
  .sort((a, b) => (b.recent3Growth ?? -Infinity) - (a.recent3Growth ?? -Infinity))
  .slice(0, 8);
const decliningProducts = [...products]
  .filter((product) => product.recent3Growth !== null)
  .sort((a, b) => (a.recent3Growth ?? Infinity) - (b.recent3Growth ?? Infinity))
  .slice(0, 8);
const bsrImprovers = products
  .map((product) => ({
    ...product,
    bsrImprovement: productPeriodMetric(product.productId, 3, (row) => row.avgRank)
  }))
  .filter((product) => product.bsrImprovement !== null)
  .sort((a, b) => (a.bsrImprovement ?? Infinity) - (b.bsrImprovement ?? Infinity))
  .slice(0, 8);
const reviewGrowers = products
  .map((product) => ({
    ...product,
    reviewGrowth: productPeriodMetric(product.productId, 3, (row) => row.reviews)
  }))
  .filter((product) => product.reviewGrowth !== null)
  .sort((a, b) => (b.reviewGrowth ?? -Infinity) - (a.reviewGrowth ?? -Infinity))
  .slice(0, 8);

const latestBrand = monthlyBrandTrend.at(-1) ?? null;
const bestRevenueMonth = [...monthlyBrandTrend].sort((a, b) => b.revenue - a.revenue)[0] ?? null;

const summary = {
  generatedAt: new Date().toISOString(),
  sourceFileCount: readSourceFiles().length,
  sourceRowCount: cleanRecords.length,
  productCount: products.length,
  monthCount: monthlyBrandTrend.length,
  firstMonth: monthlyBrandTrend[0]?.month ?? null,
  latestMonth,
  latestRevenue: latestBrand?.revenue ?? 0,
  latestUnits: latestBrand?.units ?? 0,
  latestAveragePrice: latestBrand?.avgPrice ?? null,
  latestAverageRank: latestBrand?.avgRank ?? null,
  latestReviews: latestBrand?.reviews ?? 0,
  latestProductCount: latestBrand?.productCount ?? 0,
  latestMomGrowth: latestBrand?.momRevenueGrowth ?? null,
  recent3Growth: periodGrowth(monthlyBrandTrend, 3),
  recent6Growth: periodGrowth(monthlyBrandTrend, 6),
  recent12Growth: periodGrowth(monthlyBrandTrend, 12),
  bestRevenueMonth,
  topProductsByRevenue,
  topProductsByGrowth,
  decliningProducts,
  bsrImprovers,
  reviewGrowers,
  warnings,
  columnMappings,
  notes: [
    "Daily Catalyst rows are treated as daily snapshots of monthly estimates. Product-month revenue and unit sales are averaged within each month, then summed across products for the brand trend.",
    "When revenue is absent, it is estimated as price multiplied by unit sales."
  ]
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "products.json"), JSON.stringify(products, null, 2));
fs.writeFileSync(path.join(outDir, "monthly_brand_trend.json"), JSON.stringify(monthlyBrandTrend, null, 2));
fs.writeFileSync(path.join(outDir, "monthly_product_trend.json"), JSON.stringify(monthlyProductTrend, null, 2));
fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

console.log(`Built data from ${summary.sourceFileCount} CSV files.`);
console.log(`Products: ${summary.productCount}, months: ${summary.monthCount}, rows: ${summary.sourceRowCount}`);
if (warnings.length) {
  console.warn(`Warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 10)) console.warn(`- ${warning}`);
}
