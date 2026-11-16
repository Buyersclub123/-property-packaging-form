// Link reconciliation sweep (JT 16/11). The Property Record is the master: record.linked_opportunity_id.
// The opportunity carries three mirrors (linked_property_record_id, linked_property_address,
// property_record_ctrt_link). Blank or different mirrors are written from the record and logged.
// Reported, never fixed: a record whose linked_opportunity_id changed outside the Deal Sheet, and an opp whose
// linked record no longer points back. Delta every 15 min, full sweep nightly. Dry run until switched on in
// Admin > Automated updates (switch key link_sweep_apply in ctr_stamp_settings).
import { getDb } from '@/lib/db';
import { ghlFetch } from '@/lib/ghlFetch';
import { ensureStampTables } from '@/lib/ctrStamp';
import { PROPERTY_OBJECT_ID, PROPERTY_LINK_FIELD_ID } from '@/app/api/contract-team-reporting/fields';
import { sendCtrAlert } from '@/app/api/contract-team-reporting/alerts';

const BASE = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOC = process.env.GHL_LOCATION_ID || '';
const TOOL_URL = 'https://buyersclubtools.com.au';
const MAX_RECORD_PAGES = 200;
const MAX_OPP_PAGES = 1000;
const SWITCH_KEY = 'link_sweep_apply';

export const MIRRORS = [
  { field: 'linked_property_record_id', id: 'H3BCzZ95gKFw7cI1qnwo' },
  { field: 'linked_property_address', id: 'n7y1sc93hFREV0Gv3xk8' },
  { field: 'property_record_ctrt_link', id: 'u25HksjBK0UJt44k8Tgn' },
] as const;
type MirrorField = (typeof MIRRORS)[number]['field'];

type Who = { source?: string; channel?: string; sourceName?: string | null; sourceId?: string; createdAt?: string };
type Rec = { id: string; opp: string; address: string; status: string; name: string; updatedAt: string; who: Who | null };
type Opp = { id: string; name: string; updatedAt: string; mirrors: Record<MirrorField, string> };
type Mismatch = { kind: 'hand_changed' | 'not_pointing_back' | 'opp_missing'; recordId: string; oppId: string; oppName: string; recordName: string; detail: string; who: string; whenAt: string | null };

export type LinkSweepSummary = {
  runId: string; mode: 'delta' | 'full'; dryRun: boolean; since: string | null; seconds: number;
  records: number; linkedRecords: number; oppsChecked: number; inSync: number;
  fixed: number; fieldsFixed: number; reported: number; newReported: number; byKind: Record<string, number>;
  baselined: number; failed: number; errors: string[];
};

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
  let searchAfter: unknown;
  for (let page = 0; ; page++) {
    if (page >= MAX_RECORD_PAGES) throw new Error(`Property Records exceed ${MAX_RECORD_PAGES * 100}`);
    const res = await ghlFetch(`${BASE}/objects/${PROPERTY_OBJECT_ID}/records/search`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ locationId: LOC, pageLimit: 100, ...(searchAfter ? { searchAfter } : { page: 1 }) }),
    }, 'link-sweep-records');
    if (!res.ok) throw new Error(`GHL Property Records HTTP ${res.status}`);
    const rows = ((await res.json()).records || []) as { id: string; updatedAt?: string; lastUpdatedBy?: Who; properties?: Record<string, unknown>; searchAfter?: unknown }[];
    for (const r of rows) {
      const p = r.properties || {};
      const get = (k: string) => str(p[k] ?? p[`custom_objects.property_reviews.${k}`]);
      out.set(r.id, {
        id: r.id, opp: (get('linked_opportunity_id') || str(p[PROPERTY_LINK_FIELD_ID])).trim(), address: get('property_address').trim(),
        status: get('status'), name: get('property_address') || r.id, updatedAt: r.updatedAt || '', who: r.lastUpdatedBy || null,
      });
    }
    if (rows.length < 100) break;
    searchAfter = rows[rows.length - 1].searchAfter;
    if (!searchAfter) break;
  }
  return out;
}

type RawOpp = { id: string; name?: string; updatedAt?: string; customFields?: { id: string; fieldValue?: unknown; fieldValueString?: string; value?: unknown }[] };
const toOpp = (o: RawOpp): Opp => {
  const mirrors = {} as Record<MirrorField, string>;
  for (const m of MIRRORS) {
    const c = o.customFields?.find((x) => x.id === m.id);
    mirrors[m.field] = str(c?.fieldValueString ?? c?.fieldValue ?? c?.value).trim();
  }
  return { id: o.id, name: o.name || '', updatedAt: o.updatedAt || '', mirrors };
};

