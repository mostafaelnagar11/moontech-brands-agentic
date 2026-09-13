/* The assistant that sits beside a RUNNING campaign.

   A different agent from the one at `/c`, on purpose. That one knows a
   store and builds a campaign from it, and its job is finished the
   moment the store is connected. This one knows a phase in flight:
   what has been attributed, what is waiting on approval, what the
   agents did on their own overnight.

   It obeys the same two rules as the builder, and they are what make
   it safe to put a text box next to live money:

     1. Nothing irreversible happens in here. Asking it to approve
        every waiting draft produces a REQUEST, which the brand
        confirms with a press. The assistant cannot publish, cannot
        move money and cannot sign.
     2. Every number it says traces back to the same `Sourced` figures
        the panels render. It never computes a second version of a
        figure that is already on screen.

   `interpretDashboard` is regexes, and says so. Swap in a model and
   this file is the only thing that changes: the panel talks to
   `DashboardIntent` and nothing else. */

import type { Phase } from "../mock/campaigns";
import { fmtUSD, pace, phaseTitle } from "../mock/campaigns";
import type { AdRecord } from "./types";

/** The five things the dashboard can show. Mirrors the panel keys so
    an intent can be handed straight to the view switcher. */
export type DashboardView = "home" | "campaign" | "creators" | "inbox" | "ads" | "activity" | "autonomy";

export type DashboardIntent =
  /** Open a view. The assistant answers in a sentence and the page moves. */
  | { kind: "open"; view: DashboardView; say: string }
  /** Answer a question in prose, from figures already on screen. */
  | { kind: "answer"; say: string }
  /** Prepare an approval. Nothing publishes until the brand presses. */
  | { kind: "approve-all"; say: string }
  /** Undo the most recent thing an agent did on its own. */
  | { kind: "undo"; say: string }
  /** Understood nothing. Says what it CAN do rather than apologising. */
  | { kind: "unknown"; say: string };

const VIEW_WORDS: { view: DashboardView; re: RegExp; say: string }[] = [
  {
    view: "creators",
    re: /\b(creators?|influencers?|talent|roster|who (are|is)|shortlist)\b/,
    say: "Everyone HeyMoon has brought you, with why each one was matched. A like or a pass shapes the next batch; nobody is booked or told.",
  },
  {
    view: "ads",
    re: /\b(ads?|drafts?|creatives?|approvals?|approval queue|what.s waiting|review)\b/,
    say: "Here is the queue. Every draft carries HeyMoon's check against the brief it wrote, and nothing goes out until you decide on it.",
  },
  {
    view: "inbox",
    re: /\b(needs me|needs you|inbox|to.?do|what should i do|what do you need|outstanding)\b/,
    say: "Everything waiting on you, ordered by what it costs to leave it: money first, then work that is blocking sales, then things that only need acknowledging.",
  },
  {
    view: "activity",
    re: /\b(activity|on your own|what did you do|autonomous|by yourself|overnight|undo)\b/,
    say: "Everything I did without asking, newest first. Each one carries the permission it used, why I did it, what changed, and an undo.",
  },
  {
    view: "autonomy",
    re: /\b(autonomy|permissions?|allowed|may you|can you do|rules|settings)\b/,
    say: "These are my permissions. Moving money, publishing and signing are fixed at never and cannot be turned on. Not by you, not by me.",
  },
  {
    view: "campaign",
    re: /\b(campaign|phase|dashboard|overview|home|how.s it going|how is it going|how are we doing|pace|forecast|revenue|target|performance|report|numbers)\b/,
    say: "",
  },
];

/** How the phase is doing, in the assistant's own words, from the same
    figures the monitor above it renders. */
