/* The creator roster.

   Ported from the current app's two seeds — `CREATORS_SEED` in the
   creators route and `AD_CREATORS` in the campaigns lib, which held the
   same ten people and the same ten fit scores typed out twice. Here they
   are one record.

   The `fit` field from the old app is DELIBERATELY NOT PORTED. It was a
   hand-typed integer that never moved when you switched brands, and it
   disagreed with the checklist beside it — Noon Reviews cleared 4 of 4
   Ounass criteria and scored 74, while Mais Mustafa cleared 2 and scored
   84. A match score here is computed per plan, in match_creators, out of
   signals that are themselves shown. */

export type Platform = "Instagram" | "TikTok" | "YouTube";

export interface CreatorSeed {
  id: number;
  name: string;
  handle: string;
  niche: string;
  platform: Platform;
  followers: number;
  /** % of audience in the Gulf. */
  gulfShare: number;
  avgViews: number;
  location: string;
  topMarkets: { code: string; share: number }[];
  audienceAge: [number, number];
  femaleShare: number;
  postsPerWeek: number;
  activeSince: number;
  /** null when there is nothing to declare. */
  conflict: string | null;
  competing: boolean;
  bio: string;
  avatar: string;
  posts: { img: string; views: number; type: string }[];
  /** What this creator is paid for one phase, at this size. Summed into
      the crew total by `crewCostOf` and shown ONLY as that total — a
      price beside a creator is against the premise of the product, so
      `CreatorMatch` deliberately has no field to carry it. */
  rate: number;
}

const p = (h: string, n: number, views: number[], type: string) =>
  views.map((v, i) => ({ img: `/creators/${h}/p${i + 1}.jpg`, views: v, type }));

