// Backlog 17 export: email_activity -> pivot-ready xlsx in G:\My Drive\Purchase Data Reconstruction\07 Email mining\
// Usage (repo root): node scripts/email-activity-export.mjs
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import ExcelJS from 'exceljs';

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) throw new Error('DATABASE_URL / POSTGRES_URL is not set in .env.local');
const sql = neon(url);
const OUT_DIR = process.env.EMAIL_MINING_DIR || 'G:\\My Drive\\Purchase Data Reconstruction\\07 Email mining';
const stamp = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
const [{ v2, v3 }] = await sql`SELECT COUNT(activity_v1) > 0 AS v2, COUNT(activity_v2) > 0 AS v3 FROM email_activity`;
const file = `${OUT_DIR}\\email-activity-2026-06-to-10_${stamp}${v3 ? '_rules-v3' : v2 ? '_rules-v2' : ''}.xlsx`;

const wb = new ExcelJS.Workbook();
function sheet(name, rows, widths = {}) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  if (!rows.length) {
    ws.addRow(['(no rows)']);
    return ws;
  }
  const cols = Object.keys(rows[0]);
  ws.columns = cols.map((k) => ({ header: k, key: k, width: widths[k] || Math.min(40, Math.max(10, k.length + 2)) }));
  ws.addRows(rows);
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  return ws;
}
function crosstab(rows, rowKey, colKey, cols) {
  const map = new Map();
  for (const r of rows) {
    const o = map.get(r[rowKey]) || { [rowKey]: r[rowKey] };
    o[r[colKey]] = (o[r[colKey]] || 0) + r.n;
    o.total = (o.total || 0) + r.n;
    map.set(r[rowKey], o);
  }
  const out = Array.from(map.values()).map((o) => Object.fromEntries([[rowKey, o[rowKey]], ...cols.map((c) => [c, o[c] || 0]), ['total', o.total]]));
  out.sort((a, b) => b.total - a.total);
  const tot = { [rowKey]: 'TOTAL', total: 0 };
  for (const c of cols) tot[c] = out.reduce((s, o) => s + o[c], 0);
  tot.total = out.reduce((s, o) => s + o.total, 0);
  return [...out, Object.fromEntries([[rowKey, 'TOTAL'], ...cols.map((c) => [c, tot[c]]), ['total', tot.total]])];
}

const emails = await sql`
  SELECT mailbox, direction, to_char(sent_at AT TIME ZONE 'Australia/Sydney', 'YYYY-MM-DD HH24:MI') AS sent_sydney,
    sydney_date::text AS date, month, weekday, hour, activity, activity_rule, activity_v1, activity_v2, from_email, from_addr, sender_domain, internal_external,
    all_internal, to_addrs, cc_addrs, subject, thread_id, thread_pos, thread_len, reply_hours::float AS reply_hours,
    att_count, att_types, opp_name, opp_id, opp_rule, message_id
  FROM email_activity ORDER BY sent_at`;
const mailboxes = ['property', 'contracts', 'construction', 'sydney.m'];
const byTypeMailbox = (await sql`SELECT activity, split_part(mailbox, '@', 1) AS mb, COUNT(*)::int AS n FROM email_activity GROUP BY 1, 2`);
const months = (await sql`SELECT DISTINCT month FROM email_activity ORDER BY 1`).map((r) => r.month);
const byTypeMonth = await sql`SELECT activity, month, COUNT(*)::int AS n FROM email_activity GROUP BY 1, 2`;
const byMailboxMonth = await sql`SELECT split_part(mailbox, '@', 1) AS mb, month, COUNT(*)::int AS n FROM email_activity GROUP BY 1, 2`;
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const byDayHour = await sql`SELECT hour::text AS hour, weekday, COUNT(*)::int AS n FROM email_activity GROUP BY 1, 2`;
const senders = await sql`
  SELECT from_email AS sender, sender_domain, internal_external, COUNT(*)::int AS emails,
    MODE() WITHIN GROUP (ORDER BY activity) AS top_activity,
    string_agg(DISTINCT split_part(mailbox, '@', 1), ', ') AS mailboxes, MAX(sydney_date)::text AS last_date
  FROM email_activity WHERE direction = 'in' GROUP BY 1, 2, 3 ORDER BY emails DESC LIMIT 1000`;
const clients = await sql`
  SELECT opp_name, opp_id, COUNT(*)::int AS emails, COUNT(*) FILTER (WHERE direction = 'in')::int AS inbound,
    MODE() WITHIN GROUP (ORDER BY activity) AS top_activity, MIN(sydney_date)::text AS first_date, MAX(sydney_date)::text AS last_date
  FROM email_activity WHERE opp_id IS NOT NULL GROUP BY 1, 2 ORDER BY emails DESC`;
const response = await sql`
  SELECT activity, split_part(mailbox, '@', 1) AS mailbox, COUNT(*)::int AS inbound_external,
    COUNT(reply_hours)::int AS replied, ROUND(100.0 * COUNT(reply_hours) / COUNT(*), 0)::int AS pct_replied,
    ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY reply_hours))::numeric, 1)::float AS median_reply_hours,
    ROUND((PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY reply_hours))::numeric, 1)::float AS p90_reply_hours
  FROM email_activity WHERE direction = 'in' AND internal_external = 'external' GROUP BY 1, 2 ORDER BY 1, 2`;

sheet('Emails', emails, { subject: 60, from_addr: 35, to_addrs: 40, cc_addrs: 30, activity_rule: 30, opp_name: 35, sent_sydney: 17 });
sheet('Type x mailbox', crosstab(byTypeMailbox, 'activity', 'mb', mailboxes), { activity: 26 });
sheet('Type x month', crosstab(byTypeMonth, 'activity', 'month', months), { activity: 26 });
sheet('Mailbox x month', crosstab(byMailboxMonth, 'mb', 'month', months));
sheet('Hour x weekday', crosstab(byDayHour, 'hour', 'weekday', days).sort((a, b) => (a.hour === 'TOTAL') - (b.hour === 'TOTAL') || Number(a.hour) - Number(b.hour)));
sheet('Senders (inbound)', senders, { sender: 40, sender_domain: 25, top_activity: 24 });
sheet('Clients (matched opps)', clients, { opp_name: 45, top_activity: 24 });
sheet('Response time', response, { activity: 26 });
if (v2) {
  const changes = await sql`
    SELECT activity_v1 AS rules_v1, activity AS rules_v2, COUNT(*)::int AS emails FROM email_activity
    GROUP BY 1, 2 ORDER BY (activity_v1 = activity), emails DESC`;
  sheet('Rules v1 to v2', changes, { rules_v1: 26, rules_v2: 26 });
}
if (v3) {
  const refined = await sql`
    SELECT activity_v2 AS rules_v2, activity AS rules_v3,
      CASE WHEN activity_rule LIKE 'thread:%' THEN 'thread inheritance' WHEN activity_rule LIKE 'sender domain profile%' THEN 'sender domain profile' ELSE 'unchanged' END AS stage,
      COUNT(*)::int AS emails
    FROM email_activity GROUP BY 1, 2, 3 ORDER BY (activity_v2 = activity), emails DESC`;
  sheet('Rules v2 to v3', refined, { rules_v2: 26, rules_v3: 26, stage: 22 });
}
await wb.xlsx.writeFile(file);
console.log(`Wrote ${emails.length} emails to ${file}`);
