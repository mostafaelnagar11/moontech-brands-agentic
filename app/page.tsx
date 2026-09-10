"use client";

/* Landing.

   One field, and nothing else. The current app's front door is an email,
   a six-digit code and a brand picker before anything happens; here the
   only thing on the page is the thing you came to do.

   The field is the composer. Same 26px pill, same hairline, same soft
   shadow, same send that is ink when it is armed and grey when it is
   not — so the first control a brand touches is the control they will
   use for the rest of the product, and the front door and the
   application do not look like two different pieces of software.

   No worked example, no sample chips. The read is what the product is,
   and showing one here answers the question before the visitor has asked
   it — the demonstration belongs a click away, in the conversation,
   running on their own store. */

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, MagnifyingGlass } from "@phosphor-icons/react";
import { normaliseUrl } from "./lib/mock/reads";
import { useT } from "./lib/i18n";
import { LangToggle } from "./components/DirSync";
import { Eyebrow } from "./components/ui";

export default function Landing() {
  const router = useRouter();
  const { t, dir } = useT();
  const [url, setUrl] = useState("");
  const [going, setGoing] = useState(false);

  const armed = /\./.test(normaliseUrl(url)) && !going;

  const submit = (raw: string) => {
    const u = normaliseUrl(raw);
    if (!u || !/\./.test(u)) return;
    setGoing(true);
    /* Into the one application surface. The read is the first thing the
       agent does, so it happens in the conversation in front of you
       rather than on a page the chat arrives after. */
    router.push(`/c?read=${encodeURIComponent(u)}`);
  };

  return (
    <div dir={dir} className="flex min-h-[100dvh] flex-col bg-white">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Image src="/logo.svg" alt="MoonTech" width={130} height={24} priority className="h-6 w-auto" />
        <LangToggle />
      </header>

      {/* The whole page is one column, centred, with room around it. A
          front door with a single field should not begin at the top-left
          corner of a wide grid. */}
      <main className="flex flex-1 items-center justify-center px-5 pb-16 pt-4">
        <div className="w-full max-w-[660px] text-center">
          <Eyebrow>{t("landing.eyebrow")}</Eyebrow>
          <h1 className="mx-auto mt-3 max-w-[18ch] text-[34px] font-bold leading-[1.08] tracking-tight text-ink sm:text-[48px]">
            {t("landing.h1a")}
            <br />
            <span className="bg-gradient-to-r from-brand to-brand-500 bg-clip-text text-transparent">
              {t("landing.h1b")}
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-[54ch] text-prose text-ink-soft">{t("landing.sub")}</p>

          <form
            onSubmit={(e) => { e.preventDefault(); submit(url); }}
            className="mx-auto mt-8 flex max-w-[560px] items-center gap-2 rounded-[26px] border border-black/[0.1] bg-white px-4 py-2.5 text-start shadow-[0_2px_12px_rgba(16,12,40,0.06)] transition focus-within:border-brand/40 focus-within:shadow-[0_2px_18px_rgba(77,47,176,0.10)]"
          >
            <MagnifyingGlass size={17} className="shrink-0 text-ink-faint" aria-hidden />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("landing.placeholder")}
              aria-label="Your store link"
              autoFocus
              dir="ltr"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-prose leading-6 text-ink outline-none placeholder:text-ink-faint"
            />
            <button
              type="submit"
              disabled={!armed}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-[20px] px-3.5 py-2 text-body font-semibold transition ${
                /* The composer's send is ink when armed and grey when it
                   is not. This one carries words rather than an arrow,
                   so the disarmed label stays ink — white on grey is a
                   button nobody can read. */
                armed ? "bg-ink text-white hover:bg-ink/85" : "cursor-not-allowed bg-neutral-200 text-ink-soft"
              }`}
            >
              {going ? t("landing.reading") : t("landing.cta")}
              <ArrowRight size={13} weight="bold" aria-hidden className="rtl:rotate-180" />
            </button>
          </form>

          <p className="mt-3 text-meta text-ink-faint">{t("landing.free")}</p>

          {/* Three lines that say what the product actually promises.
              The meeting note was to over-communicate the value, and a
              headline cannot carry a guarantee, a phase ladder and a
              pricing model at once. */}
          <ul className="mt-14 grid gap-7 border-t border-hairline pt-10 sm:grid-cols-3">
            {[
              { t: "landing.v1t", d: "landing.v1d" },
              { t: "landing.v2t", d: "landing.v2d" },
              { t: "landing.v3t", d: "landing.v3d" },
            ].map((v, i) => (
              <li key={v.t}>
                <span aria-hidden className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-brand/[0.08] text-meta font-bold text-brand">
                  {i + 1}
                </span>
                <p className="mt-2.5 text-body font-semibold text-ink">{t(v.t)}</p>
                <p className="mt-1 text-meta leading-5 text-ink-soft">{t(v.d)}</p>
              </li>
            ))}
          </ul>

          <p className="mt-10 flex items-center justify-center gap-2 text-meta text-ink-faint">
            <Lock size={13} weight="fill" aria-hidden />
            {t("landing.nothing")}
          </p>
        </div>
      </main>
    </div>
  );
}
