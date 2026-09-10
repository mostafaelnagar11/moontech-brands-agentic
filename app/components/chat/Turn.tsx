"use client";

/* A turn in the conversation.
 *
 * The assistant does not speak from a bubble. A bubble is for a message
 * between people; what the agent produces is a document being written
 * in front of you, so it is plain prose in the column with a small mark
 * in the gutter. Consecutive assistant turns share one mark, the way a
 * speaker is named once and then just keeps talking.
 *
 * The brand does get a bubble, because their turns are short and need
 * to be findable when you scroll back. It is a tint, not a solid fill —
 * a saturated purple block reads as a system notification rather than
 * as something you said.
 */

import type { ReactNode } from "react";

export function AgentTurn({ children, mark = true }: { children: ReactNode; mark?: boolean }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden className="w-7 shrink-0">
        {mark && (
          <span className="mt-[3px] grid h-7 w-7 place-items-center rounded-full bg-brand text-[12px] leading-none text-white">
            ✦
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function UserTurn({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[80%] whitespace-pre-line rounded-[18px] bg-brand/[0.07] px-4 py-2.5 text-prose text-ink">
        {text}
      </p>
    </div>
  );
}

/** A card in the conversation. It lines up with the agent's prose rather
    than with the gutter, so a block reads as part of what it just said. */
export function BlockRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden className="w-7 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
