// Link reconciliation sweep (JT 16/11). The Property Record is the master: record.linked_opportunity_id.
// The opportunity carries three mirrors (linked_property_record_id, linked_property_address,
// property_record_ctrt_link). Blank or different mirrors are written from the record and logged.
// Reports manual record-link changes, missing opportunities and Registered Address problems.
// Clears orphan mirrors on open reporting-pipeline opportunities only when no record points back.
// Delta every 15 min, full sweep nightly. Dry run until switched on in Admin > Automated updates
// (switch key link_sweep_apply in ctr_stamp_settings).
import { getDb } from '@/lib/db';
import { ghlFetch } from '@/lib/ghlFetch';
import { ensureStampTables } from '@/lib/ctrStamp';
import { PROPERTY_OBJECT_ID, PROPERTY_LINK_FIELD_ID } from '@/app/api/contract-team-reporting/fields';
import { sendCtrAlert } from '@/app/api/contract-team-reporting/alerts';
import { PIPELINE_ID } from '@/lib/ghlPipelines';
import { searchGhlOpportunities, type OpportunityFilter } from '@/lib/ghlOpportunitySearch';

const BASE = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOC = process.env.GHL_LOCATION_ID || '';
const TOOL_URL = 'https://buyersclubtools.com.au';
const MAX_RECORD_PAGES = 200;
const SWITCH_KEY = 'link_sweep_apply';

export const MIRRORS = [
  { field: 'linked_property_record_id', id: 'H3BCzZ95gKFw7cI1qnwo' },
  { field: 'linked_property_address', id: 'n7y1sc93hFREV0Gv3xk8' },
  { field: 'property_record_ctrt_link', id: 'u25HksjBK0UJt44k8Tgn' },
] as const;
type MirrorField = (typeof MIRRORS)[number]['field'];

type Who = { source?: string; channel?: string; sourceName?: string | null; sourceId?: string; createdAt?: string };
type Rec = { id: string; opp: string; address: string; suburb: string; postcode: string; status: string; name: string; updatedAt: string; who: Who | null };
type Opp = { id: string; name: string; updatedAt: string; pipelineId: string; status: string; regAddr: string; mirrors: Record<MirrorField, string> };
type Mismatch = { kind: 'hand_changed' | 'not_pointing_back' | 'opp_missing' | 'address_mismatch'; recordId: string; oppId: string; oppName: string; recordName: string; detail: string; who: string; whenAt: string | null };

export type LinkSweepSummary = {
  completed: boolean;
  runId: string; mode: 'delta' | 'full'; dryRun: boolean; since: string | null; seconds: number;
  records: number; linkedRecords: number; oppsChecked: number; inSync: number;
  fixed: number; fieldsFixed: number; reported: number; newReported: number; byKind: Record<string, number>;
  baselined: number; failed: number; errors: string[];
  oppPassChecked: number; oppPassCleared: number; addressChecked: number;
};

const REGISTERED_ADDRESS_FIELD_ID = 'PlNx1851lV5PSAotT4FT';
// Both-sided pairs are keyed by record + opp; the rest by record.
const mismatchKey = (m: Pick<Mismatch, 'kind' | 'recordId' | 'oppId'>) =>
  m.kind === 'not_pointing_back' || m.kind === 'address_mismatch' ? `${m.kind}:${m.recordId}:${m.oppId}` : `${m.kind}:${m.recordId}`;
const normText = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// A postcode only counts when it follows the state, so lot numbers and years in notes are ignored.
const statePostcode = (v: string) => (v.match(/\b(?:QLD|NSW|VIC|SA|WA|TAS|NT|ACT)\b[\s,]*(\d{4})\b/gi) || []).map((m) => m.slice(-4)).pop() || '';

