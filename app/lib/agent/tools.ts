/* The mock agent.

   This is the only file that knows the agent is fake. Screens import
   `tools` as an `AgentTools` and nothing else; replacing this module
   with one that calls a model is the whole migration.

   Two invariants hold throughout:
     · no `Math.random` — everything varies deterministically off a hash,
       so the same input always gives the same answer and the same pace;
     · nothing here completes a payment or publishes anything. The two
       tools that touch those return a REQUEST for the brand to act on. */

import {
  Cancelled,
  type AdFilter, type AdRecord, type AgentTools, type ApprovalRequest,
  type BrandRead, type BriefDraft, type CreatorMatch, type Evidence,
  type FundingRequest, type Interpretation, type LadderRung, type Plan,
  type PlanChange, type PlanPatch, type PriceQuote, type ReadLayerKey,
  type Report, type RunContext, type Sourced, type Strategy, type StrategyKey,
  type ToolStream,
} from "./types";
import { chunk, costOf, settle } from "./stream";
import { hash } from "./rng";
import { CREATORS, creatorById, viewThrough, type CreatorSeed } from "../mock/creators";
import { fixtureFor } from "../mock/reads";
import { getRead, readIdFor, rememberRead } from "./registry";
import {
  ADS, UNLOCK_AT, VAT_RATE, fmtCount, fmtUSD, pace, phaseTitle, vatOn, type Phase,
} from "../mock/campaigns";
import {
  CONFIDENCE_HIGH_RATIO, CONFIDENCE_RULE,
  PLAN_BUDGET_MAX, PLAN_BUDGET_MIN, budgetForHigh, getConfidence, roasForHigh,
  CREATOR_SHARE, FOCUS_MULTIPLIER, MIN_MARKET_FIT, POOL_MAX, confidenceFrom, efficiency,
  expectedFor, familyOf, marketFit, revenuePerView,
} from "./model";

const ev = (id: string, kind: Evidence["kind"], label: string, detail: string): Evidence =>
  ({ id, kind, label, detail });
const S = <T,>(value: T, why: string, evidence: Evidence[], computedFrom?: string): Sourced<T> =>
  ({ value, why, evidence, computedFrom, setBy: "agent" });

const MARKET_NAME: Record<string, string> = {
  AE: "United Arab Emirates", SA: "Saudi Arabia", KW: "Kuwait",
  QA: "Qatar", BH: "Bahrain", OM: "Oman",
};
export const marketName = (c: string) => MARKET_NAME[c] ?? c;

/* ══════════════════════════════════════════════════════════════════
   THE WARM-UP IS ALWAYS $1,000
   ══════════════════════════════════════════════════════════════════

   Phase 1 is not sized, negotiated or sold. It is a thousand dollars,
   for every brand, every time — the price of finding out whether this
   works on your real orders. That single fact does more selling than
   any budget slider could: there is nothing to weigh up, and nobody
   has to be talked into a number.

   What the three strategies change is not the price. It is what the
   thousand dollars is pointed at, and therefore what we are willing to
   guarantee on it. One price, three ambitions.

   The rest of the plan follows from it: the crew is whoever $1,000
   buys, and Phases 2 and 3 are the standard next rungs, quoted for
   real only when they open. */
export const PHASE1_BUDGET = 1_000;
/* Phases 2 and 3 are not constants any more — they are whatever is
   left of the plan budget after the warm-up, split one part to two.
   See `phasesFor`. A $10,000 plan still lands on the familiar
   $1,000 / $3,000 / $6,000. */

/** What is left for creator fees once the platform's share is taken.
    It is the real constraint on the warm-up crew. */
export const CREW_BUDGET = Math.round(PHASE1_BUDGET * CREATOR_SHARE);

/* The whole plan is what the brand sizes; Phase 1 is a fixed slice of
   it. Splitting the remainder one part to two puts the standard
   $1,000 / $3,000 / $6,000 ladder at a $10,000 plan, and scales from
   there without a special case. */
export function phasesFor(planBudget: number): [number, number, number] {
  const rest = Math.max(0, planBudget - PHASE1_BUDGET);
  const p2 = Math.max(500, Math.round(rest / 3 / 500) * 500);
  return [PHASE1_BUDGET, p2, Math.max(500, rest - p2)];
}

/* ══════════════════════════════════════════════════════════════════
   THE WARM-UP GUARANTEES YOUR MONEY BACK, AND THEN IT CLIMBS
   ══════════════════════════════════════════════════════════════════

   Phase 1 is guaranteed at 1x. A thousand dollars in, a thousand
   dollars of revenue out — no profit, and that is the point. The
   warm-up exists to prove the crew on real orders at no risk, not to
   make the case; Alex said it plainly in the review call, that 1x on
   1K is no return, which is exactly why a brand has to see all three
   phases before they can judge any of them.

   Phases 2 and 3 carry the return. They are solved so the WHOLE plan
   averages the multiple the brand asked for: Phase 3 takes the peak,
   Phase 2 sits midway between the warm-up and that peak, and the three
   together blend to the target.

       1 x b1  +  r2 x b2  +  r3 x b3   =   target x plan budget
       r2 = (1 + r3) / 2

   Rounded to one decimal for display, and every total on screen is the
   SUM of the three phases rather than the ideal product — so the
   arithmetic a brand can do in their head always comes out right. */

export const PHASE1_ROAS = 1;

export function phaseMultiples(planBudget: number, targetRoas: number): [number, number, number] {
  const [b1, b2, b3] = phasesFor(planBudget);
  const wanted = planBudget * targetRoas;
  const denom = b2 / 2 + b3;
  const raw = denom > 0 ? (wanted - b1 * PHASE1_ROAS - b2 / 2) / denom : targetRoas;
  const r3 = Math.max(PHASE1_ROAS, Math.round(raw * 10) / 10);
  const r2 = Math.max(PHASE1_ROAS, Math.round(((PHASE1_ROAS + r3) / 2) * 10) / 10);
  return [PHASE1_ROAS, r2, r3];
}

/** What the three phases add up to. The revenue is the sum of what
    each phase is guaranteed, never the ideal product — so the total on
    screen matches the rows above it. */
export function ladderTotals(planBudget: number, targetRoas: number) {
  const b = phasesFor(planBudget);
  const m = phaseMultiples(planBudget, targetRoas);
  const budget = b[0] + b[1] + b[2];
  const revenue = Math.round(b[0] * m[0] + b[1] * m[1] + b[2] * m[2]);
  return { budget, revenue, blended: budget > 0 ? revenue / budget : 0, phases: b, multiples: m };
}

/** What the agent proposes before the brand touches anything: the
    strategy's multiple, and the smallest plan that makes it a promise
    we can commit to. When the cap makes high confidence impossible at
    that multiple — it does at 8x — it proposes the largest plan we
    would stand behind and says so. */
export function suggestPlanShape(multiple: number): { planBudget: number; roas: number } {
  const high = budgetForHigh(multiple);
  if (high !== null) return { planBudget: high, roas: multiple };
  return { planBudget: PLAN_BUDGET_MAX, roas: multiple };
}

/* ══════════════════════════════════════════════════════════════════
   read_site
   ══════════════════════════════════════════════════════════════════ */

/* The read is not one agent, it is five, and the brand should be able to
   see that. Each has a name, a job it can state in four words, and a
   task it either has finished or has not — which is what makes a screen
   look like something is working rather than like a page loading.

   The order layers arrive in is the order the work finishes in, not a
   script. Identity is cheap and lands first; bestsellers need four
   category pages and land late; eligibility needs the traffic panel and
   lands last. */
export interface ReadTask {
  key: ReadLayerKey;
  /** Who is doing it. Named, because "analysing…" is not a status. */
  agent: string;
  /** What that agent is for, in four words. */
  role: string;
  /** What it is doing right now. */
  note: string;
  /** What it will have produced. */
  produces: string;
  weight: number;
}

/* HeyMoon runs seven specialised agents as one pipeline. These are
   those agents, doing the jobs the product says they do — not names
   invented for a loading state.

     MoonShot AI     Intake        reads the brief, sets campaign goals
     MoonMatch AI    Matching      finds the right creators, instantly
     MoonSearch AI   Safety        vets creators for brand and fraud risk
     MoonWriter AI   Creative      generates briefs and ad copy
     MoonLive AI     Activation    launches campaigns across channels
     MoonScore AI    Optimization  re-allocates budget to what converts
     MoonLearning AI Learning      feeds results back into every agent

   On a store read there is no brief to intake, so the store IS the
   brief and MoonShot does most of the reading. The three others that
   appear here are reading the specific thing they will need later:
   MoonMatch wants your audience because it is about to match creators
   to it, MoonWriter wants your register because it is about to write in
   it, and MoonScore wants your traffic because it decides what can be
   guaranteed.

   The rows are ordered the way the work runs: the homepage first
   because everything else is reached from it, then the shallow pages,
   then the ones that need many samples. Eligibility lands last because
   it needs the traffic panel. */
export const READ_TASKS: ReadTask[] = [
  { key: "identity", agent: "MoonShot AI", role: "Intake", note: "Reading the homepage", produces: "Name and positioning", weight: 1 },
  { key: "category", agent: "MoonShot AI", role: "Intake", note: "Walking the navigation and the designer index", produces: "What you actually sell", weight: 3 },
  { key: "socials", agent: "MoonMatch AI", role: "Matching", note: "Following the footer links to live profiles", produces: "Your own channels and their reach", weight: 2 },
  { key: "priceBand", agent: "MoonShot AI", role: "Intake", note: "Sampling 60 product pages", produces: "Price band and median order value", weight: 5 },
  { key: "voice", agent: "MoonWriter AI", role: "Creative", note: "Counting the words your store repeats", produces: "The register a creator has to match", weight: 4 },
  { key: "markets", agent: "MoonShot AI", role: "Intake", note: "Checking delivery promises and currencies", produces: "Markets, ranked by how you serve them", weight: 2 },
  { key: "bestsellers", agent: "MoonShot AI", role: "Intake", note: "Ranking by shelf position and restocks", produces: "The products worth putting behind creators", weight: 5 },
  { key: "seasonality", agent: "MoonShot AI", role: "Intake", note: "Reading last year's campaign pages", produces: "When your demand peaks", weight: 3 },
  { key: "eligibility", agent: "MoonScore AI", role: "Optimization", note: "Checking traffic against the guarantee floor", produces: "Whether HeyMoon can guarantee sales", weight: 2 },
];

const LAYER_WORK = READ_TASKS;

