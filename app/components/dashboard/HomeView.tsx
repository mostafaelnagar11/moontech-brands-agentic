"use client";

/* The dashboard home — the current app's `/dashboard` main column,
 * rebuilt on this project's store.
 *
 * Two things changed in the port, and only two.
 *
 * THE TOP OF THE PAGE IS THE ACCOUNT'S, NOT ONE CAMPAIGN'S. The current
 * app has one brand and one ladder, so its five tiles total that ladder
 * and say so. Here a brand can build several campaigns, and the home of
 * a workspace that holds three of them cannot quietly report one. So
 * the tiles, the ladder averages and the benchmark rows all sum every
 * funded phase of every campaign, and each sub-line says which set it
 * counted. The sections under them — the phase running now, the ladder
 * table — stay scoped to the ACTIVE campaign, because a phase belongs
 * to one campaign and "the phase running now" across three of them is
 * not a thing you can put in one card.
 *
 * EVERY FIGURE IS DERIVED. The current app stores `revLabel`, `roas`
 * and a written-out `threshold` string on each phase; this project
 * stores the inputs and nothing else. So revenue is formatted through
 * `fmtUSD`, the multiple is `rev ÷ budget`, the percentage is
 * `phasePct`, and the unlock line is read off `pace()` rather than
 * typed into a fixture. The one exception is the twelve-month chart,
 * which is fixture data and says so in its own file.
 *
 * FUNDED means paid for — live or ended. A ready phase is unlocked but
 * not bought and a locked one cannot be bought at all, so neither has a
 * dollar committed or a dollar earned, and neither belongs in a total.
 */

import { useState } from "react";
import { ArrowRight, Check, CheckCircle, Clock, Lightning, LockSimple } from "@phosphor-icons/react";
import {
  fmtUSD, pace, phasePct, phaseTitle, UNLOCK_AT, type Phase, type PhaseStatus,
} from "../../lib/mock/campaigns";
import {
  campaignLabel, openPhase, useAccount, useActiveCampaign, useAds, useCampaignPhases, useCampaigns,
  useLivePhase, useReadyPhase, type Campaign,
} from "../../lib/store";
import { useGo } from "../../lib/surface";
import { RevenueOverTime } from "./RevenueOverTime";
import { Surface } from "./kit";

/* ------------------------------------------------------------------ */
/* Ladder arithmetic                                                   */
/* ------------------------------------------------------------------ */

const isFunded = (p: Phase) => p.status === "live" || p.status === "ended";
const sumBy = (rows: Phase[], pick: (p: Phase) => number) => rows.reduce((n, p) => n + pick(p), 0);

/* A phase is measurable only once it has a target. Funding sets the
   target and resets the percentage to 0, so "funded" and "has a number
   worth judging" are close but not identical — guard for it. */
const metered = (rows: Phase[]) => rows.filter((p) => phasePct(p) !== null);

/** This phase's multiple: what it earned against what it cost. Per
    phase, never run-cumulative, and never shown for a rung nobody has
    paid for — a $0 ÷ $6,000 reads like a failure rather than a blank. */
const roasOf = (p: Phase) => (p.budget ? `${(p.rev / p.budget).toFixed(1)}x` : "—");

/** How a phase's window reads. A phase with no start has not been
    funded, so it has no window to state — what it says instead depends
    on whether it is payable. */
const phaseWindow = (p: Phase) => {
  if (!p.start) return p.status === "ready" ? "Starts when funded" : "Not scheduled";
  return p.end ? `${p.start} to ${p.end}` : `Started ${p.start}`;
};

