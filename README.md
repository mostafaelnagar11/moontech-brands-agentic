# HeyMoon — agentic brands

A clickable prototype of HeyMoon where the agent does the work and the brand
approves it, rather than a brand filling in a form and an "assistant" narrating
it.

The brand was renamed from MoonTech to **HeyMoon** (wordmark "HeyMoon.AI"), and
the copy now follows `heymoon-copy-changes-before-after.md`: no agent names in
anything a brand can see, "sales" rather than revenue/return/ROAS, full stops
rather than em dashes, and HeyMoon named instead of "we". `OPEN-QUESTIONS.md`
predates that change and still uses the old names where it records why a
decision was made at the time.

Sibling to the current app at `../moontech`, which is unchanged. Same stack
(Next 14, TypeScript, Tailwind 3.4, Geist, Phosphor) and the same design
language, so the two read as one product.

```bash
npm run dev     # http://localhost:3002
```

Also registered in `../moontech/.claude/launch.json` as **moontech-agentic**.

---

## The shape of it

One surface, two columns. The conversation, and one panel beside it. Every
screen this product used to have is now either a block in the conversation or
a view in that panel, so there is no navigation — the only two places a brand
can act are the message box and the panel.

```
┌────────────────────────────────┬──────────────────┐
│  the conversation              │  one panel       │
│  (720px reading column)        │  plan · read     │
│                                │  campaign · ads  │
│  ┌ composer ─────────────────┐ │  inbox · activity│
│  └───────────────────────────┘ │  autonomy        │
└────────────────────────────────┴──────────────────┘
```

**There is no sidebar.** Onboarding creates one campaign, so there is no list
to browse and nothing to switch between; a rail here would be three rows of
furniture pretending to be navigation. The HeyMoon.AI wordmark sits top-left
over a white fade and is the way back to a new read.

The panel carries **Read** and **Plan**, and nothing else. Both are gated on
existing: Read appears once a store has been read, Plan once there is a plan,
and below two tabs the switcher does not render at all. A tab with nothing
behind it is a promise the panel cannot keep.

**The agent builds a campaign; it does not run one.** Its job starts at a
pasted link and ends when the store is connected. What follows is a phase
running for weeks — drafts arriving, budget moving, revenue landing against a
guarantee — and that is not a conversation you scroll back through, it is a
place you check. So it has its own surface at `/dashboard`, and the last thing
the agent says is where to find it.

```
/                the front door. One field.
/c               the agent. Conversation + a panel of Read and Plan.
/dashboard       the running campaign, on the current app's own shell.
/[...legacy]     every old bookmark redirects to /c.
```

**The dashboard wears the current app's chrome**, deliberately: a 210px white
rail that collapses to 60px, a 67px translucent top bar, and a full-bleed main
column on the canvas. A brand who uses HeyMoon today should not have to learn
a new shell to read the same numbers. Two things differ. The active nav item is
derived from the current view rather than from a label string each page seeds
for itself, which in the original leaves the highlight stale whenever you reach
a page any way but clicking its own row. And the brand switcher is a brand
tile, because this prototype has one campaign and a switcher with one row is
furniture.

**The third column is an assistant you can talk to.** It is a different agent
from the builder — that one knows a store, this one knows a phase in flight —
and it lives where "back to the agent" used to. Beside the dashboard above
1280px, over it below. See step 8.

Under 768px the panel covers the conversation and a back arrow returns to it.

---

## The demo, in order

Ten minutes, one path, no page loads after the first.

### 1. Landing — `/`

One field, shaped exactly like the message box you are about to use. Type
**`ounass.com`** and press Read my store. Two other stores are wired:
`lunabeauty.ae` (eligible, different economics) and `freshgrocer.ae` (below the
traffic floor). Any other domain gets a generic read, marked as a first pass.

### 2. The store is read in the conversation, and nothing is named

