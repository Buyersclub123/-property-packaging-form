import { google } from 'googleapis';
import { getDb } from '@/lib/db';
import { ghlFetch } from '@/lib/ghlFetch';
import { ensureReviewTables } from './store';
import { MIN_YMD, utcCover } from './types';

// Read-only refresh of the review-outcomes cache: GHL calendar events + contacts (GET only) and Google Calendar
// 'Portfolio Review' events seen by info@ (calendar.readonly). Nothing is written to GHL or Google.

export const REVIEW_CALENDARS = [
  { id: 'ziiNfM0fl5q8iWL5MDtF', name: 'Portfolio Review Meeting' },
  // New Lead / Referral meetings (JT: Presentation Meeting One only).
  { id: 'OfHMBFJUzIEMAx7UGZrR', name: 'Presentation Meeting One' },
];
/** 2nd / follow-up meetings aren't recorded in Review Outcomes (JT); older synced rows are filtered out on load. */
export const SECOND_MEETING_CALENDAR_ID = 'fQPvq7ujG1HHvrPs0dfU';
/** info@ has reader access to the consultants' calendars (checked 29/10). */
export const GCAL_MAILBOX = 'info@buyersclub.com.au';
const CALENDAR_READONLY = 'https://www.googleapis.com/auth/calendar.readonly';
const DAY = 864e5;

function ghlEnv() {
  const token = process.env.GHL_BEARER_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) throw new Error('GHL_BEARER_TOKEN / GHL_LOCATION_ID not set');
  return { token, locationId, base: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com' };
}

async function ghlGet<T>(path: string, version: string): Promise<{ status: number; body: T | null }> {
  const { token, base } = ghlEnv();
  const res = await ghlFetch(
    `${base}${path}`,
    { headers: { Authorization: `Bearer ${token}`, Version: version, Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) },
    'review-outcomes',
  );
  if (res.status === 404) return { status: 404, body: null };
  if (!res.ok) throw new Error(`GHL ${path.split('?')[0]} returned HTTP ${res.status}`);
  return { status: res.status, body: (await res.json()) as T };
}

/** Tool outcome -> GHL appointment status. Rescheduled has no GHL status; JT: Not sat = No show. */
export const GHL_STATUS_FOR: Record<string, string> = {
  Showed: 'showed', 'No show': 'noshow', 'Not sat': 'noshow', 'Invalid (DNQ)': 'invalid', Cancelled: 'cancelled',
};

