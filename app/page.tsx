"use client";

import React, { useMemo, useState } from "react";

type Row = {
  id: string;
  token: string;
  pct: string; // keep as string for input handling
};

type Analysis = {
  total: number;
  top1: number;
  top3: number;
  rest: number;
  top1Token: string | null;
  top3Tokens: string[];
  label: "Low" | "Medium" | "High" | "Severe";
  message: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function clampPct(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function parsePct(s: string) {
  // allow "", "10", "10.5"
  if (!s.trim()) return 0;
  const n = Number(s);
  if (Number.isNaN(n)) return 0;
  return clampPct(n);
}

function classify(top1: number, top3: number, rest: number): { label: Analysis["label"]; message: string } {
  // Heuristic, intentionally simple
  if (top1 >= 50) {
    return { label: "Severe", message: "One position controls your sleep schedule." };
  }
  if (top3 >= 70) {
    return { label: "High", message: "This portfolio doesn’t diversify risk. It amplifies it." };
  }
  if (rest >= 40) {
    return { label: "Medium", message: "You’ve got a long tail. That can be noise-heavy fast." };
  }
  return { label: "Low", message: "Looks reasonably balanced. Still, crypto is crypto." };
}

export default function Page() {
  const [rows, setRows] = useState<Row[]>([
  { id: uid(), token: "", pct: "" },
]);


  const [showResult, setShowResult] = useState(false);

  const analysis: Analysis = useMemo(() => {
    const cleaned = rows
      .map((r) => ({
        token: (r.token || "").trim(),
        pct: parsePct(r.pct),
      }))
      .filter((r) => r.token.length > 0 && r.pct > 0);

    const total = round1(cleaned.reduce((sum, r) => sum + r.pct, 0));

    // sort desc by pct
    const sorted = [...cleaned].sort((a, b) => b.pct - a.pct);

    const top1 = round1(sorted[0]?.pct ?? 0);
    const top3 = round1((sorted[0]?.pct ?? 0) + (sorted[1]?.pct ?? 0) + (sorted[2]?.pct ?? 0));
    const rest = round1(Math.max(0, total - top3));

    const top1Token = sorted[0]?.token ?? null;
    const top3Tokens = sorted.slice(0, 3).map((x) => x.token);

    const { label, message } = classify(top1, top3, rest);

    return { total, top1, top3, rest, top1Token, top3Tokens, label, message };
  }, [rows]);

  const totalIs100 = Math.abs(analysis.total - 100) < 0.0001;
  const canAnalyse = rows.some((r) => (r.token || "").trim().length > 0) && analysis.total > 0;

  function addRow() {
    setRows((prev) => [...prev, { id: uid(), token: "", pct: "" }]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function analyse() {
    setShowResult(true);
  }

  function reset() {
    setShowResult(false);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-5 py-10">
        {/* HERO */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Are you overexposed?</h1>
          <p className="mt-2 text-zinc-300">
            Paste your portfolio, get a reality check. No predictions. No advice. Just numbers.
          </p>
        </div>

        {/* INPUT CARD */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Your portfolio</h2>
            <button
              onClick={addRow}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800"
            >
              + Add token
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="flex gap-3">
                <input
                  value={r.token}
                  onChange={(e) => updateRow(r.id, { token: e.target.value })}
                  placeholder="Token (e.g., BTC)"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
                <div className="relative w-28">
                  <input
                    value={r.pct}
                    onChange={(e) => updateRow(r.id, { pct: e.target.value })}
                    inputMode="decimal"
                    placeholder="%"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 pr-7 text-sm outline-none focus:border-zinc-600"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    %
                  </span>
                </div>
                <button
                  onClick={() => removeRow(r.id)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
                  aria-label="Remove row"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* TOTAL + VALIDATION */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-zinc-300">
              Total: <span className={totalIs100 ? "text-emerald-400" : "text-amber-400"}>{analysis.total}%</span>
            </div>
            {!totalIs100 && (
              <div className="text-amber-300">
                Your portfolio doesn’t add up. Neither does your risk.
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="mt-5 flex gap-3">
            <button
  onClick={analyse}
  disabled={!canAnalyse || !totalIs100}

              className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Check exposure
            </button>
            {showResult && (
              <button
                onClick={reset}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* RESULT */}
        {showResult && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-medium">Exposure: {analysis.label}</h3>
                <p className="mt-1 text-zinc-300">{analysis.message}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                Top 1: <span className="text-zinc-100">{analysis.top1}%</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Top position" value={`${analysis.top1}%`} hint={analysis.top1Token ? `${analysis.top1Token}` : ""} />
              <Stat label="Top 3 positions" value={`${analysis.top3}%`} hint={analysis.top3Tokens.filter(Boolean).join(", ")} />
              <Stat label="Long tail" value={`${analysis.rest}%`} hint="Everything outside top 3" />
            </div>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
              <p className="text-zinc-100 font-medium mb-1">Quick read</p>
              <p>
                This isn’t about being “right”. It’s about decision pressure. The more concentrated you are, the more
                every candle feels personal.
              </p>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-8 text-xs text-zinc-500">
          Not financial advice. This is a basic concentration check.
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-zinc-400">{hint}</div> : null}
    </div>
  );
}