// Report-only (JT 17/11): Registered Address suburb/postcode must match the linked record's address.
function addressMismatch(o: Opp, rec: Rec): string {
  // The field often carries notes on later lines; only the first line is the address.
  const regLine = o.regAddr.split(/\r?\n/)[0].trim();
  if (!regLine) return '';
  const reg = normText(regLine);
  const recPost = rec.postcode || statePostcode(rec.address);
  const regPost = statePostcode(regLine);
  const problems: string[] = [];
  if (recPost && regPost && recPost !== regPost) problems.push(`postcode ${regPost} vs ${recPost}`);
  // JT 17/11: a Registered Address without a suburb (no record suburb, state or postcode in it) is itself a data problem.
  const hasState = /\b(?:QLD|NSW|VIC|SA|WA|TAS|NT|ACT)\b/i.test(regLine);
  if (rec.suburb && !` ${reg} `.includes(` ${normText(rec.suburb)} `)) {
    problems.push(hasState ? `suburb is not ${rec.suburb}` : `no suburb (${rec.suburb} not found, no state or postcode)`);
  }
  return problems.length ? `Registered Address "${regLine}" vs record "${rec.address}": ${problems.join('; ')}` : '';
}

const headers = () => ({ Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28', 'Content-Type': 'application/json' });
const str = (v: unknown): string => (v === null || v === undefined ? '' : Array.isArray(v) ? v.map(str).filter(Boolean).join(', ') : String(v));
export const ctrtLink = (oppId: string) => `${TOOL_URL}/contract-team-reporting/record?opp=${oppId}`;
const whoText = (w: Who | null) => (w ? w.sourceName || [w.source, w.channel].filter(Boolean).join('/') || '' : '');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function ensureLinkSweepTables(): Promise<void> {
  await ensureStampTables();
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS link_sweep_runs (run_id text PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), mode text NOT NULL, dry_run boolean NOT NULL, since timestamptz, fixed int NOT NULL DEFAULT 0, reported int NOT NULL DEFAULT 0, failed int NOT NULL DEFAULT 0, summary jsonb)`;
  await sql`CREATE TABLE IF NOT EXISTS link_sweep_log (id serial PRIMARY KEY, run_id text NOT NULL, at timestamptz NOT NULL DEFAULT now(), opportunity_id text NOT NULL, opportunity_name text, record_id text NOT NULL, field text NOT NULL, old_value text, new_value text, read_back text, record_who text, record_when timestamptz, opp_updated_at timestamptz, dry_run boolean NOT NULL, result text NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS link_sweep_links (record_id text PRIMARY KEY, opp_id text NOT NULL, seen_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS link_sweep_dealsheet (id serial PRIMARY KEY, record_id text NOT NULL, opp_id text NOT NULL, route text, at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS link_sweep_mismatch (key text PRIMARY KEY, kind text NOT NULL, record_id text NOT NULL, opp_id text NOT NULL, opp_name text, record_name text, detail text, who text, when_at timestamptz, first_seen timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now(), emailed_at timestamptz, resolved_at timestamptz, resolved_by text)`;
}

export async function linkSweepSwitch(): Promise<{ apply: boolean; by: string | null; at: string | null }> {
  await ensureLinkSweepTables();
  const [r] = (await getDb()`SELECT value, updated_by, updated_at FROM ctr_stamp_settings WHERE key = ${SWITCH_KEY}`) as { value: string; updated_by: string | null; updated_at: string | null }[];
  return { apply: r?.value === 'true', by: r?.updated_by ?? null, at: r?.updated_at ?? null };
}

export async function setLinkSweepApply(on: boolean, by: string): Promise<void> {
  await ensureLinkSweepTables();
  await getDb()`INSERT INTO ctr_stamp_settings (key, value, updated_by) VALUES (${SWITCH_KEY}, ${String(on)}, ${by})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`;
}

// Called by the Deal Sheet whenever it writes record.linked_opportunity_id, so the sweep can tell its link
// changes apart from hand edits in GHL. Never throws.
export async function recordDealSheetLink(recordId: string, oppId: string, route: string): Promise<void> {
  try {
    await ensureLinkSweepTables();
    await getDb()`INSERT INTO link_sweep_dealsheet (record_id, opp_id, route) VALUES (${recordId}, ${oppId || ''}, ${route})`;
  } catch (e) {
    console.error('link sweep: Deal Sheet link log failed (non-fatal):', e);
  }
}

async function readRecords(): Promise<Map<string, Rec>> {
  const out = new Map<string, Rec>();
  const cursors = new Set<string>();
  let searchAfter: unknown;
  for (let page = 0; ; page++) {
    if (page >= MAX_RECORD_PAGES) throw new Error(`Property Records exceed ${MAX_RECORD_PAGES * 100}`);
    const res = await ghlFetch(`${BASE}/objects/${PROPERTY_OBJECT_ID}/records/search`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ locationId: LOC, pageLimit: 100, ...(searchAfter ? { searchAfter } : { page: 1 }) }),
    }, 'link-sweep-records');
    if (!res.ok) throw new Error(`GHL Property Records HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.records)) throw new Error('GHL Property Records returned no records array');
    const rows = data.records as { id: string; updatedAt?: string; lastUpdatedBy?: Who; properties?: Record<string, unknown>; searchAfter?: unknown }[];
    for (const r of rows) {
      if (!r?.id || !r.properties || typeof r.properties !== 'object' || Array.isArray(r.properties)) throw new Error('GHL Property Records returned an incomplete record');
      const p = r.properties || {};
      const get = (k: string) => str(p[k] ?? p[`custom_objects.property_reviews.${k}`]);
      out.set(r.id, {
        id: r.id, opp: (get('linked_opportunity_id') || str(p[PROPERTY_LINK_FIELD_ID])).trim(), address: get('property_address').trim(),
        suburb: get('suburb_name').trim(), postcode: get('post_code').trim(),
        status: get('status'), name: get('property_address') || r.id, updatedAt: r.updatedAt || '', who: r.lastUpdatedBy || null,
      });
    }
    if (rows.length < 100) break;
    searchAfter = rows[rows.length - 1].searchAfter;
    if (!searchAfter) throw new Error('GHL Property Records returned a full page without a cursor');
    const key = JSON.stringify(searchAfter);
    if (cursors.has(key)) throw new Error('GHL Property Records repeated its pagination cursor');
    cursors.add(key);
  }
  return out;
}

type RawOpp = { id: string; name?: string; updatedAt?: string; pipelineId?: string; status?: string; customFields?: { id: string; fieldValue?: unknown; fieldValueString?: string; value?: unknown }[] };
const toOpp = (o: RawOpp): Opp => {
  const mirrors = {} as Record<MirrorField, string>;
  for (const m of MIRRORS) {
    const c = o.customFields?.find((x) => x.id === m.id);
    mirrors[m.field] = str(c?.fieldValueString ?? c?.fieldValue ?? c?.value).trim();
  }
  const reg = o.customFields?.find((x) => x.id === REGISTERED_ADDRESS_FIELD_ID);
  return { id: o.id, name: o.name || '', updatedAt: o.updatedAt || '', pipelineId: o.pipelineId || '', status: o.status || '', regAddr: str(reg?.fieldValueString ?? reg?.fieldValue ?? reg?.value).trim(), mirrors };
};

// Explicit update-time filtering, not an early stop in a creation-sorted list.
async function readOpps(since: string | null, openPipelineId?: string): Promise<Opp[]> {
  const filters: OpportunityFilter[] = [];
  if (since) filters.push({ field: 'date_updated', operator: 'range', value: { gte: since } });
  if (openPipelineId) filters.push(
    { field: 'pipeline_id', operator: 'eq', value: openPipelineId },
    { field: 'status', operator: 'eq', value: 'open' },
  );
  return (await searchGhlOpportunities<RawOpp>(filters, 'link-sweep-opps')).map(toOpp);
}

async function readOpp(id: string): Promise<Opp | null> {
  const res = await ghlFetch(`${BASE}/opportunities/${id}`, { headers: headers() }, 'link-sweep-opp');
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`GHL opportunity ${id} HTTP ${res.status}`);
  const j = await res.json();
  return j.opportunity ? toOpp(j.opportunity) : null;
}

