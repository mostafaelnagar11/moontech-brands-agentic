"use client";

/* What we found on the store, beside the conversation.

   The read used to be a page you were sent to. It is now the reference
   view next to the chat: every layer, the evidence under each one, and
   the three corrections a brand can make in place — Yes, Fix this, Add
   something. A correction is kept beside the agent's own value rather
   than replacing it silently, so the plan can always say what it
   believed and what it was told.

   Nothing here re-runs the read and nothing here builds a campaign.
   Both of those are things the agent does, and the agent is in the
   conversation — this panel is the record it works from.

   Eligibility is ONE LINE inside the read, in its own row like every
   other finding. It is not a gate in front of the product. When a store
   is short of the traffic floor the read still stands, and what we
   learned, what is missing and the way back sit underneath it. */

import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle, Info, PencilSimple, Plus, WarningCircle } from "@phosphor-icons/react";
import { READ_TASKS } from "../../lib/agent/tools";
import type { BrandRead, Correction, ReadLayerKey } from "../../lib/agent/types";

/* Which agent found a layer. The evidence is attributed to the agent
   that gathered it, so the panel reads as work done rather than as a
   list of citations. */
const agentFor = (k: ReadLayerKey) => READ_TASKS.find((t) => t.key === k)?.agent ?? "An agent";
import { useT } from "../../lib/i18n";
import { clearReadFocus, correctRead, useReadFocus, useStore } from "../../lib/store";
import { EvidenceRow } from "../Evidence";
import { READ_ORDER, ReadValue, srcFor } from "../ReadValue";
import { RejectedBlock, TaskRoster, rosterTitle } from "../blocks";
import { Btn, Card } from "../ui";

/* Which agent found a layer. The evidence is attributed to the agent
   that gathered it, so the panel reads as work that was done rather
   than as a list of citations. */

