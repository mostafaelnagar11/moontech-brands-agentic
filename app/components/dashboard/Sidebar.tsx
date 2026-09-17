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
  ClockCounterClockwise,
  House,
  Megaphone,
  Gear,
  SignOut,
  SquaresFour,
  UsersThree,
  Tray,
  X,
  type Icon,
} from "@phosphor-icons/react";
import type { DashboardView } from "../../lib/agent/dashboard";
import {
  campaignLabel, renameCampaign, resetAll, setActiveCampaign, startConversation, useCampaigns, useStore,
  type Campaign,
} from "../../lib/store";
import { getRead } from "../../lib/agent/registry";

/* Six rows, two ranks. Creators, Needs you, Ads and Activity are all
   views OF a campaign — swap the campaign in the switcher above and
   every one of them changes underneath you — so they were six siblings
   pretending to be six destinations. They are indented under Campaigns
   now, which is the thing they belong to, and Dashboard stays where it
   is because it spans every campaign rather than describing one.

   Kept as one flat list with a `child` flag rather than a tree: the
   view validator and the assistant both read `NAV` as a set of keys,
   and nesting the data would have made two consumers walk it. */
export const NAV: { key: DashboardView; label: string; icon: Icon; child?: boolean }[] = [
  { key: "home", label: "Dashboard", icon: SquaresFour },
  { key: "campaign", label: "Campaigns", icon: House },
  { key: "creators", label: "Creators", icon: UsersThree, child: true },
  { key: "inbox", label: "Needs you", icon: Tray, child: true },
  { key: "ads", label: "Ads", icon: Megaphone, child: true },
  { key: "activity", label: "Activity", icon: ClockCounterClockwise, child: true },
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
  const label = campaign ? campaignLabel(campaign) : "";
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

function Content({ collapsed, view, onView, waiting, brandName, onMobileClose }: Props) {
  const [switcher, setSwitcher] = useState(false);
  const campaigns = useCampaigns();
  const activeId = useStore((s) => s.activeCampaignId);
  const active = campaigns.find((c) => c.id === activeId) ?? null;
  const switcherWrap = useRef<HTMLDivElement>(null);

  /* A menu that only closes by pressing the thing that opened it is a
     menu people leave open, the same rule the top bar's avatar uses. */
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
    <div className={`flex h-full flex-col overflow-y-auto bg-white py-5 ${collapsed ? "items-center px-2" : "px-3"}`}>
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
      {!collapsed && (
        <div className="relative mb-5 px-1" ref={switcherWrap}>
          <button
            onClick={() => setSwitcher((o) => !o)}
            aria-expanded={switcher}
            aria-haspopup="menu"
            className="flex w-full items-center gap-2.5 rounded-control border border-hairline bg-wash px-3 py-2 text-start transition hover:bg-brand-100/60"
          >
            <BrandMark campaign={active} size={28} />
            <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink-soft">{brandName}</span>
            <CaretDown
              size={11}
              weight="bold"
              aria-hidden
              className={`shrink-0 text-ink-faint transition ${switcher ? "rotate-180" : ""}`}
            />
          </button>

          {switcher && (
            <div
              role="menu"
              className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-control border border-hairline bg-white shadow-float"
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
                      <span className="block truncate text-meta font-semibold text-ink">{campaignLabel(c)}</span>
                      <span className="block truncate text-[10px] text-ink-faint">{c.paid ? "Running" : "Not started"}</span>
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
              /* The rank is drawn with an indent and a guide, not with
                 a smaller type size: a child row is still a destination
                 and still has to be as easy to hit as its parent. At
                 60px there is no room to indent anything, so a
                 collapsed rail shows six equal icons and the grouping
                 lives in the order alone. */
              className={`relative flex items-center rounded-control py-2.5 text-left text-body font-medium transition-all ${
                collapsed ? "justify-center px-0" : item.child ? "gap-3 ps-9 pe-3" : "gap-3 px-3"
              } ${
                active
                  ? "bg-brand text-white shadow-md shadow-violet-200"
                  : "text-ink-faint hover:bg-wash hover:text-ink-soft"
              }`}
            >
              {!collapsed && item.child && (
                <span
                  aria-hidden
                  className={`absolute inset-y-0 start-[19px] w-px ${active ? "bg-white/25" : "bg-hairline"}`}
                />
              )}
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
