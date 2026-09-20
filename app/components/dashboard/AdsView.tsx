"use client";

/* Ads, as a queue rather than as a reading list.
 *
 * What this replaces: one tall column of cards, each carrying the
 * agent's verdict, the sentence behind it and five compliance checks,
 * all open, all at the same weight. In a panel that is right — you open
 * one draft, you read it, you decide. On a wide page it is eight cards
 * of paragraphs and the decision is nowhere near the top.
 *
 * A creative review genuinely needs the picture, so this view stays
 * card-shaped. What changes is rank inside the card: creator, product,
 * verdict, the two buttons. The reasoning and the checks are still
 * there, one press away, because a recommendation you have to open is
 * a recommendation nobody sees — but a recommendation that buries the
 * button is worse.
 *
 * Nothing here publishes. `setAdState` is the only path to live and it
 * is only ever called from a brand's click.
 */

import { useState } from "react";
import {
  CheckCircle, Clock, InstagramLogo, TiktokLogo, ThumbsDown, ThumbsUp,
  Warning, YoutubeLogo,
} from "@phosphor-icons/react";
import type { AdRecord } from "../../lib/agent/types";
import { REVIEW_WINDOW_DAYS, draftDaysLeft } from "../../lib/mock/campaigns";
import {
  setAdState, useAds, useLivePhase,
} from "../../lib/store";
import { LiveAdGrid } from "../AdCards";
import { Claim } from "../Evidence";
import { Avatar, Btn, Sheet } from "../ui";
import { DataRow, Detail, Section, Surface } from "./kit";

type Shelf = "waiting" | "live" | "declined";

const ICON = { Instagram: InstagramLogo, TikTok: TiktokLogo, YouTube: YoutubeLogo };

/* The verdict, as a chip and a disclosure label. The old card spent a
   full line on the sentence "I'd approve, with one thing to know"; here
   the chip says it and the sentence is behind the disclosure. */
const VERDICT = {
  approve: {
    chip: "I'd approve",
    why: "Why I'd approve",
    skin: "bg-good/10 text-good-deep",
    Icon: CheckCircle,
  },
  "approve-with-note": {
    chip: "I'd approve, with a note",
    why: "Why, and the one thing to know",
    skin: "bg-brand/10 text-brand",
    Icon: Warning,
  },
  hold: {
    chip: "I'd hold this",
    why: "Why I'd hold",
    skin: "bg-danger/10 text-danger",
    Icon: Clock,
  },
};

const TITLE: Record<Shelf, string> = {
  waiting: "Waiting on you",
  live: "Live from this phase",
  declined: "Declined",
};

