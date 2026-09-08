import { getSql } from "@/lib/db";

export type ChatType = "legal" | "residency";
export type ChatRole = "user" | "assistant";

export interface ChatMessageRow {
  id: number;
  chat_type: ChatType;
  role: ChatRole;
  content: string;
  created_at: string;
}

/** بی‌سروصدا ذخیره می‌کند — یک خطای ذخیره‌سازی هرگز نباید جواب کاربر را خراب کند. */
export async function saveChatMessage(
  userId: string,
  chatType: ChatType,
  role: ChatRole,
  content: string,
): Promise<void> {
  try {
    const sql = await getSql();
    await sql`
      insert into chat_message (user_id, chat_type, role, content)
      values (${userId}, ${chatType}, ${role}, ${content})
    `;
  } catch (err) {
    console.error("saveChatMessage failed:", err);
  }
}

export async function listChatHistory(
  userId: string,
  chatType: ChatType,
  limit = 50,
): Promise<ChatMessageRow[]> {
  const sql = await getSql();
  const rows = await sql<ChatMessageRow>`
    select id, chat_type, role, content, created_at::text as created_at
    from chat_message
    where user_id = ${userId} and chat_type = ${chatType}
    order by created_at desc
    limit ${limit}
  `;
  return rows.reverse();
}
