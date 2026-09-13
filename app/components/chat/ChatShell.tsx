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
import { Wordmark } from "../Wordmark";
import Link from "next/link";
import { CaretLeft, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { PencilSimple, Plus } from "@phosphor-icons/react";
import {
  campaignLabel, closePanel, openConversation, renameCampaign, setPanelView, startConversation,
  useActiveThreadId, useActivePlan, useCampaigns, usePanel, useStore, type Campaign,
} from "../../lib/store";
import type { PanelView } from "../../lib/store";

export function ChatShell({ children, panel }: { children: ReactNode; panel: ReactNode }) {
  const { open } = usePanel();
  const campaigns = useCampaigns();
  const activeThreadId = useActiveThreadId();
  /* The rail earns its place on the second campaign and not before.
     One row is furniture — that was the argument for deleting it, and
     it is the same argument for bringing it back exactly here. */
  const railed = campaigns.length > 1;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white">
      {railed && (
        <aside
          className="hidden w-[212px] shrink-0 flex-col border-e border-hairline bg-rail md:flex"
          aria-label="Your campaigns"
        >
          <div className="px-4 pb-3 pt-4">
            <Wordmark size="sm" />
          </div>
          <button
            onClick={() => startConversation()}
            className="mx-3 mb-3 inline-flex items-center justify-center gap-1.5 rounded-control bg-brand px-3 py-2 text-meta font-semibold text-white transition hover:bg-brand-hover"
          >
            <Plus size={12} weight="bold" aria-hidden /> New campaign
          </button>
          <p className="px-4 pb-1.5 text-[9px] font-medium uppercase tracking-widest text-ink-faint">Campaigns</p>
          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
            {campaigns.map((c) => (
              <CampaignRow key={c.id} c={c} here={c.threadId === activeThreadId} />
            ))}
          </nav>
        </aside>
      )}
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
        {!railed && <Link
          href="/"
          aria-label="HeyMoon, start a new campaign"
          className="pointer-events-auto absolute start-5 top-4 z-20 rounded transition hover:opacity-70"
        >
          <Wordmark size="sm" />
        </Link>}
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

/** One campaign in the rail.
 *
 * No avatar. Two campaigns built from the same store are both
 * "Ounass", so a letter tile showed the same O twice and identified
 * nothing — it was decoration standing where the difference should be.
 * The name carries it instead, and the name is editable, because
 * "Ounass" and "Ounass Black Friday" is the distinction the brand
 * actually wants to make.
 */
function CampaignRow({ c, here }: { c: Campaign; here: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) box.current?.select(); }, [editing]);

  const open = () => { setDraft(campaignLabel(c)); setEditing(true); };
  const save = () => { renameCampaign(c.id, draft); setEditing(false); };

  if (editing) {
    return (
      <div className="rounded-control bg-white px-2 py-1.5 shadow-card">
        <input
          ref={box}
          value={draft}
          autoFocus
          maxLength={60}
          aria-label="Campaign name"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); save(); }
            if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
          }}
          className="w-full bg-transparent text-meta font-semibold text-ink outline-none"
        />
        <p className="mt-0.5 text-[10px] text-ink-faint">Enter to save</p>
      </div>
    );
  }

  return (
    <div
      className={`group flex w-full items-center gap-1 rounded-control transition ${
        here ? "bg-white shadow-card" : "hover:bg-black/[0.04]"
      }`}
    >
      <button
        onClick={() => openConversation(c.threadId)}
        aria-current={here ? "page" : undefined}
        className="min-w-0 flex-1 px-2.5 py-2 text-start"
      >
        <span className="block truncate text-meta font-semibold text-ink">{campaignLabel(c)}</span>
        <span className="block truncate text-[10px] text-ink-faint">{c.paid ? "Running" : "Proposed"}</span>
      </button>
      <button
        onClick={open}
        aria-label={`Rename ${campaignLabel(c)}`}
        className="me-1.5 grid h-6 w-6 shrink-0 place-items-center rounded text-ink-faint opacity-0 transition hover:bg-black/[0.06] hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
      >
        <PencilSimple size={12} aria-hidden />
      </button>
    </div>
  );
}

/** The panel's own chrome: a title, a close, and a scrolling body. Every
    view inside it starts at its first real element — no page headers. */
/* With no rail, the panel has to be navigable from inside itself.
   These are the views a brand can reach at each stage — the same set
   the agent opens when asked, so typing "show me the ads" and pressing
   Ads land in exactly the same place. */
/* Only the two artifacts of BUILDING a campaign. The running views —
   Campaign, Needs you, Ads, Activity, Autonomy — moved to /dashboard,
   because they belong to a phase that runs for weeks rather than to
   this conversation, which ends the moment the store is connected.
   Beside the chat they implied the agent stays with you through the
   phase, which it does not. */
type Gate = "read" | "plan";

const VIEWS: { key: PanelView; label: string; needs: Gate }[] = [
  { key: "plan", label: "Plan", needs: "plan" },
  { key: "read", label: "Read", needs: "read" },
];

export function PanelFrame({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  const { view } = usePanel();
  const hasPlan = !!useActivePlan();
  const hasRead = useStore((st) => Object.keys(st.reads).length > 0);
  /* A tab with nothing behind it is a promise the panel cannot keep.
     Plan appears when there is a plan, Read when the store has been
     read. */
  const available = VIEWS.filter((v) => (v.needs === "plan" ? hasPlan : hasRead));
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
