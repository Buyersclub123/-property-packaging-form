import { getDb } from './db';
import { getCfEmail } from './cloudflareAuth';
import type { ChangeEvent, ConfigSnapshot } from './ghlConfigMonitor';
import type { StoredChange } from './ghlMonitorEmail';

const KEEP_SNAPSHOTS = 30;

export async function getLatestSnapshot(): Promise<{ id: number; takenAt: string; payload: ConfigSnapshot } | null> {
  const sql = getDb();
  const rows = await sql`SELECT id, taken_at, payload FROM ghl_config_snapshots ORDER BY taken_at DESC LIMIT 1`;
  if (rows.length === 0) return null;
  return { id: rows[0].id, takenAt: new Date(rows[0].taken_at).toISOString(), payload: rows[0].payload as ConfigSnapshot };
}

export async function saveSnapshot(payload: ConfigSnapshot): Promise<void> {
  const sql = getDb();
  await sql`INSERT INTO ghl_config_snapshots (payload) VALUES (${JSON.stringify(payload)}::jsonb)`;
  await sql`
    DELETE FROM ghl_config_snapshots
    WHERE id NOT IN (SELECT id FROM ghl_config_snapshots ORDER BY taken_at DESC LIMIT ${KEEP_SNAPSHOTS})`;
}

export async function insertChanges(changes: ChangeEvent[]): Promise<void> {
  const sql = getDb();
  for (const c of changes) {
    await sql`
      INSERT INTO ghl_config_changes (entity_type, change_type, scope, entity_id, entity_name, before_value, after_value)
      VALUES (${c.entityType}, ${c.changeType}, ${c.scope}, ${c.entityId}, ${c.entityName},
              ${JSON.stringify(c.before ?? null)}::jsonb, ${JSON.stringify(c.after ?? null)}::jsonb)`;
  }
}

function toStored(r: Record<string, any>): StoredChange {
  return {
    id: r.id,
    detectedAt: new Date(r.detected_at).toISOString(),
    entityType: r.entity_type,
    changeType: r.change_type,
    scope: r.scope || '',
    entityId: r.entity_id || '',
    entityName: r.entity_name || '',
    before: r.before_value,
    after: r.after_value,
    acknowledgedAt: r.acknowledged_at ? new Date(r.acknowledged_at).toISOString() : null,
    acknowledgedBy: r.acknowledged_by || null,
  };
}

export async function listUnacknowledged(): Promise<StoredChange[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ghl_config_changes WHERE acknowledged_at IS NULL ORDER BY detected_at ASC, id ASC`;
  return rows.map(toStored);
}

export async function listRecentAcknowledged(limit = 50): Promise<StoredChange[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM ghl_config_changes WHERE acknowledged_at IS NOT NULL ORDER BY acknowledged_at DESC LIMIT ${limit}`;
  return rows.map(toStored);
}

export async function acknowledgeChanges(ids: number[], by: string): Promise<number> {
  if (ids.length === 0) return 0;
  const sql = getDb();
  const rows = await sql`
    UPDATE ghl_config_changes SET acknowledged_at = NOW(), acknowledged_by = ${by}
    WHERE id = ANY(${ids}::int[]) AND acknowledged_at IS NULL
    RETURNING id`;
  return rows.length;
}

export async function acknowledgeAll(by: string): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    UPDATE ghl_config_changes SET acknowledged_at = NOW(), acknowledged_by = ${by}
    WHERE acknowledged_at IS NULL RETURNING id`;
  return rows.length;
}

/**
 * Cron auth: Vercel sends `Authorization: Bearer $CRON_SECRET`; manual runs use
 * ?secret=; a portal user behind Cloudflare Access ("Run check now") is also allowed.
 */
export function isCronAuthorised(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const manualSecret = process.env.DEAL_SHEET_WEBHOOK_SECRET;
  const header = request.headers.get('authorization');
  const query = new URL(request.url).searchParams.get('secret');
  if (cronSecret && header === `Bearer ${cronSecret}`) return true;
  if (cronSecret && query === cronSecret) return true;
  if (manualSecret && query === manualSecret) return true;
  if (getCfEmail(request)) return true;
  // Local dev without any secret configured
  return !cronSecret && !manualSecret && process.env.VERCEL_ENV === undefined;
}
