import { NextResponse } from 'next/server';
import { ensureTables, listItems } from '@/lib/inboxMining/store';
import { sydneyWindow, MAX_WINDOW_DAYS } from '@/lib/inboxMining/gmail';
import { buildProfile } from '@/lib/inboxMining/profile';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const days = parseInt(new URL(request.url).searchParams.get('days') || String(MAX_WINDOW_DAYS), 10);
  try {
    await ensureTables();
    const { start } = sydneyWindow(days);
    const [rows, profile] = await Promise.all([listItems(start), buildProfile()]);
    const items = rows.map((r) => ({ ...r, profile: profile.items.get(r.id as number) || null }));
    return NextResponse.json({ items, since: start.toISOString(), profileBuiltAt: profile.builtAt });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
