import { classifyAuthority, authorityWeight } from "./authority.ts";
import type { ParsedArticleRef } from "./article-query.ts";
import { normalizeFa, toEnDigits } from "./article-query.ts";
import type { RetrievedChunk, SourceType } from "./types.ts";
import { isOfficialUrl } from "./url.ts";

export type RankRow = {
  id: string;
  content: string;
  source_type: SourceType;
  source_title: string | null;
  article_number: string | null;
  law_date: string | null;
  source_url: string | null;
  semantic?: number;
  matchKind: RetrievedChunk["matchKind"];
};

function articleExact(row: RankRow, refs: ParsedArticleRef[]): number {
  if (refs.length === 0) return 0;
  const art = toEnDigits(row.article_number ?? "");
  if (art.length > 6) return 0;
  const title = normalizeFa(row.source_title ?? "");
  const content = normalizeFa(row.content);
  let best = 0;
  for (const ref of refs) {
    const numHit = art === ref.number || art === `${ref.number}مکرر`;
    const hintHit = !ref.lawHint || title.includes(ref.lawHint) || content.includes(ref.lawHint);
    if (numHit && hintHit) best = Math.max(best, 1);
    else if (numHit) best = Math.max(best, 0.72);
  }
  return best;
}

function lexicalOverlap(question: string, row: RankRow): number {
  const q = normalizeFa(question);
  const tokens = q.split(/[^\u0600-\u06FFa-zA-Z0-9]+/).filter((t) => t.length >= 3);
  if (tokens.length === 0) return 0;
  const hay = `${normalizeFa(row.source_title ?? "")}\n${normalizeFa(row.content)}`;
  let hits = 0;
  for (const t of tokens) if (hay.includes(t)) hits += 1;
  return hits / tokens.length;
}

export function rankRows(
  question: string,
  refs: ParsedArticleRef[],
  rows: RankRow[],
  topK: number,
): RetrievedChunk[] {
  const byId = new Map<string, RetrievedChunk>();
  for (const row of rows) {
    const authority = classifyAuthority(row.source_type, row.source_title);
    const exact = articleExact(row, refs);
    const lex = lexicalOverlap(question, row);
    const semantic = row.semantic ?? 0;
    const urlBonus = isOfficialUrl(row.source_url) ? 0.08 : 0;
    const score =
      exact * 1.35 +
      semantic * 0.55 +
      lex * 0.25 +
      authorityWeight(authority) * 0.12 +
      urlBonus;
    const matchKind: RetrievedChunk["matchKind"] =
      exact >= 0.72 ? "exact_article" : row.matchKind ?? (semantic > 0.15 ? "vector" : "fts");
    const next: RetrievedChunk = {
      id: row.id,
      content: row.content,
      source_type: row.source_type,
      source_title: row.source_title,
      article_number: row.article_number,
      law_date: row.law_date,
      source_url: row.source_url,
      score,
      authority,
      matchKind,
    };
    const prev = byId.get(next.id);
    if (!prev || next.score > prev.score) byId.set(next.id, next);
  }
  return [...byId.values()]
    .filter((r) => r.matchKind === "exact_article" || r.matchKind === "fts" || r.score > 0.18)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
