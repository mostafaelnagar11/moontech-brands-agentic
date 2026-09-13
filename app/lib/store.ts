"use client";

/* Session state.

   One module store behind `useSyncExternalStore`, the same shape the
   current app uses for funding and ad decisions. It is deliberately IN
   MEMORY: a hard refresh restarts the demo rather than leaving a
   half-finished campaign in localStorage pretending to be a server.

   Deep links still work, because every tool is deterministic — a plan
   that is not in the store is rebuilt from its read id rather than
   404ing. See `planFor`.

   The two exceptions, both small and both honest about what they are:
   the interface language, and the autonomy settings. Those are
   preferences, and a preference should survive a reload. */

import { useSyncExternalStore } from "react";
import type {
  AdRecord, AdState, ApprovalRequest, BrandRead, Correction,
  FundingRequest, Plan,
} from "./agent/types";
import { rememberRead } from "./agent/registry";
import { ADS, PHASES, type Phase } from "./mock/campaigns";

/* ------------------------------------------------------------------ */
/* Thread blocks                                                       */
/*                                                                     */
/* The conversation is not a list of strings. Every turn is a typed     */
/* block, so a plan card in the thread is the same component as the     */
/* plan card on the proposal screen, reading the same object.           */
/* ------------------------------------------------------------------ */

export type ThreadItem =
  | { id: string; kind: "user"; text: string; at: number }
  | { id: string; kind: "say"; text: string; at: number; streaming?: boolean }
  | { id: string; kind: "plan-card"; at: number }
  | { id: string; kind: "creator-grid"; at: number }
  | { id: string; kind: "confidence"; at: number }
  | { id: string; kind: "brief-card"; at: number }
  | { id: string; kind: "changes"; changeIds: string[]; at: number }
  | { id: string; kind: "funding"; requestId: string; at: number }
  | { id: string; kind: "receipt"; requestId: string; at: number }
  | { id: string; kind: "report"; campaignId: string; at: number }
  | { id: string; kind: "ad-card"; adId: string; at: number }
  | { id: string; kind: "approval"; requestId: string; at: number }
  | { id: string; kind: "working"; note: string; done: number; total: number; at: number }
  /* The store read, as a card in the conversation. The read is the first
     thing the agent does, so it happens here rather than on a page the
     chat comes after. */
  | { id: string; kind: "read"; url: string; at: number }
  /* The three phases, shown before payment. There is deliberately no
     pre-payment "connect" block any more: the store connection comes
     after payment, because it measures the guarantee rather than
     qualifying the brand. */
  | { id: string; kind: "ladder"; at: number }
  /* Store integration, shown AFTER payment. */
  | { id: string; kind: "integration"; at: number }
  /* Plan done, payment done, connection next — the three steps as one card. */
  | { id: string; kind: "checklist"; at: number }
  /* The confidence in one budget-and-multiple pair, shown beside the
     sentence that states it. Read-only: it carries the two numbers the
     agent was talking about, so scrolling back shows what was true
     then rather than what is true now. */
  | { id: string; kind: "score"; planBudget: number; roas: number; at: number }
  /* The store that came in under the traffic floor. */
  | { id: string; kind: "rejected"; readId: string; at: number };

/* ------------------------------------------------------------------ */
/* Autonomy                                                            */
/* ------------------------------------------------------------------ */

export type AutonomyLevel = "alone" | "ask" | "never";

export interface AutonomyRule {
  key: string;
  label: string;
  detail: string;
  level: AutonomyLevel;
  /** Rules the brand cannot move. Money and publishing are fixed at
      "never" — that is the product's promise, not a preference. */
  locked?: boolean;
}

/* Every row names the agent it governs, because "the agent did it" is
   not an answer a brand can argue with and "MoonScore AI moved $340
   between two live ads" is. The three locked rows name an agent too —
   there, to say plainly which one is being held back. */
