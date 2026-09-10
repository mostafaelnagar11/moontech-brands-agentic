"use client";

/* Which surface a panel is rendered on.
 *
 * The five running views — Campaign, Needs you, Ads, Activity,
 * Autonomy — render in two places: the dashboard's main column, and
 * (as a fallback card) the conversation's panel. Their cross-links
 * cannot know which, and for a while they did not have to: both
 * surfaces read one `panel.view` field out of the store, so
 * `openPanel("ads")` moved whichever one you were looking at.
 *
 * That was wrong in two ways at once, and an adversarial pass caught
 * both. `openPanel` sets `open: true` as well as the view, so pressing
 * "See all, and undo" on the dashboard armed a panel on a surface the
 * brand was not on — and the next visit to /c opened on a card reading
 * "this lives in your dashboard", covering the conversation entirely
 * on a phone. And because the field is shared, moving around the
 * dashboard destroyed whatever the conversation had left open in it.
 *
 * One field, two owners. The fix is not to be cleverer about the
 * field; it is to stop sharing it. Each surface now keeps its own
 * view, and hands its children a `go` through this context. A
 * component that links to another view asks for `useGo()` and does not
 * learn where it is.
 */

import { createContext, useContext, type ReactNode } from "react";
import { openPanel, type PanelView } from "./store";

/** The default is the conversation's panel, because that is where
    these components rendered first and it keeps every existing call
    site behaving exactly as it did. */
const SurfaceContext = createContext<(view: PanelView) => void>(openPanel);

export function SurfaceProvider({ go, children }: { go: (view: PanelView) => void; children: ReactNode }) {
  return <SurfaceContext.Provider value={go}>{children}</SurfaceContext.Provider>;
}

/** Move to another view, on whichever surface this component is on. */
export const useGo = () => useContext(SurfaceContext);
