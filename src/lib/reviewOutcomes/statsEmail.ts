import { sendGmailAsUser } from '@/lib/gmailSendAsUser';
import { loadMeetings } from './load';
import { bookerKey, canCompare, consultantKey, inRange, pct, periodRange, shift, tally, type Period, type Row } from './stats';
import { loadSettings, logReview } from './store';
import { KIND_LABEL, MIN_YMD, sydYmd, type ReviewMeeting, type StatsKind } from './types';
import { loadAllSignups, type Signup } from './signups';

// Stats email (item 15): Booked / Sat / DNQ over every reported calendar per Call Centre booker and consultant for
// each chosen period, with the change against the previous period, plus Sold from GHL (no Revenue).
// Read-only on GHL / Google; only sends the email.

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const TH = 'style="border:1px solid #ccc;padding:3px 8px;background:#f3f4f6;font-size:12px"';
const TD = 'style="border:1px solid #ddd;padding:3px 8px;text-align:center;font-size:12px"';
const TDL = 'style="border:1px solid #ddd;padding:3px 8px;font-size:12px"';

function delta(v: number, pv: number | undefined): string {
  if (pv === undefined) return '';
  const d = v - pv;
  const c = d > 0 ? '#15803d' : d < 0 ? '#b91c1c' : '#6b7280';
  return ` <span style="color:${c};font-size:11px">${d > 0 ? '&#9650;' : d < 0 ? '&#9660;' : '='}${d ? Math.abs(d) : ''}</span>`;
}

function table(title: string, rows: Row[], total: Row, prev: Map<string, Row> | null): string {
  const line = (r: Row, bold = false) => {
    const p = prev?.get(r.name);
    const w = bold ? 'font-weight:bold;' : '';
    return `<tr><td ${TDL.replace('"', `"${w}`)}>${esc(r.name)}</td><td ${TD}>${r.booked}${prev ? delta(r.booked, p?.booked ?? 0) : ''}</td>`
      + `<td ${TD}>${r.sat}${prev ? delta(r.sat, p?.sat ?? 0) : ''}</td><td ${TD}>${r.dnq}${prev ? delta(r.dnq, p?.dnq ?? 0) : ''}</td><td ${TD}>${pct(r.sat, r.booked)}</td></tr>`;
  };
  return `<h3 style="margin:14px 0 4px;font-size:14px">${esc(title)}</h3>
<table style="border-collapse:collapse"><tr><th ${TH}>Name</th><th ${TH}>Booked</th><th ${TH}>Sat</th><th ${TH}>DNQ</th><th ${TH}>Sat %</th></tr>
${rows.filter((r) => r.booked).map((r) => line(r)).join('\n')}
${line(total, true)}</table>`;
}

