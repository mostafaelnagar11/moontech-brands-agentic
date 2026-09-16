"use client";

/* Landing.
 *
 * The page sells one thing: a campaign built in fifteen seconds with
 * the sales guaranteed in writing. It is not a marketplace and it must
 * never read as one, so there is no roster, no grid of faces, no
 * browsing. Creators appear exactly where the product puts them, as
 * three small avatars inside the plan card, and once as a photograph
 * of the WORK beside the guarantee.
 *
 * Copy is heymoon-copy-changes-before-after, IDs L1 to L17. Its three
 * promises are not printed as a row of cards: each one is the heading
 * of the section that proves it, so the page argues by showing.
 *
 * The register, and why each choice is here rather than a nicer one.
 *
 * The hero is centred on the field because the field is the product.
 * Everything above it is three lines; everything below it is quiet.
 *
 * ONE serif, and only for the promise. Instrument Serif sets the
 * headline and the guarantee clause and nothing else. A serif running
 * through headings, labels and figures reads as a magazine; a serif
 * used once reads as a company that decided something.
 *
 * Texture is measured, not painted. A 28px dot lattice under a soft
 * mask, and one brand glow directly beneath the card. The previous
 * version washed the whole hero in colour, which is atmosphere; this
 * is instrument.
 *
 * One inverted section. The guarantee is the claim the business rests
 * on, so it is the only place the page goes dark and the only place a
 * figure is set large. Contrast is spent once, where the money is.
 *
 * Surfaces are layered: a hairline ring, a lit top edge, and a shadow
 * with real reach, rather than a flat border. Every figure is Geist
 * tabular through `.num`, so nothing reflows in Arabic.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Globe, Lock, Storefront } from "@phosphor-icons/react";
import { Wordmark } from "./components/Wordmark";
import { LangToggle } from "./components/DirSync";
import { EXAMPLES, FIXTURES, normaliseUrl } from "./lib/mock/reads";
import { readIdFor, rememberRead } from "./lib/agent/registry";
import { READ_TASKS, STRATEGY_META, ladderTotals, planFor } from "./lib/agent/tools";
import { AGENTS } from "./lib/agent/agents";
import { fmtUSD, phaseTitle } from "./lib/mock/campaigns";
import type { BrandRead, ReadLayerKey } from "./lib/agent/types";
import { AD_PHOTO, PRODUCT_SQUARES, SHORT_MARKET } from "./lib/landing";
import { useT } from "./lib/i18n";
import { useReveal } from "./lib/useReveal";

/* ------------------------------------------------------------------ */
/* The demo store. Every figure on the page comes from this one call,   */
/* so the landing cannot quote a number the product would not build.    */
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
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** A figure: Geist, tabular, left to right in both scripts. */
const Num = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`num ${className}`}>{children}</span>
);

/** The small uppercase label above a section heading. Uppercase is
    styling, which L1's note allows; the strings stay sentence case. */
const Kicker = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-brand">{children}</p>
);

/** A section, revealed once, with the page's one rule on top. */
function Section({ id, dark = false, children }: { id?: string; dark?: boolean; children: React.ReactNode }) {
  const ref = useReveal<HTMLElement>(0.1);
  return (
    <section id={id} ref={ref} className={dark ? "bg-ink text-white" : "border-t border-rule"}>
      <div className="reveal mx-auto w-full max-w-[1120px] px-5 py-24 sm:px-8 sm:py-32">{children}</div>
    </section>
  );
}

/** A white surface: hairline ring, lit top edge, real shadow. */
const surface = "relative overflow-hidden rounded-[20px] bg-white ring-1 ring-ink/[0.07] shadow-sheet edge-lit";

