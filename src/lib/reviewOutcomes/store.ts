import { getDb } from '@/lib/db';
import { ensureTileAccessTables, logChange } from '@/lib/tileAccess';
import { DEFAULT_SETTINGS, DEFAULT_STATS_EMAIL, RECORDERS_GROUP, type ReviewSettings, type StatsEmailSettings, type StatTarget } from './types';

// App-DB tables for the Portfolio Review outcomes tool (item 14). GHL / Google data is cached here read-only;
// outcomes and property checks are the only things users write. Nothing is written to GHL, Calendar or the sheet.

const RECORDER_SEED = ['john.e@buyersclub.com.au', 'john.t@buyersclub.com.au'];

let ready: Promise<void> | null = null;

async function create(): Promise<void> {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS review_meetings (
    appointment_id TEXT PRIMARY KEY,
    calendar_id TEXT NOT NULL,
    calendar_name TEXT NOT NULL,
    contact_id TEXT,
    assigned_user_id TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    ghl_status TEXT,
    title TEXT,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    synced_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS review_meetings_start ON review_meetings (start_at)`;
  await sql`CREATE TABLE IF NOT EXISTS review_contacts (
    contact_id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phones JSONB NOT NULL DEFAULT '[]',
    fetched_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS review_gcal_events (
    event_id TEXT PRIMARY KEY,
    start_at TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    start_raw TEXT,
    summary TEXT,
    description TEXT,
    location TEXT,
    organizer TEXT,
    attendees JSONB NOT NULL DEFAULT '[]',
    calendars JSONB NOT NULL DEFAULT '[]',
    synced_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS review_gcal_events_start ON review_gcal_events (start_at)`;
  await sql`CREATE TABLE IF NOT EXISTS review_outcomes (
    appointment_id TEXT PRIMARY KEY,
    outcome TEXT,
    invalid_reason TEXT,
    note TEXT,
    source TEXT NOT NULL DEFAULT 'tool',
    source_ref TEXT,
    recorded_by TEXT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS review_property_checks (
    appointment_id TEXT NOT NULL,
    property_key TEXT NOT NULL,
    address TEXT,
    still_owned BOOLEAN,
    current_value NUMERIC,
    current_rent_pw NUMERIC,
    recorded_by TEXT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (appointment_id, property_key)
  )`;
  // Current value is a From / To range: current_value is "from", current_value_to is "to".
  await sql`ALTER TABLE review_property_checks ADD COLUMN IF NOT EXISTS current_value_to NUMERIC`;
  // Read-only copy of the Buyers Club Tracking sheet's office sales tabs and CANCELLATIONS (kind = 'sale' | 'cancel').
  await sql`CREATE TABLE IF NOT EXISTS review_sales (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    office TEXT,
    row_no INT,
    client TEXT,
    signed_on TEXT,
    paid NUMERIC,
    balance NUMERIC,
    consultant TEXT,
    cc_member TEXT,
    broker TEXT,
    smsf TEXT,
    comments TEXT,
    lead_source TEXT,
    phone TEXT,
    ad_type TEXT,
    lead_date TEXT,
    refund NUMERIC,
    processed TEXT,
    reason TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  // Read-only copy of the team's CALENDAR SCHEDULE sheet (weekly booking log): Lead type, Sat? and Outcome per meeting.
  await sql`CREATE TABLE IF NOT EXISTS review_schedule_rows (
    id TEXT PRIMARY KEY,
    tab TEXT,
    ymd TEXT NOT NULL,
    consultant TEXT,
    agent TEXT,
    client TEXT,
    lead TEXT,
    phone TEXT,
    sat TEXT,
    outcome TEXT,
    location TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS review_schedule_rows_ymd ON review_schedule_rows (ymd)`;
  // GHL keeps the same appointment when it is moved; each sync records a changed start time here (= Rescheduled).
  await sql`CREATE TABLE IF NOT EXISTS review_meeting_moves (
    id SERIAL PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    old_start TIMESTAMPTZ NOT NULL,
    new_start TIMESTAMPTZ NOT NULL,
    seen_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS review_meeting_moves_appt ON review_meeting_moves (appointment_id)`;
  // GHL createdBy.userId: equal to the assigned consultant = self-booked (no outcome needed).
  await sql`ALTER TABLE review_meetings ADD COLUMN IF NOT EXISTS created_by TEXT`;
  await sql`CREATE TABLE IF NOT EXISTS review_outcome_log (
    id SERIAL PRIMARY KEY,
    at TIMESTAMPTZ DEFAULT NOW(),
    by_email TEXT NOT NULL,
    appointment_id TEXT,
    action TEXT NOT NULL,
    detail JSONB NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS review_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await ensureTileAccessTables();
  const made = await sql`INSERT INTO access_groups (name, created_by) VALUES (${RECORDERS_GROUP}, 'seed (JT 30/10 item 14)')
    ON CONFLICT DO NOTHING RETURNING name`;
  if (made.length) {
    for (const e of RECORDER_SEED) {
      await sql`INSERT INTO access_group_members (group_name, email, added_by) VALUES (${RECORDERS_GROUP}, ${e}, 'seed (JT 30/10 item 14)') ON CONFLICT DO NOTHING`;
    }
    await logChange('seed (JT 30/10 item 14)', 'group_create', { group: RECORDERS_GROUP, members: RECORDER_SEED });
  }
}

export function ensureReviewTables(): Promise<void> {
  if (!ready) {
    ready = create().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export async function loadSettings(): Promise<ReviewSettings> {
  await ensureReviewTables();
  const rows = await getDb()`SELECT key, value FROM review_settings WHERE key IN ('outcomes', 'invalid_reasons', 'call_centre', 'targets', 'sales_aliases', 'write_target')`;
  const get = (k: string) => rows.find((r) => r.key === k)?.value as string[] | undefined;
  return {
    outcomes: get('outcomes') ?? DEFAULT_SETTINGS.outcomes,
    invalidReasons: get('invalid_reasons') ?? DEFAULT_SETTINGS.invalidReasons,
    callCentre: get('call_centre') ?? DEFAULT_SETTINGS.callCentre,
    targets: (rows.find((r) => r.key === 'targets')?.value as Record<string, StatTarget> | undefined) ?? DEFAULT_SETTINGS.targets,
    salesAliases: (rows.find((r) => r.key === 'sales_aliases')?.value as Record<string, string> | undefined) ?? DEFAULT_SETTINGS.salesAliases,
    writeTarget: rows.find((r) => r.key === 'write_target')?.value === 'db+ghl' ? 'db+ghl' : 'db',
    // JT approved GHL status write-back (2026-10-28); it stays off until switched on in Settings.
    phase2Approved: true,
  };
}

export async function saveSettings(by: string, s: { outcomes: string[]; invalidReasons: string[]; callCentre: string[]; targets: Record<string, StatTarget>; salesAliases: Record<string, string>; writeTarget?: 'db' | 'db+ghl' }): Promise<void> {
  await ensureReviewTables();
  const sql = getDb();
  const before = await loadSettings();
  if (s.writeTarget) {
    await sql`INSERT INTO review_settings (key, value, updated_by) VALUES ('write_target', ${JSON.stringify(s.writeTarget)}::jsonb, ${by})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
  }
  await sql`INSERT INTO review_settings (key, value, updated_by) VALUES ('outcomes', ${JSON.stringify(s.outcomes)}::jsonb, ${by})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
  await sql`INSERT INTO review_settings (key, value, updated_by) VALUES ('invalid_reasons', ${JSON.stringify(s.invalidReasons)}::jsonb, ${by})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
  await sql`INSERT INTO review_settings (key, value, updated_by) VALUES ('call_centre', ${JSON.stringify(s.callCentre)}::jsonb, ${by})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
  await sql`INSERT INTO review_settings (key, value, updated_by) VALUES ('targets', ${JSON.stringify(s.targets)}::jsonb, ${by})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
  await sql`INSERT INTO review_settings (key, value, updated_by) VALUES ('sales_aliases', ${JSON.stringify(s.salesAliases)}::jsonb, ${by})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
  await logReview(by, null, 'settings', {
    before: { outcomes: before.outcomes, invalidReasons: before.invalidReasons, callCentre: before.callCentre, targets: before.targets, salesAliases: before.salesAliases, writeTarget: before.writeTarget },
    after: s,
  });
}

export async function loadStatsEmail(): Promise<StatsEmailSettings> {
  await ensureReviewTables();
  const rows = await getDb()`SELECT value FROM review_settings WHERE key = 'stats_email'`;
  return { ...DEFAULT_STATS_EMAIL, ...((rows[0]?.value as Partial<StatsEmailSettings>) || {}) };
}

export async function saveStatsEmail(by: string, s: StatsEmailSettings): Promise<void> {
  await ensureReviewTables();
  const before = await loadStatsEmail();
  await getDb()`INSERT INTO review_settings (key, value, updated_by) VALUES ('stats_email', ${JSON.stringify(s)}::jsonb, ${by})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
  await logReview(by, null, 'stats_email_settings', { before, after: s });
}

export async function logReview(by: string, appointmentId: string | null, action: string, detail: Record<string, unknown>): Promise<void> {
  await getDb()`INSERT INTO review_outcome_log (by_email, appointment_id, action, detail) VALUES (${by}, ${appointmentId}, ${action}, ${JSON.stringify(detail)}::jsonb)`;
}

export async function lastSync(): Promise<{ at: string; from: string; to: string } | null> {
  await ensureReviewTables();
  const rows = await getDb()`SELECT value FROM review_settings WHERE key = 'last_full_sync'`;
  return (rows[0]?.value as { at: string; from: string; to: string }) ?? null;
}

export async function saveLastSync(by: string, v: { at: string; from: string; to: string }): Promise<void> {
  await getDb()`INSERT INTO review_settings (key, value, updated_by) VALUES ('last_full_sync', ${JSON.stringify(v)}::jsonb, ${by})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
}