export const CREATORS: CreatorSeed[] = [
  {
    id: 1, name: "Jawaher Alsuwaidi", handle: "@jawahralsuwaidi", niche: "Fashion",
    platform: "Instagram", followers: 78_400, gulfShare: 76, avgViews: 21_600,
    location: "UAE", topMarkets: [{ code: "AE", share: 58 }, { code: "SA", share: 19 }, { code: "KW", share: 11 }],
    audienceAge: [25, 34], femaleShare: 81, postsPerWeek: 4, activeSince: 2018,
    conflict: null, competing: false,
    bio: "Emirati fashion and travel creator. Ounass finds, promo codes and the edit behind every trip.",
    avatar: "/creators/jawahralsuwaidi/avatar.jpg",
    posts: p("jawahralsuwaidi", 5, [26_000, 19_000, 31_000, 17_000, 15_000], "Reel"),
    rate: 325,
  },
  {
    id: 2, name: "MakeupbyMemz", handle: "@makeupbymemz", niche: "Beauty",
    platform: "Instagram", followers: 135_000, gulfShare: 72, avgViews: 29_800,
    location: "UAE", topMarkets: [{ code: "AE", share: 47 }, { code: "SA", share: 26 }, { code: "KW", share: 10 }],
    audienceAge: [22, 32], femaleShare: 93, postsPerWeek: 6, activeSince: 2017,
    conflict: null, competing: false,
    bio: "Pro makeup artist and beauty creator. Owner of Anabella Al Sharq salon.",
    avatar: "/creators/makeupbymemz/avatar.jpg",
    posts: p("makeupbymemz", 5, [34_000, 27_000, 41_000, 22_000, 25_000], "Reel"),
    rate: 550,
  },
  {
    id: 3, name: "Ola Farahat", handle: "@olafarahat", niche: "Luxury",
    platform: "Instagram", followers: 1_300_000, gulfShare: 68, avgViews: 186_000,
    location: "UAE", topMarkets: [{ code: "AE", share: 44 }, { code: "SA", share: 21 }, { code: "EG", share: 12 }],
    audienceAge: [28, 38], femaleShare: 76, postsPerWeek: 7, activeSince: 2013,
    conflict: "Also publishes for Farfetch", competing: false,
    bio: "Dubai-based luxury, travel and lifestyle. One of the region's longest-running fashion accounts.",
    avatar: "/creators/olafarahat/avatar.jpg",
    posts: p("olafarahat", 5, [212_000, 168_000, 245_000, 151_000, 174_000], "Reel"),
    rate: 3800,
  },
  {
    id: 4, name: "Mais Mustafa", handle: "@mais.mustafa", niche: "Lifestyle",
    platform: "TikTok", followers: 43_600, gulfShare: 63, avgViews: 18_900,
    location: "UAE", topMarkets: [{ code: "AE", share: 39 }, { code: "SA", share: 22 }, { code: "JO", share: 14 }],
    audienceAge: [25, 34], femaleShare: 88, postsPerWeek: 4, activeSince: 2021,
    conflict: null, competing: false,
    bio: "Fashion, lifestyle and motherhood. Short-form that people actually finish.",
    avatar: "/creators/mais.mustafa/avatar.jpg",
    posts: p("mais.mustafa", 5, [24_000, 17_000, 29_000, 13_000, 11_000], "Video"),
    rate: 210,
  },
  {
    id: 5, name: "Asma Al Azmi", handle: "@asmaalazmii_", niche: "Lifestyle",
    platform: "Instagram", followers: 18_200, gulfShare: 81, avgViews: 5_400,
    location: "Kuwait", topMarkets: [{ code: "KW", share: 54 }, { code: "SA", share: 21 }, { code: "AE", share: 14 }],
    audienceAge: [24, 34], femaleShare: 90, postsPerWeek: 7, activeSince: 2019,
    conflict: null, competing: false,
    bio: "Kuwait-based creator. Perfume, restaurants and honest takes on everything she's sent.",
    avatar: "/creators/asmaalazmii_/avatar.jpg",
    posts: p("asmaalazmii_", 5, [7_000, 5_000, 8_000, 4_000, 3_000], "Reel"),
    rate: 90,
  },
  {
    id: 6, name: "Ghaliah Alsharif", handle: "@ghalya.mu2", niche: "Beauty",
    platform: "TikTok", followers: 1_100_000, gulfShare: 74, avgViews: 214_000,
    location: "KSA", topMarkets: [{ code: "SA", share: 61 }, { code: "AE", share: 18 }, { code: "KW", share: 8 }],
    audienceAge: [20, 30], femaleShare: 89, postsPerWeek: 5, activeSince: 2018,
    conflict: "Sephora ambassador", competing: false,
    bio: "Beauty and fashion out of Jeddah. Sephora ambassador. 570K more on Instagram.",
    avatar: "/creators/ghalya.mu2/avatar.jpg",
    posts: p("ghalya.mu2", 5, [268_000, 195_000, 312_000, 172_000, 148_000], "Video"),
    rate: 3400,
  },
  {
    id: 7, name: "Rebecca Kassab Al Azar", handle: "@rebeccarkassab", niche: "Fashion",
    platform: "Instagram", followers: 331_000, gulfShare: 70, avgViews: 58_400,
    location: "UAE", topMarkets: [{ code: "AE", share: 49 }, { code: "SA", share: 18 }, { code: "LB", share: 13 }],
    audienceAge: [25, 34], femaleShare: 80, postsPerWeek: 7, activeSince: 2016,
    conflict: "Co-founder of The Smart Vendor", competing: false,
    bio: "Fashion, beauty and lifestyle from the UAE. Co-founder of The Smart Vendor.",
    avatar: "/creators/rebeccarkassab/avatar.jpg",
    posts: p("rebeccarkassab", 5, [67_000, 52_000, 78_000, 44_000, 51_000], "Reel"),
    rate: 1200,
  },
  {
    id: 8, name: "Dima Sheikhly", handle: "@dimasheikhly", niche: "Luxury",
    platform: "Instagram", followers: 942_000, gulfShare: 64, avgViews: 121_000,
    location: "UAE", topMarkets: [{ code: "AE", share: 41 }, { code: "SA", share: 20 }, { code: "KW", share: 9 }],
    audienceAge: [27, 40], femaleShare: 73, postsPerWeek: 4, activeSince: 2014,
    conflict: "Publishes for Namshi, a competitor", competing: true,
    bio: "Luxury fashion and travel. Front row in Milan, Venice and New York, back home in Dubai.",
    avatar: "/creators/dimasheikhly/avatar.jpg",
    posts: p("dimasheikhly", 5, [142_000, 108_000, 165_000, 96_000, 94_000], "Reel"),
    rate: 2900,
  },
  {
    id: 9, name: "Paola El Sitt", handle: "@paola.elsitt", niche: "Lifestyle",
    platform: "Instagram", followers: 1_000_000, gulfShare: 67, avgViews: 168_000,
    location: "UAE", topMarkets: [{ code: "AE", share: 43 }, { code: "SA", share: 17 }, { code: "LB", share: 15 }],
    audienceAge: [25, 34], femaleShare: 84, postsPerWeek: 7, activeSince: 2015,
    conflict: "Runs her own brand, Joi", competing: false,
    bio: "Food, wellness and everyday luxury. Founder of Joi, gut-friendly snacks and bread.",
    avatar: "/creators/paola.elsitt/avatar.jpg",
    posts: p("paola.elsitt", 5, [195_000, 152_000, 231_000, 138_000, 124_000], "Reel"),
    rate: 3100,
  },
  {
    id: 10, name: "Noon Reviews", handle: "@skindew0", niche: "Beauty",
    platform: "TikTok", followers: 335_600, gulfShare: 79, avgViews: 96_000,
    location: "UAE", topMarkets: [{ code: "AE", share: 46 }, { code: "KW", share: 24 }, { code: "SA", share: 18 }],
    audienceAge: [20, 30], femaleShare: 92, postsPerWeek: 7, activeSince: 2020,
    conflict: "Publishes for Boutiqaat, a competitor", competing: true,
    bio: "Skincare and beauty reviews out of the UAE. Codes, comparisons and what she'd buy twice.",
    avatar: "/creators/skindew0/avatar.jpg",
    posts: p("skindew0", 5, [118_000, 87_000, 141_000, 74_000, 62_000], "Video"),
    rate: 1150,
  },
];

export const creatorById = (id: number) => CREATORS.find((c) => c.id === id)!;

/** The share of a following that actually turns up. Followers are a
    vanity number and appear here only as a denominator: Dima has 942K
    and 13% watch, Mais has 44K and 43%. */
export const viewThrough = (c: CreatorSeed) => (c.followers > 0 ? c.avgViews / c.followers : 0);
