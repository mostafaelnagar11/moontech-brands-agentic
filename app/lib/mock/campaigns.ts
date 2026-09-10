/* The phase ladder, ported from the current app's `app/lib/campaigns.ts`.

   The rules are unchanged and are the best-specified thing in the
   original codebase:

   - A CAMPAIGN IS A PHASE. Brands do not create or name campaigns.
   - The sequence is UNBOUNDED in the running mock. Three phases are
     named; past that a phase is titled by its number. What a brand is
     SOLD is three phases — see `ladderFor` in the agent — and the words
     "ladder", "rung" and "climb" stay in this file's mechanics and never
     reach a brand-facing string.
   - Phases run STRICTLY IN SEQUENCE, so a brand has at most one live
     phase at a time.
   - A phase must reach 80% of its own revenue target to unlock the next,
     which the brand then starts.
   - Each brand has its own ladder. Nothing totals across brands.
   - `rev` and `roas` are PER PHASE, never run-cumulative.

   What is new here: every ad carries a compliance read that is SIGNED
   by the agent that ran it — MoonShot AI on the catalogue, MoonSearch
   AI on brand and fraud risk, MoonWriter AI on the brief it wrote
   itself — and every autonomous action is logged, in `store.ts`, with
   the agent that took it, a reason and an undo. */

import type { AdRecord, Evidence, Sourced } from "../agent/types";
import { creatorById } from "./creators";

const ev = (id: string, kind: Evidence["kind"], label: string, detail: string): Evidence =>
  ({ id, kind, label, detail });
const s = <T,>(value: T, why: string, evidence: Evidence[], computedFrom?: string): Sourced<T> =>
  ({ value, why, evidence, computedFrom, setBy: "agent" });

/* "Warm-up" is the review call's own word for Phase 1. The other two are
   only ever shown beside the sentence in that phase's note ("Phase 2 is
   where the campaign scales up: …", "Phase 3 is the peak: …"), because a
   one-word phase name on its own is the kind of label the call rejected. */
export const PHASE_NAMES = ["Warm-up", "Scale", "Peak"] as const;
export const phaseTitle = (no: number) =>
  no <= PHASE_NAMES.length ? `Phase ${no} · ${PHASE_NAMES[no - 1]}` : `Phase ${no}`;

export const VAT_RATE = 0.05;
export const vatOn = (n: number) => Math.round(n * VAT_RATE);
export const withVat = (n: number) => n + vatOn(n);
export const UNLOCK_AT = 0.8;

export const fmtUSD = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
export function fmtCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + "K";
  return String(n);
}
export const pct = (n: number) => `${Math.round(n)}%`;

export type PhaseStatus = "live" | "ready" | "locked" | "ended";

export interface Phase {
  id: string;
  phaseNo: number;
  status: PhaseStatus;
  start: string | null;
  end: string | null;
  budget: number;
  guaranteedRoas: number;
  rev: number;
  revTarget: number | null;
  /** Days the phase has been running, used for the pace forecast. */
  dayOfPhase: number | null;
  /** The window the phase is expected to need, from the plan. */
  plannedDays: number | null;
  creators: number | null;
}

/* One brand's ladder — Ounass, two rungs in, the third unlocked and
   waiting. This is the running demo.

   The budgets are not sized for this brand and were never negotiated.
   Phase 1 is the fixed $1,000 warm-up every brand starts on, and
   $3,000 and $6,000 are the two rungs quoted behind it — the same
   PHASE1_BUDGET, PHASE_2_BUDGET and PHASE_3_BUDGET the agent builds a
   proposal from, so this history and a fresh plan agree to the dollar.
   Phase 4 is past what a brand is sold; it is here only because the
   sequence does not stop at three.

   The crew sizes follow the budget rather than the other way round:
   $1,000 leaves $650 for creator fees, which briefed three creators in
   the warm-up, and $3,000 opened Phase 2 to the eight the matched pool
   could supply. */
export const PHASES: Phase[] = [
  {
    id: "phase-1", phaseNo: 1, status: "ended",
    start: "8 Jan 2026", end: "6 Feb 2026",
    /* Guaranteed at 1× — the warm-up owes the brand their money back
       and nothing more. It returned 5.2× of it, which is the whole
       argument for funding Phase 2. */
    budget: 1_000, guaranteedRoas: 1, rev: 5_200, revTarget: 1_000,
    dayOfPhase: 29, plannedDays: 30, creators: 3,
  },
  {
    id: "phase-2", phaseNo: 2, status: "live",
    start: "10 Feb 2026", end: null,
    budget: 3_000, guaranteedRoas: 5, rev: 12_600, revTarget: 15_000,
    dayOfPhase: 19, plannedDays: 30, creators: 8,
  },
  {
    id: "phase-3", phaseNo: 3, status: "ready",
    start: null, end: null,
    budget: 6_000, guaranteedRoas: 5, rev: 0, revTarget: null,
    dayOfPhase: null, plannedDays: 30, creators: null,
  },
  {
    id: "phase-4", phaseNo: 4, status: "locked",
    start: null, end: null,
    budget: 10_000, guaranteedRoas: 5, rev: 0, revTarget: null,
    dayOfPhase: null, plannedDays: 30, creators: null,
  },
];

