"use client";

/* Ads: the live grid, and the approval card.

   The approval card is the one that matters. It carries the agent's own
   compliance check against the brief IT wrote, a recommendation, and the
   reasoning behind that recommendation — and then still makes the brand
   press the button. A recommendation is not a decision.

   Nothing here can publish on its own. `setAdState` is the only path,
   and it is only ever called from a click. */

import { useState } from "react";
import {
  CheckCircle, Clock, InstagramLogo, TiktokLogo, ThumbsDown, ThumbsUp,
  Warning, YoutubeLogo,
} from "@phosphor-icons/react";
import type { AdRecord } from "../lib/agent/types";
import { draftDaysLeft, fmtCount, fmtUSD } from "../lib/mock/campaigns";
import { setAdState } from "../lib/store";
import { Avatar, Btn, Card, Pill, Sheet } from "./ui";
import { Claim, Figure } from "./Evidence";

const ICON = { Instagram: InstagramLogo, TikTok: TiktokLogo, YouTube: YoutubeLogo };

const VERDICT = {
  approve: { word: "I'd approve this", tone: "good" as const, Icon: CheckCircle },
  "approve-with-note": { word: "I'd approve, with one thing to know", tone: "brand" as const, Icon: Warning },
  hold: { word: "I'd hold this for a re-cut", tone: "danger" as const, Icon: Clock },
};

