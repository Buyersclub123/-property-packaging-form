import { NextRequest, NextResponse } from 'next/server';
import { canRecord, reviewAccess } from '@/lib/reviewOutcomes/access';
import { meetingOwner, saveConfirmed, saveRowNote } from '@/lib/reviewOutcomes/record';
import { NOTE_NEXT_ACTIONS, NOTE_REASONS } from '@/lib/reviewOutcomes/types';
import { runConfirm } from '@/lib/reviewOutcomes/confirm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Meeting row Confirm toggle and Note (reason / next action / text). App DB only: nothing is written to GHL or Google.
export async function POST(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  const b = (await request.json().catch(() => null)) as
    | { appointmentId?: string; confirmed?: boolean; note?: string | null; noteReason?: string | null; noteNextAction?: string | null }
    | null;
  if (!b?.appointmentId) return json({ error: 'appointmentId is required.' }, 400);
  try {
    const owner = await meetingOwner(b.appointmentId);
    if (!owner) return json({ error: 'Appointment not found.' }, 404);
    if (!canRecord(access.viewer, owner.assignedUserId)) return json({ error: 'You can only record your own meetings.' }, 403);
    if (typeof b.confirmed === 'boolean') {
      await saveConfirmed(access.viewer.email, b.appointmentId, b.confirmed);
      // GHL status + CONFIRMED title prefix (dry run until switched on in Admin > Automated updates).
      const confirm = await runConfirm(access.viewer.email, b.appointmentId, b.confirmed);
      return json({ ok: true, confirm });
    }
    const reason = b.noteReason || null;
    const next = b.noteNextAction || null;
    if (reason && !NOTE_REASONS.includes(reason)) return json({ error: `Unknown reason "${reason}".` }, 400);
    if (next && !NOTE_NEXT_ACTIONS.includes(next)) return json({ error: `Unknown next action "${next}".` }, 400);
    const note = b.note ? String(b.note).trim().slice(0, 4000) || null : null;
    await saveRowNote(access.viewer.email, b.appointmentId, note, reason, next);
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
