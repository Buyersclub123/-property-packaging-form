import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { FactPos } from '@/lib/inboxMining/types';

// Stores where a fact was found on a rendered PDF page (inbox_items.facts only). Nothing is written to GHL.
export const dynamic = 'force-dynamic';

const frac = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1.5;
const r4 = (v: number) => Math.round(v * 10000) / 10000;

export async function POST(request: Request) {
  let body: { itemId?: unknown; key?: unknown; pos?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const itemId = typeof body.itemId === 'number' ? body.itemId : NaN;
  const key = typeof body.key === 'string' ? body.key : '';
  const p = body.pos || {};
  if (!Number.isInteger(itemId)) return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
  if (!/^[A-Za-z]{1,40}$/.test(key)) return NextResponse.json({ error: 'key is invalid' }, { status: 400 });

  let pos: FactPos;
  if (p.notFound === true) {
    pos = { notFound: true };
  } else if (Number.isInteger(p.page) && (p.page as number) >= 1 && frac(p.x) && frac(p.y) && frac(p.w) && frac(p.h)) {
    pos = { page: p.page as number, x: r4(p.x), y: r4(p.y), w: r4(p.w), h: r4(p.h) };
  } else {
    return NextResponse.json({ error: 'pos must be {page, x, y, w, h} (fractions of the page) or {notFound: true}' }, { status: 400 });
  }
  try {
    const rows = await getDb()`
      UPDATE inbox_items SET facts = jsonb_set(facts, ${[key, 'pos']}::text[], ${JSON.stringify(pos)}::jsonb)
      WHERE id = ${itemId} AND facts ? ${key}
      RETURNING id`;
    if (!rows.length) return NextResponse.json({ error: `Item ${itemId} has no fact "${key}"` }, { status: 404 });
    return NextResponse.json({ itemId, key, pos });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
