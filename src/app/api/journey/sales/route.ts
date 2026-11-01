import { NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghlFetch';
import { getRedisClient } from '@/lib/redis';
import { ghlUsers } from '@/lib/reviewOutcomes/sync';
import { loadMeetings } from '@/lib/reviewOutcomes/load';
import { loadSettings } from '@/lib/reviewOutcomes/store';
import { addDays, sydYmd } from '@/lib/reviewOutcomes/types';

// Always run at request time, never pre-render at build (data must be live)
export const dynamic = 'force-dynamic';

const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';
// "New opportunities" = opps created in these pipelines.
const SALES_PIPELINES = ['9TzDdGVTuDbyLCOQgoVY', 'YxZ4JWUVQoR3UtQMbBJb']; // 02. SALES TEAM Pipeline, *Active Clients
const CACHE_KEY = 'journey:sales:v4';
const CACHE_SEC = 15 * 60;
const DAY_MS = 86400000;

const headers = () => ({ Authorization: `Bearer ${GHL_API_TOKEN}`, Version: GHL_API_VERSION });
const sydDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);
const normName = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z]/g, '');
const normPhone = (s?: string | null) => (s || '').replace(/\D/g, '').replace(/^61/, '0');

type Contact = { id: string; firstName?: string; lastName?: string; firstNameLowerCase?: string; lastNameLowerCase?: string; contactName?: string; email?: string | null; phone?: string | null; dateAdded?: string; source?: string | null; assignedTo?: string | null; createdBy?: { source?: string; sourceId?: string } };
const nameOf = (c: Contact) => normName(`${c.firstNameLowerCase || c.firstName || ''}${c.lastNameLowerCase || c.lastName || ''}`) || normName(c.contactName);
const label = (c: Contact) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.contactName || c.email || c.phone || c.id;

async function searchContacts(body: Record<string, unknown>): Promise<{ total: number; contacts: Contact[] }> {
  const res = await ghlFetch(`${GHL_BASE_URL}/contacts/search`, { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId: GHL_LOCATION_ID, ...body }), cache: 'no-store' }, 'journey-contacts');
  if (!res.ok) throw new Error(`GHL contacts search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return { total: Number(j.total ?? 0), contacts: j.contacts || [] };
}

/** Contacts created since `since` (newest first, paged until older). */
async function contactsSince(since: Date): Promise<Contact[]> {
  const out: Contact[] = [];
  for (let page = 1; page <= 50; page++) {
    const { contacts } = await searchContacts({ page, pageLimit: 100, sort: [{ field: 'dateAdded', direction: 'desc' }],
      filters: [{ field: 'dateAdded', operator: 'range', value: { gte: since.toISOString(), lte: new Date().toISOString() } }] });
    out.push(...contacts);
    if (contacts.length < 100) return out;
  }
  throw new Error('More than 5,000 contacts created in 7 days; refusing a partial count.');
}

/** An older contact with the same name AND (same email OR same mobile). */
async function existingMatch(c: Contact): Promise<Contact | null> {
  const name = nameOf(c);
  if (!name || (!c.email && !c.phone)) return null;
  const tries: Record<string, unknown>[] = [];
  if (c.email) tries.push({ field: 'email', operator: 'eq', value: c.email });
  if (c.phone) tries.push({ field: 'phone', operator: 'eq', value: c.phone });
  for (const f of tries) {
    const { contacts } = await searchContacts({ pageLimit: 20, filters: [f] });
    const hit = contacts.find((x) => x.id !== c.id && nameOf(x) === name && (x.dateAdded || '') < (c.dateAdded || '')
      && ((c.email && x.email && x.email.toLowerCase() === c.email.toLowerCase()) || (c.phone && normPhone(x.phone) === normPhone(c.phone))));
    if (hit) return hit;
  }
  return null;
}

async function mapLimit<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

/** Sales opps created since `since` (GHL returns newest first, so stop at the first older page). */
async function salesOpps(since: Date, users: Map<string, string>) {
  const out: { id: string; created: string; name: string; client: string; consultant: string }[] = [];
  for (const pipelineId of SALES_PIPELINES) {
    let startAfter: string | undefined, startAfterId: string | undefined;
    for (let page = 1; page <= 50; page++) {
      const url = new URL(`${GHL_BASE_URL}/opportunities/search`);
      url.searchParams.set('location_id', GHL_LOCATION_ID);
      url.searchParams.set('pipeline_id', pipelineId);
      url.searchParams.set('status', 'all');
      url.searchParams.set('limit', '100');
      if (startAfter && startAfterId) { url.searchParams.set('startAfter', startAfter); url.searchParams.set('startAfterId', startAfterId); }
      const res = await ghlFetch(url.toString(), { headers: headers(), cache: 'no-store' }, 'journey-sales-opps');
      if (!res.ok) throw new Error(`GHL opportunities ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const j = await res.json();
      const opps = (j.opportunities || []) as { id: string; name?: string; createdAt?: string; assignedTo?: string; contact?: { name?: string } }[];
      let older = false;
      for (const o of opps) {
        if (!o.createdAt || new Date(o.createdAt) < since) { older = true; continue; }
        out.push({ id: o.id, created: sydDay(new Date(o.createdAt)), name: o.name || '', client: o.contact?.name || '', consultant: users.get(o.assignedTo || '') || '' });
      }
      if (older || opps.length < 100 || !j.meta?.startAfterId) break;
      startAfter = String(j.meta.startAfter); startAfterId = j.meta.startAfterId;
    }
  }
  return out;
}

