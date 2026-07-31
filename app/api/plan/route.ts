const createSql = `CREATE TABLE IF NOT EXISTS user_plan_state (
  user_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

type Env = { DB?: D1Database };

async function db() {
  const cloudflare = await import("cloudflare:workers");
  return (cloudflare.env as unknown as Env).DB;
}

function userId() {
  // This is an owner-only family site. A stable family key keeps app-embedded
  // and normal mobile browsers on the same plan even when auth headers differ.
  return "daniel-family";
}

export async function GET(request: Request) {
  try {
    const database = await db();
    if (!database) return Response.json({ offDays: [], records: {}, custom: {}, special: {}, synced: false });
    await database.prepare(createSql).run();
    let row = await database.prepare("SELECT payload, updated_at FROM user_plan_state WHERE user_id = ?")
      .bind(userId()).first<{ payload: string; updated_at: string }>();
    if (!row) {
      try {
        const legacy = await database.prepare(
          "SELECT payload, updated_at FROM user_plan_state ORDER BY updated_at DESC LIMIT 1"
        ).first<{ payload: string; updated_at: string }>()
          || await database.prepare("SELECT payload, updated_at FROM plan_state WHERE id = ?")
            .bind(1).first<{ payload: string; updated_at: string }>();
        if (legacy) {
          await database.prepare("INSERT INTO user_plan_state (user_id, payload, updated_at) VALUES (?, ?, ?)")
            .bind(userId(), legacy.payload, legacy.updated_at).run();
          row = legacy;
        }
      } catch {
        // A fresh database has no legacy table.
      }
    }
    return Response.json(row
      ? { ...JSON.parse(row.payload), synced: true, updatedAt: row.updated_at }
      : { offDays: [], records: {}, custom: {}, special: {}, synced: true, updatedAt: null });
  } catch {
    return Response.json({ offDays: [], records: {}, custom: {}, special: {}, synced: false }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const database = await db();
    if (!database) return Response.json({ saved: false }, { status: 503 });
    await database.prepare(createSql).run();
    const updatedAt = new Date().toISOString();
    await database.prepare(
      "INSERT INTO user_plan_state (user_id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at"
    ).bind(userId(), JSON.stringify(payload), updatedAt).run();
    return Response.json({ saved: true, updatedAt });
  } catch {
    return Response.json({ saved: false }, { status: 500 });
  }
}
