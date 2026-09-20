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

import { CaretRight, Lightning, Warning } from "@phosphor-icons/react";
import { fmtUSD, pace, phaseTitle, UNLOCK_AT, type Phase } from "../../lib/mock/campaigns";
import {
  campaignLabel, openCampaign, openPhase, showCampaignList, useActiveCampaign, useAds,
  useCampaignPhases, useDrill, useLivePhase, type Campaign,
} from "../../lib/store";
import { useGo } from "../../lib/surface";
import { CampaignsList } from "./CampaignsList";
import { CreatorsView } from "./CreatorsView";
import { InboxView } from "./InboxView";
import { AdsView } from "./AdsView";
import { ActivityView } from "./ActivityView";
import { PhaseDetail } from "./PhaseDetail";
import { RevenueChart } from "./RevenueChart";
import { ActionBar, Section, Surface, Tile } from "./kit";


/** The five faces of one campaign. They were five rows in the rail,
    ranked alongside Campaigns itself, which made them read as five
    places rather than five views of one thing — and they are views of
    one thing: switch the brand and every one of them changes. */
export const CAMPAIGN_TABS = [
  { key: "campaign", label: "Phases" },
  { key: "creators", label: "Creators" },
  { key: "inbox", label: "Needs you" },
  { key: "ads", label: "Ads" },
  { key: "activity", label: "Activity" },
] as const;
export type CampaignTab = (typeof CAMPAIGN_TABS)[number]["key"];

/* Three levels behind one nav item: every campaign, one campaign with
   its phases, one phase. Pressing Campaign in the rail always returns
   to the list, which is the only way a drill-down stays escapable. */