function soldTable(title: string, by: Map<string, number>): string {
  const rows = [...by.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = rows.reduce((a, [, n]) => a + n, 0);
  return `<h3 style="margin:14px 0 4px;font-size:14px">${esc(title)}</h3>
<table style="border-collapse:collapse"><tr><th ${TH}>Name</th><th ${TH}>Sold</th></tr>
${rows.map(([k, n]) => `<tr><td ${TDL}>${esc(k)}</td><td ${TD}>${n}</td></tr>`).join('\n')}
<tr><td ${TDL.replace('"', '"font-weight:bold;')}>TOTAL</td><td ${TD}>${total}</td></tr></table>`;
}

/** Every reported calendar (Presentation 1, PR, Cashflow Club). Sold = GHL sign-ups net of cancellations; no Revenue. */
export function buildStatsEmail(allMeetings: ReviewMeeting[], periods: Period[], today: string, salesIn: Signup[] = []): { subject: string; html: string } {
  const meetings = allMeetings;
  const sections = periods.map((p) => {
    const r = periodRange(p, today);
    const list = inRange(meetings, r.from, r.to);
    const cc = tally(list, bookerKey);
    const sales = tally(list, consultantKey);
    const types = tally(list, (m) => KIND_LABEL[m.kind]);
    const sold = salesIn.filter((s) => s.signed >= r.from && s.signed <= r.to && !s.cancelled);
    const count = (key: (s: Signup) => string) => sold.reduce((m, s) => m.set(key(s), (m.get(key(s)) || 0) + 1), new Map<string, number>());
    let prevCc: Map<string, Row> | null = null;
    let prevSales: Map<string, Row> | null = null;
    let prevLabel = '';
    if (canCompare(p.kind)) {
      const pr = periodRange(shift(p, -1), today);
      const pl = inRange(meetings, pr.from, pr.to);
      const pc = tally(pl, bookerKey);
      const ps = tally(pl, consultantKey);
      prevCc = new Map([...pc.rows, pc.total].map((x) => [x.name, x]));
      prevSales = new Map([...ps.rows, ps.total].map((x) => [x.name, x]));
      prevLabel = pr.label;
    }
    const noOutcome = list.filter((m) => m.past && !m.outcome).length;
    return `<h2 style="margin:22px 0 2px;font-size:16px;color:#1f2937">${esc(r.label)}</h2>
${prevLabel ? `<div style="font-size:11px;color:#6b7280">&#9650;&#9660; = change vs ${esc(prevLabel)}</div>` : ''}
${noOutcome ? `<div style="font-size:12px;color:#b45309">${noOutcome} past meeting${noOutcome === 1 ? '' : 's'} with no outcome yet, so Sat and DNQ may be understated.</div>` : ''}
${table('CC Stats (Call Centre booker)', cc.rows, cc.total, prevCc)}
${table('Sales Stats (consultant)', sales.rows, sales.total, prevSales)}
${table('By meeting type', types.rows, types.total, null)}
${soldTable('Sold by consultant (GHL, net of cancellations)', count((s) => s.consultant || '(unassigned)'))}
${soldTable('Sold by meeting type', count((s) => s.source))}`;
  });
  const labels = periods.map((p) => periodRange(p, today).label).join(' | ');
  return {
    subject: `Sales meeting stats - ${labels}`,
    html: `<html><body style="font-family:Arial,sans-serif;color:#111">
<div style="font-size:13px">Presentation 1, Portfolio Review and Cashflow Club meetings. Sat = Showed + DNQ. Sold = GHL &quot;Date signed up&quot;, credited to the client&apos;s last meeting before signing.</div>
${sections.join('\n')}
<div style="margin-top:16px;font-size:11px;color:#6b7280">From the Sales Meeting Outcomes tool (Stats tab).</div>
</body></html>`,
  };
}

export const scheduledPeriod = (today: string, kind: StatsKind): Period => {
  // A scheduled send reports the period that has just closed for weeks / days; other periods run to date.
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  const yesterday = y.toISOString().slice(0, 10);
  return { kind, anchor: kind === 'week' || kind === 'day' ? yesterday : today };
};

export async function sendStatsEmail(args: { by: string; sender: string; to: string[]; periods: Period[] }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!args.to.length) return { ok: false, error: 'No recipients chosen.' };
  if (!args.periods.length) return { ok: false, error: 'No periods chosen.' };
  const today = sydYmd(Date.now());
  const settings = await loadSettings();
  const [loaded, signups] = await Promise.all([loadMeetings({ email: args.by, recorder: true, consultantIds: [] }, MIN_YMD, today, settings.callCentre, settings.salesAliases, settings.ghlOnlyFrom), loadAllSignups()]);
  const { subject, html } = buildStatsEmail(loaded.meetings, args.periods, today, signups.signups);
  const res = await sendGmailAsUser({ sentBy: args.sender, to: args.to, subject, html });
  await logReview(args.by, null, 'stats_email_sent', { to: args.to, sender: args.sender, periods: args.periods, status: res.status });
  return res.status === 'sent' ? { ok: true } : { ok: false, error: res.error };
}
