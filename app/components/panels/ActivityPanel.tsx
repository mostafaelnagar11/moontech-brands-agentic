"use client";

/* Everything the agents did on their own.

   Four things make this a log rather than a feed: every entry names the
   agent that did it, every entry names the rule that permitted it, every
   entry says why in a sentence a person would actually write, and every
   entry that can be reversed has an undo next to it.

   An entry that cannot be undone says so, and says what it would take. */

import { ArrowCounterClockwise, ArrowRight, LockSimple, Sliders } from "@phosphor-icons/react";
import { Card, Pill, Btn } from "../ui";
import { openPanel, redoActivity, undoActivity, useActivity, useAutonomy, type ActivityEntry } from "../../lib/store";

/** Which of the seven agents did it. The field is being added to the
    log entries themselves; until every entry carries one, an entry
    without it still renders — a missing attribution is a gap in the
    data, not a reason to drop the row. */
const agentOf = (a: ActivityEntry): string | null => {
  const v = (a as ActivityEntry & { agent?: unknown }).agent;
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

const ago = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 60) return `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hours ago`;
  return `${Math.round(h / 24)} days ago`;
};

export function ActivityPanel() {
  const activity = useActivity();
  const autonomy = useAutonomy();
  const ruleOf = (k: string) => autonomy.find((r) => r.key === k);

  return (
    <>
      <p className="text-body leading-6 text-ink-soft">
        Everything the agents did without asking. Each entry names which agent did it and the permission it
        used, and each one that can be reversed has an undo.
      </p>
      <button
        onClick={() => openPanel("autonomy")}
        className="mt-3 inline-flex items-center gap-1.5 rounded-control border border-hairline bg-white px-3 py-2 text-meta font-semibold text-ink-soft transition hover:bg-neutral-50"
      >
        <Sliders size={13} weight="bold" aria-hidden /> Change what I may do
      </button>

      <Card className="mt-4 flex items-start gap-3 border-brand/20 bg-brand/[0.04] p-4">
        <LockSimple size={15} weight="fill" className="mt-0.5 shrink-0 text-brand" aria-hidden />
        <p className="text-body leading-6 text-ink-soft">
          Nothing in this log moved money or published anything. Those two are the fixed limits: they are not
          settings, and there is no level of trust that turns them on.
        </p>
      </Card>

      <ol className="mt-4 space-y-3">
        {activity.map((a) => {
          const rule = ruleOf(a.ruleKey);
          const agent = agentOf(a);
          return (
            <li key={a.id}>
              <Card className={`p-4 ${a.undone ? "opacity-60" : ""}`}>
                <p className={`text-body font-semibold text-ink ${a.undone ? "line-through" : ""}`}>{a.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {agent && <Pill tone="brand">{agent}</Pill>}
                  {rule && <Pill tone="muted">{rule.label}</Pill>}
                  {a.undone && <Pill tone="danger">Undone</Pill>}
                  <span className="text-[11px] text-ink-faint">{ago(a.at)}</span>
                </div>

                <p className="mt-2 text-body leading-6 text-ink-soft">
                  <span className="font-medium text-ink">Why: </span>{a.because}
                </p>
                <p className="mt-1.5 rounded-control bg-rail px-3 py-2 text-meta leading-5 text-ink-soft">
                  <span className="font-medium text-ink">What changed: </span>{a.effect}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {a.undoable ? (
                    a.undone ? (
                      <Btn variant="quiet" size="sm" onClick={() => redoActivity(a.id)}>Put it back</Btn>
                    ) : (
                      <Btn variant="quiet" size="sm" onClick={() => undoActivity(a.id)}>
                        <ArrowCounterClockwise size={12} weight="bold" aria-hidden /> Undo this
                      </Btn>
                    )
                  ) : (
                    <p className="text-meta leading-5 text-ink-faint">
                      Cannot be undone from here — some of the held budget has already been deployed. Ask me in
                      the conversation and I will lay out what reversing it would cost.
                    </p>
                  )}
                  {rule && (
                    <button
                      onClick={() => openPanel("autonomy")}
                      className="inline-flex items-center gap-1 text-meta font-medium text-brand hover:underline"
                    >
                      Stop me doing this <ArrowRight size={11} weight="bold" aria-hidden className="rtl:rotate-180" />
                    </button>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      {activity.length === 0 && (
        <Card className="mt-4 p-8 text-center">
          <p className="text-body text-ink-soft">Nothing yet. Anything I do on my own shows up here first.</p>
        </Card>
      )}
    </>
  );
}
