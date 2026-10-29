import { NextRequest, NextResponse } from 'next/server';
import { canRecord, reviewAccess } from '@/lib/reviewOutcomes/access';
import { loadMeetings } from '@/lib/reviewOutcomes/load';
import { meetingOwner, saveOutcome } from '@/lib/reviewOutcomes/record';
import { lastSync, loadSettings } from '@/lib/reviewOutcomes/store';
import { syncRange } from '@/lib/reviewOutcomes/sync';
import { isYmd, sydYmd, type ReviewData } from '@/lib/reviewOutcomes/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Portfolio Review outcomes (item 14). GET: meetings for Sydney days from..to (a range of 31 days or less is refreshed
// from GHL / Google first, read-only). POST: record an outcome in the app DB. Nothing is written to GHL, Calendar or the sheet.
export async function GET(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  const p = request.nextUrl.searchParams;
  const today = sydYmd(Date.now());
  const from = isYmd(p.get('from')) ? p.get('from')! : today;
  const to = isYmd(p.get('to')) ? p.get('to')! : from;
  if (from > to) return json({ error: 'From is after To.' }, 400);
  try {
    const mode = p.get('sync') || 'auto';
    const days = (Date.parse(to) - Date.parse(from)) / 864e5 + 1;
    const syncWarnings = mode === 'none' || (mode === 'auto' && days > 31) ? [] : await syncRange(from, to, mode === 'force');
    const [loaded, settings, sync] = await Promise.all([loadMeetings(access.viewer, from, to), loadSettings(), lastSync()]);
    const body: ReviewData = {
      viewer: access.viewer,
      settings,
      from,
      to,
      consultants: loaded.consultants,
      meetings: loaded.meetings,
      gcalUnmatched: loaded.gcalUnmatched,
      lastSync: sync,
      warnings: [...syncWarnings, ...loaded.warnings],
    };
    return json(body);
  } catch (e) {
    console.error('[review-outcomes] load failed:', e);
    return json({ error: (e as Error).message }, 500);
  }
}

export async function POST(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  const b = (await request.json().catch(() => null)) as { appointmentId?: string; outcome?: string | null; invalidReason?: string | null } | null;
  if (!b?.appointmentId) return json({ error: 'appointmentId is required.' }, 400);
  try {
    const owner = await meetingOwner(b.appointmentId);
    if (!owner) return json({ error: 'Appointment not found.' }, 404);
    if (!canRecord(access.viewer, owner.assignedUserId)) return json({ error: 'You can only record your own meetings.' }, 403);
    const settings = await loadSettings();
    const outcome = b.outcome ?? null;
    if (outcome !== null && !settings.outcomes.includes(outcome)) return json({ error: `Unknown outcome "${outcome}".` }, 400);
    const reason = outcome && /^invalid/i.test(outcome) ? b.invalidReason ?? null : null;
    if (reason !== null && !settings.invalidReasons.includes(reason)) return json({ error: `Unknown reason "${reason}".` }, 400);
    // settings.writeTarget is always 'db' in phase 1: the outcome is stored in our DB only.
    await saveOutcome(access.viewer.email, b.appointmentId, outcome, reason);
    return json({ ok: true });
  } catch (e) {
    console.error('[review-outcomes] save failed:', e);
    return json({ error: (e as Error).message }, 500);
  }
}
