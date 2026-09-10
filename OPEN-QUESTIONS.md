# Open questions

Things I decided so the prototype could exist. Each one is a real product
decision, each is reversible, and each says what I chose and why. The first two
are the ones you named.

**Rebuilt as one chat surface, 10 Sep.** Every route except the landing is
gone. The conversation is the product and the panel is the only other place a
brand can act. Seven former screens are now panel views. That answers the
"nothing opens in another screen" instruction, and it puts three new questions
on this list — 11, 12 and 13.

**Updated after the review call.** Six things from that meeting are now built
and are no longer open: the flow is inverted (read → three-phase plan → payment
→ integration), the plan shows all three phases with only Phase 1 startable,
creator identities are withheld until payment, the read shows the real MoonTech
agents working through a task list, the button reads Start Phase 1, and the
integration step handles unsupported platforms with a contact form. What follows
is what is still genuinely undecided.

**The seven agents are the real ones now.** Scout, Ledger, Signal, Copy, Atlas
and Underwriter were invented for a loading state and are deleted. The pipeline
in the product is MoonShot AI (intake), MoonMatch AI (matching), MoonSearch AI
(safety), MoonWriter AI (creative), MoonLive AI (activation), MoonScore AI
(optimization) and MoonLearning AI (learning), plus the continuous learning loop
that feeds MoonLearning's findings back into matching, writing and budget. No
heading counts them by hand: the count is derived from `READ_TASKS` and
`BUILD_TASKS`, so a sentence cannot go stale behind the task list.

**Phase 1 is a fixed $1,000 warm-up.** That closed question 3 below and opened
question 4.

---

## 1. Can a brand create a campaign, or only fund the next rung?

**What I built: only fund the next rung, but the FIRST rung is co-authored.**

The current app is absolute about this — a comment in its command palette says
outright that there is no "new campaign" row because a brand cannot create one.
It works through a ladder it is given.

That is right for phases two and up: the whole point of the 80% line is that the
next rung is earned rather than chosen. But it is wrong at the start, because
there is no ladder yet, and a brand arriving with nothing has to have some say
in what the first phase is.

So in this prototype:

- **Phase 1** is proposed complete, and the brand can change most fields on it —
  markets, audience, guarantee, crew, brief — before funding. It picks between
  three plans. It cannot change the price: the warm-up is $1,000 for everybody
  (question 3). It never names the phase, and it cannot create a second
  concurrent one.
- **Phase 2 and beyond** appear when the phase before them crosses 80%. The
  brand funds or does not fund. Those budgets are quoted by MoonTech at unlock,
  on the crew and results by then. The ladder tiles beyond Phase 1 say
  "indicative" and are explicitly not sold.

**What I would want decided:** whether a brand can *edit* a later rung's budget
at the point of funding, or only accept the quote. I built accept-only, which is
the stronger version of the guarantee — we sized it, so we can stand behind it —
but it will feel controlling to a brand that wants to go bigger after a good
phase. A middle option: allow the brand to raise a rung's budget but re-quote
the multiple when it does.

---

## 2. How much may the agent do alone, with money and with published content?

**What I built: with money and publishing, nothing. Ever. Not configurable.**

`/autonomy` has three rows locked at Never and shown locked:

- move money
- publish an ad
- sign anything on the brand's behalf

They are not settings. There is no trust level that turns them on, and the
screen says so. In the code this is not a policy but a shape: `request_funding`
and `request_approval` return a *request*, and the functions that actually
confirm a payment or set an ad live are in the store and only ever called from a
click.

Everything else is the brand's call, defaulted:

| Default | Action |
| --- | --- |
| On its own | shift budget between live creators inside a funded phase; tighten the brief mid-phase; re-order the review queue |
| Asks first | swap a creator who drops out; pause an underperforming live ad; extend the phase window; message a creator |

**Three things I decided inside that, which are worth arguing about:**

