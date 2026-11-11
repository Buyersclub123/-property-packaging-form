import { NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/ghlMonitorStore';
import { ccPaysSwitch, ccPaysTabExists, weekLabel, writeCcPays } from '@/lib/reviewOutcomes/ccPays';
import { weekStart } from '@/lib/reviewOutcomes/stats';
import { addDays, sydYmd } from '@/lib/reviewOutcomes/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Hourly cron (vercel.json). Fridays from 9am Sydney: writes last Fri-Thu week's "(tool)" tab once, if the switch is on.
export async function GET(request: Request) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  if (parts.find((p) => p.type === 'weekday')?.value !== 'Fri' || Number(parts.find((p) => p.type === 'hour')?.value) < 9) {
    return NextResponse.json({ wrote: false, reason: 'not scheduled now' });
  }
  if (!(await ccPaysSwitch()).apply) return NextResponse.json({ wrote: false, reason: 'dry run (switch off)' });
  const ws = addDays(weekStart(sydYmd(Date.now())), -7);
  if (await ccPaysTabExists(`${weekLabel(ws)} (tool)`)) return NextResponse.json({ wrote: false, reason: 'already written' });
  try {
    return NextResponse.json({ wrote: true, ...(await writeCcPays('cron', ws, 'tool')) });
  } catch (e) {
    return NextResponse.json({ wrote: false, error: (e as Error).message }, { status: 500 });
  }
}
