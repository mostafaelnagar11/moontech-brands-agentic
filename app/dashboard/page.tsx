"use client";

/* The dashboard: where a campaign LIVES, once the agent has finished
   building it.
 *
 * This is deliberately a different surface from the conversation, and
 * the split is the product's, not a layout choice. The agent at `/c`
 * has one job — read the store, settle two numbers, build the campaign,
 * take the payment, connect the store — and it ends. What happens after
 * that is a phase running for weeks: drafts arriving, budget moving,
 * revenue landing against a guarantee. That is not a conversation you
 * scroll back through, it is a place you check.
 *
 * So the running views moved out of the chat's panel and came here.
 * Keeping them beside the conversation implied the agent stays with you
 * through the phase, which it does not, and it put five tabs in front
 * of a brand who had not yet built anything.
 *
 * An assistant belongs on this page too, eventually — one that knows
 * the running phase the way the builder knows the store. It is not in
 * this prototype, and nothing here pretends otherwise.
 */

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { CampaignPanel } from "../components/panels/CampaignPanel";
import { AdsPanel } from "../components/panels/AdsPanel";
import { InboxPanel } from "../components/panels/InboxPanel";
import { ActivityPanel } from "../components/panels/ActivityPanel";
import { AutonomyPanel } from "../components/panels/AutonomyPanel";
import { setPanelView, useActivePlan, useAds, usePaid, usePanel } from "../lib/store";
import { livePhase, phaseTitle } from "../lib/mock/campaigns";

type View = "campaign" | "inbox" | "ads" | "activity" | "autonomy";

const VIEWS: { key: View; label: string }[] = [
  { key: "campaign", label: "Campaign" },
  { key: "inbox", label: "Needs you" },
  { key: "ads", label: "Ads" },
  { key: "activity", label: "Activity" },
  { key: "autonomy", label: "Autonomy" },
];

export default function DashboardPage() {
  /* The current view is held in the same store field the chat panel
     uses, rather than in local state, so the cross-links inside these
     panels — "see all, and undo", "review them", "what may I do alone"
     — keep working here without every one of them learning which
     surface it is on. Anything that is not a dashboard view falls back
     to the campaign, which is where you land from the conversation. */
  const stored = usePanel().view;
  const view: View = (VIEWS.some((v) => v.key === stored) ? stored : "campaign") as View;
  const setView = setPanelView;
  const plan = useActivePlan();
  const paid = usePaid();
  const ads = useAds();
  const waiting = ads.filter((a) => a.state === "waiting").length;
  const live = livePhase();

  /* Nothing runs until a phase is paid for, and a dashboard for a
     campaign that does not exist is a set of empty frames. Send them
     back to the one place that can change that. */
  if (!paid || !plan) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-rail px-6">
        <div className="max-w-[420px] text-center">
          <Image src="/logo.svg" alt="MoonTech" width={104} height={19} className="mx-auto h-[18px] w-auto" priority />
          <p className="mt-6 text-prose leading-6 text-ink">
            There is no campaign running yet. This is where one lives once Phase 1 is started and your store is
            connected — the numbers against the guarantee, the drafts waiting on you, and everything the agents did
            on their own.
          </p>
          <Link
            href="/c"
            className="mt-5 inline-flex items-center gap-2 rounded-control bg-brand px-4 py-2 text-body font-semibold text-white transition hover:bg-brand-hover"
          >
            <ArrowLeft size={14} weight="bold" aria-hidden className="rtl:rotate-180" />
            Build a campaign first
          </Link>
        </div>
      </div>
    );
  }

  const sub: Record<View, string> = {
    campaign: "What happened, and what it means",
    inbox: "Ordered by what it costs to leave it",
    ads: waiting ? `${waiting} waiting on you` : "Everything is decided",
    activity: "Each one with a reason and an undo",
    autonomy: "Money and publishing are never on the list",
  };
  const title: Record<View, string> = {
    campaign: live ? phaseTitle(live.phaseNo) : "Campaign",
    inbox: "Needs you",
    ads: "Ads",
    activity: "What I did on my own",
    autonomy: "What I may do alone",
  };

  return (
    <div className="min-h-[100dvh] bg-rail">
      <header className="sticky top-0 z-10 border-b border-hairline bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[900px] items-center gap-3 px-4">
          <Link href="/c" aria-label="Back to the agent" className="rounded transition hover:opacity-70">
            <Image src="/logo.svg" alt="MoonTech" width={104} height={19} className="h-[18px] w-auto" priority />
          </Link>
          <span aria-hidden className="h-4 w-px bg-black/10" />
          <p className="truncate text-body font-semibold text-ink">{plan.brandName}</p>
          <Link
            href="/c"
            className="ms-auto hidden shrink-0 items-center gap-1.5 text-meta font-semibold text-brand transition hover:underline sm:inline-flex"
          >
            <ArrowLeft size={12} weight="bold" aria-hidden className="rtl:rotate-180" />
            Back to the agent
          </Link>
        </div>
        <div className="mx-auto flex max-w-[900px] gap-1 overflow-x-auto px-3 pb-2 no-bar">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              aria-current={v.key === view}
              className={`shrink-0 rounded-pill px-3 py-1.5 text-[11px] font-semibold transition ${
                v.key === view ? "bg-brand text-white" : "text-ink-faint hover:bg-black/[0.05] hover:text-ink"
              }`}
            >
              {v.label}
              {v.key === "inbox" && waiting > 0 && (
                <span className="ms-1.5 rounded-pill bg-danger px-1.5 py-0.5 text-[10px] text-white">{waiting}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-4 py-5">
        <div className="mb-3">
          <h1 className="text-h2 font-semibold text-ink">{title[view]}</h1>
          <p className="mt-0.5 text-meta text-ink-faint">{sub[view]}</p>
        </div>
        {view === "campaign" && <CampaignPanel />}
        {view === "inbox" && <InboxPanel />}
        {view === "ads" && <AdsPanel />}
        {view === "activity" && <ActivityPanel />}
        {view === "autonomy" && <AutonomyPanel />}
      </main>
    </div>
  );
}
