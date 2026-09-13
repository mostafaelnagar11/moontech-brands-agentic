import type { Phase } from "../mock/campaigns";
/* ══════════════════════════════════════════════════════════════════
   THE AGENT BOUNDARY
   ══════════════════════════════════════════════════════════════════

   Everything the UI knows about the agent is in this file. The screens
   import types and call `AgentTools`; they never import the mock
   implementation. Swapping in a real model means providing another
   object that satisfies `AgentTools` — no screen changes.

   Two rules are encoded in the types rather than left to discipline:

   1. EVERY FIGURE CARRIES ITS SOURCE. A number reaches the UI as a
      `Sourced<number>`, never as a bare number. There is no way to put
      an unsourceable figure on screen without writing `evidence: []`,
      which the `<Figure>` component refuses to render.

   2. NOTHING IRREVERSIBLE HAPPENS IN A TOOL. `request_funding` and
      `request_approval` return a REQUEST. They do not move money and
      they do not publish. Only an explicit brand action on the returned
      request can do that, and that action lives in the store, not here.
   ══════════════════════════════════════════════════════════════════ */

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

export type EvidenceKind =
  | "page"        // something read off the store
  | "product"     // a catalogue item
  | "social"      // a public profile or post
  | "orders"      // the brand's own connected order data
  | "platform"    // HeyMoon's own records
  | "benchmark"   // other brands, anonymised
  | "creator"     // a creator's profile numbers
  | "policy";     // a rule of the product

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  /** What it is, short enough for a chip: "ounass.com/new-in". */
  label: string;
  /** What it showed: "42 of 60 items priced 400–1,900 AED". */
  detail: string;
  /** When it was observed, as display text. */
  at?: string;
  href?: string;
}

/** A value the UI is allowed to display, because it can say where it
    came from. `why` is the sentence behind "Why this number". */
export interface Sourced<T> {
  value: T;
  why: string;
  evidence: Evidence[];
  /** Set when the value is arithmetic on other sourced values. */
  computedFrom?: string;
  /** Who put this value here. A brand edit outranks an agent proposal. */
  setBy: "agent" | "brand";
}

export const sourced = <T,>(
  value: T,
  why: string,
  evidence: Evidence[],
  extra?: { computedFrom?: string; setBy?: "agent" | "brand" }
): Sourced<T> => ({ value, why, evidence, setBy: "agent", ...extra });

/* ------------------------------------------------------------------ */
/* The brand read                                                      */
/* ------------------------------------------------------------------ */

export type ReadLayerKey =
  | "identity"
  | "category"
  | "priceBand"
  | "bestsellers"
  | "voice"
  | "socials"
  | "markets"
  | "seasonality"
  | "eligibility";

export interface Bestseller {
  name: string;
  price: string;
  note: string;
  img?: string;
}

export interface SocialAccount {
  platform: "Instagram" | "TikTok" | "YouTube" | "Snapchat" | "X";
  handle: string;
  followers: number;
  note: string;
}

export interface MarketRead {
  code: "AE" | "SA" | "KW" | "QA" | "BH" | "OM";
  name: string;
  share: number; // % of traffic or orders
  note: string;
}

export interface SeasonPeak {
  label: string;
  window: string;
  lift: string;
  note: string;
}

/** One correction a brand made to the read. The agent's own value is
    kept beside it, so the plan can always say what it originally
    believed and what it was told. */
export interface Correction {
  layer: ReadLayerKey;
  field: string;
  was: string;
  now: string;
  at: number;
}

export interface Eligibility {
  /** `ok` runs a campaign. `short` is the rejected state. */
  state: "ok" | "short";
  /** The one-line form that sits inside the read, not as a gate. */
  line: Sourced<string>;
  /** Only on `short`: what we learned, what is missing, the way back. */
  learned?: string[];
  missing?: { label: string; have: Sourced<string>; need: string }[];
  wayBack?: { label: string; detail: string }[];
}

export interface BrandRead {
  id: string;
  url: string;
  /** Layers arrive one at a time and out of order. A key absent from
      `done` has not arrived yet — the UI must render that as pending,
      not as empty. */
  done: ReadLayerKey[];
  identity?: { name: Sourced<string>; logo?: string; tagline: Sourced<string> };
  category?: Sourced<string>;
  priceBand?: Sourced<{ low: number; high: number; median: number; currency: string }>;
  bestsellers?: Sourced<Bestseller[]>;
  voice?: Sourced<{ words: string[]; sample: string; register: string }>;
  socials?: Sourced<SocialAccount[]>;
  markets?: Sourced<MarketRead[]>;
  seasonality?: Sourced<SeasonPeak[]>;
  eligibility?: Eligibility;
  corrections: Correction[];
}

