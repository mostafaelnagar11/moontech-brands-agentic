"use client";

/* The application.

   One surface: a rail of conversations, the conversation itself, and one
   panel beside it. Every screen this product used to have is now either a
   block in this conversation or a view in that panel, so there is no
   navigation to speak of — the only two places a brand can act are the
   message box and the panel.

   The rule this screen exists to demonstrate: free text changes the
   actual plan. Typing "Kuwait only" re-derives the market fit of every
   creator, drops the ones whose audience is not there, rebuilds the
   crew the warm-up can afford and moves the guarantee — and every one
   of those changes is attributed back to the sentence that caused it.

   What free text never changes is the price. Phase 1 is a $1,000
   warm-up for every brand, so there is no budget in this conversation
   to raise, lower or negotiate; where a brand asks, the agent explains
   why it does not move rather than offering a number it will not
   honour. What the brand does choose is what the thousand is pointed
   at, and therefore what we are willing to guarantee on it.

   The order of the whole thing is fixed and the agent says so out loud:
   read the store → propose the campaign → start Phase 1 (pay) → connect
   the store. The connection comes LAST because it measures the guarantee
   rather than qualifying the brand, and the copy explains that rather
   than leaving the brand to wonder why. */

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { SignInSheet } from "../components/SignInSheet";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BUILD_TASKS, PHASE1_BUDGET, ladderTotals, marketName, repair, suggestPlanShape,
  tools, underwriting,
  type Repair,
} from "../lib/agent/tools";
import type { BrandRead, Plan, PlanChange, PlanPatch, Report } from "../lib/agent/types";
import {
  PLAN_BUDGET_MAX, PLAN_BUDGET_MIN, ROAS_MAX, ROAS_MIN,
  budgetForHigh, budgetForMedium, getConfidence, roasForHigh, roasForMedium,
} from "../lib/agent/model";
import { useStream } from "../lib/agent/useStream";
import {
  activePlanLive, activeThread, claimOnce, correctRead, markPaid, openPanel, useAccount,
  push, putApproval, putCampaign, putFunding, putPlan, putRead, threadIsEmpty,
  useActivePlan, useAds, useCampaigns, useActiveThreadId, useLivePhase, usePaid, usePhaseRequested,
  useStore, type PanelView,
} from "../lib/store";
import { fmtUSD } from "../lib/mock/campaigns";
import { getRead, readIdFor } from "../lib/agent/registry";
import { normaliseUrl } from "../lib/mock/reads";
import { useT } from "../lib/i18n";
import { Btn, Card } from "../components/ui";
import { Thinking, Typed, WorkingLine } from "../components/Stream";
import { ChatShell } from "../components/chat/ChatShell";
import { Composer } from "../components/chat/Composer";
import { PanelHost } from "../components/chat/PanelHost";
import { AgentTurn, BlockRow, UserTurn } from "../components/chat/Turn";
import {
  AdCardBlock, ApprovalBlock, BriefBlock, ChangesBlock, ChecklistBlock, ConfidenceBar, ConfidenceBlock,
  CreatorBlock, FundingBlock, LadderBlock, PlanBlock, ReadBlock, ReceiptBlock,
  RejectedBlock, ReportBlock, TaskRoster, countWord, rosterTitle,
} from "../components/blocks";
import { PlanCard } from "../components/PlanCard";

/* What the Phase 1 payment was made against. After the phase is paid an
   edit to any of these is not applied — the agent carries it into Phase 2
   instead. The brief and the audience can still move, because they change
   what the creators are told, not what the brand was charged. */
const touchesLocked = (p: PlanPatch) =>
  p.budget !== undefined || p.strategy !== undefined || p.guaranteedRoas !== undefined ||
  p.markets !== undefined || !!p.dropCreatorIds?.length || !!p.addCreatorIds?.length || !!p.setCrewIds?.length;

/* The chips offered when the agent is not waiting on a specific answer.
   Before payment they are things a brand can actually change; none of
   them names a creator, because names are held back until Phase 1
   starts, and none of them offers to move the budget, because the
   warm-up price is the same for everybody. After payment the plan is
   locked, so they are about what happens now. */
const WHY_CHIP = `Why is it ${fmtUSD(PHASE1_BUDGET)}?`;
const PRE_CHIPS = ["Kuwait only", "Women 25 to 45", "Guarantee 8x instead", WHY_CHIP];
/* After payment there is exactly one thing left to do, and it is now
   ON the dashboard: the connect step moved there, because a task with
   no deadline does not belong in a thread that scrolls away. So the
   dashboard leads for a brand who has not connected yet — it is where
   the step is — and sits second once there is a running phase to look
   at instead. */
const POST_CHIPS = ["What happens next?", "Go to the dashboard"];
const POST_CHIPS_UNCONNECTED = ["Go to the dashboard", "What happens next?"];

/* The brand never reads a staffing chart. What the agents are called,
   how many of them there are and which one found what is our business;
   the brand is told the result. The only place a name may appear is a
   roster block, and never in a sentence. */

/** "a, b and c" — the agent speaks, so it does not use a serial comma. */
const listOf = (parts: string[]) =>
  parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

/** "Three creators" — the count as a word, at the start of a sentence. */
const countUp = (n: number) => {
  const w = countWord(n);
  return `${w[0].toUpperCase()}${w.slice(1)}`;
};

/* The disclaimer is about the decision it sits under, so it only sits
   under that decision. Once Phase 1 is paid there is nothing left to
   check before paying, and a line that repeats a warning about a step
   already taken teaches a brand to stop reading the composer. */
const NOTE = "Check the details before you pay.";

/* A domain, with or without a scheme or a path. Deliberately narrow —
   it only has to beat "Kuwait only" and "guarantee 8x", not validate a
   URL, and `normaliseUrl` does the tidying afterwards. */
const LOOKS_LIKE_STORE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;

const ALREADY_PAID = "Phase 1 is already started and paid. Phase 2 opens when Phase 1 reaches 80% of its sales target.";
const LOCKED = "Phase 1 is paid and its plan is locked. I will carry that change into Phase 2 when it is offered.";
const SHOW_PHASES = "All three phases. You're starting the first.";

/* "See all three phases" and the ways a person actually says it. */
const PHASES_RE = /three phases|the phases|later phases|other phases|next phases|further phases|phases? (2|3|two|three)|whole plan|big picture/;

/* Four views a brand may simply name. `interpret` knows about the plan,
   not about the panel, so these are caught here — after everything it
   can answer, and before the agent admits it did not understand. */
const PANEL_INTENT: { re: RegExp; view: PanelView; say: string }[] = [
  {
    re: /\bads?\b|\bcreatives?\b/,
    view: "ads",
    say: "Opening every ad in the panel. Each one shows how it is doing and whether it is waiting on you.",
  },
  {
    re: /\binbox\b|needs (me|you)|waiting on me/,
    view: "inbox",
    say: "Opening what needs you, in the panel. Nothing on it goes out without your approval.",
  },
  {
    re: /\bactivity\b|on your own|what have you done/,
    view: "activity",
    say: "Opening what I did on my own, in the panel. Each one carries its reason and an undo.",
  },
  {
    re: /\bautonomy\b|what (can|may) you do|without asking/,
    view: "autonomy",
    say: "Opening what I may do alone, in the panel. Moving money and publishing are never on that list.",
  },
];

