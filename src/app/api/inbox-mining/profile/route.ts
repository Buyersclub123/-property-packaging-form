import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/inboxMining/store';
import { buildProfile } from '@/lib/inboxMining/profile';

// Sender / subject-template profile built live from inbox_items. Read-only.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureTables();
    const p = await buildProfile();
    return NextResponse.json({
      builtAt: p.builtAt,
      itemCount: p.itemCount,
      senders: p.senders.slice(0, 300),
      templates: p.templates.slice(0, 300),
      unknownSenders: p.unknownSenders.slice(0, 300),
      totals: { senders: p.senders.length, templates: p.templates.length, unknownSenders: p.unknownSenders.length },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
