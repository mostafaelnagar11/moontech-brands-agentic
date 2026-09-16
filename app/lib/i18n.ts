"use client";

/* Arabic and English, for the three surfaces the brief asks for: the
   landing page, the Brand Read and the thread.

   The current app has two dead `العربية` toggles and a third that flips
   its own label. Here the toggle sets `dir` and `lang` on the document,
   swaps the font stack, and every layout uses logical properties, so the
   whole page mirrors rather than only the words.

   Content that comes from the mock — a store's own product names, a
   creator's handle — is NOT translated, because it would be wrong to
   invent an Arabic name for a real product. Those stay as they are, and
   the sentence around them mirrors. */

import { useLocale } from "./store";

export type Locale = "en" | "ar";

type Dict = Record<string, { en: string; ar: string }>;

export const STR: Dict = {
  /* Landing.

     The Arabic below is a first pass in the same register as the English,
     pending the Arabic copywriter. */
  /* ── Landing ──────────────────────────────────────────────────
     Every string here is from heymoon-copy-changes-before-after, IDs
     L1 to L17, which is the source of truth for this page. Where the
     spec's three promises (L9 to L14) are made concrete by a section,
     the promise IS that section's heading and body rather than being
     repeated as a separate card.

     The Arabic remains a first pass for the Arabic copywriter. */

  /* L1. The note says keep the uppercase as STYLING, so the string is
     sentence case and the CSS lifts it. */
  "landing.eyebrow": { en: "HeyMoon.AI for Brands", ar: "HeyMoon.AI للعلامات التجارية" },
  /* L2, L3. Line 2 carries the accent colour. */
  "landing.h1a": { en: "A campaign in fifteen seconds.", ar: "حملة في 15 ثانية." },
  "landing.h1b": { en: "Sales, guaranteed.", ar: "ومبيعات مضمونة." },
  /* L4, first half. It used to sit under the headline; the hero is
     tighter without it, so it now introduces the three cards, which is
     what the sentence actually describes. Its last three sentences are
     the chips under the field. */
  "landing.sub": {
    en: "Paste your store link. HeyMoon builds a complete creator campaign around what you sell, and guarantees the sales.",
    ar: "ألصق رابط متجرك، وتبني لك هاي مون حملة مؤثرين كاملة حول ما تبيعه، وتضمن لك المبيعات.",
  },
  "landing.cardsT": { en: "One link. The whole campaign.", ar: "رابط واحد. والحملة كاملة." },
  "landing.no1": { en: "No forms to fill in", ar: "لا نماذج تملؤها" },
  "landing.no2": { en: "No brief to write", ar: "لا بريف تكتبه" },
  "landing.no3": { en: "No agency to manage", ar: "لا وكالة تتابعها" },
  /* L5, L6, L7. */
  "landing.placeholder": { en: "yourstore.com", ar: "yourstore.com" },
  "landing.cta": { en: "See the plan", ar: "عرض الخطة" },
  "landing.reading": { en: "Reading", ar: "جارٍ القراءة" },
  "landing.free": { en: "Free. No account needed.", ar: "مجانًا. وبدون حساب." },
  "landing.try": { en: "Try a sample store", ar: "جرّب متجرًا نموذجيًا" },
  "landing.invalid": { en: "Paste a store link, like yourstore.com.", ar: "ألصق رابط متجر، مثل yourstore.com." },
  /* L15, L16. */
  "landing.nothing": {
    en: "Nothing is charged. Nothing is published. Not until you say so.",
    ar: "لا يُخصم أي مبلغ. ولا يُنشر أي محتوى. ولا شيء قبل موافقتك.",
  },
  "landing.credit": {
    en: "Built by AI. Backed by HeyMoon.AI, a Saudi company.",
    ar: "مبني بالذكاء الاصطناعي. ومدعوم من HeyMoon.AI، شركة سعودية.",
  },

  /* The three cards. Each is a picture of the product with two lines
     under it, so the page shows before it tells. Their titles are the
     spec's three promises, L9, L13 and L11, which head the thing that
     proves them rather than being printed as a separate row. */
  "landing.c1t": { en: "HeyMoon reads your store", ar: "تقرأ هاي مون متجرك" },
  "landing.c1d": {
    en: "Catalogue, prices, voice and markets. In about fifteen seconds.",
    ar: "الكتالوج والأسعار والنبرة والأسواق. في نحو 15 ثانية.",
  },


  "landing.v1t": { en: "See everything. Before you pay anything.", ar: "شاهد كل شيء. قبل أن تدفع أي شيء." },
  "landing.v1d": {
    en: "The whole campaign, built and priced before you approve it: the markets, the creators, the budget and the brief.",
    ar: "الحملة كاملة، مبنية ومُسعّرة قبل أن توافق عليها: الأسواق وصنّاع المحتوى والميزانية والموجز.",
  },

  "landing.v3t": { en: "Start small. Scale on results.", ar: "ابدأ صغيرًا. وتوسّع على النتائج." },
  "landing.v3d": {
    en: "Your first campaign is $1,000, the same for every brand. The next is offered only when this one reaches 80% of its target.",
    ar: "حملتك الأولى بـ 1,000 دولار، وهي نفسها لكل علامة تجارية. ولا تُعرض التالية إلا عندما تبلغ هذه 80% من هدفها.",
  },

  "landing.v2t": { en: "Miss the number? HeyMoon pays the difference.", ar: "لم يتحقق الرقم؟ تدفع هاي مون الفرق." },
  "landing.v2d": {
    en: "Every campaign comes with a sales figure, in writing, before you pay. If your sales come in under it, the shortfall is HeyMoon's to cover, not yours.",
    ar: "كل حملة تأتي برقم مبيعات مكتوب قبل أن تدفع. وإذا جاءت مبيعاتك أقل منه، فالفرق على هاي مون لا عليك.",
  },
  "landing.threePhasesAt": { en: "across three phases, at", ar: "عبر ثلاث مراحل، بمعدل" },
  "landing.signature": { en: "HeyMoon.AI, a Saudi company", ar: "HeyMoon.AI، شركة سعودية" },

  /* The run, as four steps that advance on their own. Each one names
     the agent doing the work, because a brand that is about to spend
     money is owed the name of what is spending it. */
  "landing.runT": { en: "From a link to a live campaign.", ar: "من رابط إلى حملة تعمل." },
  "landing.runD": {
    en: "Four steps. You decide at two of them, and nothing goes out without you.",
    ar: "أربع خطوات. تقرر أنت في اثنتين منها، ولا شيء يُنشر بدونك.",
  },
  "landing.r1t": { en: "Paste your store link", ar: "ألصق رابط متجرك" },
  "landing.r1d": {
    en: "HeyMoon reads the catalogue, the prices, the voice and the markets it already ships to.",
    ar: "تقرأ هاي مون الكتالوج والأسعار والنبرة والأسواق التي تشحن إليها بالفعل.",
  },
  "landing.r2t": { en: "The plan arrives, priced", ar: "تصل الخطة مُسعّرة" },
  "landing.r2d": {
    en: "Markets, creators, products and the brief, with the sales figure it guarantees. Change anything.",
    ar: "الأسواق وصنّاع المحتوى والمنتجات والموجز، مع رقم المبيعات المضمون. غيّر ما تشاء.",
  },
  "landing.r3t": { en: "You start Phase 1", ar: "تبدأ المرحلة الأولى" },
  "landing.r3d": {
    en: "One payment, the same for every brand. Nothing after it is charged or committed.",
    ar: "دفعة واحدة، نفسها لكل علامة تجارية. ولا شيء بعدها يُخصم أو يُلتزم به.",
  },
  "landing.r4t": { en: "Drafts wait on your approval", ar: "المسودات تنتظر موافقتك" },
  "landing.r4d": {
    en: "Every creator's work reaches you before it reaches anyone else. Nothing publishes on its own.",
    ar: "يصلك عمل كل صانع محتوى قبل أن يصل إلى غيرك. ولا شيء يُنشر من تلقاء نفسه.",
  },

  /* The seven, by name and by the stage each one runs. */
  "landing.agentsT": { en: "Seven agents run the campaign.", ar: "سبعة وكلاء يديرون الحملة." },
  "landing.agentsD": {
    en: "Each one owns a stage, and each one signs the work it did.",
    ar: "لكل واحد منهم مرحلة، ويوقّع كل منهم العمل الذي أنجزه.",
  },
  "landing.stage.intake": { en: "Intake", ar: "الاستقبال" },
  "landing.stage.matching": { en: "Matching", ar: "المطابقة" },
  "landing.stage.safety": { en: "Safety", ar: "السلامة" },
  "landing.stage.creative": { en: "Creative", ar: "الإبداع" },
  "landing.stage.activation": { en: "Activation", ar: "التفعيل" },
  "landing.stage.optimization": { en: "Optimization", ar: "التحسين" },
  "landing.stage.learning": { en: "Learning", ar: "التعلّم" },

  /* The stores it connects to, after payment and read-only. */
  "landing.storesT": { en: "Connects to the store you already have.", ar: "يرتبط بالمتجر الذي لديك بالفعل." },
  "landing.storesD": {
    en: "One tap, after you pay. It reads the orders that use a creator's code, and nothing else.",
    ar: "نقرة واحدة بعد الدفع. يقرأ الطلبات التي تستخدم كود صانع المحتوى، ولا شيء غير ذلك.",
  },

  /* The close, and the colophon. */
  "landing.closeH2": { en: "Paste your store link.", ar: "ألصق رابط متجرك." },
  "landing.nav.dashboard": { en: "Dashboard", ar: "لوحة التحكم" },
  "landing.foot.agents": { en: "Agents", ar: "الوكلاء" },


  /* Read */
  "read.title": { en: "What I found", ar: "ما وجدناه" },
  "read.working": { en: "Still reading", ar: "ما زلنا نقرأ" },
  "read.stopped": { en: "Stopped. Everything below is what I had.", ar: "توقفنا. كل ما يظهر أدناه هو ما جمعناه." },
  "read.resume": { en: "Keep reading", ar: "تابع القراءة" },
  "read.evidence": { en: "Evidence", ar: "الدليل" },
  "read.yes": { en: "Yes", ar: "صحيح" },
  "read.fix": { en: "Fix this", ar: "صحّح هذا" },
  "read.add": { en: "Add something", ar: "أضف شيئًا" },
  "read.confirmed": { en: "Confirmed by you", ar: "أكّدته أنت" },
  "read.corrected": { en: "Corrected by you", ar: "صحّحته أنت" },
  "read.save": { en: "Save", ar: "حفظ" },
  "read.cancelEdit": { en: "Cancel", ar: "إلغاء" },
  "read.continue": { en: "Build my campaign", ar: "ابنِ حملتي" },

  /* Layers */
  "layer.identity": { en: "The store", ar: "المتجر" },
  "layer.category": { en: "Category", ar: "الفئة" },
  "layer.priceBand": { en: "Price band", ar: "نطاق السعر" },
  "layer.bestsellers": { en: "Bestsellers", ar: "الأكثر مبيعًا" },
  "layer.voice": { en: "Brand voice", ar: "نبرة العلامة" },
  "layer.socials": { en: "Social", ar: "حسابات التواصل" },
  "layer.markets": { en: "Markets", ar: "الأسواق" },
  "layer.seasonality": { en: "Seasonality", ar: "الموسمية" },
  "layer.eligibility": { en: "Eligibility", ar: "الأهلية" },

  /* Thread */
  "thread.title": { en: "Your campaign", ar: "حملتك" },
  /* The pane heading. Until Phase 1 is paid for the plan is a proposal,
     and the heading says so; after payment it is simply the campaign.
     The caller picks the key with usePaid(). */
  "thread.plan": { en: "Your proposed campaign", ar: "حملتك المقترحة" },
  "thread.planPaid": { en: "Your campaign", ar: "حملتك" },
  /* No creator name here: the placeholder is on screen before Phase 1
     is paid for, and identities are withheld until then. */
  "thread.placeholder": { en: "Change anything about the plan", ar: "غيّر أي شيء في الخطة" },
  "thread.send": { en: "Send", ar: "إرسال" },
  "thread.thinking": { en: "Working", ar: "يعمل الآن" },
  "thread.stop": { en: "Stop", ar: "إيقاف" },
  "thread.because": { en: "because", ar: "لأنك قلت" },
  "thread.openPlan": { en: "Open the plan", ar: "افتح الخطة" },
  "thread.closePlan": { en: "Close", ar: "إغلاق" },

  /* The plan card — it appears inside the thread, which is one of the
     three Arabic surfaces, so its labels mirror too. */
  "plan.phase1": { en: "Phase 1 · Warm-up", ar: "المرحلة ١ · الإحماء" },
  "plan.phase1Proposed": { en: "Proposed · Phase 1 · Warm-up", ar: "مقترح · المرحلة ١ · الإحماء" },
  "plan.guaranteed": { en: "guaranteed", ar: "مضمون" },
  "plan.budget": { en: "Budget", ar: "الميزانية" },
  "plan.target": { en: "Guaranteed sales", ar: "المبيعات المضمونة" },
  /* The three warm-up figures, as one sentence read left to right:
     what you pay, the floor under it, what we actually think happens.
     The first two are the same number on purpose, which is why each
     one carries the line underneath that says why. */
  "plan.youPay": { en: "You pay today", ar: "تدفع اليوم" },
  "plan.youPayNote": { en: "your spend on Phase 1", ar: "إنفاقك على المرحلة ١" },
  "plan.backGuaranteed": { en: "Guaranteed back in sales", ar: "مبيعات مضمونة" },
  "plan.backGuaranteedNote": { en: "written into the phase", ar: "مكتوب في المرحلة" },
  /* Upside reads as a note under the guarantee, never as a second
     figure beside it. Two big numbers are two promises. */
  "plan.markets": { en: "Markets", ar: "الأسواق" },
  "plan.audience": { en: "Audience", ar: "الجمهور" },
  "plan.creators": { en: "Creators", ar: "صنّاع المحتوى" },
  "plan.brief": { en: "Brief", ar: "الموجز" },
  "plan.matched": { en: "matched", ar: "مطابقين" },
  "plan.unlock": { en: "Phase 2 unlocks at", ar: "تُفتح المرحلة ٢ عند" },
  "plan.unlockTail": { en: ", 80% of this phase's target.", ar: "، ٨٠٪ من هدف هذه المرحلة." },
  "aud.all": { en: "All genders", ar: "كل الأجناس" },
  "aud.female": { en: "Women", ar: "نساء" },
  "aud.male": { en: "Men", ar: "رجال" },

  /* Shared */
  "why": { en: "Why this number", ar: "لماذا هذا الرقم" },
  "nav.dashboard": { en: "Dashboard", ar: "لوحة التحكم" },
  "lang": { en: "العربية", ar: "English" },
};

export function useT() {
  const locale = useLocale();
  const t = (k: string) => STR[k]?.[locale] ?? k;
  return { t, locale, dir: (locale === "ar" ? "rtl" : "ltr") as "rtl" | "ltr", isAr: locale === "ar" };
}

/** Arabic-Indic digits look wrong beside Latin currency codes and
    handles, so numbers stay Western throughout. Only the direction and
    the words change. */
export const num = (n: number) => n.toLocaleString("en-US");
