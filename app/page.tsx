"use client";

import React, { useMemo, useState } from "react";

type CoinHit = {
  id: string;
  symbol: string;
  name: string;
};

type MarketData = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;

  price_change_percentage_24h: number | null;
  price_change_percentage_7d: number | null;
  price_change_percentage_30d: number | null;

  high_24h: number | null;
  low_24h: number | null;
  ath: number | null;
  atl: number | null;
};

type RiskOutput = {
  score: number; // 0–100
  label: "Low" | "Medium" | "High" | "Chaos";
  bias: "Hold" | "Watch" | "Reduce" | "Avoid";
  drawdownPct: number | null;
  bullets: string[];
};

function fmtNum(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function fmtMoney(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}
function pct(n: number | null) {
  if (n === null || Number.isNaN(n)) return "—";
  const v = Math.round(n * 10) / 10;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v}%`;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function riskColor(label: RiskOutput["label"]) {
  switch (label) {
    case "Low":
      return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
    case "Medium":
      return "text-yellow-300 border-yellow-500/30 bg-yellow-500/10";
    case "High":
      return "text-orange-300 border-orange-500/30 bg-orange-500/10";
    case "Chaos":
      return "text-rose-300 border-rose-500/30 bg-rose-500/10";
  }
}

function scoreTextColor(label: RiskOutput["label"]) {
  switch (label) {
    case "Low":
      return "text-emerald-400";
    case "Medium":
      return "text-yellow-400";
    case "High":
      return "text-orange-400";
    case "Chaos":
      return "text-rose-400";
  }
}

function biasColor(bias: RiskOutput["bias"]) {
  switch (bias) {
    case "Hold":
      return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
    case "Watch":
      return "text-sky-300 border-sky-500/30 bg-sky-500/10";
    case "Reduce":
      return "text-orange-300 border-orange-500/30 bg-orange-500/10";
    case "Avoid":
      return "text-rose-300 border-rose-500/30 bg-rose-500/10";
  }
}

function getRiskOutput(d: MarketData): RiskOutput {
  const abs24 = Math.abs(d.price_change_percentage_24h ?? 0);

  // Liquidity proxy: volume / market cap
  const liq = d.market_cap > 0 ? d.total_volume / d.market_cap : 0;

  // Rank proxy (higher rank number = generally riskier)
  const rank = d.market_cap_rank || 9999;

  // Drawdown from ATH (%)
  let drawdownPct: number | null = null;
  if (d.ath != null && d.ath > 0) {
    drawdownPct = Math.round(((d.ath - d.current_price) / d.ath) * 100);
  }

  // Score components
  let score = 0;

  // Volatility shock (0–40)
  score += clamp(abs24 * 2.5, 0, 40);

  // Rank risk (0–35)
  if (rank <= 20) score += 5;
  else if (rank <= 50) score += 12;
  else if (rank <= 100) score += 20;
  else if (rank <= 250) score += 28;
  else score += 35;

  // Liquidity risk (0–25)
  if (liq < 0.02) score += 25;
  else if (liq < 0.05) score += 18;
  else if (liq < 0.1) score += 10;
  else if (liq < 0.2) score += 6;
  else score += 3;

  // Drawdown from ATH (0–30)
  if (drawdownPct !== null) score += clamp(drawdownPct / 2, 0, 30);

  score = clamp(Math.round(score), 0, 100);

  let label: RiskOutput["label"] = "Medium";
  if (score <= 25) label = "Low";
  else if (score <= 50) label = "Medium";
  else if (score <= 75) label = "High";
  else label = "Chaos";

  // Bias (simple + punchy)
  let bias: RiskOutput["bias"] = "Watch";
  if (label === "Low" && drawdownPct !== null && drawdownPct < 20) bias = "Hold";
  else if (label === "Medium") bias = "Watch";
  else if (label === "High") bias = "Reduce";
  else bias = "Avoid";

  const bullets: string[] = [];
  bullets.push(`24h move: ${pct(d.price_change_percentage_24h)} (bigger swings = higher risk).`);

  if (rank <= 20) bullets.push(`Market cap rank #${fmtNum(rank)} (more established).`);
  else bullets.push(`Market cap rank #${fmtNum(rank)} (higher tail risk).`);

  if (liq < 0.05) bullets.push("Liquidity looks thin (volume vs market cap is low).");
  else bullets.push("Liquidity looks reasonable (easier exits).");

  if (drawdownPct !== null) bullets.push(`Down ${drawdownPct}% from ATH (distance matters).`);

  if (d.price_change_percentage_7d != null) bullets.push(`7d move: ${pct(d.price_change_percentage_7d)}.`);
  if (d.price_change_percentage_30d != null) bullets.push(`30d move: ${pct(d.price_change_percentage_30d)}.`);

  if (label === "Chaos") bullets.push("If this nukes 30% overnight, that’s normal for this profile.");
  if (label === "Low") bullets.push("This is still crypto. Low risk here just means ‘less insane’.");

  return { score, label, bias, drawdownPct, bullets };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-zinc-100">{value}</div>
    </div>
  );
}

