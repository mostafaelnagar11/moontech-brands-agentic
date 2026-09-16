"use client";

/* Landing.
 *
 * Every card on this page contains a picture of the product, not a list
 * describing it. That is the whole correction: the previous cut typeset
 * labels and values into hairline rows, and a row of text is something
 * a visitor skims. An object is something they read. The mocks live in
 * app/components/landing/Mocks.tsx and are bound to the same
 * `planFor(ounass)` the conversation builds, so nothing here is a
 * drawing of a product that does not exist.
 *
 * The register: off-white ground, black headings in the interface
 * grotesque with tight tracking, grey body, very round white cards, and
 * ONE accent gradient spent in three places only, as a glow behind the
 * field, as a 2px rule, and on a single line of type. No serif: a
 * display serif through the headings is what made this read as a
 * magazine rather than as software.
 *
 * It is not a marketplace. There is no roster and no grid of faces.
 * Creators appear once, as three avatars inside the plan mock, where
 * the product itself puts them.
 *
 * Copy is heymoon-copy-changes-before-after, L1 to L17. Its three
 * promises head the three cards rather than being printed as a
 * separate row, so the page argues by showing.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Globe, Lock, Storefront } from "@phosphor-icons/react";
import { Wordmark } from "./components/Wordmark";
import { LangToggle } from "./components/DirSync";
import { MockField, MockPay, MockPhases, MockPlan, MockCurve, GuaranteePanel, RoasDial } from "./components/landing/Mocks";
import { Run } from "./components/landing/Run";
import { Constellation } from "./components/landing/Constellation";
import { EXAMPLES, FIXTURES, normaliseUrl } from "./lib/mock/reads";
import { readIdFor, rememberRead } from "./lib/agent/registry";
import { ladderTotals, planFor } from "./lib/agent/tools";
import { ROAS_MAX, ROAS_MIN } from "./lib/agent/model";
import { AGENTS } from "./lib/agent/agents";
import { VAT_RATE, fmtUSD } from "./lib/mock/campaigns";
import type { BrandRead, ReadLayerKey } from "./lib/agent/types";
import { SHORT_MARKET } from "./lib/landing";
import { useT } from "./lib/i18n";
import { useReveal } from "./lib/useReveal";

/* The store platforms the product connects to, each in its own mark.
   The name renders instead where a file is missing, so the row is never
   half-built; all four are here now. */
/* `h` is optical, not measured. Salla and Zid are stacked lockups, a
   mark beside two lines of type, so at a shared pixel height their
   wordmarks read about half the size of Shopify's and Magento's single
   line. These heights make the four look equal, which is the only
   thing that matters in a row. */
const PLATFORMS: { name: string; src?: string; h: number }[] = [
  { name: "Salla", src: "/platforms/salla.png", h: 34 },
  { name: "Zid", src: "/platforms/zid.png", h: 32 },
  { name: "Shopify", src: "/platforms/shopify.png", h: 24 },
  { name: "Magento", src: "/platforms/magento.png", h: 24 },
];

/* What the field types when nobody is looking. Real, working links. */
const HINTS = EXAMPLES.map((e) => e.url);

const ALL_LAYERS: ReadLayerKey[] = [
  "identity", "category", "socials", "priceBand", "voice", "markets", "bestsellers", "seasonality", "eligibility",
];

function useDemo() {
  return useMemo(() => {
    const id = readIdFor("ounass.com");
    const read: BrandRead = { ...FIXTURES["ounass.com"](id), done: ALL_LAYERS };
    rememberRead(read);
    return { read, plan: planFor(read) };
  }, []);
}

/* ------------------------------------------------------------------ */
/* The field                                                           */
/* ------------------------------------------------------------------ */

const TYPE_MS = 85;
const DELETE_MS = 35;
const HOLD_MS = 1700;
const GAP_MS = 320;

