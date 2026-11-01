// Construction stage backfill (JT 1/11). Construction-pipeline opps whose Property Record has a blank construction_stage:
//   - copy the opp's Construction pipeline stage into the record's construction_stage
//   - set Finance Status = Not Tracked where the contact has no Finance opp and Finance Status is blank.
// DRY RUN by default (no writes). --apply writes through the CTRT update API (same rules and change-date stamps as a CTRT edit).
// Usage: node scripts/construction-stage-backfill.mjs [baseUrl] [--apply]
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.argv.slice(2).find((a) => a.startsWith('http')) || 'http://localhost:3000';
const APPLY = process.argv.includes('--apply');
const FINANCE = 'zgBRaMnACpskyf1wHCEV';
const CONSTRUCTION = 'XMKCHlqekS7IU87PNLKB';
const FINANCE_STATUS_FIELD_ID = 'zTgTXnbDCLlXs3Ehx9sl';
const H = { 'Cf-Access-Authenticated-User-Email': 'john.t@buyersclub.com.au' };

const getJson = async (path) => {
  const res = await fetch(`${BASE}${path}`, { headers: H });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
};
const rows = await getJson('/api/contract-team-reporting?fresh=1');
const schema = await getJson('/api/contract-team-reporting/schema');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const stageOptions = schema.propertyFields.find((f) => f.key === 'construction_stage')?.options || [];
const notTracked = (schema.opportunityFields.find((f) => f.id === FINANCE_STATUS_FIELD_ID)?.options || [])
  .find((o) => /not\s*tracked/i.test(o.label || o.key));
if (!stageOptions.length) throw new Error('construction_stage options not found in the Property Record schema');
if (!notTracked) throw new Error('"Not Tracked" not found in the Finance Status options');

const person = (r) => String(r.contactEmail || r.contactName || '').toLowerCase().trim();
const financePeople = new Set(rows.filter((r) => r.pipelineId === FINANCE).map(person).filter(Boolean));

const plan = rows
  .filter((r) => r.pipelineId === CONSTRUCTION && r.co_record_id && !r.co_construction_stage)
  .map((r) => {
    const opt = stageOptions.find((o) => norm(o.key) === norm(r.pipelineStage) || norm(o.label) === norm(r.pipelineStage));
    const hasFinanceOpp = financePeople.has(person(r));
    const changes = {};
    if (opt) changes.co_construction_stage = opt.key;
    if (!hasFinanceOpp && !r.financeStatus) changes.financeStatus = notTracked.label || notTracked.key;
    return { r, opt, hasFinanceOpp, changes };
  })
  .sort((a, b) => String(a.r.name).localeCompare(String(b.r.name)));

const esc = (s) => String(s ?? '').replace(/\|/g, '/');
const lines = [
  `# Construction stage backfill ${APPLY ? 'APPLY' : 'DRY RUN'} ${new Date().toISOString()}`, '',
  `${plan.length} Construction opps with a Property Record whose construction_stage is blank.`, '',
  '| Opportunity | Opp stage | Record stage to write | Finance opp? | Finance Status now | Finance Status to write | Result |',
  '|---|---|---|---|---|---|---|',
];
for (const p of plan) {
  let result = APPLY ? '' : 'dry run';
  if (!p.opt) result = 'SKIPPED: no matching construction_stage option';
  else if (APPLY) {
    const res = await fetch(`${BASE}/api/contract-team-reporting/update`, {
      method: 'PUT',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunityId: p.r.id, propertyRecordId: p.r.co_record_id, changes: p.changes }),
    });
    result = res.ok ? 'written' : `FAILED ${res.status}: ${(await res.text()).slice(0, 120)}`;
  }
  lines.push(`| ${esc(p.r.name)} | ${esc(p.r.pipelineStage)} | ${p.opt ? `${esc(p.opt.label)} (${p.opt.key})` : '-'} | ${p.hasFinanceOpp ? 'Yes' : 'No'} | ${esc(p.r.financeStatus) || '-'} | ${esc(p.changes.financeStatus) || '-'} | ${esc(result)} |`);
}
mkdirSync('scripts/tmp-ctrt-out', { recursive: true });
const file = `scripts/tmp-ctrt-out/construction-stage-backfill-${new Date().toISOString().slice(0, 10)}${APPLY ? '-apply' : ''}.md`;
writeFileSync(file, lines.join('\n'));
console.log(lines.slice(2).join('\n'));
console.log(`Report: ${file}`);
