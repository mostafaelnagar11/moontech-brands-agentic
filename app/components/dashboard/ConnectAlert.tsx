"use client";

/* The one thing the brand still owes, said at the top of the dashboard.
 *
 * Connecting the store used to be the last block in the conversation at
 * /c, directly under the receipt. That put a task with no deadline in a
 * thread that scrolls: a brand who paid, read the confirmation and left
 * had walked past the step that makes the guarantee measurable, and
 * nothing on any later screen asked them for it again. A conversation
 * ends. A dashboard is where you come back to, so the outstanding task
 * belongs here, above whatever view is open, until it is done.
 *
 * It renders only between payment and connection, and it disappears the
 * moment the store is connected rather than turning into a tick nobody
 * needs. Collapsed it is one line and one button; open it is the same
 * connect flow the conversation used, minus the heading and the reason,
 * which the alert has already given.
 */

import { useState } from "react";
import { CaretDown, PlugsConnected } from "@phosphor-icons/react";
import { IntegrationBlock } from "../blocks";
import { connectStore, useUnconnected } from "../../lib/store";
import type { StorePlatform } from "../../lib/store";

export function ConnectAlert() {
  const [open, setOpen] = useState(false);
  /* The campaign with the step outstanding, which is not always the one
     on screen: starting a new conversation clears the active campaign,
     and the step it left behind is still owed. */
  const owed = useUnconnected();
  if (!owed) return null;

  return (
    <section
      aria-labelledby="connect-alert"
      className="rounded-card border border-brand/25 bg-brand/[0.05] p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span aria-hidden className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-white">
          <PlugsConnected size={16} weight="fill" />
        </span>
        <div className="min-w-0 flex-1 basis-[15rem]">
          <p id="connect-alert" className="text-body font-semibold text-ink">
            One step left: connect your store
          </p>
          <p className="mt-1 max-w-[62ch] text-meta leading-5 text-ink-soft">
            Your phase is paid and your creators are briefed. Connecting is how HeyMoon counts the sales each creator
            earns you, which is what the guarantee is measured against. Nothing here runs against a number until it is
            in place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="connect-alert-body"
          className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-control bg-brand px-3.5 py-2 text-body font-semibold text-white transition hover:bg-brand-hover sm:w-auto"
        >
          {open ? "Not now" : "Connect store"}
          <CaretDown
            size={12}
            weight="bold"
            aria-hidden
            className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Animating to zero height keeps the views below from jumping as
          the alert opens and closes. */}
      <div
        id="connect-alert-body"
        className={`grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none ${
          open ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-card border border-hairline bg-white p-4">
            <IntegrationBlock compact onConnect={(k: StorePlatform) => connectStore(k, owed.id)} />
          </div>
        </div>
      </div>
    </section>
  );
}
