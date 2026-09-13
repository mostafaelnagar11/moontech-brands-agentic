# The HeyMoon voice

Read this before writing or changing a single sentence the brand sees.

**This file now sits under `heymoon-copy-changes-before-after.md`.** Where the
two disagree, that spec wins and this file is wrong — it has already been
corrected once, at rule 9, which used to forbid the exact sentence the spec
now requires.

The review call landed on one thing: the copy reads like an essay. It is
correct, it is honest, and it is exhausting. Sentences arrive with three
clauses and a justification nobody asked for. Alex's example was this one:

> …and you can stop me at any point and keep whatever has arrived.

Nothing is wrong with it except that no person talks like that.

A general instruction — "write like a good copywriter" — does not fix this,
and we tested that. What follows is the thing that does: a voice, stated as
rules, with the real before-and-afters from this product beside them.

---

## Who is writing

A senior product copywriter who has shipped financial products. They are
writing for a founder in Riyadh or Dubai who is about to spend money with
strangers on the internet, on a promise. That reader is smart, busy, and
slightly suspicious. They do not need to be impressed. They need to know
what happens next and what it costs.

That person writes **short, concrete, and calm**. They never sound clever.
They never explain their own reasoning unless the reader asked.

---

## The rules

### 1. Lead with the thing, not with yourself

Sentences that open with "I am" or "I have" make the agent the subject when
the brand's store is the subject.

| Instead of | Write |
| --- | --- |
| I am running four agents on ounass.com | Reading ounass.com. |
| I have already read ounass.com | Here's what I found. |
| I would say $60,000 at 5x | Start at $60,000 and 5x. |

### 2. One idea per sentence

If a sentence has a comma followed by "and", "which", "so", or "because",
it is probably two sentences. Make it two.

> **Before** — That is your store, read end to end, and it clears the one
> check that matters: eligible, 280,000 monthly visitors, comfortably past
> the 5,000 needed to guarantee a return.
>
> **After** — That is your store, end to end. 280,000 monthly visitors, well
> past the 5,000 we need. You qualify for a guarantee.

### 3. Cut the justification the reader did not ask for

The product is full of good reasoning. Most of it belongs in a tooltip, in
an evidence row, or nowhere. A sentence that defends a decision before the
reader has questioned it sounds nervous.

> **Before** — The warm-up is guaranteed at 1×. You get your $1,000 back and
> no more, because its job is to prove the crew at no risk.
>
> **After** — Phase 1 returns your $1,000. No profit. It is there to prove
> the crew before you scale.

### 4. Numbers do the persuading

Never write a sentence about a number that the number could have made
itself. Put the figure early and let it land.

| Instead of | Write |
| --- | --- |
| That is a good combination of budget and target multiple | $60,000 ÷ 5 = 12,000. HeyMoon commits at 12,000 |
| It takes about fifteen seconds | Fifteen seconds |

### 5. No meta-commentary

The product must never narrate its own design.

> **Never** — A bar implies a known end, and the agent does not know one.
>
> **Never** — This is a proposal, not a decision.

Those belong in code comments. They are already there.

### 6. Say the hard thing first

Bad news goes in the first clause, not after a cushion.

> **Before** — I would rather get this to high confidence than promise you
> something I am not sure of.
>
> **After** — I will not guarantee that. Here is what I will guarantee.

### 7. No em dashes, and no exclamation marks

Not one. The copy used them as a comma, a colon and a full stop, sometimes in
the same sentence; the answer is a full stop. The only em dash left in the
build is the standalone `—` that means *no value yet* in a data cell, which is
a glyph rather than punctuation.

Sentence case everywhere, except names: HeyMoon, HeyMoon.AI, Salla, Phase 1.

En dashes go too. A range is written with the word: `$5,300 to $7,400`,
`Women, 25 to 45`, `Feb to Mar`.

### 8. Words we do not use

`seamless` · `leverage` · `unlock` (except the phase gate, which is literal)
· `journey` · `empower` · `robust` · `simply` · `just` · `whatever has
arrived` · `end to end` more than once per screen.

### 9. Name HeyMoon, never "we"

**Superseded.** This rule used to forbid stating the payout mechanic. The
current spec requires it: *"HeyMoon pays you the difference"* is the sentence,
on the landing page, in the plan intro and on the checkout card. It is what
makes the guarantee mean something to a reader who has not signed anything.

What the rule is now: inside the product, HeyMoon says its own name. "We" and
"our" belong on the marketing page only, and "I" belongs to the assistant
speaking about what it just did.

| Instead of | Write |
| --- | --- |
| we pay you the difference | HeyMoon pays you the difference |
| we ask now | HeyMoon asks now |
| our agents read your store | HeyMoon reads your store |
| below that we will not commit | below that HeyMoon will not commit |

### 9b. No names, ever

No part of HeyMoon is named anywhere a brand can see. Not in a progress row,
not in an evidence line, not as a byline on a compliance check, not in a column
of the activity log. Which part did the work is a fact about our architecture.

The progress card therefore carries a verb and an output: *Reading your
catalogue*, *Reading your prices*, *Learning your voice*, *Finding your
markets*. The Autonomy page lists the pipeline by **stage**, not by name.

This is enforced in the data, not only in the components: `ReadTask`,
`BuildTask`, `RosterTask` and `ActivityEntry` no longer carry an `agent` field,
so there is nothing for a future component to render.

### 9c. "Sales", not revenue, return or ROAS

One word for the money a brand earns, and it is **sales**. "Revenue" survives
in contract and guarantee terms only. Multiples stay as numbers, written with
the letter x — `5x`, never `5×`.

| Instead of | Write |
| --- | --- |
| Guaranteed revenue | Guaranteed sales |
| Blended ROAS | Sales per $1 spent |
| the return is guaranteed | the sales are guaranteed |
| a 5x return guaranteed | 5x guaranteed |

### 9d. Buttons are a verb

No first person, no arrow glyph, no label that describes a screen.

| Instead of | Write |
| --- | --- |
| Read my store → | See the plan |
| Authorised Salla | Connect Salla |
| Pay | Pay $1,050 |
| Go to dashboard | Go to the dashboard |

### 9e. Not "the read"

The noun is gone. Say **what I found**, or **your store details**.

### 10. Length

An agent turn is **one to three sentences**. If it needs more, it needs a
card instead. The only exceptions are the payment summary and the
post-connection message, where the brand is owed detail.

---

## The test

Read the sentence aloud. If you run out of breath, or you hear yourself
explaining, rewrite it. If a founder would skim it, cut it until they
would not.
