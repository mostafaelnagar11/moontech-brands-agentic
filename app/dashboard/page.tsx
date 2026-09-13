"use client";

/* The dashboard: where a campaign LIVES, once the agent has finished
   building it.
 *
 * A different surface from the conversation, and the split is the
 * product's rather than a layout choice. The agent at `/c` has one job
 * — read the store, settle two numbers, build the campaign, take the
 * payment, connect the store — and it ends. What follows is a phase
 * running for weeks: drafts arriving, budget moving, revenue landing
 * against a guarantee. That is not a thread you scroll back through,
 * it is a place you check.
 *
 * The chrome is the current app's, deliberately: a 210px rail that
 * collapses to 60px, a 67px translucent top bar, and a full-bleed main
 * column on the canvas. A brand who uses MoonTech today should not
 * have to learn a new shell to look at the same numbers. What has
 * changed is the third column.
 *
 * Where the current app has no assistant and this prototype had a
 * "back to the agent" link, there is now a rail you can talk to. It is
 * a different agent from the builder — that one knows a store, this
 * one knows a phase in flight — and it can move the page, answer from
 * the figures already on it, and prepare an approval. It cannot
 * publish, move money or sign, which is what makes it safe to put a
 * text box this close to a live campaign.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import { CampaignView } from "../components/dashboard/CampaignView";
import { HomeView } from "../components/dashboard/HomeView";
import { AdsView } from "../components/dashboard/AdsView";
import { InboxView } from "../components/dashboard/InboxView";
import { ActivityView } from "../components/dashboard/ActivityView";
import { AutonomyView } from "../components/dashboard/AutonomyView";
import { DashboardSidebar, NAV } from "../components/dashboard/Sidebar";
import { DashboardTopbar } from "../components/dashboard/Topbar";
import { DashboardAssistant } from "../components/dashboard/Assistant";
import {
  campaignLabel, setDashboardView, showCampaignList, useActiveCampaign, useAds, useDashboardView,
  useCampaigns, useDrill, usePaid,
} from "../lib/store";
import { SurfaceProvider } from "../lib/surface";
import { phaseTitle } from "../lib/mock/campaigns";
import type { DashboardView } from "../lib/agent/dashboard";

export default function DashboardPage() {
  /* The dashboard's own view. It used to share `panel.view` with the
     conversation, which meant moving around here silently repointed
     the panel over there — and, because the cross-links went through
     `openPanel`, armed it open on a surface the brand was not on. Two
     fields, one owner each; the cross-links reach this one through
     the surface context below. */
  const stored = useDashboardView();
  const view: DashboardView = (NAV.some((v) => v.key === stored) ? stored : "campaign") as DashboardView;

  const camp = useActiveCampaign();
  const anyCampaign = useCampaigns().length > 0;
  const drill = useDrill();
  const paid = usePaid();
  const ads = useAds();
  const waiting = ads.filter((a) => a.state === "waiting").length;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [assistant, setAssistant] = useState(true);

  /* A column of its own needs room for two. On a phone there is only
     ever room for one, so it starts closed there and takes the whole
     width when opened — the same rule the conversation's panel uses at
     /c. It is never an overlay: nothing here floats above the thing it
     is answering about. */
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) setAssistant(false);
  }, []);

  /* The gate is "is there a campaign at all", not "is this one paid".
     An unpaid campaign still belongs in the list and still has phases
     worth reading; it is the RUNNING views that need a live phase, and
     they say so themselves below. */
  if (!anyCampaign) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-canvas px-6">
        <div className="max-w-[420px] text-center">
          <Image src="/logo.svg" alt="MoonTech" width={110} height={20} priority className="mx-auto h-[19px] w-auto" />
          <p className="mt-6 text-prose text-ink">
            No campaign yet. Build one and this is where it runs — what the creators earn you against the guarantee,
            the drafts waiting on you, and everything the agents did on their own.
          </p>
          <Link
            href="/c"
            className="mt-5 inline-flex items-center gap-2 rounded-control bg-brand px-4 py-2 text-body font-semibold text-white transition hover:bg-brand-hover"
          >
            <Sparkle size={14} weight="fill" aria-hidden />
            Build one first
            <ArrowRight size={13} weight="bold" aria-hidden className="rtl:rotate-180" />
          </Link>
        </div>
      </div>
    );
  }

  /* The Campaign heading follows the drill: the list, then the
     campaign, then the phase. A page titled "Phase 2 · Scale" while
     you are looking at a list of campaigns is the header disagreeing
     with the body. */
  const drilled =
    drill.level === "list" || !camp
      ? "Campaigns"
      : drill.level === "phase"
        ? (() => {
            const ph = camp.phases.find((x) => x.id === drill.phaseId);
            return ph ? `${campaignLabel(camp)} · ${phaseTitle(ph.phaseNo)}` : campaignLabel(camp);
          })()
        : campaignLabel(camp);

  const TITLE: Record<DashboardView, string> = {
    home: "Dashboard",
    campaign: drilled,
    inbox: "Needs you",
    ads: "Ads",
    activity: "What I did on my own",
    autonomy: "What I may do alone",
  };

  return (
    /* Everything inside moves THIS surface. A panel's cross-link asks
       for `useGo()` and never learns which page it is on. */
    <SurfaceProvider go={setDashboardView}>
    <div className="flex h-[100dvh] overflow-hidden bg-canvas">
      <DashboardSidebar
        collapsed={collapsed}
        view={view}
        onView={(v) => { setDashboardView(v); if (v === "campaign") showCampaignList(); }}
        waiting={waiting}
        brandName={camp ? campaignLabel(camp) : "Campaigns"}
        mobileOpen={mobileNav}
        onMobileClose={() => setMobileNav(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopbar
          title={TITLE[view]}
          waiting={waiting}
          assistantOpen={assistant}
          onToggleAssistant={() => setAssistant((o) => !o)}
          /* One control, two jobs, the way the current app does it: it
             collapses the rail where there is room for one and opens
             the drawer where there is not. */
          onToggleNav={() => {
            if (typeof window !== "undefined" && window.innerWidth < 768) setMobileNav((o) => !o);
            else setCollapsed((o) => !o);
          }}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Below 768 the two columns cannot both fit, so the open
              assistant takes the width and the dashboard steps aside
              rather than being dimmed behind it. */}
          <main
            className={`flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8 ${
              assistant ? "hidden md:block" : "block"
            }`}
          >
            {view === "home" && <HomeView />}
            {view === "campaign" && <CampaignView />}
            {/* Home and Campaigns read fine before payment — the list and
                the ladder are about what EXISTS. The running views are the
                ones that need a phase in flight. */}
            {view !== "home" && view !== "campaign" && !paid && (
              /* The running views need a phase in flight. Saying so
                 beats five empty frames. */
              <div className="rounded-card border border-hairline bg-white p-6 text-center shadow-card">
                <p className="text-body text-ink-soft">
                  {camp ? `${campaignLabel(camp)} has not started yet.` : "Nothing is running."} Start Phase 1 and
                  connect the store, and this fills in.
                </p>
              </div>
            )}
            {view === "inbox" && paid && <InboxView />}
            {view === "ads" && paid && <AdsView />}
            {view === "activity" && paid && <ActivityView />}
            {view === "autonomy" && paid && <AutonomyView />}
          </main>

          {/* A column, not an overlay. It sits in the row beside the
              dashboard and the dashboard reflows around it, so nothing
              is ever dimmed or covered. Collapsing it is one press,
              from the top bar or from its own header. */}
          {assistant && (
            <aside
              className="animate-slide-in-end flex w-full shrink-0 flex-col border-s border-hairline md:w-[clamp(320px,30vw,400px)]"
              aria-label="Assistant"
            >
              <DashboardAssistant onClose={() => setAssistant(false)} />
            </aside>
          )}
        </div>
      </div>
    </div>
    </SurfaceProvider>
  );
}
