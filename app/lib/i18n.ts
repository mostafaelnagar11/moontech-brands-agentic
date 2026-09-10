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
  /* Landing */
  "landing.eyebrow": { en: "MoonTech for brands", ar: "مون‑تك للعلامات التجارية" },
  "landing.h1a": { en: "Paste your store link.", ar: "الصق رابط متجرك." },
  "landing.h1b": { en: "We do the rest.", ar: "ونحن نتكفّل بالباقي." },
  "landing.sub": {
    en: "In about fifteen seconds, our agents read your catalogue, your prices, how you write and where you ship — then build a complete creator campaign with a revenue figure we guarantee. No forms, no brief, no agency.",
    ar: "خلال خمس عشرة ثانية تقريبًا، يقرأ وكلاؤنا كتالوجك وأسعارك وأسلوب كتابتك وأسواق شحنك، ثم يبنون حملة كاملة مع صنّاع المحتوى برقم إيرادات نضمنه. بلا استمارات، بلا موجز، بلا وكالة.",
  },
  "landing.v1t": { en: "You see the whole plan first", ar: "ترى الخطة كاملة أولًا" },
  "landing.v1d": {
    en: "Markets, budget, creators and the brief — priced and complete before you pay for anything.",
    ar: "الأسواق والميزانية وصنّاع المحتوى والموجز — مُسعّرة وكاملة قبل أن تدفع أي شيء.",
  },
  "landing.v2t": { en: "The return is guaranteed", ar: "العائد مضمون" },
  "landing.v2d": {
    en: "Every phase carries a revenue figure in writing. Close below it and MoonTech pays you the difference.",
    ar: "كل مرحلة تحمل رقم إيرادات مكتوبًا. إذا أُغلقت دونه تدفع لك مون‑تك الفرق.",
  },
  "landing.v3t": { en: "One phase at a time", ar: "مرحلة واحدة في كل مرة" },
  "landing.v3d": {
    en: "You start Phase 1 only. It has to hit 80% of its target before the next one is even offered.",
    ar: "تبدأ بالمرحلة الأولى فقط. وعليها بلوغ ٨٠٪ من هدفها قبل أن تُعرض التالية أصلًا.",
  },
  "landing.placeholder": { en: "yourstore.com", ar: "متجرك.com" },
  "landing.cta": { en: "Read my store", ar: "اقرأ متجري" },
  "landing.free": { en: "Free, and no account needed to see the plan.", ar: "مجانًا، وبلا حساب لرؤية الخطة." },
  "landing.reading": { en: "Reading", ar: "جارٍ القراءة" },
  "landing.nothing": {
    en: "Nothing is charged and nothing is published until you say so.",
    ar: "لا يُخصم أي مبلغ ولا يُنشر أي محتوى إلا بموافقتك.",
  },

  /* Read */
  "read.title": { en: "What we found", ar: "ما وجدناه" },
  "read.working": { en: "Still reading", ar: "ما زلنا نقرأ" },
  "read.stopped": { en: "Stopped. Everything below is what we had.", ar: "توقفنا. كل ما يظهر أدناه هو ما جمعناه." },
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
  "thread.placeholder": {
    en: "Change anything — “Kuwait only”, “guarantee 8× instead”, “women 25 to 40”",
    ar: "غيّر ما تشاء — «الكويت فقط»، «اضمن ٨× بدلًا من ذلك»، «نساء من ٢٥ إلى ٤٠»",
  },
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
  "plan.target": { en: "Revenue target", ar: "هدف الإيرادات" },
  "plan.expected": { en: "What we expect", ar: "ما نتوقعه" },
  /* The three warm-up figures, as one sentence read left to right:
     what you pay, the floor under it, what we actually think happens.
     The first two are the same number on purpose, which is why each
     one carries the line underneath that says why. */
  "plan.youPay": { en: "You pay today", ar: "تدفع اليوم" },
  "plan.youPayNote": { en: "Phase 1, and nothing after it", ar: "المرحلة ١ فقط، ولا شيء بعدها" },
  "plan.backGuaranteed": { en: "Guaranteed back", ar: "مضمون رجوعه" },
  "plan.backGuaranteedNote": { en: "or we pay you the difference", ar: "أو ندفع لك الفرق" },
  "plan.expectedNote": { en: "from this crew, in these markets", ar: "من هذا الفريق، في هذه الأسواق" },
  "plan.markets": { en: "Markets", ar: "الأسواق" },
  "plan.audience": { en: "Audience", ar: "الجمهور" },
  "plan.creators": { en: "Creators", ar: "صنّاع المحتوى" },
  "plan.brief": { en: "Brief", ar: "الموجز" },
  "plan.matched": { en: "matched", ar: "مطابقين" },
  "plan.unlock": { en: "Phase 2 unlocks at", ar: "تُفتح المرحلة ٢ عند" },
  "plan.unlockTail": { en: "— 80% of this phase's target.", ar: "— ٨٠٪ من هدف هذه المرحلة." },
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
