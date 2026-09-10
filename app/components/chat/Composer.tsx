"use client";

/* The message box.
 *
 * One control, and the only place in the product where a brand types.
 * It grows with what is being written and stops at eight rows, which is
 * about as much as anyone composes before they want to send.
 *
 * The suggestion chips sit ABOVE it rather than below. Below the box is
 * where the standing promise lives — that nothing moves money or
 * publishes without the brand — and that line should never move or be
 * pushed off by a row of chips.
 *
 * While the agent is working the send button becomes the stop button.
 * That is where every chat people already use puts it, and it is the
 * one control on screen the eye is already on — a stop that travels
 * with the thing being stopped has to be hunted for, and it moves down
 * the page while you reach for it.
 */

import { useEffect, useRef } from "react";
import { ArrowUp, Square } from "@phosphor-icons/react";

export function Composer({
  value, onChange, onSend, chips = [], onChip, disabled, placeholder, note,
  busy = false, onStop, stopLabel = "Stop",
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  chips?: string[];
  onChip?: (c: string) => void;
  disabled?: boolean;
  placeholder: string;
  note: string;
  /** A run is open. The send button becomes stop for as long as it is. */
  busy?: boolean;
  onStop?: () => void;
  stopLabel?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  /* Auto-grow. Reset to auto first or the box can only ever get taller. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const armed = !!value.trim() && !disabled;

  return (
    <div className="shrink-0 bg-gradient-to-t from-white via-white to-transparent px-4 pb-4 pt-2">
      <div className="mx-auto w-full max-w-[720px]">
        {chips.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => onChip?.(c)}
                className="rounded-pill border border-black/[0.09] bg-white px-3 py-1.5 text-meta font-medium text-ink-soft transition hover:border-brand/40 hover:text-brand"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-[26px] border border-black/[0.1] bg-white px-4 py-2.5 shadow-[0_2px_12px_rgba(16,12,40,0.06)] transition focus-within:border-brand/40 focus-within:shadow-[0_2px_18px_rgba(77,47,176,0.10)]">
          <textarea
            ref={ref}
            rows={1}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              /* Enter does not queue a message behind a run. Stopping is
                 a decision, not something to do by pressing return. */
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!busy) onSend(); }
            }}
            aria-label="Message the agent"
            className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent py-1 text-prose leading-6 text-ink outline-none placeholder:text-ink-faint disabled:opacity-60"
          />
          {busy && onStop ? (
            <button
              onClick={onStop}
              aria-label={stopLabel}
              title={stopLabel}
              className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-ink/85"
            >
              <Square size={10} weight="fill" aria-hidden />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!armed}
              aria-label="Send"
              className={`mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
                armed ? "bg-ink text-white hover:bg-ink/85" : "bg-neutral-200 text-white"
              }`}
            >
              <ArrowUp size={15} weight="bold" aria-hidden />
            </button>
          )}
        </div>

        <p className="mt-2 text-center text-[11px] text-ink-faint">{note}</p>
      </div>
    </div>
  );
}
