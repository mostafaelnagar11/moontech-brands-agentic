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
import { useCountUp, useInView } from "../../lib/useReveal";

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
  const [box, seen] = useInView<SVGSVGElement>(0.35);
  return (
    <svg
      ref={box} {...(seen ? { "data-drawn": "" } : {})}
      aria-hidden viewBox="0 0 520 260" fill="none" className={className} preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="hm-curve" x1="0" y1="0" x2="520" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4D2FB0" /><stop offset="0.5" stopColor="#7C5CE0" /><stop offset="1" stopColor="#F0559D" />
        </linearGradient>
        <linearGradient id="hm-curve-fill" x1="0" y1="0" x2="0" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C5CE0" stopOpacity="0.20" /><stop offset="1" stopColor="#7C5CE0" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* The line is drawn, then the area under it fills in behind.
          `pathLength="1"` normalises the dash maths, so the stylesheet
          can draw any path without knowing how long it is. */}
      <path className="draw-fill" d="M0 236 C 92 232 132 214 186 186 C 236 160 268 132 318 102 C 368 72 432 36 520 12 L520 260 L0 260 Z" fill="url(#hm-curve-fill)" />
      <path className="draw" pathLength={1} d="M0 236 C 92 232 132 214 186 186 C 236 160 268 132 318 102 C 368 72 432 36 520 12" stroke="url(#hm-curve)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** The guarantee, as the panel it deserves: one figure, lit from behind. */
export function GuaranteePanel({ revenue, budget, roas, label, note }: {
  revenue: number; budget: string; roas: number; label: string; note: string;
}) {
  const [box, seen] = useInView<HTMLDivElement>(0.35);
  const shown = useCountUp(revenue, seen, 1300);
  return (
    <div ref={box} className="relative overflow-hidden rounded-[22px] bg-[#141229] px-8 py-12 ring-1 ring-white/[0.08] sm:px-12 sm:py-16">
      <div aria-hidden className="hm-glow-dark pointer-events-none absolute inset-x-0 bottom-[-30%] h-[80%]" />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">{label}</p>
        <p className="num mt-4 text-[clamp(44px,6vw,76px)] font-semibold leading-none tracking-[-0.04em] text-white">{fmtUSD(shown)}</p>
        <p className="mt-5 text-[14px] text-white/50">
          <span className="num">{budget}</span> {note} <span className="num">{roas}x</span>
        </p>
        <Curve className="pointer-events-none mt-10 h-24 w-full opacity-90" />
      </div>
    </div>
  );
}

/** Where the run ends: the climb, not the cheque.
 *
 * This was a card with a sales figure on it. A figure is a claim the
 * reader has to take on trust and it sat beside two other figures in
 * the same panel, which is three numbers to hold on a landing page.
 * A chart says the same thing in a shape: the campaign starts at cost
 * and climbs through three phases to the multiple HeyMoon guaranteed.
 * The only number left is that multiple, on the point where it lands.
 *
 * The line draws when the step opens. A chart that is already finished
 * when you look at it is a picture of a result; one that draws is the
 * result arriving, which is what the step is about. */