export function CampaignView({ tab = "campaign", onTab }: {
  tab?: CampaignTab;
  /** Set by the dashboard, because the tab IS the dashboard view: the
      assistant and the activity log both deep-link to "ads" and
      "inbox", and those links have to keep working now that the rail
      no longer offers them. */
  onTab?: (t: CampaignTab) => void;
}) {
  const drill = useDrill();
  const campaign = useActiveCampaign();
  const phases = useCampaignPhases();
  const ads = useAds();
  const waiting = campaign
    ? ads.filter((a) => a.state === "waiting" && campaign.adIds.includes(a.id)).length
    : 0;

  /* The list only answers for the Phases tab. Asking for Ads from
     somewhere else — the action bar on the home page, the assistant,
     the activity log — names a face of a campaign, so it opens that
     face of the active one rather than dropping you on the list of
     brands to find it yourself. */
  if (!campaign || (drill.level === "list" && tab === "campaign")) return <CampaignsList />;

  const phase = drill.phaseId ? phases.find((p) => p.id === drill.phaseId) ?? null : null;

  return (
    <div className="space-y-4">
      <Crumbs campaign={campaign} phase={phase} />
      {/* The tabs belong to the campaign, not to the phase: drilling
          into one rung is a level deeper than choosing which face of
          the campaign to look at, so the row steps aside there. */}
      {!phase && (
        <div role="tablist" aria-label="Campaign" className="flex flex-wrap gap-1 rounded-control border border-hairline bg-white p-1">
          {CAMPAIGN_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => onTab?.(t.key)}
              className={`flex items-center gap-1.5 rounded-[9px] px-3.5 py-2 text-body font-semibold transition ${
                tab === t.key ? "bg-brand text-white" : "text-ink-faint hover:bg-wash hover:text-ink-soft"
              }`}
            >
              {t.label}
              {t.key === "inbox" && waiting > 0 && (
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                    tab === t.key ? "bg-white/20 text-white" : "bg-danger/[0.08] text-danger"
                  }`}
                >
                  {waiting}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {phase ? (
        <PhaseDetail campaign={campaign} phase={phase} />
      ) : tab !== "campaign" && tab !== "creators" && !campaign.paid ? (
        /* Phases and Creators read fine before payment: the ladder and
           the crew are about what EXISTS. The other three are about
           what is running, and nothing is. */
        <Surface className="p-6 text-center">
          <p className="text-body text-ink-soft">
            {campaignLabel(campaign)} has not started yet. Start Phase 1 and connect the store, and this fills in.
          </p>
        </Surface>
      ) : tab === "creators" ? (
        <CreatorsView />
      ) : tab === "inbox" ? (
        <InboxView />
      ) : tab === "ads" ? (
        <AdsView />
      ) : tab === "activity" ? (
        <ActivityView />
      ) : (
        <OneCampaign />
      )}
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
  const phase = useLivePhase();
  const phases = useCampaignPhases();
  const ads = useAds().filter((a) => !phase || a.campaignId === phase.id);
  const waiting = ads.filter((a) => a.state === "waiting");
  const held = waiting.filter((a) => a.compliance.verdict === "hold").length;

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

      {/* Two figures, which are the two questions: how is the phase
          that is running doing, and how is the campaign doing.

          There were four. "This phase at close" was a FORECAST, and a
          forecast beside a guarantee is the one thing this product has
          been careful not to print anywhere: it reads as a second,
          softer promise sitting next to the real one, and a brand who
          reads $19,895 there will remember that number rather than the
          $16,000 HeyMoon actually signed. "Waiting on you" was the
          fourth copy of the same 6 — the action bar directly above it
          says it in a sentence with a button, the Needs you tab wears
          it as a badge, and so does the brand in the rail.

          What is left is labelled with what it counts, because three
          screens show sales for this campaign and they count different
          things: the card in the list sums every phase, this view is
          about the phase running now, and the phase page is one rung. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Tile
          tone="hero"
          label={`${phaseTitle(phase.phaseNo)} attributed`}
          value={fmtUSD(phase.rev)}
          sub={`${pct}% of ${fmtUSD(target)}`}
          foot={
            <div className="h-1 w-full overflow-hidden rounded-pill bg-white/25">
              <div className="h-full rounded-pill bg-white" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          }
        />
        <Tile
          label="Campaign to date"
          value={fmtUSD(earned)}
          sub={promised ? `of ${fmtUSD(promised)} guaranteed` : "across every phase"}
        />
      </div>

      {/* The chart and the ladder read together: the line is this
          phase, the rows are the phases around it. Side by side you can
          see which rung the line belongs to without scrolling. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch">
        <Section
          title="Sales against target"
          aside={
            <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-semibold ${
              crossed ? "bg-good/10 text-good-deep" : "bg-brand/10 text-brand"
            }`}>
              {crossed ? <Lightning size={11} weight="fill" aria-hidden /> : <Warning size={11} weight="fill" aria-hidden />}
              {crossed ? "Next phase unlocked" : `${p?.daysToUnlock ?? 0} days to the unlock line`}
            </span>
          }
        >
          {/* The chart earns the extra height rather than floating in
              it: the plot grows with the card and keeps the padding
              even on all four sides. */}
          <Surface className="flex h-full flex-col p-5">
            <div className="flex min-h-[260px] flex-1 flex-col justify-center">
              <RevenueChart phase={phase} />
            </div>
          </Surface>
        </Section>

        <Section title="The phases">
          {/* Three rungs in a card sized for the chart beside it left a
              third of the card empty. The rows share the height evenly
              instead, so the list reads as a ladder with rungs at equal
              intervals, which is what it is. */}
          <Surface className="flex h-full flex-col">
            <ul className="flex flex-1 flex-col divide-y divide-hairline">
              {phases.map((ph) => {
                const isLive = ph.id === phase.id;
                const done = ph.status === "ended";
                return (
                  <li key={ph.id} className="flex flex-1">
                  <button
                    onClick={() => openPhase(ph.id)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-start transition hover:bg-brand/[0.03]"
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
                      {/* The multiple, not the budget. A row's job is
                          which rung and how it is going; what the rung
                          costs is on the page the row opens. */}
                      <span className="block truncate text-[11px] text-ink-faint">
                        {ph.guaranteedRoas}x guaranteed
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
      </div>

    </div>
  );
}

