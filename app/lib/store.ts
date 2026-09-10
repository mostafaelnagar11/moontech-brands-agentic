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
import { ADS } from "./mock/campaigns";

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

export type PanelView = "plan" | "read" | "campaign" | "ads" | "inbox" | "activity" | "autonomy";

export interface Conversation {
  id: string;
  title: string;
  sub: string;
  active: boolean;
}

export interface State {
  panel: { view: PanelView; open: boolean };
  conversations: Conversation[];
  reads: Record<string, BrandRead>;
  plans: Record<string, Plan>;
  activePlanId: string | null;
  thread: ThreadItem[];
  funding: Record<string, FundingRequest>;
  approvals: Record<string, ApprovalRequest>;
  ads: Record<string, AdState>;
  /** Ad id → the reason a decline carried, sent to the creator verbatim. */
  declineNotes: Record<string, string>;
  activity: ActivityEntry[];
  autonomy: AutonomyRule[];
  locale: "en" | "ar";
  connectedStore: "salla" | "zid" | "shopify" | "magento" | null;
  dismissedInbox: string[];
}

const LOCALE_KEY = "mtab_locale";
const AUTONOMY_KEY = "mtab_autonomy";

function initial(): State {
  return {
    panel: { view: "plan", open: false },
    conversations: [
      { id: "c1", title: "Ounass", sub: "Luxury fashion · Phase 1 proposed", active: true },
      { id: "c2", title: "Luna Beauty", sub: "Own-label beauty · read only", active: false },
      { id: "c3", title: "FreshGrocer", sub: "Below the traffic floor", active: false },
    ],
    reads: {},
    plans: {},
    activePlanId: null,
    thread: [],
    funding: {},
    approvals: {},
    ads: Object.fromEntries(ADS.map((a) => [a.id, a.state])),
    declineNotes: {},
    activity: SEED_ACTIVITY,
    autonomy: DEFAULT_AUTONOMY,
    locale: "en",
    connectedStore: null,
    dismissedInbox: [],
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

export const push = (item: NewThreadItem) => {
  const full = { ...item, id: item.id ?? nextId(item.kind), at: Date.now() } as ThreadItem;
  set((s) => ({ thread: [...s.thread, full] }));
  return full.id;
};

export const patchThread = (id: string, patch: Partial<ThreadItem>) =>
  set((s) => ({ thread: s.thread.map((t) => (t.id === id ? ({ ...t, ...patch } as ThreadItem) : t)) }));

export const dropThread = (id: string) =>
  set((s) => ({ thread: s.thread.filter((t) => t.id !== id) }));

export const resetThread = () => { claimed.clear(); set({ thread: [] }); };

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
export const threadIsEmpty = () => state.thread.length === 0;

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

export const connectStore = (which: "salla" | "zid" | "shopify" | "magento") => set({ connectedStore: which });

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

export const useConversations = () => useStore((s) => s.conversations);

/** Has the brand started Phase 1? Everything that is held back before
    payment — creator identities, the integration step — keys off this. */
export const usePaid = () =>
  useStore((s) => Object.values(s.funding).some((f) => f.state === "confirmed"));
export const useActivePlan = () => useStore((s) => (s.activePlanId ? s.plans[s.activePlanId] ?? null : null));
export const useLocale = () => useStore((s) => s.locale);
export const useAutonomy = () => useStore((s) => s.autonomy);
export const useActivity = () => useStore((s) => s.activity);
