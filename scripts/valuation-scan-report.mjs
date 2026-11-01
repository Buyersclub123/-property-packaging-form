// Builds the valuation mail scan report (markdown) from the JSON saved by
// GET /api/inbox-mining/valuation-scan?mailbox=... (one file per mailbox). Read-only; writes only the report file.
// Usage: node scripts/valuation-scan-report.mjs <dir-with-valscan-*.json> <out.md> [days, default 7]
// A mailbox may have several chunk files (valscan-<mailbox>-NN.json from valuation-scan-run.mjs).
import fs from 'node:fs';
import path from 'node:path';

const [dir, out, daysArg] = process.argv.slice(2);
const DAYS = parseInt(daysArg || '7', 10);
const MAILBOXES = ['property', 'contracts', 'construction', 'sydney.m'];
const FIELDS = [
  ['valuation_access_estimate', 'Valuation access estimate (Month YYYY)'],
  ['valuation_access_available', 'Valuation access available'],
  ['valuation_expected_access_date', 'Valuation access available date from'],
  ['valuation_requested', 'Valuation requested'],
  ['valuation_requested_date', 'Valuation requested date'],
  ['valuation_booked_date', 'Valuation booked date'],
  ['valuation_attended', 'Valuation attended'],
  ['valuation_attended_date', 'Valuation attended date'],
  ['valuation_outcome', 'Valuation outcome'],
  ['valuation_amount_residential', 'Valuation amount (residential)'],
];
const label = Object.fromEntries(FIELDS);

