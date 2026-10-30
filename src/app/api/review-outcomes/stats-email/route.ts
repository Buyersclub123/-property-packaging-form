import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { loadStatsEmail, saveStatsEmail } from '@/lib/reviewOutcomes/store';
import type { StatsEmailSettings, StatsKind } from '@/lib/reviewOutcomes/types';
import { listDirectoryUsers } from '@/lib/workspaceDirectory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const KINDS: StatsKind[] = ['day', 'week', 'month', 'quarter', 'ytd', 'year', 'all'];
const isStaff = (e: string) => /^[^@\s]+@buyersclub\.com\.au$/.test(e);

// GET: stats email settings plus the Workspace directory to pick recipients from. POST: save (Review recorders only).
export async function GET(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  const settings = await loadStatsEmail();
  let users: { email: string; name: string }[] = [];
  let directoryError: string | null = null;
  try {
    users = (await listDirectoryUsers()).filter((u) => !u.suspended).map((u) => ({ email: u.email, name: u.name }));
  } catch (e) {
    directoryError = (e as Error).message;
  }
  return json({ settings, users, directoryError });
}

export async function POST(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  if (!access.viewer.recorder) return json({ error: 'Only Review recorders can change the stats email.' }, 403);
  const b = (await request.json().catch(() => null)) as Partial<StatsEmailSettings> | null;
  if (!b) return json({ error: 'Bad request.' }, 400);
  const recipients = [...new Set((Array.isArray(b.recipients) ? b.recipients : []).map((e) => String(e).trim().toLowerCase()).filter(Boolean))].slice(0, 50);
  const bad = recipients.find((e) => !isStaff(e));
  if (bad) return json({ error: `Recipients must be Buyers Club emails ("${bad}").` }, 400);
  const sender = String(b.sender || '').trim().toLowerCase();
  if (!isStaff(sender)) return json({ error: 'Send from must be a Buyers Club mailbox.' }, 400);
  const periods = KINDS.filter((k) => (Array.isArray(b.periods) ? b.periods : []).includes(k));
  const day = Math.min(6, Math.max(0, Math.round(Number(b.day))));
  const hour = Math.min(23, Math.max(0, Math.round(Number(b.hour))));
  if (b.enabled && (!recipients.length || !periods.length)) return json({ error: 'Choose at least one recipient and one period before turning the schedule on.' }, 400);
  const before = await loadStatsEmail();
  const s: StatsEmailSettings = { enabled: !!b.enabled, recipients, sender, periods, day: Number.isFinite(day) ? day : 5, hour: Number.isFinite(hour) ? hour : 8, lastSent: before.lastSent };
  try {
    await saveStatsEmail(access.viewer.email, s);
    return json({ settings: s });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
