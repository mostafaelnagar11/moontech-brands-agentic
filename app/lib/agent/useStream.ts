"use client";

/* Consuming a tool stream from a component.

   The contract the UI sees:
     partial   — the result so far, always complete-as-of-now
     note      — what the agent is doing, right now
     progress  — units done / units discovered, never a percentage
     status    — idle | running | done | cancelled
     cancel()  — stops, and KEEPS the partial

   A component never learns how long anything will take, because nothing
   here knows. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Chunk, RunContext, ToolStream } from "./types";
import { run, type RunHandle } from "./stream";

export type StreamStatus = "idle" | "running" | "done" | "cancelled";

export interface StreamState<T> {
  partial: T | null;
  note: string;
  progress: { done: number; total: number };
  status: StreamStatus;
  start: (make: (ctx: RunContext) => ToolStream<T>, onDone?: (v: T, cancelled: boolean) => void) => void;
  cancel: () => void;
  reset: () => void;
}

export function useStream<T>(): StreamState<T> {
  const [partial, setPartial] = useState<T | null>(null);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [status, setStatus] = useState<StreamStatus>("idle");
  const handle = useRef<RunHandle<T> | null>(null);
  const alive = useRef(true);

  /* The flag has to be re-armed on every mount, not only cleared on
     unmount. React runs an effect twice in development, so a cleanup
     that only sets it false leaves the second mount permanently dead and
     every chunk silently dropped. */
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; handle.current?.cancel(); };
  }, []);

  const start = useCallback<StreamState<T>["start"]>((make, onDone) => {
    handle.current?.cancel();
    setStatus("running");
    setNote("");
    setProgress({ done: 0, total: 0 });
    /* Kept outside React state so the failure path below can hand the
       caller whatever had arrived, without waiting for a render. */
    let latest: T | undefined;
    const h = run<T>(make, (c: Chunk<T>) => {
      latest = c.partial;
      if (!alive.current) return;
      setPartial(c.partial);
      setNote(c.note);
      setProgress(c.progress);
    });
    handle.current = h;
    h.done.then(({ value, cancelled }) => {
      /* Only the run that is still the current one may report. React
         mounts an effect twice in development, so a torn-down first run
         resolves as "cancelled" after the component has already come
         back — and without this identity check the caller would be told
         the user pressed stop when nobody did. */
      if (handle.current !== h || !alive.current) return;
      if (value !== undefined) setPartial(value);
      setStatus(cancelled ? "cancelled" : "done");
      onDone?.(value, cancelled);
    }).catch((e) => {
      /* A tool that throws must not leave the run open forever. It used
         to: `done` only ever rejects on an unexpected error, nothing
         caught it, and status stayed "running" — which now also means
         the composer's send button stays a stop button with nothing to
         stop. Treated as a cancel, because that is what it is from the
         brand's side: the work ended early and whatever arrived stands. */
      if (handle.current !== h || !alive.current) return;
      console.error("[useStream] the run failed", e);
      setStatus("cancelled");
      onDone?.(latest as T, true);
    });
  }, []);

  const cancel = useCallback(() => handle.current?.cancel(), []);
  const reset = useCallback(() => {
    handle.current?.cancel();
    setPartial(null); setNote(""); setProgress({ done: 0, total: 0 }); setStatus("idle");
  }, []);

  return { partial, note, progress, status, start, cancel, reset };
}