export const DEFAULT_AUTONOMY: AutonomyRule[] = [
  { key: "move-money", label: "Move money", detail: "Start a phase, take a payment, or change your card. No agent does this. MoonScore AI can only move budget you have already paid, inside the phase you paid it for.", level: "never", locked: true },
  { key: "publish", label: "Publish an ad", detail: "Put a creator's draft live on a platform. MoonLive AI is what publishes an ad, and it only ever publishes one you have approved.", level: "never", locked: true },
  { key: "contract", label: "Sign anything on your behalf", detail: "Agree terms with a creator or a platform. MoonMatch AI matches a creator and MoonSearch AI vets them, but neither can commit you to anything.", level: "never", locked: true },
  { key: "rebalance", label: "Shift budget between live creators", detail: "Move spend towards ads that are converting, inside the phase budget you already paid for. This is MoonScore AI, whose whole job is re-allocating budget to what converts.", level: "alone" },
  { key: "brief-tweak", label: "Tighten the brief mid-phase", detail: "Add a rule to the brief when drafts keep missing the same thing. MoonWriter AI wrote the brief, so it is the one that edits it.", level: "alone" },
  { key: "reorder", label: "Re-order the review queue", detail: "Put the drafts that matter most in front of you first. MoonSearch AI pushes anything that looks like a risk to the top; MoonScore AI pushes anything that looks like revenue.", level: "alone" },
  { key: "learn", label: "Learn from a finished phase", detail: "Feed what a phase actually sold back into how creators are matched, how the brief is written and where budget goes. This is MoonLearning AI, and it is why each phase starts better informed than the one before it.", level: "alone" },
  { key: "swap-creator", label: "Swap a creator who drops out", detail: "Replace a creator who cannot deliver with the next best match, inside the same phase budget. MoonMatch AI picks the replacement and MoonSearch AI vets them before they are offered to you.", level: "ask" },
  { key: "pause-ad", label: "Pause a live ad that is underperforming", detail: "Stop spend behind an ad, without unpublishing it. MoonScore AI asks for this when an ad is spending without converting.", level: "ask" },
  { key: "extend", label: "Extend the phase window", detail: "Give the phase more days to reach its target. MoonScore AI asks when the pace says the window was short rather than the work was wrong.", level: "ask" },
  { key: "email-creator", label: "Message a creator directly", detail: "Ask for a re-cut, or chase a late draft. MoonWriter AI writes the note, and you read it before it goes.", level: "ask" },
];

/* ------------------------------------------------------------------ */
/* Activity — what the agent did on its own                            */
/* ------------------------------------------------------------------ */

export interface ActivityEntry {
  id: string;
  at: number;
  /** The autonomy rule that permitted it. */
  ruleKey: string;
  /** Which of the seven agents did it. An autonomous action nobody owns
      is an action a brand cannot question, so every entry is signed. */
  agent: string;
  title: string;
  /** Why it did this, in one sentence. */
  because: string;
  /** What it changed, so undo has something to reverse. */
  effect: string;
  undone: boolean;
  undoable: boolean;
  /** Only when `undoable` is false: what reversing it would actually
      take, in the entry's own words rather than one sentence the log
      prints over every irreversible action. */
  undoNote?: string;
}

const now = Date.now();
const mins = (n: number) => now - n * 60_000;