export function AdsView() {
  const [shelf, setShelf] = useState<Shelf>("waiting");
  const [sel, setSel] = useState<string[]>([]);
  const ads = useAds();
  const phase = useLivePhase();

  const mine = phase ? ads.filter((a) => a.campaignId === phase.id) : [];
  const waiting = mine.filter((a) => a.state === "waiting");
  const live = mine.filter((a) => a.state === "live");
  const declined = mine.filter((a) => a.state === "declined");
  const counts = { waiting: waiting.length, live: live.length, declined: declined.length };

  const shown = shelf === "waiting" ? waiting : shelf === "live" ? live : declined;
  const held = waiting.filter((a) => a.compliance.verdict === "hold").length;
  /* What the agent would sign off on, which is what "select" preselects.
     Recomputed from the shelf rather than stored, so a decision made on
     a card never leaves a stale id behind in the batch. */
  const wouldApprove = waiting.filter((a) => a.compliance.verdict !== "hold").map((a) => a.id);

  const toggle = (id: string, on: boolean) => setSel((s) => (on ? [...s, id] : s.filter((x) => x !== id)));
  const approveSelected = () => { sel.forEach((id) => setAdState(id, "live")); setSel([]); };

  if (!phase) {
    return (
      <Surface className="p-6 text-center">
        <p className="text-body text-ink-soft">No phase is running, so no creator is drafting anything to review.</p>
      </Surface>
    );
  }

  return (
    <div className="space-y-6">
      {/* The review window, said where the countdown is rather than in
          a panel of promises it contradicts. */}
      {shelf === "waiting" && counts.waiting > 0 && (
        <p className="flex items-center gap-2 text-meta text-ink-faint">
          <Clock size={13} weight="fill" aria-hidden className="shrink-0 text-ink-faint" />
          A draft you do not decide within {REVIEW_WINDOW_DAYS} days publishes as the creator drafted it. Decline
          it and nothing goes out.
        </p>
      )}

      {/* The batch row. One line: what I would do, and the two presses
          that do it. The paragraph that used to explain the review
          window is now a chip on every card that has a clock on it. */}
      {shelf === "waiting" && counts.waiting > 0 && (
        <Surface className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">
            {counts.waiting}
          </span>
          <span className="min-w-0 flex-1 text-body text-ink">
            {held ? `${wouldApprove.length} I'd approve, ${held} I'd hold` : "I'd approve every one of them"}
          </span>
          <Btn variant="quiet" size="sm" onClick={() => setSel(wouldApprove)}>
            Select the {wouldApprove.length} I&apos;d approve
          </Btn>
          <Btn size="sm" disabled={!sel.length} onClick={approveSelected}>
            {sel.length ? `Approve ${sel.length} and publish` : "Approve and publish"}
          </Btn>
        </Surface>
      )}

      <Section
        title={TITLE[shelf]}
        aside={
          <div role="tablist" aria-label="Ad shelves" className="flex gap-0.5 rounded-control border border-hairline bg-canvas p-0.5">
            {([
              { k: "waiting" as const, label: "Waiting", n: counts.waiting },
              { k: "live" as const, label: "Live", n: counts.live },
              { k: "declined" as const, label: "Declined", n: counts.declined },
            ]).map((t) => (
              <button
                key={t.k}
                role="tab"
                aria-selected={shelf === t.k}
                onClick={() => { setShelf(t.k); setSel([]); }}
                className={`rounded-[10px] px-2.5 py-1 text-[11px] font-semibold transition ${
                  shelf === t.k ? "bg-white text-ink shadow-card" : "text-ink-faint hover:text-ink"
                }`}
              >
                {t.label} <span className="tabular-nums opacity-70">{t.n}</span>
              </button>
            ))}
          </div>
        }
      >
        {shelf === "live" ? (
          <LiveAdGrid ads={shown} />
        ) : shown.length === 0 ? (
          <Surface className="p-8 text-center">
            {shelf === "waiting" ? (
              <CheckCircle size={24} weight="fill" className="mx-auto text-good" aria-hidden />
            ) : (
              <Clock size={24} weight="fill" className="mx-auto text-ink-faint" aria-hidden />
            )}
            <p className="mt-2 text-body font-semibold text-ink">
              {shelf === "waiting" ? "Nothing waiting on you" : "Nothing declined"}
            </p>
            <p className="mt-1 text-meta text-ink-faint">
              {shelf === "waiting"
                ? "New drafts land here the moment a creator finishes one."
                : "A decline never publishes, and it collects here so you can change your mind."}
            </p>
          </Surface>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {shown.map((a) => (
              <AdCard
                key={a.id}
                ad={a}
                selected={sel.includes(a.id)}
                onSelect={shelf === "waiting" ? toggle : undefined}
              />
            ))}
          </div>
        )}
      </Section>

      {/* This panel said "Ads published without your approval: Never"
          and then, three rows lower, "An undecided draft goes live on
          its own: After 10 days". Both were true and the pair was a
          lie: the second IS publishing without approval, it just waits
          first. A brand who reads the two together learns that the
          promise has an expiry, which is the worst possible way to
          find that out.

          So the never-rows say never and mean it, and the timeout
          moves out to sit with the countdown chips on the cards it
          actually governs, worded as what it is. */}
      <Section title="What I may never do here">
        <Surface>
          <div className="divide-y divide-hairline">
            <DataRow label="Publish an ad you have not approved" value="Never" />
            <DataRow label="Move money without your approval" value="Never" />
            <DataRow label="What I do instead" value="Rank the queue, recommend" />
          </div>
        </Surface>
      </Section>
    </div>
  );
}

