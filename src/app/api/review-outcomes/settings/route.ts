import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { loadSettings, saveSettings } from '@/lib/reviewOutcomes/store';
import type { StatTarget } from '@/lib/reviewOutcomes/types';

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
  const b = (await request.json().catch(() => null)) as { outcomes?: unknown; invalidReasons?: unknown; callCentre?: unknown; targets?: unknown; salesAliases?: unknown; writeTarget?: string } | null;
  if (b?.writeTarget && b.writeTarget !== 'db' && b.writeTarget !== 'db+ghl') return json({ error: `Unknown write target "${b.writeTarget}".` }, 400);
  const writeTarget = b?.writeTarget === 'db+ghl' ? 'db+ghl' : b?.writeTarget === 'db' ? 'db' : undefined;
  const outcomes = clean(b?.outcomes);
  const invalidReasons = clean(b?.invalidReasons);
  const callCentre = [...new Set((Array.isArray(b?.callCentre) ? b.callCentre : []).map((s) => String(s).trim().toLowerCase()).filter(Boolean))].slice(0, 60);
  const num = (v: unknown) => Math.max(0, Math.min(10000, Math.round(Number(v) || 0)));
  const targets: Record<string, StatTarget> = {};
  for (const [name, t] of Object.entries(b?.targets && typeof b.targets === 'object' ? (b.targets as Record<string, Partial<StatTarget>>) : {}).slice(0, 100)) {
    const n = name.trim().slice(0, 80);
    const v = { booked: num(t?.booked), sat: num(t?.sat) };
    if (n && (v.booked || v.sat)) targets[n] = v;
  }
  const salesAliases: Record<string, string> = {};
  for (const [k, v] of Object.entries(b?.salesAliases && typeof b.salesAliases === 'object' ? (b.salesAliases as Record<string, unknown>) : {}).slice(0, 200)) {
    const from = k.trim().slice(0, 80);
    const to = String(v ?? '').trim().slice(0, 80);
    if (from && to) salesAliases[from] = to;
  }
  if (!outcomes.length) return json({ error: 'Keep at least one outcome.' }, 400);
  const bad = callCentre.find((e) => !/^[^@\s]+@buyersclub\.com\.au$/.test(e));
  if (bad) return json({ error: `Call Centre entries must be Buyers Club emails ("${bad}").` }, 400);
  try {
    await saveSettings(access.viewer.email, { outcomes, invalidReasons, callCentre, targets, salesAliases, writeTarget });
    return json(await loadSettings());
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