async function* read_site(i: { url: string }, ctx: RunContext): ToolStream<BrandRead> {
  const id = readIdFor(i.url);
  const full = fixtureFor(i.url)(id);
  rememberRead(full);
  const acc: BrandRead = { id: full.id, url: full.url, done: [], corrections: [] };

  /* `total` starts at what we know we must do and grows as the read
      finds more — the progress line is a count of work, not a clock. */
  let total = 4;
  let done = 0;
  yield chunk({ ...acc }, `${LAYER_WORK[0].agent} · Opening ${full.url}`, done, total);

  for (let n = 0; n < LAYER_WORK.length; n++) {
    const unit = LAYER_WORK[n];
    if (ctx.signal.aborted) throw new Cancelled();
    if (n === 3) total = LAYER_WORK.length;      // the read discovers its own size
    await settle(costOf(`${id}:${unit.key}`, unit.weight), ctx.signal);
    (acc as unknown as Record<string, unknown>)[unit.key] =
      (full as unknown as Record<string, unknown>)[unit.key];
    acc.done = [...acc.done, unit.key];
    done += 1;
    yield chunk({ ...acc }, `${unit.agent} · ${unit.note}`, done, total);
  }
  return acc;
}

/* ══════════════════════════════════════════════════════════════════
   Strategies and shortlists
   ══════════════════════════════════════════════════════════════════ */

/* Three plans, and they all cost the same $1,000.

   What separates them is not money — it is how many products the
   warm-up points at, and therefore how much return we are willing to
   guarantee on it. Spread across your whole range we learn the most
   and promise the least; concentrated on two bestsellers the same
   thousand dollars can carry an 8x, because repetition converts and
   nothing is being spent on finding out.

   `pick` is how the crew is chosen: "score" balances value for money
   against how well a creator's niche matches the store; "value"
   ignores niche entirely and takes the best in-market reach per
   dollar. */
export const STRATEGY_META: Record<StrategyKey, {
  name: string; sentence: string; multiple: number; crew: number; lines: 2 | 4 | 8;
  pick: "score" | "value"; blurb: string; costLine: string; downside: string;
}> = {
  steady: {
    name: "The wide, safe plan",
    sentence: "your whole bestselling range, spread across the warm-up crew, with 3x guaranteed",
    multiple: 3, crew: 8, lines: 8, pick: "score",
    blurb: "The warm-up crew across your whole bestselling range. The widest read on what your audience actually buys.",
    costLine: "Same $1,000 as the other two. You are spending it on breadth, which is why the promise on it is the smallest.",
    downside: "Spread across eight product lines, no single one gets enough repetition to break out. You learn the most and you win slowly. A 3x floor on this much spend is a small promise.",
  },
  balanced: {
    name: "The balanced plan",
    sentence: "your four strongest products, with 5x guaranteed",
    multiple: 5, crew: 7, lines: 4, pick: "score",
    blurb: "The warm-up crew on your four strongest products. The default, and the one most brands start with.",
    costLine: "Same $1,000 as the other two, pointed at the four products most likely to carry it.",
    downside: "If two of the four lines underperform, the phase leans on the other two and the unlock date slips by a week or so.",
  },
  aggressive: {
    name: "The concentrated plan",
    sentence: "your two bestsellers and nothing else, with 8x guaranteed",
    multiple: 8, crew: 6, lines: 2, pick: "value",
    blurb: "Everything the warm-up has, pointed at your two bestsellers. Highest ceiling, thinnest margin for error.",
    costLine: "Same $1,000 as the other two, with none of it spent on breadth. All of it goes behind two products.",
    downside: "There is no third product to carry the phase. If both bestsellers stall in-market this misses, and you lose the month.",
  },
};

interface Economics {
  rpv: number;
  family: ReturnType<typeof familyOf>;
  medianPrice: number;
  currency: string;
}

function economicsOf(read: BrandRead): Economics {
  const median = read.priceBand?.value.median ?? 300;
  const family = familyOf(read.category?.value ?? "");
  return { rpv: revenuePerView(median, family), family, medianPrice: median, currency: read.priceBand?.value.currency ?? "AED" };
}

function defaultMarkets(read: BrandRead): string[] {
  const ms = read.markets?.value ?? [];
  /* Every market the store already ships to and gets at least 5% of its
     traffic from. Not a guess — the store's own delivery page. */
  return ms.filter((m) => m.share >= 5).map((m) => m.code);
}

/** Everyone who could work on this brand: right markets, right niche,
    and not publishing for a competitor. This is what MoonMatch AI finds
    and MoonSearch AI vets, before any budget is applied. */
function matchedPool(read: BrandRead, markets: string[], pick: "score" | "value" = "score"): CreatorSeed[] {
  const { rpv, family } = economicsOf(read);
  const wantNiche =
    family === "beauty" ? ["Beauty", "Lifestyle"] :
    family === "grocery" ? ["Lifestyle"] :
    ["Fashion", "Luxury", "Beauty"];

  return CREATORS
    .filter((c) => !c.competing)
    .map((c) => {
      const fit = marketFit(c, markets);
      const niche = wantNiche.includes(c.niche) ? 1 : 0.72;
      const value = efficiency(c, rpv) * fit;
      return { c, fit, score: pick === "value" ? value : value * niche };
    })
    .filter((x) => x.fit >= MIN_MARKET_FIT)
    .sort((a, b) => b.score - a.score || a.c.id - b.c.id)
    .slice(0, POOL_MAX)
    .map((x) => x.c);
}

/** Who the warm-up actually briefs.
 *
 *  Not a headcount — a budget. $1,000 leaves a fixed amount for creator
 *  fees, and the crew is whoever fits inside it, best value first. A
 *  creator who does not fit is skipped rather than ending the list, so
 *  a cheap strong match still gets in behind an expensive one.
 *
 *  This is why the ladder exists: the rest of the matched pool is what
 *  Phases 2 and 3 are for. */
function shortlist(read: BrandRead, markets: string[], crewBudget: number, pick: "score" | "value" = "score"): CreatorSeed[] {
  const out: CreatorSeed[] = [];
  let spent = 0;
  for (const c of matchedPool(read, markets, pick)) {
    if (spent + c.rate > crewBudget) continue;
    out.push(c);
    spent += c.rate;
  }
  return out;
}

function reasonsFor(c: CreatorSeed, read: BrandRead, markets: string[], rpv: number): Sourced<string>[] {
  const fit = marketFit(c, markets);
  const vt = viewThrough(c);
  const inside = c.topMarkets.filter((m) => markets.includes(m.code));
  const out: Sourced<string>[] = [];

  out.push(S(
    `${Math.round(fit * 100)}% of her audience is in ${inside.map((m) => marketName(m.code)).join(", ") || "your markets"}`,
    "Taken from her own audience split, intersected with the markets on this plan. It is the number that moves if you change the markets.",
    [ev(`mf-${c.id}`, "creator", `${c.handle} audience`, c.topMarkets.map((m) => `${marketName(m.code)} ${m.share}%`).join(" · "))]
  ));

  out.push(S(
    `${Math.round(vt * 100)}% of her following actually watches. ${fmtCount(c.avgViews)} views on ${fmtCount(c.followers)} followers`,
    "Followers are a vanity number and appear here only as a denominator. This is the share of an audience that turns up.",
    [ev(`vt-${c.id}`, "creator", "her last 5 posts", `${c.posts.map((p) => fmtCount(p.views)).join(", ")} views.`)],
    "average views ÷ followers"
  ));

  const cat = read.category?.value ?? "";
  out.push(S(
    `She publishes ${c.niche.toLowerCase()}, and you sell ${cat.toLowerCase()}`,
    "Her declared niche against the category read off your store.",
    [
      ev(`nc-${c.id}`, "creator", `${c.handle} bio`, c.bio),
      ...(read.category?.evidence.slice(0, 1) ?? []),
    ]
  ));

  const exp = c.avgViews * rpv * fit;
  /* Value, never price. What a creator is paid is HeyMoon's business
     and showing it beside her name is against the premise of the
     product. What she is worth to the brand is the brand's business. */
  out.push(S(
    `Worth about ${fmtUSD(exp)} in sales to this phase`,
    "Her average views, multiplied by what a view is worth for your price band, and cut to the share of her audience in your markets.",
    [
      ev(`ec-${c.id}`, "benchmark", "HeyMoon category benchmark", `${(revenuePerView(read.priceBand?.value.median ?? 300, familyOf(cat)) * 1000).toFixed(0)} dollars of sales per thousand views for this category and price band.`),
    ],
    "average views x sales per view x market fit"
  ));

  return out;
}

function toMatch(c: CreatorSeed, read: BrandRead, markets: string[], rpv: number): CreatorMatch {
  return {
    id: c.id, name: c.name, handle: c.handle, avatar: c.avatar,
    platform: c.platform, followers: c.followers,
    viewThrough: viewThrough(c), gulfShare: c.gulfShare, niche: c.niche,
    conflict: c.conflict,
    reasons: reasonsFor(c, read, markets, rpv),
    caveat: c.conflict ? `${c.conflict}. Declared, allowed under standard guidelines, and worth knowing before you approve her drafts.` : undefined,
  };
}

/* ══════════════════════════════════════════════════════════════════
   The plan
   ══════════════════════════════════════════════════════════════════ */

function briefFor(read: BrandRead, lines: number): BriefDraft {
  const voice = read.voice?.value;
  const best = (read.bestsellers?.value ?? []).slice(0, lines === 2 ? 2 : lines === 4 ? 4 : 8);
  return {
    /* The line says how the products are shown, not which products.
       Which ones is the Products row directly above it (C17), and the
       card used to print the same two names twice. */
    headline: S(
      `Shown in real use, in your voice.`,
      "Framed the way your own product copy frames it. The products it covers are the row above.",
      read.voice?.evidence.slice(0, 2) ?? read.bestsellers?.evidence.slice(0, 2) ?? []
    ),
    mustSay: S(
      [
        `Name the product in the first three seconds`,
        `Hold the discount code on screen for at least five seconds`,
        ...(best.length ? [`Cover one of: ${best.map((b) => b.name).join(", ")}`] : []),
        `Say the price honestly. ${read.priceBand ? `${read.priceBand.value.median} ${read.priceBand.value.currency}` : "as listed"} is the median here`,
      ],
      "Attribution on a guaranteed phase runs entirely through the code, so the code rule is not stylistic. The rest comes from what your store already says.",
      [
        ev("br-code", "policy", "how attribution works", "One tracking code per creator. A code that is not readable is a sale that cannot be attributed."),
        ...(read.priceBand?.evidence.slice(0, 1) ?? []),
      ]
    ),
    mustNotSay: S(
      [
        "No competing retailer in frame",
        "No claim about delivery times outside the markets on this plan",
        ...(voice ? [`Avoid exclamation marks. Your own copy has none across ${read.voice?.evidence[0]?.detail.split(";")[0] ?? "the pages I read"}`] : []),
      ],
      "Two are standard. The third is yours: your store writes in a register that this would break.",
      read.voice?.evidence.slice(0, 1) ?? []
    ),
    formats: S(
      ["Reel or short vertical video", "One Story frame with the code", "No static-only posts"],
      "Reels are 70% of what your own account publishes, so this is the format your audience already expects from you.",
      read.socials?.evidence.filter((e) => /Reels|Instagram/i.test(e.detail)).slice(0, 1) ?? []
    ),
    tone: S(
      voice ? `${voice.register} Words your store leans on: ${voice.words.join(", ")}.` : "Match the store's own register.",
      "Counted from your own product and editorial copy rather than chosen for you.",
      read.voice?.evidence ?? []
    ),
  };
}

