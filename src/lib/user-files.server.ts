import { getSql } from "@/lib/db";

export interface UserFileRow {
  id: number;
  filename: string;
  content: string;
  created_at: string;
}

export interface UserFileSummary {
  id: number;
  filename: string;
  size: number;
  created_at: string;
}

const MAX_FILE_CHARS = 40_000; // سقف امن برای هر فایل (به‌جای رد کردن، برش می‌زنیم)
const MAX_FILES_PER_USER = 20;
/** سقفِ مجموع کاراکترهایی که هنگام پرسش، از پرونده‌های کاربر به prompt تزریق می‌شود. */
export const MAX_TOTAL_CONTEXT_CHARS = 6_000;

export async function createUserFile(
  userId: string,
  filename: string,
  content: string,
): Promise<UserFileSummary> {
  const sql = await getSql();
  const countRows = await sql<{ count: number }>`
    select count(*)::int as count from user_file where user_id = ${userId}
  `;
  if ((countRows[0]?.count ?? 0) >= MAX_FILES_PER_USER) {
    throw new Error(`حداکثر ${MAX_FILES_PER_USER} پرونده مجاز است — یکی را حذف کن و دوباره امتحان کن.`);
  }
  const trimmed = content.slice(0, MAX_FILE_CHARS);
  const rows = await sql<{ id: number; created_at: string }>`
    insert into user_file (user_id, filename, content)
    values (${userId}, ${filename.slice(0, 200)}, ${trimmed})
    returning id, created_at::text as created_at
  `;
  return {
    id: rows[0].id,
    filename: filename.slice(0, 200),
    size: trimmed.length,
    created_at: rows[0].created_at,
  };
}

export async function listUserFiles(userId: string): Promise<UserFileSummary[]> {
  const sql = await getSql();
  const rows = await sql<{ id: number; filename: string; content: string; created_at: string }>`
    select id, filename, content, created_at::text as created_at
    from user_file
    where user_id = ${userId}
    order by created_at desc
  `;
  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    size: r.content.length,
    created_at: r.created_at,
  }));
}

export async function deleteUserFile(userId: string, id: number): Promise<void> {
  const sql = await getSql();
  await sql`delete from user_file where user_id = ${userId} and id = ${id}`;
}

/**
 * متن ترکیبیِ آماده برای تزریق به prompt — همه‌ی پرونده‌های کاربر را (تا سقف
 * MAX_TOTAL_CONTEXT_CHARS) برمی‌گرداند، برچسب‌گذاری‌شده با نام فایل. اگر
 * کاربر پرونده‌ای نداشته باشد، رشته‌ی خالی برمی‌گردد (یعنی هیچ تغییری در
 * prompt ایجاد نمی‌شود).
 */
export async function getUserFilesContext(userId: string): Promise<string> {
  const sql = await getSql();
  const rows = await sql<{ filename: string; content: string }>`
    select filename, content from user_file
    where user_id = ${userId}
    order by created_at desc
  `;
  if (rows.length === 0) return "";
  let remaining = MAX_TOTAL_CONTEXT_CHARS;
  const parts: string[] = [];
  for (const row of rows) {
    if (remaining <= 0) break;
    const chunk = row.content.slice(0, remaining);
    parts.push(`[پرونده‌ی کاربر: ${row.filename}]\n${chunk}`);
    remaining -= chunk.length;
  }
  return parts.join("\n\n---\n\n");
}