export const phaseById = (id: string) => PHASES.find((p) => p.id === id);
export const livePhase = () => PHASES.find((p) => p.status === "live");
export const readyPhase = () => PHASES.find((p) => p.status === "ready");
export const nextPhase = (no: number) => PHASES.find((p) => p.phaseNo === no + 1);

/** Revenue as a share of this phase's own target. */
export const phasePct = (p: Phase) =>
  p.revTarget ? Math.round((p.rev / p.revTarget) * 100) : null;

/* ------------------------------------------------------------------ */
/* Pace                                                                */
/*                                                                     */
/* The forecast is a straight-line run rate on the days elapsed. It is  */
/* deliberately the simplest defensible model, because the screen has   */
/* to be able to say exactly how the number was reached.                */
/* ------------------------------------------------------------------ */

export function pace(p: Phase) {
  if (!p.revTarget || !p.dayOfPhase || !p.plannedDays) return null;
  const perDay = p.rev / p.dayOfPhase;
  const atEnd = perDay * p.plannedDays;
  const pctNow = (p.rev / p.revTarget) * 100;
  const pctForecast = (atEnd / p.revTarget) * 100;
  const unlockRev = p.revTarget * UNLOCK_AT;
  const daysToUnlock = p.rev >= unlockRev ? 0 : Math.ceil((unlockRev - p.rev) / perDay);
  return {
    perDay,
    atEnd,
    pctNow,
    pctForecast,
    daysToUnlock,
    daysLeft: p.plannedDays - p.dayOfPhase,
    onPace: pctForecast >= UNLOCK_AT * 100,
  };
}

/* ------------------------------------------------------------------ */
/* Ads                                                                 */
/* ------------------------------------------------------------------ */

interface AdSeed {
  id: string; campaignId: string; creatorId: number;
  product: string; caption: string;
  format: AdRecord["format"]; platform: AdRecord["platform"];
  img: string; video?: string; submitted: string; track: string;
  state: AdRecord["state"];
  verdict: AdRecord["compliance"]["verdict"];
  /** Why the agent reached that verdict, in its own words. */
  reasoning: string;
  /** Overrides for the brief checks; omitted means all clean. `by` is
      the agent that raised it — a risk is MoonSearch AI's, a miss
      against the brief is MoonWriter AI's. */
  issue?: { label: string; detail: string; by: string };
  views?: number; revenue?: number;
}

