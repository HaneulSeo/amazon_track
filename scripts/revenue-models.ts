// Revenue modeling engine.
//
// Target = DART quarterly revenue (per company; DART does not expose segment-level
// revenue, so "사업부" here means the company as a whole). Predictors are the Amazon US
// proxy and TRASS export values. Amazon and TRASS are never combined in one model
// because they measure overlapping demand; we only fit pairwise relationships:
//   revenue ~ amazon, revenue ~ trass(scope), amazon ~ trass(scope).
// Each pair is fitted across recognition lags 0..MAX_LAG quarters, in both levels and
// year-over-year mode, so the timing that best explains revenue can be read off directly.

export const MAX_LAG = 4;
const MIN_N_FOR_BEST = 4;

export type Company = "coway" | "samyang" | "tnl";

export type DartQuarterlyInput = {
  company: string;
  quarter: string;
  revenue_krw: number | null;
};

export type AmazonMonthlyInput = {
  company: string;
  month: string;
  total_revenue: number | null;
};

export type TrassQuarterlyInput = {
  company: string;
  product_line: string;
  country_scope: string;
  quarter: string;
  export_value_krw: number | null;
  export_value_usd: number | null;
};

export type ModelUnit = "krw" | "usd";

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

export type ModelMode = "levels" | "yoy";

export type ModelPair = {
  id: string;
  kind: "revenue~amazon" | "revenue~trass" | "amazon~trass";
  targetLabel: string;
  predictorLabel: string;
  targetUnit: ModelUnit;
  predictorUnit: ModelUnit;
  scope: string | null; // "total" | "us" | "cn" for TRASS pairs
  note: string | null;
  series: Array<{ period: string; target: number | null; predictor: number | null }>;
  fits: Record<ModelMode, LagFit[]>;
  best: Record<ModelMode, LagFit | null>;
};

