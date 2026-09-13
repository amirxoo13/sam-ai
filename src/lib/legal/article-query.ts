const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toEnDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (ch) => String(FA_DIGITS.indexOf(ch)));
}

export function normalizeFa(s: string): string {
  return toEnDigits(s)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/‌/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type ParsedArticleRef = {
  kind: "article" | "principle" | "note" | "ruling";
  number: string;
  lawHint: string;
};

const LAW_HINTS: { keys: RegExp; hint: string }[] = [
  { keys: /قانون اساسی|اساسی جمهوری/, hint: "اساسی" },
  { keys: /آیین دادرسی کیفری/, hint: "آیین دادرسی کیفری" },
  { keys: /آیین دادرسی مدنی|آ\.د\.م/, hint: "آیین دادرسی مدنی" },
  { keys: /اجرای احکام مدنی/, hint: "اجرای احکام مدنی" },
  { keys: /مسئولیت مدنی/, hint: "مسئولیت مدنی" },
  { keys: /مجازات اسلامی|تعزیرات/, hint: "مجازات اسلامی" },
  { keys: /قانون مدنی/, hint: "قانون مدنی" },
  { keys: /قانون تجارت|تجارت/, hint: "تجارت" },
  { keys: /صدور چک|قانون چک/, hint: "چک" },
  { keys: /قانون کار(?!شناس)/, hint: "کار" },
  { keys: /تأمین اجتماعی|تامین اجتماعی/, hint: "تأمین اجتماعی" },
  { keys: /ثبت اسناد|قانون ثبت/, hint: "ثبت" },
  { keys: /وکالت/, hint: "وکالت" },
  { keys: /دیوان عدالت/, hint: "دیوان عدالت" },
  { keys: /حمایت خانواده|خانواده/, hint: "خانواده" },
  { keys: /موجر و مستاجر|موجر و مستأجر/, hint: "موجر" },
  { keys: /قانون مجازات|کیفر/, hint: "مجازات" },
];

export function detectLawHint(question: string): string {
  const q = normalizeFa(question);
  for (const row of LAW_HINTS) {
    if (row.keys.test(q)) return row.hint;
  }
  return "";
}

export function parseArticleRefs(question: string): ParsedArticleRef[] {
  const q = normalizeFa(question);
  const out: ParsedArticleRef[] = [];
  const seen = new Set<string>();
  const lawHint = detectLawHint(q);

  const push = (kind: ParsedArticleRef["kind"], number: string) => {
    const n = number.replace(/^0+/, "") || "0";
    const key = `${kind}:${n}:${lawHint}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, number: n, lawHint });
  };

  for (const m of q.matchAll(/اصل\s+(\d{1,3})/g)) push("principle", m[1]);
  for (const m of q.matchAll(/(?:ماده|ماده‌)\s+(\d{1,4})(?:\s*مکرر)?/g)) push("article", m[1]);
  for (const m of q.matchAll(/تبصره\s+(\d{1,2})/g)) push("note", m[1]);
  for (const m of q.matchAll(/(?:رأی|رای)\s*(?:وحدت\s*رویه\s*)?(?:شماره\s*)?(\d{2,5})/g)) {
    push("ruling", m[1]);
  }
  return out;
}

export function articleMatchSqlValues(ref: ParsedArticleRef): string[] {
  const n = ref.number;
  const fa = n.replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d);
  const values = [n, fa, `${n}مکرر`, `${n} مکرر`, `${fa}مکرر`, `${fa} مکرر`];
  if (ref.kind === "principle") values.push(`اصل ${n}`, `اصل ${fa}`);
  return values;
}
