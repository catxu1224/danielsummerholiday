const createSql = `CREATE TABLE IF NOT EXISTS plan_state (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

type Env = { DB?: D1Database };

async function db() {
  const cloudflare = await import("cloudflare:workers");
  return (cloudflare.env as unknown as Env).DB;
}

export async function GET() {
  try {
    const database = await db();
    if (!database) return Response.json({ offDays: [], records: {}, custom: {} });
    await database.prepare(createSql).run();
    const row = await database.prepare("SELECT payload FROM plan_state WHERE id = ?").bind(1).first<{ payload: string }>();
    return Response.json(row ? JSON.parse(row.payload) : { offDays: [], records: {}, custom: {} });
  } catch {
    return Response.json({ offDays: [], records: {}, custom: {} });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const database = await db();
    if (!database) return Response.json({ saved: false });
    await database.prepare(createSql).run();
    await database.prepare(
      "INSERT INTO plan_state (id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at"
    ).bind(1, JSON.stringify(payload), new Date().toISOString()).run();
    return Response.json({ saved: true });
  } catch {
    return Response.json({ saved: false }, { status: 500 });
  }
}
