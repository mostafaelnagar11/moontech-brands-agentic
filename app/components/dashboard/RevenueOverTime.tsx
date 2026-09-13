"use client";

/* Revenue over time — the combo chart from the current app's dashboard,
 * ported bar for bar.
 *
 * FIXTURE DATA. `REV_TIME` below is a hard-coded twelve-month series
 * copied verbatim from `app/dashboard/page.tsx` in the current app, and
 * it is the one block on the home page that is NOT derived from the
 * store. A phase carries a window ("10 Feb 2026 –") and a single
 * revenue total, never a monthly series, so there is nothing per-month
 * to read off a ladder yet. It is here because the shape of the screen
 * is what this port is for; the moment a real series exists, this
 * constant is what gets deleted.
 *
 * Colours go through tokens wherever a token holds the same value:
 * #4D2FB0 is `brand`, #EDE9FB is `brand-100`, and #A78BFA is
 * `brand-300` — brand-400 in this config is #9B7BF0, a different
 * purple, so the orders line uses the ramp step that actually matches
 * the old app's hex. The three greys left as literals (#f4f4f6 grid,
 * #b3b3bb axis labels, #ddd4f5 legend keyline) have no token holding
 * their value, and inventing one for a chart axis would put a fourth
 * near-grey into the palette.
 */

const REV_TIME = [
  { month: "Jan", rev: 300,   orders: 75 },
  { month: "Feb", rev: 300,   orders: 75 },
  { month: "Mar", rev: 1500,  orders: 375 },
  { month: "Apr", rev: 3200,  orders: 800 },
  { month: "May", rev: 5800,  orders: 1450 },
  { month: "Jun", rev: 8200,  orders: 2050 },
  { month: "Jul", rev: 10700, orders: 2675 },
  { month: "Aug", rev: 14500, orders: 3625 },
  { month: "Sep", rev: 18500, orders: 4625 },
  { month: "Oct", rev: 200,   orders: 50 },
  { month: "Nov", rev: 200,   orders: 50 },
  { month: "Dec", rev: 200,   orders: 50 },
];

export function RevenueOverTime() {
  const W = 700, H = 210, PL = 46, PR = 46, PT = 14, PB = 8;
  const cW = W - PL - PR, cH = H - PT - PB;
  const maxRev = 20000, maxOrd = 7500;
  const n = REV_TIME.length;
  const colW = cW / n;
  const barW = Math.min(colW * 0.52, 26);
  const r = barW / 2;
  const peak = REV_TIME.reduce((best, d, i) => (d.rev > REV_TIME[best].rev ? i : best), 0);

  const ordY = (v: number) => PT + cH - (v / maxOrd) * cH;
  const cx = (i: number) => PL + (i + 0.5) * colW;

  const dots = REV_TIME.map((d, i) => ({ x: cx(i), y: ordY(d.orders) }));
  const line = dots
    .map((p, i, a) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const q = a[i - 1];
      const mx = (q.x + p.x) / 2;
      return `C${mx},${q.y} ${mx},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");

  const yLeft  = ["$20k", "$16k", "$12k", "$8k", "$4k", "$0"];
  const yRight = ["7,500", "6,000", "4,500", "3,000", "1,500", "0"];

  return (
    <div>
      {/* No fixed height: the viewBox owns the aspect, so the chart fills
          whatever column it lands in instead of letterboxing inside it.
          The plot itself stays LTR in Arabic — a time axis running Jan to
          Dec is geometry, not text. */}
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="h-auto w-full" style={{ direction: "ltr" }}>
        {/* Grid + left labels */}
        {yLeft.map((l, i) => {
          const y = PT + (i / (yLeft.length - 1)) * cH;
          return (
            <g key={l}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f4f4f6" strokeWidth="1" />
              <text x={PL - 8} y={y + 3.5} textAnchor="end" fontSize="9.5" fill="#b3b3bb">{l}</text>
            </g>
          );
        })}
        {/* Right labels */}
        {yRight.map((l, i) => {
          const y = PT + (i / (yRight.length - 1)) * cH;
          return <text key={l} x={W - PR + 8} y={y + 3.5} textAnchor="start" fontSize="9.5" fill="#b3b3bb">{l}</text>;
        })}

        {/* Revenue bars */}
        {REV_TIME.map((d, i) => {
          const bH = Math.max((d.rev / maxRev) * cH, 4);
          const y = PT + cH - bH;
          const rx = Math.min(r, bH / 2);
          return (
            <g key={d.month}>
              <title>{`${d.month}. $${d.rev.toLocaleString()} in sales · ${d.orders.toLocaleString()} orders`}</title>
              <rect
                x={cx(i) - r} y={y} width={barW} height={bH} rx={rx} ry={rx}
                className={i === peak ? "fill-brand" : "fill-brand-100"}
              />
            </g>
          );
        })}

        {/* Peak value callout */}
        <text
          x={cx(peak)} y={PT + cH - (REV_TIME[peak].rev / maxRev) * cH - 8}
          textAnchor="middle" fontSize="10" fontWeight="600" className="fill-brand"
        >
          {`$${(REV_TIME[peak].rev / 1000).toFixed(1)}k`}
        </text>

        {/* Orders curve */}
        <path d={line} fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-brand-300" />
        {dots.map((p, i) => (
          <g key={REV_TIME[i].month}>
            <title>{`${REV_TIME[i].month}. ${REV_TIME[i].orders.toLocaleString()} orders`}</title>
            <circle cx={p.x} cy={p.y} r="2.5" className="fill-brand-300" />
          </g>
        ))}

        {/* X-axis month labels */}
        {REV_TIME.map((d, i) => (
          <text
            key={d.month} x={cx(i)} y={H + 22} textAnchor="middle" fontSize="10"
            fontWeight={i === peak ? 600 : 400} fill="#b3b3bb"
            className={i === peak ? "fill-brand" : undefined}
          >
            {d.month}
          </text>
        ))}
      </svg>

      <div className="mt-2 flex items-center gap-5 text-meta text-ink-faint">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-[3px] border border-[#ddd4f5] bg-brand-100" />
          Sales
        </span>
        <span className="flex items-center gap-2">
          <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden>
            <line x1="0" y1="5" x2="20" y2="5" strokeWidth="2" strokeLinecap="round" className="stroke-brand-300" />
            <circle cx="10" cy="5" r="2.5" className="fill-brand-300" />
          </svg>
          Orders
        </span>
      </div>
    </div>
  );
}
