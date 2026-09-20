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

import { ArrowRight, Check, CheckCircle, Clock, Lightning, LockSimple } from "@phosphor-icons/react";
import {
  fmtUSD, pace, phasePct, phaseTitle, UNLOCK_AT, type Phase, type PhaseStatus,
} from "../../lib/mock/campaigns";
import {
  campaignLabel, openPhase, useAccount, useActiveCampaign, useAds, useCampaignPhases, useCampaigns,
  useLivePhase, useReadyPhase, type Campaign,
} from "../../lib/store";
import { useGo } from "../../lib/surface";
import { Surface } from "./kit";
import { RevenueRuler } from "../Ruler";

/* ------------------------------------------------------------------ */
/* Ladder arithmetic                                                   */
/* ------------------------------------------------------------------ */

const isFunded = (p: Phase) => p.status === "live" || p.status === "ended";
const sumBy = (rows: Phase[], pick: (p: Phase) => number) => rows.reduce((n, p) => n + pick(p), 0);


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
        <h3 className="text-title font-semibold text-ink">The phases of {label}</h3>
        <p className="mt-1 text-meta text-ink-faint">
          Every phase this campaign has run or has queued, in order. One runs at a time
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

export function HomeView() {
  const go = useGo();
  const account = useAccount();
  const campaigns = useCampaigns();
  const campaign = useActiveCampaign();
  const phases = useCampaignPhases();
  const live = useLivePhase();
  const ready = useReadyPhase();

  const label = campaign ? campaignLabel(campaign) : "No campaign yet";

  /* Home is the ACCOUNT's page, so these total every ladder in it. The
     sections below are the active campaign's and say so. */
  const allPhases = campaigns.flatMap((c: Campaign) => c.phases);
  const funded = allPhases.filter(isFunded);
  const revenue = sumBy(funded, (p) => p.rev);
  const spend = sumBy(funded, (p) => p.budget);
  const livePct = live ? phasePct(live) : null;


  const open = (id: string) => {
    /* Opening a rung moves the drill AND the surface: `openPhase` sets
       which phase is open, and the phase lives in the Campaign view. */
    openPhase(id);
    go("campaign");
  };

  /* Two, under the staircase, not four above it.

     "Current phase" is the band at the top of the page now, said in
     the brand's own money rather than as a percentage. "Sales per $1
     spent" was the figure the invented category average existed to
     judge, and with the benchmark gone it is a ratio with nothing to
     be measured against; the staircase says the same thing per rung,
     against the guarantee, which is the only comparison HeyMoon has
     standing to make. "Committed spend" is renamed: it sums live and
     ended phases, which is money already paid, while the old label
     claimed a forward obligation the brand has not taken on. */
  const stats: { label: string; value: string; sub: string }[] = [
    {
      label: "Sales to date", value: fmtUSD(revenue),
      sub: `Every funded phase, across ${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`,
    },
    {
      label: "Paid so far", value: fmtUSD(spend),
      sub: `Across ${funded.length} funded phase${funded.length === 1 ? "" : "s"}`,
    },
  ];


  return (
    <div className="space-y-6">

      {/* THE GUARANTEE BAND.

          HeyMoon sells exactly one thing, a sales figure it will pay
          the difference on, and that figure was nowhere on this page as
          the thing the page is about. So every card had quietly
          nominated itself, and the loudest were the invented ones.

          What stood here: a greeting at 24px, a date, a live pill, a
          date filter that windowed nothing, and four tiles. The
          greeting is one line now, the filter is gone, and the tiles
          that survived are below the staircase where they belong. This
          band is the whole subject of the dashboard, said once, in the
          brand's own numbers, at the top. */}
      <p className="text-body text-ink-faint">
        {account ? `Welcome back, ${account.firstName}` : "Welcome back"}
      </p>

      {live && live.revTarget !== null ? (
        <section className="rounded-card bg-brand p-6 sm:p-7">
          {/* Both ranks, in order. A campaign holds phases, and this
              line is the only place on the page where the one you are
              looking at is named inside the one it belongs to. */}
          <p className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-white/70">
            {label} · {phaseTitle(live.phaseNo)} · {live.guaranteedRoas}x guaranteed
          </p>
          <p className="num mt-2.5 text-[clamp(30px,4vw,38px)] font-semibold leading-none tracking-[-0.03em] text-white">
            {fmtUSD(live.rev)}
          </p>
          <p className="mt-2.5 max-w-[60ch] text-body leading-5 text-white/75">
            of the {fmtUSD(live.revTarget)} HeyMoon guaranteed on this phase. If it closes short, HeyMoon pays you
            the difference.
          </p>
          {/* The ruler the product already owns, rather than a fifth
              hand-rolled bar. It carries the 80% notch, which is the
              whole mechanic and was drawn as a purple hairline on a
              purple fill, which is to say not drawn at all. */}
          <RevenueRuler
            pct={livePct ?? 0}
            className="mt-6"
            trackClass="bg-white/20"
            srLabel={`${phaseTitle(live.phaseNo)} sales against its guarantee.`}
          />
        </section>
      ) : (
        <section className="rounded-card border border-hairline bg-white p-6 shadow-card">
          <p className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-ink-faint">
            {label} · no phase running
          </p>
          <p className="mt-2 max-w-[60ch] text-body leading-5 text-ink-soft">
            {ready
              ? `${phaseTitle(ready.phaseNo)} is unlocked and waiting on you. Nothing moves until you start it.`
              : "Start a phase and the number HeyMoon guarantees on it stands here."}
          </p>
        </section>
      )}

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
      </div>

      {/* The ladder itself — the active campaign's, in phase order */}
      <PhaseLadder phases={phases} label={label} onOpen={open} />

      {/* The two totals that survived, under the thing they total. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.map((st) => (
          <Surface key={st.label} className="p-5">
            <p className="text-body font-medium text-ink-soft">{st.label}</p>
            <p className="num mt-2 text-figure font-semibold leading-none tracking-tight text-ink">{st.value}</p>
            <p className="mt-2 text-meta text-ink-faint">{st.sub}</p>
          </Surface>
        ))}
      </div>

      {/* Three things stood here and all three were invented.

          A twelve-month series hard-coded in its own file, labelled
          with the brand's own name, whose September read $18,500
          against a headline of $17,800 two hundred pixels above it,
          and whose October, November and December carried sales for
          months that have not happened yet. Beside it "How you
          compare", judging the brand against 4.1x, 84% and $3,200
          "category averages" that were three constants in an array and
          a peer cohort HeyMoon does not have. Above them, an average
          of a $1,000 warm-up and a $3,000 scale phase, which is a mean
          of two numbers chosen to be unlike each other.

          Nothing replaces them, because nothing was under them. The
          only comparison HeyMoon has standing to make is the brand
          against its own guarantee, and the band at the top of this
          page and the staircase below it are both that comparison. */}
    </div>
  );
}
