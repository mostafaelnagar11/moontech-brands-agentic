"use client";

/* The product, drawn small.
 *
 * A landing card that holds a list of labels and values is a page
 * describing itself. The reference this page is measured against puts a
 * picture of the product inside every card: a floating input with a
 * cursor in it, a preview with an element selected, a panel of
 * connected services. The eye reads an object; it skims a list.
 *
 * So these are objects. Each is a small, honest likeness of a real
 * surface in this product, bound to the same plan the conversation
 * builds, and each is decorative to a screen reader because the
 * sentence beneath the card carries the meaning. They bleed off the
 * bottom of their media area on purpose: a cropped interface reads as a
 * real screen continuing past the frame, where a centred one reads as
 * clip art.
 */

import type { Plan } from "../../lib/agent/types";

/* Every mock sits centred in its media area.
 *
 * They were pinned to the top so they would run off the bottom edge,
 * on the theory that a cropped interface reads as a screen that keeps
 * going. In practice it just left a pool of empty gradient under each
 * one, in the short card areas and the tall panel alike. Centred, the
 * tint reads as a mount around the object rather than as space the
 * object failed to fill. */
const FRAME = "absolute inset-x-6 top-1/2 -translate-y-1/2 sm:inset-x-8";
import { fmtUSD } from "../../lib/mock/campaigns";

/** The field, as the brand first meets it: a link typed, a cursor. */
export function MockField({ url }: { url: string }) {
  return (
    <div aria-hidden className={FRAME}>
      <div className="rounded-[18px] bg-white p-5 shadow-[0_2px_4px_rgba(25,18,52,0.05),0_20px_40px_-16px_rgba(25,18,52,0.22)] ring-1 ring-ink/[0.06]">
        <p dir="ltr" className="flex items-center text-[19px] tracking-[-0.01em] text-ink">
          <span className="num">{url}</span>
          {/* The caret. Static: a blinking cursor in a still picture of a
              screen is motion with nothing behind it. */}
          <span className="ms-0.5 inline-block h-[22px] w-px bg-brand" />
        </p>
        <div className="mt-6 flex items-center justify-between">
          <span className="h-7 w-7 rounded-full bg-ink/[0.05]" />
          <span className="rounded-[9px] bg-ink px-3.5 py-2 text-[12px] font-semibold text-white">Build</span>
        </div>
      </div>
    </div>
  );
}