HeyMoon runs a pipeline of specialised parts, and **none of them is named
anywhere a brand can see** (rule G1). Which part of HeyMoon did a piece of work
is a fact about our architecture, not an answer to anything a brand just asked.
So every row of the progress card carries a verb and an output and nothing
else: *Reading your catalogue*, *Reading your prices*, *Learning your voice*,
*Finding your markets*. The Autonomy page lists the same pipeline by **stage**
— Intake, Matching, Safety, Creative, Activation, Optimization, Learning — for
the same reason: what a brand needs from that page is which steps can finish
alone, not who they belong to.

The opening line is one sentence, *"Reading ounass.com."*, and the rows below
it are assembled from `READ_TASKS` rather than typed, so the card can never go
stale against the work actually running.

The read card fills in as findings land — category, prices, bestsellers, voice,
socials, markets, seasonality — and each row opens into its evidence, with no
"found by" line on any of it. Eligibility arrives as one line, not a gate.

It takes about **fifteen seconds** — long enough that the work is visibly done,
short enough that nobody walks away. A two-second read looks like a lookup,
which is the one thing this screen must not look like.

**Stopping is on the send button**, which becomes a stop button for as long as a
run is open — where every chat people already use puts it. It used to sit beside
the progress line in the thread, which meant the way out scrolled down the page
as the work went on. A cancelled read is a shorter read, not an empty one: the
findings that arrived stay, and the agent says so.

**See everything found** opens what HeyMoon found in the panel, with every
layer correctable in place. One control, in the card header: the thread used to
repeat it underneath with a second wording.

### 3. It asks before it builds

*"Does what I found look right?"* — **Looks right, build the plan** or
**Something is off**, which takes your correction and builds on your version.

### 4. Two numbers, settled in the conversation

Before anything is built the agent needs two things, and it asks for them in
words rather than handing over a control panel:

> **How big should the whole campaign be, and what return do you want
> guaranteed on it?** I would say $60,000 at 5× — that is $302,300 of revenue
> we guarantee, and it is the smallest plan on which I can call a 5× promise
> high confidence.

**There is no slider.** Type `$40,000 at 5×`, or `make it $25,000`, or just
`8×`, and the agent answers with its confidence in that pair and the
arithmetic behind it. A small read-only bar under the sentence shows where the
pair sits between the two thresholds. It is a reading, not a control — the
numbers are set by talking.

Confidence is HeyMoon's own rule, ported unchanged: divide the plan budget by
the multiple, and commit at **12,000 and above**. Below **4,000** it does not.

| Ratio | Level | What happens |
| --- | --- | --- |
| 12,000+ | **High** | *"Shall I build it?"* |
| 4,000–12,000 | **Medium** | Builds, but the agent pushes for high first |
| under 4,000 | **Low** | **Will not build.** Only the ways out are offered |

**Answering with the pair already on screen is the confirmation**, and it
builds. Reading the reading back and then asking again made a brand agree
twice to the same two numbers under a bar that had not moved. The exception
is a figure the parser could not use: "$400" leaves the pair identical
because it was rejected, not because anyone agreed, so the agent says what
it did with the number and asks.

Low confidence is a refusal, not a warning. There is no *Build it anyway* chip
below the medium line, and typing "build it anyway" gets *"I am not going to
build that one"* — the guarantee is the product, and one we expect to pay out
on is worth nothing to either side. What the agent offers instead is the two
ways out, each labelled with the level it actually reaches:

> Low confidence. $10,000 at 10× is $100,000 of guaranteed revenue. $10,000 ÷
> 10 is 1,000, and we commit at 12,000 and above.
>
> At 10× a $40,000 plan gets us to medium confidence. Or keep the plan at
> $10,000 and let me guarantee 2×, which is medium.

Both are chips. Neither is a dead end: the most expensive multiple we allow,
12×, still reaches medium at $48,000, well inside the range.

