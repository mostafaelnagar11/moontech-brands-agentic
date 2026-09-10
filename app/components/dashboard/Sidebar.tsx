"use client";

/* The dashboard's left rail, carried over from the current app.
 *
 * Same proportions and same behaviour: 210px open, 60px collapsed, a
 * 200ms width transition, white against the canvas, and a hairline on
 * the right. Below 768px the aside is gone and a 240px drawer takes
 * over, always expanded, over a blurred scrim.
 *
 * Two things are deliberately different from the original.
 *
 * The active item is derived from the CURRENT VIEW rather than held in
 * a `useState("Dashboard")` that each page seeds for itself. In the
 * current app that state is a label string, so reaching a page any way
 * other than clicking its own nav item leaves the highlight pointing
 * at the wrong row until the page remounts.
 *
 * The brand switcher is a brand TILE. The original switches between
 * three brands from a fixture; this prototype has the one campaign the
 * agent just built, and a switcher with one row is furniture.
 */

import Image from "next/image";
import Link from "next/link";
import {
  ClockCounterClockwise,
  House,
  Megaphone,
  ShieldCheck,
  SignOut,
  Sparkle,
  Tray,
  X,
  type Icon,
} from "@phosphor-icons/react";
import type { DashboardView } from "../../lib/agent/dashboard";

export const NAV: { key: DashboardView; label: string; icon: Icon }[] = [
  { key: "campaign", label: "Campaign", icon: House },
  { key: "inbox", label: "Needs you", icon: Tray },
  { key: "ads", label: "Ads", icon: Megaphone },
  { key: "activity", label: "Activity", icon: ClockCounterClockwise },
  { key: "autonomy", label: "Autonomy", icon: ShieldCheck },
];

interface Props {
  collapsed: boolean;
  view: DashboardView;
  onView: (v: DashboardView) => void;
  waiting: number;
  brandName: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function Content({ collapsed, view, onView, waiting, brandName, onMobileClose }: Props) {
  return (
    <div className={`flex h-full flex-col overflow-y-auto bg-white py-5 ${collapsed ? "items-center px-2" : "px-3"}`}>
      <div className={`mb-4 flex items-center ${collapsed ? "justify-center" : "justify-between px-2"}`}>
        {collapsed ? (
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-control bg-brand text-micro font-medium text-white shadow-md"
          >
            M
          </span>
        ) : (
          <Image src="/logo.svg" alt="MoonTech" width={110} height={20} priority className="h-[19px] w-auto" />
        )}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            aria-label="Close the menu"
            className="grid h-8 w-8 place-items-center rounded-control text-ink-faint transition hover:bg-black/[0.05] md:hidden"
          >
            <X size={15} aria-hidden />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="relative mb-5 px-1">
          <div className="flex w-full items-center gap-2.5 rounded-control border border-neutral-100 bg-neutral-50 px-3 py-2">
            <span
              aria-hidden
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand text-[11px] font-semibold text-white"
            >
              {brandName.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink-soft">{brandName}</span>
          </div>
        </div>
      )}

      {!collapsed && (
        <p className="mb-2 px-2 text-[9px] font-medium uppercase tracking-widest text-ink-faint/60">Menu</p>
      )}

      <nav className="mb-6 flex w-full flex-col gap-1" aria-label="Dashboard">
        {NAV.map((item) => {
          const active = item.key === view;
          const I = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => { onView(item.key); onMobileClose?.(); }}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex items-center rounded-control py-2.5 text-left text-body font-medium transition-all ${
                collapsed ? "justify-center px-0" : "gap-3 px-3"
              } ${
                active
                  ? "bg-brand text-white shadow-md shadow-violet-200"
                  : "text-ink-faint hover:bg-neutral-50 hover:text-ink-soft"
              }`}
            >
              <I size={16} weight="bold" aria-hidden className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.key === "inbox" && waiting > 0 && (
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                        active ? "bg-white/20 text-white" : "bg-danger/[0.08] text-danger"
                      }`}
                    >
                      {waiting}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pinned to the bottom, and only things that lead somewhere. The
          original has a Help row wired to nothing; a control that does
          nothing is worse than an absent one. */}
      <div className="mt-auto flex w-full flex-col gap-1">
        <div className={`flex w-full flex-col gap-1 ${collapsed ? "" : "border-t border-neutral-100 pt-3"}`}>
          <Link
            href="/c"
            title={collapsed ? "Build a campaign" : undefined}
            className={`flex items-center rounded-control py-2.5 text-body font-medium text-ink-faint transition-all hover:bg-neutral-50 hover:text-ink-soft ${
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            }`}
          >
            <Sparkle size={16} weight="bold" aria-hidden className="shrink-0" />
            {!collapsed && <span>Build a campaign</span>}
          </Link>
          <Link
            href="/"
            title={collapsed ? "Sign out" : undefined}
            className={`flex items-center rounded-control py-2.5 text-body font-medium text-ink-faint transition-all hover:bg-danger/[0.07] hover:text-danger ${
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            }`}
          >
            <SignOut size={16} weight="bold" aria-hidden className="shrink-0 rtl:rotate-180" />
            {!collapsed && <span>Sign out</span>}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function DashboardSidebar(props: Props) {
  return (
    <>
      <aside
        className={`hidden shrink-0 flex-col border-e border-neutral-100/80 transition-all duration-200 md:flex ${
          props.collapsed ? "w-[60px]" : "w-[210px]"
        }`}
      >
        <Content {...props} onMobileClose={undefined} />
      </aside>

      {props.mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={props.onMobileClose}
            aria-hidden
          />
          <aside className="absolute start-0 top-0 h-full w-[240px] border-e border-neutral-100 shadow-xl" aria-label="Menu">
            <Content {...props} collapsed={false} />
          </aside>
        </div>
      )}
    </>
  );
}