function outcomeOf(tool: string | null, ghl: string | null): string {
  const v = (tool || ghl || '').toLowerCase().replace(/[^a-z]/g, '');
  if (v === 'showed' || v === 'show' || v === 'sat') return 'Showed';
  if (v === 'noshow' || v === 'notsat') return 'No-show';
  if (v.startsWith('cancel')) return 'Cancelled';
  return '';
}

async function build() {
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const users = new Map((await ghlUsers()).map((u) => [u.id, u.name]));
  // Meetings exactly as the Review Outcomes tool loads them: Presentation Meeting One + Portfolio Review (GHL),
  // plus Google Calendar 'Portfolio Review' events with no GHL appointment.
  const today = sydYmd(now);
  const loadAll = async () => {
    const settings = await loadSettings();
    return loadMeetings({ email: 'journey', recorder: true, consultantIds: [] }, addDays(today, -7), today, settings.callCentre, settings.salesAliases);
  };
  const [created, loaded, opps] = await Promise.all([contactsSince(since7), loadAll(), salesOpps(since7, users)]);
  const matches = await mapLimit(created, 8, existingMatch);
  const who = (c: Contact) => users.get(c.createdBy?.sourceId || '') || users.get(c.assignedTo || '') || c.createdBy?.source || c.source || '';
  const duplicates = created.map((c, i) => ({ c, m: matches[i] })).filter((x) => x.m).map(({ c, m }) => ({
    id: c.id, created: c.dateAdded || '', date: sydDay(new Date(c.dateAdded || now)), newContact: label(c), existing: label(m!),
    existingCreated: m!.dateAdded ? sydDay(new Date(m!.dateAdded)) : '', createdBy: who(c),
    why: c.email && m!.email && c.email.toLowerCase() === m!.email.toLowerCase() ? 'name + email' : 'name + mobile',
  }));
  const inWindow = (iso: string) => { const t = Date.parse(iso); return t >= since7.getTime() && t <= now.getTime(); };
  const meetings = [
    ...loaded.meetings.filter((m) => inWindow(m.start)).map((m) => ({
      id: m.id, at: m.start, date: m.ymd, client: m.contactName, calendar: m.calendar, consultant: m.consultant,
      outcome: outcomeOf(m.outcome, null),
    })),
    ...loaded.gcalUnmatched.filter((e) => !e.allDay && inWindow(e.start)).map((e) => ({
      id: e.id, at: e.start, date: e.ymd, client: e.title, calendar: 'Portfolio Review (Google Calendar only)', consultant: e.staff, outcome: '',
    })),
  ];
  return {
    asAt: now.toISOString(),
    contacts: created.map((c) => ({ id: c.id, created: c.dateAdded || '', date: sydDay(new Date(c.dateAdded || now)), name: label(c), source: c.source || '', createdBy: who(c) })),
    meetings, opps, duplicates,
  };
}

// READ-ONLY quick snapshot for /journey Sales + Duplicate contacts tiles: last 7 days only, cached 15 minutes.
export async function GET(request: Request) {
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) throw new Error('Missing GHL configuration');
    const fresh = new URL(request.url).searchParams.get('fresh') === '1';
    let redis: Awaited<ReturnType<typeof getRedisClient>> | null = null;
    try { redis = await getRedisClient(); } catch { redis = null; }
    if (redis && !fresh) {
      const hit = await redis.get(CACHE_KEY);
      if (hit) return NextResponse.json(JSON.parse(hit));
    }
    const data = await build();
    if (redis) await redis.set(CACHE_KEY, JSON.stringify(data), { EX: CACHE_SEC });
    return NextResponse.json(data);
  } catch (error) {
    console.error('JOURNEY SALES FAILED:', error);
    return NextResponse.json({ error: `Journey sales tiles failed: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
