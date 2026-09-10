/* What a store read produces.

   Every field carries the evidence it came from, because the read screen
   shows the evidence beside the claim and lets the brand correct it. The
   current app has none of this — `BrandCriteria` is four fields and there
   is no brand profile at all — so all of this is new content rather than
   a port.

   Figures are written as the thing that was observed, never as a round
   number that sounds good. "42 of 60 items on /new-in priced 400–1,900
   AED" is a claim a brand can check; "mid-to-high price band" is not. */

import type { BrandRead, Evidence, Sourced } from "../agent/types";

const ev = (id: string, kind: Evidence["kind"], label: string, detail: string, at?: string): Evidence =>
  ({ id, kind, label, detail, at });

const s = <T,>(value: T, why: string, evidence: Evidence[], computedFrom?: string): Sourced<T> =>
  ({ value, why, evidence, computedFrom, setBy: "agent" });

export interface ReadFixture {
  url: string;
  /** How many work units this read takes, per layer. Drives the
      progress count — it is a count of things to look at, not seconds. */
  build: (id: string) => BrandRead;
}

/* ══════════════════════════════════════════════════════════════════
   Ounass — luxury fashion, eligible. The main demo path.
   ══════════════════════════════════════════════════════════════════ */

const ounass = (id: string): BrandRead => ({
  id,
  url: "ounass.com",
  done: [],
  corrections: [],
  identity: {
    name: s("Ounass", "The name in the site header and the Open Graph title agree.", [
      ev("ou-og", "page", "ounass.com", "og:site_name is “Ounass”; the wordmark in the header matches.", "read just now"),
    ]),
    logo: "/ounass-logo.jpeg",
    tagline: s(
      "Luxury shopping, delivered same day in the Gulf",
      "Lifted from the meta description, which is the sentence the brand chose for itself.",
      [ev("ou-meta", "page", "meta description", "“The Middle East's leading luxury shopping destination. Same-day delivery in Dubai.”")]
    ),
  },
  category: s(
    "Luxury fashion and beauty e-commerce",
    "Two thirds of the top-level navigation is apparel and accessories, and the designer index lists 312 houses. That is a multi-brand luxury retailer, not a single-label store.",
    [
      ev("ou-nav", "page", "top navigation", "Women, Men, Kids, Beauty, Home, Designers — 6 sections, 4 of them apparel or beauty."),
      ev("ou-desig", "page", "/designers", "312 brands indexed, including 41 tagged “Exclusive”."),
      ev("ou-schema", "page", "schema.org", "Organization type is OnlineStore; product schema present on 60 of 60 sampled pages."),
    ]
  ),
  priceBand: s(
    { low: 400, high: 1_900, median: 890, currency: "AED" },
    "Sampled 60 products across the four biggest categories. The middle 80% sit between 400 and 1,900 AED, with a median of 890.",
    [
      ev("ou-price", "product", "60-item sample", "Sampled /new-in, /women/bags, /beauty, /men. 10th percentile 400 AED, 90th 1,900, median 890."),
      ev("ou-tail", "product", "the long tail", "6 items above 12,000 AED, excluded from the band as outliers rather than raising it."),
    ]
  ),
  bestsellers: s(
    [
      { name: "Structured Leather Tote", price: "1,450 AED", note: "First in /women/bags for 3 of the last 4 weeks", img: "/creators/olafarahat/p1.jpg" },
      { name: "Pearl Mesh Clutch", price: "980 AED", note: "Carries an “Exclusive” badge and appears in 4 editorial modules", img: "/ads/palm-ounass-clutch.jpg" },
      { name: "Amber Oud Eau de Parfum", price: "690 AED", note: "Top of /beauty/fragrance, and the only item with a restock notice", img: "/creators/olafarahat/p2.jpg" },
      { name: "Silk Slip Dress — Midnight", price: "1,190 AED", note: "Pinned to the homepage hero in two of three page loads", img: "/creators/asmaalazmii_/p1.jpg" },
    ],
    "Ranked by where the store itself puts things: default sort position, editorial placement and restock notices. No sales data was available before you connect your store.",
    [
      ev("ou-sort", "page", "category default sort", "“Most popular” is the default sort on all four sampled categories; position 1–4 recorded over 4 weeks."),
      ev("ou-hero", "page", "homepage hero", "3 page loads over 2 days; the slip dress appeared in 2."),
      ev("ou-nodata", "policy", "no order data yet", "Connect Salla, Zid or Shopify and this switches to actual units sold."),
    ]
  ),
  voice: s(
    {
      words: ["Edit", "Curated", "Exclusive", "The", "Discover"],
      sample: "The Resort Edit — pieces chosen for long days and longer evenings.",
      register: "Editorial and restrained. Second person is rare, exclamation marks absent.",
    },
    "Counted the words that recur across 40 product descriptions and 12 editorial blocks. The store writes like a magazine, not like a shop.",
    [
      ev("ou-copy", "page", "40 product descriptions", "“Edit” appears 28 times, “curated” 19, “exclusive” 17. Zero exclamation marks."),
      ev("ou-edit", "page", "12 editorial modules", "Every one is titled “The … Edit”. Average sentence length 14 words."),
    ]
  ),
  socials: s(
    [
      { platform: "Instagram", handle: "@ounass", followers: 1_240_000, note: "Posts 5–6 times a week; Reels are 70% of the last 30 posts." },
      { platform: "TikTok", handle: "@ounass", followers: 186_000, note: "Started 2022. Lower cadence, higher completion on haul formats." },
      { platform: "Snapchat", handle: "ounass", followers: 0, note: "Linked in the footer; follower count is not public." },
    ],
    "Taken from the links in the site footer and the public profile pages they point at.",
    [
      ev("ou-footer", "page", "site footer", "Four social links: Instagram, TikTok, Snapchat, Pinterest. Pinterest 404s."),
      ev("ou-ig", "social", "@ounass on Instagram", "1.24M followers, 5–6 posts a week, 21 of the last 30 are Reels.", "checked just now"),
      ev("ou-tt", "social", "@ounass on TikTok", "186K followers, first post March 2022."),
    ]
  ),
  markets: s(
    [
      { code: "AE", name: "United Arab Emirates", share: 52, note: "Same-day delivery promised in Dubai and Abu Dhabi only." },
      { code: "SA", name: "Saudi Arabia", share: 27, note: "Prices shown in SAR when you switch; separate returns policy." },
      { code: "KW", name: "Kuwait", share: 9, note: "Delivery in 2–3 days. No dedicated landing page." },
      { code: "QA", name: "Qatar", share: 7, note: "Delivery in 2–3 days." },
      { code: "BH", name: "Bahrain", share: 5, note: "Listed at checkout; no marketing pages." },
    ],
    "The store ships to five Gulf markets and treats two of them as first class. Share is estimated from currency and language variants the site offers, weighted by how prominently each is served.",
    [
      ev("ou-ship", "page", "delivery page", "Five destinations listed. UAE and KSA have their own returns policies; the rest share one."),
      ev("ou-cur", "page", "currency switcher", "AED, SAR, KWD, QAR, BHD. AED is the default on every entry point tested."),
      ev("ou-est", "benchmark", "estimated split", "Weighted from delivery promise, currency default and language variants. Replaceable with real order data once your store is connected."),
    ]
  ),
  seasonality: s(
    [
      { label: "Ramadan and Eid", window: "Feb – Mar", lift: "Highest of the year", note: "A dedicated /ramadan landing page appears each year and is linked from the header." },
      { label: "Summer resort", window: "May – Jun", lift: "Second peak", note: "The Resort Edit ran in each of the last three years." },
      { label: "White Friday", window: "Late Nov", lift: "Sharp and short", note: "Sitewide promotion; historically the only time discounts exceed 40%." },
      { label: "Back to work", window: "Sep", lift: "Modest", note: "Tailoring and outerwear move to the front of the navigation." },
    ],
    "Read from the campaign landing pages the store has published before and left in its sitemap, plus what its header links to right now.",
    [
      ev("ou-sitemap", "page", "sitemap.xml", "/ramadan, /resort-edit and /white-friday all present with lastmod dates in three consecutive years."),
      ev("ou-cal", "platform", "MoonTech GCC calendar", "Ramadan begins 18 Feb 2026. Gulf luxury demand peaks in the ten days before Eid."),
    ]
  ),
  eligibility: {
    state: "ok",
    line: s(
      "Eligible — 280,000 monthly visitors, comfortably past the 5,000 needed to guarantee a return",
      "A guaranteed ROAS is attributed through one tracking link per creator. Below roughly 5,000 monthly visitors that attribution gets too noisy to guarantee, so the floor exists to protect the guarantee, not to gate the product.",
      [
        ev("ou-traffic", "platform", "traffic estimate", "280,000 monthly unique visitors, from MoonTech's panel and public rank data.", "estimated this month"),
        ev("ou-floor", "policy", "the 5,000 floor", "The minimum at which per-creator attribution is stable enough to carry a guarantee."),
      ]
    ),
  },
});

