import { NextResponse } from 'next/server';
import { PIPELINE_ID, PIPELINE_NAMES } from '@/lib/ghlPipelines';
import { ghlFetch } from '@/lib/ghlFetch';

// Always run at request time, never pre-render at build (data must be live)
export const dynamic = 'force-dynamic';

const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';

// READ-ONLY. GHL's own opportunity count per pipeline stage (the GHL pipeline column), for the Journey reconciliation.
// Open Property Team opportunities, fetched independently on every request.
export async function GET() {
  const headers = { Authorization: `Bearer ${GHL_API_TOKEN}`, Version: GHL_API_VERSION };
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) throw new Error('Missing GHL configuration');
    const res = await ghlFetch(`${GHL_BASE_URL}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`, { headers, cache: 'no-store' }, 'journey-pipelines');
    if (!res.ok) throw new Error(`GHL pipelines ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const wanted = (data.pipelines || []).filter((p: { id: string }) => p.id === PIPELINE_ID.PROPERTY_TEAM);
    if (wanted.length !== 1) throw new Error('Property Team pipeline is missing from GHL');
    const pipelines = [];
    for (const p of wanted as { id: string; name: string; stages?: { id: string; name: string }[] }[]) {
      const stages = await Promise.all((p.stages || []).map(async (s) => {
        const url = new URL(`${GHL_BASE_URL}/opportunities/search`);
        url.searchParams.set('location_id', GHL_LOCATION_ID);
        url.searchParams.set('pipeline_id', p.id);
        url.searchParams.set('pipeline_stage_id', s.id);
        url.searchParams.set('status', 'open');
        url.searchParams.set('limit', '1');
        const r = await ghlFetch(url.toString(), { headers, cache: 'no-store' }, 'journey-stage-count');
        if (!r.ok) throw new Error(`GHL stage count ${p.name} / ${s.name}: ${r.status}`);
        const j = await r.json();
        const total = Number(j.meta?.total);
        if (!Number.isFinite(total) || total < 0) throw new Error(`GHL returned no valid count for ${s.name}`);
        return { id: s.id, name: (s.name || '').trim(), total };
      }));
      pipelines.push({ id: p.id, name: PIPELINE_NAMES[p.id] || p.name, stages });
    }
    const payload = { fetchedAt: new Date().toISOString(), status: 'open', pipelines };
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('JOURNEY RECONCILE FAILED:', error);
    return NextResponse.json({ error: `Journey reconciliation failed: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
}
