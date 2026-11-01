// Project tagging (JT 1/11). Reads the project view tabs of the "Contract Team GHL extract & reports" sheet,
// finds every Property Record whose opportunity / Registered Address is on a tab but whose project_name is blank,
// and every record whose project_name is an alias of a project (e.g. "Ocean Rise Estate" -> "Ocean Rise").
//   default   : DRY RUN — writes scripts/tmp-ctrt-out/project-tagging-<date>.md, no writes anywhere
//   --seed    : also seeds Deal Sheet → Admin → Projects (our DB only; existing rows untouched)
//   --apply   : writes co_project_name through the CTRT update API (JT's go), then reads every record back
// Usage: node scripts/project-tagging.mjs [baseUrl] [--seed] [--apply]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { google } from 'googleapis';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const BASE = process.argv.slice(2).find((a) => a.startsWith('http')) || 'http://localhost:3000';
const SEED = process.argv.includes('--seed');
const APPLY = process.argv.includes('--apply');
const SHEET = '1P-EcxoPm4xmKKzDG_Jq6FhcUW_b4igBoeOvromsS6r0';
const H = { 'Cf-Access-Authenticated-User-Email': 'john.t@buyersclub.com.au' };
// Sheet tab -> project (name in Admin → Projects) and the aliases its view also matches.
const PROJECTS = [
  { tab: 'View: Ocean Rise', name: 'Ocean Rise', estate_suburb: 'Urangan', state: 'QLD', aliases: 'Ocean Rise Estate' },
  { tab: 'View: Huntly VIC', name: 'Huntly VIC', estate_suburb: 'Huntly', state: 'VIC', aliases: 'Harlowe, Harlowe Estate' },
  { tab: 'View: Golden Horizon Bundaberg', name: 'Golden Horizon Bundaberg', estate_suburb: 'Bundaberg', state: 'QLD', aliases: 'Golden Horizon' },
  { tab: 'View: Murray Bridge-Moira', name: 'Murray Bridge-Moira', estate_suburb: 'Murray Bridge', state: 'SA', aliases: 'Moira' },
  { tab: 'View: Weir Views', name: 'Weir Views', estate_suburb: '', state: '', aliases: '' },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sheet access: the mailbox-reader service account acting as john.t@ (the sheet is not shared with the app's own service account).
const creds = JSON.parse(process.env.GMAIL_READER_CREDENTIALS || '{}');
const auth = new google.auth.JWT({ email: creds.client_email, key: creds.private_key, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], subject: 'john.t@buyersclub.com.au' });
const sheets = google.sheets({ version: 'v4', auth });

const getJson = async (path, init) => {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...H, ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
};
const rows = await getJson('/api/contract-team-reporting?fresh=1');
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const byOpp = new Map(rows.map((r) => [r.id, r]));
const byAddr = new Map();
for (const r of rows) for (const a of [r.registeredAddress, r.co_property_address]) if (norm(a)) byAddr.set(norm(a), r);
const aliasesOf = (p) => p.aliases.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

if (SEED) {
  const covered = (p, v) => [p.name.toLowerCase(), ...aliasesOf(p)].some((t) => v.toLowerCase().includes(t));
  const others = [...new Set(rows.map((r) => (r.co_project_name || '').trim()).filter(Boolean))].filter((n) => !PROJECTS.some((p) => covered(p, n)));
  const res = await getJson('/api/deal-sheet/project-names', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'seed', projects: [...PROJECTS.map(({ tab, ...p }) => p), ...others.map((name) => ({ name }))] }),
  });
  console.log(`Seeded Projects: ${res.projects.length} rows (${PROJECTS.length} sheet tabs + ${others.length} names already on records)`);
}

