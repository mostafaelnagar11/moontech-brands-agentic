"use client";

/* The campaign, once a phase is running.

   Two screens fold into this one column. The dashboard opened with the
   Agent Monitor, because the product's claim is that something works on
   your behalf and the first thing you should see is what it did. The
   phase screen held the return ruler and the case for the phase that
   has unlocked next. Neither is a route any more, so both live here.

   The panel is a 440px column rather than an 1100px page, so what used
   to sit four across is stacked and the ad grid is two wide. Every
   figure keeps the `sourced` wrapper it was ported with, which is why
   the calls below are long: a number here can still say where it came
   from.

   Starting a phase is the one thing this view deliberately does not
   finish. Pressing Start puts the payment block in the conversation and
   closes the panel, because a decision about money belongs in the
   thread where it can be read back afterwards, not in a drawer that
   disappears. */

import type { ReactNode } from "react";
import { Btn, Card, Eyebrow, Pill } from "../ui";
import { AgentMonitor, PaceForecast } from "../Monitor";
import { Figure } from "../Evidence";
import { PhaseTiles, ReturnRuler } from "../Ruler";
import { LiveAdGrid } from "../AdCards";
import {
  closePanel, push, putFunding, setPanelView, useActivePlan, useAds, useStore,
} from "../../lib/store";
import {
  PHASES, fmtUSD, livePhase, phasePct, phaseTitle, readyPhase, vatOn, withVat,
} from "../../lib/mock/campaigns";
import { PHASE1_BUDGET, phasesFor } from "../../lib/agent/tools";
import { sourced, type FundingRequest } from "../../lib/agent/types";

/** A figure as a row rather than as a tile. Four stat tiles across is a
    page pattern; in a column the label reads on the left, the number on
    the right, and "why this number" opens underneath with room to
    explain itself. */
function StatRow({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-hairline py-3 last:border-0 last:pb-0">
      <span className="text-meta text-ink-faint">{label}</span>
      <span className="flex-1 text-end">{children}</span>
      {note && <span className="w-full pt-1 text-end text-[11px] text-ink-faint">{note}</span>}
    </div>
  );
}

