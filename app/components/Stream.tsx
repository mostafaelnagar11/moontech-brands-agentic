"use client";

/* What a stream looks like while it is open.

   Deliberately NOT a progress bar. A bar implies a known end, and the
   agent does not know one — `total` is the work it has discovered so
   far and it grows. So this shows the note and a count, and nothing
   else: this line reports, it does not offer.

   Stopping lives in the message box, on the send button, the way every
   chat people already use does it. It used to live here, beside the
   line — which meant the way out scrolled down the page as the work
   went on, and a brand had to find it again each time they looked.
   Cancelling is still never destructive: stopping keeps everything
   that arrived. */

import { useEffect, useRef, useState } from "react";
import type { StreamStatus } from "../lib/agent/useStream";

export function WorkingLine({
  note, done, total, status, className = "",
}: {
  note: string;
  done: number;
  total: number;
  status: StreamStatus;
  className?: string;
}) {
  if (status === "idle") return null;

  if (status === "cancelled") {
    return (
      <div className={`flex flex-wrap items-center gap-3 rounded-control border border-hairline bg-neutral-50 px-3 py-2.5 ${className}`}>
        <p className="flex-1 text-meta text-ink-soft">
          Stopped after {done} of {total}. Everything found so far is below and still usable.
        </p>
      </div>
    );
  }

  if (status === "done") return null;

  return (
    <div
      aria-live="polite"
      className={`flex flex-wrap items-center gap-3 rounded-control border border-brand/15 bg-brand/[0.04] px-3 py-2.5 ${className}`}
    >
      <span aria-hidden className="working-ring h-3.5 w-3.5 shrink-0" />
      <p className="min-w-0 flex-1 truncate text-meta font-medium text-brand">{note || "Working"}</p>
      <span className="shrink-0 text-meta tabular-nums text-brand/70">
        {done}/{total}
      </span>
    </div>
  );
}

/** A line of text that is still arriving. */
export function StreamText({ text, streaming, className = "" }: { text: string; streaming?: boolean; className?: string }) {
  return (
    <p className={`whitespace-pre-line text-prose text-ink ${streaming ? "stream-caret" : ""} ${className}`}>{text}</p>
  );
}

/* ------------------------------------------------------------------ */
/* Typing                                                              */
/*                                                                     */
/* The agent's prose arrives the way it is produced — a few words at a  */
/* time — rather than landing complete. This is not decoration: text    */
/* from a model does arrive incrementally, and a wall of finished       */
/* paragraph hides the fact that anything was working.                  */
/*                                                                      */
/* It types ONCE. A message that has finished is marked done by the     */
/* caller, so scrolling back through the conversation does not set the  */
/* whole history retyping.                                              */
/* ------------------------------------------------------------------ */

/* How fast the agent appears to write.
 *
 * One number, because "slower" should be one edit rather than three
 * magic pairs. Around 11 words a second reads like someone composing a
 * sentence; past 30 it stops looking like writing and starts looking
 * like a paste, which is the thing the typing was there to avoid.
 *
 * The cap matters as much as the rate. A 200-word answer at 11 words a
 * second is eighteen seconds of watching, so beyond the cap the agent
 * writes more words per tick instead of taking longer — it keeps the
 * texture of typing without holding the brand hostage to it.
 */
const WORDS_PER_SECOND = 11;
const LONGEST_MESSAGE_MS = 6000;

function pace(words: number) {
  const oneWordMs = 1000 / WORDS_PER_SECOND;
  /* Counted in ticks rather than derived from a duration: dividing a
     duration back by the same rate loses a tick to floating point, and
     a short message would then arrive two words at a time. */
  const mostTicks = Math.floor(LONGEST_MESSAGE_MS / oneWordMs);
  const ticks = Math.max(1, Math.min(words, mostTicks));
  return { per: Math.max(1, Math.ceil(words / ticks)), ms: Math.round(oneWordMs) };
}

export function Typed({
  text, onTick, onDone,
}: {
  text: string;
  /** Fires as the text grows, so the thread can keep the scroll pinned. */
  onTick?: () => void;
  onDone?: () => void;
}) {
  const words = text.split(/(\s+)/);
  const wordCount = text.trim().split(/\s+/).length;
  const [n, setN] = useState(0);
  const reported = useRef(false);

  /* Advance the index on a timer. Nothing else happens in here — the
     parent callbacks fire from the effect below, once the new index has
     committed, so a child never sets parent state during its own render. */
  useEffect(() => {
    const { per, ms } = pace(wordCount);
    const id = setInterval(() => {
      setN((prev) => {
        const next = prev + per * 2; // *2 because the split keeps whitespace
        if (next >= words.length) { clearInterval(id); return words.length; }
        return next;
      });
    }, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    if (n === 0) return;
    if (n >= words.length) {
      if (!reported.current) { reported.current = true; onDone?.(); }
    } else {
      onTick?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const shown = words.slice(0, n).join("");
  const typing = n < words.length;

  return (
    <p className={`whitespace-pre-line text-prose text-ink ${typing ? "stream-caret" : ""}`}>
      {shown}
    </p>
  );
}

/** The agent is composing. Three dots, and nothing claimed about how
    long it will take. */
export function Thinking() {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-[12px] text-white">✦</span>
      <span className="mt-2.5 flex gap-1" role="status" aria-label="The agent is replying">
        {[0, 160, 320].map((d) => (
          <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand/45" style={{ animationDelay: `${d}ms` }} />
        ))}
      </span>
    </div>
  );
}
