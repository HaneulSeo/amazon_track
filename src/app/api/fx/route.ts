import { NextResponse } from "next/server";

export const revalidate = 60 * 60;

const FALLBACK_USD_KRW = 1350;

export async function GET() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate },
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`FX API responded with ${response.status}`);
    }

    const data = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_utc?: string;
      provider?: string;
    };

    const usdKrw = data.rates?.KRW;
    if (data.result !== "success" || typeof usdKrw !== "number") {
      throw new Error("FX API did not return USD/KRW");
    }

    return NextResponse.json({
      usdKrw,
      asOf: data.time_last_update_utc ?? new Date().toUTCString(),
      source: data.provider ?? "https://www.exchangerate-api.com"
    });
  } catch (error) {
    return NextResponse.json(
      {
        usdKrw: FALLBACK_USD_KRW,
        asOf: new Date().toUTCString(),
        source: "fallback",
        warning: error instanceof Error ? error.message : "Unknown FX error"
      },
      { status: 200 }
    );
  }
}
