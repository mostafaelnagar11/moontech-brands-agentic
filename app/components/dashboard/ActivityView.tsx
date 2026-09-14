"use client";

/* The log of what the agents did on their own, as a table rather than
 * as five essays.
 *
 * What this replaces: a card per entry, each carrying the title, the
 * agent, the permission, a "Why" paragraph, a "What changed" paragraph
 * and an undo — six lines of equal weight, five times over. In a panel
 * that is a log you read once. In the dashboard column it is the one
 * screen a brand opens in a hurry, to answer two questions: what did
 * you do behind my back, and can I take it back. So the row states the
 * agent, the act, when, and the undo — and everything that explains it
 * sits behind "Why", one press away and closed until asked for.
 *
 * The stat row at the top is the product's claim in three figures, and
 * the third is the one that matters: money moved without asking, which
 * is zero, permanently, because it is not a setting.
 */

import { ArrowClockwise, ArrowCounterClockwise, ArrowRight, LockSimple, Sliders } from "@phosphor-icons/react";
import { Pill } from "../ui";
import {
  redoActivity, undoActivity, useActivity, useAutonomy,
  type ActivityEntry, type AutonomyLevel,
} from "../../lib/store";
import { useGo } from "../../lib/surface";
import { Detail, Section, Surface, Tile } from "./kit";

/** Which of the seven agents did it. The field is on the log entries
    themselves; an entry without one still renders, because a missing
    attribution is a gap in the data rather than a reason to drop the
    row. */
