"use client";

/* The dashboard's own vocabulary.
 *
 * The five views were written as PANEL content — a narrow column where
 * prose is the right answer, because a panel is read once and closed.
 * Dropped into a wide dashboard they became four paragraphs of the same
 * weight, with the only numbers that matter buried mid-sentence. A
 * dashboard is not read, it is scanned: you arrive knowing the question
 * and you leave as soon as you have the number.
 *
 * So the pieces here are all about rank. A tile states one figure and
 * nothing else. A section says what it is in two words. A row of facts
 * is a row, not a sentence. Anything that still needs a paragraph is
 * either an explanation nobody asked for, or it belongs in the
 * assistant beside it, where asking is the point.
 */

import type { ReactNode } from "react";
import { ArrowRight, CaretDown } from "@phosphor-icons/react";
import { useState } from "react";

/* ── One figure ──────────────────────────────────────────────────── */

export function Tile({
  label, value, sub, tone = "plain", foot,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** `hero` is the one number the page is about. `alert` needs you. */
  tone?: "plain" | "hero" | "alert" | "good";
  foot?: ReactNode;
}) {
  const skin =
    tone === "hero" ? "bg-brand text-white border-brand"
    : tone === "alert" ? "bg-white border-danger/25"
    : "bg-white border-hairline";
  const labelInk = tone === "hero" ? "text-white/70" : "text-ink-faint";
  const valueInk = tone === "hero" ? "text-white" : tone === "alert" ? "text-danger" : "text-ink";
  const subInk = tone === "hero" ? "text-white/75" : tone === "good" ? "text-good-deep" : "text-ink-faint";

  return (
    <div className={`min-w-0 rounded-card border p-4 shadow-card ${skin}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.09em] ${labelInk}`}>{label}</p>
      <p className={`mt-1.5 truncate text-figure font-semibold tabular-nums ${valueInk}`}>{value}</p>
      {sub && <p className={`mt-0.5 truncate text-[11px] ${subInk}`}>{sub}</p>}
      {foot && <div className="mt-2.5">{foot}</div>}
    </div>
  );
}

/* ── A section of the page ───────────────────────────────────────── */

export function Section({
  title, aside, children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-center gap-3">
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
        {aside && <div className="ms-auto shrink-0">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

/* ── A surface to put rows on ────────────────────────────────────── */

export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-card border border-hairline bg-white shadow-card ${className}`}>
      {children}
    </div>
  );
}

/** A scannable row. Label on the left, value on the right, optional
    action. Replaces "X is Y, which means Z" wherever Z is obvious. */
export function DataRow({
  label, value, tone = "plain", onClick, action,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "plain" | "alert";
  onClick?: () => void;
  action?: string;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1 truncate text-body text-ink-soft">{label}</span>
      <span className={`shrink-0 text-body font-semibold tabular-nums ${tone === "alert" ? "text-danger" : "text-ink"}`}>
        {value}
      </span>
      {action && (
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand">
          {action} <ArrowRight size={11} weight="bold" aria-hidden className="rtl:rotate-180" />
        </span>
      )}
    </>
  );
  if (!onClick) return <div className="flex items-center gap-3 px-4 py-3">{body}</div>;
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-brand/[0.03]">
      {body}
    </button>
  );
}

/** The one thing the page wants you to do, if there is one. */
export function ActionBar({
  count, text, cta, onCta,
}: {
  count: number;
  text: string;
  cta: string;
  onCta: () => void;
}) {
  if (!count) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-danger/25 bg-danger/[0.04] px-4 py-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-danger text-[11px] font-bold text-white">
        {count}
      </span>
      <span className="min-w-0 flex-1 text-body text-ink">{text}</span>
      <button
        onClick={onCta}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-control bg-danger px-3 py-1.5 text-meta font-semibold text-white transition hover:bg-danger-deep"
      >
        {cta} <ArrowRight size={12} weight="bold" aria-hidden className="rtl:rotate-180" />
      </button>
    </div>
  );
}

/** Prose the dashboard does not want, kept for the brand who does.
    Collapsed by default, because the page is scanned before it is read. */
export function Detail({ summary, children }: { summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand hover:underline"
      >
        {summary}
        <CaretDown size={10} weight="bold" aria-hidden className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-2 text-meta leading-5 text-ink-soft">{children}</div>}
    </div>
  );
}
