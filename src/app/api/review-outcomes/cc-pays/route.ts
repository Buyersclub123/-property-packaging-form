import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { automatedTab, buildCcPays, ccPaysTabExists, writeCcPays } from '@/lib/reviewOutcomes/ccPays';
import { ccPeriod, CC_DEFAULT_KIND, isCcKind, type CcPeriod } from '@/lib/reviewOutcomes/ccPaysPeriod';
import { ccPaysXlsx } from '@/lib/reviewOutcomes/ccPaysXlsx';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** kind (mon-sun | fri-thu | month | custom) + from (+ to for custom). Old callers send week = a Fri-Thu date. */
function periodOf(q: { kind?: unknown; from?: unknown; to?: unknown; week?: unknown }): CcPeriod {
  if (typeof q.week === 'string' && !q.kind) q = { kind: 'fri-thu', from: q.week };
  const kind = q.kind == null ? CC_DEFAULT_KIND : q.kind;
  if (!isCcKind(kind)) throw new Error('kind must be mon-sun, fri-thu, month or custom');
  if (typeof q.from !== 'string' || !YMD.test(q.from)) throw new Error('from must be YYYY-MM-DD');
  if (kind === 'custom' && (typeof q.to !== 'string' || !YMD.test(q.to))) throw new Error('to must be YYYY-MM-DD');
  return ccPeriod(kind, q.from, kind === 'custom' ? (q.to as string) : undefined);
}

// GET ?kind=&from=&to=: preview of the CC PAYS tab for that period (no write).
// &also=mon-sun|fri-thu|month: the period of that kind containing `from`, whose meetings are highlighted.
// &format=xlsx: the preview as an Excel file instead of JSON.
export async function GET(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  const s = request.nextUrl.searchParams;
  let p: CcPeriod;
  let also: CcPeriod | null = null;
  try {
    p = periodOf({ kind: s.get('kind') ?? undefined, from: s.get('from') ?? undefined, to: s.get('to') ?? undefined, week: s.get('week') ?? undefined });
    const a = s.get('also');
    if (a && a !== 'none') {
      if (!isCcKind(a) || a === 'custom') throw new Error('also must be mon-sun, fri-thu, month or none');
      also = ccPeriod(a, p.from);
    }
  } catch (e) { return json({ error: (e as Error).message }, 400); }
  try {
    const tab = automatedTab(p);
    const [data, exists] = await Promise.all([buildCcPays(p), ccPaysTabExists(tab)]);
    if (s.get('format') === 'xlsx') {
      const buf = await ccPaysXlsx({ ...data, tab }, also);
      return new NextResponse(new Uint8Array(buf), { headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="CC PAYS ${tab} (preview).xlsx"`,
        'Cache-Control': 'no-store',
      } });
    }
    return json({ ...data, tab, exists, also });
  } catch (e) {
    console.error('[review-outcomes] cc pays preview failed:', e);
    return json({ error: (e as Error).message }, 500);
  }
}

// POST { kind, from, to?, replace? }: writes the "<period> AUTOMATED" tab (recorders only); replace = rewrite that AUTOMATED tab.
export async function POST(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  if (!access.viewer.recorder) return json({ error: 'Only Review recorders can write CC PAYS tabs.' }, 403);
  const b = (await request.json().catch(() => ({}))) as { kind?: string; from?: string; to?: string; week?: string; replace?: boolean };
  let p: CcPeriod;
  try { p = periodOf(b); } catch (e) { return json({ error: (e as Error).message }, 400); }
  try {
    return json(await writeCcPays(access.viewer.email, p, b.replace === true));
  } catch (e) {
    return json({ error: (e as Error).message }, 409);
  }
}
