"use client";

/* The application, as one surface.
 *
 * Three columns and nothing else: a rail of conversations, the
 * conversation itself, and one panel. Every screen this product used to
 * have is now a view inside that panel, so there is no navigation — the
 * only two things a brand can act on are the message box and the panel
 * beside it.
 *
 * The proportions are borrowed from the tools people already use for
 * this kind of work: a narrow rail, a reading column that never grows
 * past 720px however wide the display is, and an artifact panel that
 * opens beside it rather than on top of it.
 */

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CaretLeft, X } from "@phosphor-icons/react";
import { closePanel, setPanelView, useActivePlan, usePaid, usePanel, useStore } from "../../lib/store";
import type { PanelView } from "../../lib/store";

export function ChatShell({ children, panel }: { children: ReactNode; panel: ReactNode }) {
  const { open } = usePanel();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white">
      {/* ── Conversation ───────────────────────────────────────────
          No rail. Onboarding creates one campaign, so there is no list
          to browse and nothing to switch between — a sidebar here would
          be three rows of furniture pretending to be navigation. The
          conversation and the panel are the whole product. */}
      <main
        className={`relative flex min-w-0 flex-1 flex-col ${open ? "hidden md:flex" : "flex"}`}
        aria-label="Conversation"
      >
        {/* The mark, and nothing beside it. With no rail there is no
            navigation to put in a header, so this is a thin strip
            carrying only whose product this is — and the way back to a
            new read. It fades the conversation out underneath rather
            than sitting on top of it. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-white from-40% to-transparent" />
        <Link
          href="/"
          aria-label="MoonTech — start a new campaign"
          className="pointer-events-auto absolute start-5 top-4 z-20 rounded transition hover:opacity-70"
        >
          <Image src="/logo.svg" alt="MoonTech" width={104} height={19} priority className="h-[18px] w-auto" />
        </Link>
        {children}
      </main>

      {/* ── Panel ──────────────────────────────────────────────────
          Beside the conversation on a wide display, over it on a narrow
          one. It is never a page: it has no URL, and closing it returns
          you to exactly where you were in the thread. */}
      {open && (
        <aside
          className="animate-slide-in-end flex w-full shrink-0 flex-col border-s border-hairline bg-rail md:w-[clamp(360px,40vw,560px)]"
          aria-label="Panel"
        >
          {panel}
        </aside>
      )}
    </div>
  );
}

/** The panel's own chrome: a title, a close, and a scrolling body. Every
    view inside it starts at its first real element — no page headers. */
/* With no rail, the panel has to be navigable from inside itself.
   These are the views a brand can reach at each stage — the same set
   the agent opens when asked, so typing "show me the ads" and pressing
   Ads land in exactly the same place. */
type Gate = "read" | "plan" | "paid";

const VIEWS: { key: PanelView; label: string; needs: Gate }[] = [
  { key: "plan", label: "Plan", needs: "plan" },
  { key: "read", label: "Read", needs: "read" },
  { key: "campaign", label: "Campaign", needs: "paid" },
  { key: "inbox", label: "Needs you", needs: "paid" },
  { key: "ads", label: "Ads", needs: "paid" },
  { key: "activity", label: "Activity", needs: "paid" },
  { key: "autonomy", label: "Autonomy", needs: "paid" },
];

export function PanelFrame({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  const { view } = usePanel();
  const paid = usePaid();
  const hasPlan = !!useActivePlan();
  const hasRead = useStore((st) => Object.keys(st.reads).length > 0);
  /* A tab with nothing behind it is a promise the panel cannot keep.
     Plan appears when there is a plan, Read when the store has been
     read, and the running views only once a phase is paid for. */
  const available = VIEWS.filter((v) =>
    v.needs === "paid" ? paid : v.needs === "plan" ? hasPlan : hasRead
  );
  return (
    <>
      <header className="flex h-[56px] shrink-0 items-center gap-2 border-b border-hairline px-4">
        {/* Below 768 the panel covers the conversation, so it needs a way
            back that reads as "back" rather than as "close". */}
        <button
          onClick={closePanel}
          aria-label="Back to the conversation"
          className="-ms-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-control text-ink-faint transition hover:bg-black/[0.05] hover:text-ink md:hidden"
        >
          <CaretLeft size={15} weight="bold" aria-hidden className="rtl:rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">{title}</p>
          {sub && <p className="truncate text-[11px] text-ink-faint">{sub}</p>}
        </div>
        <button
          onClick={closePanel}
          aria-label="Close the panel"
          className="hidden h-8 w-8 shrink-0 place-items-center rounded-control text-ink-faint transition hover:bg-black/[0.05] hover:text-ink md:grid"
        >
          <X size={15} aria-hidden />
        </button>
      </header>
      {available.length > 1 && (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-hairline px-3 py-2 no-bar">
          {available.map((v) => (
            <button
              key={v.key}
              onClick={() => setPanelView(v.key)}
              aria-current={v.key === view}
              className={`shrink-0 rounded-pill px-3 py-1.5 text-[11px] font-semibold transition ${
                v.key === view ? "bg-brand text-white" : "text-ink-faint hover:bg-black/[0.05] hover:text-ink"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </>
  );
}
