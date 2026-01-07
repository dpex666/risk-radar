import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({ error: "Query too short" }, { status: 400 });
    }

    // 1) search
    const sRes = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`,
      { cache: "no-store" }
    );
    if (!sRes.ok) {
      return NextResponse.json(
        { error: `Search failed (${sRes.status})` },
        { status: 502 }
      );
    }
    const sJson = await sRes.json();

    const coins = (sJson?.coins || []).map((c: any) => ({
      id: c.id,
      symbol: String(c.symbol || "").toUpperCase(),
      name: String(c.name || ""),
    }));

    const upper = q.toUpperCase();
    const chosen = coins.find((c: any) => c.symbol === upper) || coins[0];
    if (!chosen) {
      return NextResponse.json({ error: "No matching coin found" }, { status: 404 });
    }

    // 2) markets (do this server-side to avoid CORS)
    const mRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
        chosen.id
      )}&price_change_percentage=24h,7d,30d`,
      { cache: "no-store" }
    );

    if (!mRes.ok) {
      return NextResponse.json(
        { error: `Market fetch failed (${mRes.status})` },
        { status: 502 }
      );
    }

    const mJson = await mRes.json();
    const row = mJson?.[0];
    if (!row) {
      return NextResponse.json({ error: "Market data unavailable" }, { status: 404 });
    }

    return NextResponse.json({ chosen, row });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
