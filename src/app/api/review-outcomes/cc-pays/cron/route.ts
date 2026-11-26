import { NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/ghlMonitorStore';
import { automatedTab, ccPaysTabExists, refreshDirtyCcPays, writeCcPays } from '@/lib/reviewOutcomes/ccPays';
import { lastMonSun } from '@/lib/reviewOutcomes/ccPaysPeriod';
import { sydYmd } from '@/lib/reviewOutcomes/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Hourly cron (vercel.json, on the hour). Every hour: rewrites AUTOMATED tabs flagged by a saved outcome (back-up for the
// rewrite the save itself starts). Mondays from 9am Sydney: writes the Mon-Sun week that ended Sunday 23:59, once.
export async function GET(request: Request) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const refreshed = await refreshDirtyCcPays('cron').catch((e) => ({ error: (e as Error).message }));
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  if (parts.find((p) => p.type === 'weekday')?.value !== 'Mon' || Number(parts.find((p) => p.type === 'hour')?.value) < 9) {
    return NextResponse.json({ wrote: false, reason: 'not scheduled now', refreshed });
  }
  const period = lastMonSun(sydYmd(Date.now()));
  if (await ccPaysTabExists(automatedTab(period))) return NextResponse.json({ wrote: false, reason: 'already written', refreshed });
  try {
    return NextResponse.json({ wrote: true, ...(await writeCcPays('cron', period)), refreshed });
  } catch (e) {
    return NextResponse.json({ wrote: false, error: (e as Error).message, refreshed }, { status: 500 });
  }
}
