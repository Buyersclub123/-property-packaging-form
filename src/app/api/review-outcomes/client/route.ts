import { NextRequest, NextResponse } from 'next/server';
import { canRecord, reviewAccess } from '@/lib/reviewOutcomes/access';
import { loadClientPanel, meetingOwner, saveClientPanel, type PropertyCheckInput } from '@/lib/reviewOutcomes/record';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// "More" panel for one meeting: the client's properties (Portfolio View data) with still-owned / value / rent checks and one note.
// Saved to the app DB only.
async function guard(request: NextRequest, appointmentId: string | null | undefined) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return { error: json({ error: access.error }, access.status) };
  if (!appointmentId) return { error: json({ error: 'appointmentId is required.' }, 400) };
  const owner = await meetingOwner(appointmentId);
  if (!owner) return { error: json({ error: 'Appointment not found.' }, 404) };
  if (!canRecord(access.viewer, owner.assignedUserId)) return { error: json({ error: 'You can only open your own meetings.' }, 403) };
  return { access, owner };
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('appointmentId');
  try {
    const g = await guard(request, id);
    if ('error' in g) return g.error;
    return json(await loadClientPanel(id!, g.owner.contactId, g.owner.contactName));
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export async function POST(request: NextRequest) {
  const b = (await request.json().catch(() => null)) as { appointmentId?: string; checks?: PropertyCheckInput[]; note?: string | null } | null;
  try {
    const g = await guard(request, b?.appointmentId);
    if ('error' in g) return g.error;
    const checks: PropertyCheckInput[] = [];
    for (const c of b?.checks || []) {
      const currentValue = num(c.currentValue);
      const currentRentPw = num(c.currentRentPw);
      if (Number.isNaN(currentValue) || Number.isNaN(currentRentPw)) return json({ error: `Value / rent for ${c.address} must be a number.` }, 400);
      if (!c.key) continue;
      checks.push({ key: String(c.key), address: String(c.address || ''), stillOwned: typeof c.stillOwned === 'boolean' ? c.stillOwned : null, currentValue, currentRentPw });
    }
    const note = b?.note ? String(b.note).slice(0, 4000) : null;
    await saveClientPanel(g.access.viewer.email, b!.appointmentId!, checks, note);
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