/* ------------------------------------------------------------------ */
/* The field. Two rows: the link alone at reading size, then the way    */
/* in for a brand with no store to hand, the one line of reassurance,   */
/* and the press. The press is always live; a link that is not a store  */
/* link is answered in a sentence, not by a dead button.                */
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
      className={`relative w-full max-w-[580px] overflow-hidden rounded-[22px] bg-white text-start shadow-[0_2px_4px_rgba(25,18,52,0.04),0_18px_40px_-16px_rgba(25,18,52,0.20),0_48px_80px_-40px_rgba(25,18,52,0.24)] ring-1 transition duration-150 ${
        invalid ? "ring-danger" : "ring-ink/[0.09] focus-within:ring-2 focus-within:ring-brand/55"
      }`}
    >
      <label htmlFor={id} className="sr-only">Your store link</label>
      {/* The one element that never mirrors: a domain is typed left to
          right in every language. */}
      <div dir="ltr" className="relative h-[68px]">
        <Globe size={19} aria-hidden className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink/35" />
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
      <div className="flex h-[60px] items-center justify-between gap-3 border-t border-ink/[0.06] bg-[#FBFAFD] pe-2.5 ps-2.5">
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
          <p className={`truncate text-[12px] sm:text-[13px] ${invalid ? "text-danger" : "text-ink/55"}`} role={invalid ? "alert" : undefined}>
            {invalid ? t("landing.invalid") : t("landing.free")}
          </p>
        </div>
        <button
          type="submit"
          className="h-10 shrink-0 rounded-[12px] bg-ink px-5 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-colors hover:bg-ink/85"
        >
          {going ? t("landing.reading") : t("landing.cta")}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const { t, dir } = useT();
  const { read, plan } = useDemo();

  const price = read.priceBand!.value;
  const agentFor = (k: ReadLayerKey) => READ_TASKS.find((x) => x.key === k)?.agent ?? "";
  const markets = plan.markets.value.map((c) => SHORT_MARKET[c] ?? c);
  const products = read.bestsellers!.value.slice(0, STRATEGY_META[plan.strategy.value].lines);
  const rungs = plan.ladder.value;
  const total = ladderTotals(plan.planBudget.value, plan.guaranteedRoas.value);

  const rise = (ms: number) => ({
    className: "motion-safe:animate-rise",
    style: { animationDelay: `${ms}ms` } as const,
  });

  const readRows: { k: ReadLayerKey; label: string; value: React.ReactNode }[] = [
    {
      k: "category", label: t("landing.catalogue"),
      value: (
        <span className="flex items-center gap-3">
          <span className="flex gap-1.5">
            {Object.values(PRODUCT_SQUARES).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="h-9 w-9 rounded-[7px] object-cover ring-1 ring-ink/[0.07]" />
            ))}
          </span>
          <span className="truncate">{read.category!.value}</span>
        </span>
      ),
    },
    {
      k: "priceBand", label: t("landing.prices"),
      value: <Num>{price.low.toLocaleString("en-US")} to {price.high.toLocaleString("en-US")} {price.currency}</Num>,
    },
    {
      k: "voice", label: t("landing.voice"),
      value: (
        <span className="flex flex-wrap gap-1.5">
          {read.voice!.value.words.map((w) => (
            <span key={w} className="rounded-[6px] bg-ink/[0.04] px-2 py-1 text-[13px] text-ink/70">{w}</span>
          ))}
        </span>
      ),
    },
    {
      k: "markets", label: t("layer.markets"),
      value: (
        <span className="flex flex-wrap gap-1.5">
          {markets.map((m) => (
            <span key={m} className="rounded-[6px] bg-ink/[0.04] px-2 py-1 text-[13px] text-ink/70">{m}</span>
          ))}
        </span>
      ),
    },
  ];

  return (
    <div dir={dir} className="min-h-[100dvh] bg-paper text-ink">
      {/* ── Masthead ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-ink/[0.07] bg-paper/80 backdrop-blur-md">
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
      <section className="relative overflow-hidden">
        <div aria-hidden className="lattice pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex w-full max-w-[1120px] flex-col items-center px-5 pb-24 pt-16 text-center sm:px-8 sm:pb-32 sm:pt-24">
          <div {...rise(0)} className={`${rise(0).className} inline-flex items-center gap-2 rounded-full bg-white py-1.5 pe-3.5 ps-2.5 shadow-[0_1px_2px_rgba(25,18,52,0.06)] ring-1 ring-ink/[0.07]`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/70">{t("landing.eyebrow")}</span>
          </div>

          <h1 className="mt-8 max-w-[22ch] font-display text-[clamp(38px,6.4vw,64px)] leading-[0.98] tracking-[-0.025em] text-ink rtl:max-w-[20ch] rtl:font-medium rtl:leading-[1.18] rtl:tracking-normal">
            <span {...rise(70)} className={`${rise(70).className} block`}>{t("landing.h1a")}</span>
            <span {...rise(140)} className={`${rise(140).className} block italic text-brand rtl:not-italic`}>{t("landing.h1b")}</span>
          </h1>

          <p {...rise(210)} className={`${rise(210).className} mt-6 max-w-[52ch] text-[17px] leading-[1.55] text-ink/60 sm:text-[18px]`}>
            {t("landing.sub")}
          </p>

          {/* The field, in its own pool of light. */}
          <div {...rise(280)} className={`${rise(280).className} relative mt-10 flex w-full justify-center`}>
            <div aria-hidden className="field-glow pointer-events-none absolute inset-x-0 -inset-y-8" />
            <StoreField id="store-top" autoFocus />
          </div>

          {/* L4's last three sentences, as three quiet facts. */}
          <ul {...rise(350)} className={`${rise(350).className} mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-ink/55`}>
            {["landing.no1", "landing.no2", "landing.no3"].map((k) => (
              <li key={k} className="flex items-center gap-2">
                <Check size={12} weight="bold" aria-hidden className="text-brand/70" />
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Proof one: the fifteen seconds is real. ────────────────── */}
      <Section id="how">
        <div className="mx-auto max-w-[640px] text-center">
          <Kicker>{t("landing.eyebrow")}</Kicker>
          <h2 className="mt-4 text-[clamp(27px,3.2vw,38px)] font-semibold leading-[1.12] tracking-[-0.03em] text-ink">
            {t("landing.readH2")}
          </h2>
        </div>

        <div className={`${surface} mx-auto mt-12 max-w-[820px]`}>
          <div className="flex items-center gap-2.5 border-b border-ink/[0.06] bg-[#FBFAFD] px-5 py-3">
            <Globe size={14} aria-hidden className="text-ink/35" />
            <Num className="text-[13px] text-ink/60">{read.url}</Num>
          </div>
          <dl className="px-5 sm:px-7">
            {readRows.map((row, i) => (
              <div
                key={row.k}
                className={`grid grid-cols-[84px_1fr] items-center gap-x-4 gap-y-1.5 py-4 sm:grid-cols-[110px_1fr_auto] sm:gap-x-6 ${i > 0 ? "border-t border-ink/[0.06]" : ""}`}
              >
                <dt className="text-[13px] font-medium text-ink/45">{row.label}</dt>
                <dd className="min-w-0 text-[15px] text-ink">{row.value}</dd>
                <dd className="col-start-2 flex items-center gap-2 sm:col-start-3">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand/60" />
                  <span className="text-[12px] text-ink/45">{agentFor(row.k)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* ── Proof two: L9 and L10, and the card that keeps them. ───── */}
      <Section>
        <div className="mx-auto max-w-[620px] text-center">
          <h2 className="text-balance text-[clamp(27px,3.2vw,38px)] font-semibold leading-[1.12] tracking-[-0.03em] text-ink">
            {t("landing.v1t")}
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-[1.6] text-ink/60">{t("landing.v1d")}</p>
        </div>

        <div className={`${surface} mx-auto mt-12 max-w-[560px]`}>
          <div className="flex items-center justify-between gap-4 border-b border-ink/[0.06] bg-[#FBFAFD] px-7 py-3 sm:px-9">
            <p className="text-[13px] font-semibold text-ink">{t("plan.phase1")}</p>
            <Num className="text-[13px] text-ink/50">{read.url}</Num>
          </div>
          <div className="px-7 py-5 sm:px-9 sm:py-6">
            {[
              { label: t("plan.markets"), value: markets.join(", ") },
              {
                label: t("plan.creators"),
                value: (
                  <span className="flex items-center gap-2.5">
                    <span className="flex -space-x-1.5 rtl:space-x-reverse">
                      {plan.creators.value.map((c) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={c.id} src={c.avatar} alt="" className="h-6 w-6 rounded-full object-cover ring-2 ring-white" />
                      ))}
                    </span>
                    <span><Num>{plan.creators.value.length}</Num> {t("landing.inWarmup")}</span>
                  </span>
                ),
              },
              {
                label: t("landing.products"),
                value: (
                  <span className="flex items-center gap-2.5">
                    <span className="flex gap-1.5">
                      {products.filter((b) => PRODUCT_SQUARES[b.name]).map((b) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={b.name} src={PRODUCT_SQUARES[b.name]} alt="" className="h-6 w-6 rounded-[5px] object-cover ring-1 ring-ink/[0.07]" />
                      ))}
                    </span>
                    <span className="truncate">{products.slice(0, 2).map((b) => b.name).join(", ")}</span>
                  </span>
                ),
              },
            ].map((row, i) => (
              <div key={row.label} className={`grid grid-cols-[108px_1fr] items-center gap-x-5 py-3.5 ${i > 0 ? "border-t border-ink/[0.06]" : ""}`}>
                <p className="text-[13px] font-medium text-ink/45">{row.label}</p>
                <div className="min-w-0 text-[15px] text-ink">{row.value}</div>
              </div>
            ))}
            <div className="mt-2 flex items-end justify-between border-t border-ink/[0.06] pt-5">
              <p className="text-[13px] font-medium text-ink/45">{t("plan.budget")}</p>
              <Num className="text-[38px] font-semibold leading-none tracking-[-0.03em] text-ink">{fmtUSD(plan.budget.value)}</Num>
            </div>
          </div>
          <p className="flex items-center gap-2 border-t border-ink/[0.06] bg-[#FBFAFD] px-7 py-3.5 text-[13px] font-medium text-ink/70 sm:px-9">
            <Check size={14} weight="bold" aria-hidden className="text-good" />
            {t("landing.inWriting")}
          </p>
        </div>
      </Section>

      {/* ── Proof three: L13 and L14, drawn as an instrument. ──────── */}
      <Section id="phases">
        <div className="mx-auto max-w-[620px] text-center">
          <h2 className="text-balance text-[clamp(27px,3.2vw,38px)] font-semibold leading-[1.12] tracking-[-0.03em] text-ink">
            {t("landing.v3t")}
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-[1.6] text-ink/60">{t("landing.v3d")}</p>
        </div>

        {/* Phase 1 at full weight on a filled segment; the two after it
            at sixty percent behind a gate at eighty percent, because
            they are offered rather than assumed. */}
        <ol className="mx-auto mt-16 hidden max-w-[900px] grid-cols-3 sm:grid">
          {rungs.map((r, i) => (
            <li key={r.phaseNo} className={i > 0 ? "opacity-55" : ""}>
              <div className="pb-6 pe-8">
                <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink/40">{phaseTitle(r.phaseNo)}</p>
                <p className="mt-3 text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {i > 0 && <span className="me-1.5 align-middle text-[14px] font-normal tracking-normal text-ink/45">{t("landing.about")}</span>}
                  <Num>{fmtUSD(r.budget)}</Num>
                </p>
                <p className="mt-2.5 text-[14px] text-ink/50"><Num>{r.multiple}x</Num></p>
              </div>
              <div className="relative h-9">
                <span aria-hidden className="rule-draw absolute inset-x-0 top-0 h-px bg-ink/12" />
                <span aria-hidden className="absolute start-0 -top-[7px] h-[14px] w-px bg-ink/30" />
                {i === 0 && <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-brand" />}
                {i < rungs.length - 1 && (
                  <>
                    <span aria-hidden className="absolute start-[80%] -top-1 h-2 w-px bg-ink/25" />
                    <span className="absolute start-[80%] top-3.5 -translate-x-1/2 whitespace-nowrap text-[12px] text-ink/40 rtl:translate-x-1/2">
                      {t("landing.offeredAt")}
                    </span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
        <ol className="mx-auto mt-12 max-w-[420px] border-s border-ink/12 sm:hidden">
          {rungs.map((r, i) => (
            <li key={r.phaseNo} className={`relative ps-5 ${i > 0 ? "mt-9 opacity-55" : ""}`}>
              <span aria-hidden className={`absolute -start-px top-2.5 h-px w-3.5 ${i === 0 ? "bg-brand" : "bg-ink/30"}`} />
              <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-ink/40">{phaseTitle(r.phaseNo)}</p>
              <p className="mt-2 text-[29px] font-semibold leading-none tracking-[-0.03em] text-ink">
                {i > 0 && <span className="me-1.5 align-middle text-[13px] font-normal tracking-normal text-ink/45">{t("landing.about")}</span>}
                <Num>{fmtUSD(r.budget)}</Num>
              </p>
              <p className="mt-2 text-[14px] text-ink/50"><Num>{r.multiple}x</Num></p>
              {i < rungs.length - 1 && <p className="mt-4 text-[12px] text-ink/40">{t("landing.offeredAt")}</p>}
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Proof four: L11 and L12. The one dark section, where the
             money is, and the only large figure on the page. ───────── */}
      <Section id="guarantee" dark>
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_282px] lg:gap-20">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-brand-300">{t("landing.wholePlan")}</p>
            <p className="mt-5 font-display text-[clamp(56px,7.5vw,92px)] font-normal leading-[0.92] tracking-[-0.03em] text-white">
              <Num>{fmtUSD(total.revenue)}</Num>
            </p>
            <p className="mt-4 text-[16px] text-white/55">
              {t("plan.target")} · <Num>{fmtUSD(total.budget)}</Num> {t("landing.at")} <Num>{plan.guaranteedRoas.value}x</Num>
            </p>

            <h2 className="mt-12 max-w-[20ch] font-display text-[clamp(26px,3vw,36px)] leading-[1.2] text-white rtl:font-medium">
              {t("landing.v2t")}
            </h2>
            <p className="mt-4 max-w-[54ch] text-[16px] leading-[1.6] text-white/60">{t("landing.v2d")}</p>

            <div className="mt-12">
              <span aria-hidden className="rule-draw block h-px w-[220px] bg-brand-300 [transition-duration:400ms]" />
              <p className="mt-3 text-[13px] text-white/45">{t("landing.signature")}</p>
            </div>
          </div>

          {/* One photograph, of the work rather than of a person to
              browse: a real campaign post, a product in hand. */}
          <figure className="w-full max-w-[282px] justify-self-start lg:justify-self-end">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[18px] ring-1 ring-white/12">
              <Image
                src={AD_PHOTO.src}
                alt={t("landing.adAlt")}
                fill
                sizes="282px"
                quality={90}
                style={{ objectPosition: AD_PHOTO.position }}
                className="object-cover"
              />
            </div>
          </figure>
        </div>
      </Section>

      {/* ── The close. ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-rule">
        <div aria-hidden className="lattice pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex w-full max-w-[1120px] flex-col items-center px-5 py-28 text-center sm:px-8 sm:py-36">
          <h2 className="font-display text-[clamp(32px,4.5vw,52px)] leading-[1.02] tracking-[-0.025em] text-ink rtl:font-medium rtl:leading-[1.2]">
            {t("landing.closeH2")}
          </h2>
          <div className="relative mt-10 flex w-full justify-center">
            <div aria-hidden className="field-glow pointer-events-none absolute inset-x-0 -inset-y-8" />
            <StoreField id="store-bottom" />
          </div>
          <p className="mt-8 flex items-center gap-2 text-[13px] text-ink/55">
            <Lock size={12} weight="fill" aria-hidden />
            {t("landing.nothing")}
          </p>
          <p className="mt-2 text-[12px] text-ink/40">{t("landing.credit")}</p>
        </div>
      </section>

      {/* ── Colophon. ─────────────────────────────────────────────── */}
      <footer className="border-t border-rule">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/40">{t("landing.foot.agents")}</p>
            <p className="mt-2 max-w-[62ch] text-[13px] leading-6 text-ink/60">{AGENTS.join(" · ")}</p>
          </div>
          <div className="flex items-center gap-6">
            <LangToggle plain className="text-[13px]" />
            <Link href="/dashboard" className="text-[13px] font-medium text-ink/60 transition hover:text-ink">
              {t("landing.nav.dashboard")}
            </Link>
            <Wordmark size="sm" />
          </div>
        </div>
      </footer>
    </div>
  );
}
