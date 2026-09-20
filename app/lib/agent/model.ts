/* The numbers model.

   Every figure this prototype shows is computed here, from inputs that
   can be named on screen. Nothing is typed in as a plausible-looking
   round number — that was the failure mode of the current app, where
   confidence percentages, fit scores and reach estimates all appeared
   without provenance.

   The chain, end to end:

     orders per view   ← HeyMoon benchmark, by category
     average order     ← the brand's own median price, converted
     revenue per view  = the two multiplied
     market fit        ← the share of a creator's audience inside the
                         plan's markets, from the creator's own splits
     expected revenue  = Σ (creator views × revenue per view × market fit)
                         × a focus multiplier for how many product lines
                           the phase concentrates on
     crew cost         = Σ creator rates
     budget            = crew cost ÷ the creator share of a budget
     implied return    = expected revenue ÷ budget

   Change any input and every downstream number moves, which is what
   makes "budget → $6,000 because you said Kuwait only" a real
   consequence rather than a caption. */

import type { CreatorSeed } from "../mock/creators";

/** AED to USD. The Gulf pegs are fixed, so this is a constant, not a rate. */
export const AED_USD = 3.6725;

/** What share of a phase budget reaches creators. The rest is matching,
    tracking, and the reserve that pays out when a guarantee misses. */
export const CREATOR_SHARE = 0.65;

/** Orders per view, by category. HeyMoon's own platform benchmark
    across comparable brands — the only figure here that is not derived
    from the brand's own data, and it is labelled as a benchmark
    everywhere it appears. */
export const ORDERS_PER_VIEW: Record<CategoryFamily, number> = {
  luxury: 0.00085,
  beauty: 0.0011,
  grocery: 0.00175,
  general: 0.00095,
};

export type CategoryFamily = "luxury" | "beauty" | "grocery" | "general";

export function familyOf(category: string): CategoryFamily {
  const c = category.toLowerCase();
  if (/grocer|produce|food deliver/.test(c)) return "grocery";
  if (/luxur|designer|fashion/.test(c)) return "luxury";
  if (/beauty|skincare|cosmetic/.test(c)) return "beauty";
  return "general";
}

/** How much a single view is worth, in dollars. */
export function revenuePerView(medianPriceAed: number, family: CategoryFamily) {
  return (medianPriceAed / AED_USD) * ORDERS_PER_VIEW[family];
}

/** The share of a creator's audience that sits inside the plan's
    markets. This is the number that moves when a brand narrows its
    markets, and it is why narrowing changes the whole plan. */
export function marketFit(c: CreatorSeed, markets: string[]): number {
  if (!markets.length) return 0;
  const want = new Set(markets);
  const inside = c.topMarkets.filter((m) => want.has(m.code)).reduce((n, m) => n + m.share, 0);
  return inside / 100;
}

/** Below this, a creator is not worth briefing for these markets. */
/* How many creators a single phase's shortlist may hold.

   The floor is what makes a plan worth reading: fewer than seven names
   behind a guarantee is a favour, not a campaign, and a brand cannot
   tell whether a crew of three is a careful match or all we had. The
   ceiling is the other half of the same argument — past thirteen a
   shortlist stops being a shortlist, and MoonSearch AI is vouching for
   people nobody looked at twice.

   Only the ceiling is enforced. POOL_MIN is a target the ROSTER has to
   meet, not a clamp the code applies: padding a thin market up to seven
   with creators who do not clear MIN_MARKET_FIT would be exactly the
   lie that cut exists to prevent. It is checked by hand against every
   brand's proposal step — all three fixtures land at 8 — and it is
   documented here so a future roster change has something to fail
   against. Narrow the markets far enough and the pool honestly falls
   below it; `repair` then offers to widen them, on its own economics
   rather than on this constant. */
export const POOL_MIN = 7;
export const POOL_MAX = 13;

export const MIN_MARKET_FIT = 0.08;

/** Concentrating a phase on fewer product lines raises conversion,
    because the same audience sees the same thing more than once. It also
    removes the second product that would otherwise carry the phase if
    the first one does not land. */
export const FOCUS_MULTIPLIER: Record<number, number> = { 2: 1.45, 4: 1.0, 8: 0.85 };

export function expectedFor(c: CreatorSeed, rpv: number, markets: string[], focus: number) {
  return c.avgViews * rpv * marketFit(c, markets) * focus;
}

/** Value for money, before market fit. Used to rank a shortlist. */
export function efficiency(c: CreatorSeed, rpv: number) {
  return c.rate > 0 ? (c.avgViews * rpv) / c.rate : 0;
}

/** Round a budget to something a person would actually type. */
export const roundBudget = (n: number) => Math.max(500, Math.round(n / 500) * 500);

/** How much room there is between what we expect and what we promise.
    Under 10% and the strategy is flagged rather than sold. */
export function headroom(expected: number, budget: number, multiple: number) {
  const implied = budget > 0 ? expected / budget : 0;
  return { implied, ratio: multiple > 0 ? implied / multiple : 0 };
}

/** Confidence, as a share, from headroom alone. Deliberately a single
    input: the old app's 85 / 50 / 20 came from a two-branch ratio and
    could not say what it meant. */
export function confidenceFrom(implied: number, multiple: number) {
  if (multiple <= 0) return 0;
  const r = implied / multiple;
  // 1.0 (no headroom) → 0.35 ; 1.5 → 0.9 ; flattening after that
  return Math.max(0.05, Math.min(0.95, 0.35 + (r - 1) * 1.1));
}