/* ══════════════════════════════════════════════════════════════════
   Luna Beauty — smaller, eligible, a different voice.
   ══════════════════════════════════════════════════════════════════ */

const luna = (id: string): BrandRead => ({
  id,
  url: "lunabeauty.ae",
  done: [],
  corrections: [],
  identity: {
    name: s("Luna Beauty", "Wordmark and page title agree.", [
      ev("lu-og", "page", "lunabeauty.ae", "og:site_name is “Luna Beauty”."),
    ]),
    logo: "/luna-logo.png",
    tagline: s("Skin first. Everything else after.", "The line under the logo on every page.", [
      ev("lu-tag", "page", "header", "The same six words sit under the wordmark sitewide."),
    ]),
  },
  category: s(
    "Skincare and colour cosmetics, own label",
    "One brand, 38 products, no designer index. That is an own-label beauty store rather than a retailer.",
    [
      ev("lu-cat", "page", "/shop", "38 products across 5 collections. Every one is branded Luna."),
      ev("lu-nav", "page", "top navigation", "Skincare, Makeup, Sets, About, Journal."),
    ]
  ),
  priceBand: s(
    { low: 89, high: 340, median: 165, currency: "AED" },
    "All 38 products priced. The middle 80% sit between 89 and 340 AED, median 165 — accessible rather than prestige.",
    [ev("lu-price", "product", "all 38 products", "Cheapest 89 AED (lip oil), dearest 340 AED (the full ritual set). Median 165.")]
  ),
  bestsellers: s(
    [
      { name: "Rose Cleansing Balm", price: "145 AED", note: "First on /shop and the only product with a review count over 400", img: "/creators/makeupbymemz/p1.jpg" },
      { name: "Vitamin C Serum 30ml", price: "210 AED", note: "Out of stock twice in the last month", img: "/creators/makeupbymemz/p2.jpg" },
      { name: "Barrier Repair Cream", price: "185 AED", note: "Bundled into three of the five sets", img: "/creators/makeupbymemz/p4.jpg" },
    ],
    "Ranked by review volume, restock notices and how often a product appears inside a bundle.",
    [
      ev("lu-rev", "page", "product reviews", "Cleansing balm 412 reviews; next highest 156."),
      ev("lu-stock", "page", "stock notices", "Vitamin C serum carried a “back in stock” banner twice in 30 days."),
    ]
  ),
  voice: s(
    { words: ["Honest", "Barrier", "Gentle", "Actually", "Skin"], sample: "Gentle enough for every day. Honest about what it won't fix.", register: "Plain and direct. Talks to you, not about itself." },
    "Counted across 38 product descriptions and 9 journal posts. The store's habit is to say what a product will not do.",
    [
      ev("lu-copy", "page", "38 descriptions", "“Won't” or “doesn't” appears in 22 of 38. “Honest” 14 times."),
      ev("lu-journal", "page", "/journal", "9 posts, all first person, average 320 words."),
    ]
  ),
  socials: s(
    [
      { platform: "Instagram", handle: "@lunabeauty.ae", followers: 84_000, note: "Posts daily; heavy on before-and-after carousels." },
      { platform: "TikTok", handle: "@lunabeauty", followers: 121_000, note: "Larger than Instagram, and growing faster." },
    ],
    "From the footer links and the profiles they point at.",
    [
      ev("lu-ig", "social", "@lunabeauty.ae", "84K followers, daily cadence."),
      ev("lu-tt", "social", "@lunabeauty", "121K followers. Bigger audience than Instagram, which is unusual and worth planning around."),
    ]
  ),
  markets: s(
    [
      { code: "AE", name: "United Arab Emirates", share: 61, note: "Free delivery over 200 AED." },
      { code: "SA", name: "Saudi Arabia", share: 24, note: "Ships in 3–5 days; no SAR pricing." },
      { code: "KW", name: "Kuwait", share: 15, note: "Ships in 3–5 days." },
    ],
    "Three markets at checkout. Only the UAE gets a delivery promise on the product page.",
    [ev("lu-ship", "page", "delivery page", "UAE, KSA, Kuwait. AED only — no currency switcher.")]
  ),
  seasonality: s(
    [
      { label: "Ramadan gifting", window: "Feb – Mar", lift: "Strongest", note: "The gift sets exist for this window; they appeared last year in early February." },
      { label: "Summer barrier care", window: "Jun – Aug", lift: "Steady", note: "Journal posts pivot to heat and SPF." },
    ],
    "From last year's landing pages still in the sitemap and the journal's publishing pattern.",
    [ev("lu-sitemap", "page", "sitemap.xml", "/ramadan-sets present with a lastmod of 4 Feb last year.")]
  ),
  eligibility: {
    state: "ok",
    line: s(
      "Eligible — 41,000 monthly visitors, past the 5,000 needed to guarantee a return",
      "Enough traffic for per-creator attribution to be stable, which is what the guarantee rests on.",
      [ev("lu-traffic", "platform", "traffic estimate", "41,000 monthly unique visitors.", "estimated this month")]
    ),
  },
});

