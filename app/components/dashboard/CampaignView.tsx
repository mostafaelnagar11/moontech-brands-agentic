"use client";

/* The campaign, as a dashboard rather than as a report.
 *
 * What this replaces: four stacked prose blocks of equal weight —
 * "what happened", "what it means", "what I did", "what I need from
 * you" — each a paragraph, with the only figures that matter set in
 * the middle of a sentence. That shape is right in a side panel, which
 * is where it was written. On a wide page it is a wall, and the number
 * a brand opened the page for takes longer to find than it took to
 * load.
 *
 * The order here is the order of the questions people actually arrive
 * with: am I going to hit it, is anything waiting on me, what is the
 * shape of it, what did you do without asking. The reasoning behind
 * each answer is not deleted — it moves behind a disclosure, or to the
 * assistant beside the page, where asking is the whole point.
 */

import { ArrowRight, CaretRight, Lightning, Warning } from "@phosphor-icons/react";
import { fmtUSD, pace, phaseTitle, UNLOCK_AT, type Phase } from "../../lib/mock/campaigns";
import {
  campaignLabel, openCampaign, openPhase, showCampaignList, useActiveCampaign, useActivity, useAds,
  useCampaignPhases, useDrill, useLivePhase, type Campaign,
} from "../../lib/store";
import { useGo } from "../../lib/surface";
import { CampaignsList } from "./CampaignsList";
import { PhaseDetail } from "./PhaseDetail";
import { RevenueChart } from "./RevenueChart";
import { ActionBar, DataRow, Detail, Section, Surface, Tile } from "./kit";

const ago = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

/* Three levels behind one nav item: every campaign, one campaign with
   its phases, one phase. Pressing Campaign in the rail always returns
   to the list, which is the only way a drill-down stays escapable. */
export function CampaignView() {
  const drill = useDrill();
  const campaign = useActiveCampaign();
  const phases = useCampaignPhases();

  if (drill.level === "list" || !campaign) return <CampaignsList />;

  const phase = drill.phaseId ? phases.find((p) => p.id === drill.phaseId) ?? null : null;

  return (
    <div className="space-y-4">
      <Crumbs campaign={campaign} phase={phase} />
      {phase ? <PhaseDetail campaign={campaign} phase={phase} /> : <OneCampaign />}
    </div>
  );
}

function Crumbs({ campaign, phase }: { campaign: Campaign; phase: Phase | null }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <button onClick={showCampaignList} className="font-semibold text-brand hover:underline">
        Campaigns
      </button>
      <CaretRight size={9} weight="bold" aria-hidden className="text-ink-faint rtl:rotate-180" />
      {phase ? (
        <>
          <button onClick={() => openCampaign(campaign.id)} className="font-semibold text-brand hover:underline">
            {campaignLabel(campaign)}
          </button>
          <CaretRight size={9} weight="bold" aria-hidden className="text-ink-faint rtl:rotate-180" />
          <span className="text-ink-faint">{phaseTitle(phase.phaseNo)}</span>
        </>
      ) : (
        <span className="text-ink-faint">{campaignLabel(campaign)}</span>
      )}
    </nav>
  );
}

