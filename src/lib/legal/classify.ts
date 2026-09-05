import {
  formById,
  LEGAL_FORMS,
  type LegalForm,
  type LegalTrack,
} from "@/data/legal-forms";
import { procedureFor, trackAdvice, type ProcedureStep } from "@/data/legal-procedure";

export type Classification = {
  track: LegalTrack;
  trackLabel: string;
  forum: string;
  form: LegalForm;
  reason: string;
  advice: string;
  confidence: "high" | "medium";
  alternatives: LegalForm[];
  nextSteps: ProcedureStep[];
  hasJudgment: boolean;
};

export const TRACK_LABEL: Record<LegalTrack, string> = {
  civil: "حقوقی",
  criminal: "کیفری",
  both: "هر دو مسیر (حقوقی و کیفری)",
  admin: "اداری (دیوان عدالت)",
};

function normalize(s: string): string {
  return s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/‌/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const PHRASE_BOOSTS: { re: RegExp; formId: string; weight: number }[] = [
  { re: /کلاهبردار|کلاه برداری|سرم کلاه|فریب.*(مال|پول)|مال.?باخت/, formId: "fraud-complaint", weight: 6 },
  { re: /خیانت در امانت|مال امانی|سفیدامضا|تصاحب مال/, formId: "breach-trust", weight: 6 },
  { re: /چک.?برگت|چک.?بلامحل|گواهی عدم پرداخت|صدور چک/, formId: "bounced-check", weight: 6 },
  { re: /مهریه|مهر المسمی|عندالمطالبه/, formId: "mahr", weight: 6 },
  { re: /جهیز|سیاهه/, formId: "dowry-return", weight: 6 },
  { re: /طلاق توافق|عدم امکان سازش|عسر و حرج|میخوام طلاق/, formId: "divorce", weight: 5 },
  { re: /نفقه|خرجی زن|خرج زندگی/, formId: "alimony", weight: 5 },
  { re: /ترک انفاق/, formId: "desertion-alimony", weight: 7 },
  { re: /حضانت|سرپرستی فرزند/, formId: "custody", weight: 6 },
  { re: /ملاقات فرزند|حق ملاقات/, formId: "visitation", weight: 6 },
  { re: /تخلیه|مستأجر|اجار.?نامه|سرقفلی/, formId: "eviction", weight: 5 },
  { re: /خلع ید|خلیع ید/, formId: "khal-yad", weight: 7 },
  { re: /تصرف عدوان|تصرف غیرقانون/, formId: "adverse-possession", weight: 7 },
  { re: /الزام به تنظیم سند|قولنامه|مبایعه|سند رسمی/, formId: "deed-specific-performance", weight: 5 },
  { re: /ایفا.?ی تعهد|عمل به قرارداد/, formId: "contract-performance", weight: 5 },
  { re: /فسخ قرارداد|فسخ معامله/, formId: "rescission", weight: 6 },
  { re: /اعسار|تقسیط|نمیتوانم.*پرداخت|ناتوان از پرداخت/, formId: "insolvency", weight: 6 },
  { re: /اظهارنامه|اخطار رسمی/, formId: "declaration", weight: 6 },
  { re: /قرار منع|منع تعقیب|موقوفی تعقیب/, formId: "bar-prosecution", weight: 8 },
  { re: /حکم غیابی|واخواه/, formId: "objection-default", weight: 8 },
  { re: /اعتراض ثالث|شخص ثالث/, formId: "third-party-objection", weight: 7 },
  { re: /فرجام/, formId: "cassation", weight: 7 },
  { re: /اعاده دادرسی/, formId: "retrial", weight: 7 },
  { re: /لایحه دفاع|دفاعیه|علیه من دادخواست|خوانده هستم/, formId: "defense-brief", weight: 5 },
  { re: /متهمم|کیفرخواست.*علیه|دفاع کیفری/, formId: "criminal-defense", weight: 6 },
  { re: /توهین|فحش|تهدید|ناسزا/, formId: "insult-threat", weight: 6 },
  { re: /ضرب و جرح|کتک|زد.?و.?خورد|جرح عمد/, formId: "assault", weight: 7 },
  { re: /سرقت|دزد|ربود|کیف.?قاپ/, formId: "theft", weight: 6 },
  { re: /نشر اکاذیب|افترا|تهمت/, formId: "defamation", weight: 6 },
  { re: /دیوان عدالت|ابطال بخشنامه|شکایت از اداره/, formId: "divan-edalat", weight: 6 },
  { re: /انحصار وراثت|ترکه|ارث/, formId: "probate", weight: 6 },
  { re: /تأمین خواسته|تامین خواسته/, formId: "provisional-relief", weight: 7 },
  { re: /دستور موقت/, formId: "interim-injunction", weight: 7 },
  { re: /تأمین دلیل|تامین دلیل/, formId: "evidence-preservation", weight: 7 },
  { re: /اجراییه|اجرای حکم/, formId: "execution", weight: 6 },
  { re: /مطالبه وجه|طلب|بدهکار|قرض|پولم را نمیدهد|پولم را نمی‌دهد/, formId: "claim-money", weight: 3 },
  { re: /خسارت/, formId: "damages", weight: 4 },
  { re: /نظریه کارشناس|اعتراض به کارشناس/, formId: "expert-objection", weight: 6 },
];

const JUDGMENT_RE =
  /رأی|رای دادگاه|دادنامه|حکم صادر|حکم دادگاه|قرار منع|قرار موقوفی|کیفرخواست صادر/;

function scoreForm(text: string, form: LegalForm): number {
  let score = 0;
  for (const kw of form.keywords) {
    const n = normalize(kw);
    if (n.length >= 2 && text.includes(n)) score += Math.min(4, Math.max(1, Math.floor(n.length / 4)));
  }
  for (const boost of PHRASE_BOOSTS) {
    if (boost.formId === form.id && boost.re.test(text)) score += boost.weight;
  }
  return score;
}

export function classifyMatter(input: {
  story: string;
  formId?: string;
  hasJudgment?: boolean;
}): Classification {
  const text = normalize(`${input.story}`);
  const hasJudgment = Boolean(input.hasJudgment) || JUDGMENT_RE.test(text);

  if (input.formId) {
    const form = formById(input.formId);
    if (form) {
      return pack({
        form,
        reason: form.when,
        confidence: "high",
        hasJudgment,
      });
    }
  }

  const ranked = LEGAL_FORMS.map((form) => ({ form, score: scoreForm(text, form) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (hasJudgment) {
    const top = ranked[0];
    if (!top || !isPostJudgment(top.form.id)) {
      const criminal = /کلاه|سرقت|ضرب|جرح|تهدید|توهین|کیفر|دادسرا|متهم/.test(text);
      const forcedId = /قرار منع|موقوفی/.test(text)
        ? "bar-prosecution"
        : /غیابی/.test(text)
          ? criminal
            ? "criminal-default"
            : "objection-default"
          : criminal
            ? "criminal-appeal"
            : "civil-appeal";
      const forced = formById(forcedId);
      if (forced) ranked.unshift({ form: forced, score: 99 });
    }
  }

  if (ranked.length === 0) {
    const criminalHint = /کلاه|فریب|سرقت|دزد|تهدید|فحش|کتک|جرح|تجاوز|مواد مخدر/.test(text);
    const fallback = LEGAL_FORMS.find((f) =>
      criminalHint ? f.id === "fraud-complaint" : f.id === "claim-money",
    )!;
    return pack({
      form: fallback,
      reason: criminalHint
        ? "علائم جرم در شرح دیده شد؛ مسیر کیفری محتمل است — قالب پیشنهادی را بررسی کنید."
        : "وصف مجرمانه روشنی دیده نشد؛ مسیر حقوقی (دادخواست) پیشنهاد می‌شود.",
      confidence: "medium",
      hasJudgment,
    });
  }

  const best = ranked[0];
  return pack({
    form: best.form,
    reason: best.form.when,
    confidence: best.score >= 6 ? "high" : "medium",
    hasJudgment,
    ranked,
  });
}

function isPostJudgment(id: string): boolean {
  return [
    "civil-appeal",
    "criminal-appeal",
    "cassation",
    "retrial",
    "objection-default",
    "criminal-default",
    "bar-prosecution",
    "third-party-objection",
    "expert-objection",
  ].includes(id);
}

function pack(input: {
  form: LegalForm;
  reason: string;
  confidence: "high" | "medium";
  hasJudgment: boolean;
  ranked?: { form: LegalForm; score: number }[];
}): Classification {
  const alternatives = (input.ranked ?? [])
    .filter((x) => x.form.id !== input.form.id)
    .slice(0, 3)
    .map((x) => x.form);

  return {
    track: input.form.track,
    trackLabel: TRACK_LABEL[input.form.track],
    forum: input.form.forum,
    form: input.form,
    reason: input.reason,
    advice: trackAdvice(input.form.track),
    confidence: input.confidence,
    alternatives,
    nextSteps: procedureFor({
      track: input.form.track,
      formId: input.form.id,
      hasJudgment: input.hasJudgment,
    }),
    hasJudgment: input.hasJudgment,
  };
}
