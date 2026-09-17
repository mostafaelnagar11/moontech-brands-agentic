"use client";

/* Creators, carried over from the current app.
 *
 * Same shape: a queue on the left, one profile on the right, and three
 * tabs — waiting, liked, passed. A like or a pass is a SIGNAL and never
 * a booking: it shapes who MoonMatch AI brings next, and the page says
 * so rather than implying the brand just hired someone.
 *
 * Four things are deliberately different from the original, all of them
 * fixes for something the port surfaced.
 *
 * The match score is COMPUTED. In the current app it is a hand-typed
 * integer in the seed, which is the same defect the audit flagged on
 * the old Brand Fit score: it never moved when you changed anything,
 * and it disagreed with the checklist printed beside it. Here it is
 * built from the three signals the card shows, so the number and its
 * reasons cannot drift apart.
 *
 * Search and selection agree. The original resolves the selected
 * creator against the tab list while rendering the search-filtered
 * list, so typing a query that excludes the selected person leaves her
 * detail on screen with no row highlighted.
 *
 * Acting on a liked or passed profile follows the creator to her new
 * tab instead of stranding you on whoever happens to be first.
 *
 * And the Performance block is not ported. It sits behind a permanently
 * false flag in the original, and half a dozen helpers exist only to
 * feed it.
 */

import { useMemo, useState } from "react";
import {
  ArrowUpRight, Check, InstagramLogo, MagnifyingGlass, MapPin, Minus, ThumbsDown, ThumbsUp, TiktokLogo, X,
} from "@phosphor-icons/react";
import { CREATORS, viewThrough, type CreatorSeed } from "../../lib/mock/creators";
import { marketFit, MIN_MARKET_FIT } from "../../lib/agent/model";
import { marketName } from "../../lib/agent/tools";
import {
  campaignLabel, clearCreatorSignal, likeCreator, NOTE_MAX, passCreator, passReasonLabel,
  PASS_REASONS, signalFor, useActiveCampaign, useActivePlan, useCreatorSignals,
} from "../../lib/store";
import { Section } from "./kit";

type Status = "waiting" | "liked" | "passed";

const TABS: { key: Status; label: string }[] = [
  { key: "waiting", label: "Waiting" },
  { key: "liked", label: "Liked" },
  { key: "passed", label: "Passed" },
];

const PLAT = {
  Instagram: { Icon: InstagramLogo, url: (h: string) => `https://instagram.com/${h}` },
  TikTok: { Icon: TiktokLogo, url: (h: string) => `https://tiktok.com/@${h}` },
  YouTube: { Icon: InstagramLogo, url: (h: string) => `https://youtube.com/@${h}` },
} as const;

/* ── The score, and the three things it is made of ─────────────────── */

interface Signal { label: string; value: string; why: string; ok: boolean }

function signalsFor(c: CreatorSeed, markets: string[], wantNiche: string[]) {
  const fit = marketFit(c, markets);
  const inside = c.topMarkets.filter((m) => markets.includes(m.code));
  const vt = viewThrough(c);

  const region: Signal = {
    label: "Region",
    value: inside.length
      ? `${Math.round(fit * 100)}% in ${inside.map((m) => marketName(m.code)).join(", ")}`
      : "Outside your markets",
    why: fit >= MIN_MARKET_FIT
      ? "past the share HeyMoon needs before a creator is worth briefing"
      : `under the ${Math.round(MIN_MARKET_FIT * 100)}% HeyMoon needs, so she is not shortlisted`,
    ok: fit >= MIN_MARKET_FIT,
  };
  const niche: Signal = {
    label: "Category",
    value: c.niche,
    why: wantNiche.includes(c.niche)
      ? "the category your store sells in"
      : "next to your category rather than in it",
    ok: wantNiche.includes(c.niche),
  };
  const watch: Signal = {
    label: "Audience",
    value: `${Math.round(vt * 100)}% of followers watch`,
    why: vt >= 0.2 ? "a following that turns up, not just a number" : "a large following that watches less of it",
    ok: vt >= 0.2,
  };

  /* Weighted, not averaged: being in the right markets is worth more
     than being in the right category, and both are worth more than
     view-through. The number is the sum of the three rows below it. */
  const score = Math.round(
    Math.min(1, fit / 0.6) * 55 + (niche.ok ? 25 : 10) + Math.min(1, vt / 0.35) * 20
  );
  return { signals: [region, niche, watch], score, competing: c.competing };
}

/* ── The page ──────────────────────────────────────────────────────── */

