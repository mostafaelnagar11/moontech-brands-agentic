"use client";

/* Every campaign, as cards.
 *
 * This is the first thing Campaign shows, and the reason is the one
 * that brought the rail back: a brand running several arrives wanting
 * to know which one needs them, and that is a comparison. Cards answer
 * it; a switcher in the corner does not.
 *
 * Two to a row. Three fits, and at three the card is narrow enough
 * that the figure it exists to show gets clipped.
 *
 * The card is built to the same anatomy as the phase card one level
 * in — name and state, then one big figure against what was promised,
 * then the meter, then three metrics under a rule. A brand moving
 * between the two screens should not have to re-learn where the
 * number is.
 */

import { ArrowRight, Check, LockSimple, Plus, Warning } from "@phosphor-icons/react";
import Link from "next/link";
import { fmtUSD, pace, phaseTitle, UNLOCK_AT } from "../../lib/mock/campaigns";
import {
  campaignLabel, openCampaign, startConversation, useAds, useCampaigns, type Campaign,
} from "../../lib/store";
import { Section } from "./kit";

/** A multiple reads better without a trailing ".0" on the whole ones. */
const fmtX = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function CampaignsList() {
  const campaigns = useCampaigns();
  const ads = useAds();

  return (
    <Section
      title={campaigns.length === 1 ? "Your campaign" : `Your campaigns · ${campaigns.length}`}
      aside={
        <Link
          href="/c"
          onClick={() => startConversation()}
          className="inline-flex items-center gap-1.5 rounded-control bg-brand px-3 py-1.5 text-meta font-semibold text-white transition hover:bg-brand-hover"
        >
          <Plus size={12} weight="bold" aria-hidden /> New campaign
        </Link>
      }
    >
      {/* Two per row, never three. At three the card is narrow enough
          that the figure it exists to show gets clipped — and the
          figure is the whole point of the card. */}
      <div className="grid gap-3 md:grid-cols-2">
        {campaigns.map((c) => (
          <Card key={c.id} c={c} waiting={ads.filter((a) => c.adIds.includes(a.id) && a.state === "waiting").length} />
        ))}
      </div>
    </Section>
  );
}