/** Types a word out, holds it, deletes it, moves to the next.
 *
 * It runs only while the field is empty and unfocused: the moment a
 * brand clicks in, the hint stops and the real placeholder takes over,
 * because text moving under a cursor someone is about to type into is
 * a distraction, not a demonstration. The words are the three seeded
 * stores, so the hint doubles as a list of links that actually work.
 *
 * No timestamps and no randomness: the cycle is an index, which keeps
 * it deterministic and keeps server and client markup identical. */
function useTypedHint(words: string[], active: boolean) {
  const [text, setText] = useState("");
  const [at, setAt] = useState(0);
  const [phase, setPhase] = useState<"type" | "hold" | "delete">("type");

  useEffect(() => {
    if (!active) return;
    const word = words[at % words.length];
    let t: ReturnType<typeof setTimeout>;
    if (phase === "type") {
      t = text.length < word.length
        ? setTimeout(() => setText(word.slice(0, text.length + 1)), TYPE_MS)
        : setTimeout(() => setPhase("hold"), 0);
    } else if (phase === "hold") {
      t = setTimeout(() => setPhase("delete"), HOLD_MS);
    } else {
      t = text.length > 0
        ? setTimeout(() => setText(text.slice(0, -1)), DELETE_MS)
        : setTimeout(() => { setAt((n) => n + 1); setPhase("type"); }, GAP_MS);
    }
    return () => clearTimeout(t);
  }, [text, phase, at, active, words]);

  /* Reset when it stops, so it starts cleanly rather than mid-word. */
  useEffect(() => {
    if (!active) { setText(""); setPhase("type"); }
  }, [active]);

  return text;
}

