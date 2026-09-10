"use client";

/* The typed blocks a thread can contain.

   A conversation in this product is not a list of strings. Each turn is
   one of these, and each is the same component the rest of the app uses
   — the plan card in the thread IS the plan card on the proposal screen,
   reading the same object. */

import { useEffect, useState } from "react";
import {
  ArrowRight, Check, CheckCircle, Lightning, LockSimple, Receipt as ReceiptIcon,
  ShieldCheck, Storefront, WarningCircle,
} from "@phosphor-icons/react";
import type { ApprovalRequest, BrandRead, FundingRequest, Plan, PlanChange, ReadLayerKey, Report } from "../lib/agent/types";
import { fmtUSD, phaseTitle } from "../lib/mock/campaigns";
import { confirmFunding, cancelFunding, openPanel, setAdState, setApprovalState, useAds, usePaid, useStore } from "../lib/store";
import { Btn, Card, Eyebrow, Pill } from "./ui";
import { Claim, EvidenceRow, Figure } from "./Evidence";
import { READ_ORDER, ReadValue, srcFor } from "./ReadValue";
import { PHASE1_BUDGET, READ_TASKS } from "../lib/agent/tools";
import { getConfidence, type ConfidenceLevel } from "../lib/agent/model";
import { PlanCard, ConfidenceMeter } from "./PlanCard";
import { CreatorNames, CreatorSummary } from "./CreatorCard";
import { ApprovalCard } from "./AdCards";

/* ------------------------------------------------------------------ */
/* Attribution                                                         */
/* ------------------------------------------------------------------ */

