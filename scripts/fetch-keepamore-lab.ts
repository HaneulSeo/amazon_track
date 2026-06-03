import fs from "node:fs/promises";
import path from "node:path";

type TrackedAsin = {
  company: string;
  productFamily: string;
  asin: string;
  productName?: string | null;
};

type RawKeepamoreEnvelope = {
  company: string;
  productFamily: string;
  asin: string;
  fetchedAt: string;
  source: "keepamore_api";
  request: Record<string, unknown>;
  response: unknown;
  rawStatus: number;
  rawUrl: string;
  warnings: string[];
};

type KeepamoreErrorEntry = {
  company?: string;
  productFamily?: string;
  asin: string;
  message: string;
  rawUrl?: string;
};

const REPO_ROOT = process.cwd();
const BASE_URL = "https://mcp.keepamore.com/api";
const REQUEST_TIMEOUT_MS = 180_000;
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1_500;

async function loadApiKey() {
  const direct = process.env.KEEPAMORE_API_KEY?.trim();
  if (direct) return direct;

  const envPath = path.join(REPO_ROOT, ".env.local");
  if (!(await exists(envPath))) {
    throw new Error("KEEPAMORE_API_KEY가 없습니다. .env.local 파일에 KEEPAMORE_API_KEY=... 를 추가해주세요.");
  }

  const content = await fs.readFile(envPath, "utf8");
  const parsed = parseEnvFile(content);
  const key = parsed.KEEPAMORE_API_KEY?.trim();
  if (key) return key;

  throw new Error(".env.local에서 KEEPAMORE_API_KEY를 찾지 못했습니다.");
}

async function main() {
  const apiKey = await loadApiKey();
  const trackedAsins = await loadTrackedAsins();

  if (!trackedAsins.length) {
    throw new Error("기존 Amazon Tracking에서 ASIN을 찾지 못했습니다. public/data/dashboard_data.json 또는 data/processed/amazon_us_monthly.csv를 확인하세요.");
  }

  const today = seoulDate();
  const rawRoot = path.join(REPO_ROOT, "data", "raw", "keepamore_lab", today);
  await fs.mkdir(rawRoot, { recursive: true });

  const tokenInfo = await requestJson(`${BASE_URL}/token`, apiKey);
  console.log(formatTokenSummary(tokenInfo));

  const errors: KeepamoreErrorEntry[] = [];
  let successCount = 0;

  for (let index = 0; index < trackedAsins.length; index += BATCH_SIZE) {
    const batch = trackedAsins.slice(index, index + BATCH_SIZE);
    const batchResult = await fetchBatch(batch, apiKey, today, rawRoot);
    successCount += batchResult.successCount;
    errors.push(...batchResult.errors);

    if (index + BATCH_SIZE < trackedAsins.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const errorPath = path.join(rawRoot, "errors.json");
  await fs.writeFile(
    errorPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "keepamore_api",
        summary: {
          asinCount: trackedAsins.length,
          successCount,
          errorCount: errors.length
        },
        errors
      },
      null,
      2
    )
  );

  console.log(`wrote ${errorPath} (${errors.length} errors)`);
  console.log(`fetched ${successCount}/${trackedAsins.length} ASINs to data/raw/keepamore_lab/${today}`);
}

async function fetchBatch(batch: TrackedAsin[], apiKey: string, today: string, rawRoot: string) {
  const errors: KeepamoreErrorEntry[] = [];
  let successCount = 0;

  const batchResponse = await requestKeepamoreProducts(batch.map((item) => item.asin), apiKey);
  const products = extractProducts(batchResponse);
  const productByAsin = new Map(
    products.map((product) => {
      const asin = product && typeof product === "object" && "asin" in product ? String((product as Record<string, unknown>).asin ?? "") : "";
      return [asin, product] as const;
    })
  );

  for (const item of batch) {
    const product = productByAsin.get(item.asin);
    if (product) {
      await writeRawProduct(rawRoot, today, item, product, batchResponse);
      successCount += 1;
      continue;
    }

    try {
      const singleResponse = await requestKeepamoreProducts([item.asin], apiKey);
      const singleProducts = extractProducts(singleResponse);
      const singleProduct =
        singleProducts.find((entry) => entry && typeof entry === "object" && "asin" in entry && String((entry as Record<string, unknown>).asin ?? "") === item.asin) ??
        singleProducts[0];
      if (!singleProduct) {
        errors.push({
          company: item.company,
          productFamily: item.productFamily,
          asin: item.asin,
          message: "Keepamore 응답에 해당 ASIN이 없습니다.",
          rawUrl: `${BASE_URL}/keepa/product`
        });
        continue;
      }
      await writeRawProduct(rawRoot, today, item, singleProduct, singleResponse);
      successCount += 1;
    } catch (error) {
      errors.push({
        company: item.company,
        productFamily: item.productFamily,
        asin: item.asin,
        message: error instanceof Error ? error.message : String(error),
        rawUrl: `${BASE_URL}/keepa/product`
      });
    }
  }

  return { successCount, errors };
}

