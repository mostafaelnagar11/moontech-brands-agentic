"use client";

/* Who the agents are, and what each may do alone.

   The panel opens with the pipeline, because "the agent" is not a thing
   the product has: several agents run in order, each with one job, and
   a brand cannot reason about the permissions below until it knows
   which named agent each permission belongs to. Two of them can never
   finish their job alone, and they are marked in the list rather than
   only in the rules underneath.

   This is the one screen that shows the whole pipeline, and it shows it
   because the permissions ARE the content here. Nowhere else does the
   product count its agents at a brand: the conversation names only the
   ones working on that brand's store, because the size of the team
   behind them is our business and not an answer to anything they
   asked.

   Then the three levels, and the first group is not a preference.
   Moving money, publishing and signing are fixed at Never and shown
   locked — a setting that could turn them on would make the product's
   main promise negotiable.

   Everything else is the brand's call, and each row says plainly what
   the choice costs: what you get by letting it act, and what you risk.

   In the panel the three-way control sits UNDER the row it belongs to
   rather than beside it. At this width a label and a segmented control
   on one line leaves the control about ninety pixels, which is how you
   get a settings row nobody can read or hit. */

import { ArrowsClockwise, Info, LockSimple } from "@phosphor-icons/react";
import { Card, Eyebrow, Pill } from "../ui";
import { countWord } from "../blocks";
import { openPanel, setAutonomy, useActivity, useAutonomy, type AutonomyLevel } from "../../lib/store";

const LEVELS: { key: AutonomyLevel; label: string; hint: string }[] = [
  { key: "alone", label: "On its own", hint: "Does it, tells you after, undoable" },
  { key: "ask", label: "Asks first", hint: "Waits in your inbox" },
  { key: "never", label: "Never", hint: "Not offered at all" },
];

/* The seven agents MoonTech actually runs, in the order they run in.
   `job` is the one line the agent could say about itself; `needsYou` is
   filled in only for the two that cannot finish alone — MoonLive AI,
   because it publishes, and MoonScore AI, because the next phase costs
   money. Everything here matches the rules below rather than restating
   them: MoonScore may move spend inside a phase you have paid for, and
   may not start the phase after it. */
const PIPELINE: { agent: string; stage: string; job: string; needsYou?: string }[] = [
  { agent: "MoonShot AI", stage: "Intake",
    job: "Reads the brief — or your store, when the store is the brief — and sets what the campaign is for." },
  { agent: "MoonMatch AI", stage: "Matching",
    job: "Finds the creators whose audience is your audience, in the markets you already ship to." },
  { agent: "MoonSearch AI", stage: "Safety",
    job: "Vets every match for brand risk and for fraud, and drops anyone publishing for a competitor." },
  { agent: "MoonWriter AI", stage: "Creative",
    job: "Writes the brief and the ad copy, in the register your own product pages already use." },
  { agent: "MoonLive AI", stage: "Activation",
    job: "Launches the campaign across the channels the creators post on.",
    needsYou: "An ad goes live only after you have approved that exact draft. There is no setting that changes this." },
  { agent: "MoonScore AI", stage: "Optimization",
    job: "Moves budget towards whatever is converting, inside a phase you have already paid for.",
    needsYou: "Starting a phase — any new money at all — is yours to confirm, every time." },
  { agent: "MoonLearning AI", stage: "Learning",
    job: "Takes what each campaign returned and feeds it back into the agents that decide the next one." },
];

/* Counted from the list rather than typed, so marking a third agent
   "always yours" moves the sentence with it. */
const LOCKED_COUNT = PIPELINE.filter((p) => p.needsYou).length;

