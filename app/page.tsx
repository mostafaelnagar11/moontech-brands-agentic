"use client";

/* Landing.
 *
 * The field is the page. Everything above it exists to get a brand to
 * type into it, everything below it exists for the brand who did not
 * type into it yet — so the hero carries a headline, one line and the
 * field, and the arguments wait underneath.
 *
 * What changed, and why. The old page was one centred column: headline,
 * a four-sentence subhead, a pill input the size of a search box, then
 * three promises. Every claim the product makes was crowded into the
 * first screen, which made the subhead the biggest block of text on the
 * page and the field the smallest thing on it. Read in that order, the
 * page argued before it invited.
 *
 * So the subhead is one line, the three "no"s under it are three words
 * each, and the field is a CARD — two rows, real padding, a shadow that
 * lifts it off the wash. It is the only thing on the first screen with
 * weight. The rest of the old subhead did not get cut; it moved into
 * the sections below, where a claim has room to be made properly.
 *
 * The wash behind the hero is one radial tint in the brand's own ramp.
 * It is there to give the card something to sit on, not to be noticed.
 *
 * The example stores are new and they are for this prototype: three
 * seeded reads, one of them deliberately below the traffic floor, so
 * the whole flow can be walked without owning a store.
 */

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, Lock, MagnifyingGlass, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { Wordmark } from "./components/Wordmark";
import { EXAMPLES, normaliseUrl } from "./lib/mock/reads";
import { useT } from "./lib/i18n";
import { LangToggle } from "./components/DirSync";
import { Eyebrow } from "./components/ui";

/* ------------------------------------------------------------------ */
/* The field                                                           */
/*                                                                     */
/* Two rows, because one row makes it a search box. The input owns the  */
/* top on its own at reading size; the bottom carries what is true      */
/* about pressing it on one side and the press itself on the other.     */
/*                                                                     */
/* It appears twice on the page — top and bottom — and the two are the  */
/* same component with the same state rules, so a brand who scrolls the */
/* whole page does not meet a second, lesser version of the control     */
/* they already decided not to use.                                     */
/* ------------------------------------------------------------------ */

