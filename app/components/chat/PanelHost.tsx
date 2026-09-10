"use client";

/* Which view the panel is showing.
 *
 * This is the whole navigation model of the product. There is no
 * router involved: the store holds one view name, the chat or the rail
 * changes it, and closing the panel puts the brand back exactly where
 * they were in the conversation rather than on a previous page.
 */

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { PanelFrame } from "./ChatShell";
import { PlanPanel } from "../panels/PlanPanel";
import { ReadPanel } from "../panels/ReadPanel";
import { useActivePlan, usePaid, usePanel, useStore } from "../../lib/store";
import { phaseTitle, livePhase } from "../../lib/mock/campaigns";

export function PanelHost() {
  const { view } = usePanel();
  const plan = useActivePlan();
  const paid = usePaid();
  const url = useStore((s) => Object.values(s.reads)[0]?.url ?? "your store");
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
    /* The five running views live on /dashboard now. The panel can
       still be ASKED for one — the store holds a single view name and
       the dashboard writes to it too, so coming back here after
       looking at Ads leaves that name behind — so rather than
       rendering a phase view beside a finished conversation, it says
       where the thing went. */
    default:
      return (
        <PanelFrame title="This lives in your dashboard" sub={live ? phaseTitle(live.phaseNo) : undefined}>
          <p className="text-prose leading-6 text-ink-soft">
            {RUNNING_LABEL[view] ?? "That view"} belongs to the phase while it runs, not to this conversation. My
            job here is building the campaign; once it is paid for and your store is connected, everything about
            the running phase is on its own page.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-1.5 rounded-control bg-brand px-3.5 py-2 text-body font-semibold text-white transition hover:bg-brand-hover"
          >
            Go to dashboard <ArrowRight size={13} weight="bold" aria-hidden className="rtl:rotate-180" />
          </Link>
        </PanelFrame>
      );
  }
}

const RUNNING_LABEL: Partial<Record<string, string>> = {
  campaign: "How the phase is doing",
  ads: "The drafts waiting on you",
  inbox: "What needs you",
  activity: "What the agents did on their own",
  autonomy: "What they may do alone",
};