export type CompanyModels = {
  company: Company;
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

const COMPANY_LABEL: Record<Company, string> = {
  coway: "Coway",
  samyang: "Samyang",
  tnl: "TNL (Mighty Patch)"
};

const SCOPE_LABEL: Record<string, string> = {
  total: "전체",
  us: "미국",
  cn: "중국"
};

const SCOPE_ORDER = ["total", "us", "cn"];

// ---------- quarter helpers ----------

function quarterToIndex(quarter: string): number | null {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return null;
  return Number(match[1]) * 4 + (Number(match[2]) - 1);
}

function indexToQuarter(index: number): string {
  const year = Math.floor(index / 4);
  const q = (index % 4) + 1;
  return `${year}-Q${q}`;
}

function monthToQuarter(month: string): string | null {
  const match = month.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const q = Math.ceil(Number(match[2]) / 3);
  return `${match[1]}-Q${q}`;
}

function sortQuarters(quarters: Iterable<string>): string[] {
  return [...new Set(quarters)].sort((a, b) => (quarterToIndex(a) ?? 0) - (quarterToIndex(b) ?? 0));
}

// ---------- numerics ----------

function gammaln(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += cof[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// Regularized incomplete beta I_x(a, b).
function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// Two-sided p-value for a Student-t statistic with df degrees of freedom.
function tDistTwoSidedP(t: number, df: number): number | null {
  if (df <= 0 || !Number.isFinite(t)) return null;
  const x = df / (df + t * t);
  return betai(df / 2, 0.5, x);
}

function round(value: number | null, digits = 4): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

// Ordinary least squares for a single predictor.
function ols(points: Array<{ x: number; y: number }>): Omit<LagFit, "lag"> {
  const n = points.length;
  if (n < 3) {
    return { n, slope: null, intercept: null, r2: null, adjR2: null, corr: null, pValue: null };
  }
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  if (sxx <= 0 || syy <= 0) {
    return { n, slope: null, intercept: null, r2: null, adjR2: null, corr: null, pValue: null };
  }
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const corr = sxy / Math.sqrt(sxx * syy);
  const r2 = corr * corr;
  const df = n - 2;
  const adjR2 = df > 0 ? 1 - ((1 - r2) * (n - 1)) / df : null;
  const sse = syy - slope * sxy;
  const seSlope = df > 0 && sxx > 0 ? Math.sqrt(Math.max(sse, 0) / df / sxx) : null;
  const tStat = seSlope && seSlope > 0 ? slope / seSlope : null;
  const pValue = tStat !== null ? tDistTwoSidedP(tStat, df) : null;
  return {
    n,
    slope: round(slope, 6),
    intercept: round(intercept, 6),
    r2: round(r2),
    adjR2: round(adjR2),
    corr: round(corr),
    pValue: round(pValue, 5)
  };
}

// ---------- series transforms ----------

type Series = Map<string, number>; // quarter -> value

function toYoY(series: Series): Series {
  const out: Series = new Map();
  for (const [quarter, value] of series) {
    const idx = quarterToIndex(quarter);
    if (idx === null) continue;
    const prevQuarter = indexToQuarter(idx - 4);
    const prev = series.get(prevQuarter);
    if (prev === undefined || prev === 0) continue;
    out.set(quarter, (value - prev) / Math.abs(prev));
  }
  return out;
}

// Pair target[t] with predictor[t - lag] and fit OLS.
function fitAtLag(target: Series, predictor: Series, lag: number): LagFit {
  const points: Array<{ x: number; y: number }> = [];
  for (const [quarter, y] of target) {
    const idx = quarterToIndex(quarter);
    if (idx === null) continue;
    const laggedQuarter = indexToQuarter(idx - lag);
    const x = predictor.get(laggedQuarter);
    if (x === undefined) continue;
    points.push({ x, y });
  }
  return { lag, ...ols(points) };
}

function lagSweep(target: Series, predictor: Series): LagFit[] {
  const fits: LagFit[] = [];
  for (let lag = 0; lag <= MAX_LAG; lag++) {
    fits.push(fitAtLag(target, predictor, lag));
  }
  return fits;
}

function bestFit(fits: LagFit[]): LagFit | null {
  const valid = fits.filter((f) => f.r2 !== null && f.n >= MIN_N_FOR_BEST);
  if (!valid.length) return null;
  return valid.reduce((best, f) => ((f.r2 ?? -1) > (best.r2 ?? -1) ? f : best));
}

function clipToTargetRange(
  target: Series,
  predictor: Series
): Array<{ period: string; target: number | null; predictor: number | null }> {
  const targetQuarters = sortQuarters(target.keys());
  if (!targetQuarters.length) return [];
  const minIdx = quarterToIndex(targetQuarters[0]) ?? 0;
  const maxIdx = quarterToIndex(targetQuarters[targetQuarters.length - 1]) ?? 0;
  const periods = sortQuarters([...target.keys(), ...predictor.keys()]).filter((q) => {
    const idx = quarterToIndex(q);
    return idx !== null && idx >= minIdx && idx <= maxIdx;
  });
  return periods.map((period) => ({
    period,
    target: target.get(period) ?? null,
    predictor: predictor.get(period) ?? null
  }));
}

// ---------- aggregation ----------

function dartSeries(rows: DartQuarterlyInput[]): Series {
  const series: Series = new Map();
  for (const row of rows) {
    if (row.revenue_krw === null) continue;
    series.set(row.quarter, row.revenue_krw);
  }
  return series;
}

// Amazon monthly -> quarterly revenue. Only complete quarters (3 months present) are
// kept so partial first/last quarters do not understate the proxy.
function amazonQuarterSeries(rows: AmazonMonthlyInput[]): Series {
  const sums = new Map<string, { revenue: number; months: number }>();
  for (const row of rows) {
    const quarter = monthToQuarter(row.month);
    if (!quarter || row.total_revenue === null) continue;
    const bucket = sums.get(quarter) ?? { revenue: 0, months: 0 };
    bucket.revenue += row.total_revenue;
    bucket.months += 1;
    sums.set(quarter, bucket);
  }
  const series: Series = new Map();
  for (const [quarter, bucket] of sums) {
    if (bucket.months >= 3) series.set(quarter, bucket.revenue);
  }
  return series;
}

function trassScopeSeries(rows: TrassQuarterlyInput[], scope: string, unit: ModelUnit): Series {
  const series: Series = new Map();
  const key = unit === "krw" ? "export_value_krw" : "export_value_usd";
  for (const row of rows) {
    if (row.country_scope !== scope) continue;
    const value = row[key];
    if (value === null) continue;
    series.set(row.quarter, (series.get(row.quarter) ?? 0) + value);
  }
  return series;
}

function buildPair(args: {
  id: string;
  kind: ModelPair["kind"];
  targetLabel: string;
  predictorLabel: string;
  targetUnit: ModelUnit;
  predictorUnit: ModelUnit;
  scope: string | null;
  note: string | null;
  target: Series;
  predictor: Series;
}): ModelPair {
  const { target, predictor } = args;
  const levels = lagSweep(target, predictor);
  const yoy = lagSweep(toYoY(target), toYoY(predictor));
  return {
    id: args.id,
    kind: args.kind,
    targetLabel: args.targetLabel,
    predictorLabel: args.predictorLabel,
    targetUnit: args.targetUnit,
    predictorUnit: args.predictorUnit,
    scope: args.scope,
    note: args.note,
    series: clipToTargetRange(target, predictor),
    fits: { levels, yoy },
    best: { levels: bestFit(levels), yoy: bestFit(yoy) }
  };
}

export function buildRevenueModels(input: {
  dart: DartQuarterlyInput[];
  amazonMonthly: AmazonMonthlyInput[];
  trassQuarterly: TrassQuarterlyInput[];
}): RevenueModels {
  const companies: CompanyModels[] = [];

  for (const company of ["coway", "samyang", "tnl"] as Company[]) {
    const dartRows = input.dart.filter((row) => row.company === company);
    const amazonRows = input.amazonMonthly.filter((row) => row.company === company);
    const trassRows = input.trassQuarterly.filter((row) => row.company === company);

    const dart = dartSeries(dartRows);
    const amazon = amazonQuarterSeries(amazonRows);
    const trassScopes = SCOPE_ORDER.filter((scope) => trassRows.some((row) => row.country_scope === scope));

    const hasDart = dart.size > 0;
    const hasAmazon = amazon.size > 0;
    const hasTrass = trassScopes.length > 0;

    const pairs: ModelPair[] = [];

    if (hasDart && hasAmazon) {
      pairs.push(
        buildPair({
          id: "revenue~amazon",
          kind: "revenue~amazon",
          targetLabel: "DART 분기 매출",
          predictorLabel: "Amazon US 추정 매출",
          targetUnit: "krw",
          predictorUnit: "usd",
          scope: null,
          note: `완전 분기 ${amazon.size}개만 사용 (Amazon proxy는 2024-05~ 시작이라 표본이 작습니다).`,
          target: dart,
          predictor: amazon
        })
      );
    }

    if (hasDart && hasTrass) {
      for (const scope of trassScopes) {
        pairs.push(
          buildPair({
            id: `revenue~trass:${scope}`,
            kind: "revenue~trass",
            targetLabel: "DART 분기 매출",
            predictorLabel: `TRASS 수출액 (${SCOPE_LABEL[scope] ?? scope})`,
            targetUnit: "krw",
            predictorUnit: "krw",
            scope,
            note: null,
            target: dart,
            predictor: trassScopeSeries(trassRows, scope, "krw")
          })
        );
      }
    }

    if (hasAmazon && hasTrass) {
      for (const scope of trassScopes) {
        pairs.push(
          buildPair({
            id: `amazon~trass:${scope}`,
            kind: "amazon~trass",
            targetLabel: "Amazon US 추정 매출",
            predictorLabel: `TRASS 수출액 (${SCOPE_LABEL[scope] ?? scope})`,
            targetUnit: "usd",
            predictorUnit: "usd",
            scope,
            note: "두 proxy의 정합성 점검용 (둘 다 동일 수요를 측정하므로 회귀에 함께 넣지 않습니다).",
            target: amazon,
            predictor: trassScopeSeries(trassRows, scope, "usd")
          })
        );
      }
    }

    companies.push({
      company,
      label: COMPANY_LABEL[company],
      availability: { dart: hasDart, amazon: hasAmazon, trass: hasTrass, trassScopes },
      pairs
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    maxLag: MAX_LAG,
    minNForBest: MIN_N_FOR_BEST,
    companies
  };
}