function ladderFor(planBudget: number, multiple: number): LadderRung[] {
  const [, p2, p3] = phasesFor(planBudget);
  const [m1, m2, m3] = phaseMultiples(planBudget, multiple);
  /* Three phases is the standard, and the brand reads them as a plan, not
     as a ladder to climb: Phase 1 is the warm-up and the only thing paid
     for today; Phase 2 is built by the agent from Phase 1's results; Phase
     3 is the last phase and is priced when Phase 2 closes. Every note is a
     full sentence, because a one-word phase name on its own is exactly
     the kind of label the review call said nobody understands. */
  const unlockPct = Math.round(UNLOCK_AT * 100);
  return [
    {
      phaseNo: 1, budget: PHASE1_BUDGET, multiple: m1, state: "proposed",
      note: "The warm-up is $1,000 for every brand, guaranteed at 1x. You get your thousand back. It proves the crew on your real orders, and it is the only phase due today.",
    },
    {
      phaseNo: 2, budget: p2, multiple: m2, state: "locked",
      note: `${fmtUSD(p2)} at ${m2}x, with the creators the warm-up could not afford. Offered once Phase 1 reaches ${unlockPct}% of its sales target, and built from what Phase 1 did.`,
    },
    {
      phaseNo: 3, budget: p3, multiple: m3, state: "locked",
      note: `${fmtUSD(p3)} at ${m3}x, with the whole matched pool behind it. Priced for real once Phase 2 closes, on the results you have by then.`,
    },
  ];
}

/** The three phases with their source, so the totals a screen adds up
    (all three budgets, all three guarantees) can be shown through a
    <Claim> rather than as bare arithmetic. Shared by the build and by
    edit_plan, so a repriced plan never carries a stale sentence. */
function ladderSourced(planBudget: number, multiple: number): Sourced<LadderRung[]> {
  const rungs = ladderFor(planBudget, multiple);
  const totalBudget = rungs.reduce((n, r) => n + r.budget, 0);
  const totalGuaranteed = Math.round(rungs.reduce((n, r) => n + r.budget * r.multiple, 0));
  const blended = totalBudget > 0 ? totalGuaranteed / totalBudget : 0;
  return S(
    rungs,
    `The warm-up gives your ${fmtUSD(PHASE1_BUDGET)} back and no more. It is there to prove the crew, not to pay you. The guarantee climbs after it: ${rungs[1].multiple}x on Phase 2 and ${rungs[2].multiple}x on Phase 3, which is how ${fmtUSD(totalBudget)} across the three carries ${fmtUSD(totalGuaranteed)} of guaranteed sales and averages ${blended.toFixed(1)}x overall. Each phase is offered only when the one before it reaches 80% of its own target.`,
    [
      ev("p-lad", "policy", "the three phases", "Three phases, run one at a time. You start Phase 1 only, and you decide on each next phase when it unlocks. Stopping after Phase 1 is allowed."),
      ev("p-lad-total", "platform", "the whole campaign", `${rungs.map((r) => `Phase ${r.phaseNo} ${fmtUSD(r.budget)} at ${r.multiple}x = ${fmtUSD(Math.round(r.budget * r.multiple))}`).join(" · ")}. Total ${fmtUSD(totalGuaranteed)} on ${fmtUSD(totalBudget)}.`),
    ],
    "Σ (phase budget x that phase's multiple)"
  );
}

export function strategyOptions(read: BrandRead, markets: string[]): Strategy[] {
  const { rpv } = economicsOf(read);
  return (Object.keys(STRATEGY_META) as StrategyKey[]).map((key) => {
    const m = STRATEGY_META[key];
    const crew = shortlist(read, markets, CREW_BUDGET, m.pick);
    const focus = FOCUS_MULTIPLIER[m.lines];
    const budget = PHASE1_BUDGET;
    const expected = crew.reduce((n, c) => n + expectedFor(c, rpv, markets, focus), 0);
    const implied = budget > 0 ? expected / budget : 0;
    return {
      key, name: m.name, multiple: m.multiple, blurb: m.blurb, budget,
      expected: { low: Math.round(expected * 0.72), high: Math.round(expected * 1.18) },
      downside: m.downside,
      confidence: confidenceFrom(implied, m.multiple),
    };
  });
}

function priceOf(read: BrandRead, markets: string[], budget: number, multiple: number, crew: CreatorSeed[], lines: number): PriceQuote {
  const { rpv } = economicsOf(read);
  const focus = FOCUS_MULTIPLIER[lines] ?? 1;
  const expected = crew.reduce((n, c) => n + expectedFor(c, rpv, markets, focus), 0);
  const vat = vatOn(budget);
  /* Phase 1 is metered at 1x, not at the plan's multiple. It is
     guaranteed to return the thousand dollars it cost, and nothing
     more; the return lives in the two phases it unlocks. */
  const target = budget * PHASE1_ROAS;
  const crewCost = crew.reduce((n, c) => n + c.rate, 0);

  /* The arrow runs the other way now: the $1,000 is fixed, and what it
     leaves for fees is what decides the crew. Shown as one number,
     never as a fee beside a person. */
  const crewEv = ev("q-crew", "platform", `${crew.length} creator fees, in total`, `${fmtUSD(crewCost)} across the crew for one phase deliverable each.`);
  const shareEv = ev("q-share", "policy", "budget split", `${Math.round(CREATOR_SHARE * 100)}% creator fees, ${Math.round((1 - CREATOR_SHARE) * 100)}% platform and guarantee reserve.`);
  const benchEv = ev("q-bench", "benchmark", "HeyMoon category benchmark", `$${(rpv * 1000).toFixed(0)} of sales per thousand views at your price band.`);

  return {
    budget: S(budget, `Phase 1 is ${fmtUSD(PHASE1_BUDGET)} for every brand. It is not sized from your store or negotiated. It is the fixed price of the warm-up, and what it buys is ${fmtUSD(crewCost)} of creator fees plus the tracking and the reserve that pays you if the guarantee misses.`, [crewEv, shareEv]),
    crewCost: S(crewCost, "What the whole crew is paid for one deliverable each, as one number. It is never split out per person. A price beside a creator is against the premise of the product.", [crewEv, shareEv], "Σ creator fees"),
    vat: S(vat, "VAT at 5%, on the budget only.", [ev("q-vat", "policy", "UAE VAT", `${Math.round(VAT_RATE * 100)}% standard rate.`)], "budget x 5%"),
    total: S(budget + vat, "Budget plus VAT. This is the figure you would be charged.", [ev("q-total", "policy", "what you pay", "One payment, for this phase only.")], "budget + VAT"),
    revenueTarget: S(target, `What the warm-up is metered against. Phase 1 is guaranteed at ${PHASE1_ROAS}x. ${fmtUSD(budget)} in, ${fmtUSD(target)} of sales out. No profit on this phase, deliberately: it is here to prove the crew on your real orders at no risk, and the ${multiple}x you asked for is the average across all three phases, carried by the two it unlocks.`, [ev("q-tgt", "policy", "the guarantee", `${fmtUSD(target)} is what HeyMoon guarantees on the warm-up.`), ev("q-blend", "policy", "where the guarantee climbs", `Phase 1 is ${PHASE1_ROAS}x; Phases 2 and 3 climb so the whole plan averages ${multiple}x.`)], `${fmtUSD(budget)} x ${PHASE1_ROAS}`),
    unlockAt: S(target * UNLOCK_AT, `The next phase is offered here, at ${Math.round(UNLOCK_AT * 100)}% of this phase's target.`, [ev("q-unlock", "policy", "the 80% line", "One phase runs at a time. Crossing 80% of its own target unlocks the next, which you then start.")], `target x ${UNLOCK_AT}`),
    expected: S(
      { low: Math.round(expected * 0.72), high: Math.round(expected * 1.18) },
      "What HeyMoon actually expects, as a range, from this crew's real reach in your markets. The guarantee is the floor of what you are owed; this is the middle of what tends to happen.",
      [crewEv, benchEv, ev("q-range", "benchmark", "why a range", "Across comparable phases, outcomes land within −28% / +18% of the modelled figure four times in five.")],
      "Σ (creator views x sales per view x market fit) x focus"
    ),
    downside: S(
      `${fmtUSD(target)} in sales is guaranteed on this phase. You are never out more than the ${fmtUSD(budget + vat)} you put in, and nothing beyond Phase 1 is committed.`,
      "The guarantee, stated as the worst case rather than as a promise.",
      [ev("q-down", "policy", "the guarantee, in reverse", "The reserve inside the budget is what pays for this.")]
    ),
  };
}

/* The build is five agents over seven steps, the same way the read is
   four agents over nine. Each step of the
   plan has a named agent, a job it can state in a few words, and a thing
   it produces — so the screen can show a roster of who is working on the
   brand's plan rather than a spinner with a caption. The order here IS
   the order `propose_plan` runs them in; `TaskRoster` derives "done" from
   the stream's progress count, so the two must never be reordered
   independently. */
export interface BuildTask {
  key: string;
  /** Who is doing it. Named, because "building…" is not a status. */
  agent: string;
  /** What that agent is for, in a few words. */
  role: string;
  /** What it is doing right now. */
  note: string;
  /** What it will have produced. */
  produces: string;
}

/* Building the campaign is where the pipeline earns its name. Five of
   the seven agents run here, each doing its own job: MoonShot sets the
   goals, MoonMatch finds the creators, MoonSearch vets them, MoonScore
   prices the phases and MoonWriter drafts the brief. MoonLive and
   MoonLearning come later — one when an approved ad goes out, the other
   when the results come back. */
export const BUILD_TASKS: BuildTask[] = [
  { key: "markets", agent: "MoonShot AI", role: "Intake", note: "Setting the campaign goals and the markets to run in", produces: "The markets Phase 1 runs in" },
  { key: "audience", agent: "MoonMatch AI", role: "Matching", note: "Reading your audience off your own channels", produces: "Who the creators will be talking to" },
  { key: "creators", agent: "MoonMatch AI", role: "Matching", note: "Matching creators whose audience is in your markets", produces: "The creators who fit your brand" },
  { key: "safety", agent: "MoonSearch AI", role: "Safety", note: "Vetting every match for brand and fraud risk", produces: "Competitors excluded, overlaps declared" },
  { key: "pricing", agent: "MoonScore AI", role: "Optimization", note: "Sizing the warm-up crew against the $1,000 Phase 1 budget", produces: "Who the warm-up briefs, and the sales HeyMoon guarantees" },
  { key: "brief", agent: "MoonWriter AI", role: "Creative", note: "Drafting the brief from your own product copy", produces: "What every creator must say, and must not say" },
  { key: "ladder", agent: "MoonScore AI", role: "Optimization", note: "Laying out Phases 2 and 3 behind the warm-up", produces: "The whole campaign: three phases, one at a time" },
];

