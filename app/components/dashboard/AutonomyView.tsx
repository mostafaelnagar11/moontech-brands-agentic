"use client";

/* Who the agents are, and what each may do alone, as a settings page
 * rather than as an explanation.
 *
 * What this replaces: a pipeline where every agent carried a full
 * sentence of job description, an intro paragraph counting the agents
 * that need you, a paragraph on the learning loop, and eleven rules
 * each rendered as its own card with a paragraph of detail above a
 * control. Eleven cards is not a settings screen, it is an essay with
 * switches in it, and the one thing a brand comes here to check —
 * what can this thing do without me right now — was a count you had
 * to make yourself by reading every card.
 *
 * So: the distribution is four figures at the top, the pipeline is one
 * line per agent, and the rules are a table with the control in a
 * column. The reasoning behind each rule is not deleted, it moves
 * behind "Why", because a settings table is scanned and a rule is only
 * read on the day you disagree with it.
 *
 * The locked group stays first, and stays visibly a lock rather than a
 * control someone could mistake for off-by-default: money, publishing
 * and signing are the product's promise, not a preference, so their
 * segment is rendered as text, not as buttons.
 */

import { ArrowRight, LockSimple } from "@phosphor-icons/react";
import {
  setAutonomy,
  useActivity,
  useAutonomy,
  type AutonomyLevel,
  type AutonomyRule,
} from "../../lib/store";
import { useGo } from "../../lib/surface";
import { Detail, Section, Surface, Tile } from "./kit";

/* Least trust first, so the control reads as a dial rather than as
   three unrelated options. The hint is what the old card said in a
   line under the control; at table width it is a title instead. */
const LEVELS: { key: AutonomyLevel; label: string; hint: string }[] = [
  { key: "never", label: "Never", hint: "Not offered at all" },
  { key: "ask", label: "Ask", hint: "Waits in your inbox" },
  { key: "alone", label: "Auto", hint: "Does it, tells you after, undoable" },
];

/** What each level actually means once it is set, kept for the "Why"
    disclosure rather than printed under every row. */
const CONSEQUENCE: Record<AutonomyLevel, string> = {
  alone: "I do this and tell you afterwards, in the activity log, with an undo.",
  ask: "I put this in your inbox and wait. Nothing happens until you say so.",
  never: "I will not raise this at all, even when it would help.",
};

/* The seven agents HeyMoon runs, in the order they run in. `job` is one
   line rather than one sentence: a dashboard row is read at a glance or
   not at all. `needsYou` is filled in only for the two that cannot
   finish alone, MoonLive AI because it publishes and MoonScore AI
   because the next phase costs money. Both match the locked rules below
   rather than restating them. */
const PIPELINE: { agent: string; stage: string; job: string; needsYou?: string }[] = [
  { agent: "MoonShot AI", stage: "Intake", job: "Sets what the campaign is for." },
  { agent: "MoonMatch AI", stage: "Matching", job: "Finds creators whose audience is yours." },
  { agent: "MoonSearch AI", stage: "Safety", job: "Vets every match for brand risk and fraud." },
  { agent: "MoonWriter AI", stage: "Creative", job: "Writes the brief and the ad copy." },
  {
    agent: "MoonLive AI", stage: "Activation",
    job: "Launches across the channels creators post on.",
    needsYou: "Publishes only a draft you approved. No setting changes this.",
  },
  {
    agent: "MoonScore AI", stage: "Optimization",
    job: "Moves budget to whatever is converting.",
    needsYou: "Starting a phase, and any new money with it, is yours to confirm.",
  },
  { agent: "MoonLearning AI", stage: "Learning", job: "Feeds results back into the next campaign." },
];

/* Counted from the list rather than typed, so marking a third agent
   "always yours" moves the chip with it. */
const LOCKED_AGENTS = PIPELINE.filter((p) => p.needsYou).length;