/* ------------------------------------------------------------------ */
/* The plan                                                            */
/*                                                                     */
/* ONE object. The conversation edits it, the manual path edits it, the */
/* proposal screen renders it. There is no second wizard shape and no   */
/* read-only copy — "adjust manually" is this same object with every    */
/* field editable, which is the whole point.                            */
/* ------------------------------------------------------------------ */

export type StrategyKey = "steady" | "balanced" | "aggressive";

export interface Strategy {
  key: StrategyKey;
  name: string;
  multiple: number;
  blurb: string;
  budget: number;
  expected: { low: number; high: number };
  downside: string;
  confidence: number; // 0..1
}

export interface Audience {
  gender: "all" | "female" | "male";
  ageLow: number;
  ageHigh: number;
  interests: string[];
}

export interface CreatorMatch {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  platform: "Instagram" | "TikTok" | "YouTube";
  followers: number;
  viewThrough: number;
  gulfShare: number;
  niche: string;
  conflict: string | null;
  /** Why this person, for this plan. Never a generic sentence. */
  reasons: Sourced<string>[];
  /** What would make them a worse fit. Shown, not hidden. */
  caveat?: string;
}

export interface BriefDraft {
  headline: Sourced<string>;
  mustSay: Sourced<string[]>;
  mustNotSay: Sourced<string[]>;
  formats: Sourced<string[]>;
  tone: Sourced<string>;
}

export interface LadderRung {
  phaseNo: number;
  budget: number;
  multiple: number;
  state: "proposed" | "funding" | "live" | "locked" | "ended";
  note: string;
}

export interface PriceQuote {
  budget: Sourced<number>;
  /** What the whole crew is paid, as one number. Never per person — a
      price beside a creator is against the premise of the product. */
  crewCost: Sourced<number>;
  vat: Sourced<number>;
  total: Sourced<number>;
  revenueTarget: Sourced<number>;
  unlockAt: Sourced<number>;
  expected: Sourced<{ low: number; high: number }>;
  downside: Sourced<string>;
}

export interface Plan {
  id: string;
  readId: string;
  brandName: string;
  strategy: Sourced<StrategyKey>;
  markets: Sourced<string[]>;
  audience: Sourced<Audience>;
  /** What Phase 1 costs. Always the $1,000 warm-up. */
  budget: Sourced<number>;
  /** What the whole three-phase campaign is sized at. This is the
      number the brand sets on the calculator, and the one confidence
      is measured against — Phase 1 is a fixed slice of it. */
  planBudget: Sourced<number>;
  guaranteedRoas: Sourced<number>;
  creators: Sourced<CreatorMatch[]>;
  /** How many creators HeyMoon matched and HeyMoon cleared,
      before the fixed warm-up budget cut `creators` down to the crew it
      pays for. A field rather than a number inside a sentence: the
      sentence gets rewritten on every edit, and the count went with it.
      The rest of this pool is what Phases 2 and 3 draw on. */
  pool: Sourced<number>;
  brief: Sourced<BriefDraft>;
  ladder: Sourced<LadderRung[]>;
  price: PriceQuote;
  /** Every change since the plan was proposed, most recent last. */
  changes: PlanChange[];
}

export type PlanField =
  | "strategy" | "markets" | "audience" | "budget"
  | "guaranteedRoas" | "creators" | "brief" | "planBudget";

export interface PlanChange {
  id: string;
  field: PlanField;
  label: string;   // "budget"
  from: string;    // "$10,000"
  to: string;      // "$6,000"
  /** The attribution line: "because you said Kuwait only". */
  because: string;
  /** Anything that names a person — which creators came in or went out.
      Kept apart from `to` so it can be withheld until the phase is paid. */
  detail?: string;
  by: "agent" | "brand";
  at: number;
}

export interface PlanPatch {
  strategy?: StrategyKey;
  /** The whole-plan budget from the calculator. */
  planBudget?: number;
  markets?: string[];
  audience?: Partial<Audience>;
  budget?: number;
  guaranteedRoas?: number;
  dropCreatorIds?: number[];
  addCreatorIds?: number[];
  /** The crew is exactly this. Used when the agent proposes a repaired
      plan as a whole, so a market change cannot re-widen the shortlist
      underneath it. */
  setCrewIds?: number[];
  brief?: Partial<{ headline: string; mustSay: string[]; mustNotSay: string[]; formats: string[]; tone: string }>;
}

/* ------------------------------------------------------------------ */
/* Running                                                             */
/* ------------------------------------------------------------------ */

export interface ReportFigure {
  key: string;
  label: string;
  value: Sourced<string>;
  /** The card in the UI this figure links back to. */
  cardRef: string;
}

export interface Report {
  campaignId: string;
  question?: string;
  headline: string;
  figures: ReportFigure[];
  pace: Sourced<{ pctNow: number; pctForecast: number; daysToUnlock: number | null; onPace: boolean }>;
  narrative: string;
}

export type AdState = "waiting" | "approved" | "declined" | "live";