const SEEDS: AdSeed[] = [
  /* ── Waiting on the brand ── */
  {
    id: "ad-1", campaignId: "phase-2", creatorId: 1,
    product: "Linen Wrap Dress — Sand", caption: "Six days in the linen wrap dress, no steamer, no ironing — here's how it actually held up.",
    format: "Reel", platform: "Instagram", img: "/creators/jawahralsuwaidi/p1.jpg",
    submitted: "3h ago", track: "MT-P2-1147", state: "waiting", verdict: "approve",
    reasoning: "Matches the brief on all four counts: the product is named in the first three seconds, the code is on screen for eleven seconds, the register is editorial rather than salesy, and the format is a Reel as specified. Her last four Ounass posts averaged 4.1× the phase median on saves.",
  },
  {
    id: "ad-2", campaignId: "phase-2", creatorId: 3,
    product: "Structured Leather Tote", caption: "Is the tote worth it? I carried it every day for three weeks — honest verdict at the end.",
    format: "Reel", platform: "Instagram", img: "/creators/olafarahat/p1.jpg",
    submitted: "5h ago", track: "MT-P2-1152", state: "waiting", verdict: "approve-with-note",
    reasoning: "Clean against the brief, but the tote is your first bestseller and she also publishes for Farfetch. The overlap is declared and allowed under your guidelines, and there is no competing product in frame. Worth knowing rather than worth holding.",
    issue: { by: "MoonSearch AI", label: "Overlap logged, not blocked", detail: "Ola Farahat also publishes for Farfetch. Allowed under your guidelines; no competing product appears in this draft." },
  },
  {
    id: "ad-3", campaignId: "phase-2", creatorId: 9,
    product: "Ribbed Knit Set — Ecru", caption: "Tried the ribbed knit set in two sizes so you don't have to. Sizing notes at the end.",
    format: "Reel", platform: "Instagram", img: "/creators/paola.elsitt/p1.jpg",
    submitted: "9h ago", track: "MT-P2-1160", state: "waiting", verdict: "approve",
    reasoning: "On brief. The sizing angle is the one your brief asked for by name, and the code appears twice.",
  },
  {
    id: "ad-4", campaignId: "phase-2", creatorId: 4,
    product: "Belted Trench — Stone", caption: "Unboxing the trench everyone keeps asking about. First impressions, completely unedited.",
    format: "Video", platform: "TikTok", img: "/creators/mais.mustafa/p1.jpg",
    submitted: "14h ago", track: "MT-P2-1163", state: "waiting", verdict: "hold",
    reasoning: "The brief asks for the discount code on screen for at least five seconds. In this cut it appears for two, in the last frame, over a busy background. Everything else is on brief. A re-cut with the code held longer is a small ask and I would rather ask than let it run underperforming.",
    issue: { by: "MoonWriter AI", label: "Code visible for 2s, brief asks for 5s", detail: "The code appears at 0:41 over a moving background and is gone by 0:43. Attribution on this phase runs entirely through that code." },
  },
  {
    id: "ad-5", campaignId: "phase-2", creatorId: 1,
    product: "Gold Vermeil Hoops", caption: "The hoops I haven't taken off in a month — gym, shower, everything. Still gold.",
    format: "Reel", platform: "Instagram", img: "/creators/jawahralsuwaidi/p2.jpg",
    submitted: "Yesterday", track: "MT-P2-1171", state: "waiting", verdict: "approve",
    reasoning: "On brief and on voice. The durability angle matches how your own product copy describes the piece.",
  },
  {
    id: "ad-6", campaignId: "phase-2", creatorId: 6,
    product: "Amber Oud Eau de Parfum", caption: "Thirty days on Amber Oud before I reviewed it. The truth about the sillage.",
    format: "Video", platform: "TikTok", img: "/creators/ghalya.mu2/p1.jpg",
    submitted: "Yesterday", track: "MT-P2-1174", state: "waiting", verdict: "approve",
    reasoning: "On brief. Fragrance is your third bestseller and this is the only draft covering it, so approving it widens what the phase is testing.",
  },
  /* ── Live ── */
  {
    id: "ad-live-1", campaignId: "phase-2", creatorId: 1,
    product: "Pearl Mesh Clutch", caption: "The pearl mesh clutch on camera rather than on a plinth — code and piece number on screen.",
    format: "Reel", platform: "Instagram", img: "/ads/palm-ounass-clutch.jpg", video: "/ads/palm-ounass-clutch.mp4",
    submitted: "6d ago", track: "MT-P2-V01", state: "live", verdict: "approve",
    reasoning: "Approved by you on 24 Feb; MoonLive AI published it the same day.", views: 61_400, revenue: 3_180,
  },
  {
    id: "ad-live-2", campaignId: "phase-2", creatorId: 2,
    product: "Ounass Beauty Edit", caption: "Full face using nothing outside the Ounass beauty edit. Shade names as she goes.",
    format: "Story", platform: "Instagram", img: "/ads/memz-ounass-story.jpg", video: "/ads/memz-ounass-story.mp4",
    submitted: "5d ago", track: "MT-P2-V02", state: "live", verdict: "approve",
    reasoning: "Approved by you on 25 Feb; MoonLive AI published it the same day.", views: 38_900, revenue: 2_240,
  },
  {
    id: "ad-live-3", campaignId: "phase-2", creatorId: 10,
    product: "Ounass Luxury Haul", caption: "What actually arrived from the haul, unpacked in one take and rated out loud.",
    format: "Video", platform: "TikTok", img: "/ads/noon-ounass-tiktok.jpg", video: "/ads/noon-ounass-tiktok.mp4",
    submitted: "4d ago", track: "MT-P2-V03", state: "live", verdict: "approve",
    reasoning: "Approved by you on 26 Feb; MoonLive AI published it the same day.", views: 104_200, revenue: 4_010,
  },
  {
    id: "ad-live-4", campaignId: "phase-2", creatorId: 7,
    product: "Ounass Exclusive — The Resort Ritual", caption: "Walking the Resort Ritual edit on site, gift sets first, with the code on screen.",
    format: "Story", platform: "Instagram", img: "/ads/cosmo-ounass-story.jpg", video: "/ads/cosmo-ounass-story.mp4",
    submitted: "3d ago", track: "MT-P2-V04", state: "live", verdict: "approve",
    reasoning: "Approved by you on 27 Feb; MoonLive AI published it the same day.", views: 44_700, revenue: 1_910,
  },
  {
    id: "ad-live-5", campaignId: "phase-2", creatorId: 9,
    product: "Linen Blazer — Chalk", caption: "The linen blazer after a full day in 38 degrees. Creases and all.",
    format: "Post", platform: "Instagram", img: "/creators/paola.elsitt/p3.jpg",
    submitted: "6d ago", track: "MT-P2-1119", state: "live", verdict: "approve",
    reasoning: "Approved by you on 24 Feb; MoonLive AI published it the same day.", views: 52_300, revenue: 1_270,
  },
  /* ── Declined ── */
  {
    id: "ad-dec-1", campaignId: "phase-2", creatorId: 3,
    product: "Printed Cut-Out Co-Ord", caption: "The printed co-ord in real sun and real wind. Chain-detail close-ups so you can judge it.",
    format: "Reel", platform: "Instagram", img: "/creators/olafarahat/p2.jpg",
    submitted: "3d ago", track: "MT-P2-1186", state: "declined", verdict: "approve",
    reasoning: "You declined this on 1 Mar for tone. MoonLive AI publishes only a draft you have approved, so nothing went out, and a decline can be reopened.",
  },
];

