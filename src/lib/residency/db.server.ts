// این فایل به دیتابیس جدای پیکره‌ی اقامتی وصل می‌شود — همان Neon Postgres که
// سایت اقامت (cursor/SAMAI) از قبل با جدول legal_documents پر کرده. عمداً از
// همان دیتابیس src/lib/db.ts (پیکره‌ی حقوقی ایران) استفاده نمی‌کند، چون مدل
// embedding و schema این دو کاملاً متفاوت‌اند.
//
// متغیر محیطی: RESIDENCY_DATABASE_URL — دقیقاً همان مقداری که در پروژه‌ی
// cursor زیر اسم DATABASE_URL ست شده (کپی‌اش کن، عوضش نکن).

type Row = Record<string, unknown>;

let poolPromise: Promise<import("pg").Pool> | null = null;

async function getPool(): Promise<import("pg").Pool> {
  if (poolPromise) return poolPromise;
  poolPromise = (async () => {
    const connectionString = process.env.RESIDENCY_DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error(
        "RESIDENCY_DATABASE_URL تنظیم نشده است. این باید دقیقاً همان DATABASE_URL " +
          "پروژه‌ی سایت اقامت (cursor) باشد — همان دیتابیس Neon که جدول " +
          "legal_documents و اسناد eCFR/EUR-Lex/... را دارد.",
      );
    }
    const { Pool } = await import("pg");
    return new Pool({ connectionString });
  })().catch((err) => {
    poolPromise = null;
    throw err;
  });
  return poolPromise;
}

export interface ResidencyDocumentRow {
  id: number;
  source: string;
  jurisdiction: "US" | "EU";
  country: string | null;
  title: string | null;
  section_reference: string | null;
  full_text: string;
  source_url: string | null;
  distance?: number;
}

export interface ResidencySearchFilters {
  jurisdiction?: "US" | "EU";
  /** کد ISO2 کشور؛ null صریح یعنی فقط اسناد بدون کشور خاص (مقررات عمومی EU) */
  country?: string | null;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function searchSimilarResidencyDocuments(
  embedding: number[],
  limit = 8,
  filters: ResidencySearchFilters = {},
): Promise<ResidencyDocumentRow[]> {
  const pool = await getPool();
  const vectorLiteral = toVectorLiteral(embedding);
  const conditions: string[] = [];
  const params: unknown[] = [vectorLiteral];

  if (filters.jurisdiction) {
    params.push(filters.jurisdiction);
    conditions.push(`jurisdiction = $${params.length}`);
  }
  if (filters.country === null) {
    conditions.push("country IS NULL");
  } else if (filters.country) {
    params.push(filters.country);
    conditions.push(`country = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit);

  const query = `
    SELECT id, source, jurisdiction, country, title, section_reference, full_text,
           source_url,
           embedding <=> $1::vector AS distance
    FROM legal_documents
    ${whereClause}
    ORDER BY embedding <=> $1::vector
    LIMIT $${params.length}
  `;

  const result = await pool.query(query, params);
  return result.rows as ResidencyDocumentRow[];
}