export const SEED_ACTIVITY: ActivityEntry[] = [
  {
    id: "act-1", at: mins(41), ruleKey: "rebalance", agent: "MoonScore AI",
    title: "Moved $340 behind Noon Reviews' haul video",
    because: "Re-allocating budget to whatever is converting is MoonScore AI's entire job, and this was the clearest case in the phase: the haul was converting at 2.4× the phase median and still had budget left to spend, while two Story placements had spent 60% of theirs for a fifth of the revenue.",
    effect: "Phase 2 spend: −$180 from two Story placements, +$340 to the TikTok haul. Total phase budget unchanged.",
    undone: false, undoable: true,
  },
  {
    id: "act-2", at: mins(96), ruleKey: "reorder", agent: "MoonScore AI",
    title: "Put Mais Mustafa's trench draft at the top of your queue",
    because: "MoonWriter AI is holding that draft against the brief it wrote: it is the only one in the queue I would not approve, and it is also the oldest. What it is short of is the discount code, and the code is what attributes every order on this phase — so MoonScore AI moved it to the front on revenue rather than on tidiness, and deciding it now leaves room for a re-cut while the review window is still open.",
    effect: "Review queue order only. No decision was made on your behalf.",
    undone: false, undoable: true,
  },
  {
    id: "act-3", at: mins(210), ruleKey: "brief-tweak", agent: "MoonWriter AI",
    title: "Added a code-visibility rule to the Phase 2 brief",
    because: "MoonWriter AI wrote this brief and reads every draft back against it. Three of the last nine drafts held the discount code on screen for under three seconds. Attribution runs entirely through that code, so a short hold is lost revenue.",
    effect: "Brief now reads “hold the code on screen for at least five seconds”. Applies to drafts submitted from now on.",
    undone: false, undoable: true,
  },
  {
    id: "act-4", at: mins(1_450), ruleKey: "rebalance", agent: "MoonScore AI",
    title: "Held back $600 of Phase 2 budget",
    because: "Four of the eight creators on this phase had not submitted a draft yet, and MoonScore AI will not spend a creator's share before the work it pays for exists — doing so would have flattered the early numbers.",
    effect: "$600 reserved, released as drafts arrive. $410 of it has since been deployed.",
    undone: false, undoable: false,
    undoNote: "Not reversible from here: $410 of what was held has already gone out behind live ads. Ask me in the conversation and I will lay out what pulling the rest back would cost you.",
  },
  {
    /* The continuous learning loop, doing something a brand can see.
       MoonLearning AI is the only agent whose output is other agents:
       it reads a finished phase and changes how MoonMatch matches,
       how MoonWriter writes and where MoonScore puts money. */
    id: "act-5", at: mins(2_880), ruleKey: "learn", agent: "MoonLearning AI",
    title: "Stopped MoonMatch AI ranking your creators on follower count",
    because: "Phase 1 and the first weeks of Phase 2 say the same thing about your brand: the drafts that talk through sizing and fabric out-earn the ones that only style the piece, and audience size predicts almost none of it. Feeding a finished result back into the other agents is what MoonLearning AI is for, so the ranking now weights what actually converted on your store.",
    effect: "MoonMatch AI now ranks your matches on view-through and attributed orders rather than following, and MoonWriter AI's brief asks for sizing on camera by name — the ribbed-knit draft in your queue is the first one written to it. Nothing already live changed.",
    undone: false, undoable: false,
    undoNote: "Not reversible: this is something the other agents have learned, not a setting they hold. Setting “Learn from a finished phase” to Never stops the next update; it does not unlearn this one.",
  },
];

/* ------------------------------------------------------------------ */
/* The store                                                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* The panel                                                          */
/*                                                                     */
/* Every screen that used to be a route is now a view in one panel     */
/* beside the conversation. The chat can open one, the rail can open   */
/* one, and that is the whole navigation model.                        */
/* ------------------------------------------------------------------ */

export type PanelView =
  | "plan" | "read"
  /* The dashboard's own views. `home` is the overview the rail opens on;
     the rest are the running views. */
  | "home" | "campaign" | "ads" | "inbox" | "activity" | "autonomy";

/* A campaign, and the conversation that built it.

   The product ran on one of each for a while, and the rail that would
   have listed them was removed precisely because a list of one is
   furniture. It comes back the moment there is a second, which is the
   only honest trigger for it.

   A campaign OWNS its phases. They used to be a module-level fixture —
   one ladder for the whole app — which was fine while there was one
   campaign and wrong the instant there were two. */
export interface Campaign {
  id: string;
  /** The conversation that built it. One thread, one campaign. */
  threadId: string;
  brandName: string;
  /** What the brand chose to call this one, if they renamed it. */
  label?: string;
  url: string;
  readId: string | null;
  planId: string | null;
  /** This campaign's own three rungs. */
  phases: Phase[];
  /** Which ad ids belong to it. Empty until drafts arrive. */
  adIds: string[];
  createdAt: number;
  /** Payment and the store connection are per campaign. A second
      campaign is not paid for because the first one was. */
  paid: boolean;
  connectedStore: StorePlatform | null;
}

export type StorePlatform = "salla" | "zid" | "shopify" | "magento";

