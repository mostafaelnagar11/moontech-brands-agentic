"use client";

/* The dashboard's top bar, carried over from the current app.
 *
 * 67px, translucent white over a blur, one hairline underneath, and
 * sticky. Left to right: the hamburger that collapses the rail on a
 * desktop and opens the drawer on a phone, the page title, and a right
 * cluster with the assistant toggle, the alert count and the avatar.
 *
 * The original's centred command palette is not here. It searched
 * across campaigns, creators and settings — three things this
 * prototype does not have — and a search box that finds nothing is a
 * worse promise than no search box. The assistant beside it answers
 * the questions that palette was reached for.
 */

import { useEffect, useRef, useState } from "react";
import { Bell, List, Sparkle } from "@phosphor-icons/react";

export function DashboardTopbar({
  title,
  waiting,
  assistantOpen,
  onToggleAssistant,
  onToggleNav,
}: {
  title: string;
  waiting: number;
  assistantOpen: boolean;
  onToggleAssistant: () => void;
  onToggleNav: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  /* A menu that only closes by pressing the thing that opened it is a
     menu people leave open. */
  useEffect(() => {
    if (!menu) return;
    const away = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  return (
    <header className="sticky top-0 z-20 flex h-[67px] shrink-0 items-center gap-3 border-b border-hairline bg-white/80 px-4 backdrop-blur-sm">
      <button
        onClick={onToggleNav}
        aria-label="Menu"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-control text-ink-faint transition-colors hover:bg-neutral-100"
      >
        <List size={18} aria-hidden />
      </button>

      <h1 className="shrink-0 text-[15px] font-semibold text-ink">{title}</h1>

      <div className="ms-auto flex shrink-0 items-center gap-2">
        {/* The assistant is a first-class thing to open, so it gets a
            control up here rather than only a floating button. */}
        <button
          onClick={onToggleAssistant}
          aria-pressed={assistantOpen}
          className={`inline-flex items-center gap-2 rounded-control px-3 py-2 text-meta font-semibold transition-colors ${
            assistantOpen
              ? "bg-brand text-white hover:bg-brand-hover"
              : "border border-hairline bg-white text-ink-soft hover:bg-neutral-50"
          }`}
        >
          <Sparkle size={13} weight="fill" aria-hidden />
          <span className="hidden sm:inline">Ask MoonTech</span>
        </button>

        <span
          className="relative grid h-9 w-9 place-items-center rounded-control border border-hairline bg-white text-ink-faint"
          title={waiting ? `${waiting} waiting on you` : "Nothing waiting"}
        >
          <Bell size={15} aria-hidden />
          {waiting > 0 && (
            <span className="absolute -end-1 -top-1 grid h-4 min-w-4 place-items-center rounded-pill bg-danger px-1 text-[10px] font-semibold text-white">
              {waiting}
            </span>
          )}
          <span className="sr-only">{waiting} waiting on you</span>
        </span>

        <div className="relative" ref={wrap}>
          <button
            onClick={() => setMenu((o) => !o)}
            aria-expanded={menu}
            aria-label="Your account"
            className="grid h-9 w-9 place-items-center rounded-full bg-brand text-meta font-medium text-white"
          >
            ME
          </button>
          {menu && (
            <div className="absolute end-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-control border border-hairline bg-white shadow-float">
              <div className="border-b border-hairline px-3 py-2.5">
                <p className="truncate text-body font-semibold text-ink">Mostafa Elnagar</p>
                <p className="truncate text-[11px] text-ink-faint">Admin</p>
              </div>
              <a href="/" className="block px-3 py-2.5 text-body font-medium text-danger transition hover:bg-danger/[0.06]">
                Sign out
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
