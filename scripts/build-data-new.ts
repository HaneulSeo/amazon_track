import fs from "node:fs";
import { spawnSync } from "node:child_process";
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

type RawFileMeta = {
  company: Company;
  source_folder: string;
  file_name: string;
  file_path: string;
  asin: string;
  report_generated_at: string | null;
};

type DailyRecord = RawFileMeta & {
  product_name: string;
  product_family: string;
  family_confidence: "high" | "medium" | "low";
  date: string | null;
  month: string;
  price: number | null;
  monthly_sales: number | null;
  monthly_revenue: number | null;
  bsr: number | null;
  reviews: number | null;
  rating: number | null;
  sellers: number | null;
  revenue_source: "explicit" | "derived" | "missing";
  data_quality_warnings: string[];
};

type MonthlyProductRow = {
  company: Company;
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

type CompanyMonthlyRow = {
  company: Company;
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

type FamilyMonthlyRow = {
  company: Company;
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

type TradeMonthlyRow = {
  company: Company;
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
};

type TradeQuarterlyRow = {
  company: Company;
  company_label: string;
  product_line: string;
  country_scope: string;
  quarter: string;
  export_value_usd: number | null;
  export_value_krw: number | null;
  export_weight_kg: number | null;
  domestic_company_count: number | null;
  foreign_counterparty_count: number | null;
};

type CountryTradeMonthlyRow = {
  company: Company;
  company_label: string;
  country_scope: string;
  month: string;
  quarter: string;
  export_value_usd: number | null;
  export_value_krw: number | null;
  export_weight_kg: number | null;
};

type DartQuarterlyRevenueRow = {
  company: Company;
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

type QuarterlyComparisonRow = {
  company: Company;
  quarter: string;
  externalRevenueEokKrw: number | null;
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

type CoverageScoreRow = {
  company: Company;
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
};

type SourceGapRow = {
  company: Company;
  source_name: string;
  source_type: "official" | "marketplace" | "trade" | "retailer" | "social" | "manual" | "api";
  priority: number;
  current_status: "available" | "missing" | "manual_required" | "api_required";
  description: string;
  why_it_matters: string;
};

type CompanyExposureConfig = {
  total_revenue_exposure: Record<string, number>;
  amazon_us_direct_coverage_of_total: {
    low: number;
    base: number;
    high: number;
  };
  interpretation: string;
};

type CompanyExposureFileConfig = {
  ticker: string;
  total_revenue_exposure: Record<string, number>;
  amazon_us_direct_coverage_of_total: {
    low: number;
    base: number;
    high: number;
  };
  interpretation: string;
  next_data_to_collect: string[];
};

type ProductFamilyRules = {
  samyang: {
    default_line: string;
    sauce_bundle_asins: string[];
  };
};

type CompanyIndustryMeta = {
  id: string;
  name: string;
  company: Company;
  display_name: string;
};

type ExistingDashboardJson = {
  generated_at?: string;
  summary?: Record<string, unknown>;
  company_exposure?: Record<string, unknown>;
  overview?: Record<string, unknown>;
  industries?: unknown[];
  companies?: unknown[];
  monthlyTrend?: unknown[];
  productFamilies?: unknown[];
  products?: unknown[];
  regionalExposure?: unknown[];
  missingDataChecklist?: unknown[];
  methodologyNotes?: unknown[];
  tables?: {
    amazon_us_monthly?: MonthlyProductRow[];
    company_monthly_proxy?: CompanyMonthlyRow[];
    product_family_monthly?: FamilyMonthlyRow[];
    company_coverage_score?: CoverageScoreRow[];
    source_gap_map?: SourceGapRow[];
    trass_trade_monthly?: TradeMonthlyRow[];
    trass_trade_quarterly?: TradeQuarterlyRow[];
    trass_country_monthly?: CountryTradeMonthlyRow[];
    dart_quarterly_revenue?: DartQuarterlyRevenueRow[];
    quarterly_comparison?: QuarterlyComparisonRow[];
  };
};

const root = process.cwd();
const rawRoot = path.join(root, "data", "raw", "amazon_us");
const processedRoot = path.join(root, "data", "processed");
const publicDataRoot = path.join(root, "public", "data");
const exposureConfigPath = path.join(root, "data", "config", "company_exposure.yml");
const productFamilyRulesPath = path.join(root, "data", "config", "product_family_rules.yml");
const companyIndustryMeta: Record<Company, CompanyIndustryMeta> = {
  coway: {
    id: "home-appliance-rental",
    name: "Home Appliance / Rental",
    company: "coway",
    display_name: "Coway"
  },
  samyang: {
    id: "food-k-food",
    name: "Food / K-Food",
    company: "samyang",
    display_name: "Samyang"
  },
  tnl: {
    id: "beauty-healthcare-patch",
    name: "Beauty / Healthcare Patch",
    company: "tnl",
    display_name: "T&L"
  }
};

const companyGapConfigs: Record<
  Company,
  {
    channelGapScore: number;
    regionGapScore: number;
    bias: number;
    requiredSources: SourceGapRow[];
  }
> = {
  coway: {
    channelGapScore: 92,
    regionGapScore: 90,
    bias: -10,
    requiredSources: [
      {
        company: "coway",
        source_name: "Amazon US raw CSV",
        source_type: "marketplace",
        priority: 1,
        current_status: "available",
        description: "현재 보유한 Amazon US 판매량/매출 추정 CSV",
        why_it_matters: "Airmega 미국 수요 방향을 확인하는 핵심 proxy"
      },
      {
        company: "coway",
        source_name: "DART/IR consolidated revenue",
        source_type: "official",
        priority: 1,
        current_status: "api_required",
        description: "연결 매출, 국내 매출, 해외법인 매출",
        why_it_matters: "Amazon US가 전사 매출의 일부일 뿐이어서 region mix를 맞춰야 함"
      },
      {
        company: "coway",
        source_name: "Korea rental metrics",
        source_type: "official",
        priority: 1,
        current_status: "manual_required",
        description: "렌탈 계정 수, 순증, 해지율, ARPU, 정수기/BEREX/비데 지표",
        why_it_matters: "전사 매출의 핵심 드라이버"
      },
      {
        company: "coway",
        source_name: "Malaysia SKU and promotion data",
        source_type: "retailer",
        priority: 2,
        current_status: "manual_required",
        description: "Coway Malaysia 공식몰/eMall 정수기 SKU, 렌탈 플랜, 프로모션",
        why_it_matters: "말레이시아가 전사 매출 비중이 높음"
      },
      {
        company: "coway",
        source_name: "US retail coverage",
        source_type: "retailer",
        priority: 2,
        current_status: "manual_required",
        description: "Cowaymega, Walmart, BestBuy, HomeDepot, Target, Amazon Airmega/필터",
        why_it_matters: "Amazon US만으로는 미국 채널 coverage가 불완전함"
      },
      {
        company: "coway",
        source_name: "Thailand and Indonesia retail/trend data",
        source_type: "social",
        priority: 3,
        current_status: "manual_required",
        description: "공식몰, Shopee, Lazada, Google Trends",
        why_it_matters: "동남아 지역 수요 보정"
      }
    ]
  },
  samyang: {
    channelGapScore: 88,
    regionGapScore: 93,
    bias: 0,
    requiredSources: [
      {
        company: "samyang",
        source_name: "Amazon US raw CSV",
        source_type: "marketplace",
        priority: 1,
        current_status: "available",
        description: "현재 보유한 Amazon US 판매량/매출 추정 CSV",
        why_it_matters: "미국 Buldak 수요 proxy"
      },
      {
        company: "samyang",
        source_name: "DART consolidated revenue and inventory",
        source_type: "official",
        priority: 1,
        current_status: "api_required",
        description: "연결 매출, 수출/내수, 종속회사 매출, 재고, 매출채권",
        why_it_matters: "전사 매출과 재고 사이클 연결"
      },
      {
        company: "samyang",
        source_name: "HS 190230 exports",
        source_type: "trade",
        priority: 1,
        current_status: "api_required",
        description: "국가별 월별 라면 수출액, 중량, 단가",
        why_it_matters: "미국 외 중국/동남아/일본/유럽 흐름을 잡아야 함"
      },
      {
        company: "samyang",
        source_name: "US retailer coverage",
        source_type: "retailer",
        priority: 2,
        current_status: "manual_required",
        description: "Walmart, Costco, Kroger, Target, Instacart, Amazon, TikTok trend",
        why_it_matters: "Amazon US만으로는 대형 리테일 비중을 놓침"
      },
      {
        company: "samyang",
        source_name: "China platform signals",
        source_type: "social",
        priority: 2,
        current_status: "manual_required",
        description: "Tmall, JD, Douyin, Pinduoduo, Xiaohongshu, Baidu Index",
        why_it_matters: "중국 수요를 별도로 봐야 전사 매출이 왜곡되지 않음"
      },
      {
        company: "samyang",
        source_name: "Southeast Asia signals",
        source_type: "social",
        priority: 3,
        current_status: "manual_required",
        description: "Shopee, Lazada, TikTok Shop, Google Trends",
        why_it_matters: "해외 매출의 큰 축"
      },
      {
        company: "samyang",
        source_name: "Japan retailer signals",
        source_type: "retailer",
        priority: 3,
        current_status: "manual_required",
        description: "Amazon JP, Rakuten, Qoo10, Yahoo Shopping",
        why_it_matters: "일본 수요 보정"
      },
      {
        company: "samyang",
        source_name: "Europe and Australia retailer signals",
        source_type: "retailer",
        priority: 4,
        current_status: "manual_required",
        description: "Amazon UK/DE/FR, Tesco, Carrefour, Woolworths",
        why_it_matters: "서구권 확산 정도 확인"
      }
    ]
  },
  tnl: {
    channelGapScore: 84,
    regionGapScore: 88,
    bias: 6,
    requiredSources: [
      {
        company: "tnl",
        source_name: "Amazon US raw CSV",
        source_type: "marketplace",
        priority: 1,
        current_status: "available",
        description: "현재 보유한 Amazon US 판매량/매출 추정 CSV",
        why_it_matters: "Mighty Patch 방향성 proxy"
      },
      {
        company: "tnl",
        source_name: "DART quarterly sales",
        source_type: "official",
        priority: 1,
        current_status: "api_required",
        description: "분기 매출, 창상피복재 매출, 재고, 매출채권",
        why_it_matters: "sell-through와 sell-in lag를 맞추기 위한 기준점"
      },
      {
        company: "tnl",
        source_name: "Church & Dwight SEC hero signals",
        source_type: "official",
        priority: 1,
        current_status: "api_required",
        description: "10-K, 10-Q, 8-K의 Hero, Mighty Patch, inventory, retailer inventory reductions, consumption growth 문장",
        why_it_matters: "경쟁사 실적 코멘트가 수요 방향성을 알려줌"
      },
      {
        company: "tnl",
        source_name: "Keepa ASIN history",
        source_type: "api",
        priority: 1,
        current_status: "api_required",
        description: "ASIN별 가격, BSR, 리뷰, Buy Box, offer count, stockout history",
        why_it_matters: "sell-through 강도와 재고 이슈를 파악"
      },
      {
        company: "tnl",
        source_name: "Non-Amazon retail signals",
        source_type: "retailer",
        priority: 2,
        current_status: "manual_required",
        description: "Target, Walmart, CVS, Walgreens, Ulta, Hero 공식몰, iHerb",
        why_it_matters: "Amazon US 1채널에 과의존하지 않도록 보정"
      },
      {
        company: "tnl",
        source_name: "HS export data",
        source_type: "trade",
        priority: 2,
        current_status: "api_required",
        description: "HS 300510, 300590, 330499의 한국→미국 월별 수출액/중량/단가",
        why_it_matters: "공급/출하 흐름 확인"
      },
      {
        company: "tnl",
        source_name: "B/L search data",
        source_type: "manual",
        priority: 3,
        current_status: "manual_required",
        description: "ImportYeti, Panjiva, ImportGenius에서 회사명 및 핵심 키워드 검색",
        why_it_matters: "거래 흐름의 보조 신호"
      }
    ]
  }
};

const columnAliases: Record<CanonicalColumn, string[]> = {
  date: ["date", "month", "snapshot date", "tracking date"],
  asin: ["asin"],
  product_name: ["product name", "title", "name"],
  brand: ["brand"],
  category: ["category"],
  price: ["price"],
  monthly_sales: ["monthly sales", "unit sales", "units sold", "estimated sales", "sales"],
  monthly_revenue: ["monthly revenue", "revenue", "estimated revenue"],
  bsr: ["rank", "bsr", "sales rank"],
  reviews: ["reviews", "review count"],
  rating: ["rating"],
  sellers: ["sellers", "seller count"]
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function isMissingLike(value: unknown): boolean {
  const text = normalizeText(value);
  return !text || /^(-|--|n\.?a\.?|nan|null)$/i.test(text);
}

function parseNumber(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const raw = normalizeText(input);
  if (isMissingLike(raw)) return null;

  const negative = /^\(.*\)$/.test(raw) || raw.startsWith("-");
  let value = raw.replace(/[()]/g, "").replace(/[$₩,%\s]/g, "").replace(/,/g, "");
  const suffixMatch = value.match(/([kmb])$/i);
  const multiplier = suffixMatch
    ? suffixMatch[1].toLowerCase() === "k"
      ? 1_000
      : suffixMatch[1].toLowerCase() === "m"
        ? 1_000_000
        : 1_000_000_000
    : 1;
  value = value.replace(/[kmb]$/i, "");
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return (negative ? -parsed : parsed) * multiplier;
}

function parseDateLike(input: unknown): string | null {
  const raw = normalizeText(input);
  if (isMissingLike(raw)) return null;
  const ymd = raw.match(/\b(20\d{2}|19\d{2})[-_/.\s](0?[1-9]|1[0-2])[-_/.\s](0?[1-9]|[12]\d|3[01])\b/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  const ym = raw.match(/\b(20\d{2}|19\d{2})[-_/.\s](0?[1-9]|1[0-2])\b/);
  if (ym) return `${ym[1]}-${ym[2].padStart(2, "0")}-01`;
  const my = raw.match(/\b(0?[1-9]|1[0-2])[-_/.\s](20\d{2}|19\d{2})\b/);
  if (my) return `${my[2]}-${my[1].padStart(2, "0")}-01`;
  const parsed = new Date(raw.replace(/_/g, ":"));
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function parseMonth(input: string | null): string {
  if (!input) return "unknown_month";
  const parsed = parseDateLike(input);
  if (parsed) return parsed.slice(0, 7);
  const match = input.match(/^(20\d{2}|19\d{2})[-_/.\s](0[1-9]|1[0-2])\b/);
  if (match) return `${match[1]}-${match[2]}`;
  return "unknown_month";
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
  const allAliases = Object.values(columnAliases).flat().map(normalizeHeader);
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
      const fuzzy = headers.find((header) => aliases.some((alias) => normalizeHeader(header).includes(normalizeHeader(alias))));
      if (fuzzy) map[canonical] = fuzzy;
    }
  }
  return map;
}

function parseExposureYaml(content: string): Record<Company, CompanyExposureFileConfig> {
  const lines = content.split(/\r?\n/);
  const result: Partial<Record<Company, CompanyExposureFileConfig>> = {};
  let currentCompany: Company | null = null;
  let currentSection: string | null = null;

  const ensureCompany = (company: Company): CompanyExposureFileConfig => {
    if (!result[company]) {
      result[company] = {
        ticker: "",
        total_revenue_exposure: {},
        amazon_us_direct_coverage_of_total: { low: 0, base: 0, high: 0 },
        interpretation: "",
        next_data_to_collect: []
      };
    }
    return result[company]!;
  };

  const parseValue = (value: string): string | number => {
    const trimmed = value.trim();
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return trimmed.replace(/^"(.*)"$/, "$1");
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^ */)?.[0].length ?? 0;
    const trimmed = line.trim();

    if (indent === 0 && trimmed.endsWith(":")) {
      const companyKey = trimmed.slice(0, -1) as Company;
      if (companyKey === "coway" || companyKey === "samyang" || companyKey === "tnl") {
        currentCompany = companyKey;
        currentSection = null;
        ensureCompany(currentCompany);
      }
      continue;
    }

    if (!currentCompany) continue;
    const company = ensureCompany(currentCompany);

    if (indent === 2 && trimmed.endsWith(":")) {
      currentSection = trimmed.slice(0, -1);
      continue;
    }

    if (indent === 4 && currentSection === "next_data_to_collect" && trimmed.startsWith("- ")) {
      company.next_data_to_collect.push(trimmed.slice(2).trim().replace(/^"(.*)"$/, "$1"));
      continue;
    }

    if (indent === 2 && trimmed.includes(":") && !trimmed.endsWith(":")) {
      const [key, ...rest] = trimmed.split(":");
      const value = rest.join(":").trim();
      if (key === "ticker") company.ticker = String(parseValue(value));
      if (key === "interpretation") company.interpretation = String(parseValue(value));
      continue;
    }

    if (indent === 4 && currentSection && trimmed.includes(":")) {
      const [key, ...rest] = trimmed.split(":");
      const value = rest.join(":").trim();
      if (currentSection === "total_revenue_exposure") {
        company.total_revenue_exposure[key.trim()] = Number(parseValue(value));
      } else if (currentSection === "amazon_us_direct_coverage_of_total") {
        const parsed = Number(parseValue(value));
        if (key.trim() === "low" || key.trim() === "base" || key.trim() === "high") {
          company.amazon_us_direct_coverage_of_total[key.trim() as "low" | "base" | "high"] = parsed;
        }
      }
    }
  }

  for (const company of ["coway", "samyang", "tnl"] as Company[]) {
    if (!result[company]) throw new Error(`Missing exposure config for ${company}`);
  }

  return result as Record<Company, CompanyExposureFileConfig>;
}

function loadExposureConfig(): Record<Company, CompanyExposureFileConfig> {
  if (!fs.existsSync(exposureConfigPath)) {
    throw new Error(`Missing exposure config: ${exposureConfigPath}`);
  }
  return parseExposureYaml(fs.readFileSync(exposureConfigPath, "utf8"));
}

const exposureConfig = loadExposureConfig();

function parseProductFamilyRulesYaml(content: string): ProductFamilyRules {
  const lines = content.split(/\r?\n/);
  const rules: ProductFamilyRules = {
    samyang: {
      default_line: "ramen",
      sauce_bundle_asins: []
    }
  };
  let currentCompany: keyof ProductFamilyRules | null = null;
  let currentSection: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^ */)?.[0].length ?? 0;
    const trimmed = line.trim();

    if (indent === 0 && trimmed.endsWith(":")) {
      const key = trimmed.slice(0, -1) as keyof ProductFamilyRules;
      if (key === "samyang") {
        currentCompany = key;
        currentSection = null;
      }
      continue;
    }

    if (!currentCompany) continue;
    if (indent === 2 && trimmed.includes(":")) {
      const [key, ...rest] = trimmed.split(":");
      const value = rest.join(":").trim().replace(/^"(.*)"$/, "$1");
      if (key.trim() === "default_line") {
        rules.samyang.default_line = value || rules.samyang.default_line;
        currentSection = null;
      } else if (key.trim() === "sauce_bundle_asins") {
        currentSection = "sauce_bundle_asins";
        if (value && value !== "[]") {
          for (const item of value.replace(/^\[/, "").replace(/\]$/, "").split(",")) {
            const asin = item.trim().replace(/^"(.*)"$/, "$1").toUpperCase();
            if (asin) rules.samyang.sauce_bundle_asins.push(asin);
          }
        }
      }
      continue;
    }

    if (indent === 4 && currentCompany === "samyang" && currentSection === "sauce_bundle_asins" && trimmed.startsWith("- ")) {
      const asin = trimmed.slice(2).trim().toUpperCase();
      if (asin) rules.samyang.sauce_bundle_asins.push(asin);
    }
  }

  return rules;
}

function loadProductFamilyRules(): ProductFamilyRules {
  if (!fs.existsSync(productFamilyRulesPath)) {
    return {
      samyang: {
        default_line: "ramen",
        sauce_bundle_asins: []
      }
    };
  }
  return parseProductFamilyRulesYaml(fs.readFileSync(productFamilyRulesPath, "utf8"));
}

const productFamilyRules = loadProductFamilyRules();

function loadExistingDashboardData(): ExistingDashboardJson | null {
  const existingPath = path.join(publicDataRoot, "dashboard_data.json");
  if (!fs.existsSync(existingPath)) return null;
  return JSON.parse(fs.readFileSync(existingPath, "utf8")) as ExistingDashboardJson;
}

function readCsvIfExists<T extends Record<string, unknown>>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8");
  if (!text.trim()) return [];
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true
  }) as T[];
}

