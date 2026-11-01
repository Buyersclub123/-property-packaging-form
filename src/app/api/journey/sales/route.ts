import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ghlFetch } from '@/lib/ghlFetch';
import { ghlUsers } from '@/lib/reviewOutcomes/sync';

// Always run at request time, never pre-render at build (data must be live)
export const dynamic = 'force-dynamic';

const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';
// "New opportunities" = opps created in these pipelines.
const SALES_PIPELINES = ['9TzDdGVTuDbyLCOQgoVY', 'YxZ4JWUVQoR3UtQMbBJb']; // 02. SALES TEAM Pipeline, *Active Clients
const MAX_PAGES = 300;

const headers = () => ({ Authorization: `Bearer ${GHL_API_TOKEN}`, Version: GHL_API_VERSION });
const sydDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(d);
function sydMidnight(day: string): string {
  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'Australia/Sydney', timeZoneName: 'longOffset' })
    .formatToParts(new Date(`${day}T12:00:00Z`)).find((p) => p.type === 'timeZoneName')?.value.replace('GMT', '') || '+10:00';
  return `${day}T00:00:00${off}`;
}
function addDays(day: string, n: number) { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

async function contactsSince(day: string | null): Promise<number> {
  const body: Record<string, unknown> = { locationId: GHL_LOCATION_ID, pageLimit: 1 };
  if (day) body.filters = [{ field: 'dateAdded', operator: 'range', value: { gte: sydMidnight(day), lte: new Date().toISOString() } }];
  const res = await ghlFetch(`${GHL_BASE_URL}/contacts/search`, { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' }, 'journey-contacts');
  if (!res.ok) throw new Error(`GHL contacts search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return Number(j.total ?? j.meta?.total ?? 0);
}

async function salesOpps(users: Map<string, string>) {
  const out: { id: string; created: string; name: string; client: string; consultant: string; pipelineId: string }[] = [];
  for (const pipelineId of SALES_PIPELINES) {
    let startAfter: string | undefined, startAfterId: string | undefined;
    for (let page = 1; ; page++) {
      if (page > MAX_PAGES) throw new Error(`Sales opportunities passed ${MAX_PAGES} pages; refusing a partial count.`);
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
      for (const o of opps) out.push({ id: o.id, created: o.createdAt ? sydDay(new Date(o.createdAt)) : '', name: o.name || '', client: o.contact?.name || '', consultant: users.get(o.assignedTo || '') || '', pipelineId });
      if (opps.length < 100 || !j.meta?.startAfterId) break;
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

// READ-ONLY. Sales tiles for /journey: GHL contacts created, Review Outcomes meetings and their outcomes, new Sales opps.
export async function GET() {
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) throw new Error('Missing GHL configuration');
    const today = sydDay(new Date());
    const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
    const [y, m] = today.split('-').map(Number);
    const fy = `${m >= 7 ? y : y - 1}-07-01`;
    const users = new Map((await ghlUsers()).map((u) => [u.id, u.name]));
    const sql = getDb();
    const [cToday, cWeek, cMonth, cYtd, cAll, rows, opps] = await Promise.all([
      contactsSince(today), contactsSince(addDays(today, -dow)), contactsSince(`${today.slice(0, 7)}-01`), contactsSince(fy), contactsSince(null),
      sql`SELECT m.appointment_id, m.calendar_name, m.assigned_user_id, m.start_at, m.ghl_status, c.name, o.outcome
          FROM review_meetings m LEFT JOIN review_contacts c ON c.contact_id = m.contact_id
          LEFT JOIN review_outcomes o ON o.appointment_id = m.appointment_id WHERE NOT m.deleted`,
      salesOpps(users),
    ]);
    const now = Date.now();
    const meetings = (rows as Record<string, unknown>[]).map((r) => {
      const start = new Date(r.start_at as string);
      return {
        id: String(r.appointment_id), date: sydDay(start), client: String(r.name || ''), calendar: String(r.calendar_name || ''),
        consultant: users.get(String(r.assigned_user_id || '')) || '',
        outcome: start.getTime() < now ? outcomeOf(r.outcome as string | null, r.ghl_status as string | null) : '',
      };
    });
    return NextResponse.json({ today, contacts: { today: cToday, week: cWeek, month: cMonth, ytd: cYtd, ever: cAll }, meetings, opps });
  } catch (error) {
    console.error('JOURNEY SALES FAILED:', error);
    return NextResponse.json({ error: `Journey sales tiles failed: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
