// CTRT parity check (batch 4). READ-ONLY: one GET to the running CTRT API, no GHL writes.
// Compares the pipeline-based views with their "<name> NEW" copies on the new mapping.
// Usage: node scripts/ctrt-parity.mjs [baseUrl]   (default http://localhost:3000)
// Writes scripts/tmp-ctrt-out/parity-<date>.md and prints the summary.
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3000';
const FINANCE = 'zgBRaMnACpskyf1wHCEV';
const CONSTRUCTION = 'XMKCHlqekS7IU87PNLKB';
const PROPERTY_TEAM = 'zrb34FRmPnbIyAGFDeXJ';

const res = await fetch(`${BASE}/api/contract-team-reporting`, {
  headers: { 'Cf-Access-Authenticated-User-Email': 'john.t@buyersclub.com.au' },
});
if (!res.ok) { console.error(`CTRT API ${res.status}: ${(await res.text()).slice(0, 300)}`); process.exit(1); }
const body = await res.json();
const rows = Array.isArray(body) ? body : body.records || body.opportunities || body.data;
if (!Array.isArray(rows)) { console.error('Unexpected API shape: ' + Object.keys(body).join(', ')); process.exit(1); }

const v = (r, k) => String(r[k] ?? '').trim();
const yes = (r, k) => v(r, k) !== '';
const lc = (r, k) => v(r, k).toLowerCase();

// Old rule = pipeline membership (API already drops Finance Settled). New rule = computed tracks from the API.
const pairs = [
  { name: 'Finance views (Settlement, Uncon, Finance Tracking)', old: (r) => r.pipelineId === FINANCE, nu: (r) => v(r, 'financeTrack') === 'Yes' },
  { name: 'B&P', old: (r) => r.pipelineId === FINANCE && lc(r, 'typeOfProperty') === 'established', nu: (r) => v(r, 'financeTrack') === 'Yes' && lc(r, 'co_property_type') === 'established' },
  { name: 'Full F&C / Build Deposit', old: (r) => r.pipelineId === FINANCE || r.pipelineId === CONSTRUCTION, nu: (r) => v(r, 'fcTrack') === 'Yes' },
  { name: 'PM Intro (Construction)', old: (r) => r.pipelineId === CONSTRUCTION && lc(r, 'pipelineStage') !== 'handover', nu: (r) => v(r, 'constructionTrack') === 'Yes' && lc(r, 'co_construction_stage') !== 'handover' },
  { name: 'In flight (all views)', old: (r) => v(r, 'inFlight') === 'Yes', nu: (r) => v(r, 'inFlightNew') === 'Yes' },
];

function reason(r) {
  const out = [];
  if (yes(r, 'dealFallenOver')) out.push('Deal Fallen Over');
  if (r.pipelineId === PROPERTY_TEAM && v(r, 'pipelineStage') === 'Settled') out.push('Property Team Settled');
  if (!yes(r, 'financeStatus')) out.push('no Finance Status');
  if (!yes(r, 'co_construction_stage')) out.push('no Construction stage');
  if (!yes(r, 'co_record_id')) out.push('no Property Record');
  if (!yes(r, 'co_property_type')) out.push('no PR property_type');
  return out.join('; ') || 'other';
}

const lines = [`# CTRT parity ${new Date().toISOString()}`, '', `Rows from API: ${rows.length}`, ''];
const summary = [];
lines.push('| Check | Old | NEW | Old only | NEW only |', '|---|---|---|---|---|');
const detail = [];
for (const p of pairs) {
  const o = rows.filter(p.old), n = rows.filter(p.nu);
  const nIds = new Set(n.map((r) => r.id)), oIds = new Set(o.map((r) => r.id));
  const oldOnly = o.filter((r) => !nIds.has(r.id)), newOnly = n.filter((r) => !oIds.has(r.id));
  lines.push(`| ${p.name} | ${o.length} | ${n.length} | ${oldOnly.length} | ${newOnly.length} |`);
  summary.push(`${p.name}: old ${o.length}, NEW ${n.length} (old only ${oldOnly.length}, NEW only ${newOnly.length})`);
  const tally = {};
  for (const r of oldOnly) tally[reason(r)] = (tally[reason(r)] || 0) + 1;
  detail.push(`## ${p.name}`, '', 'Old-only reasons:', ...Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, c]) => `- ${k}: ${c}`), '');
  if (newOnly.length) detail.push('NEW-only:', ...newOnly.slice(0, 50).map((r) => `- ${r.id} ${v(r, 'name')} (${v(r, 'pipelineName')} / ${v(r, 'pipelineStage')})`), '');
}
lines.push('', ...detail);

