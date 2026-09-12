import { verifyCitations } from "./cite.ts";
import type { RetrievedChunk } from "./types.ts";

export type RetrievalEval = {
  retrieved: number;
  exactArticleHits: number;
  ftsHits: number;
  vectorHits: number;
  bindingSources: number;
  advisorySources: number;
};

export type AnswerEval = {
  cited: number;
  verified: number;
  unverified: number;
};

export function evaluateRetrieval(chunks: RetrievedChunk[]): RetrievalEval {
  return {
    retrieved: chunks.length,
    exactArticleHits: chunks.filter((c) => c.matchKind === "exact_article").length,
    ftsHits: chunks.filter((c) => c.matchKind === "fts").length,
    vectorHits: chunks.filter((c) => c.matchKind === "vector").length,
    bindingSources: chunks.filter(
      (c) =>
        c.authority.binding === "binding" ||
        c.authority.binding === "binding_if_valid" ||
        c.authority.binding === "binding_on_courts",
    ).length,
    advisorySources: chunks.filter(
      (c) =>
        c.authority.binding === "advisory" ||
        c.authority.binding === "persuasive" ||
        c.authority.binding === "doctrine",
    ).length,
  };
}

export function evaluateAnswer(answer: string, chunks: RetrievedChunk[]): AnswerEval {
  const { verified, unverified } = verifyCitations(answer, chunks);
  return {
    cited: verified.length + unverified.length,
    verified: verified.length,
    unverified: unverified.length,
  };
}
