/* The design tokens, in TypeScript, for the places CSS classes cannot
   reach: SVG strokes, canvas gradients, inline styles.

   These are the same values as tailwind.config.ts. Import from here
   rather than typing a hex — the current app has ~400 hex literals and
   two near-duplicate palettes because it never had this file. */

export const T = {
  brand: "#4D2FB0",
  brandHover: "#3F2596",
  brand500: "#7C5CE0",
  brand400: "#9B7BF0",
  brand300: "#A78BFA",
  brand100: "#EDE9FB",
  brand50: "#F6F4FC",
  blush: "#F4A8D8",
  blushDeep: "#C2418B",
  ink: "#191234",
  inkSoft: "#4A4463",
  inkFaint: "#8B87A0",
  danger: "#D70015",
  dangerDeep: "#B00011",
  good: "#059669",
  goodDeep: "#047857",
  canvas: "#F7F7F8",
  rail: "#FAFAFA",
  track: "#EFEBFA",
  hairline: "rgba(0,0,0,0.06)",
} as const;

/** The keyline gradient, for SVG `linearGradient` stops. */
export const KEYLINE_STOPS = [
  { offset: "0%", color: T.brand },
  { offset: "55%", color: T.brand400 },
  { offset: "100%", color: T.blush },
] as const;

/* Shared class recipes. Declared once here rather than as a `const card`
   redeclared in five files. */
export const CARD = "rounded-card bg-white border border-hairline shadow-card";
export const CARD_TIGHT = "rounded-control bg-white border border-hairline shadow-card";
export const EYEBROW = "text-eyebrow font-semibold uppercase tracking-[0.14em]";
export const FIELD =
  "w-full rounded-control border border-black/[0.09] bg-white px-4 py-2.5 text-body text-ink outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-control bg-brand px-4 py-2.5 text-body font-semibold text-white transition hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-brand/40";
export const BTN_QUIET =
  "inline-flex items-center justify-center gap-2 rounded-control border border-black/[0.09] bg-white px-4 py-2.5 text-body font-semibold text-ink-soft transition hover:bg-neutral-50 active:scale-[0.98]";