const buildTask = (key: string) => BUILD_TASKS.find((t) => t.key === key)!;

/** The plan assembly, as data: a starting object plus an ordered list of
    steps. `propose_plan` streams them; `planFor` applies them all at once.
    Deep-linking to a proposal therefore rebuilds the identical plan without
    replaying the stream — only possible because every tool here is
    deterministic. */
function planBuild(read: BrandRead, strategy?: StrategyKey) {
  const key: StrategyKey = strategy ?? "balanced";
  const meta = STRATEGY_META[key];
  const markets = defaultMarkets(read);
  const { rpv } = economicsOf(read);
  const id = `plan-${hash(read.id + key).toString(36)}`;

  const crewSeeds = shortlist(read, markets, CREW_BUDGET, meta.pick);
  const budget = PHASE1_BUDGET;
  const shape = suggestPlanShape(meta.multiple);
  const planBudget = shape.planBudget;

  /* The strategy is always said as its name AND its sentence. "Balanced"
     on its own tells a store owner nothing. */
  const strategyWhy = `${meta.name}. ${meta.sentence}. ${
    key === "balanced"
      ? "It is the middle of the three, and the one most brands at your size and category start with."
      : meta.costLine
  }`;

  const base: Plan = {
    id, readId: read.id, brandName: read.identity?.name.value ?? read.url,
    strategy: S(key, strategyWhy, [ev("p-str", "benchmark", "comparable brands", "Of brands in your category and traffic band, most start with a 5x guarantee.")]),
    markets: S([], "", []),
    audience: S({ gender: "all", ageLow: 18, ageHigh: 44, interests: [] }, "", []),
    budget: S(0, "", []),
    planBudget: S(0, "", []),
    guaranteedRoas: S(meta.multiple, "", []),
    creators: S([], "", []),
    pool: S(0, "", []),
    brief: S(briefFor(read, meta.lines), "", []),
    ladder: S([], "", []),
    price: priceOf(read, markets, budget, meta.multiple, crewSeeds, meta.lines),
    changes: [],
  };

  const steps: { task: BuildTask; weight: number; apply: (p: Plan) => void }[] = [
    {
      task: buildTask("markets"), weight: 2,
      apply: (p) => {
        p.markets = S(markets,
          `Every market your store already ships to and takes at least 5% of its traffic from. ${markets.map(marketName).join(", ")}.`,
          read.markets?.evidence ?? []);
      },
    },
    {
      task: buildTask("audience"), weight: 3,
      apply: (p) => {
        const socials = read.socials?.value ?? [];
        const big = socials.slice().sort((a, b) => b.followers - a.followers)[0];
        p.audience = S(
          { gender: "female", ageLow: 24, ageHigh: 38, interests: (read.voice?.value.words ?? []).slice(0, 3) },
          `Your buyers skew female and 24 to 38. That comes from the audiences of the creators who already convert in your category, not from an assumption about who buys ${(read.category?.value ?? "this").toLowerCase()}.`,
          [
            ...(big ? [ev("p-aud1", "social", `${big.handle}`, `${fmtCount(big.followers)} followers, your largest own channel.`)] : []),
            ev("p-aud2", "creator", "matched creator audiences", `Across the shortlist, the median audience is ${Math.round(crewSeeds.reduce((n, c) => n + c.femaleShare, 0) / crewSeeds.length)}% female, ages ${Math.min(...crewSeeds.map((c) => c.audienceAge[0]))} to ${Math.max(...crewSeeds.map((c) => c.audienceAge[1]))}.`),
          ]
        );
      },
    },
    {
      task: buildTask("creators"), weight: 6,
      apply: (p) => {
        /* Two counts, two fields. The pool is everyone MoonMatch AI
           matched and MoonSearch AI cleared; the crew is the subset the
           fixed warm-up budget pays for. They used to be one field with
           the pool spelled out inside its sentence, which meant every
           edit that rewrote the sentence silently dropped the pool and
           left the card labelling the crew "matched". */
        const poolSize = matchedPool(read, markets, meta.pick).length;
        p.pool = S(
          poolSize,
          `MoonMatch AI matched ${poolSize} creators to your brand and your markets, and MoonSearch AI cleared every one of them. The warm-up briefs the ${crewSeeds.length} best value of those, because ${fmtUSD(PHASE1_BUDGET)} buys ${crewSeeds.length}. The rest are what Phases 2 and 3 are for.`,
          [
            ev("p-pool", "platform", "the matched pool", `${CREATORS.filter((c) => !c.competing).length} creators available in your category; ${CREATORS.filter((c) => c.competing).length} excluded for publishing for a competitor.`),
            ev("p-cut", "policy", "the cut", `A creator with under ${Math.round(MIN_MARKET_FIT * 100)}% of their audience in your markets is not shortlisted.`),
            ev("p-cap", "policy", "the cap", `A phase shortlist holds at most ${POOL_MAX}. Past that MoonSearch AI is vouching for people nobody looked at twice.`),
          ]
        );
        p.creators = S(
          crewSeeds.map((c) => toMatch(c, read, markets, rpv)),
          `The ${crewSeeds.length} best value of the ${poolSize} matched, because ${fmtUSD(PHASE1_BUDGET)} leaves ${fmtUSD(CREW_BUDGET)} for creator fees and that is what it buys.`,
          [
            ev("p-crew", "policy", "the warm-up crew", `${fmtUSD(PHASE1_BUDGET)} leaves ${fmtUSD(CREW_BUDGET)} for creator fees. The crew is whoever fits inside it, best value first.`),
          ]
        );
      },
    },
    {
      task: buildTask("pricing"), weight: 3,
      apply: (p) => {
        p.budget = p.price.budget;
        const conf = getConfidence(planBudget, meta.multiple);
        const [, p2, p3] = phasesFor(planBudget);
        p.planBudget = S(planBudget,
          `${fmtUSD(planBudget)} across all three phases is the smallest plan on which I can call a ${meta.multiple}x guarantee ${conf.label.toLowerCase()}. ` +
          `Confidence is the plan budget divided by the multiple you are asking HeyMoon to guarantee: ${fmtUSD(planBudget)} ÷ ${meta.multiple} is ${Math.round(conf.ratio).toLocaleString("en-US")}, and anything from ${CONFIDENCE_HIGH_RATIO.toLocaleString("en-US")} up we can commit to. ` +
          `Only ${fmtUSD(PHASE1_BUDGET)} of it is due today.`,
          [
            ev("p-conf", "policy", "how confidence is set", CONFIDENCE_RULE),
            ev("p-split", "policy", "how the plan splits", `${fmtUSD(PHASE1_BUDGET)} warm-up, then ${fmtUSD(p2)} and ${fmtUSD(p3)}. Each is offered only when the phase before it reaches 80% of its target.`),
          ],
          "plan budget ÷ guaranteed multiple");
        p.guaranteedRoas = S(meta.multiple,
          `${meta.multiple}x is what HeyMoon will guarantee on this crew and this budget. HeyMoon's own model puts the likely sales higher; the guarantee is the floor, not the forecast.`,
          [ev("p-g", "policy", "what a guarantee is", `${fmtUSD(budget * meta.multiple)} in sales, guaranteed.`)]);
      },
    },
    {
      task: buildTask("brief"), weight: 4,
      apply: (p) => {
        p.brief = S(briefFor(read, meta.lines),
          `Written from your own copy and your own bestsellers, narrowed to ${meta.lines} product lines because that is what ${meta.name.toLowerCase()} concentrates on.`,
          [...(read.voice?.evidence.slice(0, 1) ?? []), ...(read.bestsellers?.evidence.slice(0, 1) ?? [])]);
      },
    },
    {
      task: buildTask("ladder"), weight: 2,
      apply: (p) => {
        p.ladder = ladderSourced(planBudget, meta.multiple);
      },
    },
  ];

  return { id, base, steps };
}

/** The finished plan, synchronously. */
export function planFor(read: BrandRead, strategy?: StrategyKey): Plan {
  const { base, steps } = planBuild(read, strategy);
  const acc = { ...base };
  for (const st of steps) st.apply(acc);
  return acc;
}

async function* propose_plan(i: { read: BrandRead; strategy?: StrategyKey }, ctx: RunContext): ToolStream<Plan> {
  const { id, base, steps } = planBuild(i.read, i.strategy);
  let done = 0;
  const total = steps.length;
  const acc = { ...base };
  yield chunk({ ...acc }, `${steps[0].task.agent} · Starting from your store details`, 0, total);

  for (const st of steps) {
    if (ctx.signal.aborted) throw new Cancelled();
    await settle(costOf(`${id}:${st.task.key}`, st.weight), ctx.signal);
    st.apply(acc);
    done += 1;
    yield chunk({ ...acc }, `${st.task.agent} · ${st.task.note}`, done, total);
  }
  return acc;
}

/* ══════════════════════════════════════════════════════════════════
   match_creators
   ══════════════════════════════════════════════════════════════════ */