function parseBoolLike(value: unknown): boolean {
  const text = normalizeText(value).toLowerCase();
  return ["1", "true", "yes", "y"].includes(text);
}

function loadProcessedTradeData() {
  const trassTradeMonthly = readCsvIfExists<TradeMonthlyRow>(path.join(processedRoot, "trass_trade_monthly.csv")).map((row) => ({
    ...row,
    export_value_usd: parseNumber(row.export_value_usd),
    export_value_krw: parseNumber(row.export_value_krw),
    export_weight_kg: parseNumber(row.export_weight_kg),
    domestic_company_count: parseNumber(row.domestic_company_count),
    foreign_counterparty_count: parseNumber(row.foreign_counterparty_count)
  }));
  const trassTradeQuarterly = readCsvIfExists<TradeQuarterlyRow>(path.join(processedRoot, "trass_trade_quarterly.csv")).map((row) => ({
    ...row,
    export_value_usd: parseNumber(row.export_value_usd),
    export_value_krw: parseNumber(row.export_value_krw),
    export_weight_kg: parseNumber(row.export_weight_kg),
    domestic_company_count: parseNumber(row.domestic_company_count),
    foreign_counterparty_count: parseNumber(row.foreign_counterparty_count)
  }));
  const trassCountryMonthly = readCsvIfExists<CountryTradeMonthlyRow>(path.join(processedRoot, "trass_country_monthly.csv")).map((row) => ({
    ...row,
    export_value_usd: parseNumber(row.export_value_usd),
    export_value_krw: parseNumber(row.export_value_krw),
    export_weight_kg: parseNumber(row.export_weight_kg)
  }));
  const dartQuarterlyRevenue = readCsvIfExists<DartQuarterlyRevenueRow>(path.join(processedRoot, "dart_quarterly_revenue.csv")).map((row) => ({
    ...row,
    year: Number(row.year),
    revenue_krw: parseNumber(row.revenue_krw),
    cumulative_revenue_krw: parseNumber(row.cumulative_revenue_krw),
    is_derived: parseBoolLike(row.is_derived)
  }));

  return {
    trassTradeMonthly,
    trassTradeQuarterly,
    trassCountryMonthly,
    dartQuarterlyRevenue
  };
}

