import { NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghlFetch';
import { ghlUsers } from '@/lib/reviewOutcomes/sync';
import { loadJourneySalesLive } from '@/lib/journeyLiveSales';
import { meetingSourceOf, meetingSourceTitle, type Attribution } from '@/lib/reviewOutcomes/meetingSource';

// Always run at request time, never pre-render at build (data must be live)
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';
// Client sign-ups = GHL opportunities with "Date signed up" in the last 7 days (same source as the Stats Sold columns).
const DAY_MS = 86400000;

const headers = () => ({ Authorization: `Bearer ${GHL_API_TOKEN}`, Version: GHL_API_VERSION });
const sydDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);
const normName = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z]/g, '');
const normPhone = (s?: string | null) => (s || '').replace(/\D/g, '').replace(/^61/, '0');

type Contact = { id: string; firstName?: string; lastName?: string; firstNameLowerCase?: string; lastNameLowerCase?: string; contactName?: string; email?: string | null; phone?: string | null; dateAdded?: string; source?: string | null; assignedTo?: string | null; createdBy?: { source?: string; sourceId?: string }; attributionSource?: Attribution; lastAttributionSource?: Attribution };
const nameOf = (c: Contact) => normName(`${c.firstNameLowerCase || c.firstName || ''}${c.lastNameLowerCase || c.lastName || ''}`) || normName(c.contactName);
const label = (c: Contact) => [c.firstName, c.lastName].filter(Boolean).join(' ') || c.contactName || c.email || c.phone || c.id;

async function searchContacts(body: Record<string, unknown>): Promise<{ total: number; contacts: Contact[] }> {
  const res = await ghlFetch(`${GHL_BASE_URL}/contacts/search`, { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId: GHL_LOCATION_ID, ...body }), cache: 'no-store' }, 'journey-contacts');
  if (!res.ok) throw new Error(`GHL contacts search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  if (!Array.isArray(j.contacts)) throw new Error('GHL contacts search returned no contact list');
  return { total: Number(j.total), contacts: j.contacts };
}

/** Contacts created since `since` (newest first, paged until older). */
async function contactsSince(since: Date, until: Date): Promise<Contact[]> {
  const out = new Map<string, Contact>();
  for (let page = 1; page <= 50; page++) {
    const { contacts } = await searchContacts({ page, pageLimit: 100, sort: [{ field: 'dateAdded', direction: 'desc' }],
      filters: [{ field: 'dateAdded', operator: 'range', value: { gte: since.toISOString(), lte: until.toISOString() } }] });
    for (const contact of contacts) out.set(contact.id, contact);
    if (contacts.length < 100) return [...out.values()];
  }
  throw new Error('More than 5,000 contacts created in 7 days; refusing a partial count.');
}

/** Same duplicate criterion, using batched live searches rather than up to two
 * requests per new contact. No completed result is retained between loads. */
async function existingMatches(created: Contact[]): Promise<(Contact | null)[]> {
  const candidates = new Map<string, Contact>();
  const batches: { field: 'email' | 'phone'; values: string[] }[] = [];
  const normalize = (field: 'email' | 'phone', value?: string | null) =>
    field === 'email' ? (value || '').toLowerCase() : normPhone(value);
  for (const field of ['email', 'phone'] as const) {
    const values = [...new Set(created.map(c => c[field]).filter((v): v is string => !!v?.trim()))];
    for (let i = 0; i < values.length; i += 100) batches.push({ field, values: values.slice(i, i + 100) });
  }
  await mapLimit(batches, 2, async ({ field, values }) => {
    const requested = new Set(values.map(value => normalize(field, value)));
    for (let page = 1; page <= 1000; page++) {
      const { contacts } = await searchContacts({ page, pageLimit: 100, sort: [{ field: 'dateAdded', direction: 'asc' }],
        filters: [{ field, operator: 'eq', value: values }] });
      for (const contact of contacts) {
        if (!requested.has(normalize(field, contact[field]))) throw new Error(`GHL ignored the ${field} contact search filter`);
        candidates.set(contact.id, contact);
      }
      if (contacts.length < 100) return;
    }
    throw new Error('Contact matching exceeded its page limit; refusing partial duplicate results');
  });
  const ordered = [...candidates.values()].sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
  return created.map(contact => {
    const name = nameOf(contact);
    if (!name) return null;
    const older = ordered.filter(other => other.id !== contact.id && nameOf(other) === name && (other.dateAdded || '') < (contact.dateAdded || ''));
    return older.find(other => contact.email && other.email?.toLowerCase() === contact.email.toLowerCase())
      || older.find(other => contact.phone && normPhone(other.phone) === normPhone(contact.phone)) || null;
  });
}

async function mapLimit<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

async function build() {
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const liveUsers = await ghlUsers(true);
  const users = new Map(liveUsers.map(u => [u.id, u.name]));
  const [created, live] = await Promise.all([contactsSince(since7, now), loadJourneySalesLive(since7, now, liveUsers)]);
  const matches = await existingMatches(created);
  const who = (c: Contact) => users.get(c.createdBy?.sourceId || '') || users.get(c.assignedTo || '') || c.createdBy?.source || c.source || '';
  const duplicates = created.map((c, i) => ({ c, m: matches[i] })).filter((x) => x.m).map(({ c, m }) => ({
    id: c.id, created: c.dateAdded || '', date: sydDay(new Date(c.dateAdded || now)), newContact: label(c), existing: label(m!),
    existingCreated: m!.dateAdded ? sydDay(new Date(m!.dateAdded)) : '', createdBy: who(c),
    why: c.email && m!.email && c.email.toLowerCase() === m!.email.toLowerCase() ? 'name + email' : 'name + mobile',
  }));
  return {
    asAt: now.toISOString(),
    contacts: created.map((c) => {
      const ms = meetingSourceOf(c.lastAttributionSource, c.attributionSource, c.source || null);
      return { id: c.id, created: c.dateAdded || '', date: sydDay(new Date(c.dateAdded || now)), name: label(c), source: c.source || '', createdBy: who(c),
        meetingSource: ms?.label || '', meetingSourceTip: ms ? meetingSourceTitle(ms.level, ms.detail) : '' };
    }),
    meetings: live.meetings, opps: live.opps, duplicates,
  };
}

// Every request reloads the source data; no snapshot or last-good response.
export async function GET() {
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) throw new Error('Missing GHL configuration');
    const data = await build();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('JOURNEY SALES FAILED:', error);
    return NextResponse.json({ error: `Journey sales tiles failed: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