/* ── One draft ───────────────────────────────────────────────────── */

/** The card, reordered. Thumbnail and creator first because that is
    what a creative review recognises, then the verdict as a chip, then
    the two buttons. Everything that used to be four lines of open prose
    is behind one disclosure. */
function AdCard({
  ad, selected, onSelect,
}: {
  ad: AdRecord;
  selected?: boolean;
  onSelect?: (id: string, on: boolean) => void;
}) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const P = ICON[ad.platform];
  const v = VERDICT[ad.compliance.verdict];
  const days = draftDaysLeft(ad.submitted);
  const flags = ad.compliance.checks.filter((c) => !c.clean).length;

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-card border border-hairline bg-white shadow-card">
      <div className="flex gap-3 p-3">
        {onSelect && (
          <label className="flex shrink-0 items-start pt-1">
            <input
              type="checkbox"
              checked={!!selected}
              onChange={(e) => onSelect(ad.id, e.target.checked)}
              aria-label={`Select ${ad.creatorName}'s draft for batch approval`}
              className="h-4 w-4 accent-brand"
            />
          </label>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ad.img}
          alt={`Still from ${ad.creatorName}'s ${ad.format.toLowerCase()} for ${ad.product}`}
          className="h-[96px] w-[68px] shrink-0 rounded-control object-cover object-top"
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
          <p className="mt-1 truncate text-meta font-medium text-ink-soft">{ad.product}</p>

          {/* The read, as chips. Verdict, then what the checks found,
              then the clock — the three things that decide the press. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold ${v.skin}`}>
              <v.Icon size={10} weight="fill" aria-hidden />
              {v.chip}
            </span>
            <span className={`rounded-pill px-2 py-0.5 text-[11px] font-medium ${
              flags ? "bg-danger/10 text-danger" : "bg-good/10 text-good-deep"
            }`}>
              {flags
                ? `${flags} check${flags > 1 ? "s" : ""} flagged`
                : `${ad.compliance.checks.length} checks clean`}
            </span>
            {days !== null && ad.state === "waiting" && (
              <span className={`rounded-pill px-2 py-0.5 text-[11px] font-medium ${
                days <= 2 ? "bg-danger/10 text-danger" : "bg-canvas text-ink-faint"
              }`}>
                {days} days to decide
              </span>
            )}
          </div>

          <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-ink-faint">{ad.caption}</p>
          <p className="mt-1 truncate text-micro text-ink-faint">{ad.submitted} · {ad.track}</p>
        </div>
      </div>

      {/* The reasoning and the five checks, collapsed. Still the agent's
          own read against the brief the agent wrote, still sourced. */}
      <div className="border-t border-hairline px-3 py-2.5">
        <Detail summary={v.why}>
          <Claim src={ad.compliance.reasoning} />
          <ul className="mt-2 space-y-1.5 border-t border-hairline pt-2">
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
        </Detail>
      </div>

      {ad.state === "waiting" ? (
        <div className="mt-auto flex gap-2 border-t border-hairline p-3">
          <Btn variant="quiet" size="sm" className="flex-1" onClick={() => setDeclining(true)}>
            <ThumbsDown size={13} weight="fill" aria-hidden /> Decline
          </Btn>
          <Btn size="sm" className="flex-[1.4]" onClick={() => setAdState(ad.id, "live")}>
            <ThumbsUp size={13} weight="fill" aria-hidden /> Approve and publish
          </Btn>
        </div>
      ) : (
        <div className="mt-auto flex items-center gap-2 border-t border-hairline px-3 py-2.5">
          <span className="rounded-pill bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-faint">Declined</span>
          <button
            onClick={() => setAdState(ad.id, "waiting")}
            className="text-[11px] font-semibold text-brand hover:underline"
          >
            Put it back in the queue
          </button>
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
            className="mt-3 w-full resize-none rounded-control border border-hairline bg-rail p-3 text-body text-ink outline-none focus:border-ink/25"
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
    </article>
  );
}
