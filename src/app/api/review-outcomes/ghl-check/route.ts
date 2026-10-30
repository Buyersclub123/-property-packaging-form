import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { getDb } from '@/lib/db';
import { ensureReviewTables, loadSettings } from '@/lib/reviewOutcomes/store';
import { loadMeetings } from '@/lib/reviewOutcomes/load';
import { addDays, sydYmd } from '@/lib/reviewOutcomes/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const ghlNorm = (s: string) => {
  const v = s.toLowerCase().replace(/[^a-z]/g, '');
  return v === 'showed' ? 'Showed' : v === 'noshow' ? 'No show' : v === 'cancelled' ? 'Cancelled' : v === 'invalid' ? 'Invalid (DNQ)' : v ? 'Confirmed / other' : '-';
};
const sheetNorm = (o: string) => (o === 'Not sat' ? 'No show' : o);

// Settings monitor (read-only): is GHL kept up to date? For past meetings with an outcome from the calendar schedule
// sheet (Presentation Meeting 1) or the tool / sheet import (PR), cross-tab that outcome against the GHL status.
export async function GET(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  await ensureReviewTables();
  const today = sydYmd(Date.now());
  const from = request.nextUrl.searchParams.get('from') || addDays(today, -90);
  const settings = await loadSettings();
  const { meetings } = await loadMeetings(access.viewer, from, addDays(today, -1), settings.callCentre, settings.salesAliases);
  const out: Record<string, { total: number; agree: number; grid: Record<string, Record<string, number>> }> = {};
  for (const m of meetings) {
    if (!m.outcome || m.outcomeSource === 'ghl') continue;
    const k = m.kind === 'PR' ? 'Portfolio Review' : 'Presentation Meeting 1';
    const o = sheetNorm(m.outcome);
    const g = ghlNorm(m.ghlStatus || '');
    const t = (out[k] ||= { total: 0, agree: 0, grid: {} });
    t.total++;
    if (o === g || (o === 'Rescheduled' && g === 'Confirmed / other')) t.agree++;
    (t.grid[o] ||= {})[g] = (t.grid[o][g] || 0) + 1;
  }
  const moves = await getDb()`SELECT COUNT(*)::int AS n, COUNT(DISTINCT appointment_id)::int AS appts, MIN(seen_at) AS first FROM review_meeting_moves`;
  return json({ from, to: addDays(today, -1), byKind: out, moves: moves[0] });
}
