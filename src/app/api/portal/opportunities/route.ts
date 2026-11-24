import { NextResponse } from 'next/server';
import { ghlFetch } from '@/lib/ghlFetch';
import { PIPELINE_ID } from '@/lib/ghlPipelines';
import { searchGhlOpportunities } from '@/lib/ghlOpportunitySearch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type Stage = { id: string; name: string };
type Opportunity = {
  id: string; name?: string; contactId?: string; pipelineId?: string; pipelineStageId?: string;
  status?: string; assignedTo?: string; followers?: string[];
  customFields?: { id: string; fieldValue?: unknown; fieldValueString?: string; value?: unknown }[];
};
const PRICE_BAND = /\$\s*[\d,.]+\s*[km]?\s*(?:[-–]\s*\$?\s*[\d,.]+\s*[km]?|\+)/i;
const text = (value: unknown): string => value == null ? '' : Array.isArray(value) ? value.map(text).join('\n') : String(value);
const field = (o: Opportunity, id: string) => {
  const f = o.customFields?.find(f => f.id === id);
  return text(f?.fieldValue ?? f?.fieldValueString ?? f?.value);
};

async function read(path: string, body?: Record<string, unknown>) {
  const response = await ghlFetch(`${process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com'}${path}`, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${process.env.GHL_BEARER_TOKEN || ''}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }, 'portal-opportunities');
  if (!response.ok) throw new Error(`Portal could not read GHL (${response.status})`);
  return response.json();
}

async function readStageCounts(stages: Stage[]) {
  // Independent server-side aggregation of ALL open pipeline records, not a
  // count of the downloaded list. limit: 1 does not limit stageAggregations.
  const data = await read('/opportunities/search', {
    locationId: process.env.GHL_LOCATION_ID || '', limit: 1,
    filters: [
      { field: 'pipeline_id', operator: 'eq', value: PIPELINE_ID.PROPERTY_TEAM },
      { field: 'status', operator: 'eq', value: 'open' },
    ],
  });
  if (!Number.isSafeInteger(data.total) || data.total < 0 || !Array.isArray(data.stageAggregations)) {
    throw new Error('GHL did not return valid stage counts');
  }
  const counts = new Map<string, number>();
  for (const bucket of data.stageAggregations) {
    if (!bucket || typeof bucket.pipelineStageId !== 'string' || !bucket.pipelineStageId ||
      !Number.isSafeInteger(bucket.totalCount) || bucket.totalCount < 0 || counts.has(bucket.pipelineStageId)) {
      throw new Error('GHL returned incomplete or duplicate stage counts');
    }
    counts.set(bucket.pipelineStageId, bucket.totalCount);
  }
  if ([...counts.values()].reduce((sum, count) => sum + count, 0) !== data.total) {
    throw new Error('GHL stage counts do not reconcile with its pipeline total');
  }
  const selected = stages.map(stage => {
    const count = counts.get(stage.id);
    if (count === undefined) throw new Error(`GHL did not return a count for ${stage.name}`);
    return { ...stage, count };
  });
  return {
    stages: selected,
    total: selected.reduce((sum, stage) => sum + stage.count, 0),
    checkedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const data = await read(`/opportunities/pipelines?locationId=${encodeURIComponent(process.env.GHL_LOCATION_ID || '')}`);
    if (!Array.isArray(data.pipelines)) throw new Error('GHL returned no pipeline list');
    const pipeline = data.pipelines.find((p: { id: string }) => p.id === PIPELINE_ID.PROPERTY_TEAM);
    if (!Array.isArray(pipeline?.stages)) throw new Error('Property Team pipeline stages could not be loaded');
    if (pipeline.stages.some((stage: Stage) => !stage || typeof stage.id !== 'string' || !stage.id || typeof stage.name !== 'string' || !stage.name.trim())) {
      throw new Error('GHL returned incomplete pipeline stages');
    }
    const stages = (pipeline.stages as Stage[]).filter(s => s.id && PRICE_BAND.test(s.name));
    if (!stages.length) throw new Error('No price-range stages found in the Property Team pipeline');
    const stageIds = stages.map(s => s.id);
    if (new Set(stageIds).size !== stageIds.length) throw new Error('GHL returned duplicate price-range stages');
    const opportunities = await searchGhlOpportunities<Opportunity>([
      { field: 'pipeline_id', operator: 'eq', value: PIPELINE_ID.PROPERTY_TEAM },
      { field: 'status', operator: 'eq', value: 'open' },
      { field: 'pipeline_stage_id', operator: 'eq', value: stageIds },
    ], 'portal-opportunities', { field: 'date_added', direction: 'desc' });

    // Preserve the portal's existing fields, reading each opportunity/contact directly.
    // A failed contact read fails the feed rather than silently losing a client.
    const rows: (Record<string, unknown> | null)[] = new Array(opportunities.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(4, opportunities.length) }, async () => {
      while (next < opportunities.length) {
        const index = next++, id = opportunities[index].id;
        const o = (await read(`/opportunities/${encodeURIComponent(id)}`)).opportunity as Opportunity | undefined;
        if (!o || o.id !== id) throw new Error(`GHL returned an incomplete opportunity: ${id}`);
        // Search indexing can lag a change. Recheck eligibility against the direct read.
        if (o.pipelineId !== PIPELINE_ID.PROPERTY_TEAM || o.status !== 'open' || !stageIds.includes(o.pipelineStageId || '')) {
          rows[index] = null;
          continue;
        }
        if (!o.contactId) throw new Error(`Opportunity has no primary contact: ${o.name || id}`);
        const { contact } = await read(`/contacts/${encodeURIComponent(o.contactId)}`);
        if (!contact || contact.id !== o.contactId) throw new Error(`Primary contact could not be read: ${o.name || id}`);
        rows[index] = {
          id: o.id, name: o.name || '', stage: o.pipelineStageId,
          client: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
          emails: [text(contact.email), field(o, 'd0iUirsqy4kdUVMpHLfD')].filter(Boolean).join('\n'),
          partner: field(o, 'xFKbtz7Lt1X2nNTeFSSH'),
          follower: text(o.followers), assignedTo: o.assignedTo || '',
          assignedBA: field(o, 'NXqFwEzo28k6lOkbyT5N'), status: o.status,
        };
      }
    }));
    const counts = await readStageCounts(stages);
    return NextResponse.json({ opportunities: rows.filter(row => row !== null), counts }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Portal opportunity load failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, {
      status: 502, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