export interface State {
  panel: { view: PanelView; open: boolean };
  /* The dashboard's own view, kept apart from the panel's. They used
     to be one field with two owners, which meant moving around one
     surface silently rearranged the other — and armed a panel on it. */
  dashboardView: PanelView;
  /* Which read layer the panel should scroll to and open. Set when a
     brand taps a finding in the conversation; cleared once the panel
     has honoured it. */
  readFocus: string | null;
  /* How deep the Campaign view is: the list of campaigns, one campaign
     with its phases, or one phase. Held in the store rather than in the
     view so the sidebar and the assistant can move it too. */
  drill: { level: "list" | "campaign" | "phase"; phaseId: string | null };
  campaigns: Record<string, Campaign>;
  /** Newest last, so the rail reads in the order they were built. */
  campaignOrder: string[];
  activeCampaignId: string | null;
  reads: Record<string, BrandRead>;
  plans: Record<string, Plan>;
  activePlanId: string | null;
  /** One thread per campaign, keyed by the campaign's threadId. */
  threads: Record<string, ThreadItem[]>;
  activeThreadId: string;
  funding: Record<string, FundingRequest>;
  approvals: Record<string, ApprovalRequest>;
  ads: Record<string, AdState>;
  /** Ad id → the reason a decline carried, sent to the creator verbatim. */
  declineNotes: Record<string, string>;
  activity: ActivityEntry[];
  autonomy: AutonomyRule[];
  locale: "en" | "ar";
  dismissedInbox: string[];
}

/** The thread a conversation starts on before it has a campaign. */
export const FIRST_THREAD = "t-1";

const LOCALE_KEY = "mtab_locale";
const AUTONOMY_KEY = "mtab_autonomy";

function initial(): State {
  return {
    panel: { view: "plan", open: false },
    /* No seeded campaigns. The first one is the one the brand builds,
       and until then the dashboard says so rather than showing someone
       else's numbers. */
    campaigns: {},
    campaignOrder: [],
    activeCampaignId: null,
    reads: {},
    plans: {},
    activePlanId: null,
    threads: { [FIRST_THREAD]: [] },
    activeThreadId: FIRST_THREAD,
    funding: {},
    approvals: {},
    ads: Object.fromEntries(ADS.map((a) => [a.id, a.state])),
    declineNotes: {},
    activity: SEED_ACTIVITY,
    autonomy: DEFAULT_AUTONOMY,
    locale: "en",
    dismissedInbox: [],
    dashboardView: "home",
    readFocus: null,
    drill: { level: "list", phaseId: null },
  };
}

let state: State = initial();
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const l = localStorage.getItem(LOCALE_KEY);
    if (l === "ar" || l === "en") state = { ...state, locale: l };
    const a = localStorage.getItem(AUTONOMY_KEY);
    if (a) {
      const saved: Record<string, AutonomyLevel> = JSON.parse(a);
      state = {
        ...state,
        autonomy: state.autonomy.map((r) => (r.locked ? r : { ...r, level: saved[r.key] ?? r.level })),
      };
    }
  } catch {}
}

function subscribe(l: () => void) {
  hydrate();
  listeners.add(l);
  return () => { listeners.delete(l); };
}
const snap = () => state;
const serverSnap = () => SERVER_STATE;
const SERVER_STATE: State = initial();

function set(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
}

export function useStore<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => pick(snap()), () => pick(serverSnap()));
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