const UNLOCK_PCT = Math.round(UNLOCK_AT * 100);

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/*                                                                     */
/* Every status needs its OWN branch. A fall-through here once labelled */
/* a locked phase — queued, never run — "Completed", which is the most  */
/* misleading word available for it.                                   */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: PhaseStatus }) {
  if (status === "live") return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-brand/20 bg-brand/[0.07] px-2.5 py-1 text-[11px] font-semibold text-brand">
      <span aria-hidden className="h-1.5 w-1.5 animate-live rounded-pill bg-brand" />
      Live
    </span>
  );
  if (status === "ready") return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-danger/25 bg-danger/[0.07] px-2.5 py-1 text-[11px] font-semibold text-danger">
      <Clock size={11} weight="fill" aria-hidden />
      Ready to fund
    </span>
  );
  if (status === "locked") return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-hairline bg-wash px-2.5 py-1 text-[11px] font-semibold text-ink-faint">
      <LockSimple size={11} weight="fill" aria-hidden />
      Queued
    </span>
  );
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-neutral-200 bg-wash px-2.5 py-1 text-[11px] font-semibold text-ink-faint">
      <Check size={11} weight="bold" aria-hidden />
      Completed
    </span>
  );
}

/** The one control that repeats: open a rung. */
function ViewButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-body font-medium text-ink-faint transition-colors hover:bg-brand/[0.06] hover:text-brand"
    >
      View <ArrowRight size={12} weight="bold" aria-hidden className="rtl:rotate-180" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* The current phase                                                   */
/*                                                                     */
/* Singular on purpose. A campaign runs one phase at a time, so this is */
/* one card, never a grid of concurrent programmes.                    */
/* ------------------------------------------------------------------ */