// Sort order: confirmedSettlementDate ascending, blanks last (as the API returns)
const sorted = rows.map((r) => v(r, 'confirmedSettlementDate'));
let sortBreaks = 0;
for (let i = 1; i < sorted.length; i++) if (sorted[i] && (!sorted[i - 1] || sorted[i - 1] > sorted[i])) sortBreaks++;
lines.push('## Sort order', '', `Out-of-order neighbours by confirmedSettlementDate: ${sortBreaks}`, '');

const inflight = rows.filter((r) => v(r, 'inFlight') === 'Yes');
const dupes = rows.filter((r) => v(r, 'propertyRecordIds').includes(','));
lines.push('## Duplicate Property Records', '', `Opps with 2+ active records: ${dupes.length}`, ...dupes.map((r) => `- ${r.id} ${v(r, 'name')}: ${v(r, 'propertyRecordIds')}`), '');

const cov = (k) => `${inflight.filter((r) => yes(r, k)).length} / ${inflight.length}`;
lines.push('## Coverage on in-flight opps (old rule)', '');
for (const k of ['financeStatus', 'financeStatusChangeDate', 'co_construction_stage', 'co_construction_stage_change_date', 'co_status_change_date', 'co_property_type', 'co_land_registration', 'purchasingEntityName', 'purchasingEntityType', 'valuationRequested', 'valuationExpectedAccessDate', 'valuationBookedDate', 'valuationOutcome']) lines.push(`- ${k}: ${cov(k)}`);
lines.push('');

const reg = {}, badReg = [];
for (const r of rows) {
  const x = v(r, 'co_land_registration');
  const kind = !x ? 'blank (unknown)' : x === 'Registered' ? 'Registered' : x === 'TBC' ? 'TBC' : /^[A-Z][a-z]+ \d{4} approx\.$/.test(x) ? 'Month YYYY approx.' : 'INVALID';
  reg[kind] = (reg[kind] || 0) + 1;
  if (kind === 'INVALID') badReg.push(`- ${r.id} ${v(r, 'name')}: "${x}"`);
}
lines.push('## land_registration values (all rows)', '', ...Object.entries(reg).map(([k, c]) => `- ${k}: ${c}`), '', 'Invalid values:', ...(badReg.length ? badReg : ['- none']), '');

const age = (k) => {
  const d = inflight.filter((r) => v(r, k) !== '').map((r) => Number(r[k])).filter(Number.isFinite);
  const b = { '0-7': 0, '8-30': 0, '31-90': 0, '90+': 0 };
  for (const n of d) b[n <= 7 ? '0-7' : n <= 30 ? '8-30' : n <= 90 ? '31-90' : '90+']++;
  return `${d.length} with a value; ${Object.entries(b).map(([x, c]) => `${x}d ${c}`).join(', ')}`;
};
lines.push('## Change-date ageing (in-flight)', '', `- daysInFinanceStatus: ${age('daysInFinanceStatus')}`, `- daysInConstructionStage: ${age('daysInConstructionStage')}`, `- daysSinceStageChange (old): ${age('daysSinceStageChange')}`, '');

mkdirSync('scripts/tmp-ctrt-out', { recursive: true });
const file = `scripts/tmp-ctrt-out/parity-${new Date().toISOString().slice(0, 10)}.md`;
writeFileSync(file, lines.join('\n'));
console.log(summary.join('\n'));
console.log(`Duplicates: ${dupes.length}; invalid land_registration: ${badReg.length}; sort breaks: ${sortBreaks}`);
console.log(`Report: ${file}`);
