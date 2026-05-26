import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

type Company = "coway" | "samyang" | "tnl";
type CanonicalColumn =
  | "date"
  | "asin"
  | "product_name"
  | "brand"
  | "category"
  | "price"
  | "monthly_sales"
  | "monthly_revenue"
  | "bsr"
  | "reviews"
  | "rating"
  | "sellers";

type FileAudit = {
  company: Company;
  source_folder: string;
  file_name: string;
  file_path: string;
  asin: string | null;
  report_generated_at: string | null;
  raw_row_count: number;
  raw_column_count: number;
  raw_columns: string[];
  date_column: string | null;
  asin_column: string | null;
  product_name_column: string | null;
  brand_column: string | null;
  category_column: string | null;
  price_column: string | null;
  monthly_sales_column: string | null;
  monthly_revenue_column: string | null;
  bsr_column: string | null;
  reviews_column: string | null;
  rating_column: string | null;
  sellers_column: string | null;
  derived_monthly_revenue: boolean;
  date_source: "table" | "metadata_or_filename" | "missing";
  filename_date_hint: string | null;
  date_min: string | null;
  date_max: string | null;
  distinct_months: number;
  date_missing_rows: number;
  price_nonzero_rows: number;
  price_zero_rows: number;
  price_na_rows: number;
  monthly_sales_na_rows: number;
  bsr_na_rows: number;
  reviews_na_rows: number;
  rating_na_rows: number;
  sellers_na_rows: number;
  auto_mappable_columns: string[];
  uncertain_columns: string[];
  missing_standard_columns: string[];
  numeric_format_flags: string[];
  data_quality_warnings: string[];
};

type Summary = {
  file_count: number;
  total_rows: number;
  unique_asin_count: number;
  company_counts: Record<Company, number>;
  raw_folder_counts: Record<string, number>;
  standard_column_presence: Record<CanonicalColumn, number>;
  standard_column_missing: Record<CanonicalColumn, number>;
  derived_monthly_revenue_files: number;
  files_with_date_column: number;
  files_with_date_fallback_needed: number;
  files_with_no_units: number;
  files_with_no_rank: number;
  files_with_high_price_zero_share: number;
  files_with_missing_core_fields: number;
  unique_raw_headers: Array<{ header: string; file_count: number }>;
};

const root = process.cwd();
const rawRoot = path.join(root, "data", "raw", "amazon_us");
const processedRoot = path.join(root, "data", "processed");
const outputJson = path.join(processedRoot, "csv_column_audit.json");
const outputCsv = path.join(processedRoot, "csv_column_audit.csv");

const folderToCompany: Record<string, Company> = {
  cuckoo: "coway",
  coway: "coway",
  samyang: "samyang",
  tnl: "tnl"
};

const aliasMap: Record<CanonicalColumn, string[]> = {
  date: ["date", "month", "snapshot date", "tracking date", "report date"],
  asin: ["asin", "product asin", "product_asin", "amazon asin"],
  product_name: ["product name", "title", "name", "product title", "item name"],
  brand: ["brand", "brand name"],
  category: ["category", "product category", "sub category"],
  price: ["price", "current price", "avg price", "average price", "buy box price"],
  monthly_sales: [
    "monthly sales",
    "unit sales",
    "estimated sales",
    "units sold",
    "sales",
    "monthly units",
    "estimated units sold"
  ],
  monthly_revenue: ["monthly revenue", "revenue", "estimated revenue", "sales revenue", "monthly sales revenue"],
  bsr: ["rank", "bsr", "sales rank", "best sellers rank", "category rank"],
  reviews: ["reviews", "review count", "ratings count", "number of reviews"],
  rating: ["rating", "star rating", "stars", "average rating"],
  sellers: ["sellers", "seller count", "number of sellers"]
};

