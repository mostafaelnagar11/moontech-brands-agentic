"use client";

/* Landing.
 *
 * The reference for this page is lovable.dev, and the thing to take
 * from it is not its colours or its words but its proportions. The
 * hero is the whole first screen and holds exactly three things: one
 * line of heading, one line under it, and a card you type into. The
 * card is white and it sits on saturated colour, which is the entire
 * reason it reads as the thing the page is for. Everything else waits
 * below, and below, every section is a left-aligned heading with one
 * phrase in colour, one grey line, and a picture with very little in it.
 *
 * The pictures are NOT the product's own components. The first cut of
 * this page rendered the real read card, the real plan card and the
 * real ladder, on the argument that a real screen beats an
 * illustration. It does, in the product. On a landing page a real
 * screen is a wall of eleven-point text next to a sentence, and the
 * sentence loses. So each visual here is a small card that says one
 * thing in a few words — and every one of those words is bound to
 * `planFor(ounass)`, the same plan the conversation would build for
 * that store. Fewer words, not fewer facts.
 *
 * No customer logos, no statistics, no testimonials. A landing page
 * that invents any of those has already broken the promise it makes.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Lock, LockSimple, Storefront } from "@phosphor-icons/react";
import { Wordmark } from "./components/Wordmark";
import { EXAMPLES, FIXTURES, normaliseUrl } from "./lib/mock/reads";
import { readIdFor, rememberRead } from "./lib/agent/registry";
import { ladderTotals, marketName, planFor } from "./lib/agent/tools";
import { fmtUSD, phaseTitle } from "./lib/mock/campaigns";
import { DEFAULT_AUTONOMY } from "./lib/store";
import type { BrandRead, ReadLayerKey } from "./lib/agent/types";
import { useT } from "./lib/i18n";
import { LangToggle } from "./components/DirSync";
import { Eyebrow } from "./components/ui";

/* ------------------------------------------------------------------ */
/* The demo store                                                      */
/*                                                                     */
/* Every figure below is the product's own plan for ounass.com, built   */
/* once, synchronously. `planFor` applies the same steps the streaming  */
/* build applies, so the page cannot show a number the conversation    */
/* would not.                                                          */
/* ------------------------------------------------------------------ */

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
/*                                                                     */
/* 608 wide, 28 radius, 12 padding, a shadow with reach. Two rows: the  */
/* input alone on top; below it a round control that drops a seeded    */
/* store into the field, the parsed domain once there is one, and the  */
/* press. The label on the press is a verb with no arrow.              */
/* ------------------------------------------------------------------ */

