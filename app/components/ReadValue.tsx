"use client";

/* How one layer of a read is drawn.

   Shared, because the read now happens in two places — as a card inside
   the conversation, and as a full page — and the two must never show the
   same finding differently. */

import type { ReactNode } from "react";
import type { BrandRead, ReadLayerKey, Sourced } from "../lib/agent/types";
import { fmtCount } from "../lib/mock/campaigns";

export const READ_ORDER: ReadLayerKey[] = [
  "category", "priceBand", "bestsellers", "voice", "socials", "markets", "seasonality",
];

export function srcFor(read: BrandRead, k: ReadLayerKey): Sourced<unknown> | undefined {
  return (read as unknown as Record<string, Sourced<unknown> | undefined>)[k];
}

/** The tree itself, as a plain function rather than a component.
 
    `TypeOn` writes a finding out one character at a time by walking the
    elements it is given, and an unrendered `<ReadValue />` is one opaque
    node with no text in it — the walk would find a single leaf and the
    whole finding would appear in one tick. Anything that needs to look
    INSIDE the value asks for this; anything that just wants to draw it
    uses the component below.
 
    Safe to call directly because there are no hooks in here and never
    can be: it is a switch over a value that has already been read. */
export function readValueTree(read: BrandRead, k: ReadLayerKey, compact = false): ReactNode {
  switch (k) {
    case "category":
      return <p className="text-body text-ink">{read.category!.value}</p>;

    case "priceBand": {
      const p = read.priceBand!.value;
      return (
        <p className="text-body text-ink">
          <span className="font-semibold tabular-nums">{p.low.toLocaleString()} to {p.high.toLocaleString()} {p.currency}</span>
          <span className="text-ink-soft">, median <span className="font-semibold tabular-nums text-ink">{p.median.toLocaleString()}</span></span>
        </p>
      );
    }

    case "bestsellers": {
      const items = compact ? read.bestsellers!.value.slice(0, 3) : read.bestsellers!.value;
      return (
        <ol className="space-y-2">
          {items.map((b, i) => (
            <li key={b.name} className="flex items-center gap-3">
              <span aria-hidden className="w-4 shrink-0 text-meta font-bold tabular-nums text-ink-faint">{i + 1}</span>
              {b.img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.img} alt="" className="h-9 w-9 shrink-0 rounded object-cover" loading="lazy" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium text-ink">{b.name}</span>
                <span className="block truncate text-meta text-ink-faint">{b.note}</span>
              </span>
              <span className="shrink-0 text-meta font-semibold tabular-nums text-ink">{b.price}</span>
            </li>
          ))}
        </ol>
      );
    }

    case "voice": {
      const v = read.voice!.value;
      return (
        <div>
          <div className="flex flex-wrap gap-1.5">
            {v.words.map((w) => (
              <span key={w} className="rounded-pill bg-brand/[0.07] px-2.5 py-0.5 text-meta font-medium text-brand">{w}</span>
            ))}
          </div>
          <p className="mt-2 text-body italic text-ink-soft">“{v.sample}”</p>
          {!compact && <p className="mt-1 text-meta text-ink-faint">{v.register}</p>}
        </div>
      );
    }

    case "socials":
      return (
        <ul className="space-y-1.5">
          {read.socials!.value.map((a) => (
            <li key={a.platform} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-body font-medium text-ink" dir="ltr">{a.handle}</span>
              <span className="text-meta text-ink-faint">{a.platform}</span>
              {a.followers > 0 && <span className="text-meta font-semibold tabular-nums text-ink-soft">{fmtCount(a.followers)}</span>}
              {!compact && <span className="w-full text-meta text-ink-faint">{a.note}</span>}
            </li>
          ))}
        </ul>
      );

    case "markets":
      return (
        <ul className="space-y-1.5">
          {read.markets!.value.map((m) => (
            <li key={m.code} className="flex items-center gap-3">
              <span className="w-7 shrink-0 rounded bg-neutral-100 px-1 py-0.5 text-center text-[10px] font-bold text-ink-soft">{m.code}</span>
              <span className="min-w-0 flex-1">
                <span className="text-body text-ink">{m.name}</span>
                {!compact && <span className="block text-meta text-ink-faint">{m.note}</span>}
              </span>
              <span className="shrink-0 text-meta font-semibold tabular-nums text-ink">{m.share}%</span>
            </li>
          ))}
        </ul>
      );

    case "seasonality":
      return (
        <ul className="space-y-1.5">
          {read.seasonality!.value.map((sn) => (
            <li key={sn.label} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-body font-medium text-ink">{sn.label}</span>
              <span className="text-meta text-ink-faint">{sn.window}</span>
              <span className="rounded bg-brand/[0.07] px-1.5 py-0.5 text-[10px] font-semibold text-brand">{sn.lift}</span>
              {!compact && <span className="w-full text-meta text-ink-faint">{sn.note}</span>}
            </li>
          ))}
        </ul>
      );

    default:
      return null;
  }
}

export function ReadValue({ read, k, compact = false }: { read: BrandRead; k: ReadLayerKey; compact?: boolean }) {
  return <>{readValueTree(read, k, compact)}</>;
}