/* ══════════════════════════════════════════════════════════════════
   CONFIDENCE
   ══════════════════════════════════════════════════════════════════

   The shape is the current app's campaign calculator:

       ratio = plan budget ÷ the multiple you are asking us to guarantee

       ratio ≥ 2,500   high      we can commit to this
       ratio ≥ 1,000   medium    achievable on strong creator work
       below           low       lower the multiple or raise the budget

   The two thresholds are NOT the current app's. It underwrites at
   12,000 and 4,000, which put the smallest committable plan at $60,000
   for a 5x guarantee. This prototype was moved to 2,500 and 1,000 at
   the client's direction, so that $10,000 at 4x is a plan HeyMoon
   commits to rather than one it refuses: the opening pitch quotes that
   pair, and an agent that proposes a number and then declines to
   underwrite it is worse than either number alone.

   What this actually changed, in one line: HeyMoon now commits to
   plans 4.8 times thinner than the current app will. That is an
   underwriting decision and not a display one — every guarantee on
   every plan is priced off this ratio, and the money HeyMoon pays out
   when a phase misses is set by it.

   Two consequences worth knowing. The old rule made a high multiple
   unreachable at high confidence whatever you spent: 8x topped out at
   a ratio of 10,000 against the $80,000 cap. Under 2,500 every
   multiple the product offers, up to 12x, reaches high confidence
   inside the cap, so the bar no longer says "a very high multiple is a
   bet however much you spend on it" — because under these thresholds
   it is not saying that any more. And the floor for ANY commitment
   drops with it: at 1,000, a 12x guarantee is medium at $12,000.

   What IS new is that the number explains itself. In the old app the
   bar filled to 85, 50 or 20 with nothing behind it. Here every
   confidence carries the arithmetic that produced it, because a brand
   being pushed towards a different number deserves to see why. */

export const CONFIDENCE_HIGH_RATIO = 2_500;
export const CONFIDENCE_MEDIUM_RATIO = 1_000;
export const PLAN_BUDGET_MIN = 1_000;
export const PLAN_BUDGET_MAX = 80_000;
export const ROAS_MIN = 1;
export const ROAS_MAX = 12;

/** The rule in one sentence, built from the thresholds rather than
    typed beside them: the agent quotes this in its evidence, and a
    policy that says 12,000 while the code says 2,500 is a policy the
    brand is entitled to call a lie. */
export const CONFIDENCE_RULE =
  `Plan budget ÷ guaranteed multiple. ${CONFIDENCE_HIGH_RATIO.toLocaleString("en-US")} and above is high, ` +
  `${CONFIDENCE_MEDIUM_RATIO.toLocaleString("en-US")} and above is medium, below that HeyMoon will not commit.`;

export type ConfidenceLevel = "high" | "medium" | "low";

export interface Confidence {
  level: ConfidenceLevel;
  label: string;
  /** How full the bar is. Kept at the old app's 85 / 50 / 20. */
  pct: number;
  /** One sentence a brand can act on. */
  desc: string;
  ratio: number;
}

export function getConfidence(budget: number, roas: number): Confidence {
  const ratio = roas > 0 ? budget / roas : 0;
  if (ratio >= CONFIDENCE_HIGH_RATIO) {
    return {
      level: "high", label: "High confidence", pct: 85, ratio,
      desc: roas <= 2
        ? "HeyMoon can commit to this plan without reservation."
        : "A good combination of budget and target multiple. HeyMoon can commit to it.",
    };
  }
  if (ratio >= CONFIDENCE_MEDIUM_RATIO) {
    return {
      level: "medium", label: "Medium confidence", pct: 50, ratio,
      desc: "Achievable, but it needs strong creator performance rather than average creator performance.",
    };
  }
  return {
    level: "low", label: "Low confidence", pct: 20, ratio,
    desc: "Too big a multiple asked of too little budget. Lower it, or raise the plan.",
  };
}

/** The smallest plan budget that reaches high confidence at this
    multiple — or null when the cap makes it impossible. */
export function budgetForHigh(roas: number): number | null {
  const needed = Math.ceil((roas * CONFIDENCE_HIGH_RATIO) / 500) * 500;
  return needed <= PLAN_BUDGET_MAX ? Math.max(needed, PLAN_BUDGET_MIN) : null;
}

/* Below this we do not propose a multiple, however confident the ratio
   says we could be. A 1× guarantee is the brand spending a thousand
   dollars to make a thousand dollars back — arithmetically safe and
   commercially pointless, and the review call said so out loud. A
   brand can still ask for one; we just never suggest it. */
export const ROAS_WORTH_PROPOSING = 2;

/* Medium is the floor we will build at, so a low-confidence answer
   needs somewhere to go even when high is out of reach. These two are
   the same arithmetic against the lower threshold, and between them a
   brand is never left in a dead end: the most expensive multiple we
   allow, 12×, reaches medium at $48,000, well inside the range. */

/** The smallest plan budget that reaches medium confidence at this
    multiple. */
export function budgetForMedium(roas: number): number | null {
  const needed = Math.ceil((roas * CONFIDENCE_MEDIUM_RATIO) / 500) * 500;
  return needed <= PLAN_BUDGET_MAX ? Math.max(needed, PLAN_BUDGET_MIN) : null;
}

/** The highest multiple that still reaches high confidence at this
    budget. Whole numbers only — nobody guarantees 3.7× — and never a
    multiple that would not be worth running. */
export function roasForHigh(budget: number): number | null {
  const best = Math.floor(budget / CONFIDENCE_HIGH_RATIO);
  return best >= ROAS_WORTH_PROPOSING ? Math.min(best, ROAS_MAX) : null;
}

/** The highest multiple this budget still carries at medium. */
export function roasForMedium(budget: number): number | null {
  const best = Math.floor(budget / CONFIDENCE_MEDIUM_RATIO);
  return best >= ROAS_WORTH_PROPOSING ? Math.min(best, ROAS_MAX) : null;
}
