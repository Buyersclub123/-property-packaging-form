// Confirmed tick (JT, 11/11). Ticking a meeting row sets the GHL appointment status = confirmed and rewrites the
// title to "CONFIRMED " + title (Google's invite subject follows in ~30s). Unticking puts the status back to what it
// was before the tick and removes the prefix. Until the switch in Admin > Automated updates is turned on, it only logs
// what it would change (dry run). Every run is logged in review_outcome_log (action confirm_ghl) with before / after / read back.
import { getDb } from '@/lib/db';
import { ghlFetch } from '@/lib/ghlFetch';
import { ensureReviewTables, logReview } from './store';

const BASE = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const PREFIX = 'CONFIRMED ';
const APPLY_KEY = 'confirm_apply';

type Appt = { title?: string; appointmentStatus?: string };
export type ConfirmStep = { field: string; before: string; after: string; readBack: string; result: string };
export type ConfirmSummary = { dryRun: boolean; steps: ConfirmStep[] };

const headers = () => ({
  Authorization: `Bearer ${process.env.GHL_BEARER_TOKEN || ''}`,
  Version: '2021-04-15',
  Accept: 'application/json',
  'Content-Type': 'application/json',
});

async function ensureConfirmColumns(): Promise<void> {
  await ensureReviewTables();
  await getDb()`ALTER TABLE review_outcomes ADD COLUMN IF NOT EXISTS confirm_prev_status TEXT`;
}

// review_settings row; a missing row = dry run.
export async function confirmSwitch(): Promise<{ apply: boolean; by: string | null; at: string | null }> {
  await ensureReviewTables();
  const rows = await getDb()`SELECT value, updated_by, updated_at FROM review_settings WHERE key = ${APPLY_KEY}`;
  return { apply: rows[0]?.value === true, by: rows[0]?.updated_by ?? null, at: rows[0]?.updated_at ? new Date(rows[0].updated_at).toISOString() : null };
}

export async function setConfirmApply(on: boolean, by: string): Promise<void> {
  await ensureReviewTables();
  await getDb()`INSERT INTO review_settings (key, value, updated_by) VALUES (${APPLY_KEY}, ${JSON.stringify(on)}::jsonb, ${by})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
}

async function readAppt(id: string): Promise<Appt | null> {
  try {
    const res = await ghlFetch(`${BASE}/calendars/events/appointments/${id}`, { headers: headers(), cache: 'no-store', signal: AbortSignal.timeout(30_000) }, 'review-confirm');
    if (!res.ok) return null;
    const body = await res.json();
    return (body.appointment || body.event || body) as Appt;
  } catch {
    return null;
  }
}

export const stripConfirmed = (title: string) => title.replace(/^CONFIRMED\s+/i, '');

// Runs after the tool flag was saved (saveConfirmed).
export async function runConfirm(by: string, appointmentId: string, on: boolean): Promise<ConfirmSummary> {
  await ensureConfirmColumns();
  const sql = getDb();
  const dryRun = !(await confirmSwitch()).apply;
  const steps: ConfirmStep[] = [];
  const before = await readAppt(appointmentId);
  if (!before) {
    steps.push({ field: 'appointment', before: '(could not read)', after: '', readBack: '', result: 'failed: could not read the GHL appointment' });
    await logReview(by, appointmentId, 'confirm_ghl', { on, dryRun, steps });
    return { dryRun, steps };
  }
  const status0 = before.appointmentStatus || '';
  const title0 = before.title || '';
  const prevRow = await sql`SELECT confirm_prev_status FROM review_outcomes WHERE appointment_id = ${appointmentId}`;
  const prev = (prevRow[0]?.confirm_prev_status as string | null) || null;
  const status1 = on ? 'confirmed' : status0 === 'confirmed' && prev ? prev : status0;
  const title1 = on ? (/^CONFIRMED\b/i.test(title0) ? title0 : PREFIX + title0) : stripConfirmed(title0);
  const changed = status1 !== status0 || title1 !== title0;

  if (!changed) {
    steps.push({ field: 'appointmentStatus', before: status0, after: status1, readBack: status0, result: 'skipped: already set' });
    steps.push({ field: 'title', before: title0, after: title1, readBack: title0, result: 'skipped: already set' });
  } else if (dryRun) {
    steps.push({ field: 'appointmentStatus', before: status0, after: status1, readBack: '', result: status1 === status0 ? 'unchanged' : 'dry run: would set' });
    steps.push({ field: 'title', before: title0, after: title1, readBack: '', result: title1 === title0 ? 'unchanged' : 'dry run: would set' });
  } else {
    const res = await ghlFetch(`${BASE}/calendars/events/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: headers(),
      // toNotify: false - don't fire GHL's appointment automations (see ghlSetStatus).
      body: JSON.stringify({ appointmentStatus: status1, title: title1, toNotify: false }),
      signal: AbortSignal.timeout(30_000),
    }, 'review-confirm');
    if (!res.ok) {
      const err = `failed: GHL ${res.status} ${(await res.text()).slice(0, 200)}`;
      steps.push({ field: 'appointmentStatus', before: status0, after: status1, readBack: '', result: err });
      steps.push({ field: 'title', before: title0, after: title1, readBack: '', result: err });
    } else {
      const back = await readAppt(appointmentId);
      const bs = back?.appointmentStatus ?? '(could not read)';
      const bt = back?.title ?? '(could not read)';
      steps.push({ field: 'appointmentStatus', before: status0, after: status1, readBack: bs, result: bs === status1 ? 'applied' : 'read back does not match' });
      steps.push({ field: 'title', before: title0, after: title1, readBack: bt, result: bt === title1 ? 'applied' : 'read back does not match' });
      if (back) await sql`UPDATE review_meetings SET ghl_status = ${bs}, title = ${bt} WHERE appointment_id = ${appointmentId}`;
      if (on && !prev && status0 !== 'confirmed') await sql`UPDATE review_outcomes SET confirm_prev_status = ${status0} WHERE appointment_id = ${appointmentId}`;
      if (!on) await sql`UPDATE review_outcomes SET confirm_prev_status = NULL WHERE appointment_id = ${appointmentId}`;
    }
  }
  await logReview(by, appointmentId, 'confirm_ghl', { on, dryRun, steps });
  return { dryRun, steps };
}

export async function recentConfirmRuns(limit = 100): Promise<Record<string, unknown>[]> {
  await ensureReviewTables();
  const rows = await getDb()`SELECT l.at, l.by_email, l.appointment_id, l.detail, COALESCE(c.name, m.title, '') AS name
    FROM review_outcome_log l LEFT JOIN review_meetings m ON m.appointment_id = l.appointment_id LEFT JOIN review_contacts c ON c.contact_id = m.contact_id
    WHERE l.action = 'confirm_ghl' ORDER BY l.at DESC LIMIT ${limit}`;
  return rows.flatMap((r) => {
    const d = (r.detail || {}) as { on?: boolean; dryRun?: boolean; steps?: ConfirmStep[] };
    return (d.steps || []).map((s) => ({
      at: r.at ? new Date(r.at).toISOString() : null, user_email: r.by_email, appointment_id: r.appointment_id, name: r.name,
      action: d.on ? 'tick' : 'untick', field: s.field, old_value: s.before, new_value: s.after, read_back: s.readBack, dry_run: !!d.dryRun, result: s.result,
    }));
  });
}