let seq = 0;
export const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${seq++}`;

export const putRead = (r: BrandRead) => {
  rememberRead(r);
  set((s) => ({ reads: { ...s.reads, [r.id]: r } }));
};

export const correctRead = (readId: string, c: Correction, apply: (r: BrandRead) => BrandRead) =>
  set((s) => {
    const r = s.reads[readId];
    if (!r) return {};
    const next = { ...apply(r), corrections: [...r.corrections, c] };
    rememberRead(next);
    return { reads: { ...s.reads, [readId]: next } };
  });

export const putPlan = (p: Plan, makeActive = true) =>
  set((s) => ({ plans: { ...s.plans, [p.id]: p }, activePlanId: makeActive ? p.id : s.activePlanId }));

export const setActivePlan = (id: string | null) => set({ activePlanId: id });

/* Omit across a union has to distribute, or every member collapses to
   the fields they share and a `text` becomes an unknown property. */
type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type NewThreadItem = DistOmit<ThreadItem, "id" | "at"> & { id?: string };

/** The items of whichever conversation is open. */
export const activeThread = (s: State) => s.threads[s.activeThreadId] ?? [];

export const push = (item: NewThreadItem) => {
  const full = { ...item, id: item.id ?? nextId(item.kind), at: Date.now() } as ThreadItem;
  set((s) => ({ threads: { ...s.threads, [s.activeThreadId]: [...(s.threads[s.activeThreadId] ?? []), full] } }));
  return full.id;
};

export const patchThread = (id: string, patch: Partial<ThreadItem>) =>
  set((s) => ({
    threads: {
      ...s.threads,
      [s.activeThreadId]: activeThread(s).map((t) => (t.id === id ? ({ ...t, ...patch } as ThreadItem) : t)),
    },
  }));

export const dropThread = (id: string) =>
  set((s) => ({
    threads: { ...s.threads, [s.activeThreadId]: activeThread(s).filter((t) => t.id !== id) },
  }));

export const resetThread = () =>
  set((s) => { claimed.clear(); return { threads: { ...s.threads, [s.activeThreadId]: [] } }; });

/* ------------------------------------------------------------------ */
/* Run once, and mean it                                               */
/*                                                                     */
/* React invokes an effect twice in development, and the second pass   */
/* re-reads state from the first pass's closure — so a `status !==      */
/* "idle"` check does not stop a second run, and both runs then report  */
/* their result. That is how one read produced two identical answers.   */
/*                                                                      */
/* A module-level claim is outside React's lifecycle entirely, so it    */
/* holds however many times the component mounts. Cleared when the      */
/* conversation is reset, so starting over genuinely starts over.       */
/* ------------------------------------------------------------------ */
const claimed = new Set<string>();

/** True the first time it is called with a given key, false after. */
export function claimOnce(key: string): boolean {
  if (claimed.has(key)) return false;
  claimed.add(key);
  return true;
}

/** Whether the thread is still empty, read live rather than from a
    captured render value — a mount effect that checks the rendered
    `thread` runs twice in development and opens the conversation twice. */
export const threadIsEmpty = () => activeThread(state).length === 0;

/** The active plan, read live for the same reason as `threadIsEmpty`: a
    mount effect that trusts the rendered value can see the server
    snapshot (no plan) and start a build over a plan that already exists,
    wiping every edit the brand has made to it. */
export const activePlanLive = (): Plan | null =>
  state.activePlanId ? state.plans[state.activePlanId] ?? null : null;

/* A request id is derived from the plan and the phase, so pressing Start
   a second time produces the SAME id. Letting a fresh "pending" request
   land on top of a confirmed one would un-pay the phase — the crew would
   re-hide and the Start button would come back. A payment that has been
   made stays made. */
export const putFunding = (r: FundingRequest) =>
  set((s) => (s.funding[r.id]?.state === "confirmed" ? {} : { funding: { ...s.funding, [r.id]: r } }));

/** The only place a payment is recorded, and it is only ever reachable
    from an explicit click on the confirmation block. */
export const confirmFunding = (id: string) =>
  set((s) => {
    const r = s.funding[id];
    if (!r || r.state !== "pending") return {};
    return { funding: { ...s.funding, [id]: { ...r, state: "confirmed" } } };
  });

export const cancelFunding = (id: string) =>
  set((s) => {
    const r = s.funding[id];
    if (!r || r.state !== "pending") return {};
    return { funding: { ...s.funding, [id]: { ...r, state: "cancelled" } } };
  });

export const putApproval = (r: ApprovalRequest) =>
  set((s) => ({ approvals: { ...s.approvals, [r.id]: r } }));

export const setApprovalState = (id: string, st: ApprovalRequest["state"]) =>
  set((s) => (s.approvals[id] ? { approvals: { ...s.approvals, [id]: { ...s.approvals[id], state: st } } } : {}));

/** The only place an ad changes state. Approving is what publishes, and
    it is always a brand action — no tool can reach this. */