function StoreField({
  autoFocus = false,
  examples = true,
}: {
  autoFocus?: boolean;
  /* The seeded stores belong under the first field only. Offering them
     again at the bottom of the page reads as the page giving up on the
     brand's own store. */
  examples?: boolean;
}) {
  const router = useRouter();
  const { t } = useT();
  const [url, setUrl] = useState("");
  const [going, setGoing] = useState(false);

  const clean = normaliseUrl(url);
  const looksLikeStore = /\./.test(clean);
  const armed = looksLikeStore && !going;

  const submit = (raw: string) => {
    const u = normaliseUrl(raw);
    if (!u || !/\./.test(u)) return;
    setGoing(true);
    /* Into the one application surface. Reading the store is the first
       thing that happens, so it happens in the conversation in front of
       you rather than on a page the chat arrives after. */
    router.push(`/c?read=${encodeURIComponent(u)}`);
  };

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => { e.preventDefault(); submit(url); }}
        className="rounded-[26px] border border-black/[0.07] bg-white p-2.5 text-start shadow-[0_20px_50px_-24px_rgba(25,18,52,0.35)] transition focus-within:border-brand/30 focus-within:shadow-[0_22px_56px_-22px_rgba(77,47,176,0.38)]"
      >
        {/* The input owns the top row on its own, at reading size and
            with room above and below it. One row would make this a
            search box; the height is what makes it the thing the page
            is for. */}
        <div className="flex items-center gap-3 px-3 pb-4 pt-6 sm:px-4 sm:pb-5 sm:pt-7">
          <MagnifyingGlass size={20} className="shrink-0 text-ink-faint" aria-hidden />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("landing.placeholder")}
            aria-label="Your store link"
            autoFocus={autoFocus}
            /* A domain is not translated and not mirrored, so the field
               stays left-to-right in the Arabic build. */
            dir="ltr"
            className="min-w-0 flex-1 bg-transparent py-1 text-[18px] leading-7 text-ink outline-none placeholder:text-ink-faint sm:text-[20px]"
          />
        </div>

        <div className="flex items-center justify-between gap-3 ps-3 pe-1 pb-2 sm:ps-4">
          {/* What the typed link is understood to be, shown back live.
              Before there is one, what pressing the button does not do.
              Both answer the same hesitation, at the two moments it
              actually arrives. */}
          {armed ? (
            <span className="flex min-w-0 items-center gap-1.5 text-meta text-ink-soft">
              <Globe size={13} className="shrink-0 text-brand" aria-hidden />
              <span className="shrink-0">{t("landing.domain")}</span>
              <span className="min-w-0 truncate font-semibold text-ink" dir="ltr">{clean}</span>
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5 text-meta text-ink-faint">
              <Lock size={12} weight="fill" className="shrink-0" aria-hidden />
              <span className="truncate">{t("landing.safe")}</span>
            </span>
          )}

          <button
            type="submit"
            disabled={!armed}
            className={`inline-flex shrink-0 items-center rounded-[18px] px-4 py-2.5 text-body font-semibold transition ${
              /* Ink when armed, grey when not — the composer's rule. The
                 label is a verb and carries no arrow of its own, so the
                 disarmed state stays readable instead of going white on
                 grey. */
              armed ? "bg-ink text-white hover:bg-ink/85" : "cursor-not-allowed bg-neutral-200 text-ink-soft"
            }`}
          >
            {going ? t("landing.reading") : t("landing.cta")}
          </button>
        </div>
      </form>

      <p className="mt-3 text-center text-meta text-ink-faint">{t("landing.free")}</p>

      {/* Three seeded stores, so the flow can be walked without owning
          one. The third is below the traffic floor on purpose: what the
          product does when it has to say no is part of what it is. */}
      {examples && (
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="text-meta text-ink-faint">{t("landing.try")}</span>
        {EXAMPLES.map((x) => (
          <button
            key={x.url}
            type="button"
            onClick={() => submit(x.url)}
            title={x.note}
            className="rounded-pill border border-hairline bg-white px-3 py-1.5 text-meta font-medium text-ink-soft transition hover:border-brand/30 hover:text-ink"
          >
            <span dir="ltr">{x.url}</span>
          </button>
        ))}
      </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function Section({
  title, sub, children, tone = "plain",
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  tone?: "plain" | "rail";
}) {
  return (
    <section className={tone === "rail" ? "border-y border-hairline bg-rail" : ""}>
      <div className="mx-auto w-full max-w-[1000px] px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="text-center text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[32px]">
          {title}
        </h2>
        {sub && <p className="mx-auto mt-3 max-w-[52ch] text-center text-prose text-ink-soft">{sub}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { t, dir } = useT();
  const top = useRef<HTMLDivElement>(null);

  /* The closing call to action is the same field, not a link back up to
     it. A button that scrolls somewhere is a button that asks you to do
     the thing again rather than doing it. */
  const steps = [
    { t: "landing.s1t", d: "landing.s1d" },
    { t: "landing.s2t", d: "landing.s2d" },
    { t: "landing.s3t", d: "landing.s3d" },
  ];
  const promises = [
    { t: "landing.v1t", d: "landing.v1d" },
    { t: "landing.v2t", d: "landing.v2d" },
    { t: "landing.v3t", d: "landing.v3d" },
  ];
  const phases = [
    { t: "landing.p1t", d: "landing.p1d", now: true },
    { t: "landing.p2t", d: "landing.p2d", now: false },
    { t: "landing.p3t", d: "landing.p3d", now: false },
  ];

  const scrollTop = useCallback(() => {
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div dir={dir} className="min-h-[100dvh] bg-white">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div ref={top} className="relative overflow-hidden">
        {/* One tint, in the brand's own ramp, to give the card
            something to sit on. Not a feature. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(70%_100%_at_50%_-10%,#EDE9FB_0%,#F6F4FC_38%,rgba(255,255,255,0)_78%)]"
        />

        <header className="relative flex items-center justify-between px-5 py-5 sm:px-8">
          <Wordmark size="lg" />
          <LangToggle />
        </header>

        <main className="relative px-5 pb-16 pt-10 sm:pt-16">
          <div className="mx-auto w-full max-w-[820px] text-center">
            <Eyebrow>{t("landing.eyebrow")}</Eyebrow>

            {/* Two lines, and they have to stay two lines. "A campaign
                in fifteen seconds." is thirty characters, so the size
                steps up only where there is room to set it on one line:
                at 44px it needs about 660px, at 52px about 780px, and
                the column is 820px. Going bigger than the measure is
                how the old page ended up with "seconds." alone on a
                line of its own. */}
            <h1 className="mx-auto mt-4 text-balance text-[32px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[44px] lg:text-[52px]">
              {t("landing.h1a")}
              <br />
              <span className="bg-gradient-to-r from-brand to-brand-500 bg-clip-text text-transparent">
                {t("landing.h1b")}
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-[46ch] text-prose text-ink-soft">{t("landing.sub")}</p>

            <div className="mx-auto mt-9 max-w-[620px]">
              <StoreField autoFocus />
            </div>

            {/* Three words each. The fastest thing on the page to read,
                and the thing a brand who has used an agency reacts to
                before anything else. */}
            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {["landing.no1", "landing.no2", "landing.no3"].map((k) => (
                <li key={k} className="flex items-center gap-1.5 text-meta font-medium text-ink-soft">
                  <Check size={12} weight="bold" className="shrink-0 text-good" aria-hidden />
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>

      {/* ── How it works ──────────────────────────────────────────── */}
      <Section title={t("landing.hiwTitle")} sub={t("landing.hiwSub")} tone="rail">
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.t}
              className="rounded-card border border-hairline bg-white p-5 shadow-card"
            >
              <span
                aria-hidden
                className="grid h-7 w-7 place-items-center rounded-full bg-brand text-[12px] font-bold text-white"
              >
                {i + 1}
              </span>
              <p className="mt-3.5 text-title font-semibold leading-6 text-ink">{t(s.t)}</p>
              <p className="mt-1.5 text-body leading-6 text-ink-soft">{t(s.d)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── What HeyMoon promises ─────────────────────────────────── */}
      <Section title={t("landing.promisesTitle")}>
        {/* Unnumbered on purpose. These three hold at once; a 1/2/3
            above them would read as a sequence you walk through. */}
        <ul className="grid gap-4 sm:grid-cols-3">
          {promises.map((p, i) => (
            <li
              key={p.t}
              className={`rounded-card border p-6 ${
                /* The guarantee is the product, so it is the one that
                   carries weight. The other two are the conditions it
                   is sold under. */
                i === 1
                  ? "border-brand/20 bg-brand-50 shadow-float"
                  : "border-hairline bg-white shadow-card"
              }`}
            >
              <span
                aria-hidden
                className={`grid h-9 w-9 place-items-center rounded-control ${
                  i === 1 ? "bg-brand text-white" : "bg-brand-100 text-brand"
                }`}
              >
                {i === 0 ? <MagnifyingGlass size={16} weight="bold" />
                  : i === 1 ? <ShieldCheck size={16} weight="fill" />
                  : <Sparkle size={16} weight="fill" />}
              </span>
              <p className="mt-4 text-title font-semibold leading-6 text-ink">{t(p.t)}</p>
              <p className="mt-2 text-body leading-6 text-ink-soft">{t(p.d)}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ── The ladder ────────────────────────────────────────────── */}
      <Section title={t("landing.ladderTitle")} sub={t("landing.ladderSub")} tone="rail">
        <ol className="mx-auto max-w-[760px] overflow-hidden rounded-card border border-hairline bg-white shadow-card">
          {phases.map((p, i) => (
            <li
              key={p.t}
              className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 ${
                i > 0 ? "border-t border-hairline" : ""
              } ${p.now ? "bg-brand-50/70" : "bg-white"}`}
            >
              <span
                aria-hidden
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                  p.now ? "bg-brand text-white" : "border border-dashed border-black/15 text-ink-faint"
                }`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 basis-full sm:basis-0">
                <span className="block text-body font-semibold text-ink">{t(p.t)}</span>
                <span className="mt-0.5 block text-meta text-ink-soft">{t(p.d)}</span>
              </span>
              <span
                className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold ${
                  p.now ? "bg-brand/[0.08] text-brand" : "bg-neutral-100 text-ink-faint"
                }`}
              >
                {p.now ? t("landing.phase1Price") : t("landing.later")}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── The field again ───────────────────────────────────────── */}
      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-[620px] text-center">
          <h2 className="text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[32px]">
            {t("landing.ctaTitle")}
          </h2>
          <div className="mt-8">
            <StoreField examples={false} />
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-hairline bg-rail px-5 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col items-center gap-4 text-center">
          <button
            onClick={scrollTop}
            className="rounded transition hover:opacity-70"
            aria-label={t("landing.ctaTitle")}
          >
            <Wordmark size="sm" />
          </button>
          <p className="flex items-center justify-center gap-2 text-meta text-ink-soft">
            <Lock size={13} weight="fill" aria-hidden />
            {t("landing.nothing")}
          </p>
          {/* Who is behind this. One quiet line, once, at the bottom. */}
          <p className="text-micro text-ink-faint">{t("landing.credit")}</p>
        </div>
      </footer>
    </div>
  );
}