export function CampaignPanel() {
  const ads = useAds();
  const plan = useActivePlan();
  /* The phases a brand was sold, derived from the plan they chose.
     Falls back to the standard $10,000 shape when there is no plan. */
  const [, phase2, phase3] = phasesFor(plan?.planBudget?.value ?? 10_000);
  const live = livePhase();
  const ready = readyPhase();
  /* Read live so a second press cannot open a second payment block: the
     request id is derived from the phase, and the store refuses to
     overwrite one that is already confirmed. A cancelled one is not in
     the way of anything, so it does not count as open. */
  const request = useStore((s) => (ready ? s.funding[`fund-phase-${ready.id}`] : undefined));
  const openRequest = request?.state === "cancelled" ? undefined : request;
  /* The phase after the one that has unlocked, if there is one. There
     are three, so the last of them unlocks nothing and must not be sold
     on a Phase 4 that does not exist. */
  const afterReady = ready ? PHASES.find((x) => x.phaseNo === ready.phaseNo + 1) : undefined;

  if (!live) {
    return (
      <p className="text-body leading-6 text-ink-soft">
        No phase is running yet. Once you start Phase 1, this is where you watch it: what happened, what
        it means, and what I need from you.
      </p>
    );
  }

  const liveAds = ads.filter((a) => a.state === "live" && a.campaignId === live.id);
  const adRevenue = liveAds.reduce((n, a) => n + (a.performance?.revenue.value ?? 0), 0);
  const funded = PHASES.filter((x) => x.status === "live" || x.status === "ended");
  const totalRev = funded.reduce((n, x) => n + x.rev, 0);
  const totalSpend = funded.reduce((n, x) => n + x.budget, 0);
  const roas = live.budget > 0 ? live.rev / live.budget : 0;

  /* The whole of the money path: build the request, put it in the
     store, and hand it to the conversation. Nothing is charged here —
     the brand confirms it on the block in the thread. */
  const start = () => {
    if (!ready) return;
    const req: FundingRequest = {
      id: `fund-phase-${ready.id}`,
      planId: plan?.id ?? "ladder",
      phaseNo: ready.phaseNo,
      amount: sourced(ready.budget, `The budget for ${phaseTitle(ready.phaseNo)}, confirmed when Phase ${ready.phaseNo - 1} crossed its 80% line.`, [
        { id: "f1", kind: "policy", label: "how the phases are priced", detail: `${fmtUSD(PHASE1_BUDGET)} for the warm-up, the same for every brand. ${fmtUSD(phase2)} for Phase 2 and ${fmtUSD(phase3)} for Phase 3, each confirmed only when it unlocks.` },
      ]),
      vat: sourced(vatOn(ready.budget), "VAT at 5%, on the budget only.", [{ id: "f2", kind: "policy", label: "UAE VAT", detail: "5% standard rate." }]),
      total: sourced(withVat(ready.budget), "Budget plus VAT.", [{ id: "f3", kind: "policy", label: "what you pay", detail: "One payment, for this phase only." }]),
      method: { brand: "Visa", last4: "4629", expires: "08/27" },
      commits: [
        `${fmtUSD(withVat(ready.budget))} today, for ${phaseTitle(ready.phaseNo)} only.`,
        `A ${ready.guaranteedRoas}× guarantee on this phase. Under ${fmtUSD(ready.budget * ready.guaranteedRoas)} and we pay you the difference.`,
        `The phase that is live now ends when this one starts — one phase runs at a time.`,
        `Nothing publishes without you.`,
      ],
      state: "pending",
    };
    putFunding(req);
    push({ kind: "say", text: `Here is exactly what starting ${phaseTitle(ready.phaseNo)} commits you to. Nothing moves until you confirm it.` });
    push({ kind: "funding", requestId: req.id });
    closePanel();
  };

  return (
    <div className="space-y-5">
      {/* The monitor is built for a page: its four blocks go side by side
          above the `md` breakpoint, which a 440px panel next to a wide
          conversation still trips. Forced back to one column from out
          here, so the component keeps its own layout everywhere else. */}
      <div className="[&>div>div:last-child]:!flex-col [&>div>div:last-child]:!divide-x-0 [&>div>div:last-child]:!divide-y">
        <AgentMonitor phase={live} compact />
      </div>

      {/* Who is actually working, named. The monitor above says what was
          done; this says which of the seven agents is doing it, because
          "the agent" is not a thing — three specific ones run on a live
          phase and they do different jobs. One sentence, deliberately:
          a second dashboard here would compete with the first. */}
      <Card className="flex items-start gap-2.5 p-3.5">
        <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand animate-live" />
        <p className="text-meta leading-5 text-ink-soft">
          Three agents are on {phaseTitle(live.phaseNo)} right now:{" "}
          <span className="font-semibold text-ink">MoonLive AI</span> has published the ads you approved,{" "}
          <span className="font-semibold text-ink">MoonScore AI</span> is moving spend towards whichever of them
          converts, inside the budget you already paid, and{" "}
          <span className="font-semibold text-ink">MoonLearning AI</span> is collecting the results so your next
          campaign starts smarter than this one. Nothing new publishes and no money moves without you.
        </p>
      </Card>

      <Card className="p-4"><PaceForecast phase={live} /></Card>

      {/* The numbers, stacked. */}
      <Card className="p-4">
        <Eyebrow>Where this phase stands</Eyebrow>
        <div className="mt-1">
          <StatRow label="Revenue, this phase" note={`of ${fmtUSD(live.revTarget ?? 0)} target`}>
            <Figure size="lg" render={fmtUSD(live.rev)}
              src={sourced(live.rev, `Orders attributed to ${phaseTitle(live.phaseNo)}'s tracking codes since ${live.start}. This phase only.`, [
                { id: "d1", kind: "orders", label: "your connected store", detail: `${fmtUSD(live.rev)} across ${liveAds.length} live ads.` },
              ])} />
          </StatRow>
          <StatRow label="Return, this phase" note={`against ${live.guaranteedRoas}× guaranteed`}>
            <Figure size="lg" render={`${(live.rev / live.budget).toFixed(1)}×`}
              src={sourced(live.rev / live.budget, "Revenue this phase divided by the budget this phase was given. Never pooled across the ladder.", [
                { id: "d2", kind: "orders", label: "attributed revenue", detail: fmtUSD(live.rev) },
                { id: "d3", kind: "policy", label: "this phase's budget", detail: fmtUSD(live.budget) },
              ], { computedFrom: `${fmtUSD(live.rev)} ÷ ${fmtUSD(live.budget)}` })} />
          </StatRow>
          <StatRow label="Revenue from live ads" note={`across ${liveAds.length} ads`}>
            <Figure size="lg" render={fmtUSD(adRevenue)}
              src={sourced(adRevenue, "Summed from the tracking code on each live ad.", liveAds.map((a) => ({
                id: `da-${a.id}`, kind: "orders" as const, label: a.track, detail: `${a.creatorName} — ${fmtUSD(a.performance?.revenue.value ?? 0)}`,
              })), { computedFrom: "Σ per-ad attributed revenue" })} />
          </StatRow>
          <StatRow label="Across all phases" note={`on ${fmtUSD(totalSpend)} paid so far`}>
            <Figure size="lg" render={fmtUSD(totalRev)}
              src={sourced(totalRev, `Summed along ${funded.length} funded phases. Safe to add because revenue is measured per phase, against the budget that phase alone was given.`,
                funded.map((f) => ({ id: `df-${f.id}`, kind: "orders" as const, label: phaseTitle(f.phaseNo), detail: `${fmtUSD(f.rev)} on ${fmtUSD(f.budget)}` })),
                { computedFrom: funded.map((f) => fmtUSD(f.rev)).join(" + ") })} />
          </StatRow>
        </div>
      </Card>

      {/* What this phase returned, on the one instrument that says it. */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Eyebrow>What this phase returned</Eyebrow>
          <Pill tone="live" className="ms-auto">Day {live.dayOfPhase} of {live.plannedDays}</Pill>
        </div>
        <ReturnRuler className="mt-4" achieved={roas} guarantee={live.guaranteedRoas} />
        <p className="mt-2 text-meta leading-5 text-ink-soft">
          {roas >= live.guaranteedRoas
            ? `${fmtUSD(Math.round(live.rev - live.budget * live.guaranteedRoas))} past the ${live.guaranteedRoas}× guarantee.`
            : `${fmtUSD(Math.round(live.budget * live.guaranteedRoas - live.rev))} more earned reaches the ${live.guaranteedRoas}× guarantee.`}
          {" "}The tick is the gate, not the promise: it marks where the next phase unlocks.
        </p>
      </Card>

      {/* Every phase, as one row of tiles. This is the one thing in the
          panel allowed to scroll sideways — it is a chip row, and each
          tile is legible on its own. */}
      <section aria-label="Your phases">
        <div className="flex items-end justify-between gap-3">
          <Eyebrow>Your phases</Eyebrow>
          <p className="text-[11px] text-ink-faint">One phase runs at a time</p>
        </div>
        <PhaseTiles
          className="mt-3"
          rungs={PHASES.map((x) => ({
            phaseNo: x.phaseNo,
            label: phaseTitle(x.phaseNo),
            sub:
              x.status === "ended" ? `${fmtUSD(x.rev)} on ${fmtUSD(x.budget)} · ${(x.rev / x.budget).toFixed(1)}×`
              : x.status === "live" ? `${fmtUSD(x.rev)} of ${fmtUSD(x.revTarget!)}`
              : x.status === "ready" ? `${fmtUSD(x.budget)} · ready to start`
              : `${fmtUSD(x.budget)} · unlocks at 80%`,
            state: x.status,
            pct: phasePct(x) ?? undefined,
          }))}
        />
      </section>

      {/* The phase that has unlocked, and the case for starting it. */}
      {ready && (
        <Card className="p-4">
          <Eyebrow tone="danger">Unlocked and waiting on you</Eyebrow>
          <p className="mt-2 text-body leading-6 text-ink-soft">
            Phase {ready.phaseNo - 1} crossed 80% of its own target, which is what unlocks this one. Nothing about
            {" "}{phaseTitle(ready.phaseNo)} has started: no creator is briefed and no budget is deployed until you start it.
            {!afterReady && ` It is the last of the three, so nothing unlocks behind it — the campaign ends when it ends.`}
          </p>
          <div className="mt-3">
            <StatRow label="Budget">
              <Figure size="lg" render={fmtUSD(ready.budget)} src={sourced(ready.budget, "Confirmed when this phase unlocked.", [{ id: "p1", kind: "policy", label: "how the phases are priced", detail: `${fmtUSD(PHASE1_BUDGET)} for the warm-up, ${fmtUSD(phase2)} for Phase 2, ${fmtUSD(phase3)} for Phase 3. The warm-up price is the same for every brand and is never negotiated.` }])} />
            </StatRow>
            <StatRow label="Guaranteed floor">
              <Figure size="lg" render={fmtUSD(ready.budget * ready.guaranteedRoas)} src={sourced(ready.budget * ready.guaranteedRoas, `Budget times the ${ready.guaranteedRoas}× guaranteed on this phase.`, [{ id: "p2", kind: "policy", label: "the guarantee", detail: "Below this, MoonTech pays the difference." }], { computedFrom: `${fmtUSD(ready.budget)} × ${ready.guaranteedRoas}` })} />
            </StatRow>
            {afterReady && (
              <StatRow label={`Unlocks ${phaseTitle(afterReady.phaseNo)} at`}>
                <Figure size="lg" render={fmtUSD(ready.budget * ready.guaranteedRoas * 0.8)} src={sourced(ready.budget * ready.guaranteedRoas * 0.8, "80% of this phase's own target.", [{ id: "p3", kind: "policy", label: "the 80% line", detail: "One phase at a time; crossing 80% unlocks the next." }], { computedFrom: `${fmtUSD(ready.budget * ready.guaranteedRoas)} × 0.8` })} />
              </StatRow>
            )}
          </div>
          {openRequest ? (
            <p className="mt-4 text-meta leading-5 text-ink-faint">
              {openRequest.state === "confirmed"
                ? `${phaseTitle(ready.phaseNo)} is paid for. The receipt is in the conversation.`
                : `The payment for ${phaseTitle(ready.phaseNo)} is waiting in the conversation. Close this panel to confirm it.`}
            </p>
          ) : (
            <>
              <Btn className="mt-4 w-full" onClick={start}>
                Start {phaseTitle(ready.phaseNo)} — {fmtUSD(withVat(ready.budget))}
              </Btn>
              <p className="mt-2 text-meta leading-5 text-ink-faint">
                {fmtUSD(ready.budget)} plus {fmtUSD(vatOn(ready.budget))} VAT. I put the payment in the conversation and
                you confirm it there, in one step.
              </p>
            </>
          )}
        </Card>
      )}

      {/* Live ads, two across. */}
      <section aria-label="Live ads">
        <div className="flex items-end justify-between gap-3">
          <Eyebrow>Live ads · {liveAds.length}</Eyebrow>
          <button onClick={() => setPanelView("ads")} className="text-meta font-semibold text-brand hover:underline">
            See every draft
          </button>
        </div>
        {/* The grid is built for a page and goes four across above `lg`.
            Two columns is the panel rule, forced from the wrapper so the
            component itself stays untouched. */}
        <div className="mt-3 [&>div]:!grid-cols-2">
          <LiveAdGrid ads={liveAds} />
        </div>
      </section>
    </div>
  );
}
