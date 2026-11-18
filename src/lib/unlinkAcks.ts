// Unlink acknowledgement list (JT 17/11): one item per Deal Sheet unlink; Contracts - Finance / Construction /
// B&P-PCI each tick it. An item leaves the open list when all three are ticked; history is kept.
import { getDb } from '@/lib/db';

export const ACK_TILES = [
  { key: 'finance', label: 'Contracts - Finance' },
  { key: 'construction', label: 'Contracts - Construction' },
  { key: 'bppci', label: 'Contracts - B&P-PCI' },
] as const;
export type AckTile = (typeof ACK_TILES)[number]['key'];

export type UnlinkAck = {
  id: number; at: string; recordId: string; address: string; oppId: string; oppName: string;
  byName: string; reason: string; stageName: string; doneAt: string | null;
  ticks: Partial<Record<AckTile, { by: string; at: string }>>;
};

let ready: Promise<void> | null = null;
export function ensureUnlinkAckTables(): Promise<void> {
  ready ??= (async () => {
    const sql = getDb();
    await sql`CREATE TABLE IF NOT EXISTS deal_sheet_unlink_ack (id serial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), record_id text NOT NULL, address text, opp_id text NOT NULL, opp_name text, by_email text, by_name text, reason text, stage_id text, stage_name text, note_id text, done_at timestamptz)`;
    await sql`CREATE TABLE IF NOT EXISTS deal_sheet_unlink_ack_tick (item_id int NOT NULL REFERENCES deal_sheet_unlink_ack(id), tile text NOT NULL, by_email text, by_name text, at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (item_id, tile))`;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

export async function addUnlinkAck(a: { recordId: string; address: string; oppId: string; oppName: string; byEmail: string; byName: string; reason: string; stageId: string; stageName: string; noteId: string }): Promise<number> {
  await ensureUnlinkAckTables();
  const sql = getDb();
  const rows = await sql`INSERT INTO deal_sheet_unlink_ack (record_id, address, opp_id, opp_name, by_email, by_name, reason, stage_id, stage_name, note_id)
    VALUES (${a.recordId}, ${a.address}, ${a.oppId}, ${a.oppName}, ${a.byEmail}, ${a.byName}, ${a.reason}, ${a.stageId}, ${a.stageName}, ${a.noteId}) RETURNING id`;
  return Number(rows[0].id);
}

export async function listUnlinkAcks(history: boolean): Promise<UnlinkAck[]> {
  await ensureUnlinkAckTables();
  const sql = getDb();
  const items = history
    ? await sql`SELECT * FROM deal_sheet_unlink_ack WHERE done_at IS NOT NULL ORDER BY at DESC LIMIT 200`
    : await sql`SELECT * FROM deal_sheet_unlink_ack WHERE done_at IS NULL ORDER BY at DESC`;
  const ids = items.map((r) => Number(r.id));
  const ticks = ids.length ? await sql`SELECT * FROM deal_sheet_unlink_ack_tick WHERE item_id = ANY(${ids})` : [];
  return items.map((r) => ({
    id: Number(r.id), at: new Date(r.at).toISOString(), recordId: r.record_id, address: r.address || '', oppId: r.opp_id,
    oppName: r.opp_name || r.opp_id, byName: r.by_name || r.by_email || 'Unknown user', reason: r.reason || '', stageName: r.stage_name || '',
    doneAt: r.done_at ? new Date(r.done_at).toISOString() : null,
    ticks: Object.fromEntries(ticks.filter((t) => Number(t.item_id) === Number(r.id)).map((t) => [t.tile, { by: t.by_name || t.by_email || 'Unknown user', at: new Date(t.at).toISOString() }])),
  }));
}

export async function tickUnlinkAck(id: number, tile: AckTile, byEmail: string, byName: string): Promise<void> {
  await ensureUnlinkAckTables();
  const sql = getDb();
  await sql`INSERT INTO deal_sheet_unlink_ack_tick (item_id, tile, by_email, by_name) VALUES (${id}, ${tile}, ${byEmail}, ${byName}) ON CONFLICT (item_id, tile) DO NOTHING`;
  await sql`UPDATE deal_sheet_unlink_ack SET done_at = now() WHERE id = ${id} AND done_at IS NULL AND (SELECT count(*) FROM deal_sheet_unlink_ack_tick WHERE item_id = ${id}) >= ${ACK_TILES.length}`;
}