function ChatInner() {
  const { t } = useT();
  const router = useRouter();
  const plan = useActivePlan();
  const thread = useStore(activeThread);
  const threadId = useActiveThreadId();
  /* The phase this conversation's campaign is running, if any. Read
     from the store rather than from the module fixture, which is one
     ladder for the whole app and returned another campaign's numbers
     the moment there were two. */
  const livePhase = useLivePhase();
  const funding = useStore((s) => s.funding);
  const approvals = useStore((s) => s.approvals);
  const connected = useStore((s) => (s.activeCampaignId ? s.campaigns[s.activeCampaignId]?.connectedStore ?? null : null));
  const account = useAccount();
  const [signInOpen, setSignIn] = useState(false);
  /* The chips the thread offers once Phase 1 is paid for. */
  const postChips = connected ? POST_CHIPS : POST_CHIPS_UNCONNECTED;
  const ads = useAds();
  const paid = usePaid();

  const campaignCount = useCampaigns().length;
  /* Whether Phase 1's payment card is already in the thread. Used to
     drop the "Start Phase 1" chip, for the same reason the ladder
     drops its button: the card below is the live one. */
  const requested = usePhaseRequested(plan?.id, 1);
  /* "Start Phase 1" comes out of the chip row the moment the card
     asking for it is on screen. Filtered HERE, at render, not where
     each list is written: `setAsking` stores a snapshot, so a list
     filtered when it was asked keeps the chip that was correct then
     and is wrong now. */
  const liveChips = (opts: string[]) => (requested ? opts.filter((o) => o !== "Start Phase 1") : opts);
  const [text, setText] = useState("");
  const [changes, setChanges] = useState<Record<string, PlanChange[]>>({});
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [fix, setFix] = useState<Repair | null>(null);
  /* Chips the agent is currently waiting on an answer to. A question it
     asks and then forgets is not a conversation. */
  const [asking, setAsking] = useState<{ q: string; options: string[] } | null>(null);
  /* After the read the agent asks whether it looks right before building.
     "Something's off" parks the build until the brand says what — the
     next message is recorded as a correction and the build proceeds. */
  const [pendingRead, setPendingRead] = useState<BrandRead | null>(null);
  /* The two numbers the calculator owns, before there is a plan to hold
     them. Once the plan exists it is the source of truth and this only
     mirrors it. */
  const [shape, setShape] = useState(() => suggestPlanShape(5));
  const [shapeSettled, setShapeSettled] = useState(false);
  /* The calculator IS the question while it is open. Chips underneath it
     would offer a second answer to a question the block already asks. */
  /* The agent is waiting on two numbers. This is not a form — it is a
     question, and it stays open until the brand answers it in words. */
  /* Whether the two-numbers question is on the table.
 
     This used to be detected by grepping the thread for the phrase
     "two numbers to settle". Rewriting that sentence silently killed
     the entire calculator: `awaitingShape` went permanently false, and
     answering "$60,000 at 5×" fell through to the plan interpreter,
     which read the 5× as a strategy change. A copy edit should never
     be able to switch off a branch of the product, so the state is
     state now and the sentence is just a sentence. */
  const [shapeAsked, setShapeAsked] = useState(false);
  const awaitingShape = shapeAsked && !shapeSettled && !plan;
  const [awaitingCorrection, setAwaitingCorrection] = useState(false);
  /* Which agent messages have finished typing. Held here rather than in
     the store: it is a property of this viewing, not of the thread. */
  const [typedDone, setTypedDone] = useState<Record<string, true>>({});
  const finish = (id: string) => setTypedDone((d) => (d[id] ? d : { ...d, [id]: true }));
  /* Only the newest message types. Everything above it is history and
     renders whole — otherwise coming back to the conversation would set
     the entire transcript retyping. */
  const lastSay = [...thread].reverse().find((i) => i.kind === "say");
  const isTyping = !!lastSay && !typedDone[lastSay.id];
  /* While it types, nothing below it is shown. A card that lands before
     the sentence introducing it reads as two things happening at once. */
  const visible = isTyping
    ? thread.slice(0, thread.findIndex((i) => i.id === lastSay!.id) + 1)
    : thread;
  const qs = useSearchParams();
  const buildFor = qs.get("build");
  const readUrl = qs.get("read") ? normaliseUrl(qs.get("read")!) : null;
  const build = useStream<Plan>();
  /* The build roster waits for the sentence introducing it. Declared
     after the stream handle, not beside `visible`, which runs first. */
  const rosterReady = build.status === "running" && !isTyping;
  const readRun = useStream<BrandRead>();
  const reads = useStore((s) => s.reads);
  const scroller = useRef<HTMLDivElement>(null);
  const report = useStream<Report>();

  /* Only one run is ever open at a time, so the composer needs one
     handle rather than three. Cancelling from down there is the same
     cancel the thread used to offer beside the progress line — that
     control moved into the message box, where every chat people
     already use keeps it. */
  const stop =
    readRun.status === "running" ? readRun.cancel :
    build.status === "running" ? build.cancel :
    report.status === "running" ? report.cancel :
    null;

  /* The read this conversation is about, if it has already been done —
     by this thread earlier, or before the panel was opened on it. */
  const storedRead = readUrl ? reads[readIdFor(readUrl)] ?? null : null;

  /* Bring the TOP of the newest turn to the top of the column, and
     leave it there.
 
     This used to jump to the bottom of the scroller on every change,
     and then again on every typewriter tick. On a long answer that
     means the brand watches the last line being written and never sees
     the first — you read the end of a paragraph, then scroll back up
     to find out what it was about. Alex caught it on the review call.
 
     Measured against the two rects rather than `offsetTop`, which is
     relative to the nearest positioned ancestor and would silently
     change meaning if anything between here and the turn ever gained
     `position: relative`. `scrollTo` clamps, so a short thread simply
     lands where it can. */
  const park = useCallback((smooth: boolean) => {
    const box = scroller.current;
    if (!box) return;
    const last = box.querySelector<HTMLElement>("[data-last-turn]");
    if (!last) return;
    const top = box.scrollTop + (last.getBoundingClientRect().top - box.getBoundingClientRect().top) - 16;
    box.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => { park(true); }, [thread.length, report.partial, park]);

  /* The build happens HERE, in the conversation, not on a page the
     conversation comes after. The agent narrates what it is doing, the
     plan assembles in front of you, and it ends by asking you something
     — which is what makes the next turn yours. */
  useEffect(() => {
    if (!threadIsEmpty()) return;
    if (readUrl) {
      /* A read that already finished is shown as it stands, not re-run.
         The agent picks the conversation up at the question it would
         have asked when the read landed. */
      if (storedRead?.eligibility) {
        push({ kind: "say", text: `Already read ${readUrl}.` });
        push({ kind: "read", url: readUrl });
        afterRead(storedRead);
        return;
      }
      push({ kind: "say", text: `Reading ${readUrl}.` });
      push({ kind: "read", url: readUrl });
      return;
    }
    const existing = activePlanLive();
    if (buildFor && !existing) {
      const read = getRead(buildFor);
      push({ kind: "say", text: `${read.url} is read. Building your plan now.` });
      return;
    }
    if (existing) {
      push({
        kind: "say",
        text: paid
          ? `Your campaign for ${existing.brandName}. Phase 1 is live and paid.`
          : `Your campaign for ${existing.brandName}. Phase 1 is the ${fmtUSD(PHASE1_BUDGET)} warm-up.`,
      });
      push({ kind: "plan-card" });
      if (paid) setAsking({ q: "", options: postChips });
      else ask("Anything you want different about it?", ["Markets are right", "Kuwait only", "Go more aggressive", "See all three phases"]);
    } else {
      push({
        kind: "say",
        text: campaignCount
          ? "A new campaign, then. Paste the store link."
          : "Nothing is planned yet. Paste a store link and I will build a campaign from it.",
      });
    }
    /* Keyed on the thread, not on mount. Opening a second conversation
       swaps the thread under this component rather than remounting it,
       so an empty new one has to be greeted the same way the first was.
       `threadIsEmpty` above keeps it from re-greeting one that already
       has a transcript. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  /* What the agent says once a read is complete: the one eligibility line
     that matters, then — if it clears — the question that puts the next
     turn with the brand before anything is built. */
  const afterRead = (v: BrandRead) => {
    const ok = v.eligibility?.state === "ok";
    if (ok) {
      setPendingRead(v);
      ask(`Here's what I found. Does it look right?`, ["Looks right", "Something's off"]);
    } else {
      /* What did not clear is on the block below, in the words the
         read itself used. Repeating it here would put someone else's
         punctuation in the middle of the agent's sentence. */
      say(`One thing didn't clear. Everything else stands.`);
      push({ kind: "rejected", readId: v.id });
      ask("Tell me what to correct, or I'll log a manual re-check.", ["Log a re-check", "Read a different store"]);
    }
  };

  /* The read runs first, in the conversation. When it lands the agent
     says the one thing that matters about eligibility and then either
     asks whether it looks right or explains the shortfall — both as
     blocks in the thread, not as another screen. A read that already
     finished is not run again. */
  /* Extracted so a brand who stopped a read can ask for it again. The
     completion claim is spent only by a run that FINISHES, so the
     second attempt is free to report. */
  const runRead = (url: string | null = readUrl) => {
    if (!url) return;
    readRun.start(
      (ctx) => tools.read_site({ url }, ctx),
      (v, cancelled) => {
        if (!v) return;
        /* A cancelled read is a SHORTER read, and it must never be
           written over a longer one. `read_site` resolves a cancelled
           run with its own truncated accumulator, which carries the
           same id as the finished read — so storing it unconditionally
           replaced a complete read with a partial one the moment a
           brand pressed stop on a store they had already read. */
        if (!cancelled || !storedRead?.eligibility) putRead(v);
        if (cancelled) {
          /* The claim belongs to the run that FINISHED. Spending it
             here would silence the completed read that follows. */
          say("Stopped there. What I found is above, and I can finish the job if you want it.");
          setAsking({ q: "", options: ["Read it again", "Work with this"] });
          return;
        }
        /* Many runs may START — React tears the first one down and the
           second one begins — but only one may REPORT, or the brand sees
           the same answer twice. The claim is on the result, not on the
           attempt. */
        if (!claimOnce(`read-done:${readUrl}`)) return;
        afterRead(v);
      }
    );
  };

  useEffect(() => {
    if (!readUrl || readRun.status !== "idle") return;
    if (storedRead?.eligibility) return;
    runRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readUrl]);

  /** Payment, offered as a confirmation the brand presses. Refused once
      the phase is paid: the request id is the same both times, and a
      second one would read as an invitation to pay twice. */
  const openFunding = () => {
    if (!plan) return;
    if (paid) { say(ALREADY_PAID); setAsking({ q: "", options: postChips }); return; }
    /* The card is already open further down. Pushing a second one is
       two identical requests in the thread and two buttons that move
       the same money. */
    if (requested) {
      say("The payment is already open below. Confirm it there, or say “not yet”.");
      return;
    }
    /* Money cannot move for nobody. This is the first and only point in
       the whole flow that needs an account, so it is the first and only
       point that asks for one — the sheet opens over the thread and the
       payment card is what it opens onto. */
    if (!account) { setSignIn(true); return; }
    showFunding();
  };

  /** The payment card itself, split out so the sign-in sheet can call it
      the moment it closes. */
  const showFunding = () => {
    if (!plan) return;
    const req = tools.request_funding({ plan, phaseNo: 1 });
    putFunding(req);
    /* Every figure — the total, the VAT, what Phase 1 guarantees against
       the plan's own multiple — is on the card below. The sentence
       introduces it and gets out of the way. */
    say("Here's what you're agreeing to.");
    push({ kind: "funding", requestId: req.id });
  };

  /** The calculator's Build my plan. Settles the two numbers, then runs
      the same build the conversation would have run. */
  const confirmShape = (chosen: { planBudget: number; roas: number }) => {
    const r =
      pendingRead ??
      (readUrl ? getRead(readIdFor(readUrl)) : null) ??
      (buildFor ? getRead(buildFor) : null) ??
      (plan ? getRead(plan.readId) : null);
    if (!r) return;
    setShapeSettled(true);
    const conf = getConfidence(chosen.planBudget, chosen.roas);
    say(`${fmtUSD(chosen.planBudget)} at ${chosen.roas}x, ${conf.label.toLowerCase()}. Building it now.`);
    setPendingRead(null);
    startBuild(r, chosen);
  };

  const startBuild = (read: BrandRead, withShape?: { planBudget: number; roas: number }) => {
    build.start(
      (ctx) => tools.propose_plan({ read, strategy: "balanced" }, ctx),
      (v0, cancelled) => {
        if (!v0) return;
        /* The calculator's two numbers are the brand's, so they win over
           whatever the proposal defaulted to. */
        const v = withShape
          ? tools.edit_plan({
              plan: v0,
              patch: { planBudget: withShape.planBudget, guaranteedRoas: withShape.roas },
              because: "because that is the campaign you set",
              by: "brand",
            }).plan
          : v0;
        /* A half-built plan is not a plan. The build assembles in
           order — markets, audience, crew, price, brief, ladder — so a
           run stopped early has real figures in the fields it reached
           and empty ones in the fields it did not. Committing that as
           the active plan showed a fully priced, guaranteed campaign
           with nobody on it ("0 matched", a $1,000 warm-up guarantee, a
           $0 – $0 expected range) and, worse, permanently closed the
           two-number question, which only opens while there is no plan.

           `budget > 0` used to be the test for "far enough". It is not:
           when the calculator settled a pair, the `edit_plan` above
           re-prices the partial and mints a $1,000 budget however early
           the run was cut. The crew is the honest test, because it is
           the step the price and the ladder are derived from. */
        const wholeEnough = v.creators.value.length > 0 && v.pool.value > 0;
        if (cancelled) {
          if (wholeEnough) putPlan(v);
          say(
            wholeEnough
              ? "Stopped, and what I had is below. Say “build the plan” to finish it as it stands."
              : "Stopped too early to show you anything. Say “build the plan” to run it again."
          );
          if (wholeEnough) push({ kind: "plan-card" });
          setAsking({ q: "", options: ["Build the plan"] });
          return;
        }
        putPlan(v);
        /* The plan is what makes a campaign real. Before there is one
           there is a read and a conversation about it, and nothing to
           put in a rail or a dashboard. */
        putCampaign(v, read.url);
        /* Only a FINISHED build claims the result. A cancelled one must
           not, or the brand could never ask for it to be finished. The
           torn-down first run of a development double-mount never gets
           here at all — useStream only reports the run that is current. */
        if (!claimOnce(`build-done:${read.id}`)) return;
        const crew = v.creators.value.length;
        push({
          kind: "say",
          text:
            `Here's your plan. Phase 1 is ${fmtUSD(v.budget.value)} for ${countWord(crew)} creator${crew === 1 ? "" : "s"}, ` +
            `with ${fmtUSD(v.price.revenueTarget.value)} in sales guaranteed. If you sell less, HeyMoon pays you the difference.`,
        });
        push({ kind: "plan-card" });
        if (v.ladder.value.length) push({ kind: "ladder" });
        /* The plan opens beside the conversation the moment there is one.
           It is the artifact this whole exchange is about — the three
           plans, the crew and the brief all live there — so it should be
           in front of the brand rather than one request away.

           Only where there is room beside the conversation. On a phone
           the panel covers the chat, and a brand who has just watched a
           plan being built should not lose the thread that built it. */
        if (typeof window !== "undefined" && window.innerWidth >= 768) openPanel("plan");
        ask(
          /* Not "this is a proposal, not a decision". That sentence
             handed the brand a reason to hesitate at the exact moment
             the plan is ready to start. The plan IS ready; what stays
             open is what it is pointed at, and the price is the one
             thing that never moves. */
          `Phase 1 is ${fmtUSD(PHASE1_BUDGET)} for every brand. It isn't sized to your store, and it isn't negotiated. ` +
          `Change anything else, or start now.`,
          ["Start Phase 1", "Change something"]
        );
      }
    );
  };

  /* The build runs in its own effect, unguarded by the thread contents:
     a development double-mount tears the first run down, and the guard
     that stops the intro repeating would otherwise stop the rebuild too.
     It IS guarded by the plan: coming back to this link with a campaign
     already built must not rebuild over the brand's edits. */
  useEffect(() => {
    if (!buildFor || build.status !== "idle") return;
    if (activePlanLive()?.readId === buildFor) return;
    startBuild(getRead(buildFor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildFor]);

  /** The agent asks, and waits. */
  const ask = (q: string, options: string[]) => {
    /* An empty question is chips only — the sentence was already said,
       or a block above is doing the asking. Pushing an empty turn would
       leave a mark with nothing beside it. */
    if (q.trim()) push({ kind: "say", text: q });
    setAsking({ q, options });
  };

  const say = (s: string) => push({ kind: "say", text: s });

  /* What the agent asks next, chosen from what just changed. A back and
     forth needs the agent to take a turn of its own, not only answer. */
  const followUp = (p: Plan, made: PlanChange[]) => {
    const touched = new Set(made.map((m) => m.field));
    if (touched.has("markets")) {
      /* Two counts, and this sentence used to give the crew's while
         saying "fit those markets" — which is the pool's. */
      ask(
        `The crew is rebuilt around those markets. Do you want the shortlist, or the brief?`,
        ["Show the creators", "Show the brief", "Go more aggressive"]
      );
    } else if (touched.has("strategy") || touched.has("guaranteedRoas") || touched.has("budget")) {
      /* Rebuilt, not repriced. Phase 1 costs what it costs every brand,
         so the only things an edit here can move are what the warm-up
         is pointed at and what we will stand behind on it. */
      ask(
        `The plan is rebuilt around that, and Phase 1 is still ${fmtUSD(PHASE1_BUDGET)}. Do you want the brief before you start?`,
        ["Show the brief", "Show the creators", "Start Phase 1"]
      );
    } else if (touched.has("creators")) {
      ask(`Anything else you want changed on the crew?`, ["That is the crew", "Show the brief", "Start Phase 1"]);
    } else {
      setAsking(null);
    }
  };

  /** The one path an edit takes, whether it came from a sentence or from
      a chip: apply it, attribute it, show what moved, and check the
      guarantee still holds. */
  const applyEdit = (patch: PlanPatch, because: string, sayText: string) => {
    if (!plan) return;
    const { plan: next, changes: made } = tools.edit_plan({ plan, patch, because, by: "brand" });
    putPlan(next);
    putCampaign(next);
    if (sayText) say(sayText);
    const id = push({ kind: "changes", changeIds: made.map((c) => c.id) });
    setChanges((c) => ({ ...c, [id]: made }));
    push({ kind: "plan-card" });
    if (made.some((m) => m.field === "creators" || m.field === "markets")) push({ kind: "creator-grid" });
    if (made.some((m) => m.field === "budget" || m.field === "guaranteedRoas" || m.field === "strategy")) push({ kind: "confidence" });

    /* Unprompted honesty. If the edit made the plan undeliverable, the
       agent says so and offers the two ways out — rather than leaving a
       guarantee on screen that it expects to miss. */
    const u = underwriting(next);
    if (!u.ok) {
      const r = repair(next);
      const where = listOf(next.markets.value.map(marketName));
      say(
        `One thing first. In ${where}${next.markets.value.length === 1 ? " alone" : ""}, I expect about ` +
        `${u.implied.toFixed(1)}x at this budget, not ${u.promised}x. Fewer creators there reach your audience ` +
        `for ${fmtUSD(next.budget.value)}. I won't guarantee a number I expect to miss.`
      );
      setFix(r);
      push({ kind: "confidence" });
    } else {
      setFix(null);
      followUp(next, made);
    }
  };

  /** The answer to "what happens next?", from wherever the brand is. */
  const whatNext = () => {
    if (!paid)
      return (
        `You start Phase 1 and pay for it, then connect your store so the sales can be counted. ` +
        `MoonWriter AI briefs your creators the same day, and the first drafts arrive within 48 hours.`
      );
    if (connected)
      return (
        "Your store is connected, so every order through a creator's code is counted. " +
        "The first drafts arrive within 48 hours, and MoonLive AI puts nothing out until you approve it."
      );
    return (
      "Connect your store on the dashboard so the sales can be counted. " +
      "MoonWriter AI briefs your creators today, and the first drafts arrive within 48 hours."
    );
  };

  const runReport = () => {
    const ph = livePhase;
    if (!ph) { say("Nothing is running yet, so there is nothing to report on."); return; }
    report.reset();
    report.start(
      (ctx) => tools.get_report({ phase: ph }, ctx),
      (v, cancelled) => {
        if (!v) return;
        /* A cancelled report is already on screen — the running block
           renders `report.partial` and the cancelled block renders it
           again underneath. Pushing a third copy into the thread, under
           a heading that says the numbers are finished, was two lies in
           one: it is not finished, and it is not new. */
        if (cancelled) {
          say("Stopped there. The figures above are the ones I reached, and I can pull the rest.");
          return;
        }
        const id = push({ kind: "report", campaignId: ph.id });
        setReports((r) => ({ ...r, [id]: v }));
      }
    );
  };

  const send = () => sendText(text);

  const sendText = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    push({ kind: "user", text: v });
    setText("");
    setAsking(null);
    const lower = v.toLowerCase();

    /* A store link, typed. This is the only way into a read for a
       SECOND campaign: the first one arrives with `?read=` on the URL,
       but "build another" opens an empty conversation and the brand
       has nothing to paste it into but the message box. Guarded on
       there being no plan yet, so "ounass.com" said in the middle of
       an edit is still an edit. */
    if (!plan && LOOKS_LIKE_STORE.test(v) && readRun.status !== "running") {
      const url = normaliseUrl(v);
      say(`Reading ${url}.`);
      push({ kind: "read", url });
      runRead(url);
      return;
    }

    /* A stopped read, picked back up or accepted as it stands. The agent
       offers both in the sentence it says on cancel, so both have to be
       answerable — promising "say the word and I will pick it back up"
       and then having no idea what that word was is worse than not
       offering it. */
    if (readRun.status === "cancelled" && readUrl) {
      if (/^(read it again|read again|pick it back up|finish the read|carry on|keep going|continue)\b/.test(lower)) {
        say(`Picking it back up on ${readUrl}. Starting from the top, so nothing is half read.`);
        runRead();
        return;
      }
      if (/^(work with this|use this|that is enough|good enough|carry on with)/.test(lower)) {
        const partial = readRun.partial;
        if (partial) {
          say("Working with what arrived, then. Anything I did not reach, I treat as unknown rather than guess it.");
          afterRead(partial);
          return;
        }
      }
    }

    /* The brand said something was off and is now telling us what. Record
       it against the read — kept beside the agent's own value, never over
       it — and build. */
    if (awaitingCorrection) {
      const r = pendingRead ?? (readUrl ? getRead(readIdFor(readUrl)) : null);
      if (r) {
        correctRead(r.id, { layer: "category", field: "note", was: "what HeyMoon found", now: v, at: Date.now() }, (x) => x);
        /* Never the brand's own sentence read back at them. The
           correction is free text, so there is no specific field to
           name here — what changed is shown on the read itself. */
        say(`Fixed. Building the plan on that.`);
        setAwaitingCorrection(false);
        setPendingRead(null);
        startBuild(r);
        return;
      }
    }

    /* Chips the agent itself offered about where the brand is in the
       flow. They are answered here rather than sent through `interpret`,
       because they are not requests about the plan. */
    if (/go to (the )?dashboard|open the dashboard/.test(lower)) {
      /* A handoff, not another panel, and it says nothing on the way:
         a sentence about a destination you are already being taken to
         is read after it has stopped being true. */
      router.push("/dashboard");
      return;
    }
    if (/what happens next|what.s next|what now/.test(lower)) {
      say(whatNext());
      setAsking({ q: "", options: paid ? postChips : ["Start Phase 1", "See all three phases"] });
      return;
    }
    if (/read a different store/.test(lower)) {
      say("Back to the first screen. Paste the other store's link there.");
      router.push("/");
      return;
    }
    if (/log a re-check/.test(lower)) {
      say("Logged. A person checks your traffic by hand and emails you within two working days.");
      return;
    }
    /* Gated on there BEING a plan. This answer is about Phase 1's price,
       and while the two numbers are still being settled there is no
       Phase 1 to have a price — the brand asking to "raise the budget"
       there means the campaign budget they were just asked for, and
       hijacking it produced the one speech that stage must not make. */
    if (plan && /^lower the budget|^raise the budget|^why is it \$?1,?000|budget slider|move the budget|change the budget/.test(lower)) {
      /* There is nothing to move. The warm-up price is the one number in
         this product that is the same for everybody, and saying so — and
         saying why — is more useful than pretending there is a dial. */
      ask(
        `Phase 1 is ${fmtUSD(PHASE1_BUDGET)} for every brand, and it isn't sized to your store. ` +
        `What you choose is what it's pointed at, and the guarantee moves with it.`,
        ["Guarantee 8x instead", "Kuwait only", "See all three phases", "Start Phase 1"]
      );
      return;
    }
    /* "Change something" is a chip this thread offers, and `interpret`
       has no reading for it — left alone it would fall through to "I
       didn't catch that", which is the one answer a chip we wrote must
       never get. Answered here, with the things that actually move. */
    if (plan && !paid && /^change something$/.test(lower)) {
      ask("Markets, audience, creators and the guarantee all move. Tell me what to change.", PRE_CHIPS);
      return;
    }
    if (plan && !paid && /^change the markets/.test(lower)) {
      ask(
        `Phase 1 runs in ${plan.markets.value.map(marketName).join(", ")}. Tell me the markets you want and I'll rebuild ` +
        `the crew and the guarantee around them.`,
        ["Kuwait only", "UAE and Saudi Arabia only", "Add Qatar"]
      );
      return;
    }

    /* The multiplication sign is how the chips write "8×", and a person
       may type it too; `interpret` reads the letter x. Same meaning. */
    /* While the two numbers are open, a figure or a multiple is an
       answer to that question and nothing else. The agent restates the
       pair, gives the confidence, and — when it is not high — names the
       change that would make it so and offers to make it. */
    if (awaitingShape) {
      const wantsBuild = /^(build|go|do it|yes|confirm)\b|build (it|my plan)( anyway)?|that.s? (it|right|fine)|looks good/.test(lower);
      const flat = v.replace(/,/g, "").replace(/×/g, "x");
      const mult = flat.match(/(\d+(?:\.\d)?)\s*x\b/i);
      const money = flat.match(/\$\s*(\d[\d.]*)\s*(k\b)?|\b(\d{3,})\s*(k\b)?/i);
      const next = { ...shape };

      /* What the parser had to change about what the brand typed. A
         clamp or a rounding used to happen in silence, which meant a
         brand who asked for "$400" or "20×" was answered as though they
         had agreed with the standing pair — the worst possible reading
         of a number we quietly threw away. Anything in here is said out
         loud before the confidence is. */
      const adjusted: string[] = [];

      if (mult) {
        const asked = Number(mult[1]);
        const r = Math.max(ROAS_MIN, Math.min(ROAS_MAX, Math.round(asked)));
        if (asked > ROAS_MAX) adjusted.push(`${asked}x is past the most I will guarantee, which is ${ROAS_MAX}x.`);
        else if (asked < ROAS_MIN) adjusted.push(`${asked}x is below ${ROAS_MIN}x, which is your money back and nothing more.`);
        else if (r !== asked) adjusted.push(`I guarantee whole multiples, so ${asked}x becomes ${r}x.`);
        next.roas = r;
      }
      if (money) {
        const raw = Number(money[1] ?? money[3]) * ((money[2] ?? money[4]) ? 1000 : 1);
        if (raw < 500) {
          adjusted.push(
            `${fmtUSD(raw)} is the whole campaign, not one phase, and plans start at ${fmtUSD(PLAN_BUDGET_MIN)}. ` +
            `I have left the number where it was.`
          );
        } else {
          const b = Math.max(PLAN_BUDGET_MIN, Math.min(PLAN_BUDGET_MAX, Math.round(raw / 500) * 500));
          if (raw > PLAN_BUDGET_MAX) adjusted.push(`${fmtUSD(PLAN_BUDGET_MAX)} is the largest plan I can commit to, so I have taken it there.`);
          else if (raw < PLAN_BUDGET_MIN) adjusted.push(`Plans start at ${fmtUSD(PLAN_BUDGET_MIN)}, so I have taken it there.`);
          next.planBudget = b;
        }
      }
      /* "Guarantee more" is about the MULTIPLE. It used to sit in the
         budget-raising list, so the chip the agent offers under a
         high-confidence reading raised the plan and left the guarantee
         exactly where the brand had just asked for more of it. */
      const wantsMore = /guarantee more|more return|higher (guarantee|return|multiple)|more aggressive/.test(lower);
      if (wantsMore && !mult) {
        const r = Math.min(ROAS_MAX, next.roas + 1);
        if (r === next.roas) adjusted.push(`${ROAS_MAX}x is the most I will guarantee, so there is nowhere above this to go.`);
        next.roas = r;
      }
      /* A nudge that hits a bound and moves nothing has to say so. It
         leaves the pair identical to the one on screen, and silence
         there is read as agreement by the branch below. */
      if (/smaller|less|cheaper|lower the plan|lower the budget/.test(lower) && !money) {
        const b = Math.max(PLAN_BUDGET_MIN, Math.round((next.planBudget * 0.6) / 500) * 500);
        if (b === next.planBudget) adjusted.push(`${fmtUSD(PLAN_BUDGET_MIN)} is the smallest plan I can build, so this is as far down as it goes.`);
        next.planBudget = b;
      }
      if (/bigger|larger|more budget|raise the plan|raise the budget/.test(lower) && !mult && !money) {
        const b = Math.min(PLAN_BUDGET_MAX, Math.round((next.planBudget * 1.5) / 500) * 500);
        if (b === next.planBudget) adjusted.push(`${fmtUSD(PLAN_BUDGET_MAX)} is the largest plan I can commit to, so this is as far up as it goes.`);
        next.planBudget = b;
      }

      const changed = next.planBudget !== shape.planBudget || next.roas !== shape.roas;
      /* Restating the pair the agent just suggested is agreement, not a
         non-answer. Only a message with no numbers in it at all needs
         the prompt repeated. */
      const answered =
        !!(mult || money) || wantsMore ||
        /smaller|less|cheaper|bigger|larger|more budget|lower the (plan|budget)|raise the (plan|budget)/.test(lower);
      if (!answered && !wantsBuild) {
        ask(
          "Give me a plan size, a multiple, or both, like “$40,000 at 5x” or “8x”. " +
          "I'll tell you how confident I am before anything is built.",
          [`${fmtUSD(shape.planBudget)} at ${shape.roas}x`, "Something smaller", "Guarantee 8x instead"]
        );
        return;
      }
      if (changed) setShape(next);

      const conf = getConfidence(next.planBudget, next.roas);

      /* Medium is the floor. High and medium both build; low never
         does, however the brand phrases it. The guarantee is the
         product here — it is what the brand is buying — so
         a number we do not believe is not a bolder promise, it is one
         we have already decided to lose money on.

         `!changed` is the other half. A build request takes the pair
         that is STANDING; a message that also moves the pair is an
         answer first and a build second. "go smaller" starts with "go",
         which used to settle a plan the brand had asked to change,
         without ever showing them the pair or the confidence in it. */
      if (wantsBuild && !changed && conf.level !== "low") { confirmShape(next); return; }

      /* A brand who answers with the pair the agent just proposed has
         agreed, not asked a new question — and the bar for that pair is
         already on screen. Drawing a second identical one, under a
         paragraph restating a reading they can still see, is the same
         picture twice. So the bar is pushed only when the numbers move,
         and agreement gets one line instead of the whole explanation. */
      const shown = [...thread].reverse().find((i) => i.kind === "score");
      const same =
        shown?.kind === "score" && shown.planBudget === next.planBudget && shown.roas === next.roas;
      const note = adjusted.length ? `${adjusted.join(" ")} ` : "";

      /* Answering with the pair already on screen IS the confirmation.
         Reading the reading back and then asking "shall I build it?"
         made the brand agree twice to the same two numbers, under a bar
         that had not changed — the second question carried no new
         information, so it could only read as hesitation on our part.

         Two things disqualify a match from counting as agreement: a
         reading we will not build at, and a figure the parser threw
         away. In the second case the pair is identical because we
         rejected something, not because they agreed to anything. */
      if (same && !adjusted.length && conf.level !== "low") { confirmShape(next); return; }
      /* When a number was clamped away, "still" is a lie by omission —
         the brand did ask for something and did not get it. Lead with
         what happened to it, then say where that leaves the pair. */
      const still = note
        ? `${note}That leaves the plan at ${fmtUSD(next.planBudget)} and ${next.roas}x, ${conf.label.toLowerCase()}. `
        : `Still ${conf.label.toLowerCase()} at ${fmtUSD(next.planBudget)} and ${next.roas}x. `;

      if (!same) {
        /* The ratio, the line we commit at and the reading itself are
           all on the bar below. The sentence says the two numbers and
           what they are worth in sales, and stops. */
        say(
          `${note}${conf.label}. ${fmtUSD(next.planBudget)} at ${next.roas}x guarantees you ` +
          `${fmtUSD(ladderTotals(next.planBudget, next.roas).revenue)} in sales.`
        );
        push({ kind: "score", planBudget: next.planBudget, roas: next.roas });
      }

      if (conf.level === "high") {
        ask(`${same ? still : ""}Shall I build it?`, ["Build the plan", "Something smaller", "Guarantee more"]);
        return;
      }

      /* The two ways out, in the brand's own terms: a bigger plan at
         the same multiple, or the same plan at a multiple we can stand
         behind. Aim at high; where the range cannot reach it, aim at
         medium and say which one the suggestion actually buys. */
      const highB = budgetForHigh(next.roas);
      const highR = roasForHigh(next.planBudget);
      const needB = highB ?? budgetForMedium(next.roas);
      const needR = highR ?? roasForMedium(next.planBudget);
      /* Only a BIGGER plan is a way out of a thin ratio. Where high is
         out of reach the medium fallback can come back smaller than the
         plan already is — at $60,000 and 8× it suggested "$32,000",
         which the brand is already well past and which would make the
         reading worse, not better. */
      const raise = needB !== null && needB > next.planBudget;
      const soften = needR !== null && needR < next.roas;
      const fixes: string[] = [];
      if (raise) fixes.push(`Raise it to ${fmtUSD(needB!)}`);
      if (soften) fixes.push(`Guarantee ${needR}x instead`);
      const ways =
        (raise ? `At ${next.roas}x, a ${fmtUSD(needB!)} plan reaches ${highB !== null ? "high" : "medium"} confidence. ` : "") +
        (soften ? `Or keep the plan at ${fmtUSD(next.planBudget)} and let me guarantee ${needR}x, which is ${highR !== null ? "high" : "medium"}. ` : "");

      if (conf.level === "medium") {
        ask(
          `${same ? still : ""}I can build this one${ways ? ", though there is room to reach high first. " : "."}` + ways,
          [...fixes, "Build it anyway"]
        );
        return;
      }

      /* Low. No build chip, and no build on request either — the only
         moves offered are the ones that make the promise keepable. */
      ask(
        (wantsBuild ? `I won't build that one. ` : "") +
        (same ? still : `Low is below the line I commit at, and I won't sell a guarantee I expect to pay out on. `) +
        (ways || `No plan in range carries a ${next.roas}x promise, so lower the multiple and I can commit. `),
        fixes
      );
      return;
    }

    const out = tools.interpret({ text: v.replace(/×/g, "x"), plan: plan ?? undefined, paid });

    if (out.kind === "edit" && plan && out.patch) {
      if (paid && touchesLocked(out.patch)) {
        say(LOCKED);
        setAsking({ q: "", options: postChips });
        return;
      }
      applyEdit(out.patch, out.because ?? `because you said “${v}”`, out.say);
      return;
    }

    if (out.kind === "command") {
      switch (out.command) {
        case "fund": {
          if (!plan) { say("There is no plan to start yet."); return; }
          openFunding();
          return;
        }
        case "build": {
          const r =
            pendingRead ??
            (readUrl ? getRead(readIdFor(readUrl)) : null) ??
            (buildFor ? getRead(buildFor) : null) ??
            (plan ? getRead(plan.readId) : null);
          if (!r) { say("I need to read your store first. Paste the link on the first screen."); return; }
          if (paid) { say(ALREADY_PAID); return; }
          /* Two numbers before anything is built, and the card asks
             them. Saying "looks right" gets no sentence back at all:
             the brand has just answered a question, and a paragraph
             restating the question they answered is a turn that moves
             nothing. The bar carries the pair, the confidence in it and
             what it is worth; the chips carry the answers.

             `shapeAsked` is STATE, not a sentence in the thread. The
             calculator was once detected by grepping the transcript for
             its own opening line, and rewriting that line switched the
             whole branch off. */
          const sug = suggestPlanShape(5);
          setShape(sug);
          setShapeSettled(false);
          setShapeAsked(true);
          /* The question, restored. It had been cut on the grounds that
             the bar carries the pair and the chips carry the answers,
             which is true and still leaves a brand looking at a meter
             and three buttons with nothing asking them anything. Two
             sentences, which is the length rule, not none. */
          say(
            `Two numbers first. How big is the whole campaign, and what multiple of it do you want guaranteed in sales?\n\n` +
            `Start at ${fmtUSD(sug.planBudget)} and ${sug.roas}x. That is the smallest plan HeyMoon can back at high confidence.`
          );
          push({ kind: "score", planBudget: sug.planBudget, roas: sug.roas });
          ask("", [`${fmtUSD(sug.planBudget)} at ${sug.roas}x`, "Something smaller", "Guarantee 8x instead"]);
          return;
        }
        case "correct": {
          setAwaitingCorrection(true);
          ask("What's off? Tell me, and I'll fix it before building the plan.", []);
          return;
        }
        case "approve-all": {
          const waiting = ads.filter((a) => a.state === "waiting");
          if (!waiting.length) { say("Nothing is waiting on you."); return; }
          const req = tools.request_approval({ adIds: waiting.map((a) => a.id) });
          putApproval(req);
          say(out.say);
          push({ kind: "approval", requestId: req.id });
          return;
        }
        case "show-ladder": {
          if (!plan) { say("There is no campaign to show yet. Read a store and I will build one."); return; }
          /* SHOW_PHASES, not the interpreter's own sentence: the whole
             plan is a ladder block, and the line above it names what it
             is and stops. */
          say(SHOW_PHASES);
          push({ kind: "ladder" });
          return;
        }
        /* The crew lives on the plan, and the plan lives in the panel.
           Pushing another card into the conversation would be the same
           information twice, one copy of it already stale. */
        case "show-creators": {
          if (!plan) { say("There is no crew yet. Read a store and I will match one to it."); return; }
          say(out.say);
          openPanel("plan");
          return;
        }
        case "show-brief": say(out.say); push({ kind: "brief-card" }); return;
        /* The numbers assemble in the conversation, where they can be
           stopped; the phase they belong to opens beside it. */
        case "show-report": say(out.say); runReport(); return;
      }
    }

    if (out.kind === "question" && out.say) {
      say(out.say);
      if (out.answerRef === "confirm" && plan) {
        /* An answered question needs the next one, or the conversation
           stalls the moment the brand agrees with something. */
        ask(
          "What would you like to do next?",
          paid ? postChips : ["Show the creators", "Show the brief", "Go more aggressive", "Start Phase 1"]
        );
      }
      /* A brand who just asked about the price has been told it does not
         move. Leaving them with no next step would read as a refusal, so
         they are offered the two things that DO move instead. */
      if (out.answerRef === "budget" && plan && !paid) {
        setAsking({ q: "", options: ["Guarantee 8x instead", "Kuwait only", "See all three phases", "Start Phase 1"] });
      }
      return;
    }

    /* The three phases, asked for in words `interpret` did not catch. */
    if (plan && PHASES_RE.test(lower)) {
      say(SHOW_PHASES);
      push({ kind: "ladder" });
      return;
    }

    /* A view named out loud. There is no navigation left in the product,
       so naming a screen opens it in the panel. */
    const wants = PANEL_INTENT.find((p) => p.re.test(lower));
    if (wants) {
      say(wants.say);
      openPanel(wants.view);
      return;
    }

    /* Anything it did not understand. It says so plainly and offers the
       things it can actually do, rather than a canned deflection. */
    say(
      out.say ||
      (paid
        ? "I didn't catch that. I can change the brief or the audience, pull a report, or open your campaign in the panel."
        : "I didn't catch that. Markets, audience, creators, the brief and the guarantee all move, so say it in plain words.")
    );
  };

  /* What is offered when the agent is not waiting on a specific answer. */
  const defaultChips = plan
    ? paid ? postChips : PRE_CHIPS
    : storedRead?.eligibility?.state === "ok" && !awaitingCorrection && build.status === "idle"
    ? ["Looks right", "Something's off"]
    : [];

  /* ── The transcript ───────────────────────────────────────────────
     Every item becomes one row. Prose and the brand's own words start a
     new group; the cards a sentence produced join the group it belongs
     to. That is the whole rhythm rule: 28px between turns, 20px between
     a turn and the blocks it just introduced. */
  type Row = { id: string; node: ReactNode; block: boolean };
  const rows: Row[] = [];
  visible.forEach((item, i) => {
    const prev = i > 0 ? visible[i - 1] : null;
    const node = renderItem(item, prev?.kind === "say");
    if (node) rows.push({ id: item.id, node, block: item.kind !== "say" && item.kind !== "user" });
  });

  const groups: Row[][] = [];
  for (const r of rows) {
    if (!r.block || !groups.length) groups.push([r]);
    else groups[groups.length - 1].push(r);
  }

  function renderItem(item: (typeof visible)[number], afterSay: boolean): ReactNode {
    switch (item.kind) {
      case "user":
        return <UserTurn key={item.id} text={item.text} />;
      case "say":
        return (
          /* Consecutive assistant turns share one mark — the speaker is
             named once and then simply keeps talking. */
          <AgentTurn key={item.id} mark={!afterSay}>
            {typedDone[item.id] || item.id !== lastSay?.id ? (
              <p className="whitespace-pre-line text-prose text-ink">{item.text}</p>
            ) : (
              /* No onTick scroll here any more. The view is parked at
                 the top of this turn and the text grows downward into
                 it, which is the direction people read. */
              <Typed text={item.text} onTick={() => park(false)} onDone={() => finish(item.id)} />
            )}
          </AgentTurn>
        );
      case "changes":
        return <BlockRow key={item.id}><ChangesBlock changes={changes[item.id] ?? []} /></BlockRow>;
      case "plan-card":
        return plan ? <BlockRow key={item.id}><PlanBlock plan={plan} onOpenCreators={() => openPanel("plan")} /></BlockRow> : null;
      case "creator-grid":
        return plan ? <BlockRow key={item.id}><CreatorBlock plan={plan} /></BlockRow> : null;
      case "confidence":
        return plan ? <BlockRow key={item.id}><ConfidenceBlock plan={plan} /></BlockRow> : null;
      case "brief-card":
        return plan ? <BlockRow key={item.id}><BriefBlock plan={plan} /></BlockRow> : null;
      case "funding": {
        const req = funding[item.requestId];
        /* A request id is the plan and the phase, so "Not yet" followed
           by a second Start produces a second block for the SAME request
           — and the moment that request is pending again, the earlier
           card would come back to life as a duplicate payment prompt.
           Only the newest block for a request is live; the earlier ones
           say what happened to them and nothing more. */
        const newest = [...thread].reverse().find((x) => x.kind === "funding" && x.requestId === item.requestId);
        if (newest && newest.id !== item.id) {
          return (
            <BlockRow key={item.id}>
              <Card className="p-4">
                <p className="text-body text-ink-soft">Not started. The plan is unchanged.</p>
              </Card>
            </BlockRow>
          );
        }
        return req ? (
          <BlockRow key={item.id}>
            <FundingBlock
              req={req}
              onConfirmed={() => {
                /* Per campaign, not global. A second campaign is not
                   paid for because the first one was. */
                markPaid();
                /* Paid → receipt → the three steps → the last step. No
                   creator cards here: the plan beside the conversation
                   holds the crew, and the full roster belongs on the
                   campaign view, not in the chat. */
                say("Paid. Phase 1 has started, and MoonWriter AI is briefing your creators.");
                push({ kind: "receipt", requestId: req.id });
                push({ kind: "checklist" });
                say(
                  "One step left, and it is waiting for you on the dashboard: connect your store so the guarantee " +
                  "can be measured. It comes after payment on purpose, because it is for counting your sales rather " +
                  "than for qualifying you."
                );
                setAsking({ q: "What happens next?", options: postChips });
              }}
              onCancelled={() =>
                ask(
                  "No problem. What would make Phase 1 right for you?",
                  [WHY_CHIP, "See all three phases", "Change the markets", "Start Phase 1"]
                )
              }
            />
          </BlockRow>
        ) : null;
      }
      case "receipt": {
        const req = funding[item.requestId];
        return req ? <BlockRow key={item.id}><ReceiptBlock req={req} /></BlockRow> : null;
      }
      case "approval": {
        const req = approvals[item.requestId];
        return req ? <BlockRow key={item.id}><ApprovalBlock req={req} /></BlockRow> : null;
      }
      case "read": {
        const live = readRun.status === "running";
        const r = live ? readRun.partial : reads[readIdFor(item.url)] ?? readRun.partial;
        return (
          <BlockRow key={item.id}>
            <ReadBlock read={r} live={live} />
            {live && (
              <WorkingLine
                className="mt-2"
                note={readRun.note} done={readRun.progress.done} total={readRun.progress.total}
                status={readRun.status}
              />
            )}
            {/* No second way in. What HeyMoon found has more in it than
                a card in a conversation should carry — every layer and
                every piece of evidence — and the card's own header
                already carries the link that opens it beside the
                conversation. A duplicate control directly under it, with
                a second wording, reads as a second destination. */}
          </BlockRow>
        );
      }
      case "ladder":
        /* Startable from here only while unpaid. After payment the block
           marks Phase 1 as started and offers nothing to press — a second
           Start would read as a second payment. */
        return plan ? (
          <BlockRow key={item.id}><LadderBlock plan={plan} onStart={paid ? undefined : openFunding} paid={paid} /></BlockRow>
        ) : null;
      case "checklist":
        return <BlockRow key={item.id}><ChecklistBlock /></BlockRow>;
      case "score":
        return (
          <BlockRow key={item.id}>
            <ConfidenceBar planBudget={item.planBudget} roas={item.roas} />
          </BlockRow>
        );
      case "rejected":
        return <BlockRow key={item.id}><RejectedBlock read={getRead(item.readId)} /></BlockRow>;
      case "ad-card":
        return <BlockRow key={item.id}><AdCardBlock adId={item.adId} /></BlockRow>;
      case "working":
        return (
          <BlockRow key={item.id}>
            <WorkingLine note={item.note} done={item.done} total={item.total} status="running" />
          </BlockRow>
        );
      case "report": {
        const r = reports[item.id];
        return r ? <BlockRow key={item.id}><ReportBlock report={r} /></BlockRow> : null;
      }
      default:
        return null;
    }
  }

  return (
    <ChatShell panel={<PanelHost />}>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[720px] space-y-7 px-4 pb-8 pt-16">
          {groups.map((g, i) => (
            <div
              key={g[0].id}
              data-last-turn={i === groups.length - 1 ? "" : undefined}
              className="space-y-5"
            >
              {g.map((r) => r.node)}
            </div>
          ))}

          {/* The dots are for the gap between "I will do that" and the
              first thing appearing. Once the roster is up they are a
              second spinner beside a real one. */}
          {(readRun.status === "running" || build.status === "running") && !isTyping && !rosterReady && <Thinking />}

          {/* The build, as named agents with tasks that tick — the same
              shape as the read, because "the agentic piece" must not be
              the one stream that looks like a page loading. How many
              agents is read off BUILD_TASKS, never typed.

              Gated on the sentence above having finished typing. The
              thread's own blocks are already held back that way — the
              slice in `visible` does it — but this one renders outside
              the thread, so it had nothing holding it and landed under
              a half-written paragraph. */}
          {rosterReady && (
            <BlockRow>
              <TaskRoster
                tasks={BUILD_TASKS}
                done={BUILD_TASKS.slice(0, build.progress.done).map((task) => task.key)}
                live
                title={rosterTitle(BUILD_TASKS, "on your plan")}
              />
              <WorkingLine
                className="mt-2"
                note={build.note} done={build.progress.done} total={build.progress.total}
                status={build.status}
              />
              {build.partial && build.partial.budget.value > 0 && (
                <div className="mt-3"><PlanCard plan={build.partial} dense /></div>
              )}
            </BlockRow>
          )}

          {/* A stream in flight shows partial results, not a spinner. */}
          {report.status === "running" && (
            <BlockRow>
              <WorkingLine
                note={report.note} done={report.progress.done} total={report.progress.total}
                status={report.status}
              />
              {report.partial && <div className="mt-3"><ReportBlock report={report.partial} /></div>}
            </BlockRow>
          )}
          {report.status === "cancelled" && report.partial && (
            <BlockRow>
              <p className="mb-2 text-meta text-ink-faint">Stopped. This is what had arrived.</p>
              <ReportBlock report={report.partial} />
            </BlockRow>
          )}

          {/* The plan cannot be delivered as it stands. The agent has
              already said so above; this is the one press that fixes it,
              and it sits with the sentence rather than under the box. */}
          {fix && plan && !isTyping && (
            <BlockRow>
              <div className="flex flex-wrap items-center gap-2 rounded-control border border-danger/25 bg-danger/[0.05] px-3 py-2.5">
                <p className="min-w-0 flex-1 text-meta leading-5 text-danger">{fix.headline}</p>
                {fix.kind !== "widen" || fix.addMarket ? (
                  <Btn
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      /* One edit, not three. The repair is a whole target
                         state — markets, crew and multiple — so it is
                         applied as one attributed change rather than
                         leaving the plan half-fixed in between. */
                      const { plan: next, changes: made } = tools.edit_plan({
                        plan,
                        patch: {
                          ...(fix.markets ? { markets: fix.markets } : {}),
                          setCrewIds: fix.crewIds,
                          guaranteedRoas: fix.multiple,
                        },
                        because: fix.addMarket
                          ? `because adding ${marketName(fix.addMarket)} is what makes this deliverable`
                          : `because that is the largest campaign I can guarantee in these markets`,
                        by: "agent",
                      });
                      putPlan(next);
                      const crew = next.creators.value.length;
                      say(
                        `${listOf(next.markets.value.map(marketName))}. ${countUp(crew)} creator${crew === 1 ? "" : "s"}, ` +
                        `${fix.multiple}x guaranteed, and I expect about ${fix.implied.toFixed(1)}x.`
                      );
                      const id = push({ kind: "changes", changeIds: made.map((c) => c.id) });
                      setChanges((c) => ({ ...c, [id]: made }));
                      push({ kind: "plan-card" });
                      push({ kind: "confidence" });
                      setFix(null);
                    }}
                  >
                    {fix.addMarket ? `Add ${marketName(fix.addMarket)} and rebuild` : "Rebuild it that way"}
                  </Btn>
                ) : null}
              </div>
            </BlockRow>
          )}
        </div>
      </div>

      <Composer
        value={text}
        onChange={setText}
        onSend={send}
        chips={isTyping ? [] : liveChips(asking?.options ?? defaultChips)}
        onChip={sendText}
        /* A new thread has no plan to change and nothing to pay for,
           so it asked to change a plan that did not exist and warned
           about a payment nobody had been offered. The composer says
           what this conversation is actually for at each of its three
           stages. */
        placeholder={
          paid ? "Ask me anything about this phase"
          : plan ? "Change anything about the plan"
          : "Paste your store link"
        }
        note={!plan || paid ? undefined : NOTE}
        busy={!!stop}
        onStop={stop ?? undefined}
        stopLabel={t("thread.stop")}
      />

      {/* The gate at the payment, and the only one in the flow. It
          closes onto the card the brand was reaching for. */}
      <SignInSheet
        open={signInOpen}
        onClose={() => setSignIn(false)}
        onVerified={(email) => {
          setSignIn(false);
          push({ kind: "user", text: `Signed in as ${email}` });
          showFunding();
        }}
      />
    </ChatShell>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-[100dvh] bg-white" />}>
      <ChatInner />
    </Suspense>
  );
}
