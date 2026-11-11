import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { meetingOwner, saveBookerOverride, saveConfirmed, saveRowNote, saveTlc } from '@/lib/reviewOutcomes/record';
import { ghlUsers } from '@/lib/reviewOutcomes/sync';
import { NOTE_NEXT_ACTIONS } from '@/lib/reviewOutcomes/types';
import { postContactNote } from '@/lib/reviewOutcomes/contactNote';
import { runConfirm } from '@/lib/reviewOutcomes/confirm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Meeting row Confirm toggle and Note (reason / next action / text). App DB only: nothing is written to GHL or Google.
export async function POST(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  const b = (await request.json().catch(() => null)) as
    | { appointmentId?: string; confirmed?: boolean; note?: string | null; noteReason?: string | null; noteNextAction?: string | null; outcome?: string | null }
    | null;
  if (!b?.appointmentId) return json({ error: 'appointmentId is required.' }, 400);
  try {
    const owner = await meetingOwner(b.appointmentId);
    if (!owner) return json({ error: 'Appointment not found.' }, 404);
    if ('bookerOverride' in b) {
      const id = (b as { bookerOverride?: unknown }).bookerOverride;
      if (id !== null && typeof id !== 'string') return json({ error: 'bookerOverride must be a GHL user id or null.' }, 400);
      if (id && !(await ghlUsers()).some((u) => u.id === id)) return json({ error: `Unknown GHL user "${id}".` }, 400);
      await saveBookerOverride(access.viewer.email, b.appointmentId, id || null);
      return json({ ok: true });
    }
    const tlc = (b as { tlc?: unknown }).tlc;
    if (typeof tlc === 'boolean') {
      const err = await saveTlc(access.viewer.email, b.appointmentId, tlc);
      return err ? json({ error: err }, 409) : json({ ok: true });
    }
    if (typeof b.confirmed === 'boolean') {
      await saveConfirmed(access.viewer.email, b.appointmentId, b.confirmed);
      // GHL status + CONFIRMED title prefix (dry run until switched on in Admin > Automated updates).
      const confirm = await runConfirm(access.viewer.email, b.appointmentId, b.confirmed);
      return json({ ok: true, confirm });
    }
    const next = b.noteNextAction || null;
    if (next && !NOTE_NEXT_ACTIONS.includes(next)) return json({ error: `Unknown next action "${next}".` }, 400);
    const note = b.note ? String(b.note).trim().slice(0, 4000) || null : null;
    await saveRowNote(access.viewer.email, b.appointmentId, note, null, next);
    const outcome = b.outcome ? String(b.outcome).slice(0, 60) : null;
    const ghlNote = await postContactNote(access.viewer.email, b.appointmentId, note, next, outcome);
    return json({ ok: true, ghlNote });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
