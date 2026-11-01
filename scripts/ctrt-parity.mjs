// CTRT parity check (batch 4). READ-ONLY: one GET to the running CTRT API, no GHL writes.
// Compares the pipeline-based views with their "<name> NEW" copies on the new mapping.
// Usage: node scripts/ctrt-parity.mjs [baseUrl]   (default http://localhost:3000)
// Writes scripts/tmp-ctrt-out/parity-<date>.md and prints the summary.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const BASE = process.argv[2] || 'http://localhost:3000';
const FINANCE = 'zgBRaMnACpskyf1wHCEV';
const CONSTRUCTION = 'XMKCHlqekS7IU87PNLKB';
const PROPERTY_TEAM = 'zrb34FRmPnbIyAGFDeXJ';

// Same request as the CTRT page (shared copy), so the counts can be compared with what the page renders.
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

// ---- Every built-in old view vs its NEW copy, using the view filters read from the CTRT page itself ----
const src = readFileSync('src/app/(tools)/contract-team-reporting/page.tsx', 'utf8');
const sf = ts.createSourceFile('page.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let presetNode, newFiltersNode;
ts.forEachChild(sf, (n) => {
  if (!ts.isVariableStatement(n)) return;
  for (const d of n.declarationList.declarations) {
    if (d.name.getText(sf) === 'PRESET_VIEWS') presetNode = d.initializer;
    if (d.name.getText(sf) === 'NEW_VIEW_FILTERS') newFiltersNode = d.initializer;
  }
});
const PIPELINE_ID = { FINANCE, CONSTRUCTION, PROPERTY_TEAM };
const EXCLUDE_CONSTRUCTION = { field: 'pipelineId', operator: 'not equals', value: CONSTRUCTION };
const IN_FLIGHT_NEW = { field: 'inFlightNew', operator: 'equals', value: 'Yes' };
const evalNode = (node) => new Function('FINANCE_PIPELINE_ID', 'CONSTRUCTION_PIPELINE_ID', 'PIPELINE_ID', 'EXCLUDE_CONSTRUCTION', 'IN_FLIGHT_NEW',
  `return ${ts.transpile(`(${node.getText(sf)})`, { target: ts.ScriptTarget.ES2020 }).trim().replace(/;$/, '')}`)(FINANCE, CONSTRUCTION, PIPELINE_ID, EXCLUDE_CONSTRUCTION, IN_FLIGHT_NEW);
const propOf = (obj, name) => obj.properties.find((p) => p.name && p.name.getText(sf) === name)?.initializer;
const presetViews = presetNode.elements.map((e) => ({ id: evalNode(propOf(e, 'id')), name: evalNode(propOf(e, 'name')), filters: evalNode(propOf(e, 'filters')) }));
// A saved public view with a preset's id replaces it on the page (old view only; NEW copies are built from the preset).
const publicViews = await fetch(`${BASE}/api/contract-team-reporting/views`, { headers: { 'Cf-Access-Authenticated-User-Email': 'john.t@buyersclub.com.au' } })
  .then((r) => r.json()).then((d) => (Array.isArray(d) ? d : d.views || [])).catch(() => []);
const oldViews = presetViews.map((p) => {
  const o = publicViews.find((v) => v.id === p.id);
  return o ? { ...p, oldFilters: o.filters, overridden: true } : { ...p, oldFilters: p.filters };
});
const NEW_VIEW_FILTERS = evalNode(newFiltersNode);
const newFiltersFor = (view) => NEW_VIEW_FILTERS[view.id] ?? [
  ...view.filters.filter((f) => f.field !== 'pipelineId').map((f) => (f.field === 'registeredAddress' ? { ...f, field: 'co_property_address' } : f)),
  { field: 'inFlightNew', operator: 'equals', value: 'Yes' },
];
// Same semantics as applyViewFilters in the CTRT page.
const passes = (r, f) => {
  const c = String(r[f.field] ?? '').toLowerCase().trim(), x = String(f.value).toLowerCase().trim();
  const list = x.split(',').map((s) => s.trim());
  switch (f.operator) {
    case 'equals': return c === x;
    case 'not equals': return c !== x;
    case 'contains': return c.includes(x);
    case 'not contains': return !c.includes(x);
    case 'in': return list.some((i) => c === i || c.includes(i));
    case 'not in': return !list.some((i) => c === i || c.includes(i));
    case 'is blank': return c === '';
    case 'not blank': return c !== '';
    default: return true;
  }
};
const pipeName = (id) => (id === FINANCE ? 'Finance' : id === CONSTRUCTION ? 'Construction' : id === PROPERTY_TEAM ? 'Property Team' : id);
const failed = (r, filters) => filters.filter((f) => !passes(r, f))
  .map((f) => `${f.field === 'pipelineId' ? 'pipeline' : f.field} ${f.operator} "${f.field === 'pipelineId' ? pipeName(f.value) : f.value}" (is "${f.field === 'pipelineId' ? pipeName(r.pipelineId) : v(r, f.field)}")`).join('; ');
const person = (r) => (v(r, 'contactId') || v(r, 'contactName')).toLowerCase();
const financeWithRecord = new Set(rows.filter((r) => r.pipelineId === FINANCE && yes(r, 'co_record_id')).map(person).filter(Boolean));
// Category per difference. EXPECTED = agreed with JT; RULE = needs a rule decision; CHECK = data to look at.
const expected = (r, why) => {
  if (/^zzz|test/i.test(v(r, 'name'))) return 'EXPECTED: test opp';
  if (yes(r, 'dealFallenOver')) return 'EXPECTED: Deal Fallen Over (NEW excludes)';
  if (r.pipelineId === CONSTRUCTION && lc(r, 'pipelineStage') === 'handover') return 'EXPECTED: Construction Handover (not in flight)';
  if (r.pipelineId === CONSTRUCTION && !yes(r, 'co_record_id') && financeWithRecord.has(person(r))) return 'EXPECTED: SMSF Construction duplicate (record on the Finance opp)';
  if (!yes(r, 'co_record_id')) return 'EXPECTED: no Property Record';
  if (!yes(r, 'financeStatus') && r.pipelineId === FINANCE) return /castillo|nadeem ali/i.test(v(r, 'name')) ? 'EXPECTED: blank Finance Status (Castillo / Nadeem Ali)' : 'CHECK: Finance opp with blank Finance Status';
  if (r.pipelineId === CONSTRUCTION && /pipeline equals "Finance"/.test(why)) return 'RULE: Construction opp with Finance Status in NEW Finance views';
  if (/(constructionTrack|fcTrack) equals/.test(why) && !yes(r, 'co_construction_stage')) return 'CHECK: Property Record has no Construction stage';
  if (/address contains/i.test(why)) return 'CHECK: project filter – address differs between Opp and Property Record';
  if (/property_type|typeOfProperty/.test(why)) return 'CHECK: property type differs between Opp and Property Record';
  return 'CHECK: other';
};
const esc = (s) => String(s).replace(/\|/g, '/');
const viewTable = ['| View | Old | NEW (= MINED) | Old only | NEW only | Expected | To check | Days in Finance Status (NEW rows) | Days in Construction stage (NEW rows) |', '|---|---|---|---|---|---|---|---|---|'];
const viewDetail = [];
const viewSummary = [];
for (const view of oldViews) {
  const nf = newFiltersFor(view);
  const o = rows.filter((r) => view.oldFilters.every((f) => passes(r, f))), n = rows.filter((r) => nf.every((f) => passes(r, f)));
  const oIds = new Set(o.map((r) => r.id)), nIds = new Set(n.map((r) => r.id));
  const diffs = [
    ...o.filter((r) => !nIds.has(r.id)).map((r) => ({ r, side: 'Old only', why: failed(r, nf) })),
    ...n.filter((r) => !oIds.has(r.id)).map((r) => ({ r, side: 'NEW only', why: failed(r, view.oldFilters) })),
  ].map((d) => ({ ...d, tag: expected(d.r, d.why) }));
  const toCheck = diffs.filter((d) => !d.tag.startsWith('EXPECTED')).length;
  const has = (k) => `${n.filter((r) => yes(r, k)).length} / ${n.length}`;
  viewTable.push(`| ${view.name} | ${o.length} | ${n.length} | ${diffs.filter((d) => d.side === 'Old only').length} | ${diffs.filter((d) => d.side === 'NEW only').length} | ${diffs.length - toCheck} | ${toCheck} | ${has('daysInFinanceStatus')} | ${has('daysInConstructionStage')} |`);
  const cats = {};
  for (const d of diffs) cats[`${d.side}: ${d.tag}`] = (cats[`${d.side}: ${d.tag}`] || 0) + 1;
  viewSummary.push(`${view.name}: old ${o.length}, NEW ${n.length}, differences ${diffs.length} (to check ${toCheck})`,
    ...Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, c]) => `    ${c} ${k}`));
  viewDetail.push(`### ${view.name}`, '', `Old filters${view.overridden ? ' (saved public version)' : ''}: ${view.oldFilters.map((f) => `${f.field} ${f.operator} ${f.field === 'pipelineId' ? pipeName(f.value) : `"${f.value}"`}`).join(' AND ')}`, `NEW filters: ${nf.map((f) => `${f.field} ${f.operator} "${f.value}"`).join(' AND ')}`, '');
  if (diffs.length) {
    viewDetail.push('| Side | Opportunity | Pipeline / Stage | Finance Status | PR status | Category | Why (filter it fails) |', '|---|---|---|---|---|---|---|');
    for (const d of diffs.sort((a, b) => a.tag.localeCompare(b.tag) || v(a.r, 'name').localeCompare(v(b.r, 'name')))) {
      viewDetail.push(`| ${d.side} | ${esc(v(d.r, 'name'))} | ${esc(v(d.r, 'pipelineName'))} / ${esc(v(d.r, 'pipelineStage'))} | ${esc(v(d.r, 'financeStatus')) || '-'} | ${esc(v(d.r, 'co_status')) || '-'} | ${d.tag} | ${esc(d.why)} |`);
    }
    viewDetail.push('');
  } else viewDetail.push('No differences.', '');
}
const inNew = rows.filter((r) => v(r, 'inFlightNew') === 'Yes');
const fin = inNew.filter((r) => yes(r, 'financeStatus')), con = inNew.filter((r) => yes(r, 'co_construction_stage'));
const coverage = [
  `- Days in Finance Status: ${fin.filter((r) => yes(r, 'daysInFinanceStatus')).length} of ${fin.length} in-flight opps with a Finance Status (${inNew.filter((r) => yes(r, 'daysInFinanceStatus')).length} of ${inNew.length} in-flight overall)`,
  `- Days in Construction stage: ${con.filter((r) => yes(r, 'daysInConstructionStage')).length} of ${con.length} in-flight opps with a Construction stage (${inNew.filter((r) => yes(r, 'daysInConstructionStage')).length} of ${inNew.length} in-flight overall)`,
];
lines.splice(4, 0, '## Old view vs NEW copy', '', 'MINED copies use the same filters as NEW, so their rows equal NEW.', '', ...viewTable, '', '## Days-in coverage (in-flight, NEW rule)', '', ...coverage, '', '## Differences per view', '', ...viewDetail, '## Rule-level checks', '');
summary.unshift(...viewSummary, ...coverage, '');

mkdirSync('scripts/tmp-ctrt-out', { recursive: true });
const file = `scripts/tmp-ctrt-out/parity-${new Date().toISOString().slice(0, 10)}.md`;
writeFileSync(file, lines.join('\n'));
console.log(summary.join('\n'));
console.log(`Duplicates: ${dupes.length}; invalid land_registration: ${badReg.length}; sort breaks: ${sortBreaks}`);
console.log(`Report: ${file}`);
