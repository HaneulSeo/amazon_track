// Live demand-signal fetcher (run in your own environment, not in CI sandboxes).
//
//   npx tsx scripts/fetch-demand-signals.ts
//
// Google Trends needs no auth but is rate-limited by IP (429). Baidu Index is free
// but needs a logged-in cookie:
//
//   # PowerShell
//   $env:BAIDU_COOKIE = "BDUSS=...; BAIDUID=...; ..."
//   npx tsx scripts/fetch-demand-signals.ts
//
// Writes data/processed/demand_signals.json. The build (scripts/build-data-new.ts)
// picks that file up automatically; if it is absent, a labelled sample is shown instead.
// Any source that fails falls back to the sample for that keyword, so the file is always
// complete and the dashboard never breaks.

import fs from "node:fs";
import path from "node:path";
import {
  type DemandPoint,
  type DemandSeries,
  type DemandSignals,
  type KeywordSpec,
  KEYWORD_SPECS,
  attachStats,
  buildSeedDemandSignals,
  recentMonths,
  sourceLabel,
  sourceUnit
} from "./demand-signals";

const MONTHS_BACK = 24;
const OUT_PATH = path.join(process.cwd(), "data", "processed", "demand_signals.json");

const TRENDS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "application/json, text/plain, */*"
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripGooglePrefix(text: string): string {
  // Google Trends responses are prefixed with )]}', to defeat naive JSON parsing.
  const brace = text.indexOf("{");
  const bracket = text.indexOf("[");
  const start = brace === -1 ? bracket : bracket === -1 ? brace : Math.min(brace, bracket);
  return start === -1 ? text : text.slice(start);
}

async function fetchGoogleTrendsMonthly(keyword: string, geo: string): Promise<DemandPoint[] | null> {
  const exploreReq = {
    comparisonItem: [{ keyword, geo, time: "today 5-y" }],
    category: 0,
    property: ""
  };
  const exploreUrl =
    "https://trends.google.com/trends/api/explore?hl=en-US&tz=-540&req=" + encodeURIComponent(JSON.stringify(exploreReq));

  let widgetReq: unknown = null;
  let token: string | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(exploreUrl, { headers: TRENDS_HEADERS });
    if (res.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) return null;
    const json = JSON.parse(stripGooglePrefix(await res.text())) as {
      widgets: Array<{ id: string; token: string; request: unknown }>;
    };
    const widget = json.widgets.find((w) => w.id === "TIMESERIES");
    if (!widget) return null;
    widgetReq = widget.request;
    token = widget.token;
    break;
  }
  if (!widgetReq || !token) return null;

  const dataUrl =
    "https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=-540&req=" +
    encodeURIComponent(JSON.stringify(widgetReq)) +
    "&token=" +
    encodeURIComponent(token);

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(dataUrl, { headers: TRENDS_HEADERS });
    if (res.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) return null;
    const json = JSON.parse(stripGooglePrefix(await res.text())) as {
      default: { timelineData: Array<{ time: string; value: number[] }> };
    };
    const monthlyTotals = new Map<string, { sum: number; n: number }>();
    for (const point of json.default.timelineData) {
      const month = new Date(Number(point.time) * 1000).toISOString().slice(0, 7);
      const value = point.value?.[0];
      if (typeof value !== "number") continue;
      const bucket = monthlyTotals.get(month) ?? { sum: 0, n: 0 };
      bucket.sum += value;
      bucket.n += 1;
      monthlyTotals.set(month, bucket);
    }
    const months = recentMonths(MONTHS_BACK);
    return months.map((month) => {
      const bucket = monthlyTotals.get(month);
      return { date: month, value: bucket ? Math.round(bucket.sum / bucket.n) : null };
    });
  }
  return null;
}

function decryptBaidu(ptbk: string, encrypted: string): string {
  const half = ptbk.length / 2;
  const keys = ptbk.slice(0, half);
  const values = ptbk.slice(half);
  const map = new Map<string, string>();
  for (let i = 0; i < half; i++) map.set(keys[i], values[i]);
  return [...encrypted].map((char) => map.get(char) ?? char).join("");
}