export function AutonomyPanel() {
  const rules = useAutonomy();
  const activity = useActivity();
  const locked = rules.filter((r) => r.locked);
  const open = rules.filter((r) => !r.locked);
  const usedThisWeek = (k: string) => activity.filter((a) => a.ruleKey === k && !a.undone).length;

  return (
    <>
      {/* ── The pipeline ─────────────────────────────────────────
          One row per agent, name and stage on the first line and the
          job on the second. Three columns would be three unreadable
          columns at 440px, so nothing here goes sideways. */}
      <section aria-label="The agents">
        <Eyebrow>The agents, in the order they run</Eyebrow>
        <p className="mt-1.5 text-body leading-6 text-ink-soft">
          MoonTech is not one agent. They run as a pipeline, each with a single job, and {countWord(LOCKED_COUNT)} of them
          can never finish that job without you.
        </p>
        <Card className="mt-2.5 overflow-hidden">
          <ol className="divide-y divide-hairline">
            {PIPELINE.map((p, i) => (
              <li key={p.agent} className="flex gap-3 p-3.5">
                <span aria-hidden className="mt-0.5 w-3 shrink-0 text-[11px] font-semibold tabular-nums text-ink-faint">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-body font-semibold text-ink">{p.agent}</p>
                    <span className="rounded-pill border border-hairline bg-neutral-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                      {p.stage}
                    </span>
                    {p.needsYou && (
                      <span className="ms-auto inline-flex shrink-0 items-center gap-1 rounded-pill border border-danger/25 bg-danger/[0.07] px-2 py-0.5 text-[10px] font-semibold text-danger">
                        <LockSimple size={10} weight="fill" aria-hidden /> Always yours
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-meta leading-5 text-ink-soft">{p.job}</p>
                  {p.needsYou && <p className="mt-1 text-[11px] leading-4 text-danger">{p.needsYou}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <p className="mt-2.5 flex items-start gap-2 text-meta leading-5 text-ink-soft">
          <ArrowsClockwise size={13} weight="bold" className="mt-0.5 shrink-0 text-brand" aria-hidden />
          <span>
            <span className="font-semibold text-ink">The continuous learning loop.</span> MoonLearning AI feeds
            every campaign&rsquo;s results back into MoonMatch AI, MoonWriter AI and MoonScore AI, so each new
            campaign starts smarter than the last.
          </span>
        </p>
      </section>

      <p className="mt-6 border-t border-hairline pt-5 text-body leading-6 text-ink-soft">
        What I may do without asking, what I bring to you first, and what I never do. Changing a row takes
        effect immediately and applies to the phase that is running now.
      </p>

      {/* The fixed limits */}
      <section className="mt-5" aria-label="Fixed limits">
        <Eyebrow tone="danger">Never, and not adjustable</Eyebrow>
        <Card className="mt-2.5 divide-y divide-hairline">
          {locked.map((r) => (
            <div key={r.key} className="flex items-start gap-3 p-4">
              <LockSimple size={15} weight="fill" className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-body font-semibold text-ink">{r.label}</p>
                  <Pill tone="muted">Fixed</Pill>
                </div>
                <p className="mt-0.5 text-meta leading-5 text-ink-soft">{r.detail}</p>
              </div>
            </div>
          ))}
        </Card>
        <p className="mt-2 flex items-start gap-2 text-meta leading-5 text-ink-faint">
          <Info size={13} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          These are not settings. Money moves only when you confirm a funding block, and an ad publishes only
          when you approve it — there is no level of trust that changes either.
        </p>
      </section>

      {/* The adjustable ones */}
      <section className="mt-6" aria-label="Your choices">
        <Eyebrow>Your call</Eyebrow>
        <div className="mt-2.5 space-y-3">
          {open.map((r) => {
            const used = usedThisWeek(r.key);
            return (
              <Card key={r.key} className="p-4">
                <p className="text-body font-semibold text-ink">{r.label}</p>
                <p className="mt-1 text-meta leading-5 text-ink-soft">{r.detail}</p>
                {used > 0 && (
                  <button
                    onClick={() => openPanel("activity")}
                    className="mt-1.5 rounded bg-brand/[0.07] px-1.5 py-0.5 text-[11px] font-semibold text-brand hover:underline"
                  >
                    Used {used}× this week — see what I did
                  </button>
                )}

                <div
                  role="radiogroup"
                  aria-label={r.label}
                  className="mt-3 grid grid-cols-3 gap-1 rounded-control bg-black/[0.04] p-1"
                >
                  {LEVELS.map((l) => (
                    <button
                      key={l.key}
                      role="radio"
                      aria-checked={r.level === l.key}
                      title={l.hint}
                      onClick={() => setAutonomy(r.key, l.key)}
                      className={`rounded-[9px] px-2 py-1.5 text-meta font-semibold transition ${
                        r.level === l.key
                          ? l.key === "never" ? "bg-white text-danger shadow-card"
                            : l.key === "ask" ? "bg-white text-ink shadow-card"
                            : "bg-brand text-white shadow-card"
                          : "text-ink-faint hover:text-ink"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                <p className="mt-2.5 border-t border-hairline pt-2.5 text-[11px] leading-4 text-ink-faint">
                  {r.level === "alone" && "I do this and tell you afterwards, in the activity log, with an undo."}
                  {r.level === "ask" && "I put this in your inbox and wait. Nothing happens until you say so."}
                  {r.level === "never" && "I will not raise this at all, even when it would help."}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="mt-6 p-4">
        <p className="text-body font-semibold text-ink">Everything I have done on my own</p>
        <p className="mt-0.5 text-meta text-ink-faint">With the reason, and an undo where one is possible.</p>
        <button
          onClick={() => openPanel("activity")}
          className="mt-3 inline-flex items-center gap-1.5 rounded-control border border-hairline bg-white px-3 py-2 text-meta font-semibold text-ink-soft transition hover:bg-neutral-50"
        >
          Open the activity log
        </button>
      </Card>
    </>
  );
}
