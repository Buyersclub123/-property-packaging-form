import { NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/ghlMonitorStore';
import { scheduledPeriod, sendStatsEmail } from '@/lib/reviewOutcomes/statsEmail';
import { loadStatsEmail, saveStatsEmail } from '@/lib/reviewOutcomes/store';
import { sydYmd } from '@/lib/reviewOutcomes/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Hourly cron (vercel.json). Sends the stats email when the Sydney day and hour match the saved schedule.
export async function GET(request: Request) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const cfg = await loadStatsEmail();
  if (!cfg.enabled || !cfg.recipients.length || !cfg.periods.length) return NextResponse.json({ sent: false, reason: 'off' });
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const day = DAYS.indexOf(parts.find((p) => p.type === 'weekday')?.value || '');
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  if (day !== cfg.day || hour !== cfg.hour) return NextResponse.json({ sent: false, reason: 'not scheduled now' });
  if (cfg.lastSent && Date.now() - Date.parse(cfg.lastSent) < 6 * 3600e3) return NextResponse.json({ sent: false, reason: 'already sent' });
  const today = sydYmd(Date.now());
  const res = await sendStatsEmail({ by: 'cron', sender: cfg.sender, to: cfg.recipients, periods: cfg.periods.map((k) => scheduledPeriod(today, k)) });
  if (!res.ok) return NextResponse.json({ sent: false, error: res.error }, { status: 500 });
  await saveStatsEmail('cron', { ...cfg, lastSent: new Date().toISOString() });
  return NextResponse.json({ sent: true });
}