function StoreField({ autoFocus = false, id }: { autoFocus?: boolean; id: string }) {
  const router = useRouter();
  const { t } = useT();
  const [url, setUrl] = useState("");
  const [going, setGoing] = useState(false);
  const [pick, setPick] = useState(0);

  const clean = normaliseUrl(url);
  const armed = /\./.test(clean) && !going;

  const submit = (raw: string) => {
    const u = normaliseUrl(raw);
    if (!u || !/\./.test(u)) return;
    setGoing(true);
    router.push(`/c?read=${encodeURIComponent(u)}`);
  };

  /* Fills rather than submits, so the brand sees the domain parsed and
     decides to go, the same as with their own link. */
  const tryOne = () => {
    setUrl(EXAMPLES[pick % EXAMPLES.length].url);
    setPick((p) => p + 1);
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(url); }}
      className="w-full max-w-[608px] rounded-[28px] bg-white p-3 text-start shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_25px_50px_-12px_rgba(25,18,52,0.28)] transition focus-within:shadow-[0_0_0_1px_rgba(77,47,176,0.35),0_25px_50px_-12px_rgba(77,47,176,0.30)]"
    >
      <label htmlFor={id} className="sr-only">Your store link</label>
      <input
        id={id}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t("landing.placeholder")}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        dir="ltr"
        className="block w-full bg-transparent px-2 pb-3 pt-1.5 text-[17px] leading-6 text-ink outline-none placeholder:text-ink-faint"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={tryOne}
            title={t("landing.try")}
            aria-label={t("landing.try")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-100 text-ink-soft transition hover:bg-neutral-200 hover:text-ink"
          >
            <Storefront size={15} weight="bold" aria-hidden />
          </button>
          {armed ? (
            <span className="flex min-w-0 items-center gap-1.5 text-meta text-ink-soft">
              <span className="shrink-0">{t("landing.domain")}</span>
              <span className="min-w-0 truncate font-semibold text-ink" dir="ltr">{clean}</span>
            </span>
          ) : (
            <span className="truncate text-meta text-ink-faint">{t("landing.try")}</span>
          )}
        </div>
        <button
          type="submit"
          disabled={!armed}
          className={`inline-flex h-8 shrink-0 items-center rounded-[10px] px-3.5 text-body font-medium transition ${
            armed ? "bg-ink text-white hover:bg-ink/85" : "cursor-not-allowed bg-neutral-100 text-ink-faint"
          }`}
        >
          {going ? t("landing.reading") : t("landing.cta")}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Section chrome                                                      */
/* ------------------------------------------------------------------ */

function Heading({ a, b, sub }: { a: string; b: string; sub?: string }) {
  return (
    <div className="max-w-[640px]">
      <h2 className="text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-ink sm:text-[36px]">
        {a} <span className="grad-text">{b}</span>
      </h2>
      {sub && <p className="mt-3 text-[16px] leading-7 text-ink-soft sm:text-[17px]">{sub}</p>}
    </div>
  );
}

function Feature({ title, body, shot, flip = false, id }: {
  title: string; body: string; shot: React.ReactNode; flip?: boolean; id?: string;
}) {
  return (
    <div id={id} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className={`max-w-[400px] ${flip ? "lg:order-last" : ""}`}>
        <p className="text-balance text-[22px] font-semibold leading-7 tracking-[-0.02em] text-ink sm:text-[26px] sm:leading-8">{title}</p>
        <p className="mt-2 text-[16px] leading-7 text-ink-soft">{body}</p>
      </div>
      {shot}
    </div>
  );
}

/* A picture card: white, quiet, and never more than a handful of rows.
   Decorative — the argument is in the text beside it. */
function Mock({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden className={`select-none rounded-[20px] border border-hairline bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04),0_18px_40px_-24px_rgba(25,18,52,0.25)] sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 border-t border-hairline py-3.5 first:border-t-0 first:pt-0 last:pb-0">
      <span className="w-[92px] shrink-0 text-[12px] font-medium text-ink-faint">{label}</span>
      <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const { t, dir } = useT();
  const { read, plan } = useDemo();

  const steps = [
    { t: "landing.s1t", d: "landing.s1d" },
    { t: "landing.s2t", d: "landing.s2d" },
    { t: "landing.s3t", d: "landing.s3d" },
  ];
  const locked = DEFAULT_AUTONOMY.filter((r) => r.locked);
  const stores = ["Salla", "Zid", "Shopify", "Magento"];

  /* The read, in four short values. */
  const price = read.priceBand!.value;
  const marketNames = read.markets!.value.map((m) => m.name);
  const firstMarkets = (names: string[], n: number) =>
    names.length > n ? `${names.slice(0, n).join(", ")} +${names.length - n}` : names.join(", ");

  /* The plan, in five. */
  const a = plan.audience.value;
  const crew = plan.creators.value.length;
  const pool = plan.pool.value;
  const products = read.bestsellers!.value.slice(0, 2).map((b) => b.name);

  /* The guarantee that matters is the whole plan's, not the warm-up's.
     Phase 1 is guaranteed at 1x by design — your money back — so a tile
     that says "pay $1,000, guaranteed $1,000" reads as no promise at
     all. The plan is sized on the calculator's pair; `ladderTotals`
     sums what the three phases guarantee together. */
  const pb = plan.planBudget.value;
  const roas = plan.guaranteedRoas.value;
  const total = pb > 0 ? ladderTotals(pb, roas) : null;
  const guaranteed = total ? total.revenue : plan.price.revenueTarget.value;

  return (
    <div dir={dir} className="min-h-[100dvh] bg-[#FCFBF8] text-ink">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        <div className="aurora" aria-hidden />
        <div className="grain" aria-hidden />
        <div className="aurora-fade" aria-hidden />

        <header className="relative z-10 mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Wordmark size="md" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="On this page">
            {[["#how", "landing.nav.how"], ["#guarantee", "landing.nav.guarantee"], ["#phases", "landing.nav.phases"]].map(([href, k]) => (
              <a key={k} href={href} className="rounded-[8px] px-3 py-1.5 text-body text-ink-soft transition hover:bg-black/[0.04] hover:text-ink">
                {t(k)}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LangToggle />
            <Link href="/dashboard" className="hidden h-8 items-center rounded-[8px] bg-ink/[0.88] px-3 text-body font-medium text-white transition hover:bg-ink sm:inline-flex">
              {t("landing.nav.dashboard")}
            </Link>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-24 pt-10 text-center">
          <Eyebrow className="mb-4">{t("landing.eyebrow")}</Eyebrow>
          <h1 className="text-balance text-[36px] font-semibold leading-[1.06] tracking-[-0.04em] text-ink sm:text-[48px] lg:text-[54px]">
            {t("landing.h1a")}
            <br />
            <span className="grad-text-deep">{t("landing.h1b")}</span>
          </h1>
          <p className="mt-4 max-w-[46ch] text-balance text-[16px] leading-6 text-ink-soft sm:text-[18px] sm:leading-7">
            {t("landing.sub")}
          </p>
          <div className="mt-8 flex w-full flex-col items-center">
            <StoreField autoFocus id="store-top" />
            <p className="mt-4 text-meta text-ink-soft/80">{t("landing.free")}</p>
          </div>
        </div>
      </section>

      {/* ── One link. The whole campaign. ────────────────────────── */}
      <section id="how" className="mx-auto w-full max-w-[1120px] px-5 py-20 sm:px-8 sm:py-28">
        <Heading a={t("landing.s2a")} b={t("landing.s2b")} sub={t("landing.s2sub")} />
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <ol className="space-y-6">
            {steps.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span aria-hidden className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-white">{i + 1}</span>
                <div>
                  <p className="text-[17px] font-semibold leading-6 text-ink">{t(s.t)}</p>
                  <p className="mt-0.5 text-[15px] leading-6 text-ink-soft">{t(s.d)}</p>
                </div>
              </li>
            ))}
            <li className="flex flex-wrap gap-2 ps-11">
              {["landing.no1", "landing.no2", "landing.no3"].map((k) => (
                <span key={k} className="rounded-pill border border-hairline bg-white px-3 py-1 text-meta font-medium text-ink-soft">{t(k)}</span>
              ))}
            </li>
          </ol>

          <Mock>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand-100 text-[14px] font-semibold text-brand">
                {plan.brandName[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">{plan.brandName}</p>
                <p className="truncate text-meta text-ink-faint" dir="ltr">{read.url}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-meta font-medium text-good">
                <Check size={12} weight="bold" aria-hidden /> {t("landing.readIn")}
              </span>
            </div>
            <Row label={t("landing.catalogue")}>{read.category!.value}</Row>
            <Row label={t("landing.prices")}>
              {price.low.toLocaleString()} to {price.high.toLocaleString()} {price.currency}
            </Row>
            <Row label={t("layer.markets")}>{firstMarkets(marketNames, 3)}</Row>
            <Row label={t("plan.creators")}>{pool} {t("landing.matched")}</Row>
          </Mock>
        </div>
      </section>

      {/* ── Built before you pay. Guaranteed after. ──────────────── */}
      <section id="guarantee" className="border-t border-hairline bg-white">
        <div className="mx-auto w-full max-w-[1120px] px-5 py-20 sm:px-8 sm:py-28">
          <Heading a={t("landing.s3a")} b={t("landing.s3b")} sub={t("landing.s3sub")} />
          <div className="mt-14 space-y-20 sm:space-y-24">

            <Feature
              title={t("landing.v1t")}
              body={t("landing.v1d")}
              shot={
                <Mock className="bg-[#FCFBF8]">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-ink">{phaseTitle(1)}</p>
                    <span className="rounded-pill bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{t("landing.draft")}</span>
                  </div>
                  <Row label={t("plan.markets")}>{firstMarkets(plan.markets.value.map(marketName), 2)}</Row>
                  <Row label={t("plan.audience")}>{t(`aud.${a.gender}`)}, {a.ageLow} to {a.ageHigh}</Row>
                  <Row label={t("plan.creators")}>{crew} {t("landing.inWarmup")} · {pool} {t("landing.matched")}</Row>
                  <Row label={t("landing.products")}>{products.join(", ")}</Row>
                  <Row label={t("plan.budget")}>{fmtUSD(plan.budget.value)}</Row>
                </Mock>
              }
            />

            <Feature
              flip
              title={t("landing.v2t")}
              body={t("landing.v2d")}
              shot={
                <div aria-hidden className="select-none rounded-[20px] bg-ink p-7 text-white sm:p-9">
                  <p className="text-[12px] font-medium text-white/55">{t("landing.payToday")}</p>
                  <p className="mt-1 text-[26px] font-semibold tracking-[-0.03em] tabular-nums">{fmtUSD(plan.budget.value)}</p>
                  <div className="mt-7 border-t border-white/10 pt-6">
                    <p className="text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-brand-300 sm:text-[56px]">
                      {fmtUSD(guaranteed)}
                    </p>
                    <p className="mt-2 text-[16px] text-white/85">
                      {t("landing.guaranteed")}
                      {/* The plan's own size sits in the caption, so "$1,000 today"
                          beside a six-figure guarantee cannot be read as one buying
                          the other. */}
                      {total && <span className="text-white/45"> · {t("landing.threePhases")} · {fmtUSD(total.budget)} · {roas}x</span>}
                    </p>
                  </div>
                </div>
              }
            />

            <Feature
              id="phases"
              title={t("landing.ladderTitle")}
              body={t("landing.ladderSub")}
              shot={
                <Mock className="bg-[#FCFBF8] !p-2">
                  <ol>
                    {plan.ladder.value.map((r, i) => (
                      <li key={r.phaseNo} className={`flex items-center gap-4 px-4 py-4 ${i > 0 ? "border-t border-hairline" : ""} ${i === 0 ? "rounded-[14px] bg-white shadow-card" : ""}`}>
                        <span aria-hidden className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${i === 0 ? "bg-brand text-white" : "border border-dashed border-black/15 text-ink-faint"}`}>
                          {r.phaseNo}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{phaseTitle(r.phaseNo)}</span>
                        <span className="shrink-0 text-[15px] tabular-nums text-ink-soft">{fmtUSD(r.budget)} · {r.multiple}x</span>
                        <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold ${i === 0 ? "bg-brand/[0.08] text-brand" : "bg-neutral-100 text-ink-faint"}`}>
                          {i === 0 ? t("landing.today") : t("landing.offered80")}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Mock>
              }
            />

            <Feature
              flip
              title={t("landing.f4t")}
              body={t("landing.f4d")}
              shot={
                <Mock className="!p-2">
                  <ul>
                    {locked.map((r, i) => (
                      <li key={r.key} className={`flex items-center gap-4 px-4 py-4 ${i > 0 ? "border-t border-hairline" : ""}`}>
                        <LockSimple size={14} weight="fill" className="shrink-0 text-danger" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{r.label}</span>
                        <span className="shrink-0 rounded-pill bg-danger/[0.08] px-2.5 py-1 text-[11px] font-semibold text-danger">{t("landing.never")}</span>
                      </li>
                    ))}
                  </ul>
                </Mock>
              }
            />
          </div>
        </div>
      </section>

      {/* ── The stores it connects to ─────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1120px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[520px]">
            <h2 className="text-balance text-[24px] font-semibold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[28px]">{t("landing.storesTitle")}</h2>
            <p className="mt-2 text-[15px] leading-6 text-ink-soft">{t("landing.storesSub")}</p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {stores.map((s) => (
              <li key={s} className="rounded-[12px] border border-hairline bg-white px-4 py-2.5 text-[15px] font-medium text-ink shadow-card">{s}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── The field, once more ──────────────────────────────────── */}
      <section className="border-t border-hairline bg-white">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center px-5 py-20 text-center sm:px-8 sm:py-28">
          <h2 className="text-balance text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-ink sm:text-[36px]">{t("landing.ctaTitle")}</h2>
          <p className="mt-3 text-[16px] text-ink-soft sm:text-[17px]">{t("landing.free")}</p>
          <div className="mt-8 flex w-full justify-center"><StoreField id="store-bottom" /></div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-hairline">
        <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto_auto_auto] md:gap-16">
          <div className="max-w-[320px]">
            <Wordmark size="sm" />
            <p className="mt-4 flex items-start gap-2 text-meta leading-5 text-ink-soft">
              <Lock size={12} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
              {t("landing.nothing")}
            </p>
            <p className="mt-2 text-micro text-ink-faint">{t("landing.credit")}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{t("landing.foot.product")}</p>
            <ul className="mt-3 space-y-2 text-body text-ink-soft">
              <li><Link href="/c" className="hover:text-ink">{t("landing.foot.start")}</Link></li>
              <li><Link href="/dashboard" className="hover:text-ink">{t("landing.nav.dashboard")}</Link></li>
              <li><a href="#how" className="hover:text-ink">{t("landing.nav.how")}</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{t("landing.foot.company")}</p>
            <ul className="mt-3 space-y-2 text-body text-ink-soft">
              <li><a href="#guarantee" className="hover:text-ink">{t("landing.nav.guarantee")}</a></li>
              <li><a href="#phases" className="hover:text-ink">{t("landing.nav.phases")}</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{t("landing.foot.lang")}</p>
            <div className="mt-3"><LangToggle /></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