**Nothing about phases or the warm-up price is mentioned at this stage.** Those
are answers to *what does the plan look like*, and the plan does not exist yet.
Raising them here would ask a brand to hold two shapes in their head while
settling one number each.

### 5. The plan, three phases, in the panel

The build streams its own roster of steps — setting the goals and markets,
reading the audience, matching creators, vetting every match, sizing the
warm-up crew, drafting the brief, laying out Phases 2 and 3 — then the plan
opens in the panel beside the conversation. Same rule as the read: each row is
a verb and an output, and nothing on it is named.

**Phase 1 is always $1,000.** For every brand, every time, whatever the two
numbers came out at. It is not sized from your store, not derived from the crew
and not negotiated: it is the fixed price of finding out whether this works on
your real orders. The plan budget a brand sets is the size of the *whole*
campaign; it never moves the warm-up.

**The warm-up is guaranteed at 1×**, and the multiple climbs from there. You
get your $1,000 back and no more, because the warm-up's job is to prove the
crew at no risk. The later phases carry the promise, and they are sized so the
**average across all three equals the multiple you asked for**:

| | Budget | Multiple | Guaranteed revenue | |
| --- | --- | --- | --- | --- |
| **Phase 1 · Warm-up** | $1,000 | 1× | $1,000 | **You start this** |
| Phase 2 · Scale | $19,500 | 3.5× | $68,250 | Offered after Phase 1 |
| Phase 3 · Peak | $39,500 | 5.9× | $233,050 | Offered after Phase 2 |
| **All three** | **$60,000** | **5.0×** | **$302,300** | |

That is the default $60,000 at 5×. Every total on screen is the sum of its own
rows, and the blended average is the number the brand typed. Only the $1,000
warm-up is due today. Phases 2 and 3 are muted and collapsed until you press
**View Phases 2 and 3**.

How wide the campaign is spread is the other thing that moves, and it is a
sentence rather than a chooser — say `go more aggressive` or `spread it wider`:

| Shape | What the $1,000 is pointed at |
| --- | --- |
| Wide and safe | your whole bestselling range, eight product lines |
| Balanced | your four strongest products |
| Concentrated | your two bestsellers and nothing else |

There is no strategy picker in the panel. Three cards asking a brand to choose
a posture is a form, and this product does not have forms — the agent proposed
one, and changing it is a thing you say.

In the panel: the plan card, the fixed warm-up price with the reason it is
fixed, the phase ladder, the confidence line, the creators and the brief.

**The crew is a subset of the pool**, and the plan card shows both — *8 matched
· 3 in the warm-up*. HeyMoon matches the pool and clears every one of them;
$1,000 leaves $650 for creator fees, which briefs the three best value of
them. The rest of the pool is exactly what Phases 2 and 3 are for.

A shortlist holds **between 7 and 13**. The ceiling is a cap in `matchedPool`:
past thirteen a shortlist stops being a shortlist and HeyMoon is vouching for
people nobody looked at twice. The floor is a property of the roster rather
than a clamp — padding a thin market with creators who do not fit it would be
the exact lie the market-fit cut exists to prevent. Every brand's proposal
lands at 8. Narrow the markets far enough and the pool honestly falls below the
floor, and the agent offers to widen them rather than inventing names.

The pool is a field on the plan, not a number inside a sentence. It used to be
parsed back out of the crew's `why` string by three different screens, and
`edit_plan` rewrites that string — so applying the brand's own budget and ROAS
silently threw the count away and left the card labelling the crew "matched".

**Creators are counted, not named.** Real faces, no names, no handles, no
links, and no price beside anybody — a fee next to a creator is against the
premise of the product. Names appear the moment Phase 1 starts.

### 6. Free text changes the plan

**Type `Kuwait only`.**

1. Markets change; creators whose audience is not there drop out.
2. The crew is rebuilt from whoever the $1,000 still buys in Kuwait. The price
   does not move — who it briefs does.
