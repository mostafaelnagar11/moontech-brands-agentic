"use client";

/* A matched creator, in the forms the product is allowed to show.

   Every reason is specific to THIS plan — the markets on it, the price
   band read off the store, the creator's own numbers. The current app's
   creators screen shows a four-row checklist that is genuinely per
   brand, and this keeps that, but it drops the hand-typed Brand Fit
   score that sat beside it and disagreed with it.

   A caveat is shown, not hidden. A creator who also publishes for
   somebody else is a fact the brand should have before they pay, not
   after a draft arrives.

   Two things never appear here, in any state: a price beside a person,
   which the review call said is against the premise of the product, and
   a name or handle before Phase 1 is paid for. */

import { InstagramLogo, LockSimple, TiktokLogo, YoutubeLogo, Warning, X } from "@phosphor-icons/react";
import type { CreatorMatch } from "../lib/agent/types";
import { fmtCount, fmtUSD } from "../lib/mock/campaigns";
import { PHASE1_BUDGET } from "../lib/agent/tools";
import { Avatar } from "./ui";
import { Claim } from "./Evidence";

const ICON = { Instagram: InstagramLogo, TikTok: TiktokLogo, YouTube: YoutubeLogo };

export function CreatorCard({
  c, onDrop, compact = false,
}: {
  c: CreatorMatch;
  onDrop?: (id: number) => void;
  compact?: boolean;
}) {
  const P = ICON[c.platform];
  return (
    <article className="flex flex-col rounded-card border border-hairline bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <Avatar src={c.avatar} name={c.name} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">{c.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-meta text-ink-faint">
            <P size={12} weight="fill" aria-hidden />
            <span className="truncate">{c.handle}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0 tabular-nums">{fmtCount(c.followers)}</span>
          </p>
        </div>
        {onDrop && (
          <button
            onClick={() => onDrop(c.id)}
            aria-label={`Drop ${c.name} from this plan`}
            className="shrink-0 rounded-control p-1.5 text-ink-faint transition hover:bg-danger/[0.07] hover:text-danger"
          >
            <X size={14} weight="bold" aria-hidden />
          </button>
        )}
      </div>

      {!compact && (
        <ul className="mt-3 space-y-1.5 border-t border-hairline pt-3">
          {c.reasons.map((r, i) => (
            <li key={i}>
              <Claim src={r}>
                <span className="flex gap-2">
                  <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand" />
                  <span className="flex-1 text-meta leading-5">{String(r.value)}</span>
                </span>
              </Claim>
            </li>
          ))}
        </ul>
      )}

      {c.caveat && (
        <p className="mt-3 flex items-start gap-2 rounded-control bg-wash px-2.5 py-2 text-[11px] leading-4 text-ink-soft">
          <Warning size={12} weight="fill" className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
          {c.caveat}
        </p>
      )}

    </article>
  );
}

/** One creator per row: avatar and identity on one line, the reasons
    underneath. Readable in a 420px side panel, where a three-column grid
    is three unreadable columns — viewport breakpoints do not know how
    wide their container is. */
export function CreatorRow({ c, onDrop }: { c: CreatorMatch; onDrop?: (id: number) => void }) {
  const P = ICON[c.platform];
  return (
    <article className="rounded-card border border-hairline bg-white p-3.5 shadow-card">
      <div className="flex items-center gap-3">
        <Avatar src={c.avatar} name={c.name} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">{c.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-meta text-ink-faint">
            <span className="inline-flex items-center gap-1"><P size={11} weight="fill" aria-hidden />{c.handle}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{fmtCount(c.followers)}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{Math.round(c.viewThrough * 100)}% watch</span>
          </p>
        </div>
        {onDrop && (
          <button
            onClick={() => onDrop(c.id)}
            aria-label={`Drop ${c.name} from this plan`}
            className="shrink-0 rounded-control p-1.5 text-ink-faint transition hover:bg-danger/[0.07] hover:text-danger"
          >
            <X size={14} weight="bold" aria-hidden />
          </button>
        )}
      </div>

      <ul className="mt-2.5 space-y-1 border-t border-hairline pt-2.5">
        {c.reasons.map((r, i) => (
          <li key={i}>
            <Claim src={r}>
              <span className="flex gap-2">
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand" />
                <span className="flex-1 text-meta leading-5">{String(r.value)}</span>
              </span>
            </Claim>
          </li>
        ))}
      </ul>

      {c.caveat && (
        <p className="mt-2.5 flex items-start gap-2 rounded-control bg-wash px-2.5 py-2 text-[11px] leading-4 text-ink-soft">
          <Warning size={12} weight="fill" className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
          {c.caveat}
        </p>
      )}
    </article>
  );
}

export function CreatorGrid({
  creators, onDrop, cols = 3,
}: {
  creators: CreatorMatch[];
  onDrop?: (id: number) => void;
  /** 1 stacks them as full-width rows — use it inside any narrow column. */
  cols?: 1 | 2 | 3;
}) {
  if (!creators.length) {
    return (
      <p className="rounded-card border border-dashed border-black/[0.12] bg-wash p-6 text-center text-body text-ink-faint">
        No creator on the roster has enough of their audience in these markets. Widen the markets and the shortlist comes back.
      </p>
    );
  }
  if (cols === 1) {
    return (
      <div className="space-y-2.5">
        {creators.map((c) => <CreatorRow key={c.id} c={c} onDrop={onDrop} />)}
      </div>
    );
  }
  return (
    <div className={`grid grid-cols-1 gap-3 ${cols >= 2 ? "sm:grid-cols-2" : ""} ${cols >= 3 ? "xl:grid-cols-3" : ""}`}>
      {creators.map((c) => <CreatorCard key={c.id} c={c} onDrop={onDrop} />)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Before payment                                                      */
/*                                                                     */
/* The shortlist is the work, and it is also the thing a brand could    */
/* take and run themselves. So before a phase is paid for, the count    */
/* and the substance are shown and the identities are not: how many,    */
/* how much reach, how much of it is in your markets, what they         */
/* publish — but no names, no handles, no links.                        */
/*                                                                     */
/* The faces are real and unblurred. The review call was explicit that  */
/* "there is no harm in showing the icons of these profiles" and that   */
/* the line is names, handles and links — and a blurred face would read */
/* as a loading state, when this is a commercial decision the card      */
/* states in words instead.                                             */
/*                                                                     */
/* The crew is a SUBSET, and the card says so. MoonMatch AI matches a  */
/* pool to the brand and MoonSearch AI vets it, and then the fixed      */
/* $1,000 warm-up briefs however many of that pool it pays for. Showing */
/* the crew without the pool would make the plan look smaller than the  */
/* match actually is, and would hide what Phases 2 and 3 are for.       */
/* ------------------------------------------------------------------ */

export function CreatorSummary({ creators, matched }: {
  creators: CreatorMatch[];
  /** How many MoonMatch AI found in total. Defaults to the crew itself,
      for callers that only hold the briefed ones. */
  matched?: number;
}) {
  if (!creators.length) {
    return (
      <p className="rounded-card border border-dashed border-black/[0.12] bg-wash p-6 text-center text-body text-ink-faint">
        No creator on the roster has enough of their audience in these markets. Widen the markets and the shortlist comes back.
      </p>
    );
  }

  const reach = creators.reduce((n, c) => n + Math.round(c.followers * c.viewThrough), 0);
  const inMarket = Math.round(creators.reduce((n, c) => n + c.gulfShare, 0) / creators.length);
  const watch = Math.round((creators.reduce((n, c) => n + c.viewThrough, 0) / creators.length) * 100);
  const niches = Array.from(new Set(creators.map((c) => c.niche)));
  const platforms = Array.from(new Set(creators.map((c) => c.platform)));
  /* The crew that the warm-up briefs, against the pool it was drawn
     from. A caller that does not know the pool passes nothing, and the
     card simply does not claim there is one. */
  const crew = creators.length;
  const pool = Math.max(matched ?? crew, crew);
  const subset = pool > crew;

  return (
    <article className="rounded-card border border-hairline bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        {/* Face plus platform — the "small details" the call allowed —
            and nothing that identifies. Earlier faces sit on top of later
            ones, so each badge lands over the next face and stays visible. */}
        <span className="flex -space-x-2.5 rtl:space-x-reverse" aria-hidden>
          {creators.slice(0, 6).map((c, i) => {
            const P = ICON[c.platform];
            return (
              <span key={c.id} className="relative h-9 w-9 shrink-0" style={{ zIndex: 10 - i }}>
                <span className="block h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-brand-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.avatar} alt="" loading="lazy" className="h-full w-full object-cover" />
                </span>
                <span className="absolute -bottom-0.5 -end-0.5 grid h-4 w-4 place-items-center rounded-full border border-white bg-white text-ink-soft shadow-card">
                  <P size={9} weight="fill" />
                </span>
              </span>
            );
          })}
          {creators.length > 6 && (
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-white bg-brand-100 text-[11px] font-bold text-brand">
              +{creators.length - 6}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-ink">
            {subset
              ? `${crew} of the ${pool} matched creators are in your warm-up crew`
              : `${crew} creators matched and held for you`}
          </p>
          <p className="mt-0.5 text-meta text-ink-faint">
            {platforms.join(" and ")} · {niches.join(", ").toLowerCase()}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-hairline pt-3">
        <div>
          <dt className="text-[11px] text-ink-faint">Combined reach per post</dt>
          <dd className="text-title font-semibold tabular-nums text-ink">{fmtCount(reach)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink-faint">Audience in the Gulf</dt>
          <dd className="text-title font-semibold tabular-nums text-ink">{inMarket}%</dd>
        </div>
        <div>
          <dt className="text-[11px] text-ink-faint">Of followers who watch</dt>
          <dd className="text-title font-semibold tabular-nums text-ink">{watch}%</dd>
        </div>
      </dl>

      <p className="mt-3 flex items-start gap-2 rounded-control bg-wash px-2.5 py-2 text-[11px] leading-4 text-ink-soft">
        <LockSimple size={12} weight="fill" className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
        <span>
          MoonMatch AI found {subset ? `all ${pool}` : "them"} and MoonSearch AI vetted every one for brand and fraud
          risk.{" "}
          {subset
            ? `The ${fmtUSD(PHASE1_BUDGET)} warm-up briefs the ${crew} best value of them, and the rest of the pool is what Phases 2 and 3 are for. `
            : ""}
          Names, handles and recent posts appear the moment Phase 1 starts. The pictures are real; the identities wait.
        </span>
      </p>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* After payment, in the side pane                                     */
/*                                                                     */
/* Names are fine once the phase is paid for. Full profiles are not     */
/* what a side pane is for — Alex: "we don't need the profile of every  */
/* creator". Face, name, platform, niche. The reasons and posts live    */
/* on the phase page. No fee, here or anywhere.                         */
/* ------------------------------------------------------------------ */

export function CreatorNames({ creators }: { creators: CreatorMatch[] }) {
  return (
    <ul className="divide-y divide-hairline rounded-card border border-hairline bg-white shadow-card">
      {creators.map((c) => {
        const P = ICON[c.platform];
        return (
          <li key={c.id} className="flex items-center gap-3 px-3.5 py-2.5">
            <Avatar src={c.avatar} name={c.name} size={32} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-semibold text-ink">{c.name}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
                <P size={10} weight="fill" aria-hidden />
                {c.handle} · {c.niche.toLowerCase()}
              </span>
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-ink-faint">{fmtCount(c.followers)}</span>
          </li>
        );
      })}
    </ul>
  );
}
