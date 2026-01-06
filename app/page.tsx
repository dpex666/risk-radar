"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePostHog } from "posthog-js/react";

type Answers = {
  asset: string;
  whyBought: string;
  timeHorizon: "Days" | "Weeks" | "Months" | "Years";
  whatChanged: "Nothing" | "Thesis broken" | "Price moved only" | "New info (good)" | "New info (bad)";
  convictionNow: 1 | 2 | 3 | 4 | 5;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  ifZeroOk: "Yes" | "No" | "Not sure";
};

type Result = {
  label: "Hold" | "Trim" | "Exit" | "Reassess";
  headline: string;
  bullets: string[];
};

export default function Page() {
  const posthog = usePostHog();

  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [a, setA] = useState<Answers>({
    asset: "",
    whyBought: "",
    timeHorizon: "Months",
    whatChanged: "Nothing",
    convictionNow: 3,
    stressLevel: 3,
    ifZeroOk: "Not sure",
  });

  const canSubmit =
    a.asset.trim().length > 0 &&
    a.whyBought.trim().length > 0;

  const result: Result = useMemo(() => {
    const thesisBroken = a.whatChanged === "Thesis broken" || a.whatChanged === "New info (bad)";
    const highStress = a.stressLevel >= 4;
    const lowConviction = a.convictionNow <= 2;
    const notOkZero = a.ifZeroOk === "No";
    const priceOnly = a.whatChanged === "Price moved only";
    const nothingChanged = a.whatChanged === "Nothing";

    // Heuristics (intentionally simple)
    if (thesisBroken) {
      return {
        label: "Exit",
        headline: "If the thesis is broken, stop negotiating with yourself.",
        bullets: [
          "You don’t need a perfect exit. You need consistency.",
          "Write the new thesis. If you can’t, you’re holding hope.",
          "Re-enter later if the facts change.",
        ],
      };
    }

    if ((highStress && notOkZero) || (highStress && lowConviction)) {
      return {
        label: "Trim",
        headline: "Your position is too big for your nervous system.",
        bullets: [
          "Stress is data. If you can’t hold it, you’re overexposed.",
          "Trim until you can think clearly again.",
          "Keep a small runner only if the thesis still stands.",
        ],
      };
    }

    if (priceOnly && a.timeHorizon !== "Days") {
      return {
        label: "Reassess",
        headline: "You’re reacting to candles, not information.",
        bullets: [
          "If nothing fundamental changed, don’t turn this into a new trade.",
          "Re-read why you bought. If it still holds, chill.",
          "If you can’t explain the thesis, reduce and reset.",
        ],
      };
    }

    if (nothingChanged && a.convictionNow >= 4 && a.timeHorizon !== "Days") {
      return {
        label: "Hold",
        headline: "Nothing changed and conviction is high. Don’t sabotage it.",
        bullets: [
          "Most losses come from bad behaviour, not bad picks.",
          "Set a simple invalidation rule and stop staring at it.",
          "If you need action: plan partial take-profits, not panic sells.",
        ],
      };
    }

    // Default
    return {
      label: "Reassess",
      headline: "You’re not stuck. You’re missing a rule.",
      bullets: [
        "Define: what would make you sell (invalidation).",
        "If you can’t define it, reduce risk until you can.",
        "Then stop asking the market to make decisions for you.",
      ],
    };
  }, [a]);

  // Analytics (only fires if PostHog key is set)
  useEffect(() => {
    if (!submitted) return;
    posthog?.capture("result_viewed", {
      label: result.label,
      horizon: a.timeHorizon,
      changed: a.whatChanged,
      conviction: a.convictionNow,
      stress: a.stressLevel,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-5 py-10">
        {/* HERO */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Should I sell?</h1>
          <p className="mt-2 text-zinc-300">
            A fast decision check. No predictions. No advice. Just clarity.
          </p>

          {!started && (
            <button
              onClick={() => {
                setStarted(true);
                posthog?.capture("start_clicked");
              }}
              className="mt-5 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-white"
            >
              Start
            </button>
          )}
        </div>

        {/* FORM */}
        {started && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="space-y-4">
              <Field label="Asset">
                <input
                  value={a.asset}
                  onChange={(e) => setA((p) => ({ ...p, asset: e.target.value }))}
                  placeholder="e.g., BTC / SOL / PEPE"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
              </Field>

              <Field label="Why did you buy? (one sentence)">
                <input
                  value={a.whyBought}
                  onChange={(e) => setA((p) => ({ ...p, whyBought: e.target.value }))}
                  placeholder="e.g., ETF inflows + long-term adoption"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
              </Field>

              <Field label="Time horizon">
                <select
                  value={a.timeHorizon}
                  onChange={(e) => setA((p) => ({ ...p, timeHorizon: e.target.value as Answers["timeHorizon"] }))}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                >
                  <option>Days</option>
                  <option>Weeks</option>
                  <option>Months</option>
                  <option>Years</option>
                </select>
              </Field>

              <Field label="What changed since you bought?">
                <select
                  value={a.whatChanged}
                  onChange={(e) => setA((p) => ({ ...p, whatChanged: e.target.value as Answers["whatChanged"] }))}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                >
                  <option>Nothing</option>
                  <option>Price moved only</option>
                  <option>New info (good)</option>
                  <option>New info (bad)</option>
                  <option>Thesis broken</option>
                </select>
              </Field>

              <Field label="Conviction right now (1–5)">
                <Range value={a.convictionNow} onChange={(v) => setA((p) => ({ ...p, convictionNow: v }))} />
              </Field>

              <Field label="Stress level (1–5)">
                <Range value={a.stressLevel} onChange={(v) => setA((p) => ({ ...p, stressLevel: v }))} />
              </Field>

              <Field label="If this goes to zero, are you genuinely OK?">
                <select
                  value={a.ifZeroOk}
                  onChange={(e) => setA((p) => ({ ...p, ifZeroOk: e.target.value as Answers["ifZeroOk"] }))}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                >
                  <option>Yes</option>
                  <option>No</option>
                  <option>Not sure</option>
                </select>
              </Field>

              <div className="pt-2 flex gap-3">
                <button
                  disabled={!canSubmit}
                  onClick={() => {
                    setSubmitted(true);
                    posthog?.capture("submit_clicked", {
                      horizon: a.timeHorizon,
                      changed: a.whatChanged,
                      conviction: a.convictionNow,
                      stress: a.stressLevel,
                      ifZeroOk: a.ifZeroOk,
                    });
                  }}
                  className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Give me the call
                </button>

                {submitted && (
                  <button
                    onClick={() => setSubmitted(false)}
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm hover:bg-zinc-800"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RESULT */}
        {submitted && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-medium">Call: {result.label}</h3>
                <p className="mt-1 text-zinc-300">{result.headline}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                Conviction: <span className="text-zinc-100">{a.convictionNow}/5</span>
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              {result.bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-zinc-500">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-500">
              Not financial advice. This is a decision framework.
            </div>
          </div>
        )}

        <div className="mt-8 text-xs text-zinc-500">
          built by dpex666 — ship fast, stay sane
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs text-zinc-500">{label}</div>
      {children}
    </div>
  );
}

function Range({ value, onChange }: { value: 1 | 2 | 3 | 4 | 5; onChange: (v: 1 | 2 | 3 | 4 | 5) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
        className="w-full"
      />
      <div className="w-10 text-right text-sm text-zinc-200">{value}</div>
    </div>
  );
}