export const setAdState = (adId: string, st: AdState, note?: string) =>
  set((s) => ({
    ads: { ...s.ads, [adId]: st },
    declineNotes:
      st === "declined" && note
        ? { ...s.declineNotes, [adId]: note }
        : Object.fromEntries(Object.entries(s.declineNotes).filter(([k]) => k !== adId)),
  }));

export const setAutonomy = (key: string, level: AutonomyLevel) =>
  set((s) => {
    const autonomy = s.autonomy.map((r) => (r.key === key && !r.locked ? { ...r, level } : r));
    try {
      localStorage.setItem(
        AUTONOMY_KEY,
        JSON.stringify(Object.fromEntries(autonomy.filter((r) => !r.locked).map((r) => [r.key, r.level])))
      );
    } catch {}
    return { autonomy };
  });

export const undoActivity = (id: string) =>
  set((s) => ({ activity: s.activity.map((a) => (a.id === id && a.undoable ? { ...a, undone: true } : a)) }));

export const redoActivity = (id: string) =>
  set((s) => ({ activity: s.activity.map((a) => (a.id === id ? { ...a, undone: false } : a)) }));

export const setLocale = (l: "en" | "ar") => {
  try { localStorage.setItem(LOCALE_KEY, l); } catch {}
  set({ locale: l });
};

/* ------------------------------------------------------------------ */
/* Campaigns                                                           */
/* ------------------------------------------------------------------ */

/** Start a new conversation. It has no campaign yet — the campaign is
    minted when the plan is built — but it has a thread of its own, so
    building a second one never writes into the first one's transcript. */
export const startConversation = (): string => {
  const id = nextId("t");
  claimed.clear();
  set((s) => ({
    threads: { ...s.threads, [id]: [] },
    activeThreadId: id,
    /* A new conversation is not about the campaign you were looking
       at, so nothing from it should be on screen. */
    activePlanId: null,
    activeCampaignId: null,
    panel: { view: "plan", open: false },
  }));
  return id;
};

export const openConversation = (threadId: string) =>
  set((s) => {
    claimed.clear();
    const c = Object.values(s.campaigns).find((x) => x.threadId === threadId) ?? null;
    return {
      activeThreadId: threadId,
      activeCampaignId: c?.id ?? null,
      activePlanId: c?.planId ?? s.activePlanId,
      panel: { view: "plan", open: false },
    };
  });

/** Mint the campaign this conversation is building, or update it. The
    plan is the thing that makes a campaign real — before there is one
    there is only a read and a conversation about it. */
export const putCampaign = (plan: Plan, url?: string) =>
  set((s) => {
    const existing = Object.values(s.campaigns).find((c) => c.threadId === s.activeThreadId);
    if (existing) {
      const next = { ...existing, planId: plan.id, readId: plan.readId, brandName: plan.brandName };
      return { campaigns: { ...s.campaigns, [existing.id]: next }, activeCampaignId: existing.id };
    }
    const id = nextId("camp");
    /* The FIRST campaign adopts the demo's running ladder and its ads,
       so the dashboard has a phase in flight to show. Every one after
       it starts where a real second campaign starts: phase 1 about to
       run, nothing attributed, no drafts in yet. */
    const first = s.campaignOrder.length === 0;
    const camp: Campaign = {
      id,
      threadId: s.activeThreadId,
      brandName: plan.brandName,
      url: url ?? plan.brandName,
      readId: plan.readId,
      planId: plan.id,
      phases: first ? PHASES : freshLadder(id, plan),
      adIds: first ? ADS.map((a) => a.id) : [],
      createdAt: Date.now(),
      paid: false,
      connectedStore: null,
    };
    return {
      campaigns: { ...s.campaigns, [id]: camp },
      campaignOrder: [...s.campaignOrder, id],
      activeCampaignId: id,
    };
  });

/** A campaign's own three rungs, taken from its plan's ladder. Nothing
    has run yet, so every figure that measures running is zero. */
