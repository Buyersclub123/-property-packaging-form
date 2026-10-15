import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateCachedRecord } from '@/lib/dealSheetCache';
import { FIELD_BY_KEY, STATUS_OPTS, validateValues } from '@/lib/propertyFields/registry';
import type { Values } from '@/lib/propertyFields/registry';
import { toGhlProperties, fromGhlProperties } from '@/lib/propertyFields/ghlMap';

const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_OBJECT_ID = process.env.GHL_OBJECT_ID || '692d04e3662599ed0c29edfa';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';

const ghlHeaders = () => ({
  Authorization: `Bearer ${GHL_BEARER_TOKEN}`,
  Version: GHL_API_VERSION,
  'Content-Type': 'application/json',
});

/**
 * GET /api/deal-sheet/quick-record?copyFrom=<recordId>
 * Returns only registry fields from the source record (neverCopy fields blank; everything else dropped).
 */
export async function GET(request: NextRequest) {
  const copyFrom = request.nextUrl.searchParams.get('copyFrom');
  if (!copyFrom) return NextResponse.json({ success: false, error: 'copyFrom is required' }, { status: 400 });
  if (!GHL_BEARER_TOKEN || !GHL_LOCATION_ID) {
    return NextResponse.json({ success: false, error: 'GHL configuration missing (GHL_BEARER_TOKEN / GHL_LOCATION_ID)' }, { status: 500 });
  }
  try {
    const res = await fetch(`${GHL_BASE_URL}/objects/${GHL_OBJECT_ID}/records/${copyFrom}?locationId=${GHL_LOCATION_ID}&_t=${Date.now()}`, {
      headers: ghlHeaders(), cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ success: false, error: `GHL ${res.status}: ${text}` }, { status: res.status });
    }
    const data = await res.json();
    const record = data.record || data;
    const props: Record<string, unknown> = record.properties || {};
    const values = fromGhlProperties(props);
    const sourcerRaw = props.sourcer;
    return NextResponse.json({
      success: true,
      values,
      sourceAddress: String(props.property_address || ''),
      sourcer: typeof sourcerRaw === 'string' ? sourcerRaw : '',
      sourceIsProject: !!(String(props.project_identifier || '').trim() || String(props.project_parent_id || '').trim() || String(props.is_parent_record || '').toLowerCase() === 'yes'),
      sourceIsQuickRecord: (Array.isArray(props.quick_record) ? props.quick_record : [props.quick_record]).some((x) => String(x ?? '').toLowerCase() === 'yes'),
    });
  } catch (error) {
    console.error('[quick-record GET] error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to load source record' }, { status: 500 });
  }
}

const bodySchema = z.object({
  values: z.record(z.string(), z.string()),
  status: z.string(),
  sourcer: z.string().trim().min(1, 'Sourcer is required'),
  userEmail: z.string().email(),
});

/**
 * POST /api/deal-sheet/quick-record
 * Creates a quick Property Review record. Only registry fields are accepted; derived values are recomputed here.
 */
export async function POST(request: NextRequest) {
  if (!GHL_BEARER_TOKEN || !GHL_LOCATION_ID) {
    return NextResponse.json({ success: false, error: 'GHL configuration missing (GHL_BEARER_TOKEN / GHL_LOCATION_ID)' }, { status: 500 });
  }
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid request body', detail: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }

  const unknown = Object.keys(body.values).filter((k) => !FIELD_BY_KEY[k]);
  if (unknown.length) {
    return NextResponse.json({ success: false, error: `Unknown field(s): ${unknown.join(', ')}` }, { status: 400 });
  }
  if (!STATUS_OPTS.some((o) => o.value === body.status)) {
    return NextResponse.json({ success: false, error: `Invalid status: ${body.status}` }, { status: 400 });
  }

  const values: Values = { ...body.values, status: body.status };
  const fieldErrors = validateValues(values);
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json({ success: false, error: 'Validation failed', fieldErrors }, { status: 400 });
  }

  const { properties, propertyAddress } = toGhlProperties({ values, userEmail: body.userEmail, sourcer: body.sourcer });
  console.log('[quick-record POST] creating', propertyAddress, 'keys:', Object.keys(properties).join(','));

  try {
    const res = await fetch(`${GHL_BASE_URL}/objects/${GHL_OBJECT_ID}/records`, {
      method: 'POST',
      headers: ghlHeaders(),
      body: JSON.stringify({ locationId: GHL_LOCATION_ID, properties }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[quick-record POST] GHL error', res.status, text);
      return NextResponse.json({ success: false, error: `GHL API error ${res.status}: ${text}` }, { status: 502 });
    }
    const result = await res.json();
    const record = result.record || result;
    const recordId: string | undefined = record.id || result.id || result.recordId;
    if (!recordId) {
      return NextResponse.json({ success: false, error: 'GHL did not return a record id', raw: result }, { status: 502 });
    }

    // Read back so the response reflects what GHL actually stored (dropdown keys, checkbox shape).
    let stored: Record<string, unknown> = record.properties || {};
    try {
      const verify = await fetch(`${GHL_BASE_URL}/objects/${GHL_OBJECT_ID}/records/${recordId}?locationId=${GHL_LOCATION_ID}`, { headers: ghlHeaders(), cache: 'no-store' });
      if (verify.ok) {
        const vd = await verify.json();
        stored = (vd.record || vd).properties || stored;
      }
    } catch { /* non-fatal */ }

    const missing = Object.keys(properties).filter((k) => stored[k] === undefined || stored[k] === null || stored[k] === '');
    if (missing.length) console.warn('[quick-record POST] fields not echoed back by GHL:', missing.join(','));

    await updateCachedRecord(recordId);

    return NextResponse.json({ success: true, recordId, propertyAddress, missing, quickRecordStored: stored.quick_record ?? null });
  } catch (error) {
    console.error('[quick-record POST] error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to create record' }, { status: 500 });
  }
}
