import { getDb } from '@/lib/db';
import { ghlFetch } from '@/lib/ghlFetch';
import { getRedisClient } from '@/lib/redis';
import { ensureReviewTables } from './store';
import { customValue } from './sync';
import { MIN_YMD, NEW_LEAD_CALENDAR_ID, sydYmd, type ReviewViewer } from './types';
import { NO_MEETING_SOURCE } from './meetingSource';

// Read-only: client sign-ups from GHL. GHL keeps one opportunity per client and moves it across pipelines, so a
// sign-up = an opportunity in a post-sale pipeline with "Date signed up" set. Lead source = the contact's Lead Source.

export interface Signup { oppId: string; name: string; contactId: string; client: string; signed: string; assignedTo: string; leadSource: string | null; referrer: string | null; meetingSource: string | null }
export interface SignupsData { at: string; signups: Signup[] }

const POST_SALE = /SALE ADMIN|PROPERTY TEAM|FINANCE|CONSTRUCTION|SMSF SETUP|PORTFOLIO REVIEW|ACTIVE CLIENTS/i;
const CACHE_KEY = 'review:signups:v3';
const CACHE_SEC = 15 * 60;
const MAX_CONTACT_FETCH = 400;

function env() {
  const token = process.env.GHL_BEARER_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) throw new Error('GHL_BEARER_TOKEN / GHL_LOCATION_ID not set');
  return { token, locationId, base: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com' };
}

async function get<T>(path: string): Promise<T | null> {
  const { token, base } = env();
  const res = await ghlFetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) }, 'review-signups');
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`GHL ${path.split('?')[0]} returned HTTP ${res.status}`);
  return (await res.json()) as T;
}

type Field = { id: string; fieldKey?: string };
type OppField = { id: string; fieldValueDate?: unknown; fieldValue?: unknown; value?: unknown };
type Opp = { id: string; name?: string; contactId?: string; assignedTo?: string; contact?: { id?: string; name?: string }; customFields?: OppField[] };

const dateOf = (f: OppField | undefined): string => {
  const v = f ? String(f.fieldValueDate ?? f.fieldValue ?? f.value ?? '') : '';
  if (!v) return '';
  const iso = /^\d+$/.test(v) ? new Date(Number(v)).toISOString() : v;
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : '';
};