async function writeMirrors(oppId: string, values: Partial<Record<MirrorField, string>>): Promise<void> {
  const customFields = MIRRORS.filter((m) => values[m.field] !== undefined).map((m) => ({ id: m.id, field_value: values[m.field] }));
  const res = await ghlFetch(`${BASE}/opportunities/${oppId}?locationId=${LOC}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ customFields }) }, 'link-sweep-write');
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}

// The CTRT link counts as right when it opens this record or this opp (both forms are in GHL today).
function ctrtOk(value: string, rec: Rec): boolean {
  const m = value.match(/\/contract-team-reporting\/record\?(id|opp)=([A-Za-z0-9]+)/);
  return !!m && (m[1] === 'id' ? m[2] === rec.id : m[2] === rec.opp);
}

function wanted(rec: Rec, opp: Opp): Partial<Record<MirrorField, string>> {
  const w: Partial<Record<MirrorField, string>> = {};
  if (opp.mirrors.linked_property_record_id !== rec.id) w.linked_property_record_id = rec.id;
  if (rec.address && opp.mirrors.linked_property_address !== rec.address) w.linked_property_address = rec.address;
  if (!ctrtOk(opp.mirrors.property_record_ctrt_link, rec)) w.property_record_ctrt_link = ctrtLink(rec.opp);
  return w;
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

export async function runLinkSweep(opts: { full: boolean; forceDryRun?: boolean }): Promise<LinkSweepSummary> {
  const t0 = Date.now();
  const runId = new Date().toISOString();
  const s: LinkSweepSummary = { completed: false, runId, mode: opts.full ? 'full' : 'delta', dryRun: !!opts.forceDryRun, since: null, seconds: 0, records: 0, linkedRecords: 0, oppsChecked: 0, inSync: 0, fixed: 0, fieldsFixed: 0, reported: 0, newReported: 0, byKind: {}, baselined: 0, failed: 0, errors: [], oppPassChecked: 0, oppPassCleared: 0, addressChecked: 0 };
  try {
    await performLinkSweep(opts, s);
    s.completed = true;
  } catch (error) {
    s.failed++;
    s.errors.push(error instanceof Error ? error.message : String(error));
  }
  s.seconds = Math.round((Date.now() - t0) / 1000);
  try {
    await getDb()`INSERT INTO link_sweep_runs (run_id, mode, dry_run, since, fixed, reported, failed, summary)
      VALUES (${s.runId}, ${s.mode}, ${s.dryRun}, ${s.since}, ${s.fixed}, ${s.reported}, ${s.failed}, ${JSON.stringify(s)}::jsonb)`;
  } catch (error) {
    s.failed++;
    s.errors.push(`Could not save sweep audit: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Link sweep audit failed:', error);
  }
  if (s.failed && !s.dryRun) {
    const detail = s.errors.slice(0, 20).join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    await sendCtrAlert({
      type: 'link-sweep-failed',
      subject: 'Property link sweep failed',
      reason: 'The scheduled link sweep did not complete successfully.',
      impact: 'Some opportunity mirrors may not have been checked or repaired. The next run will retry from the last successful applied run.',
      action: 'Check Admin > Automated updates > Link reconciliation sweep for the failed run and error details.',
      detailsHtml: `<p>Run ${runId}; ${s.mode}; ${s.failed} failure(s).</p><pre>${detail}</pre>`,
    });
  }
  return s;
}

