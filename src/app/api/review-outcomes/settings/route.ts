import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { loadSettings, saveSettings } from '@/lib/reviewOutcomes/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const clean = (v: unknown): string[] =>
  [...new Set((Array.isArray(v) ? v : []).map((s) => String(s).trim().slice(0, 60)).filter(Boolean))].slice(0, 20);

export async function GET(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  return json(await loadSettings());
}

// Review recorders only. "Write outcomes to" stays DB only until phase 2 is approved.
export async function POST(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  if (!access.viewer.recorder) return json({ error: 'Only Review recorders can change settings.' }, 403);
  const b = (await request.json().catch(() => null)) as { outcomes?: unknown; invalidReasons?: unknown; writeTarget?: string } | null;
  if (b?.writeTarget && b.writeTarget !== 'db') return json({ error: 'Writing to the GHL calendar is phase 2 and not approved yet.' }, 400);
  const outcomes = clean(b?.outcomes);
  const invalidReasons = clean(b?.invalidReasons);
  if (!outcomes.length) return json({ error: 'Keep at least one outcome.' }, 400);
  try {
    await saveSettings(access.viewer.email, { outcomes, invalidReasons });
    return json(await loadSettings());
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