async function writeRawProduct(rawRoot: string, today: string, item: TrackedAsin, product: unknown, response: unknown) {
  const companyDir = path.join(rawRoot, item.company);
  await fs.mkdir(companyDir, { recursive: true });

  const envelope: RawKeepamoreEnvelope = {
    company: item.company,
    productFamily: item.productFamily,
    asin: item.asin,
    fetchedAt: new Date().toISOString(),
    source: "keepamore_api",
    request: {
      endpoint: "/api/keepa/product",
      method: "GET",
      query: buildProductQuery([item.asin])
    },
    response: normalizeRawResponse(product, response),
    rawStatus: 200,
    rawUrl: `${BASE_URL}/keepa/product`,
    warnings: []
  };

  const filePath = path.join(companyDir, `${item.asin}.json`);
  await fs.writeFile(filePath, JSON.stringify(envelope, null, 2));
}

function normalizeRawResponse(product: unknown, response: unknown) {
  if (product && typeof product === "object") {
    return product;
  }
  return response;
}

function buildProductQuery(asins: string[]) {
  return {
    asin: asins.join(","),
    domain: "1",
    update: "0",
    history: "1",
    rating: "1",
    buybox: "1",
    stock: "1",
    offers: "20",
    "only-live-offers": "1"
  };
}

async function requestKeepamoreProducts(asins: string[], apiKey: string) {
  const url = new URL(`${BASE_URL}/keepa/product`);
  const query = buildProductQuery(asins);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return requestJson(url.toString(), apiKey);
}

async function requestJson(url: string, apiKey: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json"
      },
      signal: controller.signal
    });

    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      const message = typeof parsed === "object" && parsed !== null && "msg" in parsed ? String((parsed as { msg?: unknown }).msg) : text || response.statusText;
      throw new Error(`${response.status} ${message}`);
    }

    return parsed;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractProducts(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== "object") return [];
  const record = response as Record<string, unknown>;
  if (Array.isArray(record.products)) return record.products;
  if (Array.isArray(record.product)) return record.product;
  if (record.product && typeof record.product === "object") return [record.product];
  if ("asin" in record) return [record];
  return [];
}

async function loadTrackedAsins(): Promise<TrackedAsin[]> {
  const dashboardPath = path.join(REPO_ROOT, "public", "data", "dashboard_data.json");
  const csvPath = path.join(REPO_ROOT, "data", "processed", "amazon_us_monthly.csv");

  if (await exists(dashboardPath)) {
    const dashboard = JSON.parse(await fs.readFile(dashboardPath, "utf8")) as {
      products?: Array<{ company?: string; product_family?: string; productFamily?: string; asin?: string; product_name?: string }>;
    };
    const rows = dashboard.products ?? [];
    return uniqueTrackedAsins(
      rows
        .map((row) => ({
          company: String(row.company ?? "unknown"),
          productFamily: String(row.product_family ?? row.productFamily ?? "Other"),
          asin: String(row.asin ?? "").trim(),
          productName: row.product_name ?? null
        }))
        .filter((row) => row.asin.length > 0)
    );
  }

  if (await exists(csvPath)) {
    const csv = await fs.readFile(csvPath, "utf8");
    const rows = csv.trim().split(/\r?\n/);
    const header = rows.shift()?.split(",") ?? [];
    const idx = {
      company: header.indexOf("company"),
      asin: header.indexOf("asin"),
      productFamily: header.indexOf("product_family"),
      productName: header.indexOf("product_name")
    };
    return uniqueTrackedAsins(
      rows
        .map((line) => line.split(","))
        .map((cells) => ({
          company: String(cells[idx.company] ?? "unknown"),
          productFamily: String(cells[idx.productFamily] ?? "Other"),
          asin: String(cells[idx.asin] ?? "").trim(),
          productName: cells[idx.productName] ?? null
        }))
        .filter((row) => row.asin.length > 0)
    );
  }

  return [];
}

function uniqueTrackedAsins(rows: TrackedAsin[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.company}:${row.asin}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function seoulDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function formatTokenSummary(tokenInfo: unknown) {
  if (!tokenInfo || typeof tokenInfo !== "object") return "Keepamore token endpoint returned an empty payload.";
  const record = tokenInfo as Record<string, unknown>;
  const value = pickFirstNumber(record, [
    "tokensLeft",
    "tokens_left",
    "remaining",
    "remainingTokens",
    "tokens",
    "balance",
    "tokenBalance"
  ]);
  const daily = pickFirstNumber(record, ["dailyTokensLeft", "daily_tokens_left", "dailyRemaining", "daily"]);
  const status = pickFirstString(record, ["status", "msg", "message"]) ?? "token endpoint ok";
  return `Keepamore token check: ${status}${value === null ? "" : ` | remaining=${value}`}${daily === null ? "" : ` | daily=${daily}`}`;
}

function pickFirstNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (value && typeof value === "object") {
      const nested = pickFirstNumber(value as Record<string, unknown>, keys);
      if (nested !== null) return nested;
    }
  }
  return null;
}

function pickFirstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseEnvFile(content: string) {
  const env: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/KEEPAMORE_API_KEY/.test(message)) {
    console.error("\nKEEPAMORE_API_KEY가 없습니다.");
    console.error("repo root의 .env.local에 아래 한 줄을 넣고 다시 실행하세요:");
    console.error("KEEPAMORE_API_KEY=km_...32chars...");
  } else {
    console.error(message);
  }
  process.exitCode = 1;
});
