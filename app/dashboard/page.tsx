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
 * column on the canvas. A brand who uses HeyMoon today should not
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
import Link from "next/link";
import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import { CampaignView } from "../components/dashboard/CampaignView";
import { HomeView } from "../components/dashboard/HomeView";
import { CreatorsView } from "../components/dashboard/CreatorsView";
import { AdsView } from "../components/dashboard/AdsView";
import { InboxView } from "../components/dashboard/InboxView";
import { ActivityView } from "../components/dashboard/ActivityView";
import { AutonomyView } from "../components/dashboard/AutonomyView";
import { DashboardSidebar, NAV } from "../components/dashboard/Sidebar";
import { DashboardTopbar } from "../components/dashboard/Topbar";
import { DashboardAssistant } from "../components/dashboard/Assistant";
import { ConnectAlert } from "../components/dashboard/ConnectAlert";
import {
  campaignLabel, setDashboardView, showCampaignList, useActiveCampaign, useAds, useDashboardView,
  useCampaigns, useDrill, usePaid,
} from "../lib/store";
import { SurfaceProvider } from "../lib/surface";
import { phaseTitle } from "../lib/mock/campaigns";
import type { DashboardView } from "../lib/agent/dashboard";

/** Nothing built yet, said inside the dashboard rather than instead of
    it. The rail and the top bar stay, so a brand can see what this page
    will hold before they have anything to put in it. */
function EmptyDashboard() {
  return (
    <div className="rounded-card border border-dashed border-black/[0.12] bg-white p-10 text-center">
      <p className="text-[15px] font-semibold text-ink">No campaign yet</p>
      <p className="mx-auto mt-1.5 max-w-[420px] text-body leading-6 text-ink-soft">
        Build one and this fills in: what your creators earn you against the guarantee, the drafts waiting on your
        approval, and everything HeyMoon did on its own.
      </p>
      <Link
        href="/c"
        className="mt-5 inline-flex items-center gap-2 rounded-control bg-brand px-4 py-2 text-body font-semibold text-white transition hover:bg-brand-hover"
      >
        <Sparkle size={14} weight="fill" aria-hidden />
        Build a campaign
        <ArrowRight size={13} weight="bold" aria-hidden className="rtl:rotate-180" />
      </Link>
    </div>
  );
}

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
  /* Scoped to the campaign on screen. Counting every ad in the store
     put a "6" on the rail of an account with no campaign at all. */
  const waiting = ads.filter((a) => a.state === "waiting" && camp?.adIds.includes(a.id)).length;

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

  /* No early return for an empty account.

     It used to bail out to a centred splash with the logo on it, which
     is a different SCREEN: the rail vanished, the top bar vanished, and
     a brand arriving at their dashboard for the first time could not
     see what the dashboard even was. An empty state belongs INSIDE the
     thing it is empty of. The shell always renders; the main column
     says there is nothing yet. */

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
    creators: "Creators",
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
            {/* Above every view, not inside one: the store is connected
                once for the account, so the ask does not belong to the
                page that happens to be open. */}
            {anyCampaign && paid && !camp?.connectedStore && <ConnectAlert />}
            {!anyCampaign && <EmptyDashboard />}
            {anyCampaign && view === "home" && <HomeView />}
            {anyCampaign && view === "campaign" && <CampaignView />}
            {anyCampaign && view === "creators" && <CreatorsView />}
            {/* Home and Campaigns read fine before payment — the list and
                the ladder are about what EXISTS. The running views are the
                ones that need a phase in flight. */}
            {anyCampaign && view !== "home" && view !== "campaign" && view !== "creators" && !paid && (
              /* The running views need a phase in flight. Saying so
                 beats five empty frames. */
              <div className="rounded-card border border-hairline bg-white p-6 text-center shadow-card">
                <p className="text-body text-ink-soft">
                  {camp ? `${campaignLabel(camp)} has not started yet.` : "Nothing is running."} Start Phase 1 and
                  connect the store, and this fills in.
                </p>
              </div>
            )}
            {anyCampaign && view === "inbox" && paid && <InboxView />}
            {anyCampaign && view === "ads" && paid && <AdsView />}
            {anyCampaign && view === "activity" && paid && <ActivityView />}
            {anyCampaign && view === "autonomy" && paid && <AutonomyView />}
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
