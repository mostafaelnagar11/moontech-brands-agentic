"use client";

/* A finding, written rather than pasted.
 *
 * The read card fills in while the agents work, and a value that snaps
 * in complete looks like it was already known. Writing it out says the
 * opposite: this was just found, by the agent named on the row above.
 * It is the same argument as `Typed` in Stream.tsx, one level down —
 * that one writes the agent's prose, this one writes its findings.
 *
 * What is different here is the shape of the thing being written. A
 * message is a string. A finding is markup: a price band with two bold
 * numbers inside a sentence, a row of voice chips, five markets with
 * their shares. So this does not type text, it spends a CHARACTER
 * BUDGET across an element tree in reading order, cloning as it goes.
 * Bold stays bold, chips stay chips, and the writing runs through them
 * in the order a person would read them.
 *
 * An element the budget has not reached is dropped rather than left
 * empty, so a list writes itself one row at a time instead of appearing
 * as a stack of blank lines that fill in.
 *
 * It must be handed a RENDERED tree. An unrendered component element
 * (`<ReadValue />`) has no children on it, so the walk finds one opaque
 * leaf, the budget is 1, and the whole finding lands in a single tick
 * with no writing visible at all. That is why `ReadValue` also exports
 * `readValueTree`.
 *
 * It writes ONCE per finding. The card unmounts when the read finishes
 * and the full version takes its place, so "have I written this already"
 * cannot live in component state — it lives in the module, keyed by the
 * read and the layer.
 */

import {
  Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";

/* One tick is a frame a person can see; below about 25ms the writing
   stops reading as writing and starts reading as a fade. The cap is
   what keeps a five-market list from taking five times as long as a
   one-line category: past it, more characters land per tick rather
   than the row taking longer. */
const TICK_MS = 30;
const MIN_PER_TICK = 2;
const LONGEST_MS = 1100;

/** What a leaf with no text of its own costs. Without it, a childless
    element (an image, a rule) could never be reached by the budget and
    would simply never appear. */
const LEAF_COST = 1;

function textLength(node: ReactNode): number {
  if (node === null || node === undefined || typeof node === "boolean") return 0;
  if (typeof node === "string" || typeof node === "number") return String(node).length;
  if (Array.isArray(node)) return node.reduce<number>((n, c) => n + textLength(c), 0);
  if (isValidElement(node)) {
    const inner = textLength((node.props as { children?: ReactNode }).children);
    return inner > 0 ? inner : LEAF_COST;
  }
  return 0;
}

/** Spends `budget` across the tree in reading order. Mutating a shared
    object rather than threading a return value is deliberate: the walk
    has to be strictly left to right, and a counter that every branch
    can see is the honest way to say so. */
function spend(node: ReactNode, budget: { left: number }): ReactNode {
  if (node === null || node === undefined || typeof node === "boolean") return node;

  if (typeof node === "string" || typeof node === "number") {
    const s = String(node);
    if (budget.left <= 0) return "";
    const take = Math.min(s.length, budget.left);
    budget.left -= take;
    return s.slice(0, take);
  }

  /* `Children.map` rather than a plain `.map`, because it is the thing
     that keeps React's keys correct through a clone. */
  if (Array.isArray(node)) return Children.map(node, (c) => spend(c, budget));

  if (isValidElement(node)) {
    if (budget.left <= 0) return null;
    const kids = (node.props as { children?: ReactNode }).children;
    if (textLength(kids) === 0) {
      budget.left -= LEAF_COST;
      return node;
    }
    return cloneElement(node, undefined, spend(kids, budget));
  }

  return node;
}

/** Findings already written, so re-mounting the card does not set the
    whole read retyping. Keyed by read and layer, never by text: a
    corrected value is the same finding, and should not write itself
    out a second time. */
const written = new Set<string>();

export function TypeOn({
  children, id, className = "",
}: {
  children: ReactNode;
  /** Stable per finding, e.g. `${read.id}:priceBand`. */
  id: string;
  className?: string;
}) {
  const total = useMemo(() => textLength(children), [children]);
  const done = written.has(id);
  const [n, setN] = useState(done ? total : 0);
  const idRef = useRef(id);

  useEffect(() => {
    if (written.has(id)) { setN(total); return; }

    /* Somebody who has asked the system to stop moving things is not
       asking to watch text appear either. */
    const still =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (still || total === 0) { written.add(id); setN(total); return; }

    const mostTicks = Math.floor(LONGEST_MS / TICK_MS);
    const ticks = Math.min(Math.ceil(total / MIN_PER_TICK), mostTicks);
    const per = Math.max(MIN_PER_TICK, Math.ceil(total / ticks));

    setN(0);
    idRef.current = id;
    const t = setInterval(() => {
      setN((prev) => {
        const next = prev + per;
        if (next >= total) { clearInterval(t); written.add(idRef.current); return total; }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [id, total]);

  const typing = n < total;
  const shown = typing ? spend(children, { left: n }) : children;

  /* A div, not a span: what it wraps is a paragraph or a list, and a
     span around flow content is invalid nesting. */
  return <div className={`${typing ? "stream-caret" : ""} ${className}`}>{shown}</div>;
}