// Opportunities newest-updated first; stops at `since` (delta) or reads all (full).
async function readOpps(since: string | null): Promise<Opp[]> {
  const out: Opp[] = [];
  let startAfter: unknown, startAfterId: unknown;
  for (let page = 0; ; page++) {
    if (page >= MAX_OPP_PAGES) throw new Error(`Opportunities exceed ${MAX_OPP_PAGES * 100}`);
    const url = new URL(`${BASE}/opportunities/search`);
    url.searchParams.set('location_id', LOC);
    url.searchParams.set('limit', '100');
    url.searchParams.set('order', 'updated_at_desc');
    if (startAfter !== undefined && startAfterId) { url.searchParams.set('startAfter', String(startAfter)); url.searchParams.set('startAfterId', String(startAfterId)); }
    const res = await ghlFetch(url.toString(), { headers: headers() }, 'link-sweep-opps');
    if (!res.ok) throw new Error(`GHL opportunities HTTP ${res.status}`);
    const data = await res.json();
    const opps = (data.opportunities || []) as RawOpp[];
    let older = false;
    for (const o of opps) {
      if (since && o.updatedAt && o.updatedAt < since) { older = true; break; }
      out.push(toOpp(o));
    }
    if (older || opps.length < 100 || !data.meta?.startAfterId) break;
    startAfter = data.meta.startAfter;
    startAfterId = data.meta.startAfterId;
  }
  return out;
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
  await ensureLinkSweepTables();
  const sql = getDb();
  const t0 = Date.now();
  const dryRun = opts.forceDryRun || !(await linkSweepSwitch()).apply;
  const runId = new Date().toISOString();
  const [last] = (await sql`SELECT at FROM link_sweep_runs ORDER BY at DESC LIMIT 1`) as { at: string }[];
  const mode: 'delta' | 'full' = opts.full || !last ? 'full' : 'delta';
  // 2 minutes of overlap so nothing updated during the previous run is missed.
  const since = mode === 'delta' ? new Date(new Date(last.at).getTime() - 120_000).toISOString() : null;
  const s: LinkSweepSummary = { runId, mode, dryRun, since, seconds: 0, records: 0, linkedRecords: 0, oppsChecked: 0, inSync: 0, fixed: 0, fieldsFixed: 0, reported: 0, newReported: 0, byKind: {}, baselined: 0, failed: 0, errors: [] };

  const records = await readRecords();
  s.records = records.size;
  const linked = [...records.values()].filter((r) => r.opp);
  s.linkedRecords = linked.length;
  const recByOpp = new Map<string, Rec[]>();
  for (const r of linked) recByOpp.set(r.opp, [...(recByOpp.get(r.opp) || []), r]);

  const opps = new Map<string, Opp>();
  for (const o of await readOpps(since)) opps.set(o.id, o);
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
        if (fields.some((f) => readBack[f] !== w[f])) result = 'read back differs';
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

  // Opp side: an opp naming a record that doesn't point back to it.
  const oppScope = mode === 'full' ? [...opps.values()] : [...opps.values()].filter((o) => !since || o.updatedAt >= since);
  for (const o of oppScope) {
    const rid = o.mirrors.linked_property_record_id;
    if (!rid) continue;
    checkedKeys.add(`not_pointing_back:${rid}:${o.id}`);
    const rec = records.get(rid);
    if (rec && rec.opp === o.id) continue;
    found.push({ kind: 'not_pointing_back', recordId: rid, oppId: o.id, oppName: o.name, recordName: rec?.name || '', detail: !rec ? 'record no longer exists' : rec.opp ? `record points at another opportunity (${recByOpp.get(rec.opp) ? opps.get(rec.opp)?.name || rec.opp : rec.opp})${rec.status === '08_resold' ? '; record is 08 Resold' : ''}` : `record has no linked_opportunity_id${rec.status ? ` (status ${rec.status})` : ''}`, who: whoText(rec?.who || null), whenAt: iso(rec?.who?.createdAt || rec?.updatedAt) });
  }

  // Store / resolve mismatches.
  const newOnes: Mismatch[] = [];
  for (const m of found) {
    const key = m.kind === 'not_pointing_back' ? `${m.kind}:${m.recordId}:${m.oppId}` : `${m.kind}:${m.recordId}`;
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
  const foundKeys = new Set(found.map((m) => (m.kind === 'not_pointing_back' ? `${m.kind}:${m.recordId}:${m.oppId}` : `${m.kind}:${m.recordId}`)));
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
    const label = { hand_changed: 'Link changed by hand in GHL (not via the Deal Sheet)', not_pointing_back: 'Opportunity\'s linked record no longer points back', opp_missing: 'Record links to an opportunity GHL no longer has' };
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

  s.seconds = Math.round((Date.now() - t0) / 1000);
  await sql`INSERT INTO link_sweep_runs (run_id, mode, dry_run, since, fixed, reported, failed, summary) VALUES (${runId}, ${mode}, ${dryRun}, ${since}, ${s.fixed}, ${s.reported}, ${s.failed}, ${JSON.stringify(s)}::jsonb)`;
  return s;
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