export function MockCurve({ active, rungs, label }: {
  active: boolean; rungs: { phaseNo: number; multiple: number }[]; label: string;
}) {
  /* Room above the top point so the tallest label is never clipped, and
     a floor the curve leaves from rather than starting mid-air. */
  const top = Math.max(...rungs.map((r) => r.multiple)) * 1.12;
  const x = (i: number) => 38 + i * ((240 - 38) / Math.max(1, rungs.length - 1));
  const y = (m: number) => 112 - (m / top) * 84;
  const pts: [number, number][] = [[6, 118], ...rungs.map((r, i): [number, number] => [x(i), y(r.multiple)])];
  const line = smoothPath(pts);
  const last = rungs[rungs.length - 1];

  return (
    <div aria-hidden className={FRAME}>
      <div className="overflow-hidden rounded-[18px] bg-white p-4 shadow-[0_2px_4px_rgba(25,18,52,0.05),0_20px_40px_-16px_rgba(25,18,52,0.22)] ring-1 ring-ink/[0.06]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
        <svg viewBox="0 0 290 150" className="mt-2 w-full" {...(active ? { "data-drawn": "" } : {})}>
          <defs>
            <linearGradient id="hm-climb" x1="0" y1="0" x2="290" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4D2FB0" /><stop offset="0.55" stopColor="#7C5CE0" /><stop offset="1" stopColor="#F0559D" />
            </linearGradient>
            <linearGradient id="hm-climb-fill" x1="0" y1="0" x2="0" y2="130" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7C5CE0" stopOpacity="0.18" /><stop offset="1" stopColor="#7C5CE0" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* One rule per phase, so the climb reads against the ladder
              rather than against nothing. */}
          {rungs.map((r, i) => (
            <line key={r.phaseNo} x1={x(i)} y1="18" x2={x(i)} y2="118" stroke="rgba(25,18,52,0.06)" strokeWidth="1" />
          ))}
          <line x1="0" y1="118" x2="290" y2="118" stroke="rgba(25,18,52,0.09)" strokeWidth="1" />

          <path className="draw-fill" d={`${line} L ${x(rungs.length - 1)} 118 L 6 118 Z`} fill="url(#hm-climb-fill)" />
          <path className="draw" pathLength={1} d={line} fill="none" stroke="url(#hm-climb)" strokeWidth="2.5" strokeLinecap="round" />

          {/* Each phase lands as the line reaches it, not all at once
              the moment the line starts. */}
          {rungs.map((r, i) => (
            <circle
              key={r.phaseNo} cx={x(i)} cy={y(r.multiple)} r="3.5"
              fill="#fff" stroke="#7C5CE0" strokeWidth="2"
              className="draw-fill" style={{ transitionDelay: `${360 + i * 300}ms` }}
            />
          ))}

          {/* The one number the chart keeps: where it lands. */}
          <g className="draw-fill" style={{ transitionDelay: `${360 + rungs.length * 300}ms` }}>
            <rect x={x(rungs.length - 1) - 23} y={y(last.multiple) - 32} width="46" height="21" rx="10.5" fill="#191234" />
            <text x={x(rungs.length - 1)} y={y(last.multiple) - 17.5} textAnchor="middle" className="num fill-white" style={{ fontSize: 12, fontWeight: 600 }}>
              {last.multiple}x
            </text>
          </g>

          {rungs.map((r, i) => (
            <text key={r.phaseNo} x={x(i)} y="136" textAnchor="middle" className="fill-ink/35" style={{ fontSize: 10 }}>
              Phase {r.phaseNo}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

/** A single smooth path through a set of points. The control points sit
    on the midline between each pair, so the curve eases between them
    without ever overshooting above the higher of the two. */
function smoothPath(pts: [number, number][]) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
  }
  return d;
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

/* The dial is a half circle of radius 80 centred at (100,100) in a
   200x124 box, so the sweep runs from (20,100) on the left round to
   (180,100) on the right. Angles are the ordinary mathematical ones:
   180 degrees is the floor, 0 degrees the ceiling. */
const R = 80;
const pt = (deg: number, r = R): [number, number] => [
  100 + r * Math.cos((deg * Math.PI) / 180),
  100 - r * Math.sin((deg * Math.PI) / 180),
];

/** 1x sits at the left end of the sweep, the maximum at the right. */
const angleFor = (v: number, min: number, max: number) => 180 - ((v - min) / (max - min)) * 180;

export function RoasDial({ value, min, max, label, note }: {
  value: number; min: number; max: number; label: string; note: string;
}) {
  const [box, seen] = useInView<HTMLElement>(0.45);
  const a = angleFor(value, min, max);
  const [vx, vy] = pt(a);
  const [sx, sy] = pt(180);
  const [ex, ey] = pt(0);
  return (
    <figure ref={box} {...(seen ? { "data-drawn": "" } : {})} className="mx-auto w-full max-w-[420px]">
      <svg viewBox="0 0 200 124" className="w-full" role="img" aria-label={`${label}: ${value}x`}>
        <defs>
          <linearGradient id="hm-dial" x1="20" y1="0" x2="180" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4D2FB0" /><stop offset="0.55" stopColor="#7C5CE0" /><stop offset="1" stopColor="#F0559D" />
          </linearGradient>
        </defs>
        <path d={`M ${sx} ${sy} A ${R} ${R} 0 0 1 ${ex} ${ey}`} fill="none" stroke="rgba(25,18,52,0.09)" strokeWidth="10" strokeLinecap="round" />
        {/* The arc sweeps from the floor to the guaranteed multiple,
            and the marker rides it: the dial is set, not printed. */}
        <path className="draw" pathLength={1} d={`M ${sx} ${sy} A ${R} ${R} 0 0 1 ${vx} ${vy}`} fill="none" stroke="url(#hm-dial)" strokeWidth="10" strokeLinecap="round" />
        <circle
          className="dial-dot" cx={sx} cy={sy} r="7.5" fill="#fff" stroke="#7C5CE0" strokeWidth="3.5"
          style={{ ["--sweep" as string]: `${180 - a}deg` }}
        />
        <text x="100" y="92" textAnchor="middle" className="fill-ink num" style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-0.03em" }}>
          {value}x
        </text>
        <text x="20" y="118" textAnchor="middle" className="fill-ink/35 num" style={{ fontSize: 11 }}>{min}x</text>
        <text x="180" y="118" textAnchor="middle" className="fill-ink/35 num" style={{ fontSize: 11 }}>{max}x</text>
      </svg>
      <figcaption className="mt-1 text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-brand">{label}</p>
        <p className="mt-2 text-[14px] text-ink/50">{note}</p>
      </figcaption>
    </figure>
  );
}