export default function Page() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [hit, setHit] = useState<CoinHit | null>(null);
  const [data, setData] = useState<MarketData | null>(null);

  const canSearch = query.trim().length >= 2;

  async function searchAndFetch() {
    setErr(null);
    setLoading(true);
    setData(null);
    setHit(null);

    try {
      const q = query.trim();

      const res = await fetch(`/api/coingecko?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Fetch failed");
      }

      const chosen = json.chosen as CoinHit;
      const row = json.row;

      setHit(chosen);

      const parsed: MarketData = {
        id: row.id,
        symbol: String(row.symbol || "").toUpperCase(),
        name: String(row.name || ""),
        image: String(row.image || ""),
        current_price: Number(row.current_price),
        market_cap: Number(row.market_cap),
        market_cap_rank: Number(row.market_cap_rank),
        total_volume: Number(row.total_volume),

        price_change_percentage_24h:
          row.price_change_percentage_24h_in_currency ?? row.price_change_percentage_24h ?? null,
        price_change_percentage_7d: row.price_change_percentage_7d_in_currency ?? null,
        price_change_percentage_30d: row.price_change_percentage_30d_in_currency ?? null,

        high_24h: row.high_24h ?? null,
        low_24h: row.low_24h ?? null,
        ath: row.ath ?? null,
        atl: row.atl ?? null,
      };

      setData(parsed);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const changeClass = useMemo(() => {
    if (!data || data.price_change_percentage_24h == null) return "text-zinc-300";
    return data.price_change_percentage_24h >= 0 ? "text-emerald-400" : "text-rose-400";
  }, [data]);

  const risk = useMemo(() => (data ? getRiskOutput(data) : null), [data]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Risk Radar</h1>
          <p className="mt-2 text-zinc-300">
            Type a coin. Get live market context. (No predictions, no advice.)
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="mb-2 text-xs text-zinc-500">Coin symbol or name</div>
          <div className="flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="BTC, SOL, Ethereum..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            />
            <button
              onClick={searchAndFetch}
              disabled={!canSearch || loading}
              className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "..." : "Scan"}
            </button>
          </div>

          {err && <div className="mt-3 text-sm text-rose-300">{err}</div>}

          {hit && !data && !loading && (
            <div className="mt-4 text-sm text-zinc-300">
              Found: <span className="text-zinc-100">{hit.name}</span> ({hit.symbol})
            </div>
          )}
        </div>

        {data && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            {risk && (
              <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex items-center justify-between gap-4">
  <div>
    <div className="text-xs text-zinc-500">Risk score</div>

    <div className={`mt-1 text-2xl font-semibold ${scoreTextColor(risk.label)}`}>
      {risk.score} <span className="text-base text-zinc-500">/ 100</span>
    </div>

    {/* 👇 ADD IT RIGHT HERE */}
    <div className="mt-2 text-xs text-zinc-500">
      This is a snapshot. Re-run only if facts change.
    </div>
  </div>

  <div className="flex items-center gap-2">
    <div className={`rounded-xl border px-3 py-2 text-sm font-medium ${riskColor(risk.label)}`}>
      {risk.label}
    </div>
    <div className={`rounded-xl border px-3 py-2 text-sm font-medium ${biasColor(risk.bias)}`}>
      Bias: {risk.bias}
    </div>
  </div>
</div>


                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  {risk.bullets.map((b, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-zinc-500">•</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {data.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.image} alt={data.name} className="h-9 w-9 rounded-full" />
                ) : null}
                <div>
                  <div className="text-base font-medium">
                    {data.name} <span className="text-zinc-500">({data.symbol})</span>
                  </div>
                  <div className="text-xs text-zinc-500">Rank #{fmtNum(data.market_cap_rank)}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold">{fmtMoney(data.current_price)}</div>
                <div className={`text-sm ${changeClass}`}>{pct(data.price_change_percentage_24h)} (24h)</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Stat label="24h High" value={data.high_24h == null ? "—" : fmtMoney(data.high_24h)} />
              <Stat label="24h Low" value={data.low_24h == null ? "—" : fmtMoney(data.low_24h)} />
              <Stat label="Market Cap" value={fmtMoney(data.market_cap)} />
              <Stat label="24h Volume" value={fmtMoney(data.total_volume)} />
              <Stat label="ATH" value={data.ath == null ? "—" : fmtMoney(data.ath)} />
              <Stat label="ATL" value={data.atl == null ? "—" : fmtMoney(data.atl)} />
            </div>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-500">
              Data source: CoinGecko. Not financial advice.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
