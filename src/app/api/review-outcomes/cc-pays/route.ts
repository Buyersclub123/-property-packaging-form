import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { automatedTab, buildCcPays, ccPaysTabExists, writeCcPays } from '@/lib/reviewOutcomes/ccPays';
import { weekStart } from '@/lib/reviewOutcomes/stats';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const YMD = /^\d{4}-\d{2}-\d{2}$/;

// GET ?week=YYYY-MM-DD: preview of the CC PAYS tab for that Fri-Thu week (no write).
export async function GET(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  const week = request.nextUrl.searchParams.get('week') || '';
  if (!YMD.test(week)) return json({ error: 'week must be YYYY-MM-DD' }, 400);
  try {
    const ws = weekStart(week);
    const tab = automatedTab(ws);
    const [data, exists] = await Promise.all([buildCcPays(ws), ccPaysTabExists(tab)]);
    return json({ ...data, tab, exists });
  } catch (e) {
    console.error('[review-outcomes] cc pays preview failed:', e);
    return json({ error: (e as Error).message }, 500);
  }
}

// POST { week, replace? }: writes a NEW "<week> AUTOMATED" tab (recorders only); replace = delete that AUTOMATED tab first.
export async function POST(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  if (!access.viewer.recorder) return json({ error: 'Only Review recorders can write CC PAYS tabs.' }, 403);
  const b = (await request.json().catch(() => ({}))) as { week?: string; replace?: boolean };
  if (!b.week || !YMD.test(b.week)) return json({ error: 'week must be YYYY-MM-DD' }, 400);
  try {
    return json(await writeCcPays(access.viewer.email, weekStart(b.week), b.replace === true));
  } catch (e) {
    return json({ error: (e as Error).message }, 409);
  }
}
