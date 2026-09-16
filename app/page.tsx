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
import { MockDraft, MockField, MockPay, MockPhases, MockPlan, GuaranteePanel } from "./components/landing/Mocks";
import { Run } from "./components/landing/Run";
import { EXAMPLES, FIXTURES, normaliseUrl } from "./lib/mock/reads";
import { readIdFor, rememberRead } from "./lib/agent/registry";
import { ladderTotals, planFor } from "./lib/agent/tools";
import { AGENTS } from "./lib/agent/agents";
import { VAT_RATE, fmtUSD } from "./lib/mock/campaigns";
import type { BrandRead, ReadLayerKey } from "./lib/agent/types";
import { SHORT_MARKET } from "./lib/landing";
import { useT } from "./lib/i18n";
import { useReveal } from "./lib/useReveal";

/* The stage each agent owns, in roster order. */
const STAGES = [
  "landing.stage.intake", "landing.stage.matching", "landing.stage.safety", "landing.stage.creative",
  "landing.stage.activation", "landing.stage.optimization", "landing.stage.learning",
] as const;

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

function StoreField({ id, autoFocus = false }: { id: string; autoFocus?: boolean }) {
  const router = useRouter();
  const { t } = useT();
  const [url, setUrl] = useState("");
  const [going, setGoing] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [pick, setPick] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

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
        invalid ? "ring-danger" : "ring-ink/[0.08] focus-within:ring-2 focus-within:ring-brand/50"
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
          placeholder={t("landing.placeholder")}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
          className="h-full w-full bg-transparent pe-5 ps-[52px] text-left text-[18px] tracking-[-0.01em] text-ink outline-none placeholder:text-ink/35 sm:text-[19px]"
        />
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

function Card({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <li className="overflow-hidden rounded-[24px] bg-white p-3 ring-1 ring-ink/[0.06] shadow-[0_1px_2px_rgba(25,18,52,0.04),0_24px_48px_-32px_rgba(25,18,52,0.22)]">
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

  const markets = plan.markets.value.map((c) => SHORT_MARKET[c] ?? c);
  const rungs = plan.ladder.value;
  const total = ladderTotals(plan.planBudget.value, plan.guaranteedRoas.value);

  const rise = (ms: number) => ({
    className: "motion-safe:animate-rise",
    style: { animationDelay: `${ms}ms` } as const,
  });

  return (
    <div dir={dir} className="min-h-[100dvh] bg-paper text-ink">
      {/* ── Nav ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-ink/[0.06] bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-5 sm:px-8">
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
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center px-5 pb-24 pt-16 text-center sm:px-8 sm:pb-32 sm:pt-24">
          <div {...rise(0)} className={`${rise(0).className} inline-flex items-center gap-2 rounded-full bg-white py-1.5 pe-3.5 ps-2.5 shadow-[0_1px_2px_rgba(25,18,52,0.05)] ring-1 ring-ink/[0.07]`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/65">{t("landing.eyebrow")}</span>
          </div>

          <h1 className="mt-8 max-w-[20ch] text-[clamp(40px,6.6vw,68px)] font-semibold leading-[1.02] tracking-[-0.038em] text-ink rtl:leading-[1.2] rtl:tracking-normal">
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
        <div className="reveal mx-auto mb-12 max-w-[620px] text-center">
          <h2 className="text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.035em] text-ink rtl:leading-[1.25] rtl:tracking-normal">
            {t("landing.cardsT")}
          </h2>
          <p className="mx-auto mt-4 max-w-[50ch] text-[16px] leading-[1.6] text-ink/55">{t("landing.sub")}</p>
        </div>
        <ul className="reveal grid gap-5 lg:grid-cols-3">
          <Card title={t("landing.c1t")} body={t("landing.c1d")}>
            <MockField url={read.url} />
          </Card>
          <Card title={t("landing.v1t")} body={t("landing.v1d")}>
            <MockPlan plan={plan} markets={markets} />
          </Card>
          <Card title={t("landing.v3t")} body={t("landing.v3d")}>
            <MockPhases rungs={rungs} />
          </Card>
        </ul>
      </section>

      {/* ── How it runs: four steps, one panel, on a timer. ───────── */}
      <section ref={reveal3} className="mx-auto w-full max-w-[1120px] px-5 py-24 sm:px-8 sm:py-32">
        <div className="reveal">
          <div className="max-w-[620px]">
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.035em] text-ink rtl:leading-[1.25] rtl:tracking-normal">
              {t("landing.runT")}
            </h2>
            <p className="mt-4 max-w-[50ch] text-[16px] leading-[1.6] text-ink/55">{t("landing.runD")}</p>
          </div>
          <div className="mt-14">
            <Run
              steps={[
                { key: "read", title: t("landing.r1t"), body: t("landing.r1d"), agent: AGENTS[0], panel: <MockField url={read.url} /> },
                { key: "plan", title: t("landing.r2t"), body: t("landing.r2d"), agent: AGENTS[1], panel: <MockPlan plan={plan} markets={markets} /> },
                { key: "pay", title: t("landing.r3t"), body: t("landing.r3d"), agent: AGENTS[5], panel: <MockPay total={fmtUSD(Math.round(plan.budget.value * (1 + VAT_RATE)))} vat={fmtUSD(Math.round(plan.budget.value * VAT_RATE))} budget={fmtUSD(plan.budget.value)} /> },
                { key: "draft", title: t("landing.r4t"), body: t("landing.r4d"), agent: AGENTS[3], panel: <MockDraft avatar={plan.creators.value[0]?.avatar} /> },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── The guarantee. The one dark object on the page. ────────── */}
      <section id="guarantee" ref={reveal2} className="mx-auto w-full max-w-[1120px] px-5 py-24 sm:px-8 sm:py-32">
        <div className="reveal grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="max-w-[16ch] text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.1] tracking-[-0.035em] text-ink rtl:leading-[1.25] rtl:tracking-normal">
              {t("landing.v2t")}
            </h2>
            <p className="mt-5 max-w-[48ch] text-[16px] leading-[1.65] text-ink/55">{t("landing.v2d")}</p>
            <div className="mt-9">
              <span aria-hidden className="hm-grad-rule rule-draw block h-[2px] w-[200px] rounded-full [transition-duration:500ms]" />
              <p className="mt-3 text-[13px] text-ink/45">{t("landing.signature")}</p>
            </div>
          </div>
          <GuaranteePanel
            revenue={fmtUSD(total.revenue)}
            budget={fmtUSD(total.budget)}
            roas={plan.guaranteedRoas.value}
            label={t("plan.target")}
            note={t("landing.threePhasesAt")}
          />
        </div>
      </section>

      {/* ── The seven, by name and stage. ─────────────────────────── */}
      <section ref={reveal4} className="mx-auto w-full max-w-[1120px] px-5 pb-24 sm:px-8 sm:pb-32">
        <div className="reveal grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16">
          <div>
            <h2 className="max-w-[16ch] text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.1] tracking-[-0.035em] text-ink rtl:leading-[1.25] rtl:tracking-normal">
              {t("landing.agentsT")}
            </h2>
            <p className="mt-4 max-w-[44ch] text-[16px] leading-[1.6] text-ink/55">{t("landing.agentsD")}</p>
          </div>
          <ol className="overflow-hidden rounded-[20px] bg-white ring-1 ring-ink/[0.06] shadow-[0_1px_2px_rgba(25,18,52,0.04),0_24px_48px_-32px_rgba(25,18,52,0.20)]">
            {AGENTS.map((name, i) => (
              <li
                key={name}
                className={`flex items-center gap-4 px-5 py-3.5 sm:px-6 ${i > 0 ? "border-t border-ink/[0.06]" : ""}`}
              >
                <span className="num w-5 shrink-0 text-[12px] font-semibold text-ink/25">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{name}</span>
                <span className="shrink-0 text-[13px] text-ink/45">{t(STAGES[i])}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── The stores it connects to. ────────────────────────────── */}
      <section ref={reveal5} className="border-y border-ink/[0.06] bg-white/60">
        <div className="reveal mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[520px]">
            <h2 className="text-[clamp(22px,2.4vw,28px)] font-semibold leading-[1.2] tracking-[-0.03em] text-ink rtl:tracking-normal">
              {t("landing.storesT")}
            </h2>
            <p className="mt-2.5 text-[15px] leading-[1.6] text-ink/55">{t("landing.storesD")}</p>
          </div>
          <ul className="flex flex-wrap gap-2.5">
            {["Salla", "Zid", "Shopify", "Magento"].map((p) => (
              <li key={p} className="rounded-[12px] bg-white px-4 py-2.5 text-[15px] font-semibold text-ink ring-1 ring-ink/[0.07]">{p}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── The close. ────────────────────────────────────────────── */}
      <section className="border-t border-ink/[0.06]">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center px-5 py-24 text-center sm:px-8 sm:py-32">
          <h2 className="text-[clamp(30px,4vw,48px)] font-semibold leading-[1.05] tracking-[-0.038em] text-ink rtl:leading-[1.2] rtl:tracking-normal">
            {t("landing.closeH2")}
          </h2>
          <div className="relative mt-10 flex w-full justify-center">
            <div aria-hidden className="hm-glow pointer-events-none absolute inset-x-0 -inset-y-10 opacity-70" />
            <StoreField id="store-bottom" />
          </div>
          <p className="mt-8 flex items-center gap-2 text-[13px] text-ink/50">
            <Lock size={12} weight="fill" aria-hidden />
            {t("landing.nothing")}
          </p>
          <p className="mt-2 text-[12px] text-ink/40">{t("landing.credit")}</p>
        </div>
      </section>

      {/* ── Colophon. ─────────────────────────────────────────────── */}
      <footer className="border-t border-ink/[0.06]">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/35">{t("landing.foot.agents")}</p>
            <p className="mt-2 max-w-[62ch] text-[13px] leading-6 text-ink/55">{AGENTS.join(" · ")}</p>
          </div>
          <div className="flex items-center gap-6">
            <LangToggle plain className="text-[13px]" />
            <Link href="/dashboard" className="text-[13px] font-medium text-ink/55 transition hover:text-ink">
              {t("landing.nav.dashboard")}
            </Link>
            <Wordmark size="sm" />
          </div>
        </div>
      </footer>
    </div>
  );
}
