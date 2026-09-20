"use client";

/* THE SIGNATURE MARK.

   One component, because in the current app this is drawn three
   different ways — the shared CSS classes on the campaigns list, a flat
   inline reimplementation on the dashboard, and a third instrument on
   the phase page. Same mechanic, three appearances, one product.

   Two modes, both showing the same rule:

     revenue — revenue against this phase's own target, 0–100%. The
               notch sits at 80%, where the next phase unlocks.
     return  — the same thing measured in multiples of budget. The
               unlock line lands at guarantee × 0.8, because 80% of
               (budget × guarantee) is (guarantee × 0.8) × budget. The
               tick marks THE GATE, not the promise.

   The pace forecast is a ghost pin, drawn only when it is ahead of the
   fill — a forecast behind where you already are says nothing. */

import { UNLOCK_AT } from "../lib/mock/campaigns";

export function RevenueRuler({
  pct, forecastPct, delay = 0.25, className = "", trackClass = "bg-track", srLabel,
}: {
  pct: number;
  forecastPct?: number;
  delay?: number;
  className?: string;
  /** The groove the fill runs in. Overridden on a dark surface, where
      the default sits at almost the same lightness as the fill. */
  trackClass?: string;
  srLabel?: string;
}) {
  const crossed = pct >= UNLOCK_AT * 100;
  const showGhost = forecastPct !== undefined && forecastPct > pct + 1;
  return (
    <div className={className}>
      <div className={`relative h-2 rounded-pill ${trackClass}`}>
        <div
          className="bar-fill keyline-grad h-full rounded-pill"
          style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, ["--bd" as string]: `${delay}s` }}
        />
        {showGhost && (
          <span
            aria-hidden
            title="Where this phase lands at the current rate"
            className="absolute top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-pill bg-ink/25"
            style={{ insetInlineStart: `${Math.min(forecastPct, 100)}%` }}
          />
        )}
        <span aria-hidden className={`unlock-notch ${crossed ? "unlock-notch--crossed" : ""}`} />
      </div>
      <span className="sr-only">
        {srLabel ? srLabel + " " : ""}
        {crossed
          ? "Past the 80% unlock line."
          : `${Math.max(0, Math.round(UNLOCK_AT * 100 - pct))} percentage points below the 80% unlock line.`}
        {showGhost ? ` Forecast ${Math.round(forecastPct!)} percent.` : ""}
      </span>
    </div>
  );
}

export function ReturnRuler({
  achieved, guarantee, className = "", label,
}: {
  /** Revenue ÷ budget, as a multiple. */
  achieved: number;
  guarantee: number;
  className?: string;
  label?: string;
}) {
  const max = Math.max(guarantee, achieved) * 1.12;
  const unlock = guarantee * UNLOCK_AT;
  const met = achieved >= guarantee;
  const ticks = Array.from({ length: Math.max(Math.floor(max), 1) }, (_, i) => i + 1).filter((m) => m / max < 0.99);
  const fmt = (n: number) => Number(n.toFixed(1)).toString();

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`${fmt(achieved)} times the budget in sales so far, against a guaranteed ${guarantee} times. The next phase unlocks at ${fmt(unlock)} times.`}
        className="relative h-2.5 rounded-pill bg-[#F1EFF7]"
      >
        {ticks.map((m) => (
          <span key={m} aria-hidden className="absolute top-0 h-full w-px bg-white/70" style={{ insetInlineStart: `${(m / max) * 100}%` }} />
        ))}
        <div
          className={`h-full rounded-pill ${met ? "bg-good" : "keyline-grad"}`}
          style={{ width: `${Math.min((achieved / max) * 100, 100)}%` }}
        />
        <span
          aria-hidden
          className="absolute -top-1 h-[18px] w-[2px] rounded-pill bg-ink/45"
          style={{ insetInlineStart: `${(unlock / max) * 100}%` }}
        />
      </div>
      <div className="relative mt-1 h-4">
        <span
          className="absolute whitespace-nowrap text-micro font-semibold text-ink-faint"
          style={{ insetInlineStart: `${(unlock / max) * 100}%`, transform: "translateX(-50%)" }}
        >
          {fmt(unlock)}x {label ?? "unlock line"}
        </span>
      </div>
    </div>
  );
}

/** The ladder as tiles: the rung you are on, the one that unlocks next,
    and the ones described but not sold. */
export function PhaseTiles({
  rungs, className = "",
}: {
  rungs: { phaseNo: number; label: string; sub: string; state: "ended" | "live" | "ready" | "locked" | "proposed"; pct?: number }[];
  className?: string;
}) {
  return (
    <ol className={`flex gap-2 overflow-x-auto no-bar ${className}`}>
      {rungs.map((r) => {
        const tone =
          r.state === "live" ? "border-brand/30 bg-brand/[0.05]"
          : r.state === "ready" ? "border-danger/25 bg-danger/[0.05]"
          : r.state === "ended" ? "border-hairline bg-wash"
          : "border-hairline bg-white";
        return (
          <li key={r.phaseNo} className={`min-w-[148px] flex-1 rounded-control border p-3 ${tone}`}>
            <p className="text-meta font-semibold text-ink">{r.label}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-ink-faint">{r.sub}</p>
            {r.pct !== undefined && (
              <div className="relative mt-2 h-1.5 rounded-pill bg-track">
                <div className="keyline-grad h-full rounded-pill" style={{ width: `${Math.min(r.pct, 100)}%` }} />
                <span aria-hidden className={`unlock-notch ${r.pct >= 80 ? "unlock-notch--crossed" : ""}`} style={{ height: 8 }} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
