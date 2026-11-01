import { NextResponse } from 'next/server';
import { REPORTING_PIPELINE_IDS, PIPELINE_NAMES } from '@/lib/ghlPipelines';
import { ghlFetch } from '@/lib/ghlFetch';
import { getRedisClient } from '@/lib/redis';

const CACHE_SEC = 5 * 60;
const LAST_SEC = 24 * 60 * 60; // last good copy for ?snapshot=1 (page refreshes it in the background)

// Always run at request time, never pre-render at build (data must be live)
export const dynamic = 'force-dynamic';

const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';

// READ-ONLY. GHL's own opportunity count per pipeline stage (the GHL pipeline column), for the Journey reconciliation.
// Default = open opportunities; ?historical=1 = every status.
export async function GET(request: Request) {
  const historical = new URL(request.url).searchParams.get('historical') === '1';
  const headers = { Authorization: `Bearer ${GHL_API_TOKEN}`, Version: GHL_API_VERSION };
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) throw new Error('Missing GHL configuration');
    // Stage counts cached 5 minutes so the snapshot opens fast.
    const cacheKey = `journey:reconcile:${historical ? 'all' : 'open'}`;
    let redis: Awaited<ReturnType<typeof getRedisClient>> | null = null;
    try { redis = await getRedisClient(); } catch { redis = null; }
    const snapshot = new URL(request.url).searchParams.get('snapshot') === '1';
    const hit = redis ? (await redis.get(cacheKey)) || (snapshot ? await redis.get(`${cacheKey}:last`) : null) : null;
    if (hit) return NextResponse.json(JSON.parse(hit));
    const res = await ghlFetch(`${GHL_BASE_URL}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`, { headers, cache: 'no-store' }, 'journey-pipelines');
    if (!res.ok) throw new Error(`GHL pipelines ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const wanted = (data.pipelines || []).filter((p: { id: string }) => REPORTING_PIPELINE_IDS.includes(p.id));
    const pipelines = [];
    for (const p of wanted as { id: string; name: string; stages?: { id: string; name: string }[] }[]) {
      const stages = await Promise.all((p.stages || []).map(async (s) => {
        const url = new URL(`${GHL_BASE_URL}/opportunities/search`);
        url.searchParams.set('location_id', GHL_LOCATION_ID);
        url.searchParams.set('pipeline_id', p.id);
        url.searchParams.set('pipeline_stage_id', s.id);
        url.searchParams.set('status', historical ? 'all' : 'open');
        url.searchParams.set('limit', '1');
        const r = await ghlFetch(url.toString(), { headers, cache: 'no-store' }, 'journey-stage-count');
        if (!r.ok) throw new Error(`GHL stage count ${p.name} / ${s.name}: ${r.status}`);
        const j = await r.json();
        return { id: s.id, name: (s.name || '').trim(), total: Number(j.meta?.total ?? 0) };
      }));
      pipelines.push({ id: p.id, name: PIPELINE_NAMES[p.id] || p.name, stages });
    }
    const payload = { fetchedAt: new Date().toISOString(), status: historical ? 'all' : 'open', pipelines };
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(payload), { EX: CACHE_SEC });
      await redis.set(`${cacheKey}:last`, JSON.stringify(payload), { EX: LAST_SEC });
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error('JOURNEY RECONCILE FAILED:', error);
    return NextResponse.json({ error: `Journey reconciliation failed: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