async function performLinkSweep(opts: { full: boolean; forceDryRun?: boolean }, s: LinkSweepSummary): Promise<void> {
  await ensureLinkSweepTables();
  const sql = getDb();
  const dryRun = opts.forceDryRun || !(await linkSweepSwitch()).apply;
  s.dryRun = dryRun;
  const runId = s.runId;
  const [last] = (await sql`SELECT run_id, at FROM link_sweep_runs WHERE failed = 0 AND dry_run = false ORDER BY at DESC LIMIT 1`) as { run_id: string; at: string }[];
  const mode: 'delta' | 'full' = opts.full || !last ? 'full' : 'delta';
  // Checkpoint at run START, with overlap for indexing. Failed/dry runs never advance it.
  const since = mode === 'delta' ? new Date(new Date(last.run_id).getTime() - 120_000).toISOString() : null;
  Object.assign(s, { mode, since });

  const records = await readRecords();
  s.records = records.size;
  const linked = [...records.values()].filter((r) => r.opp);
  s.linkedRecords = linked.length;
  const recByOpp = new Map<string, Rec[]>();
  for (const r of linked) recByOpp.set(r.opp, [...(recByOpp.get(r.opp) || []), r]);

  const opps = new Map<string, Opp>();
  if (mode === 'full') {
    // The opportunity pass owns open reporting-pipeline opportunities only.
    // Other opportunities linked by a record are read explicitly below, including
    // won/lost purchases and links in other pipelines, without scanning every lead.
    for (const pipelineId of [PIPELINE_ID.PROPERTY_TEAM, PIPELINE_ID.FINANCE, PIPELINE_ID.CONSTRUCTION]) {
      for (const o of await readOpps(null, pipelineId)) opps.set(o.id, o);
    }
  } else {
    for (const o of await readOpps(since)) opps.set(o.id, o);
  }
  // Records in scope: all linked (full), or updated since the last run / linked to an opp updated since then (delta).
  const scope = mode === 'full' ? linked : linked.filter((r) => (r.updatedAt && r.updatedAt >= (since as string)) || opps.has(r.opp));
  const missing = [...new Set(scope.map((r) => r.opp).filter((id) => !opps.has(id)))];
  const notFound = new Set<string>();
  await pool(missing, 5, async (id) => {
    try { const o = await readOpp(id); if (o) opps.set(id, o); else notFound.add(id); } catch (e) { s.failed++; s.errors.push(String(e instanceof Error ? e.message : e)); }
  });

  const snap = new Map(((await sql`SELECT record_id, opp_id, seen_at FROM link_sweep_links`) as { record_id: string; opp_id: string; seen_at: string }[]).map((r) => [r.record_id, r]));
  const ds = (await sql`SELECT record_id, opp_id, at FROM link_sweep_dealsheet WHERE at > now() - interval '45 days'`) as { record_id: string; opp_id: string; at: string }[];
  const held = new Set(((await sql`SELECT record_id FROM link_sweep_mismatch WHERE kind = 'hand_changed' AND resolved_at IS NULL`) as { record_id: string }[]).map((r) => r.record_id));
  const found: Mismatch[] = [];
  const checkedKeys = new Set<string>();
  const iso = (v: string | undefined | null) => (v ? v : null);

  for (const rec of scope) {
    const prev = snap.get(rec.id);
    if (!prev) s.baselined++;
    // A link change made outside the Deal Sheet: report and leave the opp alone.
    const viaDealSheet = (since: string) => ds.some((d) => d.record_id === rec.id && d.opp_id === rec.opp && d.at >= since);
    const changed = prev && prev.opp_id !== rec.opp;
    checkedKeys.add(`hand_changed:${rec.id}`);
    if ((changed && !viaDealSheet(new Date(new Date(prev.seen_at).getTime() - 86_400_000).toISOString())) || (held.has(rec.id) && !viaDealSheet('1970'))) {
      found.push({ kind: 'hand_changed', recordId: rec.id, oppId: rec.opp, oppName: opps.get(rec.opp)?.name || '', recordName: rec.name, detail: changed ? `linked_opportunity_id ${prev.opp_id || '(blank)'} -> ${rec.opp}` : 'still linked outside the Deal Sheet', who: whoText(rec.who), whenAt: iso(rec.who?.createdAt || rec.updatedAt) });
      continue;
    }
    checkedKeys.add(`opp_missing:${rec.id}`);
    const opp = opps.get(rec.opp);
    if (!opp) {
      if (notFound.has(rec.opp)) found.push({ kind: 'opp_missing', recordId: rec.id, oppId: rec.opp, oppName: '', recordName: rec.name, detail: 'linked_opportunity_id points at an opportunity GHL no longer has', who: whoText(rec.who), whenAt: iso(rec.who?.createdAt || rec.updatedAt) });
      continue;
    }
    s.oppsChecked++;
    const w = wanted(rec, opp);
    const fields = Object.keys(w) as MirrorField[];
    if (!fields.length) { s.inSync++; continue; }
    let result = dryRun ? 'dry run' : 'written';
    const readBack: Partial<Record<MirrorField, string>> = {};
    if (!dryRun) {
      try {
        await writeMirrors(opp.id, w);
        await sleep(300);
        const after = await readOpp(opp.id);
        for (const f of fields) readBack[f] = after?.mirrors[f] ?? '';
        if (!after || fields.some((f) => readBack[f] !== w[f])) throw new Error('read back differs');
      } catch (e) {
        result = `failed: ${e instanceof Error ? e.message : String(e)}`;
        s.failed++;
        s.errors.push(`${opp.name || opp.id}: ${result}`);
      }
    }
    if (!result.startsWith('failed')) { s.fixed++; s.fieldsFixed += fields.length; }
    for (const f of fields) {
      await sql`INSERT INTO link_sweep_log (run_id, opportunity_id, opportunity_name, record_id, field, old_value, new_value, read_back, record_who, record_when, opp_updated_at, dry_run, result)
        VALUES (${runId}, ${opp.id}, ${opp.name}, ${rec.id}, ${f}, ${opp.mirrors[f]}, ${w[f] ?? ''}, ${readBack[f] ?? null}, ${whoText(rec.who)}, ${iso(rec.who?.createdAt || rec.updatedAt)}, ${iso(opp.updatedAt)}, ${dryRun}, ${result})`;
    }
  }

  // Opportunity pass (JT 17/11): an open Property Team / Finance / Construction opp naming a record must have that
  // record pointing back. If not, its three mirrors are cleared and logged; it is reported only if that did not land.
  const oppPipelines = new Set<string>([PIPELINE_ID.PROPERTY_TEAM, PIPELINE_ID.FINANCE, PIPELINE_ID.CONSTRUCTION]);
  const oppScope = [...opps.values()].filter((o) => (mode === 'full' || !since || o.updatedAt >= since) && o.status === 'open' && oppPipelines.has(o.pipelineId));
  for (const o of oppScope) {
    const rid = o.mirrors.linked_property_record_id;
    if (!rid) continue;
    s.oppPassChecked++;
    checkedKeys.add(`not_pointing_back:${rid}:${o.id}`);
    const rec = records.get(rid);
    if (rec && rec.opp === o.id) {
      checkedKeys.add(`address_mismatch:${rid}:${o.id}`);
      if (o.regAddr) s.addressChecked++;
      const detail = addressMismatch(o, rec);
      if (detail) found.push({ kind: 'address_mismatch', recordId: rid, oppId: o.id, oppName: o.name, recordName: rec.name, detail, who: whoText(rec.who), whenAt: iso(o.updatedAt) });
      continue;
    }
    // Another record points at this opp: the record pass owns its mirrors, so don't clear them here.
    if (recByOpp.has(o.id)) continue;
    const detail = !rec ? 'record no longer exists' : rec.opp ? `record points at another opportunity (${opps.get(rec.opp)?.name || rec.opp})${rec.status === '08_resold' ? '; record is 08 Resold' : ''}` : `record has no linked_opportunity_id${rec.status ? ` (status ${rec.status})` : ''}`;
    const fields = MIRRORS.map((m) => m.field).filter((f) => o.mirrors[f]);
    let result = dryRun ? 'dry run' : 'cleared';
    const readBack: Partial<Record<MirrorField, string>> = {};
    if (!dryRun) {
      try {
        await writeMirrors(o.id, { linked_property_record_id: '', linked_property_address: '', property_record_ctrt_link: '' });
        await sleep(300);
        const after = await readOpp(o.id);
        for (const f of fields) readBack[f] = after?.mirrors[f] ?? '';
        if (!after || fields.some((f) => readBack[f])) throw new Error('read back differs');
      } catch (e) {
        result = `failed: ${e instanceof Error ? e.message : String(e)}`;
        s.failed++;
        s.errors.push(`${o.name || o.id}: ${result}`);
      }
    }
    if (result === 'dry run' || result === 'cleared') s.oppPassCleared++;
    for (const f of fields) {
      await sql`INSERT INTO link_sweep_log (run_id, opportunity_id, opportunity_name, record_id, field, old_value, new_value, read_back, record_who, record_when, opp_updated_at, dry_run, result)
        VALUES (${runId}, ${o.id}, ${o.name}, ${rid}, ${f}, ${o.mirrors[f]}, '', ${readBack[f] ?? null}, ${whoText(rec?.who || null)}, ${iso(rec?.who?.createdAt || rec?.updatedAt)}, ${iso(o.updatedAt)}, ${dryRun}, ${`opp pass (${detail}): ${result}`})`;
    }
    if (result === 'cleared') continue;
    found.push({ kind: 'not_pointing_back', recordId: rid, oppId: o.id, oppName: o.name, recordName: rec?.name || '', detail: !rec ? 'record no longer exists' : rec.opp ? `record points at another opportunity (${recByOpp.get(rec.opp) ? opps.get(rec.opp)?.name || rec.opp : rec.opp})${rec.status === '08_resold' ? '; record is 08 Resold' : ''}` : `record has no linked_opportunity_id${rec.status ? ` (status ${rec.status})` : ''}`, who: whoText(rec?.who || null), whenAt: iso(rec?.who?.createdAt || rec?.updatedAt) });
  }

  // Store / resolve mismatches.
  const newOnes: Mismatch[] = [];
  for (const m of found) {
    const key = mismatchKey(m);
    const [row] = (await sql`INSERT INTO link_sweep_mismatch (key, kind, record_id, opp_id, opp_name, record_name, detail, who, when_at)
      VALUES (${key}, ${m.kind}, ${m.recordId}, ${m.oppId}, ${m.oppName}, ${m.recordName}, ${m.detail}, ${m.who}, ${m.whenAt})
      ON CONFLICT (key) DO UPDATE SET opp_id = EXCLUDED.opp_id, opp_name = EXCLUDED.opp_name, record_name = EXCLUDED.record_name, detail = EXCLUDED.detail, who = EXCLUDED.who, when_at = EXCLUDED.when_at, last_seen = now(),
        resolved_at = NULL, resolved_by = NULL, emailed_at = CASE WHEN link_sweep_mismatch.resolved_at IS NULL THEN link_sweep_mismatch.emailed_at ELSE NULL END
      RETURNING emailed_at`) as { emailed_at: string | null }[];
    if (!row?.emailed_at) newOnes.push(m);
    s.byKind[m.kind] = (s.byKind[m.kind] || 0) + 1;
  }
  s.reported = found.length;
  s.newReported = newOnes.length;
  const foundKeys = new Set(found.map(mismatchKey));
  const open = (await sql`SELECT key FROM link_sweep_mismatch WHERE resolved_at IS NULL`) as { key: string }[];
  for (const { key } of open) {
    const kindRec = key.split(':').slice(0, 2).join(':');
    if (!foundKeys.has(key) && (mode === 'full' || checkedKeys.has(key) || checkedKeys.has(kindRec))) {
      await sql`UPDATE link_sweep_mismatch SET resolved_at = now(), resolved_by = 'sweep' WHERE key = ${key}`;
    }
  }

  // Snapshot every record's link (records reported as hand-changed keep their old snapshot until resolved).
  const heldNow = new Set(found.filter((m) => m.kind === 'hand_changed').map((m) => m.recordId));
  const snapRows = [...records.values()].filter((r) => !heldNow.has(r.id) && (r.opp || snap.has(r.id))).map((r) => ({ record_id: r.id, opp_id: r.opp }));
  for (let i = 0; i < snapRows.length; i += 500) {
    const chunk = JSON.stringify(snapRows.slice(i, i + 500));
    await sql`INSERT INTO link_sweep_links (record_id, opp_id, seen_at)
      SELECT x->>'record_id', x->>'opp_id', now() FROM jsonb_array_elements(${chunk}::jsonb) x
      ON CONFLICT (record_id) DO UPDATE SET opp_id = EXCLUDED.opp_id, seen_at = CASE WHEN link_sweep_links.opp_id = EXCLUDED.opp_id THEN link_sweep_links.seen_at ELSE now() END`;
  }

  // Email new cases (never in dry run).
  if (!dryRun && newOnes.length) {
    const label = { hand_changed: 'Link changed by hand in GHL (not via the Deal Sheet)', not_pointing_back: 'Opportunity\'s linked record no longer points back', opp_missing: 'Record links to an opportunity GHL no longer has', address_mismatch: 'Registered Address suburb/postcode differs from the linked record' };
    const rows = newOnes.map((m) => `<tr><td>${label[m.kind]}</td><td>${m.oppName || m.oppId}</td><td>${m.recordName || m.recordId}</td><td>${m.detail}</td><td>${m.who}${m.whenAt ? ` ${new Date(m.whenAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}` : ''}</td></tr>`).join('');
    await sendCtrAlert({
      type: `link-mismatch-${runId}`,
      subject: `Link mismatch: ${newOnes.length} new case${newOnes.length === 1 ? '' : 's'}`,
      reason: 'The link reconciliation sweep found Property Record / opportunity links it must not fix by itself.',
      impact: 'CTRT, the Deal Sheet and Journey may show the wrong property for these opportunities until the link is put right.',
      action: 'Check each case in GHL, then re-link it through the Deal Sheet. The list is also on Admin > Automated updates > Link mismatch.',
      detailsHtml: `<table border="1" cellpadding="4" style="border-collapse:collapse"><tr><th>Case</th><th>Opportunity</th><th>Property Record</th><th>Detail</th><th>Last changed by (GHL)</th></tr>${rows}</table>`,
    });
    await sql`UPDATE link_sweep_mismatch SET emailed_at = now() WHERE resolved_at IS NULL AND emailed_at IS NULL`;
  }

}

export async function linkSweepAdminData() {
  await ensureLinkSweepTables();
  const sql = getDb();
  const sw = await linkSweepSwitch();
  const runs = await sql`SELECT run_id, at, mode, dry_run, fixed, reported, failed, summary FROM link_sweep_runs ORDER BY at DESC LIMIT 10`;
  const recent = await sql`SELECT at, opportunity_id, opportunity_name, record_id, field, old_value, new_value, read_back, record_who, record_when, opp_updated_at, dry_run, result FROM link_sweep_log ORDER BY at DESC, id LIMIT 200`;
  const mismatches = await sql`SELECT key, kind, record_id, opp_id, opp_name, record_name, detail, who, when_at, first_seen, last_seen, emailed_at FROM link_sweep_mismatch WHERE resolved_at IS NULL ORDER BY kind, first_seen DESC LIMIT 1000`;
  return { apply: sw.apply, switchedBy: sw.by, switchedAt: sw.at, runs, recent, mismatches };
}

export async function clearLinkMismatch(key: string, by: string): Promise<void> {
  await ensureLinkSweepTables();
  const sql = getDb();
  const [m] = (await sql`UPDATE link_sweep_mismatch SET resolved_at = now(), resolved_by = ${by} WHERE key = ${key} RETURNING kind, record_id, opp_id`) as { kind: string; record_id: string; opp_id: string }[];
  // Clearing a hand change accepts the record's current link as the new baseline.
  if (m?.kind === 'hand_changed') {
    await sql`INSERT INTO link_sweep_links (record_id, opp_id) VALUES (${m.record_id}, ${m.opp_id})
      ON CONFLICT (record_id) DO UPDATE SET opp_id = EXCLUDED.opp_id, seen_at = now()`;
  }
}