function freshLadder(campId: string, plan: Plan): Phase[] {
  return plan.ladder.value.map((r, i) => ({
    id: `${campId}-p${r.phaseNo}`,
    phaseNo: r.phaseNo,
    status: i === 0 ? ("ready" as const) : ("locked" as const),
    start: null,
    end: null,
    budget: r.budget,
    guaranteedRoas: r.multiple,
    rev: 0,
    revTarget: i === 0 ? Math.round(r.budget * r.multiple) : null,
    dayOfPhase: null,
    plannedDays: 30,
    creators: i === 0 ? plan.creators.value.length : null,
  }));
}


/** Phase 1 is paid for. On a campaign with a fresh ladder that also
    starts the first rung running. */
export const markPaid = () =>
  set((s) => {
    const id = s.activeCampaignId;
    const c = id ? s.campaigns[id] : null;
    if (!id || !c) return {};
    const phases = c.phases.map((p, i) =>
      i === 0 && p.status === "ready"
        ? { ...p, status: "live" as const, dayOfPhase: 1 }
        : p
    );
    return { campaigns: { ...s.campaigns, [id]: { ...c, paid: true, phases } } };
  });

export const connectStore = (which: StorePlatform) =>
  set((s) => (s.activeCampaignId ? patchCampaignIn(s, s.activeCampaignId, { connectedStore: which }) : {}));

const patchCampaignIn = (s: State, id: string, patch: Partial<Campaign>) => ({
  campaigns: { ...s.campaigns, [id]: { ...s.campaigns[id], ...patch } },
});

/** Switching campaign carries the conversation with it. The two
    surfaces read the same campaign or they disagree: picking Luna on
    the dashboard and then opening the chat would otherwise land you in
    the thread that built Ounass. */
export const setActiveCampaign = (id: string) =>
  set((s) => {
    const c = s.campaigns[id];
    if (!c) return {};
    claimed.clear();
    return { activeCampaignId: id, activePlanId: c.planId ?? null, activeThreadId: c.threadId };
  });

/* Cached against the two fields it is built from.

   `useSyncExternalStore` compares snapshots by identity, so a selector
   that maps an array returns a new one every time it is called and the
   store loops forever. This project has been bitten by exactly this
   once before, in `adsWithState`, and the fix is the same: derive
   once, hand back the same reference until an input actually changes. */
let campCache: { order: State["campaignOrder"]; map: State["campaigns"]; value: Campaign[] } | null = null;
function campaignList(s: State): Campaign[] {
  if (campCache && campCache.order === s.campaignOrder && campCache.map === s.campaigns) return campCache.value;
  const value = s.campaignOrder.map((id) => s.campaigns[id]).filter(Boolean);
  campCache = { order: s.campaignOrder, map: s.campaigns, value };
  return value;
}
/** Rename a campaign. Two campaigns built from the same store carry
    the same brand name and are otherwise indistinguishable in a list —
    "Ounass" and "Ounass" — so the name has to be the brand's to set.
    An empty name falls back to the brand rather than leaving a blank
    row. */
export const renameCampaign = (id: string, name: string) =>
  set((s) => {
    const c = s.campaigns[id];
    if (!c) return {};
    const trimmed = name.trim().slice(0, 60);
    return { campaigns: { ...s.campaigns, [id]: { ...c, label: trimmed || undefined } } };
  });

/** What to call it: the brand's name for it, or the brand. */
export const campaignLabel = (c: Campaign) => c.label ?? c.brandName;

export const useCampaigns = () => useStore(campaignList);

export const useDrill = () => useStore((s) => s.drill);
export const showCampaignList = () => set({ drill: { level: "list", phaseId: null } });
export const openCampaign = (id: string) =>
  set((s) => {
    const c = s.campaigns[id];
    if (!c) return {};
    claimed.clear();
    return {
      activeCampaignId: id,
      activePlanId: c.planId ?? null,
      activeThreadId: c.threadId,
      drill: { level: "campaign" as const, phaseId: null },
      dashboardView: "campaign" as PanelView,
    };
  });
export const openPhase = (phaseId: string) => set({ drill: { level: "phase", phaseId } });
export const useActiveCampaign = () => useStore((s) => (s.activeCampaignId ? s.campaigns[s.activeCampaignId] ?? null : null));
export const useActiveThreadId = () => useStore((s) => s.activeThreadId);
export const activeCampaignLive = () => (state.activeCampaignId ? state.campaigns[state.activeCampaignId] ?? null : null);