const standardColumns: CanonicalColumn[] = [
  "date",
  "asin",
  "product_name",
  "brand",
  "category",
  "price",
  "monthly_sales",
  "monthly_revenue",
  "bsr",
  "reviews",
  "rating",
  "sellers"
];

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function parseNumber(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const raw = normalizeString(input);
  if (!raw || /^(-|--|n\.?a\.?|nan|null)$/i.test(raw)) return null;

  const negative = /^\(.*\)$/.test(raw) || raw.startsWith("-");
  let value = raw.replace(/[()]/g, "").replace(/[$,%+]/g, "").replace(/,/g, "").trim();

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
  const raw = normalizeString(input);
  if (!raw || /^(-|--|n\.?a\.?|nan|null)$/i.test(raw)) return null;

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
  const raw = normalizeString(input);
  if (!raw || /^(-|--|n\.?a\.?|nan|null)$/i.test(raw)) return null;

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
  const allAliases = Object.values(aliasMap).flat().map(normalizeHeader);
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

  for (const [canonical, aliases] of Object.entries(aliasMap) as Array<[CanonicalColumn, string[]]>) {
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

function readAllCsvFiles(): Array<{ filePath: string; sourceFolder: string; company: Company }> {
  if (!fs.existsSync(rawRoot)) {
    throw new Error(`Missing data/raw/amazon_us directory: ${rawRoot}`);
  }

  const items: Array<{ filePath: string; sourceFolder: string; company: Company }> = [];
  for (const entry of fs.readdirSync(rawRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const company = folderToCompany[entry.name];
    if (!company) continue;

    const folderPath = path.join(rawRoot, entry.name);
    for (const fileName of fs.readdirSync(folderPath)) {
      if (!fileName.toLowerCase().endsWith(".csv")) continue;
      items.push({ filePath: path.join(folderPath, fileName), sourceFolder: entry.name, company });
    }
  }

  return items.sort((a, b) => a.filePath.localeCompare(b.filePath));
}

function detectNumericFlags(values: unknown[]): string[] {
  const flags = new Set<string>();
  for (const value of values) {
    const raw = normalizeString(value);
    if (!raw) continue;
    if (/[$₩]/.test(raw)) flags.add("currency_symbol");
    if (/,/.test(raw)) flags.add("comma_grouping");
    if (/[kK]\b/.test(raw)) flags.add("k_suffix");
    if (/[mM]\b/.test(raw)) flags.add("m_suffix");
    if (/%/.test(raw)) flags.add("percent_sign");
  }
  return [...flags];
}

function joinCsv(values: string[]): string {
  return values.join(" | ");
}

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv(rows: FileAudit[]): string {
  const headers: Array<keyof FileAudit> = [
    "company",
    "source_folder",
    "file_name",
    "file_path",
    "asin",
    "report_generated_at",
    "raw_row_count",
    "raw_column_count",
    "raw_columns",
    "date_column",
    "asin_column",
    "product_name_column",
    "brand_column",
    "category_column",
    "price_column",
    "monthly_sales_column",
    "monthly_revenue_column",
    "bsr_column",
    "reviews_column",
    "rating_column",
    "sellers_column",
    "derived_monthly_revenue",
    "date_source",
    "filename_date_hint",
    "date_min",
    "date_max",
    "distinct_months",
    "date_missing_rows",
    "price_nonzero_rows",
    "price_zero_rows",
    "price_na_rows",
    "monthly_sales_na_rows",
    "bsr_na_rows",
    "reviews_na_rows",
    "rating_na_rows",
    "sellers_na_rows",
    "auto_mappable_columns",
    "uncertain_columns",
    "missing_standard_columns",
    "numeric_format_flags",
    "data_quality_warnings"
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      headers
        .map((header) => {
          const value = row[header];
          if (Array.isArray(value)) return toCsvValue(joinCsv(value));
          return toCsvValue(value);
        })
        .join(",")
    );
  }
  return lines.join("\n");
}

const files = readAllCsvFiles();
const audits: FileAudit[] = [];
const uniqueAsins = new Set<string>();
const headerFrequency = new Map<string, number>();
const companyCounts: Record<Company, number> = { coway: 0, samyang: 0, tnl: 0 };
const rawFolderCounts: Record<string, number> = {};
const standardColumnPresence: Record<CanonicalColumn, number> = {
  date: 0,
  asin: 0,
  product_name: 0,
  brand: 0,
  category: 0,
  price: 0,
  monthly_sales: 0,
  monthly_revenue: 0,
  bsr: 0,
  reviews: 0,
  rating: 0,
  sellers: 0
};
const standardColumnMissing: Record<CanonicalColumn, number> = {
  date: 0,
  asin: 0,
  product_name: 0,
  brand: 0,
  category: 0,
  price: 0,
  monthly_sales: 0,
  monthly_revenue: 0,
  bsr: 0,
  reviews: 0,
  rating: 0,
  sellers: 0
};

let totalRows = 0;
let derivedMonthlyRevenueFiles = 0;
let filesWithDateColumn = 0;
let filesWithDateFallbackNeeded = 0;
let filesWithNoUnits = 0;
let filesWithNoRank = 0;
let filesWithHighPriceZeroShare = 0;
let filesWithMissingCoreFields = 0;

for (const { filePath, sourceFolder, company } of files) {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const metadata = extractMetadata(content);
  const table = findTable(content);

  const rows = parse(table, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true
  }) as Array<Record<string, unknown>>;

  if (!rows.length) continue;

  const headers = Object.keys(rows[0]);
  headers.forEach((header) => headerFrequency.set(header, (headerFrequency.get(header) ?? 0) + 1));
  totalRows += rows.length;
  companyCounts[company] += 1;
  rawFolderCounts[sourceFolder] = (rawFolderCounts[sourceFolder] ?? 0) + 1;

  const columnMap = buildColumnMap(headers);
  const asinFromMetadata = metadata["product asin"] ?? null;
  const reportGeneratedAt = metadata["report generated at"] ?? null;
  const filenameDateHint = fileName.match(/(20\d{2})[-_](\d{2})(?:[-_](\d{2}))?/)?.[0] ?? null;

  const dateValues: string[] = [];
  const numericRawSamples: Record<string, unknown[]> = {
    price: [],
    monthly_sales: [],
    bsr: [],
    reviews: [],
    rating: [],
    sellers: []
  };

  let dateMissingRows = 0;
  let priceZeroRows = 0;
  let priceNaRows = 0;
  let monthlySalesNaRows = 0;
  let bsrNaRows = 0;
  let reviewsNaRows = 0;
  let ratingNaRows = 0;
  let sellersNaRows = 0;
  let priceNonzeroRows = 0;
  let canDeriveMonthlyRevenue = false;

  for (const row of rows) {
    const rawDate = columnMap.date ? row[columnMap.date] : undefined;
    let date = isoDateFromInput(rawDate);
    if (!date) {
      date = isoDateFromInput(filenameDateHint) ?? null;
      if (date) filesWithDateFallbackNeeded += 1;
    }
    if (!date) dateMissingRows += 1;
    else dateValues.push(date);

    const price = parseNumber(columnMap.price ? row[columnMap.price] : undefined);
    const monthlySales = parseNumber(columnMap.monthly_sales ? row[columnMap.monthly_sales] : undefined);
    const bsr = parseNumber(columnMap.bsr ? row[columnMap.bsr] : undefined);
    const reviews = parseNumber(columnMap.reviews ? row[columnMap.reviews] : undefined);
    const rating = parseNumber(columnMap.rating ? row[columnMap.rating] : undefined);
    const sellers = parseNumber(columnMap.sellers ? row[columnMap.sellers] : undefined);
    const revenue = parseNumber(columnMap.monthly_revenue ? row[columnMap.monthly_revenue] : undefined);

    numericRawSamples.price.push(columnMap.price ? row[columnMap.price] : undefined);
    numericRawSamples.monthly_sales.push(columnMap.monthly_sales ? row[columnMap.monthly_sales] : undefined);
    numericRawSamples.bsr.push(columnMap.bsr ? row[columnMap.bsr] : undefined);
    numericRawSamples.reviews.push(columnMap.reviews ? row[columnMap.reviews] : undefined);
    numericRawSamples.rating.push(columnMap.rating ? row[columnMap.rating] : undefined);
    numericRawSamples.sellers.push(columnMap.sellers ? row[columnMap.sellers] : undefined);

    if (price === null) priceNaRows += 1;
    else {
      if (price === 0) priceZeroRows += 1;
      else priceNonzeroRows += 1;
    }

    if (monthlySales === null) monthlySalesNaRows += 1;
    if (bsr === null) bsrNaRows += 1;
    if (reviews === null) reviewsNaRows += 1;
    if (rating === null) ratingNaRows += 1;
    if (sellers === null) sellersNaRows += 1;

    if (revenue === null && price !== null && monthlySales !== null) canDeriveMonthlyRevenue = true;
  }

  const months = [...new Set(dateValues.map((value) => value.slice(0, 7)))].sort();
  const dateMin = dateValues.length ? [...dateValues].sort()[0] : null;
  const dateMax = dateValues.length ? [...dateValues].sort().at(-1) ?? null : null;

  const mappedColumns = {
    date: columnMap.date ?? null,
    asin: asinFromMetadata ? "metadata: product asin" : columnMap.asin ?? null,
    product_name: columnMap.product_name ?? null,
    brand: columnMap.brand ?? null,
    category: columnMap.category ?? null,
    price: columnMap.price ?? null,
    monthly_sales: columnMap.monthly_sales ?? null,
    monthly_revenue: columnMap.monthly_revenue ?? (canDeriveMonthlyRevenue ? "derived from price x monthly_sales" : null),
    bsr: columnMap.bsr ?? null,
    reviews: columnMap.reviews ?? null,
    rating: columnMap.rating ?? null,
    sellers: columnMap.sellers ?? null
  };

  const autoMappableColumns = standardColumns.filter((column) => mappedColumns[column] !== null);
  const uncertainColumns = standardColumns.filter((column) => mappedColumns[column] === null);
  const missingStandardColumns = standardColumns.filter((column) => mappedColumns[column] === null);

  for (const column of standardColumns) {
    if (mappedColumns[column] !== null) standardColumnPresence[column] += 1;
    else standardColumnMissing[column] += 1;
  }

  if (asinFromMetadata) uniqueAsins.add(asinFromMetadata);
  if (columnMap.date) filesWithDateColumn += 1;
  if (monthlySalesNaRows === rows.length) filesWithNoUnits += 1;
  if (bsrNaRows === rows.length) filesWithNoRank += 1;
  if (priceZeroRows / rows.length >= 0.9) filesWithHighPriceZeroShare += 1;
  if (mappedColumns.product_name === null && mappedColumns.brand === null && mappedColumns.category === null) {
    filesWithMissingCoreFields += 1;
  }
  if (canDeriveMonthlyRevenue) derivedMonthlyRevenueFiles += 1;

  const numericFormatFlags = [
    ...new Set([
      ...detectNumericFlags(numericRawSamples.price),
      ...detectNumericFlags(numericRawSamples.monthly_sales),
      ...detectNumericFlags(numericRawSamples.bsr),
      ...detectNumericFlags(numericRawSamples.reviews),
      ...detectNumericFlags(numericRawSamples.rating),
      ...detectNumericFlags(numericRawSamples.sellers)
    ])
  ];

  const dataQualityWarnings: string[] = [];
  if (!columnMap.date) {
    if (filenameDateHint) dataQualityWarnings.push(`date column missing; filename date hint available: ${filenameDateHint}`);
    else dataQualityWarnings.push("date column missing; no filename date hint available");
  }
  if (priceZeroRows / rows.length >= 0.9) dataQualityWarnings.push(`price is zero in ${priceZeroRows}/${rows.length} rows`);
  if (monthlySalesNaRows === rows.length) dataQualityWarnings.push("monthly_sales missing for all rows");
  if (bsrNaRows === rows.length) dataQualityWarnings.push("bsr missing for all rows");
  if (reviewsNaRows === rows.length) dataQualityWarnings.push("reviews missing for all rows");
  if (ratingNaRows === rows.length) dataQualityWarnings.push("rating missing for all rows");
  if (sellersNaRows === rows.length) dataQualityWarnings.push("sellers missing for all rows");
  if (mappedColumns.monthly_revenue === null && canDeriveMonthlyRevenue) dataQualityWarnings.push("monthly_revenue can be derived from price x monthly_sales");
  if (mappedColumns.product_name === null) dataQualityWarnings.push("product_name not present in source");
  if (mappedColumns.brand === null) dataQualityWarnings.push("brand not present in source");
  if (mappedColumns.category === null) dataQualityWarnings.push("category not present in source");
  if (mappedColumns.sellers === null) dataQualityWarnings.push("sellers not present in source");

  const dateSource: FileAudit["date_source"] = columnMap.date ? "table" : filenameDateHint ? "metadata_or_filename" : "missing";

  audits.push({
    company,
    source_folder: sourceFolder,
    file_name: fileName,
    file_path: path.relative(root, filePath),
    asin: asinFromMetadata,
    report_generated_at: reportGeneratedAt,
    raw_row_count: rows.length,
    raw_column_count: headers.length,
    raw_columns: headers,
    date_column: columnMap.date ?? null,
    asin_column: columnMap.asin ?? null,
    product_name_column: columnMap.product_name ?? null,
    brand_column: columnMap.brand ?? null,
    category_column: columnMap.category ?? null,
    price_column: columnMap.price ?? null,
    monthly_sales_column: columnMap.monthly_sales ?? null,
    monthly_revenue_column: columnMap.monthly_revenue ?? null,
    bsr_column: columnMap.bsr ?? null,
    reviews_column: columnMap.reviews ?? null,
    rating_column: columnMap.rating ?? null,
    sellers_column: columnMap.sellers ?? null,
    derived_monthly_revenue: canDeriveMonthlyRevenue,
    date_source: dateSource,
    filename_date_hint: filenameDateHint,
    date_min: dateMin,
    date_max: dateMax,
    distinct_months: months.length,
    date_missing_rows: dateMissingRows,
    price_nonzero_rows: priceNonzeroRows,
    price_zero_rows: priceZeroRows,
    price_na_rows: priceNaRows,
    monthly_sales_na_rows: monthlySalesNaRows,
    bsr_na_rows: bsrNaRows,
    reviews_na_rows: reviewsNaRows,
    rating_na_rows: ratingNaRows,
    sellers_na_rows: sellersNaRows,
    auto_mappable_columns: autoMappableColumns,
    uncertain_columns: uncertainColumns,
    missing_standard_columns: missingStandardColumns,
    numeric_format_flags: numericFormatFlags,
    data_quality_warnings: dataQualityWarnings
  });
}

const summary: Summary = {
  file_count: audits.length,
  total_rows: totalRows,
  unique_asin_count: uniqueAsins.size,
  company_counts: companyCounts,
  raw_folder_counts: rawFolderCounts,
  standard_column_presence: standardColumnPresence,
  standard_column_missing: standardColumnMissing,
  derived_monthly_revenue_files: derivedMonthlyRevenueFiles,
  files_with_date_column: filesWithDateColumn,
  files_with_date_fallback_needed: filesWithDateFallbackNeeded,
  files_with_no_units: filesWithNoUnits,
  files_with_no_rank: filesWithNoRank,
  files_with_high_price_zero_share: filesWithHighPriceZeroShare,
  files_with_missing_core_fields: filesWithMissingCoreFields,
  unique_raw_headers: [...headerFrequency.entries()]
    .map(([header, fileCount]) => ({ header, file_count: fileCount }))
    .sort((a, b) => b.file_count - a.file_count || a.header.localeCompare(b.header))
};

fs.mkdirSync(processedRoot, { recursive: true });
fs.writeFileSync(outputJson, JSON.stringify({ generated_at: new Date().toISOString(), summary, files: audits }, null, 2));
fs.writeFileSync(outputCsv, writeCsv(audits));

console.log(`Wrote ${outputJson}`);
console.log(`Wrote ${outputCsv}`);
