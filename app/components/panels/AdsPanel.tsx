"use client";

/* Ads: three shelves in one column.

   The queue is the part that matters, so it is the shelf the panel
   opens on. Every card carries the agent's compliance read against the
   brief the agent itself wrote, a recommendation, and the reasoning
   behind it — and then still waits for the brand.

   Batch approve exists and defaults to the drafts the agent would
   approve rather than to all of them. Selecting the ones it would hold
   as well is possible, and it takes a deliberate second action.

   The shelf used to be a query string on a route. There is no route any
   more, so it is local state: the panel opens on what is waiting,
   which is the only shelf that can ask anything of you. */

import { useMemo, useState } from "react";
import { CheckCircle, Clock, Images } from "@phosphor-icons/react";
import { ApprovalCard, LiveAdGrid } from "../AdCards";
import { Btn, Card, Eyebrow, Pill } from "../ui";
import { setAdState, useAds } from "../../lib/store";
import { REVIEW_WINDOW_DAYS, fmtUSD, livePhase } from "../../lib/mock/campaigns";

type Shelf = "waiting" | "live" | "declined";

export function AdsPanel() {
  const [shelf, setShelf] = useState<Shelf>("waiting");
  const [sel, setSel] = useState<string[]>([]);
  const ads = useAds();
  const phase = livePhase();

  const mine = phase ? ads.filter((a) => a.campaignId === phase.id) : [];
  const counts = {
    waiting: mine.filter((a) => a.state === "waiting").length,
    live: mine.filter((a) => a.state === "live").length,
    declined: mine.filter((a) => a.state === "declined").length,
  };
  const shown = mine.filter((a) => a.state === shelf);
  const held = shown.filter((a) => a.compliance.verdict === "hold").length;
  /* What the agent would sign off on, which is what "select" preselects.
     Recomputed from the shelf rather than stored, so a decision made on
     a card never leaves a stale id behind in the batch. */
  const wouldApprove = useMemo(
    () => shown.filter((a) => a.compliance.verdict !== "hold").map((a) => a.id),
    [shown]
  );

  const toggle = (id: string, on: boolean) => setSel((s) => (on ? [...s, id] : s.filter((x) => x !== id)));
  const approveSelected = () => { sel.forEach((id) => setAdState(id, "live")); setSel([]); };

  return (
    <div>
      {/* The three shelves. */}
      <div role="tablist" aria-label="Ad shelves" className="flex gap-1 rounded-control bg-black/[0.04] p-1">
        {([
          { k: "waiting" as const, label: "Waiting on you", n: counts.waiting },
          { k: "live" as const, label: "Live", n: counts.live },
          { k: "declined" as const, label: "Declined", n: counts.declined },
        ]).map((t) => (
          <button
            key={t.k}
            role="tab"
            aria-selected={shelf === t.k}
            onClick={() => { setShelf(t.k); setSel([]); }}
            className={`flex-1 rounded-[9px] px-2 py-2 text-meta font-semibold transition ${
              shelf === t.k ? "bg-white text-ink shadow-card" : "text-ink-faint hover:text-ink"
            }`}
          >
            {t.label} <span className="tabular-nums opacity-70">{t.n}</span>
          </button>
        ))}
      </div>

      {shelf === "waiting" && (
        <>
          {/* The batch bar. In a column the buttons take their own row
              rather than crowding the sentence that explains the queue. */}
          <Card className="mt-4 p-4">
            <div className="flex items-start gap-3">
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-brand/[0.08] text-brand">
                <Images size={17} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold text-ink">
                  {counts.waiting === 0 ? "Every draft is decided" : `${counts.waiting} drafts, ${held} I would hold`}
                </p>
                <p className="text-meta leading-5 text-ink-faint">
                  Nothing publishes until you decide. An undecided draft goes live on its own after {REVIEW_WINDOW_DAYS} days.
                </p>
              </div>
            </div>
            {counts.waiting > 0 && (
              <div className="mt-3 flex gap-2">
                <Btn variant="quiet" size="sm" className="flex-1" onClick={() => setSel(wouldApprove)}>
                  Select the {wouldApprove.length} I&apos;d approve
                </Btn>
                <Btn size="sm" className="flex-1" disabled={!sel.length} onClick={approveSelected}>
                  Approve {sel.length || ""} and publish
                </Btn>
              </div>
            )}
          </Card>

          {counts.waiting === 0 ? (
            <Card className="mt-4 p-8 text-center">
              <CheckCircle size={26} weight="fill" className="mx-auto text-good" aria-hidden />
              <p className="mt-2 text-body font-semibold text-ink">Nothing waiting on you</p>
              <p className="mt-1 text-meta text-ink-faint">New drafts land here the moment a creator finishes one.</p>
            </Card>
          ) : (
            <div className="mt-4 grid gap-3">
              {shown.map((a) => (
                <ApprovalCard key={a.id} ad={a} selected={sel.includes(a.id)} onSelect={toggle} />
              ))}
            </div>
          )}
        </>
      )}

      {shelf === "live" && (
        <>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
            <Eyebrow>Published from this phase</Eyebrow>
            <p className="text-meta tabular-nums text-ink-faint">
              {fmtUSD(shown.reduce((n, a) => n + (a.performance?.revenue.value ?? 0), 0))} attributed
            </p>
          </div>
          {/* The grid is built for a page and goes four across above `lg`.
              Two columns is the panel rule, forced from the wrapper so the
              component itself stays untouched. */}
          <div className="mt-3 [&>div]:!grid-cols-2">
            <LiveAdGrid ads={shown} />
          </div>
        </>
      )}

      {shelf === "declined" && (
        <div className="mt-4">
          {shown.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock size={24} weight="fill" className="mx-auto text-ink-faint" aria-hidden />
              <p className="mt-2 text-body font-semibold text-ink">Nothing declined</p>
              <p className="mt-1 text-meta text-ink-faint">A decline never publishes, and it collects here so you can change your mind.</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {shown.map((a) => <ApprovalCard key={a.id} ad={a} />)}
            </div>
          )}
        </div>
      )}

      <p className="mt-5 flex items-start gap-2 text-meta leading-5 text-ink-faint">
        <Pill tone="muted">Rule</Pill>
        Approving is the action that publishes, and it is always yours. The agent ranks the queue and recommends;
        it has never been able to publish, and that is fixed rather than configurable.
      </p>
    </div>
  );
}
