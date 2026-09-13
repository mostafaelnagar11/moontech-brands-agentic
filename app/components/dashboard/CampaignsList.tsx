"use client";

/* Every campaign, as cards.
 *
 * This is the first thing Campaign shows once there is more than one,
 * and the reason is the same one that brought the rail back: a list of
 * one is furniture, and a list of several that you cannot see at once
 * is worse. A brand running three campaigns arrives wanting to know
 * which one needs them, and that is a comparison — three cards side by
 * side answer it, a switcher in the corner does not.
 *
 * Each card carries only what ranks it: what it has returned against
 * what was promised, how far through it is, and whether anything is
 * waiting. Everything else is one click in.
 */

import { ArrowRight, Plus, Warning } from "@phosphor-icons/react";
import Link from "next/link";
import { fmtUSD, pace, phaseTitle, UNLOCK_AT } from "../../lib/mock/campaigns";
import {
  campaignLabel, openCampaign, startConversation, useAds, useCampaigns, type Campaign,
} from "../../lib/store";
import { Section } from "./kit";

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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
  /* Everything earned so far, across every phase that has run. A
     campaign is judged on its total, not on the rung it happens to be
     standing on. */
  const earned = c.phases.reduce((n, p) => n + p.rev, 0);
  const promised = c.phases.reduce((n, p) => n + (p.revTarget ?? 0), 0);
  const p = live ? pace(live) : null;
  const pct = promised ? Math.round((earned / promised) * 100) : 0;

  return (
    <button
      onClick={() => openCampaign(c.id)}
      className="group flex flex-col rounded-card border border-hairline bg-white p-4 text-start shadow-card transition hover:border-brand/30 hover:shadow-float"
    >
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold text-ink">{campaignLabel(c)}</span>
          <span className="block truncate text-[11px] text-ink-faint">{c.url}</span>
        </span>
        <StatusChip campaign={c} />
      </div>

      <div className="mt-3.5 flex items-end gap-4">
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-faint">Earned</span>
          <span className="block truncate text-figure font-semibold tabular-nums text-ink">{fmtUSD(earned)}</span>
        </span>
        {promised > 0 && (
          <span className="min-w-0 pb-1">
            <span className="block text-[11px] text-ink-faint">of {fmtUSD(promised)} guaranteed</span>
          </span>
        )}
      </div>

      {promised > 0 && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-pill bg-black/[0.06]">
          <div className="h-full rounded-pill bg-brand" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint">
        <span>
          {done.length} of {c.phases.length} phases closed
        </span>
        {live && p && <span>day {live.dayOfPhase} of {live.plannedDays}</span>}
      </div>

      {waiting > 0 && (
        <span className="mt-3 inline-flex items-center gap-1.5 self-start rounded-pill bg-danger/[0.07] px-2 py-1 text-[11px] font-semibold text-danger">
          <Warning size={11} weight="fill" aria-hidden /> {waiting} waiting on you
        </span>
      )}

      <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand">
        Open <ArrowRight size={11} weight="bold" aria-hidden className="transition group-hover:translate-x-0.5 rtl:rotate-180" />
      </span>
    </button>
  );
}

function StatusChip({ campaign }: { campaign: Campaign }) {
  const live = campaign.phases.find((p) => p.status === "live");
  if (!campaign.paid) {
    return <span className="shrink-0 rounded-pill bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-ink-faint">Not started</span>;
  }
  if (!live) {
    return <span className="shrink-0 rounded-pill bg-good/10 px-2 py-0.5 text-[10px] font-semibold text-good-deep">Closed</span>;
  }
  const p = pace(live);
  const crossed = p ? p.pctNow >= UNLOCK_AT * 100 : false;
  return (
    <span
      className={`shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-semibold ${
        crossed ? "bg-good/10 text-good-deep" : "bg-brand/10 text-brand"
      }`}
      title={phaseTitle(live.phaseNo)}
    >
      {crossed ? "Past the line" : `Phase ${live.phaseNo}`}
    </span>
  );
}
