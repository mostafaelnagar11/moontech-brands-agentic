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
  "landing.eyebrow": { en: "HeyMoon.AI for Brands", ar: "HeyMoon.AI للعلامات التجارية" },
  "landing.h1a": { en: "A campaign in fifteen seconds.", ar: "حملة في 15 ثانية." },
  "landing.h1b": { en: "Sales, guaranteed.", ar: "ومبيعات مضمونة." },
  "landing.sub": {
    en: "Paste your store link. HeyMoon builds the campaign and guarantees the sales.",
    ar: "ألصق رابط متجرك. تبني هاي مون الحملة وتضمن لك المبيعات.",
  },
  /* The three "no"s from the old subhead, kept as their own row under
     the field. They are the fastest thing on the page to read and the
     thing a brand who has used an agency reacts to first. */
  "landing.no1": { en: "No forms to fill in", ar: "لا نماذج تملؤها" },
  "landing.no2": { en: "No brief to write", ar: "لا بريف تكتبه" },
  "landing.no3": { en: "No agency to manage", ar: "لا وكالة تتابعها" },
  "landing.v1t": {
    en: "See everything. Before you pay anything.",
    ar: "شاهد كل شيء. قبل أن تدفع أي شيء.",
  },
  "landing.v1d": { en: "Markets, creators, products and the brief, priced on one card.", ar: "الأسواق وصنّاع المحتوى والمنتجات والموجز، مُسعّرة على بطاقة واحدة." },
  "landing.v2t": {
    en: "Miss the number? HeyMoon pays the difference.",
    ar: "لم يتحقق الرقم؟ تدفع هاي مون الفرق.",
  },
  "landing.v2d": { en: "Every phase carries a sales figure, in writing, before you pay.", ar: "كل مرحلة تحمل رقم مبيعات مكتوبًا قبل أن تدفع." },
  "landing.placeholder": { en: "yourstore.com", ar: "متجرك.com" },
  "landing.cta": { en: "See the plan", ar: "عرض الخطة" },
  "landing.free": { en: "Free. No account needed.", ar: "مجانًا. وبدون حساب." },
  "landing.reading": { en: "Reading", ar: "جارٍ القراءة" },
  "landing.nothing": {
    en: "Nothing is charged. Nothing is published. Not until you say so.",
    ar: "لا يُخصم أي مبلغ. ولا يُنشر أي محتوى. ولا شيء قبل موافقتك.",
  },
  /* The line under the trust note. HeyMoon is the company behind the
     agents, and the page says so once, quietly, at the bottom. */
  "landing.credit": {
    en: "Built by AI. Backed by HeyMoon.AI, a Saudi company.",
    ar: "مبني بالذكاء الاصطناعي. ومدعوم من HeyMoon.AI، شركة سعودية.",
  },

  /* The field's own affordances. `domain` is what the typed link is
     understood to be, shown back live, so the parsing is visible before
     anything is submitted. */
  "landing.try": { en: "Or try one of these", ar: "أو جرّب أحد هذه المتاجر" },
  "landing.domain": { en: "Reading", ar: "سنقرأ" },

  /* The nav. Anchors into this page, and the one way into the product. */
  "landing.nav.how": { en: "How it works", ar: "كيف تعمل" },
  "landing.nav.guarantee": { en: "The guarantee", ar: "الضمان" },
  "landing.nav.phases": { en: "Phases", ar: "المراحل" },
  "landing.nav.dashboard": { en: "Dashboard", ar: "لوحة التحكم" },

  /* Section headings are two keys each: the plain part and the phrase
     set in the brand ramp. Splitting them keeps the colour where the
     copywriter put it in either language. */
  "landing.s2a": { en: "One link.", ar: "رابط واحد." },
  "landing.s2b": { en: "The whole campaign.", ar: "والحملة كاملة." },
  "landing.s2sub": { en: "Three steps. The money is only in the second.", ar: "ثلاث خطوات. والدفع في الثانية فقط." },
  "landing.s3a": { en: "Built before you pay.", ar: "تُبنى قبل أن تدفع." },
  "landing.s3b": { en: "Guaranteed after.", ar: "ومضمونة بعده." },
  "landing.s3sub": { en: "Every number below is HeyMoon's own plan for a real store.", ar: "كل رقم أدناه من خطة هاي مون الفعلية لمتجر حقيقي." },
  "landing.payToday": { en: "You pay today", ar: "تدفع اليوم" },
  "landing.guaranteed": { en: "guaranteed", ar: "مضمونة" },
  "landing.threePhases": { en: "across all three phases", ar: "عبر المراحل الثلاث" },
  "landing.readIn": { en: "Read in fifteen seconds", ar: "قُرئ في 15 ثانية" },
  "landing.catalogue": { en: "Catalogue", ar: "الكتالوج" },
  "landing.prices": { en: "Prices", ar: "الأسعار" },
  "landing.products": { en: "Products", ar: "المنتجات" },
  "landing.draft": { en: "Draft", ar: "مسودة" },
  "landing.matched": { en: "matched", ar: "مطابَق" },
  "landing.inWarmup": { en: "in the warm-up", ar: "في التهيئة" },
  "landing.today": { en: "today", ar: "اليوم" },
  "landing.offered80": { en: "offered at 80%", ar: "تُعرض عند 80%" },
  "landing.f4t": { en: "Nothing moves without you", ar: "لا شيء يتحرك بدونك" },
  "landing.f4d": { en: "Money, publishing and signing are fixed at never. No setting turns them on.", ar: "المال والنشر والتوقيع ثابتة على «أبدًا». ولا إعداد يفعّلها." },
  "landing.never": { en: "Never", ar: "أبدًا" },

  /* The stores it connects to. Names only; they are the product's. */
  "landing.storesTitle": { en: "Connects to the store you already have", ar: "يرتبط بالمتجر الذي لديك بالفعل" },
  "landing.storesSub": {
    en: "One tap, after you pay. It reads the orders that use a creator's code, and nothing else.",
    ar: "نقرة واحدة بعد الدفع. يقرأ الطلبات التي تستخدم كود صانع المحتوى، ولا شيء غير ذلك.",
  },

  /* Footer columns. */
  "landing.foot.product": { en: "Product", ar: "المنتج" },
  "landing.foot.company": { en: "Company", ar: "الشركة" },
  "landing.foot.start": { en: "Start a campaign", ar: "ابدأ حملة" },
  "landing.foot.lang": { en: "Language", ar: "اللغة" },
  "landing.s1t": { en: "Paste your store link", ar: "ألصق رابط متجرك" },
  "landing.s1d": { en: "It reads your catalogue, prices, voice and markets.", ar: "تقرأ كتالوجك وأسعارك وأسلوبك وأسواقك." },
  "landing.s2t": { en: "Change anything, then start Phase 1", ar: "غيّر ما تشاء، ثم ابدأ المرحلة الأولى" },
  "landing.s2d": { en: "The whole plan on one card, priced before you approve.", ar: "الخطة كاملة على بطاقة واحدة، مُسعّرة قبل موافقتك." },
  "landing.s3t": { en: "Connect your store", ar: "اربط متجرك" },
  "landing.s3d": { en: "One tap. Every creator's orders count against the guarantee.", ar: "نقرة واحدة. وتُحتسب طلبات كل صانع محتوى مقابل الضمان." },

  /* The ladder. Numbers that move with the plan are not quoted here:
     the landing says the SHAPE, the conversation quotes the figures. */
  "landing.ladderTitle": { en: "Three phases. You start one.", ar: "ثلاث مراحل. تبدأ بواحدة." },
  "landing.ladderSub": {
    en: "Only Phase 1 is due today. Each phase after it is offered on results, and you decide then.",
    ar: "المرحلة الأولى وحدها مستحقة اليوم. وكل مرحلة بعدها تُعرض على النتائج، وتقرر أنت حينها.",
  },

  /* The last thing on the page is the first thing on it. */
  "landing.ctaTitle": { en: "Paste your link. See the plan.", ar: "ألصق رابطك. وشاهد الخطة." },

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
