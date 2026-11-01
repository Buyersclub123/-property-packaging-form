// Project tagging (JT 1/11). Reads the project view tabs of the "Contract Team GHL extract & reports" sheet,
// finds every Property Record whose opportunity / Registered Address is on a tab but whose project_name is blank.
//   default   : DRY RUN — writes scripts/tmp-ctrt-out/project-tagging-<date>.md, no writes anywhere
//   --seed    : also seeds Deal Sheet → Admin → Projects (our DB only; existing rows untouched)
//   --apply   : writes co_project_name through the CTRT update API (only on JT's go)
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

// Sheet access: the mailbox-reader service account acting as john.t@ (the sheet is not shared with the app's own service account).
const creds = JSON.parse(process.env.GMAIL_READER_CREDENTIALS || '{}');
const auth = new google.auth.JWT({ email: creds.client_email, key: creds.private_key, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], subject: 'john.t@buyersclub.com.au' });
const sheets = google.sheets({ version: 'v4', auth });

const getJson = async (path, init) => {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...H, ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
};
const rows = await getJson('/api/contract-team-reporting');
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const byOpp = new Map(rows.map((r) => [r.id, r]));
const byAddr = new Map();
for (const r of rows) for (const a of [r.registeredAddress, r.co_property_address]) if (norm(a)) byAddr.set(norm(a), r);

if (SEED) {
  const covered = (p, v) => [p.name, ...p.aliases.split(',')].map((s) => s.trim().toLowerCase()).filter(Boolean).some((t) => v.toLowerCase().includes(t));
  const others = [...new Set(rows.map((r) => (r.co_project_name || '').trim()).filter(Boolean))].filter((n) => !PROJECTS.some((p) => covered(p, n)));
  const res = await getJson('/api/deal-sheet/project-names', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'seed', projects: [...PROJECTS.map(({ tab, ...p }) => p), ...others.map((name) => ({ name }))] }),
  });
  console.log(`Seeded Projects: ${res.projects.length} rows (${PROJECTS.length} sheet tabs + ${others.length} names already on records)`);
}

const esc = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');
const lines = [`# Project tagging ${APPLY ? 'APPLY' : 'DRY RUN'} ${new Date().toISOString()}`, ''];
const summary = [];
for (const p of PROJECTS) {
  const v = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${p.tab}'!A1:Z1000` });
  const [header = [], ...data] = v.data.values || [];
  const col = (name) => header.findIndex((h) => String(h).trim().toLowerCase() === name);
  const iLink = col('ghl link'), iAddr = col('registered address'), iName = col('opportunity name');
  const items = [];
  let unmatched = 0;
  for (const row of data) {
    const addr = row[iAddr] || '', link = row[iLink] || '';
    if (!addr && !link) continue;
    const oppId = (link.match(/opportunities\/([A-Za-z0-9]+)/) || [])[1];
    const r = (oppId && byOpp.get(oppId)) || byAddr.get(norm(addr));
    if (!r) { unmatched++; continue; }
    items.push({ r, addr, sheetName: row[iName] || '' });
  }
  const todo = items.filter((x) => x.r.co_record_id && !String(x.r.co_project_name || '').trim());
  const noRecord = items.filter((x) => !x.r.co_record_id);
  const other = items.filter((x) => x.r.co_record_id && String(x.r.co_project_name || '').trim());
  lines.push(`## ${p.name} (tab "${p.tab}")`, '',
    `${data.filter((r) => r[iAddr] || r[iLink]).length} sheet rows · ${todo.length} records to tag · ${other.length} already have a project name · ${noRecord.length} opps with no Property Record · ${unmatched} not found in the CTRT (closed / settled)`, '');
  if (todo.length) {
    lines.push('| Opportunity | Registered Address (sheet) | Record address | Pipeline / Stage | Result |', '|---|---|---|---|---|');
    for (const x of todo.sort((a, b) => String(a.r.name).localeCompare(String(b.r.name)))) {
      let result = 'dry run';
      if (APPLY) {
        const res = await fetch(`${BASE}/api/contract-team-reporting/update`, {
          method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' },
          body: JSON.stringify({ opportunityId: x.r.id, propertyRecordId: x.r.co_record_id, changes: { co_project_name: p.name } }),
        });
        result = res.ok ? 'written' : `FAILED ${res.status}: ${(await res.text()).slice(0, 120)}`;
      }
      lines.push(`| ${esc(x.r.name)} | ${esc(x.addr)} | ${esc(x.r.co_property_address)} | ${esc(x.r.pipelineName)} / ${esc(x.r.pipelineStage)} | ${esc(result)} |`);
    }
    lines.push('');
  }
  if (other.length) lines.push('Already named: ' + [...new Set(other.map((x) => x.r.co_project_name))].map((n) => `"${n}" ×${other.filter((x) => x.r.co_project_name === n).length}`).join(', '), '');
  summary.push(`${p.name}: ${todo.length} to tag, ${other.length} named, ${noRecord.length} no record, ${unmatched} not in CTRT`);
}
mkdirSync('scripts/tmp-ctrt-out', { recursive: true });
const file = `scripts/tmp-ctrt-out/project-tagging-${new Date().toISOString().slice(0, 10)}${APPLY ? '-apply' : ''}.md`;
writeFileSync(file, lines.join('\n'));
console.log(summary.join('\n'));
console.log(`Report: ${file}`);