export function ChangesBlock({ changes }: { changes: PlanChange[] }) {
  /* Anything that names a person lives in `detail`, apart from `to`. So
     a change to the crew reads as counts before payment — "4 matched · 3
     out" — and only says who came in and who went out once Phase 1 is
     paid, which is when names are allowed at all. */
  const paid = usePaid();
  if (!changes.length) {
    return (
      <Card className="p-3">
        <p className="text-meta text-ink-faint">Nothing moved — the plan already said that.</p>
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden">
      <p className="border-b border-hairline px-3 py-2 text-eyebrow font-semibold uppercase tracking-[0.14em] text-ink-faint">
        What moved
      </p>
      <ul className="divide-y divide-hairline">
        {changes.map((c) => (
          <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-2.5">
            <span className="text-meta font-semibold text-ink">{c.label}</span>
            <span className="text-meta text-ink-faint line-through">{c.from}</span>
            <ArrowRight size={11} weight="bold" className="text-ink-faint rtl:rotate-180" aria-hidden />
            <span className="text-meta font-semibold text-brand">{c.to}</span>
            {paid && c.detail && (
              <span className="w-full text-[11px] leading-4 text-ink-soft">{c.detail}</span>
            )}
            <span className="w-full text-[11px] leading-4 text-ink-faint">{c.because}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Starting a phase — the payment confirmation, inside the thread      */
/* ------------------------------------------------------------------ */

export function FundingBlock({ req, onConfirmed, onCancelled }: {
  req: FundingRequest;
  onConfirmed: (id: string) => void;
  onCancelled?: () => void;
}) {
  const live = useStore((s) => s.funding[req.id]) ?? req;
  const [busy, setBusy] = useState(false);

  /* Once paid, this block steps aside. The thread pushes the receipt as
     its own block straight after it, so a receipt here as well would
     show the same payment twice in a row. */
  if (live.state === "confirmed") {
    return (
      <Card className="flex items-center gap-2 px-3.5 py-2.5">
        <CheckCircle size={14} weight="fill" className="shrink-0 text-good-deep" aria-hidden />
        <p className="text-meta text-ink-soft">Paid — receipt below.</p>
      </Card>
    );
  }
  if (live.state === "cancelled") {
    return (
      <Card className="p-4">
        <p className="text-body text-ink-soft">Not started. Nothing was charged, and the plan is unchanged.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-brand/30">
      <div className="flex items-center gap-2 border-b border-hairline bg-brand/[0.05] px-4 py-3">
        <ShieldCheck size={16} weight="fill" className="text-brand" aria-hidden />
        <p className="text-body font-semibold text-ink">Start {phaseTitle(live.phaseNo)}</p>
        <Pill tone="brand" className="ms-auto">Needs you</Pill>
      </div>

      <div className="p-4">
        <dl className="rounded-control border border-hairline">
          <div className="flex justify-between gap-3 border-b border-hairline px-3 py-2.5">
            <dt className="text-body text-ink-faint">Phase budget</dt>
            <dd><Figure src={live.amount} render={fmtUSD(live.amount.value)} size="sm" /></dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-hairline px-3 py-2.5">
            <dt className="text-body text-ink-faint">VAT (5%)</dt>
            <dd><Figure src={live.vat} render={fmtUSD(live.vat.value)} size="sm" /></dd>
          </div>
          <div className="flex items-center justify-between gap-3 bg-brand/[0.04] px-3 py-3">
            <dt className="text-body font-semibold text-ink">Due today</dt>
            <dd><Figure src={live.total} render={fmtUSD(live.total.value)} size="md" /></dd>
          </div>
        </dl>

        <ul className="mt-3 space-y-2">
          {live.commits.map((c, i) => (
            <li key={i} className="flex gap-2 text-meta leading-5 text-ink-soft">
              <CheckCircle size={13} weight="fill" className="mt-0.5 shrink-0 text-good" aria-hidden />{c}
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center gap-3 rounded-control bg-neutral-50 px-3 py-2.5">
          <span aria-hidden className="grid h-7 w-11 place-items-center rounded bg-gradient-to-br from-brand to-brand-500 text-[9px] font-bold text-white">
            {live.method.brand.toUpperCase()}
          </span>
          <p className="text-meta text-ink-soft">
            •••• {live.method.last4} · expires {live.method.expires}
          </p>
          <LockSimple size={12} weight="fill" className="ms-auto shrink-0 text-ink-faint" aria-hidden />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {/* "Not yet" hands the turn back to the agent through `onCancelled`,
              so declining is a step in the conversation and not a dead card. */}
          <Btn variant="quiet" className="sm:flex-1" onClick={() => { cancelFunding(live.id); onCancelled?.(); }}>
            Not yet
          </Btn>
          <Btn
            className="sm:flex-[1.6]"
            disabled={busy}
            onClick={() => { setBusy(true); confirmFunding(live.id); onConfirmed(live.id); }}
          >
            Confirm and pay {fmtUSD(live.total.value)}
          </Btn>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-ink-faint">
          This is the only action in the product that moves money, and only you can take it. The agent can
          prepare this block; it can never press the button.
        </p>
      </div>
    </Card>
  );
}

/* The receipt says what was paid and what comes next, and nothing else.
   No dashboard link: the one step that is still open is connecting the
   store, and a way out here would invite the brand to leave before it. */
export function ReceiptBlock({ req }: { req: FundingRequest }) {
  return (
    <Card className="overflow-hidden border-good/30">
      <div className="flex items-center gap-2 border-b border-hairline bg-good/[0.06] px-4 py-3">
        <ReceiptIcon size={16} weight="fill" className="text-good-deep" aria-hidden />
        <p className="text-body font-semibold text-ink">{phaseTitle(req.phaseNo)} started</p>
        <Pill tone="good" className="ms-auto">Paid</Pill>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-body text-ink-soft">
          <Figure src={req.total} render={fmtUSD(req.total.value)} size="lg" />
          <span>charged to {req.method.brand} •••• {req.method.last4}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-meta text-ink-faint">
          <Figure src={req.amount} render={fmtUSD(req.amount.value)} size="sm" />
          <span>budget +</span>
          <Figure src={req.vat} render={fmtUSD(req.vat.value)} size="sm" />
          <span>VAT (5%)</span>
        </div>
        <p className="mt-3 text-body leading-6 text-ink-soft">
          Next: connect your store, so the guarantee can be measured.
        </p>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

export function ReportBlock({ report }: { report: Report }) {
  const p = report.pace.value;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-hairline px-4 py-3">
        <Eyebrow>Report</Eyebrow>
        <p className="mt-1 text-body font-semibold text-ink">{report.headline || "Reading the phase…"}</p>
      </div>
      <div className="p-4">
        {report.figures.length > 0 && (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {report.figures.map((f) => (
              <div key={f.key} className="rounded-control border border-hairline p-3">
                <dt className="text-[11px] text-ink-faint">{f.label}</dt>
                <dd className="mt-1">
                  <Figure src={f.value} render={String(f.value.value)} size="sm" />
                </dd>
                <a href={`#${f.cardRef}`} className="mt-1.5 block text-[11px] font-medium text-brand hover:underline">
                  See the card
                </a>
              </div>
            ))}
          </dl>
        )}
        {report.pace.evidence.length > 0 && (
          <div className="mt-3 rounded-control border border-hairline p-3">
            <p className="flex items-center gap-1.5 text-meta font-semibold text-ink">
              {p.onPace
                ? <Lightning size={12} weight="fill" className="text-brand" aria-hidden />
                : <WarningCircle size={12} weight="fill" className="text-danger" aria-hidden />}
              {p.pctNow}% now, {p.pctForecast}% forecast
            </p>
            <p className="mt-1 text-meta leading-5 text-ink-soft">{report.pace.why}</p>
          </div>
        )}
        {report.narrative && <p className="mt-3 text-body leading-6 text-ink-soft">{report.narrative}</p>}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Ads and approvals                                                   */
/* ------------------------------------------------------------------ */

export function AdCardBlock({ adId }: { adId: string }) {
  const ads = useAds();
  const ad = ads.find((a) => a.id === adId);
  if (!ad) return null;
  return <ApprovalCard ad={ad} compact />;
}

export function ApprovalBlock({ req }: { req: ApprovalRequest }) {
  const live = useStore((s) => s.approvals[req.id]) ?? req;
  const ads = useAds();
  const [sel, setSel] = useState<string[]>(live.adIds);
  const rows = ads.filter((a) => live.adIds.includes(a.id));
  const open = rows.filter((a) => a.state === "waiting");

  if (live.state !== "pending" || open.length === 0) {
    return (
      <Card className="p-4">
        <p className="flex items-center gap-2 text-body text-good-deep">
          <CheckCircle size={15} weight="fill" aria-hidden />
          Every draft here is decided. Nothing else is waiting on you.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-danger/25">
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-danger/[0.04] px-4 py-3">
        <p className="text-body font-semibold text-ink">{open.length} drafts need a decision</p>
        <Pill tone="danger" className="ms-auto">Needs you</Pill>
      </div>
      <ul className="divide-y divide-hairline">
        {open.map((a) => {
          const on = sel.includes(a.id);
          const v = a.compliance.verdict;
          return (
            <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => setSel((s) => (e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id)))}
                aria-label={`Include ${a.creatorName}'s draft in the batch`}
                className="h-4 w-4 shrink-0 accent-[#4D2FB0]"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.img} alt="" className="h-10 w-8 shrink-0 rounded object-cover object-top" loading="lazy" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-meta font-semibold text-ink">{a.creatorName}</span>
                <span className="block truncate text-[11px] text-ink-faint">{a.product}</span>
              </span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                v === "hold" ? "bg-danger/[0.1] text-danger" : v === "approve" ? "bg-good/[0.1] text-good-deep" : "bg-brand/[0.08] text-brand"
              }`}>
                {v === "hold" ? "I'd hold" : v === "approve" ? "I'd approve" : "Approve, with a note"}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 border-t border-hairline p-3 sm:flex-row">
        <Btn variant="quiet" size="sm" className="sm:flex-1" onClick={() => setSel(open.filter((a) => a.compliance.verdict !== "hold").map((a) => a.id))}>
          Select only the ones I&apos;d approve
        </Btn>
        <Btn
          size="sm"
          className="sm:flex-[1.4]"
          disabled={!sel.length}
          onClick={() => {
            sel.forEach((id) => setAdState(id, "live"));
            setApprovalState(live.id, "approved");
          }}
        >
          Approve {sel.length} and publish
        </Btn>
      </div>
      <p className="px-3 pb-3 text-[11px] leading-4 text-ink-faint">
        Approving publishes. It is a brand action, always — the agent can rank these and recommend, and that is all.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function PlanBlock({ plan, onOpenCreators }: { plan: Plan; onOpenCreators?: () => void }) {
  /* The card in the conversation is a summary; the panel is where the
     whole campaign lives. With no rail, this is how a brand gets there
     without having to think of the words. */
  return (
    <div>
      <PlanCard plan={plan} dense onOpenCreators={onOpenCreators} />
      <button
        onClick={() => openPanel("plan")}
        className="mt-2 text-[11px] font-semibold text-brand hover:underline"
      >
        Open the whole campaign
      </button>
    </div>
  );
}


export function CreatorBlock({ plan }: { plan: Plan }) {
  const paid = usePaid();
  const crew = plan.creators.value.length;
  const pool = plan.pool.value;
  /* Identities are the one thing held back until Phase 1 starts. Before
     that the brand sees how many were matched, how many the warm-up
     briefs, how much reach they have and how much of it is in their
     markets — everything needed to judge the plan, and nothing they
     could take elsewhere. */
  if (!paid) return <CreatorSummary creators={plan.creators.value} matched={pool} />;
  /* Paid: names are allowed, full profiles are still not what a thread
     is for. Face, name, platform, niche. */
  return (
    <div>
      <p className="mb-2 text-meta text-ink-faint">
        {pool && pool > crew
          ? `Your warm-up crew — ${crew} of the ${pool} creators matched for these markets`
          : `${crew} matched for these markets`}
      </p>
      <CreatorNames creators={plan.creators.value} />
    </div>
  );
}

export function ConfidenceBlock({ plan }: { plan: Plan }) {
  return <ConfidenceMeter plan={plan} />;
}

export function BriefBlock({ plan }: { plan: Plan }) {
  const b = plan.brief.value;
  return (
    <Card className="p-4">
      <Eyebrow>The brief</Eyebrow>
      <p className="mt-2 text-body font-semibold text-ink">{b.headline.value}</p>
      <div className="mt-3 space-y-2.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-good-deep">Must</p>
          <ul className="mt-1 space-y-1">{b.mustSay.value.map((l, i) => <li key={i} className="text-meta text-ink-soft">· {l}</li>)}</ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-danger">Must not</p>
          <ul className="mt-1 space-y-1">{b.mustNotSay.value.map((l, i) => <li key={i} className="text-meta text-ink-soft">· {l}</li>)}</ul>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Who is working, and on what                                         */
/*                                                                     */
/* A progress bar says something is happening. A named agent with a     */
/* stated job and a task that ticks says WHAT is happening, and it is    */
/* the difference between a page that looks like it is loading and a     */
/* screen that looks like it is working for you. The same roster serves  */
/* the read (READ_TASKS) and the plan build (BUILD_TASKS).               */
/* ------------------------------------------------------------------ */

export interface RosterTask {
  key: string;
  agent: string;
  role: string;
  note: string;
  produces: string;
}

/** Who is actually in a task list. MoonTech runs seven agents, but only
    the ones a given stage needs are put to work, so no heading may say
    how many there are — it asks the list. */
export const agentsIn = (tasks: RosterTask[]) => Array.from(new Set(tasks.map((t) => t.agent)));

const NUMBER_WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
/** Small counts read better as words in a sentence than as digits. */
export const countWord = (n: number) => NUMBER_WORD[n] ?? String(n);

/** "Four agents on your store" — the count is derived, never typed, so
    adding an agent to READ_TASKS or BUILD_TASKS moves the heading with
    it rather than leaving a number that used to be true. */
export function rosterTitle(tasks: RosterTask[], tail: string) {
  const n = agentsIn(tasks).length;
  const w = countWord(n);
  return `${w[0].toUpperCase()}${w.slice(1)} agent${n === 1 ? "" : "s"} ${tail}`;
}

export function TaskRoster({ tasks, done, live, title, framed = true }: {
  tasks: RosterTask[];
  done: string[];
  live: boolean;
  title: string;
  /** Off when the roster sits inside another card, as it does in the read. */
  framed?: boolean;
}) {
  const finished = new Set(done);
  /* Tasks are listed in the order the work runs, so the first one not yet
     done is the one being worked on right now. Everything after it is
     waiting, however many agents that spans. */
  const activeKey = live ? tasks.find((t) => !finished.has(t.key))?.key : undefined;
  /* One row per agent, not per task — each name once, with the tasks it
     owns collapsed into a count. */
  const byAgent = tasks.reduce<Record<string, { role: string; tasks: RosterTask[] }>>((acc, t) => {
    (acc[t.agent] ??= { role: t.role, tasks: [] }).tasks.push(t);
    return acc;
  }, {});

  const body = (
    <>
      <p className="flex items-center gap-2 px-4 pt-3 text-[10px] font-bold uppercase tracking-widest text-brand">
        {live ? <span aria-hidden className="working-ring h-3 w-3" /> : <Check size={11} weight="bold" aria-hidden />}
        {title}
      </p>
      <ul className="divide-y divide-hairline">
        {Object.entries(byAgent).map(([name, a]) => {
          const doneHere = a.tasks.filter((t) => finished.has(t.key));
          const current = a.tasks.find((t) => t.key === activeKey);
          const allDone = doneHere.length === a.tasks.length;
          const line = allDone
            ? a.tasks.map((t) => t.produces).join(" · ")
            : current
            ? `${current.note}…`
            : doneHere.length > 0
            ? doneHere.map((t) => t.produces).join(" · ")
            : live
            ? "Waiting to start"
            : "Did not get to this";
          return (
            <li key={name} className="flex items-start gap-3 px-4 py-2.5">
              {/* State, not identity. The initial in this circle was
                  the same letter for six of the seven agents, so it
                  identified nothing and read as an avatar for a person
                  who does not exist. What a brand wants from this
                  column is which row is moving: a ring that turns while
                  an agent works, a tick when it is finished, and an
                  empty outline for the ones still queued. */}
              <span
                aria-hidden
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                  allDone ? "bg-good/15 text-good-deep" : current ? "" : "border border-dashed border-black/15"
                }`}
              >
                {allDone ? <Check size={12} weight="bold" /> : current ? <span className="working-ring h-4 w-4" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-meta font-semibold text-ink">{name}</span>
                  <span className="text-[11px] text-ink-faint">{a.role}</span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-ink-soft">{line}</span>
              </span>
              <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-ink-faint">
                {doneHere.length}/{a.tasks.length}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );

  if (!framed) return <div className="border-b border-hairline bg-brand/[0.02]">{body}</div>;
  return <Card className="overflow-hidden">{body}</Card>;
}

/** The read's roster. `live` is what the stream says; if the caller does
    not know, an unfinished read is taken to be still running. */
export function AgentRoster({ read, live }: { read: BrandRead; live?: boolean }) {
  const running = live ?? read.done.length < READ_TASKS.length;
  return (
    <TaskRoster
      tasks={READ_TASKS}
      done={read.done}
      live={running}
      title={rosterTitle(READ_TASKS, running ? "on your store" : "read your store")}
      framed={false}
    />
  );
}

/* ------------------------------------------------------------------ */
/* The read, in the conversation                                       */
/*                                                                     */
/* The first thing the agent does is read the store, so it happens in   */
/* the thread rather than on a page the chat comes after. Layers land   */
/* as they are found; a layer that has not arrived is a pending row,    */
/* not an empty one.                                                    */
/* ------------------------------------------------------------------ */

/* Which agent owns a layer. The evidence under a value is attributed to
   the agent that gathered it, so the panel reads as work done rather
   than as a list of citations. */
const agentFor = (k: ReadLayerKey) => READ_TASKS.find((t) => t.key === k)?.agent ?? "An agent";

export function ReadBlock({ read, live }: { read: BrandRead | null; live: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!read) return null;
  const has = (k: ReadLayerKey) => read.done.includes(k);

  /* While the agents are working you see the agents, and nothing else.
     Showing findings underneath a roster that is still ticking asks a
     brand to read a document that is being written at the same time —
     and it gives away the answer before the work looks like work.
     The findings arrive when the reading stops. */
  if (live) {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
          <span aria-hidden className="working-ring h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-ink">{rosterTitle(READ_TASKS, "on your store")}</p>
            <p className="truncate text-[11px] text-ink-faint" dir="ltr">{read.url}</p>
          </div>
        </div>
        <AgentRoster read={read} live />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
        {read.identity?.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={read.identity.logo} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
        ) : (
          <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded bg-brand-100 text-[12px] font-bold text-brand">
            {read.identity?.name.value?.[0] ?? "?"}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">{read.identity?.name.value ?? read.url}</p>
          <p className="truncate text-[11px] text-ink-faint" dir="ltr">{read.url}</p>
        </div>
        <button onClick={() => openPanel("read")} className="shrink-0 text-[11px] font-semibold text-brand hover:underline">
          Full read
        </button>
      </div>

      <dl className="divide-y divide-hairline">
        {READ_ORDER.map((k) => {
          const src = has(k) ? srcFor(read, k) : undefined;
          const by = agentFor(k);
          if (!has(k)) return null;
          return (
            <div key={k} className="px-4 py-2.5">
              <div className="flex items-start gap-3">
                <dt className="w-[86px] shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  {LAYER_LABEL[k]}
                </dt>
                <dd className="min-w-0 flex-1">
                  <ReadValue read={read} k={k} compact />
                  {src && (
                    <>
                      <button
                        onClick={() => setOpen(open === k ? null : k)}
                        aria-expanded={open === k}
                        className="mt-1.5 text-[11px] font-medium text-brand hover:underline"
                      >
                        {open === k ? "Hide the evidence" : `Evidence · ${src.evidence.length} · found by ${by}`}
                      </button>
                      {open === k && (
                        <div className="mt-1.5 rounded-control border border-brand/15 bg-brand/[0.03] p-2.5">
                          <p className="text-[11px] leading-4 text-ink-soft">
                            {`${by} read this off ${src.evidence[0]?.label ?? "your store"}: `}{src.why}
                          </p>
                          <ul className="mt-1 divide-y divide-hairline">
                            {src.evidence.map((e) => <EvidenceRow key={e.id} e={e} />)}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>

      {read.eligibility && (
        <div className={`flex items-start gap-2 border-t px-4 py-3 ${
          read.eligibility.state === "ok" ? "border-good/20 bg-good/[0.05]" : "border-danger/20 bg-danger/[0.05]"
        }`}>
          {read.eligibility.state === "ok"
            ? <CheckCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-good-deep" aria-hidden />
            : <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-danger" aria-hidden />}
          <p className={`text-meta font-semibold leading-5 ${read.eligibility.state === "ok" ? "text-good-deep" : "text-danger"}`}>
            {read.eligibility.line.value}
          </p>
        </div>
      )}
    </Card>
  );
}

const LAYER_LABEL: Record<ReadLayerKey, string> = {
  identity: "Store", category: "Category", priceBand: "Prices", bestsellers: "Bestsellers",
  voice: "Voice", socials: "Social", markets: "Markets", seasonality: "Season", eligibility: "Eligible",
};

/* ------------------------------------------------------------------ */
/* Below the traffic floor                                             */
/* ------------------------------------------------------------------ */

export function RejectedBlock({ read }: { read: BrandRead }) {
  const e = read.eligibility;
  if (!e || e.state !== "short") return null;
  return (
    <div className="space-y-2.5">
      <Card className="p-4">
        <Eyebrow tone="good">What I learned anyway</Eyebrow>
        <ul className="mt-2 space-y-1.5">
          {(e.learned ?? []).map((l, i) => (
            <li key={i} className="flex gap-2 text-meta leading-5 text-ink-soft">
              <CheckCircle size={12} weight="fill" className="mt-1 shrink-0 text-good" aria-hidden />{l}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="border-danger/25 p-4">
        <Eyebrow tone="danger">What is missing</Eyebrow>
        {(e.missing ?? []).map((m) => (
          <div key={m.label} className="mt-2">
            <p className="flex flex-wrap items-baseline gap-x-2 text-meta text-ink-soft">
              <span className="font-medium text-ink">{m.label}</span>
              <span className="text-figure font-bold tabular-nums text-danger">{m.have.value}</span>
              <span>against <span className="font-semibold tabular-nums text-ink">{m.need}</span> needed</span>
            </p>
            <div className="mt-1.5 h-2 rounded-pill bg-track">
              <div
                className="keyline-grad h-full rounded-pill"
                style={{ width: `${Math.min(100, (parseFloat(String(m.have.value).replace(/,/g, "")) / parseFloat(m.need.replace(/,/g, ""))) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </Card>
      <Card className="p-4">
        <Eyebrow>The way back</Eyebrow>
        <ul className="mt-2 space-y-2.5">
          {(e.wayBack ?? []).map((w) => (
            <li key={w.label}>
              <p className="flex items-center gap-1.5 text-meta font-semibold text-ink">
                <Lightning size={11} weight="fill" className="shrink-0 text-brand" aria-hidden />{w.label}
              </p>
              <p className="mt-0.5 ps-4 text-meta leading-5 text-ink-soft">{w.detail}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The three phases                                                    */
/*                                                                     */
/* The whole campaign is three phases, shown together, because the      */
/* return a brand is buying comes from all three and not from the first  */
/* alone. But only Phase 1 is being started, so only Phase 1 carries     */
/* full weight. Phases 2 and 3 sit faded and folded to one line each —   */
/* enough to see the shape of the plan without the later numbers being   */
/* the thing the eye lands on — and open up on request. The same block   */
/* serves the thread and, in `compact`, the plan pane beside it.         */
/* ------------------------------------------------------------------ */

export function LadderBlock({ plan, onStart, paid = false, compact = false }: {
  plan: Plan;
  onStart?: () => void;
  paid?: boolean;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const rungs = plan.ladder.value;
  const totalBudget = rungs.reduce((n, r) => n + r.budget, 0);
  const totalRevenue = rungs.reduce((n, r) => n + r.budget * r.multiple, 0);
  const rowPad = compact ? "px-3 py-2.5" : "px-4 py-3.5";
  const headPad = compact ? "px-3 py-2.5" : "px-4 py-3";
  const circle = compact ? "h-6 w-6 text-[11px]" : "h-7 w-7 text-[12px]";

  return (
    <Card className="overflow-hidden">
      <div className={`border-b border-hairline ${headPad}`}>
        <Eyebrow>
          {paid
            ? "Your campaign — three phases, the first has started"
            : "The campaign we propose — three phases, you start the first"}
        </Eyebrow>
        {/* The offer is the price, so the price leads. There is nothing
            to size and nothing to negotiate: the warm-up is the same
            figure for every brand, and the two phases behind it are what
            it earns rather than what it commits you to. */}
        <p className={`mt-1.5 text-ink-soft ${compact ? "text-meta leading-5" : "text-body leading-6"}`}>
          {paid
            ? `Phase 1 has started, at the ${fmtUSD(PHASE1_BUDGET)} it costs every brand. Phases 2 and 3 are what it leads to, and you decide on each one only when it opens.`
            : `Start at ${fmtUSD(PHASE1_BUDGET)}. Phases 2 and 3 are what it leads to. The warm-up is ${fmtUSD(PHASE1_BUDGET)} for every brand and whichever of the three plans you pick, so there is no budget to agree before you begin — and nothing beyond Phase 1 is charged or committed.`}
        </p>
      </div>

      <ol className="divide-y divide-hairline">
        {rungs.map((r, i) => {
          if (i === 0) {
            /* Phase 1: full weight, full numbers. Each figure points at the
               plan value it is, so "why this number" opens the same
               arithmetic the plan card shows. */
            return (
              <li key={r.phaseNo} className="bg-brand/[0.04]">
                <div className={`flex items-start gap-3 ${rowPad}`}>
                  <span aria-hidden className={`mt-0.5 grid shrink-0 place-items-center rounded-full bg-brand font-bold text-white ${circle}`}>
                    {r.phaseNo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body font-semibold text-ink">{phaseTitle(r.phaseNo)}</p>
                      {paid ? <Pill tone="good">Started · paid</Pill> : <Pill tone="brand">Starts now</Pill>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                      <span className="text-meta text-ink-faint">
                        Budget <Figure src={plan.budget} render={fmtUSD(r.budget)} size="sm" />
                      </span>
                      <span className="text-meta text-ink-faint">
                        Guaranteed revenue <Figure src={plan.price.revenueTarget} render={fmtUSD(r.budget * r.multiple)} size="sm" />
                      </span>
                      <span className="text-meta text-ink-faint">
                        <Figure src={plan.guaranteedRoas} render={`${r.multiple}×`} size="sm" /> guaranteed
                      </span>
                    </div>
                    {!compact && <p className="mt-1 text-[11px] leading-4 text-ink-faint">{r.note}</p>}
                  </div>
                </div>
              </li>
            );
          }

          /* Phases 2 and 3: faded, and folded to one line until asked. The
             numbers are rough by design — they are priced for real only
             when the phase opens — and the line says so. */
          return (
            <li key={r.phaseNo} className="opacity-60">
              <div className={`flex items-start gap-3 ${rowPad}`}>
                <span aria-hidden className={`mt-0.5 grid shrink-0 place-items-center rounded-full bg-neutral-100 text-ink-faint ${circle}`}>
                  <LockSimple size={12} weight="fill" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body font-semibold text-ink-soft">{phaseTitle(r.phaseNo)}</p>
                    <Pill tone="muted">Offered after Phase {r.phaseNo - 1}</Pill>
                  </div>
                  {expanded ? (
                    <>
                      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                        <span className="text-meta text-ink-faint">
                          Budget <Figure src={plan.ladder} render={fmtUSD(r.budget)} size="sm" />
                        </span>
                        <span className="text-meta text-ink-faint">
                          Guaranteed revenue <Figure src={plan.ladder} render={fmtUSD(r.budget * r.multiple)} size="sm" />
                        </span>
                        <span className="text-meta text-ink-faint">
                          <Figure src={plan.ladder} render={`${r.multiple}×`} size="sm" /> guaranteed
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-ink-faint">{r.note}</p>
                    </>
                  ) : (
                    <div className="mt-1 text-meta text-ink-faint">
                      About <Figure src={plan.ladder} render={fmtUSD(r.budget)} size="sm" /> at{" "}
                      <Figure src={plan.ladder} render={`${r.multiple}×`} size="sm" /> — priced for real when it opens.
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className={`border-t border-hairline ${headPad}`}>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="text-meta font-semibold text-brand hover:underline"
        >
          {expanded ? "Show less on Phases 2 and 3" : "View Phases 2 and 3"}
        </button>
        {/* Spend against return, for the whole plan, so the first phase is
            never mistaken for the whole offer — and the warm-up figure
            beside it, so the total is never mistaken for the bill. It is
            summed from the rungs rather than typed, so it holds whatever
            Phases 2 and 3 turn out to be. */}
        <Claim src={plan.ladder} className="mt-2">
          All three phases: <span className="font-semibold tabular-nums text-ink">{fmtUSD(totalBudget)}</span> budget →{" "}
          <span className="font-semibold tabular-nums text-ink">{fmtUSD(totalRevenue)}</span> guaranteed, an average of{" "}
          <span className="font-semibold tabular-nums text-ink">
            {(totalBudget > 0 ? totalRevenue / totalBudget : 0).toFixed(1)}×
          </span>{" "}
          across the plan. Only the{" "}
          <span className="font-semibold tabular-nums text-ink">{fmtUSD(rungs[0]?.budget ?? PHASE1_BUDGET)}</span> warm-up is due today.
        </Claim>
      </div>

      {onStart && !paid && (
        <div className={`border-t border-hairline ${compact ? "p-3" : "p-4"}`}>
          <Btn className="w-full sm:w-auto" onClick={onStart}>
            Start Phase 1 — {fmtUSD(plan.price.total.value)}
          </Btn>
          <p className="mt-2 text-[11px] leading-4 text-ink-faint">
            You are committing to Phase 1 only. Nothing after it is charged, promised or scheduled, and you decide
            phase by phase whether to continue.
          </p>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Plan → payment → connection, as one card                            */
/*                                                                     */
/* Shown the moment payment clears. Two ticks and one open item, so the */
/* brand knows exactly how much is left: one step, and it is the one    */
/* that makes the guarantee measurable.                                 */
/* ------------------------------------------------------------------ */

export function ChecklistBlock() {
  const paid = usePaid();
  const connected = useStore((s) => s.connectedStore);
  const steps = [
    { label: "Campaign proposed and approved", detail: "Three phases planned. Phase 1 is the warm-up, and the only one you start today.", done: true },
    {
      label: `${phaseTitle(1)} paid`,
      detail: `The ${fmtUSD(PHASE1_BUDGET)} warm-up, the same price for every brand. MoonWriter AI is briefing your creators now.`,
      done: paid,
    },
    {
      label: "Store connected",
      detail: "The last step. It is how we count the revenue each creator earns you, which is what the guarantee is measured against.",
      done: !!connected,
    },
  ];
  return (
    <Card className="overflow-hidden">
      <p className="border-b border-hairline px-4 py-2.5 text-eyebrow font-semibold uppercase tracking-[0.14em] text-ink-faint">
        Where you are
      </p>
      <ol className="divide-y divide-hairline">
        {steps.map((st, i) => (
          <li key={st.label} className={`flex items-start gap-3 px-4 py-3 ${!st.done ? "bg-brand/[0.04]" : ""}`}>
            <span
              aria-hidden
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                st.done ? "bg-good text-white" : "border-2 border-brand text-brand"
              }`}
            >
              {st.done ? <Check size={12} weight="bold" /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-body font-semibold ${st.done ? "text-ink-soft line-through decoration-ink-faint/60" : "text-ink"}`}>
                {st.label}
              </span>
              <span className="block text-meta leading-5 text-ink-faint">{st.detail}</span>
            </span>
            {!st.done && <Pill tone="brand">Next</Pill>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Integration, after payment                                          */
/*                                                                     */
/* This runs AFTER the phase is paid for, because it exists to measure  */
/* the guarantee rather than to qualify the brand — the plan was built   */
/* from the public read and needed nothing from the store to be priced. */
/* A platform we support is one button and a visible handoff; anything  */
/* else is a person, and the form is built so the call can be planned   */
/* before it is made: phone first, then what the store is built on.     */
/* ------------------------------------------------------------------ */

export type StorePlatform = "salla" | "zid" | "shopify" | "magento";

interface IntegrationStep { label: string; detail: string }

interface Platform {
  key: StorePlatform;
  name: string;
  note: string;
  /** The button label. Salla, Zid and Shopify authorise; Magento connects. */
  cta: string;
  steps: IntegrationStep[];
}

/* The handoff, shown as steps. Same shape as authorising Slack into
   another tool: you leave, you sign in where your store lives, you
   approve a read-only scope, you come back. Shown rather than hidden
   behind a spinner, because a brand handing over store access should
   see exactly what it is handing over. */
const authSteps = (name: string): IntegrationStep[] => [
  { label: `Opening ${name}`, detail: `A ${name} window opens. MoonTech never sees what you type there.` },
  { label: `Sign in on ${name}`, detail: "Your own store login, on their page, not ours." },
  { label: "Authorise MoonTech — read-only", detail: "Orders and catalogue, nothing else. No payments, no edits, no customer details." },
  { label: "Back in MoonTech", detail: "Revenue against each creator's code starts flowing in." },
];

/* Magento has no sign-in handoff. It connects the way its own
   extensions do: install, paste a scoped key, done. */
const MAGENTO_STEPS: IntegrationStep[] = [
  { label: "Install the MoonTech extension", detail: "From the Magento Marketplace, inside your own admin. It reads orders and catalogue and nothing else." },
  { label: "Paste the read-only API key", detail: "Magento issues a key scoped to orders and catalogue. MoonTech never sees your admin login." },
  { label: "Back in MoonTech · connected", detail: "Revenue against each creator's code starts flowing in." },
];

const SUPPORTED: Platform[] = [
  { key: "salla", name: "Salla", note: "Authorises in one step", cta: "Authorise now", steps: authSteps("Salla") },
  { key: "zid", name: "Zid", note: "Authorises in one step", cta: "Authorise now", steps: authSteps("Zid") },
  { key: "shopify", name: "Shopify", note: "Shopify and Shopify Plus", cta: "Authorise now", steps: authSteps("Shopify") },
  { key: "magento", name: "Magento", note: "Connects with a read-only API key", cta: "Connect now", steps: MAGENTO_STEPS },
];
const platformOf = (k: StorePlatform) => SUPPORTED.find((p) => p.key === k) ?? SUPPORTED[0];

/* What a store we do not support out of the box might be built on. A
   chip, not a free-text field, so an engineer knows what they are
   walking into before the call. Magento is not here because it has its
   own button above. */
const SYSTEMS = [
  "Custom build",
  "Open source — PrestaShop, OpenCart or similar",
  "WordPress or WooCommerce",
  "Something else",
] as const;

export function IntegrationBlock({ onConnect }: { onConnect: (k: StorePlatform) => void }) {
  const connected = useStore((s) => s.connectedStore);
  const [other, setOther] = useState(false);
  const [sent, setSent] = useState(false);
  const [auth, setAuth] = useState<{ key: StorePlatform; step: number } | null>(null);
  const [form, setForm] = useState({ phone: "", system: "", detail: "", name: "", email: "" });
  /* Enough to plan the call: what the store runs on, and one way to
     reach the brand. A name helps and is not required. */
  const ready = !!form.system && !!(form.phone.trim() || form.email.trim());

  /* Advance the handoff one step at a time. Cancelling stops it where it
     is — nothing was authorised until the last step completes. */
  useEffect(() => {
    if (!auth) return;
    const steps = platformOf(auth.key).steps;
    if (auth.step >= steps.length) { onConnect(auth.key); setAuth(null); return; }
    const t = setTimeout(() => setAuth((a) => (a ? { ...a, step: a.step + 1 } : a)), 1100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.step, auth?.key]);

  if (connected) {
    const name = SUPPORTED.find((p) => p.key === connected)?.name ?? connected;
    /* The dashboard is offered here and nowhere earlier: this is the
       first moment there is nothing left to do in the thread. */
    return (
      <Card className="flex items-start gap-2.5 border-good/25 bg-good/[0.04] p-3.5">
        <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-good-deep" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-meta leading-5 text-ink-soft">
            <span className="font-semibold text-ink">{name} is connected, read-only.</span> From here every order
            that comes through a creator&apos;s code is counted automatically, which is what the guarantee is settled on.
            MoonScore AI watches which creators are converting and moves the warm-up budget towards them while the phase
            runs; MoonLearning AI keeps what it finds for your next campaign. You are good to go.
          </p>
          <button onClick={() => openPanel("campaign")} className="mt-3 inline-flex items-center gap-1.5 text-body font-semibold text-brand hover:underline">
          Open the dashboard <ArrowRight size={13} weight="bold" aria-hidden className="rtl:rotate-180" />
        </button>
        </div>
      </Card>
    );
  }

  if (auth) {
    const platform = platformOf(auth.key);
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <span aria-hidden className="working-ring h-3.5 w-3.5" />
          <p className="text-body font-semibold text-ink">Connecting {platform.name}</p>
          <button onClick={() => setAuth(null)} className="ms-auto text-meta font-semibold text-ink-faint hover:text-danger">
            Cancel
          </button>
        </div>
        <ol className="mt-3 space-y-2.5">
          {platform.steps.map((st, i) => {
            const done = i < auth.step;
            const now = i === auth.step;
            return (
              <li key={st.label} className={`flex items-start gap-3 ${!done && !now ? "opacity-45" : ""}`}>
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                    done ? "bg-good text-white" : now ? "bg-brand text-white" : "bg-neutral-100 text-ink-faint"
                  }`}
                >
                  {done ? <Check size={10} weight="bold" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-meta font-semibold ${now ? "text-brand" : "text-ink"}`}>{st.label}</span>
                  <span className="block text-[11px] leading-4 text-ink-faint">{st.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </Card>
    );
  }

  if (sent) {
    const system = form.system + (form.detail.trim() ? ` — ${form.detail.trim()}` : "");
    const lead = form.name.trim() ? `${form.name.trim()}, we` : "We";
    const phone = form.phone.trim();
    return (
      <Card className="border-good/25 bg-good/[0.04] p-4">
        <p className="flex items-center gap-2 text-body font-semibold text-good-deep">
          <CheckCircle size={15} weight="fill" aria-hidden />
          {phone ? "Logged. An engineer is calling you." : "Logged. An engineer will write to you."}
        </p>
        <p className="mt-1.5 text-meta leading-5 text-ink-soft">
          {phone
            ? `${lead} will call you on ${phone} within the hour. The engineer already has your ${system} details, so the call is about the connection plan rather than questions.`
            : `${lead} will email you on ${form.email.trim()} within one working day with a specific plan for connecting ${system}.`}{" "}
          Your phase is paid and your creators are being briefed; the campaign goes live the moment the connection is
          in place.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <p className="text-body font-semibold text-ink">Last step: connect your store</p>
      <p className="mt-1 text-meta leading-5 text-ink-soft">
        Your plan was built from what is public about your store, so this step does not decide whether you qualify — the{" "}
        {fmtUSD(PHASE1_BUDGET)} warm-up is already yours. Connecting is how we count the revenue each creator earns you,
        which is what the guarantee is measured against. It is read-only and takes one click.
      </p>

      {!other ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {SUPPORTED.map((p) => (
              <button
                key={p.key}
                onClick={() => setAuth({ key: p.key, step: 0 })}
                className="flex items-center gap-3 rounded-control border border-hairline bg-white p-3 text-start transition hover:border-brand/40 hover:shadow-card"
              >
                <Storefront size={17} weight="fill" className="shrink-0 text-brand" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-ink">{p.name}</span>
                  <span className="block text-[11px] text-ink-faint">{p.note}</span>
                </span>
                <span className="shrink-0 rounded-control bg-brand px-2.5 py-1.5 text-[11px] font-semibold text-white">{p.cta}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setOther(true)} className="mt-3 text-meta font-semibold text-brand hover:underline">
            My store is on something else
          </button>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-meta leading-5 text-ink-soft">
            We connect anything with an orders API by hand. Give us a number and we call you within the hour; tell us
            what the store is built on and the engineer arrives with a plan for it rather than questions.
          </p>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-ink">Phone or WhatsApp — we call you within the hour</span>
            <input
              type="tel"
              dir="ltr"
              value={form.phone}
              placeholder="+971…"
              onChange={(e) => setForm((st) => ({ ...st, phone: e.target.value }))}
              className="w-full rounded-control border border-brand/40 bg-white px-3 py-2 text-body text-ink outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/10"
            />
          </label>

          <div>
            <p className="mb-1 text-[11px] font-semibold text-ink-soft">What is your store built on?</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="What your store is built on">
              {SYSTEMS.map((s) => {
                const on = form.system === s;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setForm((st) => ({ ...st, system: s }))}
                    className={`rounded-pill border px-2.5 py-1 text-meta font-medium transition ${
                      on ? "border-brand bg-brand text-white" : "border-black/[0.09] bg-white text-ink-soft hover:border-brand/40"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {([
            { k: "detail" as const, label: "Anything that helps the engineer (optional)", ph: "The framework, the theme, the checkout — whatever you know", type: "text" },
            { k: "name" as const, label: "Your name (optional)", ph: "", type: "text" },
            { k: "email" as const, label: "Work email — if you would rather we write first", ph: "you@yourstore.com", type: "email" },
          ]).map((f) => (
            <label key={f.k} className="block">
              <span className="mb-1 block text-[11px] font-semibold text-ink-soft">{f.label}</span>
              <input
                type={f.type}
                dir={f.k === "email" ? "ltr" : undefined}
                value={form[f.k]}
                placeholder={f.ph}
                onChange={(e) => setForm((st) => ({ ...st, [f.k]: e.target.value }))}
                className="w-full rounded-control border border-black/[0.09] bg-white px-3 py-2 text-body text-ink outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              />
            </label>
          ))}

          <div className="flex flex-wrap gap-2 pt-1">
            <Btn size="sm" disabled={!ready} onClick={() => setSent(true)}>Send it to an engineer</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setOther(false)}>Back to the platforms</Btn>
          </div>
          {!ready && (
            <p className="text-[11px] leading-4 text-ink-faint">
              Pick what your store is built on and leave a phone number or an email, and the button unlocks.
            </p>
          )}
        </div>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-ink-faint">
        <LockSimple size={11} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
        It can never take a payment, change a product, publish anything, or see customer names and addresses.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Confidence, as a thing you can see                                  */
/*                                                                     */
/* The agent says the number in words; this is the same number with a  */
/* colour on it, so a brand can tell at a glance whether they are      */
/* being agreed with or warned. It has no controls — the two numbers   */
/* are set in the conversation — and it carries the pair it was drawn  */
/* for, so scrolling back shows what was true at the time.             */
/* ------------------------------------------------------------------ */

export function ConfidenceBar({ planBudget, roas }: { planBudget: number; roas: number }) {
  const conf = getConfidence(planBudget, roas);
  const tone: Record<ConfidenceLevel, { bar: string; text: string; ring: string }> = {
    high: { bar: "bg-good", text: "text-good-deep", ring: "border-good/25 bg-good/[0.05]" },
    medium: { bar: "bg-amber-500", text: "text-amber-700", ring: "border-amber-500/25 bg-amber-500/[0.07]" },
    low: { bar: "bg-danger", text: "text-danger", ring: "border-danger/25 bg-danger/[0.05]" },
  };
  const t = tone[conf.level];

  return (
    <div className={`rounded-control border px-3.5 py-3 ${t.ring}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={`text-body font-semibold ${t.text}`} role="status">{conf.label}</p>
        <p className="text-[11px] tabular-nums text-ink-faint">
          {fmtUSD(planBudget)} ÷ {roas}× = {Math.round(conf.ratio).toLocaleString("en-US")}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-pill bg-black/[0.07]">
        <div className={`h-full rounded-pill transition-all duration-500 ${t.bar}`} style={{ width: `${conf.pct}%` }} />
      </div>
      {/* The two thresholds, drawn where they actually sit, so the bar
          reads as a scale rather than as a mood. */}
      <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-ink-faint">
        <span>Low</span>
        <span>4,000 · medium</span>
        <span>12,000 · we commit</span>
      </div>
    </div>
  );
}