/* ══════════════════════════════════════════════════════════════════
   FreshGrocer — the rejected state.

   Written as a read that succeeded and found one thing missing, not as
   a gate that slammed. The brand still gets its full profile: we learned
   a lot, and only one number is short.
   ══════════════════════════════════════════════════════════════════ */

const fresh = (id: string): BrandRead => ({
  id,
  url: "freshgrocer.ae",
  done: [],
  corrections: [],
  identity: {
    name: s("FreshGrocer", "Wordmark and title agree.", [ev("fg-og", "page", "freshgrocer.ae", "og:site_name is “FreshGrocer”.")]),
    logo: "/freshgrocer-logo.jpg",
    tagline: s("Same-day produce, from the market to your door", "The line in the hero.", [ev("fg-tag", "page", "homepage hero", "One sentence, unchanged across three page loads.")]),
  },
  category: s(
    "Online grocery and fresh produce",
    "Perishables with a delivery-window picker. That is grocery, which behaves differently from every other category on MoonTech: high repeat, low basket, no seasonality to speak of.",
    [
      ev("fg-cat", "page", "/shop", "212 SKUs, 61% perishable."),
      ev("fg-slot", "page", "checkout", "A delivery-window picker, which only grocery has."),
    ]
  ),
  priceBand: s(
    { low: 8, high: 65, median: 22, currency: "AED" },
    "212 products priced. Median basket item is 22 AED — a tenth of what the rest of the roster sells.",
    [ev("fg-price", "product", "all 212 SKUs", "8 AED (a bunch of herbs) to 65 AED (a produce box). Median 22.")]
  ),
  bestsellers: s(
    [
      { name: "Weekly Produce Box — Medium", price: "65 AED", note: "The only subscription product, and the site's default add-to-cart", img: "/creators/skindew0/p1.jpg" },
      { name: "Cold-Pressed Juice Set", price: "48 AED", note: "Pinned to the homepage", img: "/creators/makeupbymemz/p3.jpg" },
    ],
    "Ranked by placement and by which product the store defaults the cart to.",
    [ev("fg-box", "page", "homepage", "The medium box is the only pre-filled cart option.")]
  ),
  voice: s(
    { words: ["Fresh", "Today", "Local", "Picked", "Same-day"], sample: "Picked this morning. At your door by six.", register: "Short, practical, time-led. Every sentence is about speed." },
    "Counted across 60 product descriptions. Time words outnumber quality words two to one.",
    [ev("fg-copy", "page", "60 descriptions", "“Today”, “same-day” or “this morning” in 44 of 60.")]
  ),
  socials: s(
    [{ platform: "Instagram", handle: "@freshgrocer.ae", followers: 11_400, note: "Posts twice a week. Mostly product photography, little creator work." }],
    "One link in the footer.",
    [ev("fg-ig", "social", "@freshgrocer.ae", "11.4K followers, 2 posts a week, no tagged creator content in the last 90 days.")]
  ),
  markets: s(
    [{ code: "AE", name: "United Arab Emirates", share: 100, note: "Dubai and Sharjah only. Perishables do not cross borders." }],
    "One market, and structurally it cannot be more: same-day perishable delivery does not travel.",
    [ev("fg-ship", "page", "delivery page", "Dubai and Sharjah postcodes only.")]
  ),
  seasonality: s(
    [{ label: "Ramadan", window: "Feb – Mar", lift: "Basket size up, order count flat", note: "Iftar bundles appeared last year; the rest of the year is level." }],
    "Grocery is the flattest category on the platform. One window moves, and it moves basket size rather than order count.",
    [ev("fg-flat", "benchmark", "grocery on MoonTech", "Across grocery brands, month-to-month order variance is under 8%.")]
  ),
  eligibility: {
    state: "short",
    line: s(
      "Not eligible yet — 3,200 monthly visitors against the 5,000 a guarantee needs",
      "A guaranteed return is attributed through one tracking link per creator. Below roughly 5,000 monthly visitors there are too few conversions per link to tell a creator's effect from noise, and MoonTech covers the shortfall when a guarantee misses — so a guarantee on thin traffic is a coin flip for both of us.",
      [
        ev("fg-traffic", "platform", "traffic estimate", "3,200 monthly unique visitors, from MoonTech's panel and public rank data.", "estimated this month"),
        ev("fg-floor", "policy", "the 5,000 floor", "The minimum at which per-creator attribution is stable enough to carry a guarantee. It is fixed and cannot be waived."),
      ]
    ),
    learned: [
      "Your catalogue, price band and delivery area are all read and saved — none of it needs doing again.",
      "Your voice is unusually consistent: 44 of 60 product descriptions lead on time rather than quality. That is a strong brief when you do run.",
      "Grocery is the flattest category we measure, so a campaign here would be sized on repeat rate rather than on a seasonal peak.",
      "You have one social account and no creator work in the last 90 days, which means there is no existing audience overlap to reuse.",
    ],
    missing: [
      {
        label: "Monthly unique visitors",
        have: s("3,200", "Measured over the last 30 days.", [ev("fg-traffic2", "platform", "traffic estimate", "3,200 monthly unique visitors.")]),
        need: "5,000",
      },
    ],
    wayBack: [
      { label: "Nothing to reapply for", detail: "We re-check automatically. The moment freshgrocer.ae crosses 5,000 monthly visitors, guaranteed campaigns unlock on their own and we will email you." },
      { label: "The gap is 1,800 visitors", detail: "For a Dubai grocery store that is roughly 60 a day. Paid social on Instagram and a Google Shopping feed on your top 20 SKUs are the two levers that usually close it fastest." },
      { label: "Your read is saved", detail: "When you come back, the campaign starts from everything above rather than from an empty form." },
      { label: "If our number looks wrong", detail: "Most analytics dashboards show sessions, which run higher than unique visitors. Ask for a manual re-check and a person will verify by hand within two working days." },
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════ */

export const FIXTURES: Record<string, (id: string) => BrandRead> = {
  "ounass.com": ounass,
  "lunabeauty.ae": luna,
  "freshgrocer.ae": fresh,
};

export const EXAMPLES = [
  { url: "ounass.com", label: "Ounass", note: "Luxury fashion · eligible" },
  { url: "lunabeauty.ae", label: "Luna Beauty", note: "Own-label beauty · eligible" },
  { url: "freshgrocer.ae", label: "FreshGrocer", note: "Grocery · below the traffic floor" },
];

/** Normalise whatever the brand typed into a key we might hold. */
export function normaliseUrl(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

/** An unknown store still gets a read — a real one would. It is
    explicitly marked as a store we have not seen, so nothing on the
    screen pretends to more certainty than it has. */
export function fixtureFor(url: string): (id: string) => BrandRead {
  const key = normaliseUrl(url);
  if (FIXTURES[key]) return FIXTURES[key];
  return (id: string) => {
    const base = ounass(id);
    const name = key.replace(/\.(com|ae|sa|co|net|store|shop)(\.[a-z]{2})?$/, "");
    const pretty = name.charAt(0).toUpperCase() + name.slice(1);
    return {
      ...base,
      id,
      url: key,
      identity: {
        name: s(pretty, `Taken from the domain, because ${key} is a store we have not read before.`, [
          ev("gx-dom", "page", key, "No cached read. Everything below is a first pass and should be corrected freely."),
        ]),
        logo: undefined,
        tagline: s("A store we are reading for the first time", "There is no cached profile for this domain.", [
          ev("gx-new", "policy", "first read", "Confidence is lower on a first read. Correct anything that is wrong and the plan updates."),
        ]),
      },
    };
  };
}