3. Every change is attributed — *because you said Kuwait only*.
4. The agent then says, unprompted, that it will not guarantee a number it
   expects to miss, and offers the nearest plan that does work: **Add United
   Arab Emirates and rebuild**.

Also try `Guarantee 8× instead`, `Show me the three phases`, `Why is it
$1,000?`, `women 25 to 40`.

Try `make it $12,000` too, and watch it refuse: the agent explains that the
warm-up is the same price for every brand, then points at the two things that
do move — what the thousand is pointed at, and the multiple guaranteed on it.
That refusal is the feature, not a gap.

### 7. Start Phase 1 → pay → connect

**Start Phase 1** opens the payment confirmation in the conversation: $1,000
plus 5% VAT, $1,050 due today, and nothing after Phase 1 committed by pressing
it. It is the only action in the product that moves money, and only a brand can
press it.

The moment it clears: a receipt, a three-step checklist (plan approved, phase
paid, store connected), and the integration step. **Salla, Zid, Shopify and
Magento** each authorise through a visible four-step handoff — you leave, you
sign in on their page, you approve a read-only scope, you come back. **My store
is on something else** captures a phone number first and a system type, so an
engineer arrives with a plan rather than questions.

Connecting comes after payment on purpose: it measures the guarantee, it does
not qualify the brand.

### 8. Running — on the dashboard

**Go to dashboard** is the last thing in the conversation, and it appears only
once the store is connected. Before that there is nothing for a dashboard to
count, and offering it early sends a brand to an empty room.

The dashboard holds the five views the panel used to: **Campaign**, **Needs
you**, **Ads**, **Activity** and **Autonomy**. Its own cross-links work between
them — *Review them* opens Ads, *See all, and undo* opens Activity — and
**Build a campaign** in the rail returns to the agent, which is still there.

**Ask HeyMoon** opens the assistant. Four things it does, and one it does not:

| Say | What happens |
| --- | --- |
| *"How is it doing?"* | The pace against the guarantee, from the same figures the monitor above renders |
| *"Show me the drafts"* | Opens Ads, and drops a card in the thread naming what it moved |
| *"Approve all"* | Builds the approval list with its read on each draft. **You** press the button |
| *"Undo that"* | Reverts the last thing an agent did on its own, and says which |
| Anything else | Says what it can do, rather than guessing |

**It cannot publish, move money or sign**, and the line under the message box
says so. Approving is the only thing here that reaches the outside world, and
it arrives as a request with your name on the button — the same rule the
builder works under, and the reason a text box can sit this close to a live
campaign at all.

Every action leaves a card in the thread naming what changed. An assistant that
says "done" while something moves off-screen is the thing this product exists
not to be.

- **Campaign** — the Agent Monitor (what happened, what it means, what I did,
  what I need from you), the pace forecast against the 80% line, the phase
  figures with their sources, and the live ads.
- **Needs you** — one prioritised list: money, then work blocking revenue, then
  things that only need acknowledging.
- **Ads** — the approval queue, each card carrying the agent's compliance check
  against the brief it wrote, plus batch approve.
- **Activity** — four autonomous actions, each with the permission it used, why,
  what changed, and an undo.
- **Autonomy** — move money, publish and sign are locked at Never and shown
  locked. They are not preferences.

### 9. The loop, which is the point of Phase 1

When Phase 1 reaches 80% of its sales target, Phase 2 is offered. It is not
the same plan with a bigger number on it: HeyMoon feeds what the warm-up
actually did — which creators converted, which copy landed, which products
carried it — back into how it matches, how it writes and where it puts
budget. That is
the continuous learning loop, and it is why $1,000 buys something a brand
cannot get by spending $1,000 anywhere else: every campaign after it starts
better informed than the one before.

---

## How it is built