const agentOf = (a: ActivityEntry): string | null => {
  const v = (a as ActivityEntry & { agent?: unknown }).agent;
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

/* A column, not a sentence: "41m", not "41 minutes ago". Same arithmetic
   as everywhere else on the dashboard. */
const ago = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

const LEVEL_WORD: Record<AutonomyLevel, string> = {
  alone: "On its own",
  ask: "Asks first",
  never: "Never",
};

export function ActivityView() {
  const go = useGo();
  const activity = useActivity();
  const autonomy = useAutonomy();
  const ruleOf = (k: string) => autonomy.find((r) => r.key === k);

  /* Newest first, stated rather than assumed — the log is the one list
     where the order is the information. */
  const rows = [...activity].sort((a, b) => b.at - a.at);

  const undoneCount = rows.filter((a) => a.undone).length;
  const reversible = rows.filter((a) => a.undoable && !a.undone).length;
  const agents = new Set(rows.map(agentOf).filter(Boolean)).size;
  /* The three limits no level of trust turns on. Read from the rules
     themselves, so the log cannot claim a lock the settings do not
     hold. */
  const locked = autonomy.filter((r) => r.locked);

  return (
    <div className="space-y-6">
      {/* Three figures. The third is the claim the product rests on, and
          it is a constant: no agent has a path to money. */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Tile
          tone="hero"
          label="Done without asking"
          value={rows.length}
          sub={agents ? `${agents} agents, every one signed` : "all of it logged here"}
        />
        <Tile
          label="Undone by you"
          value={undoneCount}
          sub={`${reversible} more can still be undone`}
        />
        <Tile
          tone="good"
          label="Money moved"
          value={<span className="text-good-deep">$0</span>}
          sub="never, and not a setting"
        />
      </div>

      {/* The fixed limits, kept where they were: above the log, not in a
          settings screen nobody opens. */}
      <Surface className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-faint">
          <LockSimple size={12} weight="fill" className="text-brand" aria-hidden />
          Fixed limits
        </span>
        {locked.map((r) => (
          <span key={r.key} className="inline-flex items-center gap-1.5 text-[11px]">
            <span className="text-ink-soft">{r.label}</span>
            <span className="font-semibold text-good-deep">{LEVEL_WORD[r.level]}</span>
          </span>
        ))}
        <div className="ms-auto shrink-0">
          <Detail summary="Why these cannot be turned on">
            They are not preferences. Nothing in this log moved money or published anything, and there is no
            level of trust that would let it: an agent may move budget you have already paid, inside the phase
            you paid it for, and a draft goes live only after you approve it.
          </Detail>
        </div>
      </Surface>

      <Section
        title="Everything I did on my own"
        aside={
          <button
            onClick={() => go("autonomy")}
            className="inline-flex items-center gap-1.5 rounded-control border border-hairline bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-soft transition hover:bg-neutral-50"
          >
            <Sliders size={12} weight="bold" aria-hidden /> Change what I may do
          </button>
        }
      >
        <Surface>
          {/* Column heads, so the rows read as a table and not as a feed. */}
          <div className="hidden items-center gap-3 border-b border-hairline bg-rail px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-faint sm:flex">
            <span className="w-[132px] shrink-0">Agent</span>
            <span className="min-w-0 flex-1">What it did</span>
            <span className="w-[72px] shrink-0 text-end">When</span>
            <span className="w-[88px] shrink-0 text-end">Undo</span>
          </div>

          {rows.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-body text-ink-soft">Nothing yet. Anything I do on my own shows up here first.</p>
            </div>
          ) : (
            <ol className="divide-y divide-hairline">
              {rows.map((a) => {
                const rule = ruleOf(a.ruleKey);
                const agent = agentOf(a);
                return (
                  <li key={a.id} className={`px-4 py-3 ${a.undone ? "bg-neutral-50/60" : ""}`}>
                    <div className="flex items-start gap-3">
                      <span className="hidden w-[132px] shrink-0 sm:block">
                        {agent && (
                          <Pill tone={a.undone ? "muted" : "brand"} className="max-w-full">
                            <span className="min-w-0 truncate">{agent}</span>
                          </Pill>
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-body font-medium ${
                            a.undone ? "text-ink-faint line-through" : "text-ink"
                          }`}
                        >
                          {a.title}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-ink-faint">
                          {agent && <span className="font-semibold text-brand sm:hidden">{agent}</span>}
                          <span className="sm:hidden">{ago(a.at)}</span>
                          {rule && <span className="truncate">{rule.label}</span>}
                          {a.undone && <span className="font-semibold text-danger">Undone</span>}
                        </div>

                        {/* Everything the old card said out loud: why, what
                            changed, which permission, and the way out. */}
                        <div className="mt-2">
                          <Detail summary="Why">
                            <p>{a.because}</p>
                            <p className="mt-2 rounded-control bg-rail px-3 py-2">
                              <span className="font-medium text-ink">What changed: </span>
                              {a.effect}
                            </p>
                            {rule && (
                              <p className="mt-2">
                                <span className="font-medium text-ink">Permission: </span>
                                {rule.label}. {LEVEL_WORD[rule.level]}
                              </p>
                            )}
                            {!a.undoable && (
                              <p className="mt-2">
                                {a.undoNote ??
                                  "Cannot be undone from here. Some of the held budget has already been deployed. Ask me in the conversation and I will lay out what reversing it would cost."}
                              </p>
                            )}
                            {rule && (
                              <button
                                onClick={() => go("autonomy")}
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                              >
                                Stop me doing this
                                <ArrowRight size={11} weight="bold" aria-hidden className="rtl:rotate-180" />
                              </button>
                            )}
                          </Detail>
                        </div>
                      </div>

                      <span className="hidden w-[72px] shrink-0 text-end text-[11px] tabular-nums text-ink-faint sm:block">
                        {ago(a.at)}
                      </span>

                      <div className="flex w-[88px] shrink-0 justify-end">
                        {a.undoable ? (
                          a.undone ? (
                            <button
                              onClick={() => redoActivity(a.id)}
                              className="inline-flex items-center gap-1 rounded-control border border-hairline bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand transition hover:bg-brand/[0.06]"
                            >
                              <ArrowClockwise size={11} weight="bold" aria-hidden />
                              Redo
                            </button>
                          ) : (
                            <button
                              onClick={() => undoActivity(a.id)}
                              className="inline-flex items-center gap-1 rounded-control border border-hairline bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft transition hover:bg-neutral-50"
                            >
                              <ArrowCounterClockwise size={11} weight="bold" aria-hidden />
                              Undo
                            </button>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 py-1.5 text-[11px] font-medium text-ink-faint">
                            <LockSimple size={11} weight="fill" aria-hidden />
                            Locked
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Surface>
      </Section>
    </div>
  );
}