**Budget rebalancing inside a funded phase defaults to "on its own."** The
brand has already committed that money to that phase, so moving it between
creators is not a new spend. I think that is right, and it is the single most
valuable thing an agent can do while a phase runs. But it *is* money moving, and
someone will read the locked "move money" row and then find a $340 reallocation
in the activity log. The log names it and offers an undo, which I think resolves
it. If it does not, the honest fix is to rename the locked row to "take a
payment" and be explicit that in-phase reallocation is a separate, allowed
thing.

**An undecided draft publishes on its own after ten days.** Ported from the
current app, where the review screen states it plainly. It is the one case where
content goes live without an explicit approval, and it exists because a phase
metered against a guarantee cannot deliver if nothing runs. The prototype says
it on every waiting card and in the queue header. Flagging it because it sits
awkwardly next to "nothing publishes without you" — both are true, and the
second needs the first as a footnote.

**The agent refuses to quote a guarantee it expects to miss.** If an edit makes
the plan undeliverable, the agent says so unprompted and proposes the nearest
plan that works. I decided it should not silently keep displaying the old
multiple. It also means the agent can *lower* a guarantee — which is a
commercial decision I made in a prototype, and probably needs a rule about how
far it may go without a human.

---

## 3. Where does the Phase 1 budget come from? — ANSWERED

**Decided: nowhere. It is a fixed $1,000 warm-up, the same for every brand,
every time.** Not derived from the crew, not sized from the store, not sized
from traffic, not negotiated. `PHASE1_BUDGET = 1_000` in
`app/lib/agent/tools.ts` is the whole answer, and the figure's own `why` says it
is a policy price rather than a calculation.

The question this section used to ask — what to anchor the budget to — turned
out to be the wrong question. A brand does not want a defensible number, it
wants to know what happens if it says yes. $1,000 is the price of finding out
whether this works on your real orders, and there is nothing to weigh up, agree
or haggle over before you start. It is also, on the evidence of the copy pass,
the single most persuasive fact in the product, and it had been buried inside a
derivation nobody asked for.

The three plans still exist and still differ — but by **focus, not price**. All
three cost $1,000. What changes is what the thousand is pointed at, and
therefore the multiple we will stand behind:

| Plan | What the $1,000 is pointed at | Guarantee |
| --- | --- | --- |
| The wide, safe plan | eight product lines — your whole bestselling range | 3× |
| The balanced plan | your four strongest products | 5× |
| The concentrated plan | two products, your bestsellers | 8× |

**What this resolved.** The inversion this section used to flag — the safe
option costing the most and the aggressive one costing least — is gone, because
no plan costs more than another. Breadth still buys a smaller promise and
concentration a larger one, which is the honest relationship; it simply no
longer arrives attached to a price that reads backwards. The second complaint
went with it: Phase 1 no longer lands at $9,000–$19,500 against a ladder that
starts at $1,000. The warm-up is the ladder's first rung, and the two rungs
above it are sized from the whole-plan budget the brand sets (`phasesFor` in
`tools.ts`), so a $60,000 plan runs $1,000 → $19,500 → $39,500.

**What became of the review call's calculator — RESOLVED, as a conversation.**
One explicit action item from that meeting was "add budget calculator/slider to
plan screen." It exists now, and it is neither a slider nor on the plan screen.

The reasoning that used to sit here still holds for the warm-up: a slider
implies a number the brand can move, and $1,000 is not one; a control that
cannot change anything invites the negotiation the product deliberately
removed and costs the pitch its best fact. What that reasoning also said is
where the honest dial would go — *a whole-plan size that shapes Phases 2 and 3*
— and that is exactly what got built.

It runs **before** the plan, not on it, and it runs in words:

- The agent asks for two numbers, the whole-plan budget and the target
  multiple, and proposes a pair it can already call high confidence.
- The brand answers in a sentence — `$40,000 at 5×`, `make it $25,000`, `8×`.
- The agent replies with the confidence in that pair and the division behind
  it, and pushes toward high.