export function ReadPanel() {
  const read = useStore((s) => Object.values(s.reads)[0]);

  if (!read) {
    return (
      <p className="text-body leading-6 text-ink-soft">
        Paste your store link in the conversation and the agents will read your store; everything they find lands here.
      </p>
    );
  }

  const short = read.eligibility?.state === "short";

  return (
    <div className="space-y-3">
      {/* The store itself. Not a page header — it is the first finding,
          and the name and line under it were read off the home page. */}
      <Card className="flex items-center gap-3 p-3.5">
        {read.identity?.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={read.identity.logo} alt="" className="h-11 w-11 shrink-0 rounded-control object-cover" />
        ) : (
          <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-brand-100 text-body font-bold text-brand">
            {read.identity?.name.value?.[0] ?? "?"}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">{read.identity?.name.value ?? read.url}</p>
          <p className="mt-0.5 text-meta leading-5 text-ink-soft">{read.identity?.tagline.value}</p>
        </div>
      </Card>

      {/* Who did the work. Kept after the read finishes, because the
          record of named agents on your store is the thing that makes
          this a read rather than a lookup. */}
      <TaskRoster tasks={READ_TASKS} done={read.done} live={false} title={rosterTitle(READ_TASKS, "read your store")} />

      {read.eligibility && <EligibilityRow read={read} />}

      {READ_ORDER.map((k) =>
        read.done.includes(k) ? <Layer key={k} readId={read.id} k={k} read={read} /> : <MissedLayer key={k} k={k} />
      )}

      {short && <RejectedBlock read={read} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One layer, and the three things you can do to it                    */
/* ------------------------------------------------------------------ */

function Layer({ readId, k, read }: { readId: string; k: ReadLayerKey; read: BrandRead }) {
  const { t } = useT();
  const [openEv, setOpenEv] = useState(false);
  const [mode, setMode] = useState<"idle" | "fix" | "add">("idle");
  const [draft, setDraft] = useState("");
  /* Arriving from a tap on this finding in the conversation: scroll to
     it and open the correction box, so the brand lands on the control
     rather than on the list containing it. */
  const focus = useReadFocus();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus !== k) return;
    box.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    setMode("fix");
    setDraft("");
    clearReadFocus();
  }, [focus, k]);
  const src = srcFor(read, k);
  const mine = read.corrections.filter((c) => c.layer === k);
  const confirmed = mine.some((c) => c.field === "confirmed");
  const corrected = mine.filter((c) => c.field !== "confirmed");

  const record = (field: string, was: string, now: string, apply?: (r: BrandRead) => BrandRead) => {
    const c: Correction = { layer: k, field, was, now, at: Date.now() };
    correctRead(readId, c, apply ?? ((r) => r));
  };

  const saveFix = () => {
    if (!draft.trim()) return;
    const was =
      k === "category" ? String(read.category?.value ?? "")
      : k === "voice" ? read.voice?.value.register ?? ""
      : "what HeyMoon found";
    record("value", was, draft.trim(), (r) => {
      if (k === "category" && r.category) {
        return { ...r, category: { ...r.category, value: draft.trim(), setBy: "brand", why: "You corrected this." } };
      }
      return r;
    });
    setDraft(""); setMode("idle");
  };

  const saveAdd = () => {
    if (!draft.trim()) return;
    record("note", "—", draft.trim());
    setDraft(""); setMode("idle");
  };

  /* Stacked, not two columns. A 116px label beside the value takes a
     third of this panel, and the findings are what the brand came to
     read. */
  return (
    <div ref={box}>
    <Card className={`p-3.5 ${focus === k ? "ring-2 ring-brand/30" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t(`layer.${k}`)}</p>
      <div className="mt-1.5">
        <ReadValue read={read} k={k} />
      </div>

      {corrected.length > 0 && (
        <ul className="mt-2.5 space-y-1">
          {corrected.map((c, i) => (
            <li key={i} className="flex items-start gap-2 rounded-control bg-brand/[0.05] px-2.5 py-1.5 text-meta text-brand">
              <PencilSimple size={11} className="mt-1 shrink-0" aria-hidden />
              <span><span className="font-semibold">{t("read.corrected")}:</span> {c.now}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {confirmed ? (
          <span className="inline-flex items-center gap-1.5 rounded-control bg-good/[0.1] px-2.5 py-1.5 text-[11px] font-semibold text-good-deep">
            <Check size={11} weight="bold" aria-hidden /> {t("read.confirmed")}
          </span>
        ) : (
          <button
            onClick={() => record("confirmed", "", "confirmed")}
            className="inline-flex items-center gap-1.5 rounded-control border border-hairline bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft transition hover:border-good/40 hover:text-good-deep"
          >
            <Check size={11} weight="bold" aria-hidden /> {t("read.yes")}
          </button>
        )}
        <button
          onClick={() => { setMode("fix"); setDraft(""); }}
          className="inline-flex items-center gap-1.5 rounded-control border border-hairline bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft transition hover:border-brand/40 hover:text-brand"
        >
          <PencilSimple size={11} aria-hidden /> {t("read.fix")}
        </button>
        <button
          onClick={() => { setMode("add"); setDraft(""); }}
          className="inline-flex items-center gap-1.5 rounded-control border border-hairline bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft transition hover:border-brand/40 hover:text-brand"
        >
          <Plus size={11} weight="bold" aria-hidden /> {t("read.add")}
        </button>
        {src && (
          <button
            onClick={() => setOpenEv((o) => !o)}
            aria-expanded={openEv}
            className="ms-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-brand hover:underline"
          >
            <Info size={12} weight="fill" aria-hidden />
            {openEv ? "Hide the evidence" : `${t("read.evidence")} · ${src.evidence.length}`}
          </button>
        )}
      </div>

      {mode !== "idle" && (
        <div className="mt-2.5">
          <textarea
            autoFocus
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={mode === "fix" ? "What should this say instead?" : "What else should I know about this?"}
            className="w-full resize-none rounded-control border border-black/[0.09] bg-rail p-2.5 text-body text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <div className="mt-2 flex gap-2">
            <Btn size="sm" onClick={mode === "fix" ? saveFix : saveAdd} disabled={!draft.trim()}>{t("read.save")}</Btn>
            <Btn size="sm" variant="ghost" onClick={() => { setMode("idle"); setDraft(""); }}>{t("read.cancelEdit")}</Btn>
          </div>
        </div>
      )}

      {openEv && src && (
        <div className="mt-2 rounded-control border border-brand/15 bg-brand/[0.03] p-2.5">
          <p className="text-[11px] font-semibold text-ink">
            {agentFor(k)} read this off {src.evidence[0]?.label ?? "your store"}:
          </p>
          <p className="mt-0.5 text-meta leading-5 text-ink-soft">{src.why}</p>
          <ul className="mt-1 divide-y divide-hairline">
            {src.evidence.map((e) => <EvidenceRow key={e.id} e={e} />)}
          </ul>
        </div>
      )}
    </Card>
    </div>
  );
}

/** A layer the read never reached — a stopped read keeps what it had,
    and says plainly what it did not get to rather than leaving a gap. */
function MissedLayer({ k }: { k: ReadLayerKey }) {
  const { t } = useT();
  return (
    <Card className="p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t(`layer.${k}`)}</p>
      <p className="mt-1 text-meta leading-5 text-ink-faint">
        The read stopped before this one. Ask me to keep reading and I will finish it.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Eligibility, as one line                                            */
/* ------------------------------------------------------------------ */

function EligibilityRow({ read }: { read: BrandRead }) {
  const [open, setOpen] = useState(false);
  const e = read.eligibility!;
  const ok = e.state === "ok";
  return (
    <Card className={`p-3.5 ${ok ? "border-good/25 bg-good/[0.04]" : "border-danger/25 bg-danger/[0.04]"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Eligibility</p>
      <p className={`mt-1.5 flex items-start gap-2 text-body font-semibold leading-6 ${ok ? "text-good-deep" : "text-danger"}`}>
        {ok
          ? <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          : <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0" aria-hidden />}
        {e.line.value}
      </p>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-brand hover:underline"
      >
        <Info size={12} weight="fill" aria-hidden />
        {open ? "Hide" : "Why this matters, and where the number came from"}
      </button>
      {open && (
        <div className="mt-2 rounded-control border border-hairline bg-white p-2.5">
          <p className="text-meta leading-5 text-ink-soft">{e.line.why}</p>
          <ul className="mt-1 divide-y divide-hairline">
            {e.line.evidence.map((x) => <EvidenceRow key={x.id} e={x} />)}
          </ul>
        </div>
      )}
    </Card>
  );
}