async function build(): Promise<SignupsData> {
  const { locationId } = env();
  const oppFields = (await get<{ customFields?: Field[] }>(`/locations/${locationId}/customFields?model=opportunity`))?.customFields || [];
  const signedId = oppFields.find((f) => f.fieldKey === 'opportunity.date_signed_up')?.id;
  if (!signedId) throw new Error('GHL opportunity field "Date signed up" not found');
  const pipelines = (await get<{ pipelines?: { id: string; name: string }[] }>(`/opportunities/pipelines?locationId=${locationId}`))?.pipelines || [];
  const byKey = new Map<string, Signup>();
  for (const p of pipelines.filter((x) => POST_SALE.test(x.name))) {
    let after = '', afterId = '';
    for (let page = 0; page < 300; page++) {
      const q = new URLSearchParams({ location_id: locationId, pipeline_id: p.id, limit: '100' });
      if (afterId) { q.set('startAfterId', afterId); q.set('startAfter', after); }
      const j = await get<{ opportunities?: Opp[]; meta?: { startAfterId?: string; startAfter?: number | string } }>(`/opportunities/search?${q}`);
      const list = j?.opportunities || [];
      for (const o of list) {
        const signed = dateOf(o.customFields?.find((f) => f.id === signedId));
        const contactId = o.contactId || o.contact?.id || '';
        if (!signed || signed < MIN_YMD) continue;
        // One client signing several opps (IP1 / IP2) on the same day is one sign-up.
        const key = `${contactId || o.id}|${signed}`;
        if (!byKey.has(key)) byKey.set(key, { oppId: o.id, name: o.name || '', contactId, client: o.contact?.name || o.name || '', signed, assignedTo: o.assignedTo || '', leadSource: null, referrer: null, meetingSource: null });
      }
      if (list.length < 100 || !j?.meta?.startAfterId) break;
      afterId = j.meta.startAfterId;
      after = String(j.meta.startAfter ?? '');
    }
  }
  const signups = [...byKey.values()].sort((a, b) => a.signed.localeCompare(b.signed));

  // Contact Lead Source: from the tool's contact cache; contacts not cached yet are read from GHL and cached.
  await ensureReviewTables();
  const sql = getDb();
  // Newest first, so the capped GHL reads fill recent periods first.
  const ids = [...new Set([...signups].reverse().map((s) => s.contactId).filter(Boolean))];
  const cached = ids.length
    ? await sql`SELECT contact_id, lead_source, referrer FROM review_contacts WHERE source_fetched_at IS NOT NULL
        AND contact_id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))`
    : [];
  const src = new Map(cached.map((r) => [String(r.contact_id), { lead: (r.lead_source as string | null) || null, ref: (r.referrer as string | null) || null }]));
  const missing = ids.filter((id) => !src.has(id)).slice(0, MAX_CONTACT_FETCH);
  if (missing.length) {
    const cf = (await get<{ customFields?: Field[] }>(`/locations/${locationId}/customFields?model=contact`))?.customFields || [];
    const leadId = cf.find((f) => f.fieldKey === 'contact.lead_source')?.id;
    const refId = cf.find((f) => f.fieldKey === 'contact.referrer')?.id;
    const fetched: { id: string; name: string; lead_source: string | null; referrer: string | null }[] = [];
    let i = 0;
    await Promise.all(Array.from({ length: 5 }, async () => {
      while (i < missing.length) {
        const id = missing[i++];
        type C = { contactName?: string; firstName?: string; lastName?: string; customFields?: { id: string; value?: unknown }[] };
        const c = await get<{ contact?: C }>(`/contacts/${id}`).then((r) => r?.contact, () => undefined);
        if (!c) continue;
        fetched.push({ id, name: c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' '), lead_source: customValue(c.customFields, leadId), referrer: customValue(c.customFields, refId) });
      }
    }));
    for (const f of fetched) src.set(f.id, { lead: f.lead_source, ref: f.referrer });
    if (leadId && fetched.length) {
      await sql`INSERT INTO review_contacts (contact_id, name, lead_source, referrer, source_fetched_at)
        SELECT r.id, r.name, r.lead_source, r.referrer, NOW() FROM jsonb_to_recordset(${JSON.stringify(fetched)}::jsonb)
          AS r(id text, name text, lead_source text, referrer text)
        ON CONFLICT (contact_id) DO UPDATE SET lead_source = EXCLUDED.lead_source, referrer = EXCLUDED.referrer, source_fetched_at = NOW()`;
    }
  }
  // Meeting source = that of the client's last Presentation Meeting One on or before signing.
  const met = ids.length
    ? await sql`SELECT contact_id, start_at, meeting_source FROM review_meetings
        WHERE NOT deleted AND calendar_id = ${NEW_LEAD_CALENDAR_ID}
          AND contact_id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb)) ORDER BY start_at`
    : [];
  const meetings = new Map<string, { ymd: string; src: string | null }[]>();
  for (const r of met) {
    const k = String(r.contact_id);
    meetings.set(k, [...(meetings.get(k) || []), { ymd: sydYmd(r.start_at as string), src: (r.meeting_source as string | null) || null }]);
  }
  for (const s of signups) {
    const x = src.get(s.contactId);
    s.leadSource = x?.lead ?? null;
    s.referrer = x?.ref ?? null;
    const before = (meetings.get(s.contactId) || []).filter((m) => m.ymd <= s.signed);
    s.meetingSource = before.length ? before[before.length - 1].src : NO_MEETING_SOURCE;
  }
  return { at: new Date().toISOString(), signups };
}

/** All sign-ups since MIN_YMD (no viewer filter): Stats via loadSignups, and the Journey sign-up tile. */
export async function loadAllSignups(force = false): Promise<SignupsData> {
  let redis: Awaited<ReturnType<typeof getRedisClient>> | null = null;
  try { redis = await getRedisClient(); } catch { redis = null; }
  let data: SignupsData | null = null;
  if (redis && !force) {
    const hit = await redis.get(CACHE_KEY);
    if (hit) data = JSON.parse(hit) as SignupsData;
  }
  if (!data) {
    data = await build();
    if (redis) await redis.set(CACHE_KEY, JSON.stringify(data), { EX: CACHE_SEC });
  }
  return data;
}

export async function loadSignups(viewer: ReviewViewer, force = false): Promise<SignupsData> {
  const data = await loadAllSignups(force);
  return viewer.recorder ? data : { ...data, signups: data.signups.filter((s) => viewer.consultantIds.includes(s.assignedTo)) };
}
