import { getSql } from "@/lib/db";
import { assertMatterOwner, getOrCreateDefaultMatter, retrieveMatterExcerpts } from "@/lib/matter.server";

export interface UserFileSummary {
  id: number;
  filename: string;
  size: number;
  created_at: string;
  matter_id: string | null;
}

const MAX_FILE_CHARS = 40_000;
const MAX_FILES_PER_USER = 20;

export async function createUserFile(
  userId: string,
  filename: string,
  content: string,
  matterId?: string,
): Promise<UserFileSummary> {
  const sql = await getSql();
  const matter = matterId
    ? ((await assertMatterOwner(userId, matterId)) ? matterId : (await getOrCreateDefaultMatter(userId)).id)
    : (await getOrCreateDefaultMatter(userId)).id;
  const countRows = await sql.query<{ count: number }>(
    `select count(*)::int as count from user_file where user_id = $1`,
    [userId],
  );
  if ((countRows[0]?.count ?? 0) >= MAX_FILES_PER_USER) {
    throw new Error(`حداکثر ${MAX_FILES_PER_USER} پرونده مجاز است. یکی را حذف کنید و دوباره بیازمایید.`);
  }
  const trimmed = content.slice(0, MAX_FILE_CHARS);
  const rows = await sql.query<{ id: number; created_at: string }>(
    `insert into user_file (user_id, filename, content, matter_id)
     values ($1,$2,$3,$4)
     returning id, created_at::text as created_at`,
    [userId, filename.slice(0, 200), trimmed, matter],
  );
  return {
    id: rows[0].id,
    filename: filename.slice(0, 200),
    size: trimmed.length,
    created_at: rows[0].created_at,
    matter_id: matter,
  };
}

export async function listUserFiles(userId: string, matterId?: string): Promise<UserFileSummary[]> {
  const sql = await getSql();
  const rows = matterId
    ? await sql.query<{ id: number; filename: string; content: string; created_at: string; matter_id: string | null }>(
        `select id, filename, content, created_at::text as created_at, matter_id
         from user_file where user_id = $1 and matter_id = $2
         order by created_at desc`,
        [userId, matterId],
      )
    : await sql.query<{ id: number; filename: string; content: string; created_at: string; matter_id: string | null }>(
        `select id, filename, content, created_at::text as created_at, matter_id
         from user_file where user_id = $1
         order by created_at desc`,
        [userId],
      );
  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    size: r.content.length,
    created_at: r.created_at,
    matter_id: r.matter_id,
  }));
}

export async function deleteUserFile(userId: string, id: number): Promise<void> {
  const sql = await getSql();
  await sql.query(`delete from user_file where user_id = $1 and id = $2`, [userId, id]);
}

export async function getUserFilesContext(userId: string, question = ""): Promise<string> {
  const matter = await getOrCreateDefaultMatter(userId);
  return retrieveMatterExcerpts(userId, matter.id, question);
}