function StoreField({ id, autoFocus = false }: { id: string; autoFocus?: boolean }) {
  const router = useRouter();
  const { t } = useT();
  const [url, setUrl] = useState("");
  const [going, setGoing] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [pick, setPick] = useState(0);
  const [focused, setFocused] = useState(false);
  const [still, setStill] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /* Reduced motion gets the plain placeholder and no typing at all. */
  useEffect(() => {
    setStill(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  /* It keeps typing while the field is focused and empty, because the
     hero field takes focus on load and a hint that stopped there would
     be a hint nobody ever saw. It is a placeholder, and placeholders
     stay until you type. What it drops on focus is its caret: the
     field has a real one by then, and two blinking carets in one row
     is a bug the reader has to work out. */
  const hinting = !still && !url;
  const hint = useTypedHint(HINTS, hinting);

  const submit = () => {
    const u = normaliseUrl(url);
    if (!u || !/\./.test(u)) {
      setInvalid(true);
      input.current?.focus();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setInvalid(false), 4000);
      return;
    }
    setGoing(true);
    router.push(`/c?read=${encodeURIComponent(u)}`);
  };

  const tryOne = () => {
    setUrl(EXAMPLES[pick % EXAMPLES.length].url);
    setInvalid(false);
    setPick((p) => p + 1);
    input.current?.focus();
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      noValidate
      className={`relative w-full max-w-[580px] overflow-hidden rounded-[24px] bg-white text-start shadow-[0_2px_4px_rgba(25,18,52,0.04),0_20px_44px_-18px_rgba(25,18,52,0.22),0_56px_90px_-48px_rgba(25,18,52,0.30)] ring-1 transition duration-150 ${
        /* No focus ring on the card at all. `focus-within` drew a purple
           stroke around the whole thing the moment it was tapped, and
           `:focus-visible` does not help here: a text input matches it
           on a mouse click too, by spec, so both fire for someone who
           never needed the hint. The caret is the input's own focus
           affordance, and the two buttons inside keep the global
           focus-visible outline from globals.css. */
        invalid ? "ring-danger" : "ring-ink/[0.08]"
      }`}
    >
      <label htmlFor={id} className="sr-only">Your store link</label>
      {/* The one element that never mirrors: a domain is typed left to
          right in every language. */}
      <div dir="ltr" className="relative h-[70px]">
        <Globe size={19} aria-hidden className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink/30" />
        <input
          ref={input}
          id={id}
          value={url}
          onChange={(e) => { setUrl(e.target.value); if (invalid) setInvalid(false); }}
          placeholder={hinting ? "" : t("landing.placeholder")}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          /* `outline-none` alone is not enough: globals.css draws a
             brand outline on :focus-visible for everything, and a text
             input matches that on a mouse click too, so a purple line
             appeared under the row. The caret is this field's focus
             affordance; the buttons beside it keep the global one. */
          className="h-full w-full bg-transparent pe-5 ps-[52px] text-left text-[18px] tracking-[-0.01em] text-ink outline-none focus-visible:outline-none placeholder:text-ink/35 sm:text-[19px]"
        />
        {/* The hint sits over the input rather than in its placeholder
            so it can carry a caret. It never takes a click: the input
            underneath stays the thing you press. */}
        {hinting && (
          <p aria-hidden className="pointer-events-none absolute inset-y-0 left-[52px] flex items-center text-[18px] tracking-[-0.01em] text-ink/35 sm:text-[19px]">
            <span className="num">{hint}</span>
            {!focused && <span className="ms-[2px] inline-block h-[22px] w-px motion-safe:animate-caret bg-ink/45" />}
          </p>
        )}
      </div>
      <div className="flex h-[60px] items-center justify-between gap-3 border-t border-ink/[0.06] bg-[#FBFAFC] pe-2.5 ps-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={tryOne}
            aria-label={t("landing.try")}
            title={t("landing.try")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink/45 transition hover:bg-brand-100 hover:text-brand"
          >
            <Storefront size={15} aria-hidden />
          </button>
          <p className={`truncate text-[12px] sm:text-[13px] ${invalid ? "text-danger" : "text-ink/50"}`} role={invalid ? "alert" : undefined}>
            {invalid ? t("landing.invalid") : t("landing.free")}
          </p>
        </div>
        <button
          type="submit"
          className="h-10 shrink-0 rounded-[12px] bg-ink px-5 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85"
        >
          {going ? t("landing.reading") : t("landing.cta")}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* A card: a picture of the product, then two lines about it.          */
/* ------------------------------------------------------------------ */

function Card({ title, body, delay = 0, children }: { title: string; body: string; delay?: number; children: React.ReactNode }) {
  return (
    <li style={{ transitionDelay: `${delay}ms` }} className="reveal overflow-hidden rounded-[24px] bg-white p-3 ring-1 ring-ink/[0.06] shadow-[0_1px_2px_rgba(25,18,52,0.04),0_24px_48px_-32px_rgba(25,18,52,0.22)]">
      {/* The media area. The mock is positioned from the top and runs
          off the bottom edge: a cropped screen reads as one that keeps
          going, where a centred one reads as an illustration. */}
      <div className="hm-media relative h-[228px] overflow-hidden rounded-[18px]">{children}</div>
      <div className="px-4 pb-4 pt-6">
        <h3 className="text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] text-ink">{title}</h3>
        <p className="mt-2.5 text-[15px] leading-[1.6] text-ink/55">{body}</p>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */

export default function Landing() {
  const { t, dir } = useT();
  const { read, plan } = useDemo();
  const reveal1 = useReveal<HTMLDivElement>(0.1);
  const reveal2 = useReveal<HTMLDivElement>(0.1);
  const reveal3 = useReveal<HTMLElement>(0.08);
  const reveal4 = useReveal<HTMLElement>(0.1);
  const reveal5 = useReveal<HTMLElement>(0.2);
  const reveal6 = useReveal<HTMLElement>(0.15);
  const reveal7 = useReveal<HTMLElement>(0.15);

  const markets = plan.markets.value.map((c) => SHORT_MARKET[c] ?? c);
  const rungs = plan.ladder.value;
  const total = ladderTotals(plan.planBudget.value, plan.guaranteedRoas.value);

  const rise = (ms: number) => ({
    className: "motion-safe:animate-rise",
    style: { animationDelay: `${ms}ms` } as const,
  });

  const step = (ms: number) => ({
    className: "reveal",
    style: { transitionDelay: `${ms}ms` } as const,
  });

  return (
    <div dir={dir} className="min-h-[100dvh] bg-paper text-ink">
      {/* ── Nav ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-ink/[0.06] bg-paper/85 backdrop-blur-md">
        <div {...rise(0)} className={`${rise(0).className} mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-5 sm:px-8`}>
          <Wordmark size="md" />
          <nav className="flex items-center gap-5" aria-label="Site">
            <LangToggle plain className="text-[13px]" />
            <Link
              href="/dashboard"
              className="rounded-[10px] bg-ink px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-ink/85"
            >
              {t("landing.nav.dashboard")}
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero. Three lines and the field, centred. ──────────────── */}
      <section className="relative">
        {/* The nav is 64px and sits in the flow, so the hero takes what
            is left of the viewport and centres in it. `svh` rather than
            `vh`, so a phone's collapsing address bar cannot crop the
            field. */}
        <div className="mx-auto flex min-h-[calc(100svh-64px)] w-full max-w-[1120px] flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
          <h1 className="max-w-[20ch] text-[clamp(40px,6.6vw,68px)] font-semibold leading-[1.02] tracking-[-0.038em] text-ink rtl:leading-[1.2] rtl:tracking-normal">
            <span {...rise(70)} className={`${rise(70).className} block`}>{t("landing.h1a")}</span>
            <span {...rise(140)} className={`${rise(140).className} hm-grad-text block`}>{t("landing.h1b")}</span>
          </h1>

          <div {...rise(210)} className={`${rise(210).className} relative mt-11 flex w-full justify-center`}>
            <div aria-hidden className="hm-glow pointer-events-none absolute inset-x-0 -inset-y-10" />
            <StoreField id="store-top" autoFocus />
          </div>

          <ul {...rise(280)} className={`${rise(280).className} mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-ink/50`}>
            {["landing.no1", "landing.no2", "landing.no3"].map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <Check size={12} weight="bold" aria-hidden className="text-brand/70" />
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Three cards, each one a picture of the product. ────────── */}
      <section id="how" ref={reveal1} className="mx-auto w-full max-w-[1120px] px-5 pb-8 sm:px-8">
        <div {...step(0)} className="reveal mx-auto mb-12 max-w-[620px] text-center">
          <h2 className="text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.035em] text-ink rtl:leading-[1.25] rtl:tracking-normal">
            {t("landing.cardsT")}
          </h2>
          <p className="mx-auto mt-4 max-w-[50ch] text-[16px] leading-[1.6] text-ink/55">{t("landing.sub")}</p>
        </div>
        <ul className="grid gap-5 lg:grid-cols-3">
          <Card delay={0} title={t("landing.c1t")} body={t("landing.c1d")}>
            <MockField url={read.url} />
          </Card>
          <Card delay={90} title={t("landing.v1t")} body={t("landing.v1d")}>
            <MockPlan plan={plan} markets={markets} />
          </Card>
          <Card delay={180} title={t("landing.v3t")} body={t("landing.v3d")}>
            <MockPhases rungs={rungs} />
          </Card>
        </ul>
      </section>

      {/* ── How it runs: four steps, one panel, on a timer. ───────── */}
      <section ref={reveal3} className="mx-auto w-full max-w-[1120px] px-5 py-24 sm:px-8 sm:py-32">
        <div>
          <div {...step(0)} className="reveal max-w-[620px]">
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.035em] text-ink rtl:leading-[1.25] rtl:tracking-normal">
              {t("landing.runT")}
            </h2>
            <p className="mt-4 max-w-[50ch] text-[16px] leading-[1.6] text-ink/55">{t("landing.runD")}</p>
          </div>
          <div {...step(120)} className="reveal mt-14">
            <Run
              steps={[
                { key: "read", title: t("landing.r1t"), body: t("landing.r1d"), agent: AGENTS[0], panel: <MockField url={read.url} /> },
                { key: "plan", title: t("landing.r2t"), body: t("landing.r2d"), agent: AGENTS[1], panel: <MockPlan plan={plan} markets={markets} /> },
                { key: "pay", title: t("landing.r3t"), body: t("landing.r3d"), agent: AGENTS[4], panel: <MockPay total={fmtUSD(Math.round(plan.budget.value * (1 + VAT_RATE)))} vat={fmtUSD(Math.round(plan.budget.value * VAT_RATE))} budget={fmtUSD(plan.budget.value)} /> },
                /* The run ends where the brand cares: the sales the
                   guarantee is written against, on the budget it paid. */
                {
                  key: "sales", title: t("landing.r4t"), body: t("landing.r4d"), agent: AGENTS[5],
                  panel: (active: boolean) => (
                    <MockCurve active={active} rungs={rungs} label={t("landing.mock.salesLabel")} />
                  ),
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── The guarantee. The one dark object on the page. ────────── */}
      <section id="guarantee" ref={reveal2} className="mx-auto w-full max-w-[1120px] px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div {...step(0)}>
            <h2 className="max-w-[16ch] text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.1] tracking-[-0.035em] text-ink rtl:leading-[1.25] rtl:tracking-normal">
              {t("landing.v2t")}
            </h2>
            <p className="mt-5 max-w-[48ch] text-[16px] leading-[1.65] text-ink/55">{t("landing.v2d")}</p>
            <div className="mt-9">
              <span aria-hidden className="hm-grad-rule rule-draw block h-[2px] w-[200px] rounded-full [transition-duration:500ms]" />
              <p className="mt-3 text-[13px] text-ink/45">{t("landing.signature")}</p>
            </div>
          </div>
          <div {...step(130)}>
          <GuaranteePanel
            revenue={total.revenue}
            budget={fmtUSD(total.budget)}
            roas={plan.guaranteedRoas.value}
            label={t("plan.target")}
            note={t("landing.threePhasesAt")}
          />
          </div>
        </div>
      </section>

      {/* ── The multiple, on its scale. ──────────────────────────── */}
      <section ref={reveal6} className="border-y border-ink/[0.06] bg-white/60">
        <div className="mx-auto grid w-full max-w-[1120px] items-center gap-12 px-5 py-24 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-16">
          <div {...step(0)}>
            <h2 className="max-w-[17ch] text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.035em] text-ink rtl:leading-[1.25] rtl:tracking-normal">
              {t("landing.roasT")}
            </h2>
            <p className="mt-4 max-w-[48ch] text-[16px] leading-[1.6] text-ink/55">{t("landing.roasD")}</p>
            {/* The three rungs, so the blended figure on the dial is
                visibly an average of real numbers rather than a claim. */}
            <p className="mt-8 text-[13px] font-medium text-ink/40">{t("landing.roasClimb")}</p>
            <ol className="mt-3 flex flex-wrap items-center gap-2">
              {rungs.map((r, i) => (
                <li
                  key={r.phaseNo}
                  className={`rounded-[10px] px-3 py-2 text-[14px] ${
                    i === 0 ? "bg-brand/[0.08] font-semibold text-brand" : "bg-ink/[0.04] text-ink/60"
                  }`}
                >
                  <span className="text-[12px] opacity-70">P{r.phaseNo}</span>{" "}
                  <span className="num font-semibold">{r.multiple}x</span>
                </li>
              ))}
            </ol>
          </div>
          <div {...step(130)}>
          <RoasDial
            value={plan.guaranteedRoas.value}
            min={ROAS_MIN}
            max={ROAS_MAX}
            label={t("landing.roasLabel")}
            note={t("landing.roasNote")}
          />
          </div>
        </div>
      </section>

      {/* ── The seven, as a system you can see. ───────────────────── */}
      <section ref={reveal4} className="mx-auto w-full max-w-[1120px] px-5 pb-24 sm:px-8 sm:pb-32">
        <div className="overflow-hidden rounded-[26px] bg-[#141229] px-6 py-14 ring-1 ring-white/[0.08] sm:px-12 sm:py-16">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div {...step(0)}>
              <h2 className="max-w-[16ch] text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.035em] text-white rtl:leading-[1.25] rtl:tracking-normal">
                {t("landing.agentsT")}
              </h2>
              <p className="mt-4 max-w-[42ch] text-[16px] leading-[1.6] text-white/55">{t("landing.agentsD")}</p>
            </div>
            <div {...step(130)}><Constellation /></div>
          </div>
        </div>
      </section>

      {/* ── The stores it connects to. ────────────────────────────── */}
      <section ref={reveal5} className="border-y border-ink/[0.06] bg-white/60">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div {...step(0)} className="max-w-[520px] reveal">
            <h2 className="text-[clamp(22px,2.4vw,28px)] font-semibold leading-[1.2] tracking-[-0.03em] text-ink rtl:tracking-normal">
              {t("landing.storesT")}
            </h2>
            <p className="mt-2.5 text-[15px] leading-[1.6] text-ink/55">{t("landing.storesD")}</p>
          </div>
          {/* The platforms, in their own marks, on the page itself. The
              cells used to be a bordered grid, which framed four logos
              that are already four different shapes and read as a table
              of contents. No strokes: just the marks, evenly spaced. */}
          <ul {...step(120)} className="reveal flex flex-wrap items-center gap-x-10 gap-y-7 sm:gap-x-12">
            {PLATFORMS.map((p) => (
              <li key={p.name} className="flex h-9 items-center">
                {p.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.src} alt={p.name} style={{ height: p.h }} className="w-auto object-contain" loading="lazy" />
                ) : (
                  <span className="text-[19px] font-semibold tracking-[-0.02em] text-ink/70">{p.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── The close. ────────────────────────────────────────────── */}
      <section ref={reveal7} className="border-t border-ink/[0.06]">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center px-5 py-24 text-center sm:px-8 sm:py-32">
          <h2 {...step(0)} className="reveal text-[clamp(30px,4vw,48px)] font-semibold leading-[1.05] tracking-[-0.038em] text-ink rtl:leading-[1.2] rtl:tracking-normal">
            {t("landing.closeH2")}
          </h2>
          <div {...step(110)} className="reveal relative mt-10 flex w-full justify-center">
            <div aria-hidden className="hm-glow pointer-events-none absolute inset-x-0 -inset-y-10 opacity-70" />
            <StoreField id="store-bottom" />
          </div>
          <p {...step(200)} className="reveal mt-8 flex items-center gap-2 text-[13px] text-ink/50">
            <Lock size={12} weight="fill" aria-hidden />
            {t("landing.nothing")}
          </p>
          <p {...step(240)} className="reveal mt-2 text-[12px] text-ink/40">{t("landing.credit")}</p>
        </div>
      </section>

      {/* ── Colophon. ─────────────────────────────────────────────── */}
      <footer className="border-t border-ink/[0.06]">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          {/* The mark, not a roster. The seven agents were listed here
              as a run-on line of names, which is the least useful place
              they appear: the diagram above already shows the whole
              system, and the run credits each one at the step it does. */}
          <Wordmark size="md" />
          <div className="flex items-center gap-6">
            <LangToggle plain className="text-[13px]" />
            <Link href="/dashboard" className="text-[13px] font-medium text-ink/55 transition hover:text-ink">
              {t("landing.nav.dashboard")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