- A small read-only bar under the sentence shows where the pair sits. It is a
  reading, not a control.

**And it has teeth, which the original never did.** Below medium confidence the
agent will not build: there is no *Build it anyway* chip under the 4,000 line,
and asking in words gets a refusal and the two ways out. The old calculator
coloured a bar red and let you carry on regardless, which made the confidence
score decoration. Here it is a gate, because the guarantee is the product and
we pay the difference when a phase misses.

Nothing about phases or the $1,000 is said at this stage. Those describe a plan
that does not exist yet.

**Still open:** whether medium should build at all, or whether high is the only
level we will write a guarantee at. Medium is currently allowed on the argument
that "needs strong creator performance" is a real position a brand may take
knowingly. The argument against is that we carry the downside either way, so
the brand's appetite for it is not the deciding input.

---

## 4. Three creators out of eight — should Phase 1's crew be a floor?

**Newly open, and a direct consequence of question 3.**

The warm-up is budget-limited, not count-limited. $1,000 leaves $650 for creator
fees (`CREW_BUDGET`, 65% of the phase), and $650 briefs the three best value
creators out of the pool MoonMatch AI matched and MoonSearch AI cleared. The
rest of that pool is what Phases 2 and 3 are for, which is a real and defensible
answer to "why phase it at all".

**The pool is bounded at 7 and 13** (`POOL_MIN` / `POOL_MAX`). Only the ceiling
is enforced in code, as a slice in `matchedPool`: past thirteen a shortlist
stops being a shortlist and MoonSearch AI is vouching for people nobody looked
at twice. The floor is deliberately *not* a clamp. Topping a thin market up to
seven with creators who do not clear `MIN_MARKET_FIT` would be the exact lie
that cut exists to prevent, so it is met by the roster instead: every brand's
proposal step lands at 8. Narrow the markets far enough — Kuwait alone drops to
4, Qatar alone to 0 — and the honest answer is the smaller number plus
`repair`'s offer to widen.

*Still open:* the ten-creator mock roster is what makes the floor a coincidence
rather than a property. Reaching the top of the range, or holding the floor
through a single-market plan, needs roughly twice the roster — and the ten we
have are real people with real photographs, which is not a thing this prototype
can invent more of. Either the range moves, or the roster gets sourced.

