"use client";

/* Which view the panel is showing.
 *
 * This is the whole navigation model of the product. There is no
 * router involved: the store holds one view name, the chat or the rail
 * changes it, and closing the panel puts the brand back exactly where
 * they were in the conversation rather than on a previous page.
 */

import { PanelFrame } from "./ChatShell";
import { PlanPanel } from "../panels/PlanPanel";
import { ReadPanel } from "../panels/ReadPanel";
import { CampaignPanel } from "../panels/CampaignPanel";
import { AdsPanel } from "../panels/AdsPanel";
import { InboxPanel } from "../panels/InboxPanel";
import { ActivityPanel } from "../panels/ActivityPanel";
import { AutonomyPanel } from "../panels/AutonomyPanel";
import { useActivePlan, useAds, usePaid, usePanel, useStore } from "../../lib/store";
import { phaseTitle, livePhase } from "../../lib/mock/campaigns";

export function PanelHost() {
  const { view } = usePanel();
  const plan = useActivePlan();
  const paid = usePaid();
  const ads = useAds();
  const url = useStore((s) => Object.values(s.reads)[0]?.url ?? "your store");
  const waiting = ads.filter((a) => a.state === "waiting").length;
  const live = livePhase();

  switch (view) {
    case "plan":
      return (
        <PanelFrame
          title={paid ? "Your campaign" : "Your proposed campaign"}
          sub={plan ? `${plan.brandName} · three phases, you start the first` : undefined}
        >
          <PlanPanel />
        </PanelFrame>
      );
    case "read":
      return (
        <PanelFrame title="What we found" sub={url}>
          <ReadPanel />
        </PanelFrame>
      );
    case "campaign":
      return (
        <PanelFrame title={live ? phaseTitle(live.phaseNo) : "Campaign"} sub="What happened, and what it means">
          <CampaignPanel />
        </PanelFrame>
      );
    case "ads":
      return (
        <PanelFrame title="Ads" sub={waiting ? `${waiting} waiting on you` : "Everything is decided"}>
          <AdsPanel />
        </PanelFrame>
      );
    case "inbox":
      return (
        <PanelFrame title="Needs you" sub="Ordered by what it costs to leave it">
          <InboxPanel />
        </PanelFrame>
      );
    case "activity":
      return (
        <PanelFrame title="What I did on my own" sub="Each one with a reason and an undo">
          <ActivityPanel />
        </PanelFrame>
      );
    case "autonomy":
      return (
        <PanelFrame title="What I may do alone" sub="Money and publishing are never on the list">
          <AutonomyPanel />
        </PanelFrame>
      );
  }
}