export function ApprovalCard({
  ad, selected, onSelect, compact = false,
}: {
  ad: AdRecord;
  selected?: boolean;
  onSelect?: (id: string, on: boolean) => void;
  compact?: boolean;
}) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const P = ICON[ad.platform];
  const v = VERDICT[ad.compliance.verdict];
  const days = draftDaysLeft(ad.submitted);

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-3">
        {onSelect && (
          <label className="flex shrink-0 items-start pt-1">
            <input
              type="checkbox"
              checked={!!selected}
              onChange={(e) => onSelect(ad.id, e.target.checked)}
              aria-label={`Select ${ad.creatorName}'s draft for batch approval`}
              className="h-4 w-4 accent-[#4D2FB0]"
            />
          </label>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ad.img}
          alt={`Still from ${ad.creatorName}'s ${ad.format.toLowerCase()} for ${ad.product}`}
          className="h-[104px] w-[74px] shrink-0 rounded-control object-cover object-top"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Avatar src={ad.avatar} name={ad.creatorName} size={20} />
            <p className="truncate text-body font-semibold text-ink">{ad.creatorName}</p>
            <span className="ms-auto flex shrink-0 items-center gap-1 text-[11px] text-ink-faint">
              <P size={11} weight="fill" aria-hidden /> {ad.format}
            </span>
          </div>
          <p className="mt-1 text-meta font-medium text-ink-soft">{ad.product}</p>
          <p className="mt-1 line-clamp-2 text-meta leading-5 text-ink-faint">{ad.caption}</p>
          <p className="mt-1.5 text-[11px] text-ink-faint">
            {ad.submitted} · {ad.track}
            {days !== null && ad.state === "waiting" && (
              <span className={days <= 2 ? " font-semibold text-danger" : ""}> · {days} days left to decide</span>
            )}
          </p>
        </div>
      </div>

      {/* The agent's read. Always visible — a recommendation you have to
          open is a recommendation nobody sees. */}
      <div className={`border-t border-hairline px-3 py-3 ${v.tone === "danger" ? "bg-danger/[0.03]" : v.tone === "good" ? "bg-good/[0.03]" : "bg-brand/[0.03]"}`}>
        <p className={`flex items-center gap-1.5 text-meta font-semibold ${v.tone === "danger" ? "text-danger" : v.tone === "good" ? "text-good-deep" : "text-brand"}`}>
          <v.Icon size={14} weight="fill" aria-hidden />
          {v.word}
        </p>
        <Claim src={ad.compliance.reasoning} className="mt-1.5" />

        {!compact && (
          <ul className="mt-2.5 space-y-1.5 border-t border-hairline pt-2.5">
            {ad.compliance.checks.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded text-white ${c.clean ? "bg-good" : "bg-danger/70"}`}
                >
                  {c.clean ? <CheckCircle size={10} weight="fill" /> : <Warning size={10} weight="fill" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold text-ink">{c.label}</span>
                  <span className="block text-[11px] leading-4 text-ink-faint">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {ad.state === "waiting" ? (
        <div className="flex gap-2 border-t border-hairline p-3">
          <Btn variant="quiet" size="sm" className="flex-1" onClick={() => setDeclining(true)}>
            <ThumbsDown size={13} weight="fill" aria-hidden /> Decline
          </Btn>
          <Btn size="sm" className="flex-[1.4]" onClick={() => setAdState(ad.id, "live")}>
            <ThumbsUp size={13} weight="fill" aria-hidden /> Approve and publish
          </Btn>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-t border-hairline px-3 py-2.5">
          <Pill tone={ad.state === "live" ? "good" : "muted"}>{ad.state === "live" ? "Live" : "Declined"}</Pill>
          {ad.state === "declined" && (
            <button onClick={() => setAdState(ad.id, "waiting")} className="text-meta font-semibold text-brand hover:underline">
              Put it back in the queue
            </button>
          )}
          {ad.state === "live" && ad.performance && (
            <span className="ms-auto text-meta tabular-nums text-ink-faint">
              {fmtCount(ad.performance.views.value)} views · {fmtUSD(ad.performance.revenue.value)}
            </span>
          )}
        </div>
      )}

      <Sheet open={declining} onClose={() => setDeclining(false)} labelledBy={`dec-${ad.id}`}>
        <div className="p-5">
          <h2 id={`dec-${ad.id}`} className="text-title font-bold text-ink">Why is this not right?</h2>
          <p className="mt-1.5 text-body leading-6 text-ink-soft">
            {ad.creatorName} sees your reason, so she knows what to change. A decline never publishes and you can reopen it.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 280))}
            rows={3}
            placeholder="It doesn't follow the brief because…"
            className="mt-3 w-full resize-none rounded-control border border-black/[0.09] bg-rail p-3 text-body text-ink outline-none focus:border-ink/25"
          />
          <p className="mt-1 text-end text-[11px] tabular-nums text-ink-faint">{reason.length}/280</p>
          <div className="mt-4 flex gap-2">
            <Btn variant="quiet" className="flex-1" onClick={() => setDeclining(false)}>Cancel</Btn>
            <Btn
              className="flex-[1.4] bg-ink hover:bg-ink/90"
              disabled={!reason.trim()}
              onClick={() => { setAdState(ad.id, "declined", reason.trim()); setDeclining(false); }}
            >
              Send the decline
            </Btn>
          </div>
        </div>
      </Sheet>
    </Card>
  );
}

/** The live grid. Performance only ever comes from platform data, so an
    ad that has not posted shows no view count at all. */
export function LiveAdGrid({ ads }: { ads: AdRecord[] }) {
  if (!ads.length) {
    return (
      <p className="rounded-card border border-dashed border-black/[0.12] bg-wash p-6 text-center text-body text-ink-faint">
        Nothing is live from this phase yet. Drafts you approve publish within the hour and collect here.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {ads.map((a) => {
        const P = ICON[a.platform];
        return (
          <article key={a.id} className="overflow-hidden rounded-card border border-hairline bg-white shadow-card">
            <div className="relative aspect-[9/13] bg-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.img} alt={`${a.creatorName}, ${a.product}`} className="h-full w-full object-cover object-top" loading="lazy" />
              <span className="absolute start-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                {a.format}
              </span>
              <span className="absolute end-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-good text-white">
                <CheckCircle size={11} weight="fill" aria-hidden />
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-8">
                <p className="ad-shadow truncate text-[11px] font-bold text-white">{a.creatorName.split(" ")[0]}</p>
                <p className="ad-shadow flex items-center gap-1 text-[10px] text-white/80">
                  <P size={9} weight="fill" aria-hidden /> {a.track}
                </p>
              </div>
            </div>
            {a.performance && (
              <div className="flex items-center justify-between gap-1 px-2.5 py-2">
                <Figure src={a.performance.views} render={fmtCount(a.performance.views.value)} size="sm" label="views" />
                <Figure src={a.performance.revenue} render={fmtUSD(a.performance.revenue.value)} size="sm" />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