/** This campaign's phases, and the one running. Everything on the
    dashboard reads through these rather than through the module-level
    fixture, which was one ladder for the whole app — correct while
    there was one campaign, wrong the instant there were two. */
const NO_PHASES: Phase[] = [];
export const useCampaignPhases = () =>
  useStore((s) => (s.activeCampaignId ? s.campaigns[s.activeCampaignId]?.phases ?? NO_PHASES : NO_PHASES));
export const useLivePhase = () =>
  useStore((s) => {
    const c = s.activeCampaignId ? s.campaigns[s.activeCampaignId] : null;
    return c?.phases.find((p) => p.status === "live") ?? null;
  });
export const useReadyPhase = () =>
  useStore((s) => {
    const c = s.activeCampaignId ? s.campaigns[s.activeCampaignId] : null;
    return c?.phases.find((p) => p.status === "ready") ?? null;
  });

export const dismissInbox = (id: string) =>
  set((s) => ({ dismissedInbox: [...s.dismissedInbox, id] }));

/* ------------------------------------------------------------------ */
/* Derived                                                             */
/* ------------------------------------------------------------------ */

/* A `useSyncExternalStore` snapshot has to be referentially stable, or
   React re-renders forever. This derivation builds a new array, so it is
   cached against the identity of the slice it depends on — the cache
   invalidates exactly when a decision changes and never otherwise. */
let adsCache: { key: State["ads"]; value: AdRecord[] } | null = null;
export function adsWithState(s: State): AdRecord[] {
  if (adsCache && adsCache.key === s.ads) return adsCache.value;
  const value = ADS.map((a) => ({ ...a, state: s.ads[a.id] ?? a.state }));
  adsCache = { key: s.ads, value };
  return value;
}

export const useAds = () => useStore(adsWithState);

/* ------------------------------------------------------------------ */
/* Panel actions                                                       */
/* ------------------------------------------------------------------ */

export const usePanel = () => useStore((s) => s.panel);

export const openPanel = (view: PanelView) => set({ panel: { view, open: true } });
export const closePanel = () => set((s) => ({ panel: { ...s.panel, open: false } }));
export const setPanelView = (view: PanelView) => set((s) => ({ panel: { view, open: s.panel.open } }));

/* The dashboard's view. Separate setter, separate field: nothing here
   can open, close or repoint the conversation's panel. */
export const useDashboardView = () => useStore((s) => s.dashboardView);
export const setDashboardView = (view: PanelView) => set({ dashboardView: view });

/* Open the read panel on one layer. Tapping a finding in the thread is
   the fastest correction path there is: the brand is already looking
   at the thing that is wrong. */
/** Is there a live payment request for this plan's Phase 1 — one the
    brand is looking at right now, or has already confirmed? The ladder
    uses it to stand its own "Start Phase 1" button down: two buttons
    for the same payment, one of them above the card that is asking for
    it, is one button too many. */
export const usePhaseRequested = (planId: string | undefined, phaseNo: number) =>
  useStore((s) =>
    !!planId &&
    Object.values(s.funding).some(
      (f) => f.planId === planId && f.phaseNo === phaseNo && f.state !== "cancelled"
    )
  );

export const useReadFocus = () => useStore((s) => s.readFocus);
export const focusReadLayer = (k: string) => set({ panel: { view: "read", open: true }, readFocus: k });
export const clearReadFocus = () => set({ readFocus: null });

/** Has THIS campaign's Phase 1 been paid for? Everything held back
    before payment — creator identities, the integration step — keys
    off it, and it is per campaign: a second one is not paid for
    because the first was. */
export const usePaid = () =>
  useStore((s) => (s.activeCampaignId ? s.campaigns[s.activeCampaignId]?.paid ?? false : false));
export const useActivePlan = () => useStore((s) => (s.activePlanId ? s.plans[s.activePlanId] ?? null : null));
export const useLocale = () => useStore((s) => s.locale);
export const useAutonomy = () => useStore((s) => s.autonomy);
export const useActivity = () => useStore((s) => s.activity);
