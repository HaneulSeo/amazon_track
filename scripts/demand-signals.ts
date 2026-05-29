// Free demand-signal sources.
//
// We attach the demand signals that can be pulled for free, without paid platforms:
//   - Google Trends: worldwide / per-country search interest (no auth, but rate-limited).
//   - Baidu Index (百度指数): China search interest (free, but requires a login cookie).
//
// China marketplace sell-through (Taobao / Tmall / JD) is gated behind paid platforms
// (Moojing/魔镜, Chanmama/蝉妈妈) and is intentionally NOT scraped here. Baidu search
// interest is the best free proxy for China-side demand.
//
// The live fetch lives in scripts/fetch-demand-signals.ts and writes
// data/processed/demand_signals.json. This module reads that cache when present;
// otherwise it returns a clearly-labelled sample so the dashboard still renders.

import fs from "node:fs";
import path from "node:path";

export type DemandSource = "google_trends" | "baidu_index";

export type DemandPoint = {
  date: string; // YYYY-MM
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

export type DemandSourceStatus = {
  id: DemandSource;
  label: string;
  auth: string;
  status: "live" | "sample";
};

export type DemandSignals = {
  generatedAt: string;
  fetchedLive: boolean;
  anySample: boolean;
  sources: DemandSourceStatus[];
  series: DemandSeries[];
  notes: string[];
};

type SampleShape = {
  start: number;
  end: number;
  seasonalAmp: number;
  noise: number;
  phase: number;
};

export type KeywordSpec = {
  company: string;
  source: DemandSource;
  keyword: string;
  geo: string; // Google Trends geo code ("" = worldwide); "CN" for Baidu
  geo_label: string;
  sample: SampleShape;
};

// Keyword map. Add or edit entries here; the live fetcher reads the same list.
export const KEYWORD_SPECS: KeywordSpec[] = [
  {
    company: "samyang",
    source: "google_trends",
    keyword: "buldak",
    geo: "",
    geo_label: "전세계",
    sample: { start: 38, end: 100, seasonalAmp: 8, noise: 6, phase: 0.4 }
  },
  {
    company: "samyang",
    source: "google_trends",
    keyword: "samyang ramen",
    geo: "US",
    geo_label: "미국",
    sample: { start: 30, end: 82, seasonalAmp: 7, noise: 6, phase: 1.1 }
  },
  {
    company: "samyang",
    source: "baidu_index",
    keyword: "火鸡面",
    geo: "CN",
    geo_label: "중국",
    sample: { start: 4200, end: 9100, seasonalAmp: 1300, noise: 700, phase: 0.2 }
  },
  {
    company: "samyang",
    source: "baidu_index",
    keyword: "三养",
    geo: "CN",
    geo_label: "중국",
    sample: { start: 2600, end: 4800, seasonalAmp: 600, noise: 400, phase: 1.6 }
  },
  {
    company: "coway",
    source: "google_trends",
    keyword: "airmega",
    geo: "US",
    geo_label: "미국",
    sample: { start: 55, end: 78, seasonalAmp: 18, noise: 7, phase: 2.4 }
  },
  {
    company: "tnl",
    source: "google_trends",
    keyword: "mighty patch",
    geo: "US",
    geo_label: "미국",
    sample: { start: 62, end: 90, seasonalAmp: 6, noise: 5, phase: 0.8 }
  }
];

export function sourceLabel(source: DemandSource): string {
  return source === "google_trends" ? "Google Trends" : "Baidu 검색지수";
}

export function sourceUnit(source: DemandSource): DemandSeries["unit"] {
  return source === "google_trends" ? "trends_index" : "baidu_index";
}

const SAMPLE_NOTE: Record<DemandSource, string> = {
  google_trends: "샘플 값입니다. `npx tsx scripts/fetch-demand-signals.ts` 를 실행하면 실제 Google Trends 값으로 교체됩니다.",
  baidu_index:
    "샘플 값입니다. BAIDU_COOKIE 환경변수를 설정한 뒤 `npx tsx scripts/fetch-demand-signals.ts` 를 실행하면 실제 바이두 지수로 교체됩니다."
};

function seededRandom(seedStr: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function recentMonths(count: number, end = new Date()): string[] {
  const months: string[] = [];
  const year = end.getUTCFullYear();
  const month = end.getUTCMonth(); // 0-based
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function changePct(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function summarise(series: Omit<DemandSeries, "latest" | "latest_date" | "yoy_change" | "mom_change">): DemandSeries {
  const points = series.points;
  let latest: number | null = null;
  let latestDate: string | null = null;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].value !== null) {
      latest = points[i].value;
      latestDate = points[i].date;
      break;
    }
  }
  const latestIndex = points.findIndex((point) => point.date === latestDate);
  const prev = latestIndex > 0 ? points[latestIndex - 1].value : null;
  const yearAgo = latestIndex >= 12 ? points[latestIndex - 12].value : null;
  return {
    ...series,
    latest,
    latest_date: latestDate,
    yoy_change: changePct(latest, yearAgo),
    mom_change: changePct(latest, prev)
  };
}

function buildSampleSeries(spec: KeywordSpec, monthsBack: number, end: Date): DemandSeries {
  const months = recentMonths(monthsBack, end);
  const rand = seededRandom(`${spec.source}:${spec.keyword}:${spec.geo}`);
  const raw = months.map((month, index) => {
    const f = monthsBack > 1 ? index / (monthsBack - 1) : 1;
    const monthNumber = Number(month.slice(5, 7));
    const seasonal = spec.sample.seasonalAmp * Math.sin((2 * Math.PI * monthNumber) / 12 + spec.sample.phase);
    const noise = spec.sample.noise * (rand() - 0.5) * 2;
    const value = spec.sample.start + (spec.sample.end - spec.sample.start) * f + seasonal + noise;
    return Math.max(0, value);
  });

  let points: DemandPoint[];
  if (spec.source === "google_trends") {
    const max = Math.max(...raw, 1);
    points = months.map((month, index) => ({ date: month, value: Math.round((raw[index] / max) * 100) }));
  } else {
    points = months.map((month, index) => ({ date: month, value: Math.round(raw[index]) }));
  }

  return summarise({
    company: spec.company,
    source: spec.source,
    source_label: sourceLabel(spec.source),
    keyword: spec.keyword,
    geo: spec.geo,
    geo_label: spec.geo_label,
    unit: sourceUnit(spec.source),
    is_sample: true,
    note: SAMPLE_NOTE[spec.source],
    points
  });
}

export function attachStats(series: Omit<DemandSeries, "latest" | "latest_date" | "yoy_change" | "mom_change">): DemandSeries {
  return summarise(series);
}

export function buildSeedDemandSignals(monthsBack = 24, end = new Date()): DemandSignals {
  const series = KEYWORD_SPECS.map((spec) => buildSampleSeries(spec, monthsBack, end));
  return {
    generatedAt: new Date().toISOString(),
    fetchedLive: false,
    anySample: true,
    sources: [
      { id: "google_trends", label: "Google Trends", auth: "무인증 (속도 제한 있음)", status: "sample" },
      { id: "baidu_index", label: "Baidu 검색지수", auth: "BAIDU_COOKIE 필요", status: "sample" }
    ],
    series,
    notes: [
      "검색 관심도는 실제 판매량이 아니라 수요의 선행/동행 신호입니다.",
      "중국 직접 판매 데이터(타오바오/티몰)는 무료로 공개되지 않아, 바이두 검색지수를 중국 수요의 무료 대체 지표로 사용합니다.",
      "현재는 샘플 값입니다. `npx tsx scripts/fetch-demand-signals.ts` 로 실제 데이터를 받아 붙일 수 있습니다."
    ]
  };
}

// Read the cached live file if the fetcher has run; otherwise return the sample.
export function buildDemandSignals(opts?: { cachePath?: string; monthsBack?: number }): DemandSignals {
  const cachePath = opts?.cachePath ?? path.join(process.cwd(), "data", "processed", "demand_signals.json");
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf8")) as DemandSignals;
      if (cached && Array.isArray(cached.series) && cached.series.length) {
        cached.anySample = cached.series.some((entry) => entry.is_sample);
        return cached;
      }
    } catch {
      // fall through to seed
    }
  }
  return buildSeedDemandSignals(opts?.monthsBack ?? 24);
}