async function* match_creators(i: { plan: Plan; limit?: number }, ctx: RunContext): ToolStream<CreatorMatch[]> {
  const read = getRead(i.plan.readId);
  const markets = i.plan.markets.value;
  const { rpv } = economicsOf(read);
  const meta = STRATEGY_META[i.plan.strategy.value];
  const crew = shortlist(read, markets, CREW_BUDGET, meta.pick);

  const out: CreatorMatch[] = [];
  yield chunk([], `MoonMatch AI · Scanning ${CREATORS.length} creators against your markets`, 0, crew.length);
  for (const c of crew) {
    if (ctx.signal.aborted) throw new Cancelled();
    await settle(costOf(`m:${i.plan.id}:${c.id}`, 2), ctx.signal);
    out.push(toMatch(c, read, markets, rpv));
    yield chunk([...out], `MoonMatch AI · Matched ${out.length} of ${crew.length}`, out.length, crew.length);
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════
   edit_plan — the only way a plan changes
   ══════════════════════════════════════════════════════════════════ */

const fmtMarkets = (ms: string[]) => (ms.length ? ms.map(marketName).join(", ") : "none");
const fmtAud = (a: Plan["audience"]["value"]) =>
  `${a.gender === "all" ? "All genders" : a.gender === "female" ? "Women" : "Men"}, ${a.ageLow} to ${a.ageHigh}`;

function edit_plan(i: { plan: Plan; patch: PlanPatch; because: string; by: "agent" | "brand" }): { plan: Plan; changes: PlanChange[] } {
  const { plan, patch, because, by } = i;
  const read = getRead(plan.readId);
  const changes: PlanChange[] = [];
  const at = Date.now();
  /* `detail` is the only place a person's name may appear. `to` is what
     the change reads as before Phase 1 is paid, so it carries counts. */
  const mk = (field: PlanChange["field"], label: string, from: string, to: string, detail?: string) => {
    if (from === to) return;
    changes.push({ id: `${field}-${at}-${changes.length}`, field, label, from, to, because, ...(detail ? { detail } : {}), by, at });
  };

  const next: Plan = { ...plan };

  /* Markets and strategy both re-derive the crew, so they are applied
     first and the shortlist is rebuilt once at the end. */
  let markets = plan.markets.value;
  let strategyKey = plan.strategy.value;
  let multiple = plan.guaranteedRoas.value;

  if (patch.strategy && patch.strategy !== strategyKey) {
    mk("strategy", "strategy", STRATEGY_META[strategyKey].name, STRATEGY_META[patch.strategy].name);
    strategyKey = patch.strategy;
    multiple = STRATEGY_META[strategyKey].multiple;
    next.strategy = { ...plan.strategy, value: strategyKey, setBy: by, why: `You chose ${STRATEGY_META[strategyKey].name.toLowerCase()}. ${STRATEGY_META[strategyKey].sentence}.` };
  }
  if (patch.markets) {
    mk("markets", "markets", fmtMarkets(markets), fmtMarkets(patch.markets));
    markets = patch.markets;
    next.markets = {
      ...plan.markets, value: markets, setBy: by,
      why: by === "brand"
        ? `You set the markets to ${fmtMarkets(markets)}. Everything below is recalculated for that audience only.`
        : plan.markets.why,
    };
  }
  if (patch.audience) {
    const a = { ...plan.audience.value, ...patch.audience };
    mk("audience", "audience", fmtAud(plan.audience.value), fmtAud(a));
    next.audience = { ...plan.audience, value: a, setBy: by };
  }
  let planBudget = plan.planBudget?.value ?? suggestPlanShape(multiple).planBudget;
  if (patch.planBudget && patch.planBudget !== planBudget) {
    mk("planBudget", "plan budget", fmtUSD(planBudget), fmtUSD(patch.planBudget));
    planBudget = patch.planBudget;
  }
  if (patch.guaranteedRoas && patch.guaranteedRoas !== multiple) {
    mk("guaranteedRoas", "guaranteed multiple", `${multiple}x`, `${patch.guaranteedRoas}x`);
    multiple = patch.guaranteedRoas;
  }

  /* Rebuild the crew for the new markets / strategy, then apply explicit
     creator removals and additions on top. */
  const meta = STRATEGY_META[strategyKey];
  const { rpv } = economicsOf(read);
  const marketsChanged = patch.markets !== undefined;
  const strategyChanged = patch.strategy !== undefined;

  let crewIds = plan.creators.value.map((c) => c.id);
  if (patch.setCrewIds) {
    crewIds = [...patch.setCrewIds];
  } else if (marketsChanged || strategyChanged) {
    crewIds = shortlist(read, markets, CREW_BUDGET, meta.pick).map((c) => c.id);
  }
  if (patch.dropCreatorIds?.length) crewIds = crewIds.filter((id) => !patch.dropCreatorIds!.includes(id));
  /* Named additions are checked against the pool, not just appended.
     The pool is what MoonMatch AI matched and MoonSearch AI cleared, so
     anything outside it is either publishing for a competitor or has
     too little of its audience in these markets — and a brand naming
     one by hand used to walk both of those checks. The card's claim
     that the crew is a subset of the matched pool has to be true. */
  const poolIds = new Set(matchedPool(read, markets, meta.pick).map((c) => c.id));
  const refused: string[] = [];
  if (patch.addCreatorIds?.length) {
    for (const id of patch.addCreatorIds) {
      if (crewIds.includes(id)) continue;
      if (!poolIds.has(id)) { refused.push(creatorById(id).name); continue; }
      crewIds.push(id);
    }
  }
  /* A creator whose audience is no longer in the markets cannot stay. */
  crewIds = crewIds.filter((id) => marketFit(creatorById(id), markets) >= MIN_MARKET_FIT);

  /* And the crew is what the warm-up's fee pot pays for. A hand-added
     name that pushes past it would put a phase over the one price in
     this product that never moves, so the cheapest are kept and the
     overflow is reported rather than quietly billed. */
  const overBudget: string[] = [];
  {
    const kept: number[] = [];
    let spent = 0;
    for (const id of crewIds) {
      const c = creatorById(id);
      if (spent + c.rate > CREW_BUDGET) { overBudget.push(c.name); continue; }
      kept.push(id);
      spent += c.rate;
    }
    crewIds = kept;
  }

  const crewSeeds = crewIds.map(creatorById);
  const beforeNames = plan.creators.value.map((c) => c.name);
  const afterNames = crewSeeds.map((c) => c.name);
  if (beforeNames.join("|") !== afterNames.join("|")) {
    const dropped = beforeNames.filter((n) => !afterNames.includes(n));
    const added = afterNames.filter((n) => !beforeNames.includes(n));
    const counts = [
      `${afterNames.length} briefed`,
      dropped.length ? `${dropped.length} out` : "",
      added.length ? `${added.length} in` : "",
    ].filter(Boolean).join(" · ");
    const names = [
      dropped.length ? `Out: ${dropped.join(", ")}` : "",
      added.length ? `In: ${added.join(", ")}` : "",
    ].filter(Boolean).join(" · ");
    /* "Briefed", not "matched". This row counts the warm-up CREW, and
       calling it matched put a second, smaller "N matched" on screen
       next to the plan card's pool — two different numbers under one
       word, in a product whose whole claim is that every figure says
       where it came from. */
    mk("creators", "creators", `${beforeNames.length} briefed`, counts, names || undefined);
  }
  /* Anyone the two checks above turned away, said out loud. A name a
     brand asked for and did not get has to be accounted for, or the
     crew quietly differs from what they asked for and nothing says
     why. */
  if (refused.length) {
    mk(
      "creators", "creators not matched",
      refused.length === 1 ? "1 asked for" : `${refused.length} asked for`,
      "not in the matched pool",
      `${refused.join(", ")}. Either publishing for a competitor, or too little of their audience in ${fmtMarkets(markets)}.`
    );
  }
  if (overBudget.length) {
    mk(
      "creators", "creators over the fee pot",
      overBudget.length === 1 ? "1 asked for" : `${overBudget.length} asked for`,
      `past the ${fmtUSD(CREW_BUDGET)} the warm-up pays`,
      `${overBudget.join(", ")}. The warm-up's fee pot is ${fmtUSD(CREW_BUDGET)}, and Phase 1 is ${fmtUSD(PHASE1_BUDGET)} for every brand. Phases 2 and 3 are what they are for.`
    );
  }
  /* The pool is recomputed here too. It used to live inside the crew's
     `why` sentence, which this function rewrites — so every edit, and
     every plan built through the calculator (which applies one), threw
     the matched count away and left the card showing the crew under a
     label that said "matched". */
  const poolSize = poolIds.size;
  next.pool = {
    ...plan.pool,
    value: poolSize,
    /* Always the agent. A brand can change the markets; it cannot
       change how many creators fit them, and attributing the recount
       to them read as though they had picked the number. */
    setBy: "agent",
    why: `MoonMatch AI matched ${poolSize} creators inside ${fmtMarkets(markets)}, and MoonSearch AI cleared every one of them. The warm-up briefs the ${crewSeeds.length} best value of those.`,
  };
  next.creators = {
    ...plan.creators,
    value: crewSeeds.map((c) => toMatch(c, read, markets, rpv)),
    setBy: by,
    why: `Ranked on value for money inside ${fmtMarkets(markets)}. The ${crewSeeds.length} best value of the ${poolSize} matched, because ${fmtUSD(PHASE1_BUDGET)} leaves ${fmtUSD(CREW_BUDGET)} for creator fees.`,
  };

  /* Budget: re-derived from the crew, unless the brand set it by hand. */
  /* Phase 1 is $1,000 and nothing an edit can do moves it. It is not
     derived from the crew and it is not patchable, so it never appears
     as a change — telling a brand their warm-up went from $1,000 to
     $500 because they narrowed a market would contradict the one price
     the product does not negotiate. */
  const budget = PHASE1_BUDGET;

  next.price = priceOf(read, markets, budget, multiple, crewSeeds, meta.lines);
  next.budget = patch.budget
    ? { ...next.price.budget, value: budget, setBy: "brand", why: `You set this budget by hand. At ${fmtUSD(budget)} the crew costs ${Math.round((crewSeeds.reduce((n, c) => n + c.rate, 0) / budget) * 100)}% of it.` }
    : next.price.budget;
  next.guaranteedRoas = {
    ...plan.guaranteedRoas, value: multiple, setBy: patch.guaranteedRoas ? "brand" : plan.guaranteedRoas.setBy,
    why: `${multiple}x is what HeyMoon guarantees on this crew and this budget, which is ${fmtUSD(budget * multiple)} in sales.`,
  };
  next.ladder = ladderSourced(planBudget, multiple);
  {
    const conf = getConfidence(planBudget, multiple);
    const [, p2, p3] = phasesFor(planBudget);
    next.planBudget = {
      value: planBudget, setBy: patch.planBudget ? "brand" : (plan.planBudget?.setBy ?? "agent"),
      computedFrom: "plan budget ÷ guaranteed multiple",
      why:
        `${fmtUSD(planBudget)} across all three phases, against a ${multiple}x guarantee. That is a ratio of ` +
        `${Math.round(conf.ratio).toLocaleString("en-US")}, which is ${conf.label.toLowerCase()}. ${conf.desc} Only ${fmtUSD(PHASE1_BUDGET)} of it is due today.`,
      evidence: [
        ev("p-conf", "policy", "how confidence is set", CONFIDENCE_RULE),
        ev("p-split", "policy", "how the plan splits", `${fmtUSD(PHASE1_BUDGET)} warm-up, then ${fmtUSD(p2)} and ${fmtUSD(p3)}.`),
      ],
    };
  }

  if (patch.brief) {
    const b = plan.brief.value;
    const nb: BriefDraft = {
      ...b,
      ...(patch.brief.headline ? { headline: { ...b.headline, value: patch.brief.headline, setBy: "brand", why: "You wrote this line." } } : {}),
      ...(patch.brief.mustSay ? { mustSay: { ...b.mustSay, value: patch.brief.mustSay, setBy: "brand", why: "You set these." } } : {}),
      ...(patch.brief.mustNotSay ? { mustNotSay: { ...b.mustNotSay, value: patch.brief.mustNotSay, setBy: "brand", why: "You set these." } } : {}),
      ...(patch.brief.formats ? { formats: { ...b.formats, value: patch.brief.formats, setBy: "brand", why: "You set these." } } : {}),
      ...(patch.brief.tone ? { tone: { ...b.tone, value: patch.brief.tone, setBy: "brand", why: "You wrote this." } } : {}),
    };
    mk("brief", "brief", "HeyMoon's draft", "edited by you");
    next.brief = { ...plan.brief, value: nb, setBy: "brand" };
  }

  next.changes = [...plan.changes, ...changes];
  return { plan: next, changes };
}

/* ══════════════════════════════════════════════════════════════════
   Money and publishing — requests only
   ══════════════════════════════════════════════════════════════════ */

function request_funding(i: { plan: Plan; phaseNo: number }): FundingRequest {
  const { plan, phaseNo } = i;
  return {
    id: `fund-${plan.id}-${phaseNo}`,
    planId: plan.id,
    phaseNo,
    amount: plan.price.budget,
    vat: plan.price.vat,
    total: plan.price.total,
    method: { brand: "Visa", last4: "4629", expires: "08/27" },
    commits: [
      `${fmtUSD(plan.price.total.value)} today, for ${phaseTitle(phaseNo)} only. Nothing after it is committed.`,
      /* The multiple on THIS phase, not the plan's. `guaranteedRoas` is
         the blended average across all three, and quoting it here put
         two different numbers in one sentence — "a 5x guarantee on this
         phase, and that figure is guaranteed" — on the one
         screen where a brand is agreeing to hand over money. */
      `${fmtUSD(plan.price.revenueTarget.value)} in sales guaranteed on ${phaseTitle(phaseNo).toLowerCase()}, at ${PHASE1_ROAS}x. Your ${fmtUSD(plan.budget.value)} back, written into the phase.`,
      `Keeping your tracking codes live and honoured for the whole phase. Attribution runs entirely through them.`,
      `Nothing publishes without you. Every draft waits on your approval.`,
      `Next, and last: you connect your store, so every order a creator brings in can be attributed to this phase. That is what the guarantee is measured against.`,
    ],
    state: "pending",
  };
}

function request_approval(i: { adIds: string[] }): ApprovalRequest {
  const ads = ADS.filter((a) => i.adIds.includes(a.id));
  return {
    id: `appr-${hash(i.adIds.join(",")).toString(36)}`,
    adIds: i.adIds,
    summary: ads.map((a) => ({
      adId: a.id,
      line: `${a.creatorName}, ${a.product}`,
      verdict: a.compliance.verdict,
    })),
    state: "pending",
  };
}

/* ══════════════════════════════════════════════════════════════════
   Running
   ══════════════════════════════════════════════════════════════════ */

function list_ads(i: { campaignId: string; filter?: AdFilter }): AdRecord[] {
  const f = i.filter ?? "all";
  return ADS.filter((a) => a.campaignId === i.campaignId && (f === "all" || a.state === f));
}

async function* get_report(i: { phase: Phase; question?: string }, ctx: RunContext): ToolStream<Report> {
  const ph = i.phase;
  const pc = pace(ph)!;
  const ads = ADS.filter((a) => a.campaignId === ph.id);
  const live = ads.filter((a) => a.state === "live");
  const waiting = ads.filter((a) => a.state === "waiting");
  const adRevenue = live.reduce((n, a) => n + (a.performance?.revenue.value ?? 0), 0);

  const acc: Report = {
    campaignId: ph.id,
    question: i.question,
    headline: "",
    figures: [],
    pace: S({ pctNow: 0, pctForecast: 0, daysToUnlock: null, onPace: false }, "", []),
    narrative: "",
  };

  const units: { note: string; weight: number; apply: () => void }[] = [
    {
      note: "Pulling sales against this phase's target", weight: 3,
      apply: () => {
        acc.figures.push({
          key: "revenue", label: "Sales this phase", cardRef: "card-revenue",
          value: S(fmtUSD(ph.rev), `Orders attributed to this phase's tracking codes since ${ph.start}. This phase only. Nothing pooled from Phase 1.`, [
            ev("rp-1", "orders", "your connected store", `${fmtUSD(ph.rev)} attributed across ${live.length} live ads.`),
            ev("rp-2", "policy", "per phase, always", "Sales are measured against the budget this phase alone was given."),
          ]),
        });
        acc.figures.push({
          key: "target", label: "Phase target", cardRef: "card-revenue",
          value: S(fmtUSD(ph.revTarget ?? 0), `Your budget times the ${ph.guaranteedRoas}x guaranteed on this phase.`, [
            ev("rp-3", "policy", "the guarantee", `${fmtUSD(ph.budget)} x ${ph.guaranteedRoas} = ${fmtUSD(ph.revTarget ?? 0)}.`),
          ], `${fmtUSD(ph.budget)} x ${ph.guaranteedRoas}`),
        });
      },
    },
    {
      note: "Working out the pace", weight: 4,
      apply: () => {
        acc.pace = S(
          { pctNow: Math.round(pc.pctNow), pctForecast: Math.round(pc.pctForecast), daysToUnlock: pc.daysToUnlock, onPace: pc.onPace },
          `Straight-line run rate: ${fmtUSD(Math.round(pc.perDay))} a day over ${ph.dayOfPhase} days so far, carried out to the ${ph.plannedDays}-day window.`,
          [
            ev("pc-1", "orders", "daily attributed sales", `${fmtUSD(ph.rev)} over ${ph.dayOfPhase} days = ${fmtUSD(Math.round(pc.perDay))} a day.`),
            ev("pc-2", "policy", "the 80% line", `The next phase unlocks at ${fmtUSD((ph.revTarget ?? 0) * UNLOCK_AT)}.`),
          ],
          "sales ÷ days elapsed x planned days"
        );
      },
    },
    {
      note: "Counting what is live and what is waiting", weight: 2,
      apply: () => {
        acc.figures.push({
          key: "live", label: "Ads live", cardRef: "card-ads",
          value: S(String(live.length), "Drafts you approved, now published.", [
            ev("ad-1", "platform", "published ads", live.map((a) => a.track).join(", ")),
          ]),
        });
        acc.figures.push({
          key: "waiting", label: "Waiting on you", cardRef: "card-inbox",
          value: S(String(waiting.length), "Drafts nobody can publish until you decide.", [
            ev("ad-2", "policy", "nothing publishes on its own", "Every draft waits for your approval, or publishes at the end of the review window if you never decide."),
          ]),
        });
        acc.figures.push({
          key: "adrev", label: "Sales from live ads", cardRef: "card-ads",
          value: S(fmtUSD(adRevenue), "Summed from the tracking code on each live ad.", [
            ev("ad-3", "orders", "per-ad attribution", live.map((a) => `${a.track} ${fmtUSD(a.performance?.revenue.value ?? 0)}`).join(" · ")),
          ], "Σ per-ad attributed sales"),
        });
      },
    },
    {
      note: "Writing it up", weight: 2,
      apply: () => {
        acc.headline = pc.onPace
          ? `${phaseTitle(ph.phaseNo)} is past the 80% line and Phase ${ph.phaseNo + 1} is ready to start.`
          : `${phaseTitle(ph.phaseNo)} is ${Math.round(pc.pctNow)}% of the way to its target, ${pc.daysToUnlock} days from the unlock line.`;
        acc.narrative = [
          `${fmtUSD(ph.rev)} of ${fmtUSD(ph.revTarget ?? 0)} on day ${ph.dayOfPhase} of ${ph.plannedDays}.`,
          `At the current rate the phase lands around ${fmtUSD(Math.round(pc.atEnd))}, which is ${Math.round(pc.pctForecast)}% of target.`,
          waiting.length
            ? `${waiting.length} drafts are waiting on you; approving them is the single biggest thing that moves this number.`
            : `Nothing is waiting on you.`,
        ].join(" ");
      },
    },
  ];

  let done = 0;
  yield chunk({ ...acc, figures: [...acc.figures] }, "Reading the phase", 0, units.length);
  for (const u of units) {
    if (ctx.signal.aborted) throw new Cancelled();
    await settle(costOf(`r:${ph.id}:${u.note}`, u.weight), ctx.signal);
    u.apply();
    done += 1;
    yield chunk({ ...acc, figures: [...acc.figures] }, u.note, done, units.length);
  }
  return acc;
}

/* ══════════════════════════════════════════════════════════════════
   interpret — free text to intent

   Regexes, and honestly so. This is the first thing a language model
   replaces: everything on the other side of it is already typed, so the
   swap is one function.
   ══════════════════════════════════════════════════════════════════ */

const MARKET_WORDS: [RegExp, string][] = [
  [/\buae\b|dubai|abu ?dhabi|emirates/i, "AE"],
  [/\bksa\b|saudi|riyadh|jeddah/i, "SA"],
  [/kuwait/i, "KW"],
  [/qatar|doha/i, "QA"],
  [/bahrain/i, "BH"],
  [/oman|muscat/i, "OM"],
];

function parseMoney(t: string): number | null {
  const k = t.match(/\$?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (k) return Math.round(parseFloat(k[1]) * 1000);
  const n = t.match(/\$\s*([\d,]{3,})/) ?? t.match(/\b([\d,]{4,})\b/);
  if (n) return parseInt(n[1].replace(/,/g, ""), 10);
  return null;
}

function interpret(i: { text: string; plan?: Plan; paid?: boolean }): Interpretation {
  const t = i.text.trim();
  const lower = t.toLowerCase();
  const plan = i.plan;
  /* Before Phase 1 is paid the agent does not say a creator's name, even
     when the brand typed it. The pictures are fine; the names are the
     one thing a brand could take elsewhere. */
  const paid = i.paid === true;

  /* Every reply is a full sentence that says what will happen. The
     review call read "Done. Momentum." out loud as the thing to avoid. */

  /* Commands first — they are unambiguous and destructive-adjacent. */
  if (/looks right|build the plan|go ahead and build|that.s right|all correct|yes.? build/.test(lower))
    return { kind: "command", command: "build", say: "" };
  if (/something.s off|something is off|that.s wrong|not (quite )?right|incorrect|fix (this|that)/.test(lower))
    return { kind: "command", command: "correct", say: "" };
  if (/\b(other|further|next|later|all|three) phases?\b|phases? (2|3|two|three)|whole plan|whole campaign|bigger picture/.test(lower))
    return {
      kind: "command", command: "show-ladder",
      say: "Here is the whole plan, all three phases. You are only starting Phase 1 today. I build Phase 2 for you from Phase 1's results, and you decide then whether to go on.",
    };
  if (/\b(fund|pay|check ?out|start phase|start it|let.s go|begin)\b/.test(lower) && !/\?$/.test(t))
    return { kind: "command", command: "fund", say: "" };
  if (/\bapprove all|approve everything|batch approve\b/.test(lower))
    return { kind: "command", command: "approve-all", say: "Everything waiting, with my read on each. Approving is yours." };
  if (/\bshow.*(creator|shortlist|crew)|who are the creators\b/.test(lower))
    return {
      kind: "command", command: "show-creators",
      say: paid
        ? "Your crew. Every creator on the plan, with why each one is on it."
        : "The shortlist as it stands: how many creators, their reach, and how much of it is in your markets. Their names come the moment Phase 1 starts.",
    };
  if (/\bshow.*brief|the brief\b/.test(lower))
    return { kind: "command", command: "show-brief", say: "The brief as it stands. What every creator must say, what they must not, and the formats." };
  if (/\breport|how.*(doing|going)|performance\b/.test(lower))
    return { kind: "command", command: "show-report", say: "Pulling this phase's numbers against its target now." };

  /* Markets. "kuwait only" and "just uae" narrow; "add saudi" widens. */
  const hits = MARKET_WORDS.filter(([re]) => re.test(lower)).map(([, c]) => c);
  if (hits.length) {
    const only = /\bonly\b|\bjust\b|\bnothing but\b/.test(lower);
    const drop = /\bdrop\b|\bremove\b|\bwithout\b|\bexcept\b|\bno\b/.test(lower);
    const cur = plan?.markets.value ?? [];
    let markets: string[];
    let because: string;
    if (drop && !only) {
      markets = cur.filter((m) => !hits.includes(m));
      because = `because you said drop ${hits.map(marketName).join(" and ")}`;
    } else if (only || hits.length >= cur.length) {
      markets = hits;
      because = `because you said ${hits.map(marketName).join(" and ")}${only ? " only" : ""}`;
    } else {
      markets = Array.from(new Set([...cur, ...hits]));
      because = `because you added ${hits.map(marketName).join(" and ")}`;
    }
    if (!markets.length) return { kind: "unknown", say: "That would leave no markets at all. Which one should it run in?" };
    return {
      kind: "edit", patch: { markets }, because,
      say: `${markets.map(marketName).join(" and ")} only. That changes which creators fit, so the plan and the guarantee are rebuilt.`,
    };
  }
  /* "Change the markets" with no market named: say where it runs now and
     how to say what you want. */
  if (plan && /\b(change|different|other|which|pick|choose) (the )?markets?\b|^markets\??$/.test(lower))
    return {
      kind: "question", answerRef: "markets",
      say: `Phase 1 runs in ${plan.markets.value.map(marketName).join(", ") || "no markets yet"}. Tell me the markets you want and the crew and the guarantee are rebuilt around them.`,
    };

  /* Guaranteed multiple. The `x` is not a word character, so the old
     `\b` after it never matched the "8x instead" chip. */
  const mult = lower.match(/(\d+(?:\.\d)?)\s*(?:x\b|x)/);
  if (mult) {
    const m = Math.max(1, Math.min(12, parseFloat(mult[1])));
    const strat: StrategyKey = m <= 3.5 ? "steady" : m <= 6 ? "balanced" : "aggressive";
    const meta = STRATEGY_META[strat];
    return {
      kind: "edit", patch: { strategy: strat }, because: `because you asked for ${m}x`,
      say: `${m}x is closest to ${meta.name.toLowerCase()}. ${meta.sentence}. The plan is on it, and Phase 1 is repriced.`,
    };
  }

  /* Strategy by name, or by the words a person actually uses for it. */
  for (const key of Object.keys(STRATEGY_META) as StrategyKey[]) {
    const meta = STRATEGY_META[key];
    const plain = meta.name.toLowerCase().replace(/^the /, "").replace(/ plan$/, "");
    if (lower.includes(meta.name.toLowerCase()) || lower.includes(plain))
      return {
        kind: "edit", patch: { strategy: key }, because: `because you chose ${meta.name.toLowerCase()}`,
        say: `${meta.name}. ${meta.sentence}. Rebuilding Phase 1 around it.`,
      };
  }
  if (/more aggressive|be bolder|push harder|go bigger|bigger multiple|more ambitious/.test(lower)) {
    const m = STRATEGY_META.aggressive;
    return { kind: "edit", patch: { strategy: "aggressive" }, because: "because you asked to push harder",
      say: `${m.name}. ${m.sentence}. ${m.costLine}` };
  }
  if (/safer|more conservative|play it safe|lower.*risk|less risk|be careful/.test(lower)) {
    const m = STRATEGY_META.steady;
    return { kind: "edit", patch: { strategy: "steady" }, because: "because you asked to play it safer",
      say: `${m.name}. ${m.sentence}. ${m.costLine}` };
  }
  if (/balanced|the middle|the default|middle one/.test(lower)) {
    const m = STRATEGY_META.balanced;
    return { kind: "edit", patch: { strategy: "balanced" }, because: "because you chose the middle option",
      say: `${m.name}. ${m.sentence}. ${m.costLine}` };
  }

  /* Confirmations. A brand answering "yes, that is right" is taking a
     turn, and the agent has to accept it and move on rather than
     treating it as noise. */
  if (/^(markets? (are|look) right|that is the crew|that.s the crew|the budget is fine|looks right|keep it|yes|yep|correct|fine|good)\b/.test(lower)) {
    return { kind: "question", answerRef: "confirm",
      say: "Good. I'll leave that as it is." };
  }

  /* "Why this budget?" — answered before any budget edit is attempted,
     and without promising a per-creator fee list the plan does not show. */
  if (/why this budget|why that budget|where does the budget|how (did|do) you (get|reach|arrive at|come to) (this|that|the) budget/.test(lower))
    return {
      kind: "question", answerRef: "budget",
      say: `Phase 1 is ${fmtUSD(PHASE1_BUDGET)} for every brand, and it is the same price whichever of the three plans you pick. It is deliberately not sized from your store: the warm-up exists to find out whether this works on your real orders, and a number you had to negotiate first would just be another thing standing between you and finding out.\n\nWhat the ${fmtUSD(PHASE1_BUDGET)} buys is the creator fees for your warm-up crew, the tracking codes that attribute every order, and the reserve that pays you if the guarantee misses. Press the budget on the plan and it shows all three.`,
    };

  /* Budget, as a figure. */
  /* Money.
   *
   * Two different numbers live here and the agent must not confuse
   * them. Phase 1 is $1,000 and is not up for discussion. The PLAN
   * budget is the brand's to set, and it is the one confidence is
   * measured against — so a figure means the plan, and a question
   * about the warm-up gets the warm-up answer. */
  if (/\bwarm.?up\b|\bphase 1\b.*\b(cost|price|budget)\b|why (is|it) .{0,12}1,?000|\$?1,?000/.test(lower) && /why|cost|price|only|just|fixed/.test(lower)) {
    return {
      kind: "question", answerRef: "budget",
      say:
        `Phase 1 is always ${fmtUSD(PHASE1_BUDGET)}, for every brand, whichever plan you pick. It is the price of finding out whether this works on your real orders, so there is nothing to size and nothing to negotiate before you start.\n\n` +
        `The number you do set is the whole plan, all three phases together. That is what I measure confidence against, and only the ${fmtUSD(PHASE1_BUDGET)} warm-up is charged today.`,
    };
  }

  const money = parseMoney(t);
  if (money && /budget|spend|plan|make it|set it|raise|increase|lower|reduce|cap/.test(lower)) {
    const clamped = Math.max(PLAN_BUDGET_MIN, Math.min(PLAN_BUDGET_MAX, Math.round(money / 500) * 500));
    const roas = plan?.guaranteedRoas.value ?? 5;
    const conf = getConfidence(clamped, roas);
    const need = budgetForHigh(roas);
    return {
      kind: "edit", patch: { planBudget: clamped }, because: `because you set the plan to ${fmtUSD(clamped)}`,
      say:
        `Plan set to ${fmtUSD(clamped)} across all three phases, at ${roas}x guaranteed. That is ${conf.label.toLowerCase()}. ${conf.desc}` +
        (conf.level === "high"
          ? " Phase 1 is still the $1,000 warm-up, and it is all that is due today."
          : need !== null
            ? ` To make it high confidence at ${roas}x, the plan needs to be ${fmtUSD(need)}. I would rather push you there than promise something I am not sure of.`
            : ` At ${roas}x no plan inside HeyMoon's range reaches high confidence. Drop the multiple and I can commit properly.`),
    };
  }

  /* The push. A brand asking for high confidence is asking the agent to
     pick the numbers, which it can do exactly. */
  if (plan && /high confidence|make (it|this) (high|safe|certain)|most confident|safest (plan|option)|be sure/.test(lower)) {
    const roas = plan.guaranteedRoas.value;
    const need = budgetForHigh(roas);
    if (need !== null) {
      return {
        kind: "edit", patch: { planBudget: need }, because: "because you asked for high confidence",
        say: `Done. At ${fmtUSD(need)} across the three phases, a ${roas}x guarantee is high confidence. The ratio is ${Math.round(need / roas).toLocaleString("en-US")}, and ${CONFIDENCE_HIGH_RATIO.toLocaleString("en-US")} is the line above which HeyMoon commits rather than hopes. Phase 1 is still ${fmtUSD(PHASE1_BUDGET)}, due today.`,
      };
    }
    const best = roasForHigh(PLAN_BUDGET_MAX) ?? 3;
    return {
      kind: "edit", patch: { planBudget: PLAN_BUDGET_MAX, guaranteedRoas: best }, because: "because you asked for high confidence",
      say: `A ${roas}x guarantee cannot reach high confidence at any plan size HeyMoon offers. Even at ${fmtUSD(PLAN_BUDGET_MAX)} the ratio only gets to ${Math.round(PLAN_BUDGET_MAX / roas).toLocaleString("en-US")}. I have taken it to ${best}x at ${fmtUSD(PLAN_BUDGET_MAX)}, which is high confidence and something I can stand behind.`,
    };
  }

  /* Audience. */
  if (/\bwomen|female\b/.test(lower) || /\bmen\b|male/.test(lower) || /\bage|\d{2}\s*[-–to]+\s*\d{2}/.test(lower)) {
    const gender = /\bwomen|female\b/.test(lower) ? "female" : /\bmen\b|male/.test(lower) ? "male" : undefined;
    const ages = lower.match(/(\d{2})\s*[-–]|\bto\b\s*(\d{2})/g);
    const range = lower.match(/(\d{2})\s*[-–to ]+\s*(\d{2})/);
    const patch: PlanPatch = { audience: {} };
    if (gender) patch.audience!.gender = gender as "female" | "male";
    if (range) { patch.audience!.ageLow = parseInt(range[1], 10); patch.audience!.ageHigh = parseInt(range[2], 10); }
    if (!gender && !range && !ages) return { kind: "unknown", say: "Tell me the audience as a gender, an age range, or both. “Women 25 to 40”." };
    return {
      kind: "edit", patch, because: `because you set the audience`,
      say: `I have updated the audience. That does not change the crew on its own, because the creators' audiences already overlap it, but it does change the brief they are given.`,
    };
  }

  /* One creator fewer, without a name. The one that goes is the one that
     adds least to this phase in these markets, so the plan loses least —
     unless the brand asked for the biggest. */
  if (plan && plan.creators.value.length > 1 &&
      /\b(drop|remove|cut|lose)\b.*\b(one|a|the (biggest|largest|smallest|weakest|most expensive)) creator\b|\bone (fewer|less) creator\b/.test(lower)) {
    const read = getRead(plan.readId);
    const { rpv } = economicsOf(read);
    const focus = FOCUS_MULTIPLIER[STRATEGY_META[plan.strategy.value].lines] ?? 1;
    const worth = (id: number) => expectedFor(creatorById(id), rpv, plan.markets.value, focus);
    const ranked = plan.creators.value.map((c) => c.id).sort((a, b) => worth(a) - worth(b));
    const biggest = /biggest|largest|most expensive/.test(lower);
    const c = creatorById(biggest ? ranked[ranked.length - 1] : ranked[0]);
    return {
      kind: "edit", patch: { dropCreatorIds: [c.id] },
      because: paid ? `because you dropped ${c.name}` : "because you dropped a creator",
      say: paid
        ? `Dropping ${c.name} from the crew.`
        : `Dropping ${biggest ? "the creator with the most reach" : "the creator who adds the least to this phase"}.`,
    };
  }

  /* Creators by name. Matched on a whole word, so "Ola" does not fire
     inside another word. */
  if (plan) {
    for (const c of CREATORS) {
      const first = c.name.split(" ")[0].toLowerCase();
      const handle = c.handle.replace("@", "").toLowerCase();
      if (new RegExp(`\\b${first}\\b`).test(lower) || lower.includes(handle)) {
        const removing = /\bdrop|remove|without|not\b|no\b/.test(lower);
        if (removing)
          return {
            kind: "edit", patch: { dropCreatorIds: [c.id] },
            because: paid ? `because you dropped ${c.name}` : "because you dropped a creator",
            say: paid
              ? `Dropping ${c.name} from the crew.`
              : "Dropping that creator.",
          };
        return {
          kind: "edit", patch: { addCreatorIds: [c.id] },
          because: paid ? `because you asked for ${c.name}` : "because you asked for another creator",
          say: paid
            ? `Adding ${c.name} to the crew.`
            : "Adding that creator to the crew.",
        };
      }
    }
  }

  /* What comes next — the three steps, said from wherever the brand is. */
  if (/what (happens|comes|is) next|what.s next|what now\b|next step/.test(lower))
    return {
      kind: "question", answerRef: "next",
      say: paid
        ? "Two of the three steps are done: the plan is approved and Phase 1 is paid. The last step is connecting your store, so every order a creator brings in can be attributed to this phase. That is what the guarantee is measured against. Once it is connected, I brief the creators, and their drafts start arriving here for your approval."
        : "There are three steps, and you are on the first: review this proposed plan and change anything you want. Then you start Phase 1, which is the one payment. Last, you connect your store, so the sales can be attributed. That is what the guarantee is measured against.",
    };

  /* Questions — answered by pointing at the card that holds the answer. */
  if (/^why\b|\bwhy\b/.test(lower))
    return { kind: "question", answerRef: "why", say: "Every number on the plan has a “why this number” beside it. Open the one you mean and it will show the evidence it came from." };
  if (/\bhow (does|do|long|much)\b|\bwhat (is|are)\b/.test(lower))
    return { kind: "question", answerRef: "explain", say: "" };

  return { kind: "unknown", say: "" };
}

/* ══════════════════════════════════════════════════════════════════ */

export const tools: AgentTools = {
  read_site,
  propose_plan,
  price_plan: (i) => {
    const read = getRead(i.plan.readId);
    const meta = STRATEGY_META[i.plan.strategy.value];
    return priceOf(read, i.plan.markets.value, i.plan.budget.value, i.plan.guaranteedRoas.value, i.plan.creators.value.map((c) => creatorById(c.id)), meta.lines);
  },
  match_creators,
  edit_plan,
  request_funding,
  get_report,
  list_ads,
  request_approval,
  interpret,
};

export { economicsOf, shortlist, defaultMarkets };

/** How many creators fit this brand before the budget is applied.
    Screens read this off `plan.pool` now; this stays as the way to ask
    the question WITHOUT a plan — which is what the bounds check does,
    asserting every brand's proposal step lands inside POOL_MIN and
    POOL_MAX before the roster is ever touched. */
export function matchedPoolCount(read: BrandRead, markets: string[], pick: "score" | "value" = "score"): number {
  return matchedPool(read, markets, pick).length;
}

/* ------------------------------------------------------------------ */
/* The crew, as one number                                             */
/*                                                                     */
/* What the crew is paid is shown as a total and only as a total. These */
/* two helpers are the single place the budget slider and the pane get  */
/* that total and the range around it, so no screen re-derives it from  */
/* a percentage of the budget (which would read 65% at every position). */
/* ------------------------------------------------------------------ */

/** Σ what the current crew is paid for one deliverable each. */
export function crewCostOf(plan: Plan): number {
  return plan.creators.value.reduce((n, c) => n + creatorById(c.id).rate, 0);
}


/* ------------------------------------------------------------------ */
/* Can we still keep the promise?                                      */
/*                                                                     */
/* An edit can make a plan undeliverable — narrow the markets far       */
/* enough and the crew that is left cannot carry the multiple we were   */
/* guaranteeing. The agent has to say so unprompted, and say what it    */
/* would take, rather than quietly continuing to display a guarantee it */
/* would miss. This is the check behind that. The function names keep   */
/* the trade's word; nothing a brand reads does.                        */
/* ------------------------------------------------------------------ */

export interface Underwriting {
  implied: number;
  promised: number;
  /** The highest multiple we would still guarantee, with 10% of room to spare. */
  safeMultiple: number;
  ok: boolean;
}

export function underwriting(plan: Plan): Underwriting {
  const exp = plan.price.expected.value;
  const mid = (exp.low + exp.high) / 2;
  const budget = plan.budget.value;
  const implied = budget > 0 ? mid / budget : 0;
  const promised = plan.guaranteedRoas.value;
  return {
    implied,
    promised,
    safeMultiple: Math.max(1, Math.floor((implied / 1.1) * 2) / 2),
    ok: implied >= promised * 1.05,
  };
}

/* The repair.

   Saying "this does not work" is half an answer. The other half is the
   nearest plan that does — and with a narrow market that is usually a
   SMALLER campaign, not a smaller promise: keep only the creators whose
   audience is actually there, and the numbers come back.

   Searched rather than guessed: every crew size from one up is priced,
   and the largest one that clears a real multiple with room to spare wins. */
export interface Repair {
  kind: "shrink" | "lower" | "widen";
  crewIds: number[];
  budget: number;
  multiple: number;
  implied: number;
  headline: string;
  /** Set on a "widen": the one market that would make this work, and
      the markets the repaired plan should end up with. */
  addMarket?: string;
  markets?: string[];
}

export function repair(plan: Plan): Repair {
  const read = getRead(plan.readId);
  const markets = plan.markets.value;
  const { rpv } = economicsOf(read);
  const meta = STRATEGY_META[plan.strategy.value];
  const focus = FOCUS_MULTIPLIER[meta.lines] ?? 1;
  const budget = PHASE1_BUDGET;

  /* With the warm-up price fixed, shrinking the crew no longer helps —
     it spends less of a budget that does not move and earns less. So
     there are exactly two ways back: promise less on what we have, or
     widen the markets so the same $1,000 reaches more people. */
  const expectedOf = (seeds: CreatorSeed[], ms: string[]) =>
    seeds.reduce((a, c) => a + expectedFor(c, rpv, ms, focus), 0);
  const expectedIn = (ms: string[]) => expectedOf(shortlist(read, ms, CREW_BUDGET, meta.pick), ms);

  /* The crew the plan ACTUALLY has, not the one a fresh shortlist would
     pick. `underwriting` judges the real crew through
     `plan.price.expected`; this used to judge a rebuilt one, so the two
     `implied` figures printed in the same sentence were measured on
     different people — and "keep the crew" then handed back a crew the
     brand had never seen, silently undoing their edits. */
  const crew = plan.creators.value.map((c) => creatorById(c.id));
  const implied = expectedOf(crew, markets) / budget;

  for (const m of [8, 5, 3]) {
    if (implied >= m * 1.1) {
      return {
        kind: "lower",
        crewIds: crew.map((c) => c.id), budget, multiple: m, implied,
        headline: `Keep the crew and lower the guarantee to ${m}x, which I can stand behind on ${fmtUSD(budget)} in ${markets.map(marketName).join(", ")}.`,
      };
    }
  }

  /* Nothing in these markets works at any multiple. Do not stop at
     "no" — find the one market that would fix it, and name it. */
  const candidates = ["AE", "SA", "KW", "QA", "BH", "OM"].filter((m) => !markets.includes(m));
  let bestAdd: { code: string; implied: number; crewIds: number[]; multiple: number } | undefined;
  for (const code of candidates) {
    const ms = [...markets, code];
    const impliedThere = expectedIn(ms) / budget;
    for (const m of [8, 5, 3]) {
      if (impliedThere >= m * 1.1) {
        if (!bestAdd || impliedThere > bestAdd.implied) {
          bestAdd = {
            code, implied: impliedThere, multiple: m,
            crewIds: shortlist(read, ms, CREW_BUDGET, meta.pick).map((c) => c.id),
          };
        }
        break;
      }
    }
  }

  return {
    kind: "widen",
    crewIds: bestAdd?.crewIds ?? crew.map((c) => c.id),
    budget,
    multiple: bestAdd?.multiple ?? plan.guaranteedRoas.value,
    implied: bestAdd?.implied ?? implied,
    markets: bestAdd ? [...markets, bestAdd.code] : undefined,
    headline: bestAdd
      ? `${markets.map(marketName).join(", ")} on its own cannot carry a guarantee. The creators with real audience there do not reach enough people for ${fmtUSD(budget)} to be worth guaranteeing. Add ${marketName(bestAdd.code)} and it works: ${bestAdd.crewIds.length} creators, ${bestAdd.multiple}x guaranteed.`
      : `There is nobody in ${markets.map(marketName).join(", ")} I can guarantee sales on, and no single market I can add that fixes it. Widen it further and I will rebuild.`,
    addMarket: bestAdd?.code,
  };
}

/** What HeyMoon says when a plan stops being deliverable. */
export function underwritingNote(u: Underwriting, plan: Plan, r: Repair): string {
  if (u.ok) return "";
  const crew = plan.creators.value.length;
  return [
    `One thing first. In ${fmtMarkets(plan.markets.value)}, I expect about ${u.implied.toFixed(1)}x at this budget, not ${u.promised}x.`,
    crew < 5
      ? `Fewer creators there reach your audience for ${fmtUSD(plan.budget.value)}.`
      : `Too little of this crew's audience sits inside your markets.`,
    `I won't guarantee a number I expect to miss.`,
    r.headline,
  ].join(" ");
}

/** Everyone the plan's markets match and MoonSearch AI clears, in
    plan order. The landing page credits these people by face, niche
    and market, so it reads the real pool rather than filtering the
    roster itself and drifting from what the plan builder decided. */
export function poolFor(read: BrandRead, markets: string[]): CreatorSeed[] {
  return matchedPool(read, markets);
}
