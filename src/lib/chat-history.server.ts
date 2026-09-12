import { getSql } from "@/lib/db";

export type ChatType = "legal" | "residency";
export type ChatRole = "user" | "assistant";

export interface ChatMessageRow {
  id: number;
  chat_type: ChatType;
  role: ChatRole;
  content: string;
  created_at: string;
  matter_id: string | null;
  request_id: string | null;
}

export async function saveChatMessage(
  userId: string,
  chatType: ChatType,
  role: ChatRole,
  content: string,
  matterId?: string,
  requestId?: string,
): Promise<void> {
  try {
    const sql = await getSql();
    await sql.query(
      `insert into chat_message (user_id, chat_type, role, content, matter_id, request_id)
       values ($1,$2,$3,$4,$5,$6)`,
      [userId, chatType, role, content, matterId ?? null, requestId ?? null],
    );
  } catch (err) {
    console.error("saveChatMessage failed:", err);
  }
}

export async function listChatHistory(
  userId: string,
  chatType: ChatType,
  limit = 50,
  matterId?: string,
): Promise<ChatMessageRow[]> {
  const sql = await getSql();
  const rows = matterId
    ? await sql.query<ChatMessageRow>(
        `select id, chat_type, role, content, created_at::text as created_at, matter_id, request_id
         from chat_message
         where user_id = $1 and chat_type = $2 and matter_id = $3
         order by created_at desc
         limit $4`,
        [userId, chatType, matterId, limit],
      )
    : await sql.query<ChatMessageRow>(
        `select id, chat_type, role, content, created_at::text as created_at, matter_id, request_id
         from chat_message
         where user_id = $1 and chat_type = $2
         order by created_at desc
         limit $3`,
        [userId, chatType, limit],
      );
  return rows.reverse();
}