function Card({ c, waiting }: { c: Campaign; waiting: number }) {
  const live = c.phases.find((p) => p.status === "live");
  const done = c.phases.filter((p) => p.status === "ended");
  /* FUNDED means paid for — live or ended. A ready phase is unlocked
     but not bought and a locked one cannot be bought at all, so neither
     has a budget committed or a dollar earned: they stay out of the
     spend, or the card overstates what this campaign cost. */
  const funded = c.phases.filter((p) => p.status === "live" || p.status === "ended");
  /* Everything earned so far, across every phase that has run. A
     campaign is judged on its total, not on the rung it happens to be
     standing on. */
  const earned = c.phases.reduce((n, p) => n + p.rev, 0);
  const promised = c.phases.reduce((n, p) => n + (p.revTarget ?? 0), 0);
  const spend = funded.reduce((n, p) => n + p.budget, 0);
  const pct = promised ? Math.round((earned / promised) * 100) : null;
  /* Creators are briefed per phase, so the count belongs to one phase
     and has to say which — the live one, or the first that was funded. */
  const crew = live ?? funded[0];
  const roas = spend ? earned / spend : null;
  /* The blended guarantee: everything promised over everything spent.
     Phases are guaranteed at different multiples, so one phase's
     `guaranteedRoas` would be the wrong number to print here. */
  const guarantee = spend ? promised / spend : null;

  return (
    <button
      onClick={() => openCampaign(c.id)}
      className="group flex flex-col rounded-card border border-hairline bg-white p-5 text-start shadow-card transition hover:border-brand/30 hover:shadow-float"
    >
      <span className="flex w-full items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 truncate text-[15px] font-semibold text-ink">{campaignLabel(c)}</span>
            <StatusChip campaign={c} />
          </span>
          <span className="mt-1 block truncate text-[11px] text-ink-faint">{c.url}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-control px-2.5 py-1.5 text-body font-medium text-ink-faint transition-colors group-hover:bg-brand/[0.06] group-hover:text-brand">
          View <ArrowRight size={12} weight="bold" aria-hidden className="rtl:rotate-180" />
        </span>
      </span>

      {/* Everything this campaign has returned, against everything it
          was guaranteed. `grow` only ever widens the gap below — it is
          what keeps two cards in a row sharing a footer line. */}
      <span className="mt-6 block grow">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[26px] font-semibold leading-none tracking-tight tabular-nums text-ink">
            {fmtUSD(earned)}{" "}
            <span className="text-sm font-normal tracking-normal text-ink-faint">
              {promised > 0 ? `of ${fmtUSD(promised)} guaranteed` : "banked so far"}
            </span>
          </span>
          {pct !== null && <span className="shrink-0 text-sm font-semibold tabular-nums text-brand">{pct}%</span>}
        </span>

        {pct !== null && (
          <>
            <span className="relative mt-3.5 block h-2 w-full rounded-full bg-track">
              <span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
              {/* 80% is the mark the whole ladder turns on: a phase that
                  reaches it unlocks the next one. Mark it rather than
                  imply it. */}
              <span aria-hidden className="absolute -inset-y-1 start-[80%] w-px bg-brand/40" />
            </span>
            <span className="sr-only">
              {pct >= 80
                ? "Past the 80% mark."
                : `${80 - pct} percentage points below the 80% mark.`}
            </span>
          </>
        )}

        {/* What is owed and what is owing, on one line under the meter —
            the position the phase card gives the same pair of facts. */}
        {(waiting > 0 || promised > earned) && (
          <span className="mt-2.5 flex items-baseline gap-2">
            {waiting > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-danger/[0.07] px-2 py-1 text-[11px] font-semibold text-danger">
                <Warning size={11} weight="fill" aria-hidden /> {waiting} waiting on you
              </span>
            )}
            {promised > earned && (
              <span className="ms-auto shrink-0 text-[11px] text-ink-faint">
                {fmtUSD(promised - earned)} to go
              </span>
            )}
          </span>
        )}
      </span>

      {/* Three metrics, all of them this campaign's own. */}
      <span className="mt-6 grid w-full grid-cols-3 gap-4 border-t border-hairline pt-4">
        {[
          {
            label: "Phases closed",
            value: String(done.length),
            suffix: `/${c.phases.length}`,
            note: live
              ? live.dayOfPhase && live.plannedDays
                ? `day ${live.dayOfPhase} of ${live.plannedDays}`
                : "one running"
              : done.length === c.phases.length && done.length > 0
              ? "all closed"
              : "none running",
          },
          {
            label: "Creators",
            value: String(crew?.creators ?? 0),
            suffix: "",
            note: crew ? `on phase ${crew.phaseNo}` : "not briefed yet",
          },
          {
            label: "Multiple",
            value: roas !== null ? roas.toFixed(1) : "—",
            suffix: roas !== null ? "x" : "",
            note: guarantee !== null ? `${fmtX(guarantee)}x guaranteed` : "nothing funded yet",
          },
        ].map((m) => (
          <span key={m.label} className="block min-w-0">
            <span className="block truncate text-[11px] font-medium text-ink-faint">{m.label}</span>
            <span className="mt-1 block text-[17px] font-semibold tracking-tight tabular-nums text-ink">
              {m.value}
              {m.suffix && <span className="text-body font-normal text-ink-faint">{m.suffix}</span>}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-ink-faint">{m.note}</span>
          </span>
        ))}
      </span>
    </button>
  );
}

/* The same pill the phase card wears, so a state means one thing on
   both screens: brand purple with a pulsing dot while something is
   running, green once it is past the line, grey when there is nothing
   to act on. */
function StatusChip({ campaign }: { campaign: Campaign }) {
  const live = campaign.phases.find((p) => p.status === "live");
  const skin = "inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11px] font-semibold";

  if (!campaign.paid) {
    return (
      <span className={`${skin} border-hairline bg-neutral-50 text-ink-faint`}>
        <LockSimple size={11} weight="fill" aria-hidden />
        Not started
      </span>
    );
  }
  if (!live) {
    return (
      <span className={`${skin} border-neutral-200 bg-neutral-50 text-ink-soft`}>
        <Check size={11} weight="bold" aria-hidden />
        Closed
      </span>
    );
  }

  /* A running phase keeps the pulsing dot whether or not it is past the
     line. Crossing 80% turns the pill green, but it must not turn it
     into a tick: a tick beside green is what "Closed" looks like, and
     this campaign is still live. */
  const p = pace(live);
  const crossed = p ? p.pctNow >= UNLOCK_AT * 100 : false;
  return (
    <span
      className={`${skin} ${crossed ? "border-good/25 bg-good/[0.07] text-good-deep" : "border-brand/20 bg-brand/[0.07] text-brand"}`}
      title={phaseTitle(live.phaseNo)}
    >
      <span aria-hidden className={`animate-live h-1.5 w-1.5 rounded-full ${crossed ? "bg-good" : "bg-brand"}`} />
      {crossed ? "Past the line" : `Phase ${live.phaseNo}`}
    </span>
  );
}