function ensureProcessedTradeData(): ReturnType<typeof loadProcessedTradeData> {
  const loaded = loadProcessedTradeData();
  if (loaded.trassTradeMonthly.length && loaded.trassTradeQuarterly.length && loaded.trassCountryMonthly.length && loaded.dartQuarterlyRevenue.length) {
    return loaded;
  }

  const manualRoot = path.join(root, "data", "raw", "manual");
  const hasManualXlsx = fs.existsSync(manualRoot) && fs.readdirSync(manualRoot).some((file) => file.toLowerCase().endsWith(".xlsx"));
  const dartApiKey = normalizeText(process.env.DART_API_KEY);
  if (hasManualXlsx && dartApiKey) {
    const scriptPath = path.join(root, "scripts", "extract_external_trade_data.py");
    const result = spawnSync("python3", [scriptPath], {
      cwd: root,
      env: { ...process.env, DART_API_KEY: dartApiKey },
      stdio: "inherit"
    });
    if (result.status !== 0) {
      throw new Error(`Failed to regenerate external trade data via ${scriptPath}`);
    }
    return loadProcessedTradeData();
  }

  return loaded;
}

function readRawFiles(): Array<{ company: Company; source_folder: string; file_name: string; file_path: string }> {
  const folderMap: Record<string, Company> = { coway: "coway", cuckoo: "coway", samyang: "samyang", tnl: "tnl" };
  const items: Array<{ company: Company; source_folder: string; file_name: string; file_path: string }> = [];
  if (!fs.existsSync(rawRoot)) throw new Error(`Missing raw directory: ${rawRoot}`);

  for (const entry of fs.readdirSync(rawRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const company = folderMap[entry.name];
    if (!company) continue;
    const folderPath = path.join(rawRoot, entry.name);
    for (const fileName of fs.readdirSync(folderPath)) {
      if (!fileName.toLowerCase().endsWith(".csv")) continue;
      items.push({ company, source_folder: entry.name, file_name: fileName, file_path: path.join(folderPath, fileName) });
    }
  }

  return items.sort((a, b) => a.file_path.localeCompare(b.file_path));
}

function inferProductFamily(company: Company, productName: string, asin: string): { family: string; confidence: "high" | "medium" | "low" } {
  const normalized = normalizeHeader(productName);
  if (company === "coway") {
    if (/airmega/.test(normalized) && /filter/.test(normalized)) return { family: "Airmega filter", confidence: "high" };
    if (/airmega/.test(normalized)) return { family: "Airmega 본체", confidence: "high" };
    if (/bidetmega/.test(normalized)) return { family: "Bidetmega", confidence: "high" };
    if (/aquamega/.test(normalized) && /filter/.test(normalized)) return { family: "Aquamega filter", confidence: "high" };
    return { family: "Other", confidence: "low" };
  }
  if (company === "samyang") {
    const asinKey = asin.toUpperCase();
    const sauceBundleAsins = new Set(productFamilyRules.samyang.sauce_bundle_asins.map((item) => item.toUpperCase()));
    if (sauceBundleAsins.has(asinKey)) return { family: "Buldak sauce / bundle", confidence: "high" };
    if (/sauce|topokki|dumplings|chips|snack|frozen|bundle|variety pack|day \+ night|xl duo/.test(normalized)) {
      return { family: "Buldak sauce / bundle", confidence: "high" };
    }
    const defaultLine = productFamilyRules.samyang.default_line.toLowerCase();
    if (defaultLine === "ramen" && /carbonara|cream carbonara|quattro cheese|original|2x spicy|habanero lime|jjajang|yakisoba|buldak/.test(normalized)) {
      return { family: "Buldak ramen", confidence: "medium" };
    }
    return { family: defaultLine === "ramen" ? "Buldak ramen" : defaultLine, confidence: "medium" };
  }
  if (/original|invisible|surface/.test(normalized)) return { family: "Mighty Patch core", confidence: "high" };
  if (/nose|chin|forehead|face|body/.test(normalized)) return { family: "Mighty Patch face/body extensions", confidence: "high" };
  if (/day \+ night|variety pack|xl duo/.test(normalized)) return { family: "Bundle", confidence: "high" };
  if (/early-stage|dark spots|rescue patch/.test(normalized)) return { family: "Adjacent patch", confidence: "high" };
  if (/hero|mighty patch/.test(normalized) || asin) return { family: "Low-confidence Hero product", confidence: "low" };
  return { family: "Other", confidence: "low" };
}

function round(value: number | null | undefined, digits = 2): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (typeof value === "number" && Number.isFinite(value) ? value : 0), 0);
}

function mean(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((total, value) => total + value, 0) / valid.length;
}

function lastValue(values: Array<number | null | undefined>): number | null {
  for (const value of [...values].reverse()) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function growth(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return round(((current - previous) / previous) * 100, 1);
}

function aggregateWindow<T>(rows: T[], months: number, selector: (row: T) => number | null): number | null {
  if (rows.length < months) return null;
  return sum(rows.slice(-months).map(selector));
}

function writeCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const text =
      typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header])).join(","));
  }
  return lines.join("\n");
}

function monthSortKey(month: string): number {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  return match ? Number(match[1]) * 100 + Number(match[2]) : 999999;
}

function normalizeFileRows(fileMeta: { company: Company; source_folder: string; file_name: string; file_path: string }): DailyRecord[] {
  const content = fs.readFileSync(fileMeta.file_path, "utf8");
  const metadata = extractMetadata(content);
  const table = findTable(content);
  const rows = parse(table, { bom: true, columns: true, skip_empty_lines: true, relax_column_count: true, trim: true }) as Array<Record<string, unknown>>;
  if (!rows.length) return [];

  const headers = Object.keys(rows[0]);
  const columnMap = buildColumnMap(headers);
  const asin = normalizeText(metadata["product asin"] ?? "").toUpperCase();
  const reportGeneratedAt = metadata["report generated at"] ?? null;
  const fileDateHint =
    fileMeta.file_name.match(/(20\d{2})[-_](\d{2})(?:[-_](\d{2}))?/)?.[0] ??
    fileMeta.file_name.match(/(20\d{2})[-_](\d{2})/)?.[0] ??
    null;

  const output: DailyRecord[] = [];
  for (const [index, row] of rows.entries()) {
    const rawDate = columnMap.date ? row[columnMap.date] : undefined;
    const date = parseDateLike(rawDate) ?? parseDateLike(fileDateHint);
    const month = parseMonth(date);
    const price = parseNumber(columnMap.price ? row[columnMap.price] : undefined);
    const monthlySales = parseNumber(columnMap.monthly_sales ? row[columnMap.monthly_sales] : undefined);
    const explicitRevenue = parseNumber(columnMap.monthly_revenue ? row[columnMap.monthly_revenue] : undefined);
    const derivedRevenue = price !== null && monthlySales !== null ? price * monthlySales : null;
    const monthlyRevenue = explicitRevenue ?? derivedRevenue;
    const revenueSource: DailyRecord["revenue_source"] = explicitRevenue !== null ? "explicit" : derivedRevenue !== null ? "derived" : "missing";
    const productName = `ASIN ${asin || fileMeta.file_name.replace(/\.csv$/i, "")}`;
    const family = inferProductFamily(fileMeta.company, productName, asin);

    const warnings: string[] = [];
    if (!date) warnings.push("date_missing_or_unparseable");
    if (month === "unknown_month") warnings.push("month_fallback_failed");
    if (columnMap.date === undefined) warnings.push("date_column_missing");
    if (columnMap.monthly_sales === undefined) warnings.push("monthly_sales_column_missing");
    if (columnMap.bsr === undefined) warnings.push("bsr_column_missing");
    if (columnMap.reviews === undefined) warnings.push("reviews_column_missing");
    if (columnMap.rating === undefined) warnings.push("rating_column_missing");
    if (price === null) warnings.push("price_missing");
    if (monthlySales === null) warnings.push("monthly_sales_missing");
    if (explicitRevenue === null && derivedRevenue === null) warnings.push("monthly_revenue_missing");
    if (date === null && index === 0) warnings.push("filename_date_hints_exhausted");

    output.push({
      company: fileMeta.company,
      source_folder: fileMeta.source_folder,
      file_name: fileMeta.file_name,
      file_path: fileMeta.file_path,
      asin: asin || fileMeta.file_name.replace(/\.csv$/i, ""),
      report_generated_at: reportGeneratedAt,
      product_name: productName,
      product_family: family.family,
      family_confidence: family.confidence,
      date,
      month,
      price,
      monthly_sales: monthlySales,
      monthly_revenue: monthlyRevenue,
      bsr: parseNumber(columnMap.bsr ? row[columnMap.bsr] : undefined),
      reviews: parseNumber(columnMap.reviews ? row[columnMap.reviews] : undefined),
      rating: parseNumber(columnMap.rating ? row[columnMap.rating] : undefined),
      sellers: parseNumber(columnMap.sellers ? row[columnMap.sellers] : undefined),
      revenue_source: revenueSource,
      data_quality_warnings: warnings
    });
  }

  return output;
}

