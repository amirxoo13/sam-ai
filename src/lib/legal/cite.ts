import type { PublicCitation, RetrievedChunk } from "./types.ts";
import { normalizeFa, toEnDigits } from "./article-query.ts";
import { isOfficialUrl } from "./url.ts";

export type ExtractedCite = {
  raw: string;
  number: string;
  kind: "article" | "principle" | "ruling";
};

/**
 * متاکاراکترهای regex را خنثی می‌کند.
 *
 * لازم است چون `quoteSpan` مقدار `article_number` را — که مستقیماً از دیتابیس
 * می‌آید و بخشی از آن توسط `inferArticleNumber` از متن خام منابع کرال‌شده و
 * jsonl های بیرونی استخراج می‌شود — مستقیم داخل `new RegExp` می‌گذاشت.
 * یک مقدار مثل `"12("` یا `"5[a"` کافی بود تا ساختن regex throw کند و کل
 * ساخت citation برای آن پاسخ شکست بخورد (PR-02). بعد از escape، ساخت
 * regex دیگر نمی‌تواند throw کند و رفتار برای مقادیر سالم دقیقاً همان قبل است.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractCitedNumbers(answer: string): ExtractedCite[] {
  const q = normalizeFa(answer);
  const out: ExtractedCite[] = [];
  const seen = new Set<string>();
  const add = (raw: string, number: string, kind: ExtractedCite["kind"]) => {
    const n = number.replace(/^0+/, "") || "0";
    const key = `${kind}:${n}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ raw, number: n, kind });
  };
  for (const m of q.matchAll(/اصل\s+(\d{1,3})/g)) add(m[0], m[1], "principle");
  for (const m of q.matchAll(/ماده\s+(\d{1,4})/g)) add(m[0], m[1], "article");
  for (const m of q.matchAll(/(?:رأی|رای)\s*(?:وحدت\s*رویه\s*)?(?:شماره\s*)?(\d{2,5})/g)) {
    add(m[0], m[1], "ruling");
  }
  return out;
}

export function chunkSupportsCite(chunk: RetrievedChunk, cite: ExtractedCite): boolean {
  const article = toEnDigits(chunk.article_number ?? "");
  const title = normalizeFa(chunk.source_title ?? "");
  const content = normalizeFa(chunk.content);
  if (cite.kind === "principle") {
    return article === cite.number || new RegExp(`اصل\\s+${cite.number}(?!\\d)`).test(`${content} ${title}`);
  }
  if (cite.kind === "ruling") {
    return (
      article === cite.number ||
      title.includes(cite.number) ||
      new RegExp(`(?:رأی|رای|شماره)\\s*${cite.number}(?!\\d)`).test(content)
    );
  }
  return (
    article === cite.number ||
    article === `${cite.number}مکرر` ||
    new RegExp(`(?:ماده)\\s+${cite.number}(?!\\d)`).test(content)
  );
}

export function verifyCitations(answer: string, chunks: RetrievedChunk[]): {
  verified: ExtractedCite[];
  unverified: ExtractedCite[];
} {
  const cites = extractCitedNumbers(answer);
  const verified: ExtractedCite[] = [];
  const unverified: ExtractedCite[] = [];
  for (const cite of cites) {
    if (chunks.some((c) => chunkSupportsCite(c, cite))) verified.push(cite);
    else unverified.push(cite);
  }
  return { verified, unverified };
}

export function quoteSpan(chunk: RetrievedChunk, max = 420): string {
  const text = chunk.content.replace(/\s+/g, " ").trim();
  if (text.startsWith("{") && text.includes('"persons"')) {
    try {
      const rec = JSON.parse(chunk.content) as {
        subject?: string;
        description?: string;
        judgments?: { text?: string }[];
      };
      const parts = [
        rec.subject,
        rec.description,
        ...(rec.judgments ?? []).map((j) => j.text),
      ].filter((x): x is string => Boolean(x && x.trim()));
      return parts.join(" — ").slice(0, max);
    } catch {
      /* fall through */
    }
  }
  if (chunk.article_number) {
    const n = toEnDigits(chunk.article_number);
    const re = new RegExp(`(?:ماده|اصل)\\s*${escapeRegExp(n)}[^.۞]*[.۞]?`);
    const m = text.match(re);
    if (m) return m[0].slice(0, max);
  }
  return text.slice(0, max);
}

export function toPublicCitations(chunks: RetrievedChunk[], unverified: ExtractedCite[]): PublicCitation[] {
  const unverifiedNums = new Set(unverified.map((c) => c.number));
  return chunks.map((c) => {
    const art = c.article_number ? toEnDigits(c.article_number) : "";
    return {
      id: c.id,
      source_type: c.source_type,
      source_title: c.source_title,
      article_number: c.article_number,
      law_date: c.law_date,
      source_url: isOfficialUrl(c.source_url) ? c.source_url : null,
      authorityLabel: c.authority.labelFa,
      authorityShort: c.authority.shortFa,
      binding: c.authority.binding,
      quote: quoteSpan(c),
      matchKind: c.matchKind,
      verified: art ? !unverifiedNums.has(art) : unverified.length === 0,
    };
  });
}
