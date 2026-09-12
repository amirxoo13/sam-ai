import { createHash, randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import type { ExtractedCite } from "./cite";
import type { AskEval, RetrievedChunk } from "./types";

export function newRequestId(): string {
  return randomUUID();
}

export function hashQuestion(question: string): string {
  return createHash("sha256").update(question).digest("hex");
}

export async function writeAudit(input: {
  requestId: string;
  userId: string;
  question: string;
  chunks: RetrievedChunk[];
  cited: ExtractedCite[];
  unverified: ExtractedCite[];
  usedFallback: boolean;
  model: string;
  eval?: AskEval;
}): Promise<void> {
  const sql = await getSql();
  const base = [
    input.requestId,
    input.userId,
    hashQuestion(input.question),
    JSON.stringify(input.chunks.map((c) => c.id)),
    JSON.stringify(input.chunks.map((c) => ({ id: c.id, kind: c.matchKind, score: Number(c.score.toFixed(4)) }))),
    JSON.stringify(input.cited),
    JSON.stringify(input.unverified),
    input.usedFallback,
    input.model,
  ];
  try {
    await sql.query(
      `insert into legal_audit_log
        (request_id, user_id, question_hash, retrieved_ids, match_kinds, cited, unverified, used_fallback, model, eval)
       values ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10::jsonb)`,
      [...base, JSON.stringify(input.eval ?? null)],
    );
  } catch {
    try {
      await sql.query(
        `insert into legal_audit_log
          (request_id, user_id, question_hash, retrieved_ids, match_kinds, cited, unverified, used_fallback, model)
         values ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9)`,
        base,
      );
    } catch (err) {
      console.error("legal_audit_log failed", err);
    }
  }
}