function CurrentPhaseCard({ phase, phases, onOpen }: { phase: Phase; phases: Phase[]; onOpen: () => void }) {
  /* A phase funded a moment ago has a target but nothing measured yet,
     so the meter only draws once there is a percentage to draw. */
  const pct = phasePct(phase);
  const target = phase.revTarget;
  const p = pace(phase);

  /* Ads carry the phase id as their campaign id, so this is the
     creative on THIS rung and nothing else. */
  const ads = useAds().filter((a) => a.campaignId === phase.id);
  const adsLive = ads.filter((a) => a.state === "live").length;

  /* The current app stores this sentence on the phase. Here it is read
     off the pace forecast, so the words and the meter can never
     disagree about the same phase. */
  const next = phases.find((x) => x.phaseNo === phase.phaseNo + 1);
  const crossed = pct !== null && pct >= UNLOCK_PCT;
  const threshold = crossed
    ? {
        green: true,
        text: next
          ? next.status === "ready"
            ? `${UNLOCK_PCT}% unlock line crossed. ${phaseTitle(next.phaseNo)} is ready to fund`
            : `${UNLOCK_PCT}% unlock line crossed. ${phaseTitle(next.phaseNo)} is offered next`
          : `${UNLOCK_PCT}% unlock line crossed`,
      }
    : p
      ? {
          green: false,
          text: `${p.onPace ? "On pace" : "Behind pace"}. The ${UNLOCK_PCT}% unlock line is about ${p.daysToUnlock} days away`,
        }
      : { green: false, text: "Deploying to matched creators. First results in a few days" };

  const metrics = [
    {
      label: "Ads live",
      value: String(adsLive),
      suffix: ads.length ? `/${ads.length}` : "",
      note: ads.length ? `${Math.round((adsLive / ads.length) * 100)}% of drafts in` : "deploying",
    },
    { label: "Creators", value: String(phase.creators ?? 0), suffix: "", note: "on this phase" },
    { label: "Multiple", value: roasOf(phase), suffix: "", note: `${phase.guaranteedRoas}x guaranteed` },
  ];

  return (
    <Surface className="flex flex-col p-5 transition-colors hover:border-black/[0.12]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-ink">{phaseTitle(phase.phaseNo)}</h3>
            <StatusBadge status={phase.status} />
          </div>
          <p className="mt-1 text-meta text-ink-faint">{phaseWindow(phase)}</p>
        </div>
        <ViewButton onClick={onOpen} label={`Open ${phaseTitle(phase.phaseNo)}`} />
      </div>

      {/* Revenue against THIS phase's own target — budget × the multiple
          guaranteed on this phase, never a portfolio figure. */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[26px] font-semibold leading-none tracking-tight tabular-nums text-ink">
            {fmtUSD(phase.rev)}{" "}
            <span className="text-sm font-normal tracking-normal text-ink-faint">
              {target !== null ? `of ${fmtUSD(target)} target` : "banked so far"}
            </span>
          </p>
          {pct !== null && <p className="text-sm font-semibold tabular-nums text-brand">{pct}%</p>}
        </div>

        {pct !== null && (
          <>
            <div className="relative mt-3.5 h-2 w-full rounded-pill bg-track">
              <div className="h-full rounded-pill bg-brand transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
              {/* The 80% line is the whole mechanic: cross it and the next
                  rung becomes fundable. Mark it rather than imply it.
                  `start-[80%]` rather than `left-`: in Arabic the meter
                  fills from the right and the tick has to follow it. */}
              <span aria-hidden className="absolute -inset-y-1 start-[80%] w-px bg-brand/40" />
            </div>
            <span className="sr-only">
              {pct >= UNLOCK_PCT
                ? `Past the ${UNLOCK_PCT}% unlock line.`
                : `${UNLOCK_PCT - pct} percentage points below the ${UNLOCK_PCT}% unlock line.`}
            </span>
          </>
        )}

        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <p className={`flex items-start gap-1.5 text-meta font-medium ${threshold.green ? "text-good" : "text-danger"}`}>
            {threshold.green
              ? <CheckCircle size={13} weight="fill" aria-hidden className="mt-px shrink-0" />
              : <Clock size={13} weight="fill" aria-hidden className="mt-px shrink-0" />}
            {threshold.text}
          </p>
          {target !== null && (
            <p className="shrink-0 text-meta text-ink-faint">
              {fmtUSD(Math.max(target - phase.rev, 0))} to target
            </p>
          )}
        </div>
      </div>

      {/* Metric row — all three belong to this phase alone. */}
      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-hairline pt-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="text-[11px] font-medium text-ink-faint">{m.label}</p>
            <p className="mt-1 text-[17px] font-semibold tracking-tight tabular-nums text-ink">
              {m.value}<span className="text-body font-normal text-ink-faint">{m.suffix}</span>
            </p>
            <p className="mt-0.5 truncate text-[11px] text-ink-faint">{m.note}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}

/* Nothing running. Either the next rung is bought and this is a blink
   between phases, or the campaign is waiting on a payment. */
function NoPhaseRunningCard({ ready, onFund }: { ready: Phase | null; onFund: () => void }) {
  return (
    <Surface className="flex flex-col justify-center p-5">
      <h3 className="text-[15px] font-semibold text-ink">No phase running</h3>
      <p className="mt-1.5 max-w-sm text-meta leading-relaxed text-ink-faint">
        {ready
          ? `${phaseTitle(ready.phaseNo)} is unlocked and waiting on payment. Fund it and it is live within the hour.`
          : `Nothing is live and nothing is waiting on you. Your next phase unlocks when the current one crosses its ${UNLOCK_PCT}% line.`}
      </p>
      {ready && (
        <button
          onClick={onFund}
          aria-label={`Fund Phase ${ready.phaseNo}, ${fmtUSD(ready.budget)} plus VAT`}
          className="mt-5 inline-flex w-fit items-center gap-2 rounded-pill bg-brand/[0.08] px-4 py-2 text-meta font-semibold text-brand transition-colors hover:bg-brand/[0.14]"
        >
          <Lightning size={13} weight="fill" aria-hidden />
          Fund Phase {ready.phaseNo}, {fmtUSD(ready.budget)}
        </button>
      )}
    </Surface>
  );
}

/* ------------------------------------------------------------------ */
/* Ladder averages                                                     */
/* ------------------------------------------------------------------ */

function LadderAverages({ funded }: { funded: Phase[] }) {
  const rows = metered(funded);
  const crossed = rows.filter((p) => (phasePct(p) ?? 0) >= UNLOCK_PCT);
  const revPer = funded.length ? Math.round(sumBy(funded, (p) => p.rev) / funded.length) : 0;
  /* `creators` is null until a phase is funded, and every row here is
     funded, so the ?? 0 is a type guard rather than a real case. */
  const crewPer = funded.length ? Math.round(sumBy(funded, (p) => p.creators ?? 0) / funded.length) : 0;

  const items = [
    {
      label: "Sales per funded phase",
      value: funded.length ? fmtUSD(revPer) : "—",
      brand: true,
      desc: "What one rung has brought back, on average.",
    },
    {
      label: `Past the ${UNLOCK_PCT}% line`,
      value: rows.length ? `${crossed.length} of ${rows.length}` : "—",
      brand: false,
      desc: `Reaching ${UNLOCK_PCT}% of its own target is what unlocks the next phase.`,
    },
    {
      label: "Creators per funded phase",
      value: funded.length ? String(crewPer) : "—",
      brand: false,
      desc: "Matched creators working a single phase, on average.",
    },
  ];

  return (
    <div className="flex flex-1 flex-col divide-y divide-hairline">
      {items.map((item) => (
        <div key={item.label} className="flex flex-1 items-center justify-between gap-4 py-4 first:pt-1 last:pb-1">
          <div className="min-w-0">
            <p className="text-body font-medium text-ink-soft">{item.label}</p>
            <p className="mt-0.5 text-meta leading-relaxed text-ink-faint">{item.desc}</p>
          </div>
          <div className="shrink-0 text-end">
            <p className={`text-xl font-semibold tracking-tight tabular-nums ${item.brand ? "text-brand" : "text-ink"}`}>
              {item.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* How you compare                                                     */
/*                                                                     */
/* Our side of every row is computed from the funded phases; only the   */
/* category figure is a benchmark constant, and the verdict line is     */
/* derived from the comparison so the two can never disagree.           */
/* ------------------------------------------------------------------ */

function HowYouCompare({ funded }: { funded: Phase[] }) {
  const spend = sumBy(funded, (p) => p.budget);
  const revenue = sumBy(funded, (p) => p.rev);
  const rows = metered(funded);
  const crossed = rows.filter((p) => (phasePct(p) ?? 0) >= UNLOCK_PCT).length;

  const comparisons = [
    {
      label: "Sales per $1 spent",
      value: spend ? `${(revenue / spend).toFixed(1)}x` : "—",
      ours: spend ? revenue / spend : null, cat: 4.1, catLabel: "vs 4.1x category avg",
      good: "Ahead of comparable brands", bad: "Behind comparable brands",
    },
    {
      label: `Phases past the ${UNLOCK_PCT}% line`,
      value: rows.length ? `${Math.round((crossed / rows.length) * 100)}%` : "—",
      ours: rows.length ? (crossed / rows.length) * 100 : null, cat: 84, catLabel: "vs 84% category avg",
      good: "Unlocking the next rung reliably", bad: "Unlock pace is behind",
    },
    {
      label: "Sales per funded phase",
      value: funded.length ? fmtUSD(Math.round(revenue / funded.length)) : "—",
      ours: funded.length ? revenue / funded.length : null, cat: 3200, catLabel: "vs $3,200 category avg",
      good: "More sales per rung", bad: "Sales per rung is behind",
    },
  ];

  return (
    <Surface className="flex h-full flex-col p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="text-[15px] font-semibold text-ink">How you compare</h3>
        <span className="rounded-pill bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-ink-faint">
          GCC · comparable ladder stage
        </span>
      </div>
      <p className="mt-1 text-meta text-ink-faint">
        Benchmarked against anonymised HeyMoon brands at a similar point on their own ladder
      </p>
      {/* One per row. In half a row three columns squeezed a 26px figure
          and its caption into ~200px; stacked, each comparison gets its
          own line and the numbers stay scannable. */}
      <div className="mt-4 flex flex-1 flex-col divide-y divide-hairline">
        {comparisons.map((r) => {
          const up = r.ours !== null && r.ours >= r.cat;
          return (
            <div key={r.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-body font-medium text-ink-soft">{r.label}</p>
                <p className={`mt-0.5 text-meta font-medium ${up ? "text-good" : "text-danger"}`}>
                  {up ? "↑" : "↓"} {up ? r.good : r.bad}
                </p>
              </div>
              <div className="shrink-0 text-end">
                <p className={`text-[24px] font-semibold tracking-tight tabular-nums ${up ? "text-brand" : "text-danger"}`}>
                  {r.value}
                </p>
                <p className="text-meta text-ink-faint">{r.catLabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

/* ------------------------------------------------------------------ */
/* Phase ladder                                                        */
/*                                                                     */
/* One row per rung, in the order the campaign works through them.     */
/*                                                                     */
/* A rung that has not been paid for has no numbers of its own: ready  */
/* and locked print an em dash rather than a $0 that reads like a      */
/* failure. Locked is not even openable — it has no creators, no ads   */
/* and nothing to look at — so it gets no link and, above all, no fund */
/* button: its predecessor has not crossed the 80% line.               */
/* ------------------------------------------------------------------ */

function PhaseLadder({ phases, label, onOpen }: { phases: Phase[]; label: string; onOpen: (id: string) => void }) {
  return (
    <Surface>
      <div className="p-6 pb-0">
        <h3 className="text-[15px] font-semibold text-ink">Phase ladder</h3>
        <p className="mt-1 text-meta text-ink-faint">
          Every phase {label} has run or has queued, in order. One runs at a time
        </p>
      </div>

      {phases.length === 0 ? (
        <p className="px-6 py-6 text-body text-ink-faint">
          This campaign has no phases yet. HeyMoon builds the ladder, so the first rung appears here once it is matched.
        </p>
      ) : (
        /* The scroll lives inside the card rather than on it, so the
           rounded corners still clip the table on a narrow screen. */
        <div className="overflow-x-auto px-6 pb-6 pt-4">
          <table className="w-full min-w-[640px] text-body">
            <thead>
              <tr className="border-b border-hairline">
                {["Phase", "Status", "Budget", "Sales", "Multiple", ""].map((h, i) => (
                  <th key={h || i} className="pb-3 text-start text-meta font-medium text-ink-faint">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {phases.map((p) => {
                const funded = isFunded(p);
                const target = p.revTarget ?? p.budget * p.guaranteedRoas;
                const pct = phasePct(p);
                return (
                  <tr key={p.id} className="transition-colors hover:bg-rail">
                    <td className="py-4 pe-4">
                      <p className="font-medium text-ink">{phaseTitle(p.phaseNo)}</p>
                      <p className="mt-0.5 text-[11px] text-ink-faint">{phaseWindow(p)}</p>
                    </td>
                    <td className="py-4 pe-3"><StatusBadge status={p.status} /></td>
                    <td className="py-4 pe-3">
                      <p className={`font-medium tabular-nums ${funded ? "text-ink-soft" : "text-ink-faint"}`}>
                        {fmtUSD(p.budget)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        {funded
                          ? `${fmtUSD(target)} target`
                          : p.status === "ready" ? "due now" : "not payable yet"}
                      </p>
                    </td>
                    <td className="py-4 pe-3">
                      {funded ? (
                        <>
                          <p className="font-medium tabular-nums text-ink-soft">{fmtUSD(p.rev)}</p>
                          {pct !== null && (
                            <div className="relative mt-1.5 h-1 w-24 rounded-pill bg-track">
                              <div className="h-full rounded-pill bg-brand" style={{ width: `${Math.min(pct, 100)}%` }} />
                              <span aria-hidden className="absolute -inset-y-0.5 start-[80%] w-px bg-brand/40" />
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-ink-faint/60">—</span>
                      )}
                    </td>
                    <td className="py-4 pe-3">
                      {funded ? (
                        <>
                          <p className="font-semibold tabular-nums text-brand">{roasOf(p)}</p>
                          <p className="mt-0.5 text-[11px] text-ink-faint">{p.guaranteedRoas}x guaranteed</p>
                        </>
                      ) : (
                        <span className="text-ink-faint/60">—</span>
                      )}
                    </td>
                    <td className="py-4 text-end">
                      {p.status !== "locked" && (
                        <ViewButton onClick={() => onOpen(p.id)} label={`Open ${phaseTitle(p.phaseNo)}`} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Surface>
  );
}

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

const DATE_FILTERS = ["Today", "Yesterday", "This week", "Last week", "Last 30 days", "All time"] as const;
type DateFilter = typeof DATE_FILTERS[number];

export function HomeView() {
  const go = useGo();
  const account = useAccount();
  const campaigns = useCampaigns();
  const campaign = useActiveCampaign();
  const phases = useCampaignPhases();
  const live = useLivePhase();
  const ready = useReadyPhase();

  /* COSMETIC. The current app's date filter changes the label and
     nothing else — no figure on this page is windowed by it — and it is
     carried over unchanged rather than wired to a filter that does not
     exist yet. */
  const [dateFilter, setDateFilter] = useState<DateFilter>("Last 30 days");
  const [filterOpen, setFilterOpen] = useState(false);

  const label = campaign ? campaignLabel(campaign) : "No campaign yet";

  /* Home is the ACCOUNT's page, so these total every ladder in it. The
     sections below are the active campaign's and say so. */
  const allPhases = campaigns.flatMap((c: Campaign) => c.phases);
  const funded = allPhases.filter(isFunded);
  const revenue = sumBy(funded, (p) => p.rev);
  const spend = sumBy(funded, (p) => p.budget);
  const livePct = live ? phasePct(live) : null;

  /* Written out rather than pluralised inline: an account on its first
     rung reads "the one phase", not "the 1 phases". */
  const fundedLabel =
    funded.length === 0 ? "No funded phases yet"
      : funded.length === 1 ? "The one phase you have funded"
        : `Across the ${funded.length} phases you have funded`;

  const open = (id: string) => {
    /* Opening a rung moves the drill AND the surface: `openPhase` sets
       which phase is open, and the phase lives in the Campaign view. */
    openPhase(id);
    go("campaign");
  };

  const stats: { label: string; value: string; sub: string; hero?: boolean }[] = [
    {
      label: "Sales to date", value: fmtUSD(revenue), hero: true,
      sub: `Every funded phase, across ${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`,
    },
    {
      label: "Sales per $1 spent",
      value: spend ? `${(revenue / spend).toFixed(1)}x` : "—",
      sub: spend ? `${fmtUSD(revenue)} back on ${fmtUSD(spend)} funded` : "Nothing funded yet",
    },
    {
      label: "Committed spend", value: fmtUSD(spend),
      sub: `Across ${funded.length} funded phase${funded.length === 1 ? "" : "s"}`,
    },
    {
      label: "Current phase",
      value: live ? (livePct !== null ? `${livePct}%` : "Live") : "—",
      sub: live
        ? live.revTarget !== null
          ? `${phaseTitle(live.phaseNo)} · ${fmtUSD(live.rev)} of ${fmtUSD(live.revTarget)}`
          : `${phaseTitle(live.phaseNo)} · deploying`
        : "Nothing running right now",
    },
  ];

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-ink sm:text-[24px]">
            {account ? `Welcome back, ${account.firstName}` : "Welcome back"}
          </h2>
          <p className="mt-1 text-body text-ink-faint" suppressHydrationWarning>
            {label} ·{" "}
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* One phase runs at a time, so this names it instead of
              counting campaigns that cannot run side by side. */}
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand/[0.07] px-3 py-1.5 text-meta font-medium text-brand">
              <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-pill bg-brand" />
              {phaseTitle(live.phaseNo)} is live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-neutral-100 px-3 py-1.5 text-meta font-medium text-ink-faint">
              <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-neutral-300" />
              Nothing live right now
            </span>
          )}
          {/* Date filter */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              aria-expanded={filterOpen}
              className="flex items-center gap-2 rounded-pill border border-black/[0.08] bg-white px-3.5 py-1.5 text-meta font-medium text-ink-soft transition-colors hover:border-brand/30 hover:text-brand"
            >
              <svg className="h-3.5 w-3.5 shrink-0 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" />
                <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {dateFilter}
              <svg className={`h-3 w-3 text-ink-faint transition-transform ${filterOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {filterOpen && (
              <div className="absolute end-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-control border border-hairline bg-white shadow-float">
                {DATE_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => { setDateFilter(f); setFilterOpen(false); }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-start text-body transition hover:bg-rail ${
                      dateFilter === f ? "font-medium text-brand" : "text-ink-soft"
                    }`}
                  >
                    {f}
                    {dateFilter === f && (
                      <svg className="h-3.5 w-3.5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats. Five tiles, one row from xl up. Below that the hero spans
          two columns and the rest wrap under it; at xl the hero gives up
          its span so all five sit on one line, and the solid purple fill
          carries its emphasis instead of extra width. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-card p-4 transition-colors sm:p-5 ${
              s.hero
                ? "col-span-2 bg-brand xl:col-span-1"
                : "border border-hairline bg-white shadow-card hover:border-black/[0.12]"
            }`}
          >
            <p className={`text-body font-medium ${s.hero ? "text-white/60" : "text-ink-soft"}`}>{s.label}</p>
            <p className={`mt-2 text-[24px] font-semibold leading-none tracking-tight tabular-nums sm:text-[28px] ${
              s.hero ? "text-white" : "text-ink"
            }`}>
              {s.value}
            </p>
            <p className={`mt-2.5 text-meta ${s.hero ? "text-white/50" : "text-ink-faint"}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* The phase running now — singular, because only one can be */}
      <div className="pt-2">
        <h2 className="text-[16px] font-semibold tracking-tight text-ink">Running now</h2>
        <p className="mt-0.5 text-body text-ink-faint">
          {label} runs one phase at a time · updated in real time
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {live
          ? <CurrentPhaseCard phase={live} phases={phases} onOpen={() => open(live.id)} />
          : <NoPhaseRunningCard ready={ready} onFund={() => ready && open(ready.id)} />}
        <Surface className="flex flex-col p-5">
          <h3 className="text-[15px] font-semibold text-ink">Ladder averages</h3>
          <p className="mb-3 mt-1 text-meta text-ink-faint">{fundedLabel}</p>
          <LadderAverages funded={funded} />
        </Surface>
      </div>

      {/* The ladder itself — the active campaign's, in phase order */}
      <PhaseLadder phases={phases} label={label} onOpen={open} />

      {/* Performance overview */}
      <div className="pt-2">
        <h2 className="text-[16px] font-semibold tracking-tight text-ink">Performance overview</h2>
        <p className="mt-0.5 text-body text-ink-faint">Sales over time, and how this ladder compares</p>
      </div>

      {/* Two cards, one row. The chart is viewBox-scaled, so at full
          width it letterboxed inside huge side gaps; half a row is
          closer to its natural aspect and the comparison reads better
          beside it than stacked under it. */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Surface className="flex h-full flex-col p-5">
          <h3 className="text-[15px] font-semibold text-ink">Sales over time</h3>
          <p className="mb-4 mt-1 text-meta text-ink-faint">Monthly sales and orders for {label}</p>
          <div className="flex-1">
            <RevenueOverTime />
          </div>
        </Surface>
        <HowYouCompare funded={funded} />
      </div>

    </div>
  );
}
