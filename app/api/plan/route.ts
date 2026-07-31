const createSql = `CREATE TABLE IF NOT EXISTS user_plan_state (
  user_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

type PlanRow = { payload: string; updated_at: string };
type Env = { DB?: D1Database };
let postgresPool: import("pg").Pool | null = null;

function userId() {
  return "daniel-family";
}

async function getPostgres() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!postgresPool) {
    const { Pool } = await import("pg");
    postgresPool = new Pool({ connectionString, max: 5 });
  }
  return postgresPool;
}

async function getD1() {
  try {
    const cloudflare = await import("cloudflare:workers");
    return (cloudflare.env as unknown as Env).DB || null;
  } catch {
    return null;
  }
}

async function readPlan(): Promise<PlanRow | null> {
  const postgres = await getPostgres();
  if (postgres) {
    await postgres.query(createSql);
    const result = await postgres.query<PlanRow>(
      "SELECT payload, updated_at FROM user_plan_state WHERE user_id = $1",
      [userId()]
    );
    return result.rows[0] || null;
  }

  const d1 = await getD1();
  if (!d1) throw new Error("No database configured");
  await d1.prepare(createSql).run();
  let row = await d1.prepare("SELECT payload, updated_at FROM user_plan_state WHERE user_id = ?")
    .bind(userId()).first<PlanRow>();
  if (!row) {
    try {
      const legacy = await d1.prepare(
        "SELECT payload, updated_at FROM user_plan_state ORDER BY updated_at DESC LIMIT 1"
      ).first<PlanRow>() || await d1.prepare("SELECT payload, updated_at FROM plan_state WHERE id = ?")
        .bind(1).first<PlanRow>();
      if (legacy) {
        await d1.prepare("INSERT INTO user_plan_state (user_id, payload, updated_at) VALUES (?, ?, ?)")
          .bind(userId(), legacy.payload, legacy.updated_at).run();
        row = legacy;
      }
    } catch {
      // A fresh database has no legacy table.
    }
  }
  return row || null;
}

async function writePlan(serialized: string, updatedAt: string): Promise<PlanRow> {
  const postgres = await getPostgres();
  if (postgres) {
    await postgres.query(createSql);
    await postgres.query(
      `INSERT INTO user_plan_state (user_id, payload, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT(user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
      [userId(), serialized, updatedAt]
    );
    const result = await postgres.query<PlanRow>(
      "SELECT payload, updated_at FROM user_plan_state WHERE user_id = $1",
      [userId()]
    );
    if (!result.rows[0]) throw new Error("PostgreSQL verification failed");
    return result.rows[0];
  }

  const d1 = await getD1();
  if (!d1) throw new Error("No database configured");
  await d1.prepare(createSql).run();
  await d1.prepare(
    "INSERT INTO user_plan_state (user_id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at"
  ).bind(userId(), serialized, updatedAt).run();
  const verified = await d1.prepare("SELECT payload, updated_at FROM user_plan_state WHERE user_id = ?")
    .bind(userId()).first<PlanRow>();
  if (!verified) throw new Error("D1 verification failed");
  return verified;
}

export async function GET() {
  try {
    const row = await readPlan();
    return Response.json(row
      ? { ...JSON.parse(row.payload), synced: true, updatedAt: row.updated_at }
      : { offDays: [], records: {}, custom: {}, special: {}, scheduleOverrides: {}, synced: true, updatedAt: null });
  } catch (error) {
    console.error("Plan read failed", error);
    return Response.json({ offDays: [], records: {}, custom: {}, special: {}, scheduleOverrides: {}, synced: false }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const serialized = JSON.stringify(payload);
    const updatedAt = new Date().toISOString();
    const verified = await writePlan(serialized, updatedAt);
    if (verified.payload !== serialized) {
      return Response.json({ saved: false }, { status: 503 });
    }
    return Response.json({ saved: true, updatedAt: verified.updated_at, verified: true });
  } catch (error) {
    console.error("Plan save failed", error);
    return Response.json({ saved: false, verified: false }, { status: 500 });
  }
}
