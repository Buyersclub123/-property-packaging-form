import { ghlFetch } from '@/lib/ghlFetch';
import { ghlUsers } from './sync';

// Read-only: every open GHL opportunity, grouped by contact, for the Stats exception reports (JT 11/11).

export interface OpenOpp { id: string; name: string; pipeline: string; stage: string; ownerId: string; owner: string }
export interface OpenOppsData { at: string; byContact: Record<string, OpenOpp[]> }

const CACHE_MS = 10 * 60e3;
let cache: OpenOppsData | null = null;

function env() {
  const token = process.env.GHL_BEARER_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) throw new Error('GHL_BEARER_TOKEN / GHL_LOCATION_ID not set');
  return { token, locationId, base: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com' };
}

async function get<T>(path: string): Promise<T> {
  const { token, base } = env();
  const res = await ghlFetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) }, 'review-open-opps');
  if (!res.ok) throw new Error(`GHL ${path.split('?')[0]} returned HTTP ${res.status}`);
  return (await res.json()) as T;
}

type Opp = { id: string; name?: string; contactId?: string; contact?: { id?: string }; assignedTo?: string; pipelineId?: string; pipelineStageId?: string };
type Pipeline = { id: string; name: string; stages?: { id: string; name: string }[] };

type Names = { at: number; pipe: Map<string, string>; stage: Map<string, string>; user: Map<string, string> };
let names: Names | null = null;
async function nameMaps(): Promise<Names> {
  if (names && Date.now() - names.at < CACHE_MS) return names;
  const { locationId } = env();
  const pipelines = (await get<{ pipelines?: Pipeline[] }>(`/opportunities/pipelines?locationId=${locationId}`)).pipelines || [];
  names = {
    at: Date.now(),
    pipe: new Map(pipelines.map((p) => [p.id, p.name])),
    stage: new Map(pipelines.flatMap((p) => (p.stages || []).map((s) => [s.id, s.name] as const))),
    user: new Map((await ghlUsers()).map((u) => [u.id, u.name])),
  };
  return names;
}
const toOpen = (o: Opp, n: Names): OpenOpp => {
  const ownerId = o.assignedTo || '';
  return { id: o.id, name: o.name || '', pipeline: n.pipe.get(o.pipelineId || '') || '', stage: n.stage.get(o.pipelineStageId || '') || '', ownerId, owner: ownerId ? n.user.get(ownerId) || ownerId : '' };
};

const byContactCache = new Map<string, { at: number; opps: OpenOpp[] }>();
/** Open opps for just these contacts (one GHL search per contact, 5 at a time, cached 10 min). Stats exceptions read
 *  the selected period's contacts in small batches so the page can show progress (JT 12/11). */
export async function loadOpenOppsFor(contactIds: string[]): Promise<OpenOppsData> {
  const { locationId } = env();
  const n = await nameMaps();
  const byContact: Record<string, OpenOpp[]> = {};
  const todo = [...new Set(contactIds.filter(Boolean))];
  let i = 0;
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (i < todo.length) {
      const id = todo[i++];
      const hit = byContactCache.get(id);
      if (hit && Date.now() - hit.at < CACHE_MS) { byContact[id] = hit.opps; continue; }
      const q = new URLSearchParams({ location_id: locationId, contact_id: id, status: 'open', limit: '100' });
      const j = await get<{ opportunities?: Opp[] }>(`/opportunities/search?${q}`);
      const opps = (j.opportunities || []).filter((o) => (o.contactId || o.contact?.id) === id).map((o) => toOpen(o, n));
      byContactCache.set(id, { at: Date.now(), opps });
      byContact[id] = opps;
    }
  }));
  return { at: new Date().toISOString(), byContact };
}

export async function loadOpenOpps(force = false): Promise<OpenOppsData> {
  if (!force && cache && Date.now() - Date.parse(cache.at) < CACHE_MS) return cache;
  const { locationId } = env();
  const n = await nameMaps();
  const byContact: Record<string, OpenOpp[]> = {};
  let after = '', afterId = '';
  for (let page = 0; page < 500; page++) {
    const q = new URLSearchParams({ location_id: locationId, status: 'open', limit: '100' });
    if (afterId) { q.set('startAfterId', afterId); q.set('startAfter', after); }
    const j = await get<{ opportunities?: Opp[]; meta?: { startAfterId?: string; startAfter?: number | string } }>(`/opportunities/search?${q}`);
    const list = j.opportunities || [];
    for (const o of list) {
      const contactId = o.contactId || o.contact?.id || '';
      if (!contactId) continue;
      (byContact[contactId] ||= []).push(toOpen(o, n));
    }
    if (list.length < 100 || !j.meta?.startAfterId) break;
    afterId = j.meta.startAfterId;
    after = String(j.meta.startAfter ?? '');
  }
  cache = { at: new Date().toISOString(), byContact };
  return cache;
}
