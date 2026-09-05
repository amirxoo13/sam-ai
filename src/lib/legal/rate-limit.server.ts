import { getSql } from "@/lib/db";

/**
 * Sliding-window rate limiting for the public legal AI endpoints. Both
 * `/api/ask` and `/api/draft` call paid external APIs (Hugging Face embeddings,
 * Qwen chat completions) with no auth requirement, so an unlimited client could
 * otherwise run up API cost or exhaust provider quota. Backed by
 * `rate_limit_hits` (migrations/0003_rate_limit.sql) so the limit holds across
 * serverless invocations on Neon, not just in one process's memory.
 */

const WINDOW_MS = 10 * 60 * 1000;
const LIMITS: Record<string, number> = {
  ask: 20,
  draft: 10,
};

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export async function checkRateLimit(
  request: Request,
  route: keyof typeof LIMITS,
): Promise<RateLimitResult> {
  const limit = LIMITS[route];
  const bucketKey = `${route}:${clientIp(request)}`;
  const sql = await getSql();
  const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();

  await sql.query("delete from rate_limit_hits where bucket_key = $1 and created_at < $2", [
    bucketKey,
    cutoff,
  ]);
  const rows = await sql.query<{ n: number }>(
    "select count(*)::int as n from rate_limit_hits where bucket_key = $1 and created_at >= $2",
    [bucketKey, cutoff],
  );
  const count = rows[0]?.n ?? 0;
  if (count >= limit) {
    const oldest = await sql.query<{ created_at: string }>(
      "select created_at from rate_limit_hits where bucket_key = $1 order by created_at asc limit 1",
      [bucketKey],
    );
    const oldestAt = oldest[0]?.created_at ? new Date(oldest[0].created_at).getTime() : Date.now();
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestAt + WINDOW_MS - Date.now()) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  await sql.query("insert into rate_limit_hits (bucket_key) values ($1)", [bucketKey]);
  return { allowed: true };
}

export function rateLimitResponse(result: { allowed: false; retryAfterSeconds: number }): Response {
  return Response.json(
    {
      error: "تعداد درخواست‌های شما در بازه زمانی کوتاه زیاد بوده؛ کمی بعد دوباره تلاش کنید.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}
