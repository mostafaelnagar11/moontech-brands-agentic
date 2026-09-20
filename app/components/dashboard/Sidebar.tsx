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

import { Wordmark } from "../Wordmark";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CaretDown,
  Check,
  Plus,
  PencilSimple,
  Megaphone,
  Gear,
  SignOut,
  SquaresFour,
  X,
  type Icon,
} from "@phosphor-icons/react";
import type { DashboardView } from "../../lib/agent/dashboard";
import {
  campaignLabel, openCampaign, renameCampaign, resetAll, setActiveCampaign, showCampaignList,
  startConversation, useAds, useCampaigns, useStore, type Campaign,
} from "../../lib/store";
import { getRead } from "../../lib/agent/registry";

/* Two rows, and then the brands.

   Creators, Needs you, Ads and Activity used to sit here as four more
   destinations. They are not destinations, they are four faces of one
   campaign: switch the brand above and every one of them changes
   underneath you. They are tabs inside the campaign now, where the
   thing they describe is.

   What takes their place is the campaigns themselves, indented under
   Campaigns, because THAT is the list a brand actually navigates by.
   Somebody running three brands wants the three brands one press away,
   not four ways to slice whichever one happens to be active. */
export const NAV: { key: DashboardView; label: string; icon: Icon }[] = [
  { key: "home", label: "Dashboard", icon: SquaresFour },
  { key: "campaign", label: "Campaigns", icon: Megaphone },
];

/* Settings sits at the foot of the rail rather than in the list above,
   because the list is the work and this is the account behind it.
   Autonomy used to be the last row up there, which ranked a table of
   preferences alongside Campaigns and Ads; it is inside settings now. */
export const FOOT: { key: DashboardView; label: string; icon: Icon } = {
  key: "settings", label: "Settings", icon: Gear,
};

interface Props {
  collapsed: boolean;
  view: DashboardView;
  onView: (v: DashboardView) => void;
  waiting: number;
  brandName: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/** A brand's own logo where the read found one, its initial where it
    did not. Never a stock avatar: an invented face for a shop is worse
    than a letter. */
function BrandMark({ campaign, size }: { campaign: Campaign | null; size: number }) {
  const logo = campaign?.readId ? getRead(campaign.readId).identity?.logo : undefined;
  const label = campaign?.brandName ?? "";
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center overflow-hidden rounded-[8px] bg-brand font-semibold text-white"
      style={{ height: size, width: size, fontSize: Math.round(size * 0.42) }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-full w-full bg-white object-cover" />
      ) : (
        label[0]?.toUpperCase() ?? "?"
      )}
    </span>
  );
}