function OneCampaign() {
  const go = useGo();
  const activity = useActivity();
  const phase = useLivePhase();
  const phases = useCampaignPhases();
  const ads = useAds().filter((a) => !phase || a.campaignId === phase.id);
  const waiting = ads.filter((a) => a.state === "waiting");
  const held = waiting.filter((a) => a.compliance.verdict === "hold").length;
  const last = activity.filter((a) => !a.undone)[0];

  if (!phase) {
    return (
      <Surface className="p-6 text-center">
        <p className="text-body text-ink-soft">No phase is running. Start one from the campaign you built.</p>
      </Surface>
    );
  }

  const p = pace(phase);
  const target = phase.revTarget ?? 0;
  /* The same two sums the card in the list shows, computed the same
     way, so the page you land on carries the number you clicked. */
  const earned = phases.reduce((n, ph) => n + ph.rev, 0);
  const promised = phases.reduce((n, ph) => n + (ph.revTarget ?? 0), 0);
  const pct = target ? Math.round((phase.rev / target) * 100) : 0;
  const crossed = p ? p.pctNow >= UNLOCK_AT * 100 : false;

  return (
    <div className="space-y-6">
      {/* The one thing to do, above everything. If there is nothing,
          this row is not rendered rather than rendered empty. */}
      <ActionBar
        count={waiting.length}
        text={held ? `drafts need a decision. I would hold ${held}.` : "drafts need a decision. I would approve them all."}
        cta="Review"
        onCta={() => go("ads")}
      />

      {/* Four figures, ranked — and every one of them LABELLED with
          what it counts.

          Three screens show revenue for the same campaign and they
          count different things: the card in the list sums every phase,
          this view is about the phase running now, and the phase page
          is about one rung. All three were right and none of them said
          so, which reads as three screens disagreeing. The campaign
          total now sits beside the phase figure here, so the number on
          the card you clicked is on the page you land on. */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile
          tone="hero"
          label={`${phaseTitle(phase.phaseNo)} attributed`}
          value={fmtUSD(phase.rev)}
          sub={`${pct}% of ${fmtUSD(target)} on this phase`}
          foot={
            <div className="h-1 w-full overflow-hidden rounded-pill bg-white/25">
              <div className="h-full rounded-pill bg-white" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          }
        />
        <Tile
          label="Campaign to date"
          value={fmtUSD(earned)}
          sub={promised ? `of ${fmtUSD(promised)} guaranteed, all phases` : "across every phase"}
        />
        <Tile
          tone={p && p.onPace ? "good" : "plain"}
          label="This phase at close"
          value={p ? fmtUSD(Math.round(p.atEnd)) : "—"}
          sub={p ? `${Math.round(p.pctForecast)}% of this phase's target` : undefined}
        />
        <Tile
          tone={waiting.length ? "alert" : "plain"}
          label="Waiting on you"
          value={waiting.length}
          sub={waiting.length ? "nothing publishes until you decide" : "nothing right now"}
        />
      </div>

      <Section
        title="Revenue against target"
        aside={
          <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-semibold ${
            crossed ? "bg-good/10 text-good-deep" : "bg-brand/10 text-brand"
          }`}>
            {crossed ? <Lightning size={11} weight="fill" aria-hidden /> : <Warning size={11} weight="fill" aria-hidden />}
            {crossed ? "Next phase unlocked" : `${p?.daysToUnlock ?? 0} days to the unlock line`}
          </span>
        }
      >
        <Surface className="p-4">
          <RevenueChart phase={phase} />
        </Surface>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="The phases">
          <Surface>
            <ul className="divide-y divide-hairline">
              {phases.map((ph) => {
                const isLive = ph.id === phase.id;
                const done = ph.status === "ended";
                return (
                  <li key={ph.id}>
                  <button
                    onClick={() => openPhase(ph.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-brand/[0.03]"
                  >
                    <span
                      aria-hidden
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                        isLive ? "bg-brand text-white" : done ? "bg-good/15 text-good-deep" : "bg-neutral-100 text-ink-faint"
                      }`}
                    >
                      {ph.phaseNo}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-medium text-ink">{phaseTitle(ph.phaseNo)}</span>
                      <span className="block truncate text-[11px] text-ink-faint">
                        {fmtUSD(ph.budget)} · {ph.guaranteedRoas}× guaranteed
                      </span>
                    </span>
                    <span className="shrink-0 text-body font-semibold tabular-nums text-ink">
                      {ph.rev ? fmtUSD(ph.rev) : "—"}
                    </span>
                    <CaretRight size={11} weight="bold" aria-hidden className="shrink-0 text-ink-faint rtl:rotate-180" />
                  </button>
                  </li>
                );
              })}
            </ul>
          </Surface>
        </Section>

        <Section
          title="Done without asking"
          aside={
            <button onClick={() => go("activity")} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">
              All of it <ArrowRight size={11} weight="bold" aria-hidden className="rtl:rotate-180" />
            </button>
          }
        >
          <Surface>
            {last ? (
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-medium text-ink">{last.title}</span>
                    <span className="block text-[11px] text-ink-faint">{ago(last.at)}</span>
                  </span>
                  <button
                    onClick={() => go("activity")}
                    className="shrink-0 text-[11px] font-semibold text-brand hover:underline"
                  >
                    Undo
                  </button>
                </div>
                <div className="mt-2">
                  <Detail summary="Why">{last.because}</Detail>
                </div>
              </div>
            ) : (
              <DataRow label="Nothing on my own since you last looked" value="" />
            )}
            <div className="border-t border-hairline px-4 py-3">
              <DataRowStat label="Money moved without asking" value="Never" />
              <DataRowStat label="Ads published without asking" value="Never" />
            </div>
          </Surface>
        </Section>
      </div>
    </div>
  );
}

/** A locked fact, stated once. These two never change, and the whole
    product rests on them, so they are on the page rather than in a
    settings screen nobody opens. */
function DataRowStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="min-w-0 flex-1 truncate text-[11px] text-ink-faint">{label}</span>
      <span className="shrink-0 text-[11px] font-semibold text-good-deep">{value}</span>
    </div>
  );
}
