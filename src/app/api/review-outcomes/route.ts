import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { loadMeetings } from '@/lib/reviewOutcomes/load';
import { markCcPaysDirty } from '@/lib/reviewOutcomes/ccPays';
import { meetingOwner, saveOutcome } from '@/lib/reviewOutcomes/record';
import { lastSync, loadSettings, logReview } from '@/lib/reviewOutcomes/store';
import { GHL_STATUS_FOR, ghlSetStatus } from '@/lib/reviewOutcomes/sync';
import { gcalCalendars, syncRange } from '@/lib/reviewOutcomes/sync';
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
    const syncWarnings: string[] = mode === 'none' || (mode === 'auto' && days > 31) ? [] : await syncRange(from, to, mode === 'force');
    const settings = await loadSettings();
    const [loaded, sync, calendars] = await Promise.all([loadMeetings(access.viewer, from, to, settings.callCentre, settings.salesAliases, settings.ghlOnlyFrom), lastSync(), gcalCalendars()]);
    const body: ReviewData = {
      viewer: access.viewer,
      settings,
      from,
      to,
      consultants: loaded.consultants,
      ghlUsers: loaded.ghlUsers,
      meetings: loaded.meetings,
      gcalUnmatched: loaded.gcalUnmatched,
      lastSync: sync,
      warnings: [...syncWarnings, ...loaded.warnings],
      gcalCalendars: calendars,
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
    const settings = await loadSettings();
    const outcome = b.outcome ?? null;
    if (outcome !== null && !settings.outcomes.includes(outcome)) return json({ error: `Unknown outcome "${outcome}".` }, 400);
    const reason = outcome && /^invalid/i.test(outcome) ? b.invalidReason ?? null : null;
    if (reason !== null && !settings.invalidReasons.includes(reason)) return json({ error: `Unknown reason "${reason}".` }, 400);
    // Clear (JT 27/11: GHL is the single source of truth): the GHL status this tool set goes back to Confirmed (ticked) or
    // New. A status changed directly in GHL since (no longer the cleared outcome's status) is left alone.
    let status = outcome ? GHL_STATUS_FOR[outcome] : undefined;
    if (!outcome) {
      const [prev] = await getDb()`SELECT o.outcome, o.confirmed, m.ghl_status FROM review_meetings m
        LEFT JOIN review_outcomes o ON o.appointment_id = m.appointment_id WHERE m.appointment_id = ${b.appointmentId}`;
      if (prev?.outcome && GHL_STATUS_FOR[String(prev.outcome)] === prev.ghl_status) status = prev.confirmed ? 'confirmed' : 'new';
    }
    await saveOutcome(access.viewer.email, b.appointmentId, outcome, reason);
    // CC PAYS: flag the AUTOMATED tabs covering this meeting; the page then calls /cc-pays/refresh (cron is the back-up).
    await markCcPaysDirty(b.appointmentId).catch((e) => console.error('[review-outcomes] cc pays flag failed:', e));
    // Phase 2: a deliberate save in the tool always writes the mapped status to GHL (correcting it if set wrong there).
    // The DB save stands even if GHL fails. DNQ reasons stay DB-only.
    let ghl: string | null = null;
    if (settings.writeTarget === 'db+ghl' && status) {
      try {
        await ghlSetStatus(b.appointmentId, status);
        ghl = `GHL set to ${status}`;
        await logReview(access.viewer.email, b.appointmentId, 'ghl_status', { status });
      } catch (e) {
        await logReview(access.viewer.email, b.appointmentId, 'ghl_status_failed', { status, error: (e as Error).message });
        return json({ ok: true, ghlError: `Saved, but GHL wasn't updated: ${(e as Error).message}` });
      }
    }
    return json({ ok: true, ghl });
  } catch (e) {
    console.error('[review-outcomes] save failed:', e);
    return json({ error: (e as Error).message }, 500);
  }
}