/** The three checks that run on every draft before it reaches the brand,
    plus the agent's own read against the brief.

    Every check names the agent that ran it, because "we checked" is not
    a check. MoonShot AI holds your catalogue, so matching the product
    to it is its job. MoonSearch AI vets creators for brand and fraud
    risk, so disclosure, competitors and declared overlaps are its call.
    MoonWriter AI wrote the brief, so anything measured against the
    brief is its verdict rather than anyone else's.

    Two checks are constant; the third is derived from the creator's
    declared conflict, so the panel carries a real advisory rather than
    three decorative ticks. */
function checksFor(seed: AdSeed) {
  const c = creatorById(seed.creatorId);
  const base = [
    { label: "Product matched to your catalogue", detail: `MoonShot AI · ${seed.product} — in stock, price synced`, clean: true },
    { label: "Paid partnership disclosed", detail: `MoonSearch AI · Label set on the ad · tracking code ${seed.track}`, clean: true },
  ];
  const third = seed.issue
    ? { label: seed.issue.label, detail: `${seed.issue.by} · ${seed.issue.detail}`, clean: false }
    : c.conflict
    ? { label: "Overlap logged, not blocked", detail: `MoonSearch AI · ${c.name}: ${c.conflict}. Allowed under your guidelines.`, clean: false }
    : { label: "Inside your brand guidelines", detail: "MoonSearch AI · No competing brand in her last 90 days", clean: true };
  return [...base, third];
}

export const ADS: AdRecord[] = SEEDS.map((seed) => {
  const c = creatorById(seed.creatorId);
  return {
    id: seed.id,
    campaignId: seed.campaignId,
    creatorId: seed.creatorId,
    creatorName: c.name,
    avatar: c.avatar,
    product: seed.product,
    caption: seed.caption,
    format: seed.format,
    platform: seed.platform,
    img: seed.img,
    video: seed.video,
    submitted: seed.submitted,
    track: seed.track,
    state: seed.state,
    compliance: {
      checks: checksFor(seed),
      verdict: seed.verdict,
      reasoning: s(
        seed.reasoning,
        "MoonWriter AI read this draft against the brief it wrote for this phase. Publishing is never its call: an ad goes out only when you approve it, and MoonLive AI is what puts it live.",
        [
          ev(`brief-${seed.id}`, "policy", "your Phase 2 brief", "Written by MoonWriter AI · Product named in the first 3s · code on screen 5s · editorial register · Reel or short video."),
          ev(`draft-${seed.id}`, "creator", `${c.name}'s draft`, `Submitted ${seed.submitted} · tracking code ${seed.track}.`),
        ]
      ),
    },
    performance:
      seed.views !== undefined && seed.revenue !== undefined
        ? {
            views: s(seed.views, "Reported by the platform against this ad's tracking code.", [
              ev(`v-${seed.id}`, "platform", `${seed.platform} insights`, `${fmtCount(seed.views)} views on ${seed.track}.`),
            ]),
            revenue: s(seed.revenue, "Orders attributed to this ad's unique tracking code.", [
              ev(`r-${seed.id}`, "orders", "your connected store", `${fmtUSD(seed.revenue)} attributed to ${seed.track}.`),
            ]),
          }
        : undefined,
  };
});

/* The review window. An undecided draft publishes on its own after this
   many days, which is the one thing about the queue a brand must be told
   plainly and repeatedly. */
export const REVIEW_WINDOW_DAYS = 10;

export function draftDaysLeft(submitted: string): number | null {
  if (/^\s*\d+\s*h\b/i.test(submitted)) return REVIEW_WINDOW_DAYS;
  if (/yesterday/i.test(submitted)) return REVIEW_WINDOW_DAYS - 1;
  const d = submitted.match(/^\s*(\d+)\s*d\b/i);
  return d ? Math.max(REVIEW_WINDOW_DAYS - Number(d[1]), 0) : null;
}