**But the brand sees both numbers, and they do not match.** Before payment the
plan says eight creators were matched to them; after payment three are named.
Everywhere this appears — `CreatorSummary`, the plan panel, the crew line in the
conversation — it is now stated rather than glossed over ("3 of the 8 matched
creators are in your warm-up crew"), which I think is the right instinct. What a
prototype cannot settle is whether stating it is enough:

- it may read as the plan shrinking at the exact moment money changes hands,
  which is the worst possible moment for a number to get smaller;
- or it may read as what it actually is — a warm-up, deliberately small, with
  the rest of the pool held for the phases it unlocks.

**Options, if it turns out to be a problem:**

1. **Make the crew size a floor.** Phase 1 always briefs at least five, and the
   fee mix is solved inside $650 by preferring cheaper creators. Cheap here
   means small and specific rather than weak, which may be the right crew for a
   warm-up anyway — but it rules out every large account at Phase 1, and one of
   those may be the only reason a brand said yes.
2. **Match narrower.** Have MoonMatch return a pool nearer to what the warm-up
   can actually brief, so the two numbers sit close together. Honest, and it
   throws away the best argument for Phase 2.
3. **Leave it, and lead with the pool.** Sell "eight matched, three briefed now,
   the rest unlocked by results" as the shape of the offer rather than as an
   apology for it. That is what is built today, and the plan card now leads with
   the pool — *8 matched · 3 in the warm-up* — where it used to show the crew
   under a label that said "matched".

Whichever way it goes, two rules from the review call survive it: no fee beside
a creator, ever, and no names before Phase 1 is paid for.

---

## 5. The conversion benchmark

Every revenue figure rests on one number I could not derive from the brand:
orders per view, by category (luxury 0.085%, beauty 0.11%, grocery 0.175%). It
is labelled a MoonTech platform benchmark everywhere it appears, which is the
honest framing, but it is the one input a brand cannot check.

**Needs a real number**, and probably needs a confidence interval rather than a
point estimate, since it drives the expected range that the guarantee headroom
is measured against.

---

## 6. What a correction to the read actually does

A brand can correct any field in the Brand Read. Today a correction is
**recorded and displayed** — kept beside the agent's own value — but only the
category correction feeds back into the plan.

I stopped there because the interesting question is not technical. If a brand
says "our price band is higher than that", does the plan re-price on their word,
or does the agent hold its own reading until it can verify? I lean towards:
re-price immediately, keep both values, and show which figures now rest on the
brand's claim rather than on evidence. That needs a visual treatment I did not
build.

---

## 7. Eligibility, and who sees the threshold

Eligibility is one line inside the read rather than a gate, and a store below
the floor still gets its whole profile. The 5,000-visitor minimum is stated with
its reason: below it, per-creator attribution is too noisy to carry a guarantee.

**What I decided:** the rejected brand sees the exact number we measured
(3,200), the exact gap (1,800) and a re-check request. The current app alternates
eligibility on a hidden flag for demo purposes; here it is a property of the
store, so `freshgrocer.ae` is always the rejected path.

**Open:** whether an ineligible brand should be able to run an *unguaranteed*
phase. Everything else about them works — we read the catalogue, matched
creators, drafted a brief. The only thing that fails is the guarantee. A
non-guaranteed tier would convert brands the current product turns away, and it
would need its own name, price and screen.

---

## 8. What the review call changed, and what it left open

**Integration moved after payment.** The call was explicit: a brand that gets a
full analysis and a costed plan without committing has no reason to commit. So
connecting the store now happens once Phase 1 is paid for, framed as measurement
rather than qualification.

*Still open:* a brand can now pay before we have confirmed we can read their
orders. If the integration then fails — an exotic platform, no orders API — we
have taken money for a phase whose guarantee we cannot measure. I have written
the "something else" path to promise a manual build within a working day, which
covers it commercially, but somebody should decide the refund rule for the case
where it genuinely cannot be integrated.

**Creator identities are withheld until payment.** Before Phase 1 starts the
brand sees two counts — how many MoonMatch AI matched, and how many of them the
warm-up briefs — plus the combined reach per post, the share of that audience in
their markets, the niches and the platforms. Everything needed to judge the
plan, and nothing they could take to the creators directly. No fee appears, in
aggregate or per person.

*Still open:* how much is enough to sell with. Three anonymous avatars and three
aggregate numbers is a weaker page than three faces with reasons, and the
conversion cost of that is real. A middle option nobody has ruled on: show one
creator in full as a sample and keep the rest counted.

**The three-phase ladder is now the pitch.** The plan leads with all three
rungs and the total guaranteed revenue across them, and only Phase 1 is
startable.

**The warm-up is guaranteed at 1×, and the multiple climbs.** Phase 1 returns
the $1,000 and no more, because its job is to prove the crew at no risk. Phases
2 and 3 carry the promise, sized so the **blended average across all three
equals the multiple the brand asked for** (`phaseMultiples` in `tools.ts`). A
$60,000 plan at 5× runs 1× → 3.5× → 5.9×, and the on-screen total is the sum of
its own rows rather than a headline multiplied out.

*Still open:* whether quoting Phase 2 and Phase 3 budgets up front creates an
expectation we then have to honour. Today the tiles say "opens when Phase 1
reaches 80%" and "indicative until Phase 2 closes", but a brand that reads
$302,300 of guaranteed revenue on the first screen has anchored on it — and the
$1,000 entry price makes that anchor easier to swallow, not harder, which cuts
both ways.

*Also open:* the 1× warm-up is honest and it is a weaker headline. "Get your
$1,000 back" is the least exciting sentence on the page, sitting directly above
the most exciting one. Nobody has tested whether leading with the blended
average and letting the 1× arrive second reads better than the reverse.

---

## 9. Two things from the brief that are not in the build

**The live example read on the landing page is gone, and so are the sample
chips.** The brief asked for a live example and it was built — a real read of a
real store, streaming under the field on load. Both were removed on review: the
example answered the question before the visitor had asked it, and the chips
made the front door busy. The landing is now one field. The demonstration
happens a click later, in the conversation, on the visitor's own store.

The demo consequence: the three sample stores have to be typed rather than
clicked. They are listed in the README. Easy to put either back — the example
used the same read the thread now runs.

**There is no separate Brand Read screen at all any more.** The read happens
inside the conversation, and **See the full read** opens it as a panel view
with every layer correctable in place. The standalone `/read/[id]` page was
deleted along with the other seven routes; three remain — the landing, `/c`,
and a catch-all that redirects old bookmarks. Copies of every deleted page are
in the session scratchpad rather than in git, because this project is not a
repository.

## 10. Smaller calls

**The review window is ten days**, ported unchanged.

**The agent has one voice and no name.** It says "I". It does not have a
persona, an avatar beyond the ✦, or a personality. I think naming it would make
it harder to hand a decision back to the brand.

**Two different confidences share a word, which is a problem.** The
plan-shaping conversation uses MoonTech's own ratio rule — plan budget over
target multiple, high at 12,000 — because that is the number the business
already commits against. The plan card's underwriting check uses a second one:
how far the model's expectation sits above what we guarantee. They agree in
practice and they measure different things, and a brand who sees "high
confidence" in the chat and a headroom percentage on the card has no way to
know that. One of them should be renamed.

**The store read takes about fifteen seconds**, tuned in `costOf`. Long enough
that four named agents visibly do work, short enough that nobody walks away. A
two-second read looks like a lookup, and the whole point of naming MoonShot,
MoonMatch, MoonWriter and MoonScore on screen is that a brand sees work being
done rather than a record being fetched. The plan build lands around eleven
seconds on the same rule.

**Agents finish before results appear.** The roster and the findings never
share the screen: while a read is running the block shows only who is working
and on what, and the findings replace it when they land. Showing both at once
made the work look decorative, because the answer was already there.

**Stopping lives on the send button.** It becomes a stop button for as long as
a run is open, the way every chat people already use does it. It used to sit
beside the progress line in the thread, which put the way out on a row that
scrolls: a brand who decided to stop had to find the control again, and it had
moved. The progress line now reports and does not offer.

**Stopping is now cheap, which made the cancel paths matter.** With the
control on the send button a brand can stop any run in one click, and an
adversarial pass over those paths found five places where a partial was
treated as a finished result: a stopped read overwrote a complete one it
shared an id with; the completion claim was spent by the cancel, silencing
the read that followed; a build stopped before the crew step was committed
as the active plan, which showed a fully priced campaign with nobody on it
AND permanently closed the two-number question, since that only opens while
there is no plan; a cancelled report was pushed into the thread a third time
under a heading saying it was finished; and a run that threw left the button
stuck on stop with nothing to stop. All five are fixed. The rule they now
share: a partial is kept and shown, and never written over something whole.

*Still open:* "read it again" starts from the top rather than resuming from
the last completed layer. Resuming is what the streaming contract is shaped
for — every yield is a complete-so-far result — but a real resume needs
`read_site` to accept a starting point, and nobody has decided whether a
half-read store should be re-read for freshness anyway.

**The plan no longer opens by calling itself a proposal.** "This is a proposal,
not a decision" handed the brand a reason to hesitate at the moment the plan is
ready to start, and made our own work sound provisional. It reads "The plan is
ready to start. What is on it is still yours to change" — the same honesty
about what can move, without the apology for having done the work.

**Session state is in memory.** A hard refresh restarts the demo, which is
deliberate — the alternative is localStorage pretending to be a server, which is
the thing the audit criticised. Only language and autonomy settings persist,
because those are preferences.

**There are three sample stores.** `ounass.com` (eligible, luxury),
`lunabeauty.ae` (eligible, own-label beauty, different economics) and
`freshgrocer.ae` (below the floor). Any other domain gets a generic read that is
explicitly marked as a first pass with lower confidence.

**Arabic covers the three surfaces you named** — landing, Brand Read, thread —
and only those mirror. Product names, creator handles and figures stay as they
are, because inventing Arabic names for real products would be worse than
leaving them. The rest of the app stays left-to-right rather than becoming
right-aligned English.

---

## 11a. The agent builds; the dashboard runs — ANSWERED

**Decided: two surfaces.** The five running views left the chat's panel for
`/dashboard`. The agent at `/c` reads the store, settles two numbers, builds
the campaign, takes the payment and connects the store, and then it is done.
What comes after is a phase running for weeks, which is a place you check
rather than a thread you scroll.

Keeping them beside the conversation made two claims that were not true: that
the agent stays with you through the phase, and that a brand who has not built
anything yet has five things to look at. **Go to dashboard** is now the last
step, and it appears only once the store is connected.

**Still open, and the reason this section exists:** the dashboard has no
assistant. Every question the builder can answer about a plan — why this
creator, why this number, what happens if I change it — has an equivalent
about a running phase, and there is nobody on that page to ask. It is the next
thing to build, and it is a different agent: the builder knows a store, and
this one would have to know a phase in flight. Whether they share a thread, a
memory or nothing at all is undecided.

*Minor consequence, unresolved:* `panel.view` is one store field shared by both
surfaces, so returning to `/c` after looking at Ads leaves that name behind.
The chat panel answers with a card saying where the view went, which is honest
but is a redirect standing in for two pieces of state.

---

## 11. The rail — ANSWERED, it is gone

**Decided: no sidebar.** Onboarding creates one campaign. There is no second
campaign to switch to and no "new campaign" to start, so a rail listing them
was three rows of furniture pretending to be navigation — and a rail with one
row looks broken, which is why the prototype had been padding it with two
campaigns that did not exist.

The half of it that was doing real work, the panel views, moved into the panel
itself as a row of tabs. That keeps the answer to the question this section
used to ask — nobody discovers "show me the ads" unless something tells them
it exists — without a column that exists to hold it.

**The tabs are gated on what exists**, which the rail never was: **Read**
appears once a store has been read, **Plan** once there is a plan, and the five
running views only once a phase is paid for. Below two tabs the row does not
render. A tab with nothing behind it is a promise the panel cannot keep, and
the empty-state screens it used to lead to were the clearest tell that this was
a demo.

**Still open:** what the top-left holds besides the mark. Right now it is the
logo and a link back to a new read, over a white fade. If a brand ever runs two
campaigns, that corner is where switching would have to live.

## 12. The panel has no history

Closing the panel and opening it again puts you on the same view, but there is
no back, and no record of what you were looking at three questions ago. In a
conversation that can run for twenty turns, a brand may well want to return to
the plan as it stood before an edit.

**Partly addressed.** The first of the three options below is now built: the
panel carries its own gated tab row, so moving between views no longer needs a
sentence. The other two are untouched.

**Still open:** per-view history; or snapshots of the plan attached to each
attribution row, so pressing a change opens the plan as it was. The second is
the most useful and the most work.

## 13. One conversation per brand, or many?

**Settled for now: one.** Onboarding creates one campaign, the rail that used
to imply otherwise is gone, and the prototype holds a single conversation.

**Needs deciding when a brand has a second campaign.** One-per-campaign matches
the phase model, but it splits the history of a brand across threads, which is
exactly what makes an agent's memory feel thin — the loop in question 9 depends
on MoonLearning AI carrying one campaign's results into the next, and a brand
should not have to re-explain themselves in a new thread to get it. The
alternative is one standing conversation per brand with campaigns as artifacts
inside it, which is what the panel already is.
