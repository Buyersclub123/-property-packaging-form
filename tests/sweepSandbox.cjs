// Runs the actual release modules against an in-memory GHL/SQL boundary.
// Defaults have no network, credentials, Redis or email transport. An explicit
// diagnostic boundary can substitute read-only live reads without changing tests.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const ROOT = path.resolve(__dirname, '..');
const PT = 'zrb34FRmPnbIyAGFDeXJ';
const LINK = 'H3BCzZ95gKFw7cI1qnwo';
const ADDRESS = 'n7y1sc93hFREV0Gv3xk8';
const CTR = 'u25HksjBK0UJt44k8Tgn';
const REG = 'PlNx1851lV5PSAotT4FT';
const SETTLED = 'Epjvk1xiuVzfKFV5LSG4';
const clone = x => JSON.parse(JSON.stringify(x));

function createSandbox(boundary = {}) {
  const now = new Date().toISOString();
  const s = {
    settings: { apply: 'true', settled_apply: 'true', link_sweep_apply: 'true' },
    records: [{ id: 'testrecord', updatedAt: now, properties: {
      property_address: 'Lot 999, Quick Test St Testville QLD 4000', suburb_name: 'Testville', post_code: '4000',
      linked_opportunity_id: 'testopp', client_closed: 'ZZZ RELEASE TEST', status: '03_contr_exchanged',
      property_type: 'new', contract_type: 'split_contract', construction_stage: '', land_registration: 'Late December 2026 approx.',
    } }],
    opps: [{ id: 'testopp', name: 'ZZZ RELEASE TEST', contactId: 'testcontact', status: 'open',
      pipelineId: PT, pipelineStageId: 'conditional', updatedAt: now, customFields: [
        { id: LINK, fieldValue: 'testrecord' }, { id: ADDRESS, fieldValue: 'Lot 999, Quick Test St Testville QLD 4000' },
        { id: CTR, fieldValue: 'https://buyersclubtools.com.au/contract-team-reporting/record?opp=testopp' },
        { id: REG, fieldValue: 'Lot 999, Quick Test St Testville QLD 4000' },
        { id: SETTLED, fieldValue: ['Yes'] }, { id: 'zTgTXnbDCLlXs3Ehx9sl', fieldValue: 'Pending finance' },
      ] }],
    writes: [], alerts: [], queries: [], notes: [], acks: [], ticks: [], snapshots: [], firstDetections: [],
    links: [], dealSheetLinks: [], mismatches: [], runs: [], redis: new Map(), ignoreWrites: false, failNotes: false,
  };
  const field = (id, opp = s.opps[0]) => opp.customFields.find(f => f.id === id)?.fieldValue ?? '';
  const setField = (id, value, opp = s.opps[0]) => {
    const f = opp.customFields.find(f => f.id === id);
    if (f) f.fieldValue = value; else opp.customFields.push({ id, fieldValue: value });
  };
  async function fetchFake(url, options = {}) {
    const u = new URL(String(url));
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : null;
    const respond = (data, status = 200) => Response.json(clone(data), { status });
    const p = u.pathname;
    if (p === '/opportunities/pipelines') return respond({ pipelines: [{ id: PT, name: 'Property Team', stages: [{ id: 'settled', name: 'Settled' }, { id: 'conditional', name: 'Conditional' }] }] });
    if (p === '/opportunities/search') return respond({ opportunities: s.opps.filter(o => (!u.searchParams.get('pipeline_id') || o.pipelineId === u.searchParams.get('pipeline_id')) && (!u.searchParams.get('status') || o.status === u.searchParams.get('status'))) });
    if (p.endsWith('/records/search')) return respond({ records: s.records });
    if (/\/contacts\/[^/]+\/notes$/.test(p)) {
      if (s.failNotes) return respond({ message: 'Simulated note failure' }, 503);
      s.writes.push({ path: p, method, body }); s.notes.push(body);
      return respond({ note: { id: `note${s.notes.length}` } });
    }
    const oppMatch = p.match(/^\/opportunities\/([^/]+)$/);
    const recordMatch = p.match(/\/records\/([^/]+)$/);
    const item = oppMatch ? s.opps.find(o => o.id === oppMatch[1]) : recordMatch ? s.records.find(r => r.id === recordMatch[1]) : null;
    if (!item) {
      if (oppMatch || recordMatch) return respond({ error: 'Not found' }, 404);
      throw Error(`Unmocked request blocked: ${method} ${p}`);
    }
    if (method === 'PUT') {
      s.writes.push({ path: p, method, body });
      if (!s.ignoreWrites) {
        if (recordMatch) Object.assign(item.properties, body.properties);
        else {
          for (const f of body.customFields || []) setField(f.id, f.field_value, item);
          for (const [key, value] of Object.entries(body)) if (key !== 'customFields') item[key] = value;
        }
      }
    } else if (method !== 'GET') throw Error(`Unmocked method blocked: ${method} ${p}`);
    return respond(recordMatch ? { record: item } : { opportunity: item });
  }
  async function sql(strings, ...v) {
    const q = strings.join('?').replace(/\s+/g, ' ').trim();
    s.queries.push({ q, values: clone(v) });
    if (/^(CREATE|ALTER) /.test(q)) return [];
    if (q.startsWith('SELECT') && q.includes('FROM ctr_stamp_settings')) {
      const key = v[0] || q.match(/key = '([^']+)'/)?.[1];
      return [{ value: s.settings[key] || 'false', updated_by: 'test', updated_at: now }];
    }
    if (q.includes('min(l.date_written)')) return clone(s.firstDetections);
    if (q.startsWith('SELECT') && q.includes('FROM ctr_stamp_snapshots')) return clone(s.snapshots);
    if (q.startsWith('INSERT INTO ctr_stamp_snapshots')) {
      const [object, record_id, fieldName, value] = v;
      const row = s.snapshots.find(r => r.object === object && r.record_id === record_id && r.field === fieldName);
      if (row) row.value = value; else s.snapshots.push({ object, record_id, field: fieldName, value });
      return [];
    }
    if (q.startsWith('SELECT') && q.includes('FROM link_sweep_runs')) return clone(s.runs);
    if (q.startsWith('SELECT') && q.includes('FROM link_sweep_links')) return clone(s.links);
    if (q.startsWith('SELECT') && q.includes('FROM link_sweep_dealsheet')) return clone(s.dealSheetLinks);
    if (q.startsWith('SELECT') && q.includes('FROM link_sweep_mismatch')) return [];
    if (q.startsWith('INSERT INTO link_sweep_mismatch')) {
      s.mismatches.push({ key: v[0], kind: v[1], recordId: v[2], oppId: v[3], detail: v[6] });
      return [{ emailed_at: null }];
    }
    if (q.startsWith('INSERT INTO deal_sheet_unlink_ack_tick')) {
      if (!s.ticks.some(t => t.item_id === v[0] && t.tile === v[1])) s.ticks.push({ item_id: v[0], tile: v[1], by_email: v[2], by_name: v[3], at: now });
      return [];
    }
    if (q.startsWith('INSERT INTO deal_sheet_unlink_ack ')) {
      const keys = ['record_id', 'address', 'opp_id', 'opp_name', 'by_email', 'by_name', 'reason', 'stage_id', 'stage_name', 'note_id'];
      const row = { id: s.acks.length + 1, at: now, done_at: null, ...Object.fromEntries(keys.map((k, i) => [k, v[i]])) };
      s.acks.push(row); return [{ id: row.id }];
    }
    if (q.startsWith('UPDATE deal_sheet_unlink_ack SET done_at')) {
      const row = s.acks.find(a => a.id === v[0]);
      if (row && s.ticks.filter(t => t.item_id === row.id).length >= 3) row.done_at = now;
      return [];
    }
    if (q.startsWith('SELECT * FROM deal_sheet_unlink_ack_tick')) return clone(s.ticks.filter(t => v[0].includes(t.item_id)));
    if (q.startsWith('SELECT * FROM deal_sheet_unlink_ack ')) return clone(s.acks.filter(a => q.includes('IS NOT NULL') ? a.done_at : !a.done_at));
    if (/^(INSERT INTO (ctr_stamp_log|ctr_settled_log|ctr_edit_log|link_sweep_log|link_sweep_runs|link_sweep_links|link_sweep_dealsheet)|UPDATE link_sweep_mismatch)/.test(q)) return [];
    throw Error(`Unmocked SQL blocked: ${q}`);
  }
  const cache = new Map();
  const mocks = {
    '@/lib/db': { getDb: () => boundary.sql || sql },
    '@/lib/ghlFetch': { ghlFetch: boundary.fetch || fetchFake },
    '@/app/api/contract-team-reporting/alerts': { sendCtrAlert: async a => s.alerts.push(a) },
    '@/lib/redis': { getRedisClient: async () => ({ rPush: async () => 1, zAdd: async () => 1, get: async key => s.redis.get(key) ?? null, set: async (key, value) => s.redis.set(key, value) }) },
    '@/lib/dealSheetCache': { updateCachedRecord: async () => {} },
    '@/lib/tileAccess': { emailFromHeaders: () => 'release-test@example.invalid' },
    '@/lib/reviewOutcomes/contactNote': { whoName: () => 'Release Test' },
    'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
  };
  function load(file) {
    const absolute = path.isAbsolute(file) ? file : path.join(ROOT, file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const mod = { exports: {} }; cache.set(absolute, mod);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const req = name => {
      if (mocks[name]) return mocks[name];
      const resolved = name.startsWith('@/') ? path.join(ROOT, 'src', name.slice(2)) : name.startsWith('.') ? path.resolve(path.dirname(absolute), name) : null;
      if (!resolved) throw Error(`Unmocked dependency blocked: ${name}`);
      const alias = '@/' + path.relative(path.join(ROOT, 'src'), resolved).replaceAll('\\', '/').replace(/\.ts$/, '');
      if (mocks[alias]) return mocks[alias];
      return load(fs.existsSync(resolved) && fs.statSync(resolved).isFile() ? resolved : resolved + '.ts');
    };
    const context = vm.createContext({ module: mod, exports: mod.exports, require: req, console, URL, Response, Request, Headers,
      process: { env: boundary.env || { GHL_BASE_URL: 'https://ghl.test', GHL_BEARER_TOKEN: 'test-only', GHL_LOCATION_ID: 'test-location' } },
      fetch: boundary.fetch || fetchFake, setTimeout: fn => setTimeout(fn, 0), clearTimeout });
    new vm.Script(code, { filename: absolute }).runInContext(context);
    return mod.exports;
  }
  return { state: s, load, field, setField, fetch: fetchFake };
}
module.exports = { createSandbox, PT, LINK, ADDRESS, CTR, REG, SETTLED };