function makeSeries<T extends { month: string; revenue: number | null; reviews: number | null }>(
  rows: T[]
): Array<{ month: string; revenue: number | null; reviews: number | null; rolling_3m_revenue: number | null; rolling_6m_revenue: number | null; mom_revenue_growth: number | null; yoy_revenue_growth: number | null; review_change: number | null }> {
  const sorted = [...rows].sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month));
  return sorted.map((row, index) => {
    const currentRevenue = row.revenue;
    const currentReviews = row.reviews;
    const prevRevenue = index > 0 ? sorted[index - 1].revenue : null;
    const prevReviews = index > 0 ? sorted[index - 1].reviews : null;
    const yoyRevenue = index >= 12 ? sorted[index - 12].revenue : null;
    return {
      month: row.month,
      revenue: currentRevenue,
      reviews: currentReviews,
      rolling_3m_revenue: aggregateWindow(sorted.slice(0, index + 1), 3, (item) => item.revenue),
      rolling_6m_revenue: aggregateWindow(sorted.slice(0, index + 1), 6, (item) => item.revenue),
      mom_revenue_growth: growth(currentRevenue, prevRevenue),
      yoy_revenue_growth: growth(currentRevenue, yoyRevenue),
      review_change: currentReviews !== null && prevReviews !== null ? currentReviews - prevReviews : null
    };
  });
}

function computeCompanyQuality(
  company: Company,
  files: DailyRecord[],
  monthlyRows: MonthlyProductRow[],
  availability: { dartQuarterly: boolean; trassTrade: boolean; trassCountry: boolean }
): CoverageScoreRow {
  const config = exposureConfig[company];
  const gapConfig = companyGapConfigs[company];
  const companyFiles = files.filter((row) => row.company === company);
  const fileCount = new Set(companyFiles.map((row) => row.file_path)).size;
  const asinCount = new Set(companyFiles.map((row) => row.asin)).size;
  const monthCount = new Set(monthlyRows.filter((row) => row.company === company).map((row) => row.month)).size;

  const fileGroups = new Map<string, DailyRecord[]>();
  for (const record of companyFiles) {
    fileGroups.set(record.file_path, [...(fileGroups.get(record.file_path) ?? []), record]);
  }

  let salesCoverage = 0;
  let rankCoverage = 0;
  let reviewsCoverage = 0;
  let ratingCoverage = 0;
  let priceCompleteness = 0;
  let warningCount = 0;
  for (const records of fileGroups.values()) {
    const hasSales = records.some((row) => row.monthly_sales !== null);
    const hasRank = records.some((row) => row.bsr !== null);
    const hasReviews = records.some((row) => row.reviews !== null);
    const hasRating = records.some((row) => row.rating !== null);
    const priceZeroShare = records.length ? records.filter((row) => row.price === 0).length / records.length : 0;
    salesCoverage += hasSales ? 1 : 0;
    rankCoverage += hasRank ? 1 : 0;
    reviewsCoverage += hasReviews ? 1 : 0;
    ratingCoverage += hasRating ? 1 : 0;
    priceCompleteness += 1 - priceZeroShare;
    warningCount += records.reduce((total, row) => total + (row.data_quality_warnings.length ? 1 : 0), 0) > 0 ? 1 : 0;
  }

  const normalizedFileCount = fileCount || 1;
  const amazonDataQualityScore = round(
    100 *
      (0.25 * (salesCoverage / normalizedFileCount) +
        0.2 * (rankCoverage / normalizedFileCount) +
        0.15 * (reviewsCoverage / normalizedFileCount) +
        0.15 * (ratingCoverage / normalizedFileCount) +
        0.15 * (priceCompleteness / normalizedFileCount) +
        0.1)
  ) ?? 0;

  const revenueExposureScore = round(Math.min(100, config.amazon_us_direct_coverage_of_total.base * 1000)) ?? 0;
  const channelGapScore = gapConfig.channelGapScore;
  const regionGapScore = gapConfig.regionGapScore;
  const sourceStrengthBonus = (availability.dartQuarterly ? 8 : 0) + (availability.trassTrade ? 10 : 0) + (availability.trassCountry ? 4 : 0);
  const forecastingUsefulnessScore = round(
    Math.max(
      0,
      Math.min(
        100,
        0.35 * amazonDataQualityScore +
          0.25 * revenueExposureScore +
          0.2 * (100 - channelGapScore) +
          0.2 * (100 - regionGapScore) +
          gapConfig.bias +
          sourceStrengthBonus
      )
    )
  ) ?? 0;
  const missingDataScore = round(Math.max(0, 100 - forecastingUsefulnessScore)) ?? 0;
  const nextDataPriorityScore = round((missingDataScore + channelGapScore + regionGapScore) / 3) ?? 0;
  const dataConfidence: CoverageScoreRow["data_confidence"] = amazonDataQualityScore >= 75 ? "high" : amazonDataQualityScore >= 55 ? "medium" : "low";

  return {
    company,
    raw_file_count: fileCount,
    unique_asin_count: asinCount,
    month_count: monthCount,
    amazon_data_quality_score: amazonDataQualityScore,
    revenue_exposure_score: revenueExposureScore,
    channel_gap_score: channelGapScore,
    region_gap_score: regionGapScore,
    forecasting_usefulness_score: forecastingUsefulnessScore,
    missing_data_score: missingDataScore,
    next_data_priority_score: nextDataPriorityScore,
    amazon_us_direct_coverage_base: config.amazon_us_direct_coverage_of_total.base,
    interpretation: config.interpretation,
    data_confidence: dataConfidence
  };
}

function computeCompanyMetric(
  company: Company,
  companyRows: MonthlyProductRow[]
): CompanyMonthlyRow[] {
  const buckets = new Map<string, MonthlyProductRow[]>();
  for (const row of companyRows) buckets.set(`${row.company}__${row.month}`, [...(buckets.get(`${row.company}__${row.month}`) ?? []), row]);

  const monthlyRows: CompanyMonthlyRow[] = [];
  for (const [key, rows] of buckets.entries()) {
    const month = key.split("__")[1];
    const sorted = [...rows].sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month));
    const totalRevenue = sum(rows.map((row) => row.revenue));
    const totalUnits = sum(rows.map((row) => row.units));
    const reviews = sum(rows.map((row) => row.reviews));
    const avgPrice = mean(rows.map((row) => row.avg_price));
    const avgBsr = mean(rows.map((row) => row.avg_bsr));
    const asinCount = new Set(rows.map((row) => row.asin)).size;
    const productCount = rows.length;
    const familyCount = new Set(rows.map((row) => row.product_family)).size;
    monthlyRows.push({
      company,
      month,
      total_revenue: totalRevenue || null,
      total_units: totalUnits || null,
      asin_count: asinCount,
      product_count: productCount,
      family_count: familyCount,
      avg_price: avgPrice,
      avg_bsr: avgBsr,
      reviews: reviews || null,
      review_change: null,
      mom_revenue_growth: null,
      yoy_revenue_growth: null,
      rolling_3m_revenue: null,
      rolling_6m_revenue: null,
      data_quality_warnings: sorted.flatMap((row) => row.data_quality_warnings).slice(0, 5)
    });
  }

  const series = makeSeries(monthlyRows.map((row) => ({ month: row.month, revenue: row.total_revenue, reviews: row.reviews })));
  const byMonth = new Map(series.map((row) => [row.month, row]));
  return monthlyRows
    .map((row) => {
      const derived = byMonth.get(row.month);
      return {
        ...row,
        review_change: derived?.review_change ?? null,
        mom_revenue_growth: derived?.mom_revenue_growth ?? null,
        yoy_revenue_growth: derived?.yoy_revenue_growth ?? null,
        rolling_3m_revenue: derived?.rolling_3m_revenue ?? null,
        rolling_6m_revenue: derived?.rolling_6m_revenue ?? null
      };
    })
    .sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month));
}