async function fetchBaiduMonthly(keyword: string, cookie: string): Promise<DemandPoint[] | null> {
  const headers = {
    Cookie: cookie,
    Referer: "https://index.baidu.com/v2/main/index.html",
    "User-Agent": TRENDS_HEADERS["User-Agent"]
  };
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear() - 2, end.getUTCMonth(), 1));
  const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const word = JSON.stringify([[{ name: keyword, wordType: 1 }]]);
  const indexUrl = `https://index.baidu.com/api/SearchApi/index?area=0&word=${encodeURIComponent(word)}&startDate=${fmt(start)}&endDate=${fmt(end)}`;

  const indexRes = await fetch(indexUrl, { headers });
  if (!indexRes.ok) return null;
  const indexJson = (await indexRes.json()) as {
    data?: { userIndexes?: Array<{ all?: { data?: string } }>; uniqid?: string; startDate?: string };
  };
  const encrypted = indexJson.data?.userIndexes?.[0]?.all?.data;
  const uniqid = indexJson.data?.uniqid;
  const dataStartDate = indexJson.data?.startDate;
  if (!encrypted || !uniqid || !dataStartDate) return null;

  const ptbkRes = await fetch(`https://index.baidu.com/Interface/ptbk?uniqid=${encodeURIComponent(uniqid)}`, { headers });
  if (!ptbkRes.ok) return null;
  const ptbkJson = (await ptbkRes.json()) as { data?: string };
  if (!ptbkJson.data) return null;

  const decrypted = decryptBaidu(ptbkJson.data, encrypted);
  const daily = decrypted.split(",").map((value) => (value === "" ? null : Number(value)));
  const monthlyTotals = new Map<string, { sum: number; n: number }>();
  const cursor = new Date(`${dataStartDate}T00:00:00Z`);
  for (const value of daily) {
    if (value !== null && Number.isFinite(value)) {
      const month = cursor.toISOString().slice(0, 7);
      const bucket = monthlyTotals.get(month) ?? { sum: 0, n: 0 };
      bucket.sum += value;
      bucket.n += 1;
      monthlyTotals.set(month, bucket);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const months = recentMonths(MONTHS_BACK);
  return months.map((month) => {
    const bucket = monthlyTotals.get(month);
    return { date: month, value: bucket ? Math.round(bucket.sum / bucket.n) : null };
  });
}

function liveSeries(spec: KeywordSpec, points: DemandPoint[]): DemandSeries {
  return attachStats({
    company: spec.company,
    source: spec.source,
    source_label: sourceLabel(spec.source),
    keyword: spec.keyword,
    geo: spec.geo,
    geo_label: spec.geo_label,
    unit: sourceUnit(spec.source),
    is_sample: false,
    note: "실시간 수집값",
    points
  });
}

async function main() {
  const baiduCookie = (process.env.BAIDU_COOKIE ?? "").trim();
  const seed = buildSeedDemandSignals(MONTHS_BACK);
  const seedByKey = new Map(seed.series.map((entry) => [`${entry.source}:${entry.keyword}:${entry.geo}`, entry]));

  const series: DemandSeries[] = [];
  let trendsLive = false;
  let baiduLive = false;

  for (const spec of KEYWORD_SPECS) {
    const key = `${spec.source}:${spec.keyword}:${spec.geo}`;
    try {
      if (spec.source === "google_trends") {
        const points = await fetchGoogleTrendsMonthly(spec.keyword, spec.geo);
        if (points && points.some((point) => point.value !== null)) {
          series.push(liveSeries(spec, points));
          trendsLive = true;
          console.log(`google_trends OK   ${spec.keyword} (${spec.geo_label})`);
          await sleep(1500);
          continue;
        }
        console.warn(`google_trends FAIL ${spec.keyword} (${spec.geo_label}) — using sample`);
      } else if (spec.source === "baidu_index") {
        if (!baiduCookie) {
          console.warn(`baidu_index SKIP  ${spec.keyword} — BAIDU_COOKIE not set, using sample`);
        } else {
          const points = await fetchBaiduMonthly(spec.keyword, baiduCookie);
          if (points && points.some((point) => point.value !== null)) {
            series.push(liveSeries(spec, points));
            baiduLive = true;
            console.log(`baidu_index OK    ${spec.keyword}`);
            await sleep(800);
            continue;
          }
          console.warn(`baidu_index FAIL  ${spec.keyword} — using sample`);
        }
      }
    } catch (error) {
      console.warn(`${spec.source} ERROR ${spec.keyword}:`, (error as Error).message);
    }
    const fallback = seedByKey.get(key);
    if (fallback) series.push(fallback);
  }

  const anySample = series.some((entry) => entry.is_sample);
  const payload: DemandSignals = {
    generatedAt: new Date().toISOString(),
    fetchedLive: trendsLive || baiduLive,
    anySample,
    sources: [
      { id: "google_trends", label: "Google Trends", auth: "무인증 (속도 제한 있음)", status: trendsLive ? "live" : "sample" },
      { id: "baidu_index", label: "Baidu 검색지수", auth: "BAIDU_COOKIE 필요", status: baiduLive ? "live" : "sample" }
    ],
    series,
    notes: seed.notes
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`\nwrote ${path.relative(process.cwd(), OUT_PATH)} (${series.length} series, live=${payload.fetchedLive})`);
  if (anySample) console.log("일부 시리즈는 샘플입니다. 위 경고를 확인하세요.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
