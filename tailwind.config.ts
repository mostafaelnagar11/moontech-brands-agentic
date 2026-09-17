import type { Config } from "tailwindcss";

/* ------------------------------------------------------------------ */
/* The design system, as tokens.                                       */
/*                                                                     */
/* The current app carries these same values as ~400 hex literals      */
/* repeated across components, plus two near-duplicate palettes (a     */
/* brand one and an older Tailwind indigo/violet one). Everything      */
/* below is the brand palette, named once. The indigo layer is not     */
/* ported.                                                             */
/* ------------------------------------------------------------------ */

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        ar: ["var(--font-ar)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        /* The landing page's ground. Warm, not grey. */
        paper: "#FCFBF8",
        /* The brand purple and its ramp. `brand` is the only purple a
           control may be painted in; the ramp exists for gradients and
           tints, not for buttons. */
        brand: {
          DEFAULT: "#4D2FB0",
          hover: "#3F2596",
          500: "#7C5CE0",
          400: "#9B7BF0",
          300: "#A78BFA",
          100: "#EDE9FB",
          50: "#F6F4FC",
        },
        /* The far end of the keyline gradient. */
        blush: { DEFAULT: "#F4A8D8", deep: "#C2418B" },
        ink: { DEFAULT: "#191234", soft: "#4A4463", faint: "#8B87A0" },
        /* THE ONE RED. Reserved for "needs your action" and for money
           that is due. Never for a low score, never for a failed check. */
        danger: { DEFAULT: "#D70015", deep: "#B00011" },
        good: { DEFAULT: "#059669", deep: "#047857" },
        /* Surfaces. Every one of these used to be a neutral grey, and
           a grey surface under a purple brand reads as a default nobody
           chose. They are the same lightnesses, tinted toward the brand
           so the whole app sits in one family: `canvas` is the ground a
           page rests on, `rail` the chrome beside it, `wash` the fill
           inside a card, and `track` the groove a bar runs in. */
        canvas: "#F6F4FC",
        rail: "#FAF9FE",
        wash: "#F1EDFB",
        track: "#EFEBFA",
      },
      /* `hairline` inside cards and between rows; `rule` is the landing's
         heavier line for the masthead and section tops. */
      borderColor: { hairline: "rgba(0,0,0,0.06)", rule: "rgba(25,18,52,0.14)" },
      boxShadow: {
        card: "0 1px 2px rgba(16,12,40,0.04)",
        /* A sheet of paper lifted off the desk: short contact shadow
           plus a long, faint one. */
        sheet: "0 1px 2px rgba(25,18,52,0.04), 0 24px 48px -28px rgba(25,18,52,0.14)",
        float: "0 4px 20px rgba(16,12,40,0.07)",
        pop: "0 24px 60px -20px rgba(25,18,52,0.35)",
        dock: "0 12px 40px -12px rgba(25,18,52,0.28)",
      },
      borderRadius: { card: "16px", control: "12px", pill: "9999px" },
      /* The type scale the app actually uses, named so a rebuild stops
         inventing new pixel values. */
      fontSize: {
        micro: ["10px", { lineHeight: "14px" }],
        eyebrow: ["11px", { lineHeight: "14px", letterSpacing: "0.08em" }],
        meta: ["12px", { lineHeight: "16px" }],
        body: ["13px", { lineHeight: "20px" }],
        prose: ["15px", { lineHeight: "26px" }],
        title: ["17px", { lineHeight: "24px" }],
        figure: ["22px", { lineHeight: "26px" }],
        hero: ["34px", { lineHeight: "38px" }],
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-in-end": { from: { opacity: "0", transform: "translateX(24px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "live-pulse": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.3" } },
        "bar-reveal": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
        "toast-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "layer-in": { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        rise: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "skeleton": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.45" } },
        "caret": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
        "dock-in": { from: { opacity: "0", transform: "translateY(16px) scale(0.98)" }, to: { opacity: "1", transform: "translateY(0) scale(1)" } },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease both",
        "slide-in-end": "slide-in-end 0.32s cubic-bezier(0.22,1,0.36,1) both",
        live: "live-pulse 1.4s ease-in-out infinite",
        "toast-up": "toast-up 0.34s cubic-bezier(0.34,1.56,0.64,1) both",
        "layer-in": "layer-in 0.42s cubic-bezier(0.22,1,0.36,1) both",
        skeleton: "skeleton 1.3s ease-in-out infinite",
        rise: "rise 0.5s ease-out both",
        caret: "caret 1s step-end infinite",
        "dock-in": "dock-in 0.28s cubic-bezier(0.22,1,0.36,1) both",
        "spin-slow": "spin-slow 3s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
