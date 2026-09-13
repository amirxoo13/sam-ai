/** Last (longest content) wins — Postgres ON CONFLICT DO UPDATE cannot see the same id twice in one VALUES list. */
export function uniqueById<T extends { id: string; content?: string }>(rows: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of rows) {
    if (!row.id) continue;
    const prev = byId.get(row.id);
    if (!prev) {
      byId.set(row.id, row);
      continue;
    }
    const prevLen = typeof prev.content === "string" ? prev.content.length : 0;
    const nextLen = typeof row.content === "string" ? row.content.length : 0;
    if (nextLen >= prevLen) byId.set(row.id, row);
  }
  return [...byId.values()];
}