export function AutonomyView() {
  const go = useGo();
  const rules = useAutonomy();
  const activity = useActivity();

  const locked = rules.filter((r) => r.locked);
  const open = rules.filter((r) => !r.locked);
  const at = (level: AutonomyLevel) => open.filter((r) => r.level === level).length;
  const usedThisWeek = (key: string) => activity.filter((a) => a.ruleKey === key && !a.undone).length;
  const actedThisWeek = activity.filter((a) => !a.undone).length;

  return (
    <div className="space-y-6">
      {/* The distribution, ranked. The hero is the question the page is
          for: how much is running without me. */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile
          tone="hero"
          label="On its own"
          value={at("alone")}
          sub={`of ${open.length} rules you set`}
        />
        <Tile label="Asks you first" value={at("ask")} sub="waits in your inbox" />
        <Tile
          tone="good"
          label="Locked at Never"
          value={locked.length}
          sub="money · publishing · signing"
        />
        <Tile
          label="Acted on its own"
          value={actedThisWeek}
          sub="this week, each undoable"
        />
      </div>

      {/* ── The pipeline ─────────────────────────────────────────────
          One line per agent at dashboard width: name, stage, job, and
          the lock on the two that cannot finish alone. Below sm the job
          wraps under the name rather than being squeezed. */}
      <Section
        title="The agents, in the order they run"
        aside={
          <span className="inline-flex items-center gap-1 rounded-pill border border-danger/25 bg-danger/[0.07] px-2.5 py-1 text-[11px] font-semibold text-danger">
            <LockSimple size={11} weight="fill" aria-hidden />
            {LOCKED_AGENTS} can never finish alone
          </span>
        }
      >
        <Surface>
          <ol className="divide-y divide-hairline">
            {PIPELINE.map((p, i) => (
              <li key={p.agent} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <span
                  aria-hidden
                  className="w-3 shrink-0 text-[11px] font-semibold tabular-nums text-ink-faint"
                >
                  {i + 1}
                </span>
                <span className="shrink-0 text-body font-medium text-ink sm:w-[128px]">{p.agent}</span>
                <span className="shrink-0 rounded-pill border border-hairline bg-canvas px-1.5 py-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint sm:w-[104px]">
                  {p.stage}
                </span>
                <span className="min-w-0 flex-1 basis-full text-meta text-ink-soft sm:basis-0 sm:truncate">
                  {p.job}
                </span>
                {p.needsYou && (
                  <span
                    title={p.needsYou}
                    className="inline-flex shrink-0 items-center gap-1 rounded-pill border border-danger/25 bg-danger/[0.07] px-2 py-0.5 text-[10px] font-semibold text-danger"
                  >
                    <LockSimple size={10} weight="fill" aria-hidden /> Always yours
                  </span>
                )}
              </li>
            ))}
          </ol>
          <div className="border-t border-hairline px-4 py-2.5">
            <Detail summary="What the two locks mean, and how the loop closes">
              <ul className="space-y-1">
                {PIPELINE.filter((p) => p.needsYou).map((p) => (
                  <li key={p.agent}>
                    <span className="font-semibold text-ink">{p.agent}.</span> {p.needsYou}
                  </li>
                ))}
                <li>
                  <span className="font-semibold text-ink">MoonLearning AI.</span> Feeds every campaign
                  result back into MoonMatch AI, MoonWriter AI and MoonScore AI, so each new campaign
                  starts better informed than the last.
                </li>
              </ul>
            </Detail>
          </div>
        </Surface>
      </Section>

      {/* ── The fixed limits, first, and not a control ───────────────
          A brand who scrolls past this should still be unable to read
          the segment as something they left switched off. */}
      <Section
        title="Fixed at Never. These are not preferences."
        aside={
          <span className="text-[11px] text-ink-faint">No level of trust changes them</span>
        }
      >
        <Surface>
          <ul className="divide-y divide-hairline">
            {locked.map((r) => (
              <li key={r.key}>
                <RuleRow rule={r} />
              </li>
            ))}
          </ul>
        </Surface>
      </Section>

      {/* ── The adjustable ones ─────────────────────────────────────── */}
      <Section
        title="Your call"
        aside={
          <button
            onClick={() => go("activity")}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
          >
            Everything I did on my own
            <ArrowRight size={11} weight="bold" aria-hidden className="rtl:rotate-180" />
          </button>
        }
      >
        <Surface>
          <ul className="divide-y divide-hairline">
            {open.map((r) => (
              <li key={r.key}>
                <RuleRow
                  rule={r}
                  used={usedThisWeek(r.key)}
                  onUsed={() => go("activity")}
                />
              </li>
            ))}
          </ul>
          <p className="border-t border-hairline px-4 py-2.5 text-[11px] text-ink-faint">
            A change takes effect immediately, on the phase running now.
          </p>
        </Surface>
      </Section>
    </div>
  );
}

/** One rule: what it is, what it costs, and the dial. The label and the
    control are one line at dashboard width and two on a phone, which is
    the whole reason this stopped being a card. */
function RuleRow({
  rule, used = 0, onUsed,
}: {
  rule: AutonomyRule;
  used?: number;
  onUsed?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      {rule.locked && (
        <LockSimple size={14} weight="fill" className="shrink-0 text-ink-faint" aria-hidden />
      )}
      <div className="min-w-[11rem] flex-1">
        {/* The count sits on the label line, not under the disclosure:
            opened, the disclosure would otherwise push it a paragraph
            away from the rule it is counting. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-body font-medium text-ink">{rule.label}</p>
          {used > 0 && onUsed && (
            <button
              onClick={onUsed}
              className="rounded-pill bg-brand/[0.07] px-2 py-0.5 text-[11px] font-semibold text-brand hover:underline"
            >
              Used {used}x this week
            </button>
          )}
        </div>
        <div className="mt-0.5">
          <Detail summary="Why">
            {rule.detail}
            <span className="mt-1 block text-ink-faint">{CONSEQUENCE[rule.level]}</span>
          </Detail>
        </div>
      </div>
      <Segmented rule={rule} />
    </div>
  );
}

/** The three-way dial. Locked rules render the same shape in text
    rather than in buttons: nothing to press, nothing to mistake for a
    switch someone left off. */
function Segmented({ rule }: { rule: AutonomyRule }) {
  const shell = "grid w-full shrink-0 grid-cols-3 gap-1 rounded-control border border-hairline bg-canvas p-1 sm:w-[228px]";
  const seat = "rounded-[9px] px-2 py-1.5 text-center text-meta font-semibold transition";

  if (rule.locked) {
    return (
      <div className={shell} aria-label={`${rule.label}: Never, locked`} role="group">
        {LEVELS.map((l) => (
          <span
            key={l.key}
            aria-hidden={rule.level !== l.key}
            className={`${seat} ${
              rule.level === l.key
                ? "inline-flex items-center justify-center gap-1 bg-white text-danger shadow-card"
                : "text-ink-faint/50"
            }`}
          >
            {rule.level === l.key && <LockSimple size={11} weight="fill" aria-hidden />}
            {l.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label={rule.label} className={shell}>
      {LEVELS.map((l) => (
        <button
          key={l.key}
          role="radio"
          aria-checked={rule.level === l.key}
          /* The visible word first, so the accessible name starts with
             what is written on the control; the hint is what the old
             card printed under it. */
          aria-label={`${l.label}: ${l.hint}`}
          title={l.hint}
          onClick={() => setAutonomy(rule.key, l.key)}
          className={`${seat} ${
            rule.level === l.key
              ? l.key === "never"
                ? "bg-white text-danger shadow-card"
                : l.key === "ask"
                  ? "bg-white text-ink shadow-card"
                  : "bg-brand text-white shadow-card"
              : "text-ink-faint hover:text-ink"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