```
app/
  page.tsx        the landing. One field.
  c/page.tsx      the agent — the conversation and its panel
  dashboard/      the running campaign, on the current app's shell
  components/dashboard/  Sidebar · Topbar · Assistant
  lib/agent/dashboard.ts the assistant's own tool layer
  [...legacy]     every old route redirects here
  components/chat/    ChatShell, Composer, Turn, PanelHost
  components/panels/  plan · read · campaign · ads · inbox · activity · autonomy
  lib/agent/
    types.ts      the whole agent boundary — screens import this and nothing else
    tools.ts      the mock implementation. The only file that knows it is fake.
    model.ts      the numbers. Every figure on screen is computed here.
    stream.ts     the streaming contract: partial results, growing totals, cancel
    useStream.ts  consuming a stream from a component
    rng.ts        determinism. There is no Math.random in this project.
  lib/mock/       reads, creators, the phase ladder and ads
  lib/store.ts    session state, one module store behind useSyncExternalStore
  components/     the design system and the typed thread blocks
```

**Swapping in a real model** means writing another object that satisfies
`AgentTools` in `types.ts`. No screen changes: the UI already talks only to that
interface, and the free-text path is one function (`interpret`) that today is
regexes and says so in a comment.

### Three rules, enforced in code rather than by discipline

**No figure without a source.** Numbers reach the UI as `Sourced<T>` and render
through `<Figure>`, which refuses to draw a value with no evidence — it renders
a red `unsourced` marker instead, so it cannot quietly ship. Every number in
this prototype traces back through the chain in `model.ts`: a category benchmark
and the brand's own median price give revenue per view; a creator's own audience
split gives market fit; those give expected revenue. The budget is the one
figure that is *not* derived — Phase 1 is a fixed $1,000 policy price, and its
source says so — and the arrow runs the other way from there: the $1,000 leaves
$650 for creator fees, and that is what decides how many creators the warm-up
briefs.

**Nothing irreversible in a tool.** `request_funding` and `request_approval`
return a *request*. Confirming lives in the store and is only ever called from a
click. No tool can move money or publish.

**Streaming, not timers.** A caller never learns a duration. `total` is work
discovered so far and grows; cancelling keeps the partial result. The pacing is
synthetic — this is a mock — but it is derived from the size of each unit, so
nothing is metronomic and no screen assumes an end.

### What was ported from the current app

**The phase ladder and its rules**, still the best-specified idea in the
product: a campaign is a phase, phases run strictly in sequence, 80% of a
phase's own target unlocks the next, and revenue is measured per phase. Phase 1
is now fixed at $1,000 for every brand rather than sized per campaign, and the
rungs above it are derived from the plan budget the brand sets.

**The confidence rule**, ported unchanged from the campaign calculator: plan
budget divided by target multiple, high at 12,000 and medium at 4,000. What
changed is that it now explains itself and has teeth. The old calculator showed
a coloured bar and let you proceed regardless; here the agent says the division
out loud, names the threshold, and refuses to build below medium.

The signature marks — the keyline gradient and the 80% unlock notch — are
byte-identical, and now drawn by one component rather than three. The shell,
the card, the status pill and the creator matching idea all came across.

### What was deliberately not ported

The hand-typed Brand Fit score, which never changed when you switched brands and
disagreed with the checklist beside it. The indigo/violet palette that sat
alongside the brand one. The `outline: none` that hid focus on every button.
The four scattered "needs you" surfaces. And the eight occurrences of a
malformed Tailwind class that made the notification badge invisible.

The calculator's **sliders** did not come across either. Two sliders and a
live-updating panel is a control surface, and this product is a conversation —
so the same arithmetic runs, and the brand reaches it by typing two numbers.

See `../moontech/AUDIT.md` for the full read of the current app.

### Known edges

A hard refresh restarts the demo. Session state is in memory on purpose, rather
than pretending localStorage is a server; only the language and the autonomy
settings persist, because those are preferences. Deep links still work — every
tool is deterministic, so a plan that is not in the store is rebuilt from its
read id.