function Content({ collapsed, view, onView, brandName, onMobileClose }: Props) {
  const [switcher, setSwitcher] = useState(false);
  const campaigns = useCampaigns();
  const ads = useAds();
  const activeId = useStore((s) => s.activeCampaignId);
  const active = campaigns.find((c) => c.id === activeId) ?? null;
  const switcherWrap = useRef<HTMLDivElement>(null);
  const [campMenu, setCampMenu] = useState(false);
  const campWrap = useRef<HTMLElement>(null);

  /* A menu that only closes by pressing the thing that opened it is a
     menu people leave open, the same rule the top bar's avatar uses. */
  useEffect(() => {
    if (!campMenu) return;
    const away = (e: MouseEvent) => {
      if (campWrap.current && !campWrap.current.contains(e.target as Node)) setCampMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setCampMenu(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [campMenu]);

  /* Expanding the rail puts the real rows back, so the flyout that
     stood in for them has nothing left to do. */
  useEffect(() => { if (!collapsed) setCampMenu(false); }, [collapsed]);

  useEffect(() => {
    if (!switcher) return;
    const away = (e: MouseEvent) => {
      if (switcherWrap.current && !switcherWrap.current.contains(e.target as Node)) setSwitcher(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSwitcher(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [switcher]);
  return (
    <div
      className={`flex h-full flex-col bg-white py-5 ${
        collapsed ? "items-center overflow-visible px-2" : "overflow-y-auto px-3"
      }`}
    >
      <div className={`mb-4 flex items-center ${collapsed ? "justify-center" : "justify-between px-2"}`}>
        {collapsed ? (
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-control bg-brand text-micro font-medium text-white shadow-md"
          >
            H
          </span>
        ) : (
          <Wordmark size="sm" />
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

      {/* The brand switcher, the shape the current web app already has:
          the mark, the name, a caret, and under it the list with a tick
          on the one you are looking at and a way to add another.

          It used to be a dead tile until a second campaign existed,
          which made the first thing in the rail a box that looked
          pressable and was not. Adding a brand is available from the
          first one, so the control is a control from the first one. */}
      {/* Collapsed, this was rendered not at all, so the one control
          that changes which brand you are looking at simply left the
          rail. The mark alone is the trigger at 60px, and the menu
          opens beside the rail instead of under the button. */}
      <div className={`relative mb-5 ${collapsed ? "" : "px-1"}`} ref={switcherWrap}>
          <button
            onClick={() => setSwitcher((o) => !o)}
            aria-expanded={switcher}
            aria-haspopup="menu"
            aria-label={collapsed ? `Brand: ${brandName}. Switch brand` : undefined}
            title={collapsed ? brandName : undefined}
            className={`flex items-center rounded-control border border-hairline bg-wash transition hover:bg-brand-100/60 ${
              collapsed ? "justify-center p-1.5" : "w-full gap-2.5 px-3 py-2 text-start"
            }`}
          >
            <BrandMark campaign={active} size={28} />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink-soft">{brandName}</span>
                <CaretDown
                  size={11}
                  weight="bold"
                  aria-hidden
                  className={`shrink-0 text-ink-faint transition ${switcher ? "rotate-180" : ""}`}
                />
              </>
            )}
          </button>

          {switcher && (
            <div
              role="menu"
              className={`absolute z-50 overflow-hidden rounded-control border border-hairline bg-white shadow-float ${
                collapsed ? "start-full top-0 ms-2 w-[232px]" : "inset-x-0 top-full mt-1"
              }`}
            >
              <p className="px-3 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-widest text-ink-faint">
                Switch brand
              </p>
              {campaigns.map((c) => (
                <div key={c.id} className={`group flex items-center ${c.id === activeId ? "bg-brand/[0.06]" : ""}`}>
                  <button
                    role="menuitem"
                    onClick={() => { setActiveCampaign(c.id); setSwitcher(false); onMobileClose?.(); }}
                    className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-start transition hover:bg-wash"
                  >
                    <BrandMark campaign={c} size={24} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-meta font-semibold text-ink">{c.brandName}</span>
                      <span className="block truncate text-[10px] text-ink-faint">
                        {c.paid ? "Running" : "Not started"}
                      </span>
                    </span>
                    {c.id === activeId && <Check size={12} weight="bold" aria-hidden className="shrink-0 text-brand" />}
                  </button>
                  {/* Renaming stays. The current app cannot do it, and a
                      workspace of campaigns all called by their domain
                      is a workspace you cannot navigate. */}
                  <button
                    onClick={() => { const n = window.prompt("Name this campaign", campaignLabel(c)); if (n !== null) renameCampaign(c.id, n); }}
                    aria-label={`Rename ${campaignLabel(c)}`}
                    className="me-2 grid h-6 w-6 shrink-0 place-items-center rounded text-ink-faint opacity-0 transition hover:bg-black/[0.06] hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <PencilSimple size={11} aria-hidden />
                  </button>
                </div>
              ))}
              <div className="border-t border-hairline">
                {/* Adding a brand IS building a campaign for it, so this
                    is the same fresh conversation the top bar opens. */}
                <Link
                  href="/c"
                  role="menuitem"
                  onClick={() => { startConversation(); setSwitcher(false); onMobileClose?.(); }}
                  className="flex items-center gap-2 px-3 py-2.5 text-meta font-semibold text-brand transition hover:bg-wash"
                >
                  <Plus size={12} weight="bold" aria-hidden />
                  Add brand
                </Link>
              </div>
            </div>
          )}
      </div>

      {!collapsed && (
        <p className="mb-2 px-2 text-[9px] font-medium uppercase tracking-widest text-ink-faint/60">Menu</p>
      )}

      <nav className="relative mb-6 flex w-full flex-col gap-1" aria-label="Dashboard" ref={campWrap}>
        {NAV.map((item) => {
          const active = item.key === view;
          const I = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => {
                /* Collapsed, Campaigns opens the list of names beside
                   the rail instead of navigating, because the rows that
                   would have carried those names cannot exist at 60px.
                   Expanded, it does what it always did. */
                if (collapsed && item.key === "campaign") { setCampMenu((o) => !o); return; }
                onView(item.key);
                if (item.key === "campaign") showCampaignList();
                onMobileClose?.();
              }}
              title={collapsed ? item.label : undefined}
              aria-expanded={collapsed && item.key === "campaign" ? campMenu : undefined}
              aria-haspopup={collapsed && item.key === "campaign" ? "menu" : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex items-center rounded-control py-2.5 text-left text-body font-medium transition-all ${
                collapsed ? "justify-center px-0" : "gap-3 px-3"
              } ${
                active
                  ? "bg-brand text-white shadow-md shadow-violet-200"
                  : "text-ink-faint hover:bg-wash hover:text-ink-soft"
              }`}
            >
              <I size={16} weight="bold" aria-hidden className="shrink-0" />
              {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* The campaigns, indented under Campaigns.

            A shortcut straight into one, which is what a rail is for:
            the alternative is Campaigns, then the list, then the card,
            to reach a page you visit twenty times a day. Each row
            carries its own count of drafts waiting, because the point
            of seeing three at once is seeing which of the three needs
            you.

            Collapsed, these rows do not render. They used to fall back
            to the BRAND's mark, which stopped meaning anything the
            moment campaigns got names of their own: three campaigns of
            one brand drew the same circle three times. A 60px rail
            cannot label anything, so the list moves into a flyout off
            the Campaigns row above, where the names can be read. */}
        {/* The collapsed rail's campaign list, by name, where names fit. */}
        {collapsed && campMenu && (
          <div
            role="menu"
            className="absolute start-full top-8 z-50 ms-2 w-[232px] overflow-hidden rounded-control border border-hairline bg-white shadow-float"
          >
            <p className="px-3 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-widest text-ink-faint">
              Campaigns
            </p>
            {campaigns.map((c) => {
              const here = view !== "home" && view !== "settings" && c.id === activeId;
              const owed = ads.filter((a) => a.state === "waiting" && c.adIds.includes(a.id)).length;
              return (
                <button
                  key={c.id}
                  role="menuitem"
                  onClick={() => { openCampaign(c.id); setCampMenu(false); onMobileClose?.(); }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-start text-meta font-medium transition hover:bg-wash ${
                    here ? "bg-brand/[0.06] text-ink" : "text-ink-soft"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{campaignLabel(c)}</span>
                  {owed > 0 && (
                    <span className="shrink-0 rounded-md bg-danger/[0.08] px-1.5 py-0.5 text-[11px] font-semibold text-danger">
                      {owed}
                    </span>
                  )}
                  {here && <Check size={12} weight="bold" aria-hidden className="shrink-0 text-brand" />}
                </button>
              );
            })}
          </div>
        )}

        {!collapsed && campaigns.map((c) => {
          const here = view !== "home" && view !== "settings" && c.id === activeId;
          const owed = ads.filter((a) => a.state === "waiting" && c.adIds.includes(a.id)).length;
          return (
            <button
              key={c.id}
              onClick={() => { openCampaign(c.id); onMobileClose?.(); }}
              aria-current={here ? "page" : undefined}
              className={`relative flex items-center gap-2.5 rounded-control py-2 pe-3 ps-9 text-left text-meta font-medium transition-all ${
                here ? "bg-brand/[0.08] text-ink" : "text-ink-faint hover:bg-wash hover:text-ink-soft"
              }`}
            >
              <span
                aria-hidden
                className={`absolute inset-y-0 start-[19px] w-px ${here ? "bg-brand/40" : "bg-hairline"}`}
              />
              <span className="min-w-0 flex-1 truncate">{campaignLabel(c)}</span>
              {owed > 0 && (
                <span className="shrink-0 rounded-md bg-danger/[0.08] px-1.5 py-0.5 text-[11px] font-semibold text-danger">
                  {owed}
                </span>
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
          <button
            onClick={() => { onView(FOOT.key); onMobileClose?.(); }}
            aria-current={view === FOOT.key ? "page" : undefined}
            title={collapsed ? FOOT.label : undefined}
            className={`flex items-center rounded-control py-2.5 text-body font-medium transition-all ${
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            } ${
              view === FOOT.key
                ? "bg-brand text-white"
                : "text-ink-faint hover:bg-wash hover:text-ink-soft"
            }`}
          >
            <FOOT.icon size={16} weight={view === FOOT.key ? "fill" : "bold"} aria-hidden className="shrink-0" />
            {!collapsed && <span>{FOOT.label}</span>}
          </button>
          {/* A NEW campaign, not the old conversation. Going back to
              the thread that built this one is the one thing this
              button must not do. */}
          {/* It went home and left everything signed in, which was
              honest while nothing survived a reload. Both of those
              changed, so it clears the account and the work with it. */}
          <Link
            href="/"
            onClick={() => resetAll()}
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