// Planned writes: tag (blank -> project) and rename (alias -> project name). One write per record.
const writes = [];
const seen = new Set();
const summary = [];
for (const p of PROJECTS) {
  const v = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${p.tab}'!A1:Z1000` });
  const [header = [], ...data] = v.data.values || [];
  const col = (name) => header.findIndex((h) => String(h).trim().toLowerCase() === name);
  const iLink = col('ghl link'), iAddr = col('registered address');
  let unmatched = 0, noRecord = 0, named = 0, tag = 0;
  for (const row of data) {
    const addr = row[iAddr] || '', link = row[iLink] || '';
    if (!addr && !link) continue;
    const oppId = (link.match(/opportunities\/([A-Za-z0-9]+)/) || [])[1];
    const r = (oppId && byOpp.get(oppId)) || byAddr.get(norm(addr));
    if (!r) { unmatched++; continue; }
    if (!r.co_record_id) { noRecord++; continue; }
    if (String(r.co_project_name || '').trim()) { named++; continue; }
    if (seen.has(r.co_record_id)) continue;
    seen.add(r.co_record_id);
    tag++;
    writes.push({ kind: 'Tag', project: p.name, r, from: '', to: p.name, source: addr });
  }
  const renames = rows.filter((r) => r.co_record_id && !seen.has(r.co_record_id) && aliasesOf(p).includes(String(r.co_project_name || '').trim().toLowerCase()));
  for (const r of renames) {
    seen.add(r.co_record_id);
    writes.push({ kind: 'Rename', project: p.name, r, from: r.co_project_name, to: p.name, source: 'alias' });
  }
  summary.push(`${p.name}: ${tag} to tag, ${renames.length} to rename, ${named} already named on the tab, ${noRecord} no record, ${unmatched} not in CTRT`);
}

for (const w of writes) {
  if (!APPLY) { w.result = 'dry run'; continue; }
  const res = await fetch(`${BASE}/api/contract-team-reporting/update`, {
    method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ opportunityId: w.r.id, propertyRecordId: w.r.co_record_id, changes: { co_project_name: w.to } }),
  });
  w.result = res.ok ? 'written' : `FAILED ${res.status}: ${(await res.text()).slice(0, 120)}`;
}
if (APPLY) {
  // Read back from GHL (fresh CTRT build; GHL search can lag a little, so wait first and retry once).
  for (let attempt = 0; attempt < 2; attempt++) {
    await sleep(60000);
    const fresh = new Map((await getJson('/api/contract-team-reporting?fresh=1')).map((r) => [r.id, r]));
    for (const w of writes) w.readBack = String(fresh.get(w.r.id)?.co_project_name ?? '(opp not found)');
    if (writes.every((w) => w.readBack === w.to || !w.result.startsWith('written'))) break;
  }
}

const esc = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');
const lines = [`# Project tagging ${APPLY ? 'APPLY' : 'DRY RUN'} ${new Date().toISOString()}`, '', ...summary.map((s) => `- ${s}`), '',
  '| Action | Project | Opportunity | Record ID | From | To | Write | Read back |', '|---|---|---|---|---|---|---|---|'];
for (const w of writes) {
  const ok = !APPLY ? '' : w.readBack === w.to ? `OK (${esc(w.readBack)})` : `MISMATCH ("${esc(w.readBack)}")`;
  lines.push(`| ${w.kind} | ${esc(w.project)} | ${esc(w.r.name)} | ${w.r.co_record_id} | ${esc(w.from) || '-'} | ${esc(w.to)} | ${esc(w.result)} | ${ok} |`);
}
const count = (f) => writes.filter(f).length;
const totals = `Tag ${count((w) => w.kind === 'Tag')}, Rename ${count((w) => w.kind === 'Rename')}; written ${count((w) => w.result === 'written')}, failed ${count((w) => w.result.startsWith('FAILED'))}` +
  (APPLY ? `; read back OK ${count((w) => w.readBack === w.to)}, mismatch ${count((w) => w.result === 'written' && w.readBack !== w.to)}` : '');
lines.push('', totals);
mkdirSync('scripts/tmp-ctrt-out', { recursive: true });
const file = `scripts/tmp-ctrt-out/project-tagging-${new Date().toISOString().slice(0, 10)}${APPLY ? '-apply' : ''}.md`;
writeFileSync(file, lines.join('\n'));
console.log(summary.join('\n'));
console.log(totals);
console.log(`Report: ${file}`);
