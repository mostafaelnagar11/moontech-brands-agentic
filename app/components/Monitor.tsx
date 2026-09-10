"use client";

/* The Agent Monitor.

   Four questions, always in the same order, always timestamped:
     what happened · what it means · what I did · what I need from you

   It sits at the top of the dashboard and the phase page. The shape is
   fixed so a brand learns where to look, and the last box is the only
   one that can ever ask for anything. */

import { ArrowRight, CheckCircle, Clock, Lightning } from "@phosphor-icons/react";
import { fmtUSD, pace, phaseTitle, type Phase } from "../lib/mock/campaigns";
import { useActivity, useAds } from "../lib/store";
import { useGo } from "../lib/surface";
import { Card, Eyebrow, Pill } from "./ui";
import { RevenueRuler } from "./Ruler";

const ago = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

function Block({ label, children, tone = "plain" }: { label: string; children: React.ReactNode; tone?: "plain" | "act" }) {
  return (
    <div className={`min-w-0 flex-1 border-hairline p-4 ${tone === "act" ? "bg-danger/[0.03]" : ""}`}>
      <Eyebrow tone={tone === "act" ? "danger" : "muted"}>{label}</Eyebrow>
      <div className="mt-2 text-body leading-6 text-ink-soft">{children}</div>
    </div>
  );
}

export function AgentMonitor({ phase, compact = false }: { phase: Phase; compact?: boolean }) {
  const go = useGo();
  const activity = useActivity();
  const ads = useAds().filter((a) => a.campaignId === phase.id);
  const waiting = ads.filter((a) => a.state === "waiting");
  const held = waiting.filter((a) => a.compliance.verdict === "hold");
  const p = pace(phase);
  const last = activity.filter((a) => !a.undone)[0];
  const crossed = p ? p.pctNow >= 80 : false;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-3">
        <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[12px] text-white">✦</span>
        <p className="text-body font-semibold text-ink">Agent monitor</p>
        <Pill tone={crossed ? "good" : "live"}>{crossed ? "Past the unlock line" : "Running"}</Pill>
        <span className="ms-auto text-[11px] text-ink-faint">
          {phaseTitle(phase.phaseNo)} · day {phase.dayOfPhase} of {phase.plannedDays} · checked {ago(Date.now() - 4 * 60_000)}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-hairline md:flex-row md:divide-x md:divide-y-0 rtl:md:divide-x-reverse">
        <Block label="What happened">
          {p ? (
            <>
              <span className="font-semibold text-ink">{fmtUSD(phase.rev)}</span> attributed so far, against a{" "}
              <span className="font-semibold text-ink">{fmtUSD(phase.revTarget ?? 0)}</span> target.{" "}
              {ads.filter((a) => a.state === "live").length} ads are live and {waiting.length} arrived for review.
            </>
          ) : (
            "This phase has not started."
          )}
        </Block>

        <Block label="What it means">
          {p ? (
            p.onPace ? (
              <>
                At {fmtUSD(Math.round(p.perDay))} a day this lands near{" "}
                <span className="font-semibold text-ink">{fmtUSD(Math.round(p.atEnd))}</span> —{" "}
                {Math.round(p.pctForecast)}% of target.{" "}
                {crossed ? `Phase ${phase.phaseNo + 1} is already unlocked.` : `The unlock line is ${p.daysToUnlock} days out.`}
              </>
            ) : (
              <>
                At the current rate this finishes near {fmtUSD(Math.round(p.atEnd))}, which is under the 80% line.
                Approving the {waiting.length} drafts waiting is the single biggest thing that changes it.
              </>
            )
          ) : "—"}
        </Block>

        <Block label="What I did">
          {last ? (
            <>
              <span className="font-semibold text-ink">{last.title}.</span> {last.because}{" "}
              <span className="text-ink-faint">{ago(last.at)}</span>{" "}
              <button onClick={() => go("activity")} className="font-semibold text-brand underline-offset-2 hover:underline">
                See all, and undo
              </button>
            </>
          ) : (
            "Nothing on my own since you last looked."
          )}
        </Block>

        <Block label="What I need from you" tone="act">
          {waiting.length === 0 ? (
            <span className="flex items-center gap-2 text-good-deep">
              <CheckCircle size={15} weight="fill" aria-hidden /> Nothing right now.
            </span>
          ) : (
            <>
              <p>
                {waiting.length} drafts, {held.length ? `${held.length} of which I would hold` : "all of which I would approve"}.
                Nothing publishes until you decide.
              </p>
              <button
                onClick={() => go("ads")}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-control bg-danger px-3 py-1.5 text-meta font-semibold text-white transition hover:bg-danger-deep"
              >
                Review them <ArrowRight size={12} weight="bold" aria-hidden />
              </button>
            </>
          )}
        </Block>
      </div>

      {!compact && p && (
        <div className="border-t border-hairline px-4 py-4">
          <PaceForecast phase={phase} />
        </div>
      )}
    </Card>
  );
}

/** Pace against the 80% line, as one bar and one sentence. */
export function PaceForecast({ phase }: { phase: Phase }) {
  const p = pace(phase);
  if (!p || !phase.revTarget) return null;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-meta font-medium text-ink-faint">Pace against the 80% unlock line</p>
        <p className="text-meta tabular-nums text-ink-faint">
          <span className="font-semibold text-ink">{Math.round(p.pctNow)}%</span> now ·{" "}
          <span className="font-semibold text-ink">{Math.round(p.pctForecast)}%</span> forecast
        </p>
      </div>
      <RevenueRuler className="mt-2.5" pct={p.pctNow} forecastPct={p.pctForecast} srLabel={`${phaseTitle(phase.phaseNo)}.`} />
      <p className="mt-2 flex items-start gap-1.5 text-meta leading-5 text-ink-soft">
        {p.onPace ? (
          <Lightning size={12} weight="fill" className="mt-1 shrink-0 text-brand" aria-hidden />
        ) : (
          <Clock size={12} weight="fill" className="mt-1 shrink-0 text-danger" aria-hidden />
        )}
        <span>
          {fmtUSD(Math.round(p.perDay))} a day over {phase.dayOfPhase} days, carried out to the {phase.plannedDays}-day window.
          {p.daysToUnlock === 0
            ? " The line is already crossed."
            : ` At this rate the 80% line is ${p.daysToUnlock} days away, with ${p.daysLeft} left in the window.`}
        </span>
      </p>
    </div>
  );
}
