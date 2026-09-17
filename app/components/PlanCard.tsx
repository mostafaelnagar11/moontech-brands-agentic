"use client";

/* The plan, as one card.

   Used in three places without modification: the proposal screen, the
   living pane beside the thread, and as a block inside the thread. Same
   object, same component — which is the point. "Adjust manually" is not
   a second wizard; it is this, with the fields unlocked. */

import { useEffect, useRef, useState } from "react";
import { CaretRight, Lightning, PencilSimple } from "@phosphor-icons/react";
import type { Plan } from "../lib/agent/types";
import { UNLOCK_AT, fmtUSD } from "../lib/mock/campaigns";
import { STRATEGY_META, marketName } from "../lib/agent/tools";
import { getRead } from "../lib/agent/registry";
import { roundBudget } from "../lib/agent/model";
import { T } from "../lib/tokens";
import { Card, Pill } from "./ui";
import { Figure, Claim } from "./Evidence";
import { RevenueRuler } from "./Ruler";
import { useT } from "../lib/i18n";
import { usePaid } from "../lib/store";

/* The expected range, as the card is allowed to show it.

   The model works the range out from the crew's real reach, so its low
   end can land under the guaranteed figure — and a range that starts
   below the floor tells the brand it might end the phase with less than
   HeyMoon owes it, which is never true. If sales land under the floor,
   HeyMoon pays the difference and the brand still banks the guaranteed
   figure, so the floor IS the low end. Clamped here, at the point of
   display, and only here: `ConfidenceMeter` reasons about the gap
   between the raw model and the guarantee, and clamping that gap shut
   would make every plan look safe. */

function Row({ label, children, onEdit, editLabel }: { label: string; children: React.ReactNode; onEdit?: () => void; editLabel?: string }) {
  return (
    <div className="flex items-start gap-3 border-t border-hairline py-3 first:border-t-0 first:pt-0">
      <p className="w-[112px] shrink-0 pt-0.5 text-meta font-medium text-ink-faint">{label}</p>
      <div className="min-w-0 flex-1">{children}</div>
      {onEdit && (
        <button
          onClick={onEdit}
          aria-label={editLabel ?? `Change ${label}`}
          className="shrink-0 rounded-control p-1.5 text-ink-faint transition hover:bg-brand/[0.06] hover:text-brand"
        >
          <PencilSimple size={13} aria-hidden />
        </button>
      )}
    </div>
  );
}

