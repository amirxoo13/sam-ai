/**
 * Strips litigant identity from court-file chunks before they are stored,
 * retrieved, sent to the model, or returned to the browser.
 * Legal fields (charges, judgments, penalties, subject, state) are kept.
 */

const PII_KEYS = new Set([
  "nationalcode",
  "national_code",
  "identityno",
  "identity_no",
  "fullname",
  "full_name",
  "fathername",
  "father_name",
  "birthdate",
  "birth_date",
  "mobile",
  "phone",
  "tel",
  "telephone",
  "email",
  "address",
  "postalcode",
  "postal_code",
]);

const PERSON_KEEP = new Set(["role", "persontype", "legaltype", "nationality", "sex"]);

function isPiiKey(key: string): boolean {
  return PII_KEYS.has(key.replace(/[\s_-]/g, "").toLowerCase());
}

function isKeepPersonKey(key: string): boolean {
  return PERSON_KEEP.has(key.replace(/[\s_-]/g, "").toLowerCase());
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    const t = value.trim();
    if (t.length >= 2) out.push(t);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isPiiKey(k)) collectStrings(v, out);
    }
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactText(text: string, phrases: string[]): string {
  if (!text || phrases.length === 0) return text;
  let out = text;
  for (const phrase of phrases) {
    if (phrase.length < 2) continue;
    out = out.replace(new RegExp(escapeRegExp(phrase), "g"), "……");
  }
  return out;
}

function walkRedact(value: unknown, phrases: string[]): unknown {
  if (typeof value === "string") return redactText(value, phrases);
  if (Array.isArray(value)) return value.map((item) => walkRedact(item, phrases));
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (isPiiKey(k)) continue;
      next[k] = walkRedact(v, phrases);
    }
    return next;
  }
  return value;
}

function sanitizePersons(persons: unknown, phrases: string[]): unknown {
  if (!Array.isArray(persons)) return [];
  return persons.map((person) => {
    if (!person || typeof person !== "object") return { role: "طرف پرونده" };
    const src = person as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      if (!isKeepPersonKey(k)) continue;
      out[k] = typeof v === "string" ? redactText(v, phrases) : v;
    }
    if (!out.role) out.role = "طرف پرونده";
    return out;
  });
}

function rolesTitle(persons: unknown, subject: unknown): string {
  const roles: string[] = [];
  if (Array.isArray(persons)) {
    for (const person of persons) {
      if (person && typeof person === "object") {
        const role = (person as { role?: unknown }).role;
        if (typeof role === "string" && role.trim()) roles.push(role.trim());
      }
    }
  }
  const unique = [...new Set(roles)];
  const head = unique.length > 0 ? unique.join(" · ") : "پرونده قضایی (هویت حذف‌شده)";
  const subj = typeof subject === "string" ? subject.trim() : "";
  return subj ? `${head} — ${subj}` : head;
}

export function anonymizeLegalText(raw: string): {
  content: string;
  sourceTitle: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { content: raw, sourceTitle: null };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { content: raw, sourceTitle: null };
    }
    const rec = parsed as Record<string, unknown>;
    const phrases: string[] = [];
    collectStrings(rec.persons, phrases);
    phrases.sort((a, b) => b.length - a.length);

    const persons = sanitizePersons(rec.persons, phrases);
    const withoutPersons = { ...rec, persons };
    const cleaned = walkRedact(withoutPersons, phrases) as Record<string, unknown>;
    cleaned.persons = persons;
    const sourceTitle = rolesTitle(persons, cleaned.subject);
    return { content: JSON.stringify(cleaned), sourceTitle };
  } catch {
    return { content: raw, sourceTitle: null };
  }
}

export function anonymizeChunk<T extends { content: string; source_title?: string | null; hf_dataset?: string | null }>(
  chunk: T,
): T {
  if (chunk.hf_dataset !== "power-edaalat-index" && !looksLikePowerCase(chunk.content)) {
    return chunk;
  }
  const { content, sourceTitle } = anonymizeLegalText(chunk.content);
  return {
    ...chunk,
    content,
    source_title: sourceTitle ?? stripTitleIdentities(chunk.source_title ?? null),
  };
}

function looksLikePowerCase(content: string): boolean {
  return (
    content.includes('"persons"') &&
    (content.includes("nationalCode") || content.includes("fullName") || content.includes("خواهان"))
  );
}

function stripTitleIdentities(title: string | null): string | null {
  if (!title) return title;
  return title
    .replace(/(خواهان\/شاكي|خواهان\/شاکی|خوانده\/متهم|وكيل دادگستري|وکیل دادگستری)\s*:\s*[^·\-|]+/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
