/* The streaming contract.

   The brief for this prototype asks for "real streaming behaviour with
   partial results and cancel, not fixed timers". Concretely that means
   four things, and they are enforced here rather than left to each
   screen:

   1. A caller never learns a duration. There is no `3200` anywhere. A
      run ends when the work ends.
   2. Every yield is a COMPLETE result so far, not a delta. The UI
      renders `partial` directly and never merges.
   3. `total` is the units of work DISCOVERED so far and it grows. There
      is no progress bar creeping to 100% on a clock.
   4. Cancelling stops the run at the last completed unit and KEEPS it.
      A cancelled read is a shorter read, not an empty one.

   The pacing itself is synthetic — this is a mock — but it is derived
   from the size of each unit of work rather than from a constant, so no
   two units take the same time and nothing is metronomic. Swap in a real
   model and `settle` disappears; nothing else changes. */

import { Cancelled, type Chunk, type RunContext, type ToolStream } from "./types";
import { rng } from "./rng";

/** Wait out one unit of work. Abortable, and it rejects rather than
    resolving so a cancelled generator unwinds through its finally
    blocks. */
export function settle(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new Cancelled());
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, ms);
    function onAbort() { clearTimeout(t); reject(new Cancelled()); }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** How long one unit of work "takes", derived from what it is. A dense
    layer with six pieces of evidence takes longer than a one-line one,
    which is what makes the stream read as work rather than as a clock. */
export function costOf(unitKey: string, weight: number): number {
  const r = rng(unitKey);
  /* Tuned so a full store read — nine units, 27 weight — lands around
     fifteen seconds (9 × 570 + 27 × 365 ≈ 15 s before jitter), and the
     plan build lands around eleven. Fifteen seconds is long enough that
     four named agents visibly do work, and short enough that nobody
     walks away. A two-second read looks like a lookup, which is the one
     thing this screen must not look like. The cap keeps the heaviest
     unit from ever feeling stuck. */
  const base = 570 + weight * 365;         // bigger units take longer
  const jitter = 0.75 + r() * 0.6;         // deterministic per unit, never metronomic
  return Math.round(Math.min(3600, base * jitter));
}

/** A small helper for building a chunk. */
export const chunk = <T,>(partial: T, note: string, done: number, total: number): Chunk<T> =>
  ({ partial, note, progress: { done, total } });

/* ------------------------------------------------------------------ */
/* The runner                                                          */
/* ------------------------------------------------------------------ */

export interface RunHandle<T> {
  /** Resolves with the final value, or with the last partial if the run
      was cancelled. Never rejects on cancel — a cancelled run is a
      shorter successful run, not an error. */
  done: Promise<{ value: T; cancelled: boolean }>;
  cancel(): void;
}

/** Drive a tool stream, pushing every partial at the caller. */
export function run<T>(
  make: (ctx: RunContext) => ToolStream<T>,
  onChunk: (c: Chunk<T>) => void
): RunHandle<T> {
  const ac = new AbortController();
  let last: T | undefined;

  const done = (async () => {
    /* Driven by hand rather than with `for await`, because a for-await
       loop discards the generator's RETURN value and the settled result
       is exactly that. */
    const gen = make({ signal: ac.signal });
    try {
      for (;;) {
        const r = await gen.next();
        if (r.done) return { value: (r.value ?? last) as T, cancelled: false };
        last = r.value.partial;
        onChunk(r.value);
      }
    } catch (e) {
      if (e instanceof Cancelled || ac.signal.aborted) {
        return { value: last as T, cancelled: true };
      }
      throw e;
    } finally {
      void gen.return(undefined as never).catch(() => {});
    }
  })();

  return { done, cancel: () => ac.abort() };
}