export interface AdCheck {
  label: string;
  detail: string;
  clean: boolean;
}

export interface AdRecord {
  id: string;
  campaignId: string;
  creatorId: number;
  creatorName: string;
  avatar: string;
  product: string;
  caption: string;
  format: "Reel" | "Video" | "Story" | "Post";
  platform: "Instagram" | "TikTok" | "YouTube";
  img: string;
  video?: string;
  submitted: string;
  track: string;
  state: AdState;
  /** The agent's read of the draft against the brief it wrote. */
  compliance: {
    checks: AdCheck[];
    verdict: "approve" | "approve-with-note" | "hold";
    reasoning: Sourced<string>;
  };
  /** Only on a live ad, and only ever from platform data. */
  performance?: { views: Sourced<number>; revenue: Sourced<number> };
}

export type AdFilter = "all" | "waiting" | "approved" | "declined" | "live";

/* A request. Never a completion. */
export interface FundingRequest {
  id: string;
  planId: string;
  phaseNo: number;
  amount: Sourced<number>;
  vat: Sourced<number>;
  total: Sourced<number>;
  method: { brand: string; last4: string; expires: string };
  /** What the brand is committing to, spelled out. */
  commits: string[];
  state: "pending" | "confirmed" | "cancelled";
}

export interface ApprovalRequest {
  id: string;
  adIds: string[];
  /** One line per ad the agent wants a decision on. */
  summary: { adId: string; line: string; verdict: AdRecord["compliance"]["verdict"] }[];
  state: "pending" | "approved" | "declined" | "partial";
}

/* ------------------------------------------------------------------ */
/* The streaming contract                                              */
/* ------------------------------------------------------------------ */

export type ToolName =
  | "read_site" | "propose_plan" | "price_plan" | "match_creators"
  | "edit_plan" | "request_funding" | "get_report" | "list_ads" | "request_approval";

/** One piece of a result. `partial` is the whole result so far, not a
    delta — the UI renders it directly and never has to merge. */
export interface Chunk<T> {
  partial: T;
  /** What the agent is doing right now, for the working line. */
  note: string;
  /** Units finished / units known so far. `total` grows as the agent
      discovers work, so this is not a countdown to a fixed end. */
  progress: { done: number; total: number };
}

export interface RunContext {
  signal: AbortSignal;
}

/** Cancelling mid-stream throws this. Whatever was yielded last is
    still valid and the UI keeps it. */
export class Cancelled extends Error {
  constructor() { super("cancelled"); this.name = "Cancelled"; }
}

export type ToolStream<T> = AsyncGenerator<Chunk<T>, T, void>;

export interface AgentTools {
  /** Read a store. Layers arrive out of order as they are found. */
  read_site(i: { url: string }, ctx: RunContext): ToolStream<BrandRead>;

  /** A complete campaign, prefilled. Not a questionnaire. */
  propose_plan(i: { read: BrandRead; strategy?: StrategyKey }, ctx: RunContext): ToolStream<Plan>;

  /** Price a plan. Pure and instant — no stream. */
  price_plan(i: { plan: Plan }): PriceQuote;

  /** The shortlist for this plan, with per-plan reasons. */
  match_creators(i: { plan: Plan; limit?: number }, ctx: RunContext): ToolStream<CreatorMatch[]>;

  /** The only way the plan changes. Returns the new plan and the
      attributed changes, so the UI never has to guess what moved. */
  edit_plan(i: { plan: Plan; patch: PlanPatch; because: string; by: "agent" | "brand" }): { plan: Plan; changes: PlanChange[] };

  /** Produces a request the brand must confirm. Moves no money. */
  request_funding(i: { plan: Plan; phaseNo: number }): FundingRequest;

  /** Answer a question about a running campaign, with every figure
      carrying the card it came from. */
  /** Takes the PHASE, not an id. Resolving an id against the module
      fixture returned another campaign's numbers the moment there was
      more than one campaign. */
  get_report(i: { phase: Phase; question?: string }, ctx: RunContext): ToolStream<Report>;

  list_ads(i: { campaignId: string; filter?: AdFilter }): AdRecord[];

  /** Produces a request the brand must act on. Publishes nothing. */
  request_approval(i: { adIds: string[] }): ApprovalRequest;

  /** Free text in, an intent out. This is the seam a language model
      replaces first: everything else is already typed. */
  interpret(i: { text: string; plan?: Plan; paid?: boolean }): Interpretation;
}

/** What the agent understood. `patch` is empty when it understood a
    question rather than an instruction. */
export interface Interpretation {
  kind: "edit" | "question" | "command" | "unknown";
  say: string;
  patch?: PlanPatch;
  because?: string;
  /** For a question, which report or card answers it. */
  answerRef?: string;
  /** For a command: fund, approve, show. */
  command?: "fund" | "approve-all" | "show-creators" | "show-brief" | "show-report" | "show-ladder" | "build" | "correct";
}
