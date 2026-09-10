"use client";

/* The assistant, as a rail beside the dashboard.
 *
 * The shape is borrowed from the assistants people already have open
 * next to their work: a narrow column pinned to the right, a
 * conversation that scrolls, a card for each thing the assistant
 * actually DID, and a message box at the bottom. What it is not is a
 * chat window floating over the page — it takes its own column, and
 * the dashboard reflows beside it, because a panel that covers what
 * you are asking about is the wrong panel.
 *
 * Two things are load-bearing and neither is decoration:
 *
 *   Every action it takes leaves a CARD in the thread, naming the view
 *   it moved you to or the request it prepared. A conversation where
 *   the agent says "done" and something changes off-screen is the
 *   thing this product exists not to be.
 *
 *   Approving is a request, never a completion. The assistant builds
 *   the list and the brand presses the button, which is the same rule
 *   the builder works under and the reason a text box can sit this
 *   close to live money at all.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUp, CaretRight, Check, Sparkle, X } from "@phosphor-icons/react";
import {
  dashboardChips,
  interpretDashboard,
  type DashboardView,
} from "../../lib/agent/dashboard";
import {
  putApproval,
  undoActivity,
  useActivity,
  useAds,
} from "../../lib/store";
import { useGo } from "../../lib/surface";
import { livePhase } from "../../lib/mock/campaigns";
import { tools } from "../../lib/agent/tools";
import type { ApprovalRequest } from "../../lib/agent/types";
import { ApprovalBlock } from "../blocks";
import { Typed } from "../Stream";

type Turn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "agent"; text: string; typed?: boolean }
  /** What the assistant did, named. A view it opened, or a request it
      prepared — never a thing that happened quietly. */
  | { id: string; role: "did"; label: string; detail: string }
  | { id: string; role: "approval"; req: ApprovalRequest };

const VIEW_LABEL: Record<DashboardView, string> = {
  campaign: "Campaign",
  inbox: "Needs you",
  ads: "Ads",
  activity: "Activity",
  autonomy: "Autonomy",
};

let seq = 0;
const nid = (p: string) => `${p}-${seq++}`;

export function DashboardAssistant({ onClose }: { onClose?: () => void }) {
  const ads = useAds();
  const activity = useActivity();
  const phase = livePhase() ?? null;
  const undoable = activity.find((a) => !a.undone && a.undoable) ?? null;
  /* Moves whichever surface this rail is mounted on, which is the
     dashboard — it must not reach across and repoint the chat. */
  const go = useGo();

  const [turns, setTurns] = useState<Turn[]>(() => [
    {
      id: nid("t"),
      role: "agent",
      text:
        "I am watching this phase while it runs. Ask me how it is doing, tell me to pull up the drafts waiting on " +
        "you, or have me prepare an approval for all of them. I can undo anything I did on my own.\n\n" +
        "I cannot publish, move money or sign. Those stay yours.",
      typed: true,
    },
  ]);
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  /* Distributive Omit, so each member of the union keeps its own
     fields. A plain `Omit<Turn, "id">` collapses them into the shared
     ones and rejects every real turn. */
  type NewTurn = Turn extends infer T ? (T extends Turn ? Omit<T, "id"> : never) : never;
  const add = (t: NewTurn) => setTurns((ts) => [...ts, { ...t, id: nid("t") } as Turn]);

  const send = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    add({ role: "user", text: v });
    setText("");

    const intent = interpretDashboard({ text: v, phase, ads, undoable: !!undoable });
    add({ role: "agent", text: intent.say, typed: true });

    switch (intent.kind) {
      case "open":
        go(intent.view);
        add({
          role: "did",
          label: `Opened ${VIEW_LABEL[intent.view]}`,
          detail: "The page beside this moved with it",
        });
        return;
      case "approve-all": {
        const waiting = ads.filter((a) => a.state === "waiting");
        const req = tools.request_approval({ adIds: waiting.map((a) => a.id) });
        putApproval(req);
        go("ads");
        add({ role: "approval", req });
        return;
      }
      case "undo":
        if (undoable) {
          undoActivity(undoable.id);
          add({ role: "did", label: `Undid “${undoable.title}”`, detail: "Reverted, and still in the log" });
        }
        return;
      default:
        return;
    }
  };

  const chips = dashboardChips(phase, ads, !!undoable);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline px-4">
        <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full bg-brand text-[11px] text-white">
          ✦
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">Ask MoonTech</p>
          <p className="truncate text-[11px] text-ink-faint">About this phase, while it runs</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close the assistant"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-control text-ink-faint transition hover:bg-black/[0.05] hover:text-ink"
          >
            <X size={15} aria-hidden />
          </button>
        )}
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {turns.map((t) => {
          if (t.role === "user") {
            return (
              <div key={t.id} className="flex justify-end gap-2">
                <p className="max-w-[85%] whitespace-pre-line rounded-[16px] bg-black/[0.05] px-3 py-2 text-[13px] leading-5 text-ink">
                  {t.text}
                </p>
              </div>
            );
          }
          if (t.role === "did") {
            /* A card for every action, so the thread is a record of
               what changed and not only of what was said. */
            return (
              <div
                key={t.id}
                className="flex items-center gap-2.5 rounded-control border border-hairline bg-neutral-50 px-3 py-2.5"
              >
                <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-good/15 text-good-deep">
                  <Check size={11} weight="bold" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-ink">{t.label}</span>
                  <span className="block truncate text-[11px] text-ink-faint">{t.detail}</span>
                </span>
                <CaretRight size={12} className="shrink-0 text-ink-faint rtl:rotate-180" aria-hidden />
              </div>
            );
          }
          if (t.role === "approval") {
            return <ApprovalBlock key={t.id} req={t.req} />;
          }
          return (
            <div key={t.id} className="text-[13px] leading-6 text-ink">
              {t.typed ? <Typed text={t.text} /> : <p className="whitespace-pre-line">{t.text}</p>}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-hairline px-3 pb-3 pt-2.5">
        {chips.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => send(c)}
                className="rounded-pill border border-black/[0.09] bg-white px-2.5 py-1 text-[11px] font-medium text-ink-soft transition hover:border-brand/40 hover:text-brand"
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-[20px] border border-black/[0.1] bg-white px-3 py-2 transition focus-within:border-brand/40">
          <Sparkle size={14} weight="fill" className="mb-1.5 shrink-0 text-brand/60" aria-hidden />
          <textarea
            ref={box}
            rows={1}
            value={text}
            placeholder="Ask, or tell me what to do"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(text);
              }
            }}
            aria-label="Ask the assistant"
            className="max-h-[160px] min-h-[22px] flex-1 resize-none bg-transparent py-0.5 text-[13px] leading-5 text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            onClick={() => send(text)}
            disabled={!text.trim()}
            aria-label="Send"
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition ${
              text.trim() ? "bg-ink text-white hover:bg-ink/85" : "bg-neutral-200 text-white"
            }`}
          >
            <ArrowUp size={13} weight="bold" aria-hidden />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-ink-faint">
          I cannot publish, move money or sign.
        </p>
      </div>
    </div>
  );
}