export function CreatorsView() {
  const plan = useActivePlan();
  const campaign = useActiveCampaign();
  const signals = useCreatorSignals();

  const [tab, setTab] = useState<Status>("waiting");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [passing, setPassing] = useState<CreatorSeed | null>(null);

  const markets = plan?.markets.value ?? [];
  const wantNiche = useMemo(() => {
    const cat = (plan?.brandName ?? "").toLowerCase();
    if (cat.includes("beauty")) return ["Beauty", "Lifestyle"];
    return ["Fashion", "Luxury", "Beauty"];
  }, [plan?.brandName]);

  /* Everyone MoonSearch AI would let through. A creator publishing for
     a competitor never reaches the queue — that is a safety call, not a
     taste one, and it is not the brand's to make. */
  const pool = useMemo(() => CREATORS.filter((c) => !c.competing), []);

  const inTab = pool.filter((c) => signalFor(signals, c.id).status === tab);
  const q = search.trim().toLowerCase();
  const shown = inTab.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)
  );

  /* Resolved against what the rail actually SHOWS. The original resolves
     against the unsearched list, so a query that hides the selected row
     leaves her profile up with nothing highlighted. */
  const selected = shown.find((c) => c.id === selectedId) ?? shown[0] ?? null;
  const waiting = pool.filter((c) => signalFor(signals, c.id).status === "waiting");
  const decided = pool.length - waiting.length;

  /* A decision moves the creator to another tab, so follow her there
     rather than stranding the brand on whoever is now first. */
  const follow = (id: number, to: Status) => { setTab(to); setSearch(""); setSelectedId(id); };

  const onLike = (c: CreatorSeed) => {
    likeCreator(c.id);
    if (tab === "waiting") {
      const next = waiting.filter((x) => x.id !== c.id)[0];
      setSelectedId(next?.id ?? null);
    } else follow(c.id, "liked");
  };

  const onUndo = (c: CreatorSeed) => { clearCreatorSignal(c.id); follow(c.id, "waiting"); };

  return (
    <div className="space-y-4">
      <Section
        title={campaign ? `Creators for ${campaignLabel(campaign)}` : "Creators"}
        aside={
          <span className="text-[11px] text-ink-faint">
            {decided} of {pool.length} reviewed
          </span>
        }
      >
        <div className="flex flex-wrap gap-1 rounded-control border border-hairline bg-canvas p-1">
          {TABS.map((t) => {
            const n = pool.filter((c) => signalFor(signals, c.id).status === t.key).length;
            const on = t.key === tab;
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSearch(""); setSelectedId(null); }}
                aria-current={on}
                className={`rounded-[9px] px-3 py-1.5 text-meta font-semibold transition ${
                  on ? "bg-white text-ink shadow-card" : "text-ink-faint hover:text-ink"
                }`}
              >
                {t.label} <span className={on ? "opacity-60" : "opacity-50"}>{n}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        {/* The queue */}
        <aside className="overflow-hidden rounded-card border border-hairline bg-rail" aria-label="Creator queue">
          <div className="border-b border-hairline p-2.5">
            <div className="flex items-center gap-2 rounded-control border border-hairline bg-white px-3 py-2">
              <MagnifyingGlass size={13} aria-hidden className="shrink-0 text-ink-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search creators"
                aria-label="Search creators"
                className="w-full bg-transparent text-meta text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
          </div>
          <div className="max-h-[520px] space-y-0.5 overflow-y-auto p-2">
            {shown.length === 0 ? (
              <p className="px-3 py-8 text-center text-meta text-ink-faint">
                {q ? "Nobody here matches that search." : `Nothing ${tab === "waiting" ? "waiting" : tab}.`}
              </p>
            ) : (
              shown.map((c) => {
                const st = signalFor(signals, c.id).status;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    aria-current={c.id === selected?.id}
                    className={`flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-start transition ${
                      c.id === selected?.id ? "bg-white shadow-card ring-1 ring-black/[0.06]" : "hover:bg-white/70"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.avatar} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-full bg-brand-100 object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-ink">{c.name}</span>
                      <span className="block truncate text-[11px] text-ink-faint">{c.niche}</span>
                    </span>
                    {st === "liked" && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-good" />}
                    {st === "passed" && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {selected ? (
          <Profile
            c={selected}
            markets={markets}
            wantNiche={wantNiche}
            status={signalFor(signals, selected.id).status}
            info={signalFor(signals, selected.id)}
            onLike={() => onLike(selected)}
            onPass={() => setPassing(selected)}
            onUndo={() => onUndo(selected)}
          />
        ) : (
          <div className="grid place-items-center rounded-card border border-hairline bg-white p-10 text-center">
            <p className="text-body text-ink-soft">Pick a creator from the queue.</p>
          </div>
        )}
      </div>

      {passing && (
        <PassDialog
          c={passing}
          onClose={() => setPassing(null)}
          onSend={(reasons, note) => {
            passCreator(passing.id, reasons, note);
            const wasWaiting = signalFor(signals, passing.id).status === "waiting";
            if (wasWaiting) {
              const next = waiting.filter((x) => x.id !== passing.id)[0];
              setSelectedId(next?.id ?? null);
            } else follow(passing.id, "passed");
            setPassing(null);
          }}
        />
      )}
    </div>
  );
}

/* ── One profile ───────────────────────────────────────────────────── */

function Profile({
  c, markets, wantNiche, status, info, onLike, onPass, onUndo,
}: {
  c: CreatorSeed;
  markets: string[];
  wantNiche: string[];
  status: Status;
  info: { reasons?: string[]; note?: string };
  onLike: () => void;
  onPass: () => void;
  onUndo: () => void;
}) {
  const { signals, score } = signalsFor(c, markets, wantNiche);
  const strong = score >= 80;
  const P = PLAT[c.platform];

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-card border border-hairline bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.avatar} alt="" className="h-[72px] w-[72px] shrink-0 rounded-[20px] bg-brand-100 object-cover" />
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-bold tracking-tight text-ink">{c.name}</h2>
              <a
                href={P.url(c.handle.replace("@", ""))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-hairline bg-wash px-2 py-0.5 text-[11px] font-medium text-ink-soft no-underline transition hover:border-brand/30 hover:text-brand"
              >
                <P.Icon size={13} weight="fill" aria-hidden /> {c.platform}
                <ArrowUpRight size={10} weight="bold" aria-hidden className="opacity-60 rtl:-scale-x-100" />
              </a>
              <span className="inline-flex items-center gap-1 text-meta text-ink-faint">
                <MapPin size={12} weight="fill" aria-hidden /> {c.location}
              </span>
            </div>
            <p className="mb-2.5 text-meta text-ink-faint">
              {c.handle} · {c.niche} · {c.followers.toLocaleString("en-US")} followers
            </p>
            <p className="max-w-[62ch] text-meta leading-relaxed text-ink-soft">{c.bio}</p>
          </div>
          {/* The score, and the three rows below it are what it is made
              of. In the current app this is a typed integer that never
              moves; here it is the sum of the signals. */}
          <div
            className={`grid h-[96px] w-[96px] shrink-0 place-items-center rounded-card text-center ${
              strong ? "bg-good" : "bg-brand"
            }`}
          >
            <span>
              <span className="block text-[9px] font-semibold uppercase tracking-wide text-white/70">Match</span>
              <span className="mt-1 block text-[26px] font-bold tabular-nums leading-none text-white">{score}%</span>
              <span className="mt-1 block text-[10px] font-medium text-white/80">{strong ? "Strong" : "Fair"}</span>
            </span>
          </div>
        </div>

        {status === "liked" && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-control border border-good/25 bg-good/[0.05] px-3.5 py-2.5">
            <p className="min-w-0 flex-1 text-meta text-good-deep">
              Liked. MoonMatch AI will bring you more profiles like hers.
            </p>
            <button onClick={onPass} className="shrink-0 text-[11px] font-semibold text-ink-soft hover:underline">
              Pass instead
            </button>
          </div>
        )}

        {status === "passed" && (
          <div className="mt-5 rounded-control border border-hairline bg-wash px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-meta text-ink-soft">
                Passed. MoonMatch AI will ease off profiles like hers.
              </p>
              <button onClick={onUndo} className="shrink-0 text-[11px] font-semibold text-brand hover:underline">
                Undo
              </button>
            </div>
            {info.reasons?.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {info.reasons.map((r) => (
                  <li key={r} className="rounded-pill bg-white px-2 py-0.5 text-[11px] text-ink-soft">
                    {passReasonLabel(r)}
                  </li>
                ))}
              </ul>
            ) : null}
            {info.note && <p className="mt-2 text-[11px] italic leading-4 text-ink-faint">“{info.note}”</p>}
            <p className="mt-2 text-[11px] text-ink-faint">
              This only shapes who comes next. Nobody is told, and you can undo it any time.
            </p>
          </div>
        )}

        <div className="mt-5 rounded-card border border-brand/[0.12] bg-brand/[0.04] p-4">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand">
            <span aria-hidden>✶</span> Why she was matched
          </p>
          <div className="space-y-2">
            {signals.map((k) => (
              <div key={k.label} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className={`mt-px grid h-4 w-4 shrink-0 place-items-center rounded ${
                    k.ok ? "bg-brand/10 text-brand" : "bg-black/[0.05] text-ink-faint"
                  }`}
                >
                  {k.ok ? <Check size={10} weight="bold" /> : <Minus size={10} weight="bold" />}
                </span>
                <span className="w-[74px] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  {k.label}
                </span>
                <span className="min-w-0 flex-1 text-meta leading-relaxed">
                  <span className={k.ok ? "font-semibold text-ink-soft" : "font-semibold text-ink-faint"}>{k.value}</span>
                  <span className="text-ink-faint"> · {k.why}</span>
                </span>
              </div>
            ))}
          </div>
          {c.conflict && (
            <p className="mt-2.5 border-t border-brand/[0.12] pt-2.5 text-[11px] text-ink-soft">
              <span className="font-semibold">Declared:</span> {c.conflict}
            </p>
          )}
        </div>

        <p className="mb-2 mt-5 text-[13px] font-semibold text-ink">Recent posts</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${c.posts.length}, minmax(0, 1fr))` }}>
          {c.posts.map((p, i) => (
            <span key={i} className="relative block aspect-[9/14] overflow-hidden rounded-control bg-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt={`${c.name}, ${p.type}`} loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute start-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-bold text-white">
                {p.type}
              </span>
            </span>
          ))}
        </div>
      </div>

      {status === "waiting" && (
        <div className="flex shrink-0 gap-2 border-t border-hairline p-3">
          <button
            onClick={onPass}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-control border border-hairline bg-white px-4 py-2.5 text-body font-semibold text-ink-soft transition hover:bg-wash"
          >
            <ThumbsDown size={14} weight="fill" aria-hidden /> Pass
          </button>
          <button
            onClick={onLike}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-control bg-brand px-4 py-2.5 text-body font-semibold text-white transition hover:bg-brand-hover"
          >
            <ThumbsUp size={14} weight="fill" aria-hidden /> Like
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Passing, with a reason ────────────────────────────────────────── */

function PassDialog({
  c, onClose, onSend,
}: {
  c: CreatorSeed;
  onClose: () => void;
  onSend: (reasons: string[], note?: string) => void;
}) {
  const [reasons, setReasons] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const toggle = (id: string) =>
    setReasons((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Pass on ${c.name}`}
        className="relative w-full max-w-[440px] overflow-hidden rounded-card border border-hairline bg-white shadow-pop"
      >
        <div className="flex items-start gap-3 border-b border-hairline p-4">
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-ink">Passing on {c.name.split(" ")[0]}</p>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              Tell me why and the next batch shifts. She is never told, and nothing is cancelled.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cancel"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-control text-ink-faint transition hover:bg-black/[0.05]"
          >
            <X size={14} aria-hidden />
          </button>
        </div>

        <div className="space-y-1.5 p-4">
          {PASS_REASONS.map((r) => {
            const on = reasons.includes(r.id);
            return (
              <button
                key={r.id}
                onClick={() => toggle(r.id)}
                aria-pressed={on}
                className={`flex w-full items-center gap-2.5 rounded-control border px-3 py-2 text-start text-body transition ${
                  on ? "border-brand/40 bg-brand/[0.05] text-ink" : "border-hairline bg-white text-ink-soft hover:bg-wash"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded ${on ? "bg-brand text-white" : "border border-black/15"}`}
                >
                  {on && <Check size={10} weight="bold" />}
                </span>
                {r.label}
              </button>
            );
          })}
          <textarea
            value={note}
            autoFocus
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else? (optional)"
            aria-label="Note"
            className="mt-1.5 h-20 w-full resize-none rounded-control border border-hairline bg-white p-3 text-body text-ink outline-none transition focus:border-ink/25"
          />
          <p className="text-end text-[10px] text-ink-faint">{note.length}/{NOTE_MAX}</p>
        </div>

        <div className="flex gap-2 border-t border-hairline p-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-control border border-hairline bg-white px-4 py-2 text-body font-semibold text-ink-soft transition hover:bg-wash"
          >
            Cancel
          </button>
          <button
            onClick={() => onSend(reasons, note.trim() || undefined)}
            disabled={reasons.length === 0}
            className={`flex-1 rounded-control px-4 py-2 text-body font-semibold text-white transition ${
              reasons.length ? "bg-brand hover:bg-brand-hover" : "bg-neutral-200"
            }`}
          >
            Pass
          </button>
        </div>
      </div>
    </div>
  );
}
