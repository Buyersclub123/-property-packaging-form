import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/ghlMonitorStore';
import { INBOX_MAILBOXES } from '@/lib/inboxMining/gmail';
import { mineChunk } from '@/lib/inboxMining/lagSheet';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Nightly Vercel cron (before /api/inbox-mining/lag/cron): reads mail not yet mined from the last 7 days in all four
// mailboxes, so a missed night is caught up. Gmail is only read; facts go to our DB only.
const DAYS = 7;
const LAST_CHUNK_START_MS = 120_000;

export async function GET(request: NextRequest) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const started = Date.now();
  try {
    const results = await Promise.all(INBOX_MAILBOXES.map(async (mailbox) => {
      const skip: string[] = [];
      let processed = 0, written = 0, remaining = 0;
      do {
        const d = await mineChunk(mailbox, DAYS, skip);
        for (const id of d.failedIds) if (!skip.includes(id)) skip.push(id);
        processed += d.processed;
        written += d.written;
        remaining = d.remaining;
      } while (remaining > 0 && Date.now() - started < LAST_CHUNK_START_MS);
      return { mailbox, processed, written, failed: skip.length, remaining };
    }));
    return NextResponse.json({ ok: true, days: DAYS, results });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