export function paceSentence(phase: Phase | null, ads: AdRecord[]): string {
  if (!phase) return "Nothing is running yet, so there is nothing to report on.";
  const p = pace(phase);
  const waiting = ads.filter((a) => a.state === "waiting").length;
  const liveNow = ads.filter((a) => a.state === "live").length;
  if (!p) return `${phaseTitle(phase.phaseNo)} has not started.`;
  const head =
    `${fmtUSD(phase.rev)} attributed so far against a ${fmtUSD(phase.revTarget ?? 0)} target, ` +
    `on day ${phase.dayOfPhase} of ${phase.plannedDays}.`;
  const rate =
    `At ${fmtUSD(Math.round(p.perDay))} a day that lands near ${fmtUSD(Math.round(p.atEnd))}, ` +
    `${Math.round(p.pctForecast)}% of target.`;
  const gate = p.daysToUnlock === 0
    ? `The 80% line is already crossed, so the next phase is unlocked.`
    : `The 80% line is ${p.daysToUnlock} days out, with ${p.daysLeft} left in the window.`;
  const you = waiting
    ? `${liveNow} ads are live and ${waiting} are waiting on you. Approving them is the single biggest thing that moves this.`
    : `${liveNow} ads are live and nothing is waiting on you.`;
  return `${head} ${rate} ${gate}\n\n${you}`;
}

/** What the assistant understood. Regexes, deliberately — the same
    honest fake as the builder's `interpret`, and the same seam. */
export function interpretDashboard(i: {
  text: string;
  phase: Phase | null;
  ads: AdRecord[];
  undoable: boolean;
}): DashboardIntent {
  const lower = i.text.trim().toLowerCase();
  const waiting = i.ads.filter((a) => a.state === "waiting");

  /* Approving is the only thing here that touches the outside world,
     so it is checked first and it never completes on its own. */
  if (/\b(approve|publish|push|send)\b.*\b(all|everything|them|the drafts?|the queue)\b|\bapprove all\b|\bbatch approve\b/.test(lower)) {
    if (!waiting.length) {
      return { kind: "answer", say: "Nothing is waiting on you. Every draft in this phase is already decided." };
    }
    const held = waiting.filter((a) => a.compliance.verdict === "hold").length;
    return {
      kind: "approve-all",
      say:
        `${waiting.length} drafts are waiting, and ${held ? `I would hold ${held} of them` : "I would approve all of them"}. ` +
        `Here is the list, with what I make of each. I have prepared it; pressing it is yours, and I cannot publish anything myself.`,
    };
  }

  if (/\bundo\b|\bput (that|it) back\b|\brevert\b|\broll ?back\b/.test(lower)) {
    return i.undoable
      ? { kind: "undo", say: "Undone, and put back the way it was. It is still in the log with the undo recorded against it." }
      : { kind: "answer", say: "There is nothing of mine left to undo. Everything I did on my own is either still standing or already reverted." };
  }

  /* A question about the numbers is answered rather than navigated to.
     Checked before the view words, because "how is it going" contains
     none of them and "revenue" would otherwise just open a tab. */
  if (/\bhow (is|are|.s)\b|\bhow much\b|\bon track\b|\bwill (we|it)\b|\bwhat.s the (number|revenue|pace)\b|\bpace\b|\bforecast\b|\bon pace\b/.test(lower)) {
    return { kind: "answer", say: paceSentence(i.phase, i.ads) };
  }

  for (const v of VIEW_WORDS) {
    if (!v.re.test(lower)) continue;
    if (v.view === "campaign") {
      return { kind: "open", view: "campaign", say: paceSentence(i.phase, i.ads) };
    }
    return { kind: "open", view: v.view, say: v.say };
  }

  return {
    kind: "unknown",
    say:
      "I did not follow that one. While a phase is running I can tell you how it is doing against the guarantee, " +
      "show you the drafts waiting on you, prepare an approval for all of them, walk you through anything I did on " +
      "my own and undo it, or show you what I am allowed to do without asking.",
  };
}

/** The chips under the composer, chosen from what is actually true of
    the phase right now rather than from a fixed list. */
export function dashboardChips(phase: Phase | null, ads: AdRecord[], undoable: boolean): string[] {
  const waiting = ads.filter((a) => a.state === "waiting").length;
  const out: string[] = [];
  if (waiting) out.push("Approve all", "Show me the drafts");
  out.push(phase ? "How is it doing?" : "What happens next?");
  if (undoable) out.push("What did you do on your own?");
  return out.slice(0, 4);
}