export function PlanCard({
  plan, onEdit, dense = false, onOpenCreators,
}: {
  plan: Plan;
  onEdit?: (field: "markets" | "audience" | "budget" | "strategy" | "creators" | "brief") => void;
  dense?: boolean;
  onOpenCreators?: () => void;
}) {
  const { t } = useT();
  const paid = usePaid();
  const a = plan.audience.value;
  const target = plan.price.revenueTarget.value;
  const genderWord = t(`aud.${a.gender}`);
  /* The multiple is divided out of the two figures beside it rather than
     read from `guaranteedRoas`, which is the blended average across all
     three phases. Taken from the pair on screen it can never disagree
     with them. */
  const budget = plan.budget.value;
  const multiple = budget > 0 ? Math.round((target / budget) * 10) / 10 : 0;
  /* Two different counts, and the row used to show the wrong one. The
     crew is who the fixed warm-up budget pays for; the pool is everyone
     MoonMatch AI matched and MoonSearch AI cleared, which is what the
     rest of the ladder draws on. */
  const crew = plan.creators.value.length;
  const pool = plan.pool.value || crew;
  /* The products the campaign is actually pointed at: the bestsellers
     the brief was written around, cut to the number of lines this
     strategy concentrates on. Read back through the plan's own readId,
     so the row can never name a product the brief does not cover. */
  const bestsellers = getRead(plan.readId).bestsellers;
  const products = (bestsellers?.value ?? []).slice(0, STRATEGY_META[plan.strategy.value].lines);

  return (
    <Card className={dense ? "p-4" : "p-5"}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-body font-semibold text-ink">{t("plan.phase1")}</p>
        {/* A draft until Phase 1 is paid for, and the pill says so. The
            review call asked for the unpaid state to be on screen, not
            only in the chat. */}
        <Pill tone={paid ? "good" : "muted"}>{paid ? "Started · paid" : "Draft · nothing charged"}</Pill>
        <span className="ms-auto text-meta text-ink-faint">{plan.brandName}</span>
      </div>

      {/* Two cells, and the guarantee carries the weight.

          What you pay is a cost, so it is the smallest. The guaranteed
          figure is the product, so it is the largest, with the multiple
          under it as a note rather than as a second promise. There is
          no third cell: an expected range sat here once, and a range
          beside a guarantee reads as a second, softer promise. The
          model still computes it — `underwriting` judges the crew by it
          — but the brand is shown the number HeyMoon stands behind and
          nothing that could be mistaken for it. */}
      <div className="mt-3.5 overflow-hidden rounded-control border border-hairline">
        <div className="grid gap-x-8 gap-y-3.5 p-3.5 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-ink-faint">You pay</p>
            <div className="mt-1">
              <Figure src={plan.budget} render={fmtUSD(budget)} size="md" />
            </div>
            <p className="mt-1 text-[11px] leading-4 text-ink-faint">Phase 1 only.</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-ink-faint">Guaranteed sales</p>
            <div className="mt-1">
              <Figure src={plan.price.revenueTarget} render={fmtUSD(target)} size="lg" />
            </div>
            <p className="mt-1 text-[11px] leading-4 tabular-nums text-ink-faint">{multiple}x</p>
          </div>
        </div>
        <p className="border-t border-hairline bg-wash px-3.5 py-2 text-[11px] leading-4 text-ink-soft">
          Sell more than the guarantee and it is all yours. Sell less and HeyMoon pays you the difference.
        </p>
      </div>

      <div className="mt-4">
        <RevenueRuler pct={0} srLabel="Phase not started." />
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-4 text-ink-faint">
          <Lightning size={11} weight="fill" className="mt-0.5 shrink-0 text-brand" aria-hidden />
          Phase 2 is offered at {fmtUSD(plan.price.unlockAt.value)}, which is {Math.round(UNLOCK_AT * 100)}% of this
          phase&apos;s target.
        </p>
      </div>

      <div className="mt-4">
        <Row label={t("plan.markets")} onEdit={onEdit && (() => onEdit("markets"))}>
          <Claim src={plan.markets}>{plan.markets.value.map(marketName).join(", ") || "None"}</Claim>
        </Row>
        <Row label={t("plan.audience")} onEdit={onEdit && (() => onEdit("audience"))}>
          <Claim src={plan.audience}>
            {`${genderWord}, ${a.ageLow} to ${a.ageHigh}`}
          </Claim>
        </Row>
        <Row label={t("plan.creators")} onEdit={onEdit && (() => onEdit("creators"))}>
          <div className="flex w-full items-center gap-2 text-start">
            {/* Real faces, no names — before payment and after. The review
                call cleared the pictures ("there is no harm in showing the
                icons of these profiles") and drew the line at names,
                handles and links. Nothing here carries an identity, so the
                same stack serves both states. No blur: a blurred face reads
                as a loading state, and this is a decision, not a delay. */}
            <span className="flex -space-x-2 rtl:space-x-reverse" aria-hidden>
              {plan.creators.value.slice(0, 5).map((c) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={c.id} src={c.avatar} alt="" loading="lazy" className="h-6 w-6 rounded-full bg-brand-100 object-cover ring-2 ring-white" />
              ))}
            </span>
            {/* "Matched" is the pool MoonMatch AI found, not the crew the warm-up pays
                for. The row used to say "matched" and show the crew,
                which read as though the whole match were three people.
                The crew follows it as the subset it is, so the two
                numbers can never be confused for each other. */}
            <span className="text-body text-ink-soft">
              <Figure src={plan.pool} render={`${pool} ${t("plan.matched")}`} size="sm" />
              {pool > crew ? <span className="text-ink-faint"> · {crew} in the warm-up</span> : null}
            </span>
            {/* The way to the crew is its own control. This row used to be one
                big button with the matched-count Figure inside it, which put a
                button inside a button: invalid HTML, and a hydration failure on
                any page that renders this card from the server. */}

            {onOpenCreators && (

              <button

                onClick={onOpenCreators}

                aria-label="See the creators"

                className="ms-auto grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-faint transition hover:bg-brand/[0.06] hover:text-brand"

              >

                <CaretRight size={12} aria-hidden />

              </button>

            )}
          </div>
        </Row>
        <Row label="Products">
          {bestsellers && products.length > 0 ? (
            <Claim src={bestsellers}>{products.map((p) => p.name).join(", ")}</Claim>
          ) : (
            <p className="text-body text-ink-soft">Your whole catalogue.</p>
          )}
        </Row>
        <Row label={t("plan.brief")} onEdit={onEdit && (() => onEdit("brief"))}>
          <Claim src={plan.brief.value.headline}>{plan.brief.value.headline.value}</Claim>
        </Row>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Confidence                                                          */
/* ------------------------------------------------------------------ */

/** Confidence is room: how far the model's expectation sits above the
    number we are promising to guarantee. One input, and the card says
    what it is — the current app's 85/50/20 came from a two-branch ratio
    and could not explain itself.

    The words are a store owner's, not an insurer's: "guarantee" and
    "room", never the trade terms for the same thing. */
export function ConfidenceMeter({ plan, className = "" }: { plan: Plan; className?: string }) {
  const exp = plan.price.expected.value;
  const mid = (exp.low + exp.high) / 2;
  const budget = plan.budget.value;
  const implied = budget > 0 ? mid / budget : 0;
  const g = plan.guaranteedRoas.value;
  const ratio = g > 0 ? implied / g : 0;
  const pctv = Math.max(6, Math.min(100, Math.round((ratio - 0.9) * 130)));
  const room = Math.round((ratio - 1) * 100);

  const tone =
    ratio >= 1.35 ? { bar: "bg-good", text: "text-good-deep", ring: "border-good/20 bg-good/[0.06]", word: "Comfortable" }
    : ratio >= 1.12 ? { bar: "bg-brand", text: "text-brand", ring: "border-brand/20 bg-brand/[0.05]", word: "Workable" }
    : ratio >= 1.0 ? { bar: "bg-danger", text: "text-danger", ring: "border-danger/20 bg-danger/[0.05]", word: "Thin" }
    : { bar: "bg-danger", text: "text-danger", ring: "border-danger/25 bg-danger/[0.07]", word: "Cannot be guaranteed" };

  return (
    <div className={`rounded-control border px-4 py-3 ${tone.ring} ${className}`}>
      <div className="flex items-center gap-3">
        <div aria-hidden className="h-1.5 w-24 shrink-0 overflow-hidden rounded-pill bg-black/[0.07]">
          <div className={`h-full rounded-pill transition-all duration-500 ${tone.bar}`} style={{ width: `${pctv}%` }} />
        </div>
        <p className={`shrink-0 text-body font-semibold ${tone.text}`} role="status">{tone.word}</p>
        <p className="min-w-0 flex-1 text-meta leading-5 text-ink-soft">
          {ratio >= 1
            ? `HeyMoon expects this crew to bring about ${implied.toFixed(1)}x in sales in these markets. The guarantee is ${g}x, which leaves ${room}% of room above it.`
            : `HeyMoon expects this crew to bring about ${implied.toFixed(1)}x in sales in these markets, and the guarantee is ${g}x. There is no room above it, so HeyMoon will not quote this until the budget or the crew changes.`}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Budget dial                                                         */
/*                                                                     */
/* The calculator the review call asked for. The figure it starts on is */
/* the agent's own suggestion, worked out from the crew; the brand can   */
/* move it, and everything downstream — the guarantee, the unlock line,  */
/* the two later phases — moves with it.                                 */
/* ------------------------------------------------------------------ */

export function BudgetDial({
  value, min, max, suggested, ladder = [], onChange, onCommit, guarantee, crewCost,
}: {
  value: number;
  min: number;
  max: number;
  /** The agent's own figure, marked on the track so the brand can see
      how far they have moved from it. */
  suggested: number;
  /** The phases the plan carries now. Each later phase is a fixed
      multiple of Phase 1, so scaling them to the slider gives the same
      numbers edit_plan will produce, before it is asked. */
  ladder: { phaseNo: number; budget: number; multiple: number }[];
  /** Every tick, for anything that wants to follow the thumb live. */
  onChange?: (n: number) => void;
  /** Once per gesture: pointer up, key up or focus leaving. This is the
      one that edits the plan. */
  onCommit: (n: number) => void;
  guarantee: number;
  /** What the whole crew is paid, as one number. Never per person. */
  crewCost: number;
}) {
  const { dir } = useT();

  /* Local visual state. The thumb follows the pointer; the plan does not.
     A drag crosses many 500-dollar ticks, and each one would otherwise be
     an edit_plan call and an attribution row. So the number on screen is
     `local`, and the plan hears about it once, when the gesture ends.
     `committed` remembers what the plan last heard, so a pointer-up
     followed by a blur does not commit the same figure twice. */
  const [local, setLocal] = useState(value);
  /* `latest` mirrors `local` so commit reads the figure the thumb is on
     even if pointer-up arrives before React has re-rendered the handler. */
  const latest = useRef(value);
  const committed = useRef(value);
  useEffect(() => {
    setLocal(value);
    latest.current = value;
    committed.current = value;
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const move = (n: number) => {
    const v = clamp(n);
    latest.current = v;
    setLocal(v);
    onChange?.(v);
  };
  const commitValue = (v: number) => {
    if (v === committed.current) return;
    committed.current = v;
    onCommit(v);
  };
  const commit = () => commitValue(latest.current);
  const backToSuggested = () => {
    move(suggested);
    commitValue(latest.current);
  };

  const span = Math.max(1, max - min);
  const pctOf = (n: number) => Math.min(100, Math.max(0, ((n - min) / span) * 100));
  const pct = pctOf(local);
  const tickPct = pctOf(suggested);
  /* The thumb is 18px wide and travels the track minus its own width, so
     its centre sits at pct% of the track plus a correction that runs from
     +9px at the start to -9px at the end. The tick uses the same maths so
     it lands under the thumb exactly when the two figures agree. */
  const tickOffset = `calc(${tickPct}% + ${(9 - tickPct * 0.18).toFixed(2)}px)`;

  const crewShare = local > 0 ? Math.round((crewCost / local) * 100) : 0;
  const floor = roundBudget(crewCost / 0.8);

  const base = ladder.find((r) => r.phaseNo === 1)?.budget ?? ladder[0]?.budget ?? 0;
  const scaled = ladder.map((r) => {
    const budget = base > 0 ? roundBudget(local * (r.budget / base)) : 0;
    return { budget, guaranteed: budget * r.multiple };
  });
  const allBudget = scaled.reduce((n, r) => n + r.budget, 0);
  const allGuaranteed = scaled.reduce((n, r) => n + r.guaranteed, 0);
  const phaseCount = ladder.length === 3 ? "three" : ladder.length === 2 ? "two" : String(ladder.length);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-body font-medium text-ink">Suggested Phase 1 budget</p>
        <p className="text-title font-semibold tabular-nums text-brand" aria-live="polite">{fmtUSD(local)}</p>
      </div>
      <p className="mt-1 text-meta leading-5 text-ink-soft">
        Worked out from your bestsellers and the creators who fit them. Move it and I will re-plan around it.
      </p>

      <div className="mt-3 flex items-center gap-2.5">
        <span className="w-12 shrink-0 text-[11px] font-medium tabular-nums text-ink-faint">{fmtUSD(min)}</span>
        <div className="relative min-w-0 flex-1">
          <input
            type="range"
            min={min}
            max={max}
            step={500}
            value={local}
            onChange={(e) => move(Number(e.target.value))}
            onPointerUp={commit}
            onKeyUp={commit}
            onBlur={commit}
            aria-label="Phase 1 budget in dollars"
            aria-valuetext={local === suggested ? `${fmtUSD(local)}, the HeyMoon suggestion` : fmtUSD(local)}
            className="relative z-10 block h-2 w-full cursor-pointer appearance-none rounded-pill"
            style={{ background: `linear-gradient(to ${dir === "rtl" ? "left" : "right"}, ${T.brand} ${pct}%, ${T.track} ${pct}%)` }}
          />
          {/* The tick: where our own figure sits. Hidden while the thumb
              is on it, because then the thumb is the tick. */}
          {local !== suggested && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 z-20 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full rtl:translate-x-1/2"
              style={{ insetInlineStart: tickOffset, background: T.inkFaint }}
            />
          )}
        </div>
        <span className="w-14 shrink-0 text-end text-[11px] font-medium tabular-nums text-ink-faint">{fmtUSD(max)}</span>
      </div>

      <p className="mt-2.5 text-meta leading-5 text-ink-soft">
        At {fmtUSD(local)}, Phase 1 guarantees{" "}
        <span className="font-semibold tabular-nums text-ink">{fmtUSD(local * guarantee)}</span> in sales, which is the{" "}
        {guarantee}x HeyMoon stands behind. Creator fees for the whole crew come to {fmtUSD(crewCost)}, which is{" "}
        {crewShare}% of it. The rest is matching, tracking and the reserve that pays out if the guarantee misses.
      </p>
      {ladder.length > 1 && (
        <p className="mt-1.5 text-meta leading-5 text-ink-soft">
          Across all {phaseCount} phases that is about{" "}
          <span className="font-semibold tabular-nums text-ink">{fmtUSD(allBudget)}</span> budget for{" "}
          <span className="font-semibold tabular-nums text-ink">{fmtUSD(allGuaranteed)}</span> guaranteed.
        </p>
      )}
      {crewShare > 80 && (
        <p className="mt-1.5 text-meta font-medium leading-5 text-danger">
          Below about {fmtUSD(floor)} there is not enough left for tracking and the guarantee reserve. Take one creator out, or raise the budget.
        </p>
      )}
      {local !== suggested && (
        <button
          type="button"
          onClick={backToSuggested}
          className="mt-2 text-meta font-semibold text-brand hover:underline"
        >
          Use the HeyMoon suggestion, {fmtUSD(suggested)}
        </button>
      )}
    </div>
  );
}
