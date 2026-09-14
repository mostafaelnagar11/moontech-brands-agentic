"use client";

/* The campaign, beside the conversation.

   Everything the old proposal screen held, in a 440px column: the plan
   card, the fixed warm-up price, the three plans to choose between, the
   three phases, the crew, the brief, and the record of what has moved
   since the plan was proposed.

   What it deliberately does NOT hold is a way to start Phase 1. The
   panel is where the brand reads and adjusts; the conversation is where
   they act, and payment only ever begins there. Two buttons that both
   take money would be two places to explain, and one of them would be
   the wrong one.

   Once Phase 1 is paid the plan is what the payment was made against,
   so the editing affordances go away rather than quietly repricing a
   phase that has already started. */

import { PHASE1_BUDGET, phasesFor } from "../../lib/agent/tools";
import { fmtUSD } from "../../lib/mock/campaigns";
import { useActivePlan, usePaid } from "../../lib/store";
import { Claim, Figure } from "../Evidence";
import { Card, Eyebrow } from "../ui";
import { ConfidenceMeter, PlanCard } from "../PlanCard";
import { CreatorNames, CreatorSummary } from "../CreatorCard";
import { BriefBlock, ChangesBlock, LadderBlock } from "../blocks";

/** Small counts read better as words inside a sentence. */
const spell = (n: number) =>
  ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);

export function PlanPanel() {
  const plan = useActivePlan();
  const paid = usePaid();
  const [, phase2, phase3] = phasesFor(plan?.planBudget?.value ?? 10_000);

  /* Nothing to show is not an error state and does not need a card, a
     heading or a button — the one thing to do is in the message box. */
  if (!plan) {
    return (
      <p className="text-body leading-6 text-ink-soft">
        Paste your store link in the conversation and I will read the store, then build the campaign here from what I find.
      </p>
    );
  }

  /* Two counts, never a fee. How many the warm-up briefs, and how many
     MoonMatch found in total — the second is the whole point of saying
     the first, because $1,000 is what decides the difference. */
  const crew = plan.creators.value.length;
  const pool = plan.pool.value || null;


  return (
    <div className="space-y-4">
      <PlanCard plan={plan} dense />

      {/* ── The price of the warm-up ─────────────────────────────
          No slider, and nothing derived. Phase 1 is $1,000 for every
          brand and for all three plans, so there is no number here for
          anyone to move — and a control that cannot change anything is
          worse than no control. What a brand can change is below: what
          the thousand is pointed at. */}
      {!paid && (
        <Card className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-body font-semibold text-ink">The warm-up is always</p>
            <Figure size="lg" render={fmtUSD(PHASE1_BUDGET)} src={plan.budget} />
          </div>
          <p className="mt-1.5 text-meta leading-5 text-ink-soft">
            The same price for every brand and for all three plans below. It is not sized from your store and
            it is not negotiated: the warm-up exists to find out whether this works on your real orders, and a
            number you had to agree first would only stand between you and finding out.
          </p>
          <Claim src={plan.ladder} className="mt-2 border-t border-hairline pt-2">
            <span className="text-meta leading-5">
              Phase 2 is {fmtUSD(phase2)} and Phase 3 is {fmtUSD(phase3)}. Neither is charged
              or committed today, and each is quoted for real only when it unlocks.
            </span>
          </Claim>
        </Card>
      )}

      {/* No plan chooser here.

          The whole campaign — how big it is, and what return we
          guarantee on it — is settled once, in the conversation, on the
          calculator. Repeating it in the panel gave a brand two places
          to change the same two numbers and no way to tell which one
          they had already answered. Ask in the chat to change either. */}

      {/* The whole campaign, three phases. No Start button here — that
          lives in the conversation, where the payment is explained. */}
      <LadderBlock plan={plan} compact paid={paid} />

      <ConfidenceMeter plan={plan} />

      {/* ── The crew ─────────────────────────────────────────────
          Counts and faces before Phase 1 is paid for, names after it —
          and what anyone is paid appears in neither, in any state.

          The number that matters here is a fraction, not a total: the
          warm-up briefs a SUBSET of what MoonMatch found, because
          $1,000 buys that many creator fees and no more. Saying "3
          creators matched" would hide the pool and make Phases 2 and 3
          look like an upsell rather than the rest of the same crew. */}
      <section aria-label="The creators">
        <Eyebrow>Who the warm-up briefs</Eyebrow>
        <Claim src={plan.creators} className="mt-1.5">
          <span className="text-body leading-6">
            {pool ? (
              <>
                {crew} of the {pool} creators MoonMatch AI found for you, and MoonSearch AI cleared every one of
                them. {fmtUSD(PHASE1_BUDGET)} briefs {spell(crew)}; Phases 2 and 3 bring in the rest.
              </>
            ) : (
              <>
                The {spell(crew)} creators {fmtUSD(PHASE1_BUDGET)} briefs, out of everyone MoonMatch AI found for you
                and MoonSearch AI cleared. Phases 2 and 3 bring in the rest.
              </>
            )}
            {paid && (
              <> Phase 1 has started, so you can see who they are. Their recent posts and the reason behind each
                match sit on the campaign view.</>
            )}
          </span>
        </Claim>
        <div className="mt-2.5">
          {paid ? <CreatorNames creators={plan.creators.value} /> : <CreatorSummary creators={plan.creators.value} matched={pool ?? undefined} />}
        </div>
      </section>

      {/* The brief the creators will be given, drafted from the read. */}
      <BriefBlock plan={plan} />

      {/* ── What moved ───────────────────────────────────────────
          Newest first: the last thing the brand changed is the thing
          they are most likely to be checking. Anything that names a
          creator is inside `detail`, which stays hidden until Phase 1
          is paid for. */}
      {plan.changes.length > 0 && (
        <section aria-label="What changed">
          <ChangesBlock changes={[...plan.changes].reverse()} />
          <p className="mt-2 text-[11px] leading-4 text-ink-faint">
            Every change since the plan was proposed, newest first, each with the reason it was made.
          </p>
        </section>
      )}
    </div>
  );
}
