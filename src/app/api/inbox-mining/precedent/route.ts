import { NextResponse } from 'next/server';
import { latestPrecedent, isBuilding, startPrecedentBuild } from '@/lib/inboxMining/precedent';

// GET: latest precedent summary. POST: start a rebuild in the background (takes minutes; poll GET).
// GHL is only read; nothing is written to GHL.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ summary: await latestPrecedent(), building: isBuilding() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST() {
  const started = startPrecedentBuild();
  return NextResponse.json({ started, building: true });
}