function computeFamilyMetric(
  company: Company,
  companyRows: MonthlyProductRow[],
  companyRevenueByMonth: Map<string, number>
): FamilyMonthlyRow[] {
  const buckets = new Map<string, MonthlyProductRow[]>();
  for (const row of companyRows) {
    const key = `${row.company}__${row.product_family}`;
    buckets.set(key, [...(buckets.get(key) ?? []), row]);
  }

  const rows: FamilyMonthlyRow[] = [];
  for (const [key, familyRows] of buckets.entries()) {
    const [, family] = key.split("__");
    const monthBuckets = new Map<string, MonthlyProductRow[]>();
    for (const row of familyRows) {
      monthBuckets.set(row.month, [...(monthBuckets.get(row.month) ?? []), row]);
    }
    for (const [month, rowsForMonth] of monthBuckets.entries()) {
      rows.push({
        company,
        product_family: family,
        family_confidence: rowsForMonth[0].family_confidence,
        month,
        total_revenue: sum(rowsForMonth.map((row) => row.revenue)) || null,
        total_units: sum(rowsForMonth.map((row) => row.units)) || null,
        asin_count: new Set(rowsForMonth.map((row) => row.asin)).size,
        product_count: rowsForMonth.length,
        avg_price: mean(rowsForMonth.map((row) => row.avg_price)),
        avg_bsr: mean(rowsForMonth.map((row) => row.avg_bsr)),
        reviews: sum(rowsForMonth.map((row) => row.reviews)) || null,
        review_change: null,
        mom_revenue_growth: null,
        yoy_revenue_growth: null,
        rolling_3m_revenue: null,
        rolling_6m_revenue: null,
        revenue_share_in_company: null,
        data_quality_warnings: rowsForMonth.flatMap((row) => row.data_quality_warnings).slice(0, 5)
      });
    }
  }

  const familyBuckets = new Map<string, FamilyMonthlyRow[]>();
  for (const row of rows) {
    const key = `${row.company}__${row.product_family}`;
    familyBuckets.set(key, [...(familyBuckets.get(key) ?? []), row]);
  }

  const finalRows: FamilyMonthlyRow[] = [];
  for (const [key, familyRows] of familyBuckets.entries()) {
    const sorted = [...familyRows].sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month));
    const series = makeSeries(sorted.map((row) => ({ month: row.month, revenue: row.total_revenue, reviews: row.reviews })));
    const byMonth = new Map(series.map((row) => [row.month, row]));
    for (const row of sorted) {
      const companyTotal = companyRevenueByMonth.get(`${row.company}__${row.month}`) ?? 0;
      const derived = byMonth.get(row.month);
      finalRows.push({
        ...row,
        review_change: derived?.review_change ?? null,
        mom_revenue_growth: derived?.mom_revenue_growth ?? null,
        yoy_revenue_growth: derived?.yoy_revenue_growth ?? null,
        rolling_3m_revenue: derived?.rolling_3m_revenue ?? null,
        rolling_6m_revenue: derived?.rolling_6m_revenue ?? null,
        revenue_share_in_company: companyTotal ? round(((row.total_revenue ?? 0) / companyTotal) * 100, 2) : null
      });
    }
  }

  return finalRows.sort((a, b) => a.product_family.localeCompare(b.product_family) || monthSortKey(a.month) - monthSortKey(b.month));
}

function buildProductMonthlyRows(records: DailyRecord[]): MonthlyProductRow[] {
  const monthlyBuckets = new Map<string, DailyRecord[]>();
  for (const record of records) {
    if (record.month === "unknown_month") continue;
    const key = `${record.company}__${record.asin}__${record.month}`;
    monthlyBuckets.set(key, [...(monthlyBuckets.get(key) ?? []), record]);
  }

  const rows: MonthlyProductRow[] = [];
  for (const [key, bucket] of monthlyBuckets.entries()) {
    const [company, asin, month] = key.split("__") as [Company, string, string];
    const sourceMeta = bucket[0];
    const productName = sourceMeta.product_name;
    const productFamily = sourceMeta.product_family;
    const familyConfidence = sourceMeta.family_confidence;
    const revenues = bucket.map((row) => row.monthly_revenue);
    const units = bucket.map((row) => row.monthly_sales);
    const prices = bucket.map((row) => row.price);
    const bsr = bucket.map((row) => row.bsr);
    const reviews = bucket.map((row) => row.reviews);
    const rating = bucket.map((row) => row.rating);
    const sellers = bucket.map((row) => row.sellers);
    const explicitRevenueRows = bucket.filter((row) => row.revenue_source === "explicit").length;
    const derivedRevenueRows = bucket.filter((row) => row.revenue_source === "derived").length;
    const revenueSource: MonthlyProductRow["revenue_source"] =
      explicitRevenueRows > 0 ? "explicit" : derivedRevenueRows > 0 ? "derived" : "missing";

    rows.push({
      company,
      source_folder: sourceMeta.source_folder,
      asin,
      product_name: productName,
      product_family: productFamily,
      family_confidence: familyConfidence,
      month,
      raw_file_count: new Set(bucket.map((row) => row.file_path)).size,
      raw_row_count: bucket.length,
      date_min: bucket.map((row) => row.date).filter(Boolean).sort()[0] ?? null,
      date_max: bucket.map((row) => row.date).filter(Boolean).sort().at(-1) ?? null,
      revenue: mean(revenues),
      units: mean(units),
      avg_price: mean(prices),
      avg_bsr: mean(bsr),
      reviews: lastValue(reviews),
      review_change: null,
      rating: lastValue(rating),
      sellers: lastValue(sellers),
      mom_revenue_growth: null,
      yoy_revenue_growth: null,
      rolling_3m_revenue: null,
      rolling_6m_revenue: null,
      revenue_share_in_company: null,
      revenue_source: revenueSource,
      data_quality_warnings: bucket.flatMap((row) => row.data_quality_warnings).slice(0, 5)
    });
  }

  const seriesBuckets = new Map<string, MonthlyProductRow[]>();
  for (const row of rows) {
    const key = `${row.company}__${row.asin}`;
    seriesBuckets.set(key, [...(seriesBuckets.get(key) ?? []), row]);
  }

  const finalRows: MonthlyProductRow[] = [];
  for (const [key, productRows] of seriesBuckets.entries()) {
    const sorted = [...productRows].sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month));
    const series = makeSeries(sorted.map((row) => ({ month: row.month, revenue: row.revenue, reviews: row.reviews })));
    const byMonth = new Map(series.map((row) => [row.month, row]));
    const companyRevenueByMonth = new Map<string, number>();
    for (const row of records.filter((record) => record.company === sorted[0].company && record.month !== "unknown_month")) {
      const monthKey = row.month;
      companyRevenueByMonth.set(monthKey, (companyRevenueByMonth.get(monthKey) ?? 0) + (row.monthly_revenue ?? 0));
    }
    for (const row of sorted) {
      const derived = byMonth.get(row.month);
      finalRows.push({
        ...row,
        review_change: derived?.review_change ?? null,
        mom_revenue_growth: derived?.mom_revenue_growth ?? null,
        yoy_revenue_growth: derived?.yoy_revenue_growth ?? null,
        rolling_3m_revenue: derived?.rolling_3m_revenue ?? null,
        rolling_6m_revenue: derived?.rolling_6m_revenue ?? null,
        revenue_share_in_company: companyRevenueByMonth.get(row.month)
          ? round(((row.revenue ?? 0) / (companyRevenueByMonth.get(row.month) ?? 0)) * 100, 2)
          : null
      });
    }
  }

  return finalRows.sort((a, b) => a.company.localeCompare(b.company) || a.asin.localeCompare(b.asin) || monthSortKey(a.month) - monthSortKey(b.month));
}

function addProductLevelGrowth(rows: MonthlyProductRow[]): MonthlyProductRow[] {
  const seriesByKey = new Map<string, MonthlyProductRow[]>();
  for (const row of rows) {
    const key = `${row.company}__${row.asin}`;
    seriesByKey.set(key, [...(seriesByKey.get(key) ?? []), row]);
  }

  const output: MonthlyProductRow[] = [];
  for (const productRows of seriesByKey.values()) {
    const sorted = [...productRows].sort((a, b) => monthSortKey(a.month) - monthSortKey(b.month));
    const revenueSeries = makeSeries(sorted.map((row) => ({ month: row.month, revenue: row.revenue, reviews: row.reviews })));
    const byMonth = new Map(revenueSeries.map((row) => [row.month, row]));
    for (const row of sorted) {
      const derived = byMonth.get(row.month);
      output.push({
        ...row,
        review_change: derived?.review_change ?? null,
        mom_revenue_growth: derived?.mom_revenue_growth ?? null,
        yoy_revenue_growth: derived?.yoy_revenue_growth ?? null,
        rolling_3m_revenue: derived?.rolling_3m_revenue ?? null,
        rolling_6m_revenue: derived?.rolling_6m_revenue ?? null
      });
    }
  }
  return output.sort((a, b) => a.company.localeCompare(b.company) || a.asin.localeCompare(b.asin) || monthSortKey(a.month) - monthSortKey(b.month));
}

