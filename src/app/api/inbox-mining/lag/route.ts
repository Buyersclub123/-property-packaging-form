import { NextResponse } from 'next/server';
import { checkLag, lagSummary, setMeasurementStart } from '@/lib/inboxMining/lag';
import { getCfEmail } from '@/lib/cloudflareAuth';

// GET: lag table by received day. POST: read GHL now and stamp actioned_at ("Check GHL now" and the 2 am scheduled task).
// PUT: set or clear the measurement start. GHL is only read; nothing is written to GHL.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const days = parseInt(new URL(request.url).searchParams.get('days') || '30', 10);
  if (!Number.isInteger(days) || days < 1 || days > 180) {
    return NextResponse.json({ error: `days must be 1-180 (got ${days})` }, { status: 400 });
  }
  try {
    return NextResponse.json(await lagSummary(days));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: { measurementStart?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const raw = body.measurementStart;
  if (raw !== null && (typeof raw !== 'string' || Number.isNaN(new Date(raw).getTime()))) {
    return NextResponse.json({ error: 'measurementStart must be an ISO date/time or null' }, { status: 400 });
  }
  try {
    const value = raw === null ? null : new Date(raw as string).toISOString();
    await setMeasurementStart(value, getCfEmail(request) || 'JT (local dev)');
    return NextResponse.json({ measurementStart: value });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await checkLag();
    console.log('[inbox-mining] lag check', JSON.stringify(result));
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[inbox-mining] lag check failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