/** The plan card, cropped: what a brand is shown before paying. */
export function MockPlan({ plan, markets }: { plan: Plan; markets: string[] }) {
  return (
    <div aria-hidden className={FRAME}>
      <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_2px_4px_rgba(25,18,52,0.05),0_20px_40px_-16px_rgba(25,18,52,0.22)] ring-1 ring-ink/[0.06]">
        <div className="flex items-center justify-between border-b border-ink/[0.06] px-4 py-2.5">
          <span className="text-[11px] font-semibold text-ink">Phase 1 · Warm-up</span>
          <span className="rounded-full bg-good/10 px-2 py-0.5 text-[10px] font-semibold text-good-deep">Guaranteed</span>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-baseline justify-between border-b border-ink/[0.05] pb-3">
            <span className="text-[11px] text-ink/45">You pay</span>
            <span className="num text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">{fmtUSD(plan.budget.value)}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 text-[11px]">
            <span className="text-ink/45">Markets</span>
            <span className="text-ink/80">{markets.slice(0, 3).join(", ")}</span>
          </div>
          <div className="flex items-center justify-between border-t border-ink/[0.05] py-2.5 text-[11px]">
            <span className="text-ink/45">Creators</span>
            <span className="flex -space-x-1.5 rtl:space-x-reverse">
              {plan.creators.value.map((c) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={c.id} src={c.avatar} alt="" className="h-5 w-5 rounded-full object-cover ring-2 ring-white" />
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The ladder: one phase funded, two waiting behind their gate. */
export function MockPhases({ rungs }: { rungs: { phaseNo: number; budget: number; multiple: number }[] }) {
  const widths = ["38%", "68%", "100%"];
  return (
    <div aria-hidden className={FRAME}>
      <div className="rounded-[16px] bg-white p-4 shadow-[0_2px_4px_rgba(25,18,52,0.05),0_20px_40px_-16px_rgba(25,18,52,0.22)] ring-1 ring-ink/[0.06]">
        {rungs.map((r, i) => (
          <div key={r.phaseNo} className={i > 0 ? "mt-3.5" : ""}>
            <div className="flex items-baseline justify-between">
              <span className={`text-[11px] font-medium ${i === 0 ? "text-ink" : "text-ink/40"}`}>Phase {r.phaseNo}</span>
              <span className={`num text-[12px] font-semibold ${i === 0 ? "text-ink" : "text-ink/40"}`}>{fmtUSD(r.budget)}</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-ink/[0.05]">
              <div className={`h-full rounded-full ${i === 0 ? "hm-grad-rule" : "bg-ink/10"}`} style={{ width: widths[i] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The rising line behind the figures. A shape, not a claim: it carries
    no axis and no scale, and every number beside it is written out. */
export function Curve({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 520 260" fill="none" className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id="hm-curve" x1="0" y1="0" x2="520" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4D2FB0" /><stop offset="0.5" stopColor="#7C5CE0" /><stop offset="1" stopColor="#F0559D" />
        </linearGradient>
        <linearGradient id="hm-curve-fill" x1="0" y1="0" x2="0" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C5CE0" stopOpacity="0.20" /><stop offset="1" stopColor="#7C5CE0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 236 C 92 232 132 214 186 186 C 236 160 268 132 318 102 C 368 72 432 36 520 12 L520 260 L0 260 Z" fill="url(#hm-curve-fill)" />
      <path d="M0 236 C 92 232 132 214 186 186 C 236 160 268 132 318 102 C 368 72 432 36 520 12" stroke="url(#hm-curve)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** The guarantee, as the panel it deserves: one figure, lit from behind. */
export function GuaranteePanel({ revenue, budget, roas, label, note }: {
  revenue: string; budget: string; roas: number; label: string; note: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-[#141229] px-8 py-12 ring-1 ring-white/[0.08] sm:px-12 sm:py-16">
      <div aria-hidden className="hm-glow-dark pointer-events-none absolute inset-x-0 bottom-[-30%] h-[80%]" />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">{label}</p>
        <p className="num mt-4 text-[clamp(44px,6vw,76px)] font-semibold leading-none tracking-[-0.04em] text-white">{revenue}</p>
        <p className="mt-5 text-[14px] text-white/50">
          <span className="num">{budget}</span> {note} <span className="num">{roas}x</span>
        </p>
        <Curve className="pointer-events-none mt-10 h-24 w-full opacity-90" />
      </div>
    </div>
  );
}

/** Checkout, cropped at the total: what pressing the button commits to. */
export function MockPay({ total, vat, budget }: { total: string; vat: string; budget: string }) {
  return (
    <div aria-hidden className={FRAME}>
      <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_2px_4px_rgba(25,18,52,0.05),0_20px_40px_-16px_rgba(25,18,52,0.22)] ring-1 ring-ink/[0.06]">
        <div className="px-4 pb-4 pt-4">
          <p className="text-[11px] text-ink/45">Due today</p>
          <p className="num mt-1 text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink">{total}</p>
          <p className="num mt-2 text-[11px] text-ink/45">{budget} + {vat} VAT</p>
          <div className="mt-4 flex items-center gap-2 rounded-[10px] bg-ink/[0.04] px-3 py-2">
            <span className="h-4 w-6 rounded-[3px] bg-ink/15" />
            <span className="num text-[11px] text-ink/60">•••• 4629</span>
          </div>
          <div className="mt-3 rounded-[10px] bg-ink py-2.5 text-center text-[12px] font-semibold text-white">Pay {total}</div>
        </div>
      </div>
    </div>
  );
}

/** A draft waiting on the brand: nothing goes out without a decision. */
export function MockDraft({ avatar }: { avatar?: string }) {
  return (
    <div aria-hidden className={FRAME}>
      <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_2px_4px_rgba(25,18,52,0.05),0_20px_40px_-16px_rgba(25,18,52,0.22)] ring-1 ring-ink/[0.06]">
        <div className="flex items-center gap-2.5 px-4 py-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <span className="h-7 w-7 rounded-full bg-ink/10" />
          )}
          <span className="flex-1 text-[11px] font-medium text-ink">Draft, waiting on you</span>
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">Reel</span>
        </div>
        <div className="mx-4 h-[74px] rounded-[10px] bg-gradient-to-br from-ink/[0.07] to-ink/[0.03]" />
        <div className="flex gap-2 p-4">
          <span className="flex-1 rounded-[9px] border border-ink/10 py-2 text-center text-[11px] font-medium text-ink/55">Decline</span>
          <span className="flex-1 rounded-[9px] bg-ink py-2 text-center text-[11px] font-semibold text-white">Approve</span>
        </div>
      </div>
    </div>
  );
}
