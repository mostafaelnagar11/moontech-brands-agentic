"use client";

/* One prioritised list of everything waiting on the brand.

   The old app scattered "needs you" across four surfaces that did not
   know about each other — a bell, an ads card, a creators badge and a
   funding pill — so nobody could tell whether the six drafts or the six
   thousand dollars mattered more today. This is the one list, ordered by
   consequence: money that unlocks the next rung first, then work that is
   blocking revenue, then things that only need acknowledging.

   Nothing here navigates. An action either decides the draft in place or
   moves the panel to the view that can, because leaving the conversation
   to act on something is exactly what this rebuild removed. */

import { ArrowRight, CheckCircle, Clock, Images, Lightning, Sliders } from "@phosphor-icons/react";
import { Card, Eyebrow, Pill, Btn } from "../ui";
import { ApprovalCard } from "../AdCards";
import { dismissInbox, openPanel, useAds, useStore, type PanelView } from "../../lib/store";
import { fmtUSD, livePhase, pace, phaseTitle, readyPhase, withVat } from "../../lib/mock/campaigns";

type Urgency = "money" | "blocking" | "fyi";

const TONE: Record<Urgency, { pill: "danger" | "brand" | "muted"; word: string }> = {
  money: { pill: "danger", word: "Money" },
  blocking: { pill: "brand", word: "Blocking revenue" },
  fyi: { pill: "muted", word: "For information" },
};

export function InboxPanel() {
  const ads = useAds();
  const dismissed = useStore((s) => s.dismissedInbox);
  const live = livePhase()!;
  const ready = readyPhase();
  const p = pace(live)!;
  const waiting = ads.filter((a) => a.state === "waiting");
  const held = waiting.filter((a) => a.compliance.verdict === "hold");

  const items: {
    id: string; urgency: Urgency; title: string; why: string;
    icon: typeof Lightning; body?: React.ReactNode; go?: PanelView; cta?: string;
  }[] = [];

  if (ready) {
    items.push({
      id: "fund", urgency: "money", icon: Lightning,
      title: `${phaseTitle(ready.phaseNo)} is unlocked — ${fmtUSD(withVat(ready.budget))} to start it`,
      why: `${phaseTitle(live.phaseNo)} crossed 80% of its own target, which is what unlocks this. Every day it is not started is a day the ladder is not climbing.`,
      /* The Start button lives in the campaign view, beside the numbers
         that justify it. Opening that view is as far as this goes: money
         moves only when the brand presses the button itself. */
      go: "campaign", cta: "Show me where to start it",
    });
  }

  if (held.length) {
    items.push({
      id: "held", urgency: "blocking", icon: Clock,
      title: `${held.length} draft${held.length === 1 ? "" : "s"} I would hold rather than approve`,
      why: "These miss something in the brief. Deciding them first gets a re-cut back inside the review window instead of letting them publish as they are.",
      /* Decided here rather than one view away: a held draft is the one
         thing in this list where the decision is the whole task. */
      body: <div className="mt-3 space-y-3">{held.map((a) => <ApprovalCard key={a.id} ad={a} compact />)}</div>,
    });
  }

  const easy = waiting.filter((a) => a.compliance.verdict !== "hold");
  if (easy.length) {
    items.push({
      id: "approve", urgency: "blocking", icon: Images,
      title: `${easy.length} drafts I would approve`,
      why: `Every one is on brief. Approving them is the single biggest thing that moves this phase — it is ${Math.round(80 - p.pctNow)} points from the unlock line.`,
      go: "ads", cta: "Review them",
    });
  }

  if (!waiting.length) {
    items.push({
      id: "clear", urgency: "fyi", icon: CheckCircle,
      title: "Every draft is decided",
      why: "Nothing is blocked on you. New drafts land here the moment a creator finishes one.",
    });
  }

  items.push({
    id: "autonomy", urgency: "fyi", icon: Sliders,
    title: "I acted on my own four times this week",
    why: "All inside what you allow. Money and publishing are never on that list, and cannot be added to it.",
    go: "activity", cta: "See what I did",
  });

  const shown = items.filter((i) => !dismissed.includes(i.id));
  const groups = [
    { key: "money" as const, label: "Money", rows: shown.filter((i) => i.urgency === "money") },
    { key: "blocking" as const, label: "Blocking revenue", rows: shown.filter((i) => i.urgency === "blocking") },
    { key: "fyi" as const, label: "For information", rows: shown.filter((i) => i.urgency === "fyi") },
  ];

  return (
    <>
      <p className="text-body leading-6 text-ink-soft">
        Everything waiting on you, in the order it costs you to leave it: money first, then the work that is
        holding revenue back, then the things that only need reading.
      </p>

      {groups.map((g) =>
        g.rows.length ? (
          <section key={g.key} className="mt-5" aria-label={g.label}>
            <Eyebrow tone={g.key === "money" ? "danger" : g.key === "blocking" ? "brand" : "muted"}>{g.label}</Eyebrow>
            <div className="mt-2.5 space-y-3">
              {g.rows.map((it) => {
                const Icon = it.icon;
                const go = it.go;
                return (
                  <Card key={it.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-control ${
                        it.urgency === "money" ? "bg-danger/[0.08] text-danger"
                          : it.urgency === "blocking" ? "bg-brand/[0.08] text-brand"
                          : "bg-neutral-100 text-ink-faint"
                      }`}>
                        <Icon size={17} weight="fill" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-body font-semibold text-ink">{it.title}</p>
                        <Pill tone={TONE[it.urgency].pill} className="mt-1.5">{TONE[it.urgency].word}</Pill>
                        <p className="mt-1.5 text-body leading-6 text-ink-soft">{it.why}</p>
                        {it.body}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {go && (
                            <button
                              onClick={() => openPanel(go)}
                              className="inline-flex items-center gap-1.5 rounded-control bg-brand px-3 py-2 text-meta font-semibold text-white transition hover:bg-brand-hover"
                            >
                              {it.cta} <ArrowRight size={12} weight="bold" aria-hidden className="rtl:rotate-180" />
                            </button>
                          )}
                          {it.urgency === "fyi" && (
                            <Btn variant="ghost" size="sm" onClick={() => dismissInbox(it.id)}>Dismiss</Btn>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ) : null
      )}

      {shown.length === 0 && (
        <Card className="mt-5 p-8 text-center">
          <CheckCircle size={26} weight="fill" className="mx-auto text-good" aria-hidden />
          <p className="mt-2 text-body font-semibold text-ink">Nothing needs you</p>
        </Card>
      )}
    </>
  );
}
