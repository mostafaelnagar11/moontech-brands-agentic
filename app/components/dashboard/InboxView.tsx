"use client";

/* Everything waiting on the brand, as a list rather than as a briefing.
 *
 * What this replaces: five cards, each a bold sentence followed by a
 * paragraph explaining itself, every one of them the same size as the
 * others. In a panel that is fine — a panel is read once, top to
 * bottom, and closed. On a wide page it hides the only thing this view
 * is for: which of these costs you money if you leave it, and how
 * much.
 *
 * So the list is ranked and the ranking is visible. Money is one row
 * with the dollars set large at the end of it, because that figure is
 * the whole argument for opening this view. Work that blocks revenue
 * is a row with a count. Things that only need acknowledging are rows
 * you can wave away. Every explanation is still here, one press behind
 * "Why", which is the right depth for a sentence nobody asked for.
 *
 * Nothing here decides on the brand's behalf. The money row goes as
 * far as showing where the Start button is; the held drafts open in
 * place because there the decision IS the task; and the two things no
 * agent may ever do are stated at the bottom, in full, every time.
 */

import { useState, type ReactNode } from "react";
import {
  ArrowRight, CaretDown, CheckCircle, Clock, Images, Lightning, Sliders,
} from "@phosphor-icons/react";
import { ApprovalCard } from "../AdCards";
import {
  draftDaysLeft, fmtUSD, pace, phaseTitle, UNLOCK_AT, withVat,
} from "../../lib/mock/campaigns";
import {
  dismissInbox, type PanelView, useActivity, useAds, useLivePhase, useReadyPhase, useStore,
} from "../../lib/store";
import { useGo } from "../../lib/surface";
import { DataRow, Detail, Section, Surface } from "./kit";

type Group = "money" | "blocking" | "fyi";

interface Item {
  id: string;
  group: Group;
  icon: typeof Lightning;
  /** One line. If it needs a comma and a clause, it belongs in `why`. */
  title: string;
  /** One fact under the title — a deadline, a promise. Never a sentence. */
  note?: string;
  /** The figure at the end of the row. */
  value: string;
  /** The money figure, set large. At most one of these on the page. */
  hero?: boolean;
  cta?: string;
  go?: PanelView;
  /** Decided in place, for the one item where the decision is the task. */
  body?: ReactNode;
  bodyCta?: string;
  why: string;
  dismissible?: boolean;
}

const SKIN: Record<Group, string> = {
  money: "bg-danger/[0.08] text-danger",
  blocking: "bg-brand/[0.08] text-brand",
  fyi: "bg-neutral-100 text-ink-faint",
};