/** Phase 2 write-back: sets one appointment's status in GHL and mirrors it in review_meetings. */
export async function ghlSetStatus(appointmentId: string, status: string): Promise<void> {
  const { token, base } = ghlEnv();
  const res = await ghlFetch(
    `${base}/calendars/events/appointments/${appointmentId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, Version: '2021-04-15', Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentStatus: status }),
      signal: AbortSignal.timeout(30_000),
    },
    'review-outcomes',
  );
  if (!res.ok) throw new Error(`GHL returned HTTP ${res.status}${res.status === 401 || res.status === 403 ? ' (token needs calendars/events write scope)' : ''}`);
  await getDb()`UPDATE review_meetings SET ghl_status = ${status} WHERE appointment_id = ${appointmentId}`;
}

export function ghlLocationId(): string {
  return process.env.GHL_LOCATION_ID || '';
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

export interface GhlUser { id: string; name: string; email: string }
let usersCache: { at: number; users: GhlUser[] } | null = null;

export async function ghlUsers(): Promise<GhlUser[]> {
  if (usersCache && Date.now() - usersCache.at < 10 * 60e3) return usersCache.users;
  const { locationId } = ghlEnv();
  const { body } = await ghlGet<{ users?: { id: string; name?: string; firstName?: string; lastName?: string; email?: string }[] }>(
    `/users/?locationId=${locationId}`,
    '2021-07-28',
  );
  const users = (body?.users || []).map((u) => ({
    id: u.id,
    name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' '),
    email: String(u.email || '').trim().toLowerCase(),
  }));
  usersCache = { at: Date.now(), users };
  return users;
}

export const phoneKey = (s: unknown): string => {
  let d = String(s || '').replace(/\D/g, '');
  if (d.startsWith('61')) d = d.slice(2);
  d = d.replace(/^0/, '');
  return d.length >= 8 ? d.slice(-9) : '';
};

interface GhlEvent {
  id: string;
  contactId?: string;
  assignedUserId?: string;
  startTime: string;
  title?: string;
  appointmentStatus?: string;
  appoinmentStatus?: string;
  deleted?: boolean;
  createdBy?: { userId?: string; source?: string };
}

async function syncGhl(start: Date, end: Date, syncStart: string): Promise<number> {
  const { locationId } = ghlEnv();
  const chunks: { cal: (typeof REVIEW_CALENDARS)[number]; s: number; e: number }[] = [];
  for (const cal of REVIEW_CALENDARS) {
    for (let s = start.getTime(); s < end.getTime(); s += 28 * DAY) chunks.push({ cal, s, e: Math.min(s + 28 * DAY, end.getTime()) });
  }
  const byId = new Map<string, Record<string, unknown>>();
  await pool(chunks, 4, async ({ cal, s, e }) => {
    const { body } = await ghlGet<{ events?: GhlEvent[] }>(
      `/calendars/events?locationId=${locationId}&calendarId=${cal.id}&startTime=${s}&endTime=${e}`,
      '2021-04-15',
    );
    for (const x of body?.events || []) {
      const t = Date.parse(x.startTime);
      if (!(t >= start.getTime() && t < end.getTime())) continue;
      byId.set(x.id, {
        id: x.id, cal_id: cal.id, cal_name: cal.name, contact_id: x.contactId || null, user_id: x.assignedUserId || null,
        start_at: new Date(t).toISOString(), status: x.appointmentStatus || x.appoinmentStatus || '', title: x.title || '', deleted: !!x.deleted,
        created_by: x.createdBy?.userId || null,
      });
    }
  });
  const rows = [...byId.values()];
  const sql = getDb();
  // Move tracking: a known appointment whose start time changed was rescheduled (GHL keeps the same id).
  for (let i = 0; i < rows.length; i += 500) {
    await sql`INSERT INTO review_meeting_moves (appointment_id, old_start, new_start)
      SELECT m.appointment_id, m.start_at, r.start_at::timestamptz
      FROM jsonb_to_recordset(${JSON.stringify(rows.slice(i, i + 500).map((r) => ({ id: r.id, start_at: r.start_at })))}::jsonb) AS r(id text, start_at text)
      JOIN review_meetings m ON m.appointment_id = r.id
      WHERE m.start_at <> r.start_at::timestamptz`;
  }
  for (let i = 0; i < rows.length; i += 500) {
    await sql`INSERT INTO review_meetings (appointment_id, calendar_id, calendar_name, contact_id, assigned_user_id, start_at, ghl_status, title, deleted, created_by, synced_at)
      SELECT r.id, r.cal_id, r.cal_name, r.contact_id, r.user_id, r.start_at::timestamptz, r.status, r.title, r.deleted, r.created_by, ${syncStart}::timestamptz
      FROM jsonb_to_recordset(${JSON.stringify(rows.slice(i, i + 500))}::jsonb)
        AS r(id text, cal_id text, cal_name text, contact_id text, user_id text, start_at text, status text, title text, deleted boolean, created_by text)
      ON CONFLICT (appointment_id) DO UPDATE SET calendar_id = EXCLUDED.calendar_id, created_by = EXCLUDED.created_by, calendar_name = EXCLUDED.calendar_name,
        contact_id = EXCLUDED.contact_id, assigned_user_id = EXCLUDED.assigned_user_id, start_at = EXCLUDED.start_at,
        ghl_status = EXCLUDED.ghl_status, title = EXCLUDED.title, deleted = EXCLUDED.deleted, synced_at = EXCLUDED.synced_at`;
  }
  // Appointments in this window that GHL no longer returns were deleted or moved out of the window.
  await sql`UPDATE review_meetings SET deleted = TRUE
    WHERE start_at >= ${start.toISOString()}::timestamptz AND start_at < ${end.toISOString()}::timestamptz AND synced_at < ${syncStart}::timestamptz`;

  const ids = [...new Set(rows.map((r) => r.contact_id as string | null).filter((x): x is string => !!x))];
  const have = ids.length
    ? await sql`SELECT contact_id FROM review_contacts WHERE contact_id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))`
    : [];
  const known = new Set(have.map((r) => String(r.contact_id)));
  const missing = ids.filter((id) => !known.has(id));
  const contacts: { id: string; name: string; email: string; phones: string[] }[] = [];
  await pool(missing, 5, async (id) => {
    type C = { contactName?: string; firstName?: string; lastName?: string; email?: string; phone?: string; additionalPhones?: (string | { phone?: string })[] };
    // One unreadable contact (GHL answers 400 for some merged / deleted ids) must not stop the rest.
    const k = await ghlGet<{ contact?: C }>(`/contacts/${id}`, '2021-07-28').then((r) => r.body?.contact, () => undefined);
    contacts.push(
      k
        ? {
            id,
            name: [k.firstName, k.lastName].filter(Boolean).join(' ') || k.contactName || k.email || '',
            email: String(k.email || '').toLowerCase(),
            phones: [k.phone, ...(k.additionalPhones || []).map((p) => (typeof p === 'string' ? p : p.phone))].map(phoneKey).filter(Boolean),
          }
        : { id, name: '(contact not found)', email: '', phones: [] },
    );
  });
  for (let i = 0; i < contacts.length; i += 500) {
    await sql`INSERT INTO review_contacts (contact_id, name, email, phones)
      SELECT r.id, r.name, r.email, r.phones FROM jsonb_to_recordset(${JSON.stringify(contacts.slice(i, i + 500))}::jsonb)
        AS r(id text, name text, email text, phones jsonb)
      ON CONFLICT (contact_id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, phones = EXCLUDED.phones, fetched_at = NOW()`;
  }
  return rows.length;
}

function calendarAuth() {
  const raw = process.env.GMAIL_READER_CREDENTIALS;
  if (!raw) throw new Error('GMAIL_READER_CREDENTIALS is not set (mailbox-reader service account key).');
  const key = JSON.parse(raw) as { client_email?: string; private_key?: string };
  if (!key.client_email || !key.private_key) throw new Error('GMAIL_READER_CREDENTIALS is missing client_email or private_key.');
  return new google.auth.JWT({ email: key.client_email, key: key.private_key.replace(/\\n/g, '\n'), scopes: [CALENDAR_READONLY], subject: GCAL_MAILBOX });
}

async function syncGcal(start: Date, end: Date, syncStart: string): Promise<number> {
  const cal = google.calendar({ version: 'v3', auth: calendarAuth() });
  const list = (await cal.calendarList.list({ maxResults: 250 })).data.items || [];
  const byId = new Map<string, Record<string, unknown> & { calendars: string[] }>();
  await pool(list, 6, async (c) => {
    if (!c.id) return;
    const calName = c.summaryOverride || c.summary || c.id;
    let pageToken: string | undefined;
    do {
      const r = await cal.events.list({
        calendarId: c.id, q: 'Portfolio Review', singleEvents: true, maxResults: 2500, pageToken,
        timeMin: start.toISOString(), timeMax: end.toISOString(),
      });
      for (const e of r.data.items || []) {
        if (!e.id || e.status === 'cancelled') continue;
        const prev = byId.get(e.id);
        if (prev) {
          if (!prev.calendars.includes(calName)) prev.calendars.push(calName);
          continue;
        }
        const allDay = !e.start?.dateTime;
        const raw = e.start?.dateTime || e.start?.date || '';
        if (!raw) continue;
        const startAt = allDay ? new Date(`${raw}T00:00:00+10:00`).toISOString() : new Date(raw).toISOString();
        if (!(Date.parse(startAt) >= start.getTime() && Date.parse(startAt) < end.getTime())) continue;
        byId.set(e.id, {
          id: e.id, start_at: startAt, all_day: allDay, start_raw: raw, summary: e.summary || '', description: (e.description || '').slice(0, 2000),
          location: e.location || '', organizer: String(e.organizer?.email || '').toLowerCase(),
          attendees: (e.attendees || []).map((a) => ({ email: String(a.email || '').toLowerCase(), name: a.displayName || '' })),
          calendars: [calName],
        });
      }
      pageToken = r.data.nextPageToken || undefined;
    } while (pageToken);
  });
  const rows = [...byId.values()];
  const sql = getDb();
  for (let i = 0; i < rows.length; i += 300) {
    await sql`INSERT INTO review_gcal_events (event_id, start_at, all_day, start_raw, summary, description, location, organizer, attendees, calendars, synced_at)
      SELECT r.id, r.start_at::timestamptz, r.all_day, r.start_raw, r.summary, r.description, r.location, r.organizer, r.attendees, r.calendars, ${syncStart}::timestamptz
      FROM jsonb_to_recordset(${JSON.stringify(rows.slice(i, i + 300))}::jsonb)
        AS r(id text, start_at text, all_day boolean, start_raw text, summary text, description text, location text, organizer text, attendees jsonb, calendars jsonb)
      ON CONFLICT (event_id) DO UPDATE SET start_at = EXCLUDED.start_at, all_day = EXCLUDED.all_day, start_raw = EXCLUDED.start_raw,
        summary = EXCLUDED.summary, description = EXCLUDED.description, location = EXCLUDED.location, organizer = EXCLUDED.organizer,
        attendees = EXCLUDED.attendees, calendars = EXCLUDED.calendars, synced_at = EXCLUDED.synced_at`;
  }
  await sql`DELETE FROM review_gcal_events
    WHERE start_at >= ${start.toISOString()}::timestamptz AND start_at < ${end.toISOString()}::timestamptz AND synced_at < ${syncStart}::timestamptz`;
  return rows.length;
}

const recent = new Map<string, number>();

/** Refreshes the cache for Sydney days from..to. Returns warnings (a failed source keeps its cached rows). */
export async function syncRange(from: string, to: string, force = false, timings?: Record<string, number>): Promise<string[]> {
  const f = from < MIN_YMD ? MIN_YMD : from;
  if (f > to) return [];
  const key = `${f}|${to}`;
  if (!force && Date.now() - (recent.get(key) || 0) < 3 * 60e3) return [];
  await ensureReviewTables();
  const { start, end } = utcCover(f, to);
  const syncStart = new Date().toISOString();
  const timed = async <T>(k: string, run: Promise<T>): Promise<T> => {
    const t0 = Date.now();
    try { return await run; } finally { if (timings) timings[k] = Date.now() - t0; }
  };
  const [g, c] = await Promise.allSettled([timed('ghlMs', syncGhl(start, end, syncStart)), timed('googleMs', syncGcal(start, end, syncStart))]);
  const warnings: string[] = [];
  const msg = (r: PromiseRejectedResult) => (r.reason instanceof Error ? r.reason.message : String(r.reason));
  if (g.status === 'rejected') warnings.push(`GHL calendar not refreshed (showing saved data): ${msg(g)}`);
  if (c.status === 'rejected') warnings.push(`Google Calendar not refreshed (showing saved data): ${msg(c)}`);
  if (!warnings.length) recent.set(key, Date.now());
  return warnings;
}
