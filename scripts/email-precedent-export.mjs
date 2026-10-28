// Backlog 21 export: latest email_precedent summary -> xlsx in G:\My Drive\Purchase Data Reconstruction\07 Email mining\
// Usage (repo root): node scripts/email-precedent-export.mjs
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import ExcelJS from 'exceljs';

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) throw new Error('DATABASE_URL / POSTGRES_URL is not set in .env.local');
const sql = neon(url);
const OUT_DIR = process.env.EMAIL_MINING_DIR || 'G:\\My Drive\\Purchase Data Reconstruction\\07 Email mining';
const [row] = await sql`SELECT summary FROM email_precedent ORDER BY built_at DESC LIMIT 1`;
if (!row) throw new Error('No precedent built yet: POST /api/inbox-mining/precedent first');
const s = row.summary;
const stamp = new Date(s.builtAt).toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
const file = `${OUT_DIR}\\email-precedent_${stamp}.xlsx`;
const p = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);

const wb = new ExcelJS.Workbook();
function sheet(name, rows) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  if (!rows.length) { ws.addRow(['(no rows)']); return; }
  const cols = Object.keys(rows[0]);
  ws.columns = cols.map((k) => ({ header: k, key: k, width: Math.min(45, Math.max(10, k.length + 2)) }));
  ws.addRows(rows);
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
}

sheet('Type actions', s.types.map((t) => ({
  activity_type: t.type, emails: t.emails, opps: t.opps,
  field_changed: t.fieldChanged, field_changed_pct: p(t.fieldChanged, t.emails),
  reply_sent: t.replied, reply_sent_pct: p(t.replied, t.emails),
  note_or_task: t.noteTask, note_or_task_pct: p(t.noteTask, t.emails),
  nothing: t.nothing, nothing_pct: p(t.nothing, t.emails),
  stage_moved: t.stageMoved, median_reply_hours: t.medianReplyHrs,
  top_event_date_field: t.dateFields.find((f) => !f.schedule)?.name || '',
  top_event_date_field_pct: t.dateFields.find((f) => !f.schedule) ? p(t.dateFields.find((f) => !f.schedule).hits, t.emails) : null,
  thin: t.emails < s.minEmails ? 'yes' : '',
})));
sheet('Type x date field', s.types.flatMap((t) => t.dateFields.map((f) => ({
  activity_type: t.type, emails: t.emails, date_field: f.name, scheduled_date: f.schedule ? 'yes (not counted)' : '', hits: f.hits, hit_pct: p(f.hits, t.emails), median_days: f.medianDays,
}))));
sheet('Suggested fields now', s.types.flatMap((t) => t.current.map((f) => ({
  activity_type: t.type, field: f.name, opps: f.opps, set: f.set, set_pct: p(f.set, f.opps), top_values: f.top.map(([v, n]) => `${v} (${n})`).join('; '),
}))));
sheet('About', [
  { item: 'Built', value: s.builtAt },
  { item: 'Emails', value: `${s.emails} inbound June-Oct emails matched to an opportunity by name (a guide, not checked)` },
  { item: 'Window', value: `${s.windowDays} days after the email; date fields count from 2 days before (they often hold the event date)` },
  { item: 'Field changed', value: 'A GHL opportunity event date (not a due / expiry / ETA / scheduled / settlement date) within the window, or the last stage move within the window' },
  { item: 'Baseline', value: 'Notes, tasks and dates are frequent on active deals anyway; the noise row is a rough baseline' },
  { item: 'Reply sent', value: 'A reply from the same mailbox in the same thread within the window (email_activity reply_hours)' },
  { item: 'Note or task', value: `A note or task on the opportunity's contact within the window (${s.contacts} contacts read, ${s.contactErrors} unreadable)` },
  { item: 'Nothing', value: 'None of the above' },
  { item: 'Limits', value: 'GHL keeps no change history: a date field shows only its latest date; Yes/No fields have no timing; only the last stage move is known' },
  { item: 'Thresholds', value: `Under ${s.minEmails} emails = thin; suggestions on thin types or under ${s.minRate * 100}% are flagged "no precedent"` },
]);
await wb.xlsx.writeFile(file);
console.log('Wrote', file);