export function InboxView() {
  const go = useGo();
  const ads = useAds();
  const activity = useActivity();
  const dismissed = useStore((s) => s.dismissedInbox);

  const live = useLivePhase();
  const ready = useReadyPhase();
  const p = live ? pace(live) : null;
  const waiting = ads.filter((a) => a.state === "waiting");
  const held = waiting.filter((a) => a.compliance.verdict === "hold");
  const easy = waiting.filter((a) => a.compliance.verdict !== "hold");

  /* The oldest held draft's deadline, from the same review window the
     card inside the row prints. A held draft is only urgent because of
     this number, so it is on the row rather than two presses in. */
  const heldDays = held.map((a) => draftDaysLeft(a.submitted)).filter((d): d is number => d !== null);
  const soonest = heldDays.length ? Math.min(...heldDays) : null;

  /* The unlock line, guarded. The old copy printed `80 - pctNow` raw,
     which reads "−4 points from the unlock line" on a phase that has
     already crossed it. */
  const unlockPct = Math.round(UNLOCK_AT * 100);
  const toUnlock = p ? Math.max(0, Math.round(unlockPct - p.pctNow)) : null;

  const items: Item[] = [];

  if (ready) {
    items.push({
      id: "fund",
      group: "money",
      icon: Lightning,
      title: `${phaseTitle(ready.phaseNo)} is unlocked and not started`,
      note: "you press Start. No agent moves money",
      value: fmtUSD(withVat(ready.budget)),
      hero: true,
      /* The Start button lives in the campaign view, beside the numbers
         that justify it. Opening that view is as far as this goes. */
      go: "campaign",
      cta: "Show me where",
      why: live
        ? `${phaseTitle(live.phaseNo)} crossed ${unlockPct}% of its own target, which is what unlocks this. Every day it is not started is a day the ladder is not climbing.`
        : "Every day it is not started is a day the ladder is not climbing.",
    });
  }

  if (held.length) {
    items.push({
      id: "held",
      group: "blocking",
      icon: Clock,
      title: "Drafts I would hold rather than approve",
      note: soonest !== null ? `${soonest} days left to decide the oldest` : undefined,
      value: String(held.length),
      /* Decided here rather than one view away: a held draft is the one
         thing in this list where the decision is the whole task. */
      bodyCta: "Decide",
      body: (
        <div className="grid gap-3 lg:grid-cols-2">
          {held.map((a) => <ApprovalCard key={a.id} ad={a} compact />)}
        </div>
      ),
      why: "These miss something in the brief. Deciding them first gets a re-cut back inside the review window instead of letting them publish as they are.",
    });
  }

  if (easy.length) {
    items.push({
      id: "approve",
      group: "blocking",
      icon: Images,
      title: "Drafts I would approve",
      note: "all on brief",
      value: String(easy.length),
      go: "ads",
      cta: "Review",
      why: toUnlock
        ? `Every one is on brief. Approving them is the single biggest thing that moves this phase. It is ${toUnlock} points from the unlock line.`
        : `Every one is on brief, and this phase is already past the ${unlockPct}% line. Approving them is the fastest sales left in this list.`,
    });
  }

  if (!waiting.length) {
    items.push({
      id: "clear",
      group: "fyi",
      icon: CheckCircle,
      title: "Every draft is decided",
      note: "nothing is blocked on you",
      value: "0",
      why: "New drafts land here the moment a creator finishes one.",
      dismissible: true,
    });
  }

  items.push({
    id: "autonomy",
    group: "fyi",
    icon: Sliders,
    /* The count comes off the activity log rather than a number typed
       into a sentence, so it cannot drift from what the log shows. */
    title: "Things I did on my own",
    note: "all inside what you allow",
    value: String(activity.filter((a) => !a.undone).length),
    go: "activity",
    cta: "See them",
    why: "All inside what you allow. Money and publishing are never on that list, and cannot be added to it.",
    dismissible: true,
  });

  const shown = items.filter((i) => !dismissed.includes(i.id));
  const groups: { key: Group; label: string }[] = [
    { key: "money", label: "Money" },
    { key: "blocking", label: "Blocking sales" },
    { key: "fyi", label: "For information" },
  ];

  return (
    <div className="space-y-6">
      {shown.length === 0 ? (
        <Surface className="px-6 py-10 text-center">
          <CheckCircle size={26} weight="fill" className="mx-auto text-good" aria-hidden />
          <p className="mt-2 text-body font-semibold text-ink">Nothing needs you</p>
          <p className="mt-0.5 text-meta text-ink-faint">New drafts land here as creators finish them.</p>
        </Surface>
      ) : (
        groups.map(({ key, label }) => {
          const rows = shown.filter((i) => i.group === key);
          if (!rows.length) return null;
          return (
            <Section
              key={key}
              title={label}
              aside={
                <span className="rounded-pill bg-neutral-100 px-2 py-0.5 text-micro font-semibold tabular-nums text-ink-faint">
                  {rows.length}
                </span>
              }
            >
              <Surface>
                <ul className="divide-y divide-hairline">
                  {rows.map((it) => <Row key={it.id} item={it} onGo={go} />)}
                </ul>
              </Surface>
            </Section>
          );
        })
      )}

      {/* The two promises the product rests on. They are stated here on
          every visit, decided or not, because this is the view a brand
          opens to find out what is being done without them. */}
      <Section title="What I can never do">
        <Surface>
          <div className="divide-y divide-hairline">
            <DataRow label="Money moved without asking" value={<span className="text-good-deep">Never</span>} />
            <DataRow label="Ads published without asking" value={<span className="text-good-deep">Never</span>} />
          </div>
        </Surface>
      </Section>
    </div>
  );
}

/** One thing waiting on you: severity, a line, a figure, one action.
    Not a new primitive — it is the inbox's row, and it exists because
    this list is the only place a row carries both a decision and the
    drafts that decision is about. */
function Row({ item, onGo }: { item: Item; onGo: (v: PanelView) => void }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;
  /* Read out of the item before the JSX: narrowing a mutable property
     does not survive into the click handler's closure. */
  const target = item.go;

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-control ${SKIN[item.group]}`}>
          <Icon size={16} weight="fill" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-ink">{item.title}</p>
          {item.note && <p className="truncate text-[11px] text-ink-faint">{item.note}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`tabular-nums font-semibold ${
              item.hero ? "text-figure text-danger" : "text-body text-ink"
            }`}
          >
            {item.value}
          </span>

          {item.body ? (
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="inline-flex items-center gap-1.5 rounded-control bg-brand/[0.08] px-3 py-1.5 text-meta font-semibold text-brand transition hover:bg-brand/15"
            >
              {item.bodyCta}
              <CaretDown size={11} weight="bold" aria-hidden className={`transition ${open ? "rotate-180" : ""}`} />
            </button>
          ) : target ? (
            <button
              onClick={() => onGo(target)}
              className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-meta font-semibold transition ${
                item.group === "money"
                  ? "bg-brand text-white hover:bg-brand-hover"
                  : "bg-brand/[0.08] text-brand hover:bg-brand/15"
              }`}
            >
              {item.cta}
              <ArrowRight size={12} weight="bold" aria-hidden className="rtl:rotate-180" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 ps-11">
        <Detail summary="Why">{item.why}</Detail>
        {item.dismissible && (
          <button
            onClick={() => dismissInbox(item.id)}
            className="text-[11px] font-semibold text-ink-faint transition hover:text-ink"
          >
            Dismiss
          </button>
        )}
      </div>

      {item.body && open && <div className="mt-3 ps-11">{item.body}</div>}
    </li>
  );
}
