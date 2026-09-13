"use client";

/* The rule, enforced in a component.

   Nothing renders a figure directly. Everything goes through `<Figure>`
   or `<Claim>`, both of which take a `Sourced<T>` and refuse to render a
   value with no evidence behind it — in development they show a loud
   marker instead, so an unsourced number cannot quietly ship.

   The affordance is a dotted underline. Pressing it opens "why this
   number": the sentence, the arithmetic if there is any, and the pieces
   of evidence it rests on. */

import { useId, useState, type ReactNode } from "react";
import { CaretDown, Info } from "@phosphor-icons/react";
import type { Evidence, Sourced } from "../lib/agent/types";
import { useT } from "../lib/i18n";

const KIND_LABEL: Record<Evidence["kind"], string> = {
  page: "Read off the store",
  product: "From the catalogue",
  social: "Public profile",
  orders: "Your order data",
  platform: "HeyMoon records",
  benchmark: "Benchmark",
  creator: "Creator profile",
  policy: "How this works",
};

const KIND_TONE: Record<Evidence["kind"], string> = {
  page: "bg-brand/[0.07] text-brand",
  product: "bg-brand/[0.07] text-brand",
  social: "bg-blush/20 text-blush-deep",
  orders: "bg-good/[0.1] text-good-deep",
  platform: "bg-neutral-100 text-ink-soft",
  benchmark: "bg-neutral-100 text-ink-soft",
  creator: "bg-brand-100 text-brand",
  policy: "bg-neutral-100 text-ink-soft",
};

export function EvidenceRow({ e }: { e: Evidence }) {
  return (
    <li className="flex gap-2.5 py-2">
      <span className={`mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_TONE[e.kind]}`}>
        {KIND_LABEL[e.kind]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-meta font-semibold text-ink">{e.label}</span>
        <span className="mt-0.5 block text-meta leading-5 text-ink-soft">{e.detail}</span>
        {e.at && <span className="mt-0.5 block text-[10px] text-ink-faint">{e.at}</span>}
      </span>
    </li>
  );
}

/** The panel behind every figure. */
export function Why({ src, open, onClose }: { src: Sourced<unknown>; open: boolean; onClose: () => void }) {
  const { t } = useT();
  if (!open) return null;
  return (
    <div className="mt-2 rounded-control border border-brand/15 bg-brand/[0.03] p-3 text-start">
      <div className="flex items-start gap-2">
        <Info size={14} weight="fill" className="mt-0.5 shrink-0 text-brand" aria-hidden />
        <p className="flex-1 text-meta leading-5 text-ink-soft">{src.why}</p>
        <button onClick={onClose} className="shrink-0 rounded px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint hover:text-ink">
          {t("read.cancelEdit")}
        </button>
      </div>
      {src.computedFrom && (
        <p className="mt-2 rounded bg-white px-2 py-1.5 font-mono text-[11px] text-ink-soft">{src.computedFrom}</p>
      )}
      {src.evidence.length > 0 && (
        <ul className="mt-1 divide-y divide-hairline">
          {src.evidence.map((e) => <EvidenceRow key={e.id} e={e} />)}
        </ul>
      )}
      <p className="mt-2 text-[10px] uppercase tracking-wide text-ink-faint">
        {src.setBy === "brand" ? "Set by you" : "Proposed by HeyMoon"}
      </p>
    </div>
  );
}

/** A number, with the way back to where it came from. */
export function Figure({
  src, render, size = "md", className = "", label,
}: {
  src: Sourced<unknown> | undefined;
  render: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const { t } = useT();

  if (!src || src.evidence.length === 0) {
    /* The guard. A figure with nothing behind it is a bug, and it looks
       like one rather than looking like data. */
    return (
      <span className="rounded bg-danger/[0.12] px-1.5 py-0.5 text-meta font-semibold text-danger" title="No source. This must not ship.">
        unsourced
      </span>
    );
  }

  const s = {
    sm: "text-body font-semibold",
    md: "text-title font-semibold",
    lg: "text-figure font-bold",
    xl: "text-hero font-bold",
  }[size];

  return (
    <span className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={`sourced tabular-nums leading-none text-ink ${s} text-start`}
        title={t("why")}
      >
        {render}
      </button>
      {label && <span className="ms-1.5 text-meta text-ink-faint">{label}</span>}
      <span id={id}>
        <Why src={src} open={open} onClose={() => setOpen(false)} />
      </span>
    </span>
  );
}

/** A sentence the agent is asserting, with the same affordance. */
export function Claim({ src, children, className = "" }: { src: Sourced<unknown>; children?: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  /* A Sourced value that is not a string has to be given its own
     rendering. Falling through to String(value) prints "[object Object]",
     so the fallback is the sentence behind the value rather than the
     value itself. */
  const body =
    children ??
    (typeof src.value === "string" || typeof src.value === "number" ? String(src.value) : src.why);
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-start gap-1.5 text-start"
      >
        <span className="flex-1 text-body leading-6 text-ink-soft">{body}</span>
        <CaretDown
          size={12}
          className={`mt-1.5 shrink-0 text-ink-faint transition-transform group-hover:text-brand ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      <div id={id}>
        <Why src={src} open={open} onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}

/** Evidence as chips, for places too tight for the full panel. */
export function EvidenceChips({ evidence, max = 3 }: { evidence: Evidence[]; max?: number }) {
  const shown = evidence.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((e) => (
        <span key={e.id} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${KIND_TONE[e.kind]}`} title={e.detail}>
          {e.label}
        </span>
      ))}
      {evidence.length > max && (
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-faint">
          +{evidence.length - max}
        </span>
      )}
    </div>
  );
}
