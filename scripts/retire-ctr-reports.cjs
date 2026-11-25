// Local maintenance: prepare a reviewable backup/plan; apply only AFTER the
// Property Team release is promoted. No GHL writes and no report payload cache.
// node scripts/retire-ctr-reports.cjs --prepare /absolute/path/plan.json
// node scripts/retire-ctr-reports.cjs --apply /absolute/path/plan.json --production-url https://buyersclubtools.com.au
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const { createClient } = require('redis');
const { neon } = require('@neondatabase/serverless');
require('@next/env').loadEnvConfig(path.resolve(__dirname, '..'), true, { info() {}, error() {} });

const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function loadPure(file) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require(name) {
    if (!name.startsWith('.')) throw Error('Only local pure reporting modules are allowed');
    return loadPure(path.resolve(path.dirname(file), `${name}.ts`));
  } }, { filename: file });
  return module.exports;
}
const { retirementReason, RETIRED_CTR_REPORT_IDS } = loadPure(path.resolve(__dirname, '../src/lib/ctrReportRetirement.ts'));
const keys = ['ctr:public-views', 'ctr:view-folders'];

async function run() {
  const prepare = arg('--prepare'), apply = arg('--apply'), file = prepare || apply;
  if (!file || !!prepare === !!apply) throw Error('Choose --prepare FILE or --apply FILE');
  if (!path.isAbsolute(file) || !fs.existsSync(path.dirname(file))) throw Error('Plan must use an absolute path in an existing directory');
  if (apply) {
    const origin = new URL(arg('--production-url') || 'http://invalid');
    if (origin.protocol !== 'https:' || !['buyersclubtools.com.au', 'www.buyersclubtools.com.au'].includes(origin.hostname)) {
      throw Error('Apply requires the real production origin, not localhost or a preview');
    }
    const response = await fetch(new URL('/api/contract-team-reporting', origin), { cache: 'no-store', redirect: 'error' });
    if (!response.ok || response.headers.get('X-Reporting-Population') !== 'property-team-open-default-v1') {
      throw Error('Property Team-only reporting is not verified in production; no settings changed');
    }
    await response.arrayBuffer();
  }
  const redis = createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 10000, reconnectStrategy: false } });
  redis.on('error', () => {});
  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  await redis.connect();
  try {
    if (apply) await redis.watch(keys);
    const raw = await redis.mGet(keys);
    const hidden = await sql`SELECT view_id, view_name, hidden_by, hidden_at FROM ctr_hidden_views ORDER BY view_id`;
    const before = { views: raw[0], folders: raw[1], hidden };
    if (prepare) {
      const views = JSON.parse(raw[0] || '[]');
      const folders = JSON.parse(raw[1] || '{"folders":[],"assignments":{}}');
      const removed = views.filter(v => retirementReason(v));
      const retained = views.filter(v => !retirementReason(v));
      const next = retained;
      const retiredIds = new Set([...RETIRED_CTR_REPORT_IDS, ...removed.map(v => v.id)]);
      const assignments = Object.fromEntries(Object.entries(folders.assignments || {}).filter(([id]) => !retiredIds.has(id)));
      const hiddenRemoved = hidden.filter(h => retiredIds.has(h.view_id));
      const plan = {
        preparedAt: new Date().toISOString(), state: 'prepared', before, beforeHash: hash(before),
        removeReports: removed.map(v => ({ id: v.id, name: v.name, reason: retirementReason(v) })),
        removeHiddenSettings: hiddenRemoved,
        normalizeReports: [],
        after: { views: JSON.stringify(next), folders: JSON.stringify({ ...folders, assignments }) },
      };
      fs.writeFileSync(file, JSON.stringify(plan, null, 2), { flag: 'wx' });
      console.log(JSON.stringify({ plan: file, state: plan.state, removeReports: plan.removeReports,
        hiddenSettings: hiddenRemoved.length, normalizeReports: plan.normalizeReports }, null, 2));
      return;
    }
    const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (plan.state !== 'prepared') throw Error('Plan has already been attempted; inspect its recorded state before proceeding');
    if (hash(before) !== plan.beforeHash) throw Error('Report settings changed since preparation; prepare and review a new plan');
    if (plan.removeReports.some(v => !retirementReason(JSON.parse(before.views).find(x => x.id === v.id)))) {
      throw Error('Retirement rules changed since preparation');
    }
    const result = await redis.multi().set(keys[0], plan.after.views).set(keys[1], plan.after.folders).exec();
    if (!result) throw Error('Concurrent settings change; cleanup aborted');
    plan.state = 'redis-updated';
    plan.appliedAt = new Date().toISOString();
    fs.writeFileSync(file, JSON.stringify(plan, null, 2));
    const ids = plan.removeHiddenSettings.map(h => h.view_id);
    if (ids.length) await sql`DELETE FROM ctr_hidden_views WHERE view_id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))`;
    await redis.del(['ctr:report', 'ctr:report:lock', 'ctr:records:snapshot', 'ctr:records:last', 'ctr:schema-latest',
      'journey:reconcile:all', 'journey:reconcile:all:last', 'journey:reconcile:open', 'journey:reconcile:open:last',
      'journey:sales:v9', 'journey:sales:last:v9']);
    const checked = await redis.mGet(keys);
    if (checked[0] !== plan.after.views || checked[1] !== plan.after.folders) throw Error('Post-cleanup settings changed; review backup and live state');
    const remaining = await sql`SELECT view_id FROM ctr_hidden_views ORDER BY view_id`;
    if (remaining.some(r => ids.includes(r.view_id))) throw Error('Obsolete hidden settings remain');
    plan.state = 'complete';
    plan.verifiedAt = new Date().toISOString();
    fs.writeFileSync(file, JSON.stringify(plan, null, 2));
    console.log(JSON.stringify({ state: plan.state, removedReports: plan.removeReports.length, removedHiddenSettings: ids.length, backup: file }));
  } finally {
    if (redis.isOpen) await redis.quit();
  }
}
run().catch(e => { console.error('Report retirement:', e.message); process.exitCode = 1; });