const syd = (iso) =>
  new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const who = (s) => esc(s.replace(/"/g, '').replace(/\s*<mailto:[^>]+>/g, '')).slice(0, 60);
const key = (q) => q.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 200);

let listed = 0;
const scanned = {};
const groups = new Map();
const seen = new Map();
const files = fs.readdirSync(dir);
for (const m of MAILBOXES) {
  scanned[m] = 0;
  const mine = files.filter((f) => f === `valscan-${m}.json` || (f.startsWith(`valscan-${m}-`) && f.endsWith('.json')));
  if (!mine.length) throw new Error(`no scan files for ${m} in ${dir}`);
  const threads = [];
  for (const f of mine.sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (j.error) throw new Error(`${f}: ${j.error}`);
    listed += j.listed;
    scanned[m] += j.listed;
    threads.push(...j.threads);
  }
  for (const t of threads) {
    const gk = t.opp ? `opp:${t.opp.id}` : `subj:${t.subject.replace(/^((re|fw|fwd)\s*:\s*)+/i, '').toLowerCase().trim()}`;
    const g = groups.get(gk) || { opp: t.opp, cands: t.oppCandidates, current: t.current, subject: t.subject, ev: [] };
    if (t.opp && !Object.keys(g.current || {}).length) g.current = t.current;
    groups.set(gk, g);
    for (const e of t.evidence) {
      const k = key(e.quote);
      const prev = seen.get(k);
      if (prev) {
        if (!prev.mailboxes.includes(m)) prev.mailboxes.push(m);
        continue;
      }
      const row = { ...e, mailboxes: [m] };
      seen.set(k, row);
      g.ev.push(row);
    }
  }
}

const proposes = (e) => e.hits.filter((h) => h.kind === 'propose');
const all = Array.from(groups.values()).filter((g) => g.ev.length);
const withProp = all.filter((g) => g.ev.some((e) => proposes(e).length));
const contextOnly = all.filter((g) => !g.ev.some((e) => proposes(e).length));
const matched = (gs) => gs.filter((g) => g.opp);

// Per field: opportunities with a proposal and evidence items.
const perField = Object.fromEntries(FIELDS.map(([f]) => [f, { opps: new Set(), items: 0, unmatched: 0 }]));
for (const g of withProp) {
  for (const e of g.ev) {
    for (const h of proposes(e)) {
      perField[h.field].items++;
      if (g.opp) perField[h.field].opps.add(g.opp.id);
      else perField[h.field].unmatched++;
    }
  }
}
// What the miner would have filled: per matched opportunity and field, the latest proposal vs the live GHL value.
const norm = (f, v) => {
  const s = String(v ?? '').trim().toLowerCase();
  if (/_date$/.test(f)) return s.slice(0, 10);
  if (f === 'valuation_amount_residential') return s.replace(/[^0-9.]/g, '').replace(/\.0+$/, '');
  return s;
};
const fill = Object.fromEntries(FIELDS.map(([f]) => [f, { fill: 0, same: 0, differs: 0, undated: 0 }]));
const latest = [];
for (const g of matched(withProp)) {
  const best = {};
  for (const e of g.ev) for (const h of proposes(e)) if (!best[h.field] || e.at > best[h.field].e.at) best[h.field] = { e, h };
  for (const [f, { e, h }] of Object.entries(best)) {
    const cur = g.current?.[f] || '';
    if (/not stated/.test(h.proposed)) { fill[f].undated++; continue; }
    const state = !cur ? 'fill' : norm(f, cur) === norm(f, h.proposed) ? 'same' : 'differs';
    fill[f][state]++;
    latest.push({ opp: g.opp.name, field: f, proposed: h.proposed, cur, state, at: e.at, by: e.by, quote: e.quote });
  }
}
const ctxCounts = {};
for (const g of all) for (const e of g.ev) for (const h of e.hits) if (h.kind === 'context') ctxCounts[h.rule] = (ctxCounts[h.rule] || 0) + 1;

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
const L = [];
L.push(`# Valuation fields: evidence in the last ${DAYS} days of mail (${today})`);
L.push('');
L.push('Read-only scan. Gmail and GHL were only read; nothing was written to GHL, nothing was sent, no Gmail state changed.');
L.push('');
L.push('## Copy-paste summary');
L.push('');
L.push('```');
L.push(`Valuation mail scan, last ${DAYS} days (${today}), mailboxes: property@, contracts@, construction@, sydney.m@`);
L.push(`Emails mentioning valuation/valuer: ${listed} (${MAILBOXES.map((m) => `${m} ${scanned[m]}`).join(', ')}; the same thread often sits in several mailboxes)`);
L.push(`Threads/opportunities with valuation wording in the window: ${all.length} (${matched(all).length} matched to an opportunity)`);
L.push(`With a value the tool would propose: ${withProp.length} (${matched(withProp).length} matched)`);
L.push('');
L.push('Field                                   Opps  Evidence  Would fill (GHL empty)  Same as GHL  Differs from GHL');
for (const [f, l] of FIELDS) {
  const x = fill[f];
  L.push(`${l.padEnd(40)}${String(perField[f].opps.size).padStart(4)}  ${String(perField[f].items).padStart(8)}  ${String(x.fill).padStart(22)}  ${String(x.same).padStart(11)}  ${String(x.differs).padStart(16)}${perField[f].unmatched ? `   (+${perField[f].unmatched} evidence unmatched)` : ''}${x.undated ? `   (${x.undated} booked, no date)` : ''}`);
}
L.push('Opps / Would fill / Same / Differs use the latest proposal per opportunity and field; Evidence counts every quote.');
L.push('');
L.push('Valuation wording with no field to propose:');
for (const [r, n] of Object.entries(ctxCounts).sort((a, b) => b[1] - a[1])) L.push(`  ${String(n).padStart(3)}  ${r}`);
L.push('```');
L.push('');
L.push('## How it was read');
L.push('');
L.push('- Gmail search per mailbox for valuation / valuations / valuer / valuers / valued / valuation attachments, last 7 days (Sydney).');
L.push('- Each email is split into its own text and its quoted replies; a quoted reply counts only if its own header date is inside the 7 days, and is attributed to the person in that header. The same sentence seen in several mailboxes is listed once.');
L.push('- PDF attachments with "valu" in the name are read; nothing else is opened.');
L.push('- Builder/broker boilerplate is ignored (e.g. "If a Valuation Inspection is required…", "Your Finance broker will order a valuation…", "valued clients").');
L.push('- Construction progress/final-payment valuations (progress claim, PCI, lock-up, final account) are listed but not proposed: they are not the purchase valuation these fields track.');
L.push('- Opportunity: the inbox queue match (grade A/B/C) where the email is in the queue, otherwise client name in the subject, lot + street in the subject, or client name in the body. Test, portfolio-review and staff-named opportunities are excluded.');
L.push('- "Current GHL" is the live value on the matched opportunity at scan time.');
L.push('');
L.push('## What the miner would have filled (latest proposal per opportunity and field)');
L.push('');
L.push('| Opportunity | Field | Proposed | Current GHL | State | Latest evidence (Sydney) | Sender | Quote |');
L.push('|---|---|---|---|---|---|---|---|');
for (const r of latest.sort((a, b) => a.opp.localeCompare(b.opp) || a.field.localeCompare(b.field))) {
  L.push(`| ${esc(r.opp)} | ${label[r.field]} | ${esc(r.proposed)} | ${esc(r.cur) || '(empty)'} | ${{ fill: 'would fill', same: 'same as GHL', differs: 'differs' }[r.state]} | ${syd(r.at)} | ${who(r.by)} | "${esc(r.quote).slice(0, 220)}" |`);
}
L.push('');
L.push('## Per opportunity: values the tool would propose');
L.push('');
if (!withProp.length) L.push('None.');
for (const g of withProp.sort((a, b) => (a.opp?.name || 'zz').localeCompare(b.opp?.name || 'zz'))) {
  L.push(`### ${g.opp ? `${esc(g.opp.name)} (${esc(g.opp.pipeline)} / ${esc(g.opp.stage)}; matched by ${esc(g.opp.how)})` : `Unmatched: ${esc(g.subject)}${g.cands.length ? ` (candidates: ${esc(g.cands.join('; '))})` : ''}`}`);
  L.push('');
  L.push('| Received (Sydney) | Mailbox | Sender | Subject | Source | Quote | Field | Proposed | Current GHL | Rule |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const e of g.ev.sort((a, b) => a.at.localeCompare(b.at))) {
    const ps = proposes(e);
    const base = `| ${syd(e.at)} | ${e.mailboxes.join(', ')} | ${who(e.by)} | ${esc(e.subject).slice(0, 90)} | ${esc(e.source)} | "${esc(e.quote)}" |`;
    if (!ps.length) {
      L.push(`${base} – | – | – | ${esc(e.hits.map((h) => h.rule).join('; '))} |`);
      continue;
    }
    for (const h of ps) L.push(`${base} ${label[h.field]} | ${esc(h.proposed)} | ${g.opp ? esc(g.current?.[h.field]) || '(empty)' : 'n/a'} | ${esc(h.rule)} |`);
  }
  L.push('');
}
L.push('## Valuation wording with nothing to propose');
L.push('');
L.push('| Opportunity | Received (Sydney) | Mailbox | Sender | Subject | Source | Quote | Why nothing is proposed |');
L.push('|---|---|---|---|---|---|---|---|');
for (const g of contextOnly.sort((a, b) => (a.opp?.name || 'zz').localeCompare(b.opp?.name || 'zz'))) {
  for (const e of g.ev.sort((a, b) => a.at.localeCompare(b.at))) {
    L.push(`| ${g.opp ? esc(g.opp.name) : 'unmatched'} | ${syd(e.at)} | ${e.mailboxes.join(', ')} | ${who(e.by)} | ${esc(e.subject).slice(0, 90)} | ${esc(e.source)} | "${esc(e.quote).slice(0, 260)}" | ${esc(e.hits.map((h) => h.rule).join('; '))} |`);
  }
}
L.push('');
fs.writeFileSync(out, L.join('\n'));
console.log(L.slice(L.indexOf('```') + 1, L.lastIndexOf('```')).join('\n'));