function finalizeRevenueShare(rows: MonthlyProductRow[]): MonthlyProductRow[] {
  const companyRevenue = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.company}__${row.month}`;
    companyRevenue.set(key, (companyRevenue.get(key) ?? 0) + (row.revenue ?? 0));
  }

  return rows.map((row) => ({
    ...row,
    revenue_share_in_company: (companyRevenue.get(`${row.company}__${row.month}`) ?? 0)
      ? round(((row.revenue ?? 0) / (companyRevenue.get(`${row.company}__${row.month}`) ?? 0)) * 100, 2)
      : null
  }));
}

function toCsvRows<T extends Record<string, unknown>>(rows: T[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) normalized[key] = Array.isArray(value) ? value.join(" | ") : value;
    return normalized;
  });
}

function buildDashboardData(summary: Record<string, unknown>) {
  return {
    generated_at: new Date().toISOString(),
    summary,
    note: "Amazon US CSV standardization only. UI layer will consume these processed tables later."
  };
}

function inferSourceType(text: string): SourceGapRow["source_type"] {
  const lower = text.toLowerCase();
  if (/(hs 300510|hs 300590|hs 330499|hs 190230|trass|관세청|kita)/.test(lower)) return "trade";
  if (/(dart|sec edgar|keepa)/.test(lower)) return "api";
  if (/(walmart|costco|kroger|target|instacart|amazon jp|rakuten|qoo10|yahoo shopping|tesco|carrefour|woolworths|shopee|lazada|tiktok shop|tiktok|tmall|jd|douyin|pinduoduo|xiaohongshu|bestbuy|homedepot|cvs|walgreens|ulta|iherb)/.test(lower))
    return "retailer";
  if (/(google trends|baidu index)/.test(lower)) return "social";
  if (/(importyeti|panjiva|importgenius|b\/l)/.test(lower)) return "manual";
  if (/(official|dart|sec edgar|malyasia|coway malaysia|hero 공식몰|공식몰)/.test(lower)) return "official";
  return "manual";
}

function inferCurrentStatus(text: string): SourceGapRow["current_status"] {
  const lower = text.toLowerCase();
  if (/(raw csv|amazon us)/.test(lower)) return "available";
  if (/(dart|sec edgar|keepa|hs 300510|hs 300590|hs 330499|hs 190230)/.test(lower)) return "api_required";
  return "manual_required";
}

function normalizeQuarterSortKey(quarter: string): number {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  return match ? Number(match[1]) * 10 + Number(match[2]) : 999999;
}

function buildSourceGapMap(availability: Record<Company, { dartQuarterly: boolean; trassTrade: boolean }>): SourceGapRow[] {
  const rows: SourceGapRow[] = [];
  for (const company of ["coway", "samyang", "tnl"] as Company[]) {
    rows.push({
      company,
      source_name: "Amazon US raw CSV",
      source_type: "marketplace",
      priority: 1,
      current_status: "available",
      description: "현재 보유한 Amazon US 판매량/매출 추정 CSV",
      why_it_matters: "기준 proxy 데이터"
    });

    const checklist = exposureConfig[company].next_data_to_collect;
    checklist.forEach((item, index) => {
      const lower = item.toLowerCase();
      let currentStatus = inferCurrentStatus(item);
      if (/(dart|sec edgar)/.test(lower) && availability[company]?.dartQuarterly) currentStatus = "available";
      if (/(hs 190230|hs 300510|hs 300590|hs 330499|trass)/.test(lower) && availability[company]?.trassTrade) currentStatus = "available";
      if (/(raw csv|amazon us)/.test(lower)) currentStatus = "available";
      rows.push({
        company,
        source_name: item,
        source_type: inferSourceType(item),
        priority: Math.min(index + 1, 5),
        current_status: currentStatus,
        description: item,
        why_it_matters: item
      });
    });
  }
  return rows;
}

function latestMonth(rows: Array<{ month: string }>): string | null {
  return [...new Set(rows.map((row) => row.month).filter(Boolean))].sort((a, b) => monthSortKey(a) - monthSortKey(b)).at(-1) ?? null;
}

function buildOverview(
  rawFiles: ReturnType<typeof readRawFiles>,
  productMonthly: MonthlyProductRow[],
  companyMonthly: CompanyMonthlyRow[],
  coverageOutput: CoverageScoreRow[]
) {
  const latestMonthValue = latestMonth(companyMonthly);
  const latestCompanyMonthRows = latestMonthValue ? companyMonthly.filter((row) => row.month === latestMonthValue) : [];
  const latestRevenue = sum(latestCompanyMonthRows.map((row) => row.total_revenue)) || null;
  const latestUnits = sum(latestCompanyMonthRows.map((row) => row.total_units)) || null;
  const avgCoverageScore = coverageOutput.length ? round(mean(coverageOutput.map((row) => row.forecasting_usefulness_score))) : null;
  const avgDataQualityScore = coverageOutput.length ? round(mean(coverageOutput.map((row) => row.amazon_data_quality_score))) : null;
  const bestExplanation = [...coverageOutput].sort((a, b) => b.forecasting_usefulness_score - a.forecasting_usefulness_score)[0] ?? null;
  const mostNeeded = [...coverageOutput].sort((a, b) => b.next_data_priority_score - a.next_data_priority_score)[0] ?? null;

  return {
    tracked_company_count: 3,
    tracked_industry_count: 3,
    total_asin_count: new Set(productMonthly.map((row) => `${row.company}__${row.asin}`)).size,
    latest_month: latestMonthValue,
    latest_revenue: latestRevenue,
    latest_units: latestUnits,
    average_coverage_score: avgCoverageScore,
    average_data_quality_score: avgDataQualityScore,
    raw_file_count: rawFiles.length,
    month_count: new Set(productMonthly.map((row) => row.month)).size,
    best_explanation_company: bestExplanation
      ? {
          company: bestExplanation.company,
          label: companyIndustryMeta[bestExplanation.company].display_name,
          score: bestExplanation.forecasting_usefulness_score,
          interpretation: bestExplanation.interpretation
        }
      : null,
    most_needed_company: mostNeeded
      ? {
          company: mostNeeded.company,
          label: companyIndustryMeta[mostNeeded.company].display_name,
          score: mostNeeded.next_data_priority_score,
          interpretation: mostNeeded.interpretation
        }
      : null
  };
}

function buildIndustries(
  companyMonthly: CompanyMonthlyRow[],
  coverageOutput: CoverageScoreRow[],
  exposure: Record<Company, CompanyExposureFileConfig>
) {
  return (["coway", "samyang", "tnl"] as Company[]).map((company) => {
    const meta = companyIndustryMeta[company];
    const companyRows = companyMonthly.filter((row) => row.company === company);
    const coverage = coverageOutput.find((row) => row.company === company) ?? null;
    const latestMonthValue = latestMonth(companyRows);
    const latestRow = latestMonthValue ? companyRows.find((row) => row.month === latestMonthValue) ?? null : null;
    return {
      id: meta.id,
      name: meta.name,
      company_count: 1,
      company: company,
      company_label: meta.display_name,
      latest_month: latestMonthValue,
      latest_revenue: latestRow?.total_revenue ?? null,
      latest_units: latestRow?.total_units ?? null,
      average_coverage_score: coverage?.forecasting_usefulness_score ?? null,
      data_quality_score: coverage?.amazon_data_quality_score ?? null,
      interpretation: exposure[company].interpretation,
      companies: [
        {
          company,
          label: meta.display_name,
          ticker: exposure[company].ticker,
          interpretation: exposure[company].interpretation
        }
      ]
    };
  });
}

function buildCompanies(
  companyMonthly: CompanyMonthlyRow[],
  productMonthly: MonthlyProductRow[],
  familyMonthly: FamilyMonthlyRow[],
  coverageOutput: CoverageScoreRow[],
  exposure: Record<Company, CompanyExposureFileConfig>
) {
  return (["coway", "samyang", "tnl"] as Company[]).map((company) => {
    const meta = companyIndustryMeta[company];
    const coverage = coverageOutput.find((row) => row.company === company) ?? null;
    const companyRows = companyMonthly.filter((row) => row.company === company);
    const productRows = productMonthly.filter((row) => row.company === company);
    const familyRows = familyMonthly.filter((row) => row.company === company);
    const latestMonthValue = latestMonth(companyRows);
    const latestMonthRows = latestMonthValue ? productRows.filter((row) => row.month === latestMonthValue) : [];
    const latestRevenue = latestMonthValue
      ? companyRows.find((row) => row.month === latestMonthValue)?.total_revenue ?? null
      : null;
    const latestUnits = latestMonthValue ? companyRows.find((row) => row.month === latestMonthValue)?.total_units ?? null : null;

    return {
      company,
      label: meta.display_name,
      industry_id: meta.id,
      industry_name: meta.name,
      ticker: exposure[company].ticker,
      latest_month: latestMonthValue,
      latest_revenue: latestRevenue,
      latest_units: latestUnits,
      asin_count: coverage?.unique_asin_count ?? new Set(productRows.map((row) => row.asin)).size,
      month_count: coverage?.month_count ?? new Set(productRows.map((row) => row.month)).size,
      product_count: latestMonthRows.length,
      family_count: new Set(familyRows.map((row) => row.product_family)).size,
      coverage_score: coverage?.forecasting_usefulness_score ?? null,
      amazon_data_quality_score: coverage?.amazon_data_quality_score ?? null,
      revenue_exposure_score: coverage?.revenue_exposure_score ?? null,
      missing_data_score: coverage?.missing_data_score ?? null,
      next_data_priority_score: coverage?.next_data_priority_score ?? null,
      interpretation: exposure[company].interpretation,
      next_data_to_collect: exposure[company].next_data_to_collect,
      amazon_us_direct_coverage_of_total: exposure[company].amazon_us_direct_coverage_of_total,
      top_products: latestMonthRows
        .slice()
        .sort((a, b) => (b.revenue ?? -1) - (a.revenue ?? -1))
        .slice(0, 8),
      top_families: familyRows
        .slice()
        .sort((a, b) => (b.total_revenue ?? -1) - (a.total_revenue ?? -1))
        .slice(0, 6)
    };
  });
}

function buildMonthlyTrend(companyMonthly: CompanyMonthlyRow[]) {
  return companyMonthly.map((row) => ({
    company: row.company,
    label: companyIndustryMeta[row.company].display_name,
    month: row.month,
    revenue: row.total_revenue,
    units: row.total_units,
    avgPrice: row.avg_price,
    avgRank: row.avg_bsr,
    reviews: row.reviews,
    asinCount: row.asin_count,
    momRevenueGrowth: row.mom_revenue_growth,
    yoyRevenueGrowth: row.yoy_revenue_growth,
    rolling3mRevenue: row.rolling_3m_revenue,
    rolling6mRevenue: row.rolling_6m_revenue
  }));
}

function buildRegionalExposure(exposure: Record<Company, CompanyExposureFileConfig>) {
  return (["coway", "samyang", "tnl"] as Company[]).map((company) => ({
    company,
    label: companyIndustryMeta[company].display_name,
    ticker: exposure[company].ticker,
    interpretation: exposure[company].interpretation,
    total_revenue_exposure: exposure[company].total_revenue_exposure,
    amazon_us_direct_coverage_of_total: exposure[company].amazon_us_direct_coverage_of_total,
    regions: Object.entries(exposure[company].total_revenue_exposure).map(([region, share]) => ({ region, share }))
  }));
}

function buildMissingDataChecklist(sourceGapMap: SourceGapRow[]) {
  return (["coway", "samyang", "tnl"] as Company[]).map((company) => ({
    company,
    label: companyIndustryMeta[company].display_name,
    items: sourceGapMap.filter((row) => row.company === company)
  }));
}

function buildMethodologyNotes() {
  return [
    "Amazon US CSV is used as a directional proxy, not an absolute revenue estimator.",
    "Coway needs Korea / Malaysia / Southeast Asia channel data to explain the consolidated business.",
    "Samyang needs US retail, China platform, and HS 190230 export data to separate demand from distribution effects.",
    "T&L needs CHD filings, Keepa, non-Amazon retail, trade data, and B/L signals because sell-through can lag sell-in by 1-4 quarters.",
    "DART quarterly revenue is the scale benchmark; TRASS monthly and quarterly export data are channel proxies that help separate demand from distribution and inventory timing."
  ];
}

function quarterFromMonth(month: string): string {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return month;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const quarter = Math.floor((monthNumber - 1) / 3) + 1;
  return `${year}-Q${quarter}`;
}

function makeQuarterSeries(rows: Array<{ quarter: string; revenue: number | null }>) {
  const sorted = [...rows].sort((a, b) => normalizeQuarterSortKey(a.quarter) - normalizeQuarterSortKey(b.quarter));
  return sorted.map((row, index) => {
    const current = row.revenue;
    const previous = index > 0 ? sorted[index - 1].revenue : null;
    const yoy = index >= 4 ? sorted[index - 4].revenue : null;
    return {
      quarter: row.quarter,
      revenue: current,
      mom: growth(current, previous),
      yoy: growth(current, yoy)
    };
  });
}

function buildQuarterlyComparison(
  company: Company,
  companyRows: CompanyMonthlyRow[],
  productRows: MonthlyProductRow[],
  dartRows: DartQuarterlyRevenueRow[]
): QuarterlyComparisonRow[] {
  const amazonQuarterBuckets = new Map<string, { revenue: number; units: number; productCount: Set<string>; months: Set<string> }>();
  for (const row of companyRows) {
    const quarter = quarterFromMonth(row.month);
    const bucket = amazonQuarterBuckets.get(quarter) ?? { revenue: 0, units: 0, productCount: new Set<string>(), months: new Set<string>() };
    bucket.revenue += row.total_revenue ?? 0;
    bucket.units += row.total_units ?? 0;
    bucket.productCount.add(`${row.company}__${row.month}`);
    bucket.months.add(row.month);
    amazonQuarterBuckets.set(quarter, bucket);
  }

  const dartQuarterRows = dartRows.filter((row) => row.company === company);
  const dartByQuarter = new Map(dartQuarterRows.map((row) => [row.quarter, row]));
  const productQuarterBuckets = new Map<string, Set<string>>();
  for (const row of productRows.filter((row) => row.company === company)) {
    const quarter = quarterFromMonth(row.month);
    productQuarterBuckets.set(quarter, new Set([...(productQuarterBuckets.get(quarter) ?? []), row.asin]));
  }
  const amazonQuarterSeries = makeQuarterSeries(
    [...amazonQuarterBuckets.entries()].map(([quarter, bucket]) => ({ quarter, revenue: bucket.revenue }))
  );
  const dartQuarterSeries = makeQuarterSeries(
    dartQuarterRows.map((row) => ({ quarter: row.quarter, revenue: row.revenue_krw }))
  );
  const allQuarters = new Set<string>([...amazonQuarterBuckets.keys(), ...dartByQuarter.keys()]);
  const orderedQuarters = [...allQuarters].sort((a, b) => normalizeQuarterSortKey(a) - normalizeQuarterSortKey(b));

  const amazonIndexBase = amazonQuarterSeries.find((row) => row.revenue !== null)?.revenue ?? null;
  const dartIndexBase = dartQuarterSeries.find((row) => row.revenue !== null)?.revenue ?? null;

  return orderedQuarters.map((quarter) => {
    const amazonBucket = amazonQuarterBuckets.get(quarter);
    const dartRow = dartByQuarter.get(quarter);
    const amazonSeriesRow = amazonQuarterSeries.find((row) => row.quarter === quarter);
    const dartSeriesRow = dartQuarterSeries.find((row) => row.quarter === quarter);
    const amazonRevenueUsd = amazonBucket ? amazonBucket.revenue : null;
    const dartRevenueEokKrw = dartRow?.revenue_krw === null || dartRow?.revenue_krw === undefined ? null : dartRow.revenue_krw / 100_000_000;
    const amazonIndex = amazonIndexBase && amazonRevenueUsd !== null ? round((amazonRevenueUsd / amazonIndexBase) * 100, 1) : null;
    const dartIndex = dartIndexBase && dartRow?.revenue_krw !== null && dartRow?.revenue_krw !== undefined ? round((dartRow.revenue_krw / dartIndexBase) * 100, 1) : null;
    const comment =
      company === "coway"
        ? "Amazon US tracks only a small slice of Airmega demand; compare against DART scale and regional mix."
        : company === "samyang"
          ? "Use DART for company scale and TRASS for export momentum; Amazon US is mainly a U.S. Buldak proxy."
          : "Use DART for company scale and TRASS for sell-through direction; Amazon US is directional only.";

    return {
      company,
      quarter,
      externalRevenueEokKrw: dartRevenueEokKrw,
      externalYoY: dartSeriesRow?.yoy ?? null,
      externalQoQ: dartSeriesRow?.mom ?? null,
      comment,
      trackedRevenueUsd: amazonRevenueUsd,
      trackedUnits: amazonBucket ? amazonBucket.units : null,
      trackedProductCount: productQuarterBuckets.get(quarter)?.size ?? null,
      trackedYoY: amazonSeriesRow?.yoy ?? null,
      trackedQoQ: amazonSeriesRow?.mom ?? null,
      monthsPresent: amazonBucket ? amazonBucket.months.size : 0,
      isCompleteQuarter: amazonBucket ? amazonBucket.months.size >= 3 : false,
      externalIndex: dartIndex,
      trackedIndex: amazonIndex,
      indexGap: dartIndex !== null && amazonIndex !== null ? round(dartIndex - amazonIndex, 1) : null
    };
  });
}

function writeOutputsFromExistingDashboard(existing: ExistingDashboardJson) {
  const tables = existing.tables;
  if (
    !tables?.amazon_us_monthly ||
    !tables.company_monthly_proxy ||
    !tables.product_family_monthly ||
    !tables.company_coverage_score ||
    !tables.source_gap_map
  ) {
    throw new Error("Existing dashboard_data.json is missing required tables for fallback build");
  }

  fs.mkdirSync(processedRoot, { recursive: true });
  fs.mkdirSync(publicDataRoot, { recursive: true });

  fs.writeFileSync(path.join(processedRoot, "amazon_us_monthly.csv"), writeCsv(toCsvRows(tables.amazon_us_monthly)));
  fs.writeFileSync(path.join(processedRoot, "company_monthly_proxy.csv"), writeCsv(toCsvRows(tables.company_monthly_proxy)));
  fs.writeFileSync(path.join(processedRoot, "product_family_monthly.csv"), writeCsv(toCsvRows(tables.product_family_monthly)));
  fs.writeFileSync(path.join(processedRoot, "company_coverage_score.csv"), writeCsv(toCsvRows(tables.company_coverage_score)));
  fs.writeFileSync(path.join(processedRoot, "source_gap_map.csv"), writeCsv(toCsvRows(tables.source_gap_map)));
  if (tables.trass_trade_monthly) fs.writeFileSync(path.join(processedRoot, "trass_trade_monthly.csv"), writeCsv(toCsvRows(tables.trass_trade_monthly)));
  if (tables.trass_trade_quarterly) fs.writeFileSync(path.join(processedRoot, "trass_trade_quarterly.csv"), writeCsv(toCsvRows(tables.trass_trade_quarterly)));
  if (tables.trass_country_monthly) fs.writeFileSync(path.join(processedRoot, "trass_country_monthly.csv"), writeCsv(toCsvRows(tables.trass_country_monthly)));
  if (tables.dart_quarterly_revenue) fs.writeFileSync(path.join(processedRoot, "dart_quarterly_revenue.csv"), writeCsv(toCsvRows(tables.dart_quarterly_revenue)));
  if (tables.quarterly_comparison) fs.writeFileSync(path.join(processedRoot, "quarterly_comparison.csv"), writeCsv(toCsvRows(tables.quarterly_comparison)));

  const refreshed = {
    ...existing,
    generated_at: new Date().toISOString()
  };

  fs.writeFileSync(path.join(publicDataRoot, "dashboard_data.json"), JSON.stringify(refreshed, null, 2));

  console.log(`reused public/data/dashboard_data.json because ${rawRoot} is missing`);
  console.log(`wrote data/processed/amazon_us_monthly.csv (${tables.amazon_us_monthly.length} rows)`);
  console.log(`wrote data/processed/company_monthly_proxy.csv (${tables.company_monthly_proxy.length} rows)`);
  console.log(`wrote data/processed/product_family_monthly.csv (${tables.product_family_monthly.length} rows)`);
  console.log(`wrote data/processed/company_coverage_score.csv (${tables.company_coverage_score.length} rows)`);
  console.log(`wrote data/processed/source_gap_map.csv (${tables.source_gap_map.length} rows)`);
  if (tables.trass_trade_monthly) console.log(`wrote data/processed/trass_trade_monthly.csv (${tables.trass_trade_monthly.length} rows)`);
  if (tables.trass_trade_quarterly) console.log(`wrote data/processed/trass_trade_quarterly.csv (${tables.trass_trade_quarterly.length} rows)`);
  if (tables.trass_country_monthly) console.log(`wrote data/processed/trass_country_monthly.csv (${tables.trass_country_monthly.length} rows)`);
  if (tables.dart_quarterly_revenue) console.log(`wrote data/processed/dart_quarterly_revenue.csv (${tables.dart_quarterly_revenue.length} rows)`);
  if (tables.quarterly_comparison) console.log(`wrote data/processed/quarterly_comparison.csv (${tables.quarterly_comparison.length} rows)`);
  console.log(`wrote public/data/dashboard_data.json`);
}

function main() {
  if (!fs.existsSync(rawRoot)) {
    const existing = loadExistingDashboardData();
    if (!existing) throw new Error(`Missing raw directory and fallback dashboard data: ${rawRoot}`);
    writeOutputsFromExistingDashboard(existing);
    return;
  }

  const rawFiles = readRawFiles();
  const dailyRecords = rawFiles.flatMap((file) => normalizeFileRows(file));
  const productMonthly = finalizeRevenueShare(addProductLevelGrowth(buildProductMonthlyRows(dailyRecords)));
  const companyMonthly = ["coway", "samyang", "tnl"].flatMap((company) => computeCompanyMetric(company as Company, productMonthly.filter((row) => row.company === company)));
  const processedTrade = ensureProcessedTradeData();

  const dataAvailability: Record<Company, { dartQuarterly: boolean; trassTrade: boolean; trassCountry: boolean }> = {
    coway: {
      dartQuarterly: processedTrade.dartQuarterlyRevenue.some((row) => row.company === "coway"),
      trassTrade: processedTrade.trassTradeQuarterly.some((row) => row.company === "coway"),
      trassCountry: processedTrade.trassCountryMonthly.some((row) => row.company === "coway" && row.country_scope !== "total")
    },
    samyang: {
      dartQuarterly: processedTrade.dartQuarterlyRevenue.some((row) => row.company === "samyang"),
      trassTrade: processedTrade.trassTradeQuarterly.some((row) => row.company === "samyang"),
      trassCountry: processedTrade.trassCountryMonthly.some((row) => row.company === "samyang" && row.country_scope !== "total")
    },
    tnl: {
      dartQuarterly: processedTrade.dartQuarterlyRevenue.some((row) => row.company === "tnl"),
      trassTrade: processedTrade.trassTradeQuarterly.some((row) => row.company === "tnl"),
      trassCountry: processedTrade.trassCountryMonthly.some((row) => row.company === "tnl" && row.country_scope !== "total")
    }
  };

  const companyRevenueByMonth = new Map<string, number>();
  for (const row of companyMonthly) {
    companyRevenueByMonth.set(`${row.company}__${row.month}`, row.total_revenue ?? 0);
  }

  const familyMonthly = ["coway", "samyang", "tnl"].flatMap((company) =>
    computeFamilyMetric(company as Company, productMonthly.filter((row) => row.company === company), companyRevenueByMonth)
  );
  const coverageScores = ["coway", "samyang", "tnl"].map((company) =>
    computeCompanyQuality(company as Company, dailyRecords, productMonthly, dataAvailability[company as Company])
  );

  const companyMonthCount = new Map<Company, Set<string>>();
  for (const row of productMonthly) {
    if (!companyMonthCount.has(row.company)) companyMonthCount.set(row.company, new Set());
    companyMonthCount.get(row.company)?.add(row.month);
  }

  const companyAsinCount = new Map<Company, Set<string>>();
  for (const row of productMonthly) {
    if (!companyAsinCount.has(row.company)) companyAsinCount.set(row.company, new Set());
    companyAsinCount.get(row.company)?.add(row.asin);
  }

  const companyFileCount = new Map<Company, Set<string>>();
  for (const row of dailyRecords) {
    if (!companyFileCount.has(row.company)) companyFileCount.set(row.company, new Set());
    companyFileCount.get(row.company)?.add(row.file_path);
  }

  const coverageOutput = coverageScores.map((row) => ({
    ...row,
    raw_file_count: companyFileCount.get(row.company)?.size ?? 0,
    unique_asin_count: companyAsinCount.get(row.company)?.size ?? 0,
    month_count: companyMonthCount.get(row.company)?.size ?? 0
  }));

  const sourceGapMap = buildSourceGapMap(dataAvailability);
  const overview = buildOverview(rawFiles, productMonthly, companyMonthly, coverageOutput);
  const industries = buildIndustries(companyMonthly, coverageOutput, exposureConfig);
  const companies = buildCompanies(companyMonthly, productMonthly, familyMonthly, coverageOutput, exposureConfig);
  const monthlyTrend = buildMonthlyTrend(companyMonthly);
  const regionalExposure = buildRegionalExposure(exposureConfig);
  const missingDataChecklist = buildMissingDataChecklist(sourceGapMap);
  const methodologyNotes = buildMethodologyNotes();
  const quarterlyComparison = (["coway", "samyang", "tnl"] as Company[]).flatMap((company) =>
    buildQuarterlyComparison(
      company,
      companyMonthly.filter((row) => row.company === company),
      productMonthly.filter((row) => row.company === company),
      processedTrade.dartQuarterlyRevenue
    )
  );

  const allSummary = {
    company_count: 3,
    raw_file_count: rawFiles.length,
    daily_row_count: dailyRecords.length,
    monthly_product_row_count: productMonthly.length,
    company_monthly_row_count: companyMonthly.length,
    product_family_row_count: familyMonthly.length,
    unique_asin_count: new Set(productMonthly.map((row) => row.asin)).size,
    month_count: new Set(productMonthly.map((row) => row.month)).size,
    trade_monthly_row_count: processedTrade.trassTradeMonthly.length,
    trade_quarterly_row_count: processedTrade.trassTradeQuarterly.length,
    trade_country_monthly_row_count: processedTrade.trassCountryMonthly.length,
    dart_quarterly_row_count: processedTrade.dartQuarterlyRevenue.length,
    quarterly_comparison_row_count: quarterlyComparison.length,
    company_coverage: coverageOutput,
    date_range: {
      min: dailyRecords.map((row) => row.date).filter(Boolean).sort()[0] ?? null,
      max: dailyRecords.map((row) => row.date).filter(Boolean).sort().at(-1) ?? null
    },
    overview,
    quarterly_benchmark_base_quarter: quarterlyComparison.find((row) => row.trackedRevenueUsd !== null && row.externalRevenueEokKrw !== null)?.quarter ?? null
  };

  const jsonPayload = {
    generated_at: new Date().toISOString(),
    summary: allSummary,
    company_exposure: exposureConfig,
    overview,
    industries,
    companies,
    monthlyTrend,
    productFamilies: familyMonthly,
    products: productMonthly,
    regionalExposure,
    missingDataChecklist,
    methodologyNotes,
    tradeMonthly: processedTrade.trassTradeMonthly,
    tradeQuarterly: processedTrade.trassTradeQuarterly,
    tradeCountryMonthly: processedTrade.trassCountryMonthly,
    dartQuarterlyRevenue: processedTrade.dartQuarterlyRevenue,
    quarterlyComparison,
    tables: {
      amazon_us_monthly: productMonthly,
      company_monthly_proxy: companyMonthly,
      product_family_monthly: familyMonthly,
      company_coverage_score: coverageOutput,
      source_gap_map: sourceGapMap,
      trass_trade_monthly: processedTrade.trassTradeMonthly,
      trass_trade_quarterly: processedTrade.trassTradeQuarterly,
      trass_country_monthly: processedTrade.trassCountryMonthly,
      dart_quarterly_revenue: processedTrade.dartQuarterlyRevenue,
      quarterly_comparison: quarterlyComparison
    }
  };

  fs.mkdirSync(processedRoot, { recursive: true });
  fs.mkdirSync(publicDataRoot, { recursive: true });

  fs.writeFileSync(path.join(processedRoot, "amazon_us_monthly.csv"), writeCsv(toCsvRows(productMonthly)));
  fs.writeFileSync(path.join(processedRoot, "company_monthly_proxy.csv"), writeCsv(toCsvRows(companyMonthly)));
  fs.writeFileSync(path.join(processedRoot, "product_family_monthly.csv"), writeCsv(toCsvRows(familyMonthly)));
  fs.writeFileSync(path.join(processedRoot, "company_coverage_score.csv"), writeCsv(toCsvRows(coverageOutput)));
  fs.writeFileSync(path.join(processedRoot, "source_gap_map.csv"), writeCsv(toCsvRows(sourceGapMap)));
  fs.writeFileSync(path.join(processedRoot, "trass_trade_monthly.csv"), writeCsv(toCsvRows(processedTrade.trassTradeMonthly)));
  fs.writeFileSync(path.join(processedRoot, "trass_trade_quarterly.csv"), writeCsv(toCsvRows(processedTrade.trassTradeQuarterly)));
  fs.writeFileSync(path.join(processedRoot, "trass_country_monthly.csv"), writeCsv(toCsvRows(processedTrade.trassCountryMonthly)));
  fs.writeFileSync(path.join(processedRoot, "dart_quarterly_revenue.csv"), writeCsv(toCsvRows(processedTrade.dartQuarterlyRevenue)));
  fs.writeFileSync(path.join(processedRoot, "quarterly_comparison.csv"), writeCsv(toCsvRows(quarterlyComparison)));
  fs.writeFileSync(path.join(publicDataRoot, "dashboard_data.json"), JSON.stringify(jsonPayload, null, 2));

  console.log(`wrote data/processed/amazon_us_monthly.csv (${productMonthly.length} rows)`);
  console.log(`wrote data/processed/company_monthly_proxy.csv (${companyMonthly.length} rows)`);
  console.log(`wrote data/processed/product_family_monthly.csv (${familyMonthly.length} rows)`);
  console.log(`wrote data/processed/company_coverage_score.csv (${coverageOutput.length} rows)`);
  console.log(`wrote data/processed/source_gap_map.csv (${sourceGapMap.length} rows)`);
  console.log(`wrote data/processed/trass_trade_monthly.csv (${processedTrade.trassTradeMonthly.length} rows)`);
  console.log(`wrote data/processed/trass_trade_quarterly.csv (${processedTrade.trassTradeQuarterly.length} rows)`);
  console.log(`wrote data/processed/trass_country_monthly.csv (${processedTrade.trassCountryMonthly.length} rows)`);
  console.log(`wrote data/processed/dart_quarterly_revenue.csv (${processedTrade.dartQuarterlyRevenue.length} rows)`);
  console.log(`wrote data/processed/quarterly_comparison.csv (${quarterlyComparison.length} rows)`);
  console.log(`wrote public/data/dashboard_data.json`);
}

main();
